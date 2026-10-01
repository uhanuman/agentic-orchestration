/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Test Design Agent (AGT-DES-001) (Section 6.2)
 */

import { IContextStore } from '../core/context-store';
import {
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
} from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { BaseAgent } from './base-agent';

export interface TestDesignInput {
  requirementId: string;
}

export interface TestDesignOutput {
  scenarios: ScenarioArtifact[];
  testCases: TestCaseArtifact[];
}

export class TestDesignAgent extends BaseAgent<TestDesignInput, TestDesignOutput> {
  public readonly agentId = 'AGT-DES-001';
  public readonly agentVersion = '1.0.0';
  public readonly description = 'Answers WHAT needs to be tested using formal testing heuristics (BVA, equivalence, negative flows).';
  public readonly promptVersion = 'sha256-des-agent-v1';

  constructor(contextStore: IContextStore, llmProvider: ILLMProvider) {
    super(contextStore, llmProvider);
  }

  protected async executeInternal(
    input: TestDesignInput,
    _correlationId: string
  ): Promise<{
    output: TestDesignOutput;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    inputArtifactIds: string[];
    outputArtifactIds: string[];
  }> {
    // Reference by ID: Retrieve targeted slice from Context Store
    const req = await this.contextStore.getArtifact<RequirementArtifact>('REQ', input.requirementId);
    if (!req) {
      throw new Error(`TestDesignAgent: Requirement ${input.requirementId} not found in Context Store.`);
    }

    const acs = await this.contextStore.queryArtifacts<AcceptanceCriteriaArtifact>('AC', {
      requirementId: input.requirementId,
    });
    if (acs.length === 0) {
      throw new Error(`TestDesignAgent: No Acceptance Criteria found for Requirement ${input.requirementId}.`);
    }

    const systemPrompt = `You are the Principal Quality Engineering Test Design Agent (AGT-DES-001).
Your role is to answer "WHAT needs to be tested?" using formal testing heuristics:
1. Positive Happy Paths
2. Negative & Abuse Cases (invalid state transitions, forbidden parameters)
3. Boundary Value Analysis (min, max, empty, overflow)
4. Exception & Resilience flows

Maintain 100% referential integrity:
- Every Scenario MUST have valid requirementId and acceptanceCriteriaId.
- Every TestCase MUST have valid scenarioId, requirementId, and acceptanceCriteriaId.
- At least one scenario must be generated per Acceptance Criteria.

Output strict JSON:
{
  "scenarios": [
    {
      "id": string (e.g. "SCN-3001"),
      "requirementId": "${req.id}",
      "acceptanceCriteriaId": string,
      "title": string,
      "classification": "POSITIVE" | "NEGATIVE" | "BOUNDARY" | "EXCEPTION" | "INTEGRATION" | "E2E",
      "targetLayer": "UI" | "API" | "DATABASE" | "MESSAGING",
      "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "scenarioDescription": string,
      "isRegressionCandidate": boolean,
      "status": "APPROVED",
      "createdAt": string
    }
  ],
  "testCases": [
    {
      "id": string (e.g. "TC-4001"),
      "scenarioId": string,
      "requirementId": "${req.id}",
      "acceptanceCriteriaId": string,
      "title": string,
      "type": "FUNCTIONAL" | "SECURITY" | "PERFORMANCE" | "ACCESSIBILITY" | "RESILIENCE",
      "priority": "P0" | "P1" | "P2" | "P3",
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

Acceptance Criteria to cover:
${acs
  .map(
    ac => `ID: ${ac.id}
  Given: ${ac.given.join('; ')}
  When: ${ac.when}
  Then: ${ac.then.join('; ')}
  Business Rules: ${ac.businessRules.join('; ')}`
  )
  .join('\n\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        scenarios: { type: 'array' },
        testCases: { type: 'array' },
      },
      required: ['scenarios', 'testCases'],
    };

    const response = await this.llmProvider.generateStructured<TestDesignOutput>({
      systemPrompt,
      userPrompt,
      schema,
      temperature: 0.1,
    });

    const { scenarios, testCases } = response.data;
    const now = new Date().toISOString();

    for (const scn of scenarios) {
      scn.requirementId = req.id;
      scn.createdAt = scn.createdAt || now;
      scn.status = 'APPROVED';
      await this.contextStore.saveArtifact('SCN', scn);
    }

    for (const tc of testCases) {
      tc.requirementId = req.id;
      tc.createdAt = tc.createdAt || now;
      tc.status = 'APPROVED';
      await this.contextStore.saveArtifact('TC', tc);
    }

    const output: TestDesignOutput = { scenarios, testCases };
    return {
      output,
      usage: response.usage,
      inputArtifactIds: [req.id, ...acs.map(a => a.id)],
      outputArtifactIds: [...scenarios.map(s => s.id), ...testCases.map(t => t.id)],
    };
  }
}
