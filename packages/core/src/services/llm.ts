/**
 * LLM service for SecondBrain project
 */

import OpenAI from 'openai';
import { LLMProvider } from '../types';
import { Logger } from './logger';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private logger: Logger;
  public name = 'openai';

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
    this.logger = new Logger('OpenAIProvider');
  }

  async sendMessage(prompt: string, options: any = {}): Promise<string> {
    try {
      const { model = 'gpt-4-1106-preview', temperature = 0.7 } = options;

      this.logger.debug(`Sending message to OpenAI with model: ${model}`);
      
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('Error sending message to OpenAI:', error);
      throw error;
    }
  }

  async getUsage(): Promise<any> {
    // This would require additional API calls to OpenAI's usage endpoints
    // Implementation would depend on OpenAI's API for usage statistics
    return { provider: 'openai', details: 'Usage details not implemented' };
  }
}

// Factory for creating the appropriate LLM provider
export class LLMService {
  static createProvider(type: string, apiKey: string): LLMProvider {
    switch (type.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      default:
        throw new Error(`Unsupported LLM provider: ${type}`);
    }
  }
}