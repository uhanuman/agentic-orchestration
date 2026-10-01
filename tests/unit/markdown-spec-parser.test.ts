import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownSpecParser } from '../../src/runtime/markdown-spec-parser';

describe('Markdown Specification Verification (01.agentname.agent.md convention)', () => {
  const agents = [
    'agents/01.requirement-analysis.agent.md',
    'agents/02.test-design.agent.md',
    'agents/03.security-nfr.agent.md',
    'agents/04.performance-nfr.agent.md',
    'agents/05.accessibility-nfr.agent.md',
    'agents/06.sdet-blueprint.agent.md',
    'agents/07.test-validation.agent.md',
  ];

  const evals = [
    'evals/01.schema-validator.eval.md',
    'evals/02.referential-validator.eval.md',
    'evals/03.coverage-calculator.eval.md',
    'evals/04.ambiguity-evaluator.eval.md',
    'evals/05.completeness-evaluator.eval.md',
    'evals/06.drift-evaluator.eval.md',
    'evals/07.gates-policy.eval.md',
  ];

  it('all required Agent Markdown files exist and parse with frontmatter arrays', () => {
    for (const agentPath of agents) {
      const fullPath = path.resolve(process.cwd(), agentPath);
      expect(fs.existsSync(fullPath), `Agent file ${agentPath} must exist`).toBe(true);

      const spec = MarkdownSpecParser.parseFile(agentPath);
      expect(spec.metadata.id, `${agentPath} must declare id in frontmatter`).toBeDefined();
      expect(spec.title, `${agentPath} must have a title`).toBeDefined();
      expect(spec.systemPrompt.length, `${agentPath} must have a non-empty system prompt`).toBeGreaterThan(20);
      expect(spec.getList('gateIds'), `${agentPath} must declare gateIds`).toBeDefined();
    }
  });

  it('parses Test Design Agent frontmatter matching user specifications', () => {
    const spec = MarkdownSpecParser.parseFile('agents/02.test-design.agent.md');
    expect(spec.metadata.id).toBe('AGT-TEST-DESIGN-001');
    expect(spec.getList('inputArtifacts')).toContain('REQ-001');
    expect(spec.getList('outputArtifacts')).toContain('SCN-001');
    expect(spec.getList('outputArtifacts')).toContain('TC-001');
    expect(spec.getList('evaluatorIds')).toContain('EVAL-TEST-COVERAGE-001');
    expect(spec.getList('gateIds')).toContain('GATE-TEST-DESIGN-001');
    expect(spec.getList('nextAgents')).toContain('AGT-SECURITY-001');
    expect(spec.getList('nextAgents')).toContain('AGT-SDET-001');
  });

  it('resolves specs seamlessly by ID, alias, or file path', () => {
    const byId = MarkdownSpecParser.parseFile('AGT-TEST-DESIGN-001');
    expect(byId.metadata.id).toBe('AGT-TEST-DESIGN-001');

    const byAlias = MarkdownSpecParser.parseFile('EVAL-TEST-COVERAGE-001');
    expect(byAlias.metadata.id).toBe('EVAL-COVERAGE-001');

    const byTraceability = MarkdownSpecParser.parseFile('EVAL-TRACEABILITY-001');
    expect(byTraceability.metadata.id).toBe('EVAL-REFERENTIAL-001');
  });

  it('all required Eval Markdown files exist and parse with valid evaluation metadata', () => {
    for (const evalPath of evals) {
      const fullPath = path.resolve(process.cwd(), evalPath);
      expect(fs.existsSync(fullPath), `Eval file ${evalPath} must exist`).toBe(true);

      const spec = MarkdownSpecParser.parseFile(evalPath);
      expect(spec.metadata.id, `${evalPath} must declare id in frontmatter`).toBeDefined();
    }
  });
});
