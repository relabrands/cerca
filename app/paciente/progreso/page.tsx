"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"
import { PanicButton } from "@/components/panic-button"
import { TrendingDown, Scale, Activity, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { type Patient } from "@/lib/store"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

const weightData = [
  { date: "1 Mar", weight: 95.0 },
  { date: "3 Mar", weight: 94.5 },
  { date: "5 Mar", weight: 94.2 },
  { date: "7 Mar", weight: 93.8 },
  { date: "9 Mar", weight: 93.5 },
  { date: "10 Mar", weight: 93.2 },
]

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

export default function ProgresoPage() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  const [selectedSatiety, setSelectedSatiety] = useState<number | null>(null)
  const [satietyLogged, setSatietyLogged] = useState(false)

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
        } else {
          setError("No se encontraron tus datos de paciente.")
        }
      } catch (err: any) {
        setError(`Error cargando datos: ${err.message}`)
      } finally {
        setLoadingData(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSatietyLog = () => {
    if (selectedSatiety) {
      setSatietyLogged(true)
    }
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

  const startWeight = patient.weightStart || 0
  const currentWeight = patient.weightCurrent || 0
  const weightLost = Math.max(0, startWeight - currentWeight)
  const goalWeight = patient.weightGoal || 0
  const progressPercent = startWeight !== goalWeight 
    ? ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100 
    : 0

  return (
    <ProtectedRoute allowedRoles={["paciente", "patient"]}>
      <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-sidebar-primary" />
            <h1 className="text-2xl font-bold text-sidebar-foreground">
              Seguimiento de Progreso
            </h1>
          </div>
          <p className="mt-1 text-sm text-sidebar-foreground/70">
            Visualiza tu evolución
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
        {/* Weight Summary Card */}
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
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                {progressPercent.toFixed(1)}% hacia tu meta
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weight Chart */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-5 w-5 text-primary" />
              Evolución de Peso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <YAxis 
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value} kg`, 'Peso']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="var(--primary)" 
                    strokeWidth={2}
                    dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: 'var(--primary)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Satiety Log */}
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
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => {
                    setSatietyLogged(false)
                    setSelectedSatiety(null)
                  }}
                >
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
                      className={`
                        h-10 rounded-lg text-sm font-medium transition-all
                        ${selectedSatiety === level 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }
                      `}
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
                <Button 
                  onClick={handleSatietyLog} 
                  className="w-full"
                  disabled={!selectedSatiety}
                >
                  Registrar Saciedad
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Weekly Summary */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="font-semibold text-foreground">Semana del 4 - 10 Mar</p>
                <p className="text-sm text-muted-foreground">Resumen semanal</p>
              </div>
              <Button variant="ghost" size="icon">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">-0.8</p>
                <p className="text-xs text-muted-foreground">kg perdidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">6.5</p>
                <p className="text-xs text-muted-foreground">saciedad prom.</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">85%</p>
                <p className="text-xs text-muted-foreground">hidratación</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PanicButton />
      <BottomNav />
      </main>
    </ProtectedRoute>
  )
}
