import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sessao invalida. Faz login novamente." },
      { status: 401 },
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("telegram_chat_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Nao foi possivel carregar o chat ID. ${error.message}` },
      { status: 500 },
    );
  }

  const chatId = profile?.telegram_chat_id?.toString().trim();

  if (!chatId) {
    return NextResponse.json(
      { ok: false, error: "Guarda primeiro o chat ID no perfil." },
      { status: 400 },
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Token do bot Telegram em falta." },
      { status: 500 },
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Teste de ligacao do Validade Alertas",
      }),
    },
  );

  let payload: { ok?: boolean; description?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          payload?.description ??
          "Nao foi possivel enviar a mensagem pelo Telegram.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
