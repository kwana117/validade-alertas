"use client";

import { useActionState, useState } from "react";
import type { SettingsState } from "./types";
import { initialSettingsState } from "./types";

const OFFSET_OPTIONS = [30, 14, 7, 3, 1, 0] as const;

type Props = {
  initialOffsets: number[];
  initialIncludeExpired: boolean;
  initialExpiredMaxDays: number;
  action: (state: SettingsState, formData: FormData) => Promise<SettingsState>;
};

export function AlertSettingsForm({
  initialOffsets,
  initialIncludeExpired,
  initialExpiredMaxDays,
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
  const [clientError, setClientError] = useState<string | null>(null);

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
    </section>
  );
}
