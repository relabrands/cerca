"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("paciente");
  const [name, setName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save role and data in Firestore with a timeout to prevent infinite loading
      await Promise.race([
        setDoc(doc(db, "users", user.uid), {
          email: user.email,
          name: name,
          role: role,
          createdAt: new Date()
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout: Firestore no responde. Confirma que la base de datos está creada en la consola de Firebase.")), 6000))
      ]);

      setMessage({ type: "success", text: `Usuario ${role} creado exitosamente!` });
      
      // Clear form
      setEmail("");
      setPassword("");
      setName("");
      
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setMessage({ type: "error", text: "Este correo electrónico ya está registrado." });
      } else {
        setMessage({ type: "error", text: `Error: ${error.message}` });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configuración de Prueba</CardTitle>
          <CardDescription>
            Crea usuarios de prueba para verificar los roles en Firebase (Admin, Doctor, Paciente).
            Esta página debe ser eliminada en producción.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo</label>
              <Input 
                required 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ej. Dr. Juan Pérez" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Correo Electrónico</label>
              <Input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="correo@ejemplo.com" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contraseña (Mínimo 6 caracteres)</label>
              <Input 
                type="text" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                minLength={6} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rol del sistema</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (Admin)</SelectItem>
                  <SelectItem value="doctor">Médico (Doctor)</SelectItem>
                  <SelectItem value="paciente">Paciente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {message.text && (
              <div className={`p-3 text-sm rounded ${message.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creando..." : "Registrar Usuario de Prueba"}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              Una vez creados, ve a <a href="/login" className="underline text-primary">/login</a> para iniciar sesión.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
