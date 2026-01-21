"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  itemId: string;
  name: string;
  action: (formData: FormData) => Promise<void>;
};

export function EditItemName({ itemId, name, action }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setValue(name);
  }, [name]);

  useEffect(() => {
    if (!isEditing) return;

    function handleClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setValue(name);
        setIsEditing(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isEditing, name]);

  return (
    <div ref={containerRef}>
      {!isEditing ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-left"
          aria-label={`Editar nome: ${name}`}
        >
          <span className="text-lg font-semibold text-slate-900 hover:underline dark:text-slate-100">
            {name}
          </span>
        </button>
      ) : (
        <form
          action={action}
          className="flex items-center gap-2"
          onSubmit={() => setIsEditing(false)}
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input
            name="name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-w-0 flex-1"
            autoFocus
          />
          <button
            type="submit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-400 dark:hover:text-emerald-300"
            aria-label="Guardar nome"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(name);
              setIsEditing(false);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-rose-400 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-rose-400 dark:hover:text-rose-300"
            aria-label="Cancelar edição"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
}
