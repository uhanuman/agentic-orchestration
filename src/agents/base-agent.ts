/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Base Agent with Telemetry, Context Access & Fast-Fail
 */

import * as crypto from 'crypto';
import { IContextStore } from '../core/context-store';
import { AgentExecutionLog, TokenUsage } from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { AgentExecutionResponse, IAgent } from './agent.interface';

export abstract class BaseAgent<TInput, TOutput> implements IAgent<TInput, TOutput> {
  abstract readonly agentId: string;
  abstract readonly agentVersion: string;
  abstract readonly description: string;
  abstract readonly promptVersion: string;

  constructor(
    protected contextStore: IContextStore,
    protected llmProvider: ILLMProvider
  ) {}

  public async execute(
    input: TInput,
    correlationId: string
  ): Promise<AgentExecutionResponse<TOutput>> {
    const runId = crypto.randomUUID();
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    let tokenUsage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0.0,
    };

    try {
      const { output, usage, inputArtifactIds, outputArtifactIds } = await this.executeInternal(
        input,
        correlationId
      );

      if (usage) {
        tokenUsage = {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsd: this.llmProvider.calculateCost(
            this.llmProvider.defaultModel,
            usage.promptTokens,
            usage.completionTokens
          ),
        };
      }

      const durationMs = Date.now() - startTime;

      const log: AgentExecutionLog = {
        runId,
        correlationId,
        agentId: this.agentId,
        agentVersion: this.agentVersion,
        aiProvider: this.llmProvider.providerName,
        modelName: this.llmProvider.defaultModel,
        promptVersion: this.promptVersion,
        inputArtifactIds,
        outputArtifactIds,
        evaluatorIds: [],
        gateIds: [],
        tokenUsage,
        durationMs,
        evalResults: [],
        gateResult: 'PASSED',
        finalStatus: 'SUCCESS',
        timestamp,
      };

      await this.contextStore.logExecution(log);

      return {
        output,
        log,
      };
    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      const failureLog: AgentExecutionLog = {
        runId,
        correlationId,
        agentId: this.agentId,
        agentVersion: this.agentVersion,
        aiProvider: this.llmProvider.providerName,
        modelName: this.llmProvider.defaultModel,
        promptVersion: this.promptVersion,
        inputArtifactIds: [],
        outputArtifactIds: [],
        evaluatorIds: [],
        gateIds: [],
        tokenUsage,
        durationMs,
        evalResults: [],
        gateResult: 'FAILED',
        finalStatus: 'FAILURE',
        timestamp,
      };

      await this.contextStore.logExecution(failureLog).catch(() => {});
      throw error;
    }
  }

  protected abstract executeInternal(
    input: TInput,
    correlationId: string
  ): Promise<{
    output: TOutput;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    inputArtifactIds: string[];
    outputArtifactIds: string[];
  }>;
}
