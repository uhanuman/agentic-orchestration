Agents, evals should be of markdown file 

Agent Naming convension:  01.agentname.agent.md


Agent
  │
  ├── receives Context
  │
  ├── consumes Artifact IDs
  │
  ├── performs reasoning
  │
  ├── generates Artifact IDs
  │
  ├── invokes EVAL
  │
  ├── passes Quality Gate
  │
  └── publishes Event



{
  "agentId": "AGT-TEST-DESIGN-001",
  "runId": "RUN-20261001-001",
  "inputArtifacts": [
    "REQ-001",
    "AC-001",
    "AC-002"
  ],
  "outputArtifacts": [
    "SCN-001",
    "SCN-002",
    "TC-001",
    "TC-002"
  ],
  "evaluatorIds": [
    "EVAL-TEST-COVERAGE-001",
    "EVAL-TRACEABILITY-001"
  ],
  "gateIds": [
    "GATE-TEST-DESIGN-001"
  ],
  "nextAgents": [
    "AGT-SECURITY-001",
    "AGT-PERFORMANCE-001",
    "AGT-ACCESSIBILITY-001",
    "AGT-SDET-001"
  ]
}