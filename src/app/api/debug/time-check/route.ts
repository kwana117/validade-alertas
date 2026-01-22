import { NextResponse } from "next/server";

export async function GET() {
  const timestamp = new Date().toISOString();
  const now = new Date();
  const errors: Array<{ method: string; error: string }> = [];
  const timeCalculations: any = {};

  // Informações do ambiente do servidor
  const serverEnvironment = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "unknown",
    timestamp,
    utcTime: now.toISOString(),
    localTime: now.toString(),
  };

  // Método 1: Intl.DateTimeFormat com formatToParts
  try {
    const formatter1 = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    
    const parts = formatter1.formatToParts(now);
    const hoursPart = parts.find(p => p.type === "hour");
    const minutesPart = parts.find(p => p.type === "minute");
    
    timeCalculations.method1 = {
      success: !!(hoursPart && minutesPart),
      parts: parts,
      hoursPart: hoursPart ? { type: hoursPart.type, value: hoursPart.value } : null,
      minutesPart: minutesPart ? { type: minutesPart.type, value: minutesPart.value } : null,
      formatted: formatter1.format(now),
      result: hoursPart && minutesPart 
        ? `${hoursPart.value.padStart(2, "0")}:${minutesPart.value.padStart(2, "0")}`
        : null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push({ method: "method1_formatToParts", error: errorMsg });
    timeCalculations.method1 = {
      success: false,
      error: errorMsg,
    };
  }

  // Método 2: toLocaleString
  try {
    const lisbonString = now.toLocaleString("en-US", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    
    const match = lisbonString.match(/(\d{1,2}):(\d{2})/);
    timeCalculations.method2 = {
      success: !!match,
      lisbonString,
      match: match ? { hours: match[1], minutes: match[2] } : null,
      result: match ? `${match[1].padStart(2, "0")}:${match[2].padStart(2, "0")}` : null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push({ method: "method2_toLocaleString", error: errorMsg });
    timeCalculations.method2 = {
      success: false,
      error: errorMsg,
    };
  }

  // Método 3: Usar offset manual (UTC+0 ou UTC+1 dependendo do horário de verão)
  try {
    // Nota: Este método é aproximado e não considera horário de verão corretamente
    // Mas serve como fallback
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    
    // Lisboa está normalmente UTC+0 no inverno e UTC+1 no verão
    // Para simplificar, vamos usar UTC+1 (pode estar errado no inverno)
    const lisbonOffset = 1;
    let lisbonHours = utcHours + lisbonOffset;
    if (lisbonHours >= 24) lisbonHours -= 24;
    if (lisbonHours < 0) lisbonHours += 24;
    
    timeCalculations.method3 = {
      success: true,
      note: "Aproximado - não considera horário de verão",
      utcHours,
      utcMinutes,
      offset: lisbonOffset,
      result: `${lisbonHours.toString().padStart(2, "0")}:${utcMinutes.toString().padStart(2, "0")}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push({ method: "method3_manualOffset", error: errorMsg });
    timeCalculations.method3 = {
      success: false,
      error: errorMsg,
    };
  }

  // Determinar hora final (preferir método 1, depois 2, depois 3)
  let finalTime = "00:00";
  if (timeCalculations.method1?.result) {
    finalTime = timeCalculations.method1.result;
  } else if (timeCalculations.method2?.result) {
    finalTime = timeCalculations.method2.result;
  } else if (timeCalculations.method3?.result) {
    finalTime = timeCalculations.method3.result;
  }

  timeCalculations.final = finalTime;

  return NextResponse.json({
    success: errors.length === 0,
    timestamp,
    server: serverEnvironment,
    timeCalculations,
    errors: errors.length > 0 ? errors : undefined,
  });
}
