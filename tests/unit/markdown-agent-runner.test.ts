import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { MarkdownAgentRunner } from '../../src/runtime/markdown-agent-runner';

describe('MarkdownAgentRunner Unit Tests', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('executes AGT-REQ-001.md directly and produces typed output', async () => {
    const runner = new MarkdownAgentRunner('agents/AGT-REQ-001.md', store, mockLLM);

    expect(runner.agentId).toBe('AGT-REQ-001');
    expect(runner.agentName).toBe('Requirement Analysis Agent');

    const result = await runner.execute(
      'As a customer, I want to cancel my pending order online.',
      'corr-agent-test-1'
    );

    expect(result.output).toBeDefined();
    expect(result.output.requirement).toBeDefined();
    expect(result.output.requirement.id).toBe('REQ-1001');
    expect(result.output.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(result.log.agentId).toBe('AGT-REQ-001');
    expect(result.log.finalStatus).toBe('SUCCESS');
  });

  it('executes AGT-DES-001.md directly and captures telemetry', async () => {
    const runner = new MarkdownAgentRunner('agents/AGT-DES-001.md', store, mockLLM);

    expect(runner.agentId).toBe('AGT-DES-001');

    const result = await runner.execute(
      'Requirement: REQ-1001 Cancellation',
      'corr-agent-test-2'
    );

    expect(result.output.scenarios.length).toBeGreaterThan(0);
    expect(result.output.testCases.length).toBeGreaterThan(0);
    expect(result.log.tokenUsage.totalTokens).toBeGreaterThan(0);
  });
});
