import { NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const ai = getAI();
    const { phase, currentDay, weightStart, weightCurrent, allergies } = await req.json();

    const prompt = `Eres un coach nutricional experto en pacientes con balón gástrico.
El paciente está en el DÍA ${currentDay ?? 1} post-colocación del balón, que corresponde a la Fase ${phase}.
Su peso inicial fue ${weightStart}kg y ahora pesa ${weightCurrent}kg.
Alergias/restricciones: ${allergies?.length ? allergies.join(", ") : "Ninguna"}.

Tu tarea: Genera UN MENSAJE CORTO (máximo 2 oraciones) personalizado para HOY (día ${currentDay ?? 1}).
- Menciona brevemente qué síntomas o sensaciones son NORMALES esperar en este día específico.
- Incluye UN consejo práctico muy concreto para manejar ese día.
- No menciones alimentos que involucren sus alergias.
- Tono amigable, empático y alentador. Sin listas, solo texto corrido.

Ejemplo del tipo de respuesta esperada (NO copies esto, genera uno original):
"En el día 3 es normal sentir náuseas leves cuando te mueves rápido — toma sorbos pequeños de agua fría cada 15 minutos y descansa. ¡Tu cuerpo ya está adaptándose!"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.6 },
    });

    const prediction = response.text?.trim() || "Hoy es un gran día para cuidarte. Recuerda hidratarte bien y escuchar a tu cuerpo.";

    return NextResponse.json({ prediction });
  } catch (error: any) {
    console.error("Error generando predicción:", error);
    return NextResponse.json(
      { error: "Error generando consejo diario.", details: error.message },
      { status: 500 }
    );
  }
}
