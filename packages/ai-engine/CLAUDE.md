# AI Engine — Motor de Inteligencia Artificial

## Estructura
```
src/
├── client.ts                  # Anthropic SDK client wrapper
├── agents/
│   ├── document-classifier.ts # Clasificación de documentos (Haiku)
│   ├── contract-extractor.ts  # Extracción de reglas de contratos (Sonnet)
│   ├── accounting-parser.ts   # Parser de auxiliares contables (Sonnet)
│   ├── commission-matcher.ts  # Motor de conciliación (Sonnet)
│   ├── anomaly-detector.ts    # Detección de anomalías (Sonnet)
│   ├── revenue-spotter.ts     # Oportunidades de revenue (Sonnet)
│   └── knowledge-agent.ts     # Consultas RAG (Haiku)
├── prompts/
│   ├── taxonomy.ts            # Taxonomía de comisiones fiduciarias
│   └── few-shot.ts            # Ejemplos de extracción
├── pipelines/
│   ├── types.ts               # Tipos del pipeline
│   └── reconciliation-pipeline.ts  # Pipeline principal
└── index.ts
```

## Modelos
- **Haiku** (claude-haiku-4-5-20241022): Clasificación rápida, consultas RAG
- **Sonnet** (claude-sonnet-4-5-20250514): Extracción, conciliación, detección

## Principios
- Cada agente: config + systemPrompt + función principal
- Temperature 0 para extracción determinista
- Contexto mínimo necesario por agente
- Validación humana obligatoria para reglas extraídas
- Knowledge Base consultada antes de generar hallazgos
