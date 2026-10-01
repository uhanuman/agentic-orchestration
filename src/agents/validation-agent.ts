/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Test Validation & Drift Agent (AGT-VAL-001) (Section 6.5)
 */

import { IContextStore } from '../core/context-store';
import {
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
} from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { BaseAgent } from './base-agent';

export interface ValidationAgentInput {
  requirementId: string;
}

export interface ValidationAgentOutput {
  hasContradictions: boolean;
  hallucinationIndex: number; // 0.0 to 1.0
  driftFindings: string[];
  groundingConfidence: number; // 0.0 to 1.0
  verdict: 'APPROVED' | 'FLAGGED_FOR_DRIFT';
  rationale: string;
}

export class TestValidationAgent extends BaseAgent<ValidationAgentInput, ValidationAgentOutput> {
  public readonly agentId = 'AGT-VAL-001';
  public readonly agentVersion = '1.0.0';
  public readonly description = 'Cross-checks generated artifacts against approved requirements to detect hallucinations and specification drift.';
  public readonly promptVersion = 'sha256-val-agent-v1';

  constructor(contextStore: IContextStore, llmProvider: ILLMProvider) {
    super(contextStore, llmProvider);
  }

  protected async executeInternal(
    input: ValidationAgentInput,
    _correlationId: string
  ): Promise<{
    output: ValidationAgentOutput;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    inputArtifactIds: string[];
    outputArtifactIds: string[];
  }> {
    const req = await this.contextStore.getArtifact<RequirementArtifact>('REQ', input.requirementId);
    if (!req) {
      throw new Error(`TestValidationAgent: Requirement ${input.requirementId} not found.`);
    }

    const acs = await this.contextStore.queryArtifacts<AcceptanceCriteriaArtifact>('AC', {
      requirementId: input.requirementId,
    });
    const scns = await this.contextStore.queryArtifacts<ScenarioArtifact>('SCN', {
      requirementId: input.requirementId,
    });
    const tcs = await this.contextStore.queryArtifacts<TestCaseArtifact>('TC', {
      requirementId: input.requirementId,
    });
    const auts = await this.contextStore.queryArtifacts<AutomationBlueprintArtifact>('AUT');

    const systemPrompt = `You are the Principal Quality Engineering Validation & Drift Agent (AGT-VAL-001).
Compare the downstream generated Test Artifacts against the source Requirement and Acceptance Criteria.
Determine if any hallucinated expectations, unsupported endpoints, or business logic contradictions were introduced.
Output strict JSON:
{
  "hasContradictions": boolean,
  "hallucinationIndex": number (0.00 = 100% grounded, 1.00 = completely ungrounded),
  "driftFindings": string[],
  "groundingConfidence": number (0.0 to 1.0),
  "verdict": "APPROVED" | "FLAGGED_FOR_DRIFT",
  "rationale": string
}`;

    const userPrompt = `
Source Requirement:
Title: ${req.title}
Domain: ${req.domain}
Raw Text: ${req.rawText}

Acceptance Criteria:
${acs.map(a => `[${a.id}] ${a.when} -> ${a.then.join('; ')}`).join('\n')}

Scenarios:
${scns.map(s => `[${s.id}] (${s.classification}) ${s.title}`).join('\n')}

Test Cases:
${tcs.map(t => `[${t.id}] ${t.title}`).join('\n')}

Automation Contracts:
${auts.map(a => `[${a.id}] Harness: ${a.recommendedHarness}, Target: ${a.targetComponent}, Assertions: ${a.assertions.join('; ')}`).join('\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        hasContradictions: { type: 'boolean' },
        hallucinationIndex: { type: 'number' },
        driftFindings: { type: 'array' },
        groundingConfidence: { type: 'number' },
        verdict: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['hasContradictions', 'hallucinationIndex', 'verdict', 'rationale'],
    };

    const response = await this.llmProvider.generateStructured<ValidationAgentOutput>({
      systemPrompt,
      userPrompt,
      schema,
      temperature: 0.1,
    });

    const output = response.data;
    output.verdict = (output.hallucinationIndex <= 0.10 && !output.hasContradictions) 
      ? 'APPROVED' 
      : 'FLAGGED_FOR_DRIFT';

    return {
      output,
      usage: response.usage,
      inputArtifactIds: [req.id, ...acs.map(a => a.id), ...scns.map(s => s.id), ...tcs.map(t => t.id)],
      outputArtifactIds: [],
    };
  }
}
