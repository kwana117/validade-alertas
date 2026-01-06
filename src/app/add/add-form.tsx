"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import type { AddItemState } from "./types";
import { initialAddItemState } from "./types";
import { LOCATIONS } from "@/lib/items";

type Props = {
  action: (state: AddItemState, formData: FormData) => Promise<AddItemState>;
  defaultLocation: string;
};

export function AddItemForm({ action, defaultLocation }: Props) {
  const searchParams = useSearchParams();
  const presetLocation = searchParams.get("loc") ?? defaultLocation;

  const [state, formAction] = useActionState(action, initialAddItemState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await formAction(formData);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-slate-900 dark:text-slate-100">
          Nome do item
        </label>
        <input id="name" name="name" placeholder="Iogurte grego" required />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="expires_at"
          className="text-slate-900 dark:text-slate-100"
        >
          Data de validade
        </label>
        <input id="expires_at" name="expires_at" type="date" required />
      </div>

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
          defaultValue={presetLocation}
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

      <SubmitButton pending={isSubmitting}>Guardar item</SubmitButton>
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
