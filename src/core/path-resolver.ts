import * as fs from 'fs';
import * as path from 'path';

export interface WorkspaceConfig {
  workspaceName: string;
  version: string;
  repositories: {
    repo1: {
      name: string;
      role: string;
      rootDir: string;
      paths: {
        agentsDir: string;
        evalsDir: string;
        artifactsRoot: string;
        artifacts: Record<string, string>;
      };
    };
    repo2: {
      name: string;
      role: string;
      rootDir: string;
      paths: {
        testsDir: string;
        playwrightConfig: string;
        reportsDir: string;
        resultsDir: string;
      };
    };
  };
  variablePlaceholders: Record<string, string>;
}

export class PathResolver {
  private static cachedConfig: WorkspaceConfig | null = null;

  /**
   * Loads the centralized workspace configuration from workspace.config.json.
   * Single source of truth for all repository and artifact paths.
   */
  public static getConfig(): WorkspaceConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const possiblePaths = [
      path.resolve(process.cwd(), 'workspace.config.json'),
      path.resolve(__dirname, '../../workspace.config.json'),
      path.resolve(__dirname, '../workspace.config.json')
    ];

    let configFilePath = possiblePaths.find(p => fs.existsSync(p));

    if (configFilePath) {
      const raw = fs.readFileSync(configFilePath, 'utf8');
      this.cachedConfig = JSON.parse(raw);
    } else {
      // Fallback default mapping
      this.cachedConfig = {
        workspaceName: 'Agentic Quality Engineering & Automation Workspace',
        version: '1.0.0',
        repositories: {
          repo1: {
            name: 'agentic-orchestration',
            role: 'Agentic Workflow, Evals, Prompts & Quality Artifacts',
            rootDir: '.',
            paths: {
              agentsDir: './agents',
              evalsDir: './evals',
              artifactsRoot: './generated-artifacts',
              artifacts: {
                requirements: './generated-artifacts/features/{FEATURE_SLUG}/req',
                testCases: './generated-artifacts/features/{FEATURE_SLUG}/test-cases',
                coverageDocs: './generated-artifacts/coverage-docs',
                traceability: './generated-artifacts/traceability',
                nfrs: './generated-artifacts/features/{FEATURE_SLUG}/nfrs'
              }
            }
          },
          repo2: {
            name: 'agentic-test-automation',
            role: 'Test Automation Framework & Executable Scripts',
            rootDir: '../agentic-test-automation',
            paths: {
              testsDir: '../agentic-test-automation/tests',
              playwrightConfig: '../agentic-test-automation/playwright.config.ts',
              reportsDir: '../agentic-test-automation/playwright-report',
              resultsDir: '../agentic-test-automation/test-results'
            }
          }
        },
        variablePlaceholders: {
          '{REPO1_ROOT}': '.',
          '{ARTIFACTS_ROOT}': './generated-artifacts',
          '{FEATURES_ROOT}': './generated-artifacts/features',
          '{FEATURE_DIR}': './generated-artifacts/features/{FEATURE_SLUG}',
          '{REQ_ARTIFACTS_DIR}': './generated-artifacts/features/{FEATURE_SLUG}/req',
          '{TC_ARTIFACTS_DIR}': './generated-artifacts/features/{FEATURE_SLUG}/test-cases',
          '{NFRS_DIR}': './generated-artifacts/features/{FEATURE_SLUG}/nfrs',
          '{BLUEPRINTS_DIR}': './generated-artifacts/features/{FEATURE_SLUG}/blueprints',
          '{VALIDATION_DIR}': './generated-artifacts/features/{FEATURE_SLUG}/validation',
          '{COVERAGE_DOCS_DIR}': './generated-artifacts/coverage-docs',
          '{TRACEABILITY_DIR}': './generated-artifacts/traceability',
          '{REPO2_ROOT}': '../agentic-test-automation',
          '{AUTOMATION_TESTS_DIR}': '../agentic-test-automation/tests'
        }
      };
    }

    return this.cachedConfig!;
  }

  /**
   * Replaces all {VARIABLE} placeholders in a given string with concrete paths
   * defined in the central workspace configuration. Optionally substitutes {FEATURE_SLUG}.
   */
  public static interpolateVariables(content: string, featureSlug?: string): string {
    const config = this.getConfig();
    let result = content;

    for (const [placeholder, resolvedPath] of Object.entries(config.variablePlaceholders)) {
      result = result.split(placeholder).join(resolvedPath);
      // Also match without curly braces if formatted as %VARIABLE% or similar
      const rawName = placeholder.replace(/^\{|\}$/g, '');
      const pattern = new RegExp(`\\{${rawName}\\}`, 'g');
      result = result.replace(pattern, resolvedPath);
    }

    if (featureSlug) {
      result = result.split('{FEATURE_SLUG}').join(featureSlug);
    }

    return result;
  }

  /**
   * Resolves a single path variable (e.g. '{AUTOMATION_TESTS_DIR}' or 'AUTOMATION_TESTS_DIR')
   */
  public static resolveVariable(varName: string, featureSlug?: string): string {
    const formatted = varName.startsWith('{') && varName.endsWith('}') ? varName : `{${varName}}`;
    const config = this.getConfig();
    let val = config.variablePlaceholders[formatted] || formatted;
    if (featureSlug) {
      val = val.split('{FEATURE_SLUG}').join(featureSlug);
    }
    return val;
  }

  /**
   * Clears cache (useful for testing or config reloads)
   */
  public static clearCache(): void {
    this.cachedConfig = null;
  }
}
