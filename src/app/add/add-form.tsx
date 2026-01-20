"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState, useCallback } from "react";
import type { AddItemState } from "./types";
import { initialAddItemState } from "./types";
import { LOCATIONS } from "@/lib/items";
import { ProductAutocomplete } from "./product-autocomplete";
import { ValidityInput } from "./validity-input";
import type { InputMode, LocationType, ProductSuggestion } from "@/lib/frequent-items";
import { getTodayForInput } from "@/lib/date-utils";

type Props = {
  action: (state: AddItemState, formData: FormData) => Promise<AddItemState>;
  defaultLocation: string;
};

export function AddItemForm({ action, defaultLocation }: Props) {
  const searchParams = useSearchParams();
  const presetLocation = (searchParams.get("loc") ?? defaultLocation) as LocationType;

  const [state, formAction] = useActionState(action, initialAddItemState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for product name and autocomplete
  const [productName, setProductName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationType>(presetLocation);

  // New state for validity input
  const [inputMode, setInputMode] = useState<InputMode>("date");
  const [durationDays, setDurationDays] = useState(3);
  const [specificDate, setSpecificDate] = useState(getTodayForInput());

  const handleProductSelect = useCallback((suggestion: ProductSuggestion) => {
    setProductName(suggestion.name);
    setInputMode(suggestion.input_mode);
    if (suggestion.input_mode === "duration" && suggestion.default_duration_days) {
      setDurationDays(suggestion.default_duration_days);
    }
  }, []);

  const handleLocationChange = useCallback((loc: LocationType) => {
    setSelectedLocation(loc);
  }, []);

  async function trackUsage(name: string) {
    try {
      await fetch("/api/frequent-items/track-usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch (err) {
      // Silently fail tracking
      console.error("Error tracking usage:", err);
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      const name = formData.get("name")?.toString().trim();
      if (name) {
        // Track usage in the background
        trackUsage(name);
      }
      await formAction(formData);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Quick location buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Localização rápida
        </label>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map((loc) => (
            <button
              key={loc.value}
              type="button"
              onClick={() => handleLocationChange(loc.value as LocationType)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                selectedLocation === loc.value
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {loc.value === "fridge" && "🧊 "}
              {loc.value === "freezer" && "❄️ "}
              {loc.value === "pantry" && "🏠 "}
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-slate-200 dark:border-slate-700" />

      {/* Product name with autocomplete */}
      <div className="space-y-2">
        <label htmlFor="name" className="text-slate-900 dark:text-slate-100">
          Nome do produto
        </label>
        <ProductAutocomplete
          value={productName}
          onChange={setProductName}
          onSelect={handleProductSelect}
          location={selectedLocation}
        />
      </div>

      <hr className="border-slate-200 dark:border-slate-700" />

      {/* Validity input with mode toggle */}
      <div className="space-y-2">
        <label className="text-slate-900 dark:text-slate-100">Validade</label>
        <ValidityInput
          mode={inputMode}
          onModeChange={setInputMode}
          durationDays={durationDays}
          onDurationChange={setDurationDays}
          specificDate={specificDate}
          onDateChange={setSpecificDate}
        />
      </div>

      <hr className="border-slate-200 dark:border-slate-700" />

      {/* Location dropdown (hidden but synced with quick buttons) */}
      <div className="space-y-2">
        <label
          htmlFor="location"
          className="text-slate-900 dark:text-slate-100"
        >
          Local
        </label>
        <select
          id="location"
          name="location"
          value={selectedLocation}
          onChange={(e) => handleLocationChange(e.target.value as LocationType)}
          required
        >
          {LOCATIONS.map((location) => (
            <option key={location.value} value={location.value}>
              {location.label}
            </option>
          ))}
        </select>
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pending={isSubmitting}>Adicionar item</SubmitButton>
    </form>
  );
}

function SubmitButton({
  children,
  pending,
}: {
  children: React.ReactNode;
  pending: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {pending ? "A guardar..." : children}
    </button>
  );
}
