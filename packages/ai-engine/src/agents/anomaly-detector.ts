import { type AgentConfig, type AgentResult, Models, callAgent } from '../client';
import type {
  AnomalyResult,
  ReconciliationResult,
  NormalizedMovement,
  AccountingConvention,
} from '../pipelines/types';

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un agente de detección de anomalías contables en operaciones fiduciarias colombianas.

Tu objetivo es analizar los resultados de conciliación y movimientos contables para identificar patrones anómalos que merezcan investigación.

## Tipos de anomalía a detectar

1. **COMISION_NO_COBRADA**: Comisión contractual que nunca se facturó ni registró.
2. **DIFERENCIA_MONTO**: Diferencia significativa entre monto esperado y registrado.
3. **DUPLICADO_CONTABLE**: Mismo concepto registrado más de una vez en el mismo periodo.
4. **REGISTRO_FUERA_PERIODO**: Movimiento contable registrado en periodo distinto al esperado.
5. **CUENTA_INCORRECTA**: Comisión registrada en cuenta contable que no corresponde según convención.
6. **PATRON_IRREGULAR**: Cambios bruscos en montos o frecuencia respecto a periodos anteriores.
7. **IVA_INCORRECTO**: IVA calculado con tasa incorrecta (diferente al 19%).
8. **SIN_SOPORTE_FACTURA**: Movimiento contable sin número de factura asociado.
9. **SMMLV_DESACTUALIZADO**: Cálculo que parece usar un SMMLV de año anterior.
10. **CONVENCION_INCONSISTENTE**: Registro que contradice la convención contable del fideicomiso.

## Severidad
- **CRITICA**: Impacto económico > 5 SMMLV o posible error regulatorio.
- **ALTA**: Impacto económico entre 2-5 SMMLV o afecta múltiples periodos.
- **MEDIA**: Impacto económico entre 0.5-2 SMMLV o patrón menor repetitivo.
- **BAJA**: Impacto < 0.5 SMMLV, diferencias de redondeo significativas pero no materiales.
- **INFORMATIVA**: Observaciones que no implican error pero vale la pena documentar.

## Categoría
- **FACTURACION**: Relacionado con facturación o cobro de comisiones.
- **CONTABLE**: Relacionado con registros contables o cuentas.
- **CONTRACTUAL**: Relacionado con interpretación contractual.
- **OPERATIVA**: Relacionado con procesos operativos del fideicomiso.

## Formato de respuesta

Responde EXCLUSIVAMENTE con JSON válido:

{
  "anomalias": [
    {
      "tipo": "<TipoHallazgo>",
      "severidad": "<CRITICA|ALTA|MEDIA|BAJA|INFORMATIVA>",
      "categoria": "<FACTURACION|CONTABLE|CONTRACTUAL|OPERATIVA>",
      "descripcion": "<descripción clara del hallazgo>",
      "evidencia": ["<referencia a movimiento o regla>"],
      "impactoEconomico": <número o null>,
      "recomendacion": "<acción sugerida>"
    }
  ]
}

## Reglas
- Solo reporta anomalías con evidencia concreta, no suposiciones.
- Prioriza hallazgos de mayor impacto económico.
- Explica cada hallazgo de forma comprensible para un gerente fiduciario.
`;

const AGENT_CONFIG: AgentConfig = {
  id: 'anomaly-detector',
  model: Models.SONNET,
  maxTokens: 4096,
  temperature: 0,
  systemPrompt: SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface DetectAnomaliesInput {
  reconciliationResults: ReconciliationResult[];
  movements: NormalizedMovement[];
  convention: AccountingConvention;
  periodo: string;
}

interface AnomalyResponse {
  anomalias: AnomalyResult[];
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function detectAnomalies(
  input: DetectAnomaliesInput,
): Promise<AgentResult<AnomalyResult[]>> {
  const { reconciliationResults, movements, convention, periodo } = input;

  const userMessage = [
    `## Periodo: ${periodo}`,
    '',
    '## Convención contable',
    `- Cuenta GASTO: ${convention.cuentaGasto}`,
    `- Cuenta COSTO: ${convention.cuentaCosto}`,
    `- Cuenta ANTICIPO: ${convention.cuentaAnticipo}`,
    '',
    `## Resultados de conciliación (${reconciliationResults.length} reglas)`,
    '```json',
    JSON.stringify(reconciliationResults, null, 2),
    '```',
    '',
    `## Movimientos contables del periodo (${movements.length})`,
    '```json',
    JSON.stringify(
      movements.map((m) => ({
        fecha: m.fecha,
        cuenta: m.cuenta,
        nombreCuenta: m.nombreCuenta,
        concepto: m.concepto,
        debito: m.debito,
        credito: m.credito,
        tipoComprobante: m.tipoComprobante,
        numeroComprobante: m.numeroComprobante,
        lineaOriginal: m.lineaOriginal,
      })),
      null,
      2,
    ),
    '```',
  ].join('\n');

  const result = await callAgent<AnomalyResponse>(AGENT_CONFIG, userMessage);

  return {
    data: result.data.anomalias,
    reasoning: `Se detectaron ${result.data.anomalias.length} anomalías en el periodo ${periodo}`,
    confidence: result.confidence,
    tokensUsed: result.tokensUsed,
  };
}
