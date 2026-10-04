/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Generic Markdown Agent Runner
 * Executes any Agent defined as a Markdown (.md) specification file following the 7-step lifecycle:
 *
 *   Agent
 *     │
 *     ├── receives Context
 *     │
 *     ├── consumes Artifact IDs
 *     │
 *     ├── performs reasoning
 *     │
 *     ├── generates Artifact IDs
 *     │
 *     ├── invokes EVAL
 *     │
 *     ├── passes Quality Gate
 *     │
 *     └── publishes Event
 */

import * as crypto from 'crypto';
import * as path from 'path';
import { IContextStore } from '../core/context-store';
import { AgentExecutionLog, AgentLifecycleEvent, TokenUsage } from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { MarkdownSpec, MarkdownSpecParser } from './markdown-spec-parser';
import { MarkdownEvalRunner, EvalExecutionResult } from './markdown-eval-runner';
import { QualityGateRunner, GateExecutionReport } from './quality-gate-runner';

export interface AgentLifecycleOptions {
  runId?: string;
  inputArtifactIds?: string[];
  evaluators?: MarkdownEvalRunner[];
  qualityGate?: QualityGateRunner;
  onEvent?: (event: AgentLifecycleEvent) => void;
}

export interface AgentExecutionResult<T = any> {
  agentId: string;
  runId: string;
  specPath: string;
  output: T;
  log: AgentExecutionLog;
  lifecycleEvent: AgentLifecycleEvent;
  evalResults?: EvalExecutionResult[];
  gateReport?: GateExecutionReport;
}

function pathBase(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  return base.replace(/^\d+\./, '').replace(/\.agent$/, '');
}

export class MarkdownAgentRunner {
  public readonly spec: MarkdownSpec;
  public readonly agentId: string;
  public readonly agentName: string;
  public readonly agentVersion: string;
  public readonly defaultModel: string;
  public readonly temperature: number;
  public readonly declaredInputArtifacts: string[];
  public readonly declaredOutputArtifacts: string[];
  public readonly declaredInputPaths: string[];
  public readonly declaredOutputPaths: string[];
  public readonly evaluatorIds: string[];
  public readonly gateIds: string[];
  public readonly nextAgents: string[];

  constructor(
    public readonly specPath: string,
    private contextStore: IContextStore,
    private llmProvider: ILLMProvider
  ) {
    this.spec = MarkdownSpecParser.parseFile(specPath);
    this.agentId = this.spec.metadata['id'] || pathBase(specPath);
    this.agentName = this.spec.metadata['name'] || this.spec.title;
    this.agentVersion = this.spec.metadata['version'] || '1.0.0';
    this.defaultModel = this.spec.metadata['model'] || this.llmProvider.defaultModel;
    this.temperature = parseFloat(this.spec.metadata['temperature'] || '0.1');

    this.declaredInputArtifacts = this.spec.getList('inputArtifacts');
    this.declaredOutputArtifacts = this.spec.getList('outputArtifacts');
    this.declaredInputPaths = this.spec.getList('inputPaths');
    this.declaredOutputPaths = this.spec.getList('outputPaths');
    this.evaluatorIds = this.spec.getList('evaluatorIds');
    this.gateIds = this.spec.getList('gateIds').length > 0
      ? this.spec.getList('gateIds')
      : (this.spec.metadata['enforcingGate'] ? [this.spec.metadata['enforcingGate']] : []);
    this.nextAgents = this.spec.getList('nextAgents');
  }

  /**
   * Executes the full 7-step Agent lifecycle:
   * 1. receives Context
   * 2. consumes Artifact IDs
   * 3. performs reasoning
   * 4. generates Artifact IDs
   * 5. invokes EVAL
   * 6. passes Quality Gate
   * 7. publishes Event
   */
  public async execute<TOutput = any>(
    userPrompt: string,
    correlationId: string,
    inputArtifactIds: string[] = [],
    options: AgentLifecycleOptions = {}
  ): Promise<AgentExecutionResult<TOutput>> {
    // 1. Receives Context
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const runId = options.runId || this.generateRunId();

    // 2. Consumes Artifact IDs
    const consumedInputArtifacts = inputArtifactIds.length > 0
      ? inputArtifactIds
      : (options.inputArtifactIds || []);

    // 3. Performs Reasoning
    const systemPrompt = this.spec.systemPrompt || this.spec.raw;
    const schema = this.spec.schema || { type: 'object' };

    const response = await this.llmProvider.generateStructured<TOutput>({
      systemPrompt,
      userPrompt,
      schema,
      temperature: this.temperature,
      modelOverride: this.defaultModel,
    });

    const durationMs = Date.now() - startTime;
    const usage = response.usage;

    const tokenUsage: TokenUsage = {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCostUsd: this.llmProvider.calculateCost(
        this.defaultModel,
        usage.promptTokens,
        usage.completionTokens
      ),
    };

    // 4. Generates Artifact IDs
    const outputArtifactIds = this.extractArtifactIds(response.data);

    // 5. Invokes EVAL
    const evalResults: EvalExecutionResult[] = [];
    if (options.evaluators && options.evaluators.length > 0) {
      for (const evaluator of options.evaluators) {
        try {
          const evalRes = await evaluator.evaluate(response.data, this.contextStore);
          evalResults.push(evalRes);
        } catch {
          // Eval error handled gracefully
        }
      }
    }

    // 6. Passes Quality Gate
    let gateReport: GateExecutionReport | undefined;
    let gateStatus: 'PASSED' | 'FAILED' | 'NEEDS_RETRY' | 'ESCALATED' = 'PASSED';
    if (options.qualityGate) {
      gateReport = await options.qualityGate.evaluate(response.data, this.contextStore);
      gateStatus = gateReport.status === 'PASSED' || gateReport.status === 'WAIVED_WITH_APPROVAL'
        ? 'PASSED'
        : 'FAILED';
    }

    // 7. Publishes Event
    const lifecycleEvent: AgentLifecycleEvent = {
      agentId: this.agentId,
      runId,
      inputArtifacts: consumedInputArtifacts,
      outputArtifacts: outputArtifactIds,
      evaluatorIds: this.evaluatorIds,
      gateIds: this.gateIds,
      nextAgents: this.nextAgents,
      timestamp,
    };

    if (options.onEvent) {
      options.onEvent(lifecycleEvent);
    }

    // Audit log persistence
    const log: AgentExecutionLog = {
      runId,
      correlationId,
      agentId: this.agentId,
      agentVersion: this.agentVersion,
      aiProvider: this.llmProvider.providerName,
      modelName: this.defaultModel,
      promptVersion: `md-${this.agentId}-${this.agentVersion}`,
      inputArtifactIds: consumedInputArtifacts,
      outputArtifactIds,
      evaluatorIds: this.evaluatorIds,
      gateIds: this.gateIds,
      nextAgents: this.nextAgents,
      tokenUsage,
      durationMs,
      evalResults: evalResults.map(e => ({
        evaluatorId: e.evaluatorId,
        passed: e.passed,
        score: e.score,
        rationale: e.rationale,
      })),
      gateResult: gateStatus,
      finalStatus: gateStatus === 'FAILED' ? 'FAILURE' : 'SUCCESS',
      timestamp,
    };

    await this.contextStore.logExecution(log);

    return {
      agentId: this.agentId,
      runId,
      specPath: this.specPath,
      output: response.data,
      log,
      lifecycleEvent,
      evalResults,
      gateReport,
    };
  }

  private generateRunId(): string {
    const d = new Date();
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `RUN-${dateStr}-${rand}`;
  }

  private extractArtifactIds(output: any): string[] {
    const ids: string[] = [];
    if (!output || typeof output !== 'object') return ids;

    if (typeof output.id === 'string' && output.id.length > 0) {
      ids.push(output.id);
    }

    for (const key of Object.keys(output)) {
      const val = output[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === 'object' && typeof item.id === 'string') {
            ids.push(item.id);
          }
        }
      } else if (val && typeof val === 'object' && typeof val.id === 'string') {
        ids.push(val.id);
      }
    }

    return Array.from(new Set(ids));
  }
}
