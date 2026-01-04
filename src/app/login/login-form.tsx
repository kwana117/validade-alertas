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

export function LoginForm({ action }: Props) {
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
        <label htmlFor="email">Email</label>
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
        <label htmlFor="password">Palavra-passe</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <SubmitButton pending={isSubmitting}>Entrar</SubmitButton>

      <p className="text-sm text-slate-600">
        Ainda não tens conta?{" "}
        <Link
          className="font-semibold text-slate-900 underline"
          href="/signup"
        >
          Criar conta
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
      className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800 disabled:opacity-70"
    >
      {pending ? "A entrar..." : children}
    </button>
  );
}
