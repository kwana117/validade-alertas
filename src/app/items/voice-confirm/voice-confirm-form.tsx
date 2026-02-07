"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationType } from "@/lib/frequent-items";
import { LOCATIONS, formatLocationLabel } from "@/lib/items";

const STORAGE_KEY = "voice-draft";

export type DraftItem = {
  id: string;
  name: string;
  location: LocationType;
  expires_at: string;
};

function capitalizeName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function VoiceConfirmForm() {
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        router.replace("/items");
        return;
      }
      const data = JSON.parse(raw) as { items?: DraftItem[]; transcript?: string };
      const list = Array.isArray(data.items) ? data.items : [];
      if (list.length === 0) {
        router.replace("/items");
        return;
      }
      setItems(list);
      setTranscript(typeof data.transcript === "string" ? data.transcript : null);
    } catch {
      router.replace("/items");
    }
  }, [mounted, router]);

  const handleUpdateItem = useCallback((id: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleCancel = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    router.replace("/items");
  }, [router]);

  const handleConfirm = useCallback(async () => {
    setError(null);
    if (items.length === 0) {
      setError("Não há itens para adicionar.");
      return;
    }
    const invalid = items.some((item) => !item.name.trim() || !item.expires_at);
    if (invalid) {
      setError("Preenche o nome e a data de todos os itens.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao adicionar itens");
      }
      sessionStorage.removeItem(STORAGE_KEY);
      router.replace("/items");
      router.refresh();
    } catch (err) {
      console.error("Erro ao adicionar itens:", err);
      setError(err instanceof Error ? err.message : "Erro ao adicionar itens");
    } finally {
      setIsSubmitting(false);
    }
  }, [items, router]);

  if (!mounted || items.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Confirma os itens
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Revê e ajusta antes de adicionar.
        </p>
      </div>

      {transcript && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <span className="block font-semibold text-slate-700 dark:text-slate-200">
            Transcrição
          </span>
          {transcript}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="grid min-w-0 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                onBlur={(e) =>
                  handleUpdateItem(item.id, { name: capitalizeName(e.target.value) })
                }
                placeholder="Nome do produto"
                className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <select
                value={item.location}
                onChange={(e) =>
                  handleUpdateItem(item.id, { location: e.target.value as LocationType })
                }
                className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 sm:min-w-[8rem]"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {formatLocationLabel(loc.value)}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={item.expires_at}
                onChange={(e) => handleUpdateItem(item.id, { expires_at: e.target.value })}
                className="min-w-0 max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 [&::-webkit-date-and-time-value]:min-w-0"
              />
              <button
                type="button"
                onClick={() => handleRemoveItem(item.id)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={items.length === 0 || isSubmitting}
          className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {isSubmitting ? "A adicionar…" : `Adicionar ${items.length} itens`}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
