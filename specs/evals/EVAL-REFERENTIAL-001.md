# EVAL-REFERENTIAL-001: Deterministic Referential Integrity Validator

## 1. Specification Overview
- **Evaluator ID:** `EVAL-REFERENTIAL-001`
- **Type:** `DETERMINISTIC`
- **Cost:** 0 LLM Tokens ($0.00 USD)
- **Execution Target:** Downstream Artifacts (`AC`, `SCN`, `TC`, `AUT`, `TEX`)
- **Enforcement Level:** CRITICAL (Non-Bypassable Blocker)

## 2. Objective
Ensure that every foreign key in downstream artifacts points to an active, valid upstream parent artifact in the Shared Context Store. Prevents orphan test cases and broken traceability links.

## 3. Referential Rules
| Artifact Type | Required Upstream Parent IDs in Store |
| :--- | :--- |
| `AC` (Acceptance Criteria) | `requirementId` -> must exist in `REQ` store |
| `SCN` (Test Scenario) | `requirementId` -> in `REQ` store, `acceptanceCriteriaId` -> in `AC` store |
| `TC` (Test Case) | `requirementId`, `acceptanceCriteriaId`, `scenarioId` -> must all exist |
| `AUT` (Automation Blueprint) | `testCaseId` -> must exist in `TC` store |
| `TEX` (Execution Record) | `testCaseId` -> in `TC` store; optional `automationId` -> in `AUT` store |

## 4. Evaluation Algorithm
1. Query `IContextStore.validateReferentialIntegrity(artifactType, target)`.
2. Inspect `missingIds` list.
3. If `missingIds.length === 0`:
   - Return `{ passed: true, score: 1.0, rationale: "All foreign keys verified" }`.
4. If missing IDs exist:
   - Halt pipeline immediately.
   - Return `{ passed: false, score: 0.0, rationale: "Missing upstream parent IDs", metadata: { missingIds } }`.
