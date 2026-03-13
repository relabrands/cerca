"use client"

import { useState, useEffect, useRef } from "react"
import { HeartPulse, X, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { type Patient, getDaysSinceProcedure, getPatientPhase } from "@/lib/store"

const quickTags = [
  { label: "Náuseas", emoji: "🤢" },
  { label: "Ansiedad", emoji: "😰" },
  { label: "Reflujo", emoji: "🔥" },
  { label: "Dolor intenso", emoji: "😣" },
]

interface Message {
  id: number
  text: string
  isUser: boolean
}

const DISCLAIMER = "⚠️ Esta función está en beta. La IA puede cometer errores — siempre sigue las indicaciones de tu médico."

export function PanicButton() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "¿Cómo te sientes? Cuéntame tu síntoma para ayudarte.", isUser: false },
  ])
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load patient context when modal opens
  useEffect(() => {
    if (!isOpen) return
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return
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
        setPatient(fetchedPatient)
      } catch {}
    })
    return () => unsubscribe()
  }, [isOpen])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  const getAIReply = async (allMessages: Message[]) => {
    setIsThinking(true)
    try {
      const currentDay = patient ? getDaysSinceProcedure(patient.procedureDate) : 1
      const { phase } = patient ? getPatientPhase(currentDay) : { phase: 1 }

      // Notify doctor (fire-and-forget)
      if (patient) {
        fetch("/api/panic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: patient.id,
            patientName: patient.name,
            doctorId: patient.doctorId,
            reason: allMessages[allMessages.length - 1]?.text,
          }),
        }).catch(() => {})
      }

      const res = await fetch("/api/ai/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: allMessages,
          patientPhase: phase,
          patientDay: patient ? getDaysSinceProcedure(patient.procedureDate) : 1,
          allergies: [
            ...(patient?.allergiesFoods || []),
            ...(patient?.allergiesMedications || []),
          ],
        }),
      })
      const data = await res.json()
      const reply = data.reply || "Estamos aquí contigo. Si los síntomas empeoran, ve a urgencias más cercanas."
      const aiMsg: Message = { id: allMessages.length + 1, text: reply, isUser: false }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const aiMsg: Message = {
        id: allMessages.length + 1,
        text: "Lo siento, hubo un problema al generar respuesta. Si es una emergencia, ve a urgencias inmediatamente.",
        isUser: false,
      }
      setMessages(prev => [...prev, aiMsg])
    } finally {
      setIsThinking(false)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: messages.length + 1, text, isUser: true }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    await getAIReply(updated)
  }

  return (
    <>
      {/* Floating Panic Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-destructive px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95",
          "animate-pulse hover:animate-none"
        )}
        aria-label="Botón de Auxilio"
      >
        <HeartPulse className="h-5 w-5" />
        <span>Auxilio</span>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className="flex h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-card sm:h-[600px] sm:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <HeartPulse className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Asistente de Apoyo</h2>
                  <p className="text-xs text-muted-foreground">Tu doctor ha sido notificado</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick Tags */}
            <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
              {quickTags.map((tag) => (
                <button
                  key={tag.label}
                  onClick={() => sendMessage(tag.label)}
                  disabled={isThinking}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                >
                  <span>{tag.emoji}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    message.isUser
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {message.text}
                </div>
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analizando...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Beta Disclaimer */}
            <div className="px-4 pb-1">
              <p className="text-center text-[10px] text-muted-foreground leading-tight">
                {DISCLAIMER}
              </p>
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe cómo te sientes..."
                  className="flex-1"
                  disabled={isThinking}
                  onKeyDown={(e) => e.key === "Enter" && !isThinking && sendMessage(input)}
                />
                <Button onClick={() => sendMessage(input)} size="icon" className="shrink-0" disabled={isThinking || !input.trim()}>
                  {isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
