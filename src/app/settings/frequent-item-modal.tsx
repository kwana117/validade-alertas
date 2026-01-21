"use client";

import { useState, useEffect } from "react";
import type { FrequentItem, FrequentItemInput, InputMode, LocationType } from "@/lib/frequent-items";
import { LOCATIONS, formatLocationLabel } from "@/lib/items";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FrequentItemInput) => Promise<void>;
  editingItem: FrequentItem | null;
}

export function FrequentItemModal({ isOpen, onClose, onSave, editingItem }: Props) {
  const [name, setName] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("date");
  const [durationDays, setDurationDays] = useState(3);
  const [allowedLocations, setAllowedLocations] = useState<LocationType[]>(["fridge", "freezer", "pantry"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setInputMode(editingItem.input_mode);
      setDurationDays(editingItem.default_duration_days ?? 3);
      setAllowedLocations(editingItem.allowed_locations);
    } else {
      setName("");
      setInputMode("date");
      setDurationDays(3);
      setAllowedLocations(["fridge", "freezer", "pantry"]);
    }
    setError(null);
  }, [editingItem, isOpen]);

  const handleLocationToggle = (loc: LocationType) => {
    setAllowedLocations((prev) => {
      if (prev.includes(loc)) {
        if (prev.length === 1) return prev;
        return prev.filter((l) => l !== loc);
      }
      return [...prev, loc];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("O nome é obrigatório");
      return;
    }

    if (allowedLocations.length === 0) {
      setError("Seleciona pelo menos uma localização");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        input_mode: inputMode,
        default_duration_days: inputMode === "duration" ? durationDays : null,
        allowed_locations: allowedLocations,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {editingItem ? "Editar Produto" : "Novo Produto Frequente"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="freq-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Nome
            </label>
            <input
              id="freq-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Sopa caseira"
              required
            />
          </div>

          {/* Input Mode - Segmented Control */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Modo de validade
            </label>
            <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setInputMode("duration")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  inputMode === "duration"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Dura X dias
              </button>
              <button
                type="button"
                onClick={() => setInputMode("date")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  inputMode === "date"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Data específica
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {inputMode === "duration"
                ? "Para produtos caseiros com validade previsível"
                : "Para produtos comprados com data na embalagem"}
            </p>
          </div>

          {/* Duration Days (only for duration mode) */}
          {inputMode === "duration" && (
            <div className="space-y-2">
              <label htmlFor="freq-duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Duração padrão
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="freq-duration"
                  type="number"
                  min="1"
                  max="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                  className="w-24 text-center"
                />
                <span className="text-slate-700 dark:text-slate-300">dias</span>
              </div>
            </div>
          )}

          {/* Allowed Locations */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Localizações permitidas
            </label>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((loc) => {
                const isSelected = allowedLocations.includes(loc.value as LocationType);
                return (
                  <button
                    key={loc.value}
                    type="button"
                    onClick={() => handleLocationToggle(loc.value as LocationType)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500"
                    }`}
                  >
                    {formatLocationLabel(loc.value)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {isSubmitting ? "A guardar..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
