# Acceptance Criteria Specification: Part & Part Category Lifecycle Management

**Parent Requirement:** [`REQ-INVENTREE-PART-001`](REQ-INVENTREE-PART-001.md)  
**Feature:** Part & Part Category Lifecycle Management (`inventree-part-management`)  
**Epic:** `EPIC-INVENTREE-CORE`  
**Quality Gate Target:** `GATE-REQ-001`  
**Testability Compliance:** 100% (`isTestable == true` across all 13 AC records)  

---

## Acceptance Criteria Summary Matrix

| ID | Functional Area | Primary Target | Classification | Testability | Status |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **`AC-INVENTREE-001`** | FA-001: Category Create | `POST /api/part/category/` + UI Tree | POSITIVE / BOUNDARY | `true` | VALIDATED |
| **`AC-INVENTREE-002`** | FA-002: Category Read List | `GET /api/part/category/` + UI Nav | POSITIVE / FILTER | `true` | VALIDATED |
| **`AC-INVENTREE-003`** | FA-003: Category Read Detail | `GET /api/part/category/{id}/` | POSITIVE / NEGATIVE | `true` | VALIDATED |
| **`AC-INVENTREE-004`** | FA-004: Category Update | `PUT /api/part/category/{id}/` | MUTATION / INTEGRITY | `true` | VALIDATED |
| **`AC-INVENTREE-005`** | FA-005: Category Delete | `DELETE /api/part/category/{id}/` | DESTRUCTIVE / GUARD | `true` | VALIDATED |
| **`AC-INVENTREE-006`** | FA-006: Part Create | `POST /api/part/` + UI Modal | POSITIVE / CONSTRAINT | `true` | VALIDATED |
| **`AC-INVENTREE-007`** | FA-007: Part Read List | `GET /api/part/` + UI Table | PAGINATION / SLA | `true` | VALIDATED |
| **`AC-INVENTREE-008`** | FA-008: Part Read Detail | `GET /api/part/{id}/` + UI Tabs | POSITIVE / NEGATIVE | `true` | VALIDATED |
| **`AC-INVENTREE-009`** | FA-009: Part Full Update | `PUT /api/part/{id}/` | MUTATION / REPLACEMENT| `true` | VALIDATED |
| **`AC-INVENTREE-010`** | FA-010: Part Partial Update | `PATCH /api/part/{id}/` | DELTA / STATE | `true` | VALIDATED |
| **`AC-INVENTREE-011`** | FA-011: Part Delete | `DELETE /api/part/{id}/` | REFERENTIAL LOCK | `true` | VALIDATED |
| **`AC-INVENTREE-012`** | FA-012: Search & Filter | `GET /api/part/?...` | CONJUNCTION / SLA | `true` | VALIDATED |
| **`AC-INVENTREE-013`** | FA-013 & NFA-001: Token Auth | Mutating Endpoints + Headers | SECURITY / RBAC | `true` | VALIDATED |

---

## Detailed Acceptance Criteria Specifications

### `AC-INVENTREE-001`: Part Category — Create (Hierarchy Root and Nested)
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - User holds a valid API token with category creation permissions in header `Authorization: Token <token>`.
  - InvenTree instance is operational (version $\ge 0.15.x$).
- **When:**
  - User submits `POST /api/part/category/` with a valid name (1–100 characters) and optional integer `parent` ID, or submits via the UI "Add Category" panel.
- **Then:**
  - System creates the category and returns `HTTP 201 Created` with the complete category object including system-assigned integer ID.
  - When `parent` is omitted or `null`, the category is created as a root-level category (`parent: null`, `pathstring: "Name"`).
  - When a valid `parent` ID is provided, the category is nested under that parent and `pathstring` reflects the parent lineage (`"Parent/Child"`).
  - Duplicate category names within the same parent scope are rejected with `HTTP 400 Bad Request`.
  - The UI Category Tree View renders the newly created category in the appropriate node position and displays a success notification toast.
- **Business Rules:**
  - Category name is mandatory, non-empty, and limited to 100 characters maximum.
  - Category names must be unique within the same parent category scope.
  - Write access requires a valid API token.
- **Testability Rationale:** Verifiable via automated REST API POST requests asserting 201 and 400 responses, and Playwright UI tests creating root and nested categories.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-002`: Part Category — Read (List & Hierarchical Filtering)
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - InvenTree database is populated with multiple root and child categories.
- **When:**
  - Client sends `GET /api/part/category/` with optional query parameters `parent=<id>`, `parent=null`, or `ordering=name`, or navigates the UI Parts section.
- **Then:**
  - API returns `HTTP 200 OK` with a JSON list/envelope containing at minimum `id`, `name`, `description`, and `parent_id` for each category.
  - Query with `parent=<id>` returns only direct child categories of that specific category.
  - Query with `parent=null` returns only root-level categories.
  - List endpoint supports sorting by category name in ascending or descending order.
  - UI renders expandable/collapsible tree nodes, and clicking a category node filters the parts list to that category.
- **Business Rules:**
  - Response payload must provide hierarchical linkage (`parent_id` or `parent`).
  - Unfiltered category list retrieval must respond deterministically.
- **Testability Rationale:** Verifiable via API GET query parameter matrix testing and Playwright UI tree node expand/collapse and filter verification.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-003`: Part Category — Read (Detail & Lineage Breadcrumbs)
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - A Part Category exists with known integer ID, metadata, parent category, and assigned parts.
- **When:**
  - Client dispatches `GET /api/part/category/{id}/` or selects the category in the Category Tree view.
- **Then:**
  - Request with a valid numeric ID returns `HTTP 200 OK` with the full category object including `id`, `name`, `description`, `parent`, `pathstring`, and `part_count`.
  - Response `pathstring` contains the complete breadcrumb path from root to current category.
  - Response `part_count` accurately equals the count of parts assigned to this category.
  - Request with an invalid, non-numeric, or non-existent category ID returns `HTTP 404 Not Found`.
  - UI category detail panel renders the category name, breadcrumb lineage, description, and part count.
- **Business Rules:**
  - A valid numeric category ID must return HTTP 200; invalid IDs must return HTTP 404.
  - Part count reflects real-time assigned parts.
- **Testability Rationale:** Verifiable via REST API GET status and schema assertions for 200 and 404 paths, and Playwright inspection of the detail panel.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-004`: Part Category — Update & Acyclic Hierarchy Protection
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - An existing Part Category exists with ID `{id}` and user provides a valid write token.
- **When:**
  - Client sends `PUT /api/part/category/{id}/` with updated attributes (`name`, `parent`, `description`) or modifies the category via the UI "Edit" action.
- **Then:**
  - Valid payload returns `HTTP 200 OK` with the fully updated category object.
  - Renaming a category propagates updated `pathstring` values to all descendant categories.
  - Attempting to set the `parent` to a descendant category (circular hierarchy) is rejected with `HTTP 400 Bad Request`.
  - Omitting the required `name` field in a PUT body is rejected with `HTTP 400 Bad Request`.
  - UI category tree view immediately updates the category label and hierarchical position, displaying a success notification.
- **Business Rules:**
  - The `name` field is mandatory in PUT requests; missing name yields HTTP 400.
  - Circular parent-child hierarchies are strictly forbidden to maintain tree acyclicity.
  - Write operations require valid authentication credentials.
- **Testability Rationale:** Verifiable via API PUT requests testing valid renaming, missing fields, circular parent references, and Playwright UI edit interactions.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-005`: Part Category — Deletion Guardrails & Cascade Policies
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - An existing Part Category exists with ID `{id}` and user holds a valid write token.
- **When:**
  - Client dispatches `DELETE /api/part/category/{id}/` or triggers category deletion via the UI action menu.
- **Then:**
  - Deleting an empty category (no assigned parts and no children) succeeds and returns `HTTP 204 No Content`.
  - Deleting a category with assigned parts is rejected with `HTTP 400 Bad Request` unless parts are reassigned or deleted first.
  - Deleting a category with child categories without cascade authorization is rejected with `HTTP 400 Bad Request`.
  - Requests without a valid API token return `HTTP 401 Unauthorized` or `HTTP 403 Forbidden`.
  - UI displays a confirmation dialog before deletion; upon confirmation, category is removed from the tree and success toast appears.
- **Business Rules:**
  - Categories with assigned parts cannot be deleted; referential integrity prevents orphaned parts.
  - Successful deletion returns HTTP 204 No Content.
  - Write access requires a valid API token.
- **Testability Rationale:** Verifiable via API DELETE requests on empty vs populated categories, asserting HTTP 204 and HTTP 400, and Playwright UI confirmation flow.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-006`: Part — Create & Validation Constraints
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - A valid Part Category exists in InvenTree and user possesses a valid write token.
- **When:**
  - Client sends `POST /api/part/` with part details (`name`, `category`, optional `IPN`, `description`, flags) or submits the UI "Create Part" modal.
- **Then:**
  - Valid payload creates the part and returns `HTTP 201 Created` with the complete part representation including system-assigned integer ID.
  - New part defaults to `active: true` if active flag is omitted from creation payload.
  - Payload missing mandatory `name` or `category` is rejected with `HTTP 400 Bad Request` and field-level validation errors.
  - Payload specifying a non-existent category ID is rejected with `HTTP 400 Bad Request`.
  - Payload with duplicate `IPN` already in use is rejected with `HTTP 400 Bad Request`.
  - UI parts list reflects the new part and navigates or links to the new part detail page (`/part/{id}/`).
- **Business Rules:**
  - Part name is required, non-empty, and max 100 characters.
  - Category is required and must reference an existing category foreign key.
  - IPN (Internal Part Number), if provided, must be globally unique across all parts.
  - Write access requires a valid API token.
- **Testability Rationale:** Verifiable through API contract tests validating 201 Created, missing mandatory fields, duplicate IPN rejection, and Playwright form submission.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-007`: Part — Read (List, Pagination & Latency SLA)
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - Catalogue is populated with parts across multiple categories with active and inactive statuses.
- **When:**
  - Client sends `GET /api/part/` with optional pagination query parameters `limit` and `offset`, or loads `/part/` in the web browser.
- **Then:**
  - API returns `HTTP 200 OK` with a paginated envelope containing `count`, `next` URL, `previous` URL, and `results` array.
  - Each part object in results includes `id`, `name`, `description`, `category` (`id` + `name`), `IPN`, `active` flag, and `thumbnail` URL.
  - Unfiltered list request returns response within 2,000 ms under standard load ($< 50$ concurrent users, $< 10\,000$ parts).
  - Negative `limit` or `offset` values return `HTTP 400 Bad Request`.
  - UI renders parts table with pagination controls matching the API count, next, and previous links.
- **Business Rules:**
  - Response must provide standardized pagination metadata (`count`, `next`, `previous`, `results`).
  - Performance SLA requires response time $\le 2\,000\text{ ms}$ for unfiltered catalogue list.
- **Testability Rationale:** Verifiable via API envelope schema checks, pagination boundary tests, k6 response time benchmarks, and Playwright table pagination checks.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-008`: Part — Read (Detail & Comprehensive Field Inspection)
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - A Part entity exists with ID `{id}` containing metadata, category, IPN, flags, and stock relations.
- **When:**
  - Client sends `GET /api/part/{id}/` or navigates to `/part/{id}/` in the web UI.
- **Then:**
  - Valid numeric part ID returns `HTTP 200 OK` with all fields: `id`, `name`, `description`, `category`, `IPN`, `active`, `purchaseable`, `saleable`, `trackable`, `virtual`, `units`, `minimum_stock`, and image thumbnail URL.
  - Non-existent or non-numeric part ID returns `HTTP 404 Not Found`.
  - UI Part detail page displays all part fields, category link, active badge, and renders tabs for Details, Stock levels, BOM, and Suppliers.
- **Business Rules:**
  - Valid numeric part ID returns HTTP 200; invalid/non-existent returns HTTP 404.
  - Complete entity representation must be returned in detail view.
- **Testability Rationale:** Verifiable through automated REST GET contract tests and Playwright UI tests validating tab rendering on `/part/{id}/`.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-009`: Part — Full Replacement Update via PUT
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - An existing Part exists with ID `{id}` and user supplies a valid write token.
- **When:**
  - Client sends `PUT /api/part/{id}/` with full part payload or submits the UI "Edit Part" form.
- **Then:**
  - Valid complete payload updates all part attributes and returns `HTTP 200 OK` with the updated part representation.
  - Omitting mandatory `name` or `category` field in PUT body returns `HTTP 400 Bad Request`.
  - Supplying a non-existent category ID returns `HTTP 400 Bad Request`.
  - Updating IPN to a value already used by another part returns `HTTP 400 Bad Request`.
  - Boolean flags (`active`, `purchaseable`, `saleable`, `trackable`, `virtual`) default to `false` when omitted from PUT body.
  - UI part detail page immediately reflects updated values and displays a success notification.
- **Business Rules:**
  - PUT represents a full resource replacement; all required fields must be supplied.
  - IPN must remain globally unique across all parts.
  - Write access requires a valid API token.
- **Testability Rationale:** Verifiable via API PUT full-replacement assertions, duplicate IPN error paths, and Playwright edit modal validation.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-010`: Part — Partial Update via PATCH & Inactivity State
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - An existing Part exists with ID `{id}` and user supplies a valid write token.
- **When:**
  - Client sends `PATCH /api/part/{id}/` with a subset of fields (e.g. toggling `active: false` or changing description) or uses inline edit affordance in UI.
- **Then:**
  - System updates only the supplied fields and returns `HTTP 200 OK` with the complete updated part representation.
  - Unsupplied fields retain their current values without modification.
  - An empty request body (`{}`) returns `HTTP 200 OK` with the unchanged part object (no-op).
  - When `active` is set to `false`, part remains accessible via GET but is marked as inactive.
  - If `IPN` is included in PATCH body, duplicate value check is enforced, rejecting collisions with `HTTP 400 Bad Request`.
  - UI updates only the modified attribute and displays a success notification.
- **Business Rules:**
  - PATCH performs partial update; omitted fields must not be overwritten or defaulted.
  - PATCH with empty payload is a valid no-op returning HTTP 200.
  - Write access requires a valid API token.
- **Testability Rationale:** Verifiable via API PATCH partial payload tests, empty body tests, active flag toggle verification, and Playwright UI tests.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-011`: Part — Deletion Safeguards & Referential Integrity Locks
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - An existing Part exists with ID `{id}` and user holds a valid write token.
- **When:**
  - Client sends `DELETE /api/part/{id}/` or selects "Delete Part" from the UI action menu and confirms.
- **Then:**
  - Deleting an unreferenced part with zero stock items and no BOM relations returns `HTTP 204 No Content`.
  - Attempting to delete a part with existing stock items is rejected with `HTTP 400 Bad Request` and descriptive error message.
  - Attempting to delete a part referenced as a BOM item in another assembly is rejected with `HTTP 400 Bad Request`.
  - Requests without a valid API token return `HTTP 401 Unauthorized` or `HTTP 403 Forbidden`.
  - UI presents a confirmation dialog before deletion; upon confirmation, user is redirected to `/part/` list and toast is shown.
- **Business Rules:**
  - Parts with active stock items or BOM references cannot be deleted to prevent referential corruption.
  - Successful deletion returns HTTP 204 No Content.
  - Write access requires a valid API token.
- **Testability Rationale:** Verifiable via API DELETE assertions across unlocked parts, stock-locked parts, and BOM-locked parts, and Playwright UI confirmation tests.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-012`: Part — Compound Search, Filter Conjunction & Response Latency
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - InvenTree catalogue contains parts across multiple categories with distinct active flags, names, and IPNs.
- **When:**
  - Client queries `GET /api/part/` with combinations of `category=<id>`, `active=true|false`, and `search=<keyword>`, or uses UI filter controls.
- **Then:**
  - Query with `category=<id>` returns only parts directly assigned to that category.
  - Query with `active=true` returns only active parts; `active=false` returns only inactive parts.
  - Query with `search=<keyword>` performs case-insensitive substring search matching name and IPN.
  - Combining `category`, `active`, and `search` parameters applies logical AND conjunction (intersection of filters).
  - Queries with zero matching records return `HTTP 200 OK` with empty results array (not HTTP 404).
  - Filtered query responds within 3,000 ms under standard load ($< 50$ concurrent users, $< 10\,000$ parts).
  - UI `/part/` list table dynamically filters records according to applied filter facets with debounced updates.
- **Business Rules:**
  - Multiple filters must be evaluated with logical AND conjunction.
  - Zero-match queries must return HTTP 200 with `results: []`.
  - Filtered query performance SLA is $\le 3\,000\text{ ms}$.
- **Testability Rationale:** Verifiable via API filter combination test matrices, zero-result assertions, k6 load latency tests, and Playwright interactive filter tests.
- **Status:** `VALIDATED`

---

### `AC-INVENTREE-013`: Security — Token Authentication & Permission Enforcement
- **Requirement ID:** `REQ-INVENTREE-PART-001`
- **Given:**
  - InvenTree API endpoints for Part and Part Category write and read operations.
- **When:**
  - Client dispatches requests with missing, malformed, expired, unprivileged, or valid authentication tokens.
- **Then:**
  - Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) without Authorization header return `HTTP 403 Forbidden` or `HTTP 401 Unauthorized`.
  - Mutating requests with an invalid or expired token return `HTTP 401 Unauthorized` with descriptive error details.
  - Requests with a valid token belonging to a user without write permissions return `HTTP 403 Forbidden`.
  - Requests with a valid token supplied in `Authorization: Token <token>` format succeed with appropriate 2xx response.
  - Tokens never appear in URL query strings, server access logs, or error responses.
  - UI redirects unauthenticated users attempting to access `/part/` to the login page.
- **Business Rules:**
  - All mutating API endpoints must enforce token authentication without exception.
  - Authorization header format must adhere to `Authorization: Token <token>`.
  - Session cookies must not be accepted for programmatic API write operations.
  - Token secrets must be protected from leakage across logs and error messages.
- **Testability Rationale:** Verifiable through automated security API test suite evaluating valid, missing, malformed, and unprivileged tokens across all write endpoints.
- **Status:** `VALIDATED`
