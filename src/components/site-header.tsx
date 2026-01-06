"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  hasSession: boolean;
  signOutAction: (formData: FormData) => Promise<void>;
};

export function SiteHeader({ hasSession, signOutAction }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="font-semibold text-slate-900 dark:text-slate-100"
        >
          Validade Alertas
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {hasSession ? (
            <>
              <nav className="hidden items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-200 md:flex">
                <Link
                  href="/items"
                  className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Os meus itens
                </Link>
                <Link
                  href="/add?loc=fridge"
                  className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Adicionar
                </Link>
                <Link
                  href="/settings"
                  className="rounded-md px-2 py-1 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  Definições
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-1 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Terminar sessão
                  </button>
                </form>
              </nav>
              <div className="relative md:hidden" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label="Abrir menu"
                  aria-expanded={menuOpen}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M3 12h18" />
                    <path d="M3 18h18" />
                  </svg>
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <Link
                        href="/items"
                        className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Os meus itens
                      </Link>
                      <Link
                        href="/add?loc=fridge"
                        className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Adicionar
                      </Link>
                      <Link
                        href="/settings"
                        className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Definições
                      </Link>
                      <form action={signOutAction} onSubmit={() => setMenuOpen(false)}>
                        <button
                          type="submit"
                          className="mt-2 w-full rounded-md bg-slate-900 px-3 py-2 text-left text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        >
                          Terminar sessão
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
