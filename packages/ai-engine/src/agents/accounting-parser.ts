import { type AgentConfig, type AgentResult, Models, callAgent } from '../client';
import type {
  NormalizedMovement,
  AccountingParseResult,
  ErpFormat,
} from '../pipelines/types';

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un agente especializado en parsear y normalizar datos contables de fideicomisos colombianos.

Tu tarea es recibir datos contables crudos (auxiliares contables, libros mayores) y producir un arreglo normalizado de movimientos.

## Formatos soportados

### 1. LEGACY_TSV (ERP antiguo)
- Formato tabular separado por tabuladores o pipes.
- Columnas típicas: Fecha | Cuenta | NombreCuenta | NIT | Tercero | TipoComprobante | NumComprobante | Concepto | Débito | Crédito | Saldo
- Los débitos y créditos están en columnas separadas.
- Puede usar separador decimal de coma (1.234.567,89) al estilo colombiano.

### 2. SIFI (Sistema Integrado Financiero)
- Formato más moderno, puede venir en CSV o TSV.
- Puede usar una sola columna de Valor donde negativos son créditos.
- Puede incluir columna de tipo D/C.
- Usa separador decimal de punto (1234567.89).

## Instrucciones

1. **Auto-detecta el formato**: Examina las primeras líneas para determinar si es LEGACY_TSV o SIFI.
2. **Maneja separadores decimales colombianos**:
   - Si el número usa coma como decimal: "1.234.567,89" → 1234567.89
   - Si el número usa punto como decimal: "1234567.89" → 1234567.89
   - Si hay ambigüedad, usa el contexto (si la mayoría de valores tienen coma antes de 2 decimales, la coma es decimal).
3. **Normaliza D/C**:
   - Si hay columnas separadas de Débito y Crédito, usa ambas.
   - Si hay una sola columna de Valor con indicador D/C, separa: D → débito, C → crédito.
   - Si SIFI usa negativos para créditos: valor negativo → crédito (valor absoluto), valor positivo → débito.
4. **Extrae el periodo contable** del encabezado o las fechas de los movimientos.
5. **Calcula totales** de débitos y créditos.
6. **Reporta advertencias** si hay datos inconsistentes, líneas no parseables, o saldos que no cuadran.

## Formato de respuesta

Responde EXCLUSIVAMENTE con un JSON válido:

{
  "formatoDetectado": "LEGACY_TSV" | "SIFI",
  "movimientos": [
    {
      "fecha": "YYYY-MM-DD",
      "cuenta": "<código cuenta PUC>",
      "nombreCuenta": "<nombre de la cuenta>",
      "terceroNit": "<NIT del tercero>",
      "terceroNombre": "<nombre del tercero>",
      "tipoComprobante": "<tipo>",
      "numeroComprobante": "<número>",
      "concepto": "<descripción>",
      "debito": <número>,
      "credito": <número>,
      "saldo": <número>,
      "periodoContable": "YYYY-MM",
      "lineaOriginal": <número de línea en el input>
    }
  ],
  "periodoDetectado": "YYYY-MM",
  "totalDebitos": <número>,
  "totalCreditos": <número>,
  "advertencias": ["<advertencia 1>", ...]
}

## Reglas estrictas
- TODOS los montos deben ser números (no strings).
- Las fechas deben estar en formato ISO YYYY-MM-DD.
- Si una línea no se puede parsear, inclúyela en advertencias y omítela de movimientos.
- Si no hay datos contables reconocibles, retorna un arreglo vacío con una advertencia explicativa.
- Preserva el número de línea original para trazabilidad.
`;

const AGENT_CONFIG: AgentConfig = {
  id: 'accounting-parser',
  model: Models.SONNET,
  maxTokens: 8192,
  temperature: 0,
  systemPrompt: SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface ParseAccountingInput {
  rawData: string;
  expectedPeriod?: string;
  fideicomisoContext?: string;
}

// ---------------------------------------------------------------------------
// Pre-processing helpers
// ---------------------------------------------------------------------------

/**
 * Heuristic to detect the ERP format before sending to the LLM.
 * This helps the agent focus on the right parsing strategy.
 */
export function detectErpFormat(rawData: string): ErpFormat {
  const firstLines = rawData.split('\n').slice(0, 10).join('\n').toLowerCase();

  // SIFI indicators
  if (
    firstLines.includes('sifi') ||
    firstLines.includes('sistema integrado') ||
    /\bvalor\b.*\b[dc]\b/i.test(firstLines) ||
    /[-]\d+[\d.,]+/.test(firstLines) // negative values
  ) {
    return 'SIFI';
  }

  // LEGACY_TSV indicators
  if (
    firstLines.includes('\t') ||
    firstLines.includes('|') ||
    /d[ée]bito.*cr[ée]dito/i.test(firstLines) ||
    /\d{1,3}\.\d{3}\.\d{3},\d{2}/.test(firstLines) // Colombian decimal format
  ) {
    return 'LEGACY_TSV';
  }

  return 'LEGACY_TSV'; // default
}

/**
 * Parse a Colombian-formatted number string to a JavaScript number.
 * Handles both "1.234.567,89" and "1234567.89" formats.
 */
export function parseColombianNumber(value: string): number {
  if (!value || value.trim() === '' || value.trim() === '-') return 0;

  let cleaned = value.trim();

  // Check if it uses Colombian format (dots as thousands, comma as decimal)
  // Pattern: digits with dots as thousands separators and comma before decimals
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned) || /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Just a comma decimal separator: "1234567,89"
    cleaned = cleaned.replace(',', '.');
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

// ---------------------------------------------------------------------------
// Main parsing function
// ---------------------------------------------------------------------------

/**
 * Parse raw accounting data into normalized movements.
 * Uses Sonnet for intelligent parsing of varying formats.
 */
export async function parseAccountingData(
  input: ParseAccountingInput,
): Promise<AgentResult<AccountingParseResult>> {
  const { rawData, expectedPeriod, fideicomisoContext } = input;

  const detectedFormat = detectErpFormat(rawData);

  // Truncate very large datasets, keeping header and enough rows for pattern detection
  const lines = rawData.split('\n');
  let dataToSend: string;

  if (lines.length > 500) {
    const header = lines.slice(0, 5).join('\n');
    const sample = lines.slice(5, 505).join('\n');
    dataToSend = `${header}\n${sample}\n\n[... ${lines.length - 505} líneas adicionales omitidas por tamaño ...]`;
  } else {
    dataToSend = rawData;
  }

  const userMessage = [
    `## Formato pre-detectado: ${detectedFormat}`,
    expectedPeriod ? `## Periodo esperado: ${expectedPeriod}` : '',
    fideicomisoContext ? `## Contexto del fideicomiso: ${fideicomisoContext}` : '',
    '',
    '## Datos contables crudos:',
    '',
    dataToSend,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await callAgent<AccountingParseResult>(AGENT_CONFIG, userMessage);

  // Post-processing: ensure all amounts are proper numbers
  result.data.movimientos = result.data.movimientos.map((mov) => ({
    ...mov,
    debito: typeof mov.debito === 'number' ? mov.debito : parseColombianNumber(String(mov.debito)),
    credito: typeof mov.credito === 'number' ? mov.credito : parseColombianNumber(String(mov.credito)),
    saldo: typeof mov.saldo === 'number' ? mov.saldo : parseColombianNumber(String(mov.saldo)),
  }));

  // Recalculate totals for accuracy
  const totalDebitos = result.data.movimientos.reduce((s, m) => s + m.debito, 0);
  const totalCreditos = result.data.movimientos.reduce((s, m) => s + m.credito, 0);
  result.data.totalDebitos = totalDebitos;
  result.data.totalCreditos = totalCreditos;

  return result;
}
