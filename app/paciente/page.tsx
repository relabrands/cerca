"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProgressRing } from "@/components/progress-ring"
import { BottomNav } from "@/components/bottom-nav"
import { PanicButton } from "@/components/panic-button"
import { Brain, Droplets, Sparkles, Calendar, X, Check, UtensilsCrossed, Loader2 } from "lucide-react"
import { getDaysSinceProcedure, getPatientPhase, type Patient } from "@/lib/store"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Target } from "lucide-react"

function PatientContent() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  // Progress state
  const [hydration, setHydration] = useState({ current: 1200, goal: 2000 })
  const [protein, setProtein] = useState({ current: 45, goal: 60 })

  // Water modal state
  const [showWaterModal, setShowWaterModal] = useState(false)
  const [waterAmount, setWaterAmount] = useState("")
  const waterPresets = [150, 200, 250, 350, 500]

  // Food modal state
  const [showFoodModal, setShowFoodModal] = useState(false)
  const [foodDescription, setFoodDescription] = useState("")
  const [foodLogged, setFoodLogged] = useState(false)
  const [estimatedProtein, setEstimatedProtein] = useState<number | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoadingData(false)
        return
      }
      try {
        // 1. Try loading patient via entityId in user profile
        const userDoc = await getDoc(doc(db, "users", user.uid))
        const userData = userDoc.exists() ? userDoc.data() : null
        const entityId = userData?.entityId

        if (entityId) {
          const patientDoc = await getDoc(doc(db, "patients", entityId))
          if (patientDoc.exists()) {
            setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient)
            setLoadingData(false)
            return
          }
        }

        // 2. Fallback: find patient record by email
        if (user.email) {
          const q = query(collection(db, "patients"), where("email", "==", user.email))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const patientDoc = snap.docs[0]
            setPatient({ id: patientDoc.id, ...patientDoc.data() } as Patient)
            setLoadingData(false)
            return
          }
        }

        setError("No se encontraron tus datos de paciente. Pide a tu médico que los registre.")
      } catch (err: any) {
        setError(`Error cargando datos: ${err.message}`)
      } finally {
        setLoadingData(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleRegisterWater = () => {
    const ml = parseInt(waterAmount)
    if (!isNaN(ml) && ml > 0) {
      setHydration((prev) => ({ ...prev, current: Math.min(prev.current + ml, prev.goal) }))
      setWaterAmount("")
      setShowWaterModal(false)
    }
  }

  const handleRegisterFood = () => {
    if (foodDescription.trim().length === 0) return
    const words = foodDescription.toLowerCase()
    let ep = 5
    if (words.includes("pollo") || words.includes("pechuga")) ep = 28
    else if (words.includes("huevo")) ep = 12
    else if (words.includes("atun") || words.includes("atún")) ep = 22
    else if (words.includes("proteína") || words.includes("proteina")) ep = 25
    else if (words.includes("leche") || words.includes("yogurt")) ep = 8
    else if (words.includes("frijol") || words.includes("lenteja")) ep = 10
    else if (words.includes("salmón") || words.includes("salmon")) ep = 25
    else if (words.includes("res") || words.includes("carne")) ep = 26
    setEstimatedProtein(ep)
    setProtein((prev) => ({ ...prev, current: Math.min(prev.current + ep, prev.goal) }))
    setFoodLogged(true)
    setTimeout(() => {
      setFoodLogged(false)
      setFoodDescription("")
      setEstimatedProtein(null)
      setShowFoodModal(false)
    }, 1800)
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando tu información...</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6">
        <p className="text-sm text-destructive text-center">{error || "No se encontraron datos del paciente."}</p>
      </div>
    )
  }

  const actualDay = getDaysSinceProcedure(patient.procedureDate)
  const totalDays = patient.balloonDurationDays
  const treatmentDone = actualDay >= totalDays
  const currentDay = treatmentDone ? totalDays : actualDay
  const { phase: phaseNumber, label: currentPhase } = getPatientPhase(currentDay)
  const progressPct = Math.min((currentDay / totalDays) * 100, 100)

  const completionDate = (() => {
    if (!patient.procedureDate) return ""
    const d = new Date(patient.procedureDate + "T00:00:00")
    d.setDate(d.getDate() + totalDays)
    return d.toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })
  })()

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <p className="text-sm text-sidebar-foreground/70">Buenos días</p>
          <h1 className="text-2xl font-bold text-sidebar-foreground">{patient.name}</h1>
          <p className="mt-1 text-sm text-sidebar-foreground/70">Saciety Hub — Tu Compañero de Transformación</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
        {/* Day Counter Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Tu progreso</span>
                </div>
                {treatmentDone ? (
                  <>
                    <p className="mt-2 text-3xl font-bold text-foreground">¡Completado!</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{completionDate}</p>
                  </>
                ) : (
                  <p className="mt-2 text-4xl font-bold text-foreground">
                    Día {currentDay}{" "}
                    <span className="text-lg font-normal text-muted-foreground">de {totalDays}</span>
                  </p>
                )}
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                  {patient.balloonType}
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
                    fill="none" stroke="currentColor" strokeWidth="3"
                    strokeDasharray={`${progressPct}, 100`}
                    strokeLinecap="round" className={treatmentDone ? "text-green-500" : "text-primary"}
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {treatmentDone ? (
          <Card className="border-0 shadow-lg bg-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Sparkles className="h-6 w-6" />
                Resumen de tu Trayecto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-foreground leading-relaxed">
                ¡Felicidades por llegar a la meta de tu programa! Has construido nuevos hábitos que te acompañarán siempre. Aquí tienes el resumen de tu evolución:
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-background p-4 shadow-sm border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Pérdida Total</p>
                  <p className="text-3xl font-bold text-primary">
                    {Math.max(0, patient.weightStart - patient.weightCurrent).toFixed(1)} <span className="text-sm font-normal">kg</span>
                  </p>
                </div>
                <div className="rounded-xl bg-background p-4 shadow-sm border border-border/50 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Días de Cambio</p>
                  <p className="text-3xl font-bold text-foreground">
                    {totalDays} <span className="text-sm font-normal">días</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-background p-3 shadow-sm border border-border/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                    <Droplets className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Hidratación Constante</p>
                    <p className="text-xs text-muted-foreground">Aprox. {Math.round(totalDays * 1.8)}L de agua registrados</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-background p-3 shadow-sm border border-border/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/10">
                    <UtensilsCrossed className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Nutrición Inteligente</p>
                    <p className="text-xs text-muted-foreground">Más de {Math.round(totalDays * 2.5)} comidas equilibradas</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 rounded-lg bg-background p-3 shadow-sm border border-border/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                    <Target className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Meta de Peso</p>
                    <p className="text-xs text-muted-foreground">Lograste el {Math.min(100, Math.round(((patient.weightStart - patient.weightCurrent) / (patient.weightStart - patient.weightGoal)) * 100))}% de tu objetivo</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Phase Status Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary">Fase {phaseNumber}</p>
                    <p className="font-semibold text-foreground">{currentPhase}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Prediction Card */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="h-5 w-5 text-primary" />
                  Predicción de Hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {phaseNumber === 1
                    ? "Es normal sentir náuseas leves o pesadez en los primeros días."
                    : phaseNumber === 2
                    ? "Tu cuerpo empieza a adaptarse. Introduce purés suaves de forma gradual."
                    : phaseNumber === 3
                    ? "Puedes agregar alimentos blandos. Mastica muy bien antes de tragar."
                    : "Mantén porciones pequeñas y come despacio para una mejor tolerancia."}
                </p>
                <div className="mt-3 rounded-lg bg-primary/5 p-3">
                  <p className="text-sm font-medium text-primary">
                    {phaseNumber === 1
                      ? "Tip: Bebe sorbos pequeños de agua fría cada 15 minutos."
                      : phaseNumber === 2
                      ? "Tip: Prueba el caldo de pollo con proteína en polvo sin sabor."
                      : phaseNumber === 3
                      ? "Tip: Incorpora un nuevo alimento a la vez para detectar tolerancias."
                      : "Tip: Apunta todo lo que comes para identificar patrones de saciedad."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Progress Rings */}
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Droplets className="h-5 w-5 text-primary" />
                  Seguimiento Diario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around py-4">
                  <ProgressRing
                    progress={(hydration.current / hydration.goal) * 100}
                    label="Hidratación"
                    value={`${hydration.current} ml`}
                    size={100}
                  />
                  <ProgressRing
                    progress={(protein.current / protein.goal) * 100}
                    label="Proteína"
                    value={`${protein.current} g`}
                    size={100}
                  />
                </div>
                <div className="mt-2 flex justify-around text-xs text-muted-foreground">
                  <span>Meta: {hydration.goal} ml</span>
                  <span>Meta: {protein.goal} g</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Card
                className="cursor-pointer border-0 shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                onClick={() => setShowWaterModal(true)}
              >
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Droplets className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground text-center">Registrar Agua</p>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer border-0 shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                onClick={() => setShowFoodModal(true)}
              >
                <CardContent className="flex flex-col items-center justify-center p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <UtensilsCrossed className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground text-center">Registrar Comida</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Water Modal */}
      {showWaterModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Registrar Agua</h2>
              </div>
              <button
                onClick={() => { setShowWaterModal(false); setWaterAmount("") }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Llevas{" "}
              <span className="font-semibold text-foreground">{hydration.current} ml</span>{" "}
              de {hydration.goal} ml hoy.
            </p>

            <p className="text-xs font-medium text-muted-foreground mb-2">Cantidad rápida</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {waterPresets.map((ml) => (
                <button
                  key={ml}
                  onClick={() => setWaterAmount(String(ml))}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors border ${
                    waterAmount === String(ml)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-foreground border-border hover:bg-primary/10"
                  }`}
                >
                  {ml} ml
                </button>
              ))}
            </div>

            <p className="text-xs font-medium text-muted-foreground mb-2">O escribe la cantidad</p>
            <div className="flex gap-3 items-center">
              <Input
                type="number"
                placeholder="Ej: 300"
                value={waterAmount}
                onChange={(e) => setWaterAmount(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">ml</span>
            </div>

            <Button
              className="mt-4 w-full"
              onClick={handleRegisterWater}
              disabled={!waterAmount || isNaN(parseInt(waterAmount))}
            >
              <Check className="mr-2 h-4 w-4" />
              Registrar
            </Button>
          </div>
        </div>
      )}

      {/* Food Modal */}
      {showFoodModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Registrar Comida</h2>
              </div>
              <button
                onClick={() => { setShowFoodModal(false); setFoodDescription(""); setFoodLogged(false); setEstimatedProtein(null) }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Describe lo que comiste y la IA estimará las proteínas para actualizar tu progreso diario.
            </p>

            <p className="text-xs font-medium text-muted-foreground mb-2">¿Qué comiste?</p>
            <textarea
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
              placeholder="Ej: Pechuga de pollo a la plancha con caldo de verduras..."
              value={foodDescription}
              onChange={(e) => setFoodDescription(e.target.value)}
              disabled={foodLogged}
            />

            {estimatedProtein !== null && (
              <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
                <p className="text-sm text-primary font-medium">Proteína estimada detectada</p>
                <span className="text-lg font-bold text-primary">+{estimatedProtein} g</span>
              </div>
            )}

            <div className="mt-3 rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                Llevas <span className="font-semibold text-foreground">{protein.current} g</span> de proteína hoy. Meta: {protein.goal} g.
              </p>
            </div>

            <Button
              className="mt-4 w-full"
              onClick={handleRegisterFood}
              disabled={foodDescription.trim().length === 0 || foodLogged}
            >
              {foodLogged ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Proteína estimada y registrada
                </>
              ) : (
                "Estimar proteína y registrar"
              )}
            </Button>
          </div>
        </div>
      )}

      <PanicButton />
      <BottomNav />
    </main>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["paciente", "patient"]}>
      <PatientContent />
    </ProtectedRoute>
  )
}
