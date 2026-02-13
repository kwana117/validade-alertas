# VALIDADE ALERTAS - Documentação Completa

## Visão Geral

**Validade Alertas** é uma aplicação web MVP desenvolvida em Next.js para gestão de datas de validade de alimentos e produtos domésticos, com alertas diários enviados via Telegram.

**Propósito:** Ajudar utilizadores a monitorizar datas de validade e receber notificações automáticas antes dos produtos expirarem.

**Idioma:** Português (Portugal)

---

## Stack Tecnológico

### Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| Next.js | 16.1.1 | Framework React com App Router |
| React | 19.2.3 | Biblioteca UI |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | v4 | Framework CSS utilitário |
| PostCSS | 4 | Processador CSS |

### Backend & Base de Dados
| Tecnologia | Descrição |
|------------|-----------|
| Supabase | PostgreSQL + Autenticação |
| Row Level Security (RLS) | Isolamento de dados por utilizador |

### Bibliotecas Auxiliares
| Biblioteca | Versão | Descrição |
|------------|--------|-----------|
| date-fns | 4.1.0 | Manipulação de datas |
| Supabase SSR | 0.8.0 | Server-side rendering |
| Supabase JS SDK | 2.89.0 | Cliente Supabase |

---

## Estrutura da Base de Dados

### Tabela `profiles`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | Referência a auth.users |
| `telegram_chat_id` | TEXT | Chat ID do Telegram para alertas |
| `enable_item_test_button` | BOOLEAN | Ativar botões de teste por item (default: false) |
| `alert_offsets_days` | INT[] | Dias antes de expirar para alertar (default: {7,3,1,0}) |
| `alert_include_expired` | BOOLEAN | Incluir itens expirados nos alertas (default: true) |
| `alert_expired_max_days` | INT | Máximo de dias após expirar para mostrar (default: 7) |
| `created_at` | TIMESTAMPTZ | Data de criação |

### Tabela `items`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID (FK) | Referência ao utilizador |
| `name` | TEXT | Nome do item |
| `expires_at` | DATE | Data de validade |
| `location` | TEXT | Local: 'fridge', 'freezer', 'pantry' |
| `status` | TEXT | Estado: 'active', 'consumed', 'discarded' |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização (auto) |

### Triggers & Funções

- **`set_updated_at()`** - Atualiza automaticamente `updated_at` quando item é modificado
- **`handle_new_user()`** - Cria automaticamente perfil quando utilizador se regista

### Row Level Security (RLS)

- Utilizadores só podem ver/editar os seus próprios perfis
- Utilizadores só podem ver/editar os seus próprios items
- Isolamento completo de dados por utilizador

---

## Páginas e Rotas

### Rotas Públicas (Sem Autenticação)

#### `/` - Home
- Redireciona para `/items` se autenticado
- Redireciona para `/login` se não autenticado

#### `/login` - Página de Login
- Formulário email/password
- Autenticação server-side com Supabase
- Tratamento de erros para credenciais inválidas
- Link para página de registo

#### `/signup` - Página de Registo
- Formulário de registo de novo utilizador
- Validação de confirmação de password
- Prevenção de contas duplicadas

### Rotas Protegidas (Requerem Autenticação)

#### `/items` - Dashboard Principal

**Funcionalidades:**
- Resumo com contagem de itens ativos
- Botões rápidos de adicionar por localização (Frigorífico, Congelador, Despensa)
- Duas abas: "Ativos" (default) e "Arquivados" (consumidos/descartados)
- Itens ordenados por data de validade (ascendente)

**Mensagens de Expiração:**
| Estado | Mensagem |
|--------|----------|
| Expirado | "Já expirou 🚨" |
| Hoje | "Expira hoje" |
| Amanhã | "Expira amanhã" |
| Futuro | "Faltam X dias" |

**Ações por Item:**
- Marcar como "Consumido"
- Marcar como "Descartado"
- Restaurar para Ativo (a partir de arquivado)
- Testar alerta do item (se ativado)
- Eliminar permanentemente

**Badges de Estado:**
| Estado | Cor |
|--------|-----|
| Active | Verde (Emerald) |
| Consumed | Azul |
| Discarded | Vermelho |

#### `/add` - Adicionar Item

**Funcionalidades:**
- Suporte a query parameter: `?loc=fridge|freezer|pantry` para pré-selecionar localização
- Campos de input:
  - Nome do item (texto)
  - Data de validade (date picker)
  - Localização (dropdown)
- Botões rápidos de localização no topo
- Redireciona para `/items` após sucesso

#### `/settings` - Configurações

**Secções:**

1. **Informação da Conta**
   - Mostra email do utilizador

2. **Configuração Telegram**
   - Guardar Chat ID do Telegram
   - Instruções para obter chat ID via @userinfobot
   - Botão de teste para enviar mensagem de teste
   - Validação: apenas dígitos permitidos

3. **Configuração de Alertas**
   - Presets disponíveis:
     | Preset | Dias | Expirados |
     |--------|------|-----------|
     | Equilibrado | 7, 3, 1, 0 | Sim (max 7 dias) |
     | Congelador | 30, 14, 7, 0 | Não |
     | Mínimo | 1, 0 | Sim (max 3 dias) |
   - Toggle para incluir itens expirados
   - Máximo de dias após expirar (1-365)
   - Seleção múltipla de offsets (30, 14, 7, 3, 1, 0 dias)

4. **Toggle de Teste de Itens**
   - Ativar/desativar botões "Enviar teste" em itens individuais

---

## API Endpoints

### `GET/POST /api/cron/send-alerts`

**Propósito:** Tarefa agendada diária para enviar alertas de validade via Telegram

**Autenticação:** SUPABASE_SERVICE_ROLE_KEY (acesso admin)

**Fluxo:**
1. Buscar todos os perfis com Chat IDs do Telegram
2. Calcular intervalo de datas baseado em offsets e janela de expirados
3. Consultar itens ativos dentro desse intervalo
4. Agrupar itens por utilizador e organizar por buckets de offset
5. Construir mensagens formatadas
6. Enviar via Telegram Bot API

**Formato da Mensagem:**
```
🧊 Validades a acompanhar:

Expiram daqui a 7 dias:
- Nome do Item (Localização) – 01 fev

Expiram amanhã:
- Nome do Item (Localização) – 02 fev

Expiram hoje:
- Nome do Item (Localização) – 03 fev

Já expiraram:
- Nome do Item (Localização) – 02 fev
```

**Resposta:** JSON com `processedUsers`, `sent`, `errors`

### `POST /api/telegram/test`

**Propósito:** Enviar mensagem de teste para verificar integração Telegram

**Autenticação:** Requer sessão de utilizador válida

**Fluxo:**
1. Verificar autenticação
2. Buscar Chat ID do Telegram do perfil
3. Enviar mensagem de teste
4. Retornar estado de sucesso/erro

**Mensagem de Teste:** "Teste de ligação do Validade Alertas"

### `POST /api/telegram/test-item`

**Propósito:** Enviar alerta de teste para item específico (debugging)

**Autenticação:** Requer sessão + `enable_item_test_button` ativado

**Input:** `{ itemId: string }`

**Exemplos de Mensagem:**
- "⛔ Nome Item já expirou (há 2 dias) — Frigorífico"
- "⚠️ Nome Item expira hoje — Frigorífico"
- "⏳ Nome Item expira em 5 dias — Frigorífico"

---

## Funcionalidades Principais

### 1. Autenticação e Gestão de Utilizadores
- Registo e login com email/password
- Criação automática de perfil no registo
- Autenticação baseada em sessão
- Funcionalidade de logout seguro
- Validação de password (mínimo 6 caracteres)

### 2. Gestão de Itens
- **Adicionar** itens com nome, data de validade e localização
- **Editar estado** (active → consumed/discarded → restaurar)
- **Eliminar** itens permanentemente (com confirmação)
- **Ordenação automática** por data de validade
- **Organização por localização** (Frigorífico, Congelador, Despensa)
- **Tracking de estado** (Ativo, Consumido, Descartado)

### 3. Cálculos de Expiração
- Cálculo em tempo real de dias até expirar
- Mensagens inteligentes baseadas em urgência
- Suporte para itens expirados (mostra dias desde expiração)

### 4. Integração Telegram
- Guardar Chat ID do Telegram no perfil
- Alertas automáticos diários via cron
- Funcionalidade de mensagem de teste
- Alertas de teste por item (quando ativado)
- Triggers de alerta personalizáveis (7, 3, 1, 0 dias antes)
- Controlo de notificação de itens expirados
- Janela definida pelo utilizador para mostrar expirados

### 5. Configuração de Alertas
- **Presets** para padrões de uso comuns
- **Seleção personalizada** de offsets
- **Controlo de itens expirados** (toggle + máximo de dias)

### 6. Interface de Utilizador
- **Modo escuro/claro** (toggle no header, persistido em localStorage)
- **Design responsivo** (mobile-first, otimizado para tablet e desktop)
- **Navegação por abas** (Itens Ativos vs Arquivados)
- **Validação de formulários** (client e server-side)
- **Mensagens de erro** user-friendly
- **Estados de loading** para operações assíncronas
- **Diálogos de confirmação** para ações destrutivas

### 7. Funcionalidades de Teste
- Toggle de botões de teste de item nas configurações
- Testar conexão Telegram antes de guardar chat ID
- Enviar alertas de teste para itens individuais

---

## Componentes

### Componentes de Página
| Ficheiro | Descrição |
|----------|-----------|
| `page.tsx` | Home - Router de redirecionamento |
| `login/page.tsx` | Página de login + handler |
| `login/login-form.tsx` | UI do formulário de login |
| `signup/page.tsx` | Página de registo + handler |
| `signup/signup-form.tsx` | UI do formulário de registo |
| `items/page.tsx` | Dashboard com todas as operações CRUD |
| `add/page.tsx` | Página de adicionar item + handler |
| `add/add-form.tsx` | UI do formulário de adicionar |
| `settings/page.tsx` | Página de configurações |

### Componentes de Formulário
| Ficheiro | Descrição |
|----------|-----------|
| `settings/settings-form.tsx` | Formulário de Chat ID Telegram |
| `settings/alert-settings-form.tsx` | Configuração de alertas com presets |
| `items/delete-item-form.tsx` | Eliminação com confirmação |
| `items/test-item-button.tsx` | Botão de teste de alerta |
| `settings/test-telegram-button.tsx` | Botão de teste de conexão |
| `settings/item-test-toggle.tsx` | Toggle para funcionalidade de teste |

### Componentes de Layout
| Ficheiro | Descrição |
|----------|-----------|
| `layout.tsx` | Layout raiz com header e theme provider |
| `site-header.tsx` | Header de navegação |
| `auth-card.tsx` | Layout de card reutilizável para auth |
| `theme-provider.tsx` | Contexto React para gestão de tema |
| `theme-toggle.tsx` | Botão para alternar tema |

---

## Ficheiros Utilitários

### `/lib/auth.ts`
- Definições de tipo: `AuthFormState`
- Estado inicial: `initialAuthState`

### `/lib/items.ts`
- `LOCATIONS` - Array de opções de localização
- `STATUS_LABELS` - Labels em português para estados
- `LOCATION_LABELS` - Labels em português para localizações
- `STATUS_CLASSES` - Classes Tailwind para badges de estado

### `/lib/supabase/server.ts`
- `createServerSupabaseClient()` - Cliente Supabase para server components
- Gestão de cookies para persistência de sessão

### `/lib/supabase/admin.ts`
- `createAdminSupabaseClient()` - Cliente com service role key
- Usado para cron jobs e operações admin

---

## Mecanismo de Autenticação

**Método:** Supabase Auth com Email/Password

**Fluxo:**
1. Utilizador regista-se com email + password em `/signup`
2. Supabase cria utilizador auth e token JWT
3. Trigger cria automaticamente linha no perfil
4. Sessão guardada em cookies HTTP-only
5. Server components verificam sessão em cada request
6. Políticas RLS garantem acesso apenas a dados próprios
7. Logout limpa cookies e redireciona para `/login`

**Segurança:**
- Políticas Row-level security
- Cookies HTTP-only
- Validação de sessão server-side
- Encriptação de variáveis de ambiente
- Requisito de comprimento mínimo de password

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=...          # URL público Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # Chave anon pública (auth cliente)
SUPABASE_SERVICE_ROLE_KEY=...         # Chave admin (operações server)
TELEGRAM_BOT_TOKEN=...                # Token do bot Telegram
```

---

## Fluxos de Utilizador

### Fluxo 1: Registo e Setup de Novo Utilizador
1. Utilizador visita `/signup`
2. Preenche email, password, confirmar password
3. Server valida e cria utilizador Supabase
4. Trigger cria perfil vazio automaticamente
5. Utilizador redirecionado para `/items` (estado vazio)
6. Utilizador vai a `/settings` para adicionar Chat ID Telegram
7. Utilizador regressa a `/items` para começar a adicionar itens

### Fluxo 2: Adicionar Item e Receber Alertas
1. Utilizador em `/items` clica botão "Adicionar" ou botão de localização
2. Redirecionado para `/add` (com preset `?loc=` opcional)
3. Preenche nome, data de validade, localização
4. Server insere na tabela items
5. Redirecionado de volta para `/items`
6. Item aparece na lista ordenado por data de validade
7. Cron job diário em `/api/cron/send-alerts`:
   - Verifica preferências de alerta de todos os utilizadores
   - Agrupa itens ativos por dias de offset
   - Envia mensagem Telegram formatada

### Fluxo 3: Gerir Estado de Item
1. Utilizador em `/items` vê itens ativos
2. Clica "Marcar consumido" ou "Marcar descartado"
3. Server atualiza estado do item
4. Página revalida, item move para aba "Arquivados"
5. Utilizador pode clicar "Restaurar" para voltar a ativo
6. Utilizador pode eliminar permanentemente com confirmação

### Fluxo 4: Configurar Alertas
1. Utilizador em `/settings` na secção "Alertas"
2. Seleciona preset (Equilibrado, Congelador, Mínimo) ou offsets personalizados
3. Ativa/desativa "Incluir itens expirados"
4. Define "Dias máximos após expirar"
5. Clica "Guardar alertas"
6. Configurações guardadas no perfil
7. Próxima execução do cron usa novas preferências

---

## Design UI/UX

### Sistema de Cores (Tailwind)
| Uso | Cor |
|-----|-----|
| Primário | Slate (900 dark, 100 light) |
| Sucesso/Ativo | Emerald |
| Aviso/Descartado | Amber |
| Erro/Consumido | Rose/Blue |
| Background | Slate-50 (light), Slate-950 (dark) |

### Padrões de Componentes
- Layout baseado em cards com bordas arredondadas
- Navegação por abas para filtragem
- Grupos de botões para ações relacionadas
- Toggle switches para preferências
- Confirmações modais para eliminações
- Estados de loading com botões desativados
- Mensagens inline de erro/sucesso

### Responsividade
- Abordagem mobile-first
- Breakpoint `md:` para mudanças tablet/desktop
- Layouts de grid flexíveis
- Menu hamburger para navegação mobile

---

## Integrações de Terceiros

### 1. Supabase
- Hosting de base de dados PostgreSQL
- Serviço de autenticação
- Gestão de tokens JWT

### 2. Telegram Bot API
- Endpoint: `https://api.telegram.org/bot{TOKEN}/sendMessage`
- Recebe chat IDs manualmente
- Envia mensagens de alerta formatadas diariamente

### 3. Vercel (Implícito)
- Cron jobs via endpoints `/api/cron/`
- Deploy serverless
- Gestão de variáveis de ambiente

---

## Scripts de Build

```bash
npm run dev       # Desenvolvimento local
npm run build     # Build de produção
npm run start     # Servidor de produção
npm run lint      # Validação ESLint
```

---

## Resumo de Todas as Funcionalidades

### Capacidades Core
1. Registo e autenticação de utilizadores
2. Adicionar/editar/eliminar itens com datas de validade
3. Categorizar itens por localização de armazenamento
4. Tracking de estado de itens (ativo, consumido, descartado)
5. Calcular e mostrar dias até expirar
6. Alertas automáticos diários via Telegram
7. Agendas de alerta personalizáveis por utilizador
8. Alertas de teste manuais para debugging
9. Setup e teste de integração Telegram
10. Suporte a tema escuro/claro
11. UI responsiva mobile-friendly
12. Suporte a idioma português
13. Row-level security para isolamento de dados
14. Server-side rendering para performance

### Funcionalidades Avançadas
- Presets de alerta para padrões de uso comuns
- Janela personalizável de itens expirados
- Alertas de teste por item
- Persistência de tema em localStorage
- Criação automática de perfil no registo
- Cálculos de datas timezone-aware com date-fns

---

## Estrutura de Ficheiros

```
validade-alertas/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Home (redirect)
│   │   ├── layout.tsx                  # Layout raiz
│   │   ├── login/
│   │   │   ├── page.tsx                # Página de login
│   │   │   └── login-form.tsx          # Formulário de login
│   │   ├── signup/
│   │   │   ├── page.tsx                # Página de registo
│   │   │   └── signup-form.tsx         # Formulário de registo
│   │   ├── items/
│   │   │   ├── page.tsx                # Dashboard de itens
│   │   │   ├── delete-item-form.tsx    # Formulário de eliminação
│   │   │   └── test-item-button.tsx    # Botão de teste
│   │   ├── add/
│   │   │   ├── page.tsx                # Página de adicionar
│   │   │   └── add-form.tsx            # Formulário de adicionar
│   │   ├── settings/
│   │   │   ├── page.tsx                # Página de configurações
│   │   │   ├── settings-form.tsx       # Formulário Telegram
│   │   │   ├── alert-settings-form.tsx # Formulário de alertas
│   │   │   ├── test-telegram-button.tsx# Botão de teste
│   │   │   └── item-test-toggle.tsx    # Toggle de teste
│   │   ├── api/
│   │   │   ├── cron/
│   │   │   │   └── send-alerts/
│   │   │   │       └── route.ts        # Endpoint de alertas
│   │   │   └── telegram/
│   │   │       ├── test/
│   │   │       │   └── route.ts        # Teste de conexão
│   │   │       └── test-item/
│   │   │           └── route.ts        # Teste de item
│   │   └── components/
│   │       ├── site-header.tsx         # Header de navegação
│   │       ├── auth-card.tsx           # Card de autenticação
│   │       ├── theme-provider.tsx      # Provider de tema
│   │       └── theme-toggle.tsx        # Toggle de tema
│   └── lib/
│       ├── auth.ts                     # Tipos de autenticação
│       ├── items.ts                    # Constantes de itens
│       └── supabase/
│           ├── server.ts               # Cliente server
│           └── admin.ts                # Cliente admin
├── public/                             # Assets estáticos
├── scripts/                            # Scripts auxiliares
├── supabase.sql                        # Schema da BD
├── package.json                        # Dependências
├── next.config.ts                      # Config Next.js
├── tsconfig.json                       # Config TypeScript
└── tailwind.config.mjs                 # Config Tailwind
```

---

*Documentação gerada automaticamente a partir da análise do código fonte.*
