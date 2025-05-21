/**
 * Extensibility Framework Types
 * @module extensibility/types
 */

import { EventEmitter } from 'events';

/**
 * Extension metadata
 */
export interface ExtensionMetadata {
  /** Unique identifier for the extension */
  id: string;
  /** Human-readable name of the extension */
  name: string;
  /** Version of the extension (semver format) */
  version: string;
  /** Brief description of the extension */
  description: string;
  /** Author of the extension */
  author?: string;
  /** License of the extension */
  license?: string;
  /** Homepage URL for the extension */
  homepage?: string;
  /** Repository URL for the extension */
  repository?: string;
  /** Tags for categorizing the extension */
  tags?: string[];
  /** Dependencies required by the extension */
  dependencies?: Record<string, string>;
}

/**
 * Extension configuration
 */
export interface ExtensionConfig {
  /** Whether the extension is enabled */
  enabled: boolean;
  /** Extension-specific configuration */
  settings: Record<string, any>;
  /** Priority level for the extension (lower number = higher priority) */
  priority?: number;
  /** Endpoints that this extension provides */
  provides?: string[];
  /** Extensions that this extension depends on */
  requires?: string[];
  /** Extensions that this extension enhances/extends */
  extends?: string[];
  /** Permissions required by the extension */
  permissions?: string[];
}

/**
 * Extension context object passed to extensions
 */
export interface ExtensionContext {
  /** Reference to the extension's metadata */
  metadata: ExtensionMetadata;
  /** Reference to the extension's configuration */
  config: ExtensionConfig;
  /** Event emitter for the extension to communicate with the system */
  events: EventEmitter;
  /** Logger for the extension */
  logger: any; // This will be the logger from the CI-CD & Observability module
  /** Storage for the extension (persistent key-value store) */
  storage: ExtensionStorage;
  /** API for interacting with the system */
  api: Record<string, any>;
  /** Extension point registry */
  extensionPoints: Record<string, ExtensionPoint<any>>;
}

/**
 * Extension storage interface
 */
export interface ExtensionStorage {
  /** Get a value from storage */
  get<T>(key: string): Promise<T | undefined>;
  /** Set a value in storage */
  set<T>(key: string, value: T): Promise<void>;
  /** Delete a value from storage */
  delete(key: string): Promise<void>;
  /** Clear all values from storage */
  clear(): Promise<void>;
  /** Get all keys in storage */
  keys(): Promise<string[]>;
}

/**
 * Extension activation result
 */
export interface ExtensionActivationResult {
  /** Whether the extension was activated successfully */
  success: boolean;
  /** Error message if activation failed */
  error?: string;
  /** Extension exports (functions, objects, etc.) */
  exports?: Record<string, any>;
}

/**
 * Extension point interface
 */
export interface ExtensionPoint<T> {
  /** Unique identifier for the extension point */
  id: string;
  /** Human-readable name of the extension point */
  name: string;
  /** Description of the extension point */
  description: string;
  /** Register an extension with this extension point */
  register(extension: T): void;
  /** Unregister an extension from this extension point */
  unregister(extensionId: string): void;
  /** Get all registered extensions */
  getExtensions(): T[];
  /** Get a specific extension by ID */
  getExtension(extensionId: string): T | undefined;
  /** Execute a function with all registered extensions */
  execute<R>(
    callback: (extension: T) => Promise<R> | R,
    options?: ExecuteOptions
  ): Promise<R[]>;
}

/**
 * Options for executing extension points
 */
export interface ExecuteOptions {
  /** Whether to execute the extensions in parallel (default: true) */
  parallel?: boolean;
  /** Whether to continue execution if an extension fails (default: true) */
  continueOnError?: boolean;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Extensions to skip */
  skip?: string[];
  /** Only execute these extensions */
  only?: string[];
}

/**
 * Extension registry interface
 */
export interface ExtensionRegistry {
  /** Register an extension */
  register(metadata: ExtensionMetadata, config: ExtensionConfig): void;
  /** Unregister an extension */
  unregister(extensionId: string): void;
  /** Get all registered extensions */
  getExtensions(): Array<{ metadata: ExtensionMetadata; config: ExtensionConfig }>;
  /** Get a specific extension by ID */
  getExtension(extensionId: string): { metadata: ExtensionMetadata; config: ExtensionConfig } | undefined;
  /** Check if an extension is registered */
  hasExtension(extensionId: string): boolean;
  /** Enable an extension */
  enableExtension(extensionId: string): void;
  /** Disable an extension */
  disableExtension(extensionId: string): void;
  /** Update an extension's configuration */
  updateConfig(extensionId: string, config: Partial<ExtensionConfig>): void;
}

/**
 * Extensibility manager interface
 */
export interface ExtensibilityManager {
  /** Initialize the extensibility framework */
  initialize(): Promise<void>;
  /** Get the extension registry */
  getRegistry(): ExtensionRegistry;
  /** Register an extension point */
  registerExtensionPoint<T>(extensionPoint: ExtensionPoint<T>): void;
  /** Unregister an extension point */
  unregisterExtensionPoint(extensionPointId: string): void;
  /** Get an extension point by ID */
  getExtensionPoint<T>(extensionPointId: string): ExtensionPoint<T> | undefined;
  /** Get all extension points */
  getExtensionPoints(): Record<string, ExtensionPoint<any>>;
  /** Load an extension */
  loadExtension(metadata: ExtensionMetadata, config: ExtensionConfig): Promise<ExtensionActivationResult>;
  /** Unload an extension */
  unloadExtension(extensionId: string): Promise<boolean>;
  /** Check if an extension is loaded */
  isExtensionLoaded(extensionId: string): boolean;
  /** Get a loaded extension by ID */
  getLoadedExtension(extensionId: string): any;
  /** Get all loaded extensions */
  getLoadedExtensions(): Record<string, any>;
}