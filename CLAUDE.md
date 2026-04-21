# Plataforma Conciliación Fideicomisos - DIS

## Proyecto
MVP de conciliación integral de operaciones fiduciarias colombianas.
**Stack**: Next.js 14 (App Router) + NestJS + PostgreSQL + Prisma + Claude API (Anthropic)

## Estructura del Monorepo

```
fideicomiso-platform/
├── apps/
│   ├── web/           # Frontend Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
│   └── api/           # Backend NestJS (TypeScript, Prisma ORM)
├── packages/
│   ├── shared/        # Tipos compartidos, DTOs, validaciones Zod, constantes
│   └── ai-engine/     # Motor de AI: agentes, prompts, pipelines
├── infra/             # Docker, scripts de despliegue
├── CLAUDE.md          # Este archivo - contexto global del proyecto
├── turbo.json         # Configuración Turborepo
└── pnpm-workspace.yaml
```

## Comandos

- `pnpm dev` — Arranca frontend + backend en modo desarrollo
- `pnpm build` — Build de producción de todos los paquetes
- `pnpm test` — Ejecuta todos los tests (Vitest)
- `pnpm lint` — ESLint + Prettier
- `pnpm db:migrate` — Aplica migraciones Prisma
- `pnpm db:push` — Push schema a la BD (desarrollo)
- `pnpm db:seed` — Datos de prueba (fideicomisos piloto)
- `pnpm db:generate` — Genera cliente Prisma
- `pnpm db:studio` — Abre Prisma Studio

## Reglas de Arquitectura (Inviolables)

1. **API REST versionada**: Todos los endpoints bajo `/api/v1/`
2. **Respuesta estándar**: Siempre `{ data, error, meta }` — nunca retornar datos sueltos
3. **Validación con Zod**: Schemas definidos en `@fideicomiso/shared`, reutilizados en frontend y backend
4. **Patrón NestJS**: Cada módulo = controller + service + (repository si necesario)
5. **Tests**: Unitarios con Vitest, e2e con Playwright
6. **AI Engine**: Cada agente en su propio archivo con prompt + tools + parsing
7. **Idioma del código**: Variables y tipos en inglés, contenido de UI y comentarios de negocio en español
8. **Manejo de errores**: Usar excepciones NestJS (HttpException), interceptor global captura y formatea

## Modelo de Datos — Entidades Principales

### Fideicomisos
- `Fideicomiso` — Entidad raíz. Código Superintendencia (FA-XXXX, MR-XXXX, MG-XXXX)
- `CodigoFideicomiso` — Alias/códigos históricos (un fideicomiso puede tener múltiples códigos)
- `Fideicomitente` — Partes del fideicomiso con vigencia temporal
- `EventoTimeline` — Línea cronológica de eventos

### Contratos y Reglas
- `Contrato` — Contratos fiduciarios, otrosíes, contratos paralelos, cesiones
- `ReglaComision` — Reglas de comisiones extraídas con versionamiento temporal
  - Tipos: ADMINISTRACION_MENSUAL, CESION_DERECHOS, SUSCRIPCION_OTROSI, ASISTENCIA_COMITE, etc.
  - Fórmula referencia variables macro (ej: "4 SMMLV")
  - Vigencia temporal (effectiveFrom/Until)

### Documentos y Contabilidad
- `Documento` — Documentos cargados con clasificación automática y contexto del usuario
- `MovimientoContable` — Movimientos normalizados de auxiliares contables (dual ERP: legacy + SIFI)
- `Factura` / `Recaudo` — Facturación y recaudo con soporte N:1 (pagos parciales)

### Conciliación
- `Conciliacion` — Ejecución de conciliación por período
- `ResultadoConciliacion` — Resultado por comisión: CONCILIADO, DISCREPANCIA, NO_ENCONTRADO, etc.

### Hallazgos
- `Hallazgo` — Hallazgo con trazabilidad a fuentes, razonamiento AI, impacto económico
- `ResolucionHallazgo` — Resolución por usuario (descartar, explicar, adjuntar evidencia, escalar)

### Variables y Convenciones
- `VariableMacroeconomica` / `ValorHistoricoVariable` — SMMLV, IVA, TRM, etc. con históricos
- `ConvencionFideicomiso` — Convenciones contables, comerciales, operativas por fideicomiso

### Conocimiento
- `EntradaConocimiento` — Base de conocimiento progresiva con embeddings

## Convenciones de Código

### Backend (NestJS)
```typescript
// Controlador
@Controller('fideicomisos')
export class FideicomisoController {
  @Get()
  async findAll() { return { data: await this.service.findAll(), error: null }; }
}

// Servicio
@Injectable()
export class FideicomisoService {
  constructor(private prisma: PrismaService) {}
}
```

### Frontend (Next.js)
- App Router con layouts anidados
- Server Components por defecto, 'use client' solo cuando necesario
- Componentes UI en `src/components/ui/` (patrón shadcn/ui)
- API client en `src/lib/api.ts`

### AI Engine
- Cada agente: `agents/{nombre}.ts` con config + systemPrompt + función principal
- Prompts reutilizables: `prompts/`
- Pipelines de orquestación: `pipelines/`
- Modelos: Sonnet para tareas complejas, Haiku para clasificación rápida

## Decisiones de Arquitectura (ADRs)

### ADR-001: Monorepo con Turborepo
Turborepo + pnpm workspaces para builds incrementales y tipos compartidos.

### ADR-002: Prisma como ORM
Genera tipos TypeScript que se comparten entre backend y shared package.

### ADR-003: Doble modelo AI
Haiku para clasificación rápida (alto volumen), Sonnet para extracción/conciliación (precisión).

### ADR-004: Convenciones contables parametrizables
Cada fideicomiso define cómo se contabilizan sus comisiones (gasto directo, vía anticipo, pago externo).

### ADR-005: Variables macro con versionamiento temporal
SMMLV, IVA, TRM cambian en el tiempo. Cada cálculo referencia el valor vigente del período.

## Contexto de Negocio Clave

- **Comisiones fiduciarias** se expresan en SMMLV (ej: "4 SMMLV mensual")
- **SMMLV** cambia cada año: 2023=$1.160.000, 2024=$1.300.000, 2025=$1.423.500
- **IVA** actual: 19%
- **Convenciones contables**: comisión como gasto (cuenta 51151801001), como costo (cuenta 15203001001 vía anticipo 16320001001), o pago externo
- **Formatos de entrada**: PDFs firmados (ZIP disfrazados), auxiliares TSV/CSV (ERP legacy y SIFI), Excel, correos .msg (OLE2)
- **Fideicomisos piloto**: FA-5999 Vimarsa Colombia, Hotel B3 Virrey (FA-658 / 13527), FA-5931 Sautari
