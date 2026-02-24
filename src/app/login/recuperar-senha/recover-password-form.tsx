"use client";

import { useActionState, useState } from "react";
import type { AuthFormState } from "@/lib/auth";
import { initialAuthState } from "@/lib/auth";

type Props = {
  action: (
    state: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
};

export function RecoverPasswordForm({ action }: Props) {
  const [state, formAction] = useActionState(action, initialAuthState);
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
        <label htmlFor="email" className="text-slate-900 dark:text-slate-100">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="joana@email.com"
          required
          autoComplete="email"
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          Se existir conta para este email, enviámos um link de recuperação.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {isSubmitting ? "A enviar..." : "Enviar link de recuperação"}
      </button>
    </form>
  );
}
