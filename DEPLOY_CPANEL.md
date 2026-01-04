# Deploy no cPanel (Node.js App Manager) via Git

Este guia descreve como fazer deploy da app Next.js `validade-alertas` no cPanel usando o Node.js App Manager e Git.

## 1) Criar a aplicacao Node.js no cPanel

1. Abre o **cPanel** e entra em **Setup Node.js App**.
2. Clica em **Create Application**.
3. Configura os campos principais:
   - **Node.js version**: 20+.
   - **Application mode**: Production.
   - **Application root**: pasta onde o repo vai ficar (ex.: `validade-alertas`).
   - **Application URL**: escolhe o subdominio (ex.: `validade.digitalimpact.pt`).
   - **Application startup file**: `server.js`.
4. Clica em **Create** para finalizar.

## 2) Clonar o repositorio via SSH no App Root

1. No cPanel, abre **Terminal**.
2. Vai para o Application Root definido no passo anterior.
3. Clona o repo:

```bash
git clone git@github.com:kwana117/validade-alertas.git .
```

Se o clone pedir autenticacao, garante que a chave SSH do servidor esta adicionada ao GitHub.

## 3) Configurar variaveis de ambiente no cPanel

No ecra da aplicacao (Node.js App Manager), adiciona as variaveis de ambiente (nao usar `.env` no git):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`

Guarda as alteracoes. Nao colocar valores no repositorio.

## 4) Instalar dependencias e fazer build

Ainda no ecra da aplicacao:

1. Clica em **Run NPM Install** (ou equivalente).
2. Depois de terminar, executa o build:

```bash
npm run build
```

3. Clica em **Restart App**.

## 5) Atualizar a aplicacao

Sempre que quiseres atualizar:

```bash
git pull origin main
npm install
npm run build
```

No final, clica em **Restart App** no cPanel.

