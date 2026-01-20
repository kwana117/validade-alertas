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
      {/* Mode Toggle */}
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="validity_mode"
            checked={mode === "duration"}
            onChange={() => onModeChange("duration")}
            className="h-4 w-4 text-slate-900 focus:ring-slate-500 dark:text-slate-100"
          />
          <span className="text-slate-900 dark:text-slate-100">
            Dura X dias
          </span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="validity_mode"
            checked={mode === "date"}
            onChange={() => onModeChange("date")}
            className="h-4 w-4 text-slate-900 focus:ring-slate-500 dark:text-slate-100"
          />
          <span className="text-slate-900 dark:text-slate-100">
            Data específica
          </span>
        </label>
      </div>

      {/* Duration Input */}
      {mode === "duration" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
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
              className="w-20"
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
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  durationDays === days
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Preview */}
          {calculatedDate && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Expira a:{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatExpiryDate(calculatedDate)}
              </span>
            </p>
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
