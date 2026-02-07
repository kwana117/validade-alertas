"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { SettingsState } from "./types";
import { initialSettingsState } from "./types";

const OFFSET_OPTIONS = [30, 14, 7, 3, 1, 0] as const;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

type Props = {
  initialOffsets: number[];
  initialIncludeExpired: boolean;
  initialExpiredMaxDays: number;
  initialAlertTime: string;
  userId: string;
  action: (state: SettingsState, formData: FormData) => Promise<SettingsState>;
};

export function AlertSettingsForm({
  initialOffsets,
  initialIncludeExpired,
  initialExpiredMaxDays,
  initialAlertTime,
  userId,
  action,
}: Props) {
  const [state, formAction] = useActionState(action, initialSettingsState);
  const [selectedOffsets, setSelectedOffsets] = useState<number[]>(
    initialOffsets,
  );
  const [includeExpired, setIncludeExpired] = useState(
    initialIncludeExpired,
  );
  const [expiredMaxDays, setExpiredMaxDays] = useState(
    initialExpiredMaxDays,
  );
  const parseHour = (time: string) => {
    const [h] = time.split(":");
    const parsed = parseInt(h, 10);
    return Number.isNaN(parsed) ? 9 : parsed;
  };

  const parseMinute = (time: string) => {
    const [, m] = time.split(":");
    const parsed = parseInt(m, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const [alertHour, setAlertHour] = useState(() => parseHour(initialAlertTime));
  const [alertMinute, setAlertMinute] = useState(() => parseMinute(initialAlertTime));
  const lastInitialTimeRef = useRef(initialAlertTime);

  useEffect(() => {
    // Só atualizar se o initialAlertTime realmente mudou desde a última vez
    if (initialAlertTime !== lastInitialTimeRef.current) {
      const newHour = parseHour(initialAlertTime);
      const newMinute = parseMinute(initialAlertTime);
      setAlertHour(newHour);
      setAlertMinute(newMinute);
      lastInitialTimeRef.current = initialAlertTime;
    }
  }, [initialAlertTime]);

  const alertTime = `${alertHour.toString().padStart(2, "0")}:${alertMinute.toString().padStart(2, "0")}`;
  const [clientError, setClientError] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ success?: string; error?: string } | null>(null);
  const [checkTimeLoading, setCheckTimeLoading] = useState(false);
  const [checkTimeResult, setCheckTimeResult] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [activeDebugTab, setActiveDebugTab] = useState<string>("summary");

  function toggleOffset(value: number) {
    setSelectedOffsets((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function applyPreset(preset: "equilibrado" | "congelador" | "minimo") {
    if (preset === "equilibrado") {
      setSelectedOffsets([7, 3, 1, 0]);
      setIncludeExpired(true);
      setExpiredMaxDays(7);
      return;
    }

    if (preset === "congelador") {
      setSelectedOffsets([30, 14, 7, 0]);
      setIncludeExpired(false);
      return;
    }

    setSelectedOffsets([1, 0]);
    setIncludeExpired(true);
    setExpiredMaxDays(3);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (selectedOffsets.length === 0) {
      event.preventDefault();
      setClientError("Seleciona pelo menos um intervalo de alertas.");
      return;
    }
    setClientError(null);
  }

  async function handleTriggerNow() {
    setTriggerLoading(true);
    setTriggerResult(null);
    try {
      const response = await fetch(`/api/cron/send-alerts?force_user_id=${userId}`);
      const data = await response.json();
      
      // Se houver erro HTTP ou erro na resposta
      if (!response.ok || data.error) {
        const errorMsg = data.error || "Erro desconhecido";
        const hint = data.hint ? `\n\n💡 ${data.hint}` : '';
        const details = data.details ? `\n\nDetalhes: ${data.details}` : '';
        setTriggerResult({ error: `❌ ${errorMsg}${hint}${details}` });
        return;
      }
      
      if (data.sent > 0) {
        setTriggerResult({ success: `✅ Notificação enviada com sucesso! (${data.sent} mensagem)` });
      } else if (data.errors && data.errors.length > 0) {
        const errorDetails = data.errors.map((e: any) => e.message || e).join(", ");
        setTriggerResult({ error: `❌ Erro ao enviar: ${errorDetails}` });
      } else {
        const debugInfo = data.debug ? `\n\nDebug: Hora atual (Lisboa): ${data.debug.currentTimeFormatted || data.currentTime || "N/A"}` : '';
        setTriggerResult({ error: (data.message ?? "Nenhum item para notificar ou chat ID não configurado.") + debugInfo });
      }
    } catch (error) {
      setTriggerResult({ error: `❌ Erro ao comunicar com o servidor: ${error instanceof Error ? error.message : "Erro desconhecido"}` });
    } finally {
      setTriggerLoading(false);
    }
  }

  async function handleCheckTime() {
    setCheckTimeLoading(true);
    setCheckTimeResult(null);
    setDebugData(null);
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const url = `/api/cron/send-alerts`;
    
    let debugInfo: any = {
      timestamp,
      request: {
        url,
        method: "GET",
        environment: typeof window !== "undefined" ? window.location.hostname : "server",
        isLocalhost: typeof window !== "undefined" ? window.location.hostname === "localhost" : false,
      },
    };

    try {
      debugInfo.request.startTime = startTime;
      
      const response = await fetch(url);
      const responseTime = performance.now() - startTime;
      
      debugInfo.response = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        responseTime: `${responseTime.toFixed(2)}ms`,
      };

      // Tentar ler resposta como texto primeiro para capturar erros de parsing
      let responseText: string;
      try {
        responseText = await response.text();
        debugInfo.response.bodySize = `${responseText.length} bytes`;
      } catch (textError) {
        debugInfo.errors = debugInfo.errors || [];
        debugInfo.errors.push({
          stage: "reading_response_text",
          error: textError instanceof Error ? textError.message : String(textError),
        });
        throw new Error(`Erro ao ler resposta: ${textError instanceof Error ? textError.message : String(textError)}`);
      }

      // Tentar fazer parse do JSON
      let data: any;
      try {
        data = JSON.parse(responseText);
        debugInfo.response.parsed = true;
      } catch (parseError) {
        debugInfo.errors = debugInfo.errors || [];
        debugInfo.errors.push({
          stage: "parsing_json",
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        debugInfo.response.rawBody = responseText;
        throw new Error(`Erro ao fazer parse do JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}. Resposta raw: ${responseText.substring(0, 500)}`);
      }

      // Verificar se há erro na resposta
      if (!response.ok) {
        debugInfo.errors = debugInfo.errors || [];
        debugInfo.errors.push({
          stage: "http_error",
          status: response.status,
          statusText: response.statusText,
          error: data.error || "Erro HTTP",
        });
      }

      // Adicionar dados da resposta ao debug
      debugInfo.responseData = data;
      setDebugData(debugInfo);

      // Construir resultado formatado
      let result = `=== DEBUG COMPLETO ===\n`;
      result += `Timestamp: ${timestamp}\n\n`;
      
      result += `[1] REQUEST INFO\n`;
      result += `  URL: ${url}\n`;
      result += `  Method: GET\n`;
      result += `  Status: ${response.status} ${response.statusText}\n`;
      result += `  Response Time: ${responseTime.toFixed(2)}ms\n`;
      result += `  Environment: ${debugInfo.request.environment}\n`;
      result += `  Is Localhost: ${debugInfo.request.isLocalhost}\n\n`;

      if (data.debug?.serverEnvironment) {
        result += `[2] SERVER ENVIRONMENT\n`;
        const env = data.debug.serverEnvironment;
        result += `  Timezone: ${env.timezone || "N/A"}\n`;
        result += `  Locale: ${env.locale || "N/A"}\n`;
        result += `  Node Version: ${env.nodeVersion || "N/A"}\n`;
        result += `  Environment: ${env.environment || "N/A"}\n\n`;
      }

      result += `[3] TIME CALCULATION\n`;
      result += `  Hora atual (Lisboa): ${data.currentTime || data.debug?.currentTimeFormatted || "N/A"}\n`;
      if (data.debug) {
        result += `  Hora UTC: ${data.debug.utcTime || "N/A"}\n`;
        result += `  Hora Lisboa formatada: ${data.debug.lisbonTimeString || "N/A"}\n`;
        
        if (data.debug.timeCalculation) {
          const tc = data.debug.timeCalculation;
          if (tc.method1) {
            result += `  Método 1 (formatToParts): ${tc.hoursPart && tc.minutesPart ? "SUCCESS" : "FAILED"}\n`;
            if (tc.method1.parts) {
              result += `    - Parts: ${JSON.stringify(tc.method1.parts)}\n`;
            }
            result += `    - Hours: ${tc.method1.hoursPart?.value || "N/A"}\n`;
            result += `    - Minutes: ${tc.method1.minutesPart?.value || "N/A"}\n`;
            result += `    - Formatter result: ${tc.method1.formatterResult || "N/A"}\n`;
          }
          if (tc.method2) {
            result += `  Método 2 (toLocaleString): ${tc.method2.lisbonString ? "SUCCESS" : "FAILED"}\n`;
            result += `    - Result: "${tc.method2.lisbonString}"\n`;
          }
          if (tc.finalTime) {
            result += `  Final Time: ${tc.finalTime}\n`;
          }
          if (tc.fallback) {
            result += `  Fallback (hora local): ${tc.fallback}\n`;
          }
          if (tc.error) {
            result += `  ERRO: ${tc.error}\n`;
          }
        }
      }
      result += `\n`;

      if (data.debug?.queryDetails) {
        result += `[4] DATABASE QUERY\n`;
        const qd = data.debug.queryDetails;
        result += `  Query Type: ${qd.queryType || "N/A"}\n`;
        result += `  Profiles Found: ${qd.profilesFound || 0}\n`;
        if (qd.alertTimes) {
          result += `  Alert Times in DB: [${qd.alertTimes.join(", ")}]\n`;
        }
        if (qd.matches !== undefined) {
          result += `  Matches: ${qd.matches ? "true" : "false"}\n`;
        }
        result += `\n`;
      }

      if (data.debug?.allProfiles) {
        result += `[5] PROFILES IN DATABASE\n`;
        data.debug.allProfiles.forEach((p: any) => {
          result += `  - ${p.alertTime} ${p.matches ? "✓ CORRESPONDE" : "✗ não corresponde"}\n`;
        });
        result += `\n`;
      }

      result += `[6] RAW RESPONSE\n`;
      result += `${JSON.stringify(data, null, 2)}\n\n`;

      if (debugInfo.errors && debugInfo.errors.length > 0) {
        result += `[7] ERRORS\n`;
        debugInfo.errors.forEach((err: any, idx: number) => {
          result += `  Error ${idx + 1}: ${err.stage || "unknown"}\n`;
          result += `    - ${err.error || JSON.stringify(err)}\n`;
        });
      } else {
        result += `[7] ERRORS\n  None\n`;
      }

      result += `\n--- Mensagem ---\n${data.message || ""}`;
      setCheckTimeResult(result);
    } catch (error) {
      const responseTime = performance.now() - startTime;
      debugInfo.errors = debugInfo.errors || [];
      debugInfo.errors.push({
        stage: "exception",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      debugInfo.response = debugInfo.response || {};
      debugInfo.response.responseTime = `${responseTime.toFixed(2)}ms`;
      
      setDebugData(debugInfo);
      
      let errorResult = `=== ERRO NO DEBUG ===\n`;
      errorResult += `Timestamp: ${timestamp}\n\n`;
      errorResult += `[1] REQUEST INFO\n`;
      errorResult += `  URL: ${url}\n`;
      errorResult += `  Method: GET\n`;
      errorResult += `  Response Time: ${responseTime.toFixed(2)}ms\n\n`;
      errorResult += `[2] ERROR DETAILS\n`;
      errorResult += `  Type: ${error instanceof Error ? error.constructor.name : typeof error}\n`;
      errorResult += `  Message: ${error instanceof Error ? error.message : String(error)}\n`;
      if (error instanceof Error && error.stack) {
        errorResult += `  Stack:\n${error.stack.split("\n").map(line => `    ${line}`).join("\n")}\n`;
      }
      errorResult += `\n[3] DEBUG INFO\n`;
      errorResult += `${JSON.stringify(debugInfo, null, 2)}`;
      
      setCheckTimeResult(errorResult);
    } finally {
      setCheckTimeLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Alertas
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Define com quantos dias de antecedência queres receber alertas.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => applyPreset("equilibrado")}
          className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          Equilibrado
        </button>
        <button
          type="button"
          onClick={() => applyPreset("congelador")}
          className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          Congelador
        </button>
        <button
          type="button"
          onClick={() => applyPreset("minimo")}
          className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          Mínimo
        </button>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {OFFSET_OPTIONS.map((offset) => {
            const selected = selectedOffsets.includes(offset);
            const labelClasses = selected
              ? "border-slate-900 bg-slate-900 text-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100";
            const textClasses = selected
              ? "text-white dark:text-slate-50"
              : "text-slate-700 dark:text-slate-200";
            const iconClasses = selected
              ? "text-white dark:text-slate-50"
              : "text-slate-400 dark:text-slate-500";

            return (
              <label
                key={offset}
                className={`flex cursor-pointer items-center justify-between rounded-full border px-3 py-2 text-sm font-semibold transition ${labelClasses}`}
              >
                <span className={textClasses}>
                  {offset === 0 ? "Hoje" : `${offset}d`}
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 ${iconClasses}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {selected ? <path d="M20 6L9 17l-5-5" /> : null}
                </svg>
                <input
                  type="checkbox"
                  name="offsets"
                  value={offset}
                  checked={selected}
                  onChange={() => toggleOffset(offset)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Incluir itens expirados
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                name="include_expired"
                checked={includeExpired}
                onChange={(event) => setIncludeExpired(event.target.checked)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500 dark:bg-slate-700" />
              <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
            </label>
          </div>

          <input
            type="hidden"
            name="expired_max_days"
            value={expiredMaxDays}
          />
          <input
            type="hidden"
            name="alert_time"
            value={alertTime}
          />

          {includeExpired ? (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
              <label
                htmlFor="expired_max_days"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Dias máximos após expirar
              </label>
              <input
                id="expired_max_days"
                type="number"
                min={1}
                max={365}
                value={expiredMaxDays}
                onChange={(event) =>
                  setExpiredMaxDays(Number(event.target.value))
                }
                className="max-w-[160px]"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <label
            htmlFor="alert_hour"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Hora do alerta diário
          </label>
          <div className="flex items-center gap-2">
            <select
              id="alert_hour"
              value={alertHour}
              onChange={(event) => setAlertHour(Number(event.target.value))}
              className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {HOUR_OPTIONS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className="text-slate-500 dark:text-slate-400">:</span>
            <select
              id="alert_minute"
              value={alertMinute}
              onChange={(event) => setAlertMinute(Number(event.target.value))}
              className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {MINUTE_OPTIONS.map((minute) => (
                <option key={minute} value={minute}>
                  {minute.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hora de Lisboa (Portugal). Recebes uma notificação diária nesta hora se tiveres itens a expirar.
          </p>
        </div>

        {clientError ? (
          <p className="text-sm text-rose-600 dark:text-rose-300">
            {clientError}
          </p>
        ) : null}
        {state.error ? (
          <p className="text-sm text-rose-600 dark:text-rose-300">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-300">
            {state.success}
          </p>
        ) : null}

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Guardar alertas
        </button>
      </form>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Testar notificação automática
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Dispara uma notificação agora com os teus itens atuais, ignorando a hora configurada.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleTriggerNow}
            disabled={triggerLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700 sm:w-auto"
          >
            {triggerLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                A enviar...
              </>
            ) : (
              "Disparar notificação agora"
            )}
          </button>
          <button
            type="button"
            onClick={handleCheckTime}
            disabled={checkTimeLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700 sm:w-auto"
          >
            {checkTimeLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                A verificar...
              </>
            ) : (
              "Verificar hora"
            )}
          </button>
          <button
            type="button"
            onClick={async () => {
              setCheckTimeLoading(true);
              setCheckTimeResult(null);
              setDebugData(null);
              try {
                const response = await fetch(`/api/debug/time-check`);
                const data = await response.json();
                setDebugData({ responseData: data, timestamp: new Date().toISOString() });
                setCheckTimeResult(`=== DEBUG TIME CHECK ===\n${JSON.stringify(data, null, 2)}`);
              } catch (error) {
                setCheckTimeResult(`Erro: ${error instanceof Error ? error.message : String(error)}`);
              } finally {
                setCheckTimeLoading(false);
              }
            }}
            disabled={checkTimeLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700 sm:w-auto"
          >
            Debug Hora
          </button>
        </div>
        {triggerResult?.success ? (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">
            {triggerResult.success}
          </p>
        ) : null}
        {triggerResult?.error ? (
          <p className="mt-2 text-sm text-rose-600 dark:text-rose-300 whitespace-pre-line">
            {triggerResult.error}
          </p>
        ) : null}
        {checkTimeResult ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Debug - Verificação de Hora:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(checkTimeResult || "");
                  }}
                  className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Copiar
                </button>
                {debugData ? (
                  <button
                    type="button"
                    onClick={() => {
                      const json = JSON.stringify(debugData, null, 2);
                      const blob = new Blob([json], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `debug-${new Date().toISOString()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    Exportar JSON
                  </button>
                ) : null}
              </div>
            </div>
            
            {debugData ? (
              <div className="mb-2">
                <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
                  {["summary", "time", "database", "raw", "environment"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveDebugTab(tab)}
                      className={`px-3 py-1 text-xs font-medium transition ${
                        activeDebugTab === tab
                          ? "border-b-2 border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                      }`}
                    >
                      {tab === "summary" ? "Resumo" : 
                       tab === "time" ? "Cálculo Hora" :
                       tab === "database" ? "Base Dados" :
                       tab === "raw" ? "Raw" :
                       "Ambiente"}
                    </button>
                  ))}
                </div>
                
                <div className="mt-2">
                  {activeDebugTab === "summary" && (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold">Timestamp:</span> {debugData.timestamp}
                      </div>
                      <div>
                        <span className="font-semibold">Status:</span> {debugData.response?.status || "N/A"} {debugData.response?.statusText || ""}
                      </div>
                      <div>
                        <span className="font-semibold">Response Time:</span> {debugData.response?.responseTime || "N/A"}
                      </div>
                      {debugData.responseData?.currentTime && (
                        <div>
                          <span className="font-semibold">Hora atual (Lisboa):</span> {debugData.responseData.currentTime}
                        </div>
                      )}
                      {debugData.errors && debugData.errors.length > 0 && (
                        <div className="text-rose-600 dark:text-rose-400">
                          <span className="font-semibold">Erros:</span> {debugData.errors.length}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeDebugTab === "time" && debugData.responseData?.debug?.timeCalculation && (
                    <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                      {JSON.stringify(debugData.responseData.debug.timeCalculation, null, 2)}
                    </pre>
                  )}
                  
                  {activeDebugTab === "database" && (
                    <div className="space-y-2 text-xs">
                      {debugData.responseData?.debug?.allProfiles && (
                        <div>
                          <span className="font-semibold">Horas configuradas:</span>
                          <ul className="list-disc list-inside mt-1">
                            {debugData.responseData.debug.allProfiles.map((p: any, idx: number) => (
                              <li key={idx}>
                                {p.alertTime} {p.matches ? "✓" : "✗"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {debugData.responseData?.debug?.queryDetails && (
                        <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                          {JSON.stringify(debugData.responseData.debug.queryDetails, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                  
                  {activeDebugTab === "raw" && (
                    <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono max-h-96 overflow-auto">
                      {JSON.stringify(debugData.responseData || debugData, null, 2)}
                    </pre>
                  )}
                  
                  {activeDebugTab === "environment" && (
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-semibold">Client:</span>
                        <pre className="mt-1 p-2 bg-slate-50 dark:bg-slate-900 rounded">
                          {JSON.stringify(debugData.request, null, 2)}
                        </pre>
                      </div>
                      {debugData.responseData?.debug?.serverEnvironment && (
                        <div>
                          <span className="font-semibold">Server:</span>
                          <pre className="mt-1 p-2 bg-slate-50 dark:bg-slate-900 rounded">
                            {JSON.stringify(debugData.responseData.debug.serverEnvironment, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            
            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono max-h-96 overflow-auto">
              {checkTimeResult}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}
