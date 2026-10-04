# Accessibility NFR Test Specification: Part & Part Category Lifecycle Management

**Parent Requirement:** [`REQ-INVENTREE-PART-001`](../req/REQ-INVENTREE-PART-001.md)  
**Agent:** `AGT-ACCESSIBILITY-001` (Accessibility NFR Specialist)  
**Quality Gate Target:** `GATE-A11Y-001`  
**Target Harness:** `Playwright` + `@axe-core/playwright`  
**Compliance Level:** WCAG 2.1 Level AA  

---

## 1. Accessibility Architecture & Standards Map

| WCAG Criterion | Success Criteria | Scope / UI Component | Enforcement |
| :--- | :--- | :--- | :--- |
| **2.1.1 Keyboard** | Level A | Category Tree View & Part table | Full navigation using `Tab`, `Arrows`, `Enter`, `Space` |
| **2.1.2 No Keyboard Trap** | Level A | Category Tree and Modal overlays | Focus strictly cycles and can always exit via `Tab` or `Escape` |
| **2.4.3 Focus Order** | Level A | Create Part Modal | Predictable tab flow; shifts into modal and restores on exit |
| **1.4.3 Contrast (Minimum)**| Level AA | All text elements | $\ge 4.5:1$ for normal body text; $\ge 3:1$ for large headings and icons |
| **4.1.3 Status Messages** | Level AA | Validation alerts & toast banners | `role="alert"` / `aria-live="polite"` for screen readers |

---

## 2. Accessibility Test Cases Register

| TC ID | Scenario Ref | Priority | Standard | Verification Summary |
| :--- | :--- | :---: | :--- | :--- |
| **`TC-INVENTREE-A11Y-001`** | `SCN-INVENTREE-023` | P1 | WCAG 2.1.1 / 2.4.7 | Category Tree View full keyboard navigation, roving tabindex, and visible focus outline. |
| **`TC-INVENTREE-A11Y-002`** | `SCN-INVENTREE-024` | P1 | WCAG 2.1.2 / 2.4.3 | Create Part modal focus containment, `role="dialog"`, and `Escape` key focus restoration. |
| **`TC-INVENTREE-A11Y-003`** | `SCN-INVENTREE-024` | P1 | Automated Axe-Core | Automated Axe-core sweep asserting zero critical/serious violations across Part views. |
| **`TC-INVENTREE-A11Y-004`** | `SCN-INVENTREE-024` | P2 | WCAG 4.1.3 / 3.3.1 | Screen reader announcements (`aria-live="assertive"`) on client-side form validation errors. |
