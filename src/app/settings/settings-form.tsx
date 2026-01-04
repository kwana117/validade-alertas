"use client";

import { useActionState, useState } from "react";
import type { SettingsState } from "./types";
import { initialSettingsState } from "./types";

type Props = {
  action: (
    state: SettingsState,
    formData: FormData,
  ) => Promise<SettingsState>;
  chatId: string | null;
};

export function SettingsForm({ action, chatId }: Props) {
  const [state, formAction] = useActionState(action, initialSettingsState);
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
        <label htmlFor="telegram_chat_id">Chat ID do Telegram</label>
        <input
          id="telegram_chat_id"
          name="telegram_chat_id"
          placeholder="Ex: 123456789"
          defaultValue={chatId ?? ""}
        />
        <p className="text-sm text-slate-500">
          Abre o bot e escreve qualquer coisa para poderes copiar o chat ID.
        </p>
      </div>

      {state.error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
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
      className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
    >
      {pending ? "A guardar..." : children}
    </button>
  );
}
