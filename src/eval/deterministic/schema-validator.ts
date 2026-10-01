/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Deterministic Schema Validator (EVAL-SCHEMA-001)
 */

import { IContextStore } from '../../core/context-store';
import { SchemaRegistry } from '../../core/schemas';
import { EvaluatorResult, IEvaluator } from '../evaluator.interface';

export class SchemaValidator implements IEvaluator<any> {
  public readonly evaluatorId = 'EVAL-SCHEMA-001';
  public readonly name = 'Deterministic JSON Schema Validator';
  public readonly type = 'DETERMINISTIC';

  constructor(private artifactType: string) {}

  public async evaluate(target: any, _context: IContextStore): Promise<EvaluatorResult> {
    const typeUpper = this.artifactType.toUpperCase();
    const schema = SchemaRegistry[typeUpper];

    if (!schema) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: false,
        score: 0.0,
        rationale: `No registered schema found for artifact type '${this.artifactType}'`,
      };
    }

    const result = schema.safeParse(target);

    if (result.success) {
      return {
        evaluatorId: this.evaluatorId,
        type: this.type,
        passed: true,
        score: 1.0,
        rationale: `Artifact ${target.id || 'unidentified'} strictly adheres to ${typeUpper} schema specification.`,
      };
    }

    const formattedIssues = result.error.issues
      .map(i => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('; ');

    return {
      evaluatorId: this.evaluatorId,
      type: this.type,
      passed: false,
      score: 0.0,
      rationale: `Schema validation failed for ${typeUpper} artifact ${target.id || 'unidentified'}: ${formattedIssues}`,
      metadata: { issues: result.error.issues },
    };
  }
}
