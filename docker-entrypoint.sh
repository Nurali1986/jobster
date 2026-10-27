#!/bin/sh
set -e

echo "[Entrypoint] Применение миграций базы данных Prisma..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "[Entrypoint] Миграции успешно применены. Запуск сервера Next.js..."
exec node server.js
