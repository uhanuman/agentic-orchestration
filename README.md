# Enterprise Greenfield Agentic Quality Engineering (Agentic QE) Framework

> **Operating Axiom:**  
> **Capture → Validate → Persist → Reuse → Execute → Observe → Evaluate → Improve**  
> *(Anti-pattern strictly prohibited: Generate → Rediscover → Infer → Recalculate → Repeat)*

An enterprise-grade, clean architecture TypeScript framework for autonomous, verifiable quality engineering. Built to decouple deterministic logic (schema enforcement, referential integrity, mathematical coverage, gate checks) from probabilistic agentic reasoning (ambiguity detection, edge-case generation, security threat modeling, and drift analysis).

---

## 1. System Architecture

The framework is structured as a **Hexagonal / Clean Architecture** across 6 decoupled layers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        6. Presentation & CLI                           │
│     (CLI Runner, Workflow Trigger, Pipeline Visualizer, Audits)        │
├────────────────────────────────────────────────────────────────────────┤
│                       5. Orchestration Engine                          │
│     (DAG Engine, State Machine, Dependency Resolver, Human-in-the-Loop)│
├────────────────────────────────────────────────────────────────────────┤
│                      4. Specialized Agent Layer                        │
│ (Requirement Agent, Test Design Agent, NFR Agents, SDET, Validator)    │
├────────────────────────────────────────────────────────────────────────┤
│                    3. EVAL & Quality Gatekeeper                        │
│   (Deterministic Gate Rules, Semantic LLM Judges, Waiver Policies)     │
├────────────────────────────────────────────────────────────────────────┤
│                  2. AI Provider Abstraction Gateway                    │
│   (Unified LLM Adapter: Google Gemini @google/genai, Mock Engine)      │
├────────────────────────────────────────────────────────────────────────┤
│                  1. Core Domain & Shared Context Store                 │
│ (Traceability Graph, Structured Artifact Repositories, Telemetry Bus)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Complete End-to-End Traceability Model

Every entity in the Quality Engineering lifecycle is a first-class, immutable, versioned artifact stored in the **Shared Context Store**. Downstream artifacts explicitly maintain referential integrity with upstream parents:

```text
[Requirement (REQ)]
       │
       ▼
[Acceptance Criteria (AC)]
       │
       ▼
[Test Scenario (SCN)]
       │
       ▼
[Test Case (TC)]
       │
       ▼
[Automation Contract (AUT)]
       │
       ▼
[Test Execution Result (TEX)]
       │
       ▼
[Execution Trend & Quality Signal (TRS)]
       │
       ▼
[Release Quality Gate Record (REL)]
```

### Artifact Schema Classification
- `REQ` - Requirement Artifact (`id`, `epicId`, `featureName`, `title`, `rawText`, `domain`, `priority`, `risksIdentified`, `ambiguities`, `dependencies`, `status`, `timestamps`)
- `AC` - Acceptance Criteria Artifact (`id`, `requirementId`, `given`, `when`, `then`, `businessRules`, `isTestable`, `status`, `createdAt`)
- `SCN` - Test Scenario Artifact (`id`, `requirementId`, `acceptanceCriteriaId`, `title`, `classification`, `targetLayer`, `riskLevel`, `scenarioDescription`, `isRegressionCandidate`, `status`)
- `TC` - Test Case Artifact (`id`, `scenarioId`, `requirementId`, `acceptanceCriteriaId`, `title`, `type`, `priority`, `preconditions`, `testDataRequirements`, `steps`, `postConditions`, `status`)
- `AUT` - Automation Blueprint Artifact (`id`, `testCaseId`, `automationFeasible`, `cannotAutomateReason`, `recommendedHarness`, `targetComponent`, `codeBlueprint`, `assertions`, `executionTimeoutMs`, `status`)
- `TEX` - Test Execution Record (`id`, `testCaseId`, `automationId`, `environment`, `buildNumber`, `releaseId`, `status`, `durationMs`, `failureClassification`, `executedAt`)
- `TRS` - Quality Signal Record (`id`, `buildNumber`, `environment`, `totalExecuted`, `passPercentage`, `flakyTestCount`, `topFailureCategories`, `aiSummary`, `recommendedActions`)
- `REL` - Release Gate Record (`id`, `releaseId`, `version`, `gateStatus`, `blockingReason`, `humanApprover`, `waiverJustification`, `evaluatedAt`)
- `LOG` - Agent Execution Telemetry Log (`runId`, `correlationId`, `agentId`, `aiProvider`, `modelName`, `tokenUsage`, `durationMs`, `evalResults`, `gateResult`, `finalStatus`)

---

## 3. Specialized Agent Workforce

All executable agent specifications and prompts are documented in `agents/`:

| Agent ID | Name | Role & Responsibility | Markdown Spec |
| :--- | :--- | :--- | :--- |
| `AGT-REQ-001` | Requirement Analysis Agent | Interrogates raw user stories, extracts Given-When-Then ACs, scores ambiguity, flags risks | [`agents/01.requirement-analysis.agent.md`](agents/01.requirement-analysis.agent.md) |
| `AGT-DES-001` | Test Design Agent | Answers *"WHAT needs to be tested?"* using Test Pyramid, BVA, equivalence partitions, negative & abuse paths | [`agents/02.test-design.agent.md`](agents/02.test-design.agent.md) |
| `AGT-SEC-001` | Security NFR Agent | Maps OWASP Top 10, AuthN/AuthZ bypass, BOLA/IDOR, and data leakage abuse cases | [`agents/03.security-nfr.agent.md`](agents/03.security-nfr.agent.md) |
| `AGT-PERF-001` | Performance NFR Agent | Derives concurrency, throughput, and p95/p99 latency ceilings from SLAs | [`agents/04.performance-nfr.agent.md`](agents/04.performance-nfr.agent.md) |
| `AGT-A11Y-001` | Accessibility NFR Agent | Maps UI flows to WCAG 2.1 Level AA/AAA criteria (focus, screen readers, contrast) | [`agents/05.accessibility-nfr.agent.md`](agents/05.accessibility-nfr.agent.md) |
| `AGT-SDET-001` | SDET Blueprint Agent | Answers *"HOW can approved tests be automated?"*, produces tool-agnostic code blueprints | [`agents/06.sdet-blueprint.agent.md`](agents/06.sdet-blueprint.agent.md) |
| `AGT-VAL-001` | Validation & Drift Agent | Detects hallucinations, ungrounded assertions, and specification drift | [`agents/07.test-validation.agent.md`](agents/07.test-validation.agent.md) |

---

## 4. Dual-EVAL & Quality Gate Engine

All evaluator specifications and policies are documented in `evals/`:

| Evaluator ID | Type | Target / Objective | Markdown Spec |
| :--- | :--- | :--- | :--- |
| `EVAL-SCHEMA-001` | `DETERMINISTIC` | Validates JSON schema adherence with 0 LLM cost | [`evals/01.schema-validator.eval.md`](evals/01.schema-validator.eval.md) |
| `EVAL-REFERENTIAL-001` | `DETERMINISTIC` | Enforces foreign keys and bidirectional lineage in Context Store | [`evals/02.referential-validator.eval.md`](evals/02.referential-validator.eval.md) |
| `EVAL-COVERAGE-001` | `DETERMINISTIC` | Computes AC-to-Scenario, Scenario-to-TC, and P0/P1 Automation ratios | [`evals/03.coverage-calculator.eval.md`](evals/03.coverage-calculator.eval.md) |
| `EVAL-AMBIGUITY-SEMANTIC` | `SEMANTIC` | LLM-as-a-judge for requirement ambiguity (Tolerance: $\le 0.15$) | [`evals/04.ambiguity-evaluator.eval.md`](evals/04.ambiguity-evaluator.eval.md) |
| `EVAL-COMPLETENESS-SEMANTIC` | `SEMANTIC` | LLM-as-a-judge for edge-case & scenario completeness ($\ge 0.85$) | [`evals/05.completeness-evaluator.eval.md`](evals/05.completeness-evaluator.eval.md) |
| `EVAL-DRIFT-SEMANTIC` | `SEMANTIC` | LLM-as-a-judge for hallucination & drift index ($\le 0.10$) | [`evals/06.drift-evaluator.eval.md`](evals/06.drift-evaluator.eval.md) |
| `GATES-POLICY` | `POLICY` | Hierarchy rules: Critical (Zero Bypass), Major (Waiver Allowed), Minor | [`evals/07.gates-policy.eval.md`](evals/07.gates-policy.eval.md) |

### Quality Gate Hierarchy
1. **Critical Gate (Blocker - No Bypass):** Zero broken schema rules, 100% referential integrity, zero Sev-1 security gaps.
2. **Major Gate (Blocker - Bypassable with Human Waiver):** Coverage thresholds (100% AC coverage, P0/P1 automation). Can proceed only if an authorized human approver supplies a signed waiver record.
3. **Minor Gate (Advisory):** Style and non-blocking quality notices.

---

## 5. Quick Start & Execution

### Prerequisites
- Node.js >= 20 (Tested on Node.js v24.13.0)
- npm >= 10

### Installation
```bash
npm install
```

### Run Full Test Suite (Unit & E2E Integration)
```bash
npm test
```
*Executes all 29 tests across 8 test suites completely offline with zero API key dependencies using `MockLLMProvider`.*

### Run End-to-End Orchestrator CLI
```bash
# Offline deterministic mode
npm start
# or
npx tsx run-orchestrator.ts

# Live Google Gemini mode (requires GEMINI_API_KEY environment variable)
npx tsx run-orchestrator.ts --provider=gemini
```

### Type Checking & Build
```bash
# Type check with zero emit
npx tsc --noEmit

# Compile to dist
npm run build
```

---

## 6. Token, Cost & Performance Optimizations

1. **Reference by ID, Not Inlined Blobs:** Agents pass immutable IDs (`REQ-1001`, `AC-2001`) instead of multi-megabyte payloads. The Context Store resolves targeted slices on demand.
2. **Deterministic Fast-Fail:** Schema and referential checks execute *before* semantic LLM calls. If a required field is missing, the gate halts at 0 LLM token cost.
3. **Semantic Caching:** Stable content hashes ensure repeated requirements reuse previously validated scenarios without regenerating.
4. **Targeted Model Tiering:** Fast/cost-effective models (`gemini-3.8-flash`) for schema parsing and test generation; high-reasoning models (`gemini-3.1-pro-preview`) for complex ambiguity or threat modeling.
