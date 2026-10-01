/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Requirement Analysis Agent (AGT-REQ-001) (Section 6.1)
 */

import { IContextStore } from '../core/context-store';
import { RequirementArtifact, AcceptanceCriteriaArtifact } from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { BaseAgent } from './base-agent';

export interface RequirementAgentInput {
  rawText: string;
  epicId: string;
  featureName: string;
  domain: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RequirementAgentOutput {
  requirement: RequirementArtifact;
  acceptanceCriteria: AcceptanceCriteriaArtifact[];
}

export class RequirementAnalysisAgent extends BaseAgent<RequirementAgentInput, RequirementAgentOutput> {
  public readonly agentId = 'AGT-REQ-001';
  public readonly agentVersion = '1.0.0';
  public readonly description = 'Deep requirement interrogation, ambiguity detection, and testability analysis.';
  public readonly promptVersion = 'sha256-req-agent-v1';

  constructor(contextStore: IContextStore, llmProvider: ILLMProvider) {
    super(contextStore, llmProvider);
  }

  protected async executeInternal(
    input: RequirementAgentInput,
    _correlationId: string
  ): Promise<{
    output: RequirementAgentOutput;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    inputArtifactIds: string[];
    outputArtifactIds: string[];
  }> {
    // Check semantic caching (Rule 3 in Section 8)
    const contentHash = this.contextStore.getContentHash(
      `${input.rawText}|${input.epicId}|${input.featureName}`
    );
    if (this.contextStore.hasCachedResult(contentHash)) {
      const cached = this.contextStore.getCachedResult<RequirementAgentOutput>(contentHash)!;
      // Ensure cached items exist in store
      await this.contextStore.saveArtifact('REQ', cached.requirement);
      for (const ac of cached.acceptanceCriteria) {
        await this.contextStore.saveArtifact('AC', ac);
      }
      return {
        output: cached,
        inputArtifactIds: [],
        outputArtifactIds: [cached.requirement.id, ...cached.acceptanceCriteria.map(a => a.id)],
      };
    }

    const systemPrompt = `You are the Principal Quality Engineering Requirement Analysis Agent (AGT-REQ-001).
Your role is deep requirement interrogation, ambiguity detection, testability analysis, and domain risk mapping.
Decompose the raw requirement into a structured RequirementArtifact and a set of AcceptanceCriteriaArtifacts (Given-When-Then).
Every Acceptance Criteria MUST have isTestable: true (or explicit justification if false).
Ambiguity score must be kept minimal by identifying clear boundaries.

Output strict JSON:
{
  "requirement": {
    "id": "REQ-1001",
    "version": 1,
    "epicId": string,
    "featureName": string,
    "title": string,
    "rawText": string,
    "domain": string,
    "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "risksIdentified": [{ "riskId": string, "description": string, "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }],
    "ambiguities": string[],
    "dependencies": string[],
    "status": "REVIEWED" | "APPROVED",
    "createdAt": string,
    "updatedAt": string
  },
  "acceptanceCriteria": [
    {
      "id": string (e.g. "AC-2001"),
      "requirementId": string,
      "version": 1,
      "given": string[],
      "when": string,
      "then": string[],
      "businessRules": string[],
      "isTestable": boolean,
      "status": "VALIDATED",
      "createdAt": string
    }
  ]
}`;

    const now = new Date().toISOString();
    const userPrompt = `
Epic: ${input.epicId}
Feature: ${input.featureName}
Domain: ${input.domain}
Priority: ${input.priority || 'HIGH'}
Raw Requirement:
"""
${input.rawText}
"""
`;

    const schema = {
      type: 'object',
      properties: {
        requirement: { type: 'object' },
        acceptanceCriteria: { type: 'array' },
      },
      required: ['requirement', 'acceptanceCriteria'],
    };

    const response = await this.llmProvider.generateStructured<RequirementAgentOutput>({
      systemPrompt,
      userPrompt,
      schema,
      temperature: 0.1,
    });

    const { requirement, acceptanceCriteria } = response.data;

    // Ensure dates and defaults are set deterministically
    requirement.createdAt = requirement.createdAt || now;
    requirement.updatedAt = requirement.updatedAt || now;
    requirement.epicId = input.epicId;
    requirement.featureName = input.featureName;
    requirement.domain = input.domain;
    requirement.rawText = input.rawText;
    if (input.priority) requirement.priority = input.priority;

    for (let i = 0; i < acceptanceCriteria.length; i++) {
      acceptanceCriteria[i].requirementId = requirement.id;
      acceptanceCriteria[i].createdAt = acceptanceCriteria[i].createdAt || now;
      acceptanceCriteria[i].status = 'VALIDATED';
    }

    // Persist to Shared Context Store
    await this.contextStore.saveArtifact('REQ', requirement);
    for (const ac of acceptanceCriteria) {
      await this.contextStore.saveArtifact('AC', ac);
    }

    // Cache result
    this.contextStore.setCachedResult(contentHash, { requirement, acceptanceCriteria });

    const output: RequirementAgentOutput = { requirement, acceptanceCriteria };
    return {
      output,
      usage: response.usage,
      inputArtifactIds: [],
      outputArtifactIds: [requirement.id, ...acceptanceCriteria.map(a => a.id)],
    };
  }
}
