# EVAL-DRIFT-SEMANTIC: Semantic Drift & Hallucination Evaluator

## 1. Specification Overview
- **Evaluator ID:** `EVAL-DRIFT-SEMANTIC`
- **Type:** `SEMANTIC` (LLM-as-a-Judge)
- **Model Recommendation:** `gemini-3.8-flash` or `gemini-3.1-pro-preview`
- **Execution Target:** Generated Test Artifacts vs Ground Truth Requirement
- **Enforcement Level:** CRITICAL / MAJOR (Enforced at `GATE-VAL-001`)

## 2. Objective
Detect semantic drift, unwarranted assumptions, or hallucinated requirements introduced by intermediate agents. Ensures the testing footprint does not invent unapproved API endpoints or business capabilities.

## 3. Drift Classification
- **Hallucinated Endpoints:** Generating tests for URLs or operations absent in requirements.
- **Contradictory Logic:** Asserting behavior opposite of stated business rules.
- **Scope Creep:** Designing workflows that belong to distinct unapproved domains.

## 4. Thresholds
- **Maximum Permissible Hallucination Index:** $\le 0.10$ ($10\%$)
- **Minimum Grounding Confidence:** $\ge 0.90$ ($90\%$)
