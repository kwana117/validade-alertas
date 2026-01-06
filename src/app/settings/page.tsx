import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SettingsState } from "./types";
import { SettingsForm } from "./settings-form";
import { TestTelegramButton } from "./test-telegram-button";

export const dynamic = "force-dynamic";

async function updateTelegramAction(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  "use server";

  const rawValue = formData.get("telegram_chat_id")?.toString() ?? "";
  const trimmed = rawValue.trim();
  const telegramChatId = trimmed.length > 0 ? trimmed : null;

  if (telegramChatId && !/^\d+$/.test(telegramChatId)) {
    return {
      error: "O chat ID deve conter apenas dígitos.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: telegramChatId })
    .eq("id", user.id);

  if (error) {
    return {
      error: `Nao foi possivel guardar o chat ID. ${error.message}`,
    };
  }

  revalidatePath("/settings");
  return { success: "Chat ID atualizado com sucesso." };
}

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
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
        <Link
          href="/items"
          className="text-sm text-slate-500 underline dark:text-slate-400"
        >
          ← Voltar aos itens
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Definicoes
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Gere o teu chat ID do Telegram e confirma o email da conta.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Conta
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {user.email}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Este endereco e usado para iniciar sessao e recuperar a palavra-passe.
          </p>
        </section>

        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Telegram
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Guardar chat ID
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Sem o chat ID nao e possivel enviar os alertas diarios.
            </p>
          </div>
          <SettingsForm
            action={updateTelegramAction}
            chatId={profile?.telegram_chat_id ?? null}
          />
          <TestTelegramButton />
        </section>
      </div>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Como obter o chat ID?
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            No Telegram, fala com{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-slate-900 underline dark:text-slate-100"
            >
              @userinfobot
            </a>{" "}
            e carrega em <strong>Start</strong>.
          </li>
          <li>O bot devolve o chat ID. Copia o numero.</li>
          <li>
            Cola o numero no campo acima e guarda. Faz isto apenas uma vez por
            conta.
          </li>
        </ol>
      </section>
    </div>
  );
}
