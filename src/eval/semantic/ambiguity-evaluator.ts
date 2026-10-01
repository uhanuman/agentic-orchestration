/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Semantic Ambiguity Evaluator (EVAL-AMBIGUITY-SEMANTIC)
 * LLM-as-a-Judge for Requirement Clarity & Testability
 */

import { IContextStore } from '../../core/context-store';
import { RequirementArtifact, AcceptanceCriteriaArtifact } from '../../core/types';
import { ILLMProvider } from '../../gateway/provider.interface';
import { EvaluatorResult, IEvaluator } from '../evaluator.interface';

export class AmbiguityEvaluator implements IEvaluator<{ requirementId: string }> {
  public readonly evaluatorId = 'EVAL-AMBIGUITY-SEMANTIC';
  public readonly name = 'Semantic Requirement Ambiguity Judge';
  public readonly type = 'SEMANTIC';

  constructor(
    private llmProvider: ILLMProvider,
    private maxAmbiguityThreshold: number = 0.15 // Section 6.1: Ambiguity score <= 0.15
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

    // Fast deterministic check: if any AC is explicitly marked untestable, immediate fail
    const untestableAcs = acs.filter(ac => !ac.isTestable);
    if (untestableAcs.length > 0) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.2,
        rationale: `Deterministic pre-check failed: ${untestableAcs.length} Acceptance Criteria marked isTestable == false.`,
        metadata: { untestableAcIds: untestableAcs.map(a => a.id) },
      };
    }

    const systemPrompt = `You are a Principal Quality Engineering Judge (JUDGE-AMB-001).
Evaluate the provided software requirement and its acceptance criteria for ambiguity, vagueness, untestable statements, and missing business boundaries.
Return your evaluation as a strict JSON object conforming to:
{
  "ambiguityScore": number (0.00 = completely clear, 1.00 = completely ambiguous/unusable),
  "passed": boolean,
  "rationale": string,
  "ambiguitiesFound": string[]
}`;

    const userPrompt = `
Requirement Title: ${req.title}
Domain: ${req.domain}
Raw Requirement:
${req.rawText}

Identified Risks:
${JSON.stringify(req.risksIdentified, null, 2)}

Flagged Ambiguities by Agent:
${JSON.stringify(req.ambiguities, null, 2)}

Acceptance Criteria:
${acs
  .map(
    ac => `[${ac.id}] GIVEN: ${ac.given.join(' AND ')} | WHEN: ${ac.when} | THEN: ${ac.then.join(' AND ')}`
  )
  .join('\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        ambiguityScore: { type: 'number' },
        passed: { type: 'boolean' },
        rationale: { type: 'string' },
        ambiguitiesFound: { type: 'array', items: { type: 'string' } },
      },
      required: ['ambiguityScore', 'passed', 'rationale'],
    };

    try {
      const response = await this.llmProvider.generateStructured<{
        ambiguityScore: number;
        passed: boolean;
        rationale: string;
        ambiguitiesFound?: string[];
      }>({
        systemPrompt,
        userPrompt,
        schema,
        temperature: 0.1,
      });

      const ambiguityScore = response.data.ambiguityScore ?? 0.1;
      const passed = ambiguityScore <= this.maxAmbiguityThreshold;
      const clarityScore = Number((1.0 - ambiguityScore).toFixed(2));

      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed,
        score: clarityScore,
        rationale: passed
          ? `Ambiguity score ${ambiguityScore.toFixed(2)} is within acceptable tolerance (<= ${this.maxAmbiguityThreshold}). ${response.data.rationale}`
          : `Requirement rejected: Ambiguity score ${ambiguityScore.toFixed(2)} exceeds threshold ${this.maxAmbiguityThreshold}. ${response.data.rationale}`,
        metadata: {
          ambiguityScore,
          maxAllowed: this.maxAmbiguityThreshold,
          ambiguitiesFound: response.data.ambiguitiesFound || [],
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
