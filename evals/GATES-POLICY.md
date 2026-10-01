---
id: GATES-POLICY
name: Enterprise Quality Gate Hierarchy & Policy
version: 3.0.0
---

# Enterprise Quality Gate Hierarchy & Waiver Policy (v3)

## 1. Taxonomy & Tiers

### Tier 1: CRITICAL GATES (Blocker - Strictly No Bypass)
- **Zero Broken Schema Rules:** `EVAL-SCHEMA-001`
- **100% Referential Integrity:** `EVAL-REFERENTIAL-001`
- **Zero Specification Drift:** `EVAL-DRIFT-SEMANTIC`
- **Policy:** Cannot be bypassed with a waiver under any circumstances. Pipeline terminates immediately.

### Tier 2: MAJOR GATES (Blocker - Bypassable with Human Waiver)
- **Requirement Ambiguity & Testability:** `GATE-REQ-001` (Score $\ge 0.85$)
- **Test Design Coverage & Completeness:** `GATE-DES-001` (Score $\ge 0.85$)
- **P0/P1 Automation Contract:** `GATE-SDET-001` (Score $\ge 0.80$)
- **Policy:** Requires signed human waiver (`humanApprover`, `waiverJustification`, `approvedAt`) to proceed if failing.

### Tier 3: MINOR GATES (Advisory)
- **Policy:** Non-blocking notices, cosmetic warnings, and recommendations.
