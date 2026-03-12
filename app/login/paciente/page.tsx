"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, Stethoscope } from "lucide-react"
import { findCredential, patients } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function PatientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Simulate async auth
    setTimeout(() => {
      const cred = findCredential(email, password)
      if (!cred || cred.role !== "patient") {
        setError("Correo o contraseña incorrectos.")
        setLoading(false)
        return
      }
      // In production: store session token from Firebase Auth
      // For demo: just navigate
      router.push("/")
      setLoading(false)
    }, 600)
  }

  // Demo hint: first patient credential
  const demoPatient = patients[0]

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo / brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mx-auto">
            <Stethoscope className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Saciety Hub</h1>
          <p className="text-sm text-muted-foreground">Acceso para pacientes</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p role="alert" className="text-sm text-destructive text-center">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>

            {/* Forgot password */}
            <p className="text-center text-xs text-muted-foreground">
              ¿Olvidaste tu contraseña?{" "}
              <span className="text-primary underline cursor-pointer">Contáctanos</span>
            </p>
          </CardContent>
        </Card>

        {/* Demo hint */}
        <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demo rápido</p>
          <button
            type="button"
            onClick={() => { setEmail(demoPatient.email); setPassword("paciente123") }}
            className="text-sm text-primary underline text-left"
          >
            {demoPatient.name} — {demoPatient.email}
          </button>
          <p className="text-xs text-muted-foreground">Contraseña: <span className="font-mono">paciente123</span></p>
        </div>

        {/* Back to role selector */}
        <p className="text-center text-xs text-muted-foreground">
          ¿Eres médico o administrador?{" "}
          <Link href="/select-role" className="text-primary underline">
            Cambiar acceso
          </Link>
        </p>
      </div>
    </main>
  )
}
