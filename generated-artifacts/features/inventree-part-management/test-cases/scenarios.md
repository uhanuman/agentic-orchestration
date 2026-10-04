# Test Scenarios Specification: Part & Part Category Lifecycle Management

**Parent Requirement:** [`REQ-INVENTREE-PART-001`](../req/REQ-INVENTREE-PART-001.md)  
**Feature:** Part & Part Category Lifecycle Management (`inventree-part-management`)  
**Quality Gate Target:** `GATE-TEST-DESIGN-001`  
**Pyramid Distribution:** API: 19 (79.2%) | Database: 3 (12.5%) | UI: 2 (8.3%)  

---

## 1. Test Pyramid Distribution Overview

```
                 / \
                / UI\          Apex (8.3%): 2 Scenarios (E2E Journeys)
               /-----\
              /  DB   \        Integration (12.5%): 3 Scenarios (Referential Locks, Cycles)
             /---------\
            /    API    \      Core Bulk (79.2%): 19 Scenarios (Endpoints, Contracts, Auth)
           /-------------\
```

---

## 2. Test Scenarios Register

| Scenario ID | AC Ref | Classification | Target Layer | Priority | Title & Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **`SCN-INVENTREE-001`** | `AC-INVENTREE-001` | `POSITIVE` | `API` | P0 | Create root and nested Part Categories with valid parameters. |
| **`SCN-INVENTREE-002`** | `AC-INVENTREE-001` | `BOUNDARY` | `API` | P1 | Category creation validation constraints and duplicate name rejection. |
| **`SCN-INVENTREE-003`** | `AC-INVENTREE-002` | `POSITIVE` | `API` | P1 | Category list retrieval with parent hierarchy filtering and sorting. |
| **`SCN-INVENTREE-004`** | `AC-INVENTREE-003` | `POSITIVE` | `API` | P1 | Category detail retrieval with accurate pathstring and part count. |
| **`SCN-INVENTREE-005`** | `AC-INVENTREE-003` | `NEGATIVE` | `API` | P2 | Category detail retrieval with non-existent or invalid primary key. |
| **`SCN-INVENTREE-006`** | `AC-INVENTREE-004` | `POSITIVE` | `API` | P1 | Category full replacement update via PUT and pathstring propagation. |
| **`SCN-INVENTREE-007`** | `AC-INVENTREE-004` | `EXCEPTION` | `DATABASE` | P0 | Circular parent category hierarchy rejection (Cycle Prevention). |
| **`SCN-INVENTREE-008`** | `AC-INVENTREE-005` | `POSITIVE` | `API` | P1 | Deletion of empty Part Category with zero child parts and categories. |
| **`SCN-INVENTREE-009`** | `AC-INVENTREE-005` | `EXCEPTION` | `DATABASE` | P0 | Deletion protection for non-empty Part Category containing parts. |
| **`SCN-INVENTREE-010`** | `AC-INVENTREE-006` | `POSITIVE` | `API` | P0 | Create new Part with valid mandatory attributes and unique IPN. |
| **`SCN-INVENTREE-011`** | `AC-INVENTREE-006` | `NEGATIVE` | `API` | P0 | Part creation constraint validation failures (missing fields, duplicate IPN). |
| **`SCN-INVENTREE-012`** | `AC-INVENTREE-007` | `POSITIVE` | `API` | P1 | Part catalogue paginated list retrieval and response envelope. |
| **`SCN-INVENTREE-0013`**| `AC-INVENTREE-007` | `BOUNDARY` | `API` | P2 | Part list pagination boundary and negative parameter handling. |
| **`SCN-INVENTREE-014`** | `AC-INVENTREE-008` | `POSITIVE` | `API` | P1 | Part detail retrieval returning complete entity metadata. |
| **`SCN-INVENTREE-015`** | `AC-INVENTREE-009` | `POSITIVE` | `API` | P1 | Part full replacement update via PUT and boolean defaults. |
| **`SCN-INVENTREE-016`** | `AC-INVENTREE-010` | `POSITIVE` | `API` | P1 | Part partial delta update via PATCH and inactive state toggle. |
| **`SCN-INVENTREE-017`** | `AC-INVENTREE-011` | `EXCEPTION` | `DATABASE` | P0 | Part deletion blocked by active stock or BOM referential constraints. |
| **`SCN-INVENTREE-018`** | `AC-INVENTREE-011` | `POSITIVE` | `API` | P1 | Deletion of clean unreferenced Part entity. |
| **`SCN-INVENTREE-019`** | `AC-INVENTREE-012` | `POSITIVE` | `API` | P0 | Compound multi-facet search and filter conjunction (AND logic). |
| **`SCN-INVENTREE-020`** | `AC-INVENTREE-012` | `BOUNDARY` | `API` | P2 | Search with zero matching results returns empty envelope. |
| **`SCN-INVENTREE-021`** | `AC-INVENTREE-013` | `NEGATIVE` | `API` | P0 | Mutating endpoints reject unauthenticated requests without token. |
| **`SCN-INVENTREE-022`** | `AC-INVENTREE-013` | `NEGATIVE` | `API` | P0 | Mutating endpoints reject invalid or expired tokens. |
| **`SCN-INVENTREE-023`** | `AC-INVENTREE-002` | `E2E` | `UI` | P1 | Category Tree View interactive navigation and list filtering journey. |
| **`SCN-INVENTREE-024`** | `AC-INVENTREE-006` | `E2E` | `UI` | P1 | Create Part modal end-to-end user journey with client validation. |
