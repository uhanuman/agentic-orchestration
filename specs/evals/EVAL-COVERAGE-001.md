# EVAL-COVERAGE-001: Deterministic Coverage Calculator

## 1. Specification Overview
- **Evaluator ID:** `EVAL-COVERAGE-001`
- **Type:** `DETERMINISTIC`
- **Cost:** 0 LLM Tokens ($0.00 USD)
- **Execution Target:** `RequirementArtifact` and related downstream artifacts
- **Enforcement Level:** MAJOR (Blocker - Bypassable with Human Waiver)

## 2. Objective
Calculate exact mathematical coverage ratios across three distinct tiers of the Traceability DAG without relying on probabilistic model inference.

## 3. Mathematical Equations

### A. Acceptance Criteria to Scenario Coverage
$$\text{AC Coverage} = \frac{|\{ac \in \text{AC}_{req} \mid \exists scn \in \text{SCN}_{req}: scn.acceptanceCriteriaId = ac.id\}|}{|\text{AC}_{req}|}$$
- **Default Passing Threshold:** $1.00$ ($100\%$)

### B. Scenario to Test Case Coverage
$$\text{SCN Coverage} = \frac{|\{scn \in \text{SCN}_{req} \mid \exists tc \in \text{TC}_{req}: tc.scenarioId = scn.id\}|}{|\text{SCN}_{req}|}$$
- **Default Passing Threshold:** $1.00$ ($100\%$)

### C. P0/P1 Automation Coverage
$$\text{AUT Coverage} = \frac{|\{tc \in \text{TC}_{critical} \mid \exists aut \in \text{AUT}: aut.testCaseId = tc.id\}|}{|\text{TC}_{critical}|}$$
- **Default Passing Threshold:** $1.00$ ($100\%$ of P0 and P1 test cases)
