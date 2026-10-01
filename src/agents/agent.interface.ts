/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Agent Workforce Contracts (Section 5 & 6)
 */

import { AgentExecutionLog } from '../core/types';

export interface AgentExecutionResponse<TOutput> {
  output: TOutput;
  log: Partial<AgentExecutionLog>;
}

export interface IAgent<TInput, TOutput> {
  agentId: string;
  agentVersion: string;
  description: string;
  
  execute(input: TInput, correlationId: string): Promise<AgentExecutionResponse<TOutput>>;
}
