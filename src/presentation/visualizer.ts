/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Presentation & ASCII Pipeline Visualizer (Section 2, 6, 10)
 */

import { PipelineResult } from '../orchestrator/dag-engine';

export class PipelineVisualizer {
  public static renderBanner(): void {
    console.log(`
================================================================================
  ENTERPRISE AGENTIC QUALITY ENGINEERING FRAMEWORK (v3.0)
  Operating Axiom: Capture -> Validate -> Persist -> Reuse -> Execute -> Observe
================================================================================
`);
  }

  public static renderPipelineSummary(result: PipelineResult): void {
    this.renderBanner();

    console.log(`[Trace Correlation ID]: ${result.correlationId}`);
    console.log(`[Execution Status]:     ${result.success ? 'PASSED (SUCCESS)' : 'FAILED'}`);
    if (result.error) {
      console.log(`[Error Reason]:         ${result.error}`);
    }

    console.log('\n--- 1. WORKFLOW PIPELINE STAGES ---');
    for (const evt of result.stageEvents) {
      const icon = evt.status === 'COMPLETED' ? '[DONE]' : evt.status === 'FAILED' ? '[FAIL]' : '[..]';
      const durationStr = `${evt.durationMs}ms`.padStart(8);
      const specTag = evt.specPath ? ` [spec: ${evt.specPath}]` : '';
      const details = evt.details ? ` - ${evt.details}` : '';
      console.log(`  ${icon} ${durationStr}  ${evt.stage}${specTag}${details}`);
    }

    if (result.lifecycleEvents && result.lifecycleEvents.length > 0) {
      console.log('\n--- 2. AGENT 7-STEP LIFECYCLE AUDIT TRAIL ---');
      for (const ev of result.lifecycleEvents) {
        console.log(`  [Agent]: ${ev.agentId} [RunId: ${ev.runId}]`);
        console.log(`    ├── Consumes:    ${ev.inputArtifacts.join(', ') || 'NONE'}`);
        console.log(`    ├── Generates:   ${ev.outputArtifacts.join(', ') || 'NONE'}`);
        console.log(`    ├── Invokes:     ${ev.evaluatorIds.join(', ') || 'NONE'}`);
        console.log(`    ├── Passes Gate: ${ev.gateIds.join(', ') || 'NONE'}`);
        console.log(`    └── Next Agents: ${ev.nextAgents.join(', ') || 'END OF PIPELINE'}`);
      }
    }

    if (result.requirement) {
      console.log('\n--- 3. CORE DOMAIN ARTIFACT TRACEABILITY ---');
      console.log(`  Requirement:    [${result.requirement.id}] ${result.requirement.title}`);
      console.log(`    Domain:       ${result.requirement.domain} (Priority: ${result.requirement.priority})`);
      console.log(`    Acceptance Criteria (${result.acceptanceCriteria.length} criteria):`);
      for (const ac of result.acceptanceCriteria) {
        console.log(`      * [${ac.id}] GIVEN ${ac.given[0]} | WHEN ${ac.when} | THEN ${ac.then[0]}`);
      }
      console.log(`    Scenarios (${result.scenarios.length} scenarios):`);
      for (const scn of result.scenarios) {
        console.log(`      * [${scn.id}] (${scn.classification}, ${scn.targetLayer}) ${scn.title}`);
      }
      console.log(`    Test Cases (${result.testCases.length} total across Functional & NFR):`);
      for (const tc of result.testCases) {
        console.log(`      * [${tc.id}] [${tc.type}] (${tc.priority}) ${tc.title}`);
      }
      console.log(`    Automation Blueprints (${result.automationBlueprints.length} contracts):`);
      for (const aut of result.automationBlueprints) {
        console.log(`      * [${aut.id} -> ${aut.testCaseId}] Harness: ${aut.recommendedHarness} | Target: ${aut.targetComponent} | Feasible: ${aut.automationFeasible}`);
      }
    }

    console.log('\n--- 4. DUAL-EVAL QUALITY GATES ---');
    for (const gate of result.gateResults) {
      const statusTag = gate.status === 'PASSED' 
        ? '[PASSED]' 
        : gate.status === 'WAIVED_WITH_APPROVAL' 
        ? '[WAIVED]' 
        : '[FAILED]';
      console.log(`  ${statusTag} [${gate.severity}] ${gate.gateId}: ${gate.name} (Score: ${(gate.score * 100).toFixed(1)}% / Min: ${(gate.minScoreThreshold * 100).toFixed(1)}%)`);
      for (const evalRes of gate.evaluatorResults) {
        const evalTag = evalRes.passed ? '  ✓' : '  ✗';
        console.log(`    ${evalTag} [${evalRes.type}] ${evalRes.evaluatorId}: ${evalRes.rationale}`);
      }
      if (gate.waiver) {
        console.log(`    ⚠️  WAIVER APPLIED by: ${gate.waiver.humanApprover} ("${gate.waiver.waiverJustification}")`);
      }
    }

    if (result.validationReport) {
      console.log('\n--- 5. TEST VALIDATION & DRIFT AUDIT ---');
      console.log(`  Verdict:              ${result.validationReport.verdict}`);
      console.log(`  Hallucination Index:  ${(result.validationReport.hallucinationIndex * 100).toFixed(1)}%`);
      console.log(`  Grounding Confidence: ${(result.validationReport.groundingConfidence * 100).toFixed(1)}%`);
      console.log(`  Contradictions Found: ${result.validationReport.hasContradictions ? 'YES' : 'NONE'}`);
      console.log(`  Rationale:            ${result.validationReport.rationale}`);
    }

    console.log('\n--- 6. OBSERVABILITY & TOKEN TELEMETRY ---');
    const tel = result.telemetry;
    console.log(`  Total Duration:       ${tel.totalDurationMs} ms`);
    console.log(`  Agent Executions:     ${tel.agentExecutions}`);
    console.log(`  Total Prompt Tokens:  ${tel.totalPromptTokens.toLocaleString()}`);
    console.log(`  Total Output Tokens:  ${tel.totalCompletionTokens.toLocaleString()}`);
    console.log(`  Total Token Count:    ${tel.totalTokens.toLocaleString()}`);
    console.log(`  Estimated Total Cost: \$${tel.totalCostUsd.toFixed(6)} USD`);
    console.log(`  Quality Gates:        ${tel.gatesPassed} Passed, ${tel.gatesWaived} Waived, ${tel.gatesFailed} Failed`);
    console.log('================================================================================\n');
  }
}
