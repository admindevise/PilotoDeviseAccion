# Setup Docker completo (Monorepo)

Guía para levantar **frontend + backend + PostgreSQL + Redis** en contenedores, sin depender de Node/pnpm instalados en la máquina local.

## 1) Requisitos

- Docker Desktop (macOS/Windows) o Docker Engine + Compose (Linux)
- Puerto libres en host:
  - `3000` (web)
  - `4000` (api)
  - `5433` (postgres en host)
  - `6379` (redis)

> Nota: PostgreSQL del contenedor usa `5432` **interno**, pero está publicado como `5433` en tu máquina para evitar conflicto con un Postgres local.

---

## 2) Archivos usados por el setup

- Orquestación: [infra/docker-compose.yml](infra/docker-compose.yml)
- Imagen API (dev): [infra/docker/api.Dockerfile.dev](infra/docker/api.Dockerfile.dev)
- Imagen Web (dev): [infra/docker/web.Dockerfile.dev](infra/docker/web.Dockerfile.dev)
- Variables ejemplo: [infra/.env.docker.example](infra/.env.docker.example)
- Exclusiones de contexto: [.dockerignore](.dockerignore)

---

## 3) Variables de entorno necesarias

### 3.1 Crear archivo de entorno Docker

Copiar el ejemplo:

```bash
cp infra/.env.docker.example infra/.env.docker
```

### 3.2 Variables mínimas

En [infra/.env.docker](infra/.env.docker):

```env
NODE_ENV=development

# API
API_PORT=4000
PORT=4000
POSTGRES_DB=fideicomiso_platform
REDIS_URL=redis://redis:6379
CORS_ORIGIN=http://localhost:3000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=fidu-conciliation-super-secret-key-2026

# Frontend -> API
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# IA (opcional para navegación general)
ANTHROPIC_API_KEY=
```

### 3.3 Explicación rápida

- `POSTGRES_DB`: define el nombre de la base de datos del stack Docker.
- `DATABASE_URL`: la compone `docker-compose` usando `POSTGRES_DB` y el host interno `postgres`.
- `REDIS_URL`: usa host interno `redis`.
- `NEXT_PUBLIC_API_URL`: desde navegador va a `localhost:4000`.
- `NEXTAUTH_URL`: URL pública del frontend.
- `NEXTAUTH_SECRET`: obligatorio para sesiones NextAuth.

---

## 4) Configuración por instancia (servicio)

## `postgres`

- Imagen: `postgres:16-alpine`
- Puerto host: `5433:5432`
- Volúmenes:
  - `postgres_data:/var/lib/postgresql/data`
  - `./init-extensions.sql:/docker-entrypoint-initdb.d/init-extensions.sql`
- Healthcheck: `pg_isready`

## `redis`

- Imagen: `redis:7-alpine`
- Puerto host: `6379:6379`
- Volumen: `redis_data:/data`
- Healthcheck: `redis-cli ping`

## `api`

- Build:
  - `context: ..`
  - `dockerfile: infra/docker/api.Dockerfile.dev`
- Puerto host: `4000:4000`
- Dependencias: `postgres` y `redis` saludables
- Comando de arranque:
  1. limpia cache incremental TS (`tsconfig.tsbuildinfo`)
  2. limpia `dist`
  3. `prisma generate`
  4. `prisma db push`
  5. `nest start --watch`
- Variables clave:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `PORT` / `API_PORT`
  - `CORS_ORIGIN`

## `web`

- Build:
  - `context: ..`
  - `dockerfile: infra/docker/web.Dockerfile.dev`
- Puerto host: `3000:3000`
- Dependencia: `api`
- Comando de arranque:
  - `next dev --hostname 0.0.0.0 --port 3000`
- Variables clave:
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `NEXT_PUBLIC_API_URL`

---

## 5) Levantar todo (inicio a fin)

Desde la raíz del repo:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up --build
```

Al finalizar:

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- PostgreSQL host: `localhost:5433`
- Redis host: `localhost:6379`

---

## 5.1) Levantar servicios independientes

Desde la raíz del repo:

```bash
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up -d web
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up -d api
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up -d postgres
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up -d redis
```

## 5.2) Acceder a la terminal de cada instancia

Desde la raíz del repo:

```bash
# Web (Next.js)
docker compose -f infra/docker-compose.yml exec web sh

# API (NestJS)
docker compose -f infra/docker-compose.yml exec api sh

# PostgreSQL (shell del contenedor)
docker compose -f infra/docker-compose.yml exec postgres sh

# Redis (shell del contenedor)
docker compose -f infra/docker-compose.yml exec redis sh
```

Consolas útiles directas:

```bash
# Consola SQL de PostgreSQL
docker compose -f infra/docker-compose.yml exec postgres psql -U postgres -d "$POSTGRES_DB"

# Consola Redis
docker compose -f infra/docker-compose.yml exec redis redis-cli
```

## 6) Comandos útiles

### Ver estado

```bash
docker compose -f infra/docker-compose.yml ps
```

### Ver logs de un servicio

```bash
docker compose -f infra/docker-compose.yml logs -f web
docker compose -f infra/docker-compose.yml logs -f api
docker compose -f infra/docker-compose.yml logs -f postgres
docker compose -f infra/docker-compose.yml logs -f redis
```

### Reiniciar un servicio

```bash
docker compose -f infra/docker-compose.yml restart web
docker compose -f infra/docker-compose.yml restart api
```

### Reconstruir todo (cuando cambian Dockerfiles o deps)

```bash
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up --build
```

### Limpieza completa (incluye volúmenes de DB/Redis)

```bash
docker compose -f infra/docker-compose.yml down -v
```

### Instalar dependencias desde el contenedor (importante)

En un flujo Docker, puede instalar librerías **desde dentro del contenedor**.

Ejemplo genérico:

```bash
docker compose exec app pnpm add nombre-de-la-libreria
```

¿Qué pasa aquí?
- Docker entra al contenedor y ejecuta el comando de instalación.
- La dependencia se instala en `node_modules` del entorno del contenedor.
- Gracias al volumen compartido (`..:/workspace`), también se actualizan los archivos de dependencias en su carpeta real del proyecto.

En este monorepo (usa `pnpm`), lo equivalente es:

```bash
# Frontend (Next.js)
docker compose -f infra/docker-compose.yml exec web sh -lc "pnpm --filter @fideicomiso/web add nombre-de-la-libreria"

# Backend (NestJS)
docker compose -f infra/docker-compose.yml exec api sh -lc "pnpm --filter @fideicomiso/api add nombre-de-la-libreria"
```

Después, versionar cambios:

```bash
git add apps/web/package.json apps/api/package.json pnpm-lock.yaml
git commit -m "chore: agregar dependencia"
git push
```

---

## 7) Troubleshooting

### Error: puerto 5432 ocupado

Este setup ya publica Postgres en `5433`. Si aún hay conflicto, verifica que no exista otro contenedor usando `5433`.

### Prisma/OpenSSL warning o `Schema engine error`

La imagen API ya instala `openssl` en [infra/docker/api.Dockerfile.dev](infra/docker/api.Dockerfile.dev). Si persiste:

```bash
docker compose -f infra/docker-compose.yml down
docker compose -f infra/docker-compose.yml build --no-cache api
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up
```

### Error `Cannot find module /workspace/apps/api/dist/main`

Se mitiga limpiando `dist` y `tsbuildinfo` al iniciar API (ya configurado en [infra/docker-compose.yml](infra/docker-compose.yml)).

### Error Next: `Invalid project directory ... /--hostname`

Se corrige ejecutando Next con `pnpm exec next dev --hostname 0.0.0.0 --port 3000` (ya aplicado en [infra/docker-compose.yml](infra/docker-compose.yml)).

---

## 8) Flujo recomendado para equipo (macOS/Win11)

1. `git pull`
2. `cp infra/.env.docker.example infra/.env.docker` (solo primera vez)
3. Ajustar secretos (`NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY` si aplica)
4. `docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up --build`
5. Trabajar en código
6. Si cambian dependencias o Dockerfiles: rebuild

Con este flujo todos ejecutan el mismo entorno y se reducen diferencias por sistema operativo.