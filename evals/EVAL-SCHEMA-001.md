---
id: EVAL-SCHEMA-001
name: Deterministic JSON Schema Validator
type: DETERMINISTIC
cost: 0 tokens
severity: CRITICAL
---

# EVAL-SCHEMA-001: Deterministic JSON Schema Validator

## 1. Objective
Validate that every generated or ingested artifact strictly conforms to its typed domain contract before it is persisted in the Shared Context Store or evaluated by any downstream agent.

## 2. Evaluation Logic
1. Look up the target artifact type in `SchemaRegistry`.
2. Execute deterministic schema validation (`safeParse`).
3. If parsing succeeds:
   - `passed = true`, `score = 1.0`.
4. If parsing fails:
   - `passed = false`, `score = 0.0`.
   - Extract diagnostic field path errors and reject immediately.

## 3. Fast-Fail Rule
Zero tokens are spent on downstream semantic evaluators if `EVAL-SCHEMA-001` fails.
