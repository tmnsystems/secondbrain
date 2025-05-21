/**
 * Extensibility Framework Example
 */

import {
  ExtensibilityManagerImpl,
  ExtensionPointImpl,
  ExtensionMetadata,
  ExtensionConfig,
  ExtensibilityManagerEvents,
  ExtensionPointEvents
} from '../src/extensibility';

// Create a simple logger for the example
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  debug: (...args: any[]) => console.debug('[DEBUG]', ...args),
};

// Create the extensibility manager
const manager = new ExtensibilityManagerImpl(undefined, undefined, logger);

// Subscribe to events
manager.on(ExtensibilityManagerEvents.INITIALIZED, () => {
  logger.info('Extensibility framework initialized');
});

manager.on(ExtensibilityManagerEvents.EXTENSION_LOADED, (metadata) => {
  logger.info(`Extension loaded: ${metadata.id}`);
});

manager.on(ExtensibilityManagerEvents.EXTENSION_UNLOADED, (metadata) => {
  logger.info(`Extension unloaded: ${metadata.id}`);
});

// Initialize the extensibility framework
async function initialize() {
  await manager.initialize();

  // Create an extension point for text processing
  const textProcessorPoint = new ExtensionPointImpl<(text: string) => Promise<string>>(
    'text-processor',
    'Text Processor',
    'Process text in various ways'
  );

  // Subscribe to extension point events
  textProcessorPoint.on(ExtensionPointEvents.EXTENSION_REGISTERED, (extensionId) => {
    logger.info(`Text processor registered: ${extensionId}`);
  });

  textProcessorPoint.on(ExtensionPointEvents.EXTENSION_EXECUTION_STARTED, (extensionIds) => {
    logger.info(`Text processors starting: ${extensionIds.join(', ')}`);
  });

  textProcessorPoint.on(ExtensionPointEvents.EXTENSION_EXECUTION_COMPLETED, (extensionId, result) => {
    logger.info(`Text processor completed: ${extensionId}`);
  });

  // Register the extension point
  manager.registerExtensionPoint(textProcessorPoint);

  // Create some example extensions
  const uppercaseMetadata: ExtensionMetadata = {
    id: 'uppercase-processor',
    name: 'Uppercase Processor',
    version: '1.0.0',
    description: 'Converts text to uppercase'
  };

  const uppercaseConfig: ExtensionConfig = {
    enabled: true,
    settings: {}
  };

  const lowercaseMetadata: ExtensionMetadata = {
    id: 'lowercase-processor',
    name: 'Lowercase Processor',
    version: '1.0.0',
    description: 'Converts text to lowercase'
  };

  const lowercaseConfig: ExtensionConfig = {
    enabled: true,
    settings: {}
  };

  // Register with the registry
  const registry = manager.getRegistry();
  registry.register(uppercaseMetadata, uppercaseConfig);
  registry.register(lowercaseMetadata, lowercaseConfig);

  // Load the extensions
  await manager.loadExtension(uppercaseMetadata, uppercaseConfig);
  await manager.loadExtension(lowercaseMetadata, lowercaseConfig);

  // Create the text processors
  const uppercaseProcessor = async (text: string) => text.toUpperCase();
  const lowercaseProcessor = async (text: string) => text.toLowerCase();

  // Register the text processors with the extension point
  textProcessorPoint.register(uppercaseProcessor, 'uppercase-processor');
  textProcessorPoint.register(lowercaseProcessor, 'lowercase-processor');

  // Process some text
  const text = 'Hello, World!';
  logger.info(`Original text: ${text}`);

  const results = await textProcessorPoint.execute(processor => processor(text));
  results.forEach((result, index) => {
    logger.info(`Processor ${index + 1} result: ${result}`);
  });

  // Unload extensions
  await manager.unloadExtension('uppercase-processor');
  await manager.unloadExtension('lowercase-processor');
}

// Run the example
initialize().catch(error => {
  logger.error('Error running example:', error);
});