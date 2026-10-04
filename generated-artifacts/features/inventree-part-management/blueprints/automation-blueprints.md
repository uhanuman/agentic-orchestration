# SDET Automation Blueprints Register: Part & Part Category Lifecycle Management

**Parent Requirement:** [`REQ-INVENTREE-PART-001`](../req/REQ-INVENTREE-PART-001.md)  
**Agent:** `AGT-SDET-001` (SDET Automation Architect)  
**Quality Gate Target:** `GATE-SDET-001`  
**Total Automation Contracts:** 37 (24 Functional + 13 NFR)  
**Automation Feasibility:** 100% Feasible (37/37 Automated)  

---

## 1. Test Pyramid Harness Distribution

```
                                      / \
                                     /UI \         PLAYWRIGHT_TS (2 Functional)
                                    / AXE \        AXE_A11Y (4 Accessibility)
                                   /-------\
                                  /   K6    \      K6_PERF (4 Performance Load)
                                 /-----------\
                                /   REST_API  \    REST_API (22 Functional + 5 Security)
                               /---------------\
```

| Recommended Harness | Contract Count | Target Execution Layer | Framework Harness Tool |
| :--- | :---: | :--- | :--- |
| **`REST_API`** | **27** | API & Service / Database Contracts | Playwright `APIRequestContext` / Axios / Supertest |
| **`PLAYWRIGHT_TS`** | **2** | Web UI E2E Journeys | Playwright Browser (`Chromium`) |
| **`K6_PERF`** | **4** | Concurrency, SLA & Soak Load Tests | `k6` Performance Engineering Harness |
| **`AXE_A11Y`** | **4** | WCAG 2.1 AA Automated Audits | `@axe-core/playwright` |

---

## 2. Automation Blueprints Master Index

| Blueprint ID | Test Case ID | Priority | Harness | Target Component | Timeout |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **`AUT-INVENTREE-001`** | `TC-INVENTREE-001` | P0 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-002`** | `TC-INVENTREE-002` | P1 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-003`** | `TC-INVENTREE-003` | P1 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-004`** | `TC-INVENTREE-004` | P1 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-005`** | `TC-INVENTREE-005` | P2 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-006`** | `TC-INVENTREE-006` | P1 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-007`** | `TC-INVENTREE-007` | P0 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-008`** | `TC-INVENTREE-008` | P1 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-009`** | `TC-INVENTREE-009` | P0 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-010`** | `TC-INVENTREE-010` | P0 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-011`** | `TC-INVENTREE-011` | P0 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-012`** | `TC-INVENTREE-012` | P1 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-013`** | `TC-INVENTREE-013` | P2 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-014`** | `TC-INVENTREE-014` | P1 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-015`** | `TC-INVENTREE-015` | P1 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-016`** | `TC-INVENTREE-016` | P1 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-017`** | `TC-INVENTREE-017` | P0 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-018`** | `TC-INVENTREE-018` | P1 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-019`** | `TC-INVENTREE-019` | P0 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-020`** | `TC-INVENTREE-020` | P2 | `REST_API` | `PartCatalogueApi` | 5,000 ms |
| **`AUT-INVENTREE-021`** | `TC-INVENTREE-021` | P0 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-022`** | `TC-INVENTREE-022` | P0 | `REST_API` | `PartCategoryApi` | 5,000 ms |
| **`AUT-INVENTREE-023`** | `TC-INVENTREE-023` | P1 | `PLAYWRIGHT_TS` | `PartManagementWebUI` | 30,000 ms |
| **`AUT-INVENTREE-024`** | `TC-INVENTREE-024` | P1 | `PLAYWRIGHT_TS` | `PartManagementWebUI` | 30,000 ms |
| **`AUT-INVENTREE-025`** | `TC-INVENTREE-SEC-001` | P0 | `REST_API` | `InvenTreeApiGateway` | 5,000 ms |
| **`AUT-INVENTREE-026`** | `TC-INVENTREE-SEC-002` | P0 | `REST_API` | `InvenTreeApiGateway` | 5,000 ms |
| **`AUT-INVENTREE-027`** | `TC-INVENTREE-SEC-003` | P1 | `REST_API` | `InvenTreeApiGateway` | 5,000 ms |
| **`AUT-INVENTREE-028`** | `TC-INVENTREE-SEC-004` | P0 | `REST_API` | `InvenTreeApiGateway` | 5,000 ms |
| **`AUT-INVENTREE-029`** | `TC-INVENTREE-SEC-005` | P0 | `REST_API` | `InvenTreeApiGateway` | 5,000 ms |
| **`AUT-INVENTREE-030`** | `TC-INVENTREE-PERF-001` | P1 | `K6_PERF` | `InvenTreeLoadCluster` | 120,000 ms |
| **`AUT-INVENTREE-031`** | `TC-INVENTREE-PERF-002` | P1 | `K6_PERF` | `InvenTreeLoadCluster` | 120,000 ms |
| **`AUT-INVENTREE-032`** | `TC-INVENTREE-PERF-003` | P1 | `K6_PERF` | `InvenTreeLoadCluster` | 120,000 ms |
| **`AUT-INVENTREE-033`** | `TC-INVENTREE-PERF-004` | P2 | `K6_PERF` | `InvenTreeLoadCluster` | 120,000 ms |
| **`AUT-INVENTREE-034`** | `TC-INVENTREE-A11Y-001` | P1 | `AXE_A11Y` | `PartManagementWebUI` | 15,000 ms |
| **`AUT-INVENTREE-035`** | `TC-INVENTREE-A11Y-002` | P1 | `AXE_A11Y` | `PartManagementWebUI` | 15,000 ms |
| **`AUT-INVENTREE-036`** | `TC-INVENTREE-A11Y-003` | P1 | `AXE_A11Y` | `PartManagementWebUI` | 15,000 ms |
| **`AUT-INVENTREE-037`** | `TC-INVENTREE-A11Y-004` | P2 | `AXE_A11Y` | `PartManagementWebUI` | 15,000 ms |

---

## 3. Executable Script Cross-References in Repo 2
- **REST API & Security Automation Suite:** [`../agentic-test-automation/tests/api/inventree-part-management.api.spec.ts`](file:///C:/Users/uhanu/Workspace%20Github/Antigravity/agentic-test-automation/tests/api/inventree-part-management.api.spec.ts)
- **Web UI & Accessibility Automation Suite:** [`../agentic-test-automation/tests/ui/inventree-part-management.ui.spec.ts`](file:///C:/Users/uhanu/Workspace%20Github/Antigravity/agentic-test-automation/tests/ui/inventree-part-management.ui.spec.ts)
