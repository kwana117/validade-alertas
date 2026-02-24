"use client";

import { useState } from "react";

type Result = {
  ok: boolean;
  error?: string;
};

type Props = {
  itemId: string;
};

export function TestItemButton({ itemId }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/telegram/test-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const data = (await response.json()) as Result;

      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Não foi possível enviar o teste.");
        return;
      }

      setStatus("success");
      setMessage("Teste enviado com sucesso.");
    } catch {
      setStatus("error");
      setMessage("Falha de rede ao enviar o teste.");
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        {status === "loading" ? "A enviar..." : "Enviar teste"}
      </button>
      {message ? (
        <p
          className={
            status === "error"
              ? "text-xs text-rose-600 dark:text-rose-300"
              : "text-xs text-emerald-600 dark:text-emerald-300"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
