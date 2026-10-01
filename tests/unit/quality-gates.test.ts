import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryContextStore } from '../../src/core/context-store';
import { MockLLMProvider } from '../../src/gateway/mock-provider';
import { MarkdownEvalRunner } from '../../src/runtime/markdown-eval-runner';
import { QualityGateRunner } from '../../src/runtime/quality-gate-runner';

describe('QualityGateRunner with Markdown Gate Policies', () => {
  let store: InMemoryContextStore;
  let mockLLM: MockLLMProvider;

  beforeEach(() => {
    store = new InMemoryContextStore();
    mockLLM = new MockLLMProvider();
  });

  it('Critical Gate halts pipeline immediately on schema violation without waiver bypass', async () => {
    const gate = new QualityGateRunner(
      'GATE-CRITICAL-TEST',
      'Critical Integrity Gate',
      'CRITICAL',
      1.0,
      [new MarkdownEvalRunner('evals/EVAL-SCHEMA-001.md', mockLLM)]
    );

    const malformed = { id: 'BAD_ID_PATTERN' };
    const failReport = await gate.evaluate(malformed, store);

    expect(failReport.status).toBe('FAILED');
    expect(failReport.failingEvaluators).toContain('EVAL-SCHEMA-001');

    // Attempt waiver on critical gate
    const failWithWaiver = await gate.evaluate(malformed, store, {
      humanApprover: 'Jane VP',
      waiverJustification: 'Emergency deploy',
      approvedAt: new Date().toISOString(),
    });
    // Critical gates cannot be waived
    expect(failWithWaiver.status).toBe('FAILED');
  });

  it('Major Gate allows bypass when signed human waiver is provided', async () => {
    const gate = new QualityGateRunner(
      'GATE-MAJOR-TEST',
      'Major Coverage Gate',
      'MAJOR',
      1.0,
      [new MarkdownEvalRunner('evals/EVAL-COVERAGE-001.md', mockLLM)]
    );

    const emptyReq = { id: 'REQ-1001', coverageMode: 'AC_TO_SCN' };

    // 1. Without waiver -> FAILED
    const failReport = await gate.evaluate(emptyReq, store);
    expect(failReport.status).toBe('FAILED');

    // 2. With signed waiver -> WAIVED_WITH_APPROVAL
    const waivedReport = await gate.evaluate(emptyReq, store, {
      humanApprover: 'Principal Architect Bob',
      waiverJustification: 'Accepted partial coverage for phase 1',
      approvedAt: new Date().toISOString(),
    });

    expect(waivedReport.status).toBe('WAIVED_WITH_APPROVAL');
    expect(waivedReport.waiver?.humanApprover).toBe('Principal Architect Bob');
  });
});
