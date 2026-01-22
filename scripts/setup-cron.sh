#!/bin/bash

# Script para configurar cron job no servidor
# Executa: bash scripts/setup-cron.sh

echo "=== Configuração de Cron Job para Alertas ==="
echo ""

# URL da aplicação (ajusta se necessário)
APP_URL="https://validade.digitalimpact.pt"
CRON_ENDPOINT="${APP_URL}/api/cron/send-alerts"

echo "1. Verificando se já existe cron job..."
if crontab -l 2>/dev/null | grep -q "send-alerts"; then
    echo "   ⚠️  Já existe um cron job configurado"
    echo "   Cron atual:"
    crontab -l | grep "send-alerts"
    echo ""
    read -p "   Deseja substituir? (s/N): " replace
    if [[ ! $replace =~ ^[Ss]$ ]]; then
        echo "   Cancelado."
        exit 0
    fi
    # Remover cron antigo
    crontab -l 2>/dev/null | grep -v "send-alerts" | crontab -
fi

echo ""
echo "2. Configurando cron job para correr a cada minuto..."
echo "   Endpoint: ${CRON_ENDPOINT}"
echo ""

# Criar cron job que corre a cada minuto
(crontab -l 2>/dev/null; echo "* * * * * curl -s ${CRON_ENDPOINT} > /dev/null 2>&1") | crontab -

echo "   ✓ Cron job adicionado!"
echo ""
echo "3. Verificando cron job configurado:"
crontab -l | grep "send-alerts"
echo ""
echo "✅ Configuração concluída!"
echo ""
echo "O cron job vai correr a cada minuto e verificar se há alertas para enviar."
echo ""
echo "Para ver os logs do cron:"
echo "  tail -f /var/log/syslog | grep CRON"
echo ""
echo "Para remover o cron job:"
echo "  crontab -l | grep -v 'send-alerts' | crontab -"
