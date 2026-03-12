// Saciety Hub — Shared in-memory store (replace with Firestore in production)
// This simulates multi-role data: SuperAdmin > Doctor > Patient

export type BalloonType =
  | "Orbera (6 meses)"
  | "Reshape (6 meses)"
  | "Spatz3 (12 meses)"
  | "Elipse (4 meses)"

export type PatientPhase = 1 | 2 | 3 | 4

export interface Patient {
  id: string
  name: string
  email: string
  phone: string
  dateOfBirth: string
  procedureDate: string // ISO date string "2024-03-01"
  balloonType: BalloonType
  balloonDurationDays: number // e.g. 120, 180, 365
  weightStart: number // kg
  weightGoal: number // kg
  weightCurrent: number // kg
  doctorId: string
  clinicId: string
  allergiesMedications: string[]
  allergiesFoods: string[]
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  email: string
  phone: string
  clinicId: string
  patientIds: string[]
  avatarInitials: string
}

export interface Clinic {
  id: string
  name: string
  address: string
  city: string
  phone: string
  doctorIds: string[]
  patientCount: number
  activeBalloonsCount: number
}

// ---------------------------------------------------------------------------
// Credentials — replace with Firebase Auth in production
// ---------------------------------------------------------------------------

export interface Credential {
  email: string
  password: string
  role: "patient" | "doctor" | "admin"
  /** id that links to the matching patient/doctor record */
  entityId: string
}

export const credentials: Credential[] = [
  // Patients
  { email: "maria.garcia@email.com",  password: "paciente123", role: "patient", entityId: "p-1" },
  { email: "jorge.h@email.com",       password: "paciente123", role: "patient", entityId: "p-2" },
  { email: "ana.m@email.com",         password: "paciente123", role: "patient", entityId: "p-3" },
  { email: "roberto.s@email.com",     password: "paciente123", role: "patient", entityId: "p-4" },
  { email: "val.cruz@email.com",      password: "paciente123", role: "patient", entityId: "p-5" },
  { email: "luis.p@email.com",        password: "paciente123", role: "patient", entityId: "p-6" },
  { email: "carmen.l@email.com",      password: "paciente123", role: "patient", entityId: "p-7" },
  // Doctors
  { email: "a.rios@cbdnorte.mx",      password: "doctor123",   role: "doctor",  entityId: "dr-1" },
  { email: "s.mendez@cbdnorte.mx",    password: "doctor123",   role: "doctor",  entityId: "dr-2" },
  { email: "c.vega@cms.mx",           password: "doctor123",   role: "doctor",  entityId: "dr-3" },
  { email: "l.ibanez@cwg.mx",         password: "doctor123",   role: "doctor",  entityId: "dr-4" },
  // Super admin
  { email: "admin@sacietyhub.mx",     password: "admin123",    role: "admin",   entityId: "superadmin" },
]

export function findCredential(email: string, password: string): Credential | null {
  return credentials.find(
    (c) => c.email.toLowerCase() === email.toLowerCase() && c.password === password
  ) ?? null
}

// ---------------------------------------------------------------------------
// Seed data — replace with Firestore reads in production
// ---------------------------------------------------------------------------

export const clinics: Clinic[] = [
  {
    id: "clinic-1",
    name: "Centro Bariátrico del Norte",
    address: "Av. Reforma 123",
    city: "Monterrey",
    phone: "+52 81 1234 5678",
    doctorIds: ["dr-1", "dr-2"],
    patientCount: 38,
    activeBalloonsCount: 31,
  },
  {
    id: "clinic-2",
    name: "Clínica Metabólica Sur",
    address: "Blvd. Insurgentes 456",
    city: "Ciudad de México",
    phone: "+52 55 9876 5432",
    doctorIds: ["dr-3"],
    patientCount: 22,
    activeBalloonsCount: 19,
  },
  {
    id: "clinic-3",
    name: "Centro Wellness Guadalajara",
    address: "Calle Libertad 789",
    city: "Guadalajara",
    phone: "+52 33 4567 8901",
    doctorIds: ["dr-4"],
    patientCount: 15,
    activeBalloonsCount: 12,
  },
]

export const doctors: Doctor[] = [
  {
    id: "dr-1",
    name: "Dr. Alejandro Ríos",
    specialty: "Cirugía Bariátrica",
    email: "a.rios@cbdnorte.mx",
    phone: "+52 81 1111 2222",
    clinicId: "clinic-1",
    patientIds: ["p-1", "p-2", "p-3"],
    avatarInitials: "AR",
  },
  {
    id: "dr-2",
    name: "Dra. Sofía Mendez",
    specialty: "Nutriología Clínica",
    email: "s.mendez@cbdnorte.mx",
    phone: "+52 81 3333 4444",
    clinicId: "clinic-1",
    patientIds: ["p-4"],
    avatarInitials: "SM",
  },
  {
    id: "dr-3",
    name: "Dr. Carlos Vega",
    specialty: "Cirugía Bariátrica",
    email: "c.vega@cms.mx",
    phone: "+52 55 5555 6666",
    clinicId: "clinic-2",
    patientIds: ["p-5", "p-6"],
    avatarInitials: "CV",
  },
  {
    id: "dr-4",
    name: "Dra. Laura Ibáñez",
    specialty: "Endocrinología",
    email: "l.ibanez@cwg.mx",
    phone: "+52 33 7777 8888",
    clinicId: "clinic-3",
    patientIds: ["p-7"],
    avatarInitials: "LI",
  },
]

export const patients: Patient[] = [
  {
    id: "p-1",
    name: "María García",
    email: "maria.garcia@email.com",
    phone: "+52 55 1234 5678",
    dateOfBirth: "1988-05-12",
    procedureDate: "2024-03-01",
    balloonType: "Orbera (6 meses)",
    balloonDurationDays: 180,
    weightStart: 92,
    weightGoal: 72,
    weightCurrent: 88,
    doctorId: "dr-1",
    clinicId: "clinic-1",
    allergiesMedications: ["Penicilina", "Ibuprofeno"],
    allergiesFoods: ["Mariscos", "Nueces", "Lácteos"],
  },
  {
    id: "p-2",
    name: "Jorge Herrera",
    email: "jorge.h@email.com",
    phone: "+52 81 2222 3333",
    dateOfBirth: "1979-11-03",
    procedureDate: "2024-02-14",
    balloonType: "Spatz3 (12 meses)",
    balloonDurationDays: 365,
    weightStart: 115,
    weightGoal: 90,
    weightCurrent: 107,
    doctorId: "dr-1",
    clinicId: "clinic-1",
    allergiesMedications: [],
    allergiesFoods: ["Gluten"],
  },
  {
    id: "p-3",
    name: "Ana Morales",
    email: "ana.m@email.com",
    phone: "+52 81 4444 5555",
    dateOfBirth: "1995-07-22",
    procedureDate: "2024-03-10",
    balloonType: "Elipse (4 meses)",
    balloonDurationDays: 120,
    weightStart: 78,
    weightGoal: 62,
    weightCurrent: 75,
    doctorId: "dr-1",
    clinicId: "clinic-1",
    allergiesMedications: ["Aspirina"],
    allergiesFoods: [],
  },
  {
    id: "p-4",
    name: "Roberto Sánchez",
    email: "roberto.s@email.com",
    phone: "+52 81 6666 7777",
    dateOfBirth: "1983-02-15",
    procedureDate: "2024-01-20",
    balloonType: "Reshape (6 meses)",
    balloonDurationDays: 180,
    weightStart: 103,
    weightGoal: 80,
    weightCurrent: 94,
    doctorId: "dr-2",
    clinicId: "clinic-1",
    allergiesMedications: [],
    allergiesFoods: ["Soya"],
  },
  {
    id: "p-5",
    name: "Valentina Cruz",
    email: "val.cruz@email.com",
    phone: "+52 55 8888 9999",
    dateOfBirth: "1991-09-30",
    procedureDate: "2024-03-05",
    balloonType: "Orbera (6 meses)",
    balloonDurationDays: 180,
    weightStart: 86,
    weightGoal: 68,
    weightCurrent: 83,
    doctorId: "dr-3",
    clinicId: "clinic-2",
    allergiesMedications: ["Sulfa"],
    allergiesFoods: ["Mariscos"],
  },
  {
    id: "p-6",
    name: "Luis Peña",
    email: "luis.p@email.com",
    phone: "+52 55 0000 1111",
    dateOfBirth: "1975-04-08",
    procedureDate: "2024-02-28",
    balloonType: "Spatz3 (12 meses)",
    balloonDurationDays: 365,
    weightStart: 128,
    weightGoal: 100,
    weightCurrent: 119,
    doctorId: "dr-3",
    clinicId: "clinic-2",
    allergiesMedications: [],
    allergiesFoods: [],
  },
  {
    id: "p-7",
    name: "Carmen López",
    email: "carmen.l@email.com",
    phone: "+52 33 2222 3333",
    dateOfBirth: "1986-12-19",
    procedureDate: "2024-03-08",
    balloonType: "Elipse (4 meses)",
    balloonDurationDays: 120,
    weightStart: 74,
    weightGoal: 60,
    weightCurrent: 72,
    doctorId: "dr-4",
    clinicId: "clinic-3",
    allergiesMedications: [],
    allergiesFoods: ["Frutos rojos"],
  },
]

// ---------------------------------------------------------------------------
// Helper utils
// ---------------------------------------------------------------------------

export function getDaysSinceProcedure(procedureDate: string): number {
  const start = new Date(procedureDate)
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

export function getPatientPhase(day: number): { phase: PatientPhase; label: string } {
  if (day <= 7) return { phase: 1, label: "Dieta Líquida Estricta" }
  if (day <= 21) return { phase: 2, label: "Líquidos Espesos y Purés" }
  if (day <= 60) return { phase: 3, label: "Alimentos Blandos" }
  return { phase: 4, label: "Alimentación Adaptada" }
}

export function getWeightLostPercent(start: number, current: number, goal: number): number {
  const totalToLose = start - goal
  const lost = start - current
  if (totalToLose <= 0) return 0
  return Math.round((lost / totalToLose) * 100)
}

export function getPatientsForDoctor(doctorId: string): Patient[] {
  return patients.filter((p) => p.doctorId === doctorId)
}

export function getDoctorsForClinic(clinicId: string): Doctor[] {
  return doctors.filter((d) => d.clinicId === clinicId)
}
