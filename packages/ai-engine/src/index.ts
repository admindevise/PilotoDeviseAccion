// Client & core types
export { getAnthropicClient, resetClient, callAgent, Models } from './client';
export type { AgentConfig, AgentResult } from './client';

// Agents
export { classifyDocument } from './agents/document-classifier';
export type { ClassifyDocumentInput } from './agents/document-classifier';

export { extractCommissionRules } from './agents/contract-extractor';
export type { ExtractContractInput } from './agents/contract-extractor';

export { parseAccountingData } from './agents/accounting-parser';
export type { ParseAccountingInput } from './agents/accounting-parser';

export { matchCommissions, calculateExpectedAmount } from './agents/commission-matcher';
export type { MatchCommissionsInput } from './agents/commission-matcher';

export { detectAnomalies } from './agents/anomaly-detector';
export type { DetectAnomaliesInput } from './agents/anomaly-detector';

export { spotRevenue } from './agents/revenue-spotter';
export type { SpotRevenueInput } from './agents/revenue-spotter';

// Pipeline
export { runReconciliationPipeline } from './pipelines/reconciliation-pipeline';
export type { ReconciliationPipelineInput } from './pipelines/reconciliation-pipeline';

// Pipeline types
export type {
  ClassificationResult,
  ExtractedCommissionRule,
  NormalizedMovement,
  AccountingParseResult,
  ErpFormat,
  ReconciliationResult,
  MacroVariableInput,
  AccountingConvention,
  AnomalyResult,
  RevenueOpportunity,
  RevenueScenario,
  KnowledgeEntry,
  PipelinePhase,
  PipelineState,
  PipelineError,
  PipelineDocumentInput,
  ReconciliationReport,
} from './pipelines/types';
export { DEFAULT_ACCOUNTING_CONVENTION } from './pipelines/types';

// Prompts
export { COMMISSION_TAXONOMY } from './prompts/taxonomy';
export { FEW_SHOT_EXTRACTION_EXAMPLES } from './prompts/few-shot';
