"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  doctors,
  patients,
  getPatientsForDoctor,
  getDaysSinceProcedure,
  getPatientPhase,
  getWeightLostPercent,
  type BalloonType,
  type Patient,
} from "@/lib/store"
import {
  User,
  Users,
  Plus,
  X,
  Check,
  ChevronRight,
  Calendar,
  Target,
  Activity,
  AlertTriangle,
  Pill,
  Leaf,
  ArrowLeft,
  Scale,
  Clock,
  Stethoscope,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

// Active doctor (in production comes from Firebase Auth session)
const ACTIVE_DOCTOR_ID = "dr-1"

const BALLOON_TYPES: { type: BalloonType; days: number }[] = [
  { type: "Orbera (6 meses)", days: 180 },
  { type: "Reshape (6 meses)", days: 180 },
  { type: "Spatz3 (12 meses)", days: 365 },
  { type: "Elipse (4 meses)", days: 120 },
]

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  procedureDate: "",
  balloonType: "" as BalloonType | "",
  balloonDurationDays: 180,
  weightStart: "",
  weightGoal: "",
  allergiesMedications: [] as string[],
  allergiesFoods: [] as string[],
  newMedAllergy: "",
  newFoodAllergy: "",
}

export default function DoctorDashboard() {
  return (
    <ProtectedRoute allowedRoles={["doctor"]}>
      <DoctorContent />
    </ProtectedRoute>
  )
}

function DoctorContent() {
  const doctor = doctors.find((d) => d.id === ACTIVE_DOCTOR_ID)!
  const [patientList, setPatientList] = useState<Patient[]>(getPatientsForDoctor(ACTIVE_DOCTOR_ID))
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [addSuccess, setAddSuccess] = useState(false)

  // ---- form helpers ----
  const updateForm = (key: keyof typeof form, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const addAllergy = (type: "med" | "food") => {
    if (type === "med") {
      const val = form.newMedAllergy.trim()
      if (val && !form.allergiesMedications.includes(val)) {
        updateForm("allergiesMedications", [...form.allergiesMedications, val])
      }
      updateForm("newMedAllergy", "")
    } else {
      const val = form.newFoodAllergy.trim()
      if (val && !form.allergiesFoods.includes(val)) {
        updateForm("allergiesFoods", [...form.allergiesFoods, val])
      }
      updateForm("newFoodAllergy", "")
    }
  }

  const removeAllergy = (type: "med" | "food", item: string) => {
    if (type === "med") updateForm("allergiesMedications", form.allergiesMedications.filter((a) => a !== item))
    else updateForm("allergiesFoods", form.allergiesFoods.filter((a) => a !== item))
  }

  const handleBalloonSelect = (bt: { type: BalloonType; days: number }) => {
    setForm((prev) => ({ ...prev, balloonType: bt.type, balloonDurationDays: bt.days }))
  }

  const isFormValid =
    form.name.trim() &&
    form.email.trim() &&
    form.procedureDate &&
    form.balloonType &&
    form.weightStart &&
    form.weightGoal

  const handleAddPatient = () => {
    if (!isFormValid) return
    const newPatient: Patient = {
      id: `p-${Date.now()}`,
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth,
      procedureDate: form.procedureDate,
      balloonType: form.balloonType as BalloonType,
      balloonDurationDays: form.balloonDurationDays,
      weightStart: parseFloat(form.weightStart),
      weightGoal: parseFloat(form.weightGoal),
      weightCurrent: parseFloat(form.weightStart),
      doctorId: ACTIVE_DOCTOR_ID,
      clinicId: doctor.clinicId,
      allergiesMedications: form.allergiesMedications,
      allergiesFoods: form.allergiesFoods,
    }
    patients.push(newPatient)
    setPatientList((prev) => [...prev, newPatient])
    setAddSuccess(true)
    setTimeout(() => {
      setAddSuccess(false)
      setShowAddModal(false)
      setForm(emptyForm)
    }, 1400)
  }

  // ---- patient detail view ----
  if (selectedPatient) {
    const day = getDaysSinceProcedure(selectedPatient.procedureDate)
    const phase = getPatientPhase(day)
    const pct = getWeightLostPercent(selectedPatient.weightStart, selectedPatient.weightCurrent, selectedPatient.weightGoal)
    const lost = selectedPatient.weightStart - selectedPatient.weightCurrent

    return (
      <main className="min-h-screen bg-background pb-10">
        <header className="bg-sidebar px-4 pb-6 pt-12">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => setSelectedPatient(null)}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Mis Pacientes</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-accent">
                <User className="h-7 w-7 text-sidebar-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">{selectedPatient.name}</h1>
                <p className="text-sm text-sidebar-foreground/70">{selectedPatient.email}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
          {/* Day Counter */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Progreso del tratamiento
                  </p>
                  <p className="text-4xl font-bold text-foreground mt-1">
                    Día {day}{" "}
                    <span className="text-base font-normal text-muted-foreground">
                      de {selectedPatient.balloonDurationDays}
                    </span>
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                    {selectedPatient.balloonType}
                  </span>
                </div>
                <div className="h-20 w-20">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3" className="text-muted"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={`${Math.min((day / selectedPatient.balloonDurationDays) * 100, 100)}, 100`}
                      className="text-primary"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                Fase {phase.phase}: <span className="font-medium text-foreground">{phase.label}</span>
              </div>
            </CardContent>
          </Card>

          {/* Weight Progress */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-5 w-5 text-primary" />
                Progreso de Peso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Inicio</p>
                  <p className="text-xl font-bold text-foreground">{selectedPatient.weightStart}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Actual</p>
                  <p className="text-xl font-bold text-primary">{selectedPatient.weightCurrent}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Meta</p>
                  <p className="text-xl font-bold text-foreground">{selectedPatient.weightGoal}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Pérdida: {lost > 0 ? `${lost} kg` : "Sin cambio"}</span>
                  <span>{pct}% de la meta</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Allergies */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Ficha de Alergias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-foreground">Medicamentos</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.allergiesMedications.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Ninguna</p>
                  ) : selectedPatient.allergiesMedications.map((a) => (
                    <span key={a} className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">{a}</span>
                  ))}
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-foreground">Alimentos</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.allergiesFoods.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Ninguna</p>
                  ) : selectedPatient.allergiesFoods.map((a) => (
                    <span key={a} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">{a}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Procedimiento: <span className="font-medium text-foreground">{selectedPatient.procedureDate}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <span>Tel: <span className="font-medium text-foreground">{selectedPatient.phone || "No registrado"}</span></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // ---- patient list view ----
  return (
    <main className="min-h-screen bg-background pb-10">
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground font-bold text-lg">
              {doctor.avatarInitials}
            </div>
            <div>
              <p className="text-xs text-sidebar-foreground/70 uppercase tracking-wider">Portal Médico</p>
              <h1 className="text-xl font-bold text-sidebar-foreground">{doctor.name}</h1>
              <p className="text-sm text-sidebar-foreground/70">{doctor.specialty}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pacientes", value: patientList.length, icon: Users },
            { label: "Activos hoy", value: patientList.filter((p) => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length, icon: Activity },
            { label: "Completados", value: patientList.filter((p) => getDaysSinceProcedure(p.procedureDate) >= p.balloonDurationDays).length, icon: Target },
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

        {/* Patient list */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Stethoscope className="h-5 w-5 text-primary" />
            Mis Pacientes
          </h2>
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </div>

        <div className="space-y-3">
          {patientList.map((patient) => {
            const day = getDaysSinceProcedure(patient.procedureDate)
            const phase = getPatientPhase(day)
            const done = day >= patient.balloonDurationDays
            return (
              <Card
                key={patient.id}
                className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-[0.99]"
                onClick={() => setSelectedPatient(patient)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{patient.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{patient.balloonType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          {done ? "Completo" : `Día ${day}`}
                          {!done && <span className="text-xs font-normal text-muted-foreground">/{patient.balloonDurationDays}</span>}
                        </p>
                        <span className={`text-xs font-medium ${done ? "text-muted-foreground" : "text-primary"}`}>
                          {done ? "Finalizado" : `Fase ${phase.phase}`}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {/* Mini progress bar */}
                  {!done && (
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min((day / patient.balloonDurationDays) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-6 py-4 z-10">
              <h2 className="text-lg font-bold text-foreground">Agregar Paciente</h2>
              <button
                onClick={() => { setShowAddModal(false); setForm(emptyForm) }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Personal info */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Datos Personales</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Nombre completo *</label>
                    <Input placeholder="Ej: María García" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Correo electrónico *</label>
                    <Input type="email" placeholder="paciente@email.com" value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Teléfono</label>
                    <Input placeholder="+52 55 1234 5678" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Fecha de nacimiento</label>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => updateForm("dateOfBirth", e.target.value)} />
                  </div>
                </div>
              </section>

              <div className="border-t border-border" />

              {/* Procedure info */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Procedimiento</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Fecha del procedimiento *</label>
                    <Input type="date" value={form.procedureDate} onChange={(e) => updateForm("procedureDate", e.target.value)} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Tipo de balón *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BALLOON_TYPES.map((bt) => (
                        <button
                          key={bt.type}
                          onClick={() => handleBalloonSelect(bt)}
                          className={`rounded-xl border-2 p-3 text-left transition-all ${
                            form.balloonType === bt.type
                              ? "border-primary bg-primary/5"
                              : "border-border bg-muted/40 hover:border-primary/40"
                          }`}
                        >
                          <p className={`text-xs font-semibold ${form.balloonType === bt.type ? "text-primary" : "text-foreground"}`}>
                            {bt.type.split(" (")[0]}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{bt.days} días</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="border-t border-border" />

              {/* Weight goals */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Metas de Peso</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Peso inicial (kg) *</label>
                    <Input type="number" placeholder="92" value={form.weightStart} onChange={(e) => updateForm("weightStart", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Peso meta (kg) *</label>
                    <Input type="number" placeholder="72" value={form.weightGoal} onChange={(e) => updateForm("weightGoal", e.target.value)} />
                  </div>
                </div>
              </section>

              <div className="border-t border-border" />

              {/* Allergies */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alergias</p>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-foreground">Medicamentos</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.allergiesMedications.map((a) => (
                        <span key={a} className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                          {a}
                          <button onClick={() => removeAllergy("med", a)} aria-label={`Eliminar ${a}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Agregar medicamento..."
                        value={form.newMedAllergy}
                        onChange={(e) => updateForm("newMedAllergy", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addAllergy("med")}
                        className="h-8 text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => addAllergy("med")} className="h-8 px-2">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-medium text-foreground">Alimentos</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.allergiesFoods.map((a) => (
                        <span key={a} className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                          {a}
                          <button onClick={() => removeAllergy("food", a)} aria-label={`Eliminar ${a}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Agregar alimento..."
                        value={form.newFoodAllergy}
                        onChange={(e) => updateForm("newFoodAllergy", e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addAllergy("food")}
                        className="h-8 text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => addAllergy("food")} className="h-8 px-2">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              <Button className="w-full" disabled={!isFormValid} onClick={handleAddPatient}>
                {addSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Paciente agregado
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Paciente
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
