"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

type Result = {
  ok: boolean;
  error?: string;
};

export function TestTelegramButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/telegram/test", {
        method: "POST",
      });
      const data = (await response.json()) as Result;

      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Nao foi possivel enviar a mensagem.");
        return;
      }

      setStatus("success");
      setMessage("Mensagem enviada com sucesso.");
    } catch (error) {
      setStatus("error");
      setMessage("Falha de rede ao testar o Telegram.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {status === "loading" ? "A testar..." : "Testar ligacao Telegram"}
      </button>
      {message ? (
        <p
          className={
            status === "error"
              ? "text-sm text-rose-600 dark:text-rose-300"
              : "text-sm text-emerald-600 dark:text-emerald-300"
          }
        >
          {message}
        </p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Envia uma mensagem para o chat ID guardado no perfil.
        </p>
      )}
    </div>
  );
}
