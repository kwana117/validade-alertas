import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import type { AuthFormState } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

async function signupAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  if (!email || !password || !confirmPassword) {
    return { error: "Preenche todos os campos." };
  }

  if (password !== confirmPassword) {
    return { error: "As palavras-passe têm de ser iguais." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Já existe uma conta com este email."
          : "Não foi possível criar a conta. Revê os dados e tenta novamente.",
    };
  }

  redirect("/items");
}

export default async function SignupPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/items");
  }

  return (
    <div className="mt-12">
      <AuthCard
        title="Criar conta"
        subtitle="Regista-te para receber alertas diários por Telegram."
      >
        <SignupForm action={signupAction} />
      </AuthCard>
    </div>
  );
}
