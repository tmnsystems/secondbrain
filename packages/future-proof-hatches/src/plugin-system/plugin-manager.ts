/**
 * Plugin Manager
 * @module plugin-system/plugin-manager
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import {
  PluginManager,
  PluginRegistry,
  PluginLoader,
  PluginManifest,
  PluginModule,
  PluginLoadResult
} from './types';
import { PluginRegistryImpl } from './plugin-registry';
import { PluginLoaderImpl } from './plugin-loader';
import { ExtensibilityManager, ExtensionContext } from '../extensibility/types';

/**
 * Events emitted by the PluginManagerImpl
 */
export enum PluginManagerEvents {
  INITIALIZED = 'plugin-system:initialized',
  PLUGIN_INSTALLED = 'plugin:installed',
  PLUGIN_UNINSTALLED = 'plugin:uninstalled',
  PLUGIN_ENABLED = 'plugin:enabled',
  PLUGIN_DISABLED = 'plugin:disabled',
  PLUGIN_UPDATED = 'plugin:updated',
  PLUGIN_SETTINGS_UPDATED = 'plugin:settings:updated',
  PLUGIN_COMMAND_EXECUTED = 'plugin:command:executed',
}

/**
 * Implementation of the PluginManager interface
 */
export class PluginManagerImpl implements PluginManager {
  private registry: PluginRegistry;
  private loader: PluginLoader;
  private extensibilityManager: ExtensibilityManager;
  private events: EventEmitter;
  private logger: any; // This will be from CI/CD & Observability
  private pluginsDir: string;
  private settingsDir: string;
  private initialized: boolean;
  private settings: Map<string, Record<string, any>>;

  /**
   * Create a new PluginManagerImpl
   * @param extensibilityManager The extensibility manager
   * @param registry Optional plugin registry
   * @param loader Optional plugin loader
   * @param options Optional configuration options
   */
  constructor(
    extensibilityManager: ExtensibilityManager,
    registry?: PluginRegistry,
    loader?: PluginLoader,
    options: {
      pluginsDir?: string;
      settingsDir?: string;
      logger?: any;
    } = {}
  ) {
    this.extensibilityManager = extensibilityManager;
    this.registry = registry || new PluginRegistryImpl();
    this.pluginsDir = options.pluginsDir || path.resolve(process.cwd(), 'plugins');
    this.settingsDir = options.settingsDir || path.resolve(process.cwd(), 'settings');
    this.logger = options.logger || console;
    this.loader = loader || new PluginLoaderImpl(this.pluginsDir, this.logger);
    this.events = new EventEmitter();
    this.initialized = false;
    this.settings = new Map();
  }

  /**
   * Initialize the plugin system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Ensure directories exist
    fs.mkdirSync(this.pluginsDir, { recursive: true });
    fs.mkdirSync(this.settingsDir, { recursive: true });

    // Load plugin settings
    await this.loadAllPluginSettings();

    // Discover and load plugins from the plugins directory
    await this.discoverPlugins();

    this.initialized = true;
    this.events.emit(PluginManagerEvents.INITIALIZED);
  }

  /**
   * Get the plugin registry
   * @returns The plugin registry
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }

  /**
   * Get the plugin loader
   * @returns The plugin loader
   */
  getLoader(): PluginLoader {
    return this.loader;
  }

  /**
   * Install a plugin
   * @param source The plugin source (path, package name, or URL)
   * @returns Promise resolving to the plugin load result
   */
  async installPlugin(source: string): Promise<PluginLoadResult> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    let result: PluginLoadResult;

    // Determine the source type and load the plugin
    if (source.startsWith('http://') || source.startsWith('https://')) {
      // Load from URL
      result = await this.loader.loadFromUrl(source);
    } else if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
      // Load from directory
      result = await this.loader.loadFromDirectory(source);
    } else {
      // Load from package
      result = await this.loader.loadFromPackage(source);
    }

    if (!result.success || !result.manifest || !result.module) {
      return result;
    }

    // Register the plugin with the registry
    this.registry.register(result.manifest, result.module);

    // Initialize plugin settings
    if (result.manifest.settings) {
      await this.initializePluginSettings(result.manifest);
    }

    // Create extension context
    const context = await this.createExtensionContext(result.manifest);

    // Activate the plugin
    try {
      await result.module.activate(context);

      // Register with extensibility manager
      await this.registerWithExtensibilityManager(result.manifest, result.module);

      this.events.emit(PluginManagerEvents.PLUGIN_INSTALLED, result.manifest);

      return result;
    } catch (error) {
      this.logger.error(`Failed to activate plugin ${result.manifest.id}:`, error);
      this.registry.unregister(result.manifest.id);
      return {
        success: false,
        error: `Plugin activation failed: ${(error as Error).message}`
      };
    }
  }

  /**
   * Uninstall a plugin
   * @param pluginId The plugin ID
   * @returns Promise resolving to true if the plugin was uninstalled
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    // Check if plugin is registered
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} is not installed`);
    }

    try {
      // Deactivate the plugin
      await plugin.module.deactivate();

      // Unregister from extensibility manager
      await this.unregisterFromExtensibilityManager(pluginId);

      // Unregister from registry
      this.registry.unregister(pluginId);

      // Remove settings
      this.settings.delete(pluginId);
      this.removePluginSettingsFile(pluginId);

      this.events.emit(PluginManagerEvents.PLUGIN_UNINSTALLED, plugin.manifest);

      return true;
    } catch (error) {
      this.logger.error(`Failed to uninstall plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Enable a plugin
   * @param pluginId The plugin ID
   * @returns Promise resolving to true if the plugin was enabled
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} is not installed`);
    }

    // Create extension context
    const context = await this.createExtensionContext(plugin.manifest);

    try {
      // Activate the plugin
      await plugin.module.activate(context);

      // Register with extensibility manager
      await this.registerWithExtensibilityManager(plugin.manifest, plugin.module);

      this.events.emit(PluginManagerEvents.PLUGIN_ENABLED, plugin.manifest);

      return true;
    } catch (error) {
      this.logger.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Disable a plugin
   * @param pluginId The plugin ID
   * @returns Promise resolving to true if the plugin was disabled
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} is not installed`);
    }

    try {
      // Deactivate the plugin
      await plugin.module.deactivate();

      // Unregister from extensibility manager
      await this.unregisterFromExtensibilityManager(pluginId);

      this.events.emit(PluginManagerEvents.PLUGIN_DISABLED, plugin.manifest);

      return true;
    } catch (error) {
      this.logger.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Update a plugin
   * @param pluginId The plugin ID
   * @param source Optional plugin source (path, package name, or URL)
   * @returns Promise resolving to the plugin load result
   */
  async updatePlugin(pluginId: string, source?: string): Promise<PluginLoadResult> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} is not installed`);
    }

    // Disable the plugin
    await this.disablePlugin(pluginId);

    // Unregister from registry
    this.registry.unregister(pluginId);

    // If no source is provided, use the plugin's package name
    const updateSource = source || pluginId;

    // Install the updated plugin
    const result = await this.installPlugin(updateSource);

    if (result.success && result.manifest) {
      this.events.emit(PluginManagerEvents.PLUGIN_UPDATED, result.manifest);
    } else {
      // If update fails, try to restore the original plugin
      try {
        this.registry.register(plugin.manifest, plugin.module);
        await this.enablePlugin(pluginId);
      } catch (error) {
        this.logger.error(`Failed to restore plugin ${pluginId} after failed update:`, error);
      }
    }

    return result;
  }

  /**
   * Get plugin settings
   * @param pluginId The plugin ID
   * @returns Promise resolving to the plugin settings
   */
  async getPluginSettings(pluginId: string): Promise<Record<string, any>> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    if (!this.registry.hasPlugin(pluginId)) {
      throw new Error(`Plugin with ID ${pluginId} is not installed`);
    }

    // If settings are already loaded, return them
    if (this.settings.has(pluginId)) {
      return this.settings.get(pluginId) || {};
    }

    // Otherwise, load settings from file
    return this.loadPluginSettings(pluginId);
  }

  /**
   * Update plugin settings
   * @param pluginId The plugin ID
   * @param settings The updated settings
   * @returns Promise resolving when settings are updated
   */
  async updatePluginSettings(pluginId: string, settings: Record<string, any>): Promise<void> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} is not installed`);
    }

    // Merge with existing settings
    const currentSettings = await this.getPluginSettings(pluginId);
    const newSettings = { ...currentSettings, ...settings };

    // Update in-memory settings
    this.settings.set(pluginId, newSettings);

    // Save to file
    await this.savePluginSettings(pluginId, newSettings);

    this.events.emit(PluginManagerEvents.PLUGIN_SETTINGS_UPDATED, plugin.manifest, newSettings);
  }

  /**
   * Execute a plugin command
   * @param pluginId The plugin ID
   * @param commandId The command ID
   * @param args The command arguments
   * @returns Promise resolving to the command result
   */
  async executeCommand(pluginId: string, commandId: string, ...args: any[]): Promise<any> {
    if (!this.initialized) {
      throw new Error('PluginManager is not initialized');
    }

    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} is not installed`);
    }

    if (!plugin.module.commands || !plugin.module.commands[commandId]) {
      throw new Error(`Command ${commandId} not found in plugin ${pluginId}`);
    }

    try {
      const result = await plugin.module.commands[commandId](...args);
      
      this.events.emit(
        PluginManagerEvents.PLUGIN_COMMAND_EXECUTED,
        plugin.manifest,
        commandId,
        args,
        result
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to execute command ${commandId} of plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Discover and load plugins from the plugins directory
   */
  private async discoverPlugins(): Promise<void> {
    try {
      // Read plugins directory
      const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
      
      // Find plugin directories
      const pluginDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => path.resolve(this.pluginsDir, entry.name));
      
      // Load plugins
      for (const dir of pluginDirs) {
        try {
          await this.installPlugin(dir);
        } catch (error) {
          this.logger.error(`Failed to load plugin from directory ${dir}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Failed to discover plugins:', error);
    }
  }

  /**
   * Create an extension context for a plugin
   * @param manifest The plugin manifest
   * @returns Promise resolving to the extension context
   */
  private async createExtensionContext(manifest: PluginManifest): Promise<ExtensionContext> {
    // Get plugin settings
    const settings = await this.getPluginSettings(manifest.id);
    
    // Create extension context
    return {
      metadata: manifest,
      config: {
        enabled: true,
        settings
      },
      events: new EventEmitter(),
      logger: this.logger,
      storage: {
        async get<T>(key: string): Promise<T | undefined> {
          const settings = await this.getPluginSettings(manifest.id);
          return settings[key] as T;
        },
        async set<T>(key: string, value: T): Promise<void> {
          const settings = await this.getPluginSettings(manifest.id);
          settings[key] = value;
          await this.updatePluginSettings(manifest.id, settings);
        },
        async delete(key: string): Promise<void> {
          const settings = await this.getPluginSettings(manifest.id);
          delete settings[key];
          await this.updatePluginSettings(manifest.id, settings);
        },
        async clear(): Promise<void> {
          await this.updatePluginSettings(manifest.id, {});
        },
        async keys(): Promise<string[]> {
          const settings = await this.getPluginSettings(manifest.id);
          return Object.keys(settings);
        }
      },
      api: {}, // Will be populated with system APIs
      extensionPoints: this.extensibilityManager.getExtensionPoints()
    };
  }

  /**
   * Register a plugin with the extensibility manager
   * @param manifest The plugin manifest
   * @param module The plugin module
   */
  private async registerWithExtensibilityManager(
    manifest: PluginManifest,
    module: PluginModule
  ): Promise<void> {
    // Register with extensibility manager
    await this.extensibilityManager.loadExtension(manifest, {
      enabled: true,
      settings: await this.getPluginSettings(manifest.id)
    });
  }

  /**
   * Unregister a plugin from the extensibility manager
   * @param pluginId The plugin ID
   */
  private async unregisterFromExtensibilityManager(pluginId: string): Promise<void> {
    // Unregister from extensibility manager
    await this.extensibilityManager.unloadExtension(pluginId);
  }

  /**
   * Initialize plugin settings
   * @param manifest The plugin manifest
   */
  private async initializePluginSettings(manifest: PluginManifest): Promise<void> {
    // If settings already exist, don't initialize
    if (this.settings.has(manifest.id)) {
      return;
    }

    // Check if settings file exists
    const settingsFile = this.getPluginSettingsPath(manifest.id);
    if (fs.existsSync(settingsFile)) {
      // Load existing settings
      await this.loadPluginSettings(manifest.id);
      return;
    }

    // Initialize with default settings
    const defaultSettings = manifest.settings?.defaults || {};
    this.settings.set(manifest.id, defaultSettings);
    await this.savePluginSettings(manifest.id, defaultSettings);
  }

  /**
   * Load plugin settings
   * @param pluginId The plugin ID
   * @returns The plugin settings
   */
  private async loadPluginSettings(pluginId: string): Promise<Record<string, any>> {
    const settingsFile = this.getPluginSettingsPath(pluginId);

    try {
      if (!fs.existsSync(settingsFile)) {
        const emptySettings = {};
        this.settings.set(pluginId, emptySettings);
        return emptySettings;
      }

      const content = fs.readFileSync(settingsFile, 'utf8');
      const settings = JSON.parse(content);
      this.settings.set(pluginId, settings);
      return settings;
    } catch (error) {
      this.logger.error(`Failed to load settings for plugin ${pluginId}:`, error);
      const emptySettings = {};
      this.settings.set(pluginId, emptySettings);
      return emptySettings;
    }
  }

  /**
   * Save plugin settings
   * @param pluginId The plugin ID
   * @param settings The plugin settings
   */
  private async savePluginSettings(pluginId: string, settings: Record<string, any>): Promise<void> {
    const settingsFile = this.getPluginSettingsPath(pluginId);

    try {
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(`Failed to save settings for plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Load all plugin settings
   */
  private async loadAllPluginSettings(): Promise<void> {
    try {
      if (!fs.existsSync(this.settingsDir)) {
        return;
      }

      const entries = fs.readdirSync(this.settingsDir, { withFileTypes: true });
      const settingsFiles = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => entry.name);

      for (const file of settingsFiles) {
        const pluginId = file.substring(0, file.length - 5); // Remove .json extension
        await this.loadPluginSettings(pluginId);
      }
    } catch (error) {
      this.logger.error('Failed to load all plugin settings:', error);
    }
  }

  /**
   * Remove plugin settings file
   * @param pluginId The plugin ID
   */
  private removePluginSettingsFile(pluginId: string): void {
    const settingsFile = this.getPluginSettingsPath(pluginId);

    try {
      if (fs.existsSync(settingsFile)) {
        fs.unlinkSync(settingsFile);
      }
    } catch (error) {
      this.logger.error(`Failed to remove settings file for plugin ${pluginId}:`, error);
    }
  }

  /**
   * Get the path to a plugin's settings file
   * @param pluginId The plugin ID
   * @returns The settings file path
   */
  private getPluginSettingsPath(pluginId: string): string {
    return path.resolve(this.settingsDir, `${pluginId}.json`);
  }

  /**
   * Subscribe to plugin manager events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: PluginManagerEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from plugin manager events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: PluginManagerEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}