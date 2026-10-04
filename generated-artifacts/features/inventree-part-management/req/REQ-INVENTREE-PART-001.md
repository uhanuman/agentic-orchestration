# Requirement Specification: InvenTree Part & Part Category Lifecycle Management

**Artifact ID:** `REQ-INVENTREE-PART-001`  
**Version:** `1.0.0`  
**Epic ID:** `EPIC-INVENTREE-CORE`  
**Feature Name:** Part & Part Category Lifecycle Management  
**Feature Slug:** `inventree-part-management`  
**Domain:** Inventory & Manufacturing Engineering  
**Priority:** `HIGH`  
**Lifecycle Status:** `APPROVED`  
**Created At:** `2026-10-03T23:21:14.000Z`  
**Updated At:** `2026-10-03T23:21:14.000Z`  

---

## 1. Executive Summary & Intent

This requirement defines the lifecycle, business rules, referential integrity constraints, and token authentication rules for **Part Categories** and **Parts** in the InvenTree inventory management platform (version `>= 0.15.x`). The feature encompasses RESTful API interactions and responsive web frontend workflows, ensuring catalog integrity, acyclic hierarchical structures, multi-faceted filtering, and strict token-based authorization.

---

## 2. In-Scope Functional Capabilities

1. **Part Category Tree Hierarchy (FA-001 to FA-005):**
   - Create root and nested categories via `POST /api/part/category/` and Category Tree UI.
   - Unique naming within parent category scope (HTTP 400 on duplicates).
   - Paginated and filtered retrieval via `GET /api/part/category/` (`parent=<id>` / `parent=null`).
   - Single category detail inspection with breadcrumb `pathstring` and `part_count` via `GET /api/part/category/{id}/`.
   - Full mutation via `PUT /api/part/category/{id}/` preventing circular hierarchy cycles.
   - Deletion via `DELETE /api/part/category/{id}/` guarding against orphaned parts and unauthorized cascades.

2. **Part Entity Lifecycle & Attributes (FA-006 to FA-011):**
   - Create core inventory parts via `POST /api/part/` with mandatory name and existing category foreign key.
   - Globally unique Internal Part Number (`IPN`) enforcement (HTTP 400 on collision).
   - Default active status (`active: true`) with optional explicit configuration.
   - Paginated catalogue retrieval via `GET /api/part/` with standard response envelope (`count`, `next`, `previous`, `results`).
   - Full replacement update via `PUT /api/part/{id}/` (defaulting omitted boolean flags to false).
   - Partial updates via `PATCH /api/part/{id}/` supporting non-destructive field mutation and inactive toggling.
   - Deletion via `DELETE /api/part/{id}/` strictly locked when active Stock Items or BOM relationships exist.

3. **Search, Filtering & Pagination (FA-012, NFA-002):**
   - Compound filter conjunction (logical AND) combining `category`, `active`, and case-insensitive substring `search`.
   - Guaranteed HTTP 200 with empty array (`results: []`) on zero search matches.
   - Response time SLAs: Unfiltered list $\le 2\,000\text{ ms}$, Filtered list $\le 3\,000\text{ ms}$ under baseline load ($< 50$ concurrent users, $< 10\,000$ parts).

4. **Security & Authentication (FA-013, NFA-001):**
   - Compulsory token authentication on all mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) via `Authorization: Token <token>`.
   - Strict rejection of missing credentials with HTTP 401/403 and invalid/expired tokens with HTTP 401.
   - Role/permission enforcement returning HTTP 403 Forbidden for unprivileged tokens.
   - Exclusion of token secrets from query strings, logs, and error responses.

---

## 3. Explicit Out-of-Scope Boundaries

The following operations are formally designated out of scope for this requirement slice:
- Stock items tracking, manual adjustments, and stocktaking operations.
- Bill of Materials (BOM) authoring and sub-assembly validation.
- Purchase order and supplier quote management.
- Sales order and customer fulfillment flows.
- Manufacturing and build order scheduling.
- Part attachments and binary image file uploads.
- Part parameter definitions and parameter templates.
- Unit pricing and financial cost tracking.
- InvenTree third-party plugin architecture.
- Mobile application (iOS / Android) native testing.
- Multi-site / multi-warehouse stock allocations.
- User permission administration and group role assignment.
- Barcode and QR code scanning camera workflows.

---

## 4. Identified Domain Risks & Mitigations

| Risk ID | Description | Severity | Mitigation & Verification Hook |
| :--- | :--- | :---: | :--- |
| **`RISK-INVENTREE-001`** | Accidental cascade deletion of non-empty category deleting child categories and assigned parts. | **CRITICAL** | Enforce pre-delete referential check; reject with HTTP 400 unless explicit migration or cascade confirmed. Test via automated negative DELETE suites. |
| **`RISK-INVENTREE-002`** | Bypassing token authentication on mutating endpoints allows unprivileged state changes. | **CRITICAL** | Enforce DRF TokenAuthentication globally across `/api/part/` and `/api/part/category/`. Test via security matrix (missing, expired, forged tokens). |
| **`RISK-INVENTREE-003`** | Referential integrity violation deleting a part referenced in active Stock Items or BOM items. | **CRITICAL** | Database foreign key protect rules (`on_delete=models.PROTECT`). Test via API DELETE against parts with mock stock items. |
| **`RISK-INVENTREE-004`** | Circular parent category hierarchy cycles (e.g. A $\to$ B $\to$ A) causing infinite loops or stack overflow. | **HIGH** | Implement cycle detection in Category model clean/save logic. Test with cyclic PUT payloads. |
| **`RISK-INVENTREE-005`** | Race conditions / lost updates on concurrent PUT or PATCH mutations to part status or IPN. | **HIGH** | Atomic database transactions and unique constraint validation. Test with parallel mutation scripts. |
| **`RISK-INVENTREE-006`** | Search/filter response time latency degradation exceeding 2,000ms - 3,000ms SLA without indexing. | **MEDIUM** | Ensure B-tree indexing on `name`, `IPN`, `category`, and `active`. Test via k6 performance load suites. |
| **`RISK-INVENTREE-007`** | UI state desynchronization between Category Tree View expansion state and Part List table pagination. | **LOW** | Reactive state binding in web frontend. Test with Playwright multi-step tree selection and pagination journeys. |

---

## 5. Ambiguity Log & Discovered Boundary Clarifications

| # | Ambiguity / Vague Phrasing | Discovered Risk | Boundary Clarification & Concrete Rule |
| :- | :--- | :--- | :--- |
| **1** | *"clear error (HTTP 400)"* on deletion of non-empty categories / parts | Potential inconsistency between HTTP 400 and HTTP 409 Conflict | The API will return **HTTP 400 Bad Request** with a standardized error object: `{"error": "Cannot delete category containing assigned parts."}`. |
| **2** | *"cascade or be rejected depending on instance configuration"* (FA-005) | Inconsistent behavior across test environments | Default configuration must **reject** deletion with HTTP 400. Cascade deletion requires an explicit administrative override flag. |
| **3** | *"Authenticated and unauthenticated requests may receive different data depending on instance configuration"* (FA-002, FA-008) | Flaky public read tests if instance requires login | Test suites will support both modes; default test harness configures `INVENTREE_LOGIN_REQUIRED=False` for public reads and asserts private mode returns 401 when enabled. |
| **4** | *"case-insensitive substring match on part name and IPN"* (FA-007, FA-012) | Unclear if part description is indexed | Clarified: API `search` query targets `name` and `IPN` fields. Description search is not guaranteed unless configured in search backend. |
| **5** | *"real-time or on submit"* search updates (FA-012 UI Flow) | Frontend input thrashing or excessive API requests | UI will enforce a **300 ms debounce** window on input keypress before firing search requests. |
| **6** | *"normal load (< 50 concurrent users, catalogue size < 10,000 parts)"* (NFA-002) | Ambiguity in resource provisioning | Quantitative SLA benchmark established: $\le 2\,000\text{ ms}$ for unfiltered GET `/api/part/` and $\le 3\,000\text{ ms}$ for compound filtered queries. |

---

## 6. Traceability & Lineage Mapping

- **Upstream Epic:** `EPIC-INVENTREE-CORE`
- **Child Acceptance Criteria:**
  - `AC-INVENTREE-001`: Part Category — Create (FA-001)
  - `AC-INVENTREE-002`: Part Category — Read List & Filtering (FA-002)
  - `AC-INVENTREE-003`: Part Category — Read Detail & Breadcrumbs (FA-003)
  - `AC-INVENTREE-004`: Part Category — Update & Cycle Prevention (FA-004)
  - `AC-INVENTREE-005`: Part Category — Delete & Referential Locks (FA-005)
  - `AC-INVENTREE-006`: Part — Create & Unique IPN (FA-006)
  - `AC-INVENTREE-007`: Part — Read List, Pagination & Latency SLA (FA-007, NFA-002)
  - `AC-INVENTREE-008`: Part — Read Detail & Field Verification (FA-008)
  - `AC-INVENTREE-009`: Part — Full Update via PUT (FA-009)
  - `AC-INVENTREE-010`: Part — Partial Update via PATCH & Inactivity (FA-010)
  - `AC-INVENTREE-011`: Part — Delete & Stock/BOM Referential Locks (FA-011, NFA-003)
  - `AC-INVENTREE-012`: Part — Compound Search & Filter Conjunction (FA-012, NFA-002)
  - `AC-INVENTREE-013`: Security — Token Auth & Permission Enforcement (FA-013, NFA-001)
- **Downstream Targets:**
  - Next Agent: `agents/02.test-design.agent.md` (`AGT-TEST-DESIGN-001`)
  - Target Quality Gate: `GATE-REQ-001` (Ambiguity $\le 0.15$, Schema 100%, Testability 100%)

