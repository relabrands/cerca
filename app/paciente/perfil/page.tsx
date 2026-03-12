"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BottomNav } from "@/components/bottom-nav"
import { PanicButton } from "@/components/panic-button"
import {
  getDaysSinceProcedure,
  getPatientPhase,
  getWeightLostPercent,
  type Patient,
  type Doctor,
  type Clinic
} from "@/lib/store"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
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
  Loader2
} from "lucide-react"

const menuItems = [
  { icon: Bell, label: "Notificaciones" },
  { icon: Settings, label: "Configuración" },
  { icon: HelpCircle, label: "Ayuda y Soporte" },
  { icon: Shield, label: "Privacidad" },
]

export default function PerfilPage() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  // Allergy state
  const [medAllergyList, setMedAllergyList] = useState<string[]>([])
  const [foodAllergyList, setFoodAllergyList] = useState<string[]>([])
  const [newMedAllergy, setNewMedAllergy] = useState("")
  const [newFoodAllergy, setNewFoodAllergy] = useState("")
  const [editingMed, setEditingMed] = useState(false)
  const [editingFood, setEditingFood] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoadingData(false)
        return
      }
      try {
        let fetchedPatient: Patient | null = null

        // 1. Try loading patient via entityId in user profile
        const userDoc = await getDoc(doc(db, "users", user.uid))
        const userData = userDoc.exists() ? userDoc.data() : null
        const entityId = userData?.entityId

        if (entityId) {
          const patientDoc = await getDoc(doc(db, "patients", entityId))
          if (patientDoc.exists()) {
            fetchedPatient = { id: patientDoc.id, ...patientDoc.data() } as Patient
          }
        }

        // 2. Fallback: find patient record by email
        if (!fetchedPatient && user.email) {
          const q = query(collection(db, "patients"), where("email", "==", user.email))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const patientDoc = snap.docs[0]
            fetchedPatient = { id: patientDoc.id, ...patientDoc.data() } as Patient
          }
        }

        if (fetchedPatient) {
          setPatient(fetchedPatient)
          setMedAllergyList(fetchedPatient.allergiesMedications || [])
          setFoodAllergyList(fetchedPatient.allergiesFoods || [])

          // Fetch doctor
          if (fetchedPatient.doctorId) {
            const doctorDoc = await getDoc(doc(db, "doctors", fetchedPatient.doctorId))
            if (doctorDoc.exists()) setDoctor({ id: doctorDoc.id, ...doctorDoc.data() } as Doctor)
          }
          // Fetch clinic
          if (fetchedPatient.clinicId) {
            const clinicDoc = await getDoc(doc(db, "clinics", fetchedPatient.clinicId))
            if (clinicDoc.exists()) setClinic({ id: clinicDoc.id, ...clinicDoc.data() } as Clinic)
          }
        } else {
          setError("No se encontraron tus datos de perfil.")
        }
      } catch (err: any) {
        setError(`Error cargando datos: ${err.message}`)
      } finally {
        setLoadingData(false)
      }
    })
    return () => unsubscribe()
  }, [])

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
    auth.signOut()
  }

  if (loadingData) {
    return (
      <ProtectedRoute allowedRoles={["paciente", "patient"]}>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !patient) {
    return (
      <ProtectedRoute allowedRoles={["paciente", "patient"]}>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <X className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-muted-foreground">{error || "No se pudo cargar el perfil."}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
          <BottomNav />
        </div>
      </ProtectedRoute>
    )
  }

  const currentDayRaw = getDaysSinceProcedure(patient.procedureDate)
  const treatmentDone = currentDayRaw >= patient.balloonDurationDays
  const currentDay = treatmentDone ? patient.balloonDurationDays : currentDayRaw
  
  const { phase: phaseNumber, label: phaseLabel } = getPatientPhase(currentDay)
  const weightLostPct = getWeightLostPercent(patient.weightStart, patient.weightCurrent, patient.weightGoal)
  const weightLost = patient.weightStart - patient.weightCurrent

  return (
    <ProtectedRoute allowedRoles={["paciente", "patient"]}>
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
                {treatmentDone ? (
                  <p className="text-3xl font-bold text-green-600 mt-0.5">
                    ¡Completado!
                    <span className="block text-sm font-normal text-muted-foreground mt-1">Programa finalizado</span>
                  </p>
                ) : (
                  <p className="text-3xl font-bold text-foreground mt-0.5">
                    Día {currentDay}
                    <span className="text-base font-normal text-muted-foreground"> de {patient.balloonDurationDays}</span>
                  </p>
                )}
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
                    className={treatmentDone ? "text-green-500" : "text-primary"}
                  />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted p-3">
                <p className="text-xs text-muted-foreground">Tipo de balón</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{patient.balloonType}</p>
              </div>
              <div className={treatmentDone ? "rounded-xl bg-green-500/10 p-3" : "rounded-xl bg-primary/5 p-3"}>
                <p className="text-xs text-muted-foreground">{treatmentDone ? "Estado" : "Fase actual"}</p>
                <p className={`text-sm font-semibold mt-0.5 ${treatmentDone ? "text-green-600" : "text-primary"}`}>
                  {treatmentDone ? "Finalizado" : `Fase ${phaseNumber}: ${phaseLabel}`}
                </p>
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
    </ProtectedRoute>
  )
}
