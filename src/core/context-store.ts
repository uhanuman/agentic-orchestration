/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Shared Context Store & Bidirectional Lineage Graph Implementation
 */

import * as crypto from 'crypto';
import {
  AgentExecutionLog,
  AnyArtifact,
  ArtifactType,
  RequirementArtifact,
  AcceptanceCriteriaArtifact,
  ScenarioArtifact,
  TestCaseArtifact,
  AutomationBlueprintArtifact,
  TestExecutionRecord,
} from './types';
import { SchemaRegistry } from './schemas';

export interface LineageResult {
  ancestors: string[];
  descendants: string[];
}

export interface IContextStore {
  saveArtifact<T extends { id: string }>(artifactType: string, artifact: T): Promise<void>;
  getArtifact<T>(artifactType: string, id: string): Promise<T | null>;
  queryArtifacts<T>(artifactType: string, filter?: Partial<T>): Promise<T[]>;
  getLineage(artifactId: string): Promise<LineageResult>;
  logExecution(log: AgentExecutionLog): Promise<void>;
  getExecutionLogs(correlationId?: string): Promise<AgentExecutionLog[]>;
  getContentHash(content: string): string;
  hasCachedResult(contentHash: string): boolean;
  getCachedResult<T>(contentHash: string): T | null;
  setCachedResult<T>(contentHash: string, data: T): void;
  validateReferentialIntegrity(artifactType: string, artifact: any): Promise<{ valid: boolean; missingIds: string[] }>;
}

export class InMemoryContextStore implements IContextStore {
  // Store artifacts by type, then by id
  private storage: Map<string, Map<string, any>> = new Map();
  // Bidirectional Graph: Parent -> Set of Children
  private downstreamGraph: Map<string, Set<string>> = new Map();
  // Child -> Set of Parents
  private upstreamGraph: Map<string, Set<string>> = new Map();
  // Execution logs
  private executionLogs: AgentExecutionLog[] = [];
  // Content cache for semantic / content hash reuse (Rule 3 in Section 8)
  private cache: Map<string, any> = new Map();

  constructor() {
    this.storage.set('REQ', new Map());
    this.storage.set('AC', new Map());
    this.storage.set('SCN', new Map());
    this.storage.set('TC', new Map());
    this.storage.set('AUT', new Map());
    this.storage.set('TEX', new Map());
    this.storage.set('TRS', new Map());
    this.storage.set('REL', new Map());
    this.storage.set('LOG', new Map());
  }

  public async saveArtifact<T extends { id: string }>(artifactType: string, artifact: T): Promise<void> {
    const typeUpper = artifactType.toUpperCase();
    
    // Schema validation if available
    const schema = SchemaRegistry[typeUpper];
    if (schema) {
      const validation = schema.safeParse(artifact);
      if (!validation.success) {
        throw new Error(
          `Schema validation failed for artifact ${artifact.id} of type ${artifactType}: ${JSON.stringify(validation.error.issues)}`
        );
      }
    }

    let typeMap = this.storage.get(typeUpper);
    if (!typeMap) {
      typeMap = new Map();
      this.storage.set(typeUpper, typeMap);
    }
    typeMap.set(artifact.id, structuredClone(artifact));

    // Update bidirectional traceability graph
    this.indexRelationships(typeUpper, artifact);
  }

  public async getArtifact<T>(artifactType: string, id: string): Promise<T | null> {
    const typeUpper = artifactType.toUpperCase();
    const typeMap = this.storage.get(typeUpper);
    if (!typeMap || !typeMap.has(id)) {
      // Check all collections if artifactType not strictly matched
      for (const map of this.storage.values()) {
        if (map.has(id)) {
          return structuredClone(map.get(id)) as T;
        }
      }
      return null;
    }
    return structuredClone(typeMap.get(id)) as T;
  }

  public async queryArtifacts<T>(artifactType: string, filter?: Partial<T>): Promise<T[]> {
    const typeUpper = artifactType.toUpperCase();
    const typeMap = this.storage.get(typeUpper);
    if (!typeMap) return [];

    const items = Array.from(typeMap.values()) as T[];
    if (!filter || Object.keys(filter).length === 0) {
      return items.map(item => structuredClone(item));
    }

    return items
      .filter(item => {
        for (const [key, value] of Object.entries(filter)) {
          if ((item as any)[key] !== value) {
            return false;
          }
        }
        return true;
      })
      .map(item => structuredClone(item));
  }

  public async getLineage(artifactId: string): Promise<LineageResult> {
    const ancestors = new Set<string>();
    const descendants = new Set<string>();

    // Traverse ancestors (upward)
    const traverseAncestors = (currId: string) => {
      const parents = this.upstreamGraph.get(currId);
      if (parents) {
        for (const p of parents) {
          if (!ancestors.has(p)) {
            ancestors.add(p);
            traverseAncestors(p);
          }
        }
      }
    };

    // Traverse descendants (downward)
    const traverseDescendants = (currId: string) => {
      const children = this.downstreamGraph.get(currId);
      if (children) {
        for (const c of children) {
          if (!descendants.has(c)) {
            descendants.add(c);
            traverseDescendants(c);
          }
        }
      }
    };

    traverseAncestors(artifactId);
    traverseDescendants(artifactId);

    return {
      ancestors: Array.from(ancestors),
      descendants: Array.from(descendants),
    };
  }

  public async logExecution(log: AgentExecutionLog): Promise<void> {
    const validation = SchemaRegistry['LOG'].safeParse(log);
    if (!validation.success) {
      throw new Error(`Invalid AgentExecutionLog schema: ${JSON.stringify(validation.error.issues)}`);
    }
    this.executionLogs.push(structuredClone(log));
    const logMap = this.storage.get('LOG')!;
    logMap.set(log.runId, structuredClone(log));
  }

  public async getExecutionLogs(correlationId?: string): Promise<AgentExecutionLog[]> {
    if (!correlationId) {
      return structuredClone(this.executionLogs);
    }
    return this.executionLogs
      .filter(log => log.correlationId === correlationId)
      .map(log => structuredClone(log));
  }

  public getContentHash(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  public hasCachedResult(contentHash: string): boolean {
    return this.cache.has(contentHash);
  }

  public getCachedResult<T>(contentHash: string): T | null {
    if (!this.cache.has(contentHash)) return null;
    return structuredClone(this.cache.get(contentHash));
  }

  public setCachedResult<T>(contentHash: string, data: T): void {
    this.cache.set(contentHash, structuredClone(data));
  }

  public async validateReferentialIntegrity(
    artifactType: string,
    artifact: any
  ): Promise<{ valid: boolean; missingIds: string[] }> {
    const missing: string[] = [];
    const typeUpper = artifactType.toUpperCase();

    if (typeUpper === 'AC') {
      const parentId = (artifact as AcceptanceCriteriaArtifact).requirementId;
      const parent = await this.getArtifact('REQ', parentId);
      if (!parent) missing.push(parentId);
    } else if (typeUpper === 'SCN') {
      const scn = artifact as ScenarioArtifact;
      const req = await this.getArtifact('REQ', scn.requirementId);
      if (!req) missing.push(scn.requirementId);
      const ac = await this.getArtifact('AC', scn.acceptanceCriteriaId);
      if (!ac) missing.push(scn.acceptanceCriteriaId);
    } else if (typeUpper === 'TC') {
      const tc = artifact as TestCaseArtifact;
      const req = await this.getArtifact('REQ', tc.requirementId);
      if (!req) missing.push(tc.requirementId);
      const ac = await this.getArtifact('AC', tc.acceptanceCriteriaId);
      if (!ac) missing.push(tc.acceptanceCriteriaId);
      const scn = await this.getArtifact('SCN', tc.scenarioId);
      if (!scn) missing.push(tc.scenarioId);
    } else if (typeUpper === 'AUT') {
      const aut = artifact as AutomationBlueprintArtifact;
      const tc = await this.getArtifact('TC', aut.testCaseId);
      if (!tc) missing.push(aut.testCaseId);
    } else if (typeUpper === 'TEX') {
      const tex = artifact as TestExecutionRecord;
      const tc = await this.getArtifact('TC', tex.testCaseId);
      if (!tc) missing.push(tex.testCaseId);
      if (tex.automationId) {
        const aut = await this.getArtifact('AUT', tex.automationId);
        if (!aut) missing.push(tex.automationId);
      }
    }

    return {
      valid: missing.length === 0,
      missingIds: missing,
    };
  }

  private indexRelationships(artifactType: string, artifact: any): void {
    const childId = artifact.id;
    const parentIds: string[] = [];

    if (artifactType === 'AC') {
      if (artifact.requirementId) parentIds.push(artifact.requirementId);
    } else if (artifactType === 'SCN') {
      if (artifact.requirementId) parentIds.push(artifact.requirementId);
      if (artifact.acceptanceCriteriaId) parentIds.push(artifact.acceptanceCriteriaId);
    } else if (artifactType === 'TC') {
      if (artifact.requirementId) parentIds.push(artifact.requirementId);
      if (artifact.acceptanceCriteriaId) parentIds.push(artifact.acceptanceCriteriaId);
      if (artifact.scenarioId) parentIds.push(artifact.scenarioId);
    } else if (artifactType === 'AUT') {
      if (artifact.testCaseId) parentIds.push(artifact.testCaseId);
    } else if (artifactType === 'TEX') {
      if (artifact.testCaseId) parentIds.push(artifact.testCaseId);
      if (artifact.automationId) parentIds.push(artifact.automationId);
    }

    for (const parentId of parentIds) {
      // Upstream: child -> parent
      if (!this.upstreamGraph.has(childId)) {
        this.upstreamGraph.set(childId, new Set());
      }
      this.upstreamGraph.get(childId)!.add(parentId);

      // Downstream: parent -> child
      if (!this.downstreamGraph.has(parentId)) {
        this.downstreamGraph.set(parentId, new Set());
      }
      this.downstreamGraph.get(parentId)!.add(childId);
    }
  }

  public clear(): void {
    for (const map of this.storage.values()) {
      map.clear();
    }
    this.downstreamGraph.clear();
    this.upstreamGraph.clear();
    this.executionLogs = [];
    this.cache.clear();
  }
}
