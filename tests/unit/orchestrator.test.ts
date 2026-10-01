import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { DAGEngine, PipelineInput } from '../../src/orchestrator/dag-engine';
import { TelemetryBus } from '../../src/orchestrator/telemetry-bus';
import { HITLGovernanceProtocol } from '../../src/orchestrator/hitl-protocol';

describe('Milestone 5: DAG Orchestration Engine & Telemetry Bus', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('runs complete end-to-end pipeline and generates full artifact set', async () => {
    const engine = new DAGEngine(store, mockLLM, 'corr-test-e2e-001');

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
    expect(result.testCases.length).toBeGreaterThanOrEqual(6); // 3 functional + 3 NFR
    expect(result.automationBlueprints.length).toBeGreaterThanOrEqual(6);
    expect(result.validationReport?.verdict).toBe('APPROVED');
    expect(result.releaseRecord?.gateStatus).toBe('PASSED');

    // Telemetry assertions
    expect(result.telemetry.totalTokens).toBeGreaterThan(0);
    expect(result.telemetry.agentExecutions).toBe(7);
    expect(result.telemetry.gatesPassed).toBe(4);
    expect(result.telemetry.gatesFailed).toBe(0);
  });

  it('handles major quality gate failure with Human-in-the-Loop signed waiver', async () => {
    const hitl = new HITLGovernanceProtocol(store);
    const waiver = hitl.createSignedWaiver(
      'Lead Architect Alex',
      'Accepted partial automation for legacy module'
    );

    expect(waiver.humanApprover).toBe('Lead Architect Alex');
    expect(waiver.waiverJustification).toContain('Accepted partial automation');

    const engine = new DAGEngine(store, mockLLM, 'corr-waiver-001');
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

  it('TelemetryBus tracks agent execution logs and calculates totals', () => {
    const bus = new TelemetryBus('corr-telemetry-test');

    bus.recordAgentLog({
      runId: '550e8400-e29b-41d4-a716-446655440000',
      correlationId: 'corr-telemetry-test',
      agentId: 'AGT-REQ-001',
      agentVersion: '1.0.0',
      aiProvider: 'Mock-Deterministic',
      modelName: 'mock-v1',
      promptVersion: 'v1',
      inputArtifactIds: [],
      outputArtifactIds: ['REQ-1001'],
      evaluatorIds: [],
      gateIds: [],
      tokenUsage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
        estimatedCostUsd: 0.05,
      },
      durationMs: 15,
      evalResults: [],
      gateResult: 'PASSED',
      finalStatus: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });

    const summary = bus.getSummary();
    expect(summary.totalPromptTokens).toBe(100);
    expect(summary.totalCompletionTokens).toBe(200);
    expect(summary.totalTokens).toBe(300);
    expect(summary.totalCostUsd).toBe(0.05);
    expect(summary.agentExecutions).toBe(1);
  });
});
