import type { ReglaComision } from '@fideicomiso/shared';
import { type AgentConfig, type AgentResult, Models, callAgent } from '../client';
import type {
  NormalizedMovement,
  ReconciliationResult,
  MacroVariableInput,
  AccountingConvention,
} from '../pipelines/types';
import { DEFAULT_ACCOUNTING_CONVENTION } from '../pipelines/types';

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un agente de conciliación de comisiones fiduciarias colombianas.

Tu tarea es cruzar las reglas de comisión contractuales con los movimientos contables reales para determinar si cada comisión fue registrada correctamente.

## Proceso de conciliación

Para CADA regla de comisión:

1. **Calcula el monto esperado**:
   - Aplica la fórmula de la regla usando las variables macroeconómicas proporcionadas.
   - Ejemplo: "2.5 × SMMLV + IVA" con SMMLV = 1,300,000 → 2.5 × 1,300,000 × 1.19 = 3,867,500
   - Para fórmulas tipo "mayor_entre", calcula ambas opciones y toma la mayor.
   - IVA en Colombia: 19%.

2. **Busca el movimiento contable correspondiente**:
   - Usa la convención contable del fideicomiso para determinar la cuenta correcta:
     - GASTO: buscar en cuenta de comisiones por gasto (ej: 51151801001)
     - COSTO: buscar en cuenta de comisiones por costo (ej: 15203001001)
     - ANTICIPO: buscar en cuenta de anticipos (ej: 16320001001)
   - Busca movimientos en el periodo correcto cuyo concepto coincida con el tipo de comisión.
   - El monto registrado puede estar en débito o crédito según el flujo contable.

3. **Compara y determina el estado**:
   - **CONCILIADO**: Monto registrado coincide con el esperado (dentro de la tolerancia).
   - **DISCREPANCIA**: Hay un registro pero el monto difiere más allá de la tolerancia.
   - **NO_ENCONTRADO**: No hay movimiento contable para esta comisión en el periodo.
   - **NO_FACTURADO**: La comisión debería haberse cobrado según el contrato, pero no hay evidencia de facturación ni registro contable.

4. **Tolerancia por redondeo**: Diferencias de hasta {tolerancia} pesos se consideran dentro del rango aceptable.

## Formato de respuesta

Responde EXCLUSIVAMENTE con un JSON válido:

{
  "resultados": [
    {
      "reglaComisionId": "<ID de la regla>",
      "periodo": "YYYY-MM",
      "estado": "CONCILIADO | DISCREPANCIA | NO_ENCONTRADO | NO_FACTURADO",
      "montoEsperado": <número>,
      "montoRegistrado": <número (0 si no encontrado)>,
      "discrepancia": <diferencia absoluta>,
      "evidencia": {
        "fuenteRegla": "<referencia a la cláusula>",
        "fuenteContable": "<línea o comprobante encontrado>",
        "lineaAuxiliar": <número de línea o null>,
        "numeroFactura": "<número de factura si se detecta>",
        "cuentaContable": "<cuenta donde se encontró>"
      },
      "confianza": <0-1>,
      "razonamiento": "<explicación del match o la discrepancia>"
    }
  ],
  "resumen": {
    "totalReglas": <n>,
    "conciliados": <n>,
    "discrepancias": <n>,
    "noEncontrados": <n>,
    "noFacturados": <n>
  }
}

## Reglas estrictas
- NUNCA inventes movimientos contables.
- Si hay múltiples movimientos que podrían corresponder a una regla, elige el de mayor confianza y explica por qué.
- Para comisiones POR_EVENTO o UNICA, busca en el periodo completo del contrato, no solo mensual.
- Los montos SIEMPRE deben ser números positivos.
- El campo discrepancia es: |montoEsperado - montoRegistrado|.
`;

const AGENT_CONFIG: AgentConfig = {
  id: 'commission-matcher',
  model: Models.SONNET,
  maxTokens: 8192,
  temperature: 0,
  systemPrompt: SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface MatchCommissionsInput {
  rules: ReglaComision[];
  movements: NormalizedMovement[];
  macroVariables: MacroVariableInput[];
  convention: AccountingConvention;
  periodo: string;
  tolerancePesos?: number;
}

interface MatcherResponse {
  resultados: ReconciliationResult[];
  resumen: {
    totalReglas: number;
    conciliados: number;
    discrepancias: number;
    noEncontrados: number;
    noFacturados: number;
  };
}

// ---------------------------------------------------------------------------
// Helper: calculate expected amount locally for validation
// ---------------------------------------------------------------------------

export function calculateExpectedAmount(
  rule: ReglaComision,
  macroVariables: MacroVariableInput[],
  ivaRate: number = 0.19,
): number | null {
  const detail = rule.formulaDetalle;
  if (!detail) return null;

  const baseLower = detail.base.toLowerCase();

  // Resolve the base value
  let baseValue: number | null = null;

  if (baseLower === 'smmlv' || baseLower.includes('salario m')) {
    const smmlv = macroVariables.find(
      (v) => v.codigo.toUpperCase() === 'SMMLV',
    );
    if (smmlv) baseValue = smmlv.valor;
  } else {
    // Try to parse a numeric base
    const parsed = parseFloat(detail.base.replace(/[^0-9.,-]/g, '').replace(',', '.'));
    if (!isNaN(parsed)) baseValue = parsed;
  }

  if (baseValue === null) return null;

  let amount: number;
  if (detail.tipo === 'fijo') {
    amount = detail.multiplicador * baseValue;
  } else if (detail.tipo === 'porcentaje') {
    amount = detail.multiplicador * baseValue;
  } else {
    // mayor_entre – we can only compute one side without more info
    amount = detail.multiplicador * baseValue;
  }

  // Check if the formula mentions IVA
  const formulaUpper = rule.formula.toUpperCase();
  if (formulaUpper.includes('IVA') || formulaUpper.includes('+ IVA')) {
    amount *= 1 + ivaRate;
  }

  return Math.round(amount * 100) / 100;
}

// ---------------------------------------------------------------------------
// Main reconciliation function
// ---------------------------------------------------------------------------

/**
 * Reconcile commission rules against accounting movements using the LLM
 * for intelligent matching and reasoning.
 */
export async function matchCommissions(
  input: MatchCommissionsInput,
): Promise<AgentResult<ReconciliationResult[]>> {
  const {
    rules,
    movements,
    macroVariables,
    convention,
    periodo,
    tolerancePesos = 1000,
  } = input;

  // Pre-calculate expected amounts for each rule
  const rulesWithExpected = rules.map((rule) => ({
    id: rule.id,
    tipo: rule.tipo,
    nombre: rule.nombre,
    formula: rule.formula,
    formulaDetalle: rule.formulaDetalle,
    periodicidad: rule.periodicidad,
    clausulaFuente: rule.clausulaFuente,
    montoEsperadoCalculado: calculateExpectedAmount(rule, macroVariables),
  }));

  // Filter movements to relevant accounts
  const relevantAccounts = [
    convention.cuentaGasto,
    convention.cuentaCosto,
    convention.cuentaAnticipo,
  ];

  const relevantMovements = movements.filter(
    (m) =>
      relevantAccounts.some((acct) => m.cuenta.startsWith(acct)) &&
      m.periodoContable === periodo,
  );

  const userMessage = [
    `## Periodo de conciliación: ${periodo}`,
    `## Tolerancia por redondeo: ${tolerancePesos} COP`,
    '',
    '## Convención contable del fideicomiso',
    `- Cuenta GASTO: ${convention.cuentaGasto}`,
    `- Cuenta COSTO: ${convention.cuentaCosto}`,
    `- Cuenta ANTICIPO: ${convention.cuentaAnticipo}`,
    '',
    '## Variables macroeconómicas',
    '```json',
    JSON.stringify(macroVariables, null, 2),
    '```',
    '',
    `## Reglas de comisión (${rulesWithExpected.length} reglas)`,
    '```json',
    JSON.stringify(rulesWithExpected, null, 2),
    '```',
    '',
    `## Movimientos contables relevantes (${relevantMovements.length} de ${movements.length} total)`,
    '```json',
    JSON.stringify(
      relevantMovements.map((m) => ({
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

  // Inject tolerance into the system prompt
  const configWithTolerance: AgentConfig = {
    ...AGENT_CONFIG,
    systemPrompt: AGENT_CONFIG.systemPrompt.replace(
      '{tolerancia}',
      String(tolerancePesos),
    ),
  };

  const result = await callAgent<MatcherResponse>(configWithTolerance, userMessage);

  return {
    data: result.data.resultados,
    reasoning: `Conciliación: ${result.data.resumen.conciliados} conciliados, ${result.data.resumen.discrepancias} discrepancias, ${result.data.resumen.noEncontrados} no encontrados, ${result.data.resumen.noFacturados} no facturados`,
    confidence: result.confidence,
    tokensUsed: result.tokensUsed,
  };
}
