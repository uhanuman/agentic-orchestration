import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { MarkdownAgentRunner } from '../../src/runtime/markdown-agent-runner';
import { AgentLifecycleEvent } from '../../src/core/types';

describe('MarkdownAgentRunner Unit Tests & 7-Step Lifecycle', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('executes 01.requirement-analysis.agent.md directly and produces typed output', async () => {
    const runner = new MarkdownAgentRunner('agents/01.requirement-analysis.agent.md', store, mockLLM);

    expect(runner.agentId).toBe('AGT-REQUIREMENT-001');
    expect(runner.agentName).toBe('Requirement Analysis Agent');

    const result = await runner.execute(
      'As a customer, I want to cancel my pending order online.',
      'corr-agent-test-1',
      ['REQ-001']
    );

    expect(result.output).toBeDefined();
    expect(result.output.requirement).toBeDefined();
    expect(result.output.requirement.id).toBe('REQ-1001');
    expect(result.output.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(result.log.agentId).toBe('AGT-REQUIREMENT-001');
    expect(result.log.finalStatus).toBe('SUCCESS');
    expect(result.lifecycleEvent.inputArtifacts).toContain('REQ-001');
    expect(result.lifecycleEvent.nextAgents).toContain('AGT-TEST-DESIGN-001');
  });

  it('executes 02.test-design.agent.md and publishes the exact 7-step AgentLifecycleEvent', async () => {
    const runner = new MarkdownAgentRunner('agents/02.test-design.agent.md', store, mockLLM);

    expect(runner.agentId).toBe('AGT-TEST-DESIGN-001');

    let publishedEvent: AgentLifecycleEvent | undefined;

    const result = await runner.execute(
      'Requirement: REQ-1001 Cancellation',
      'corr-agent-test-2',
      ['REQ-001', 'AC-001', 'AC-002'],
      {
        runId: 'RUN-20261001-001',
        onEvent: (ev) => {
          publishedEvent = ev;
        }
      }
    );

    expect(result.output.scenarios.length).toBeGreaterThan(0);
    expect(result.output.testCases.length).toBeGreaterThan(0);
    expect(result.log.tokenUsage.totalTokens).toBeGreaterThan(0);

    // Verify AgentLifecycleEvent structure matches exact user specifications
    expect(publishedEvent).toBeDefined();
    expect(publishedEvent?.agentId).toBe('AGT-TEST-DESIGN-001');
    expect(publishedEvent?.runId).toBe('RUN-20261001-001');
    expect(publishedEvent?.inputArtifacts).toEqual(['REQ-001', 'AC-001', 'AC-002']);
    expect(publishedEvent?.outputArtifacts).toContain('SCN-3001');
    expect(publishedEvent?.outputArtifacts).toContain('TC-4001');
    expect(publishedEvent?.evaluatorIds).toContain('EVAL-TEST-COVERAGE-001');
    expect(publishedEvent?.evaluatorIds).toContain('EVAL-TRACEABILITY-001');
    expect(publishedEvent?.gateIds).toContain('GATE-TEST-DESIGN-001');
    expect(publishedEvent?.nextAgents).toEqual([
      'AGT-SECURITY-001',
      'AGT-PERFORMANCE-001',
      'AGT-ACCESSIBILITY-001',
      'AGT-SDET-001'
    ]);
  });
});
