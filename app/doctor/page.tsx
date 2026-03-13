"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, updateDoc, orderBy, limit
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  User, Users, Plus, X, Check, ChevronRight, Calendar, Target, Activity,
  AlertTriangle, Pill, Leaf, ArrowLeft, Scale, Clock, Stethoscope, Loader2,
  Home, Phone, Mail, Edit2, LogOut, Building2, AlertCircle, Info, Sparkles
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import {
  getDaysSinceProcedure, getPatientPhase, getWeightLostPercent, getTodayKeyDR,
  type BalloonType, type Patient, type Doctor,
} from "@/lib/store"
import { differenceInCalendarDays, parseISO } from "date-fns"

// ─── Weight conversion helpers ───────────────────────────────────────────────
const lbsToKg = (lbs: number) => Math.round(lbs * 0.453592 * 10) / 10
const kgToLbs = (kg: number) => Math.round(kg / 0.453592 * 10) / 10
function kgPreview(lbsStr: string) {
  const n = parseFloat(lbsStr)
  if (!lbsStr || isNaN(n)) return null
  return lbsToKg(n)
}

// ─── Dominican phone formatter ────────────────────────────────────────────────
function formatDRPhone(raw: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "")
  // If starts with 1, remove it; work with 10 remaining digits
  const d = digits.startsWith("1") ? digits.slice(1) : digits
  if (d.length === 0) return ""
  if (d.length <= 3) return `+1 ${d}`
  if (d.length <= 6) return `+1 ${d.slice(0, 3)} ${d.slice(3)}`
  if (d.length <= 10) return `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  return `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)}`
}

function handlePhoneInput(
  raw: string,
  setter: (v: string) => void
) {
  const digits = raw.replace(/\D/g, "")
  setter(formatDRPhone(digits))
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BALLOON_TYPES: { type: BalloonType; days: number }[] = [
  { type: "Orbera (6 meses)", days: 180 },
  { type: "Reshape (6 meses)", days: 180 },
  { type: "Spatz3 (12 meses)", days: 365 },
  { type: "Elipse (4 meses)", days: 120 },
]
const emptyForm = {
  name: "", email: "", password: "", phone: "", dateOfBirth: "", procedureDate: "",
  balloonType: "" as BalloonType | "", balloonDurationDays: 180,
  weightStart: "", weightGoal: "", weightCurrent: "",
  allergiesMedications: [] as string[], allergiesFoods: [] as string[],
  newMedAllergy: "", newFoodAllergy: "",
}

type TriageLevel = "red" | "yellow" | "green"

interface PatientWithTriage extends Patient {
  triage: TriageLevel
  recentAlerts: number
  lastWeightDate?: string
  todayHydration: number
}

type Tab = "inicio" | "pacientes" | "perfil"

// ─── Main component ───────────────────────────────────────────────────────────
function DoctorContent() {
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  const [patientList, setPatientList] = useState<PatientWithTriage[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [clinicalSummary, setClinicalSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // Tab navigation
  const [tab, setTab] = useState<Tab>("inicio")

  // Doctor balloons
  const [doctorBalloons, setDoctorBalloons] = useState<{ id: string; name: string; durationDays: number }[]>([])
  const [showBalloonModal, setShowBalloonModal] = useState(false)
  const [editingBalloonId, setEditingBalloonId] = useState<string | null>(null)
  const [balloonForm, setBalloonForm] = useState({ name: "", durationDays: "" })

  // Patient detail / list
  const [selectedPatient, setSelectedPatient] = useState<PatientWithTriage | null>(null)

  // Add patient modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [addSuccess, setAddSuccess] = useState(false)
  const [savingPatient, setSavingPatient] = useState(false)

  // Edit patient modal
  const [editingPatient, setEditingPatient] = useState<PatientWithTriage | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editSuccess, setEditSuccess] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { setLoadingData(false); return }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (!userDoc.exists()) { setError("Perfil no encontrado"); setLoadingData(false); return }
        const entityId = userDoc.data()?.entityId
        if (!entityId) { setError("No tienes un médico vinculado. Contacta a soporte."); setLoadingData(false); return }

        const doctorDoc = await getDoc(doc(db, "doctors", entityId))
        if (!doctorDoc.exists()) { setError(`Doctor (${entityId}) no encontrado en Firestore.`); setLoadingData(false); return }
        const docData = { id: doctorDoc.id, ...doctorDoc.data() } as Doctor
        setDoctor(docData)

        if (docData.balloonTypes && docData.balloonTypes.length > 0) {
          setDoctorBalloons(docData.balloonTypes)
        } else {
          setDoctorBalloons(BALLOON_TYPES.map((b, i) => ({ id: `default-${i}`, name: b.type, durationDays: b.days })))
        }

        const patientsQ = query(collection(db, "patients"), where("doctorId", "==", entityId))
        const patientsSnap = await getDocs(patientsQ)
        const rawPatients = patientsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Patient))

        // Calculate Triage for each patient
        const patientsWithTriage: PatientWithTriage[] = await Promise.all(
          rawPatients.map(async (p) => {
            const today = getTodayKeyDR()
            
            // 1. Check today's hydration
            const logSnap = await getDoc(doc(db, "patients", p.id, "dailyLogs", today))
            const todayHydration = logSnap.exists() ? logSnap.data().hydration_ml || 0 : 0

            // 2. Check recent alerts (last 3 days)
            const threeDaysAgo = new Date()
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
            const alertsQ = query(
              collection(db, "alerts"), 
              where("patientId", "==", p.id), 
              where("createdAt", ">=", threeDaysAgo)
            )
            const alertsSnap = await getDocs(alertsQ)
            const recentAlerts = alertsSnap.size

            // 3. Check last weight date
            const weightQ = query(
              collection(db, "patients", p.id, "weightLogs"),
              orderBy("date", "desc"),
              limit(1)
            )
            const weightSnap = await getDocs(weightQ)
            const lastWeightDate = !weightSnap.empty ? weightSnap.docs[0].data().date : p.procedureDate

            // Triage Logic
            let triage: TriageLevel = "green"
            
            // RED: Panic alerts OR 0 hydration today
            if (recentAlerts > 0 || (todayHydration === 0)) {
              triage = "red"
            } 
            // YELLOW: No weight log in > 7 days
            else if (lastWeightDate) {
              const daysSinceWeight = differenceInCalendarDays(parseISO(today), parseISO(lastWeightDate))
              if (daysSinceWeight >= 7) triage = "yellow"
            }

            return { ...p, triage, recentAlerts, lastWeightDate, todayHydration }
          })
        )

        setPatientList(patientsWithTriage)
      } catch (err: any) {
        setError(`Error cargando datos: ${err.message}`)
      } finally {
        setLoadingData(false)
      }
    })
    return () => unsubscribe()
  }, [])

  // ── Clinical Summary ──────────────────────────────────────────────────────
  const generateClinicalSummary = async () => {
    if (!selectedPatient) return
    setLoadingSummary(true)
    setClinicalSummary(null)
    try {
      const actualDay = getDaysSinceProcedure(selectedPatient.procedureDate)
      const phase = getPatientPhase(actualDay)
      
      const response = await fetch("/api/ai/clinical-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          phase: `Fase ${phase.phase}: ${phase.label}`,
          weightStart: selectedPatient.weightStart,
          weightGoal: selectedPatient.weightGoal,
        }),
      })
      const data = await response.json()
      if (data.summary) {
        setClinicalSummary(data.summary)
      } else {
        throw new Error(data.error || "Error al generar el resumen")
      }
    } catch (err: any) {
      alert(`Error IA: ${err.message}`)
    } finally {
      setLoadingSummary(false)
    }
  }

  // ── Form helpers ─────────────────────────────────────────────────────────
  const updateForm = (key: keyof typeof form, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const updateEditForm = (key: keyof typeof emptyForm, value: unknown) =>
    setEditForm(prev => ({ ...prev, [key]: value }))

  const addAllergy = (type: "med" | "food", target: typeof form, setter: typeof setForm) => {
    const key = type === "med" ? "newMedAllergy" : "newFoodAllergy"
    const listKey = type === "med" ? "allergiesMedications" : "allergiesFoods"
    const val = (target[key] as string).trim()
    if (val && !(target[listKey] as string[]).includes(val)) {
      setter(prev => ({ ...prev, [listKey]: [...(prev[listKey] as string[]), val], [key]: "" }))
    } else {
      setter(prev => ({ ...prev, [key]: "" }))
    }
  }

  const removeAllergy = (type: "med" | "food", item: string, target: typeof form, setter: typeof setForm) => {
    const listKey = type === "med" ? "allergiesMedications" : "allergiesFoods"
    setter(prev => ({ ...prev, [listKey]: (prev[listKey] as string[]).filter(a => a !== item) }))
  }

  const handleBalloonSelect = (bt: { name: string; durationDays: number }, setter: typeof setForm) =>
    setter(prev => ({ ...prev, balloonType: bt.name as BalloonType, balloonDurationDays: bt.durationDays }))

  // ── Manage Balloons ────────────────────────────────────────────────────────
  const handleSaveBalloon = async () => {
    if (!doctor || !balloonForm.name.trim() || !balloonForm.durationDays.trim()) return
    const durationObj = parseInt(balloonForm.durationDays)
    if (isNaN(durationObj) || durationObj <= 0) return

    try {
      let newBalloons: typeof doctorBalloons
      if (editingBalloonId) {
        newBalloons = doctorBalloons.map(b => b.id === editingBalloonId ? { ...b, name: balloonForm.name, durationDays: durationObj } : b)
      } else {
        const newBalloon = { id: `b-${Date.now()}`, name: balloonForm.name, durationDays: durationObj }
        newBalloons = [...doctorBalloons, newBalloon]
      }
      
      await updateDoc(doc(db, "doctors", doctor.id), { balloonTypes: newBalloons })
      setDoctorBalloons(newBalloons)
      setShowBalloonModal(false)
      setEditingBalloonId(null)
      setBalloonForm({ name: "", durationDays: "" })
    } catch (err: any) {
      alert(`Error guardando balón: ${err.message}`)
    }
  }

  const handleDeleteBalloon = async (id: string) => {
    if (!doctor) return
    if (!confirm("¿Seguro que deseas eliminar este tipo de balón?")) return
    try {
      const newBalloons = doctorBalloons.filter(b => b.id !== id)
      await updateDoc(doc(db, "doctors", doctor.id), { balloonTypes: newBalloons })
      setDoctorBalloons(newBalloons)
    } catch (err: any) {
      alert(`Error eliminando balón: ${err.message}`)
    }
  }

  const openAddBalloonModal = () => {
    setBalloonForm({ name: "", durationDays: "" })
    setEditingBalloonId(null)
    setShowBalloonModal(true)
  }

  const openEditBalloonModal = (b: { id: string, name: string, durationDays: number }) => {
    setBalloonForm({ name: b.name, durationDays: String(b.durationDays) })
    setEditingBalloonId(b.id)
    setShowBalloonModal(true)
  }

  // ── Add patient ───────────────────────────────────────────────────────────
  const isFormValid = form.name.trim() && form.email.trim() && form.password.length >= 6 && form.procedureDate && form.balloonType && form.weightStart && form.weightGoal

  const handleAddPatient = async () => {
    if (!isFormValid || !doctor) return
    setSavingPatient(true)

    // Auto-agregar alergias si el doctor olvidó presionar Enter o '+'
    const finalMedAllergies = form.newMedAllergy.trim() && !form.allergiesMedications.includes(form.newMedAllergy.trim())
      ? [...form.allergiesMedications, form.newMedAllergy.trim()] 
      : form.allergiesMedications;

    const finalFoodAllergies = form.newFoodAllergy.trim() && !form.allergiesFoods.includes(form.newFoodAllergy.trim())
      ? [...form.allergiesFoods, form.newFoodAllergy.trim()] 
      : form.allergiesFoods;

    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "patient",
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim(),
          dateOfBirth: form.dateOfBirth,
          procedureDate: form.procedureDate,
          balloonType: form.balloonType,
          balloonDurationDays: form.balloonDurationDays,
          weightStart: lbsToKg(parseFloat(form.weightStart) || 0),
          weightGoal: lbsToKg(parseFloat(form.weightGoal) || 0),
          weightCurrent: lbsToKg(parseFloat(form.weightStart) || 0),
          doctorId: doctor.id,
          clinicId: doctor.clinicId,
          allergiesMedications: finalMedAllergies,
          allergiesFoods: finalFoodAllergies,
        }),
      })

      const textRes = await response.text()
      let responseData
      try {
        responseData = JSON.parse(textRes)
      } catch (parseError) {
        throw new Error(`Error crítico del servidor: ${textRes.slice(0, 60)}...`)
      }

      if (!response.ok) {
        const errorMsg = responseData.error || "Error creando paciente";
        const details = responseData.details ? ` (${responseData.details})` : "";
        throw new Error(errorMsg + details);
      }

      // Backend created it successfully and returned entityId
      const newPatient: PatientWithTriage = {
        id: responseData.entityId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        procedureDate: form.procedureDate,
        balloonType: form.balloonType as BalloonType,
        balloonDurationDays: form.balloonDurationDays,
        weightStart: lbsToKg(parseFloat(form.weightStart) || 0),
        weightGoal: lbsToKg(parseFloat(form.weightGoal) || 0),
        weightCurrent: lbsToKg(parseFloat(form.weightStart) || 0),
        doctorId: doctor.id,
        clinicId: doctor.clinicId,
        allergiesMedications: finalMedAllergies,
        allergiesFoods: finalFoodAllergies,
        triage: "green", // Initial state
        recentAlerts: 0,
        todayHydration: 0,
      }

      setPatientList(prev => [...prev, newPatient])
      setAddSuccess(true)
      setTimeout(() => { setAddSuccess(false); setShowAddModal(false); setForm(emptyForm) }, 1400)
    } catch (err: any) {
      alert(`Error guardando paciente: ${err.message}`)
    } finally {
      setSavingPatient(false)
    }
  }

  // ── Edit patient ──────────────────────────────────────────────────────────
  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient)
    setEditForm({
      name: patient.name,
      email: patient.email,
      password: "", // No es necesario editarla aquí inicialmente
      phone: patient.phone || "",
      dateOfBirth: patient.dateOfBirth || "",
      procedureDate: patient.procedureDate || "",
      balloonType: patient.balloonType || "",
      balloonDurationDays: patient.balloonDurationDays || 180,
      // Store as lbs for the form
      weightStart: patient.weightStart ? String(kgToLbs(patient.weightStart)) : "",
      weightGoal: patient.weightGoal ? String(kgToLbs(patient.weightGoal)) : "",
      weightCurrent: patient.weightCurrent ? String(kgToLbs(patient.weightCurrent)) : "",
      allergiesMedications: patient.allergiesMedications || [],
      allergiesFoods: patient.allergiesFoods || [],
      newMedAllergy: "",
      newFoodAllergy: "",
    })
  }

  const handleEditPatient = async () => {
    if (!editingPatient) return
    setSavingEdit(true)

    const finalMedAllergies = editForm.newMedAllergy.trim() && !editForm.allergiesMedications.includes(editForm.newMedAllergy.trim())
      ? [...editForm.allergiesMedications, editForm.newMedAllergy.trim()] 
      : editForm.allergiesMedications;

    const finalFoodAllergies = editForm.newFoodAllergy.trim() && !editForm.allergiesFoods.includes(editForm.newFoodAllergy.trim())
      ? [...editForm.allergiesFoods, editForm.newFoodAllergy.trim()] 
      : editForm.allergiesFoods;

    try {
      const updates = {
        name: editForm.name.trim(), email: editForm.email.trim(), phone: editForm.phone.trim(),
        dateOfBirth: editForm.dateOfBirth, procedureDate: editForm.procedureDate,
        balloonType: editForm.balloonType, balloonDurationDays: editForm.balloonDurationDays,
        weightStart: lbsToKg(parseFloat(editForm.weightStart) || 0),
        weightGoal: lbsToKg(parseFloat(editForm.weightGoal) || 0),
        weightCurrent: lbsToKg(parseFloat(editForm.weightCurrent || editForm.weightStart) || 0),
        allergiesMedications: finalMedAllergies,
        allergiesFoods: finalFoodAllergies,
        updatedAt: new Date(),
      }
      await updateDoc(doc(db, "patients", editingPatient.id), updates)
      setPatientList(prev => prev.map(p => p.id === editingPatient.id ? { ...p, ...updates } as PatientWithTriage : p))
      if (selectedPatient?.id === editingPatient.id) setSelectedPatient(prev => prev ? { ...prev, ...updates } as PatientWithTriage : prev)
      setEditSuccess(true)
      setTimeout(() => { setEditSuccess(false); setEditingPatient(null) }, 1400)
    } catch (err: any) {
      alert(`Error actualizando paciente: ${err.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando portal médico...</p>
      </div>
    )
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6">
        <p className="text-sm text-destructive text-center">{error || "No se encontraron datos del médico."}</p>
      </div>
    )
  }

  // ── Patient detail view ────────────────────────────────────────────────────
  if (selectedPatient) {
    const actualDay = getDaysSinceProcedure(selectedPatient.procedureDate)
    const done = actualDay >= selectedPatient.balloonDurationDays
    const displayDay = done ? selectedPatient.balloonDurationDays : actualDay
    const phase = getPatientPhase(displayDay)
    const pct = getWeightLostPercent(selectedPatient.weightStart, selectedPatient.weightCurrent, selectedPatient.weightGoal)
    const lost = selectedPatient.weightStart - selectedPatient.weightCurrent

    // Completion date = procedureDate + balloonDurationDays
    const completionDate = (() => {
      if (!selectedPatient.procedureDate) return ""
      const d = new Date(selectedPatient.procedureDate + "T00:00:00")
      d.setDate(d.getDate() + selectedPatient.balloonDurationDays)
      return d.toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })
    })()

    return (
      <main className="min-h-screen bg-background pb-24">
        <header className="bg-sidebar px-4 pb-6 pt-12">
          <div className="mx-auto max-w-lg">
            <button
              onClick={() => setSelectedPatient(null)}
              className="flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Mis Pacientes</span>
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-accent">
                  <User className="h-7 w-7 text-sidebar-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-sidebar-foreground">{selectedPatient.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-sidebar-foreground/70">{selectedPatient.email}</p>
                    <span className={`h-2 w-2 rounded-full ${
                      selectedPatient.triage === "red" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" :
                      selectedPatient.triage === "yellow" ? "bg-amber-400" :
                      "bg-green-500"
                    }`} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(selectedPatient)}
                  className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 text-xs font-medium text-sidebar-foreground border border-white/10"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>
            </div>
            {selectedPatient.triage !== "green" && (
              <div className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-xs font-medium animate-in fade-in slide-in-from-top-2 ${
                selectedPatient.triage === "red" 
                  ? "bg-red-500/10 border-red-500/20 text-red-200" 
                  : "bg-amber-500/10 border-amber-500/20 text-amber-200"
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {selectedPatient.triage === "red" 
                    ? "Atención prioritaria: Alertas de pánico recientes o falta de hidratación." 
                    : "Seguimiento requerido: Sin registro de peso en más de 7 días."}
                </span>
              </div>
            )}
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
          {/* AI Clinical Summary Button */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500/5 to-primary/5 border border-primary/10 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Resumen Gemini (IA)</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Generar análisis clínico semanal</p>
                  </div>
                </div>
                {!clinicalSummary && (
                  <Button 
                    size="sm" 
                    onClick={generateClinicalSummary} 
                    disabled={loadingSummary}
                    className="h-8 rounded-lg shadow-sm"
                  >
                    {loadingSummary ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Generando</>
                    ) : (
                      "Generar"
                    )}
                  </Button>
                )}
              </div>
              
              {clinicalSummary && (
                <div className="px-4 pb-4 pt-0 animate-in fade-in slide-in-from-top-2">
                  <div className="rounded-xl bg-white/50 dark:bg-black/20 p-4 border border-primary/5 text-sm leading-relaxed text-foreground/90 italic">
                    <div className="flex gap-2 mb-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p>{clinicalSummary}</p>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-primary" onClick={generateClinicalSummary} disabled={loadingSummary}>
                        <Clock className="h-3 w-3 mr-1" /> Regenerar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Day counter */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Progreso del tratamiento
                  </p>
                  {done ? (
                    <>
                      <p className="text-3xl font-bold text-foreground mt-1">¡Completado!</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{completionDate}</p>
                    </>
                  ) : (
                    <p className="text-4xl font-bold text-foreground mt-1">
                      Día {displayDay}{" "}
                      <span className="text-base font-normal text-muted-foreground">de {selectedPatient.balloonDurationDays}</span>
                    </p>
                  )}
                  <span className="mt-1 inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
                    {selectedPatient.balloonType}
                  </span>
                </div>
                <div className="h-20 w-20">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.min((displayDay / selectedPatient.balloonDurationDays) * 100, 100)}, 100`} className={done ? "text-green-500" : "text-primary"} />
                  </svg>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                {done ? "Tratamiento finalizado" : <>Fase {phase.phase}: <span className="font-medium text-foreground">{phase.label}</span></>}
              </div>
            </CardContent>
          </Card>

          {/* Weight progress */}
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
                  <span>Pérdida: {lost > 0 ? `${lost.toFixed(1)} kg` : "Sin cambio"}</span>
                  <span>{pct}% de la meta</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
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
                  ) : selectedPatient.allergiesMedications.map(a => (
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
                  ) : selectedPatient.allergiesFoods.map(a => (
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
                <Phone className="h-4 w-4" />
                <span>Tel: <span className="font-medium text-foreground">{selectedPatient.phone || "No registrado"}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Correo: <span className="font-medium text-foreground">{selectedPatient.email}</span></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctor bottom nav */}
        <DoctorBottomNav active="pacientes" onTabChange={(t) => { setSelectedPatient(null); setTab(t) }} />

        {/* Edit Modal */}
        {editingPatient && (
          <PatientFormModal
            title="Editar Paciente"
            form={editForm}
            updateF={updateEditForm}
            onClose={() => setEditingPatient(null)}
            onSave={handleEditPatient}
            saving={savingEdit}
            success={editSuccess}
            addAllergy={(type) => addAllergy(type, editForm, setEditForm)}
            removeAllergy={(type, item) => removeAllergy(type, item, editForm, setEditForm)}
            doctorBalloons={doctorBalloons}
            handleBalloonSelect={(bt) => handleBalloonSelect(bt, setEditForm)}
            showWeightCurrent
          />
        )}
      </main>
    )
  }

  // ─── Tab: Inicio (home) ──────────────────────────────────────────────────
  const renderInicio = () => (
    <>
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
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pacientes", value: patientList.length, icon: Users },
            { label: "Activos", value: patientList.filter(p => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length, icon: Activity },
            { label: "Completados", value: patientList.filter(p => getDaysSinceProcedure(p.procedureDate) >= p.balloonDurationDays).length, icon: Target },
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

        {/* Recent patients preview */}
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Stethoscope className="h-5 w-5 text-primary" />
            Pacientes Recientes
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setTab("pacientes")}>
            Ver todos
          </Button>
        </div>

        {patientList.slice(0, 3).map(patient => {
          const day = getDaysSinceProcedure(patient.procedureDate)
          const phase = getPatientPhase(day)
          const done = day >= patient.balloonDurationDays
          return (
            <Card key={patient.id} className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg" onClick={() => setSelectedPatient(patient)}>
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
                      <p className="text-sm font-bold text-foreground">{done ? "Completo" : `Día ${day}`}</p>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          patient.triage === "red" ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.7)]" :
                          patient.triage === "yellow" ? "bg-amber-400" :
                          "bg-green-500"
                        }`} />
                        <span className={`text-[10px] font-medium uppercase tracking-tight ${done ? "text-muted-foreground" : "text-primary"}`}>
                          {done ? "Finalizado" : `Fase ${phase.phase}`}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )

  // ─── Tab: Pacientes ──────────────────────────────────────────────────────
  const renderPacientes = () => (
    <>
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-sidebar-primary" />
              <h1 className="text-xl font-bold text-sidebar-foreground">Mis Pacientes</h1>
            </div>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors px-3 py-1.5 text-sm font-medium text-sidebar-foreground"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-sidebar-foreground/60">{patientList.length} registrados</p>
            <div className="flex gap-1.5">
              {["red", "yellow", "green"].map(level => {
                const count = patientList.filter(p => p.triage === level).length
                if (count === 0) return null
                return (
                  <div key={level} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    level === "red" ? "bg-red-500/20 border-red-500/40 text-red-100" :
                    level === "yellow" ? "bg-amber-500/20 border-amber-500/40 text-amber-100" :
                    "bg-green-500/20 border-green-500/40 text-green-100"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      level === "red" ? "bg-red-500" : level === "yellow" ? "bg-amber-400" : "bg-green-500"
                    }`} />
                    {count}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-3">
        {/* Priority Filter Hint */}
        {patientList.some(p => p.triage === "red") && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/5 border border-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <p className="font-semibold">Tienes pacientes en riesgo que requieren atención hoy.</p>
          </div>
        )}
        {patientList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No tienes pacientes aún. ¡Agrega tu primer paciente!</p>
        )}
        {patientList.map(patient => {
          const day = getDaysSinceProcedure(patient.procedureDate)
          const phase = getPatientPhase(day)
          const done = day >= patient.balloonDurationDays
          return (
            <Card key={patient.id} className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-[0.99]" onClick={() => setSelectedPatient(patient)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 relative">
                      <User className="h-5 w-5 text-primary" />
                      <span className={`absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
                        patient.triage === "red" ? "bg-red-500" :
                        patient.triage === "yellow" ? "bg-amber-400" :
                        "bg-green-500"
                      }`} />
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
                      <span className={`text-[10px] font-bold uppercase tracking-tight ${
                        patient.triage === "red" ? "text-red-500" :
                        patient.triage === "yellow" ? "text-amber-500" :
                        done ? "text-muted-foreground" : "text-primary"
                      }`}>
                        {done ? "Finalizado" : `Fase ${phase.phase}`}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                {!done && (
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((day / patient.balloonDurationDays) * 100, 100)}%` }} />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )

  // ─── Tab: Perfil ──────────────────────────────────────────────────────────
  const renderPerfil = () => (
    <>
      <header className="bg-sidebar px-4 pb-8 pt-12">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground font-bold text-2xl">
              {doctor.avatarInitials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">{doctor.name}</h1>
              <p className="text-sm text-sidebar-foreground/70">{doctor.specialty}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Correo electrónico</p>
                <p className="font-medium text-foreground">{doctor.email}</p>
              </div>
            </div>
            {doctor.phone && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium text-foreground">{doctor.phone}</p>
                </div>
              </div>
            )}
            {doctor.clinicId && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clínica</p>
                  <p className="font-medium text-foreground">{doctor.clinicId}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-primary/5 p-3">
                <p className="text-2xl font-bold text-primary">{patientList.length}</p>
                <p className="text-xs text-muted-foreground">Pacientes totales</p>
              </div>
              <div className="rounded-xl bg-muted p-3">
                <p className="text-2xl font-bold text-foreground">{patientList.filter(p => getDaysSinceProcedure(p.procedureDate) < p.balloonDurationDays).length}</p>
                <p className="text-xs text-muted-foreground">En tratamiento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Mis Tipos de Balón</CardTitle>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={openAddBalloonModal}>
              <Plus className="h-3.5 w-3.5" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {doctorBalloons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tienes balones configurados.</p>
            ) : (
              doctorBalloons.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.durationDays} días de tratamiento</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditBalloonModal(b)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteBalloon(b.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => signOut(auth)}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </>
  )

  return (
    <main className="min-h-screen bg-background pb-24">
      {tab === "inicio" && renderInicio()}
      {tab === "pacientes" && renderPacientes()}
      {tab === "perfil" && renderPerfil()}

      <DoctorBottomNav active={tab} onTabChange={setTab} />

      {/* Add Modal */}
      {showAddModal && (
        <PatientFormModal
          title="Agregar Paciente"
          form={form}
          updateF={updateForm}
          onClose={() => { setShowAddModal(false); setForm(emptyForm) }}
          onSave={handleAddPatient}
          saving={savingPatient}
          success={addSuccess}
          addAllergy={(type) => addAllergy(type, form, setForm)}
          removeAllergy={(type, item) => removeAllergy(type, item, form, setForm)}
          doctorBalloons={doctorBalloons}
          handleBalloonSelect={(bt) => handleBalloonSelect(bt, setForm)}
        />
      )}

      {/* Edit Modal */}
      {editingPatient && (
        <PatientFormModal
          title="Editar Paciente"
          form={editForm}
          updateF={updateEditForm}
          onClose={() => setEditingPatient(null)}
          onSave={handleEditPatient}
          saving={savingEdit}
          success={editSuccess}
          addAllergy={(type) => addAllergy(type, editForm, setEditForm)}
          removeAllergy={(type, item) => removeAllergy(type, item, editForm, setEditForm)}
          doctorBalloons={doctorBalloons}
          handleBalloonSelect={(bt) => handleBalloonSelect(bt, setEditForm)}
          showWeightCurrent
        />
      )}

      {/* Balloon Type Modal */}
      {showBalloonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl animate-in slide-in-from-bottom-4 p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">{editingBalloonId ? "Editar Balón" : "Agregar Balón"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Nombre del balón</label>
                <Input placeholder="Ej: Orbera" value={balloonForm.name} onChange={e => setBalloonForm({ ...balloonForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Duración (días)</label>
                <Input type="number" placeholder="Ej: 180" value={balloonForm.durationDays} onChange={e => setBalloonForm({ ...balloonForm, durationDays: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setShowBalloonModal(false)}>Cancelar</Button>
                <Button onClick={handleSaveBalloon} disabled={!balloonForm.name.trim() || !balloonForm.durationDays.trim()}>Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function DoctorBottomNav({ active, onTabChange }: { active: Tab; onTabChange: (t: Tab) => void }) {
  const items: { key: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: "inicio", label: "Inicio", icon: Home },
    { key: "pacientes", label: "Pacientes", icon: Users },
    { key: "perfil", label: "Mi Perfil", icon: User },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex flex-col items-center gap-1 px-3 py-2 transition-colors ${
              active === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

// ─── Reusable Patient Form Modal ──────────────────────────────────────────────
type FormType = typeof emptyForm

function PatientFormModal({
  title, form, updateF, onClose, onSave, saving, success,
  addAllergy, removeAllergy, doctorBalloons, handleBalloonSelect, showWeightCurrent,
}: {
  title: string
  form: FormType
  updateF: (key: keyof FormType, value: unknown) => void
  onClose: () => void
  onSave: () => void
  saving: boolean
  success: boolean
  addAllergy: (type: "med" | "food") => void
  removeAllergy: (type: "med" | "food", item: string) => void
  doctorBalloons: { id: string; name: string; durationDays: number }[]
  handleBalloonSelect: (bt: { name: string; durationDays: number }) => void
  showWeightCurrent?: boolean
}) {
  const isValid = form.name.trim() && form.email.trim() && form.procedureDate && form.weightStart && form.weightGoal

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-2xl bg-card shadow-2xl animate-in slide-in-from-bottom max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border flex items-center justify-between px-6 py-4 z-10">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Datos Personales</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Nombre completo *</label>
                <Input placeholder="Ej: María García" value={form.name} onChange={e => updateF("name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Correo electrónico *</label>
                <Input type="email" placeholder="paciente@email.com" value={form.email} onChange={e => updateF("email", e.target.value)} />
              </div>
              {form.password !== undefined && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Contraseña Temporal *</label>
                  <Input type="text" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => updateF("password", e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-1">Se enviará por correo al paciente.</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Teléfono (RD)</label>
                <Input
                  placeholder="+1 829 740 4861"
                  value={form.phone}
                  onChange={e => handlePhoneInput(e.target.value, v => updateF("phone", v))}
                  inputMode="tel"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Fecha de nacimiento</label>
                <Input type="date" value={form.dateOfBirth} onChange={e => updateF("dateOfBirth", e.target.value)} />
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Procedimiento</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Fecha del procedimiento *</label>
                <Input type="date" value={form.procedureDate} onChange={e => updateF("procedureDate", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Tipo de balón *</label>
                <div className="grid grid-cols-2 gap-2">
                  {doctorBalloons.map(bt => (
                    <button key={bt.id} onClick={() => handleBalloonSelect(bt)} className={`rounded-xl border-2 p-3 text-left transition-all ${form.balloonType === bt.name ? "border-primary bg-primary/5" : "border-border bg-muted/40 hover:border-primary/40"}`}>
                      <p className={`text-xs font-semibold ${form.balloonType === bt.name ? "text-primary" : "text-foreground"}`}>{bt.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{bt.durationDays} días</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-border" />

          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Metas de Peso</p>
            <div className="grid grid-cols-1 gap-3">
              {/* Initial weight */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Peso inicial (lbs) *</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Ej: 203"
                    value={form.weightStart}
                    onChange={e => updateF("weightStart", e.target.value)}
                    className="pr-24"
                  />
                  {kgPreview(form.weightStart) !== null && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 pointer-events-none">
                      = {kgPreview(form.weightStart)} kg
                    </span>
                  )}
                </div>
              </div>
              {/* Goal weight */}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Peso meta (lbs) *</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Ej: 158"
                    value={form.weightGoal}
                    onChange={e => updateF("weightGoal", e.target.value)}
                    className="pr-24"
                  />
                  {kgPreview(form.weightGoal) !== null && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 pointer-events-none">
                      = {kgPreview(form.weightGoal)} kg
                    </span>
                  )}
                </div>
              </div>
              {/* Current weight (edit only) */}
              {showWeightCurrent && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Peso actual (lbs)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Ej: 195"
                      value={form.weightCurrent}
                      onChange={e => updateF("weightCurrent", e.target.value)}
                      className="pr-24"
                    />
                    {kgPreview(form.weightCurrent) !== null && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5 pointer-events-none">
                        = {kgPreview(form.weightCurrent)} kg
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-border" />

          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alergias</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-foreground">Medicamentos</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.allergiesMedications.map(a => (
                    <span key={a} className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                      {a}
                      <button onClick={() => removeAllergy("med", a)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Agregar medicamento..." value={form.newMedAllergy} onChange={e => updateF("newMedAllergy", e.target.value)} onKeyDown={e => e.key === "Enter" && addAllergy("med")} className="h-8 text-xs" />
                  <Button size="sm" variant="outline" onClick={() => addAllergy("med")} className="h-8 px-2"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-foreground">Alimentos</p>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.allergiesFoods.map(a => (
                    <span key={a} className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                      {a}
                      <button onClick={() => removeAllergy("food", a)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Agregar alimento..." value={form.newFoodAllergy} onChange={e => updateF("newFoodAllergy", e.target.value)} onKeyDown={e => e.key === "Enter" && addAllergy("food")} className="h-8 text-xs" />
                  <Button size="sm" variant="outline" onClick={() => addAllergy("food")} className="h-8 px-2"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </section>

          <Button className="w-full" disabled={!isValid || saving} onClick={onSave}>
            {success ? (
              <><Check className="mr-2 h-4 w-4" />Guardado</>
            ) : saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : (
              <><Check className="mr-2 h-4 w-4" />{title}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  return (
    <ProtectedRoute allowedRoles={["doctor"]}>
      <DoctorContent />
    </ProtectedRoute>
  )
}
