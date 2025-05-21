/**
 * Plugin Loader
 * @module plugin-system/plugin-loader
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import axios from 'axios';
import { PluginLoader, PluginManifest, PluginModule, PluginLoadResult } from './types';

/**
 * Implementation of the PluginLoader interface
 */
export class PluginLoaderImpl implements PluginLoader {
  private logger: any;
  private basePath: string;

  /**
   * Create a new PluginLoaderImpl
   * @param basePath Base path for plugin resolution
   * @param logger Logger instance
   */
  constructor(basePath: string, logger?: any) {
    this.basePath = basePath;
    this.logger = logger || console;
  }

  /**
   * Load a plugin from a directory
   * @param directory The directory path
   * @returns Promise resolving to the plugin load result
   */
  async loadFromDirectory(directory: string): Promise<PluginLoadResult> {
    try {
      // Resolve directory path
      const dirPath = path.resolve(this.basePath, directory);
      
      // Check if directory exists
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        throw new Error(`Plugin directory does not exist: ${dirPath}`);
      }
      
      // Look for manifest files (plugin.json, plugin.yaml, plugin.yml)
      const manifestPath = this.findManifestFile(dirPath);
      if (!manifestPath) {
        throw new Error(`Plugin manifest not found in directory: ${dirPath}`);
      }
      
      // Parse manifest
      const manifest = await this.parseManifestFile(manifestPath);
      
      // Validate manifest
      this.validateManifest(manifest);
      
      // Load module
      const modulePath = path.resolve(dirPath, manifest.main);
      const module = await this.loadModule(manifest, modulePath);
      
      return {
        success: true,
        manifest,
        module
      };
    } catch (error) {
      this.logger.error(`Failed to load plugin from directory ${directory}:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Load a plugin from a package
   * @param packageName The package name
   * @returns Promise resolving to the plugin load result
   */
  async loadFromPackage(packageName: string): Promise<PluginLoadResult> {
    try {
      // Resolve package path
      const packagePath = this.resolvePackagePath(packageName);
      
      // Load package.json
      const packageJsonPath = path.resolve(packagePath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json not found for package: ${packageName}`);
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Look for plugin manifest in package.json
      if (!packageJson.secondbrainPlugin) {
        throw new Error(`Package does not contain a SecondBrain plugin manifest: ${packageName}`);
      }
      
      // Use the manifest from package.json
      const manifest: PluginManifest = {
        id: packageJson.name,
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description || '',
        author: packageJson.author,
        license: packageJson.license,
        homepage: packageJson.homepage,
        repository: packageJson.repository?.url || packageJson.repository,
        main: packageJson.main || 'index.js',
        ...packageJson.secondbrainPlugin
      };
      
      // Validate manifest
      this.validateManifest(manifest);
      
      // Load module
      const modulePath = require.resolve(packageName);
      const module = await this.loadModule(manifest, modulePath);
      
      return {
        success: true,
        manifest,
        module
      };
    } catch (error) {
      this.logger.error(`Failed to load plugin from package ${packageName}:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Load a plugin from a URL
   * @param url The plugin URL
   * @returns Promise resolving to the plugin load result
   */
  async loadFromUrl(url: string): Promise<PluginLoadResult> {
    try {
      // Download package from URL
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      
      // Create temporary directory
      const tempDir = path.resolve(this.basePath, '.tmp', `plugin-${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Extract package to temporary directory
      // Note: This is a simplified implementation. In a real-world scenario,
      // you would need to handle different package formats (zip, tar.gz, etc.)
      // and extract them appropriately using libraries like unzipper or tar.
      // For this implementation, we'll assume the URL points to a plugin.json file
      
      // Write the downloaded file to disk
      const manifestPath = path.resolve(tempDir, 'plugin.json');
      fs.writeFileSync(manifestPath, Buffer.from(response.data));
      
      // Parse manifest
      const manifest = await this.parseManifestFile(manifestPath);
      
      // Validate manifest
      this.validateManifest(manifest);
      
      // In a real implementation, you would also download the module code here
      // For this example, we'll create a dummy module
      const module: PluginModule = {
        activate: async () => ({ success: true }),
        deactivate: async () => true
      };
      
      return {
        success: true,
        manifest,
        module
      };
    } catch (error) {
      this.logger.error(`Failed to load plugin from URL ${url}:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Load a plugin module
   * @param manifest The plugin manifest
   * @param modulePath The module path
   * @returns Promise resolving to the plugin module
   */
  async loadModule(manifest: PluginManifest, modulePath: string): Promise<PluginModule> {
    try {
      // Check if module exists
      if (!fs.existsSync(modulePath) && !this.isNodeModule(modulePath)) {
        throw new Error(`Plugin module not found: ${modulePath}`);
      }
      
      // Load module
      // Note: In a production environment, you would want to use a sandbox
      // or VM to load untrusted plugin code safely. For simplicity, we're
      // using require() directly here.
      const moduleExports = require(modulePath);
      
      // Validate module
      if (!moduleExports.activate || typeof moduleExports.activate !== 'function') {
        throw new Error(`Plugin module does not export an activate function: ${modulePath}`);
      }
      
      if (!moduleExports.deactivate || typeof moduleExports.deactivate !== 'function') {
        throw new Error(`Plugin module does not export a deactivate function: ${modulePath}`);
      }
      
      return moduleExports as PluginModule;
    } catch (error) {
      this.logger.error(`Failed to load plugin module ${modulePath}:`, error);
      throw error;
    }
  }

  /**
   * Find a plugin manifest file in a directory
   * @param dirPath The directory path
   * @returns The manifest file path or undefined if not found
   */
  private findManifestFile(dirPath: string): string | undefined {
    const manifestFiles = ['plugin.json', 'plugin.yaml', 'plugin.yml'];
    
    for (const file of manifestFiles) {
      const filePath = path.resolve(dirPath, file);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    
    return undefined;
  }

  /**
   * Parse a plugin manifest file
   * @param filePath The manifest file path
   * @returns Promise resolving to the plugin manifest
   */
  private async parseManifestFile(filePath: string): Promise<PluginManifest> {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.json') {
      return JSON.parse(content) as PluginManifest;
    } else if (ext === '.yaml' || ext === '.yml') {
      return yaml.load(content) as PluginManifest;
    } else {
      throw new Error(`Unsupported manifest file format: ${ext}`);
    }
  }

  /**
   * Validate a plugin manifest
   * @param manifest The plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    if (!manifest.id) {
      throw new Error('Plugin manifest is missing id');
    }
    
    if (!manifest.name) {
      throw new Error('Plugin manifest is missing name');
    }
    
    if (!manifest.version) {
      throw new Error('Plugin manifest is missing version');
    }
    
    if (!manifest.description) {
      throw new Error('Plugin manifest is missing description');
    }
    
    if (!manifest.main) {
      throw new Error('Plugin manifest is missing main entry point');
    }
  }

  /**
   * Resolve the path of a Node.js package
   * @param packageName The package name
   * @returns The package path
   */
  private resolvePackagePath(packageName: string): string {
    try {
      // Resolve the package's main file
      const mainFilePath = require.resolve(packageName);
      
      // Get the package directory
      const packageDir = mainFilePath.substring(0, mainFilePath.lastIndexOf('node_modules') + 13 + packageName.length);
      
      return packageDir;
    } catch (error) {
      throw new Error(`Could not resolve package: ${packageName}`);
    }
  }

  /**
   * Check if a path refers to a Node.js module
   * @param modulePath The module path
   * @returns Whether the path refers to a Node.js module
   */
  private isNodeModule(modulePath: string): boolean {
    try {
      require.resolve(modulePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}