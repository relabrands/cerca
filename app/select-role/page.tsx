"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { User, Stethoscope, Shield, ArrowRight } from "lucide-react"

const roles = [
  {
    href: "/login/paciente",
    icon: User,
    title: "Paciente",
    description: "Seguimiento diario de tu tratamiento con balón gástrico.",
    accent: "bg-primary/10 text-primary",
  },
  {
    href: "/login/doctor",
    icon: Stethoscope,
    title: "Médico",
    description: "Gestión de pacientes, metas de peso y configuración de balón.",
    accent: "bg-blue-100 text-blue-600",
  },
  {
    href: "/login/admin",
    icon: Shield,
    title: "Super Administrador",
    description: "Vista global de toda la red de clínicas y médicos.",
    accent: "bg-slate-100 text-slate-600",
  },
]

export default function SelectRolePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Saciety Hub</h1>
          <p className="text-sm text-muted-foreground">Selecciona tu tipo de acceso para continuar</p>
        </div>

        <div className="space-y-3">
          {roles.map(({ href, icon: Icon, title, description, accent }) => (
            <Link key={href} href={href}>
              <Card className="border shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.98] group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          En producción el rol se determina automáticamente desde Firebase Auth.
        </p>
      </div>
    </main>
  )
}
