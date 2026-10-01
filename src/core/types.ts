/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Core Domain Artifact Interfaces & Types (Section 4 & Section 5 Specification)
 */

// ==========================================
// 1. REQUIREMENT ARTIFACT (REQ)
// ==========================================
export interface RiskAssessment {
  riskId: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RequirementArtifact {
  id: string;                          // [System] e.g., "REQ-1001"
  version: number;                     // [System] Incremental version
  epicId: string;                      // [Human] Upstream Epic identifier
  featureName: string;                 // [Human/AI] Feature group
  title: string;                       // [Human] User story / requirement summary
  rawText: string;                     // [Human] Original requirement text
  domain: string;                      // [Human/AI] Business domain / bounded context
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'; // [Human]
  risksIdentified: RiskAssessment[];   // [AI] Risk assessment
  ambiguities: string[];               // [AI] Detected ambiguities or gaps
  dependencies: string[];              // [AI/Human] Dependent REQ IDs
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'REJECTED'; // [Human/Deterministic Gate]
  createdAt: string;                   // [System] ISO-8601
  updatedAt: string;                   // [System] ISO-8601
}

// ==========================================
// 2. ACCEPTANCE CRITERIA ARTIFACT (AC)
// ==========================================
export interface AcceptanceCriteriaArtifact {
  id: string;                          // [System] e.g., "AC-2001"
  requirementId: string;               // [System] Parent REQ ID
  version: number;                     // [System]
  given: string[];                     // [Human/AI] Preconditions
  when: string;                        // [Human/AI] Trigger action
  then: string[];                      // [Human/AI] Expected post-conditions
  businessRules: string[];             // [Human/AI] Invariant business rules
  isTestable: boolean;                 // [AI/Deterministic] Testability flag
  testabilityRationale?: string;       // [AI] Reason if isTestable is false
  status: 'PROPOSED' | 'VALIDATED' | 'BLOCKED'; // [Deterministic Gate]
  createdAt: string;                   // [System] ISO-8601
}

// ==========================================
// 3. TEST SCENARIO ARTIFACT (SCN)
// ==========================================
export type ScenarioClassification = 
  | 'POSITIVE' 
  | 'NEGATIVE' 
  | 'BOUNDARY' 
  | 'EXCEPTION' 
  | 'INTEGRATION' 
  | 'E2E';

export type ScenarioTargetLayer = 
  | 'UI' 
  | 'API' 
  | 'DATABASE' 
  | 'MESSAGING';

export interface ScenarioArtifact {
  id: string;                          // [System] e.g., "SCN-3001"
  requirementId: string;               // [Deterministic] Upstream REQ ID
  acceptanceCriteriaId: string;        // [Deterministic] Upstream AC ID
  title: string;                       // [AI] Concise scenario title
  classification: ScenarioClassification; // [AI]
  targetLayer: ScenarioTargetLayer;    // [AI]
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';   // [AI]
  scenarioDescription: string;         // [AI] Narrative of the flow
  isRegressionCandidate: boolean;      // [AI]
  status: 'GENERATED' | 'EVALUATED' | 'APPROVED'; // [Gate]
  createdAt: string;                   // [System] ISO-8601
}

// ==========================================
// 4. TEST CASE ARTIFACT (TC)
// ==========================================
export type TestCaseType = 
  | 'FUNCTIONAL' 
  | 'SECURITY' 
  | 'PERFORMANCE' 
  | 'ACCESSIBILITY' 
  | 'RESILIENCE';

export interface TestStep {
  stepIndex: number;
  action: string;
  expectedResult: string;
}

export interface TestCaseArtifact {
  id: string;                          // [System] e.g., "TC-4001"
  scenarioId: string;                  // [Deterministic] Upstream SCN ID
  requirementId: string;               // [Deterministic] Traceability
  acceptanceCriteriaId: string;        // [Deterministic] Traceability
  title: string;                       // [AI] Test case title
  type: TestCaseType;                  // [AI]
  priority: 'P0' | 'P1' | 'P2' | 'P3'; // [AI/Human]
  preconditions: string[];             // [AI] Setup requirements
  testDataRequirements: Record<string, string>; // [AI] Key-value parameter rules
  steps: TestStep[];                   // [AI] Step definitions
  postConditions: string[];            // [AI] Teardown verification
  status: 'DRAFT' | 'APPROVED' | 'DEPRECATED'; // [Gate/Human]
  createdAt: string;                   // [System] ISO-8601
}

// ==========================================
// 5. AUTOMATION CONTRACT ARTIFACT (AUT)
// ==========================================
export type HarnessType = 
  | 'PLAYWRIGHT_TS' 
  | 'REST_API' 
  | 'K6_PERF' 
  | 'AXE_A11Y' 
  | 'MANUAL';

export interface AutomationBlueprintArtifact {
  id: string;                          // [System] e.g., "AUT-5001"
  testCaseId: string;                  // [Deterministic] Upstream TC ID
  automationFeasible: boolean;         // [AI/Human]
  cannotAutomateReason?: string;       // [AI] Mandatory if automationFeasible == false
  recommendedHarness: HarnessType;     // [AI]
  targetComponent: string;             // [AI] e.g., "PartManagementService"
  targetEndpointOrUrl?: string;        // [AI]
  codeBlueprint: string;               // [AI] Abstract execution code/script
  assertions: string[];                // [AI] Explicit assertions
  executionTimeoutMs: number;          // [Deterministic/AI]
  status: 'READY_FOR_HARNESS' | 'BLOCKED'; // [Gate]
  createdAt: string;                   // [System] ISO-8601
}

// ==========================================
// 6. TEST EXECUTION RECORD (TEX)
// ==========================================
export type ExecutionEnvironment = 'DEV' | 'QA' | 'STAGING' | 'PROD';
export type ExecutionStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED';
export type FailureClassification = 
  | 'APPLICATION_BUG' 
  | 'TEST_DATA_ISSUE' 
  | 'ENVIRONMENT_DOWN' 
  | 'AUTOMATION_FLAKE' 
  | 'SPEC_DRIFT';

export interface TestExecutionRecord {
  id: string;                          // [System] e.g., "TEX-6001"
  testCaseId: string;                  // [Deterministic] Upstream TC ID
  automationId?: string;               // [Deterministic] Upstream AUT ID
  environment: ExecutionEnvironment;   // [System]
  buildNumber: string;                 // [System]
  releaseId: string;                   // [System] Upstream Release ID
  status: ExecutionStatus;             // [Deterministic]
  durationMs: number;                  // [Deterministic]
  failureClassification?: FailureClassification; // [AI/Deterministic]
  rawLogSnippet?: string;              // [System] Error message or stack trace
  rootCauseAnalysis?: string;          // [AI] Diagnosis from Result Analysis Agent
  executedAt: string;                  // [System] ISO-8601
}

// ==========================================
// 7. EXECUTION TREND & QUALITY SIGNAL (TRS)
// ==========================================
export interface QualitySignalRecord {
  id: string;                          // [System] e.g., "TRS-7001"
  buildNumber: string;                 // [System]
  environment: string;                 // [System]
  totalExecuted: number;               // [Deterministic]
  passedCount: number;                 // [Deterministic]
  failedCount: number;                 // [Deterministic]
  skippedCount: number;                // [Deterministic]
  passPercentage: number;              // [Deterministic]
  flakyTestCount: number;              // [Deterministic]
  topFailureCategories: Record<string, number>; // [Deterministic]
  aiSummary: string;                   // [AI] Trend diagnosis and release risk summary
  recommendedActions: string[];        // [AI] Prescribed corrective actions
  calculatedAt: string;                // [System] ISO-8601
}

// ==========================================
// 8. RELEASE QUALITY GATE RECORD (REL)
// ==========================================
export type ReleaseGateStatus = 'PASSED' | 'FAILED' | 'WAIVED_WITH_APPROVAL';

export interface ReleaseGateRecord {
  id: string;                          // [System] e.g., "REL-8001"
  releaseId: string;                   // [Human/System]
  version: string;                     // [System]
  gateStatus: ReleaseGateStatus;       // [Deterministic/Human]
  blockingReason?: string;             // [Deterministic]
  humanApprover?: string;              // [Human] Mandatory if status is WAIVED
  waiverJustification?: string;        // [Human] Mandatory if status is WAIVED
  evaluatedAt: string;                 // [System] ISO-8601
}

// ==========================================
// 9. AGENT EXECUTION TELEMETRY LOG (LOG)
// ==========================================
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface EvaluatorExecutionResult {
  evaluatorId: string;
  passed: boolean;
  score: number;                       // 0.0 to 1.0
  rationale: string;
}

export type GateExecutionResult = 'PASSED' | 'FAILED' | 'NEEDS_RETRY' | 'ESCALATED';
export type AgentFinalStatus = 'SUCCESS' | 'FAILURE' | 'CIRCUIT_BROKEN';

export interface AgentExecutionLog {
  runId: string;                       // [System] UUID
  correlationId: string;               // [System] Distributed workflow trace ID
  agentId: string;                     // [System] e.g., "AGT-TEST-DESIGN-001"
  agentVersion: string;                // [System] SemVer
  aiProvider: string;                  // [System] e.g., "Google-Gemini", "OpenAI", "Mock"
  modelName: string;                   // [System] e.g., "gemini-3.8-flash"
  promptVersion: string;               // [System] Git commit or hash
  inputArtifactIds: string[];          // [Deterministic]
  outputArtifactIds: string[];         // [Deterministic]
  evaluatorIds: string[];              // [Deterministic]
  gateIds: string[];                   // [Deterministic]
  tokenUsage: TokenUsage;              // [System]
  durationMs: number;                  // [System]
  evalResults: EvaluatorExecutionResult[]; // [Deterministic/AI]
  gateResult: GateExecutionResult;     // [Deterministic]
  finalStatus: AgentFinalStatus;       // [System]
  timestamp: string;                   // [System] ISO-8601
}

// Map of artifact types
export type ArtifactType = 
  | 'REQ' 
  | 'AC' 
  | 'SCN' 
  | 'TC' 
  | 'AUT' 
  | 'TEX' 
  | 'TRS' 
  | 'REL' 
  | 'LOG';

export type AnyArtifact =
  | RequirementArtifact
  | AcceptanceCriteriaArtifact
  | ScenarioArtifact
  | TestCaseArtifact
  | AutomationBlueprintArtifact
  | TestExecutionRecord
  | QualitySignalRecord
  | ReleaseGateRecord
  | AgentExecutionLog;
