# Backend API — NestJS

## Estructura
```
src/
├── main.ts                    # Entry point, global pipes, CORS
├── app.module.ts              # Root module
├── prisma/                    # Prisma service (global)
├── common/                    # Interceptors, guards, decorators
├── fideicomiso/               # CRUD fideicomisos, códigos, fideicomitentes
├── contrato/                  # Contratos y otrosíes
├── documento/                 # Upload, clasificación, extracción
├── conciliacion/              # Motor de conciliación
├── hallazgo/                  # Hallazgos y resoluciones
├── variable-macro/            # Variables macroeconómicas
├── convencion/                # Convenciones del fideicomiso
├── conocimiento/              # Base de conocimiento / RAG
├── revenue/                   # Revenue management
└── timeline/                  # Línea temporal
```

## Convenciones
- Cada módulo: controller + service + module
- Controllers delegan a services, no tienen lógica de negocio
- Todas las respuestas: `{ data, error, meta }`
- Rutas bajo `/api/v1/`
- Prisma inyectado via PrismaService (global module)
- Validación con class-validator en controllers, Zod en DTOs compartidos

## Comandos
- `pnpm dev` — NestJS watch mode
- `pnpm build` — Compilar TypeScript
- `pnpm test` — Vitest
- `prisma migrate dev` — Crear migración
- `prisma db push` — Push schema a BD
- `prisma generate` — Generar cliente
