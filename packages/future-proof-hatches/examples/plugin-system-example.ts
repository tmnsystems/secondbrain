/**
 * Plugin System Example
 */

import * as path from 'path';
import {
  PluginManagerImpl,
  PluginManifest,
  PluginModule,
  PluginManagerEvents
} from '../src/plugin-system';
import { ExtensibilityManagerImpl } from '../src/extensibility';

// Create a simple logger for the example
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// Create the extensibility manager
const extensibilityManager = new ExtensibilityManagerImpl(undefined, undefined, logger);

// Create the plugin manager
const pluginsDir = path.resolve(process.cwd(), 'examples', 'plugins');
const settingsDir = path.resolve(process.cwd(), 'examples', 'settings');

const pluginManager = new PluginManagerImpl(
  extensibilityManager,
  undefined,
  undefined,
  {
    pluginsDir,
    settingsDir,
    logger
  }
);

// Subscribe to events
pluginManager.on(PluginManagerEvents.INITIALIZED, () => {
  logger.info('Plugin system initialized');
});

pluginManager.on(PluginManagerEvents.PLUGIN_INSTALLED, (manifest) => {
  logger.info(`Plugin installed: ${manifest.id}`);
});

pluginManager.on(PluginManagerEvents.PLUGIN_UNINSTALLED, (manifest) => {
  logger.info(`Plugin uninstalled: ${manifest.id}`);
});

pluginManager.on(PluginManagerEvents.PLUGIN_COMMAND_EXECUTED, (manifest, commandId, args, result) => {
  logger.info(`Plugin command executed: ${manifest.id}.${commandId}(${args.join(', ')}) => ${result}`);
});

// Example plugin manifest
const examplePluginManifest: PluginManifest = {
  id: 'example-plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  description: 'An example plugin for the SecondBrain plugin system',
  main: 'index.js',
  hooks: ['example-hook'],
  commands: ['greet', 'add'],
  settings: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        greeting: {
          type: 'string',
          description: 'The greeting to use'
        },
        name: {
          type: 'string',
          description: 'The name to greet'
        }
      }
    },
    defaults: {
      greeting: 'Hello',
      name: 'World'
    }
  }
};

// Example plugin module
const examplePluginModule: PluginModule = {
  activate: async (context) => {
    logger.info(`Activating plugin: ${context.metadata.id}`);
    return { success: true };
  },
  deactivate: async () => {
    logger.info('Deactivating plugin');
    return true;
  },
  commands: {
    greet: async (name?: string) => {
      const settings = await examplePluginModule.activate['context'].storage.get('greeting');
      const greeting = settings?.greeting || 'Hello';
      const defaultName = settings?.name || 'World';
      return `${greeting}, ${name || defaultName}!`;
    },
    add: async (a: number, b: number) => {
      return a + b;
    }
  },
  hooks: {
    'example-hook': async (data: any) => {
      logger.info('Example hook called with data:', data);
      return { ...data, processed: true };
    }
  }
};

// Initialize the system
async function initialize() {
  // Initialize the extensibility manager
  await extensibilityManager.initialize();

  // Initialize the plugin manager
  await pluginManager.initialize();

  // Register the example plugin
  const registry = pluginManager.getRegistry();
  registry.register(examplePluginManifest, examplePluginModule);

  // Get plugin settings
  const settings = await pluginManager.getPluginSettings('example-plugin');
  logger.info('Plugin settings:', settings);

  // Update plugin settings
  await pluginManager.updatePluginSettings('example-plugin', {
    greeting: 'Hola',
    name: 'Mundo'
  });

  // Get updated settings
  const updatedSettings = await pluginManager.getPluginSettings('example-plugin');
  logger.info('Updated plugin settings:', updatedSettings);

  // Execute plugin commands
  const greetResult = await pluginManager.executeCommand('example-plugin', 'greet');
  logger.info('Greet result:', greetResult);

  const greetWithNameResult = await pluginManager.executeCommand('example-plugin', 'greet', 'User');
  logger.info('Greet with name result:', greetWithNameResult);

  const addResult = await pluginManager.executeCommand('example-plugin', 'add', 2, 3);
  logger.info('Add result:', addResult);

  // Disable the plugin
  await pluginManager.disablePlugin('example-plugin');

  // Enable the plugin
  await pluginManager.enablePlugin('example-plugin');

  // Uninstall the plugin
  await pluginManager.uninstallPlugin('example-plugin');
}

// Run the example
initialize().catch(error => {
  logger.error('Error running example:', error);
});