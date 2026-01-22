#!/bin/bash

# Script rápido para testar Supabase no servidor
# Uso: ./scripts/test-supabase-quick.sh

echo "=== TESTE RÁPIDO SUPABASE ==="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Executa este script a partir da raiz do projeto"
    exit 1
fi

echo "1. Verificando variáveis de ambiente..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "   ⚠️  NEXT_PUBLIC_SUPABASE_URL não está definida"
else
    echo "   ✓ NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "   ⚠️  SUPABASE_SERVICE_ROLE_KEY não está definida"
    echo "   💡 Verifica o .htaccess ou configuração do cPanel"
else
    KEY_PREFIX=$(echo "$SUPABASE_SERVICE_ROLE_KEY" | cut -c1-20)
    KEY_LENGTH=${#SUPABASE_SERVICE_ROLE_KEY}
    echo "   ✓ SUPABASE_SERVICE_ROLE_KEY: ${KEY_PREFIX}... (${KEY_LENGTH} chars)"
fi

echo ""
echo "2. Executando teste Node.js..."
node scripts/test-supabase-connection.js
