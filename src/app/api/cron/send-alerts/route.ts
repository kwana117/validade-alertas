import { addDays, differenceInCalendarDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { formatLocationLabel } from "@/lib/items";
import { getEffectiveExpiry } from "@/lib/date-utils";

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
});

const DEFAULT_OFFSETS = [7, 3, 1, 0];

type CronDebugInfo = {
  queryDetails: Record<string, unknown>;
  [key: string]: unknown;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceUserId = searchParams.get("force_user_id");
  return handleCron(forceUserId);
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const forceUserId = searchParams.get("force_user_id");
  return handleCron(forceUserId);
}

function offsetLabel(offset: number) {
  if (offset === 0) return "Expiram hoje";
  if (offset === 1) return "Expiram amanhã";
  return `Expiram daqui a ${offset} dias`;
}

async function handleCron(forceUserId: string | null = null) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[CRON] Starting handleCron at ${timestamp}`, { forceUserId });
  
  // Validar variáveis de ambiente
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error(`[CRON] TELEGRAM_BOT_TOKEN não está definido`);
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN não está definido." },
      { status: 500 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Debug: Log das variáveis (sem mostrar valores completos por segurança)
  console.log(`[CRON] Environment check:`, {
    hasSupabaseUrl: !!supabaseUrl,
    supabaseUrlLength: supabaseUrl?.length || 0,
    hasServiceRoleKey: !!serviceRoleKey,
    serviceRoleKeyLength: serviceRoleKey?.length || 0,
    serviceRoleKeyPrefix: serviceRoleKey ? serviceRoleKey.substring(0, 10) + "..." : "N/A",
    allEnvKeys: Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("TELEGRAM")),
  });
  
  if (!supabaseUrl) {
    console.error(`[CRON] NEXT_PUBLIC_SUPABASE_URL não está definido`);
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL não está definido." },
      { status: 500 },
    );
  }
  
  if (!serviceRoleKey) {
    console.error(`[CRON] SUPABASE_SERVICE_ROLE_KEY não está definido`);
    console.error(`[CRON] Available env vars:`, Object.keys(process.env).filter(k => k.includes("SUPABASE")));
    return NextResponse.json(
      { 
        error: "SUPABASE_SERVICE_ROLE_KEY não está definido.",
        hint: "Verifica as variáveis de ambiente no servidor (cPanel/LiteSpeed). As variáveis do .htaccess podem não estar a ser lidas pelo Node.js.",
        debug: {
          availableEnvVars: Object.keys(process.env).filter(k => k.includes("SUPABASE") || k.includes("TELEGRAM")),
        }
      },
      { status: 500 },
    );
  }
  
  // Validar formato da API key (deve começar com sb_secret_ ou eyJ)
  if (!serviceRoleKey.startsWith("sb_secret_") && !serviceRoleKey.startsWith("eyJ")) {
    console.warn(`[CRON] SUPABASE_SERVICE_ROLE_KEY pode ter formato inválido (não começa com sb_secret_ ou eyJ)`);
    console.warn(`[CRON] Key starts with: ${serviceRoleKey.substring(0, 20)}`);
  }

  const supabase = createAdminSupabaseClient();
  
  // Testar se a conexão funciona fazendo uma query simples
  try {
    const { error: testError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);
    
    if (testError) {
      console.error(`[CRON] Test query failed:`, testError);
      // Se for erro de API key, dar mensagem mais específica
      if (testError.message?.includes("API key") || testError.message?.includes("Unregistered")) {
        return NextResponse.json({
          error: "A chave de API do Supabase (SUPABASE_SERVICE_ROLE_KEY) não é válida ou não está registada.",
          details: testError.message,
          hint: testError.hint || "Verifica no Supabase Dashboard > Settings > API se a Service Role Key está correta.",
          debug: {
            errorCode: testError.code,
            errorMessage: testError.message,
            errorHint: testError.hint,
          }
        }, { status: 500 });
      }
    } else {
      console.log(`[CRON] Test query successful - Supabase connection OK`);
    }
  } catch (testException) {
    console.error(`[CRON] Exception testing Supabase connection:`, testException);
    return NextResponse.json({
      error: "Erro ao conectar ao Supabase.",
      details: testException instanceof Error ? testException.message : String(testException),
    }, { status: 500 });
  }
  
  // Informações do ambiente do servidor
  const serverEnvironment = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "unknown",
    timestamp,
  };
  
  console.log(`[CRON] Server environment:`, serverEnvironment);

  // Obter a hora atual em formato HH:MM (Lisboa timezone)
  const now = new Date();
  let currentTime = "00:00";
  const debugInfo: CronDebugInfo = {
    serverEnvironment,
    executionStart: startTime,
    queryDetails: {},
  };
  
  console.log(`[CRON] Calculating Lisbon time from UTC: ${now.toISOString()}`);
  
  try {
    // Método 1: Usar Intl.DateTimeFormat com formatToParts
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Lisbon",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const hoursPart = parts.find(p => p.type === "hour");
    const minutesPart = parts.find(p => p.type === "minute");
    
    debugInfo.method1 = {
      parts: parts,
      hoursPart: hoursPart,
      minutesPart: minutesPart,
      formatterResult: formatter.format(now)
    };
    
    if (hoursPart && minutesPart) {
      const hours = hoursPart.value.padStart(2, "0");
      const minutes = minutesPart.value.padStart(2, "0");
      currentTime = `${hours}:${minutes}`;
    } else {
      // Método 2: Fallback usando toLocaleString
      const lisbonString = now.toLocaleString("en-US", {
        timeZone: "Europe/Lisbon",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      debugInfo.method2 = { lisbonString };
      
      // Extrair HH:MM do formato "HH:MM AM/PM" ou "HH:MM"
      const match = lisbonString.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const h = match[1].padStart(2, "0");
        const m = match[2].padStart(2, "0");
        currentTime = `${h}:${m}`;
      }
    }
    
    debugInfo.finalTime = currentTime;
    console.log(`[CRON] Lisbon time calculated: ${currentTime}`, debugInfo);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[CRON] Error calculating time:`, errorMessage, errorStack);
    debugInfo.error = errorMessage;
    debugInfo.errorStack = errorStack;
    // Fallback final: usar hora local (não ideal, mas melhor que nada)
    const localHours = now.getHours().toString().padStart(2, "0");
    const localMinutes = now.getMinutes().toString().padStart(2, "0");
    currentTime = `${localHours}:${localMinutes}`;
    debugInfo.fallback = currentTime;
    console.warn(`[CRON] Using fallback local time: ${currentTime}`);
  }
  
  // Formatter para debug (sempre disponível)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Lisbon",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Se forceUserId for passado, buscar apenas esse utilizador (ignorar hora)
  let query = supabase
    .from("profiles")
    .select(
      "id, telegram_chat_id, alert_offsets_days, alert_include_expired, alert_expired_max_days, alert_time",
    )
    .not("telegram_chat_id", "is", null);

  if (forceUserId) {
    console.log(`[CRON] Querying for specific user: ${forceUserId}`);
    query = query.eq("id", forceUserId);
    debugInfo.queryDetails = {
      queryType: "force_user",
      userId: forceUserId,
    };
  } else {
    console.log(`[CRON] Querying for alert_time: ${currentTime}`);
    query = query.eq("alert_time", currentTime);
    debugInfo.queryDetails = {
      queryType: "time_match",
      alertTime: currentTime,
    };
  }

  const queryStartTime = Date.now();
  const { data: profiles, error: profilesError } = await query;
  const queryTime = Date.now() - queryStartTime;
  
  debugInfo.queryDetails = {
    ...debugInfo.queryDetails,
    queryTime: `${queryTime}ms`,
    profilesFound: profiles?.length || 0,
  };

  if (profilesError) {
    console.error(`[CRON] Database error:`, profilesError);
    
    // Se for erro de API key, dar mensagem mais clara
    if (profilesError.message?.includes("API key") || profilesError.message?.includes("Unregistered")) {
      console.error(`[CRON] Supabase API key error - check SUPABASE_SERVICE_ROLE_KEY environment variable`);
      return NextResponse.json({ 
        error: "Erro de configuração: SUPABASE_SERVICE_ROLE_KEY não está configurada corretamente.",
        details: profilesError.message,
        hint: "Verifica as variáveis de ambiente no servidor.",
        debug: {
          ...debugInfo,
          queryError: {
            message: profilesError.message,
            hint: profilesError.hint,
            code: profilesError.code,
          },
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: profilesError.message,
      debug: {
        ...debugInfo,
        queryError: profilesError,
      }
    }, { status: 500 });
  }
  
  console.log(`[CRON] Found ${profiles?.length || 0} profiles matching criteria`);

  const profileRows = (profiles ?? []).filter((profile) => profile.id);

  if (profileRows.length === 0) {
    // Debug: buscar todos os alert_times para ver o que está na BD
    console.log(`[CRON] No profiles found, fetching all alert times for debug`);
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from("profiles")
      .select("id, alert_time, telegram_chat_id")
      .not("telegram_chat_id", "is", null);
    
    // Se também esta query falhar, retornar erro
    if (allProfilesError) {
      const executionTime = Date.now() - startTime;
      return NextResponse.json({
        error: "Erro ao aceder à base de dados.",
        details: allProfilesError.message,
        currentTime,
        forceUserId: forceUserId ?? null,
        processedUsers: 0,
        sent: 0,
        errors: [allProfilesError],
        debug: {
          currentTimeFormatted: currentTime,
          utcTime: now.toISOString(),
          lisbonTimeString: formatter.format(now),
          timeCalculation: debugInfo,
          serverEnvironment,
          queryDetails: {
            ...debugInfo.queryDetails,
            debugQueryError: allProfilesError,
          },
          executionTime: `${executionTime}ms`,
        },
        message: "Não foi possível verificar os perfis na base de dados."
      }, { status: 500 });
    }
    
    const alertTimes = (allProfiles ?? []).map(p => ({
      userId: p.id,
      alertTime: p.alert_time,
      matches: p.alert_time === currentTime
    }));
    
    const executionTime = Date.now() - startTime;
    debugInfo.executionTime = `${executionTime}ms`;
    debugInfo.queryDetails = {
      ...debugInfo.queryDetails,
      allAlertTimes: alertTimes.map(p => p.alertTime),
      matches: alertTimes.some(p => p.matches),
    };
    
    console.log(`[CRON] Debug info:`, {
      currentTime,
      alertTimes: alertTimes.map(p => p.alertTime),
      matches: alertTimes.filter(p => p.matches).length,
      executionTime,
    });
    
    return NextResponse.json({
      currentTime,
      forceUserId: forceUserId ?? null,
      processedUsers: 0,
      sent: 0,
      errors: [],
      debug: {
        currentTimeFormatted: currentTime,
        utcTime: now.toISOString(),
        lisbonTimeString: formatter.format(now),
        allProfiles: alertTimes,
        comparison: alertTimes.map(p => `${p.alertTime} === ${currentTime}? ${p.matches}`),
        timeCalculation: debugInfo,
        serverEnvironment,
        queryDetails: debugInfo.queryDetails,
        executionTime: debugInfo.executionTime,
      },
      message: forceUserId
        ? "Utilizador não encontrado ou sem chat ID configurado."
        : `Nenhum utilizador com notificações configuradas para as ${currentTime}. Horas configuradas: ${alertTimes.map(p => p.alertTime).join(", ")}`
    });
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

  const userIds = profileRows.map((profile) => profile.id);

  const [{ data: nonOpenedItems, error: itemsError }, { data: openedItems, error: openedError }] = await Promise.all([
    supabase
      .from("items")
      .select("id,name,expires_at,location,category,user_id,status,opened_at,opened_duration_days")
      .eq("status", "active")
      .is("opened_at", null)
      .gte("expires_at", format(minDate, "yyyy-MM-dd"))
      .lte("expires_at", format(maxDate, "yyyy-MM-dd"))
      .in("user_id", userIds),
    supabase
      .from("items")
      .select("id,name,expires_at,location,category,user_id,status,opened_at,opened_duration_days")
      .eq("status", "active")
      .not("opened_at", "is", null)
      .in("user_id", userIds),
  ]);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }
  if (openedError) {
    return NextResponse.json({ error: openedError.message }, { status: 500 });
  }

  const items = [
    ...(nonOpenedItems ?? []),
    ...(openedItems ?? []).filter((item) => {
      const effectiveExpiry = getEffectiveExpiry(item);
      const diff = differenceInCalendarDays(effectiveExpiry, today);
      const maxExpiredDays = profileRows.find(p => p.id === item.user_id)?.alert_expired_max_days ?? 7;
      return diff >= -maxExpiredDays && diff <= maxOffset;
    }),
  ];

  type BucketItem = { id: string; name: string; expires_at: string; location: string; category: string; opened_at?: string | null; opened_duration_days?: number | null };

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
    const effectiveExpiry = getEffectiveExpiry(item);
    const diff = differenceInCalendarDays(effectiveExpiry, today);
    const bucketItem = {
      id: item.id,
      name: item.name,
      expires_at: format(effectiveExpiry, "yyyy-MM-dd"),
      location: item.location,
      category: item.category ?? "alimentar",
      opened_at: item.opened_at ?? null,
      opened_duration_days: item.opened_duration_days ?? null,
    };

    if (diff >= 0 && entry.buckets.has(diff)) {
      entry.buckets.get(diff)?.push(bucketItem);
      continue;
    }

    if (diff < 0 && entry.includeExpired) {
      const daysExpired = Math.abs(diff);
      if (daysExpired <= entry.expiredMaxDays) {
        entry.expired.push(bucketItem);
      }
    }
  }

  const results: Array<{ userId: string; sent: boolean; message?: string }> =
    [];

  for (const [userId, info] of grouped.entries()) {
    const orderedOffsets = [...new Set(info.offsets)].sort((a, b) => b - a);

    // Colectar todos os itens com o seu label de offset
    type AlertItem = BucketItem & { id: string; label: string };
    const alertItems: AlertItem[] = [];

    for (const offset of orderedOffsets) {
      const itemsForOffset = (info.buckets.get(offset) ?? []) as (BucketItem & { id: string })[];
      for (const item of itemsForOffset) {
        alertItems.push({ ...item, label: offsetLabel(offset) });
      }
    }

    if (info.includeExpired) {
      for (const item of info.expired as (BucketItem & { id: string })[]) {
        alertItems.push({ ...item, label: "Já expirou" });
      }
    }

    if (alertItems.length === 0) {
      results.push({ userId, sent: false, message: "Sem itens relevantes" });
      continue;
    }

    let sentCount = 0;
    for (const item of alertItems) {
      const emoji = item.category === "saude" ? "💊" : "🍎";
      const locationPart = item.category === "saude"
        ? ""
        : ` • ${formatLocationLabel(item.location)}`;
      const datePart = DATE_FORMATTER.format(new Date(item.expires_at));
      const text = `${emoji} ${item.name}${locationPart}\n📅 ${item.label} — ${datePart}`;

      const openedPrefix = item.opened_at ? "📦 " : "";
      const fullText = `${openedPrefix}${text}`;
      const actionRow = [
        { text: "✅ Consumido", callback_data: `va:consumed:${item.id}` },
        { text: "🗑 Descartado", callback_data: `va:discard:${item.id}` },
      ];
      if (!item.opened_at) {
        actionRow.push({ text: "📦 Abri", callback_data: `va:opened:${item.id}` });
      }

      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: info.chatId,
            text: fullText,
            reply_markup: {
              inline_keyboard: [actionRow],
            },
          }),
        },
      );

      if (response.ok) sentCount++;
      else console.error(`[CRON] Failed to send item ${item.id}:`, await response.text());
    }

    results.push({ userId, sent: sentCount > 0 });
  }

  const executionTime = Date.now() - startTime;
  debugInfo.executionTime = `${executionTime}ms`;
  debugInfo.queryDetails = {
    ...debugInfo.queryDetails,
    matchedProfiles: profileRows.map(p => ({ userId: p.id, alertTime: p.alert_time })),
  };
  
  console.log(`[CRON] Completed in ${executionTime}ms`, {
    processedUsers: grouped.size,
    sent: results.filter((r) => r.sent).length,
    errors: results.filter((r) => !r.sent).length,
  });
  
  return NextResponse.json({
    currentTime,
    forceUserId: forceUserId ?? null,
    processedUsers: grouped.size,
    sent: results.filter((r) => r.sent).length,
    errors: results.filter((r) => !r.sent),
    debug: {
      currentTimeFormatted: currentTime,
      utcTime: now.toISOString(),
      lisbonTimeString: formatter.format(now),
      matchedProfiles: profileRows.map(p => ({ userId: p.id, alertTime: p.alert_time })),
      timeCalculation: debugInfo,
      serverEnvironment,
      queryDetails: debugInfo.queryDetails,
      executionTime: debugInfo.executionTime,
    }
  });
}
