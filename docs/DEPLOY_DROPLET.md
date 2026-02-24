# Deploy no Droplet (DigitalOcean)

Este guia descreve como fazer deploy e configurar cron jobs no droplet.

## Setup Inicial

1. **Clonar repositório:**
```bash
cd /var/www
git clone git@github.com:kwana117/validade-alertas.git
cd validade-alertas
```

2. **Instalar dependências:**
```bash
npm install
npm run build
```

3. **Configurar variáveis de ambiente:**
   - Criar `.env.local` com as variáveis necessárias
   - OU usar `ecosystem.config.js` (já configurado)

4. **Iniciar com PM2:**
```bash
pm2 start ecosystem.config.js
pm2 save
```

## Configurar Cron Job

O `vercel.json` só funciona na Vercel. Num droplet, precisas de configurar um cron job do sistema.

### Opção 1: Script Automático

```bash
cd /var/www/validade-alertas
bash scripts/setup-cron.sh
```

### Opção 2: Manual

```bash
crontab -e
```

Adicionar esta linha (corre a cada minuto):
```
* * * * * curl -s https://validade.digitalimpact.pt/api/cron/send-alerts > /dev/null 2>&1
```

### Verificar Cron Job

```bash
crontab -l
```

### Ver Logs do Cron

```bash
tail -f /var/log/syslog | grep CRON
```

## Fluxo de atualização (após alterações e commit)

### 1. No teu computador (local)

1. Fazer as alterações no código.
2. Commit e push:
   ```bash
   git add .
   git commit -m "descrição das alterações"
   git push
   ```

### 2. No droplet (servidor)

Entrar por SSH no droplet e **atualizar a app** de uma destas formas:

**Opção A — Script (recomendado)**  
Corre pull, install, build e restart do PM2 de uma vez:

```bash
cd /var/www/validade-alertas
bash scripts/deploy-droplet.sh
```

**Opção B — Manual**

```bash
cd /var/www/validade-alertas
git pull
npm install
npm run build
pm2 restart validade-alertas --update-env
```

O `--update-env` faz o PM2 recarregar as variáveis do `ecosystem.config.js` (útil se alteraste env vars).

## Deploy automático com GitHub Actions

Foi adicionado o workflow `.github/workflows/deploy.yml` para deploy automático a cada `push` na `main`.

### Secrets obrigatórios no GitHub (repo -> Settings -> Secrets and variables -> Actions)

- `DROPLET_HOST`: IP ou domínio do servidor.
- `DROPLET_USER`: utilizador SSH (ex.: `root` ou `deploy`).
- `DROPLET_SSH_KEY`: chave privada SSH (formato OpenSSH) com acesso ao servidor.
- `DROPLET_PORT`: porta SSH (normalmente `22`).
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`

### Variables opcionais no GitHub (Actions variables)

- `APP_NAME` (default: `validade-alertas`)
- `APP_DIR` (default: `/var/www/validade-alertas`)
- `APP_PORT` (default: `3000`)

### O que o workflow faz

1. Cria um arquivo da app no runner (sem `.env*`, `.next` e `node_modules`).
2. Envia o arquivo para o droplet por SSH.
3. No servidor, instala dependências base se faltarem (`curl`, `git`, `node`, `pm2`).
4. Faz build numa pasta de release, atualiza o symlink `current` e reinicia a app via PM2.

---

## Atualizar Aplicação (resumo)

```bash
cd /var/www/validade-alertas
git pull
npm install
npm run build
pm2 restart validade-alertas
```

## Testar Cron Manualmente

```bash
curl https://validade.digitalimpact.pt/api/cron/send-alerts
```

## Troubleshooting

### Cron não está a correr
- Verificar se está configurado: `crontab -l`
- Verificar logs: `grep CRON /var/log/syslog`
- Testar manualmente: `curl https://validade.digitalimpact.pt/api/cron/send-alerts`

### Endpoint não responde
- Verificar se a app está a correr: `pm2 status`
- Verificar logs: `pm2 logs validade-alertas`
- Verificar se a porta está aberta

### EADDRINUSE (porta já em uso) — UI sem CSS, 500 em /_next/static/*
Quando um processo "fantasma" (ex.: `next-server` fora do PM2) ocupa a porta da app, o PM2 entra em loop de restart e o site fica sem CSS / 500 nos assets.

1. **Ver quem está na porta** (ex.: 3001):
   ```bash
   ss -ltnp | grep :3001
   # ou
   lsof -i :3001
   ```
2. **Correção rápida** — usar o script de fix no droplet:
   ```bash
   cd /var/www/validade-alertas
   git pull
   bash scripts/fix-droplet-port.sh 3001
   ```
3. **Manual**: matar o PID com `kill -9 <PID>`, garantir que não há outra instância PM2 (ex.: utilizador `deploy`) com `validade-alertas`, e reiniciar: `pm2 start ecosystem.config.js --only validade-alertas --update-env && pm2 save`.
4. Garantir que **Nginx e `ecosystem.config.js`** usam a mesma porta (ex.: 3001).
