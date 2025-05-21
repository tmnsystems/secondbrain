/**
 * Extension Point
 * @module extensibility/extension-point
 */

import { EventEmitter } from 'events';
import { ExtensionPoint, ExecuteOptions } from './types';

/**
 * Events emitted by the ExtensionPointImpl
 */
export enum ExtensionPointEvents {
  EXTENSION_REGISTERED = 'extension:registered',
  EXTENSION_UNREGISTERED = 'extension:unregistered',
  EXTENSION_EXECUTION_STARTED = 'extension:execution:started',
  EXTENSION_EXECUTION_COMPLETED = 'extension:execution:completed',
  EXTENSION_EXECUTION_ERROR = 'extension:execution:error',
}

/**
 * Implementation of the ExtensionPoint interface
 */
export class ExtensionPointImpl<T> implements ExtensionPoint<T> {
  /** Unique identifier for the extension point */
  public readonly id: string;
  /** Human-readable name of the extension point */
  public readonly name: string;
  /** Description of the extension point */
  public readonly description: string;
  
  private extensions: Map<string, T>;
  private events: EventEmitter;

  /**
   * Create a new ExtensionPointImpl
   * @param id Unique identifier for the extension point
   * @param name Human-readable name of the extension point
   * @param description Description of the extension point
   */
  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.extensions = new Map();
    this.events = new EventEmitter();
  }

  /**
   * Register an extension with this extension point
   * @param extension The extension to register
   * @param extensionId The extension ID
   */
  register(extension: T, extensionId: string): void {
    if (this.extensions.has(extensionId)) {
      throw new Error(`Extension with ID ${extensionId} is already registered with this extension point`);
    }

    this.extensions.set(extensionId, extension);
    this.events.emit(ExtensionPointEvents.EXTENSION_REGISTERED, extensionId, extension);
  }

  /**
   * Unregister an extension from this extension point
   * @param extensionId The extension ID
   */
  unregister(extensionId: string): void {
    if (!this.extensions.has(extensionId)) {
      throw new Error(`Extension with ID ${extensionId} is not registered with this extension point`);
    }

    const extension = this.extensions.get(extensionId)!;
    this.extensions.delete(extensionId);
    this.events.emit(ExtensionPointEvents.EXTENSION_UNREGISTERED, extensionId, extension);
  }

  /**
   * Get all registered extensions
   * @returns Array of registered extensions
   */
  getExtensions(): T[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get a specific extension by ID
   * @param extensionId The extension ID
   * @returns The extension or undefined if not found
   */
  getExtension(extensionId: string): T | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Execute a function with all registered extensions
   * @param callback The function to execute for each extension
   * @param options Execution options
   * @returns Array of results from each extension
   */
  async execute<R>(
    callback: (extension: T) => Promise<R> | R,
    options: ExecuteOptions = {}
  ): Promise<R[]> {
    const {
      parallel = true,
      continueOnError = true,
      timeout = 30000,
      skip = [],
      only = [],
    } = options;

    // Filter extensions
    const extensionEntries = Array.from(this.extensions.entries()).filter(([extensionId]) => {
      if (skip.includes(extensionId)) return false;
      if (only.length > 0 && !only.includes(extensionId)) return false;
      return true;
    });

    // Signal execution start
    this.events.emit(ExtensionPointEvents.EXTENSION_EXECUTION_STARTED, extensionEntries.map(([id]) => id));

    try {
      let results: R[];

      if (parallel) {
        // Execute in parallel with timeout
        const promises = extensionEntries.map(async ([extensionId, extension]) => {
          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Extension ${extensionId} timed out after ${timeout}ms`)), timeout);
            });
            
            const result = await Promise.race([
              Promise.resolve(callback(extension)),
              timeoutPromise
            ]);
            
            this.events.emit(
              ExtensionPointEvents.EXTENSION_EXECUTION_COMPLETED,
              extensionId,
              result
            );
            
            return result;
          } catch (error) {
            this.events.emit(
              ExtensionPointEvents.EXTENSION_EXECUTION_ERROR,
              extensionId,
              error
            );
            
            if (continueOnError) {
              return undefined as unknown as R;
            } else {
              throw error;
            }
          }
        });

        results = await Promise.all(promises);
      } else {
        // Execute sequentially
        results = [];
        
        for (const [extensionId, extension] of extensionEntries) {
          try {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Extension ${extensionId} timed out after ${timeout}ms`)), timeout);
            });
            
            const result = await Promise.race([
              Promise.resolve(callback(extension)),
              timeoutPromise
            ]);
            
            results.push(result);
            
            this.events.emit(
              ExtensionPointEvents.EXTENSION_EXECUTION_COMPLETED,
              extensionId,
              result
            );
          } catch (error) {
            this.events.emit(
              ExtensionPointEvents.EXTENSION_EXECUTION_ERROR,
              extensionId,
              error
            );
            
            if (continueOnError) {
              results.push(undefined as unknown as R);
            } else {
              throw error;
            }
          }
        }
      }

      // Filter out undefined results (from errors with continueOnError=true)
      return results.filter((result): result is R => result !== undefined);
    } catch (error) {
      this.events.emit(
        ExtensionPointEvents.EXTENSION_EXECUTION_ERROR,
        null,
        error
      );
      throw error;
    }
  }

  /**
   * Subscribe to extension point events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: ExtensionPointEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from extension point events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: ExtensionPointEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}