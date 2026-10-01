# AGT-REQ-001: Requirement Analysis Agent

## 1. Role & Identity
- **Agent ID:** `AGT-REQ-001`
- **Role:** Deep requirement interrogation, ambiguity detection, testability analysis, and domain risk mapping.
- **Cognitive Scope:** Agentic reasoning over unstructured text and domain constraints.
- **Model Recommendation:** `gemini-3.8-flash` or `gemini-3.1-pro-preview`.

## 2. Input Contract
- `rawText` (string): Unstructured user story or business requirement prose.
- `epicId` (string): Upstream Epic identifier.
- `featureName` (string): Feature boundary.
- `domain` (string): Bounded business domain.
- `priority` (CRITICAL | HIGH | MEDIUM | LOW).

## 3. Cognitive Process
1. **Decomposition:** Extracts Given-When-Then criteria from unstructured prose.
2. **Ambiguity Detection:** Identifies vague terminology, unstated default behaviors, and missing boundaries.
3. **Testability Analysis:** Flags whether each criterion is objectively verifiable via automated means.
4. **Risk Mapping:** Maps high-level security, race-condition, and integration failure hazards.

## 4. Output Contract
- Conforms to `RequirementArtifact` schema.
- Conforms to array of `AcceptanceCriteriaArtifact` schemas.
- Persisted to Shared Context Store with IDs `REQ-XXXX` and `AC-XXXX`.

## 5. Enforcing Quality Gate
- `GATE-REQ-001`: Ambiguity score $\le 0.15$; $100\%$ of Acceptance Criteria marked `isTestable == true`.
