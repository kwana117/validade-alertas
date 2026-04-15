import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./globals.css";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Validade Alertas",
  description:
    "MVP para alertar a validade de alimentos com Supabase e Telegram.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = "force-dynamic";

async function signOutAction() {
  "use server";
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="pt-PT">
      <body className="antialiased bg-slate-50 text-slate-900 font-sans dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <div className="min-h-screen">
            <SiteHeader
              hasSession={Boolean(session)}
              signOutAction={signOutAction}
            />
            <main className="mx-auto max-w-5xl px-4 py-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
