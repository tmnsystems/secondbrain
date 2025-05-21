/**
 * Logging service for SecondBrain project
 */

import { LogLevel } from '../types';
import { ConfigService } from './config';

export class Logger {
  private context: string;
  private configService = ConfigService.getInstance();

  constructor(context: string) {
    this.context = context;
  }

  public debug(message: string, ...meta: any[]): void {
    this.log(LogLevel.DEBUG, message, ...meta);
  }

  public info(message: string, ...meta: any[]): void {
    this.log(LogLevel.INFO, message, ...meta);
  }

  public warn(message: string, ...meta: any[]): void {
    this.log(LogLevel.WARN, message, ...meta);
  }

  public error(message: string, ...meta: any[]): void {
    this.log(LogLevel.ERROR, message, ...meta);
  }

  private log(level: LogLevel, message: string, ...meta: any[]): void {
    const config = this.configService.getConfig();
    
    if (level < config.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelString = LogLevel[level];
    const formattedMessage = `[${timestamp}] [${levelString}] [${this.context}] ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, ...meta);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...meta);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...meta);
        break;
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...meta);
        break;
    }
  }
}