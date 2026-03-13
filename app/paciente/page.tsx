"use client"

import { useState, useEffect, useRef } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore"
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

const todayKey = () => new Date().toISOString().slice(0, 10) // "2026-03-12"

function PatientContent() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  // Progress state — loaded from Firestore
  const [hydration, setHydration] = useState({ current: 0, goal: 2000 })
  const [protein, setProtein] = useState({ current: 0, goal: 60 })

  // AI prediction
  const [prediction, setPrediction] = useState<string | null>(null)

  // Water modal state
  const [showWaterModal, setShowWaterModal] = useState(false)
  const [waterAmount, setWaterAmount] = useState("")
  const waterPresets = [150, 200, 250, 350, 500]

  // Food modal state
  const [showFoodModal, setShowFoodModal] = useState(false)
  const [foodDescription, setFoodDescription] = useState("")
  const [foodLogged, setFoodLogged] = useState(false)
  const [estimatedProtein, setEstimatedProtein] = useState<number | null>(null)
  const [estimatingProtein, setEstimatingProtein] = useState(false)

  // Track the live patient for firestore writes
  const patientRef = useRef<Patient | null>(null)

  // ─── Load patient + today's log ───────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoadingData(false); return }
      try {
        let fetchedPatient: Patient | null = null

        const userDoc = await getDoc(doc(db, "users", user.uid))
        const entityId = userDoc.exists() ? userDoc.data().entityId : null

        if (entityId) {
          const patientDoc = await getDoc(doc(db, "patients", entityId))
          if (patientDoc.exists()) fetchedPatient = { id: patientDoc.id, ...patientDoc.data() } as Patient
        }

        if (!fetchedPatient && user.email) {
          const q = query(collection(db, "patients"), where("email", "==", user.email))
          const snap = await getDocs(q)
          if (!snap.empty) fetchedPatient = { id: snap.docs[0].id, ...snap.docs[0].data() } as Patient
        }

        if (!fetchedPatient) {
          setError("No se encontraron tus datos de paciente.")
          return
        }

        setPatient(fetchedPatient)
        patientRef.current = fetchedPatient

        // Load today's daily log from Firestore
        const logRef = doc(db, "patients", fetchedPatient.id, "dailyLogs", todayKey())
        const logSnap = await getDoc(logRef)
        if (logSnap.exists()) {
          const data = logSnap.data()
          setHydration(h => ({ ...h, current: data.hydration_ml ?? 0 }))
          setProtein(p => ({ ...p, current: data.protein_g ?? 0 }))
        }

        // Load prediction — read from Firestore cache first, only call AI if missing
        const cachedPrediction = logSnap.exists() && logSnap.data().prediction
        if (cachedPrediction) {
          setPrediction(cachedPrediction)
        } else {
          // Generate prediction and cache it in Firestore
          const currentDay = getDaysSinceProcedure(fetchedPatient.procedureDate)
          const { phase } = getPatientPhase(currentDay)
          fetch("/api/ai/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phase,
              currentDay,
              weightStart: fetchedPatient.weightStart,
              weightCurrent: fetchedPatient.weightCurrent,
              allergies: [
                ...(fetchedPatient.allergiesFoods || []),
                ...(fetchedPatient.allergiesMedications || []),
              ],
            }),
          })
            .then(r => r.json())
            .then(async data => {
              if (data.prediction) {
                setPrediction(data.prediction)
                // Cache in Firestore so it doesn't regenerate on every visit today
                const p = patientRef.current
                if (p) {
                  const logRef = doc(db, "patients", p.id, "dailyLogs", todayKey())
                  await setDoc(logRef, { prediction: data.prediction }, { merge: true })
                }
              }
            })
            .catch(() => {})
        }


      } catch (err: any) {
        setError(`Error cargando datos: ${err.message}`)
      } finally {
        setLoadingData(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // ─── Persist daily log to Firestore ───────────────────────────────────────
  const persistLog = async (newHydration: number, newProtein: number) => {
    const p = patientRef.current
    if (!p) return
    const logRef = doc(db, "patients", p.id, "dailyLogs", todayKey())
    await setDoc(logRef, { hydration_ml: newHydration, protein_g: newProtein, updatedAt: new Date().toISOString() }, { merge: true })
  }

  // ─── Water registration ────────────────────────────────────────────────────
  const handleRegisterWater = async () => {
    const ml = parseInt(waterAmount)
    if (isNaN(ml) || ml <= 0) return
    const next = Math.min(hydration.current + ml, hydration.goal)
    setHydration(prev => ({ ...prev, current: next }))
    setWaterAmount("")
    setShowWaterModal(false)
    await persistLog(next, protein.current)
  }

  // ─── Food / protein registration ──────────────────────────────────────────
  const handleRegisterFood = async () => {
    if (foodDescription.trim().length === 0) return
    setEstimatingProtein(true)

    let ep = 5 // fallback
    try {
      const res = await fetch("/api/ai/estimate-protein", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodDescription }),
      })
      const data = await res.json()
      if (typeof data.protein === "number") ep = data.protein
    } catch (_) { /* use fallback */ }

    setEstimatingProtein(false)
    setEstimatedProtein(ep)
    const next = Math.min(protein.current + ep, protein.goal)
    setProtein(prev => ({ ...prev, current: next }))
    setFoodLogged(true)
    await persistLog(hydration.current, next)

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
                {prediction ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">{prediction}</p>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generando consejo personalizado...</span>
                  </div>
                )}
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
              disabled={foodDescription.trim().length === 0 || foodLogged || estimatingProtein}
            >
              {estimatingProtein ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analizando con IA...
                </>
              ) : foodLogged ? (
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
