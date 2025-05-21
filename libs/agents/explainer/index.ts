export * from './agent';
import { ExplainerAgent } from './agent';

/**
 * Initialize the ExplainerAgent
 */
export async function initExplainerAgent(config: any = {}) {
  const agent = new ExplainerAgent(config.explainer || {});
  await agent.initialize();
  return agent;
}