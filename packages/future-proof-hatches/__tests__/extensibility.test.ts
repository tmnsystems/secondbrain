/**
 * Tests for Extensibility Framework
 */

import { 
  ExtensibilityManagerImpl,
  ExtensionRegistryImpl,
  ExtensionPointImpl,
  MemoryExtensionStorage,
  ExtensionStorageFactory,
  ExtensionMetadata,
  ExtensionConfig,
  ExtensibilityManagerEvents,
  ExtensionRegistryEvents,
  ExtensionPointEvents
} from '../src/extensibility';

describe('Extensibility Framework', () => {
  describe('ExtensionRegistry', () => {
    let registry: ExtensionRegistryImpl;
    let metadata: ExtensionMetadata;
    let config: ExtensionConfig;

    beforeEach(() => {
      registry = new ExtensionRegistryImpl();
      metadata = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        description: 'A test extension'
      };
      config = {
        enabled: true,
        settings: { foo: 'bar' }
      };
    });

    test('register and getExtension', () => {
      registry.register(metadata, config);
      const extension = registry.getExtension(metadata.id);
      expect(extension).toBeDefined();
      expect(extension?.metadata).toEqual(metadata);
      expect(extension?.config).toEqual(config);
    });

    test('hasExtension', () => {
      expect(registry.hasExtension(metadata.id)).toBe(false);
      registry.register(metadata, config);
      expect(registry.hasExtension(metadata.id)).toBe(true);
    });

    test('getExtensions', () => {
      registry.register(metadata, config);
      const extensions = registry.getExtensions();
      expect(extensions).toHaveLength(1);
      expect(extensions[0].metadata).toEqual(metadata);
      expect(extensions[0].config).toEqual(config);
    });

    test('unregister', () => {
      registry.register(metadata, config);
      registry.unregister(metadata.id);
      expect(registry.hasExtension(metadata.id)).toBe(false);
    });

    test('enableExtension and disableExtension', () => {
      registry.register(metadata, config);
      registry.disableExtension(metadata.id);
      expect(registry.getExtension(metadata.id)?.config.enabled).toBe(false);
      registry.enableExtension(metadata.id);
      expect(registry.getExtension(metadata.id)?.config.enabled).toBe(true);
    });

    test('updateConfig', () => {
      registry.register(metadata, config);
      registry.updateConfig(metadata.id, { settings: { baz: 'qux' } });
      expect(registry.getExtension(metadata.id)?.config.settings).toEqual({
        foo: 'bar',
        baz: 'qux'
      });
    });
  });

  describe('ExtensionPoint', () => {
    let extensionPoint: ExtensionPointImpl<any>;
    let extension: any;
    let extensionId: string;

    beforeEach(() => {
      extensionPoint = new ExtensionPointImpl(
        'test-point',
        'Test Point',
        'A test extension point'
      );
      extension = { test: jest.fn() };
      extensionId = 'test-extension';
    });

    test('register and getExtension', () => {
      extensionPoint.register(extension, extensionId);
      expect(extensionPoint.getExtension(extensionId)).toBe(extension);
    });

    test('getExtensions', () => {
      extensionPoint.register(extension, extensionId);
      expect(extensionPoint.getExtensions()).toEqual([extension]);
    });

    test('unregister', () => {
      extensionPoint.register(extension, extensionId);
      extensionPoint.unregister(extensionId);
      expect(extensionPoint.getExtension(extensionId)).toBeUndefined();
    });

    test('execute (parallel)', async () => {
      extension.test.mockResolvedValue('result');
      extensionPoint.register(extension, extensionId);
      
      const results = await extensionPoint.execute(ext => ext.test());
      
      expect(results).toEqual(['result']);
      expect(extension.test).toHaveBeenCalled();
    });

    test('execute (sequential)', async () => {
      extension.test.mockResolvedValue('result');
      extensionPoint.register(extension, extensionId);
      
      const results = await extensionPoint.execute(
        ext => ext.test(),
        { parallel: false }
      );
      
      expect(results).toEqual(['result']);
      expect(extension.test).toHaveBeenCalled();
    });

    test('execute with skip option', async () => {
      extension.test.mockResolvedValue('result');
      extensionPoint.register(extension, extensionId);
      
      const results = await extensionPoint.execute(
        ext => ext.test(),
        { skip: [extensionId] }
      );
      
      expect(results).toEqual([]);
      expect(extension.test).not.toHaveBeenCalled();
    });

    test('execute with only option', async () => {
      extension.test.mockResolvedValue('result');
      extensionPoint.register(extension, extensionId);
      extensionPoint.register({ test: jest.fn() }, 'other-extension');
      
      const results = await extensionPoint.execute(
        ext => ext.test(),
        { only: [extensionId] }
      );
      
      expect(results).toEqual(['result']);
      expect(extension.test).toHaveBeenCalled();
    });

    test('execute with continueOnError=true', async () => {
      const error = new Error('Test error');
      extension.test.mockRejectedValue(error);
      extensionPoint.register(extension, extensionId);
      extensionPoint.register({ test: jest.fn().mockResolvedValue('ok') }, 'other-extension');
      
      const results = await extensionPoint.execute(
        ext => ext.test(),
        { continueOnError: true }
      );
      
      expect(results).toEqual(['ok']);
    });

    test('execute with continueOnError=false', async () => {
      const error = new Error('Test error');
      extension.test.mockRejectedValue(error);
      extensionPoint.register(extension, extensionId);
      
      await expect(
        extensionPoint.execute(
          ext => ext.test(),
          { continueOnError: false }
        )
      ).rejects.toThrow('Test error');
    });
  });

  describe('MemoryExtensionStorage', () => {
    let storage: MemoryExtensionStorage;

    beforeEach(() => {
      storage = new MemoryExtensionStorage('test-extension');
    });

    test('set and get', async () => {
      await storage.set('key', 'value');
      expect(await storage.get('key')).toBe('value');
    });

    test('delete', async () => {
      await storage.set('key', 'value');
      await storage.delete('key');
      expect(await storage.get('key')).toBeUndefined();
    });

    test('clear', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.clear();
      expect(await storage.get('key1')).toBeUndefined();
      expect(await storage.get('key2')).toBeUndefined();
    });

    test('keys', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      expect(await storage.keys()).toEqual(expect.arrayContaining(['key1', 'key2']));
    });
  });

  describe('ExtensibilityManager', () => {
    let manager: ExtensibilityManagerImpl;
    let registry: ExtensionRegistryImpl;
    let extensionPoint: ExtensionPointImpl<any>;
    let metadata: ExtensionMetadata;
    let config: ExtensionConfig;

    beforeEach(() => {
      registry = new ExtensionRegistryImpl();
      manager = new ExtensibilityManagerImpl(registry);
      extensionPoint = new ExtensionPointImpl(
        'test-point',
        'Test Point',
        'A test extension point'
      );
      metadata = {
        id: 'test-extension',
        name: 'Test Extension',
        version: '1.0.0',
        description: 'A test extension'
      };
      config = {
        enabled: true,
        settings: { foo: 'bar' }
      };
    });

    test('initialize', async () => {
      await manager.initialize();
      expect(manager['initialized']).toBe(true);
    });

    test('getRegistry', () => {
      expect(manager.getRegistry()).toBe(registry);
    });

    test('registerExtensionPoint and getExtensionPoint', () => {
      manager.registerExtensionPoint(extensionPoint);
      expect(manager.getExtensionPoint('test-point')).toBe(extensionPoint);
    });

    test('getExtensionPoints', () => {
      manager.registerExtensionPoint(extensionPoint);
      expect(manager.getExtensionPoints()).toHaveProperty('test-point');
    });

    test('unregisterExtensionPoint', () => {
      manager.registerExtensionPoint(extensionPoint);
      manager.unregisterExtensionPoint('test-point');
      expect(manager.getExtensionPoint('test-point')).toBeUndefined();
    });

    test('loadExtension and isExtensionLoaded', async () => {
      await manager.initialize();
      const result = await manager.loadExtension(metadata, config);
      expect(result.success).toBe(true);
      expect(manager.isExtensionLoaded(metadata.id)).toBe(true);
    });

    test('getLoadedExtension', async () => {
      await manager.initialize();
      await manager.loadExtension(metadata, config);
      const extension = manager.getLoadedExtension(metadata.id);
      expect(extension).toBeDefined();
    });

    test('getLoadedExtensions', async () => {
      await manager.initialize();
      await manager.loadExtension(metadata, config);
      const extensions = manager.getLoadedExtensions();
      expect(extensions).toHaveProperty(metadata.id);
    });

    test('unloadExtension', async () => {
      await manager.initialize();
      await manager.loadExtension(metadata, config);
      const result = await manager.unloadExtension(metadata.id);
      expect(result).toBe(true);
      expect(manager.isExtensionLoaded(metadata.id)).toBe(false);
    });
  });
});