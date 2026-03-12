"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  clinics,
  doctors,
  patients,
  getDaysSinceProcedure,
  getDoctorsForClinic,
  type Clinic,
  type Doctor,
} from "@/lib/store"
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
  Target,
} from "lucide-react"

type View = "overview" | "clinic" | "doctor"

export default function SuperAdminDashboard() {
  const [view, setView] = useState<View>("overview")
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)

  const totalPatients = patients.length
  const totalDoctors = doctors.length
  const totalClinics = clinics.length
  const activePatients = patients.filter(
    (p) => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays
  ).length

  const balloonBreakdown = [
    "Orbera (6 meses)",
    "Reshape (6 meses)",
    "Spatz3 (12 meses)",
    "Elipse (4 meses)",
  ].map((type) => ({
    type: type.split(" (")[0],
    count: patients.filter((p) => p.balloonType === type).length,
  }))

  // ---- Doctor detail view ----
  if (view === "doctor" && selectedDoctor) {
    const doctorPatients = patients.filter((p) => p.doctorId === selectedDoctor.id)
    const clinic = clinics.find((c) => c.id === selectedDoctor.clinicId)
    return (
      <main className="min-h-screen bg-background pb-10">
        <header className="bg-sidebar px-4 pb-6 pt-12">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => { setView("clinic"); setSelectedDoctor(null) }}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">{clinic?.name}</span>
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
              {
                label: "Balones activos",
                value: doctorPatients.filter((p) => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length,
                icon: Activity,
              },
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
                <Phone className="h-4 w-4" />
                <span>{selectedDoctor.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{clinic?.name}</span>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
              <Users className="h-5 w-5 text-primary" />
              Pacientes ({doctorPatients.length})
            </h2>
            <div className="space-y-3">
              {doctorPatients.map((p) => {
                const day = getDaysSinceProcedure(p.procedureDate)
                const done = day >= p.balloonDurationDays
                const lost = p.weightStart - p.weightCurrent
                return (
                  <Card key={p.id} className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
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
                          {lost > 0 && (
                            <p className="text-xs text-primary font-medium">-{lost} kg</p>
                          )}
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min((day / p.balloonDurationDays) * 100, 100)}%` }}
                        />
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

  // ---- Clinic detail view ----
  if (view === "clinic" && selectedClinic) {
    const clinicDoctors = getDoctorsForClinic(selectedClinic.id)
    const clinicPatients = patients.filter((p) => p.clinicId === selectedClinic.id)
    const activeCount = clinicPatients.filter(
      (p) => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays
    ).length

    return (
      <main className="min-h-screen bg-background pb-10">
        <header className="bg-sidebar px-4 pb-6 pt-12">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => { setView("overview"); setSelectedClinic(null) }}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Todas las Clínicas</span>
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
              { label: "Doctores", value: clinicDoctors.length, icon: Stethoscope },
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
                <span>{selectedClinic.address}, {selectedClinic.city}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{selectedClinic.phone}</span>
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
              <Stethoscope className="h-5 w-5 text-primary" />
              Médicos
            </h2>
            <div className="space-y-3">
              {clinicDoctors.map((doc) => {
                const docPatients = patients.filter((p) => p.doctorId === doc.id)
                return (
                  <Card
                    key={doc.id}
                    className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg"
                    onClick={() => { setSelectedDoctor(doc); setView("doctor") }}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-sm text-primary">
                          {doc.avatarInitials}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.specialty}</p>
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

  // ---- Overview ----
  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-sidebar-primary" />
            <span className="text-xs uppercase tracking-widest text-sidebar-foreground/60">Super Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-sidebar-foreground">Panel de Control</h1>
          <p className="text-sm text-sidebar-foreground/70 mt-0.5">Vista global de toda la red Saciety Hub</p>
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
                  <span className="text-muted-foreground">{count} pacientes</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: totalPatients > 0 ? `${(count / totalPatients) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Clinics list */}
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
            <Building2 className="h-5 w-5 text-primary" />
            Clínicas
          </h2>
          <div className="space-y-3">
            {clinics.map((clinic) => {
              const clinicDoctors = getDoctorsForClinic(clinic.id)
              const clinicPatients = patients.filter((p) => p.clinicId === clinic.id)
              const active = clinicPatients.filter(
                (p) => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays
              ).length
              return (
                <Card
                  key={clinic.id}
                  className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-[0.99]"
                  onClick={() => { setSelectedClinic(clinic); setView("clinic") }}
                >
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

        {/* All doctors summary */}
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground mb-3">
            <Stethoscope className="h-5 w-5 text-primary" />
            Todos los Médicos
          </h2>
          <div className="space-y-3">
            {doctors.map((doc) => {
              const docPatients = patients.filter((p) => p.doctorId === doc.id)
              const clinic = clinics.find((c) => c.id === doc.clinicId)
              return (
                <Card
                  key={doc.id}
                  className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => { setSelectedDoctor(doc); setSelectedClinic(clinic || null); setView("doctor") }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-sm text-primary">
                        {doc.avatarInitials}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{clinic?.city} — {doc.specialty}</p>
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
