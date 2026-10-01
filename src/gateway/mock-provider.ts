/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Mock LLM Provider for 100% Offline, Zero-Cost Deterministic Testing
 */

import {
  ILLMProvider,
  StructuredGenerationParams,
  StructuredGenerationResult,
} from './provider.interface';

export type FixtureMatcher = (params: StructuredGenerationParams) => boolean;

export interface MockFixture {
  id?: string;
  matcher: FixtureMatcher;
  response: any;
  delayMs?: number;
}

export class MockLLMProvider implements ILLMProvider {
  public readonly providerName = 'Mock-Deterministic';
  public readonly defaultModel = 'mock-llm-v1';

  private fixtures: MockFixture[] = [];
  public callHistory: Array<StructuredGenerationParams & { timestamp: string }> = [];

  constructor() {
    this.registerDefaultFixtures();
  }

  /**
   * Register a custom fixture with highest evaluation priority (prepended)
   */
  public registerFixture(fixture: MockFixture): void {
    this.fixtures.unshift(fixture);
  }

  public clearFixtures(): void {
    this.fixtures = [];
    this.registerDefaultFixtures();
  }

  public clearHistory(): void {
    this.callHistory = [];
  }

  public calculateCost(_model: string, _promptTokens: number, _completionTokens: number): number {
    return 0.0; // Mock has zero cost
  }

  public async generateStructured<T>(
    params: StructuredGenerationParams
  ): Promise<StructuredGenerationResult<T>> {
    const startTime = Date.now();
    this.callHistory.push({
      ...params,
      timestamp: new Date().toISOString(),
    });

    // Find matching fixture
    let matchedResponse: any = null;
    let delayMs = 1;

    for (const fixture of this.fixtures) {
      if (fixture.matcher(params)) {
        matchedResponse = typeof fixture.response === 'function' ? fixture.response(params) : fixture.response;
        if (fixture.delayMs) delayMs = fixture.delayMs;
        break;
      }
    }

    if (!matchedResponse) {
      // Fallback sensible mock based on hints in prompt
      matchedResponse = this.generateFallbackMock(params);
    }

    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const durationMs = Date.now() - startTime;
    const promptTokens = Math.max(15, Math.ceil((params.systemPrompt.length + params.userPrompt.length) / 4));
    const completionTokens = Math.max(20, Math.ceil(JSON.stringify(matchedResponse).length / 4));

    return {
      data: structuredClone(matchedResponse) as T,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      durationMs,
      modelUsed: params.modelOverride || this.defaultModel,
      providerName: this.providerName,
      costUsd: 0.0,
    };
  }

  private registerDefaultFixtures(): void {
    // 1. Requirement Analysis Agent Fixture
    this.registerFixture({
      id: 'default-req-analysis',
      matcher: p =>
        p.systemPrompt.includes('AGT-REQ-001') ||
        p.systemPrompt.includes('AGT-REQUIREMENT-001') ||
        p.userPrompt.includes('Requirement Analysis') ||
        p.userPrompt.includes('As a user') ||
        p.userPrompt.includes('As a customer'),
      response: (params: StructuredGenerationParams) => {
        const now = new Date().toISOString();
        return {
          requirement: {
            id: 'REQ-1001',
            version: 1,
            epicId: 'EPIC-ORDERS',
            featureName: 'Order Fulfillment & Checkout',
            title: 'Customer Self-Service Order Cancellation',
            rawText: params.userPrompt,
            domain: 'Order Management',
            priority: 'HIGH',
            risksIdentified: [
              {
                riskId: 'RISK-REQ-01',
                description: 'Race condition if cancellation happens simultaneously with warehouse shipment dispatch',
                severity: 'CRITICAL',
              },
              {
                riskId: 'RISK-REQ-02',
                description: 'Payment refund gateway timeout or double refund invocation',
                severity: 'HIGH',
              },
            ],
            ambiguities: [
              'Handling of split-shipment orders where only one parcel is in transit',
            ],
            dependencies: ['REQ-AUTH-001', 'REQ-PAY-002'],
            status: 'REVIEWED',
            createdAt: now,
            updatedAt: now,
          },
          acceptanceCriteria: [
            {
              id: 'AC-2001',
              requirementId: 'REQ-1001',
              version: 1,
              given: [
                'Order is in PENDING_PROCESSING status',
                'User is authenticated as the order owner',
              ],
              when: 'User requests order cancellation via API or UI',
              then: [
                'Order status transitions immediately to CANCELLED',
                'Full payment refund transaction is initiated',
                'Notification email is queued for dispatch',
              ],
              businessRules: [
                'Orders past SHIPPED state cannot be cancelled through self-service',
                'Refund must be issued to the original payment method within 5-7 business days',
              ],
              isTestable: true,
              status: 'VALIDATED',
              createdAt: now,
            },
            {
              id: 'AC-2002',
              requirementId: 'REQ-1001',
              version: 1,
              given: [
                'Order is in SHIPPED or DELIVERED status',
                'User is authenticated as order owner',
              ],
              when: 'User attempts to cancel the order',
              then: [
                'Cancellation is rejected with HTTP 409 Conflict',
                'Clear user message is returned directing user to Return Merchandise Authorization flow',
              ],
              businessRules: [
                'In-transit goods must follow return flow, not cancellation',
              ],
              isTestable: true,
              status: 'VALIDATED',
              createdAt: now,
            },
          ],
        };
      },
    });

    // 2. Test Design Agent Fixture
    this.registerFixture({
      id: 'default-test-design',
      matcher: p =>
        p.systemPrompt.includes('AGT-DES-001') ||
        p.systemPrompt.includes('AGT-TEST-DESIGN-001') ||
        p.userPrompt.includes('Test Design') ||
        p.userPrompt.includes('Generate test scenarios'),
      response: () => {
        const now = new Date().toISOString();
        return {
          scenarios: [
            {
              id: 'SCN-3001',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2001',
              title: 'Successful cancellation of order in pending state',
              classification: 'POSITIVE',
              targetLayer: 'API',
              riskLevel: 'HIGH',
              scenarioDescription: 'Verify pending order is successfully transitioned to CANCELLED and refund is triggered.',
              isRegressionCandidate: true,
              status: 'EVALUATED',
              createdAt: now,
            },
            {
              id: 'SCN-3002',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2002',
              title: 'Attempted cancellation of shipped order rejected with 409',
              classification: 'NEGATIVE',
              targetLayer: 'API',
              riskLevel: 'HIGH',
              scenarioDescription: 'Verify shipped order cannot be cancelled and returns appropriate error guidance.',
              isRegressionCandidate: true,
              status: 'EVALUATED',
              createdAt: now,
            },
            {
              id: 'SCN-3003',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2001',
              title: 'Concurrent cancellation request race condition test',
              classification: 'BOUNDARY',
              targetLayer: 'DATABASE',
              riskLevel: 'CRITICAL',
              scenarioDescription: 'Two parallel cancellation requests arriving within 10ms for the same order.',
              isRegressionCandidate: true,
              status: 'EVALUATED',
              createdAt: now,
            },
          ],
          testCases: [
            {
              id: 'TC-4001',
              scenarioId: 'SCN-3001',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2001',
              title: 'POST /v1/orders/{id}/cancel with valid pending order returns 200',
              type: 'FUNCTIONAL',
              priority: 'P0',
              preconditions: ['Order #1001 created in PENDING status with auth token'],
              testDataRequirements: {
                orderId: 'ORD-1001',
                cancellationReason: 'CUSTOMER_MIND_CHANGED',
              },
              steps: [
                {
                  stepIndex: 1,
                  action: 'Dispatch POST /v1/orders/ORD-1001/cancel with bearer token',
                  expectedResult: 'HTTP 200 OK with status="CANCELLED"',
                },
                {
                  stepIndex: 2,
                  action: 'Query GET /v1/payments/refunds?orderId=ORD-1001',
                  expectedResult: 'Refund record exists in PENDING_CAPTURE state',
                },
              ],
              postConditions: ['Order audit log contains CANCELLED event'],
              status: 'APPROVED',
              createdAt: now,
            },
            {
              id: 'TC-4002',
              scenarioId: 'SCN-3002',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2002',
              title: 'POST /v1/orders/{id}/cancel with SHIPPED order returns 409',
              type: 'FUNCTIONAL',
              priority: 'P1',
              preconditions: ['Order #1002 marked as SHIPPED'],
              testDataRequirements: {
                orderId: 'ORD-1002',
              },
              steps: [
                {
                  stepIndex: 1,
                  action: 'Dispatch POST /v1/orders/ORD-1002/cancel',
                  expectedResult: 'HTTP 409 Conflict with error code ERR_ORDER_ALREADY_SHIPPED',
                },
              ],
              postConditions: ['Order state remains SHIPPED'],
              status: 'APPROVED',
              createdAt: now,
            },
            {
              id: 'TC-4003',
              scenarioId: 'SCN-3003',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2001',
              title: 'Concurrent dual cancel request idempotency check',
              type: 'RESILIENCE',
              priority: 'P0',
              preconditions: ['Order #1003 in PENDING status'],
              testDataRequirements: {
                orderId: 'ORD-1003',
              },
              steps: [
                {
                  stepIndex: 1,
                  action: 'Fire 2 parallel cancel requests at t=0ms',
                  expectedResult: 'Exactly one request succeeds (200), other succeeds idempotently or returns 200 without duplicate refund',
                },
              ],
              postConditions: ['Exactly one refund transaction recorded in ledger'],
              status: 'APPROVED',
              createdAt: now,
            },
          ],
        };
      },
    });

    // 3. Security NFR Agent Fixture
    this.registerFixture({
      id: 'default-sec-nfr',
      matcher: p =>
        p.systemPrompt.includes('AGT-SEC-001') ||
        p.systemPrompt.includes('AGT-SECURITY-001') ||
        p.userPrompt.includes('Security') ||
        p.userPrompt.includes('OWASP'),
      response: () => {
        const now = new Date().toISOString();
        return {
          testCases: [
            {
              id: 'TC-4010',
              scenarioId: 'SCN-3001',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2001',
              title: 'BOLA/IDOR: Unauthorized user attempting to cancel another customer order',
              type: 'SECURITY',
              priority: 'P0',
              preconditions: ['Order #1001 owned by User A', 'User B authenticated'],
              testDataRequirements: {
                targetOrderId: 'ORD-1001',
                attackerToken: 'Bearer user_b_token',
              },
              steps: [
                {
                  stepIndex: 1,
                  action: 'User B sends POST /v1/orders/ORD-1001/cancel',
                  expectedResult: 'HTTP 403 Forbidden with access denied message',
                },
              ],
              postConditions: ['Order #1001 remains unaltered'],
              status: 'APPROVED',
              createdAt: now,
            },
          ],
        };
      },
    });

    // 4. Performance NFR Agent Fixture
    this.registerFixture({
      id: 'default-perf-nfr',
      matcher: p =>
        p.systemPrompt.includes('AGT-PERF-001') ||
        p.systemPrompt.includes('AGT-PERFORMANCE-001') ||
        p.userPrompt.includes('Performance') ||
        p.userPrompt.includes('Latency'),
      response: () => {
        const now = new Date().toISOString();
        return {
          testCases: [
            {
              id: 'TC-4020',
              scenarioId: 'SCN-3001',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2001',
              title: 'Cancellation Endpoint Latency SLA under 500 req/sec',
              type: 'PERFORMANCE',
              priority: 'P1',
              preconditions: ['Mock payment gateway latency 50ms', 'Warm pool of 10k orders'],
              testDataRequirements: {
                vus: '50',
                duration: '60s',
                targetRps: '500',
              },
              steps: [
                {
                  stepIndex: 1,
                  action: 'Execute k6 cancellation load ramp-up',
                  expectedResult: 'p95 latency < 350ms, error rate < 0.01%',
                },
              ],
              postConditions: ['DB connection pool utilization < 75%'],
              status: 'APPROVED',
              createdAt: now,
            },
          ],
        };
      },
    });

    // 5. Accessibility NFR Agent Fixture
    this.registerFixture({
      id: 'default-a11y-nfr',
      matcher: p =>
        p.systemPrompt.includes('AGT-A11Y-001') ||
        p.systemPrompt.includes('AGT-ACCESSIBILITY-001') ||
        p.userPrompt.includes('Accessibility') ||
        p.userPrompt.includes('WCAG'),
      response: () => {
        const now = new Date().toISOString();
        return {
          testCases: [
            {
              id: 'TC-4030',
              scenarioId: 'SCN-3001',
              requirementId: 'REQ-1001',
              acceptanceCriteriaId: 'AC-2001',
              title: 'WCAG 2.1 AA Compliance for Order Cancellation Confirmation Modal',
              type: 'ACCESSIBILITY',
              priority: 'P2',
              preconditions: ['Order summary UI page loaded with Cancel button visible'],
              testDataRequirements: {
                standard: 'WCAG21AA',
              },
              steps: [
                {
                  stepIndex: 1,
                  action: 'Trigger cancel button via keyboard Tab + Enter',
                  expectedResult: 'Focus trapped within confirmation modal, aria-modal="true" active',
                },
                {
                  stepIndex: 2,
                  action: 'Run Axe-core automated scanner on opened dialog',
                  expectedResult: 'Zero critical or serious accessibility violations',
                },
              ],
              postConditions: ['Focus returned to parent container upon closing'],
              status: 'APPROVED',
              createdAt: now,
            },
          ],
        };
      },
    });

    // 6. SDET Automation Blueprint Agent Fixture
    this.registerFixture({
      id: 'default-sdet-blueprint',
      matcher: p =>
        p.systemPrompt.includes('AGT-SDET-001') ||
        p.systemPrompt.includes('AGT-SDET-BLUEPRINT-001') ||
        p.userPrompt.includes('Automation Blueprint') ||
        p.userPrompt.includes('testCases:') ||
        p.userPrompt.includes('codeBlueprint'),
      response: () => {
        const now = new Date().toISOString();
        return {
          blueprints: [
            {
              id: 'AUT-5001',
              testCaseId: 'TC-4001',
              automationFeasible: true,
              recommendedHarness: 'REST_API',
              targetComponent: 'OrderFulfillmentService',
              targetEndpointOrUrl: '/v1/orders/{orderId}/cancel',
              codeBlueprint: `import { test, expect } from '@playwright/test';

test('Order cancellation API returns 200 and triggers refund', async ({ request }) => {
  const res = await request.post('/v1/orders/ORD-1001/cancel', {
    headers: { Authorization: 'Bearer test_user_token' },
    data: { cancellationReason: 'CUSTOMER_MIND_CHANGED' }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.orderId).toBe('ORD-1001');
  expect(body.status).toBe('CANCELLED');
});`,
              assertions: [
                'res.status() === 200',
                'body.status === "CANCELLED"',
                'body.refundInitiated === true',
              ],
              executionTimeoutMs: 5000,
              status: 'READY_FOR_HARNESS',
              createdAt: now,
            },
            {
              id: 'AUT-5002',
              testCaseId: 'TC-4002',
              automationFeasible: true,
              recommendedHarness: 'REST_API',
              targetComponent: 'OrderFulfillmentService',
              targetEndpointOrUrl: '/v1/orders/{orderId}/cancel',
              codeBlueprint: `import { test, expect } from '@playwright/test';

test('Order cancellation of shipped order returns 409', async ({ request }) => {
  const res = await request.post('/v1/orders/ORD-1002/cancel', {
    headers: { Authorization: 'Bearer test_user_token' }
  });
  expect(res.status()).toBe(409);
  const body = await res.json();
  expect(body.errorCode).toBe('ERR_ORDER_ALREADY_SHIPPED');
});`,
              assertions: [
                'res.status() === 409',
                'body.errorCode === "ERR_ORDER_ALREADY_SHIPPED"',
              ],
              executionTimeoutMs: 3000,
              status: 'READY_FOR_HARNESS',
              createdAt: now,
            },
            {
              id: 'AUT-5003',
              testCaseId: 'TC-4003',
              automationFeasible: true,
              recommendedHarness: 'REST_API',
              targetComponent: 'OrderFulfillmentService',
              targetEndpointOrUrl: '/v1/orders/{orderId}/cancel',
              codeBlueprint: `import { test, expect } from '@playwright/test';

test('Concurrent cancellation requests idempotent handling', async ({ request }) => {
  const [res1, res2] = await Promise.all([
    request.post('/v1/orders/ORD-1003/cancel', { headers: { Authorization: 'Bearer test_user_token' } }),
    request.post('/v1/orders/ORD-1003/cancel', { headers: { Authorization: 'Bearer test_user_token' } })
  ]);
  expect([200, 409]).toContain(res1.status());
  expect([200, 409]).toContain(res2.status());
});`,
              assertions: ['Exactly one refund issued'],
              executionTimeoutMs: 5000,
              status: 'READY_FOR_HARNESS',
              createdAt: now,
            },
            {
              id: 'AUT-5004',
              testCaseId: 'TC-4010',
              automationFeasible: true,
              recommendedHarness: 'REST_API',
              targetComponent: 'OrderFulfillmentService',
              targetEndpointOrUrl: '/v1/orders/ORD-1001/cancel',
              codeBlueprint: `import { test, expect } from '@playwright/test';

test('BOLA: Unauthorized user cannot cancel order', async ({ request }) => {
  const res = await request.post('/v1/orders/ORD-1001/cancel', {
    headers: { Authorization: 'Bearer attacker_token' }
  });
  expect(res.status()).toBe(403);
});`,
              assertions: ['res.status() === 403'],
              executionTimeoutMs: 3000,
              status: 'READY_FOR_HARNESS',
              createdAt: now,
            },
            {
              id: 'AUT-5005',
              testCaseId: 'TC-4020',
              automationFeasible: true,
              recommendedHarness: 'K6_PERF',
              targetComponent: 'OrderFulfillmentService',
              targetEndpointOrUrl: '/v1/orders/{orderId}/cancel',
              codeBlueprint: `import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 50, duration: '60s' };
export default function () {
  const res = http.post('https://api.internal/v1/orders/ORD-1001/cancel', {}, { headers: { Authorization: 'Bearer token' } });
  check(res, { 'status is 200': (r) => r.status === 200 });
}`,
              assertions: ['p95 < 350ms', 'error rate < 0.01%'],
              executionTimeoutMs: 65000,
              status: 'READY_FOR_HARNESS',
              createdAt: now,
            },
            {
              id: 'AUT-5006',
              testCaseId: 'TC-4030',
              automationFeasible: true,
              recommendedHarness: 'AXE_A11Y',
              targetComponent: 'OrderCancellationModal',
              codeBlueprint: `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Cancellation modal accessibility scan', async ({ page }) => {
  await page.goto('/orders/1001');
  await page.click('button#cancel-order');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});`,
              assertions: ['results.violations.length === 0'],
              executionTimeoutMs: 10000,
              status: 'READY_FOR_HARNESS',
              createdAt: now,
            },
          ],
        };
      },
    });

    // 7. Test Validation & Drift Agent Fixture
    this.registerFixture({
      id: 'default-validation-drift',
      matcher: p =>
        p.systemPrompt.includes('AGT-VAL-001') ||
        p.systemPrompt.includes('AGT-VALIDATION-001') ||
        p.userPrompt.includes('Drift') ||
        p.userPrompt.includes('hallucinationIndex'),
      response: () => {
        return {
          hasContradictions: false,
          hallucinationIndex: 0.02, // Very low hallucination
          driftFindings: [],
          groundingConfidence: 0.98,
          verdict: 'APPROVED',
          rationale: 'All generated scenarios and blueprints are strictly grounded in upstream requirement constraints and acceptance criteria.',
        };
      },
    });

    // 8. Semantic Evaluator Fixtures (Ambiguity, Completeness, Gate Judge)
    this.registerFixture({
      id: 'default-semantic-judge',
      matcher: p =>
        p.systemPrompt.includes('JUDGE') ||
        p.userPrompt.includes('Ambiguity Score') ||
        p.userPrompt.includes('Completeness Score') ||
        p.userPrompt.includes('evaluate against rubric'),
      response: () => {
        return {
          passed: true,
          score: 0.94,
          rationale: 'The requirement and scenarios are specific, measurable, and free of blocking ambiguities. Edge-cases including concurrent cancellation and invalid state transitions are thoroughly specified.',
        };
      },
    });
  }

  private generateFallbackMock(_params: StructuredGenerationParams): any {
    return {
      status: 'SUCCESS',
      message: 'Generated by MockLLMProvider fallback',
      timestamp: new Date().toISOString(),
    };
  }
}
