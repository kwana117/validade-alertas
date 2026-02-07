import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { VoiceConfirmForm } from "./voice-confirm-form";

export const dynamic = "force-dynamic";

export default async function VoiceConfirmPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <Link
          href="/items"
          className="text-sm text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Voltar aos itens
        </Link>
      </div>
      <main className="pt-6">
        <VoiceConfirmForm />
      </main>
    </div>
  );
}
