import Link from "next/link";
import { headers } from "next/headers";
import { AuthCard } from "@/components/auth-card";
import type { AuthFormState } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { RecoverPasswordForm } from "./recover-password-form";

export const dynamic = "force-dynamic";

function getRequestOrigin(requestHeaders: Headers): string | null {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    return null;
  }

  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${proto}://${host}`;
}

async function recoverPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = formData.get("email")?.toString().trim();

  if (!email) {
    return { error: "Preenche o email da conta." };
  }

  const supabase = await createServerSupabaseClient();
  const requestHeaders = await headers();
  const origin = getRequestOrigin(requestHeaders);
  const callbackPath = `/auth/callback?next=${encodeURIComponent(
    "/login/nova-palavra-passe",
  )}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}${callbackPath}` : undefined,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("email rate limit exceeded") ||
      message.includes("rate limit")
    ) {
      return {
        error:
          "Atingiste o limite de emails de recuperação. Tenta novamente daqui a 1 hora.",
      };
    }

    return {
      error:
        "Não foi possível enviar o email de recuperação. Tenta novamente.",
    };
  }

  return { success: true };
}

export default function RecoverPasswordPage() {
  return (
    <div className="mt-12">
      <AuthCard
        title="Recuperar palavra-passe"
        subtitle="Enviaremos um link para definires uma nova palavra-passe."
      >
        <RecoverPasswordForm action={recoverPasswordAction} />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Lembraste da palavra-passe?{" "}
          <Link
            className="font-semibold text-slate-900 underline dark:text-slate-100"
            href="/login"
          >
            Voltar ao login
          </Link>
          .
        </p>
      </AuthCard>
    </div>
  );
}
