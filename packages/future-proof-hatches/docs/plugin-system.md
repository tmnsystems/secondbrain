# Plugin System

The Plugin System provides a robust framework for extending SecondBrain with custom functionality through plugins. It enables loading, managing, and executing plugins from various sources, with support for configuration, commands, hooks, and more.

## Key Components

### PluginManager

The PluginManager is the central component of the system. It manages the lifecycle of plugins and provides APIs for installing, uninstalling, enabling, disabling, and updating plugins.

```typescript
// Create a PluginManager
import { PluginManagerImpl } from '@secondbrain/future-proof-hatches';
import { ExtensibilityManagerImpl } from '@secondbrain/future-proof-hatches';

const extensibilityManager = new ExtensibilityManagerImpl();
await extensibilityManager.initialize();

const pluginManager = new PluginManagerImpl(extensibilityManager);
await pluginManager.initialize();
```

### PluginRegistry

The PluginRegistry maintains a catalog of all registered plugins, including their manifests and modules. It provides APIs for registering, unregistering, and querying plugins.

```typescript
// Get the PluginRegistry
const registry = pluginManager.getRegistry();

// Register a plugin
registry.register(manifest, module);

// Check if a plugin is registered
const isRegistered = registry.hasPlugin('my-plugin');

// Get all registered plugins
const plugins = registry.getPlugins();
```

### PluginLoader

The PluginLoader handles loading plugins from various sources, including directories, packages, and URLs. It processes plugin manifests and loads the corresponding modules.

```typescript
// Get the PluginLoader
const loader = pluginManager.getLoader();

// Load a plugin from a directory
const result = await loader.loadFromDirectory('/path/to/plugin');

// Load a plugin from a package
const result = await loader.loadFromPackage('my-plugin-package');

// Load a plugin from a URL
const result = await loader.loadFromUrl('https://example.com/plugins/my-plugin.zip');
```

## Plugin Structure

Plugins consist of two main components:

1. **Manifest**: A JSON or YAML file that describes the plugin, including its metadata, capabilities, and settings.
2. **Module**: A JavaScript/TypeScript module that implements the plugin's functionality.

### Plugin Manifest

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "A plugin that does something useful",
  "main": "index.js",
  "hooks": ["hook1", "hook2"],
  "commands": ["command1", "command2"],
  "settings": {
    "type": "json",
    "schema": {
      "type": "object",
      "properties": {
        "option1": {
          "type": "string",
          "description": "Option 1"
        },
        "option2": {
          "type": "number",
          "description": "Option 2"
        }
      }
    },
    "defaults": {
      "option1": "default value",
      "option2": 42
    }
  }
}
```

### Plugin Module

```typescript
import { ExtensionContext } from '@secondbrain/future-proof-hatches';

export async function activate(context: ExtensionContext) {
  // Initialize the plugin
  return { success: true };
}

export async function deactivate() {
  // Clean up the plugin
  return true;
}

export const commands = {
  command1: async (arg1, arg2) => {
    // Implement command1
    return { result: 'command1 executed' };
  },
  command2: async (arg1) => {
    // Implement command2
    return { result: 'command2 executed' };
  }
};

export const hooks = {
  hook1: async (data) => {
    // Implement hook1
    return { ...data, processed: true };
  },
  hook2: async (data) => {
    // Implement hook2
    return { ...data, processed: true };
  }
};
```

## Use Cases

### Installing and Managing Plugins

```typescript
// Install a plugin from a directory
const result = await pluginManager.installPlugin('/path/to/plugin');

// Enable a plugin
await pluginManager.enablePlugin('my-plugin');

// Disable a plugin
await pluginManager.disablePlugin('my-plugin');

// Update a plugin
await pluginManager.updatePlugin('my-plugin');

// Uninstall a plugin
await pluginManager.uninstallPlugin('my-plugin');
```

### Working with Plugin Settings

```typescript
// Get plugin settings
const settings = await pluginManager.getPluginSettings('my-plugin');

// Update plugin settings
await pluginManager.updatePluginSettings('my-plugin', {
  option1: 'new value',
  option2: 100
});
```

### Executing Plugin Commands

```typescript
// Execute a plugin command
const result = await pluginManager.executeCommand('my-plugin', 'command1', arg1, arg2);
```

## Integration with Extensibility Framework

The Plugin System integrates with the Extensibility Framework to provide a seamless extension experience. Plugins can provide implementations for extension points defined in the system.

```typescript
// Define an extension point
const myExtensionPoint = new ExtensionPointImpl<MyExtensionType>(
  'my-extension-point',
  'My Extension Point',
  'A description of my extension point'
);
extensibilityManager.registerExtensionPoint(myExtensionPoint);

// Plugin implementation
export async function activate(context: ExtensionContext) {
  // Register with an extension point
  const myExtensionImpl: MyExtensionType = {
    // Implementation details
  };
  
  context.extensionPoints['my-extension-point'].register(myExtensionImpl, context.metadata.id);
  
  return { success: true };
}
```

## Best Practices

1. **Adhere to the Plugin Lifecycle**: Ensure your plugin correctly implements the `activate` and `deactivate` functions to properly handle initialization and cleanup.

2. **Use Settings for Configuration**: Utilize the settings schema to define and validate configuration options, and provide sensible defaults.

3. **Gracefully Handle Errors**: Catch and report errors properly to prevent them from affecting the system or other plugins.

4. **Respect Dependencies**: If your plugin depends on other plugins, declare these dependencies in your manifest and check for their availability at runtime.

5. **Follow Command Conventions**: Structure your commands clearly, with appropriate argument validation and consistent return values.

6. **Document Your Plugin**: Provide comprehensive documentation for your plugin, including its purpose, commands, hooks, and configuration options.

## API Reference

For detailed API documentation, please refer to the TypeScript definitions in the `types.ts` file.