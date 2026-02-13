# Incidente Deploy — 2026-02-07

## Resumo
A aplicação `validade-alertas` no droplet (DigitalOcean) está a exibir a UI “desformatada” e erros relacionados com `OPENAI_API_KEY`. Apesar de a chave existir no ambiente do processo PM2, a aplicação não está a arrancar corretamente em produção porque a porta `3001` está ocupada por outro processo (`next-server`) que não é o processo gerido pelo PM2. Como resultado:

- O processo do PM2 fica em loop de restart com erro `EADDRINUSE`.
- O Nginx aponta para `127.0.0.1:3001`, mas essa porta está a ser servida por um processo “fantasma”.
- O CSS e outros assets de `/_next/static/*` devolvem **500** porque o Next.js não está a arrancar corretamente.

## Sintomas observados
- UI “sem CSS” (parece HTML cru).
- Console do browser: erro em `/api/items/voice` e modal “OPENAI_API_KEY não configurada”.
- `curl -I https://validade.digitalimpact.pt/_next/static/css/<hash>.css` retorna **500**.
- `pm2 logs validade-alertas` mostra repetidamente:
  - `Error: listen EADDRINUSE: address already in use 0.0.0.0:3001`
- `ss -ltnp | grep :3001` mostra um processo `next-server` fora do PM2.

## Contexto técnico
- Hosting: **DigitalOcean Droplet**
- Process manager: **PM2**
- Nginx: reverse proxy para `http://127.0.0.1:3001`
- App: Next.js (App Router)
- PM2 config: `ecosystem.config.js` (porta `3001`)

## O que já foi feito
1. **Variáveis de ambiente**
   - `OPENAI_API_KEY` e `OPENAI_TEXT_MODEL` adicionadas ao `ecosystem.config.js`.
   - Confirmado: `pm2 env <id>` mostra as variáveis.

2. **Rebuild da app**
   - `rm -rf .next`
   - `npm run build`
   - `pm2 restart validade-alertas --update-env`

3. **Correção de build**
   - Erro TS em `src/app/api/cron/send-alerts/route.ts` foi removido.
   - Commit + push feito para `main`.

4. **Porta ocupada**
   - `EADDRINUSE` identificado na porta `3001`.
   - Foi morto um `next-server` anterior, mas o problema reaparece.

## Evidências importantes
- `pm2 logs validade-alertas` (trechos):
  - `Error: listen EADDRINUSE: address already in use 0.0.0.0:3001`
- `ss -ltnp | grep :3001`:
  - `users: (("next-server", pid=...))`
- `curl -I https://validade.digitalimpact.pt/_next/static/css/9aa672146cd0eec3.css`:
  - `HTTP/1.1 500 Internal Server Error`

## Causa provável
Existe **um processo `next-server` fora do PM2** a ocupar a porta `3001`. O processo do PM2 falha ao subir, entra em restart loop e o Nginx continua a apontar para a instância errada.

Consequências:
- O serviço ativo não é o que tem as env vars atualizadas.
- Assets `/_next/static/*` são servidos por uma instância em erro, resultando em 500.

## O que falta resolver (pendente)
1. Identificar e eliminar o processo que ocupa `3001`.
2. Garantir que só há **uma** instância (PM2) a servir a app.
3. Confirmar que o PM2 arranca corretamente sem `EADDRINUSE`.
4. Confirmar que o CSS volta a responder com **200 OK**.

## Passos recomendados (para resolver de vez)
1. Ver quem usa a porta 3001:
   - `ss -ltnp | grep :3001`
2. Matar o PID encontrado:
   - `kill -9 <PID>`
3. Verificar se há PM2 de outro utilizador (ex: `deploy`):
   - `su - deploy -c "pm2 list"`
4. Apagar a app em qualquer PM2 secundário:
   - `su - deploy -c "pm2 delete validade-alertas"`
5. Subir apenas com o PM2 do root:
   - `pm2 start /var/www/validade-alertas/ecosystem.config.js --only validade-alertas --update-env`
   - `pm2 save`
6. Confirmar que só existe um listener:
   - `ss -ltnp | grep :3001`
7. Verificar que CSS responde com 200:
   - `curl -I https://validade.digitalimpact.pt/_next/static/css/<hash>.css`

## Resolução (runbook)

Foi adicionado o script **`scripts/fix-droplet-port.sh`** para automatizar a correção no droplet.

### No droplet (SSH como root ou com sudo)

1. **Atualizar código** (para ter o script):
   ```bash
   cd /var/www/validade-alertas
   git pull
   ```

2. **Executar o script de correção** (liberta a porta e reinicia só o PM2):
   ```bash
   bash scripts/fix-droplet-port.sh 3001
   ```
   Se no servidor usares outra porta, passa-a como argumento, ex.: `bash scripts/fix-droplet-port.sh 3000`.

3. **Confirmar que a app está a servir**:
   ```bash
   pm2 logs validade-alertas
   ss -ltnp | grep :3001
   curl -I https://validade.digitalimpact.pt/_next/static/css/9aa672146cd0eec3.css
   ```
   O último comando deve devolver **200 OK** (e não 500).

4. **Alinhar porta no repositório com o servidor**  
   O `ecosystem.config.js` no repo usa `-p 3000`. Se no droplet o Nginx aponta para `127.0.0.1:3001`, no servidor o `ecosystem.config.js` deve ter `-p 3001` (ou alterar o Nginx para 3000). Garantir que **Nginx e PM2 usam a mesma porta**.

### Segurança (OPENAI_API_KEY)

A `OPENAI_API_KEY` foi exposta durante troubleshooting. Recomendado:
- **Revogar a chave** no painel OpenAI.
- Gerar nova chave.
- Atualizar no `ecosystem.config.js` no servidor (e/ou em `.env`) e reiniciar PM2: `pm2 restart validade-alertas --update-env`.

## Data e hora (UTC)
2026-02-07
