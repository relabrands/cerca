import { NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const ai = getAI();
    const { patientId, patientName, phase, weightStart, weightGoal } = await req.json();

    if (!patientId) {
      return NextResponse.json({ error: "Patient ID is required" }, { status: 400 });
    }

    // Fetch last 7 days of logs
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStr = lastWeek.toISOString().split("T")[0];

    // Get daily logs
    const dailyLogsSnap = await adminDb
      .collection("patients")
      .doc(patientId)
      .collection("dailyLogs")
      .where("__name__", ">=", lastWeekStr)
      .get();
    
    const dailyLogs = dailyLogsSnap.docs.map(doc => ({
      date: doc.id,
      ...(doc.data() as any)
    })) as any[];

    // Get weight logs
    const weightLogsSnap = await adminDb
      .collection("patients")
      .doc(patientId)
      .collection("weightLogs")
      .where("date", ">=", lastWeekStr)
      .orderBy("date", "desc")
      .get();
    
    const weightLogs = weightLogsSnap.docs.map(doc => doc.data());

    // Get alerts (panic)
    const alertsSnap = await adminDb
      .collection("alerts")
      .where("patientId", "==", patientId)
      .where("createdAt", ">=", lastWeek)
      .get();
    
    const alertsCount = alertsSnap.size;

    const currentWeight = weightLogs.length > 0 ? weightLogs[0].weight : weightStart;

    const prompt = `Eres un asistente médico experto analizando el progreso de un paciente con balón gástrico.
Genera un "Resumen Clínico" conciso (máximo 4-5 oraciones) para el médico tratante sobre la última semana del paciente.

DATOS DEL PACIENTE:
- Nombre: ${patientName}
- Fase Actual: ${phase}
- Peso Inicial: ${weightStart}kg
- Peso Meta: ${weightGoal}kg
- Peso Actual Estimado: ${currentWeight}kg

ACTIVIDAD DE LA ÚLTIMA SEMANA:
- Registros diarios encontrados: ${dailyLogs.length} de 7 días.
- Promedio Hidratación: ${dailyLogs.reduce((acc: number, log: any) => acc + (log.hydration_ml || 0), 0) / (dailyLogs.length || 1)}ml/día.
- Alertas de Pánico: ${alertsCount} en la última semana.
- Registros de peso: ${weightLogs.length} en la última semana.

GUÍA PARA EL RESUMEN:
1. Sé directo y profesional.
2. Menciona la pérdida de peso si hay datos suficientes.
3. Evalúa la adherencia a la hidratación y proteínas si hay registros.
4. Resalta cualquier alerta de pánico o síntoma mencionado.
5. Da una conclusión rápida sobre el estado del paciente (Ej: "Progreso excelente", "Requiere seguimiento", "Riesgo de deshidratación").

JSON de logs para contexto adicional: ${JSON.stringify(dailyLogs)}

RESPUESTA EN ESPAÑOL:`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { temperature: 0.3 },
    });

    const summary = response.text?.trim() || "No se pudo generar el resumen clínico en este momento.";

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Error generating clinical summary:", error);
    return NextResponse.json(
      { error: "Error generating clinical summary.", details: error.message },
      { status: 500 }
    );
  }
}
