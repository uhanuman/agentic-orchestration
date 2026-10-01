import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MarkdownSpecParser } from '../../src/runtime/markdown-spec-parser';

describe('Markdown Specification Verification', () => {
  const agents = [
    'agents/AGT-REQ-001.md',
    'agents/AGT-DES-001.md',
    'agents/AGT-SEC-001.md',
    'agents/AGT-PERF-001.md',
    'agents/AGT-A11Y-001.md',
    'agents/AGT-SDET-001.md',
    'agents/AGT-VAL-001.md',
  ];

  const evals = [
    'evals/EVAL-SCHEMA-001.md',
    'evals/EVAL-REFERENTIAL-001.md',
    'evals/EVAL-COVERAGE-001.md',
    'evals/EVAL-AMBIGUITY-SEMANTIC.md',
    'evals/EVAL-COMPLETENESS-SEMANTIC.md',
    'evals/EVAL-DRIFT-SEMANTIC.md',
    'evals/GATES-POLICY.md',
  ];

  it('all required Agent Markdown files exist and parse with frontmatter', () => {
    for (const agentPath of agents) {
      const fullPath = path.resolve(process.cwd(), agentPath);
      expect(fs.existsSync(fullPath), `Agent file ${agentPath} must exist`).toBe(true);

      const spec = MarkdownSpecParser.parseFile(agentPath);
      expect(spec.metadata.id, `${agentPath} must declare id in frontmatter`).toBeDefined();
      expect(spec.title, `${agentPath} must have a title`).toBeDefined();
      expect(spec.systemPrompt.length, `${agentPath} must have a non-empty system prompt`).toBeGreaterThan(20);
    }
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
