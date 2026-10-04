# Test Cases Specification: Part & Part Category Lifecycle Management

**Parent Requirement:** [`REQ-INVENTREE-PART-001`](../req/REQ-INVENTREE-PART-001.md)  
**Parent Scenarios:** [`scenarios.md`](scenarios.md)  
**Feature:** Part & Part Category Lifecycle Management (`inventree-part-management`)  
**Quality Gate Target:** `GATE-TEST-DESIGN-001`  
**Total Test Cases:** 24 Functional Test Cases  
**Traceability & Referential Integrity:** 100% Valid Upstream Lineage (`REQ` $\to$ `AC` $\to$ `SCN` $\to$ `TC`)  

---

## 1. Test Cases Master Index

| TC ID | Scenario Ref | Layer | Priority | Classification | Summary |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **`TC-INVENTREE-001`** | `SCN-INVENTREE-001` | API | P0 | POSITIVE | POST `/api/part/category/` creates root and nested categories. |
| **`TC-INVENTREE-002`** | `SCN-INVENTREE-002` | API | P1 | BOUNDARY | POST `/api/part/category/` boundary and duplicate name rejection. |
| **`TC-INVENTREE-003`** | `SCN-INVENTREE-003` | API | P1 | POSITIVE | GET `/api/part/category/` parent hierarchy filtering (`parent=<id>` / `null`). |
| **`TC-INVENTREE-004`** | `SCN-INVENTREE-004` | API | P1 | POSITIVE | GET `/api/part/category/{id}/` detail and pathstring verification. |
| **`TC-INVENTREE-005`** | `SCN-INVENTREE-005` | API | P2 | NEGATIVE | GET `/api/part/category/{id}/` returns 404 on non-existent category. |
| **`TC-INVENTREE-006`** | `SCN-INVENTREE-006` | API | P1 | POSITIVE | PUT `/api/part/category/{id}/` updates name and propagates pathstring. |
| **`TC-INVENTREE-007`** | `SCN-INVENTREE-007` | DB | P0 | EXCEPTION | PUT `/api/part/category/{id}/` rejects circular hierarchy cycle. |
| **`TC-INVENTREE-008`** | `SCN-INVENTREE-008` | API | P1 | POSITIVE | DELETE `/api/part/category/{id}/` deletes empty category (204). |
| **`TC-INVENTREE-009`** | `SCN-INVENTREE-009` | DB | P0 | EXCEPTION | DELETE `/api/part/category/{id}/` blocked when category contains parts (400). |
| **`TC-INVENTREE-010`** | `SCN-INVENTREE-010` | API | P0 | POSITIVE | POST `/api/part/` creates new Part with mandatory and optional fields (201). |
| **`TC-INVENTREE-011`** | `SCN-INVENTREE-011` | API | P0 | NEGATIVE | POST `/api/part/` input validation and duplicate IPN collision rejection (400). |
| **`TC-INVENTREE-012`** | `SCN-INVENTREE-012` | API | P1 | POSITIVE | GET `/api/part/` paginated list envelope and response time SLA ($\le 2\,000\text{ ms}$). |
| **`TC-INVENTREE-013`** | `SCN-INVENTREE-0013`| API | P2 | BOUNDARY | GET `/api/part/` negative limit/offset boundary handling (400). |
| **`TC-INVENTREE-014`** | `SCN-INVENTREE-014` | API | P1 | POSITIVE | GET `/api/part/{id}/` complete metadata schema and status flags. |
| **`TC-INVENTREE-015`** | `SCN-INVENTREE-015` | API | P1 | POSITIVE | PUT `/api/part/{id}/` full replacement update and boolean flag defaults. |
| **`TC-INVENTREE-016`** | `SCN-INVENTREE-016` | API | P1 | POSITIVE | PATCH `/api/part/{id}/` partial delta update, empty body no-op, and active toggle. |
| **`TC-INVENTREE-017`** | `SCN-INVENTREE-017` | DB | P0 | EXCEPTION | DELETE `/api/part/{id}/` blocked by active stock or BOM references (400). |
| **`TC-INVENTREE-018`** | `SCN-INVENTREE-018` | API | P1 | POSITIVE | DELETE `/api/part/{id}/` succeeds for clean unreferenced part (204). |
| **`TC-INVENTREE-019`** | `SCN-INVENTREE-019` | API | P0 | POSITIVE | GET `/api/part/` multi-facet conjunction (`category` + `active` + `search` $\le 3\,000\text{ ms}$). |
| **`TC-INVENTREE-020`** | `SCN-INVENTREE-020` | API | P2 | BOUNDARY | GET `/api/part/` zero matching results returns HTTP 200 with `results: []`. |
| **`TC-INVENTREE-021`** | `SCN-INVENTREE-021` | API | P0 | NEGATIVE | Mutating endpoints reject unauthenticated calls without token (`401`/`403`). |
| **`TC-INVENTREE-022`** | `SCN-INVENTREE-022` | API | P0 | NEGATIVE | Mutating endpoints reject invalid or expired tokens (`401`). |
| **`TC-INVENTREE-023`** | `SCN-INVENTREE-023` | UI | P1 | E2E | Playwright journey: Category Tree expansion, node selection, table filtering. |
| **`TC-INVENTREE-024`** | `SCN-INVENTREE-024` | UI | P1 | E2E | Playwright journey: Create Part modal, client validation, form submit, toast & redirect. |
