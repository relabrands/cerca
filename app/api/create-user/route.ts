import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { Resend } from "resend";

export async function POST(req: Request) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }

    const db = admin.firestore();
    const auth = admin.auth();
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const body = await req.json();
    const { email, password, name, role, ...profileData } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (email, password, name, role)." },
        { status: 400 }
      );
    }

    if (role !== "doctor" && role !== "patient") {
      return NextResponse.json(
        { error: "Rol inválido. Debe ser 'doctor' o 'patient'." },
        { status: 400 }
      );
    }

    // 1. Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });
    } catch (authError: any) {
      if (authError.code === "auth/email-already-exists") {
        return NextResponse.json(
          { error: "El correo electrónico ya está registrado." },
          { status: 409 }
        );
      }
      throw authError; // re-throw to be caught by outer try-catch
    }

    const uid = userRecord.uid;

    // 2. Generate entityId depending on role
    const entityId = role === "doctor" ? `dr-${Date.now()}` : `p-${Date.now()}`;

    // 3. Create role-specific record in Firestore
    if (role === "doctor") {
      const initials = name
        .split(" ")
        .filter((w: string) => w.length > 0)
        .map((w: string) => w[0].toUpperCase())
        .slice(0, 2)
        .join("");

      const newDoctor = {
        id: entityId,
        name,
        email,
        avatarInitials: initials,
        specialty: profileData.specialty || "",
        phone: profileData.phone || "",
        clinicId: profileData.clinicId || "",
        patientIds: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("doctors").doc(entityId).set(newDoctor);
    } else {
      // Role is patient
      const newPatient = {
        id: entityId,
        name,
        email,
        phone: profileData.phone || "",
        dateOfBirth: profileData.dateOfBirth || "",
        procedureDate: profileData.procedureDate || "",
        balloonType: profileData.balloonType || "",
        balloonDurationDays: profileData.balloonDurationDays || 180,
        weightStart: profileData.weightStart || 0,
        weightGoal: profileData.weightGoal || 0,
        weightCurrent: profileData.weightCurrent || profileData.weightStart || 0,
        doctorId: profileData.doctorId || "",
        clinicId: profileData.clinicId || "",
        allergiesMedications: profileData.allergiesMedications || [],
        allergiesFoods: profileData.allergiesFoods || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection("patients").doc(entityId).set(newPatient);
    }

    // 4. Create user record in 'users' collection to link auth with role profile
    await db.collection("users").doc(uid).set({
      email,
      name,
      role,
      entityId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Send welcome email via Resend
    let emailSubject = "";
    let emailHtml = "";

    if (role === "doctor") {
      emailSubject = "¡Bienvenido a Saciety Hub como Médico!";
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #2b3a42;">¡Hola Dr/Dra. ${name}!</h2>
          <p>Has sido registrado exitosamente en la plataforma de <strong>Saciety Hub</strong>.</p>
          <p>Puedes iniciar sesión con tus credenciales:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Contraseña temporal:</strong> ${password}</li>
          </ul>
          <p>Te recomendamos cambiar tu contraseña una vez hayas iniciado sesión por primera vez.</p>
          <br/>
          <p>Atentamente,<br/>El equipo de Saciety Hub</p>
        </div>
      `;
    } else {
      // patient
      emailSubject = "¡Bienvenido a Saciety Hub!";
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #2b3a42;">¡Hola ${name}!</h2>
          <p>Tu médico te ha registrado exitosamente en la plataforma de seguimiento de <strong>Saciety Hub</strong>.</p>
          <p>Puedes iniciar sesión para ver tu progreso con tus credenciales:</p>
          <ul>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Contraseña recomendada:</strong> ${password}</li>
          </ul>
          <p>Entra a nuestra plataforma para comenzar a registrar tu evolución.</p>
          <br/>
          <p>Atentamente,<br/>El equipo de Saciety Hub</p>
        </div>
      `;
    }

    try {
      await resend.emails.send({
        from: "Saciety Hub <onboarding@resend.dev>", // Usamos el dominio de prueba de Resend o tu dominio verificado
        to: email, // En producción enviar a `email`. En cuenta gratis de Resend, solo deja enviar a tu propio correo verificado, ojo con esto.
        subject: emailSubject,
        html: emailHtml,
      });
      console.log(`Correo enviado exitosamente a ${email}`);
    } catch (emailErr) {
      console.error("Error enviando correo de bienvenida:", emailErr);
      // No hacemos throw para no fallar el request de creacion de usuario.
    }

    return NextResponse.json(
      { success: true, message: "Usuario creado exitosamente.", entityId, uid },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error general en /api/create-user:", error);
    return NextResponse.json(
      { error: "Error interno del servidor.", details: error.message },
      { status: 500 }
    );
  }
}
