import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN não definido" }, { status: 500 });
  }

  const { origin } = new URL(request.url);
  const webhookUrl = `${origin}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  const body: Record<string, string> = { url: webhookUrl };
  if (secret) body.secret_token = secret;

  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json({ webhookUrl, telegram: data });
}
