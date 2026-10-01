# EVAL-COMPLETENESS-SEMANTIC: Semantic Test Completeness Judge

## 1. Specification Overview
- **Evaluator ID:** `EVAL-COMPLETENESS-SEMANTIC`
- **Type:** `SEMANTIC` (LLM-as-a-Judge)
- **Model Recommendation:** `gemini-3.8-flash` or `gemini-3.1-pro-preview`
- **Execution Target:** Generated `ScenarioArtifact` and `TestCaseArtifact` sets
- **Enforcement Level:** MAJOR (Enforced at `GATE-DES-001`)

## 2. Objective
Validate that the generated test cases thoroughly exercise positive flows, negative flows, boundary values (BVA), equivalence partitions, concurrency race conditions, and error recovery states.

## 3. Evaluation Heuristics
1. **Positive Paths:** Are happy path user stories fully verified?
2. **Negative & Abuse Cases:** Are unauthorized actions, invalid data, and expired sessions tested?
3. **Boundary Value Analysis:** Are minimum, maximum, off-by-one, and empty states tested?
4. **Resilience & Concurrency:** Are race conditions or duplicate submissions handled?

## 4. Scoring Threshold
- Minimum score threshold: $\ge 0.85$
- Scores $< 0.85$ require automated retry with targeted feedback or human escalation.
