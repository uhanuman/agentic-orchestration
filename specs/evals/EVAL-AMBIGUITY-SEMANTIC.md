# EVAL-AMBIGUITY-SEMANTIC: Semantic Ambiguity Evaluator

## 1. Specification Overview
- **Evaluator ID:** `EVAL-AMBIGUITY-SEMANTIC`
- **Type:** `SEMANTIC` (LLM-as-a-Judge)
- **Model Recommendation:** `gemini-3.8-flash` or `gemini-3.1-pro-preview`
- **Execution Target:** `RequirementArtifact` and associated `AcceptanceCriteriaArtifact`
- **Enforcement Level:** MAJOR (Enforced at `GATE-REQ-001`)

## 2. Objective
Assess the semantic precision, completeness, and testability of raw requirement text and decomposed Given-When-Then criteria. Detect subjective adjectives ("fast", "intuitive", "user-friendly") and missing negative boundaries.

## 3. Scoring Rubric
- **Ambiguity Score ($S_{amb} \in [0.0, 1.0]$):**
  - `0.00 - 0.15`: Fully specified, measurable parameters, explicit error handling, all preconditions stated. **[PASSED]**
  - `0.16 - 0.30`: Minor ambiguities present (e.g. timeout duration not specified), but business intent clear. **[REVIEW REQUIRED]**
  - `0.31 - 1.00`: Unverifiable statements, conflicting expectations, or missing core behaviors. **[BLOCKED]**

## 4. Evaluator Output Schema
```json
{
  "ambiguityScore": 0.08,
  "passed": true,
  "rationale": "Requirement defines explicit status transitions, latency SLA, and HTTP status codes.",
  "ambiguitiesFound": []
}
```
