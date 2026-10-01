/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Presentation & CLI Runner
 */

import { InMemoryContextStore } from '../core/context-store';
import { ProviderFactory, ProviderType } from '../gateway/provider-factory';
import { DAGEngine, PipelineInput, PipelineResult } from '../orchestrator/dag-engine';
import { PipelineVisualizer } from './visualizer';

export interface CLIOptions {
  provider?: ProviderType;
  story?: string;
  epicId?: string;
  featureName?: string;
  domain?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  releaseVersion?: string;
  waiverGateId?: string;
  waiverApprover?: string;
  waiverJustification?: string;
}

export class CLIRunner {
  public static async run(options: CLIOptions = {}): Promise<PipelineResult> {
    const providerType = (options.provider || process.env.AI_PROVIDER || 'mock') as ProviderType;
    const llmProvider = ProviderFactory.createProvider({ type: providerType });
    const contextStore = new InMemoryContextStore();

    const engine = new DAGEngine(contextStore, llmProvider);

    const defaultStory = `As a customer, I want to cancel my pending order online before it ships, so that I can immediately receive a refund to my original payment method without contacting customer support.`;

    const waivers: Record<string, any> = {};
    if (options.waiverGateId && options.waiverApprover && options.waiverJustification) {
      waivers[options.waiverGateId] = {
        humanApprover: options.waiverApprover,
        waiverJustification: options.waiverJustification,
        approvedAt: new Date().toISOString(),
      };
    }

    const input: PipelineInput = {
      rawText: options.story || defaultStory,
      epicId: options.epicId || 'EPIC-ORDERS-001',
      featureName: options.featureName || 'Customer Order Cancellation',
      domain: options.domain || 'Order Fulfillment & Payment Processing',
      priority: options.priority || 'HIGH',
      releaseVersion: options.releaseVersion || 'v3.0.0',
      waivers,
    };

    console.log(`Starting Agentic QE Pipeline runner using [${llmProvider.providerName}] provider...`);
    const result = await engine.run(input);
    PipelineVisualizer.renderPipelineSummary(result);
    return result;
  }
}
