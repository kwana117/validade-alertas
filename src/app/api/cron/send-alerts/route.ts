import { addDays, differenceInCalendarDays } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { LOCATION_LABELS } from "@/lib/items";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
});

const BUCKET_LABELS: Record<string, string> = {
  in3: "Expiram daqui a 3 dias",
  in1: "Expiram amanhã",
  today: "Expiram hoje",
  expired: "Já expiraram",
};

type AlertBucket = "in3" | "in1" | "today" | "expired";

export async function GET() {
  return handleCron();
}

export async function POST() {
  return handleCron();
}

async function handleCron() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN não está definido." },
      { status: 500 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const horizon = addDays(new Date(), 3);

  const { data, error } = await supabase
    .from("items")
    .select("id,name,expires_at,location,user_id,status,profiles(telegram_chat_id)")
    .eq("status", "active")
    .lte("expires_at", horizon.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ProfileRef = { telegram_chat_id?: string | null } | null;
  type ItemWithProfile = {
    id: string;
    name: string;
    expires_at: string;
    location: string;
    user_id: string;
    profiles?: ProfileRef | ProfileRef[];
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const grouped = new Map<
    string,
    {
      chatId: string;
      buckets: Record<AlertBucket, { name: string; expires_at: string; location: string }[]>;
    }
  >();

  for (const item of (data ?? []) as ItemWithProfile[]) {
    const chatId = Array.isArray(item.profiles)
      ? item.profiles[0]?.telegram_chat_id
      : item.profiles?.telegram_chat_id;
    if (!chatId) continue;

    const expiresAt = new Date(item.expires_at);
    const diff = differenceInCalendarDays(expiresAt, today);

    let bucket: AlertBucket | null = null;
    if (diff === 3) bucket = "in3";
    else if (diff === 1) bucket = "in1";
    else if (diff === 0) bucket = "today";
    else if (diff < 0) bucket = "expired";

    if (!bucket) continue;

    if (!grouped.has(item.user_id)) {
      grouped.set(item.user_id, {
        chatId,
        buckets: {
          in3: [],
          in1: [],
          today: [],
          expired: [],
        },
      });
    }

    const entry = grouped.get(item.user_id)!;
    entry.buckets[bucket].push({
      name: item.name,
      expires_at: item.expires_at,
      location: item.location,
    });
  }

  const results: Array<{ userId: string; sent: boolean; message?: string }> =
    [];

  for (const [userId, info] of grouped.entries()) {
    const sections = Object.entries(info.buckets)
      .filter(([, items]) => items.length > 0)
      .map(([bucket, items]) => {
        const lines = items
          .map(
            (item) =>
              `- ${item.name} (${LOCATION_LABELS[item.location] ?? item.location}) – ${DATE_FORMATTER.format(new Date(item.expires_at))}`,
          )
          .join("\n");
        return `${BUCKET_LABELS[bucket as AlertBucket]}:\n${lines}`;
      });

    if (sections.length === 0) {
      results.push({ userId, sent: false, message: "Sem itens relevantes" });
      continue;
    }

    const text =
      "🧊 Validades a acompanhar:\n\n" +
      sections.join("\n\n") +
      "\n\nMantém a lista atualizada para evitar desperdício.";

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: info.chatId,
          text,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      results.push({ userId, sent: false, message: errorText });
      continue;
    }

    results.push({ userId, sent: true });
  }

  return NextResponse.json({
    processedUsers: grouped.size,
    sent: results.filter((r) => r.sent).length,
    errors: results.filter((r) => !r.sent),
  });
}
