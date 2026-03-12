"use client"

import { useState, useEffect } from "react"
import { HeartPulse, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
// Need firebase auth to identify patient
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { type Patient } from "@/lib/store"
import { toast } from "sonner"

const quickTags = [
  { label: "Náuseas", emoji: "🤢" },
  { label: "Ansiedad", emoji: "😰" },
  { label: "Reflujo", emoji: "🔥" },
  { label: "Dolor", emoji: "😣" },
]

interface Message {
  id: number
  text: string
  isUser: boolean
}

export function PanicButton() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "¿Cómo te sientes? Cuéntame tu síntoma para ayudarte a calmarte.",
      isUser: false,
    },
  ])
  const [input, setInput] = useState("")

  useEffect(() => {
    // Only fetch patient context once when opened
    if (!isOpen) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      try {
        let fetchedPatient = null
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists() && userDoc.data().entityId) {
          const pDoc = await getDoc(doc(db, "patients", userDoc.data().entityId))
          if (pDoc.exists()) fetchedPatient = { id: pDoc.id, ...pDoc.data() } as Patient
        }
        if (!fetchedPatient && user.email) {
          const q = query(collection(db, "patients"), where("email", "==", user.email))
          const sq = await getDocs(q)
          if (!sq.empty) fetchedPatient = { id: sq.docs[0].id, ...sq.docs[0].data() } as Patient
        }
        setPatient(fetchedPatient)
      } catch (err) {
        console.error("Error fetching patient for panic button", err)
      }
    })
    return () => unsubscribe()
  }, [isOpen])

  const triggerPanicDb = async (reason: string) => {
    if (!patient) return;
    setIsSending(true)
    try {
      await fetch("/api/panic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          patientName: patient.name,
          doctorId: patient.doctorId,
          reason
        })
      });
    } catch(err) {
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  const handleTagClick = async (tag: string) => {
    const userMessage: Message = {
      id: messages.length + 1,
      text: tag,
      isUser: true,
    }
    
    setMessages(prev => [...prev, userMessage])
    await triggerPanicDb(tag);

    // Simulated response
    const responses: Record<string, string> = {
      "Náuseas": "Entiendo que te sientes con náuseas. Esto es muy común en las primeras semanas. Hemos avisado a tu doctor. Te recomiendo: 1) Bebe pequeños sorbos de agua fría cada 15 minutos. 2) Respira profundamente. 3) Evita movimientos bruscos.",
      "Ansiedad": "Es completamente normal sentir ansiedad. Hemos notificado al doctor. Intenta respirar profundamente 5 veces. Si necesitas hablar con alguien, tu centro médico está disponible para ti.",
      "Reflujo": "El reflujo puede ser incómodo. Hemos registrado tu alerta. Te sugiero: 1) No te acuestes inmediatamente después de comer. 2) Eleva la cabecera de tu cama. 3) Evita alimentos ácidos o picantes.",
      "Dolor": "Lamento que sientas dolor. Hemos enviado inmediatamente una alerta a tu médico asignado. Si el dolor es intenso, por favor dirígete a urgencias.",
    }

    const aiMessage: Message = {
      id: messages.length + 2,
      text: responses[tag] || "Gracias por compartir cómo te sientes. Hemos notificado a tu doctor.",
      isUser: false,
    }

    setMessages(prev => [...prev, aiMessage])
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      text: input,
      isUser: true,
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput("")
    
    await triggerPanicDb(input);

    const aiMessage: Message = {
      id: messages.length + 2,
      text: "Hemos registrado tu mensaje de alerta y lo enviaremos a tu doctor. Si es una emergencia grave, por favor acude al hospital más cercano.",
      isUser: false,
    }

    setMessages(prev => [...prev, aiMessage])
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
                  <p className="text-xs text-muted-foreground">Estamos aquí para ayudarte</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick Tags */}
            <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
              {quickTags.map((tag) => (
                <button
                  key={tag.label}
                  onClick={() => handleTagClick(tag.label)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
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
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe cómo te sientes..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
