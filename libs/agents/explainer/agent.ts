import { Configuration as OpenAIConfig, OpenAIApi } from 'openai';
import { AbstractAgent } from '../../common/agent';
import { Task, TaskResult } from '../../common/types';
import { openaiConfig } from '../common/config';

/**
 * ExplainerAgent - Provides detailed explanations using OpenAI 4o model
 */
export class ExplainerAgent extends AbstractAgent {
  private openai: OpenAIApi;

  constructor(config: Record<string, any> = {}) {
    super('explainer', config);
    // Initialize OpenAI client
    const cfg = new OpenAIConfig({ apiKey: openaiConfig.apiKey });
    this.openai = new OpenAIApi(cfg);
  }

  /**
   * Returns capabilities provided by ExplainerAgent
   */
  getCapabilities() {
    return [{ name: 'explanation', description: 'Provides detailed, step-by-step explanations' }];
  }

  /**
   * Execute a task: generate explanation for the given description
   */
  async performTask(task: Task): Promise<any> {
    this.logger.info(`ExplainerAgent: generating explanation for task ${task.id}`);
    const prompt = `You are an expert explainer. Provide a detailed, step-by-step explanation for the following request: ${task.description}`;
    const res = await this.openai.createChatCompletion({
      model: openaiConfig.explainerModel,
      messages: [
        { role: 'system', content: 'You provide clear, thorough explanations.' },
        { role: 'user', content: prompt }
      ]
    });
    const content = res.data.choices?.[0]?.message?.content || '';
    return content.trim();
  }
}