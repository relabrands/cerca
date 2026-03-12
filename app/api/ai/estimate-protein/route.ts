import { NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const ai = getAI();
    const { foodDescription } = await req.json();

    if (!foodDescription || typeof foodDescription !== "string") {
      return NextResponse.json({ error: "Descripción de comida inválida." }, { status: 400 });
    }

    const prompt = `Eres un asistente de nutrición experto. El paciente indica que comió lo siguiente:
"${foodDescription}"

Por favor, estima la cantidad total de gramos de proteína que aproximadamente contiene esa comida, siendo realista y asumiendo porciones promedio si no se especifican.

REGLAS ESTRICTAS PARA TU RESPUESTA:
- Debes responder ÚNICAMENTE con un número entero que represente los gramos totales de proteína.
- NO agregues texto, explicaciones, ni la letra "g" al final. SOLO el número.
- Si lo que comió no tiene proteína (ej: agua, manzana sola, té), responde 0.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1, // Low temp for more deterministic, factual estimation
      },
    });

    const textOutput = response.text || "0";

    // Fallback parsing just in case the model adds extra spaces or a dot
    const proteinGrams = parseInt(textOutput.replace(/[^0-9]/g, ""), 10);

    return NextResponse.json({
      protein: isNaN(proteinGrams) ? 0 : proteinGrams,
    });
  } catch (error: any) {
    console.error("Error estimando proteína:", error);
    return NextResponse.json(
      { error: "Error calculando proteína.", details: error.message },
      { status: 500 }
    );
  }
}
