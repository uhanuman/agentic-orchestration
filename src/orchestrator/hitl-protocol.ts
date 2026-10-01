/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Human-in-the-Loop (HITL) Governance Protocol (Section 9)
 */

import { IContextStore } from '../core/context-store';
import { ReleaseGateRecord, RequirementArtifact } from '../core/types';
import { HumanWaiver } from '../eval/evaluator.interface';

export interface AmbiguityClarificationTicket {
  ticketId: string;
  requirementId: string;
  ambiguities: string[];
  suggestedClarifications: string[];
  status: 'PENDING_PO_RESPONSE' | 'RESOLVED';
  productOwnerResponse?: string;
  createdAt: string;
  resolvedAt?: string;
}

export class HITLGovernanceProtocol {
  constructor(private contextStore: IContextStore) {}

  /**
   * Generates a structured clarification ticket for the Product Owner when ambiguity is detected
   */
  public createAmbiguityTicket(
    requirementId: string,
    ambiguities: string[]
  ): AmbiguityClarificationTicket {
    return {
      ticketId: `TICKET-AMB-${Date.now()}`,
      requirementId,
      ambiguities,
      suggestedClarifications: ambiguities.map(
        a => `Please specify acceptable parameter boundaries and timeout values for: ${a}`
      ),
      status: 'PENDING_PO_RESPONSE',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Resolves ambiguity ticket with human input and updates Requirement text in Context Store
   */
  public async resolveAmbiguityTicket(
    ticket: AmbiguityClarificationTicket,
    poResponse: string
  ): Promise<AmbiguityClarificationTicket> {
    ticket.status = 'RESOLVED';
    ticket.productOwnerResponse = poResponse;
    ticket.resolvedAt = new Date().toISOString();

    const req = await this.contextStore.getArtifact<RequirementArtifact>('REQ', ticket.requirementId);
    if (req) {
      req.rawText = `${req.rawText}\n\n[PO Clarification]: ${poResponse}`;
      req.ambiguities = [];
      req.updatedAt = new Date().toISOString();
      await this.contextStore.saveArtifact('REQ', req);
    }

    return ticket;
  }

  /**
   * Create an immutable signed Human Waiver for Major Quality Gates
   */
  public createSignedWaiver(
    approverName: string,
    justification: string
  ): HumanWaiver {
    if (!approverName || approverName.trim().length === 0) {
      throw new Error('HITL Waiver error: approverName is mandatory.');
    }
    if (!justification || justification.trim().length === 0) {
      throw new Error('HITL Waiver error: justification is mandatory.');
    }

    return {
      humanApprover: approverName.trim(),
      waiverJustification: justification.trim(),
      approvedAt: new Date().toISOString(),
    };
  }

  /**
   * Record human release deployment authorization
   */
  public async createReleaseGateRecord(params: {
    releaseId: string;
    version: string;
    gateStatus: 'PASSED' | 'FAILED' | 'WAIVED_WITH_APPROVAL';
    blockingReason?: string;
    humanApprover?: string;
    waiverJustification?: string;
  }): Promise<ReleaseGateRecord> {
    const record: ReleaseGateRecord = {
      id: `REL-${Date.now().toString().slice(-4)}`,
      releaseId: params.releaseId,
      version: params.version,
      gateStatus: params.gateStatus,
      blockingReason: params.blockingReason,
      humanApprover: params.humanApprover,
      waiverJustification: params.waiverJustification,
      evaluatedAt: new Date().toISOString(),
    };

    await this.contextStore.saveArtifact('REL', record);
    return record;
  }
}
