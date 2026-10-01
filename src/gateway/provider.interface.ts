/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * AI Provider Abstraction Layer (Section 5)
 */

export interface StructuredGenerationParams {
  systemPrompt: string;
  userPrompt: string;
  schema: object;
  temperature?: number;
  maxTokens?: number;
  modelOverride?: string;
}

export interface StructuredGenerationResult<T> {
  data: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
  modelUsed: string;
  providerName: string;
  costUsd: number;
}

export interface ILLMProvider {
  providerName: string;
  defaultModel: string;
  
  generateStructured<T>(params: StructuredGenerationParams): Promise<StructuredGenerationResult<T>>;
  
  calculateCost(model: string, promptTokens: number, completionTokens: number): number;
}
