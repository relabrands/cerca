import { NextResponse } from "next/server";
import { ai } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { phase, weightStart, weightCurrent, allergies } = await req.json();

    const prompt = `Eres un coach nutricional experto ayudando a un paciente que se ha colocado un balón gástrico.
Actualmente se encuentra en la Fase ${phase} de su recuperación.
Su peso inicial fue ${weightStart}kg y su peso actual es ${weightCurrent}kg.
Sus alergias alimentarias o medicamentosas son: ${allergies ? allergies.join(", ") : "Ninguna"}.

Genera UN SOLO CONSEJO corto, directo y motivacional para el día de hoy (máximo 2 oraciones).
Debe estar estrictamente adaptado a la Fase ${phase} y no sugerir NINGÚN ALIMENTO O HÁBITO QUE INVOLUCRE SUS ALERGIAS.
El tono debe ser amigable y alentador.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const prediction = response.text || "Hoy es un gran día para seguir enfocándote en tu salud y bienestar.";

    return NextResponse.json({ prediction });
  } catch (error: any) {
    console.error("Error generando predicción:", error);
    return NextResponse.json(
      { error: "Error generando consejo diario.", details: error.message },
      { status: 500 }
    );
  }
}
