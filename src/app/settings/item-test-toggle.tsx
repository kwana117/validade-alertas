"use client";

import { useActionState, useRef } from "react";
import type { SettingsState } from "./types";
import { initialSettingsState } from "./types";

type Props = {
  enabled: boolean;
  action: (state: SettingsState, formData: FormData) => Promise<SettingsState>;
};

export function ItemTestToggle({ enabled, action }: Props) {
  const [state, formAction] = useActionState(action, initialSettingsState);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Ativar botões de teste por item (provisório)
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Mostra um botão "Enviar teste" em cada item para simular a mensagem de alerta.
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            name="enable_item_test_button"
            defaultChecked={enabled}
            onChange={() => formRef.current?.requestSubmit()}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500 dark:bg-slate-700" />
          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
        </label>
      </div>
      {state.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-300">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-300">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
