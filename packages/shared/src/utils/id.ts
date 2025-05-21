/**
 * ID utility functions for SecondBrain project
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique ID
 * @returns A unique UUID string
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Generate a task ID with a prefix
 * @param prefix The prefix to use for the task ID
 * @returns A unique task ID with the specified prefix
 */
export function generateTaskId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Generate a timestamp string in ISO format
 * @returns A timestamp string in ISO format
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}