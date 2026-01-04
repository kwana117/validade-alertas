# Validade Alertas

MVP em Next.js (App Router) para gerir prazos de validade com Supabase Auth e alertas diários via Telegram.

## Stack

- Next.js 16 (App Router) + TypeScript
- Supabase Auth + Postgres (tabelas `profiles` e `items`)
- Tailwind CSS (preset V4)
- API Cron: `/api/cron/send-alerts` envia resumos diários por Telegram

## Configuração

1. Duplica o ficheiro `.env.example` para `.env.local` e preenche:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
```

2. No Supabase, executa o conteúdo de `supabase.sql` na consola SQL para criar tabelas, triggers, RLS e policies.

3. Instala dependências e prepara o ambiente:

```bash
npm install
```

## Desenvolvimento local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e cria uma conta. Depois, guarda o `telegram_chat_id` em `/settings`.

## Cron Telegram

Configura o teu agendador (Supabase Scheduled Functions, Vercel Cron ou outro) para chamar `https://<host>/api/cron/send-alerts` uma vez por dia. O endpoint agrupa os itens por utilizador e envia mensagens com:

- Itens que expiram daqui a 3 dias
- Itens a expirar amanhã
- Itens a expirar hoje
- Itens já expirados

Se não existir `TELEGRAM_BOT_TOKEN` ou `SUPABASE_SERVICE_ROLE_KEY`, o endpoint devolve erro 500.
