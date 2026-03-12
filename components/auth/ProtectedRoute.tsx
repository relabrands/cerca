"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Redirigir si no hay sesión iniciada
        router.push("/login");
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData?.role;

          // Verificar si el rol está permitido para esta ruta
          if (allowedRoles.includes(userRole)) {
            setAuthorized(true);
          } else {
            // Usuario logueado pero sin permiso para esta ruta
            // Lo enviarémos a su respectivo dashboard
            if (userRole === "admin") router.push("/admin");
            else if (userRole === "doctor") router.push("/doctor");
            else if (userRole === "paciente" || userRole === "patient") router.push("/paciente");
            else router.push("/login");
          }
        } else {
          // Documento no encontrado, cerrar sesión
          await auth.signOut();
          router.push("/login");
        }
      } catch (error) {
        console.error("Error verificando permisos:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Verificando acceso...</p>
      </div>
    );
  }

  return authorized ? <>{children}</> : null;
}
