FROM node:20-slim AS base

# Install necessary tools (openssl is needed by Prisma)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm i -g pnpm

WORKDIR /app

# Copy the entire project
COPY . .

# Install ALL dependencies using pnpm (needed for workspaces)
RUN pnpm install

# Build only the shared package first
RUN pnpm --filter @fideicomiso/shared build || true

# Generate Prisma client BEFORE building
RUN pnpm --filter @fideicomiso/api exec prisma generate

# Build only the API
RUN pnpm --filter @fideicomiso/api build

EXPOSE 4000

ENV NODE_ENV=production

# Ejecutar el script unificado de base de datos y arranque
CMD ["sh", "start-prod.sh"]
