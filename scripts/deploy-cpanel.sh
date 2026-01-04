#!/usr/bin/env sh
set -e

git pull origin main
npm ci || npm install
npm run build
echo "Agora reinicia a aplicacao no cPanel"

