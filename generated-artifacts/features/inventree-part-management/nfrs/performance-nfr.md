# Performance NFR Test Specification: Part & Part Category Lifecycle Management

**Parent Requirement:** [`REQ-INVENTREE-PART-001`](../req/REQ-INVENTREE-PART-001.md)  
**Agent:** `AGT-PERFORMANCE-001` (Performance NFR Specialist)  
**Quality Gate Target:** `GATE-PERF-001`  
**Target Harness:** `k6` Performance Engineering Harness  

---

## 1. Quantitative SLA & Performance Budgets

| Metric Key | Target Threshold | Test Condition | Enforcement Level |
| :--- | :---: | :--- | :--- |
| **Search p95 Latency** | $\le 2\,000\text{ ms}$ | 100 VUs, 500 RPS on 10,000+ catalogue | `CRITICAL SLA` |
| **Search p99 Latency** | $\le 3\,000\text{ ms}$ | Peak concurrency spikes | `MAJOR SLA` |
| **Read Throughput** | $\ge 750\text{ req/sec}$ | Paginated list retrieval (200 VUs) | `TARGET SLA` |
| **Concurrent Mutation p95** | $\le 1\,000\text{ ms}$ | 50 parallel workers creating categories | `CONCURRENCY SLA` |
| **Memory Growth (Soak)** | $\le 5\%$ | 60-minute continuous 150 RPS load | `STABILITY SLA` |

---

## 2. Performance Test Cases Register

| TC ID | Scenario Ref | Priority | Type | SLA Summary |
| :--- | :--- | :---: | :---: | :--- |
| **`TC-INVENTREE-PERF-001`** | `SCN-INVENTREE-019` | P1 | High Concurrency | Multi-facet search p95 $\le 2\,000\text{ ms}$ and p99 $\le 3\,000\text{ ms}$ at 500 RPS. |
| **`TC-INVENTREE-PERF-002`** | `SCN-INVENTREE-012` | P1 | Throughput Read | Paginated part catalogue read throughput $\ge 750\text{ RPS}$ with p95 $\le 500\text{ ms}$. |
| **`TC-INVENTREE-PERF-003`** | `SCN-INVENTREE-001` | P1 | Concurrency Write | 50 concurrent category creations without deadlock; p95 write latency $\le 1\,000\text{ ms}$. |
| **`TC-INVENTREE-PERF-004`** | `SCN-INVENTREE-019` | P2 | Soak / Stability | 60-minute soak test at 150 RPS ensuring zero memory leak (RSS growth $\le 5\%$). |
