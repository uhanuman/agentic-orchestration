/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Google Gemini Live Provider Adapter via @google/genai SDK
 */

import { GoogleGenAI } from '@google/genai';
import {
  ILLMProvider,
  StructuredGenerationParams,
  StructuredGenerationResult,
} from './provider.interface';

export class GeminiProvider implements ILLMProvider {
  public readonly providerName = 'Google-Gemini';
  public readonly defaultModel = 'gemini-3.8-flash';
  private client: GoogleGenAI | null = null;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey !== undefined ? apiKey : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '');
    if (this.apiKey && this.apiKey.trim().length > 0) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  public isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Gemini 3.8 Flash Pricing:
   * Prompt tokens: $0.15 / 1,000,000 tokens ($0.00000015/token)
   * Completion tokens: $0.60 / 1,000,000 tokens ($0.00000060/token)
   */
  public calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    let promptRate = 0.00000015;
    let completionRate = 0.0000006;

    if (model.includes('pro')) {
      promptRate = 0.00000125;
      completionRate = 0.000005;
    }

    const cost = promptTokens * promptRate + completionTokens * completionRate;
    return Number(cost.toFixed(6));
  }

  public async generateStructured<T>(
    params: StructuredGenerationParams
  ): Promise<StructuredGenerationResult<T>> {
    if (!this.client) {
      throw new Error(
        'GeminiProvider: GEMINI_API_KEY or GOOGLE_API_KEY is not set. Please supply an API key or use MockLLMProvider for offline deterministic execution.'
      );
    }

    const modelName = params.modelOverride || this.defaultModel;
    const startTime = Date.now();

    // Prepare prompt with explicit JSON instruction and schema
    const promptWithSchema = `
${params.userPrompt}

You MUST reply with valid, strict JSON matching this schema:
\`\`\`json
${JSON.stringify(params.schema, null, 2)}
\`\`\`
Return only the raw JSON string without surrounding backticks or markdown if possible.
`;

    const initialModel = params.modelOverride || this.defaultModel;
    const fallbackModels = Array.from(new Set([initialModel, 'gemini-3.7-flash', 'gemini-flash-latest']));

    let lastError: any;
    for (let attempt = 0; attempt < fallbackModels.length; attempt++) {
      const activeModel = fallbackModels[attempt];
      try {
        console.log(`[GeminiProvider] Attempting model: ${activeModel} (attempt ${attempt + 1}/${fallbackModels.length})`);
        const response = await this.client.models.generateContent({
          model: activeModel,
          contents: promptWithSchema,
          config: {
            systemInstruction: params.systemPrompt,
            responseMimeType: 'application/json',
            temperature: params.temperature ?? 0.2,
            maxOutputTokens: params.maxTokens ?? 8192,
          },
        });

        const durationMs = Date.now() - startTime;
        const rawText = response.text || '{}';

        // Parse JSON with clean fallback
        let parsedData: T;
        try {
          parsedData = JSON.parse(rawText) as T;
        } catch {
          const cleaned = rawText
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/```$/, '')
            .trim();
          parsedData = JSON.parse(cleaned) as T;
        }

        // Usage metrics
        const usageMetadata = response.usageMetadata;
        const promptTokens = usageMetadata?.promptTokenCount || Math.ceil((params.systemPrompt.length + params.userPrompt.length) / 4);
        const completionTokens = usageMetadata?.candidatesTokenCount || Math.ceil(rawText.length / 4);
        const totalTokens = usageMetadata?.totalTokenCount || promptTokens + completionTokens;

        const costUsd = this.calculateCost(activeModel, promptTokens, completionTokens);

        return {
          data: parsedData,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
          },
          durationMs,
          modelUsed: activeModel,
          providerName: this.providerName,
          costUsd,
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[GeminiProvider] Model ${activeModel} failed: ${errMsg}`);
        if ((errMsg.includes('503') || errMsg.includes('429') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) && attempt < fallbackModels.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        throw new Error(`GeminiProvider execution failed: ${errMsg}`);
      }
    }
    throw new Error(`GeminiProvider execution failed: ${lastError?.message || 'All candidate models exhausted'}`);
  }
}
