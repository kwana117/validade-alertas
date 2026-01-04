import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Validade Alertas",
  description:
    "MVP para alertar a validade de alimentos com Supabase e Telegram.",
};

export const dynamic = "force-dynamic";

async function signOutAction() {
  "use server";
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="pt-PT">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
              <Link href="/" className="font-semibold text-slate-900">
                Validade Alertas
              </Link>
              {session ? (
                <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
                  <Link
                    href="/items"
                    className="rounded-md px-2 py-1 hover:bg-slate-100"
                  >
                    Os meus itens
                  </Link>
                  <Link
                    href="/add?loc=fridge"
                    className="rounded-md px-2 py-1 hover:bg-slate-100"
                  >
                    Adicionar
                  </Link>
                  <Link
                    href="/settings"
                    className="rounded-md px-2 py-1 hover:bg-slate-100"
                  >
                    Definições
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="rounded-md bg-slate-900 px-3 py-1 text-white hover:bg-slate-800"
                    >
                      Terminar sessão
                    </button>
                  </form>
                </nav>
              ) : null}
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
