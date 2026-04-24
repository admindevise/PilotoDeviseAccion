import { type AgentConfig, type AgentResult, Models, callAgent } from '../client';
import { CategoriaHallazgo, TipoHallazgo } from '@fideicomiso/shared';
import type {
  RevenueOpportunity,
  ReconciliationResult,
  AnomalyResult,
  MacroVariableInput,
} from '../pipelines/types';

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un agente especializado en identificar oportunidades de revenue no cobrado en operaciones fiduciarias colombianas.

Tu objetivo es analizar los resultados de conciliación y anomalías para identificar comisiones legítimamente cobrables que no se han facturado o cobrado.

## Escenarios de revenue

1. **ERROR_NO_FACTURADO**: Comisión contractual que debió facturarse pero no se hizo por error operativo.
   - Evidencia: La regla contractual es clara, el periodo ya venció, y no hay registro de factura.
   - Acción: Generar factura pendiente.

2. **DECISION_COMERCIAL**: Comisión que se dejó de cobrar por decisión comercial no documentada.
   - Evidencia: Patrón de cobro interrumpido sin otrosí ni comunicación formal.
   - Acción: Documentar la decisión o retomar el cobro.

3. **BASE_CONTRACTUAL_NO_FACTURADA**: Cláusula contractual que permite cobrar una comisión que nunca se ha activado.
   - Evidencia: El contrato permite cobrar (e.g., asistencia a comité) pero nunca se ha facturado.
   - Acción: Evaluar la activación del cobro.

## Criterios de confianza
- **Alta (>0.8)**: Cláusula contractual clara, cálculo preciso, sin ambigüedad.
- **Media (0.5-0.8)**: Cláusula interpretable, cálculo requiere supuestos.
- **Baja (<0.5)**: Requiere revisión legal o comercial antes de actuar.

## Formato de respuesta

Responde EXCLUSIVAMENTE con JSON válido:

{
  "oportunidades": [
    {
      "reglaComisionId": "<ID de la regla>",
      "montoEstimado": <monto en COP>,
      "baseLegal": "<cláusula o referencia contractual>",
      "confianza": <0-1>,
      "escenario": "ERROR_NO_FACTURADO | DECISION_COMERCIAL | BASE_CONTRACTUAL_NO_FACTURADA",
      "recomendacion": "<acción concreta sugerida>"
    }
  ],
  "resumen": {
    "totalOportunidades": <n>,
    "montoTotalEstimado": <monto total>,
    "porEscenario": {
      "ERROR_NO_FACTURADO": <n>,
      "DECISION_COMERCIAL": <n>,
      "BASE_CONTRACTUAL_NO_FACTURADA": <n>
    }
  }
}

## Reglas
- Solo incluye oportunidades con base contractual verificable.
- El monto estimado debe calcularse con las variables macro vigentes del periodo.
- Si el contrato tiene cláusula de exoneración o condonación, NO incluir como oportunidad.
- Prioriza las oportunidades de mayor monto y confianza.
`;

const AGENT_CONFIG: AgentConfig = {
  id: 'revenue-spotter',
  model: Models.SONNET,
  maxTokens: 4096,
  temperature: 0,
  systemPrompt: SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface SpotRevenueInput {
  reconciliationResults: ReconciliationResult[];
  anomalies: AnomalyResult[];
  macroVariables: MacroVariableInput[];
  periodo: string;
}

interface RevenueResponse {
  oportunidades: RevenueOpportunity[];
  resumen: {
    totalOportunidades: number;
    montoTotalEstimado: number;
    porEscenario: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function spotRevenue(
  input: SpotRevenueInput,
): Promise<AgentResult<RevenueOpportunity[]>> {
  const { reconciliationResults, anomalies, macroVariables, periodo } = input;

  // Filter to results that suggest missing revenue
  const relevantResults = reconciliationResults.filter(
    (r) => r.estado === 'NO_ENCONTRADO' || r.estado === 'NO_FACTURADO',
  );

  const relevantAnomalies = anomalies.filter(
    (a) =>
      a.tipo === TipoHallazgo.COMISION_NO_FACTURADA ||
      a.categoria === CategoriaHallazgo.REVENUE,
  );

  if (relevantResults.length === 0 && relevantAnomalies.length === 0) {
    return {
      data: [],
      reasoning: 'No se identificaron oportunidades de revenue en este periodo',
      confidence: 1,
      tokensUsed: { input: 0, output: 0 },
    };
  }

  const userMessage = [
    `## Periodo: ${periodo}`,
    '',
    '## Variables macroeconómicas',
    '```json',
    JSON.stringify(macroVariables, null, 2),
    '```',
    '',
    `## Resultados de conciliación con potencial de revenue (${relevantResults.length})`,
    '```json',
    JSON.stringify(relevantResults, null, 2),
    '```',
    '',
    `## Anomalías relacionadas con facturación (${relevantAnomalies.length})`,
    '```json',
    JSON.stringify(relevantAnomalies, null, 2),
    '```',
  ].join('\n');

  const result = await callAgent<RevenueResponse>(AGENT_CONFIG, userMessage);

  return {
    data: result.data.oportunidades,
    reasoning: `Se identificaron ${result.data.oportunidades.length} oportunidades de revenue por ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(result.data.resumen.montoTotalEstimado)}`,
    confidence: result.confidence,
    tokensUsed: result.tokensUsed,
  };
}
