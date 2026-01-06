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

export function SignupForm({ action }: Props) {
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

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-slate-900 dark:text-slate-100"
        >
          Palavra-passe
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
          placeholder="Repete a palavra-passe"
          required
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pending={isSubmitting}>Criar conta</SubmitButton>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Já tens conta?{" "}
        <Link
          className="font-semibold text-slate-900 underline dark:text-slate-100"
          href="/login"
        >
          Entrar
        </Link>
        .
      </p>
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
      className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {pending ? "A criar..." : children}
    </button>
  );
}
