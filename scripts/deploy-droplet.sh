#!/bin/bash

# Script de deploy simplificado para o droplet
# Uso: bash scripts/deploy-droplet.sh

set -e  # Parar se houver erro

echo "=== Deploy Validade Alertas ==="
echo ""

cd /var/www/validade-alertas || exit 1

echo "1. Fazendo pull do repositório..."
git pull

echo ""
echo "2. Instalando dependências..."
npm install

echo ""
echo "3. Fazendo build..."
npm run build

echo ""
echo "4. Reiniciando PM2..."
pm2 restart validade-alertas || pm2 start ecosystem.config.js

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "Status da aplicação:"
pm2 status validade-alertas
