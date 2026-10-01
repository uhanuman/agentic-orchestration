import { describe, it, expect, beforeEach } from 'vitest';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { GeminiProvider } from '../../src/gateway/gemini-provider';
import { ProviderFactory } from '../../src/gateway/provider-factory';

describe('Milestone 2: AI Provider Gateway & Mock Engine', () => {
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
  });

  it('generates structured response for requirement analysis via default fixture', async () => {
    const result = await mockProvider.generateStructured<any>({
      systemPrompt: 'You are AGT-REQ-001 Requirement Analysis Agent',
      userPrompt: 'As a customer, I want to cancel my pending order online.',
      schema: { type: 'object' },
    });

    expect(result.data).toBeDefined();
    expect(result.data.requirement).toBeDefined();
    expect(result.data.requirement.id).toBe('REQ-1001');
    expect(result.data.acceptanceCriteria).toHaveLength(2);
    expect(result.usage.promptTokens).toBeGreaterThan(0);
    expect(result.usage.completionTokens).toBeGreaterThan(0);
    expect(result.costUsd).toBe(0.0);
    expect(result.providerName).toBe('Mock-Deterministic');
  });

  it('allows registering and matching high-priority custom fixtures', async () => {
    mockProvider.registerFixture({
      id: 'custom-promo-fixture',
      matcher: p => p.userPrompt.includes('PROMO_CODE'),
      response: {
        discountApplied: true,
        percentage: 20,
      },
    });

    const result = await mockProvider.generateStructured<any>({
      systemPrompt: 'Evaluate coupon',
      userPrompt: 'Validate PROMO_CODE: SUMMER2026',
      schema: {},
    });

    expect(result.data.discountApplied).toBe(true);
    expect(result.data.percentage).toBe(20);
    expect(mockProvider.callHistory).toHaveLength(1);
  });

  it('correctly calculates token costs for Gemini provider models', () => {
    const gemini = new GeminiProvider('dummy-key');
    
    // Test gemini-3.8-flash: $0.15/M in, $0.60/M out
    const flashCost = gemini.calculateCost('gemini-3.8-flash', 1000, 500);
    expect(flashCost).toBeCloseTo(0.00015 * 1 + 0.0006 * 0.5, 6);

    // Test gemini-pro: $1.25/M in, $5.00/M out
    const proCost = gemini.calculateCost('gemini-3.1-pro-preview', 1000, 500);
    expect(proCost).toBeCloseTo(0.00125 * 1 + 0.005 * 0.5, 6);
  });

  it('safely handles missing Gemini API key with informative error', async () => {
    const unconfiguredGemini = new GeminiProvider('');
    expect(unconfiguredGemini.isConfigured()).toBe(false);

    await expect(
      unconfiguredGemini.generateStructured({
        systemPrompt: 'Test',
        userPrompt: 'Test',
        schema: {},
      })
    ).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('ProviderFactory returns MockLLMProvider when configured for mock', () => {
    const provider = ProviderFactory.createProvider({ type: 'mock' });
    expect(provider.providerName).toBe('Mock-Deterministic');
  });
});
