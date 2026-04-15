"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type Props = {
  itemId: string;
  action: (formData: FormData) => Promise<void>;
};

export function DeleteItemForm({ itemId, action }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Tens a certeza que queres apagar este item?")) {
      event.preventDefault();
      return;
    }
    setIsSubmitting(true);
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        title="Apagar definitivamente"
        aria-label="Apagar definitivamente"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 text-rose-700 transition hover:border-rose-400 hover:text-rose-900 dark:border-rose-400/50 dark:text-rose-200 dark:hover:border-rose-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-100"
        disabled={isSubmitting}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M6 6l1 14h10l1-14" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
        <span className="sr-only">{isSubmitting ? "A apagar..." : "Apagar definitivamente"}</span>
      </button>
    </form>
  );
}
