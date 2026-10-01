/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Semantic Drift & Hallucination Evaluator (EVAL-DRIFT-SEMANTIC)
 * LLM-as-a-Judge for Specification Drift and Ungrounded Assertions
 */

import { IContextStore } from '../../core/context-store';
import {
  RequirementArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
} from '../../core/types';
import { ILLMProvider } from '../../gateway/provider.interface';
import { EvaluatorResult, IEvaluator } from '../evaluator.interface';

export class DriftEvaluator implements IEvaluator<{ requirementId: string }> {
  public readonly evaluatorId = 'EVAL-DRIFT-SEMANTIC';
  public readonly name = 'Semantic Drift & Hallucination Judge';
  public readonly type = 'SEMANTIC';

  constructor(
    private llmProvider: ILLMProvider,
    private maxHallucinationIndex: number = 0.10 // Max 10% allowed hallucination / ungrounded drift
  ) {}

  public async evaluate(
    target: { requirementId: string },
    context: IContextStore
  ): Promise<EvaluatorResult> {
    const req = await context.getArtifact<RequirementArtifact>('REQ', target.requirementId);
    if (!req) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.0,
        rationale: `Requirement ${target.requirementId} not found in Context Store.`,
      };
    }

    const tcs = await context.queryArtifacts<TestCaseArtifact>('TC', {
      requirementId: target.requirementId,
    });
    const auts = await context.queryArtifacts<AutomationBlueprintArtifact>('AUT');

    const systemPrompt = `You are a Principal Quality Engineering Judge (JUDGE-DRIFT-001).
Compare the downstream generated Test Cases and Automation Blueprints against the original source Requirement.
Check if the agents hallucinated unsupported features, invented non-existent API endpoints or behaviors, or contradicted requirement rules.
Return strict JSON:
{
  "hallucinationIndex": number (0.00 = completely grounded, 1.00 = completely hallucinated),
  "passed": boolean,
  "rationale": string,
  "driftItems": string[]
}`;

    const userPrompt = `
Source Requirement:
Title: ${req.title}
Raw Requirement: ${req.rawText}

Test Cases to Validate:
${tcs.map(tc => `[${tc.id}] ${tc.title} (Pre: ${tc.preconditions.join(', ')})`).join('\n')}

Automation Contracts:
${auts.map(a => `[${a.id} -> TC ${a.testCaseId}] Component: ${a.targetComponent} | Assertions: ${a.assertions.join(', ')}`).join('\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        hallucinationIndex: { type: 'number' },
        passed: { type: 'boolean' },
        rationale: { type: 'string' },
        driftItems: { type: 'array', items: { type: 'string' } },
      },
      required: ['hallucinationIndex', 'passed', 'rationale'],
    };

    try {
      const response = await this.llmProvider.generateStructured<{
        hallucinationIndex: number;
        passed: boolean;
        rationale: string;
        driftItems?: string[];
      }>({
        systemPrompt,
        userPrompt,
        schema,
        temperature: 0.1,
      });

      const hallucinationIndex = response.data.hallucinationIndex ?? 0.02;
      const passed = hallucinationIndex <= this.maxHallucinationIndex;
      const score = Number((1.0 - hallucinationIndex).toFixed(2));

      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed,
        score,
        rationale: passed
          ? `Drift validation passed: Hallucination index ${hallucinationIndex.toFixed(2)} is within safe bounds (<= ${this.maxHallucinationIndex}). ${response.data.rationale}`
          : `Drift validation failed: Hallucination index ${hallucinationIndex.toFixed(2)} exceeds allowable limit (${this.maxHallucinationIndex}). ${response.data.rationale}`,
        metadata: {
          hallucinationIndex,
          maxAllowed: this.maxHallucinationIndex,
          driftItems: response.data.driftItems || [],
        },
      };
    } catch (err: any) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.0,
        rationale: `LLM evaluation error: ${err.message}`,
      };
    }
  }
}
