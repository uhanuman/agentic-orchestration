import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { SchemaValidator } from '../../src/eval/deterministic/schema-validator';
import { ReferentialIntegrityValidator } from '../../src/eval/deterministic/referential-validator';
import { CoverageCalculator } from '../../src/eval/deterministic/coverage-calculator';
import {
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
} from '../../src/core/types';

describe('Milestone 3: Deterministic Evaluators', () => {
  let store: InMemoryContextStore;

  beforeEach(() => {
    store = new InMemoryContextStore();
  });

  it('SchemaValidator validates schema and reports issues', async () => {
    const validator = new SchemaValidator('REQ');

    const validReq: RequirementArtifact = {
      id: 'REQ-1001',
      version: 1,
      epicId: 'EPIC-ORDERS',
      featureName: 'Cancellation',
      title: 'Self-Service Cancellation',
      rawText: 'Text here',
      domain: 'Orders',
      priority: 'HIGH',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const passResult = await validator.evaluate(validReq, store);
    expect(passResult.passed).toBe(true);
    expect(passResult.score).toBe(1.0);

    const invalidReq = { ...validReq, id: 'MALFORMED' };
    const failResult = await validator.evaluate(invalidReq, store);
    expect(failResult.passed).toBe(false);
    expect(failResult.score).toBe(0.0);
    expect(failResult.rationale).toContain('MALFORMED');
  });

  it('ReferentialIntegrityValidator detects missing parent IDs', async () => {
    const validator = new ReferentialIntegrityValidator('AC');

    const ac: AcceptanceCriteriaArtifact = {
      id: 'AC-2001',
      requirementId: 'REQ-9999', // Missing
      version: 1,
      given: ['User is logged in'],
      when: 'Clicks button',
      then: ['Result displayed'],
      businessRules: [],
      isTestable: true,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
    };

    const failResult = await validator.evaluate(ac, store);
    expect(failResult.passed).toBe(false);
    expect(failResult.metadata?.missingIds).toContain('REQ-9999');

    // Add parent REQ
    const req: RequirementArtifact = {
      id: 'REQ-9999',
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

    const passResult = await validator.evaluate(ac, store);
    expect(passResult.passed).toBe(true);
  });

  it('CoverageCalculator calculates AC to Scenario coverage accurately', async () => {
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

    // Save 2 ACs
    const ac1: AcceptanceCriteriaArtifact = {
      id: 'AC-2001',
      requirementId: reqId,
      version: 1,
      given: ['Pre 1'],
      when: 'When 1',
      then: ['Then 1'],
      businessRules: [],
      isTestable: true,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
    };
    const ac2: AcceptanceCriteriaArtifact = {
      id: 'AC-2002',
      requirementId: reqId,
      version: 1,
      given: ['Pre 2'],
      when: 'When 2',
      then: ['Then 2'],
      businessRules: [],
      isTestable: true,
      status: 'VALIDATED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('AC', ac1);
    await store.saveArtifact('AC', ac2);

    // Cover only AC-2001 initially
    const scn1: ScenarioArtifact = {
      id: 'SCN-3001',
      requirementId: reqId,
      acceptanceCriteriaId: 'AC-2001',
      title: 'Scenario 1',
      classification: 'POSITIVE',
      targetLayer: 'API',
      riskLevel: 'HIGH',
      scenarioDescription: 'Desc 1',
      isRegressionCandidate: true,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('SCN', scn1);

    const calc = new CoverageCalculator('AC_TO_SCENARIO', 1.0);
    const partialCoverageResult = await calc.evaluate({ requirementId: reqId }, store);

    // 1 of 2 covered = 50%
    expect(partialCoverageResult.passed).toBe(false);
    expect(partialCoverageResult.score).toBe(0.5);
    expect(partialCoverageResult.metadata?.uncoveredAcIds).toContain('AC-2002');

    // Add scenario for AC-2002
    const scn2: ScenarioArtifact = {
      id: 'SCN-3002',
      requirementId: reqId,
      acceptanceCriteriaId: 'AC-2002',
      title: 'Scenario 2',
      classification: 'NEGATIVE',
      targetLayer: 'API',
      riskLevel: 'HIGH',
      scenarioDescription: 'Desc 2',
      isRegressionCandidate: false,
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
    };
    await store.saveArtifact('SCN', scn2);

    const fullCoverageResult = await calc.evaluate({ requirementId: reqId }, store);
    expect(fullCoverageResult.passed).toBe(true);
    expect(fullCoverageResult.score).toBe(1.0);
  });
});
