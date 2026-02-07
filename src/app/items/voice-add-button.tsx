"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationType } from "@/lib/frequent-items";
import { LOCATIONS, formatLocationLabel } from "@/lib/items";

const MAX_RECORDING_MS = 90_000;

type DraftItem = {
  id: string;
  name: string;
  location: LocationType;
  expires_at: string;
};

type ExtractedItem = {
  name?: string | null;
  location?: string | null;
  expires_at?: string | null;
};

function capitalizeName(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  return supported ?? "";
}

export function VoiceAddButton() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [recordingMs, setRecordingMs] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const recordingSeconds = Math.floor(recordingMs / 1000);
  const recordingLabel = `${Math.floor(recordingSeconds / 60)}:${String(
    recordingSeconds % 60,
  ).padStart(2, "0")}`;

  const hasMediaSupport = useMemo(() => {
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  const resetAll = useCallback(() => {
    setIsRecording(false);
    setIsProcessing(false);
    setShowConfirm(false);
    setItems([]);
    setError(null);
    setRecordingMs(0);
    setTranscript(null);
  }, []);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!hasMediaSupport) {
      setError("O teu browser não suporta gravação de áudio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      setRecordingMs(0);
      setIsRecording(true);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        clearTimer();
        setIsRecording(false);
        stopStream();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        await processAudio(blob);
      });

      recorder.start();

      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setRecordingMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) {
          stopRecording();
        }
      }, 250);
    } catch (err) {
      console.error("Erro ao iniciar gravação:", err);
      setError("Não foi possível aceder ao microfone.");
      stopStream();
    }
  }, [clearTimer, hasMediaSupport, stopRecording, stopStream]);

  const processAudio = useCallback(async (blob: Blob) => {
    setIsProcessing(true);
    setError(null);
    setTranscript(null);

    try {
      const file = new File([blob], "voice-note.webm", { type: blob.type || "audio/webm" });
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/items/voice", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar áudio");
      }

      const extracted: ExtractedItem[] = Array.isArray(data.items) ? data.items : [];
      const draftItems = extracted.map((item) => ({
        id: makeId(),
        name: capitalizeName((item.name ?? "").toString()),
        location: (item.location as LocationType) ?? "fridge",
        expires_at: (item.expires_at ?? "").toString(),
      }));

      setTranscript(typeof data.transcript === "string" ? data.transcript : null);
      setItems(draftItems);
      setShowConfirm(true);
    } catch (err) {
      console.error("Erro ao processar áudio:", err);
      setError(err instanceof Error ? err.message : "Erro ao processar áudio");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleUpdateItem = useCallback(
    (id: string, patch: Partial<DraftItem>) => {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [],
  );

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleConfirm = useCallback(async () => {
    setError(null);
    if (items.length === 0) {
      setError("Não há itens para adicionar.");
      return;
    }

    const invalid = items.some((item) => !item.name.trim() || !item.expires_at);
    if (invalid) {
      setError("Preenche o nome e a data de todos os itens.");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao adicionar itens");
      }

      resetAll();
      router.refresh();
    } catch (err) {
      console.error("Erro ao adicionar itens:", err);
      setError(err instanceof Error ? err.message : "Erro ao adicionar itens");
    } finally {
      setIsProcessing(false);
    }
  }, [items, resetAll, router]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
    };
  }, [clearTimer, stopStream]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isRecording && !isProcessing) {
            startRecording();
          }
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        aria-label="Gravar item por voz"
        disabled={isRecording || isProcessing}
      >
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1.75a3.25 3.25 0 0 0-3.25 3.25v7a3.25 3.25 0 0 0 6.5 0V5A3.25 3.25 0 0 0 12 1.75Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.5v1.25a6 6 0 1 0 12 0V10.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.75v2.5" />
        </svg>
      </button>

      {(isRecording || isProcessing || showConfirm || !!error) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-6">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            {isRecording && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    A gravar…
                  </h2>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                    {recordingLabel}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Diz apenas: nome do produto, local de guardar e data de validade.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={stopRecording}
                    aria-label="Terminar gravação"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition hover:bg-emerald-500"
                  >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={resetAll}
                    aria-label="Cancelar gravação"
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {isProcessing && !isRecording && (
              <div className="space-y-3 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  A processar áudio…
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Estamos a transcrever e extrair os itens.
                </p>
              </div>
            )}

            {showConfirm && !isRecording && !isProcessing && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Confirma os itens
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Revê e ajusta antes de adicionar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Fechar
                  </button>
                </div>

                {transcript && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <span className="block font-semibold text-slate-700 dark:text-slate-200">Transcrição</span>
                    {transcript}
                  </div>
                )}

                {items.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Não conseguimos extrair itens. Tenta gravar novamente.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="grid gap-3 md:grid-cols-[1.3fr_0.8fr_0.8fr_auto]">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                            onBlur={(e) =>
                              handleUpdateItem(item.id, { name: capitalizeName(e.target.value) })
                            }
                            placeholder="Nome do produto"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <select
                            value={item.location}
                            onChange={(e) =>
                              handleUpdateItem(item.id, { location: e.target.value as LocationType })
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {LOCATIONS.map((loc) => (
                              <option key={loc.value} value={loc.value}>
                                {formatLocationLabel(loc.value)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={item.expires_at}
                            onChange={(e) => handleUpdateItem(item.id, { expires_at: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {error && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    disabled={items.length === 0}
                  >
                    Adicionar {items.length} itens
                  </button>
                  <button
                    type="button"
                    onClick={resetAll}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {!isRecording && !isProcessing && !showConfirm && error && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Não foi possível gravar
                </h2>
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
