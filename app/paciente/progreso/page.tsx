"use client"

import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BottomNav } from "@/components/bottom-nav"
import { PanicButton } from "@/components/panic-button"
import { TrendingDown, Scale, Activity, Loader2, X, Check, ChevronDown } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { getDaysSinceProcedure, type Patient, getTodayKeyDR } from "@/lib/store"
import { differenceInCalendarDays, parseISO } from "date-fns"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface WeightEntry {
  date: string        // "2026-03-12"
  dateLabel: string   // "12 Mar"
  weight: number
}

const satietyLevels = [
  { value: 1, label: "Muy vacío" },
  { value: 2, label: "Vacío" },
  { value: 3, label: "Algo vacío" },
  { value: 4, label: "Ligeramente vacío" },
  { value: 5, label: "Neutral" },
  { value: 6, label: "Ligeramente lleno" },
  { value: 7, label: "Algo lleno" },
  { value: 8, label: "Lleno" },
  { value: 9, label: "Muy lleno" },
  { value: 10, label: "Completamente lleno" },
]

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("es-DO", { day: "numeric", month: "short" })
}

export default function ProgresoPage() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const patientRef = useRef<Patient | null>(null)

  // Weight history from Firestore
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Weigh-in prompt state
  const [showWeighIn, setShowWeighIn] = useState(false)
  const [newWeight, setNewWeight] = useState("")
  const [savingWeight, setSavingWeight] = useState(false)
  const [weightSaved, setWeightSaved] = useState(false)

  // Satiety log
  const [selectedSatiety, setSelectedSatiety] = useState<number | null>(null)
  const [satietyLogged, setSatietyLogged] = useState(false)

  // ─── Load patient + weight history ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoadingData(false); return }
      try {
        let fetchedPatient: Patient | null = null

        const userDoc = await getDoc(doc(db, "users", user.uid))
        const entityId = userDoc.exists() ? userDoc.data().entityId : null

        if (entityId) {
          const pDoc = await getDoc(doc(db, "patients", entityId))
          if (pDoc.exists()) fetchedPatient = { id: pDoc.id, ...pDoc.data() } as Patient
        }

        if (!fetchedPatient && user.email) {
          const q = query(collection(db, "patients"), where("email", "==", user.email))
          const snap = await getDocs(q)
          if (!snap.empty) fetchedPatient = { id: snap.docs[0].id, ...snap.docs[0].data() } as Patient
        }

        if (!fetchedPatient) { setError("No se encontraron tus datos de paciente."); return }
        setPatient(fetchedPatient)
        patientRef.current = fetchedPatient

        // Load weight history from Firestore
        await loadWeightHistory(fetchedPatient)

      } catch (err: any) {
        setError(`Error cargando datos: ${err.message}`)
      } finally {
        setLoadingData(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const loadWeightHistory = async (p: Patient) => {
    setLoadingHistory(true)
    try {
      const logsRef = collection(db, "patients", p.id, "weightLogs")
      const snap = await getDocs(query(logsRef, orderBy("date", "asc")))
      const entries: WeightEntry[] = snap.docs.map(d => ({
        date: d.data().date,
        dateLabel: formatDateLabel(d.data().date),
        weight: d.data().weight,
      }))
      // If no history yet, seed with the initial weight
      if (entries.length === 0 && p.weightStart) {
        entries.push({
          date: p.procedureDate || getTodayKeyDR(),
          dateLabel: formatDateLabel(p.procedureDate || getTodayKeyDR()),
          weight: p.weightStart,
        })
      }
      setWeightHistory(entries)
    } finally {
      setLoadingHistory(false)
    }
  }

  // ─── Should show weigh-in prompt? ─────────────────────────────────────────
  // Shows every 7 days (weekly). Uses the last entry's date vs. today in DR time.
  const shouldShowWeighInPrompt = (() => {
    if (!patient) return false
    if (weightHistory.length === 0) return true
    
    const todayStr = getTodayKeyDR()
    const lastEntryStr = weightHistory[weightHistory.length - 1].date
    const daysSinceLast = differenceInCalendarDays(parseISO(todayStr), parseISO(lastEntryStr))
    
    return daysSinceLast >= 7
  })()

  // ─── Save weigh-in ─────────────────────────────────────────────────────────
  const handleSaveWeight = async () => {
    const w = parseFloat(newWeight.replace(",", "."))
    if (isNaN(w) || w <= 0) return
    const p = patientRef.current
    if (!p) return

    setSavingWeight(true)
    try {
      const today = getTodayKeyDR()
      const logRef = doc(db, "patients", p.id, "weightLogs", today)
      await setDoc(logRef, { date: today, weight: w })

      // Also update the patient's current weight
      const patientDocRef = doc(db, "patients", p.id)
      await setDoc(patientDocRef, { weightCurrent: w }, { merge: true })

      setWeightSaved(true)
      setPatient(prev => prev ? { ...prev, weightCurrent: w } : prev)
      await loadWeightHistory(p)

      setTimeout(() => {
        setWeightSaved(false)
        setShowWeighIn(false)
        setNewWeight("")
      }, 1500)
    } finally {
      setSavingWeight(false)
    }
  }

  const handleSatietyLog = () => { if (selectedSatiety) setSatietyLogged(true) }

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
          <Button className="mt-4" onClick={() => window.location.reload()}>Reintentar</Button>
          <BottomNav />
        </div>
      </ProtectedRoute>
    )
  }

  const startWeight = patient.weightStart || 0
  const currentWeight = patient.weightCurrent || startWeight
  const weightLost = Math.max(0, startWeight - currentWeight)
  const goalWeight = patient.weightGoal || 0
  const progressPercent = startWeight !== goalWeight
    ? Math.min(((startWeight - currentWeight) / (startWeight - goalWeight)) * 100, 100)
    : 0
  const treatmentDone = getDaysSinceProcedure(patient.procedureDate) >= patient.balloonDurationDays

  return (
    <ProtectedRoute allowedRoles={["paciente", "patient"]}>
      <main className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="bg-sidebar px-4 pb-8 pt-12">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-6 w-6 text-sidebar-primary" />
              <h1 className="text-2xl font-bold text-sidebar-foreground">Seguimiento de Progreso</h1>
            </div>
            <p className="mt-1 text-sm text-sidebar-foreground/70">Visualiza tu evolución</p>
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">

          {/* ── Weigh-in Prompt ────────────────────────────────────────────────── */}
          {shouldShowWeighInPrompt && !showWeighIn && (
            <Card className="border-primary/30 bg-primary/5 shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Scale className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">¡Es hora de pesarte!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ha pasado una semana desde tu último registro de peso. Registrar tu peso ayuda a ver tu evolución.
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowWeighIn(true)}>
                  Registrar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Weigh-in Modal (inline) ────────────────────────────────────────── */}
          {showWeighIn && (
            <Card className="border-primary/30 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="h-5 w-5 text-primary" />
                  Registrar Peso de Hoy
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weightSaved ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">¡Peso registrado!</p>
                    <p className="text-sm text-muted-foreground">Tu progreso ha sido actualizado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Introduce tu peso actual en kilogramos:</p>
                    <div className="flex gap-3 items-center">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder={`Ej: ${currentWeight}`}
                        value={newWeight}
                        onChange={e => setNewWeight(e.target.value)}
                        className="flex-1"
                        inputMode="decimal"
                        onKeyDown={e => e.key === "Enter" && handleSaveWeight()}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">kg</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setShowWeighIn(false); setNewWeight("") }}>
                        Cancelar
                      </Button>
                      <Button className="flex-1" onClick={handleSaveWeight} disabled={!newWeight || savingWeight}>
                        {savingWeight ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Weight Summary ─────────────────────────────────────────────────── */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Peso actual</p>
                  <p className="text-3xl font-bold text-foreground">{currentWeight} kg</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Perdido</p>
                  <p className="text-2xl font-bold text-primary">-{weightLost.toFixed(1)} kg</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Inicio: {startWeight} kg</span>
                  <span>Meta: {goalWeight} kg</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  {progressPercent.toFixed(1)}% hacia tu meta
                </p>
              </div>

              {/* Manual weigh-in button (always accessible) */}
              {!showWeighIn && !shouldShowWeighInPrompt && (
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setShowWeighIn(true)}>
                  <Scale className="mr-2 h-4 w-4" />
                  Registrar peso de hoy
                </Button>
              )}
            </CardContent>
          </Card>

          {/* ── Weight Chart ───────────────────────────────────────────────────── */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Scale className="h-5 w-5 text-primary" />
                Evolución de Peso
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex h-[200px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : weightHistory.length < 2 ? (
                <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
                  <ChevronDown className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Registra tu peso semanalmente para ver tu evolución aquí.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setShowWeighIn(true)}>
                    Registrar mi peso ahora
                  </Button>
                </div>
              ) : (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightHistory} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                      <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(v: number) => [`${v} kg`, "Peso"]}
                      />
                      <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2}
                        dot={{ fill: "var(--primary)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "var(--primary)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Satiety Log ────────────────────────────────────────────────────── */}
          {!treatmentDone && (
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-primary" />
                  Nivel de Saciedad
                </CardTitle>
              </CardHeader>
              <CardContent>
                {satietyLogged ? (
                  <div className="text-center py-4">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">Registrado: Nivel {selectedSatiety}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {satietyLevels.find(s => s.value === selectedSatiety)?.label}
                    </p>
                    <Button variant="outline" className="mt-3" onClick={() => { setSatietyLogged(false); setSelectedSatiety(null) }}>
                      Registrar otro
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      ¿Cómo te sientes después de comer? Selecciona tu nivel de saciedad (1-10)
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-muted-foreground">Vacío</span>
                      <span className="text-xs text-muted-foreground">Lleno</span>
                    </div>
                    <div className="grid grid-cols-10 gap-1 mb-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                        <button
                          key={level}
                          onClick={() => setSelectedSatiety(level)}
                          className={`h-10 rounded-lg text-sm font-medium transition-all ${
                            selectedSatiety === level
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                    {selectedSatiety && (
                      <p className="text-center text-sm text-muted-foreground mb-4">
                        {satietyLevels.find(s => s.value === selectedSatiety)?.label}
                      </p>
                    )}
                    <Button onClick={handleSatietyLog} className="w-full" disabled={!selectedSatiety}>
                      Registrar Saciedad
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <PanicButton />
        <BottomNav />
      </main>
    </ProtectedRoute>
  )
}
