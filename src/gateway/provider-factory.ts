/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * AI Provider Factory
 */

import { ILLMProvider } from './provider.interface';
import { MockLLMProvider } from './mock-provider';
import { GeminiProvider } from './gemini-provider';

export type ProviderType = 'mock' | 'gemini';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  defaultModel?: string;
}

export class ProviderFactory {
  public static createProvider(config?: ProviderConfig): ILLMProvider {
    const type = config?.type || (process.env.AI_PROVIDER as ProviderType) || 'mock';

    switch (type.toLowerCase()) {
      case 'gemini': {
        const gemini = new GeminiProvider(config?.apiKey);
        if (!gemini.isConfigured()) {
          console.warn('Warning: GEMINI_API_KEY not configured. Falling back to MockLLMProvider.');
          return new MockLLMProvider();
        }
        return gemini;
      }
      case 'mock':
      default:
        return new MockLLMProvider();
    }
  }
}
