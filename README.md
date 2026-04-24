# Piloto-FiduConciliation

Plataforma MVP de conciliación integral de operaciones fiduciarias colombianas. Cruza reglas de comisión contractuales contra movimientos contables reales utilizando agentes de IA (Claude) para detectar discrepancias, anomalías y oportunidades de revenue no cobrado.

## 🚀 Entorno de Demostración (Demo Branch)

Este repositorio contiene la rama `demo`, la cual está configurada con datos de prueba, autenticación estática y está optimizada para despliegues rápidos en Vercel (Frontend) y Railway (Backend/Database).

### Credenciales de Acceso

Para acceder a la plataforma web de demostración, utilice cualquiera de las siguientes credenciales:

| Rol | Correo (Usuario) | Contraseña |
|-----|------------------|------------|
| **Gerente de Fideicomiso** | `gerente@dis.com.co` | `SecureGerente2026*` |
| **Mónica (Gerente Fideicomiso)** | `monica.abogado@accion.co` | `SecureMonica2026*` |
| **Analista Contable** | `analista@dis.com.co` | `SecureAnalista2026*` |
| **Administrador DIS** | `admin@dis.com.co` | `SecureAdmin2026*` |
| **Acceso Genérico** | `demo@fidu.com` | `fidu2026` |

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui. Autenticación con NextAuth. |
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Base de datos | PostgreSQL 16 |
| Cache/Colas | Redis 7 |
| IA | Claude API (Anthropic) — Haiku para clasificación, Sonnet para extracción/conciliación |
| Monorepo | Turborepo + pnpm workspaces |

## Estructura del Monorepo

```
fideicomiso-platform/
├── apps/
│   ├── web/                 # Frontend Next.js
│   │   ├── app/             # App Router (dashboard, fideicomisos, conciliacion, hallazgos, documentos)
│   │   └── src/components/  # UI (shadcn), layout, dashboard widgets
│   └── api/                 # Backend NestJS
│       ├── prisma/          # Schema (25+ modelos) + seed data
│       └── src/             # Módulos: fideicomiso, contrato, documento, conciliacion,
│                            #   hallazgo, variable-macro, convencion, conocimiento,
│                            #   revenue, timeline
├── packages/
│   ├── shared/              # Tipos TypeScript, DTOs Zod, constantes
│   └── ai-engine/           # Motor de IA: 6 agentes + pipeline de conciliación
├── infra/                   # Docker Compose (PostgreSQL + Redis)
├── CLAUDE.md                # Contexto de arquitectura para asistente IA
└── turbo.json               # Configuración Turborepo
```

## Requisitos Previos

- **Node.js** >= 20
- **pnpm** >= 9
- **Docker** y **Docker Compose** (para PostgreSQL y Redis)

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/AFHI/Piloto-FiduConciliation.git
cd Piloto-FiduConciliation

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu ANTHROPIC_API_KEY y credenciales de BD

# 4. Levantar servicios de infraestructura
docker compose -f infra/docker-compose.yml up -d

# 5. Aplicar esquema de base de datos
pnpm db:push

# 6. Cargar datos de prueba (fideicomisos piloto)
pnpm db:seed

# 7. Iniciar en modo desarrollo
pnpm dev
```

La aplicación estará disponible en:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api/v1
- **Prisma Studio**: `pnpm db:studio` (explorador visual de BD)

## Ejecución del Proyecto

### 1. Infraestructura (PostgreSQL + Redis)

```bash
# Iniciar los contenedores
docker compose -f infra/docker-compose.yml up -d

# Verificar que estén corriendo
docker compose -f infra/docker-compose.yml ps
```

Los servicios quedan disponibles en:

| Servicio | Puerto | Credenciales |
|----------|--------|-------------|
| PostgreSQL 16 | `localhost:5432` | user: `postgres`, password: `postgres`, db: `fideicomiso_platform` |
| Redis 7 | `localhost:6379` | sin autenticación |

Para detener los servicios:

```bash
docker compose -f infra/docker-compose.yml down

# Para eliminar también los volúmenes de datos:
docker compose -f infra/docker-compose.yml down -v
```

### 1.1 Proyecto completo solo con Docker (frontend + backend + db + redis)

Si no quiere instalar Node/pnpm localmente (equipo mixto macOS/Windows), use el compose de `infra`:

```bash
# Copiar variables para Docker
cp infra/.env.docker.example infra/.env.docker

# Levantar TODO el monorepo
docker compose -f infra/docker-compose.yml --env-file infra/.env.docker up --build
```

Servicios:

| Servicio | URL/puerto |
|----------|------------|
| Frontend (Next.js) | http://localhost:3000 |
| API (NestJS) | http://localhost:4000/api/v1 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6379 |

Notas:
- Este flujo usa [infra/docker-compose.yml](infra/docker-compose.yml).
- Las imágenes de app se construyen desde [infra/docker/api.Dockerfile.dev](infra/docker/api.Dockerfile.dev) y [infra/docker/web.Dockerfile.dev](infra/docker/web.Dockerfile.dev).
- El backend ejecuta `prisma generate` y `prisma db push` al iniciar en modo desarrollo.

Para correr el stack en modo producción con Docker:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file infra/.env.docker.prod up --build -d
```

En este modo se usan [infra/docker/api.Dockerfile.prod](infra/docker/api.Dockerfile.prod) y [infra/docker/web.Dockerfile.prod](infra/docker/web.Dockerfile.prod).

### 2. Base de Datos

```bash
# Generar el cliente Prisma (necesario después de cambios al schema)
pnpm db:generate

# Aplicar el schema a la base de datos (modo desarrollo, sin migraciones)
pnpm db:push

# Cargar datos de prueba: 3 fideicomisos piloto, variables macro (SMMLV, IVA),
# contratos, reglas de comisión, usuarios y eventos de timeline
pnpm db:seed

# Explorar la BD visualmente con Prisma Studio (abre en http://localhost:5555)
pnpm db:studio
```

Para trabajar con migraciones en lugar de `db:push`:

```bash
# Crear una migración a partir de cambios en schema.prisma
pnpm db:migrate
```

### 3. Modo Desarrollo (frontend + backend simultáneos)

```bash
# Arranca ambas apps en paralelo via Turborepo
pnpm dev
```

Esto inicia:
- **API NestJS** en http://localhost:4000 (hot-reload con `nest start --watch`)
- **Frontend Next.js** en http://localhost:3000 (hot-reload nativo de Next.js)

Para arrancar cada servicio por separado:

```bash
# Solo el backend
pnpm --filter @fideicomiso/api dev

# Solo el frontend
pnpm --filter @fideicomiso/web dev
```

### 4. Variables de Entorno

Copiar el archivo de ejemplo y ajustar los valores:

```bash
cp .env.example .env
```

| Variable | Requerida | Valor por defecto | Descripción |
|----------|-----------|-------------------|-------------|
| `DATABASE_URL` | Si | `postgresql://postgres:postgres@localhost:5432/fideicomiso_platform` | Conexión a PostgreSQL |
| `ANTHROPIC_API_KEY` | Si (para IA) | — | API key de Anthropic para los agentes de conciliación |
| `API_PORT` | No | `4000` | Puerto del backend NestJS |
| `WEB_PORT` | No | `3000` | Puerto del frontend Next.js |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Origen permitido para CORS |
| `REDIS_URL` | No | `redis://localhost:6379` | Conexión a Redis |
| `S3_BUCKET` | No | `fideicomiso-docs` | Bucket S3 para almacenamiento de documentos |
| `S3_REGION` | No | `us-east-1` | Región del bucket S3 |
| `S3_ENDPOINT` | No | — | Endpoint S3 (para MinIO local u otros compatibles) |
| `S3_ACCESS_KEY` | No | — | Access key S3 |
| `S3_SECRET_KEY` | No | — | Secret key S3 |
| `NODE_ENV` | No | `development` | Entorno de ejecución |

> **Nota:** La plataforma funciona sin `ANTHROPIC_API_KEY` para navegación, CRUD y visualización. La clave solo es necesaria al ejecutar conciliaciones (pipeline de IA) o clasificar documentos.

### 5. Build de Producción

```bash
# Compilar todos los paquetes (shared, ai-engine, api, web)
pnpm build

# Iniciar el backend en modo producción
pnpm --filter @fideicomiso/api start:prod

# Iniciar el frontend en modo producción
pnpm --filter @fideicomiso/web start
```

### 6. Tests y Linting

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar linters
pnpm lint

# Formatear código
pnpm format
```

### 7. Verificar que Todo Funciona

Una vez arrancado con `pnpm dev`:

```bash
# El frontend debe cargar el dashboard
curl -s http://localhost:3000 | head -20

# La API debe responder con el formato { data, error, meta }
curl -s http://localhost:4000/api/v1/fideicomisos | python3 -m json.tool

# Si ejecutó el seed, debe ver los 3 fideicomisos piloto
curl -s http://localhost:4000/api/v1/fideicomisos
```

Navegue a http://localhost:3000 para acceder al dashboard. Desde ahí puede:
- Ver los fideicomisos piloto en `/fideicomisos`
- Ejecutar una conciliación en `/conciliacion` (requiere `ANTHROPIC_API_KEY`)
- Ver hallazgos en `/hallazgos`
- Cargar documentos en `/documentos`

## Comandos Principales

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Arranca frontend + backend en modo desarrollo |
| `pnpm build` | Build de producción de todos los paquetes |
| `pnpm test` | Ejecuta tests (Vitest) |
| `pnpm lint` | ESLint + Prettier |
| `pnpm format` | Formatea código con Prettier |
| `pnpm db:migrate` | Aplica migraciones Prisma |
| `pnpm db:push` | Push schema a la BD (desarrollo) |
| `pnpm db:seed` | Datos de prueba (fideicomisos piloto) |
| `pnpm db:generate` | Genera cliente Prisma |
| `pnpm db:studio` | Abre Prisma Studio |

## Arquitectura de la IA

El motor de conciliación ejecuta un pipeline de 6 fases orquestado por agentes especializados:

```
Documentos ──► [1. Clasificar] ──► [2. Extraer Reglas] ──► [3. Parsear Contabilidad]
                   (Haiku)            (Sonnet)                  (Sonnet)
                      │                    │                        │
                      ▼                    ▼                        ▼
               Tipo documento      Reglas comisión          Movimientos normalizados
                                                                    │
                                                                    ▼
                                                          [4. Conciliar]
                                                             (Sonnet)
                                                                │
                                                    ┌───────────┴───────────┐
                                                    ▼                       ▼
                                          [5a. Anomalías]         [5b. Revenue]
                                             (Sonnet)               (Sonnet)
                                                    │                       │
                                                    └───────────┬───────────┘
                                                                ▼
                                                     [6. Filtro Conocimiento]
                                                                │
                                                                ▼
                                                     Reporte de Conciliación
```

### Agentes

| Agente | Modelo | Función |
|--------|--------|---------|
| `document-classifier` | Haiku | Clasifica documentos por firma binaria + LLM (12 tipos) |
| `contract-extractor` | Sonnet | Extrae reglas de comisión de contratos con confianza |
| `accounting-parser` | Sonnet | Parsea auxiliares contables (ERP legacy TSV + SIFI) |
| `commission-matcher` | Sonnet | Cruza reglas vs. movimientos, calcula montos esperados |
| `anomaly-detector` | Sonnet | Detecta 10 tipos de anomalías contables |
| `revenue-spotter` | Sonnet | Identifica oportunidades de revenue no cobrado |

## Modelo de Datos

Las entidades principales del sistema son:

- **Fideicomiso** — Entidad raíz con código Superintendencia (FA-XXXX, MR-XXXX)
- **Contrato / ReglaComision** — Contratos fiduciarios y reglas de comisión con vigencia temporal
- **Documento** — Documentos cargados con clasificación automática
- **MovimientoContable** — Movimientos normalizados (dual ERP: legacy + SIFI)
- **Conciliacion / ResultadoConciliacion** — Ejecución y resultados por período
- **Hallazgo / ResolucionHallazgo** — Hallazgos con trazabilidad, impacto económico y resolución
- **VariableMacroeconomica** — SMMLV, IVA, TRM con versionamiento temporal
- **ConvencionFideicomiso** — Convenciones contables parametrizables por fideicomiso

## Fideicomisos Piloto

El seed incluye 3 fideicomisos de prueba:

| Código | Nombre | Descripción |
|--------|--------|-------------|
| FA-5999 | Vimarsa Colombia | Administración y pagos, con cesión y otrosí que duplica comisión |
| FA-658 | Hotel B3 Virrey | Administración hotelera, múltiples códigos históricos (13527) |
| FA-5931 | Sautari | Administración con comisiones variables por monetización |

## Contexto de Negocio

- Las comisiones fiduciarias se expresan en **SMMLV** (ej: "4 SMMLV mensual + IVA")
- **SMMLV 2025**: $1.423.500 COP | **IVA**: 19%
- Los formatos de entrada incluyen: PDFs firmados (ZIP disfrazados), auxiliares TSV/CSV, Excel, correos .msg
- Cada fideicomiso define **convenciones contables** propias (gasto directo, vía anticipo, pago externo)

## API Endpoints

Todos los endpoints bajo `/api/v1/`. Respuesta estándar: `{ data, error, meta }`.

### Fideicomisos
- `GET /fideicomisos` — Listar fideicomisos
- `GET /fideicomisos/:id` — Detalle de fideicomiso
- `POST /fideicomisos` — Crear fideicomiso

### Conciliación
- `GET /conciliaciones` — Listar conciliaciones
- `POST /fideicomisos/:id/conciliaciones` — Ejecutar conciliación (dispara pipeline IA)
- `GET /conciliaciones/:id/resultados` — Resultados de conciliación

### Documentos
- `POST /fideicomisos/:id/documentos` — Cargar documento (clasificación automática)
- `GET /fideicomisos/:id/documentos` — Listar documentos

### Hallazgos
- `GET /hallazgos` — Listar hallazgos
- `GET /hallazgos/:id` — Detalle de hallazgo

### Revenue
- `GET /revenue/opportunities` — Oportunidades de revenue
- `GET /revenue/summary` — Resumen por categoría

### Variables Macro
- `GET /variables-macro` — Variables macroeconómicas con históricos

### Timeline
- `GET /fideicomisos/:id/timeline` — Línea de tiempo del fideicomiso

## Licencia

Proyecto privado — DIS / AFHI.
