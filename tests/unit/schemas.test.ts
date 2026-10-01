import { describe, it, expect } from 'vitest';
import {
  RequirementArtifactSchema,
  AcceptanceCriteriaArtifactSchema,
  ScenarioArtifactSchema,
  TestCaseArtifactSchema,
  AutomationBlueprintArtifactSchema,
  ReleaseGateRecordSchema,
} from '../../src/core/schemas';

describe('Milestone 1: Zod Schema Validations', () => {
  it('validates a compliant RequirementArtifact', () => {
    const validReq = {
      id: 'REQ-1001',
      version: 1,
      epicId: 'EPIC-AUTH',
      featureName: 'User Authentication',
      title: 'Passwordless Magic Link Login',
      rawText: 'As a user, I want to log in using an email magic link so that I do not need a password.',
      domain: 'Identity & Access Management',
      priority: 'HIGH' as const,
      risksIdentified: [
        {
          riskId: 'RISK-01',
          description: 'Token replay attacks if link lacks expiration',
          severity: 'HIGH' as const,
        },
      ],
      ambiguities: ['Exact token lifespan not specified in story description'],
      dependencies: ['REQ-0990'],
      status: 'APPROVED' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = RequirementArtifactSchema.safeParse(validReq);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid RequirementArtifact with bad ID pattern', () => {
    const invalidReq = {
      id: 'INVALID_ID',
      version: 1,
      epicId: 'EPIC-AUTH',
      featureName: 'User Authentication',
      title: 'Invalid',
      rawText: 'Text',
      domain: 'IAM',
      priority: 'HIGH',
      risksIdentified: [],
      ambiguities: [],
      dependencies: [],
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = RequirementArtifactSchema.safeParse(invalidReq);
    expect(result.success).toBe(false);
  });

  it('validates compliant AcceptanceCriteriaArtifact', () => {
    const validAC = {
      id: 'AC-2001',
      requirementId: 'REQ-1001',
      version: 1,
      given: ['User is on login page', 'Email is registered'],
      when: 'User enters valid email and clicks Send Magic Link',
      then: ['Confirmation screen is shown', 'Email with single-use JWT is dispatched within 5s'],
      businessRules: ['Magic link expires after 15 minutes', 'Link can only be used once'],
      isTestable: true,
      status: 'VALIDATED' as const,
      createdAt: new Date().toISOString(),
    };

    const result = AcceptanceCriteriaArtifactSchema.safeParse(validAC);
    expect(result.success).toBe(true);
  });

  it('validates AutomationBlueprint mandatory cannotAutomateReason when not feasible', () => {
    const infeasibleWithoutReason = {
      id: 'AUT-5001',
      testCaseId: 'TC-4001',
      automationFeasible: false,
      recommendedHarness: 'MANUAL' as const,
      targetComponent: 'HardwareTokenReader',
      codeBlueprint: '// manual verification required',
      assertions: ['Physically verify indicator turns green'],
      executionTimeoutMs: 30000,
      status: 'BLOCKED' as const,
      createdAt: new Date().toISOString(),
    };

    const result = AutomationBlueprintArtifactSchema.safeParse(infeasibleWithoutReason);
    expect(result.success).toBe(false);

    const infeasibleWithReason = {
      ...infeasibleWithoutReason,
      cannotAutomateReason: 'Physical smartcard hardware reader required without mock simulator',
    };
    const result2 = AutomationBlueprintArtifactSchema.safeParse(infeasibleWithReason);
    expect(result2.success).toBe(true);
  });

  it('enforces waiver justification when ReleaseGateRecord is WAIVED_WITH_APPROVAL', () => {
    const waivedWithoutJustification = {
      id: 'REL-8001',
      releaseId: 'REL-v2.4.0',
      version: '2.4.0',
      gateStatus: 'WAIVED_WITH_APPROVAL' as const,
      evaluatedAt: new Date().toISOString(),
    };

    const result = ReleaseGateRecordSchema.safeParse(waivedWithoutJustification);
    expect(result.success).toBe(false);

    const waivedWithJustification = {
      ...waivedWithoutJustification,
      humanApprover: 'Jane Doe (VP of Eng)',
      waiverJustification: 'Non-critical performance deviation approved for hotfix deployment',
    };
    const result2 = ReleaseGateRecordSchema.safeParse(waivedWithJustification);
    expect(result2.success).toBe(true);
  });
});
