# EVAL-SCHEMA-001: Deterministic JSON Schema Validator

## 1. Specification Overview
- **Evaluator ID:** `EVAL-SCHEMA-001`
- **Type:** `DETERMINISTIC`
- **Cost:** 0 LLM Tokens ($0.00 USD)
- **Execution Target:** All Core Domain Artifacts (`REQ`, `AC`, `SCN`, `TC`, `AUT`, `TEX`, `TRS`, `REL`, `LOG`)
- **Enforcement Level:** CRITICAL (Non-Bypassable Blocker)

## 2. Objective
Validate that every generated or ingested artifact strictly conforms to its typed domain contract before it is persisted in the Shared Context Store or evaluated by any downstream agent.

## 3. Evaluation Algorithm
1. Retrieve registered Zod schema from `SchemaRegistry[artifactType]`.
2. Execute `schema.safeParse(target)`.
3. If validation succeeds:
   - Return `{ passed: true, score: 1.0, rationale: "Strictly adheres to schema" }`.
4. If validation fails:
   - Extract all schema issues (field path, error code, expected type vs received).
   - Format human-readable diagnostics.
   - Return `{ passed: false, score: 0.0, rationale: <diagnostic message>, metadata: { issues } }`.

## 4. Deterministic Fast-Fail Rule
If an artifact fails `EVAL-SCHEMA-001`, execution halts immediately. No semantic LLM evaluators are called, ensuring zero token waste.
