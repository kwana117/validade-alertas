"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AuthFormState } from "@/lib/auth";
import { initialAuthState } from "@/lib/auth";

type Props = {
  action: (
    state: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
};

export function UpdatePasswordForm({ action }: Props) {
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

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          Palavra-passe atualizada com sucesso.
        </p>
        <Link
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          href="/login"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-slate-900 dark:text-slate-100"
        >
          Nova palavra-passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Mínimo 6 caracteres"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="text-slate-900 dark:text-slate-100"
        >
          Confirmar palavra-passe
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Repete a nova palavra-passe"
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
      >
        {isSubmitting ? "A atualizar..." : "Atualizar palavra-passe"}
      </button>
    </form>
  );
}
