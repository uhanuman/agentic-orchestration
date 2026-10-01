/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Accessibility NFR Specialist Agent (AGT-A11Y-001) (Section 6.3)
 */

import { IContextStore } from '../../core/context-store';
import { RequirementArtifact, ScenarioArtifact, TestCaseArtifact } from '../../core/types';
import { ILLMProvider } from '../../gateway/provider.interface';
import { BaseAgent } from '../base-agent';
import { NFRAgentInput, NFRAgentOutput } from './security-agent';

export class AccessibilityAgent extends BaseAgent<NFRAgentInput, NFRAgentOutput> {
  public readonly agentId = 'AGT-A11Y-001';
  public readonly agentVersion = '1.0.0';
  public readonly description = 'WCAG 2.1 AA/AAA compliance, screen readers, keyboard navigation, and ARIA semantics.';
  public readonly promptVersion = 'sha256-a11y-agent-v1';

  constructor(contextStore: IContextStore, llmProvider: ILLMProvider) {
    super(contextStore, llmProvider);
  }

  protected async executeInternal(
    input: NFRAgentInput,
    _correlationId: string
  ): Promise<{
    output: NFRAgentOutput;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    inputArtifactIds: string[];
    outputArtifactIds: string[];
  }> {
    const req = await this.contextStore.getArtifact<RequirementArtifact>('REQ', input.requirementId);
    if (!req) {
      throw new Error(`AccessibilityAgent: Requirement ${input.requirementId} not found.`);
    }

    const scns = await this.contextStore.queryArtifacts<ScenarioArtifact>('SCN', {
      requirementId: input.requirementId,
    });
    const fallbackScenarioId = scns[0]?.id || 'SCN-3001';
    const fallbackAcId = scns[0]?.acceptanceCriteriaId || 'AC-2001';

    const systemPrompt = `You are the Principal Quality Engineering Accessibility Specialist Agent (AGT-A11Y-001).
Map user interface interactions and user journey flows to WCAG 2.1 Level AA/AAA requirements:
- Keyboard focus management & focus trapping
- ARIA live regions and semantic roles
- Color contrast ratios (>= 4.5:1 for normal text)
- Screen reader announcements for dynamic status changes

Output specialized ACCESSIBILITY test cases conforming to:
{
  "testCases": [
    {
      "id": string (e.g. "TC-4030"),
      "scenarioId": "${fallbackScenarioId}",
      "requirementId": "${req.id}",
      "acceptanceCriteriaId": "${fallbackAcId}",
      "title": string,
      "type": "ACCESSIBILITY",
      "priority": "P2",
      "preconditions": string[],
      "testDataRequirements": Record<string, string>,
      "steps": [{ "stepIndex": number, "action": string, "expectedResult": string }],
      "postConditions": string[],
      "status": "APPROVED",
      "createdAt": string
    }
  ]
}`;

    const userPrompt = `
Requirement: [${req.id}] ${req.title}
Domain: ${req.domain}
Raw Requirement: ${req.rawText}
`;

    const schema = {
      type: 'object',
      properties: {
        testCases: { type: 'array' },
      },
      required: ['testCases'],
    };

    const response = await this.llmProvider.generateStructured<NFRAgentOutput>({
      systemPrompt,
      userPrompt,
      schema,
      temperature: 0.1,
    });

    const { testCases } = response.data;
    const now = new Date().toISOString();

    for (const tc of testCases) {
      tc.type = 'ACCESSIBILITY';
      tc.requirementId = req.id;
      tc.scenarioId = tc.scenarioId || fallbackScenarioId;
      tc.acceptanceCriteriaId = tc.acceptanceCriteriaId || fallbackAcId;
      tc.createdAt = tc.createdAt || now;
      tc.status = 'APPROVED';
      await this.contextStore.saveArtifact('TC', tc);
    }

    return {
      output: { testCases },
      usage: response.usage,
      inputArtifactIds: [req.id],
      outputArtifactIds: testCases.map(t => t.id),
    };
  }
}
