"use client"

import { useState, useEffect, useCallback } from "react"
import { collection, getDocs, addDoc, doc, setDoc, query, where, orderBy } from "firebase/firestore"
import { initializeApp, getApps, deleteApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Users,
  Stethoscope,
  Activity,
  ChevronRight,
  ArrowLeft,
  MapPin,
  Phone,
  TrendingDown,
  Shield,
  User,
  Loader2,
  Plus,
  X,
  Check,
  Mail,
  Lock,
  Pencil,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { getDaysSinceProcedure, type Clinic, type Doctor, type Patient } from "@/lib/store"

const firebaseConfig = {
  apiKey: "AIzaSyDbtOWm4D-W_sPdfuq7R7how91hi8XPWwM",
  authDomain: "cerca-rela.firebaseapp.com",
  projectId: "cerca-rela",
  storageBucket: "cerca-rela.firebasestorage.app",
  messagingSenderId: "568945874491",
  appId: "1:568945874491:web:9789f114504c5adae52e1e",
}

type View = "overview" | "clinic" | "doctor"

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function generateDoctorId() {
  return `dr-${Date.now()}`
}

function generateClinicId() {
  return `clinic-${Date.now()}`
}

const emptyDoctorForm = {
  name: "",
  specialty: "",
  email: "",
  password: "",
  phone: "",
  clinicId: "",
}

const emptyClinicForm = {
  name: "",
  city: "",
  address: "",
  phone: "",
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
function SuperAdminContent() {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  const [view, setView] = useState<View>("overview")
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  // Modals
  const [showAddDoctor, setShowAddDoctor] = useState(false)
  const [showAddClinic, setShowAddClinic] = useState(false)
  const [doctorForm, setDoctorForm] = useState(emptyDoctorForm)
  const [clinicForm, setClinicForm] = useState(emptyClinicForm)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")

  const loadData = useCallback(async () => {
    try {
      const [clinicsSnap, doctorsSnap, patientsSnap] = await Promise.all([
        getDocs(collection(db, "clinics")),
        getDocs(collection(db, "doctors")),
        getDocs(collection(db, "patients")),
      ])
      setClinics(clinicsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Clinic)))
      setDoctors(doctorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)))
      setPatients(patientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)))
    } catch (err: any) {
      setError(`Error cargando datos: ${err.message}`)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Create Doctor ──────────────────────────────────
  async function handleCreateDoctor() {
    if (!doctorForm.name || !doctorForm.email || !doctorForm.password || doctorForm.password.length < 6) return
    setSaving(true)
    setSaveError("")

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "doctor",
          name: doctorForm.name,
          email: doctorForm.email,
          password: doctorForm.password,
          phone: doctorForm.phone,
          specialty: doctorForm.specialty,
          clinicId: doctorForm.clinicId,
        }),
      })

      const textRes = await response.text()
      let data
      try {
        data = JSON.parse(textRes)
      } catch (parseError) {
        throw new Error(`Error crítico del servidor: ${textRes.slice(0, 60)}...`)
      }

      if (!response.ok) {
        throw new Error(data.error || "Error creando doctor")
      }

      // El backend ya lo guardó en Firestore con un entityId
      const entityId = data.entityId
      const initials = doctorForm.name
        .split(" ")
        .filter((w) => w.length > 0)
        .map((w) => w[0].toUpperCase())
        .slice(0, 2)
        .join("")

      // Update local state
      setDoctors((prev) => [...prev, {
        id: entityId,
        name: doctorForm.name,
        specialty: doctorForm.specialty,
        email: doctorForm.email,
        phone: doctorForm.phone,
        clinicId: doctorForm.clinicId,
        avatarInitials: initials,
        patientIds: [],
      } as Doctor])

      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowAddDoctor(false)
        setDoctorForm(emptyDoctorForm)
      }, 1400)

    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Create Clinic ──────────────────────────────────
  async function handleCreateClinic() {
    if (!clinicForm.name || !clinicForm.city) return
    setSaving(true)
    setSaveError("")
    try {
      const newClinic = {
        name: clinicForm.name,
        city: clinicForm.city,
        address: clinicForm.address,
        phone: clinicForm.phone,
        doctorIds: [],
        patientCount: 0,
        activeBalloonsCount: 0,
        createdAt: new Date(),
      }
      const ref = await addDoc(collection(db, "clinics"), newClinic)
      setClinics((prev) => [...prev, { id: ref.id, ...newClinic } as Clinic])
      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
        setShowAddClinic(false)
        setClinicForm(emptyClinicForm)
      }, 1200)
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando panel de administración...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6">
        <p className="text-sm text-destructive text-center">{error}</p>
      </div>
    )
  }

  const totalPatients = patients.length
  const totalDoctors = doctors.length
  const totalClinics = clinics.length
  const activePatients = patients.filter(p => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length

  const balloonBreakdown = [
    "Orbera (6 meses)",
    "Reshape (6 meses)",
    "Spatz3 (12 meses)",
    "Elipse (4 meses)",
  ].map((type) => ({
    type: type.split(" (")[0],
    count: patients.filter((p) => p.balloonType === type).length,
  }))

  // ─── Doctor detail ────────────────────────────────
  if (view === "doctor" && selectedDoctor) {
    const doctorPatients = patients.filter((p) => p.doctorId === selectedDoctor.id)
    const clinic = clinics.find((c) => c.id === selectedDoctor.clinicId)
    return (
      <main className="min-h-screen bg-background pb-10">
        <header className="bg-sidebar px-4 pb-6 pt-12">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => { setView(selectedClinic ? "clinic" : "overview"); setSelectedDoctor(null) }}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{selectedClinic ? selectedClinic.name : "Panel de Control"}</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-accent font-bold text-xl text-sidebar-foreground">
                {selectedDoctor.avatarInitials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">{selectedDoctor.name}</h1>
                <p className="text-sm text-sidebar-foreground/70">{selectedDoctor.specialty}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Pacientes totales", value: doctorPatients.length, icon: Users },
              { label: "Balones activos", value: doctorPatients.filter(p => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length, icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-0 shadow-md">
                <CardContent className="flex flex-col items-center justify-center p-4 gap-1">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground text-center">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{selectedDoctor.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{selectedDoctor.phone || "No registrado"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{clinic?.name || "Clínica no asignada"}</span>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
              <Users className="h-5 w-5 text-primary" />
              Pacientes ({doctorPatients.length})
            </h2>
            {doctorPatients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin pacientes aún.</p>
            )}
            <div className="space-y-3">
              {doctorPatients.map((p) => {
                const day = getDaysSinceProcedure(p.procedureDate)
                const done = day >= p.balloonDurationDays
                return (
                  <Card key={p.id} className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.balloonType}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">
                            {done ? "Completo" : `Día ${day}/${p.balloonDurationDays}`}
                          </p>
                          <p className="text-xs text-primary font-medium">
                            -{(p.weightStart - p.weightCurrent)} kg
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((day / p.balloonDurationDays) * 100, 100)}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── Clinic detail ───────────────────────────────
  if (view === "clinic" && selectedClinic) {
    const clinicDoctors = doctors.filter(d => d.clinicId === selectedClinic.id)
    const clinicPatients = patients.filter(p => p.clinicId === selectedClinic.id)
    const activeCount = clinicPatients.filter(p => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length

    return (
      <main className="min-h-screen bg-background pb-10">
        <header className="bg-sidebar px-4 pb-6 pt-12">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => { setView("overview"); setSelectedClinic(null) }}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Panel de Control</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-accent">
                <Building2 className="h-6 w-6 text-sidebar-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">{selectedClinic.name}</h1>
                <p className="text-sm text-sidebar-foreground/70">{selectedClinic.city}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Médicos", value: clinicDoctors.length, icon: Stethoscope },
              { label: "Pacientes", value: clinicPatients.length, icon: Users },
              { label: "Activos", value: activeCount, icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-0 shadow-md">
                <CardContent className="flex flex-col items-center justify-center p-4 gap-1">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{selectedClinic.address || "Sin dirección"}, {selectedClinic.city}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{selectedClinic.phone || "Sin teléfono"}</span>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
              <Stethoscope className="h-5 w-5 text-primary" />
              Médicos en esta clínica
            </h2>
            {clinicDoctors.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sin médicos asignados a esta clínica.</p>
            )}
            <div className="space-y-3">
              {clinicDoctors.map((d) => {
                const docPatients = patients.filter(p => p.doctorId === d.id)
                return (
                  <Card key={d.id} className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg" onClick={() => { setSelectedDoctor(d); setView("doctor") }}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-sm text-primary">{d.avatarInitials}</div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.specialty || "Sin especialidad"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{docPatients.length}</p>
                          <p className="text-xs text-muted-foreground">pacientes</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─── Overview ─────────────────────────────────────
  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-sidebar-primary" />
            <span className="text-xs uppercase tracking-widest text-sidebar-foreground/60">Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground">Panel de Control</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-0.5">Red Saciety Hub — Vista global</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">

        {/* Global KPIs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Clínicas activas", value: totalClinics, icon: Building2, sub: "en la red" },
            { label: "Médicos registrados", value: totalDoctors, icon: Stethoscope, sub: "en total" },
            { label: "Pacientes totales", value: totalPatients, icon: Users, sub: "en plataforma" },
            { label: "Balones activos", value: activePatients, icon: Activity, sub: "en seguimiento" },
          ].map(({ label, value, icon: Icon, sub }) => (
            <Card key={label} className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Balloon breakdown */}
        {totalPatients > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-5 w-5 text-primary" />
                Distribución por Tipo de Balón
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {balloonBreakdown.map(({ type, count }) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{type}</span>
                    <span className="text-muted-foreground">{count} paciente{count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: totalPatients > 0 ? `${(count / totalPatients) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Clinics ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              Clínicas
            </h2>
            <Button size="sm" onClick={() => { setSaveError(""); setShowAddClinic(true) }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>

          {clinics.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin clínicas. Agrega una arriba.</p>
          )}

          <div className="space-y-3">
            {clinics.map((clinic) => {
              const clinicDoctors = doctors.filter(d => d.clinicId === clinic.id)
              const clinicPatients = patients.filter(p => p.clinicId === clinic.id)
              const active = clinicPatients.filter(p => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length
              return (
                <Card key={clinic.id} className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-[0.99]" onClick={() => { setSelectedClinic(clinic); setView("clinic") }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{clinic.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />
                            <span>{clinic.city}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted py-2">
                        <p className="text-sm font-bold text-foreground">{clinicDoctors.length}</p>
                        <p className="text-xs text-muted-foreground">médicos</p>
                      </div>
                      <div className="rounded-lg bg-muted py-2">
                        <p className="text-sm font-bold text-foreground">{clinicPatients.length}</p>
                        <p className="text-xs text-muted-foreground">pacientes</p>
                      </div>
                      <div className="rounded-lg bg-primary/5 py-2">
                        <p className="text-sm font-bold text-primary">{active}</p>
                        <p className="text-xs text-muted-foreground">activos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* ── Doctors ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <Stethoscope className="h-5 w-5 text-primary" />
              Médicos
            </h2>
            <Button size="sm" onClick={() => { setSaveError(""); setShowAddDoctor(true) }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Agregar
            </Button>
          </div>

          {doctors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin médicos registrados. Agrega uno arriba.</p>
          )}

          <div className="space-y-3">
            {doctors.map((doctor) => {
              const docPatients = patients.filter(p => p.doctorId === doctor.id)
              const clinic = clinics.find(c => c.id === doctor.clinicId)
              return (
                <Card key={doctor.id} className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg" onClick={() => { setSelectedDoctor(doctor); setSelectedClinic(clinic || null); setView("doctor") }}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-sm text-primary">{doctor.avatarInitials}</div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{doctor.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {clinic ? clinic.name : "Sin clínica"} — {doctor.specialty || "Sin especialidad"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{docPatients.length}</p>
                        <p className="text-xs text-muted-foreground">pacientes</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Empty state */}
        {totalClinics === 0 && totalDoctors === 0 && totalPatients === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground text-sm">Empieza creando una clínica y luego agrega médicos.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Add Clinic Modal ── */}
      {showAddClinic && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Nueva Clínica</h2>
              </div>
              <button onClick={() => { setShowAddClinic(false); setClinicForm(emptyClinicForm); setSaveError("") }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Nombre de la clínica *</label>
                <Input placeholder="Ej: Centro Bariátrico Norte" value={clinicForm.name} onChange={e => setClinicForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Ciudad *</label>
                <Input placeholder="Ej: Santo Domingo" value={clinicForm.city} onChange={e => setClinicForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Dirección</label>
                <Input placeholder="Ej: Av. Independencia 123" value={clinicForm.address} onChange={e => setClinicForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Teléfono</label>
                <Input placeholder="+1 809 555 1234" value={clinicForm.phone} onChange={e => setClinicForm(p => ({ ...p, phone: e.target.value }))} />
              </div>

              {saveError && <p className="text-xs text-destructive bg-destructive/10 p-3 rounded">{saveError}</p>}

              <Button className="w-full" disabled={!clinicForm.name || !clinicForm.city || saving} onClick={handleCreateClinic}>
                {saveSuccess ? (
                  <><Check className="mr-2 h-4 w-4" />Clínica creada</>
                ) : saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" />Crear Clínica</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Doctor Modal ── */}
      {showAddDoctor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-6 py-4 z-10">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Registrar Médico</h2>
              </div>
              <button onClick={() => { setShowAddDoctor(false); setDoctorForm(emptyDoctorForm); setSaveError("") }} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Nombre completo *</label>
                <Input placeholder="Dr. Juan Pérez" value={doctorForm.name} onChange={e => setDoctorForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Especialidad</label>
                <Input placeholder="Ej: Cirugía Bariátrica" value={doctorForm.specialty} onChange={e => setDoctorForm(p => ({ ...p, specialty: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Teléfono</label>
                <Input placeholder="+1 809 555 1234" value={doctorForm.phone} onChange={e => setDoctorForm(p => ({ ...p, phone: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Clínica</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  value={doctorForm.clinicId}
                  onChange={e => setDoctorForm(p => ({ ...p, clinicId: e.target.value }))}
                >
                  <option value="">Sin clínica asignada</option>
                  {clinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Acceso al sistema</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Correo electrónico *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" type="email" placeholder="medico@clinica.com" value={doctorForm.email} onChange={e => setDoctorForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Contraseña temporal (mín. 6 caracteres) *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" type="text" placeholder="Contraseña temporal" value={doctorForm.password} onChange={e => setDoctorForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">El médico puede cambiarla después de su primer inicio de sesión.</p>
                  </div>
                </div>
              </div>

              {saveError && <p className="text-xs text-destructive bg-destructive/10 p-3 rounded">{saveError}</p>}

              <Button
                className="w-full"
                disabled={!doctorForm.name || !doctorForm.email || doctorForm.password.length < 6 || saving}
                onClick={handleCreateDoctor}
              >
                {saveSuccess ? (
                  <><Check className="mr-2 h-4 w-4" />Médico registrado</>
                ) : saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" />Registrar Médico</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function SuperAdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SuperAdminContent />
    </ProtectedRoute>
  )
}
