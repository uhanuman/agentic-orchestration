/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Telemetry Bus & Audit-Grade Observability (Section 2, 4, 10)
 */

import { AgentExecutionLog } from '../core/types';
import { GateExecutionReport } from '../runtime/quality-gate-runner';

export interface WorkflowTelemetrySummary {
  correlationId: string;
  totalDurationMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  agentExecutions: number;
  gatesEvaluated: number;
  gatesPassed: number;
  gatesWaived: number;
  gatesFailed: number;
  gateResults: GateExecutionReport[];
  agentLogs: AgentExecutionLog[];
  completedAt: string;
}

export class TelemetryBus {
  private logs: AgentExecutionLog[] = [];
  private gateResults: GateExecutionReport[] = [];
  private startTime: number = Date.now();

  constructor(public readonly correlationId: string) {}

  public recordAgentLog(log: AgentExecutionLog): void {
    this.logs.push(structuredClone(log));
  }

  public recordGateResult(gateResult: GateExecutionReport): void {
    this.gateResults.push(structuredClone(gateResult));
  }

  public getSummary(): WorkflowTelemetrySummary {
    const totalDurationMs = Date.now() - this.startTime;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalTokens = 0;
    let totalCostUsd = 0;

    for (const log of this.logs) {
      if (log.tokenUsage) {
        totalPromptTokens += log.tokenUsage.promptTokens;
        totalCompletionTokens += log.tokenUsage.completionTokens;
        totalTokens += log.tokenUsage.totalTokens;
        totalCostUsd += log.tokenUsage.estimatedCostUsd;
      }
    }

    const gatesPassed = this.gateResults.filter(g => g.status === 'PASSED').length;
    const gatesWaived = this.gateResults.filter(g => g.status === 'WAIVED_WITH_APPROVAL').length;
    const gatesFailed = this.gateResults.filter(g => g.status === 'FAILED').length;

    return {
      correlationId: this.correlationId,
      totalDurationMs,
      totalPromptTokens,
      totalCompletionTokens,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(6)),
      agentExecutions: this.logs.length,
      gatesEvaluated: this.gateResults.length,
      gatesPassed,
      gatesWaived,
      gatesFailed,
      gateResults: structuredClone(this.gateResults),
      agentLogs: structuredClone(this.logs),
      completedAt: new Date().toISOString(),
    };
  }
}
