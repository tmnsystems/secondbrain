/**
 * Executor Agent - Core module
 * 
 * Responsible for executing commands, managing deployments, git operations,
 * and other system-level tasks based on plans from the Planner Agent.
 */
import { ExecutorAgent } from './executor';
export { ExecutorAgent } from './executor';
export * from './types';

export default ExecutorAgent;