"use client"

import { useState } from "react"
import { HeartPulse, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

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
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "¿Cómo te sientes? Cuéntame tu síntoma para ayudarte a calmarte.",
      isUser: false,
    },
  ])
  const [input, setInput] = useState("")

  const handleTagClick = (tag: string) => {
    const userMessage: Message = {
      id: messages.length + 1,
      text: tag,
      isUser: true,
    }
    
    // Simulated AI response based on symptom
    const responses: Record<string, string> = {
      "Náuseas": "Entiendo que te sientes con náuseas. Esto es muy común en las primeras semanas. Te recomiendo: 1) Bebe pequeños sorbos de agua fría cada 15 minutos. 2) Respira profundamente. 3) Evita movimientos bruscos. Si persisten más de 2 horas, contacta a tu centro médico.",
      "Ansiedad": "Es completamente normal sentir ansiedad durante este proceso. Recuerda: estás haciendo un gran cambio por tu salud. Intenta respirar profundamente 5 veces. Si necesitas hablar con alguien, tu centro médico está disponible para ti.",
      "Reflujo": "El reflujo puede ser incómodo. Te sugiero: 1) No te acuestes inmediatamente después de comer. 2) Eleva la cabecera de tu cama. 3) Evita alimentos ácidos o picantes. Si el reflujo es severo, consulta con tu médico.",
      "Dolor": "Lamento que sientas dolor. Si es un dolor leve o molestia, puede ser parte del proceso de adaptación. Sin embargo, si el dolor es intenso, persistente, o viene acompañado de fiebre, contacta inmediatamente a tu centro médico.",
    }

    const aiMessage: Message = {
      id: messages.length + 2,
      text: responses[tag] || "Gracias por compartir cómo te sientes. ¿Puedes describir más tu síntoma para poder ayudarte mejor?",
      isUser: false,
    }

    setMessages([...messages, userMessage, aiMessage])
  }

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: messages.length + 1,
      text: input,
      isUser: true,
    }

    const aiMessage: Message = {
      id: messages.length + 2,
      text: "Gracias por compartir cómo te sientes. Recuerda que los primeros días pueden ser desafiantes, pero cada día que pasa tu cuerpo se adapta mejor. Si tus síntomas persisten o empeoran, no dudes en contactar a tu centro médico.",
      isUser: false,
    }

    setMessages([...messages, userMessage, aiMessage])
    setInput("")
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
