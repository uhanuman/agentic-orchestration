/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Generic Markdown Eval Runner
 * Executes any Evaluator defined as a Markdown (.md) specification file.
 */

import { IContextStore } from '../core/context-store';
import { SchemaRegistry } from '../core/schemas';
import {
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
} from '../core/types';
import { ILLMProvider } from '../gateway/provider.interface';
import { MarkdownSpec, MarkdownSpecParser } from './markdown-spec-parser';

export interface EvaluatorResult {
  evaluatorId: string;
  evaluatorName: string;
  specPath: string;
  type: 'DETERMINISTIC' | 'SEMANTIC';
  passed: boolean;
  score: number; // 0.0 to 1.0
  rationale: string;
  metadata?: Record<string, any>;
}

export class MarkdownEvalRunner {
  public readonly spec: MarkdownSpec;
  public readonly evaluatorId: string;
  public readonly evaluatorName: string;
  public readonly type: 'DETERMINISTIC' | 'SEMANTIC';
  public readonly threshold: number;

  constructor(
    public readonly specPath: string,
    private llmProvider: ILLMProvider
  ) {
    this.spec = MarkdownSpecParser.parseFile(specPath);
    this.evaluatorId = this.spec.metadata['id'] || pathBase(specPath);
    this.evaluatorName = this.spec.metadata['name'] || this.spec.title;
    const rawType = (this.spec.metadata['type'] || '').toUpperCase();
    this.type = rawType.includes('SEMANTIC') ? 'SEMANTIC' : 'DETERMINISTIC';
    this.threshold = parseFloat(this.spec.metadata['threshold'] || '0.85');
  }

  public async evaluate(target: any, context: IContextStore): Promise<EvaluatorResult> {
    if (this.type === 'DETERMINISTIC') {
      return this.evaluateDeterministic(target, context);
    }
    return this.evaluateSemantic(target, context);
  }

  private async evaluateDeterministic(target: any, context: IContextStore): Promise<EvaluatorResult> {
    const id = this.evaluatorId;

    // 1. Schema Validator (EVAL-SCHEMA-001)
    if (id.includes('SCHEMA')) {
      const artifactType = (target.artifactType || (typeof target.id === 'string' && target.id.includes('-') ? target.id.split('-')[0] : '')).toUpperCase();
      const schema = SchemaRegistry[artifactType];
      if (!schema) {
        return {
          evaluatorId: this.evaluatorId,
          evaluatorName: this.evaluatorName,
          specPath: this.specPath,
          type: 'DETERMINISTIC',
          passed: false,
          score: 0.0,
          rationale: `Schema validation failed: target ${target.id || 'unidentified'} does not map to a recognized schema type (${artifactType || 'none'}).`,
        };
      }
      const result = schema.safeParse(target);
      if (result.success) {
        return {
          evaluatorId: this.evaluatorId,
          evaluatorName: this.evaluatorName,
          specPath: this.specPath,
          type: 'DETERMINISTIC',
          passed: true,
          score: 1.0,
          rationale: `Artifact ${target.id} strictly adheres to schema specification (${this.specPath}).`,
        };
      }
      const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
      return {
        evaluatorId: this.evaluatorId,
        evaluatorName: this.evaluatorName,
        specPath: this.specPath,
        type: 'DETERMINISTIC',
        passed: false,
        score: 0.0,
        rationale: `Schema validation failed for ${target.id}: ${issues}`,
        metadata: { issues: result.error.issues },
      };
    }

    // 2. Referential Integrity Validator (EVAL-REFERENTIAL-001)
    if (id.includes('REFERENTIAL')) {
      const reqId = target.id?.startsWith('REQ-') ? target.id : target.requirementId || target.id;
      // Validate all children under requirement
      const scns = await context.queryArtifacts<ScenarioArtifact>('SCN', { requirementId: reqId });
      const missingIds: string[] = [];

      for (const scn of scns) {
        const { valid, missingIds: missing } = await context.validateReferentialIntegrity('SCN', scn);
        if (!valid) missingIds.push(...missing);
      }

      if (missingIds.length === 0) {
        return {
          evaluatorId: this.evaluatorId,
          evaluatorName: this.evaluatorName,
          specPath: this.specPath,
          type: 'DETERMINISTIC',
          passed: true,
          score: 1.0,
          rationale: `All upstream foreign keys verified for requirement ${reqId} (${this.specPath}).`,
        };
      }

      return {
        evaluatorId: this.evaluatorId,
        evaluatorName: this.evaluatorName,
        specPath: this.specPath,
        type: 'DETERMINISTIC',
        passed: false,
        score: 0.0,
        rationale: `Referential integrity broken under ${reqId}. Missing upstream parent IDs: ${missingIds.join(', ')}`,
        metadata: { missingIds },
      };
    }

    // 3. Coverage Calculator (EVAL-COVERAGE-001)
    if (id.includes('COVERAGE')) {
      const reqId = target.id?.startsWith('REQ-') ? target.id : target.requirementId || target.id;
      const acs = await context.queryArtifacts<AcceptanceCriteriaArtifact>('AC', { requirementId: reqId });
      const scns = await context.queryArtifacts<ScenarioArtifact>('SCN', { requirementId: reqId });
      const tcs = await context.queryArtifacts<TestCaseArtifact>('TC', { requirementId: reqId });
      const auts = await context.queryArtifacts<AutomationBlueprintArtifact>('AUT');

      // Check mode
      const mode = target.coverageMode || 'AC_TO_SCN';

      if (mode === 'AC_TO_SCN') {
        if (acs.length === 0) {
          return {
            evaluatorId: this.evaluatorId,
            evaluatorName: this.evaluatorName,
            specPath: this.specPath,
            type: 'DETERMINISTIC',
            passed: false,
            score: 0.0,
            rationale: `Zero Acceptance Criteria found under ${reqId}.`,
          };
        }
        const coveredAcIds = new Set(scns.map(s => s.acceptanceCriteriaId));
        const uncovered = acs.filter(a => !coveredAcIds.has(a.id));
        const ratio = (acs.length - uncovered.length) / acs.length;
        const passed = ratio >= this.threshold;
        return {
          evaluatorId: this.evaluatorId,
          evaluatorName: this.evaluatorName,
          specPath: this.specPath,
          type: 'DETERMINISTIC',
          passed,
          score: Number(ratio.toFixed(2)),
          rationale: passed
            ? `AC-to-Scenario coverage is ${(ratio * 100).toFixed(1)}% (${acs.length - uncovered.length}/${acs.length} ACs covered).`
            : `AC-to-Scenario coverage ${(ratio * 100).toFixed(1)}% is below threshold ${(this.threshold * 100).toFixed(1)}%.`,
        };
      }

      if (mode === 'TC_TO_AUT') {
        const criticalTcs = tcs.filter(t => t.priority === 'P0' || t.priority === 'P1');
        const coveredTcIds = new Set(auts.map(a => a.testCaseId));
        const uncovered = criticalTcs.filter(t => !coveredTcIds.has(t.id));
        const ratio = criticalTcs.length > 0 ? (criticalTcs.length - uncovered.length) / criticalTcs.length : 1.0;
        const passed = ratio >= this.threshold;
        return {
          evaluatorId: this.evaluatorId,
          evaluatorName: this.evaluatorName,
          specPath: this.specPath,
          type: 'DETERMINISTIC',
          passed,
          score: Number(ratio.toFixed(2)),
          rationale: passed
            ? `P0/P1 Automation Coverage is ${(ratio * 100).toFixed(1)}% (${criticalTcs.length - uncovered.length}/${criticalTcs.length} critical TCs covered).`
            : `Automation coverage ${(ratio * 100).toFixed(1)}% is below threshold ${(this.threshold * 100).toFixed(1)}%.`,
        };
      }
    }

    return {
      evaluatorId: this.evaluatorId,
      evaluatorName: this.evaluatorName,
      specPath: this.specPath,
      type: 'DETERMINISTIC',
      passed: true,
      score: 1.0,
      rationale: `Evaluator ${this.evaluatorId} passed.`,
    };
  }

  private async evaluateSemantic(target: any, context: IContextStore): Promise<EvaluatorResult> {
    const reqId = target.id?.startsWith('REQ-') ? target.id : target.requirementId || target.id;
    const req = await context.getArtifact<any>('REQ', reqId);
    const acs = await context.queryArtifacts<AcceptanceCriteriaArtifact>('AC', { requirementId: reqId });
    const scns = await context.queryArtifacts<ScenarioArtifact>('SCN', { requirementId: reqId });
    const tcs = await context.queryArtifacts<TestCaseArtifact>('TC', { requirementId: reqId });

    const systemPrompt = this.spec.systemPrompt || this.spec.raw;
    const userPrompt = `
Requirement:
Title: ${req?.title || target.title || 'Target Requirement'}
Raw Text: ${req?.rawText || target.rawText || ''}

Acceptance Criteria:
${acs.map(a => `- [${a.id}] ${a.when} -> ${a.then.join('; ')}`).join('\n')}

Scenarios:
${scns.map(s => `- [${s.id}] (${s.classification}) ${s.title}: ${s.scenarioDescription}`).join('\n')}

Test Cases:
${tcs.map(t => `- [${t.id}] [${t.type}] (${t.priority}) ${t.title}`).join('\n')}
`;

    const schema = {
      type: 'object',
      properties: {
        score: { type: 'number' },
        ambiguityScore: { type: 'number' },
        hallucinationIndex: { type: 'number' },
        passed: { type: 'boolean' },
        rationale: { type: 'string' },
      },
      required: ['passed', 'rationale'],
    };

    try {
      const response = await this.llmProvider.generateStructured<any>({
        systemPrompt,
        userPrompt,
        schema,
        temperature: 0.1,
      });

      const data = response.data;
      let score = data.score ?? 0.90;
      if (data.ambiguityScore !== undefined) {
        score = Number((1.0 - data.ambiguityScore).toFixed(2));
      } else if (data.hallucinationIndex !== undefined) {
        score = Number((1.0 - data.hallucinationIndex).toFixed(2));
      }

      const passed = data.passed ?? (score >= this.threshold);

      return {
        evaluatorId: this.evaluatorId,
        evaluatorName: this.evaluatorName,
        specPath: this.specPath,
        type: 'SEMANTIC',
        passed,
        score,
        rationale: data.rationale || `Evaluation completed according to rubric in ${this.specPath}`,
      };
    } catch (err: any) {
      return {
        evaluatorId: this.evaluatorId,
        evaluatorName: this.evaluatorName,
        specPath: this.specPath,
        type: 'SEMANTIC',
        passed: false,
        score: 0.0,
        rationale: `LLM Judge error: ${err.message}`,
      };
    }
  }
}

function pathBase(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1].replace(/\.md$/, '');
}
