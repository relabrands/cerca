"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react"
import { findCredential } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function AdminLoginPage() {
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

    setTimeout(() => {
      const cred = findCredential(email, password)
      if (!cred || cred.role !== "admin") {
        setError("Credenciales de administrador incorrectas.")
        setLoading(false)
        return
      }
      router.push("/admin")
      setLoading(false)
    }, 600)
  }

  return (
    <main className="min-h-screen bg-foreground flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand — dark background for admin */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/20 mx-auto">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-background">Saciety Hub</h1>
          <p className="text-sm text-background/60">Acceso Super Administrador</p>
        </div>

        <Card className="border border-white/10 bg-white/5 shadow-2xl">
          <CardContent className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-background">
                  Correo de administrador
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sacietyhub.mx"
                    className="w-full rounded-lg border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-sm text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-background">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-white/20 bg-white/10 pl-10 pr-10 py-2.5 text-sm text-background placeholder:text-background/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-background/40 hover:text-background"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-400 text-center">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full bg-primary text-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? "Verificando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo hint */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-1">
          <p className="text-xs font-semibold text-background/50 uppercase tracking-wide">Demo rápido</p>
          <button
            type="button"
            onClick={() => { setEmail("admin@sacietyhub.mx"); setPassword("admin123") }}
            className="text-sm text-primary underline text-left"
          >
            admin@sacietyhub.mx
          </button>
          <p className="text-xs text-background/50">Contraseña: <span className="font-mono">admin123</span></p>
        </div>

        <p className="text-center text-xs text-background/40">
          <Link href="/select-role" className="text-primary/80 underline">
            Volver a selección de acceso
          </Link>
        </p>
      </div>
    </main>
  )
}
