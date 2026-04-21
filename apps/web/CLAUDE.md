# Frontend Web — Next.js 14

## Estructura
```
app/
├── globals.css                # Tailwind + CSS variables
├── layout.tsx                 # Root layout
├── page.tsx                   # Redirect to /dashboard
├── (dashboard)/               # Dashboard layout group
│   ├── layout.tsx             # Sidebar + Header
│   ├── dashboard/page.tsx     # Dashboard principal
│   ├── fideicomisos/          # Gestión de fideicomisos
│   ├── conciliacion/          # Motor de conciliación
│   ├── hallazgos/             # Gestión de hallazgos
│   ├── revenue/               # Revenue management
│   ├── conocimiento/          # Base de conocimiento
│   ├── variables-macro/       # Variables macroeconómicas
│   └── reportes/              # Reportes
src/
├── components/
│   ├── ui/                    # Componentes base (shadcn-style)
│   ├── layout/                # Sidebar, Header
│   ├── dashboard/             # Widgets del dashboard
│   ├── fideicomisos/          # Componentes de fideicomisos
│   └── hallazgos/             # Componentes de hallazgos
└── lib/
    ├── utils.ts               # cn(), formatCurrency(), formatDate()
    └── api.ts                 # Cliente API
```

## Convenciones
- App Router (no Pages Router)
- Server Components por defecto, 'use client' solo cuando necesario
- UI en español
- Tailwind CSS con variables CSS (tema shadcn/ui)
- Componentes UI siguen patrón shadcn: forwardRef, cn(), cva()
- API client en `src/lib/api.ts` con base URL configurable
