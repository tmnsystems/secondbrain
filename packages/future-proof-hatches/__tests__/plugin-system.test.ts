/**
 * Tests for Plugin System
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  PluginRegistryImpl,
  PluginLoaderImpl,
  PluginManagerImpl,
  PluginManifest,
  PluginModule,
  PluginRegistryEvents,
  PluginManagerEvents
} from '../src/plugin-system';
import { ExtensibilityManagerImpl } from '../src/extensibility';

// Mock the extensibility manager
jest.mock('../src/extensibility', () => {
  const original = jest.requireActual('../src/extensibility');
  return {
    ...original,
    ExtensibilityManagerImpl: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      getRegistry: jest.fn().mockReturnValue({
        register: jest.fn(),
        unregister: jest.fn(),
        hasExtension: jest.fn().mockReturnValue(false),
        getExtension: jest.fn(),
        getExtensions: jest.fn().mockReturnValue([]),
        enableExtension: jest.fn(),
        disableExtension: jest.fn(),
        updateConfig: jest.fn()
      }),
      registerExtensionPoint: jest.fn(),
      unregisterExtensionPoint: jest.fn(),
      getExtensionPoint: jest.fn(),
      getExtensionPoints: jest.fn().mockReturnValue({}),
      loadExtension: jest.fn().mockResolvedValue({ success: true }),
      unloadExtension: jest.fn().mockResolvedValue(true),
      isExtensionLoaded: jest.fn().mockReturnValue(false),
      getLoadedExtension: jest.fn(),
      getLoadedExtensions: jest.fn().mockReturnValue({})
    }))
  };
});

// Mock fs and path
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{"id":"test-plugin","name":"Test Plugin","version":"1.0.0","description":"A test plugin","main":"index.js"}'),
  writeFileSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    isDirectory: jest.fn().mockReturnValue(true)
  }),
  readdirSync: jest.fn().mockReturnValue([
    { name: 'test-plugin', isDirectory: () => true }
  ]),
  unlinkSync: jest.fn()
}));

// Mock require
jest.mock('require', () => {
  return jest.fn().mockReturnValue({
    activate: jest.fn().mockResolvedValue({ success: true }),
    deactivate: jest.fn().mockResolvedValue(true)
  });
});

describe('Plugin System', () => {
  describe('PluginRegistry', () => {
    let registry: PluginRegistryImpl;
    let manifest: PluginManifest;
    let module: PluginModule;

    beforeEach(() => {
      registry = new PluginRegistryImpl();
      manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        main: 'index.js'
      };
      module = {
        activate: jest.fn().mockResolvedValue({ success: true }),
        deactivate: jest.fn().mockResolvedValue(true)
      };
    });

    test('register and getPlugin', () => {
      registry.register(manifest, module);
      const plugin = registry.getPlugin(manifest.id);
      expect(plugin).toBeDefined();
      expect(plugin?.manifest).toEqual(manifest);
      expect(plugin?.module).toEqual(module);
    });

    test('hasPlugin', () => {
      expect(registry.hasPlugin(manifest.id)).toBe(false);
      registry.register(manifest, module);
      expect(registry.hasPlugin(manifest.id)).toBe(true);
    });

    test('getPlugins', () => {
      registry.register(manifest, module);
      const plugins = registry.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].manifest).toEqual(manifest);
      expect(plugins[0].module).toEqual(module);
    });

    test('unregister', () => {
      registry.register(manifest, module);
      registry.unregister(manifest.id);
      expect(registry.hasPlugin(manifest.id)).toBe(false);
    });

    test('getPluginsByCapability', () => {
      const manifestWithCapabilities = {
        ...manifest,
        hooks: ['test-hook']
      };
      registry.register(manifestWithCapabilities, module);
      const plugins = registry.getPluginsByCapability('hook', 'test-hook');
      expect(plugins).toHaveLength(1);
      expect(plugins[0].manifest).toEqual(manifestWithCapabilities);
    });
  });

  describe('PluginLoader', () => {
    let loader: PluginLoaderImpl;
    
    beforeEach(() => {
      loader = new PluginLoaderImpl('plugins');
      
      // Mock the loadModule method
      (loader as any).loadModule = jest.fn().mockResolvedValue({
        activate: jest.fn().mockResolvedValue({ success: true }),
        deactivate: jest.fn().mockResolvedValue(true)
      });
      
      // Mock the validateManifest method
      (loader as any).validateManifest = jest.fn();
    });
    
    test('loadFromDirectory', async () => {
      // Mock findManifestFile and parseManifestFile
      (loader as any).findManifestFile = jest.fn().mockReturnValue('plugins/test-plugin/plugin.json');
      (loader as any).parseManifestFile = jest.fn().mockResolvedValue({
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        main: 'index.js'
      });
      
      const result = await loader.loadFromDirectory('test-plugin');
      
      expect(result.success).toBe(true);
      expect(result.manifest).toBeDefined();
      expect(result.module).toBeDefined();
    });
    
    test('loadFromPackage', async () => {
      // Mock resolvePackagePath
      (loader as any).resolvePackagePath = jest.fn().mockReturnValue('node_modules/test-plugin');
      
      // Mock require.resolve
      (global as any).require.resolve = jest.fn().mockReturnValue('node_modules/test-plugin/index.js');
      
      const result = await loader.loadFromPackage('test-plugin');
      
      expect(result.success).toBe(true);
      expect(result.manifest).toBeDefined();
      expect(result.module).toBeDefined();
    });
  });

  describe('PluginManager', () => {
    let manager: PluginManagerImpl;
    let extensibilityManager: ExtensibilityManagerImpl;
    let registry: PluginRegistryImpl;
    let loader: PluginLoaderImpl;
    
    beforeEach(() => {
      extensibilityManager = new ExtensibilityManagerImpl();
      registry = new PluginRegistryImpl();
      
      // Mock the loader
      loader = new PluginLoaderImpl('plugins');
      (loader as any).loadFromDirectory = jest.fn().mockResolvedValue({
        success: true,
        manifest: {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'A test plugin',
          main: 'index.js'
        },
        module: {
          activate: jest.fn().mockResolvedValue({ success: true }),
          deactivate: jest.fn().mockResolvedValue(true),
          commands: {
            'test-command': jest.fn().mockResolvedValue('test-result')
          }
        }
      });
      
      manager = new PluginManagerImpl(
        extensibilityManager,
        registry,
        loader,
        {
          pluginsDir: 'plugins',
          settingsDir: 'settings'
        }
      );
    });
    
    test('initialize', async () => {
      await manager.initialize();
      expect(manager['initialized']).toBe(true);
    });
    
    test('getRegistry', () => {
      expect(manager.getRegistry()).toBe(registry);
    });
    
    test('getLoader', () => {
      expect(manager.getLoader()).toBe(loader);
    });
    
    test('installPlugin', async () => {
      await manager.initialize();
      
      const result = await manager.installPlugin('test-plugin');
      
      expect(result.success).toBe(true);
      expect(extensibilityManager.loadExtension).toHaveBeenCalled();
    });
    
    test('uninstallPlugin', async () => {
      await manager.initialize();
      await manager.installPlugin('test-plugin');
      
      const result = await manager.uninstallPlugin('test-plugin');
      
      expect(result).toBe(true);
      expect(extensibilityManager.unloadExtension).toHaveBeenCalledWith('test-plugin');
    });
    
    test('enablePlugin and disablePlugin', async () => {
      await manager.initialize();
      await manager.installPlugin('test-plugin');
      
      // Disable the plugin
      const disableResult = await manager.disablePlugin('test-plugin');
      expect(disableResult).toBe(true);
      
      // Enable the plugin
      const enableResult = await manager.enablePlugin('test-plugin');
      expect(enableResult).toBe(true);
    });
    
    test('executeCommand', async () => {
      await manager.initialize();
      await manager.installPlugin('test-plugin');
      
      const result = await manager.executeCommand('test-plugin', 'test-command');
      
      expect(result).toBe('test-result');
    });
    
    test('getPluginSettings and updatePluginSettings', async () => {
      await manager.initialize();
      await manager.installPlugin('test-plugin');
      
      // Get default settings
      const settings = await manager.getPluginSettings('test-plugin');
      expect(settings).toEqual({});
      
      // Update settings
      await manager.updatePluginSettings('test-plugin', { foo: 'bar' });
      
      // Get updated settings
      const updatedSettings = await manager.getPluginSettings('test-plugin');
      expect(updatedSettings).toEqual({ foo: 'bar' });
    });
  });
});