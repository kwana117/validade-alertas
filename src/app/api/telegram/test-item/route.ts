import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { differenceInCalendarDays } from "date-fns";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LOCATION_LABELS } from "@/lib/items";

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida. Faz login novamente." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("telegram_chat_id, enable_item_test_button")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { ok: false, error: `Não foi possível carregar o perfil. ${profileError.message}` },
      { status: 500 },
    );
  }

  if (!profile?.enable_item_test_button) {
    return NextResponse.json(
      { ok: false, error: "Funcionalidade desativada nas definições." },
      { status: 403 },
    );
  }

  const chatId = profile.telegram_chat_id?.toString().trim();

  if (!chatId) {
    return NextResponse.json(
      { ok: false, error: "Guarda primeiro o chat ID no perfil." },
      { status: 400 },
    );
  }

  let payload: { itemId?: string } = {};
  try {
    payload = (await request.json()) as { itemId?: string };
  } catch {
    payload = {};
  }

  const itemId = payload.itemId?.toString();
  if (!itemId) {
    return NextResponse.json(
      { ok: false, error: "ID do item em falta." },
      { status: 400 },
    );
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, name, expires_at, location")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (itemError) {
    return NextResponse.json(
      { ok: false, error: `Não foi possível carregar o item. ${itemError.message}` },
      { status: 500 },
    );
  }

  if (!item) {
    return NextResponse.json(
      { ok: false, error: "Item não encontrado." },
      { status: 404 },
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(item.expires_at);
  const diff = differenceInCalendarDays(expiry, today);
  const locationLabel = LOCATION_LABELS[item.location] ?? item.location;

  let message = "";

  if (diff < 0) {
    const days = Math.abs(diff);
    const dayLabel = days === 1 ? "dia" : "dias";
    message = `⛔ ${item.name} já expirou (há ${days} ${dayLabel}) — ${locationLabel}`;
  } else if (diff === 0) {
    message = `⚠️ ${item.name} expira hoje — ${locationLabel}`;
  } else if (diff === 1) {
    message = `⚠️ ${item.name} expira amanhã — ${locationLabel}`;
  } else {
    message = `⏳ ${item.name} expira em ${diff} dias — ${locationLabel}`;
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
        text: message,
      }),
    },
  );

  let telegramPayload: { ok?: boolean; description?: string } | null = null;
  try {
    telegramPayload = await response.json();
  } catch {
    telegramPayload = null;
  }

  if (!response.ok || !telegramPayload?.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          telegramPayload?.description ??
          "Não foi possível enviar a mensagem pelo Telegram.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
