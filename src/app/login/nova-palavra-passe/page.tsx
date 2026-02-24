import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import type { AuthFormState } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UpdatePasswordForm } from "./update-password-form";

export const dynamic = "force-dynamic";

async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!password || !confirmPassword) {
    return { error: "Preenche todos os campos." };
  }

  if (password.length < 6) {
    return { error: "A palavra-passe tem de ter pelo menos 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "As palavras-passe têm de ser iguais." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error:
        error.message === "Auth session missing!"
          ? "Link inválido ou expirado. Pede um novo email de recuperação."
          : "Não foi possível atualizar a palavra-passe. Tenta novamente.",
    };
  }

  return { success: true };
}

export default function UpdatePasswordPage() {
  return (
    <div className="mt-12">
      <AuthCard
        title="Nova palavra-passe"
        subtitle="Define uma nova palavra-passe para entrares novamente na tua conta."
      >
        <UpdatePasswordForm action={updatePasswordAction} />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
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
