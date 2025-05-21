/**
 * Plugin System Types
 * @module plugin-system/types
 */

import { ExtensionMetadata, ExtensionConfig, ExtensionContext } from '../extensibility/types';

/**
 * Plugin manifest
 */
export interface PluginManifest extends ExtensionMetadata {
  /** Main entry point for the plugin */
  main: string;
  /** Hook implementations provided by the plugin */
  hooks?: string[];
  /** Extensions provided by the plugin */
  extensions?: string[];
  /** Commands provided by the plugin */
  commands?: string[];
  /** APIs provided by the plugin */
  apis?: string[];
  /** UIs provided by the plugin */
  uis?: string[];
  /** Settings schema for the plugin */
  settings?: PluginSettingsSchema;
}

/**
 * Plugin settings schema
 */
export interface PluginSettingsSchema {
  /** Schema type (e.g., json, yaml) */
  type: string;
  /** Schema definition */
  schema: any;
  /** Default values */
  defaults?: Record<string, any>;
}

/**
 * Plugin module
 */
export interface PluginModule {
  /** Activate the plugin */
  activate: (context: ExtensionContext) => Promise<any>;
  /** Deactivate the plugin */
  deactivate: () => Promise<boolean>;
  /** Plugin settings component (if any) */
  settings?: any;
  /** Plugin commands (if any) */
  commands?: Record<string, (...args: any[]) => any>;
  /** Plugin hooks (if any) */
  hooks?: Record<string, (...args: any[]) => any>;
  /** Plugin APIs (if any) */
  apis?: Record<string, any>;
  /** Plugin UI components (if any) */
  ui?: Record<string, any>;
}

/**
 * Plugin loader interface
 */
export interface PluginLoader {
  /** Load a plugin from a directory */
  loadFromDirectory(directory: string): Promise<PluginLoadResult>;
  /** Load a plugin from a package */
  loadFromPackage(packageName: string): Promise<PluginLoadResult>;
  /** Load a plugin from a URL */
  loadFromUrl(url: string): Promise<PluginLoadResult>;
  /** Load a plugin module */
  loadModule(manifest: PluginManifest, modulePath: string): Promise<PluginModule>;
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  /** Whether the plugin was loaded successfully */
  success: boolean;
  /** Error message if loading failed */
  error?: string;
  /** The loaded plugin manifest */
  manifest?: PluginManifest;
  /** The loaded plugin module */
  module?: PluginModule;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  /** Register a plugin */
  register(manifest: PluginManifest, module: PluginModule): void;
  /** Unregister a plugin */
  unregister(pluginId: string): void;
  /** Get all registered plugins */
  getPlugins(): Array<{ manifest: PluginManifest; module: PluginModule }>;
  /** Get a specific plugin by ID */
  getPlugin(pluginId: string): { manifest: PluginManifest; module: PluginModule } | undefined;
  /** Check if a plugin is registered */
  hasPlugin(pluginId: string): boolean;
  /** Get plugins by capability */
  getPluginsByCapability(capability: 'hook' | 'extension' | 'command' | 'api' | 'ui', id: string): Array<{ manifest: PluginManifest; module: PluginModule }>;
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
  /** Initialize the plugin system */
  initialize(): Promise<void>;
  /** Get the plugin registry */
  getRegistry(): PluginRegistry;
  /** Get the plugin loader */
  getLoader(): PluginLoader;
  /** Install a plugin */
  installPlugin(source: string): Promise<PluginLoadResult>;
  /** Uninstall a plugin */
  uninstallPlugin(pluginId: string): Promise<boolean>;
  /** Enable a plugin */
  enablePlugin(pluginId: string): Promise<boolean>;
  /** Disable a plugin */
  disablePlugin(pluginId: string): Promise<boolean>;
  /** Update a plugin */
  updatePlugin(pluginId: string, source?: string): Promise<PluginLoadResult>;
  /** Get plugin settings */
  getPluginSettings(pluginId: string): Promise<Record<string, any>>;
  /** Update plugin settings */
  updatePluginSettings(pluginId: string, settings: Record<string, any>): Promise<void>;
  /** Execute a plugin command */
  executeCommand(pluginId: string, commandId: string, ...args: any[]): Promise<any>;
}