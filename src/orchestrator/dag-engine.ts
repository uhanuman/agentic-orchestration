/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Orchestration DAG Engine & Quality Gatekeeper Pipeline (Section 2, 5, 10)
 */

import * as crypto from 'crypto';
import { IContextStore } from '../core/context-store';
import {
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
  ReleaseGateRecord,
} from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { TelemetryBus, WorkflowTelemetrySummary } from './telemetry-bus';
import { HITLGovernanceProtocol } from './hitl-protocol';

// Agents
import { RequirementAnalysisAgent, RequirementAgentInput } from '../agents/requirement-agent';
import { TestDesignAgent } from '../agents/test-design-agent';
import { SecurityAgent } from '../agents/nfr/security-agent';
import { PerformanceAgent } from '../agents/nfr/performance-agent';
import { AccessibilityAgent } from '../agents/nfr/accessibility-agent';
import { SDETAutomationAgent } from '../agents/sdet-agent';
import { TestValidationAgent, ValidationAgentOutput } from '../agents/validation-agent';

// Quality Gates & Evaluators
import { QualityGate } from '../eval/quality-gate';
import { SchemaValidator } from '../eval/deterministic/schema-validator';
import { ReferentialIntegrityValidator } from '../eval/deterministic/referential-validator';
import { CoverageCalculator } from '../eval/deterministic/coverage-calculator';
import { AmbiguityEvaluator } from '../eval/semantic/ambiguity-evaluator';
import { CompletenessEvaluator } from '../eval/semantic/completeness-evaluator';
import { DriftEvaluator } from '../eval/semantic/drift-evaluator';
import { GateEvaluationResult, HumanWaiver } from '../eval/evaluator.interface';

export interface PipelineInput extends RequirementAgentInput {
  waivers?: Record<string, HumanWaiver>; // gateId -> waiver
  releaseVersion?: string;
}

export interface PipelineStageEvent {
  stage: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  details?: string;
}

export interface PipelineResult {
  correlationId: string;
  success: boolean;
  requirement?: RequirementArtifact;
  acceptanceCriteria: AcceptanceCriteriaArtifact[];
  scenarios: ScenarioArtifact[];
  testCases: TestCaseArtifact[];
  automationBlueprints: AutomationBlueprintArtifact[];
  validationReport?: ValidationAgentOutput;
  releaseRecord?: ReleaseGateRecord;
  stageEvents: PipelineStageEvent[];
  gateResults: GateEvaluationResult[];
  telemetry: WorkflowTelemetrySummary;
  error?: string;
}

export class DAGEngine {
  private telemetryBus: TelemetryBus;
  private hitl: HITLGovernanceProtocol;

  constructor(
    private contextStore: IContextStore,
    private llmProvider: ILLMProvider,
    correlationId?: string
  ) {
    const corrId = correlationId || `corr-${crypto.randomUUID()}`;
    this.telemetryBus = new TelemetryBus(corrId);
    this.hitl = new HITLGovernanceProtocol(this.contextStore);
  }

  public async run(input: PipelineInput): Promise<PipelineResult> {
    const stageEvents: PipelineStageEvent[] = [];
    const gateResults: GateEvaluationResult[] = [];
    const corrId = this.telemetryBus.correlationId;

    const logStage = (stage: string, status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'SKIPPED', durationMs: number, details?: string) => {
      stageEvents.push({ stage, status, durationMs, details });
    };

    let requirement: RequirementArtifact | undefined;
    let acceptanceCriteria: AcceptanceCriteriaArtifact[] = [];
    let scenarios: ScenarioArtifact[] = [];
    let testCases: TestCaseArtifact[] = [];
    let automationBlueprints: AutomationBlueprintArtifact[] = [];
    let validationReport: ValidationAgentOutput | undefined;
    let releaseRecord: ReleaseGateRecord | undefined;

    try {
      // ==========================================
      // STAGE 1: Requirement Analysis Agent (AGT-REQ-001)
      // ==========================================
      let t0 = Date.now();
      logStage('Requirement Analysis (AGT-REQ-001)', 'STARTED', 0);
      const reqAgent = new RequirementAnalysisAgent(this.contextStore, this.llmProvider);
      const reqRes = await reqAgent.execute(input, corrId);
      requirement = reqRes.output.requirement;
      acceptanceCriteria = reqRes.output.acceptanceCriteria;
      this.telemetryBus.recordAgentLog(reqRes.log as any);
      logStage('Requirement Analysis (AGT-REQ-001)', 'COMPLETED', Date.now() - t0, `Decomposed into ${acceptanceCriteria.length} ACs`);

      // ==========================================
      // STAGE 2: GATE-REQ-001 (Requirement & Ambiguity Gate)
      // ==========================================
      t0 = Date.now();
      const gateReq = new QualityGate(
        'GATE-REQ-001',
        'Requirement Ambiguity & Schema Gate',
        'MAJOR',
        0.85,
        [
          new SchemaValidator('REQ'),
          new AmbiguityEvaluator(this.llmProvider, 0.15),
        ]
      );
      const reqGateRes = await gateReq.evaluateGate(
        [requirement.id],
        this.contextStore,
        input.waivers?.['GATE-REQ-001']
      );
      gateResults.push(reqGateRes);
      this.telemetryBus.recordGateResult(reqGateRes);
      logStage('Quality Gate (GATE-REQ-001)', reqGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${reqGateRes.score} (${reqGateRes.status})`);

      if (reqGateRes.status === 'FAILED') {
        throw new Error(`Pipeline halted at GATE-REQ-001: ${JSON.stringify(reqGateRes.failingEvaluators)}`);
      }

      // ==========================================
      // STAGE 3: Test Design Agent (AGT-DES-001)
      // ==========================================
      t0 = Date.now();
      logStage('Test Design Agent (AGT-DES-001)', 'STARTED', 0);
      const desAgent = new TestDesignAgent(this.contextStore, this.llmProvider);
      const desRes = await desAgent.execute({ requirementId: requirement.id }, corrId);
      scenarios = desRes.output.scenarios;
      testCases = desRes.output.testCases;
      this.telemetryBus.recordAgentLog(desRes.log as any);
      logStage('Test Design Agent (AGT-DES-001)', 'COMPLETED', Date.now() - t0, `Generated ${scenarios.length} Scenarios, ${testCases.length} Test Cases`);

      // ==========================================
      // STAGE 4: GATE-DES-001 (Design & Coverage Gate)
      // ==========================================
      t0 = Date.now();
      const gateDes = new QualityGate(
        'GATE-DES-001',
        'Test Design Coverage & Referential Gate',
        'MAJOR',
        0.85,
        [
          new ReferentialIntegrityValidator('SCN'),
          new CoverageCalculator('AC_TO_SCENARIO', 1.0),
          new CompletenessEvaluator(this.llmProvider, 0.85),
        ]
      );
      const desGateRes = await gateDes.evaluateGate(
        [requirement.id],
        this.contextStore,
        input.waivers?.['GATE-DES-001']
      );
      gateResults.push(desGateRes);
      this.telemetryBus.recordGateResult(desGateRes);
      logStage('Quality Gate (GATE-DES-001)', desGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${desGateRes.score} (${desGateRes.status})`);

      if (desGateRes.status === 'FAILED') {
        throw new Error(`Pipeline halted at GATE-DES-001: ${JSON.stringify(desGateRes.failingEvaluators)}`);
      }

      // ==========================================
      // STAGE 5: NFR Specialist Agents (Security, Perf, A11y)
      // ==========================================
      t0 = Date.now();
      logStage('NFR Specialist Workforce', 'STARTED', 0);

      const secAgent = new SecurityAgent(this.contextStore, this.llmProvider);
      const secRes = await secAgent.execute({ requirementId: requirement.id }, corrId);
      this.telemetryBus.recordAgentLog(secRes.log as any);
      testCases.push(...secRes.output.testCases);

      const perfAgent = new PerformanceAgent(this.contextStore, this.llmProvider);
      const perfRes = await perfAgent.execute({ requirementId: requirement.id }, corrId);
      this.telemetryBus.recordAgentLog(perfRes.log as any);
      testCases.push(...perfRes.output.testCases);

      const a11yAgent = new AccessibilityAgent(this.contextStore, this.llmProvider);
      const a11yRes = await a11yAgent.execute({ requirementId: requirement.id }, corrId);
      this.telemetryBus.recordAgentLog(a11yRes.log as any);
      testCases.push(...a11yRes.output.testCases);

      logStage('NFR Specialist Workforce', 'COMPLETED', Date.now() - t0, `Added ${secRes.output.testCases.length} Sec, ${perfRes.output.testCases.length} Perf, ${a11yRes.output.testCases.length} A11y cases`);

      // ==========================================
      // STAGE 6: SDET Automation Blueprint Agent (AGT-SDET-001)
      // ==========================================
      t0 = Date.now();
      logStage('SDET Automation Blueprint Agent (AGT-SDET-001)', 'STARTED', 0);
      const sdetAgent = new SDETAutomationAgent(this.contextStore, this.llmProvider);
      const sdetRes = await sdetAgent.execute(
        { testCaseIds: testCases.map(tc => tc.id) },
        corrId
      );
      automationBlueprints = sdetRes.output.blueprints;
      this.telemetryBus.recordAgentLog(sdetRes.log as any);
      logStage('SDET Automation Blueprint Agent (AGT-SDET-001)', 'COMPLETED', Date.now() - t0, `Synthesized ${automationBlueprints.length} Automation Blueprints`);

      // ==========================================
      // STAGE 7: GATE-SDET-001 (Automation Contract Gate)
      // ==========================================
      t0 = Date.now();
      const gateSdet = new QualityGate(
        'GATE-SDET-001',
        'P0/P1 Automation Contract Gate',
        'MAJOR',
        0.80,
        [new CoverageCalculator('TC_TO_AUT', 0.80)]
      );
      const sdetGateRes = await gateSdet.evaluateGate(
        [requirement.id],
        this.contextStore,
        input.waivers?.['GATE-SDET-001']
      );
      gateResults.push(sdetGateRes);
      this.telemetryBus.recordGateResult(sdetGateRes);
      logStage('Quality Gate (GATE-SDET-001)', sdetGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${sdetGateRes.score} (${sdetGateRes.status})`);

      // ==========================================
      // STAGE 8: Test Validation & Drift Agent (AGT-VAL-001)
      // ==========================================
      t0 = Date.now();
      logStage('Test Validation & Drift Agent (AGT-VAL-001)', 'STARTED', 0);
      const valAgent = new TestValidationAgent(this.contextStore, this.llmProvider);
      const valRes = await valAgent.execute({ requirementId: requirement.id }, corrId);
      validationReport = valRes.output;
      this.telemetryBus.recordAgentLog(valRes.log as any);
      logStage('Test Validation & Drift Agent (AGT-VAL-001)', 'COMPLETED', Date.now() - t0, `Verdict: ${validationReport.verdict}, Hallucination Index: ${validationReport.hallucinationIndex}`);

      // ==========================================
      // STAGE 9: GATE-VAL-001 (Specification Drift Gate)
      // ==========================================
      t0 = Date.now();
      const gateVal = new QualityGate(
        'GATE-VAL-001',
        'Specification Drift & Hallucination Gate',
        'CRITICAL',
        0.90,
        [new DriftEvaluator(this.llmProvider, 0.10)]
      );
      const valGateRes = await gateVal.evaluateGate([requirement.id], this.contextStore);
      gateResults.push(valGateRes);
      this.telemetryBus.recordGateResult(valGateRes);
      logStage('Quality Gate (GATE-VAL-001)', valGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${valGateRes.score} (${valGateRes.status})`);

      // ==========================================
      // STAGE 10: Release Quality Gate (GATE-REL-001)
      // ==========================================
      t0 = Date.now();
      const allPassed = gateResults.every(g => g.status === 'PASSED' || g.status === 'WAIVED_WITH_APPROVAL');
      releaseRecord = await this.hitl.createReleaseGateRecord({
        releaseId: `REL-${input.epicId}`,
        version: input.releaseVersion || '1.0.0',
        gateStatus: allPassed ? 'PASSED' : 'FAILED',
        blockingReason: allPassed ? undefined : 'One or more mandatory quality gates failed.',
        humanApprover: allPassed ? 'Automated Quality Gatekeeper' : undefined,
      });
      logStage('Release Gate Authorization', 'COMPLETED', Date.now() - t0, `Status: ${releaseRecord.gateStatus}`);

      return {
        correlationId: corrId,
        success: true,
        requirement,
        acceptanceCriteria,
        scenarios,
        testCases,
        automationBlueprints,
        validationReport,
        releaseRecord,
        stageEvents,
        gateResults,
        telemetry: this.telemetryBus.getSummary(),
      };
    } catch (err: any) {
      logStage('Pipeline Execution', 'FAILED', 0, err.message);
      return {
        correlationId: corrId,
        success: false,
        requirement,
        acceptanceCriteria,
        scenarios,
        testCases,
        automationBlueprints,
        validationReport,
        releaseRecord,
        stageEvents,
        gateResults,
        telemetry: this.telemetryBus.getSummary(),
        error: err.message,
      };
    }
  }
}
