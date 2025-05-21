export * from './agent';
import { DeerFlowAgent } from './agent';

/**
 * Initialize the DeerFlowAgent
 * @param config Configuration object for DeerFlow
 */
export async function initDeerFlowAgent(config: any = {}) {
  const agent = new DeerFlowAgent(config.deerFlow || {});
  await agent.initialize();
  return agent;
}