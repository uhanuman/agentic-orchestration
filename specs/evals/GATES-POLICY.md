# Enterprise Quality Gate Hierarchy & Waiver Policy (v3)

## 1. Quality Gate Taxonomy

```text
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  CRITICAL GATE  │      │   MAJOR GATE    │      │   MINOR GATE    │
│  (Zero Bypass)  │      │ (Waiver Allowed)│      │   (Advisory)    │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ▼                        ▼                        ▼
• 100% Schema Valid       • 100% AC Coverage       • Style conventions
• 100% Foreign Keys       • P0/P1 Automation       • Metric warnings
• Zero Sev-1 Sec Gaps     • Completeness >= 0.85   • Non-blocking
```

## 2. Gate Hierarchy Details

### Tier 1: CRITICAL GATES (Blocker - Strictly No Bypass)
- **Rules:**
  1. Zero schema validation errors (`EVAL-SCHEMA-001`).
  2. 100% referential integrity with upstream parents (`EVAL-REFERENTIAL-001`).
  3. Zero ungrounded security contradictions or Sev-1 bypass risks.
- **Waiver Policy:** Under no circumstances can a human waiver bypass a Critical Gate. If a Critical Gate fails, the pipeline aborts immediately.

### Tier 2: MAJOR GATES (Blocker - Bypassable with Human Waiver)
- **Rules:**
  1. 100% of Acceptance Criteria covered by at least 1 Test Scenario (`EVAL-COVERAGE-001`).
  2. 100% of P0/P1 Test Cases have an Automation Contract or formal infeasibility justification.
  3. Semantic Completeness score $\ge 0.85$ (`EVAL-COMPLETENESS-SEMANTIC`).
- **Waiver Policy:**
  - May proceed ONLY if an authenticated Human Approver (VP of Engineering, QA Architect, Lead SDET) submits a signed waiver.
  - Mandatory fields: `humanApprover`, `waiverJustification`, `approvedAt`.
  - All waivers are immutably logged into the audit telemetry store.

### Tier 3: MINOR GATES (Advisory)
- **Rules:**
  - Naming convention warnings, cosmetic formatting, or suggested non-critical performance optimizations.
- **Waiver Policy:**
  - Does not halt pipeline progression; outputs non-blocking telemetry advisory notes.
