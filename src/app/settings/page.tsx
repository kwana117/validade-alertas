import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SettingsState } from "./types";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

async function updateTelegramAction(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  "use server";

  const rawValue = formData.get("telegram_chat_id")?.toString().trim();
  const telegramChatId = rawValue ? rawValue : null;

  if (telegramChatId && !/^-?\d+$/.test(telegramChatId)) {
    return {
      error: "O chat ID deve ser numérico. Abre o Telegram e copia o valor correto.",
    };
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      telegram_chat_id: telegramChatId,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { error: "Não foi possível guardar o chat ID." };
  }

  revalidatePath("/settings");
  return { success: "Chat ID atualizado com sucesso." };
}

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <Link href="/items" className="text-sm text-slate-500 underline">
          ← Voltar aos itens
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">
          Definições
        </h1>
        <p className="text-sm text-slate-600">
          Gere o teu chat ID do Telegram e confirma o email da conta.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Conta
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {user.email}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Este endereço é usado para iniciar sessão e recuperar a palavra-passe.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Telegram
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            Guardar chat ID
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sem o chat ID não é possível enviar os alertas diários.
          </p>
          <div className="mt-4">
            <SettingsForm
              action={updateTelegramAction}
              chatId={profile?.telegram_chat_id ?? null}
            />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Como obter o chat ID?
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>
            No Telegram, fala com{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-900 underline"
            >
              @userinfobot
            </a>{" "}
            e carrega em <strong>Start</strong>.
          </li>
          <li>O bot devolve o chat ID. Copia o número.</li>
          <li>
            Cola o número no campo acima e guarda. Faz isto apenas uma vez por
            conta.
          </li>
        </ol>
      </section>
    </div>
  );
}
