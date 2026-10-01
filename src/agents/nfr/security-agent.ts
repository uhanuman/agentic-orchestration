/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Security NFR Specialist Agent (AGT-SEC-001) (Section 6.3)
 */

import { IContextStore } from '../../core/context-store';
import { RequirementArtifact, ScenarioArtifact, TestCaseArtifact } from '../../core/types';
import { ILLMProvider } from '../../gateway/provider.interface';
import { BaseAgent } from '../base-agent';

export interface NFRAgentInput {
  requirementId: string;
}

export interface NFRAgentOutput {
  testCases: TestCaseArtifact[];
}

export class SecurityAgent extends BaseAgent<NFRAgentInput, NFRAgentOutput> {
  public readonly agentId = 'AGT-SEC-001';
  public readonly agentVersion = '1.0.0';
  public readonly description = 'OWASP Top 10, AuthN/AuthZ bypass, IDOR, injection, and privacy vulnerability analysis.';
  public readonly promptVersion = 'sha256-sec-agent-v1';

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
      throw new Error(`SecurityAgent: Requirement ${input.requirementId} not found.`);
    }

    const scns = await this.contextStore.queryArtifacts<ScenarioArtifact>('SCN', {
      requirementId: input.requirementId,
    });
    const fallbackScenarioId = scns[0]?.id || 'SCN-3001';
    const fallbackAcId = scns[0]?.acceptanceCriteriaId || 'AC-2001';

    const systemPrompt = `You are the Principal Quality Engineering Security Specialist Agent (AGT-SEC-001).
Analyze the requirement for critical cybersecurity vulnerabilities:
- OWASP API Top 10 (Broken Object Level Authorization / IDOR, Broken Function Level Authorization)
- Injection vectors (SQL, NoSQL, Command)
- Data exfiltration & sensitive parameter leakage
- Rate limiting, replay attacks, and token tampering

Output specialized SECURITY test cases conforming to:
{
  "testCases": [
    {
      "id": string (e.g. "TC-4010"),
      "scenarioId": "${fallbackScenarioId}",
      "requirementId": "${req.id}",
      "acceptanceCriteriaId": "${fallbackAcId}",
      "title": string,
      "type": "SECURITY",
      "priority": "P0" | "P1",
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
Existing Risks: ${JSON.stringify(req.risksIdentified, null, 2)}
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
      tc.type = 'SECURITY';
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
