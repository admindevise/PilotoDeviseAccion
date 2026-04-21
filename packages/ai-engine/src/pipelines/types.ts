import type {
  TipoDocumento,
  FormatoOriginal,
  TipoComision,
  PeriodicidadComision,
  FormulaDetalle,
  EstadoResultado,
  EvidenciaConciliacion,
  TipoHallazgo,
  SeveridadHallazgo,
  CategoriaHallazgo,
  ValorHistorico,
  ConvencionFideicomiso,
  Fideicomiso,
  ReglaComision,
} from '@fideicomiso/shared';

// ---------------------------------------------------------------------------
// Document classification
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  tipo: TipoDocumento;
  formatoDetectado: string;
  confidence: number;
  keywords: string[];
  method: string;
}

// ---------------------------------------------------------------------------
// Commission rule extraction
// ---------------------------------------------------------------------------

export interface ExtractedCommissionRule {
  tipo: TipoComision;
  nombre: string;
  formula: string;
  formulaDetalle: FormulaDetalle;
  periodicidad: PeriodicidadComision;
  condiciones?: string;
  clausulaFuente: string;
  confianzaExtraccion: number;
  notaRevision?: string;
}

// ---------------------------------------------------------------------------
// Accounting data
// ---------------------------------------------------------------------------

export type ErpFormat = 'LEGACY_TSV' | 'SIFI';

export interface NormalizedMovement {
  fecha: string;
  cuenta: string;
  nombreCuenta: string;
  terceroNit: string;
  terceroNombre: string;
  tipoComprobante: string;
  numeroComprobante: string;
  concepto: string;
  debito: number;
  credito: number;
  saldo: number;
  periodoContable: string;
  lineaOriginal: number;
}

export interface AccountingParseResult {
  formatoDetectado: ErpFormat;
  movimientos: NormalizedMovement[];
  periodoDetectado: string;
  totalDebitos: number;
  totalCreditos: number;
  advertencias: string[];
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

export interface ReconciliationResult {
  reglaComisionId: string;
  periodo: string;
  estado: EstadoResultado;
  montoEsperado: number;
  montoRegistrado: number;
  discrepancia: number;
  evidencia: EvidenciaConciliacion;
  confianza: number;
  razonamiento: string;
}

export interface MacroVariableInput {
  codigo: string;
  valor: number;
  anio: number;
}

export interface AccountingConvention {
  /** Account code for GASTO (expense) commissions */
  cuentaGasto: string;
  /** Account code for COSTO (cost) commissions */
  cuentaCosto: string;
  /** Account code for ANTICIPO (advance) commissions */
  cuentaAnticipo: string;
}

export const DEFAULT_ACCOUNTING_CONVENTION: AccountingConvention = {
  cuentaGasto: '51151801001',
  cuentaCosto: '15203001001',
  cuentaAnticipo: '16320001001',
};

// ---------------------------------------------------------------------------
// Anomalies
// ---------------------------------------------------------------------------

export interface AnomalyResult {
  tipo: TipoHallazgo;
  severidad: SeveridadHallazgo;
  categoria: CategoriaHallazgo;
  descripcion: string;
  evidencia: string[];
  impactoEconomico?: number;
  recomendacion: string;
}

// ---------------------------------------------------------------------------
// Revenue opportunities
// ---------------------------------------------------------------------------

export type RevenueScenario =
  | 'ERROR_NO_FACTURADO'
  | 'DECISION_COMERCIAL'
  | 'BASE_CONTRACTUAL_NO_FACTURADA';

export interface RevenueOpportunity {
  reglaComisionId: string;
  montoEstimado: number;
  baseLegal: string;
  confianza: number;
  escenario: RevenueScenario;
  recomendacion: string;
}

// ---------------------------------------------------------------------------
// Knowledge base
// ---------------------------------------------------------------------------

export interface KnowledgeEntry {
  id: string;
  fideicomisoId: string;
  query: string;
  respuesta: string;
  fuentes: string[];
  fechaCreacion: string;
}

// ---------------------------------------------------------------------------
// Pipeline state & report
// ---------------------------------------------------------------------------

export type PipelinePhase =
  | 'CLASSIFY'
  | 'EXTRACT_RULES'
  | 'PARSE_ACCOUNTING'
  | 'RECONCILE'
  | 'DETECT_ANOMALIES'
  | 'FILTER_KNOWLEDGE'
  | 'COMPLETE'
  | 'ERROR';

export interface PipelineState {
  fideicomisoId: string;
  periodo: string;
  phase: PipelinePhase;
  startedAt: string;
  updatedAt: string;
  progress: number; // 0-100
  errors: PipelineError[];
}

export interface PipelineError {
  phase: PipelinePhase;
  message: string;
  agentId?: string;
  timestamp: string;
}

export interface PipelineDocumentInput {
  id: string;
  filename: string;
  content: string;
  userContext?: string;
}

export interface ReconciliationReport {
  fideicomisoId: string;
  periodo: string;
  generadoEn: string;
  duracionMs: number;

  /** Phase 1 results */
  clasificaciones: ClassificationResult[];

  /** Phase 2 results */
  reglasExtraidas: ExtractedCommissionRule[];

  /** Phase 3 results */
  movimientos: NormalizedMovement[];
  contabilidadResumen: {
    formatoDetectado: ErpFormat;
    totalDebitos: number;
    totalCreditos: number;
    advertencias: string[];
  };

  /** Phase 4 results */
  resultadosConciliacion: ReconciliationResult[];

  /** Phase 5 results */
  anomalias: AnomalyResult[];
  oportunidadesRevenue: RevenueOpportunity[];

  /** Phase 6 – knowledge base filtering */
  hallazgosFiltrados: number;

  /** Totals */
  resumen: {
    totalReglas: number;
    conciliados: number;
    discrepancias: number;
    noEncontrados: number;
    noFacturados: number;
    anomalias: number;
    oportunidades: number;
    impactoEconomicoEstimado: number;
  };

  /** Token usage */
  tokensUsed: { input: number; output: number };
}
