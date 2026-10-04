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
    // 0. InvenTree Part & Category Requirement Analysis Fixture
    this.registerFixture({
      id: 'inventree-part-req-analysis',
      matcher: p =>
        (p.systemPrompt.includes('AGT-REQ') ||
          p.systemPrompt.includes('AGT-REQUIREMENT') ||
          p.userPrompt.includes('Requirement Analysis') ||
          p.userPrompt.includes('InvenTree')) &&
        (p.userPrompt.includes('InvenTree') ||
          p.userPrompt.includes('/api/part/') ||
          p.userPrompt.includes('Part Category')),
      response: (params: StructuredGenerationParams) => {
        const now = new Date().toISOString();
        return {
          requirement: {
            id: 'REQ-INVENTREE-PART-001',
            version: 1,
            epicId: 'EPIC-INVENTREE-CORE',
            featureName: 'Part & Part Category Lifecycle Management',
            title: 'InvenTree Part and Part Category Management & Authentication',
            rawText: params.userPrompt,
            domain: 'Inventory & Manufacturing Engineering',
            priority: 'HIGH',
            risksIdentified: [
              {
                riskId: 'RISK-INVENTREE-01',
                description: 'Accidental cascade deletion of a non-empty Part Category causing orphan deletion of associated BOM components and stock items',
                severity: 'CRITICAL',
              },
              {
                riskId: 'RISK-INVENTREE-02',
                description: 'Bypassing token-based authentication on write endpoints allows anonymous or unprivileged callers to mutate production catalogs',
                severity: 'CRITICAL',
              },
              {
                riskId: 'RISK-INVENTREE-03',
                description: 'Concurrent PUT and PATCH operations without optimistic concurrency control resulting in lost updates to active status or IPN',
                severity: 'HIGH',
              },
              {
                riskId: 'RISK-INVENTREE-04',
                description: 'Search & filter latency degradation on large catalogs (>100k parts) when filtering by deep category trees without database indices',
                severity: 'HIGH',
              },
              {
                riskId: 'RISK-INVENTREE-05',
                description: 'State desynchronization between Category Tree View UI and Parts List filtering when toggling active status on subcategories',
                severity: 'MEDIUM',
              },
            ],
            ambiguities: [
              'Non-empty category deletion policy: whether deletion rejects with 400/409, moves child parts to parent, or supports cascade flag',
              'Authentication header tolerance: whether Authorization: Bearer is accepted alongside Authorization: Token',
              'Pagination defaults and maximum limits for GET /api/part/ and GET /api/part/category/',
              'Internal Part Number (IPN) uniqueness scope: globally unique or unique within category',
            ],
            dependencies: [
              'AUTH-TOKEN-SERVICE',
              'COMPANY-SUPPLIER-SERVICE',
              'STOCK-INVENTORY-SERVICE',
              'BUILD-ASSEMBLY-SERVICE',
            ],
            status: 'REVIEWED',
            createdAt: now,
            updatedAt: now,
          },
          acceptanceCriteria: [
            {
              id: 'AC-INVENTREE-101',
              requirementId: 'REQ-INVENTREE-PART-001',
              version: 1,
              given: [
                'User possesses a valid API authentication token with category write privileges',
                'InvenTree database contains root and nested category hierarchies',
              ],
              when: 'User invokes category CRUD operations via GET, POST, PUT, DELETE /api/part/category/* or Category Tree UI',
              then: [
                'POST /api/part/category/ creates new category supporting nullable parent field, returning HTTP 201 Created',
                'GET /api/part/category/ returns hierarchical category list with parent-child linkage',
                'GET /api/part/category/{id}/ returns single category details with path breadcrumbs',
                'PUT /api/part/category/{id}/ updates category attributes and re-parents safely',
                'DELETE /api/part/category/{id}/ rejects deletion with HTTP 400/409 if category contains child parts or subcategories unless cascade confirmed',
                'Category Tree View in UI reflects structural changes immediately without full page reload',
              ],
              businessRules: [
                'Root categories have parent = null',
                'Circular parent references (e.g. category A -> parent B -> parent A) are rejected with HTTP 400',
                'Category name is required, max 100 characters',
                'Non-empty categories cannot be silently deleted without user confirmation',
              ],
              isTestable: true,
              testabilityRationale: 'Fully verifiable via REST API assertions on /api/part/category/* and Playwright tree view UI automation',
              status: 'VALIDATED',
              createdAt: now,
            },
            {
              id: 'AC-INVENTREE-102',
              requirementId: 'REQ-INVENTREE-PART-001',
              version: 1,
              given: [
                'User is authenticated with a valid API token',
                'At least one valid Part Category exists in the system',
              ],
              when: 'User requests part creation via POST /api/part/ or retrieves part detail via GET /api/part/{id}/ (or UI /part/{id}/)',
              then: [
                'POST /api/part/ with valid name and category creates part and returns HTTP 201 Created with assigned part ID',
                'POST /api/part/ missing mandatory fields (name, category) returns HTTP 400 Bad Request with field-level validation errors',
                'GET /api/part/{id}/ returns HTTP 200 OK with complete part metadata (name, IPN, category, active status, stock totals)',
                'GET /api/part/{nonExistentId}/ returns HTTP 404 Not Found',
                'UI page /part/{id}/ renders complete part details, category link, and status indicators',
              ],
              businessRules: [
                'Part name is mandatory, 1 to 100 characters',
                'Category is mandatory and must point to an existing Category ID',
                'Default active status is true upon creation unless explicitly specified as false',
              ],
              isTestable: true,
              testabilityRationale: 'Testable via automated API contract testing and UI Create Part form validation suite',
              status: 'VALIDATED',
              createdAt: now,
            },
            {
              id: 'AC-INVENTREE-103',
              requirementId: 'REQ-INVENTREE-PART-001',
              version: 1,
              given: [
                'An existing Part entity exists in InvenTree',
                'User holds a valid API authentication token with part management permissions',
              ],
              when: 'User performs full update (PUT /api/part/{id}/), partial update (PATCH /api/part/{id}/), or deletion (DELETE /api/part/{id}/)',
              then: [
                'PUT /api/part/{id}/ replaces all part fields, returning HTTP 200 OK with updated entity representation',
                'PATCH /api/part/{id}/ modifies only supplied fields (e.g. toggling active=false or updating description) while preserving unchanged fields, returning HTTP 200 OK',
                'DELETE /api/part/{id}/ on an unlocked part with zero active stock or build references returns HTTP 204 No Content',
                'DELETE /api/part/{id}/ on a part referenced in active Stock Items, Builds, or Purchase Orders returns HTTP 400/409 Conflict preventing referential integrity violation',
                'Locked parts reject PUT and PATCH mutations with HTTP 403 or HTTP 400 until unlocked by administrator',
              ],
              businessRules: [
                'PUT requires all mandatory fields (name, category); omitted required fields trigger HTTP 400',
                'PATCH allows partial payload down to a single attribute update',
                'Referential integrity protects active manufacturing inventory from orphan hard deletion',
              ],
              isTestable: true,
              testabilityRationale: 'Directly verifiable via REST client mutation matrix and UI modal edit/delete interactions',
              status: 'VALIDATED',
              createdAt: now,
            },
            {
              id: 'AC-INVENTREE-104',
              requirementId: 'REQ-INVENTREE-PART-001',
              version: 1,
              given: [
                'Catalog populated with diverse active and inactive parts distributed across multiple categories',
              ],
              when: 'User queries GET /api/part/?category={id}&active={true|false}&search={keyword} or uses UI /part/ search and filter controls',
              then: [
                'Filtering by category={id} returns only parts assigned to the specified category',
                'Filtering by active=true returns only active parts; active=false returns only inactive/obsolete parts',
                'Querying search={keyword} performs case-insensitive substring search matching name, IPN, and description',
                'Combining multiple filters (category + active + search) applies logical AND conjunction',
                'API returns paginated response envelope with count, next, previous, and results array',
                'UI /part/ list dynamically updates table records according to selected search and filter facets',
              ],
              businessRules: [
                'Empty filter query returns all parts subject to default pagination limit (default 25 items)',
                'Search terms are sanitized against SQL/ORM injection',
                'Pagination offset/limit or page parameters must reject negative integers with HTTP 400',
              ],
              isTestable: true,
              testabilityRationale: 'Testable via parametric data-driven API assertions and Playwright search/filter UI assertions',
              status: 'VALIDATED',
              createdAt: now,
            },
            {
              id: 'AC-INVENTREE-105',
              requirementId: 'REQ-INVENTREE-PART-001',
              version: 1,
              given: [
                'InvenTree API endpoints for Part and Part Category write operations (/api/part/* and /api/part/category/*)',
              ],
              when: 'Client dispatches POST, PUT, PATCH, or DELETE requests with missing, invalid, or valid authentication credentials',
              then: [
                'Request without Authorization header is rejected with HTTP 401 Unauthorized and {"detail": "Authentication credentials were not provided."}',
                'Request with malformed or invalid token is rejected with HTTP 401 Unauthorized and {"detail": "Invalid token."}',
                'Request with valid token lacking write permissions is rejected with HTTP 403 Forbidden',
                'Request with valid Authorization: Token <token> header and write permissions succeeds with appropriate 2xx response',
              ],
              businessRules: [
                'Token-based authentication is strictly mandatory for all write operations across /api/part/ and /api/part/category/',
                'Header format must adhere to Authorization: Token <hex_token>',
                'Failed authentication attempts must be logged in security audit trail without logging token secrets',
              ],
              isTestable: true,
              testabilityRationale: 'Verifiable through positive and negative API security test suites using valid, malformed, and omitted tokens',
              status: 'VALIDATED',
              createdAt: now,
            },
            {
              id: 'AC-INVENTREE-106',
              requirementId: 'REQ-INVENTREE-PART-001',
              version: 1,
              given: [
                'Authenticated user operating the InvenTree web frontend',
              ],
              when: 'User navigates between /part/ list page, /part/{id}/ detail page, Part Category tree view, and Create/Edit forms',
              then: [
                'Category tree view renders nested hierarchy with expandable and collapsible folder nodes',
                'Clicking a category node in the tree filters the adjacent /part/ list view to parts in that category',
                'Create Part modal/form provides client-side validation for required fields (name, category) before submission',
                'Part detail page /part/{id}/ renders tabs for details, parameters, BOM, and stock allocations',
                'All interactive UI controls support keyboard navigation (Tab, Enter, Space) and conform to WCAG 2.1 AA accessibility guidelines',
              ],
              businessRules: [
                'Form submission buttons remain disabled or indicate validation errors until required inputs are valid',
                'Category tree view preserves expansion state during in-page navigation',
              ],
              isTestable: true,
              testabilityRationale: 'Fully verifiable using Playwright end-to-end browser automation, axe-core a11y testing, and user journey scripts',
              status: 'VALIDATED',
              createdAt: now,
            },
          ],
        };
      },
    });

    // 1. Requirement Analysis Agent Fixture
    this.registerFixture({
      id: 'default-req-analysis',
      matcher: p =>
        !p.userPrompt.includes('InvenTree') &&
        !p.userPrompt.includes('/api/part/') &&
        (p.systemPrompt.includes('AGT-REQ-001') ||
          p.systemPrompt.includes('AGT-REQUIREMENT-001') ||
          p.userPrompt.includes('Requirement Analysis') ||
          p.userPrompt.includes('As a user') ||
          p.userPrompt.includes('As a customer')),
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
