---
id: EVAL-REFERENTIAL-001
name: Deterministic Referential Integrity Validator
type: DETERMINISTIC
cost: 0 tokens
severity: CRITICAL
---

# EVAL-REFERENTIAL-001: Deterministic Referential Integrity Validator

## 1. Objective
Enforce strict referential integrity across the entire downstream artifact tree. Prevent orphan entities or disconnected test artifacts.

## 2. Referential Rules
- Every `AcceptanceCriteriaArtifact` must reference a valid `requirementId` in the Context Store.
- Every `ScenarioArtifact` must reference valid `requirementId` and `acceptanceCriteriaId`.
- Every `TestCaseArtifact` must reference valid `scenarioId`, `requirementId`, and `acceptanceCriteriaId`.
- Every `AutomationBlueprintArtifact` must reference valid `testCaseId`.
- Every `TestExecutionRecord` must reference valid `testCaseId`.

## 3. Evaluation Logic
- Query `IContextStore.validateReferentialIntegrity(artifactType, target)`.
- If missing upstream IDs > 0, return `passed = false`, `score = 0.0` and list all missing parent IDs.
- Otherwise, return `passed = true`, `score = 1.0`.
