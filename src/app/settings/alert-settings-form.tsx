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
      if (data.sent > 0) {
        setTriggerResult({ success: `Notificação enviada com sucesso! (${data.sent} mensagem)` });
      } else if (data.errors && data.errors.length > 0) {
        setTriggerResult({ error: `Erro ao enviar: ${data.errors[0]?.message ?? "Erro desconhecido"}` });
      } else {
        const debugInfo = data.debug ? `\n\nDebug: Hora atual (Lisboa): ${data.debug.currentTimeFormatted || data.currentTime}` : '';
        setTriggerResult({ error: (data.message ?? "Nenhum item para notificar ou chat ID não configurado.") + debugInfo });
      }
    } catch {
      setTriggerResult({ error: "Erro ao comunicar com o servidor." });
    } finally {
      setTriggerLoading(false);
    }
  }

  async function handleCheckTime() {
    setCheckTimeLoading(true);
    setCheckTimeResult(null);
    try {
      const response = await fetch(`/api/cron/send-alerts`);
      const data = await response.json();
      let result = `Hora atual (Lisboa): ${data.currentTime || data.debug?.currentTimeFormatted || "N/A"}\n`;
      if (data.debug) {
        result += `Hora UTC: ${data.debug.utcTime || "N/A"}\n`;
        result += `Hora Lisboa formatada: ${data.debug.lisbonTimeString || "N/A"}\n`;
        
        // Debug detalhado do cálculo da hora
        if (data.debug.timeCalculation) {
          result += `\n--- Debug Cálculo da Hora ---\n`;
          const tc = data.debug.timeCalculation;
          if (tc.method1) {
            result += `Método 1 (formatToParts):\n`;
            result += `  - Parts: ${JSON.stringify(tc.method1.parts)}\n`;
            result += `  - Hours: ${tc.method1.hoursPart?.value || "N/A"}\n`;
            result += `  - Minutes: ${tc.method1.minutesPart?.value || "N/A"}\n`;
            result += `  - Formatter result: ${tc.method1.formatterResult}\n`;
          }
          if (tc.method2) {
            result += `Método 2 (toLocaleString): ${tc.method2.lisbonString}\n`;
          }
          if (tc.finalTime) {
            result += `Hora final calculada: ${tc.finalTime}\n`;
          }
          if (tc.fallback) {
            result += `Fallback (hora local): ${tc.fallback}\n`;
          }
          if (tc.error) {
            result += `ERRO: ${tc.error}\n`;
          }
        }
        
        if (data.debug.allProfiles) {
          result += `\n--- Horas Configuradas na BD ---\n`;
          data.debug.allProfiles.forEach((p: any) => {
            result += `- ${p.alertTime} ${p.matches ? "✓ CORRESPONDE" : "✗ não corresponde"}\n`;
          });
        }
        if (data.debug.comparison) {
          result += `\n--- Comparações ---\n${data.debug.comparison.join("\n")}\n`;
        }
      }
      result += `\n--- Mensagem ---\n${data.message || ""}`;
      setCheckTimeResult(result);
    } catch (error) {
      setCheckTimeResult(`Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}\n\nStack: ${error instanceof Error ? error.stack : ""}`);
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
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleTriggerNow}
            disabled={triggerLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
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
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-700"
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
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Debug - Verificação de Hora:</p>
            <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
              {checkTimeResult}
            </pre>
          </div>
        ) : null}
      </div>
    </section>
  );
}
