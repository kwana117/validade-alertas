import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SettingsState } from "./types";
import { SettingsForm } from "./settings-form";
import { TestTelegramButton } from "./test-telegram-button";
import { ItemTestToggle } from "./item-test-toggle";
import { AlertSettingsForm } from "./alert-settings-form";
import { FrequentItemsSection } from "./frequent-items-section";

export const dynamic = "force-dynamic";

const DEFAULT_OFFSETS = [7, 3, 1, 0];

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

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, telegram_chat_id: telegramChatId }, { onConflict: "id" })
    .select("telegram_chat_id")
    .maybeSingle();

  if (error) {
    return {
      error: `Não foi possível guardar o chat ID. ${error.message}`,
    };
  }

  if (!updatedProfile) {
    return {
      error: "Não foi possível guardar o chat ID. Perfil não encontrado.",
    };
  }

  revalidatePath("/settings");
  return { success: "Chat ID atualizado com sucesso." };
}

async function updateItemTestToggle(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  "use server";

  const enabled = formData.get("enable_item_test_button") === "on";

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ enable_item_test_button: enabled })
    .eq("id", user.id);

  if (error) {
    return {
      error: `Não foi possível atualizar a preferência. ${error.message}`,
    };
  }

  revalidatePath("/settings");
  return {
    success: enabled
      ? "Botões de teste ativados."
      : "Botões de teste desativados.",
  };
}

async function updateAlertSettings(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  "use server";

  const rawOffsets = formData.getAll("offsets").map((value) =>
    Number(value),
  );
  const offsets = rawOffsets
    .filter((value) => Number.isFinite(value))
    .filter((value) => [30, 14, 7, 3, 1, 0].includes(value));
  const uniqueOffsets = Array.from(new Set(offsets));

  if (uniqueOffsets.length === 0) {
    return { error: "Seleciona pelo menos um intervalo de alertas." };
  }

  const includeExpired = formData.get("include_expired") === "on";
  const rawExpiredMax = Number(formData.get("expired_max_days"));
  const expiredMaxDays = Number.isFinite(rawExpiredMax)
    ? Math.max(1, Math.min(365, rawExpiredMax))
    : 7;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      alert_offsets_days: uniqueOffsets,
      alert_include_expired: includeExpired,
      alert_expired_max_days: expiredMaxDays,
    })
    .eq("id", user.id);

  if (error) {
    return { error: `Não foi possível guardar os alertas. ${error.message}` };
  }

  revalidatePath("/settings");
  return { success: "Alertas atualizados com sucesso." };
}

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // First, try to load only columns that definitely exist
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("telegram_chat_id, enable_item_test_button")
    .eq("id", user.id)
    .maybeSingle();

  // Try to load alert settings separately (they might not exist in old schemas)
  if (profile && !profileError) {
    const { data: alertData } = await supabase
      .from("profiles")
      .select("alert_offsets_days, alert_include_expired, alert_expired_max_days")
      .eq("id", user.id)
      .maybeSingle();
    
    if (alertData) {
      profile = { ...profile, ...alertData } as typeof profile & typeof alertData;
    }
  }

  if (!profile && !profileError) {
    const admin = createAdminSupabaseClient();
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("telegram_chat_id, enable_item_test_button")
      .eq("id", user.id)
      .maybeSingle();
    
    if (adminProfile) {
      const { data: adminAlertData } = await admin
        .from("profiles")
        .select("alert_offsets_days, alert_include_expired, alert_expired_max_days")
        .eq("id", user.id)
        .maybeSingle();
      
      profile = { ...adminProfile, ...(adminAlertData ?? {}) } as typeof adminProfile & typeof adminAlertData;
    }
  }

  const alertOffsets =
    (profile as any)?.alert_offsets_days && Array.isArray((profile as any).alert_offsets_days) && (profile as any).alert_offsets_days.length > 0
      ? (profile as any).alert_offsets_days
      : DEFAULT_OFFSETS;
  const alertIncludeExpired = (profile as any)?.alert_include_expired ?? true;
  const alertExpiredMaxDays = (profile as any)?.alert_expired_max_days ?? 7;

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
          Definições
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
            Este endereço é usado para iniciar sessão e recuperar a palavra-passe.
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
              Sem o chat ID não é possível enviar os alertas diários.
            </p>
          </div>
          <SettingsForm
            action={updateTelegramAction}
            initialTelegramChatId={
              profile?.telegram_chat_id
                ? String(profile.telegram_chat_id)
                : null
            }
          />
          <TestTelegramButton />
        </section>
      </div>

      <AlertSettingsForm
        initialOffsets={alertOffsets}
        initialIncludeExpired={alertIncludeExpired}
        initialExpiredMaxDays={alertExpiredMaxDays}
        action={updateAlertSettings}
      />

      <ItemTestToggle
        enabled={profile?.enable_item_test_button ?? false}
        action={updateItemTestToggle}
      />

      <FrequentItemsSection />

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
          <li>O bot devolve o chat ID. Copia o número.</li>
          <li>
            Cola o número no campo acima e guarda. Faz isto apenas uma vez por
            conta.
          </li>
        </ol>
      </section>

      <footer className="text-center text-sm text-slate-500 dark:text-slate-400">
        {new Date().getFullYear()} @ Digital Impact
      </footer>
    </div>
  );
}
