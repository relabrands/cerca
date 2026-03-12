"use client";

import { useState } from "react";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const firebaseConfig = {
  apiKey: "AIzaSyDbtOWm4D-W_sPdfuq7R7how91hi8XPWwM",
  authDomain: "cerca-rela.firebaseapp.com",
  projectId: "cerca-rela",
  storageBucket: "cerca-rela.firebasestorage.app",
  messagingSenderId: "568945874491",
  appId: "1:568945874491:web:9789f114504c5adae52e1e",
};

// Seed data — same as lib/store.ts but will be written to Firestore
const SEED_CLINICS = [
  { id: "clinic-1", name: "Centro Bariátrico del Norte", address: "Av. Reforma 123", city: "Monterrey", phone: "+52 81 1234 5678", doctorIds: ["dr-1", "dr-2"] },
  { id: "clinic-2", name: "Clínica Metabólica Sur", address: "Blvd. Insurgentes 456", city: "Ciudad de México", phone: "+52 55 9876 5432", doctorIds: ["dr-3"] },
  { id: "clinic-3", name: "Centro Wellness Guadalajara", address: "Calle Libertad 789", city: "Guadalajara", phone: "+52 33 4567 8901", doctorIds: ["dr-4"] },
];

const SEED_DOCTORS = [
  { id: "dr-1", name: "Dr. Alejandro Ríos", specialty: "Cirugía Bariátrica", email: "a.rios@cbdnorte.mx", phone: "+52 81 1111 2222", clinicId: "clinic-1", avatarInitials: "AR" },
  { id: "dr-2", name: "Dra. Sofía Mendez", specialty: "Nutriología Clínica", email: "s.mendez@cbdnorte.mx", phone: "+52 81 3333 4444", clinicId: "clinic-1", avatarInitials: "SM" },
  { id: "dr-3", name: "Dr. Carlos Vega", specialty: "Cirugía Bariátrica", email: "c.vega@cms.mx", phone: "+52 55 5555 6666", clinicId: "clinic-2", avatarInitials: "CV" },
  { id: "dr-4", name: "Dra. Laura Ibáñez", specialty: "Endocrinología", email: "l.ibanez@cwg.mx", phone: "+52 33 7777 8888", clinicId: "clinic-3", avatarInitials: "LI" },
];

const SEED_PATIENTS = [
  { id: "p-1", name: "María García", email: "maria.garcia@email.com", phone: "+52 55 1234 5678", dateOfBirth: "1988-05-12", procedureDate: "2024-03-01", balloonType: "Orbera (6 meses)", balloonDurationDays: 180, weightStart: 92, weightGoal: 72, weightCurrent: 88, doctorId: "dr-1", clinicId: "clinic-1", allergiesMedications: ["Penicilina", "Ibuprofeno"], allergiesFoods: ["Mariscos", "Nueces"] },
  { id: "p-2", name: "Jorge Herrera", email: "jorge.h@email.com", phone: "+52 81 2222 3333", dateOfBirth: "1979-11-03", procedureDate: "2024-02-14", balloonType: "Spatz3 (12 meses)", balloonDurationDays: 365, weightStart: 115, weightGoal: 90, weightCurrent: 107, doctorId: "dr-1", clinicId: "clinic-1", allergiesMedications: [], allergiesFoods: ["Gluten"] },
  { id: "p-3", name: "Ana Morales", email: "ana.m@email.com", phone: "+52 81 4444 5555", dateOfBirth: "1995-07-22", procedureDate: "2024-03-10", balloonType: "Elipse (4 meses)", balloonDurationDays: 120, weightStart: 78, weightGoal: 62, weightCurrent: 75, doctorId: "dr-1", clinicId: "clinic-1", allergiesMedications: ["Aspirina"], allergiesFoods: [] },
  { id: "p-4", name: "Roberto Sánchez", email: "roberto.s@email.com", phone: "+52 81 6666 7777", dateOfBirth: "1983-02-15", procedureDate: "2024-01-20", balloonType: "Reshape (6 meses)", balloonDurationDays: 180, weightStart: 103, weightGoal: 80, weightCurrent: 94, doctorId: "dr-2", clinicId: "clinic-1", allergiesMedications: [], allergiesFoods: ["Soya"] },
  { id: "p-5", name: "Valentina Cruz", email: "val.cruz@email.com", phone: "+52 55 8888 9999", dateOfBirth: "1991-09-30", procedureDate: "2024-03-05", balloonType: "Orbera (6 meses)", balloonDurationDays: 180, weightStart: 86, weightGoal: 68, weightCurrent: 83, doctorId: "dr-3", clinicId: "clinic-2", allergiesMedications: ["Sulfa"], allergiesFoods: ["Mariscos"] },
  { id: "p-6", name: "Luis Peña", email: "luis.p@email.com", phone: "+52 55 0000 1111", dateOfBirth: "1975-04-08", procedureDate: "2024-02-28", balloonType: "Spatz3 (12 meses)", balloonDurationDays: 365, weightStart: 128, weightGoal: 100, weightCurrent: 119, doctorId: "dr-3", clinicId: "clinic-2", allergiesMedications: [], allergiesFoods: [] },
  { id: "p-7", name: "Carmen López", email: "carmen.l@email.com", phone: "+52 33 2222 3333", dateOfBirth: "1986-12-19", procedureDate: "2024-03-08", balloonType: "Elipse (4 meses)", balloonDurationDays: 120, weightStart: 74, weightGoal: 60, weightCurrent: 72, doctorId: "dr-4", clinicId: "clinic-3", allergiesMedications: [], allergiesFoods: ["Frutos rojos"] },
];

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("paciente");
  const [name, setName] = useState("");
  const [entityId, setEntityId] = useState("");

  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    let secondaryApp: ReturnType<typeof initializeApp> | null = null;

    try {
      // Create a SECONDARY Firebase App instance to avoid changing the session
      // of the currently logged-in admin user
      const secondaryAppName = `secondary-${Date.now()}`;
      const existingApps = getApps().map((a) => a.name);
      if (!existingApps.includes(secondaryAppName)) {
        secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      }
      const secondaryAuth = getAuth(secondaryApp!);

      // Create user auth — uses secondary instance, so admin session stays intact
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const user = userCredential.user;

      // Sign out from secondary instance immediately
      await secondaryAuth.signOut();

      // Save role and data in Firestore with a timeout to prevent infinite loading
      await Promise.race([
        setDoc(doc(db, "users", user.uid), {
          email: user.email,
          name: name,
          role: role,
          entityId: entityId || null,
          createdAt: new Date()
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Firestore no responde. Confirma que la base de datos está creada.")), 8000))
      ]);

      setMessage({ type: "success", text: `✅ Usuario ${role} "${name}" creado. La sesión del admin no fue afectada.` });

      // Clear form
      setEmail("");
      setPassword("");
      setName("");
      setEntityId("");

    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setMessage({ type: "error", text: "Este correo electrónico ya está registrado." });
      } else {
        setMessage({ type: "error", text: `Error: ${error.message}` });
      }
    } finally {
      // Always delete the secondary app to clean up resources
      if (secondaryApp) {
        try { await deleteApp(secondaryApp); } catch (_) {}
      }
      setLoading(false);
    }
  }

  async function handleSeedData() {
    setSeeding(true);
    setMessage({ type: "", text: "" });
    try {
      const batch = writeBatch(db);

      for (const clinic of SEED_CLINICS) {
        batch.set(doc(db, "clinics", clinic.id), clinic);
      }
      for (const doctor of SEED_DOCTORS) {
        batch.set(doc(db, "doctors", doctor.id), doctor);
      }
      for (const patient of SEED_PATIENTS) {
        batch.set(doc(db, "patients", patient.id), patient);
      }

      await batch.commit();
      setMessage({ type: "success", text: `✅ Datos sembrados: ${SEED_CLINICS.length} clínicas, ${SEED_DOCTORS.length} doctores, ${SEED_PATIENTS.length} pacientes.` });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: "error", text: `Error al sembrar datos: ${error.message}` });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuración de Prueba</CardTitle>
          <CardDescription>
            Crea usuarios de prueba. La sesión actual del admin no se verá afectada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Dr. Juan Pérez"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Correo Electrónico</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña (Mínimo 6 caracteres)</label>
              <Input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rol del sistema</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (Admin)</SelectItem>
                  <SelectItem value="doctor">Médico (Doctor)</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ID de Entidad (opcional)</label>
              <Input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder={role === "doctor" ? "Ej: dr-1" : role === "paciente" ? "Ej: p-1" : "superadmin"}
              />
              <p className="text-xs text-muted-foreground">
                Para doctores usa: dr-1, dr-2, dr-3, dr-4. Para pacientes: p-1...p-7
              </p>
            </div>

            {message.text && (
              <div className={`p-3 text-sm rounded ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creando..." : "Registrar Usuario de Prueba"}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Una vez creados, ve a <a href="/login" className="underline text-primary">/login</a> para iniciar sesión.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md border-dashed border-amber-500/50">
        <CardHeader>
          <CardTitle className="text-base">🌱 Sembrar Datos de Prueba</CardTitle>
          <CardDescription>
            Carga las clínicas, doctores y pacientes de muestra en Firestore. Solo hazlo una vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
            onClick={handleSeedData}
            disabled={seeding}
          >
            {seeding ? "Sembrando datos..." : "Sembrar Clínicas, Doctores y Pacientes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
