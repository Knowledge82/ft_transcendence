#!/bin/sh
set -e

echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "Migraciones aplicadas. Iniciando la aplicación..."
exec "$@"
