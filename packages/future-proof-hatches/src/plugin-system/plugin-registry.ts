/**
 * Plugin Registry
 * @module plugin-system/plugin-registry
 */

import { EventEmitter } from 'events';
import { PluginManifest, PluginModule, PluginRegistry } from './types';

/**
 * Events emitted by the PluginRegistryImpl
 */
export enum PluginRegistryEvents {
  PLUGIN_REGISTERED = 'plugin:registered',
  PLUGIN_UNREGISTERED = 'plugin:unregistered',
}

/**
 * Implementation of the PluginRegistry interface
 */
export class PluginRegistryImpl implements PluginRegistry {
  private plugins: Map<string, { manifest: PluginManifest; module: PluginModule }>;
  private events: EventEmitter;

  /**
   * Create a new PluginRegistryImpl
   */
  constructor() {
    this.plugins = new Map();
    this.events = new EventEmitter();
  }

  /**
   * Register a plugin
   * @param manifest The plugin manifest
   * @param module The plugin module
   */
  register(manifest: PluginManifest, module: PluginModule): void {
    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin with ID ${manifest.id} is already registered`);
    }

    this.plugins.set(manifest.id, { manifest, module });
    this.events.emit(PluginRegistryEvents.PLUGIN_REGISTERED, manifest, module);
  }

  /**
   * Unregister a plugin
   * @param pluginId The plugin ID
   */
  unregister(pluginId: string): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin with ID ${pluginId} is not registered`);
    }

    const plugin = this.plugins.get(pluginId)!;
    this.plugins.delete(pluginId);
    this.events.emit(PluginRegistryEvents.PLUGIN_UNREGISTERED, plugin.manifest);
  }

  /**
   * Get all registered plugins
   * @returns Array of registered plugins
   */
  getPlugins(): Array<{ manifest: PluginManifest; module: PluginModule }> {
    return Array.from(this.plugins.values());
  }

  /**
   * Get a specific plugin by ID
   * @param pluginId The plugin ID
   * @returns The plugin or undefined if not found
   */
  getPlugin(pluginId: string): { manifest: PluginManifest; module: PluginModule } | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Check if a plugin is registered
   * @param pluginId The plugin ID
   * @returns Whether the plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Get plugins by capability
   * @param capability The capability type
   * @param id The capability ID
   * @returns Array of plugins with the specified capability
   */
  getPluginsByCapability(
    capability: 'hook' | 'extension' | 'command' | 'api' | 'ui',
    id: string
  ): Array<{ manifest: PluginManifest; module: PluginModule }> {
    const capabilityMap: Record<string, (manifest: PluginManifest) => string[] | undefined> = {
      hook: (manifest) => manifest.hooks,
      extension: (manifest) => manifest.extensions,
      command: (manifest) => manifest.commands,
      api: (manifest) => manifest.apis,
      ui: (manifest) => manifest.uis,
    };

    const getCapabilities = capabilityMap[capability];
    if (!getCapabilities) {
      throw new Error(`Unknown capability type: ${capability}`);
    }

    return Array.from(this.plugins.values()).filter((plugin) => {
      const capabilities = getCapabilities(plugin.manifest);
      return capabilities && capabilities.includes(id);
    });
  }

  /**
   * Subscribe to registry events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: PluginRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from registry events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: PluginRegistryEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}