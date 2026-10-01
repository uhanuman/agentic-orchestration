import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import {
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
} from '../../src/core/types';

describe('Milestone 1: Context Store & Lineage Graph', () => {
  let store: InMemoryContextStore;

  beforeEach(() => {
    store = new InMemoryContextStore();
  });

  it('persists and retrieves artifacts with schema validation', async () => {
    const req: RequirementArtifact = {
      id: 'REQ-1001',
      version: 1,
      epicId: 'EPIC-PAYMENTS',
      featureName: 'Checkout',
      title: 'Credit Card Payment Processing',
      rawText: 'As a customer, I want to pay using Visa or Mastercard.',
      domain: 'Payments',
      priority: 'CRITICAL',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.saveArtifact('REQ', req);
    const retrieved = await store.getArtifact<RequirementArtifact>('REQ', 'REQ-1001');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe('REQ-1001');
    expect(retrieved?.title).toBe('Credit Card Payment Processing');
  });

  it('validates referential integrity against context store', async () => {
    const acWithoutReq: AcceptanceCriteriaArtifact = {
      id: 'AC-2001',
      requirementId: 'REQ-9999', // Missing
      version: 1,
      given: ['User is on checkout'],
      when: 'User inputs card',
      then: ['Charge is submitted'],
      businessRules: [],
      isTestable: true,
      status: 'PROPOSED',
      createdAt: new Date().toISOString(),
    };

    const refCheck1 = await store.validateReferentialIntegrity('AC', acWithoutReq);
    expect(refCheck1.valid).toBe(false);
    expect(refCheck1.missingIds).toContain('REQ-9999');

    // Add parent requirement
    const req: RequirementArtifact = {
      id: 'REQ-9999',
      version: 1,
      epicId: 'EPIC-PAYMENTS',
      featureName: 'Checkout',
      title: 'Parent Req',
      rawText: 'Req text',
      domain: 'Payments',
      priority: 'HIGH',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await store.saveArtifact('REQ', req);

    const refCheck2 = await store.validateReferentialIntegrity('AC', acWithoutReq);
    expect(refCheck2.valid).toBe(true);
    expect(refCheck2.missingIds).toHaveLength(0);
  });

  it('correctly computes bidirectional lineage (ancestors and descendants)', async () => {
    const req: RequirementArtifact = {
      id: 'REQ-1001',
      version: 1,
      epicId: 'EPIC-PAYMENTS',
      featureName: 'Checkout',
      title: 'Credit Card Payment Processing',
      rawText: 'As a customer, I want to pay using Visa or Mastercard.',
      domain: 'Payments',
      priority: 'CRITICAL',
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
      requirementId: 'REQ-1001',
      version: 1,
      given: ['Valid card info entered'],
      when: 'Submit clicked',
      then: ['200 OK returned'],
      businessRules: ['Must tokenize card'],
      isTestable: true,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('AC', ac);

    const scn: ScenarioArtifact = {
      id: 'SCN-3001',
      requirementId: 'REQ-1001',
      acceptanceCriteriaId: 'AC-2001',
      title: 'Successful Visa Card Payment',
      classification: 'POSITIVE',
      targetLayer: 'API',
      riskLevel: 'CRITICAL',
      scenarioDescription: 'Customer completes 3D-secure and payment succeeds',
      isRegressionCandidate: true,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('SCN', scn);

    const tc: TestCaseArtifact = {
      id: 'TC-4001',
      scenarioId: 'SCN-3001',
      requirementId: 'REQ-1001',
      acceptanceCriteriaId: 'AC-2001',
      title: 'API POST /v1/charges with valid Visa token',
      type: 'FUNCTIONAL',
      priority: 'P0',
      preconditions: ['Stripe test account active'],
      testDataRequirements: { cardType: 'visa_test_token' },
      steps: [
        {
          stepIndex: 1,
          action: 'POST to /v1/charges with token and amount 5000',
          expectedResult: 'HTTP 200 with status=succeeded',
        },
      ],
      postConditions: ['Ledger entry recorded'],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('TC', tc);

    const aut: AutomationBlueprintArtifact = {
      id: 'AUT-5001',
      testCaseId: 'TC-4001',
      automationFeasible: true,
      recommendedHarness: 'REST_API',
      targetComponent: 'PaymentGateway',
      targetEndpointOrUrl: '/v1/charges',
      codeBlueprint: 'await request.post("/v1/charges", { data: { amount: 5000 } });',
      assertions: ['expect(res.status()).toBe(200)'],
      executionTimeoutMs: 5000,
      status: 'READY_FOR_HARNESS',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('AUT', aut);

    // Test ancestors of AUT-5001
    const autLineage = await store.getLineage('AUT-5001');
    expect(autLineage.ancestors).toContain('TC-4001');
    expect(autLineage.ancestors).toContain('SCN-3001');
    expect(autLineage.ancestors).toContain('AC-2001');
    expect(autLineage.ancestors).toContain('REQ-1001');

    // Test descendants of REQ-1001
    const reqLineage = await store.getLineage('REQ-1001');
    expect(reqLineage.descendants).toContain('AC-2001');
    expect(reqLineage.descendants).toContain('SCN-3001');
    expect(reqLineage.descendants).toContain('TC-4001');
    expect(reqLineage.descendants).toContain('AUT-5001');
  });

  it('supports semantic content hash caching', () => {
    const content = 'User story: As a buyer, I want one-click reorder.';
    const hash = store.getContentHash(content);
    expect(hash).toBeDefined();

    expect(store.hasCachedResult(hash)).toBe(false);
    store.setCachedResult(hash, { cachedScenarios: ['SCN-001'] });
    expect(store.hasCachedResult(hash)).toBe(true);
    expect(store.getCachedResult(hash)).toEqual({ cachedScenarios: ['SCN-001'] });
  });
});
