import { addDays, differenceInCalendarDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatLocationLabel } from "@/lib/items";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
});

const DEFAULT_OFFSETS = [7, 3, 1, 0];

export async function GET() {
  return handleCron();
}

export async function POST() {
  return handleCron();
}

function offsetLabel(offset: number) {
  if (offset === 0) return "Expiram hoje";
  if (offset === 1) return "Expiram amanhã";
  return `Expiram daqui a ${offset} dias`;
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

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, telegram_chat_id, alert_offsets_days, alert_include_expired, alert_expired_max_days",
    )
    .not("telegram_chat_id", "is", null);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileRows = (profiles ?? []).filter((profile) => profile.id);

  if (profileRows.length === 0) {
    return NextResponse.json({ processedUsers: 0, sent: 0, errors: [] });
  }

  const profilesByUser = new Map(
    profileRows.map((profile) => [profile.id, profile]),
  );

  const maxOffset = profileRows.reduce((current, profile) => {
    const offsets =
      Array.isArray(profile.alert_offsets_days) &&
      profile.alert_offsets_days.length > 0
        ? profile.alert_offsets_days
        : DEFAULT_OFFSETS;
    const localMax = Math.max(...offsets);
    return Math.max(current, localMax);
  }, 0);

  const maxExpiredWindow = profileRows.reduce((current, profile) => {
    if (!profile.alert_include_expired) return current;
    const maxDays = Number(profile.alert_expired_max_days ?? 0);
    return Math.max(current, maxDays);
  }, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = maxExpiredWindow > 0 ? addDays(today, -maxExpiredWindow) : today;
  const maxDate = addDays(today, maxOffset);

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id,name,expires_at,location,user_id,status")
    .eq("status", "active")
    .gte("expires_at", format(minDate, "yyyy-MM-dd"))
    .lte("expires_at", format(maxDate, "yyyy-MM-dd"))
    .in(
      "user_id",
      profileRows.map((profile) => profile.id),
    );

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  type BucketItem = { name: string; expires_at: string; location: string };

  const grouped = new Map<
    string,
    {
      chatId: string;
      offsets: number[];
      includeExpired: boolean;
      expiredMaxDays: number;
      buckets: Map<number, BucketItem[]>;
      expired: BucketItem[];
    }
  >();

  for (const item of items ?? []) {
    const profile = profilesByUser.get(item.user_id);
    if (!profile) continue;

    const chatId = profile.telegram_chat_id;
    if (!chatId) continue;

    const offsets =
      Array.isArray(profile.alert_offsets_days) &&
      profile.alert_offsets_days.length > 0
        ? profile.alert_offsets_days
        : DEFAULT_OFFSETS;
    const includeExpired = profile.alert_include_expired ?? true;
    const expiredMaxDays = Number(profile.alert_expired_max_days ?? 7);

    if (!grouped.has(item.user_id)) {
      grouped.set(item.user_id, {
        chatId,
        offsets,
        includeExpired,
        expiredMaxDays,
        buckets: new Map(offsets.map((offset) => [offset, []])),
        expired: [],
      });
    }

    const entry = grouped.get(item.user_id)!;
    const expiresAt = new Date(item.expires_at);
    const diff = differenceInCalendarDays(expiresAt, today);

    if (diff >= 0 && entry.buckets.has(diff)) {
      entry.buckets.get(diff)?.push({
        name: item.name,
        expires_at: item.expires_at,
        location: item.location,
      });
      continue;
    }

    if (diff < 0 && entry.includeExpired) {
      const daysExpired = Math.abs(diff);
      if (daysExpired <= entry.expiredMaxDays) {
        entry.expired.push({
          name: item.name,
          expires_at: item.expires_at,
          location: item.location,
        });
      }
    }
  }

  const results: Array<{ userId: string; sent: boolean; message?: string }> =
    [];

  for (const [userId, info] of grouped.entries()) {
    const orderedOffsets = [...new Set(info.offsets)].sort((a, b) => b - a);

    const sections = orderedOffsets
      .map((offset) => {
        const itemsForOffset = info.buckets.get(offset) ?? [];
        if (itemsForOffset.length === 0) return null;
        const lines = itemsForOffset
          .map(
            (item) =>
              `- ${item.name} (${formatLocationLabel(item.location)}) – ${DATE_FORMATTER.format(new Date(item.expires_at))}`,
          )
          .join("\n");
        return `${offsetLabel(offset)}:\n${lines}`;
      })
      .filter((section): section is string => Boolean(section));

    if (info.includeExpired && info.expired.length > 0) {
      const lines = info.expired
        .map(
          (item) =>
            `- ${item.name} (${formatLocationLabel(item.location)}) – ${DATE_FORMATTER.format(new Date(item.expires_at))}`,
        )
        .join("\n");
      sections.push(`Já expiraram:\n${lines}`);
    }

    if (sections.length === 0) {
      results.push({ userId, sent: false, message: "Sem itens relevantes" });
      continue;
    }

    const text =
      "🥩 Validades a acompanhar:\n\n" +
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
