/**
 * Extensibility Manager
 * @module extensibility/extensibility-manager
 */

import { EventEmitter } from 'events';
import { 
  ExtensibilityManager, 
  ExtensionMetadata, 
  ExtensionConfig, 
  ExtensionPoint,
  ExtensionRegistry,
  ExtensionActivationResult,
  ExtensionContext
} from './types';
import { ExtensionRegistryImpl } from './extension-registry';
import { ExtensionStorageFactory } from './extension-storage';

/**
 * Events emitted by the ExtensibilityManagerImpl
 */
export enum ExtensibilityManagerEvents {
  INITIALIZED = 'extensibility:initialized',
  EXTENSION_LOADED = 'extension:loaded',
  EXTENSION_UNLOADED = 'extension:unloaded',
  EXTENSION_POINT_REGISTERED = 'extension-point:registered',
  EXTENSION_POINT_UNREGISTERED = 'extension-point:unregistered',
}

/**
 * Implementation of the ExtensibilityManager interface
 */
export class ExtensibilityManagerImpl implements ExtensibilityManager {
  private registry: ExtensionRegistry;
  private extensionPoints: Map<string, ExtensionPoint<any>>;
  private loadedExtensions: Map<string, any>;
  private events: EventEmitter;
  private storageFactory: ExtensionStorageFactory;
  private logger: any; // This will be from CI/CD & Observability
  private initialized: boolean;

  /**
   * Create a new ExtensibilityManagerImpl
   * @param registry Optional extension registry
   * @param storageFactory Optional extension storage factory
   * @param logger Optional logger
   */
  constructor(
    registry?: ExtensionRegistry,
    storageFactory?: ExtensionStorageFactory,
    logger?: any
  ) {
    this.registry = registry || new ExtensionRegistryImpl();
    this.extensionPoints = new Map();
    this.loadedExtensions = new Map();
    this.events = new EventEmitter();
    this.storageFactory = storageFactory || new ExtensionStorageFactory();
    this.logger = logger || console;
    this.initialized = false;
  }

  /**
   * Initialize the extensibility framework
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize dependencies here
    
    this.initialized = true;
    this.events.emit(ExtensibilityManagerEvents.INITIALIZED);
  }

  /**
   * Get the extension registry
   * @returns The extension registry
   */
  getRegistry(): ExtensionRegistry {
    return this.registry;
  }

  /**
   * Register an extension point
   * @param extensionPoint The extension point to register
   */
  registerExtensionPoint<T>(extensionPoint: ExtensionPoint<T>): void {
    if (this.extensionPoints.has(extensionPoint.id)) {
      throw new Error(`Extension point with ID ${extensionPoint.id} is already registered`);
    }

    this.extensionPoints.set(extensionPoint.id, extensionPoint);
    this.events.emit(ExtensibilityManagerEvents.EXTENSION_POINT_REGISTERED, extensionPoint);
  }

  /**
   * Unregister an extension point
   * @param extensionPointId The extension point ID
   */
  unregisterExtensionPoint(extensionPointId: string): void {
    if (!this.extensionPoints.has(extensionPointId)) {
      throw new Error(`Extension point with ID ${extensionPointId} is not registered`);
    }

    const extensionPoint = this.extensionPoints.get(extensionPointId)!;
    this.extensionPoints.delete(extensionPointId);
    this.events.emit(ExtensibilityManagerEvents.EXTENSION_POINT_UNREGISTERED, extensionPoint);
  }

  /**
   * Get an extension point by ID
   * @param extensionPointId The extension point ID
   * @returns The extension point or undefined if not found
   */
  getExtensionPoint<T>(extensionPointId: string): ExtensionPoint<T> | undefined {
    return this.extensionPoints.get(extensionPointId) as ExtensionPoint<T> | undefined;
  }

  /**
   * Get all extension points
   * @returns Record of extension points
   */
  getExtensionPoints(): Record<string, ExtensionPoint<any>> {
    return Object.fromEntries(this.extensionPoints.entries());
  }

  /**
   * Load an extension
   * @param metadata The extension metadata
   * @param config The extension configuration
   * @returns Promise resolving to the extension activation result
   */
  async loadExtension(
    metadata: ExtensionMetadata,
    config: ExtensionConfig
  ): Promise<ExtensionActivationResult> {
    if (!this.initialized) {
      throw new Error('ExtensibilityManager is not initialized');
    }

    if (this.loadedExtensions.has(metadata.id)) {
      return { success: true, exports: this.loadedExtensions.get(metadata.id) };
    }

    // Register extension with registry if not already registered
    if (!this.registry.hasExtension(metadata.id)) {
      this.registry.register(metadata, config);
    }

    // Skip loading if extension is disabled
    if (!config.enabled) {
      return { success: false, error: 'Extension is disabled' };
    }

    try {
      // Create extension context
      const context: ExtensionContext = {
        metadata,
        config,
        events: new EventEmitter(),
        logger: this.logger,
        storage: this.storageFactory.create(metadata.id),
        api: {}, // Will be populated with system APIs
        extensionPoints: this.getExtensionPoints(),
      };

      // Look for activation function provided by the plugin system
      // This is a placeholder for now, as the plugin system will be
      // implemented separately and integrated with the extensibility framework
      // The plugin system is responsible for loading the actual extension code
      const activationResult: ExtensionActivationResult = {
        success: true,
        exports: {
          // Default exports
          activate: async () => ({ success: true }),
          deactivate: async () => true,
        },
      };

      if (activationResult.success) {
        this.loadedExtensions.set(metadata.id, activationResult.exports);
        this.events.emit(ExtensibilityManagerEvents.EXTENSION_LOADED, metadata, config, activationResult.exports);
      }

      return activationResult;
    } catch (error) {
      this.logger.error(`Failed to load extension ${metadata.id}:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Unload an extension
   * @param extensionId The extension ID
   * @returns Promise resolving to true if the extension was unloaded
   */
  async unloadExtension(extensionId: string): Promise<boolean> {
    if (!this.loadedExtensions.has(extensionId)) {
      return false;
    }

    const extension = this.loadedExtensions.get(extensionId);
    const extensionInfo = this.registry.getExtension(extensionId);

    if (!extensionInfo) {
      return false;
    }

    try {
      // Call deactivate if it exists
      if (extension.deactivate && typeof extension.deactivate === 'function') {
        await extension.deactivate();
      }

      this.loadedExtensions.delete(extensionId);
      this.events.emit(ExtensibilityManagerEvents.EXTENSION_UNLOADED, extensionInfo.metadata);
      return true;
    } catch (error) {
      this.logger.error(`Failed to unload extension ${extensionId}:`, error);
      return false;
    }
  }

  /**
   * Check if an extension is loaded
   * @param extensionId The extension ID
   * @returns Whether the extension is loaded
   */
  isExtensionLoaded(extensionId: string): boolean {
    return this.loadedExtensions.has(extensionId);
  }

  /**
   * Get a loaded extension by ID
   * @param extensionId The extension ID
   * @returns The loaded extension or undefined if not found
   */
  getLoadedExtension(extensionId: string): any {
    return this.loadedExtensions.get(extensionId);
  }

  /**
   * Get all loaded extensions
   * @returns Record of loaded extensions
   */
  getLoadedExtensions(): Record<string, any> {
    return Object.fromEntries(this.loadedExtensions.entries());
  }

  /**
   * Subscribe to extensibility manager events
   * @param event The event to subscribe to
   * @param listener The event listener
   */
  on(event: ExtensibilityManagerEvents, listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  /**
   * Unsubscribe from extensibility manager events
   * @param event The event to unsubscribe from
   * @param listener The event listener
   */
  off(event: ExtensibilityManagerEvents, listener: (...args: any[]) => void): void {
    this.events.off(event, listener);
  }
}