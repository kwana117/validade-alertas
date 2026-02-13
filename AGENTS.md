# AGENTS.md

## Objetivo
Este projeto (`validade-alertas`) e uma app web para gerir datas de validade e enviar alertas diarios por Telegram.

## Stack
- Next.js 16 (App Router) + TypeScript
- Supabase Auth + Postgres
- Tailwind CSS v4

## Fluxo funcional
- Auth: login/signup com Supabase.
- Itens: criar, listar e atualizar estado (`ativo`, `consumido`, `descartado`).
- Settings: guardar `telegram_chat_id`.
- Cron: `GET /api/cron/send-alerts` agrega itens por utilizador e envia resumo Telegram.

## Estrutura relevante
- `src/app`: rotas App Router (UI e endpoints).
- `src/lib`: clientes Supabase e utilitarios.
- `supabase.sql`: schema, triggers e RLS.
- `scripts/`: scripts de suporte e deploy.

## Comandos
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Start: `npm run start`
- Teste de ligacao Supabase: `npm run test:supabase`

## Variaveis de ambiente essenciais
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`

## Regras para agentes
- Preservar o App Router e o estilo de codigo TypeScript ja existente.
- Nao remover ou enfraquecer RLS/policies do Supabase.
- Nao expor segredos em logs, commits ou mensagens.
- Antes de alterar comportamento de cron/alertas, validar impacto em agrupamento por utilizador e fuso horario.
- Em mudancas de schema SQL, atualizar `supabase.sql` e documentar migracao.
- Em mudancas relevantes, correr no minimo `npm run lint`.

## Validacao minima apos alteracoes
1. `npm run lint`
2. Subir app (`npm run dev`) e validar login, listagem de itens e settings.
3. Se tocar no endpoint de alertas, testar `GET /api/cron/send-alerts` com variaveis configuradas.
