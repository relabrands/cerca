import { NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";
import { Type, Schema } from "@google/genai";

export async function POST(req: Request) {
  try {
    const ai = getAI();
    const { type, phase, allergiesFoods, allergiesMedications } = await req.json();

    const allowedPhase = parseInt(phase) || 1;
    const typeLabel = type === "economica"
      ? "Económica (con ingredientes básicos de despensa latinoamericana y baratos)"
      : "Regular (ingredientes frescos, variados y ricos en proteína)";

    const avoid = [
      ...(allergiesFoods || []),
      ...(allergiesMedications || [])
    ].join(", ");

    const prompt = `Actúa como un Chef Nutricionista especializado en pacientes bariátricos (balón gástrico).
Genera UNA receta de tipo: ${typeLabel}.
El paciente está en la FASE ${allowedPhase} de su recuperación post-balón. 
Las texturas y volumen deben ser ESTRICTAMENTE adecuados para la fase ${allowedPhase}.
ALERGIAS O RESTRICCIONES DEL PACIENTE A EVITAR ABSOLUTAMENTE: ${avoid || "Ninguna"}.

Recuerda:
- FASE 1: Solo líquidos claros.
- FASE 2: Líquidos completos y purés muy suaves.
- FASE 3: Dieta blanda.
- FASE 4: Dieta normal (sólidos pequeños).`;

    const recipeSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Nombre atractivo de la receta" },
        phase: { type: Type.INTEGER, description: "La fase para la cual fue diseñada (1, 2, 3 o 4)" },
        prepTime: { type: Type.STRING, description: "Tiempo estimado, ej: '20 min'" },
        ingredients: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Lista de ingredientes con cantidades"
        },
        instructions: { type: Type.STRING, description: "Un párrafo corto con las instrucciones paso a paso" },
        calories: { type: Type.INTEGER, description: "Calorías totales estimadas" },
        protein: { type: Type.INTEGER, description: "Gramos de proteína totales estimados" }
      },
      required: ["name", "phase", "prepTime", "ingredients", "instructions", "calories", "protein"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.4, // Slight variation for different recipes
        // Use JSON schema to guarantee formatting
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      },
    });

    if (!response.text) throw new Error("Receta vacía de la IA.");

    // El SDK genérico la devuelve como string de JSON, debemos parsearlo
    const generatedRecipe = JSON.parse(response.text);

    return NextResponse.json({ recipe: generatedRecipe });
  } catch (error: any) {
    console.error("Error generando receta:", error);
    return NextResponse.json(
      { error: "Error generando la receta con IA.", details: error.message },
      { status: 500 }
    );
  }
}
