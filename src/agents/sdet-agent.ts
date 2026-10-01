/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * SDET Automation Blueprint Agent (AGT-SDET-001) (Section 6.4)
 */

import { IContextStore } from '../core/context-store';
import { TestCaseArtifact, AutomationBlueprintArtifact } from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { BaseAgent } from './base-agent';

export interface SDETAgentInput {
  testCaseIds: string[];
}

export interface SDETAgentOutput {
  blueprints: AutomationBlueprintArtifact[];
}

export class SDETAutomationAgent extends BaseAgent<SDETAgentInput, SDETAgentOutput> {
  public readonly agentId = 'AGT-SDET-001';
  public readonly agentVersion = '1.0.0';
  public readonly description = 'Generates tool-agnostic automation contracts, executable blueprints, and assertion manifests.';
  public readonly promptVersion = 'sha256-sdet-agent-v1';

  constructor(contextStore: IContextStore, llmProvider: ILLMProvider) {
    super(contextStore, llmProvider);
  }

  protected async executeInternal(
    input: SDETAgentInput,
    _correlationId: string
  ): Promise<{
    output: SDETAgentOutput;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    inputArtifactIds: string[];
    outputArtifactIds: string[];
  }> {
    const testCases: TestCaseArtifact[] = [];
    for (const tcId of input.testCaseIds) {
      const tc = await this.contextStore.getArtifact<TestCaseArtifact>('TC', tcId);
      if (tc) testCases.push(tc);
    }

    if (testCases.length === 0) {
      throw new Error(`SDETAutomationAgent: None of the provided testCaseIds (${input.testCaseIds.join(', ')}) were found.`);
    }

    const systemPrompt = `You are the Principal SDET Automation Blueprint Agent (AGT-SDET-001).
Answer "HOW can approved tests be automated?" without executing them.
For each approved TestCase:
1. Determine automationFeasible (true/false).
2. If false, provide a mandatory cannotAutomateReason.
3. Select recommendedHarness: "PLAYWRIGHT_TS" | "REST_API" | "K6_PERF" | "AXE_A11Y" | "MANUAL".
4. Generate a clean, typed codeBlueprint implementing the steps and assertions.
5. Provide explicit assertion strings and reasonable executionTimeoutMs.

Output strict JSON:
{
  "blueprints": [
    {
      "id": string (e.g. "AUT-5001"),
      "testCaseId": string,
      "automationFeasible": boolean,
      "cannotAutomateReason": string,
      "recommendedHarness": "PLAYWRIGHT_TS" | "REST_API" | "K6_PERF" | "AXE_A11Y" | "MANUAL",
      "targetComponent": string,
      "targetEndpointOrUrl": string,
      "codeBlueprint": string,
      "assertions": string[],
      "executionTimeoutMs": number,
      "status": "READY_FOR_HARNESS",
      "createdAt": string
    }
  ]
}`;

    const userPrompt = `
Generate Automation Blueprints for the following Test Cases:
${testCases
  .map(
    tc => `[${tc.id}] (${tc.type}, ${tc.priority}) ${tc.title}
Preconditions: ${tc.preconditions.join('; ')}
Test Data: ${JSON.stringify(tc.testDataRequirements)}
Steps:
${tc.steps.map(s => `  ${s.stepIndex}. Action: ${s.action} -> Expected: ${s.expectedResult}`).join('\n')}
Postconditions: ${tc.postConditions.join('; ')}`
  )
  .join('\n\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        blueprints: { type: 'array' },
      },
      required: ['blueprints'],
    };

    const response = await this.llmProvider.generateStructured<SDETAgentOutput>({
      systemPrompt,
      userPrompt,
      schema,
      temperature: 0.1,
    });

    const { blueprints } = response.data;
    const now = new Date().toISOString();

    for (const aut of blueprints) {
      aut.createdAt = aut.createdAt || now;
      aut.status = aut.automationFeasible ? 'READY_FOR_HARNESS' : 'BLOCKED';
      await this.contextStore.saveArtifact('AUT', aut);
    }

    return {
      output: { blueprints },
      usage: response.usage,
      inputArtifactIds: testCases.map(t => t.id),
      outputArtifactIds: blueprints.map(b => b.id),
    };
  }
}
