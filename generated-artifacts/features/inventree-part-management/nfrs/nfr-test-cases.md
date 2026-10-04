# Non-Functional Requirements (NFR) Test Register: Part & Part Category Lifecycle Management

**Parent Requirement:** [`REQ-INVENTREE-PART-001`](../req/REQ-INVENTREE-PART-001.md)  
**Feature:** Part & Part Category Lifecycle Management (`inventree-part-management`)  
**Quality Gates Enforced:** `GATE-SEC-001`, `GATE-PERF-001`, `GATE-A11Y-001`  
**Total NFR Test Cases:** 13 (5 Security, 4 Performance, 4 Accessibility)  

---

## 1. NFR Specialization Breakdown

```
                       ┌──────────────────────────────┐
                       │  NFR Specialist Workforce    │
                       └──────────────┬───────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
      [Security NFR]          [Performance NFR]       [Accessibility NFR]
     AGT-SECURITY-001       AGT-PERFORMANCE-001       AGT-ACCESSIBILITY-001
      5 Test Cases             4 Test Cases              4 Test Cases
     OWASP API Top 10       Latency & Soak SLAs        WCAG 2.1 Level AA
```

---

## 2. NFR Test Cases Master Register

| TC ID | Domain | Scenario Ref | Priority | Standard / Metric | Summary |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`TC-INVENTREE-SEC-001`** | `SECURITY` | `SCN-INVENTREE-021` | P0 | BFLA / AuthZ | Read-only API tokens blocked from mutating Part/Category endpoints (HTTP 403 Forbidden). |
| **`TC-INVENTREE-SEC-002`** | `SECURITY` | `SCN-INVENTREE-014` | P0 | BOLA / IDOR | Horizontal authorization barrier prevents accessing or tampering cross-tenant part records. |
| **`TC-INVENTREE-SEC-003`** | `SECURITY` | `SCN-INVENTREE-010` | P1 | Stored XSS | Script injection payloads in part name/description are sanitized without DOM script execution. |
| **`TC-INVENTREE-SEC-004`** | `SECURITY` | `SCN-INVENTREE-011` | P0 | SQL / ORM Injection | Malicious SQL probes in search queries and IPN fields are parameterized with zero syntax errors. |
| **`TC-INVENTREE-SEC-005`** | `SECURITY` | `SCN-INVENTREE-022` | P0 | Token Security | Forged auth schemes rejected with 401; query param tokens disallowed; zero stack traces exposed. |
| **`TC-INVENTREE-PERF-001`**| `PERFORMANCE`| `SCN-INVENTREE-019` | P1 | Concurrency SLA | Multi-facet search p95 $\le 2\,000\text{ ms}$ and p99 $\le 3\,000\text{ ms}$ at 500 RPS (100 VUs). |
| **`TC-INVENTREE-PERF-002`**| `PERFORMANCE`| `SCN-INVENTREE-012` | P1 | Throughput SLA | Paginated part catalogue read throughput $\ge 750\text{ RPS}$ with p95 $\le 500\text{ ms}$ (200 VUs). |
| **`TC-INVENTREE-PERF-003`**| `PERFORMANCE`| `SCN-INVENTREE-001` | P1 | Concurrency Write | 50 concurrent category creations without deadlock; p95 write latency $\le 1\,000\text{ ms}$. |
| **`TC-INVENTREE-PERF-004`**| `PERFORMANCE`| `SCN-INVENTREE-019` | P2 | Soak SLA | 60-minute soak test at 150 RPS ensuring zero memory leak (RSS growth $\le 5\%$). |
| **`TC-INVENTREE-A11Y-001`**| `ACCESSIBILITY`| `SCN-INVENTREE-023` | P1 | WCAG 2.1.1 / 2.4.7 | Category Tree View full keyboard navigation, roving tabindex, and visible focus outline. |
| **`TC-INVENTREE-A11Y-002`**| `ACCESSIBILITY`| `SCN-INVENTREE-024` | P1 | WCAG 2.1.2 / 2.4.3 | Create Part modal focus containment, `role="dialog"`, and `Escape` key focus restoration. |
| **`TC-INVENTREE-A11Y-003`**| `ACCESSIBILITY`| `SCN-INVENTREE-024` | P1 | Automated Axe-Core | Automated Axe-core sweep asserting zero critical/serious violations across Part views. |
| **`TC-INVENTREE-A11Y-004`**| `ACCESSIBILITY`| `SCN-INVENTREE-024` | P2 | WCAG 4.1.3 / 3.3.1 | Screen reader announcements (`aria-live="assertive"`) on client-side form validation errors. |
