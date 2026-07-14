#!/bin/sh
set -e

echo "Generando Prisma client..."
npx prisma generate

echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "Migraciones aplicadas. Iniciando la aplicación..."
exec "$@"
