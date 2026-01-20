"use client";

import type { FrequentItem } from "@/lib/frequent-items";
import { INPUT_MODE_LABELS } from "@/lib/frequent-items";
import { LOCATION_LABELS } from "@/lib/items";

interface Props {
  item: FrequentItem;
  onEdit: (item: FrequentItem) => void;
  onDelete: (item: FrequentItem) => void;
}

export function FrequentItemCard({ item, onEdit, onDelete }: Props) {
  const locationLabels = item.allowed_locations
    .map((loc) => LOCATION_LABELS[loc])
    .join(", ");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {item.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Modo:{" "}
            <span className="font-medium">
              {INPUT_MODE_LABELS[item.input_mode]}
            </span>
            {item.input_mode === "duration" && item.default_duration_days && (
              <span> | {item.default_duration_days} dias</span>
            )}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Locais: <span className="font-medium">{locationLabels}</span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Usado {item.usage_count}{" "}
            {item.usage_count === 1 ? "vez" : "vezes"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/50 dark:bg-slate-700 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
