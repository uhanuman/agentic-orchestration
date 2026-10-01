import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { DAGEngine, PipelineInput } from '../../src/orchestrator/dag-engine';
import { TelemetryBus } from '../../src/orchestrator/telemetry-bus';
import { HITLGovernanceProtocol } from '../../src/orchestrator/hitl-protocol';

describe('Markdown-Driven DAG Orchestration Engine & Telemetry', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('runs complete markdown-driven pipeline and generates all artifacts', async () => {
    const engine = new DAGEngine(store, mockLLM, 'corr-test-md-001');

    const input: PipelineInput = {
      rawText: 'As a customer, I want to cancel my pending order online before it ships.',
      epicId: 'EPIC-ORDERS',
      featureName: 'Order Cancellation',
      domain: 'Order Management',
      priority: 'HIGH',
      releaseVersion: 'v3.0.0',
    };

    const result = await engine.run(input);

    expect(result.success).toBe(true);
    expect(result.requirement).toBeDefined();
    expect(result.requirement?.id).toBe('REQ-1001');
    expect(result.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(result.scenarios.length).toBeGreaterThan(0);
    expect(result.testCases.length).toBeGreaterThanOrEqual(6);
    expect(result.automationBlueprints.length).toBeGreaterThanOrEqual(6);
    expect(result.validationReport?.verdict).toBe('APPROVED');
    expect(result.releaseRecord?.gateStatus).toBe('PASSED');

    // Telemetry assertions
    expect(result.telemetry.totalTokens).toBeGreaterThan(0);
    expect(result.telemetry.agentExecutions).toBe(7);
    expect(result.telemetry.gatesPassed).toBe(4);
  });

  it('allows waiver bypass for major quality gates via HITL protocol', async () => {
    const hitl = new HITLGovernanceProtocol(store);
    const waiver = hitl.createSignedWaiver(
      'Lead Architect Alex',
      'Accepted partial automation for legacy module'
    );

    const engine = new DAGEngine(store, mockLLM, 'corr-waiver-md-001');
    const input: PipelineInput = {
      rawText: 'As a customer, I want to cancel my order.',
      epicId: 'EPIC-ORDERS',
      featureName: 'Order Cancellation',
      domain: 'Order Management',
      waivers: {
        'GATE-SDET-001': waiver,
      },
    };

    const result = await engine.run(input);
    expect(result.success).toBe(true);
  });
});
