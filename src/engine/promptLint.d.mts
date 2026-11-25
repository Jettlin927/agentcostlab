export interface LintModelProfile {
  id: string;
  name: string;
  inputPerM: number;
  cachedInputPerM: number;
  cacheWriteMultiplier: number;
}

export interface PromptWarning {
  ruleId?: 'malformed-json' | 'cache-buster' | 'secret-leak' | 'heavy-prefix';
  severity: 'high' | 'medium' | 'info';
  message: string;
  messageZh: string;
}

export interface PromptInspectionResult {
  charCount: number;
  lineCount: number;
  estimatedTokens: number;
  isJson: boolean;
  detectedToolCount: number;
  warnings: PromptWarning[];
  costPer1kRunsUncached: number;
  costPer1kRunsCached: number;
}

export interface PromptDiagnosticSpan extends PromptWarning {
  line: number;
  startCol: number;
  endCol: number;
}

export interface PromptDiagnosticResult extends PromptInspectionResult {
  spans: PromptDiagnosticSpan[];
}

export interface FileLintResult extends PromptDiagnosticResult {
  path: string;
}

export interface LintBatchOptions {
  modelId?: string;
  turns?: number;
  maxTokens?: number;
  failOnHigh?: boolean;
  failOnMedium?: boolean;
}

export interface LintBatchReport {
  model: LintModelProfile;
  turns: number;
  maxTokens: number | null;
  results: FileLintResult[];
  totals: {
    files: number;
    estimatedTokens: number;
    costPer1kRunsUncached: number;
    costPer1kRunsCached: number;
    highWarnings: number;
    mediumWarnings: number;
    infoWarnings: number;
  };
  budgetExceeded: boolean;
  passed: boolean;
}

export declare const DEFAULT_LINT_MODELS: Record<string, LintModelProfile>;
export declare const DEFAULT_TARGET_FILES: string[];

export declare function estimateTokens(text: string): number;
export declare function inspectPromptOverhead(
  text: string,
  turns: number,
  model: Pick<LintModelProfile, 'inputPerM' | 'cachedInputPerM' | 'cacheWriteMultiplier'>
): PromptInspectionResult;
export declare function findPromptDiagnosticSpans(
  text: string,
  turns: number,
  model: Pick<LintModelProfile, 'inputPerM' | 'cachedInputPerM' | 'cacheWriteMultiplier'>
): PromptDiagnosticResult;
export declare function formatUsdCompact(amount: number): string;
export declare function resolveLintModel(modelId?: string): LintModelProfile;
export declare function runLintBatch(
  files: Array<{ path: string; content: string }>,
  options?: LintBatchOptions
): LintBatchReport;
export declare function renderMarkdownSummary(report: LintBatchReport): string;
export declare function renderSarifReport(report: LintBatchReport, toolVersion?: string): Record<string, unknown>;
export declare function formatLintOutput(
  report: LintBatchReport,
  format?: 'text' | 'json' | 'github' | 'sarif'
): string;
