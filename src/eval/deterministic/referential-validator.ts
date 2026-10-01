/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Deterministic Referential Integrity Validator (EVAL-REFERENTIAL-001)
 */

import { IContextStore } from '../../core/context-store';
import { EvaluatorResult, IEvaluator } from '../evaluator.interface';

export class ReferentialIntegrityValidator implements IEvaluator<any> {
  public readonly evaluatorId = 'EVAL-REFERENTIAL-001';
  public readonly name = 'Deterministic Referential Integrity Validator';
  public readonly type = 'DETERMINISTIC';

  constructor(private artifactType: string) {}

  public async evaluate(target: any, context: IContextStore): Promise<EvaluatorResult> {
    const targetId: string = target.id || target.requirementId || '';

    // If target is a requirement and we are validating downstream items (like SCN or TC):
    if (targetId.startsWith('REQ-') && this.artifactType !== 'REQ') {
      const children = await context.queryArtifacts<any>(this.artifactType, { requirementId: targetId });
      if (children.length === 0) {
        return {
          evaluatorId: this.evaluatorId,
          type: this.type,
          passed: false,
          score: 0.0,
          rationale: `Zero ${this.artifactType} artifacts found for Requirement ${targetId} to validate referential integrity.`,
        };
      }

      const allMissing: string[] = [];
      for (const child of children) {
        const { valid, missingIds } = await context.validateReferentialIntegrity(this.artifactType, child);
        if (!valid) allMissing.push(...missingIds);
      }

      if (allMissing.length === 0) {
        return {
          evaluatorId: this.evaluatorId,
          type: this.type,
          passed: true,
          score: 1.0,
          rationale: `All upstream foreign key references for all ${children.length} ${this.artifactType} artifacts under ${targetId} exist in Context Store.`,
        };
      }

      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.0,
        rationale: `Referential integrity broken for ${this.artifactType} under ${targetId}. Missing upstream parent IDs: ${allMissing.join(', ')}`,
        metadata: { missingIds: allMissing },
      };
    }

    // Direct single artifact validation:
    const { valid, missingIds } = await context.validateReferentialIntegrity(
      this.artifactType,
      target
    );

    if (valid) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: true,
        score: 1.0,
        rationale: `All upstream foreign key references for ${this.artifactType} (${target.id}) exist in Context Store.`,
      };
    }

    return {
      evaluatorId: this.evaluatorId,
      type: this.type,
      passed: false,
      score: 0.0,
      rationale: `Referential integrity broken for ${this.artifactType} (${target.id}). Missing upstream parent IDs: ${missingIds.join(', ')}`,
      metadata: { missingIds },
    };
  }
}
