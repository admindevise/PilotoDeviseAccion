import type { ReglaComision } from '@fideicomiso/shared';
import { type AgentConfig, type AgentResult, Models, callAgent } from '../client';
import { COMMISSION_TAXONOMY } from '../prompts/taxonomy';
import { FEW_SHOT_EXTRACTION_EXAMPLES } from '../prompts/few-shot';
import type { ExtractedCommissionRule } from '../pipelines/types';

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un agente experto en extracción de reglas de comisiones de contratos de fiducia mercantil colombianos.

Tu misión es leer el texto de un contrato (o un otrosí) y extraer TODAS las reglas de comisión que aparecen, produciendo un arreglo JSON estructurado.

## Taxonomía de comisiones
${COMMISSION_TAXONOMY}

## Instrucciones detalladas

1. Lee cuidadosamente todo el texto del contrato.
2. Identifica cada cláusula, parágrafo o sección donde se mencione una comisión, honorario, remuneración o pago a favor de la fiduciaria.
3. Para cada comisión encontrada, extrae:
   - **tipo**: Clasifica según la taxonomía anterior. Si no encaja, usa "OTRA".
   - **nombre**: Nombre descriptivo de la comisión.
   - **formula**: Expresión de la fórmula en texto (ej: "2.5 × SMMLV + IVA").
   - **formulaDetalle**: Objeto con base, multiplicador, tipo (fijo/porcentaje/mayor_entre) y condiciones.
   - **periodicidad**: MENSUAL, TRIMESTRAL, SEMESTRAL, ANUAL, POR_EVENTO, o UNICA.
   - **condiciones**: Texto con las condiciones de aplicación.
   - **clausulaFuente**: Citación EXACTA de la cláusula (nombre y número).
   - **confianzaExtraccion**: Número entre 0 y 1. Si la redacción es ambigua o la fórmula no es clara, asigna < 0.7.
   - **notaRevision**: Si la confianza es < 0.7 o hay ambigüedad, explica qué aspecto requiere revisión humana. Si todo es claro, usa null.

4. Si el contrato también tiene reglas existentes previamente extraídas, compáralas y señala si hay cambios o nuevas comisiones.

5. Si un otrosí modifica una comisión existente, indica que la regla anterior queda sin efecto y provee la nueva regla completa.

## Formato de respuesta

Responde EXCLUSIVAMENTE con un JSON válido (sin texto adicional), con la siguiente estructura:

{
  "reglas": [
    {
      "tipo": "<TIPO_COMISION>",
      "nombre": "<nombre descriptivo>",
      "formula": "<fórmula en texto>",
      "formulaDetalle": {
        "base": "<base de cálculo>",
        "multiplicador": <número>,
        "tipo": "<fijo|porcentaje|mayor_entre>",
        "condiciones": "<condiciones adicionales o null>"
      },
      "periodicidad": "<PERIODICIDAD>",
      "condiciones": "<condiciones de aplicación>",
      "clausulaFuente": "<referencia exacta a la cláusula>",
      "confianzaExtraccion": <0-1>,
      "notaRevision": "<nota o null>"
    }
  ],
  "resumen": "<breve resumen de las comisiones encontradas>",
  "totalReglas": <número>,
  "reglasAmbiguas": <número con confianza < 0.7>
}

## Ejemplos

${FEW_SHOT_EXTRACTION_EXAMPLES}

## Reglas estrictas
- NUNCA inventes comisiones que no estén en el texto.
- SIEMPRE cita la cláusula exacta.
- Si hay duda sobre si algo es una comisión o un gasto reembolsable, extráelo pero con confianza baja.
- IVA: Si el contrato menciona IVA, inclúyelo en la fórmula. Si no lo menciona, NO lo agregues.
`;

const AGENT_CONFIG: AgentConfig = {
  id: 'contract-extractor',
  model: Models.SONNET,
  maxTokens: 4096,
  temperature: 0,
  systemPrompt: SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Input / Output
// ---------------------------------------------------------------------------

export interface ExtractContractInput {
  documentText: string;
  existingRules?: ReglaComision[];
  commissionTaxonomy?: string;
}

interface ExtractionResponse {
  reglas: ExtractedCommissionRule[];
  resumen: string;
  totalReglas: number;
  reglasAmbiguas: number;
}

// ---------------------------------------------------------------------------
// Extraction function
// ---------------------------------------------------------------------------

/**
 * Extract commission rules from a contract or otrosí document.
 * Uses Sonnet with temperature 0 for maximum precision.
 */
export async function extractCommissionRules(
  input: ExtractContractInput,
): Promise<AgentResult<ExtractedCommissionRule[]>> {
  const { documentText, existingRules, commissionTaxonomy } = input;

  const sections: string[] = [
    '## Texto del contrato/otrosí',
    '',
    documentText,
  ];

  if (existingRules && existingRules.length > 0) {
    sections.push(
      '',
      '## Reglas de comisión previamente extraídas',
      '',
      'Las siguientes reglas ya fueron extraídas de documentos anteriores. ' +
      'Si este documento modifica alguna, indícalo en la notaRevision.',
      '',
      '```json',
      JSON.stringify(
        existingRules.map((r) => ({
          tipo: r.tipo,
          nombre: r.nombre,
          formula: r.formula,
          periodicidad: r.periodicidad,
          clausulaFuente: r.clausulaFuente,
          vigenciaDesde: r.vigenciaDesde,
          vigenciaHasta: r.vigenciaHasta,
        })),
        null,
        2,
      ),
      '```',
    );
  }

  if (commissionTaxonomy) {
    sections.push(
      '',
      '## Taxonomía adicional proporcionada por el usuario',
      '',
      commissionTaxonomy,
    );
  }

  const userMessage = sections.join('\n');

  const result = await callAgent<ExtractionResponse>(AGENT_CONFIG, userMessage);

  // Validate and normalize
  const rules = result.data.reglas.map((rule) => ({
    ...rule,
    confianzaExtraccion: Math.max(0, Math.min(1, rule.confianzaExtraccion)),
    notaRevision: rule.confianzaExtraccion < 0.7 && !rule.notaRevision
      ? 'Confianza baja. Requiere revisión manual.'
      : rule.notaRevision,
  }));

  return {
    data: rules,
    reasoning: result.data.resumen,
    confidence: rules.length > 0
      ? rules.reduce((sum, r) => sum + r.confianzaExtraccion, 0) / rules.length
      : 0,
    tokensUsed: result.tokensUsed,
  };
}
