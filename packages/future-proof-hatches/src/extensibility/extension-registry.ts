/**
 * Extension Registry
 * @module extensibility/extension-registry
 */

import { EventEmitter } from 'events';
import { ExtensionMetadata, ExtensionConfig, ExtensionRegistry } from './types';

/**
 * Events emitted by the ExtensionRegistryImpl
 */
export enum ExtensionRegistryEvents {
  EXTENSION_REGISTERED = 'extension:registered',
  EXTENSION_UNREGISTERED = 'extension:unregistered',
  EXTENSION_ENABLED = 'extension:enabled',
  EXTENSION_DISABLED = 'extension:disabled',
  EXTENSION_CONFIG_UPDATED = 'extension:config:updated',
}

/**
 * Implementation of the ExtensionRegistry interface
 */
export class ExtensionRegistryImpl implements ExtensionRegistry {
  private extensions: Map<string, { metadata: ExtensionMetadata; config: ExtensionConfig }>;
  private events: EventEmitter;

  /**
   * Create a new ExtensionRegistryImpl
   */
  constructor() {
    this.extensions = new Map();
    this.events = new EventEmitter();
  }

  /**
   * Register an extension
   * @param metadata The extension metadata
   * @param config The extension configuration
   */
  register(metadata: ExtensionMetadata, config: ExtensionConfig): void {
    if (this.extensions.has(metadata.id)) {
      throw new Error(`Extension with ID ${metadata.id} is already registered`);
    }

    this.extensions.set(metadata.id, { metadata, config });
    this.events.emit(ExtensionRegistryEvents.EXTENSION_REGISTERED, metadata, config);
  }

  /**
   * Unregister an extension
   * @param extensionId The extension ID
   */
  unregister(extensionId: string): void {
    if (!this.extensions.has(extensionId)) {
      throw new Error(`Extension with ID ${extensionId} is not registered`);
    }

    const extension = this.extensions.get(extensionId)!;
    this.extensions.delete(extensionId);
    this.events.emit(ExtensionRegistryEvents.EXTENSION_UNREGISTERED, extension.metadata);
  }

  /**
   * Get all registered extensions
   * @returns Array of registered extensions
   */
  getExtensions(): Array<{ metadata: ExtensionMetadata; config: ExtensionConfig }> {
    return Array.from(this.extensions.values());
  }

  /**
   * Get a specific extension by ID
   * @param extensionId The extension ID
   * @returns The extension or undefined if not found
   */
  getExtension(extensionId: string): { metadata: ExtensionMetadata; config: ExtensionConfig } | undefined {
    return this.extensions.get(extensionId);
  }

  /**
   * Check if an extension is registered
   * @param extensionId The extension ID
   * @returns Whether the extension is registered
   */
  hasExtension(extensionId: string): boolean {
    return this.extensions.has(extensionId);
  }

  /**
   * Enable an extension
   * @param extensionId The extension ID
   */
  enableExtension(extensionId: string): void {
    if (!this.extensions.has(extensionId)) {
      throw new Error(`Extension with ID ${extensionId} is not registered`);
    }

    const extension = this.extensions.get(extensionId)!;
    if (extension.config.enabled) {
      return; // Already enabled
    }

    extension.config.enabled = true;
    this.events.emit(ExtensionRegistryEvents.EXTENSION_ENABLED, extension.metadata);
  }

  /**
   * Disable an extension
   * @param extensionId The extension ID
   */
  disableExtension(extensionId: string): void {
    if (!this.extensions.has(extensionId)) {
      throw new Error(`Extension with ID ${extensionId} is not registered`);
    }

    const extension = this.extensions.get(extensionId)!;
    if (!extension.config.enabled) {
      return; // Already disabled
    }

    extension.config.enabled = false;
    this.events.emit(ExtensionRegistryEvents.EXTENSION_DISABLED, extension.metadata);
  }

  /**
   * Update an extension's configuration
   * @param extensionId The extension ID
   * @param config The new configuration (partial)
   */
  updateConfig(extensionId: string, config: Partial<ExtensionConfig>): void {
    if (!this.extensions.has(extensionId)) {
      throw new Error(`Extension with ID ${extensionId} is not registered`);
    }

    const extension = this.extensions.get(extensionId)!;
    const newConfig = { ...extension.config, ...config };
    
    // Update settings object separately to allow for deep merging
    if (config.settings) {
      newConfig.settings = { ...extension.config.settings, ...config.settings };
    }

    extension.config = newConfig;
    this.events.emit(
      ExtensionRegistryEvents.EXTENSION_CONFIG_UPDATED,
      extension.metadata,
      extension.config
    );
  }

  /**
   * Subscribe to registry events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: ExtensionRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from registry events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: ExtensionRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}