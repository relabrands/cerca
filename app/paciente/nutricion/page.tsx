"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"
import { PanicButton } from "@/components/panic-button"
import { Sparkles, Clock, ChefHat, Loader2, Check, Utensils, ShoppingBag, Package, AlertTriangle, X } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { type Patient, getDaysSinceProcedure, getPatientPhase } from "@/lib/store"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface Recipe {
  id: number
  name: string
  phase: number
  prepTime: string
  ingredients: string[]
  instructions: string
  calories: number
  protein: number
  type?: "economica" | "regular"
}

const phaseRecipes: Recipe[] = [
  {
    id: 1,
    name: "Caldo de pollo clarificado",
    phase: 1,
    prepTime: "30 min",
    ingredients: ["500ml de caldo de pollo bajo en sodio", "1 clara de huevo", "Sal al gusto"],
    instructions: "Calienta el caldo y añade la clara batida. Deja hervir a fuego lento y cuela.",
    calories: 25,
    protein: 4,
  },
  {
    id: 2,
    name: "Gelatina sin azúcar",
    phase: 1,
    prepTime: "15 min + refrigeración",
    ingredients: ["1 sobre de gelatina sin azúcar", "500ml de agua"],
    instructions: "Disuelve la gelatina en agua caliente, vierte en moldes y refrigera por 4 horas.",
    calories: 10,
    protein: 2,
  },
  {
    id: 3,
    name: "Té de manzanilla con miel",
    phase: 1,
    prepTime: "5 min",
    ingredients: ["1 bolsita de té de manzanilla", "250ml de agua caliente", "1/2 cucharadita de miel (opcional)"],
    instructions: "Infusiona el té en agua caliente por 3-5 minutos. Añade miel si lo deseas.",
    calories: 15,
    protein: 0,
  },
]

const aiRecipes: Record<"economica" | "regular", Recipe> = {
  economica: {
    id: 101,
    name: "Consomé de verduras con clara de huevo",
    phase: 1,
    type: "economica",
    prepTime: "20 min",
    ingredients: [
      "1 litro de agua",
      "1 zanahoria (de despensa)",
      "1 tallo de apio (de despensa)",
      "1/4 de cebolla (de despensa)",
      "1 clara de huevo (de despensa)",
      "Sal y hierbas al gusto",
    ],
    instructions:
      "Hierve las verduras en agua 20 min a fuego lento. Cuela el líquido, añade la clara batida y mezcla. Sirve tibio.",
    calories: 30,
    protein: 6,
  },
  regular: {
    id: 102,
    name: "Caldo proteico de pollo y jengibre",
    phase: 1,
    type: "regular",
    prepTime: "35 min",
    ingredients: [
      "500ml de caldo de pollo bajo en sodio",
      "50g de pechuga de pollo cocida y desmenuzada",
      "1 rodaja de jengibre fresco",
      "1 cucharada de aceite de oliva",
      "Sal de mar y cúrcuma al gusto",
    ],
    instructions:
      "Calienta el caldo con el jengibre 5 min. Añade el pollo desmenuzado, el aceite y las especias. Deja reposar 2 min y sirve.",
    calories: 90,
    protein: 18,
  },
}

type RecipeType = "economica" | "regular" | null

export default function NutricionPage() {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null)
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [selectedType, setSelectedType] = useState<RecipeType>(null)

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

  const handleOpenTypeModal = () => {
    setSelectedType(null)
    setShowTypeModal(true)
  }

  const handleGenerateRecipe = async () => {
    if (!selectedType || !patient) return
    setShowTypeModal(false)
    setIsGenerating(true)

    const currentDay = getDaysSinceProcedure(patient.procedureDate)
    const { phase: phaseNumber } = getPatientPhase(currentDay)

    try {
      const res = await fetch("/api/ai/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          phase: phaseNumber,
          allergiesFoods: patient.allergiesFoods || [],
          allergiesMedications: patient.allergiesMedications || [],
        }),
      })
      const data = await res.json()
      if (data.recipe) {
        setGeneratedRecipe({ ...data.recipe, id: 999, type: selectedType })
      }
    } catch (err) {
      console.error("Error generando receta:", err)
    } finally {
      setIsGenerating(false)
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

  const patientAllergiesFoods = patient.allergiesFoods || []
  const patientAllergiesMedications = patient.allergiesMedications || []

  const currentDay = getDaysSinceProcedure(patient.procedureDate)
  const { phase: phaseNumber, label: phaseLabel } = getPatientPhase(currentDay)

  return (
    <ProtectedRoute allowedRoles={["paciente", "patient"]}>
      <main className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="bg-sidebar px-4 pb-8 pt-12">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center gap-2">
              <Utensils className="h-6 w-6 text-sidebar-primary" />
              <h1 className="text-2xl font-bold text-sidebar-foreground">Nutrición Inteligente</h1>
            </div>
            <p className="mt-1 text-sm text-sidebar-foreground/70">Recetas adaptadas a tu fase actual</p>
          </div>
        </header>

        <div className="mx-auto max-w-lg px-4 -mt-4 space-y-4">
          {/* Current Phase Indicator */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-primary">Fase actual</p>
                <p className="font-semibold text-foreground">Fase {phaseNumber}: {phaseLabel}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          {/* Allergy Alert Banner */}
          {patientAllergiesFoods.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Alergias registradas</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Las recetas excluirán: <span className="font-medium">{patientAllergiesFoods.join(", ")}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Recipe Generator */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Generador de Recetas IA</p>
                  <p className="text-xs text-muted-foreground">Adaptado a tu perfil y alergias</p>
                </div>
              </div>

              <Button onClick={handleOpenTypeModal} className="w-full" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando receta...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generar Receta con IA
                  </>
                )}
              </Button>

              {/* Generated Recipe — shown as a compact card matching phase card style */}
              {generatedRecipe && (
                <Card
                  className="mt-4 border-0 shadow-md cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => setExpandedRecipe(expandedRecipe === 999 ? null : 999)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <p className="font-semibold text-foreground">{generatedRecipe.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{generatedRecipe.prepTime}</span>
                          <span>•</span>
                          <span>{generatedRecipe.calories} kcal</span>
                          <span>•</span>
                          <span>{generatedRecipe.protein}g proteína</span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        ✨ IA
                      </span>
                    </div>

                    {expandedRecipe === 999 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-medium text-foreground mb-1">Ingredientes:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {generatedRecipe.ingredients.map((ing: string, i: number) => (
                            <li key={i}>• {ing}</li>
                          ))}
                        </ul>
                        <div className="mt-3">
                          <p className="text-xs font-medium text-foreground mb-1">Preparación:</p>
                          <p className="text-xs text-muted-foreground">{generatedRecipe.instructions}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Recipe List */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <ChefHat className="h-5 w-5 text-primary" />
              Recetas para tu Fase
            </h2>

            {phaseRecipes.map((recipe) => (
              <Card
                key={recipe.id}
                className="border-0 shadow-md cursor-pointer transition-all hover:shadow-lg"
                onClick={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{recipe.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{recipe.prepTime}</span>
                        <span>•</span>
                        <span>{recipe.calories} kcal</span>
                        <span>•</span>
                        <span>{recipe.protein}g proteína</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Fase {recipe.phase}
                    </span>
                  </div>

                  {expandedRecipe === recipe.id && (
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-medium text-foreground mb-1">Ingredientes:</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i}>• {ing}</li>
                        ))}
                      </ul>
                      <div className="mt-3">
                        <p className="text-xs font-medium text-foreground mb-1">Preparación:</p>
                        <p className="text-xs text-muted-foreground">{recipe.instructions}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recipe Type Selection Modal */}
        {showTypeModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-2xl animate-in slide-in-from-bottom">
              <h2 className="text-lg font-bold text-foreground mb-1">Tipo de Receta</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Elige el tipo de receta que quieres generar con IA.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setSelectedType("economica")}
                  className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all ${
                    selectedType === "economica"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/50 hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      selectedType === "economica" ? "bg-primary/15" : "bg-muted"
                    }`}
                  >
                    <ShoppingBag className={`h-6 w-6 ${selectedType === "economica" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold text-sm ${selectedType === "economica" ? "text-primary" : "text-foreground"}`}>
                      Económica
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Con lo que tienes en casa o despensa
                    </p>
                  </div>
                  {selectedType === "economica" && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>

                <button
                  onClick={() => setSelectedType("regular")}
                  className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 transition-all ${
                    selectedType === "regular"
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/50 hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      selectedType === "regular" ? "bg-primary/15" : "bg-muted"
                    }`}
                  >
                    <Package className={`h-6 w-6 ${selectedType === "regular" ? "text-primary" : "text-foreground"}`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold text-sm ${selectedType === "regular" ? "text-primary" : "text-foreground"}`}>
                      Regular
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Ingredientes frescos del mercado
                    </p>
                  </div>
                  {selectedType === "regular" && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowTypeModal(false); setSelectedType(null) }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  disabled={!selectedType}
                  onClick={handleGenerateRecipe}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generar
                </Button>
              </div>
            </div>
          </div>
        )}

        <PanicButton />
        <BottomNav />
      </main>
    </ProtectedRoute>
  )
}
