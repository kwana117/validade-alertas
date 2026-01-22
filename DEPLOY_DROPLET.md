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

## Atualizar Aplicação

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
