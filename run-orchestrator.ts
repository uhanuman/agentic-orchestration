#!/usr/bin/env ts-node
/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * End-to-End Orchestrator CLI Execution Entry Point
 *
 * Usage:
 *   npx ts-node run-orchestrator.ts
 *   npx ts-node run-orchestrator.ts --provider=gemini
 *   npm start
 */

import { CLIRunner, CLIOptions } from './src/presentation/cli';

async function main() {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--provider=')) {
      options.provider = arg.split('=')[1] as any;
    } else if (arg.startsWith('--story=')) {
      options.story = arg.split('=')[1];
    } else if (arg.startsWith('--epic=')) {
      options.epicId = arg.split('=')[1];
    } else if (arg.startsWith('--feature=')) {
      options.featureName = arg.split('=')[1];
    } else if (arg.startsWith('--slug=')) {
      options.featureSlug = arg.split('=')[1];
    } else if (arg.startsWith('--domain=')) {
      options.domain = arg.split('=')[1];
    } else if (arg.startsWith('--release=')) {
      options.releaseVersion = arg.split('=')[1];
    }
  }

  try {
    const result = await CLIRunner.run(options);
    if (!result.success) {
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('Fatal execution error:', err.message || err);
    process.exitCode = 1;
  }
}

main();
