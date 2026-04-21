#!/bin/sh
set -e

echo "=========================================="
echo "🚀 INICIANDO SECUENCIA DE ARRANQUE"
echo "=========================================="

# Validar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está definida en el entorno"
  exit 1
fi

# Navegar al directorio de la API
cd apps/api

echo "📦 1. Regenerando Prisma Client..."
DATABASE_URL="$DATABASE_URL" npx prisma generate

echo "📝 2. Aplicando migraciones Prisma (schema -> BD)..."
DATABASE_URL="$DATABASE_URL" npx prisma db push --accept-data-loss || {
  echo "⚠️ db push falló, intentando con migrate deploy..."
  DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy || {
    echo "❌ No se pudo aplicar el schema a la BD. Revisa DATABASE_URL y BD disponible."
    exit 1
  }
}

echo "✅ Schema aplicado correctamente"

echo "🔥 3. Levantando el servidor de la API en Producción..."
node dist/main
