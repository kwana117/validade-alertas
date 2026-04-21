import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type SupabaseClient = ReturnType<typeof createAdminSupabaseClient>;

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseOpenIntent(text: string): string | null {
  const n = normalize(text.trim());
  const match = n.match(/^abri(?:\s+(?:o|a|os|as))?\s+(.+)$/);
  return match ? match[1].trim() : null;
}

async function sendMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function answerCallback(callbackQueryId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
}

async function markOpened(itemId: string, supabase: SupabaseClient) {
  const { data: item } = await supabase
    .from("items")
    .select("id, name, user_id, status")
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.status !== "active") return null;

  const { data: fi } = await supabase
    .from("frequent_items")
    .select("opened_duration_days")
    .eq("user_id", item.user_id)
    .ilike("name", item.name)
    .maybeSingle();

  const days = fi?.opened_duration_days ?? 3;
  const effectiveExpiry = addDays(new Date(), days);

  await supabase
    .from("items")
    .update({ opened_at: new Date().toISOString(), opened_duration_days: days })
    .eq("id", itemId);

  return { name: item.name as string, days, effectiveExpiry };
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const headerSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (headerSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot não configurado" }, { status: 500 });
  }

  const update = await request.json();
  const supabase = createAdminSupabaseClient();

  // Callback de botões inline
  if (update.callback_query) {
    const { id: queryId, data, from } = update.callback_query;

    if (!data?.startsWith("va:")) {
      await answerCallback(queryId, "");
      return NextResponse.json({ ok: true });
    }

    const parts = data.split(":");
    const action = parts[1];
    const itemId = parts[2];

    if (action === "consumed" || action === "discard") {
      const newStatus = action === "consumed" ? "consumed" : "discarded";
      const { error } = await supabase
        .from("items")
        .update({ status: newStatus })
        .eq("id", itemId);

      const msg = error
        ? "Erro ao atualizar. Tenta na app."
        : action === "consumed"
          ? "✅ Marcado como consumido!"
          : "🗑 Marcado como descartado!";
      await answerCallback(queryId, msg);
    } else if (action === "opened") {
      const result = await markOpened(itemId, supabase);
      if (result) {
        const dateStr = format(result.effectiveExpiry, "dd MMM");
        await answerCallback(queryId, `📦 ${result.name} aberto — tens até ${dateStr} (${result.days} dias)`);
      } else {
        await answerCallback(queryId, "Item não encontrado ou já arquivado.");
      }
    } else {
      await answerCallback(queryId, "");
    }

    // Ignorar from para evitar warnings de variável não usada
    void from;
    return NextResponse.json({ ok: true });
  }

  // Mensagem de texto
  if (update.message?.text) {
    const chatId = update.message.chat.id.toString();
    const text: string = update.message.text;

    const productName = parseOpenIntent(text);
    if (!productName) {
      return NextResponse.json({ ok: true });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    if (!profile) {
      await sendMessage(chatId, "Conta não encontrada. Configura o Telegram na app.");
      return NextResponse.json({ ok: true });
    }

    const { data: items } = await supabase
      .from("items")
      .select("id, name, opened_at")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .is("opened_at", null);

    const normalizedQuery = normalize(productName);
    const matches = (items ?? []).filter((item) =>
      normalize(item.name).includes(normalizedQuery),
    );

    if (matches.length === 0) {
      await sendMessage(chatId, `Não encontrei nenhum item ativo com o nome "${productName}".`);
      return NextResponse.json({ ok: true });
    }

    if (matches.length > 1) {
      const list = matches.map((m, i) => `${i + 1}. ${m.name}`).join("\n");
      await sendMessage(chatId, `Encontrei vários itens:\n${list}\n\nUsa os botões nos alertas para marcar o correto.`);
      return NextResponse.json({ ok: true });
    }

    const result = await markOpened(matches[0].id, supabase);
    if (result) {
      const dateStr = format(result.effectiveExpiry, "dd MMM");
      await sendMessage(chatId, `📦 ${result.name} marcado como aberto!\nTens até ${dateStr} para consumir (${result.days} dias).`);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
