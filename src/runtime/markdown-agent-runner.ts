/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Generic Markdown Agent Runner
 * Executes any Agent defined as a Markdown (.md) specification file.
 */

import * as crypto from 'crypto';
import { IContextStore } from '../core/context-store';
import { AgentExecutionLog, TokenUsage } from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { MarkdownSpec, MarkdownSpecParser } from './markdown-spec-parser';

export interface AgentExecutionResult<T = any> {
  agentId: string;
  specPath: string;
  output: T;
  log: AgentExecutionLog;
}

export class MarkdownAgentRunner {
  public readonly spec: MarkdownSpec;
  public readonly agentId: string;
  public readonly agentName: string;
  public readonly agentVersion: string;
  public readonly defaultModel: string;
  public readonly temperature: number;

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
  }

  public async execute<TOutput = any>(
    userPrompt: string,
    correlationId: string,
    inputArtifactIds: string[] = []
  ): Promise<AgentExecutionResult<TOutput>> {
    const runId = crypto.randomUUID();
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    const systemPrompt = this.spec.systemPrompt || this.spec.raw;
    const schema = this.spec.schema || { type: 'object' };

    try {
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

      // Extract output IDs if present
      const outputArtifactIds = this.extractArtifactIds(response.data);

      const log: AgentExecutionLog = {
        runId,
        correlationId,
        agentId: this.agentId,
        agentVersion: this.agentVersion,
        aiProvider: this.llmProvider.providerName,
        modelName: this.defaultModel,
        promptVersion: `md-${this.agentId}-${this.agentVersion}`,
        inputArtifactIds,
        outputArtifactIds,
        evaluatorIds: [],
        gateIds: this.spec.metadata['enforcingGate'] ? [this.spec.metadata['enforcingGate']] : [],
        tokenUsage,
        durationMs,
        evalResults: [],
        gateResult: 'PASSED',
        finalStatus: 'SUCCESS',
        timestamp,
      };

      await this.contextStore.logExecution(log);

      return {
        agentId: this.agentId,
        specPath: this.specPath,
        output: response.data,
        log,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      const failureLog: AgentExecutionLog = {
        runId,
        correlationId,
        agentId: this.agentId,
        agentVersion: this.agentVersion,
        aiProvider: this.llmProvider.providerName,
        modelName: this.defaultModel,
        promptVersion: `md-${this.agentId}-${this.agentVersion}`,
        inputArtifactIds,
        outputArtifactIds: [],
        evaluatorIds: [],
        gateIds: [],
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
        durationMs,
        evalResults: [],
        gateResult: 'FAILED',
        finalStatus: 'FAILURE',
        timestamp,
      };

      await this.contextStore.logExecution(failureLog).catch(() => {});
      throw err;
    }
  }

  private extractArtifactIds(data: any): string[] {
    const ids: string[] = [];
    if (!data || typeof data !== 'object') return ids;

    if (data.id && typeof data.id === 'string') ids.push(data.id);
    if (data.requirement?.id) ids.push(data.requirement.id);

    const checkArray = (arr: any[]) => {
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (item?.id) ids.push(item.id);
        }
      }
    };

    checkArray(data.acceptanceCriteria);
    checkArray(data.scenarios);
    checkArray(data.testCases);
    checkArray(data.blueprints);

    return ids;
  }
}

function pathBase(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1].replace(/\.md$/, '');
}
