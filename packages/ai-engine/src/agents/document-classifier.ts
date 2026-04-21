import { TipoDocumento } from '@fideicomiso/shared';
import { type AgentConfig, type AgentResult, Models, callAgent } from '../client';
import type { ClassificationResult } from '../pipelines/types';

// ---------------------------------------------------------------------------
// Binary signature detection (runs before the LLM call)
// ---------------------------------------------------------------------------

interface BinarySignature {
  magic: number[];
  format: string;
}

const BINARY_SIGNATURES: BinarySignature[] = [
  // OLE2 Compound File (MSG, old XLS/DOC)
  { magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], format: 'MSG' },
  // PK signature (ZIP-based: DOCX, XLSX, ZIP-signed PDFs)
  { magic: [0x50, 0x4b, 0x03, 0x04], format: 'ZIP' },
  // PDF signature
  { magic: [0x25, 0x50, 0x44, 0x46], format: 'PDF' },
];

/**
 * Detect the binary format of the document by inspecting the first bytes.
 * Returns the format string or null if not recognized.
 */
export function detectBinaryFormat(content: string): string | null {
  // content may be a base64-encoded buffer or raw text
  const bytes: number[] = [];
  for (let i = 0; i < Math.min(content.length, 16); i++) {
    bytes.push(content.charCodeAt(i));
  }

  for (const sig of BINARY_SIGNATURES) {
    if (sig.magic.every((b, idx) => bytes[idx] === b)) {
      return sig.format;
    }
  }

  // Check if the content starts with the PDF text header
  if (content.trimStart().startsWith('%PDF')) {
    return 'PDF';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Eres un agente clasificador de documentos especializado en fideicomisos colombianos.

Tu tarea es clasificar un documento en uno de los siguientes tipos:

- CONTRATO_FIDUCIA: Contrato principal de fiducia mercantil o patrimonio autónomo.
- OTROSI_FIDUCIA: Otrosí (modificación/adición) al contrato de fiducia principal.
- AUXILIAR_CONTABLE: Auxiliar contable, libro mayor, movimientos contables del ERP.
- ESTADO_CUENTA_COMISIONES: Estado de cuenta de comisiones fiduciarias.
- RENDICION_SEMESTRAL: Rendición de cuentas semestral al fideicomitente.
- CESION_DERECHOS: Documento de cesión de derechos fiduciarios.
- CORREO_ELECTRONICO: Correo electrónico (MSG o EML) relacionado con el fideicomiso.
- CONTRATO_PARALELO: Contrato paralelo o complementario al fideicomiso.
- OTROSI_PARALELO: Otrosí a un contrato paralelo.
- ACTA_COMITE: Acta de comité fiduciario o de seguimiento.
- INSTRUCCION_PAGO: Instrucción de pago o carta de instrucciones.
- OTRO: Documento que no encaja en las categorías anteriores.

Analiza el contenido del documento, el nombre del archivo y el contexto proporcionado por el usuario.

Responde EXCLUSIVAMENTE con un JSON válido (sin texto adicional) con esta estructura:
{
  "tipo": "<TIPO_DOCUMENTO>",
  "formatoDetectado": "<formato del archivo: PDF, XLSX, TSV, MSG, etc.>",
  "confidence": <número entre 0 y 1>,
  "keywords": ["<palabra clave 1>", "<palabra clave 2>", ...],
  "method": "<método usado: binary_signature | content_analysis | filename_heuristic | combined>"
}

Reglas:
- Si la confianza es menor a 0.5, usa tipo "OTRO".
- Incluye entre 3 y 8 keywords que justifiquen la clasificación.
- El campo "method" indica cómo llegaste a la clasificación.
- Si detectas que es un auxiliar contable, busca patrones como columnas de débito/crédito, cuentas PUC, NITs.
- Si detectas que es un contrato, busca cláusulas, partes contratantes, objeto del contrato.
- Para correos, busca encabezados "De:", "Para:", "Asunto:", "From:", "To:", "Subject:".
`;

const AGENT_CONFIG: AgentConfig = {
  id: 'document-classifier',
  model: Models.HAIKU,
  maxTokens: 1024,
  temperature: 0.1,
  systemPrompt: SYSTEM_PROMPT,
};

// ---------------------------------------------------------------------------
// Classification function
// ---------------------------------------------------------------------------

export interface ClassifyDocumentInput {
  content: string;
  filename: string;
  userContext?: string;
}

/**
 * Classify a document using binary signature detection first, then falling
 * back to the Haiku LLM for content-based classification.
 */
export async function classifyDocument(
  input: ClassifyDocumentInput,
): Promise<AgentResult<ClassificationResult>> {
  const { content, filename, userContext } = input;

  // Step 1: Attempt binary signature detection for format
  const detectedFormat = detectBinaryFormat(content);

  // Step 2: Quick heuristic for obvious filename patterns
  const filenameLower = filename.toLowerCase();
  const filenameHints = buildFilenameHints(filenameLower);

  // Step 3: Build user message for the LLM
  const truncatedContent = content.length > 8000
    ? content.slice(0, 8000) + '\n\n[... contenido truncado ...]'
    : content;

  const userMessage = [
    `## Archivo: ${filename}`,
    detectedFormat ? `## Formato detectado por firma binaria: ${detectedFormat}` : '',
    filenameHints ? `## Pistas del nombre de archivo: ${filenameHints}` : '',
    userContext ? `## Contexto del usuario: ${userContext}` : '',
    '',
    '## Contenido del documento (primeros 8000 caracteres):',
    truncatedContent,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await callAgent<ClassificationResult>(AGENT_CONFIG, userMessage);

  // Enrich with binary detection info
  if (detectedFormat && !result.data.method.includes('binary')) {
    result.data.method = `binary_signature+${result.data.method}`;
    if (!result.data.formatoDetectado || result.data.formatoDetectado === '') {
      result.data.formatoDetectado = detectedFormat;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFilenameHints(filenameLower: string): string {
  const hints: string[] = [];

  if (filenameLower.includes('contrato') || filenameLower.includes('contract')) {
    hints.push('nombre sugiere contrato');
  }
  if (filenameLower.includes('otrosi') || filenameLower.includes('otrosí') || filenameLower.includes('modificaci')) {
    hints.push('nombre sugiere otrosí/modificación');
  }
  if (filenameLower.includes('auxiliar') || filenameLower.includes('aux_') || filenameLower.includes('movimientos')) {
    hints.push('nombre sugiere auxiliar contable');
  }
  if (filenameLower.includes('comision') || filenameLower.includes('estado_cuenta')) {
    hints.push('nombre sugiere estado de cuenta de comisiones');
  }
  if (filenameLower.includes('cesion') || filenameLower.includes('cesión')) {
    hints.push('nombre sugiere cesión de derechos');
  }
  if (filenameLower.includes('acta') || filenameLower.includes('comite') || filenameLower.includes('comité')) {
    hints.push('nombre sugiere acta de comité');
  }
  if (filenameLower.includes('rendicion') || filenameLower.includes('rendición') || filenameLower.includes('semestral')) {
    hints.push('nombre sugiere rendición semestral');
  }
  if (filenameLower.endsWith('.msg') || filenameLower.endsWith('.eml')) {
    hints.push('extensión de correo electrónico');
  }
  if (filenameLower.endsWith('.xlsx') || filenameLower.endsWith('.xls') || filenameLower.endsWith('.csv') || filenameLower.endsWith('.tsv')) {
    hints.push('extensión de hoja de cálculo o datos tabulares');
  }

  return hints.join('; ');
}
