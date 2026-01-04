import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import type { AuthFormState } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return { error: "Preenche o email e a palavra-passe." };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error:
        error.message === "Invalid login credentials"
          ? "Credenciais inválidas."
          : "Não foi possível entrar. Tenta novamente.",
    };
  }

  redirect("/items");
}

export default async function LoginPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/items");
  }

  return (
    <div className="mt-12">
      <AuthCard
        title="Entrar"
        subtitle="Acede ao painel para gerir as validades dos teus itens."
      >
        <LoginForm action={loginAction} />
      </AuthCard>
    </div>
  );
}
