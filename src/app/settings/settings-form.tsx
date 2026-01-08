"use client";

import { useActionState, useEffect, useState } from "react";
import type { SettingsState } from "./types";
import { initialSettingsState } from "./types";

type Props = {
  action: (
    state: SettingsState,
    formData: FormData,
  ) => Promise<SettingsState>;
  initialTelegramChatId: string | null;
};

export function SettingsForm({ action, initialTelegramChatId }: Props) {
  const [state, formAction] = useActionState(action, initialSettingsState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialValue = initialTelegramChatId ?? "";
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const next = initialTelegramChatId ?? "";
    setValue(next);
  }, [initialTelegramChatId]);

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
        <label
          htmlFor="telegram_chat_id"
          className="text-slate-900 dark:text-slate-100"
        >
          Chat ID do Telegram
        </label>
        <input
          key={initialTelegramChatId ?? "empty"}
          id="telegram_chat_id"
          name="telegram_chat_id"
          type="text"
          placeholder="Ex: 123456789"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-600"
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Abre o bot e escreve qualquer coisa para poderes copiar o chat ID.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          {state.success}
        </p>
      ) : null}

      <SubmitButton pending={isSubmitting}>Guardar</SubmitButton>
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
