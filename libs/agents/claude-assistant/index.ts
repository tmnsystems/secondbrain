import { verifyReviewerApproval } from '../../../utils/reviewer';

let lastExecTimestamp = 0;
let lastRevTimestamp = 0;
const RATE_LIMIT_MS = 60_000;

/**
 * 🔄 Hard policy: no direct network except allowed channels.
 * Rate-limited and requires reviewer approval.
 */
export async function askExecutorAssistant(prompt: string): Promise<string> {
  const now = Date.now();
  if (now - lastExecTimestamp < RATE_LIMIT_MS) {
    throw new Error('Rate limit exceeded for Executor Assistant');
  }
  lastExecTimestamp = now;
  const approval = await verifyReviewerApproval(`ExecutorAssistant request: ${prompt}`);
  if (!approval.approved) {
    throw new Error('Reviewer approval required to ask Executor Assistant');
  }
  // TODO: Invoke local Claude-Code via approved interface (CLI or HTTP relay)
  throw new Error('askExecutorAssistant not implemented: integrate with local Claude-Code endpoint');
}

/**
 * 🔄 Hard policy: no direct network except allowed channels.
 * Rate-limited and requires reviewer approval.
 */
export async function askReviewerAssistant(prompt: string): Promise<string> {
  const now = Date.now();
  if (now - lastRevTimestamp < RATE_LIMIT_MS) {
    throw new Error('Rate limit exceeded for Reviewer Assistant');
  }
  lastRevTimestamp = now;
  const approval = await verifyReviewerApproval(`ReviewerAssistant request: ${prompt}`);
  if (!approval.approved) {
    throw new Error('Reviewer approval required to ask Reviewer Assistant');
  }
  // TODO: Invoke local Claude-Code via approved interface (CLI or HTTP relay)
  throw new Error('askReviewerAssistant not implemented: integrate with local Claude-Code endpoint');
}