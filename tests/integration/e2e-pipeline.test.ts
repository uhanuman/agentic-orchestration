import { describe, it, expect } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { DAGEngine, PipelineInput } from '../../src/orchestrator/dag-engine';
import {
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
} from '../../src/core/types';

describe('End-to-End System Integration Pipeline', () => {
  it('executes complete Quality Engineering lifecycle with 100% lineage and traceability', async () => {
    const contextStore = new InMemoryContextStore();
    const mockLLM = new MockLLMProvider();
    const correlationId = 'trace-enterprise-e2e-9999';

    const engine = new DAGEngine(contextStore, mockLLM, correlationId);

    const input: PipelineInput = {
      rawText: 'As a customer, I want to cancel my pending order online before it ships, so that I can immediately receive a refund to my original payment method without contacting customer support.',
      epicId: 'EPIC-ORDERS-001',
      featureName: 'Self-Service Order Cancellation',
      domain: 'Order Management & Payment Gateway',
      priority: 'CRITICAL',
      releaseVersion: 'v3.0.0-rc1',
    };

    const result = await engine.run(input);

    // 1. Pipeline success verification
    expect(result.success).toBe(true);
    expect(result.correlationId).toBe(correlationId);
    expect(result.releaseRecord?.gateStatus).toBe('PASSED');

    // 2. Context Store Persistence Verification
    const req = await contextStore.getArtifact<RequirementArtifact>('REQ', 'REQ-1001');
    expect(req).not.toBeNull();
    expect(req?.domain).toBe('Order Management & Payment Gateway');

    const acs = await contextStore.queryArtifacts<AcceptanceCriteriaArtifact>('AC', {
      requirementId: 'REQ-1001',
    });
    expect(acs.length).toBeGreaterThanOrEqual(2);

    const scns = await contextStore.queryArtifacts<ScenarioArtifact>('SCN', {
      requirementId: 'REQ-1001',
    });
    expect(scns.length).toBeGreaterThanOrEqual(3);

    const tcs = await contextStore.queryArtifacts<TestCaseArtifact>('TC', {
      requirementId: 'REQ-1001',
    });
    expect(tcs.length).toBeGreaterThanOrEqual(6);

    // Check presence of all test categories
    const types = new Set(tcs.map(t => t.type));
    expect(types.has('FUNCTIONAL')).toBe(true);
    expect(types.has('SECURITY')).toBe(true);
    expect(types.has('PERFORMANCE')).toBe(true);
    expect(types.has('ACCESSIBILITY')).toBe(true);

    const auts = await contextStore.queryArtifacts<AutomationBlueprintArtifact>('AUT');
    expect(auts.length).toBeGreaterThanOrEqual(6);

    // 3. Bidirectional Lineage Verification
    // Pick an automation contract and traverse upward to requirement
    const targetAutId = auts[0].id;
    const lineageUpstream = await contextStore.getLineage(targetAutId);
    expect(lineageUpstream.ancestors).toContain(auts[0].testCaseId);

    // Pick REQ and traverse downward to all generated artifacts
    const lineageDownstream = await contextStore.getLineage('REQ-1001');
    for (const ac of acs) {
      expect(lineageDownstream.descendants).toContain(ac.id);
    }
    for (const scn of scns) {
      expect(lineageDownstream.descendants).toContain(scn.id);
    }
    for (const tc of tcs) {
      expect(lineageDownstream.descendants).toContain(tc.id);
    }

    // 4. Audit Telemetry Verification
    const executionLogs = await contextStore.getExecutionLogs(correlationId);
    expect(executionLogs.length).toBe(7); // REQ, DES, SEC, PERF, A11Y, SDET, VAL
    for (const log of executionLogs) {
      expect(log.correlationId).toBe(correlationId);
      expect(log.finalStatus).toBe('SUCCESS');
      expect(log.aiProvider).toBe('Mock-Deterministic');
    }

    // 5. Validation and Drift Audit
    expect(result.validationReport?.verdict).toBe('APPROVED');
    expect(result.validationReport?.hallucinationIndex).toBeLessThanOrEqual(0.10);
    expect(result.validationReport?.hasContradictions).toBe(false);
  });
});
