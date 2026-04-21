import type { ReglaComision } from '@fideicomiso/shared';
import { classifyDocument } from '../agents/document-classifier';
import { extractCommissionRules } from '../agents/contract-extractor';
import { parseAccountingData } from '../agents/accounting-parser';
import { matchCommissions } from '../agents/commission-matcher';
import { detectAnomalies } from '../agents/anomaly-detector';
import { spotRevenue } from '../agents/revenue-spotter';
import type {
  PipelineDocumentInput,
  PipelineState,
  PipelinePhase,
  PipelineError,
  ReconciliationReport,
  ClassificationResult,
  ExtractedCommissionRule,
  NormalizedMovement,
  ReconciliationResult,
  AnomalyResult,
  RevenueOpportunity,
  MacroVariableInput,
  AccountingConvention,
} from './types';
import { DEFAULT_ACCOUNTING_CONVENTION } from './types';

// ---------------------------------------------------------------------------
// Pipeline configuration
// ---------------------------------------------------------------------------

export interface ReconciliationPipelineInput {
  fideicomisoId: string;
  periodo: string;
  documents: PipelineDocumentInput[];
  existingRules?: ReglaComision[];
  macroVariables: MacroVariableInput[];
  convention?: AccountingConvention;
  onProgress?: (state: PipelineState) => void;
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function createState(
  fideicomisoId: string,
  periodo: string,
): PipelineState {
  const now = new Date().toISOString();
  return {
    fideicomisoId,
    periodo,
    phase: 'CLASSIFY',
    startedAt: now,
    updatedAt: now,
    progress: 0,
    errors: [],
  };
}

function updateState(
  state: PipelineState,
  phase: PipelinePhase,
  progress: number,
): PipelineState {
  return {
    ...state,
    phase,
    progress,
    updatedAt: new Date().toISOString(),
  };
}

function addError(
  state: PipelineState,
  phase: PipelinePhase,
  message: string,
  agentId?: string,
): PipelineState {
  return {
    ...state,
    errors: [
      ...state.errors,
      { phase, message, agentId, timestamp: new Date().toISOString() },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main pipeline orchestration
// ---------------------------------------------------------------------------

export async function runReconciliationPipeline(
  input: ReconciliationPipelineInput,
): Promise<ReconciliationReport> {
  const {
    fideicomisoId,
    periodo,
    documents,
    existingRules = [],
    macroVariables,
    convention = DEFAULT_ACCOUNTING_CONVENTION,
    onProgress,
  } = input;

  const startTime = Date.now();
  let state = createState(fideicomisoId, periodo);
  let totalTokens = { input: 0, output: 0 };

  function trackTokens(tokens: { input: number; output: number }) {
    totalTokens.input += tokens.input;
    totalTokens.output += tokens.output;
  }

  function emit(phase: PipelinePhase, progress: number) {
    state = updateState(state, phase, progress);
    onProgress?.(state);
  }

  // =========================================================================
  // Phase 1: CLASSIFY documents
  // =========================================================================
  emit('CLASSIFY', 5);

  const clasificaciones: ClassificationResult[] = [];
  const contractDocs: PipelineDocumentInput[] = [];
  const accountingDocs: PipelineDocumentInput[] = [];

  for (const doc of documents) {
    try {
      const result = await classifyDocument({
        filename: doc.filename,
        content: doc.content,
        userContext: doc.userContext,
      });
      clasificaciones.push(result.data);
      trackTokens(result.tokensUsed);

      const tipo = result.data.tipo;
      if (
        tipo === 'CONTRATO_FIDUCIA' ||
        tipo === 'OTROSI' ||
        tipo === 'CESION_DERECHOS'
      ) {
        contractDocs.push(doc);
      } else if (
        tipo === 'AUXILIAR_CONTABLE' ||
        tipo === 'ESTADO_CUENTA_COMISIONES'
      ) {
        accountingDocs.push(doc);
      }
    } catch (err) {
      state = addError(
        state,
        'CLASSIFY',
        `Error clasificando ${doc.filename}: ${(err as Error).message}`,
        'document-classifier',
      );
    }
  }

  emit('CLASSIFY', 20);

  // =========================================================================
  // Phase 2: EXTRACT commission rules from contracts
  // =========================================================================
  emit('EXTRACT_RULES', 25);

  const reglasExtraidas: ExtractedCommissionRule[] = [];

  for (const doc of contractDocs) {
    try {
      const result = await extractCommissionRules({
        documentText: doc.content,
      });
      reglasExtraidas.push(...result.data);
      trackTokens(result.tokensUsed);
    } catch (err) {
      state = addError(
        state,
        'EXTRACT_RULES',
        `Error extrayendo reglas de ${doc.filename}: ${(err as Error).message}`,
        'contract-extractor',
      );
    }
  }

  emit('EXTRACT_RULES', 40);

  // =========================================================================
  // Phase 3: PARSE accounting data
  // =========================================================================
  emit('PARSE_ACCOUNTING', 45);

  let allMovements: NormalizedMovement[] = [];
  let formatoDetectado: 'LEGACY_TSV' | 'SIFI' = 'LEGACY_TSV';
  let totalDebitos = 0;
  let totalCreditos = 0;
  const advertencias: string[] = [];

  for (const doc of accountingDocs) {
    try {
      const result = await parseAccountingData({
        rawData: doc.content,
        expectedPeriod: periodo,
      });
      allMovements = allMovements.concat(result.data.movimientos);
      formatoDetectado = result.data.formatoDetectado;
      totalDebitos += result.data.totalDebitos;
      totalCreditos += result.data.totalCreditos;
      advertencias.push(...result.data.advertencias);
      trackTokens(result.tokensUsed);
    } catch (err) {
      state = addError(
        state,
        'PARSE_ACCOUNTING',
        `Error parseando ${doc.filename}: ${(err as Error).message}`,
        'accounting-parser',
      );
    }
  }

  emit('PARSE_ACCOUNTING', 55);

  // =========================================================================
  // Phase 4: RECONCILE — match rules to accounting entries
  // =========================================================================
  emit('RECONCILE', 60);

  let resultadosConciliacion: ReconciliationResult[] = [];

  // Combine existing rules (from DB) with newly extracted ones
  // For newly extracted rules, generate temporary IDs
  const allRules: ReglaComision[] = [
    ...existingRules,
    ...reglasExtraidas.map((r, idx) => ({
      id: `extracted-${idx}`,
      tipo: r.tipo,
      nombre: r.nombre,
      formula: r.formula,
      formulaDetalle: r.formulaDetalle,
      periodicidad: r.periodicidad,
      clausulaFuente: r.clausulaFuente,
      confianzaExtraccion: r.confianzaExtraccion,
    })) as unknown as ReglaComision[],
  ];

  if (allRules.length > 0 && allMovements.length > 0) {
    try {
      const result = await matchCommissions({
        rules: allRules,
        movements: allMovements,
        macroVariables,
        convention,
        periodo,
      });
      resultadosConciliacion = result.data;
      trackTokens(result.tokensUsed);
    } catch (err) {
      state = addError(
        state,
        'RECONCILE',
        `Error en conciliación: ${(err as Error).message}`,
        'commission-matcher',
      );
    }
  }

  emit('RECONCILE', 75);

  // =========================================================================
  // Phase 5: DETECT anomalies & spot revenue opportunities
  // =========================================================================
  emit('DETECT_ANOMALIES', 80);

  let anomalias: AnomalyResult[] = [];
  let oportunidadesRevenue: RevenueOpportunity[] = [];

  // Run anomaly detection and revenue spotting in parallel
  const [anomalyResult, revenueResult] = await Promise.allSettled([
    allMovements.length > 0
      ? detectAnomalies({
          reconciliationResults: resultadosConciliacion,
          movements: allMovements,
          convention,
          periodo,
        })
      : Promise.resolve(null),
    resultadosConciliacion.length > 0
      ? spotRevenue({
          reconciliationResults: resultadosConciliacion,
          anomalies: [],
          macroVariables,
          periodo,
        })
      : Promise.resolve(null),
  ]);

  if (anomalyResult.status === 'fulfilled' && anomalyResult.value) {
    anomalias = anomalyResult.value.data;
    trackTokens(anomalyResult.value.tokensUsed);
  } else if (anomalyResult.status === 'rejected') {
    state = addError(
      state,
      'DETECT_ANOMALIES',
      `Error detectando anomalías: ${anomalyResult.reason}`,
      'anomaly-detector',
    );
  }

  // If revenue spotter had no anomalies, re-run with actual anomalies
  if (revenueResult.status === 'fulfilled' && revenueResult.value) {
    oportunidadesRevenue = revenueResult.value.data;
    trackTokens(revenueResult.value.tokensUsed);
  } else if (revenueResult.status === 'rejected') {
    state = addError(
      state,
      'DETECT_ANOMALIES',
      `Error identificando revenue: ${revenueResult.reason}`,
      'revenue-spotter',
    );
  }

  emit('DETECT_ANOMALIES', 90);

  // =========================================================================
  // Phase 6: FILTER against knowledge base (future implementation)
  // =========================================================================
  emit('FILTER_KNOWLEDGE', 95);

  const hallazgosFiltrados = 0; // TODO: integrate knowledge base filtering

  // =========================================================================
  // COMPLETE: Build report
  // =========================================================================
  emit('COMPLETE', 100);

  const conciliados = resultadosConciliacion.filter(
    (r) => r.estado === 'CONCILIADO',
  ).length;
  const discrepancias = resultadosConciliacion.filter(
    (r) => r.estado === 'DISCREPANCIA',
  ).length;
  const noEncontrados = resultadosConciliacion.filter(
    (r) => r.estado === 'NO_ENCONTRADO',
  ).length;
  const noFacturados = resultadosConciliacion.filter(
    (r) => r.estado === 'NO_FACTURADO',
  ).length;

  const impactoEconomicoEstimado =
    anomalias.reduce((sum, a) => sum + (a.impactoEconomico || 0), 0) +
    oportunidadesRevenue.reduce((sum, o) => sum + o.montoEstimado, 0);

  const report: ReconciliationReport = {
    fideicomisoId,
    periodo,
    generadoEn: new Date().toISOString(),
    duracionMs: Date.now() - startTime,

    clasificaciones,
    reglasExtraidas,
    movimientos: allMovements,
    contabilidadResumen: {
      formatoDetectado,
      totalDebitos,
      totalCreditos,
      advertencias,
    },

    resultadosConciliacion,
    anomalias,
    oportunidadesRevenue,
    hallazgosFiltrados,

    resumen: {
      totalReglas: allRules.length,
      conciliados,
      discrepancias,
      noEncontrados,
      noFacturados,
      anomalias: anomalias.length,
      oportunidades: oportunidadesRevenue.length,
      impactoEconomicoEstimado,
    },

    tokensUsed: totalTokens,
  };

  return report;
}
