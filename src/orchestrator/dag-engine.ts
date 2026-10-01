/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Orchestration DAG Engine executing Markdown-defined Agents and Evals
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
import {
  MarkdownAgentRunner,
  MarkdownEvalRunner,
  QualityGateRunner,
  GateExecutionReport,
  HumanWaiver,
} from '../runtime';
import { TelemetryBus, WorkflowTelemetrySummary } from './telemetry-bus';
import { HITLGovernanceProtocol } from './hitl-protocol';

export interface PipelineInput {
  rawText: string;
  epicId: string;
  featureName: string;
  domain: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  releaseVersion?: string;
  waivers?: Record<string, HumanWaiver>; // gateId -> waiver
}

export interface PipelineStageEvent {
  stage: string;
  specPath: string;
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
  validationReport?: any;
  releaseRecord?: ReleaseGateRecord;
  stageEvents: PipelineStageEvent[];
  gateResults: GateExecutionReport[];
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
    const gateResults: GateExecutionReport[] = [];
    const corrId = this.telemetryBus.correlationId;

    const logStage = (stage: string, specPath: string, status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'SKIPPED', durationMs: number, details?: string) => {
      stageEvents.push({ stage, specPath, status, durationMs, details });
    };

    let requirement: RequirementArtifact | undefined;
    let acceptanceCriteria: AcceptanceCriteriaArtifact[] = [];
    let scenarios: ScenarioArtifact[] = [];
    let testCases: TestCaseArtifact[] = [];
    let automationBlueprints: AutomationBlueprintArtifact[] = [];
    let validationReport: any;
    let releaseRecord: ReleaseGateRecord | undefined;

    try {
      // ==========================================
      // STAGE 1: Markdown Agent: AGT-REQ-001.md
      // ==========================================
      let t0 = Date.now();
      const reqAgentSpec = 'agents/AGT-REQ-001.md';
      logStage('Requirement Analysis Agent', reqAgentSpec, 'STARTED', 0);
      const reqAgent = new MarkdownAgentRunner(reqAgentSpec, this.contextStore, this.llmProvider);
      
      const reqPrompt = `
Epic: ${input.epicId}
Feature: ${input.featureName}
Domain: ${input.domain}
Priority: ${input.priority || 'HIGH'}
Raw Requirement:
"""
${input.rawText}
"""
`;
      const reqRes = await reqAgent.execute<{ requirement: RequirementArtifact; acceptanceCriteria: AcceptanceCriteriaArtifact[] }>(
        reqPrompt,
        corrId
      );
      requirement = reqRes.output.requirement;
      acceptanceCriteria = reqRes.output.acceptanceCriteria;

      // Persist to store
      requirement.rawText = input.rawText;
      requirement.epicId = input.epicId;
      requirement.featureName = input.featureName;
      requirement.domain = input.domain;
      await this.contextStore.saveArtifact('REQ', requirement);
      for (const ac of acceptanceCriteria) {
        ac.requirementId = requirement.id;
        await this.contextStore.saveArtifact('AC', ac);
      }

      this.telemetryBus.recordAgentLog(reqRes.log);
      logStage('Requirement Analysis Agent', reqAgentSpec, 'COMPLETED', Date.now() - t0, `Decomposed into ${acceptanceCriteria.length} ACs`);

      // ==========================================
      // STAGE 2: Markdown Gate: GATE-REQ-001 (EVAL-SCHEMA-001.md, EVAL-AMBIGUITY-SEMANTIC.md)
      // ==========================================
      t0 = Date.now();
      const gateReq = new QualityGateRunner(
        'GATE-REQ-001',
        'Requirement Ambiguity & Schema Gate',
        'MAJOR',
        0.85,
        [
          new MarkdownEvalRunner('evals/EVAL-SCHEMA-001.md', this.llmProvider),
          new MarkdownEvalRunner('evals/EVAL-AMBIGUITY-SEMANTIC.md', this.llmProvider),
        ]
      );
      const reqGateRes = await gateReq.evaluate(
        requirement,
        this.contextStore,
        input.waivers?.['GATE-REQ-001']
      );
      gateResults.push(reqGateRes);
      this.telemetryBus.recordGateResult(reqGateRes);
      logStage('Quality Gate', 'evals/EVAL-AMBIGUITY-SEMANTIC.md', reqGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${reqGateRes.score} (${reqGateRes.status})`);

      if (reqGateRes.status === 'FAILED') {
        throw new Error(`Pipeline halted at GATE-REQ-001: ${JSON.stringify(reqGateRes.failingEvaluators)}`);
      }

      // ==========================================
      // STAGE 3: Markdown Agent: AGT-DES-001.md
      // ==========================================
      t0 = Date.now();
      const desAgentSpec = 'agents/AGT-DES-001.md';
      logStage('Test Design Agent', desAgentSpec, 'STARTED', 0);
      const desAgent = new MarkdownAgentRunner(desAgentSpec, this.contextStore, this.llmProvider);

      const desPrompt = `
Requirement: [${requirement.id}] ${requirement.title}
Domain: ${requirement.domain}
Raw Requirement: ${requirement.rawText}

Acceptance Criteria to cover:
${acceptanceCriteria.map(a => `[${a.id}] Given: ${a.given.join('; ')} | When: ${a.when} | Then: ${a.then.join('; ')}`).join('\n')}
`;
      const desRes = await desAgent.execute<{ scenarios: ScenarioArtifact[]; testCases: TestCaseArtifact[] }>(
        desPrompt,
        corrId,
        [requirement.id, ...acceptanceCriteria.map(a => a.id)]
      );
      scenarios = desRes.output.scenarios;
      testCases = desRes.output.testCases;

      // Persist to store
      for (const scn of scenarios) {
        scn.requirementId = requirement.id;
        await this.contextStore.saveArtifact('SCN', scn);
      }
      for (const tc of testCases) {
        tc.requirementId = requirement.id;
        await this.contextStore.saveArtifact('TC', tc);
      }

      this.telemetryBus.recordAgentLog(desRes.log);
      logStage('Test Design Agent', desAgentSpec, 'COMPLETED', Date.now() - t0, `Generated ${scenarios.length} Scenarios, ${testCases.length} Test Cases`);

      // ==========================================
      // STAGE 4: Markdown Gate: GATE-DES-001 (EVAL-REFERENTIAL-001.md, EVAL-COVERAGE-001.md, EVAL-COMPLETENESS-SEMANTIC.md)
      // ==========================================
      t0 = Date.now();
      const gateDes = new QualityGateRunner(
        'GATE-DES-001',
        'Test Design Coverage & Referential Gate',
        'MAJOR',
        0.85,
        [
          new MarkdownEvalRunner('evals/EVAL-REFERENTIAL-001.md', this.llmProvider),
          new MarkdownEvalRunner('evals/EVAL-COVERAGE-001.md', this.llmProvider),
          new MarkdownEvalRunner('evals/EVAL-COMPLETENESS-SEMANTIC.md', this.llmProvider),
        ]
      );
      const desGateRes = await gateDes.evaluate(
        { id: requirement.id, coverageMode: 'AC_TO_SCN' },
        this.contextStore,
        input.waivers?.['GATE-DES-001']
      );
      gateResults.push(desGateRes);
      this.telemetryBus.recordGateResult(desGateRes);
      logStage('Quality Gate', 'evals/EVAL-COMPLETENESS-SEMANTIC.md', desGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${desGateRes.score} (${desGateRes.status})`);

      if (desGateRes.status === 'FAILED') {
        throw new Error(`Pipeline halted at GATE-DES-001: ${JSON.stringify(desGateRes.failingEvaluators)}`);
      }

      // ==========================================
      // STAGE 5: Markdown NFR Agents (AGT-SEC-001.md, AGT-PERF-001.md, AGT-A11Y-001.md)
      // ==========================================
      t0 = Date.now();
      const nfrPrompt = `Requirement: [${requirement.id}] ${requirement.title}\nDomain: ${requirement.domain}\nRaw: ${requirement.rawText}`;

      // Security Agent
      const secAgent = new MarkdownAgentRunner('agents/AGT-SEC-001.md', this.contextStore, this.llmProvider);
      const secRes = await secAgent.execute<{ testCases: TestCaseArtifact[] }>(nfrPrompt, corrId, [requirement.id]);
      for (const tc of secRes.output.testCases) {
        tc.requirementId = requirement.id;
        await this.contextStore.saveArtifact('TC', tc);
        testCases.push(tc);
      }
      this.telemetryBus.recordAgentLog(secRes.log);

      // Performance Agent
      const perfAgent = new MarkdownAgentRunner('agents/AGT-PERF-001.md', this.contextStore, this.llmProvider);
      const perfRes = await perfAgent.execute<{ testCases: TestCaseArtifact[] }>(nfrPrompt, corrId, [requirement.id]);
      for (const tc of perfRes.output.testCases) {
        tc.requirementId = requirement.id;
        await this.contextStore.saveArtifact('TC', tc);
        testCases.push(tc);
      }
      this.telemetryBus.recordAgentLog(perfRes.log);

      // Accessibility Agent
      const a11yAgent = new MarkdownAgentRunner('agents/AGT-A11Y-001.md', this.contextStore, this.llmProvider);
      const a11yRes = await a11yAgent.execute<{ testCases: TestCaseArtifact[] }>(nfrPrompt, corrId, [requirement.id]);
      for (const tc of a11yRes.output.testCases) {
        tc.requirementId = requirement.id;
        await this.contextStore.saveArtifact('TC', tc);
        testCases.push(tc);
      }
      this.telemetryBus.recordAgentLog(a11yRes.log);

      logStage('NFR Specialist Workforce', 'agents/AGT-SEC-001.md', 'COMPLETED', Date.now() - t0, `Added Sec, Perf, and A11y test cases (Total: ${testCases.length} TCs)`);

      // ==========================================
      // STAGE 6: Markdown SDET Agent: AGT-SDET-001.md
      // ==========================================
      t0 = Date.now();
      const sdetAgentSpec = 'agents/AGT-SDET-001.md';
      logStage('SDET Automation Blueprint Agent', sdetAgentSpec, 'STARTED', 0);
      const sdetAgent = new MarkdownAgentRunner(sdetAgentSpec, this.contextStore, this.llmProvider);

      const sdetPrompt = `Generate Automation Blueprints for:\n${testCases.map(tc => `[${tc.id}] (${tc.type}, ${tc.priority}) ${tc.title}`).join('\n')}`;
      const sdetRes = await sdetAgent.execute<{ blueprints: AutomationBlueprintArtifact[] }>(
        sdetPrompt,
        corrId,
        testCases.map(t => t.id)
      );
      automationBlueprints = sdetRes.output.blueprints;
      for (const aut of automationBlueprints) {
        await this.contextStore.saveArtifact('AUT', aut);
      }
      this.telemetryBus.recordAgentLog(sdetRes.log);
      logStage('SDET Automation Blueprint Agent', sdetAgentSpec, 'COMPLETED', Date.now() - t0, `Synthesized ${automationBlueprints.length} Automation Blueprints`);

      // ==========================================
      // STAGE 7: Markdown Gate: GATE-SDET-001 (EVAL-COVERAGE-001.md)
      // ==========================================
      t0 = Date.now();
      const gateSdet = new QualityGateRunner(
        'GATE-SDET-001',
        'P0/P1 Automation Contract Gate',
        'MAJOR',
        0.80,
        [new MarkdownEvalRunner('evals/EVAL-COVERAGE-001.md', this.llmProvider)]
      );
      const sdetGateRes = await gateSdet.evaluate(
        { id: requirement.id, coverageMode: 'TC_TO_AUT' },
        this.contextStore,
        input.waivers?.['GATE-SDET-001']
      );
      gateResults.push(sdetGateRes);
      this.telemetryBus.recordGateResult(sdetGateRes);
      logStage('Quality Gate', 'evals/EVAL-COVERAGE-001.md', sdetGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${sdetGateRes.score} (${sdetGateRes.status})`);

      // ==========================================
      // STAGE 8: Markdown Agent: AGT-VAL-001.md
      // ==========================================
      t0 = Date.now();
      const valAgentSpec = 'agents/AGT-VAL-001.md';
      logStage('Test Validation & Drift Agent', valAgentSpec, 'STARTED', 0);
      const valAgent = new MarkdownAgentRunner(valAgentSpec, this.contextStore, this.llmProvider);

      const valPrompt = `Validate downstream test artifacts against requirement: [${requirement.id}] ${requirement.title}`;
      const valRes = await valAgent.execute<any>(valPrompt, corrId, [requirement.id]);
      validationReport = valRes.output;
      this.telemetryBus.recordAgentLog(valRes.log);
      logStage('Test Validation & Drift Agent', valAgentSpec, 'COMPLETED', Date.now() - t0, `Verdict: ${validationReport.verdict}, Hallucination: ${validationReport.hallucinationIndex}`);

      // ==========================================
      // STAGE 9: Markdown Gate: GATE-VAL-001 (EVAL-DRIFT-SEMANTIC.md)
      // ==========================================
      t0 = Date.now();
      const gateVal = new QualityGateRunner(
        'GATE-VAL-001',
        'Specification Drift & Hallucination Gate',
        'CRITICAL',
        0.90,
        [new MarkdownEvalRunner('evals/EVAL-DRIFT-SEMANTIC.md', this.llmProvider)]
      );
      const valGateRes = await gateVal.evaluate(requirement, this.contextStore);
      gateResults.push(valGateRes);
      this.telemetryBus.recordGateResult(valGateRes);
      logStage('Quality Gate', 'evals/EVAL-DRIFT-SEMANTIC.md', valGateRes.status === 'FAILED' ? 'FAILED' : 'COMPLETED', Date.now() - t0, `Score: ${valGateRes.score} (${valGateRes.status})`);

      // ==========================================
      // STAGE 10: Release Quality Gate (GATES-POLICY.md)
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
      logStage('Release Gate Authorization', 'evals/GATES-POLICY.md', 'COMPLETED', Date.now() - t0, `Status: ${releaseRecord.gateStatus}`);

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
      logStage('Pipeline Execution', '', 'FAILED', 0, err.message);
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
