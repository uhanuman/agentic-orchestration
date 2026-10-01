/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Semantic Completeness & Edge-Case Evaluator (EVAL-COMPLETENESS-SEMANTIC)
 * LLM-as-a-Judge for Test Scenario Coverage and Edge-Case Breadth
 */

import { IContextStore } from '../../core/context-store';
import { RequirementArtifact, ScenarioArtifact, AcceptanceCriteriaArtifact } from '../../core/types';
import { ILLMProvider } from '../../gateway/provider.interface';
import { EvaluatorResult, IEvaluator } from '../evaluator.interface';

export class CompletenessEvaluator implements IEvaluator<{ requirementId: string }> {
  public readonly evaluatorId = 'EVAL-COMPLETENESS-SEMANTIC';
  public readonly name = 'Semantic Test Design Completeness Judge';
  public readonly type = 'SEMANTIC';

  constructor(
    private llmProvider: ILLMProvider,
    private minCompletenessScore: number = 0.85 // Section 7: semantic fidelity & edge-case completeness >= 0.85
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

    const acs = await context.queryArtifacts<AcceptanceCriteriaArtifact>('AC', {
      requirementId: target.requirementId,
    });
    const scns = await context.queryArtifacts<ScenarioArtifact>('SCN', {
      requirementId: target.requirementId,
    });

    if (scns.length === 0) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.0,
        rationale: `Requirement ${target.requirementId} has zero test scenarios to evaluate.`,
      };
    }

    // Deterministic pre-check: verify classification breadth (POSITIVE, NEGATIVE, BOUNDARY)
    const classifications = new Set(scns.map(s => s.classification));
    const hasNegative = classifications.has('NEGATIVE') || classifications.has('EXCEPTION');
    const hasBoundary = classifications.has('BOUNDARY');

    if (!hasNegative && !hasBoundary) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.4,
        rationale: 'Deterministic pre-check failed: Scenarios lack negative or boundary condition classifications.',
        metadata: { existingClassifications: Array.from(classifications) },
      };
    }

    const systemPrompt = `You are a Principal Quality Engineering Judge (JUDGE-COMPLETENESS-001).
Evaluate whether the generated Test Scenarios comprehensively cover the business requirement, acceptance criteria, edge-cases, boundaries, and failure states.
Score between 0.00 (grossly inadequate) and 1.00 (comprehensive and exhaustive).
Return strict JSON:
{
  "score": number,
  "passed": boolean,
  "rationale": string,
  "missingGaps": string[]
}`;

    const userPrompt = `
Requirement: ${req.title}
Raw Text: ${req.rawText}

Acceptance Criteria:
${acs.map(a => `- [${a.id}] ${a.when} -> ${a.then.join('; ')}`).join('\n')}

Generated Scenarios:
${scns.map(s => `- [${s.id}] (${s.classification}, ${s.targetLayer}) ${s.title}: ${s.scenarioDescription}`).join('\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        score: { type: 'number' },
        passed: { type: 'boolean' },
        rationale: { type: 'string' },
        missingGaps: { type: 'array', items: { type: 'string' } },
      },
      required: ['score', 'passed', 'rationale'],
    };

    try {
      const response = await this.llmProvider.generateStructured<{
        score: number;
        passed: boolean;
        rationale: string;
        missingGaps?: string[];
      }>({
        systemPrompt,
        userPrompt,
        schema,
        temperature: 0.1,
      });

      const score = response.data.score ?? 0.85;
      const passed = score >= this.minCompletenessScore;

      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed,
        score,
        rationale: passed
          ? `Completeness score ${score.toFixed(2)} meets required threshold (>= ${this.minCompletenessScore}). ${response.data.rationale}`
          : `Completeness score ${score.toFixed(2)} is below threshold ${this.minCompletenessScore}. ${response.data.rationale}`,
        metadata: {
          missingGaps: response.data.missingGaps || [],
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
