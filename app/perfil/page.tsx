"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BottomNav } from "@/components/bottom-nav"
import { PanicButton } from "@/components/panic-button"
import {
  patients,
  doctors,
  clinics,
  getDaysSinceProcedure,
  getPatientPhase,
  getWeightLostPercent,
} from "@/lib/store"
import {
  User,
  Building2,
  Phone,
  Calendar,
  FileText,
  MessageCircle,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
  AlertTriangle,
  Pill,
  Leaf,
  Plus,
  X,
  ClipboardList,
  Activity,
  Scale,
  Target,
} from "lucide-react"

// Active patient session — in production resolved from Firebase Auth
const ACTIVE_PATIENT_ID = "p-1"

const menuItems = [
  { icon: Bell, label: "Notificaciones" },
  { icon: Settings, label: "Configuración" },
  { icon: HelpCircle, label: "Ayuda y Soporte" },
  { icon: Shield, label: "Privacidad" },
]

export default function PerfilPage() {
  const patient = patients.find((p) => p.id === ACTIVE_PATIENT_ID)!
  const doctor = doctors.find((d) => d.id === patient.doctorId)
  const clinic = clinics.find((c) => c.id === patient.clinicId)

  const currentDay = getDaysSinceProcedure(patient.procedureDate)
  const { phase: phaseNumber, label: phaseLabel } = getPatientPhase(currentDay)
  const weightLostPct = getWeightLostPercent(patient.weightStart, patient.weightCurrent, patient.weightGoal)
  const weightLost = patient.weightStart - patient.weightCurrent

  // Allergy state — in production saved/loaded from Firestore
  const [medAllergyList, setMedAllergyList] = useState<string[]>(patient.allergiesMedications)
  const [foodAllergyList, setFoodAllergyList] = useState<string[]>(patient.allergiesFoods)
  const [newMedAllergy, setNewMedAllergy] = useState("")
  const [newFoodAllergy, setNewFoodAllergy] = useState("")
  const [editingMed, setEditingMed] = useState(false)
  const [editingFood, setEditingFood] = useState(false)

  const addMedAllergy = () => {
    const val = newMedAllergy.trim()
    if (val && !medAllergyList.includes(val)) setMedAllergyList((prev) => [...prev, val])
    setNewMedAllergy("")
  }
  const addFoodAllergy = () => {
    const val = newFoodAllergy.trim()
    if (val && !foodAllergyList.includes(val)) setFoodAllergyList((prev) => [...prev, val])
    setNewFoodAllergy("")
  }

  const handleWhatsAppClick = () => {
    const number = clinic?.phone.replace(/\D/g, "") ?? ""
    window.open(`https://wa.me/${number}?text=Hola, soy paciente del programa de balón gástrico.`, "_blank")
  }

  const handleDownloadPDF = () => {
    alert("PDF de instrucciones médicas — integración pendiente con Firebase Storage")
  }

  const handleLogout = () => {
    alert("Cerrar sesión — integración pendiente con Firebase Auth")
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sidebar-accent">
              <User className="h-8 w-8 text-sidebar-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">{patient.name}</h1>
              <p className="text-sm text-sidebar-foreground/70">{patient.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
        {/* Balloon & Treatment Info */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              Mi Tratamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Day progress */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Progreso del balón</p>
                <p className="text-3xl font-bold text-foreground mt-0.5">
                  Día {currentDay}
                  <span className="text-base font-normal text-muted-foreground"> de {patient.balloonDurationDays}</span>
                </p>
              </div>
              <div className="h-16 w-16">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"
                    strokeDasharray={`${Math.min((currentDay / patient.balloonDurationDays) * 100, 100)}, 100`}
                    className="text-primary"
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">Tipo de balón</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{patient.balloonType}</p>
              </div>
              <div className="rounded-xl bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Fase actual</p>
                <p className="text-sm font-semibold text-primary mt-0.5">Fase {phaseNumber}: {phaseLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Procedimiento: <span className="font-medium text-foreground">{patient.procedureDate}</span></span>
            </div>

            {doctor && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>Médico: <span className="font-medium text-foreground">{doctor.name}</span></span>
              </div>
            )}
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
                <p className="text-xl font-bold text-foreground">{patient.weightStart}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">Actual</p>
                <p className="text-xl font-bold text-primary">{patient.weightCurrent}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">Meta</p>
                <p className="text-xl font-bold text-foreground">{patient.weightGoal}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Pérdida: {weightLost > 0 ? `${weightLost} kg` : "Sin cambio aún"}</span>
                <span>{weightLostPct}% de la meta</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(weightLostPct, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ficha Médica */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5 text-primary" />
              Ficha Médica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Medication allergies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-semibold text-foreground">Alergias a Medicamentos</p>
                </div>
                <button
                  onClick={() => setEditingMed((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {editingMed ? "Listo" : "Editar"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {medAllergyList.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin alergias registradas</p>
                )}
                {medAllergyList.map((item) => (
                  <span key={item} className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                    {item}
                    {editingMed && (
                      <button onClick={() => setMedAllergyList((prev) => prev.filter((a) => a !== item))} aria-label={`Eliminar ${item}`}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editingMed && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Agregar medicamento..."
                    value={newMedAllergy}
                    onChange={(e) => setNewMedAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMedAllergy()}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={addMedAllergy} className="h-8 px-2">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Food allergies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-semibold text-foreground">Alergias Alimentarias</p>
                </div>
                <button
                  onClick={() => setEditingFood((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {editingFood ? "Listo" : "Editar"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {foodAllergyList.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin alergias registradas</p>
                )}
                {foodAllergyList.map((item) => (
                  <span key={item} className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    {item}
                    {editingFood && (
                      <button onClick={() => setFoodAllergyList((prev) => prev.filter((a) => a !== item))} aria-label={`Eliminar ${item}`}>
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editingFood && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Agregar alimento..."
                    value={newFoodAllergy}
                    onChange={(e) => setNewFoodAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFoodAllergy()}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={addFoodAllergy} className="h-8 px-2">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Esta información es usada por la IA para excluir ingredientes o productos no aptos para ti en recetas y recomendaciones.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Medical Center Section */}
        {clinic && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-primary" />
                Mi Centro Médico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-foreground">{clinic.name}</p>
                <p className="text-sm text-muted-foreground">{clinic.address}, {clinic.city}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => window.open(`tel:${clinic.phone}`, "_self")}
                >
                  <Phone className="h-4 w-4" />
                  Llamar
                </Button>
                <Button className="flex items-center gap-2" onClick={handleWhatsAppClick}>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <button
                  onClick={handleDownloadPDF}
                  className="flex w-full items-center justify-between rounded-lg bg-muted p-3 transition-colors hover:bg-muted/80"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Instrucciones Médicas</p>
                      <p className="text-xs text-muted-foreground">PDF con guía completa</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                <button className="flex w-full items-center justify-between rounded-lg bg-muted p-3 transition-colors hover:bg-muted/80">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Próximas Citas</p>
                      <p className="text-xs text-muted-foreground">15 Mar — Control mensual</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Options */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-2">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                className={`flex w-full items-center justify-between p-3 transition-colors hover:bg-muted rounded-lg ${
                  index < menuItems.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-4">Saciety Hub v1.0.0</p>
      </div>

      <PanicButton />
      <BottomNav />
    </main>
  )
}
