import { describe, it, expect, beforeEach } from 'vitest';
import { PathResolver } from '../../src/core/path-resolver';
import { MarkdownSpecParser } from '../../src/runtime/markdown-spec-parser';

describe('PathResolver & Variable Placeholders (Feature-Centric)', () => {
  beforeEach(() => {
    PathResolver.clearCache();
    MarkdownSpecParser.clearCache();
  });

  it('loads workspace configuration and returns defined variables', () => {
    const config = PathResolver.getConfig();
    expect(config.workspaceName).toBeDefined();
    expect(config.variablePlaceholders['{ARTIFACTS_ROOT}']).toBe('./generated-artifacts');
    expect(config.variablePlaceholders['{FEATURES_ROOT}']).toBe('./generated-artifacts/features');
    expect(config.variablePlaceholders['{AUTOMATION_TESTS_DIR}']).toBe('../agentic-test-automation/tests');
  });

  it('interpolates {variable} placeholders in text strings', () => {
    const template = 'Write specs to {AUTOMATION_TESTS_DIR} and artifacts to {REQ_ARTIFACTS_DIR}';
    const resolved = PathResolver.interpolateVariables(template);
    expect(resolved).toBe('Write specs to ../agentic-test-automation/tests and artifacts to ./generated-artifacts/features/{FEATURE_SLUG}/req');
  });

  it('supports feature-slug specific variable interpolation', () => {
    const template = 'Write specs to {AUTOMATION_TESTS_DIR} and artifacts to {REQ_ARTIFACTS_DIR}';
    const resolved = PathResolver.interpolateVariables(template, 'inventree-part-management');
    expect(resolved).toBe('Write specs to ../agentic-test-automation/tests and artifacts to ./generated-artifacts/features/inventree-part-management/req');
  });

  it('resolves individual variable names correctly', () => {
    expect(PathResolver.resolveVariable('{TC_ARTIFACTS_DIR}')).toBe('./generated-artifacts/features/{FEATURE_SLUG}/test-cases');
    expect(PathResolver.resolveVariable('{TC_ARTIFACTS_DIR}', 'inventree-part-management')).toBe('./generated-artifacts/features/inventree-part-management/test-cases');
    expect(PathResolver.resolveVariable('AUTOMATION_TESTS_DIR')).toBe('../agentic-test-automation/tests');
  });

  it('automatically resolves variables when parsing Agent markdown specifications', () => {
    const sdetAgent = MarkdownSpecParser.parseFile('06.sdet-blueprint.agent');
    expect(sdetAgent.getList('inputPaths')).toContain('./generated-artifacts/features/{FEATURE_SLUG}/test-cases');
    expect(sdetAgent.getList('outputPaths')).toContain('../agentic-test-automation/tests');
  });

  it('automatically resolves variables in Agent 01 frontmatter', () => {
    const reqAgent = MarkdownSpecParser.parseFile('01.requirement-analysis.agent');
    expect(reqAgent.getList('inputPaths')).toContain('./generated-artifacts');
    expect(reqAgent.getList('outputPaths')).toContain('./generated-artifacts/features/{FEATURE_SLUG}/req');
  });
});
