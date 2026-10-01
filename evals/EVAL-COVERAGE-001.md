---
id: EVAL-COVERAGE-001
name: Deterministic Coverage Calculator
type: DETERMINISTIC
cost: 0 tokens
severity: MAJOR
---

# EVAL-COVERAGE-001: Deterministic Coverage Calculator

## 1. Objective
Calculate exact mathematical coverage ratios across three distinct tiers of the Traceability DAG without relying on probabilistic model inference.

## 2. Modes & Mathematical Formulas

### A. Acceptance Criteria to Scenario Coverage
$$\text{AC Coverage} = \frac{|\{ac \in \text{AC}_{req} \mid \exists scn \in \text{SCN}_{req}: scn.acceptanceCriteriaId = ac.id\}|}{|\text{AC}_{req}|}$$
- **Default Threshold:** $1.00$ ($100\%$)

### B. Scenario to Test Case Coverage
$$\text{SCN Coverage} = \frac{|\{scn \in \text{SCN}_{req} \mid \exists tc \in \text{TC}_{req}: tc.scenarioId = scn.id\}|}{|\text{SCN}_{req}|}$$
- **Default Threshold:** $1.00$ ($100\%$)

### C. P0/P1 Automation Coverage
$$\text{AUT Coverage} = \frac{|\{tc \in \text{TC}_{critical} \mid \exists aut \in \text{AUT}: aut.testCaseId = tc.id\}|}{|\text{TC}_{critical}|}$$
- **Default Threshold:** $\ge 0.80$ ($80\%$ of P0 and P1 test cases)
