import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { RequirementAnalysisAgent } from '../../src/agents/requirement-agent';
import { TestDesignAgent } from '../../src/agents/test-design-agent';
import { SecurityAgent } from '../../src/agents/nfr/security-agent';
import { PerformanceAgent } from '../../src/agents/nfr/performance-agent';
import { AccessibilityAgent } from '../../src/agents/nfr/accessibility-agent';
import { SDETAutomationAgent } from '../../src/agents/sdet-agent';
import { TestValidationAgent } from '../../src/agents/validation-agent';

describe('Milestone 4: Specialized Agent Workforce', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;
  const correlationId = 'trace-corr-12345';

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('RequirementAnalysisAgent parses story, saves REQ & AC, logs telemetry', async () => {
    const agent = new RequirementAnalysisAgent(store, mockLLM);

    const result = await agent.execute(
      {
        rawText: 'As a customer, I want to cancel my pending order online.',
        epicId: 'EPIC-ORDERS',
        featureName: 'Order Fulfillment',
        domain: 'Order Management',
        priority: 'HIGH',
      },
      correlationId
    );

    expect(result.output.requirement).toBeDefined();
    expect(result.output.requirement.id).toBe('REQ-1001');
    expect(result.output.acceptanceCriteria).toHaveLength(2);
    expect(result.log.agentId).toBe('AGT-REQ-001');
    expect(result.log.finalStatus).toBe('SUCCESS');

    // Verify stored in ContextStore
    const reqInStore = await store.getArtifact('REQ', 'REQ-1001');
    expect(reqInStore).not.toBeNull();

    // Verify telemetry logged
    const logs = await store.getExecutionLogs(correlationId);
    expect(logs).toHaveLength(1);
    expect(logs[0].agentId).toBe('AGT-REQ-001');
  });

  it('TestDesignAgent retrieves REQ by ID and generates scenarios and test cases', async () => {
    const reqAgent = new RequirementAnalysisAgent(store, mockLLM);
    await reqAgent.execute(
      {
        rawText: 'As a customer, I want to cancel my pending order online.',
        epicId: 'EPIC-ORDERS',
        featureName: 'Order Fulfillment',
        domain: 'Order Management',
      },
      correlationId
    );

    const desAgent = new TestDesignAgent(store, mockLLM);
    const result = await desAgent.execute({ requirementId: 'REQ-1001' }, correlationId);

    expect(result.output.scenarios.length).toBeGreaterThan(0);
    expect(result.output.testCases.length).toBeGreaterThan(0);
    expect(result.output.scenarios[0].requirementId).toBe('REQ-1001');
    expect(result.output.testCases[0].requirementId).toBe('REQ-1001');

    // Check store
    const tc = await store.getArtifact('TC', result.output.testCases[0].id);
    expect(tc).not.toBeNull();
  });

  it('NFR Agents generate Security, Performance, and Accessibility test cases', async () => {
    // Setup REQ and Test Design first
    const reqAgent = new RequirementAnalysisAgent(store, mockLLM);
    await reqAgent.execute(
      {
        rawText: 'Order cancellation flow',
        epicId: 'EPIC-ORDERS',
        featureName: 'Order Fulfillment',
        domain: 'Order Management',
      },
      correlationId
    );
    const desAgent = new TestDesignAgent(store, mockLLM);
    await desAgent.execute({ requirementId: 'REQ-1001' }, correlationId);

    // 1. Security Agent
    const secAgent = new SecurityAgent(store, mockLLM);
    const secResult = await secAgent.execute({ requirementId: 'REQ-1001' }, correlationId);
    expect(secResult.output.testCases[0].type).toBe('SECURITY');
    expect(secResult.output.testCases[0].priority).toBe('P0');

    // 2. Performance Agent
    const perfAgent = new PerformanceAgent(store, mockLLM);
    const perfResult = await perfAgent.execute({ requirementId: 'REQ-1001' }, correlationId);
    expect(perfResult.output.testCases[0].type).toBe('PERFORMANCE');

    // 3. Accessibility Agent
    const a11yAgent = new AccessibilityAgent(store, mockLLM);
    const a11yResult = await a11yAgent.execute({ requirementId: 'REQ-1001' }, correlationId);
    expect(a11yResult.output.testCases[0].type).toBe('ACCESSIBILITY');
  });

  it('SDETAutomationAgent generates automation blueprints for test cases', async () => {
    // Setup
    const reqAgent = new RequirementAnalysisAgent(store, mockLLM);
    await reqAgent.execute(
      {
        rawText: 'Order cancellation flow',
        epicId: 'EPIC-ORDERS',
        featureName: 'Order Fulfillment',
        domain: 'Order Management',
      },
      correlationId
    );
    const desAgent = new TestDesignAgent(store, mockLLM);
    const desResult = await desAgent.execute({ requirementId: 'REQ-1001' }, correlationId);

    const tcIds = desResult.output.testCases.map(t => t.id);
    const sdetAgent = new SDETAutomationAgent(store, mockLLM);
    const sdetResult = await sdetAgent.execute({ testCaseIds: tcIds }, correlationId);

    expect(sdetResult.output.blueprints.length).toBeGreaterThan(0);
    expect(sdetResult.output.blueprints[0].automationFeasible).toBe(true);
    expect(sdetResult.output.blueprints[0].codeBlueprint).toContain('@playwright/test');
    expect(sdetResult.output.blueprints[0].status).toBe('READY_FOR_HARNESS');
  });

  it('TestValidationAgent audits drift against source requirement', async () => {
    // Setup full chain
    const reqAgent = new RequirementAnalysisAgent(store, mockLLM);
    await reqAgent.execute(
      {
        rawText: 'Order cancellation flow',
        epicId: 'EPIC-ORDERS',
        featureName: 'Order Fulfillment',
        domain: 'Order Management',
      },
      correlationId
    );
    const desAgent = new TestDesignAgent(store, mockLLM);
    await desAgent.execute({ requirementId: 'REQ-1001' }, correlationId);

    const valAgent = new TestValidationAgent(store, mockLLM);
    const valResult = await valAgent.execute({ requirementId: 'REQ-1001' }, correlationId);

    expect(valResult.output.hasContradictions).toBe(false);
    expect(valResult.output.hallucinationIndex).toBeLessThanOrEqual(0.10);
    expect(valResult.output.verdict).toBe('APPROVED');
  });
});
