/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Quality Gate Runner based on Markdown Gate Policies
 */

import { IContextStore } from '../core/context-store';
import { EvaluatorResult, MarkdownEvalRunner } from './markdown-eval-runner';

export type GateSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export interface HumanWaiver {
  humanApprover: string;
  waiverJustification: string;
  approvedAt: string;
}

export interface GateExecutionReport {
  gateId: string;
  name: string;
  severity: GateSeverity;
  status: 'PASSED' | 'FAILED' | 'WAIVED_WITH_APPROVAL';
  score: number;
  minScoreThreshold: number;
  evaluatorResults: EvaluatorResult[];
  failingEvaluators: string[];
  waiver?: HumanWaiver;
  evaluatedAt: string;
}

export class QualityGateRunner {
  constructor(
    public readonly gateId: string,
    public readonly name: string,
    public readonly severity: GateSeverity,
    public readonly minScoreThreshold: number,
    public readonly evaluators: MarkdownEvalRunner[]
  ) {}

  public async evaluate(
    target: any,
    context: IContextStore,
    waiver?: HumanWaiver
  ): Promise<GateExecutionReport> {
    const evaluatorResults: EvaluatorResult[] = [];
    const failingEvaluators: string[] = [];
    let totalScore = 0;

    // Run deterministic evaluators first (fast-fail, 0 tokens)
    const deterministic = this.evaluators.filter(e => e.type === 'DETERMINISTIC');
    const semantic = this.evaluators.filter(e => e.type === 'SEMANTIC');

    for (const evalRunner of deterministic) {
      const res = await evalRunner.evaluate(target, context);
      evaluatorResults.push(res);
      totalScore += res.score;
      if (!res.passed) {
        failingEvaluators.push(evalRunner.evaluatorId);
      }
    }

    // Fast-fail rule: If any critical deterministic check fails, halt immediately
    if (failingEvaluators.length > 0 && this.severity === 'CRITICAL') {
      const avgScore = totalScore / evaluatorResults.length;
      return {
        gateId: this.gateId,
        name: this.name,
        severity: this.severity,
        status: 'FAILED',
        score: Number(avgScore.toFixed(2)),
        minScoreThreshold: this.minScoreThreshold,
        evaluatorResults,
        failingEvaluators,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Run semantic evaluators
    for (const evalRunner of semantic) {
      const res = await evalRunner.evaluate(target, context);
      evaluatorResults.push(res);
      totalScore += res.score;
      if (!res.passed) {
        failingEvaluators.push(evalRunner.evaluatorId);
      }
    }

    const avgScore = evaluatorResults.length > 0 ? totalScore / evaluatorResults.length : 1.0;
    const scoreMeetsThreshold = avgScore >= this.minScoreThreshold;
    const hasFailures = failingEvaluators.length > 0 || !scoreMeetsThreshold;

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
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Handle failure policy by severity
    if (this.severity === 'CRITICAL') {
      return {
        gateId: this.gateId,
        name: this.name,
        severity: this.severity,
        status: 'FAILED',
        score: Number(avgScore.toFixed(2)),
        minScoreThreshold: this.minScoreThreshold,
        evaluatorResults,
        failingEvaluators,
        evaluatedAt: new Date().toISOString(),
      };
    }

    if (this.severity === 'MAJOR') {
      if (waiver && waiver.humanApprover && waiver.waiverJustification) {
        return {
          gateId: this.gateId,
          name: this.name,
          severity: this.severity,
          status: 'WAIVED_WITH_APPROVAL',
          score: Number(avgScore.toFixed(2)),
          minScoreThreshold: this.minScoreThreshold,
          evaluatorResults,
          failingEvaluators,
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
        failingEvaluators,
        evaluatedAt: new Date().toISOString(),
      };
    }

    // MINOR is advisory
    return {
      gateId: this.gateId,
      name: this.name,
      severity: this.severity,
      status: 'PASSED',
      score: Number(avgScore.toFixed(2)),
      minScoreThreshold: this.minScoreThreshold,
      evaluatorResults,
      failingEvaluators,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
