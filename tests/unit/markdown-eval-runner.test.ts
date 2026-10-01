import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { MarkdownEvalRunner } from '../../src/runtime/markdown-eval-runner';
import { RequirementArtifact } from '../../src/core/types';

describe('MarkdownEvalRunner Unit Tests', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('executes 01.schema-validator.eval.md deterministic check', async () => {
    const runner = new MarkdownEvalRunner('evals/01.schema-validator.eval.md', mockLLM);

    expect(runner.evaluatorId).toBe('EVAL-SCHEMA-001');
    expect(runner.type).toBe('DETERMINISTIC');

    const validReq: RequirementArtifact = {
      id: 'REQ-1001',
      version: 1,
      epicId: 'EPIC-ORDERS',
      featureName: 'Cancellation',
      title: 'Order Cancellation',
      rawText: 'As a user I want to cancel my order.',
      domain: 'Orders',
      priority: 'HIGH',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const passResult = await runner.evaluate(validReq, store);
    expect(passResult.passed).toBe(true);
    expect(passResult.score).toBe(1.0);

    const invalidReq = { id: 'MALFORMED_ID' };
    const failResult = await runner.evaluate(invalidReq, store);
    expect(failResult.passed).toBe(false);
    expect(failResult.score).toBe(0.0);
  });

  it('executes 04.ambiguity-evaluator.eval.md semantic judge check', async () => {
    const runner = new MarkdownEvalRunner('evals/04.ambiguity-evaluator.eval.md', mockLLM);

    expect(runner.evaluatorId).toBe('EVAL-AMBIGUITY-SEMANTIC');
    expect(runner.type).toBe('SEMANTIC');

    const req: RequirementArtifact = {
      id: 'REQ-1001',
      version: 1,
      epicId: 'EPIC-ORDERS',
      featureName: 'Cancellation',
      title: 'Order Cancellation',
      rawText: 'As a user I want to cancel my order.',
      domain: 'Orders',
      priority: 'HIGH',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await runner.evaluate(req, store);
    expect(res.evaluatorId).toBe('EVAL-AMBIGUITY-SEMANTIC');
    expect(res.passed).toBe(true);
    expect(res.score).toBeGreaterThan(0.8);
  });

  it('resolves and executes by evaluator ID alias EVAL-TEST-COVERAGE-001', async () => {
    const runner = new MarkdownEvalRunner('EVAL-TEST-COVERAGE-001', mockLLM);
    expect(runner.evaluatorId).toBe('EVAL-COVERAGE-001');
    expect(runner.type).toBe('DETERMINISTIC');
  });
});
