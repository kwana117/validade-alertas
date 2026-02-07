#!/bin/bash
#
# Liberta a porta usada pela app e reinicia apenas o PM2 (root).
# Resolve EADDRINUSE quando um processo "fantasma" next-server ocupa a porta.
#
# Uso (no droplet, como root ou com sudo):
#   bash scripts/fix-droplet-port.sh [PORT]
#   PORT=3001 bash scripts/fix-droplet-port.sh
#
# Default PORT=3001 (deve coincidir com Nginx e com -p no ecosystem.config.js no servidor).

set -e

PORT="${1:-${PORT:-3001}}"
APP_DIR="${APP_DIR:-/var/www/validade-alertas}"

echo "=== Fix porta $PORT (validade-alertas) ==="
echo ""

# 1. Ver quem está na porta
echo "1. Processos na porta $PORT:"
if command -v ss &>/dev/null; then
  ss -ltnp 2>/dev/null | grep ":$PORT " || true
fi
if command -v lsof &>/dev/null; then
  lsof -i ":$PORT" 2>/dev/null || true
fi
echo ""

# 2. Matar todos os processos que ouvem nessa porta
echo "2. A libertar a porta $PORT..."
if command -v lsof &>/dev/null; then
  PIDS=$(lsof -ti ":$PORT" 2>/dev/null) || true
  if [ -n "$PIDS" ]; then
    for pid in $PIDS; do
      echo "   A matar PID $pid"
      kill -9 "$pid" 2>/dev/null || true
    done
    sleep 2
  else
    echo "   Nenhum processo encontrado na porta $PORT."
  fi
else
  echo "   lsof não disponível. Usar manualmente: kill -9 \$(ss -ltnp | grep ':$PORT ' | grep -oP 'pid=\K[0-9]+')"
fi
echo ""

# 3. Opcional: remover validade-alertas de PM2 de outros utilizadores (ex: deploy)
echo "3. A verificar PM2 de outros utilizadores..."
for user in deploy www-data; do
  if id "$user" &>/dev/null; then
    if su - "$user" -c "pm2 list 2>/dev/null" | grep -q validade-alertas; then
      echo "   A remover validade-alertas do PM2 do utilizador $user"
      su - "$user" -c "pm2 delete validade-alertas 2>/dev/null" || true
    fi
  fi
done
echo ""

# 4. Reiniciar apenas o PM2 do utilizador atual
echo "4. A reiniciar PM2 (validade-alertas)..."
cd "$APP_DIR" || { echo "Erro: diretório $APP_DIR não encontrado."; exit 1; }

pm2 delete validade-alertas 2>/dev/null || true
pm2 start ecosystem.config.js --only validade-alertas --update-env
pm2 save
echo ""

# 5. Verificar que só há um listener na porta
echo "5. Verificação — listeners na porta $PORT:"
sleep 2
if command -v ss &>/dev/null; then
  ss -ltnp 2>/dev/null | grep ":$PORT " || echo "   Nenhum (PM2 pode ainda estar a subir)."
fi
echo ""

echo "=== Concluído ==="
echo "Próximos passos:"
echo "  pm2 logs validade-alertas   # ver logs"
echo "  curl -I https://validade.digitalimpact.pt/_next/static/css/<hash>.css   # deve devolver 200"
echo ""
