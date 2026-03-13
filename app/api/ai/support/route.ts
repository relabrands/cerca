import { NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const ai = getAI();
    const { messages, patientPhase, patientDay, allergies } = await req.json();

    // Build conversation history as a single prompt with turns
    const history = (messages as { text: string; isUser: boolean }[])
      .map((m) => (m.isUser ? `Paciente: ${m.text}` : `Asistente: ${m.text}`))
      .join("\n");

    const prompt = `Eres un asistente de apoyo emocional y médico para pacientes con balón gástrico.
El paciente está en el DÍA ${patientDay ?? "??"} de su recuperación (Fase ${patientPhase ?? 1}).
Alergias/restricciones del paciente: ${allergies?.length ? allergies.join(", ") : "Ninguna"}.

REGLAS OBLIGATORIAS:
1. Responde de forma CORTA, calmada y empática (máximo 3-4 oraciones).
2. Si el paciente menciona dolor muy intenso, sangrado, fiebre alta, dificultad para respirar, o pérdida del conocimiento: recomiéndale URGENTEMENTE ir a una sala de emergencias inmediatamente.
3. Para síntomas menores (náuseas, reflujo, ansiedad, malestar leve): brinda consejos de manejo para ese momento, adaptados a la fase post-balón.
4. No hagas diagnósticos. No recetes medicamentos.
5. Siempre recuerda que el médico ya fue notificado del evento.
6. Nunca menciones alimentos que involucren las alergias del paciente.

Historial de conversación:
${history}

Genera la respuesta del asistente para el último mensaje del paciente. Solo escribe la respuesta, sin "Asistente:" al inicio.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.4 },
    });

    const reply = response.text?.trim() || "Estamos aquí contigo. Si los síntomas persisten o empeoran, por favor ve a urgencias más cercanas.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Error en soporte IA:", error);
    return NextResponse.json(
      { error: "Error generando respuesta.", details: error.message },
      { status: 500 }
    );
  }
}
