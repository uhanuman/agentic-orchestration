/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Deterministic Coverage Calculator (EVAL-COVERAGE-001)
 */

import { IContextStore } from '../../core/context-store';
import {
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
} from '../../core/types';
import { EvaluatorResult, IEvaluator } from '../evaluator.interface';

export type CoverageMode = 'AC_TO_SCENARIO' | 'SCN_TO_TC' | 'TC_TO_AUT';

export class CoverageCalculator implements IEvaluator<any> {
  public readonly evaluatorId = 'EVAL-COVERAGE-001';
  public readonly name = 'Deterministic Coverage Calculator';
  public readonly type = 'DETERMINISTIC';

  constructor(
    private mode: CoverageMode,
    private minCoverageThreshold: number = 1.0 // Default 100%
  ) {}

  public async evaluate(target: { requirementId?: string; id?: string }, context: IContextStore): Promise<EvaluatorResult> {
    const requirementId = target.requirementId || (target.id?.startsWith('REQ-') ? target.id : target.id) || '';

    switch (this.mode) {
      case 'AC_TO_SCENARIO':
        return this.evaluateAcToScenarioCoverage(requirementId, context);
      case 'SCN_TO_TC':
        return this.evaluateScnToTcCoverage(requirementId, context);
      case 'TC_TO_AUT':
        return this.evaluateTcToAutCoverage(requirementId, context);
    }
  }

  private async evaluateAcToScenarioCoverage(
    requirementId: string,
    context: IContextStore
  ): Promise<EvaluatorResult> {
    const acs = await context.queryArtifacts<AcceptanceCriteriaArtifact>('AC', { requirementId });
    if (acs.length === 0) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.0,
        rationale: `Requirement ${requirementId} has zero Acceptance Criteria defined.`,
      };
    }

    const scns = await context.queryArtifacts<ScenarioArtifact>('SCN', { requirementId });
    const coveredAcIds = new Set(scns.map(s => s.acceptanceCriteriaId));

    const uncoveredAcs = acs.filter(ac => !coveredAcIds.has(ac.id));
    const coverageRatio = Number(((acs.length - uncoveredAcs.length) / acs.length).toFixed(2));
    const passed = coverageRatio >= this.minCoverageThreshold;

    return {
      evaluatorId: this.evaluatorId,
      type: this.type,
      passed,
      score: coverageRatio,
      rationale: passed
        ? `AC-to-Scenario coverage is ${(coverageRatio * 100).toFixed(1)}% (${acs.length - uncoveredAcs.length}/${acs.length} ACs covered).`
        : `AC-to-Scenario coverage failure: ${(coverageRatio * 100).toFixed(1)}% is below threshold ${(this.minCoverageThreshold * 100).toFixed(1)}%. Uncovered ACs: ${uncoveredAcs.map(a => a.id).join(', ')}`,
      metadata: {
        totalAcs: acs.length,
        coveredAcs: acs.length - uncoveredAcs.length,
        uncoveredAcIds: uncoveredAcs.map(a => a.id),
      },
    };
  }

  private async evaluateScnToTcCoverage(
    requirementId: string,
    context: IContextStore
  ): Promise<EvaluatorResult> {
    const scns = await context.queryArtifacts<ScenarioArtifact>('SCN', { requirementId });
    if (scns.length === 0) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.0,
        rationale: `Requirement ${requirementId} has zero Scenarios defined.`,
      };
    }

    const tcs = await context.queryArtifacts<TestCaseArtifact>('TC', { requirementId });
    const coveredScnIds = new Set(tcs.map(t => t.scenarioId));

    const uncoveredScns = scns.filter(scn => !coveredScnIds.has(scn.id));
    const coverageRatio = Number(((scns.length - uncoveredScns.length) / scns.length).toFixed(2));
    const passed = coverageRatio >= this.minCoverageThreshold;

    return {
      evaluatorId: this.evaluatorId,
      type: this.type,
      passed,
      score: coverageRatio,
      rationale: passed
        ? `Scenario-to-TC coverage is ${(coverageRatio * 100).toFixed(1)}% (${scns.length - uncoveredScns.length}/${scns.length} Scenarios covered).`
        : `Scenario-to-TC coverage failure: ${(coverageRatio * 100).toFixed(1)}% is below threshold ${(this.minCoverageThreshold * 100).toFixed(1)}%. Uncovered Scenarios: ${uncoveredScns.map(s => s.id).join(', ')}`,
      metadata: {
        totalScenarios: scns.length,
        coveredScenarios: scns.length - uncoveredScns.length,
        uncoveredScnIds: uncoveredScns.map(s => s.id),
      },
    };
  }

  private async evaluateTcToAutCoverage(
    requirementId: string,
    context: IContextStore
  ): Promise<EvaluatorResult> {
    const tcs = await context.queryArtifacts<TestCaseArtifact>('TC', { requirementId });
    // Filter to critical P0 and P1 test cases per Section 6.4
    const criticalTcs = tcs.filter(tc => tc.priority === 'P0' || tc.priority === 'P1');

    if (criticalTcs.length === 0) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: true,
        score: 1.0,
        rationale: `No P0/P1 Test Cases found for Requirement ${requirementId}.`,
      };
    }

    const auts = await context.queryArtifacts<AutomationBlueprintArtifact>('AUT');
    const coveredTcIds = new Set(auts.map(a => a.testCaseId));

    const uncoveredTcs = criticalTcs.filter(tc => !coveredTcIds.has(tc.id));
    const coverageRatio = Number(((criticalTcs.length - uncoveredTcs.length) / criticalTcs.length).toFixed(2));
    const passed = coverageRatio >= this.minCoverageThreshold;

    return {
      evaluatorId: this.evaluatorId,
      type: this.type,
      passed,
      score: coverageRatio,
      rationale: passed
        ? `P0/P1 Automation Coverage is ${(coverageRatio * 100).toFixed(1)}% (${criticalTcs.length - uncoveredTcs.length}/${criticalTcs.length} critical TCs covered).`
        : `Automation coverage failure: ${(coverageRatio * 100).toFixed(1)}% is below threshold ${(this.minCoverageThreshold * 100).toFixed(1)}%. Uncovered P0/P1 TCs: ${uncoveredTcs.map(t => t.id).join(', ')}`,
      metadata: {
        totalCriticalTcs: criticalTcs.length,
        coveredCriticalTcs: criticalTcs.length - uncoveredTcs.length,
        uncoveredTcIds: uncoveredTcs.map(t => t.id),
      },
    };
  }
}
