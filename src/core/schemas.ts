/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Zod Schemas for Runtime Validation and JSON Schema Generation
 */

import { z } from 'zod';

// ==========================================
// 1. REQUIREMENT ARTIFACT SCHEMA (REQ)
// ==========================================
export const RiskAssessmentSchema = z.object({
  riskId: z.string().min(1, 'riskId is required'),
  description: z.string().min(1, 'description is required'),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
});

export const RequirementArtifactSchema = z.object({
  id: z.string().regex(/^REQ-\d+$/, 'id must match REQ-XXXX pattern'),
  version: z.number().int().positive(),
  epicId: z.string().min(1, 'epicId is required'),
  featureName: z.string().min(1, 'featureName is required'),
  title: z.string().min(1, 'title is required'),
  rawText: z.string().min(1, 'rawText is required'),
  domain: z.string().min(1, 'domain is required'),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  risksIdentified: z.array(RiskAssessmentSchema),
  ambiguities: z.array(z.string()),
  dependencies: z.array(z.string()),
  status: z.enum(['DRAFT', 'REVIEWED', 'APPROVED', 'REJECTED']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ==========================================
// 2. ACCEPTANCE CRITERIA ARTIFACT SCHEMA (AC)
// ==========================================
export const AcceptanceCriteriaArtifactSchema = z.object({
  id: z.string().regex(/^AC-\d+$/, 'id must match AC-XXXX pattern'),
  requirementId: z.string().regex(/^REQ-\d+$/, 'requirementId must match REQ-XXXX pattern'),
  version: z.number().int().positive(),
  given: z.array(z.string()).min(1, 'at least one given precondition is required'),
  when: z.string().min(1, 'when trigger is required'),
  then: z.array(z.string()).min(1, 'at least one then postcondition is required'),
  businessRules: z.array(z.string()),
  isTestable: z.boolean(),
  testabilityRationale: z.string().optional(),
  status: z.enum(['PROPOSED', 'VALIDATED', 'BLOCKED']),
  createdAt: z.string().datetime(),
});

// ==========================================
// 3. TEST SCENARIO ARTIFACT SCHEMA (SCN)
// ==========================================
export const ScenarioArtifactSchema = z.object({
  id: z.string().regex(/^SCN-\d+$/, 'id must match SCN-XXXX pattern'),
  requirementId: z.string().regex(/^REQ-\d+$/, 'requirementId must match REQ-XXXX pattern'),
  acceptanceCriteriaId: z.string().regex(/^AC-\d+$/, 'acceptanceCriteriaId must match AC-XXXX pattern'),
  title: z.string().min(1, 'title is required'),
  classification: z.enum(['POSITIVE', 'NEGATIVE', 'BOUNDARY', 'EXCEPTION', 'INTEGRATION', 'E2E']),
  targetLayer: z.enum(['UI', 'API', 'DATABASE', 'MESSAGING']),
  riskLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  scenarioDescription: z.string().min(1, 'scenarioDescription is required'),
  isRegressionCandidate: z.boolean(),
  status: z.enum(['GENERATED', 'EVALUATED', 'APPROVED']),
  createdAt: z.string().datetime(),
});

// ==========================================
// 4. TEST CASE ARTIFACT SCHEMA (TC)
// ==========================================
export const TestStepSchema = z.object({
  stepIndex: z.number().int().min(1),
  action: z.string().min(1, 'action is required'),
  expectedResult: z.string().min(1, 'expectedResult is required'),
});

export const TestCaseArtifactSchema = z.object({
  id: z.string().regex(/^TC-\d+$/, 'id must match TC-XXXX pattern'),
  scenarioId: z.string().regex(/^SCN-\d+$/, 'scenarioId must match SCN-XXXX pattern'),
  requirementId: z.string().regex(/^REQ-\d+$/, 'requirementId must match REQ-XXXX pattern'),
  acceptanceCriteriaId: z.string().regex(/^AC-\d+$/, 'acceptanceCriteriaId must match AC-XXXX pattern'),
  title: z.string().min(1, 'title is required'),
  type: z.enum(['FUNCTIONAL', 'SECURITY', 'PERFORMANCE', 'ACCESSIBILITY', 'RESILIENCE']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  preconditions: z.array(z.string()),
  testDataRequirements: z.record(z.string(), z.string()),
  steps: z.array(TestStepSchema).min(1, 'at least one step is required'),
  postConditions: z.array(z.string()),
  status: z.enum(['DRAFT', 'APPROVED', 'DEPRECATED']),
  createdAt: z.string().datetime(),
});

// ==========================================
// 5. AUTOMATION CONTRACT ARTIFACT SCHEMA (AUT)
// ==========================================
export const AutomationBlueprintArtifactSchema = z.object({
  id: z.string().regex(/^AUT-\d+$/, 'id must match AUT-XXXX pattern'),
  testCaseId: z.string().regex(/^TC-\d+$/, 'testCaseId must match TC-XXXX pattern'),
  automationFeasible: z.boolean(),
  cannotAutomateReason: z.string().optional(),
  recommendedHarness: z.enum(['PLAYWRIGHT_TS', 'REST_API', 'K6_PERF', 'AXE_A11Y', 'MANUAL']),
  targetComponent: z.string().min(1, 'targetComponent is required'),
  targetEndpointOrUrl: z.string().optional(),
  codeBlueprint: z.string().min(1, 'codeBlueprint is required'),
  assertions: z.array(z.string()).min(1, 'at least one assertion is required'),
  executionTimeoutMs: z.number().positive(),
  status: z.enum(['READY_FOR_HARNESS', 'BLOCKED']),
  createdAt: z.string().datetime(),
}).refine(data => {
  if (!data.automationFeasible && (!data.cannotAutomateReason || data.cannotAutomateReason.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'cannotAutomateReason is mandatory when automationFeasible is false',
  path: ['cannotAutomateReason'],
});

// ==========================================
// 6. TEST EXECUTION RECORD SCHEMA (TEX)
// ==========================================
export const TestExecutionRecordSchema = z.object({
  id: z.string().regex(/^TEX-\d+$/, 'id must match TEX-XXXX pattern'),
  testCaseId: z.string().regex(/^TC-\d+$/, 'testCaseId must match TC-XXXX pattern'),
  automationId: z.string().regex(/^AUT-\d+$/).optional(),
  environment: z.enum(['DEV', 'QA', 'STAGING', 'PROD']),
  buildNumber: z.string().min(1),
  releaseId: z.string().min(1),
  status: z.enum(['PASSED', 'FAILED', 'SKIPPED', 'BLOCKED']),
  durationMs: z.number().nonnegative(),
  failureClassification: z.enum(['APPLICATION_BUG', 'TEST_DATA_ISSUE', 'ENVIRONMENT_DOWN', 'AUTOMATION_FLAKE', 'SPEC_DRIFT']).optional(),
  rawLogSnippet: z.string().optional(),
  rootCauseAnalysis: z.string().optional(),
  executedAt: z.string().datetime(),
});

// ==========================================
// 7. EXECUTION TREND & QUALITY SIGNAL SCHEMA (TRS)
// ==========================================
export const QualitySignalRecordSchema = z.object({
  id: z.string().regex(/^TRS-\d+$/, 'id must match TRS-XXXX pattern'),
  buildNumber: z.string().min(1),
  environment: z.string().min(1),
  totalExecuted: z.number().nonnegative(),
  passedCount: z.number().nonnegative(),
  failedCount: z.number().nonnegative(),
  skippedCount: z.number().nonnegative(),
  passPercentage: z.number().min(0).max(100),
  flakyTestCount: z.number().nonnegative(),
  topFailureCategories: z.record(z.string(), z.number()),
  aiSummary: z.string().min(1),
  recommendedActions: z.array(z.string()),
  calculatedAt: z.string().datetime(),
});

// ==========================================
// 8. RELEASE QUALITY GATE RECORD SCHEMA (REL)
// ==========================================
export const ReleaseGateRecordSchema = z.object({
  id: z.string().regex(/^REL-\d+$/, 'id must match REL-XXXX pattern'),
  releaseId: z.string().min(1),
  version: z.string().min(1),
  gateStatus: z.enum(['PASSED', 'FAILED', 'WAIVED_WITH_APPROVAL']),
  blockingReason: z.string().optional(),
  humanApprover: z.string().optional(),
  waiverJustification: z.string().optional(),
  evaluatedAt: z.string().datetime(),
}).refine(data => {
  if (data.gateStatus === 'WAIVED_WITH_APPROVAL') {
    return !!data.humanApprover && !!data.waiverJustification;
  }
  return true;
}, {
  message: 'humanApprover and waiverJustification are mandatory when gateStatus is WAIVED_WITH_APPROVAL',
  path: ['waiverJustification'],
});

// ==========================================
// 9. AGENT EXECUTION TELEMETRY LOG SCHEMA (LOG)
// ==========================================
export const TokenUsageSchema = z.object({
  promptTokens: z.number().nonnegative(),
  completionTokens: z.number().nonnegative(),
  totalTokens: z.number().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
});

export const EvaluatorExecutionResultSchema = z.object({
  evaluatorId: z.string(),
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  rationale: z.string(),
});

export const AgentExecutionLogSchema = z.object({
  runId: z.string().min(1),
  correlationId: z.string().min(1),
  agentId: z.string().min(1),
  agentVersion: z.string().min(1),
  aiProvider: z.string().min(1),
  modelName: z.string().min(1),
  promptVersion: z.string().min(1),
  inputArtifactIds: z.array(z.string()),
  outputArtifactIds: z.array(z.string()),
  evaluatorIds: z.array(z.string()),
  gateIds: z.array(z.string()),
  nextAgents: z.array(z.string()).optional(),
  tokenUsage: TokenUsageSchema,
  durationMs: z.number().nonnegative(),
  evalResults: z.array(EvaluatorExecutionResultSchema),
  gateResult: z.enum(['PASSED', 'FAILED', 'NEEDS_RETRY', 'ESCALATED']),
  finalStatus: z.enum(['SUCCESS', 'FAILURE', 'CIRCUIT_BROKEN']),
  timestamp: z.string().datetime(),
});

export const SchemaRegistry: Record<string, z.ZodTypeAny> = {
  REQ: RequirementArtifactSchema,
  AC: AcceptanceCriteriaArtifactSchema,
  SCN: ScenarioArtifactSchema,
  TC: TestCaseArtifactSchema,
  AUT: AutomationBlueprintArtifactSchema,
  TEX: TestExecutionRecordSchema,
  TRS: QualitySignalRecordSchema,
  REL: ReleaseGateRecordSchema,
  LOG: AgentExecutionLogSchema,
};
