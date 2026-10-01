/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Quality Gate Engine & Policy Enforcer (Section 7)
 */

import { IContextStore } from '../core/context-store';
import {
  GateEvaluationResult,
  GateSeverity,
  HumanWaiver,
  IEvaluator,
  IQualityGate,
  EvaluatorResult,
} from './evaluator.interface';

export class QualityGate implements IQualityGate {
  constructor(
    public readonly gateId: string,
    public readonly name: string,
    public readonly severity: GateSeverity,
    public readonly minScoreThreshold: number,
    public readonly evaluators: IEvaluator<any>[]
  ) {}

  public async evaluateGate(
    artifactIds: string[],
    context: IContextStore,
    waiver?: HumanWaiver
  ): Promise<GateEvaluationResult> {
    const evaluatorResults: EvaluatorResult[] = [];
    const failingEvaluators: string[] = [];
    const evidence: Record<string, any> = {};

    let totalScore = 0;

    // Step 1: Run Deterministic Evaluators first (Fast-Fail, 0 tokens wasted)
    const deterministicEvaluators = this.evaluators.filter(e => e.type === 'DETERMINISTIC');
    const semanticEvaluators = this.evaluators.filter(e => e.type === 'SEMANTIC');

    for (const evaluator of deterministicEvaluators) {
      for (const artifactId of artifactIds) {
        // Find artifact in store
        const artifact = await context.getArtifact<any>('ANY', artifactId);
        const target = artifact || { requirementId: artifactId, id: artifactId };
        const result = await evaluator.evaluate(target, context);
        evaluatorResults.push(result);
        evidence[`${evaluator.evaluatorId}:${artifactId}`] = result;

        if (!result.passed) {
          failingEvaluators.push(evaluator.evaluatorId);
        }
        totalScore += result.score;
      }
    }

    // Fast-fail rule: If any deterministic critical check failed, do NOT waste LLM tokens on semantic evaluators!
    if (failingEvaluators.length > 0 && this.severity === 'CRITICAL') {
      const avgScore = evaluatorResults.length > 0 ? totalScore / evaluatorResults.length : 0;
      return {
        gateId: this.gateId,
        name: this.name,
        severity: this.severity,
        status: 'FAILED',
        score: Number(avgScore.toFixed(2)),
        minScoreThreshold: this.minScoreThreshold,
        evaluatorResults,
        failingEvaluators: Array.from(new Set(failingEvaluators)),
        evidence: {
          ...evidence,
          ...(waiver ? { waiverRejected: 'Critical quality gates cannot be bypassed with human waivers under enterprise policy.' } : {}),
        },
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Step 2: Run Semantic Evaluators (LLM-as-a-judge)
    for (const evaluator of semanticEvaluators) {
      for (const artifactId of artifactIds) {
        const target = { requirementId: artifactId, id: artifactId };
        const result = await evaluator.evaluate(target, context);
        evaluatorResults.push(result);
        evidence[`${evaluator.evaluatorId}:${artifactId}`] = result;

        if (!result.passed) {
          failingEvaluators.push(evaluator.evaluatorId);
        }
        totalScore += result.score;
      }
    }

    const avgScore = evaluatorResults.length > 0 ? totalScore / evaluatorResults.length : 1.0;
    const scoreMeetsThreshold = avgScore >= this.minScoreThreshold;
    const hasFailures = failingEvaluators.length > 0 || !scoreMeetsThreshold;

    // Step 3: Policy Decision Engine & Waiver Handling
    if (!hasFailures) {
      return {
        gateId: this.gateId,
        name: this.name,
        severity: this.severity,
        status: 'PASSED',
        score: Number(avgScore.toFixed(2)),
        minScoreThreshold: this.minScoreThreshold,
        evaluatorResults,
        failingEvaluators: [],
        evidence,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // If gate failed:
    if (this.severity === 'CRITICAL') {
      // Critical gates CANNOT be waived
      return {
        gateId: this.gateId,
        name: this.name,
        severity: this.severity,
        status: 'FAILED',
        score: Number(avgScore.toFixed(2)),
        minScoreThreshold: this.minScoreThreshold,
        evaluatorResults,
        failingEvaluators: Array.from(new Set(failingEvaluators)),
        evidence: {
          ...evidence,
          waiverRejected: 'Critical quality gates cannot be bypassed with human waivers under enterprise policy.',
        },
        evaluatedAt: new Date().toISOString(),
      };
    }

    if (this.severity === 'MAJOR') {
      // Major gates can be bypassed ONLY if a valid signed waiver is supplied
      if (waiver && waiver.humanApprover && waiver.waiverJustification) {
        return {
          gateId: this.gateId,
          name: this.name,
          severity: this.severity,
          status: 'WAIVED_WITH_APPROVAL',
          score: Number(avgScore.toFixed(2)),
          minScoreThreshold: this.minScoreThreshold,
          evaluatorResults,
          failingEvaluators: Array.from(new Set(failingEvaluators)),
          evidence: {
            ...evidence,
            waiverDetails: waiver,
          },
          waiver,
          evaluatedAt: new Date().toISOString(),
        };
      }

      return {
        gateId: this.gateId,
        name: this.name,
        severity: this.severity,
        status: 'FAILED',
        score: Number(avgScore.toFixed(2)),
        minScoreThreshold: this.minScoreThreshold,
        evaluatorResults,
        failingEvaluators: Array.from(new Set(failingEvaluators)),
        evidence,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // MINOR severity is advisory (does not block)
    return {
      gateId: this.gateId,
      name: this.name,
      severity: this.severity,
      status: 'PASSED',
      score: Number(avgScore.toFixed(2)),
      minScoreThreshold: this.minScoreThreshold,
      evaluatorResults,
      failingEvaluators: Array.from(new Set(failingEvaluators)),
      evidence: {
        ...evidence,
        advisoryWarning: 'Minor gate warnings noted; pipeline progression allowed.',
      },
      evaluatedAt: new Date().toISOString(),
    };
  }
}
