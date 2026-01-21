"use client";

import { useMemo } from "react";
import type { InputMode } from "@/lib/frequent-items";
import { DURATION_PRESETS } from "@/lib/frequent-items";
import {
  calculateExpiryDate,
  formatExpiryDate,
  getTodayForInput,
  getMaxDateForInput,
} from "@/lib/date-utils";

interface Props {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  durationDays: number;
  onDurationChange: (days: number) => void;
  specificDate: string;
  onDateChange: (date: string) => void;
}

export function ValidityInput({
  mode,
  onModeChange,
  durationDays,
  onDurationChange,
  specificDate,
  onDateChange,
}: Props) {
  const calculatedDate = useMemo(() => {
    if (mode === "duration" && durationDays > 0) {
      return calculateExpiryDate(durationDays);
    }
    return null;
  }, [mode, durationDays]);

  const today = getTodayForInput();
  const maxDate = getMaxDateForInput();

  return (
    <div className="space-y-4">
      {/* Segmented Control Toggle */}
      <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => onModeChange("duration")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            mode === "duration"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Dura X dias
        </button>
        <button
          type="button"
          onClick={() => onModeChange("date")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
            mode === "date"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Data específica
        </button>
      </div>

      {/* Duration Input */}
      {mode === "duration" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="365"
              value={durationDays}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val > 0) {
                  onDurationChange(val);
                }
              }}
              className="w-24 text-center"
            />
            <span className="text-slate-700 dark:text-slate-300">dias</span>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map(({ days, label }) => (
              <button
                key={days}
                type="button"
                onClick={() => onDurationChange(days)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  durationDays === days
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Preview */}
          {calculatedDate && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                Expira a{" "}
                <span className="font-semibold">
                  {formatExpiryDate(calculatedDate)}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Date Input */}
      {mode === "date" && (
        <input
          type="date"
          id="expires_at_date"
          value={specificDate}
          onChange={(e) => onDateChange(e.target.value)}
          min={today}
          max={maxDate}
          required={mode === "date"}
          className="w-full min-w-0 max-w-full"
        />
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="expires_at"
        value={
          mode === "duration" && calculatedDate
            ? calculatedDate.toISOString().split("T")[0]
            : specificDate
        }
      />
    </div>
  );
}
