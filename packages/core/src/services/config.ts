/**
 * Configuration service for SecondBrain project
 */

import { BaseConfig, LogLevel } from '../types';
import dotenv from 'dotenv';

dotenv.config();

export class ConfigService {
  private static instance: ConfigService;
  private config: BaseConfig;

  private constructor() {
    this.config = {
      logLevel: this.parseLogLevel(process.env.LOG_LEVEL),
      environment: this.parseEnvironment(process.env.NODE_ENV)
    };
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getConfig(): BaseConfig {
    return { ...this.config };
  }

  private parseLogLevel(level?: string): LogLevel {
    switch (level?.toLowerCase()) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private parseEnvironment(env?: string): 'development' | 'production' | 'test' {
    switch (env?.toLowerCase()) {
      case 'production':
        return 'production';
      case 'test':
        return 'test';
      default:
        return 'development';
    }
  }
}