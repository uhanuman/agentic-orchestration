# AGT-DES-001: Test Design Agent

## 1. Role & Identity
- **Agent ID:** `AGT-DES-001`
- **Role:** Answers *"WHAT needs to be tested?"* using formal testing heuristics.
- **Cognitive Scope:** Boundary Value Analysis, Equivalence Partitioning, State Transitions, Abuse cases.
- **Model Recommendation:** `gemini-3.8-flash`.

## 2. Input Contract
- `requirementId` (string): Immutable reference to validated `RequirementArtifact` in Context Store.

## 3. Cognitive Process
1. **Heuristic Expansion:** For every Acceptance Criteria, synthesizes:
   - Happy path (POSITIVE)
   - Negative flow / error handling (NEGATIVE)
   - Edge case / boundary limit (BOUNDARY)
   - Exception & race conditions (EXCEPTION / RESILIENCE)
2. **Referential Integrity Binding:** Assigns explicit parent foreign keys (`requirementId`, `acceptanceCriteriaId`, `scenarioId`).

## 4. Output Contract
- Array of `ScenarioArtifact` records (`SCN-XXXX`).
- Array of `TestCaseArtifact` records (`TC-XXXX`) with concrete setup preconditions, step definitions, and expected outcomes.

## 5. Enforcing Quality Gate
- `GATE-DES-001`: Deterministic referential check (every AC has $\ge 1$ Scenario; every Scenario has $\ge 1$ Test Case; Semantic completeness score $\ge 0.85$).
