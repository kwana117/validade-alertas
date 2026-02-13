# Validade Alertas

App web (MVP) para gerir prazos de validade de alimentos/itens domésticos com autenticação, tracking de estado e alertas diários via Telegram.

## 🧾 Descrição para GitHub

`Gestão de validade de itens com Next.js, Supabase e alertas diários via Telegram.`

## 📚 Documentação

- `docs/APP_CONTEXT.md`
- `docs/DEPLOY_CPANEL.md`
- `docs/DEPLOY_DROPLET.md`
- `docs/DOCUMENTACAO_PROJETO_2026-01-20.md`
- `docs/FEATURE_PRODUTOS_FREQUENTES.md`
- `docs/INCIDENTE_DEPLOY_2026-02-07.md`
- `docs/SETUP_FREQUENT_ITEMS.md`
- `docs/VOICE_TO_FIELDS_REFERENCIA.md`

## 🛠️ Stack

- `Next.js 16` (App Router) + TypeScript
- `Supabase Auth + Postgres` (tabelas `profiles` e `items`)
- `Tailwind CSS` (preset V4)
- `API Cron` (`/api/cron/send-alerts`) para resumos diários por Telegram

## ✅ Funcionalidades

- 🔐 Login e registo com Supabase Auth
- 📦 Gestão de itens com data de validade e localização
- 🔄 Alteração de estado (`ativo`, `consumido`, `descartado`)
- ⚙️ Configuração de `telegram_chat_id` por utilizador
- 📩 Resumo diário por Telegram com itens a expirar e expirados

## ⚙️ Configuração

1. ➜ Duplica o ficheiro `.env.example` para `.env.local` e preenche:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
```

2. ➜ No Supabase, executa o conteúdo de `supabase.sql` na consola SQL para criar tabelas, triggers, RLS e policies.

3. ➜ Instala dependências e prepara o ambiente:

```bash
npm install
```

## 💻 Desenvolvimento local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) e cria uma conta. Depois, guarda o `telegram_chat_id` em `/settings`.

## ⏰ Cron Telegram

Configura o teu agendador (Supabase Scheduled Functions, Vercel Cron ou outro) para chamar `https://<host>/api/cron/send-alerts` uma vez por dia. O endpoint agrupa os itens por utilizador e envia mensagens com:

- 🟡 Itens que expiram daqui a 3 dias
- 🟠 Itens a expirar amanhã
- 🔴 Itens a expirar hoje
- ⚫ Itens já expirados

⚠️ Se não existir `TELEGRAM_BOT_TOKEN` ou `SUPABASE_SERVICE_ROLE_KEY`, o endpoint devolve erro 500.
