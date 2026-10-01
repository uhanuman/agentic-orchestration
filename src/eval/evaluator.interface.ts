/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Evaluator & Quality Gatekeeper Interfaces (Section 5 & 7)
 */

import { IContextStore } from '../core/context-store';

export type EvaluatorType = 'DETERMINISTIC' | 'SEMANTIC';

export interface EvaluatorResult {
  evaluatorId: string;
  type: EvaluatorType;
  passed: boolean;
  score: number; // 0.0 to 1.0
  rationale: string;
  metadata?: Record<string, any>;
}

export interface IEvaluator<T = any> {
  evaluatorId: string;
  name: string;
  type: EvaluatorType;
  evaluate(target: T, context: IContextStore): Promise<EvaluatorResult>;
}

export type GateSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR';

export interface HumanWaiver {
  humanApprover: string;
  waiverJustification: string;
  approvedAt: string;
}

export interface GateEvaluationResult {
  gateId: string;
  name: string;
  severity: GateSeverity;
  status: 'PASSED' | 'FAILED' | 'WAIVED_WITH_APPROVAL';
  score: number; // Aggregated score 0.0 to 1.0
  minScoreThreshold: number;
  evaluatorResults: EvaluatorResult[];
  failingEvaluators: string[];
  evidence: Record<string, any>;
  waiver?: HumanWaiver;
  evaluatedAt: string;
}

export interface IQualityGate {
  gateId: string;
  name: string;
  severity: GateSeverity;
  minScoreThreshold: number;
  evaluators: IEvaluator<any>[];
  
  evaluateGate(
    artifactIds: string[],
    context: IContextStore,
    waiver?: HumanWaiver
  ): Promise<GateEvaluationResult>;
}
