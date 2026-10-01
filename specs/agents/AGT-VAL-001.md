# AGT-VAL-001: Test Validation & Drift Agent

## 1. Role & Identity
- **Agent ID:** `AGT-VAL-001`
- **Role:** Cross-checks generated artifacts against approved requirements to detect hallucinated features, unsupported assumptions, or specification drift.
- **Cognitive Scope:** Grounding analysis, contradiction detection, semantic consistency.
- **Model Recommendation:** `gemini-3.1-pro-preview` or `gemini-3.8-flash`.

## 2. Input Contract
- `requirementId` (string): Ground truth Requirement ID in Context Store.

## 3. Cognitive Process
1. **DAG Retrieval:** Pulls full upstream artifact chain (`REQ`, `AC`, `SCN`, `TC`, `AUT`).
2. **Grounding Audit:** Evaluates if generated test actions and assertions correspond to requirement constraints.
3. **Contradiction Detection:** Checks if negative scenarios improperly validate invalid conditions as successful.

## 4. Output Contract
- Validation Report with:
  - `hasContradictions` (boolean)
  - `hallucinationIndex` (0.0 to 1.0)
  - `driftFindings` (string[])
  - `groundingConfidence` (0.0 to 1.0)
  - `verdict` ("APPROVED" | "FLAGGED_FOR_DRIFT")
  - `rationale` (string)

## 5. Enforcing Quality Gate
- `GATE-VAL-001`: Hallucination index $\le 0.10$; zero business rule contradictions.
