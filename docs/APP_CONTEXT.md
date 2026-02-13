# Validade Alertas — Contexto da App

App web (MVP) em Next.js para gerir prazos de validade de alimentos/itens domésticos.
Utiliza Supabase Auth + Postgres para autenticação e dados, e envia alertas diários
via Telegram com base nas datas de validade.

## O que a app faz
- Regista itens com nome, data de validade, local (fridge/freezer/pantry) e estado.
- Lista os itens por ordem de validade e mostra estado (ativo/consumido/descartado).
- Permite mudar o estado dos itens (consumido, descartado, reativar).
- Guarda o `telegram_chat_id` do utilizador para receber alertas.

## Fluxo principal
- Home: redireciona para `/items` se houver sessão, senão `/login`.
- Login/Signup: autenticação via Supabase.
- Items (`/items`): lista, resumo e ações de estado.
- Add (`/add`): cria novos itens (com localização pré-selecionável por query param).
- Settings (`/settings`): guarda `telegram_chat_id`.

## Alertas por Telegram
Um cron chama `/api/cron/send-alerts` 1x/dia. O endpoint:
- Agrupa itens por utilizador.
- Envia resumo com itens que expiram em 3 dias, amanhã, hoje e já expirados.
- Requer `TELEGRAM_BOT_TOKEN` e `SUPABASE_SERVICE_ROLE_KEY`.

## Modelo de dados (Supabase)
- `profiles`: id (user), `telegram_chat_id`, `created_at`.
- `items`: id, user_id, name, expires_at (date), location, status, created_at, updated_at.
- Trigger para `updated_at` e criação automática de `profiles`.
- RLS: cada utilizador só vê/edita os seus dados.

## Stack e infra
- Next.js 16 (App Router) + TypeScript
- Supabase Auth + Postgres
- Tailwind CSS
- Cron externo (Supabase Scheduled Functions, Vercel Cron, etc.)
