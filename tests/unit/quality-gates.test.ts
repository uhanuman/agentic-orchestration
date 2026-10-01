import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { QualityGate } from '../../src/eval/quality-gate';
import { SchemaValidator } from '../../src/eval/deterministic/schema-validator';
import { CoverageCalculator } from '../../src/eval/deterministic/coverage-calculator';
import { AmbiguityEvaluator } from '../../src/eval/semantic/ambiguity-evaluator';
import { CompletenessEvaluator } from '../../src/eval/semantic/completeness-evaluator';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import {
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
} from '../../src/core/types';

describe('Milestone 3: Quality Gate Engine & Semantic Evaluators', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('Critical Gate strictly rejects and cannot be bypassed with a waiver', async () => {
    const criticalGate = new QualityGate(
      'GATE-CRITICAL-TEST',
      'Critical Integrity Gate',
      'CRITICAL',
      1.0,
      [new SchemaValidator('REQ')]
    );

    const malformedReq = {
      id: 'INVALID_ID_FORMAT',
      title: 'Bad Req',
    };
    // Save raw without schema check directly to test gate intercept
    (store as any).storage.get('REQ').set(malformedReq.id, malformedReq);

    const resultWithoutWaiver = await criticalGate.evaluateGate([malformedReq.id], store);
    expect(resultWithoutWaiver.status).toBe('FAILED');
    expect(resultWithoutWaiver.failingEvaluators).toContain('EVAL-SCHEMA-001');

    // Attempt waiver on critical gate
    const resultWithWaiver = await criticalGate.evaluateGate([malformedReq.id], store, {
      humanApprover: 'CTO Jane',
      waiverJustification: 'Emergency fix',
      approvedAt: new Date().toISOString(),
    });

    expect(resultWithWaiver.status).toBe('FAILED');
    expect(resultWithWaiver.evidence.waiverRejected).toBeDefined();
  });

  it('Major Gate fails without waiver, but passes when signed human waiver is provided', async () => {
    const reqId = 'REQ-1001';
    const req: RequirementArtifact = {
      id: reqId,
      version: 1,
      epicId: 'EPIC-ORDERS',
      featureName: 'Cancellation',
      title: 'Req',
      rawText: 'Text',
      domain: 'Orders',
      priority: 'HIGH',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveArtifact('REQ', req);

    const ac: AcceptanceCriteriaArtifact = {
      id: 'AC-2001',
      requirementId: reqId,
      version: 1,
      given: ['Pre'],
      when: 'When',
      then: ['Then'],
      businessRules: [],
      isTestable: true,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('AC', ac);

    // No scenarios added, so coverage is 0%
    const majorGate = new QualityGate(
      'GATE-DES-MAJOR',
      'Major Test Design Gate',
      'MAJOR',
      1.0,
      [new CoverageCalculator('AC_TO_SCENARIO', 1.0)]
    );

    // 1. Without waiver -> FAILED
    const failResult = await majorGate.evaluateGate([reqId], store);
    expect(failResult.status).toBe('FAILED');
    expect(failResult.failingEvaluators).toContain('EVAL-COVERAGE-001');

    // 2. With signed waiver -> WAIVED_WITH_APPROVAL
    const waiverResult = await majorGate.evaluateGate([reqId], store, {
      humanApprover: 'Principal Architect Bob',
      waiverJustification: 'Scenario generation deferred to next sprint for non-critical AC',
      approvedAt: new Date().toISOString(),
    });

    expect(waiverResult.status).toBe('WAIVED_WITH_APPROVAL');
    expect(waiverResult.waiver?.humanApprover).toBe('Principal Architect Bob');
  });

  it('Semantic AmbiguityEvaluator evaluates requirement using LLM judge', async () => {
    const reqId = 'REQ-1001';
    const req: RequirementArtifact = {
      id: reqId,
      version: 1,
      epicId: 'EPIC-ORDERS',
      featureName: 'Cancellation',
      title: 'Customer Self-Service Cancellation',
      rawText: 'As a customer, I want to cancel my pending order.',
      domain: 'Orders',
      priority: 'HIGH',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveArtifact('REQ', req);

    const ac: AcceptanceCriteriaArtifact = {
      id: 'AC-2001',
      requirementId: reqId,
      version: 1,
      given: ['Order in PENDING'],
      when: 'Cancel requested',
      then: ['Order status CANCELLED'],
      businessRules: [],
      isTestable: true,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('AC', ac);

    const ambiguityEval = new AmbiguityEvaluator(mockLLM, 0.15);
    const result = await ambiguityEval.evaluate({ requirementId: reqId }, store);

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.85);
  });
});
