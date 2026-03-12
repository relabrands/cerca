import { NextResponse } from "next/server";
import admin from "firebase-admin";

export async function POST(req: Request) {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || "")
            .replace(/^"|"$/g, "")
            .replace(/\\n/g, "\n"),
        }),
      });
    }
    const adminDb = admin.firestore();

    const { patientId, patientName, doctorId, coords } = await req.json();

    if (!patientId || !doctorId) {
      return NextResponse.json({ error: "Faltan datos del paciente o doctor." }, { status: 400 });
    }

    // Registrar alerta de pánico en Firestore
    const alertData = {
      patientId,
      patientName,
      doctorId,
      coords: coords || null,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("alerts").add(alertData);

    // Opcional: Aquí se podría integrar Resend para enviar un correo de urgencia al doctor
    // await resend.emails.send({ ... })

    return NextResponse.json({ success: true, alertId: docRef.id });
  } catch (error: any) {
    console.error("Error registrando pánico:", error);
    return NextResponse.json(
      { error: "Error procesando solicitud de auxilio.", details: error.message },
      { status: 500 }
    );
  }
}
