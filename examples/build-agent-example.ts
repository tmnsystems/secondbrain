/**
 * Build Agent Usage Example
 * 
 * This example demonstrates how to use the Build Agent to create projects,
 * components, and code.
 */

import { BuildAgent } from '../libs/agents/build';
import * as path from 'path';

async function runExample() {
  console.log('Build Agent Example');
  console.log('===================');
  
  // Initialize the Build Agent
  const projectRoot = path.join(__dirname, 'demo-project');
  const build = new BuildAgent({
    projectRoot,
    preferredStyle: 'functional',
    codeStyle: {
      indentation: 2,
      quotes: 'single',
      semicolons: true
    }
  });
  
  // Example 1: Create a new React project
  console.log('\nExample 1: Creating a new React project');
  console.log('--------------------------------------');
  
  try {
    const project = await build.createProject('react-app', {
      framework: 'react',
      typescript: true,
      cssFramework: 'tailwind',
      features: ['auth']
    });
    
    console.log(`Project created at: ${project.root}`);
    console.log(`Files created: ${project.files.length}`);
  } catch (error) {
    console.error('Error creating project:', error);
  }
  
  // Example 2: Create a React component
  console.log('\nExample 2: Creating a React component');
  console.log('------------------------------------');
  
  try {
    const component = await build.createComponent('UserProfile', 'react-component', {
      props: [
        { name: 'user', type: 'User', optional: false },
        { name: 'onSave', type: '(user: User) => void', optional: true }
      ],
      hooks: ['useState', 'useEffect'],
      styles: 'css',
      directory: path.join(projectRoot, 'react-app', 'src', 'components')
    });
    
    console.log(`Component created: ${component.name}`);
    console.log(`Files created: ${component.files.join(', ')}`);
  } catch (error) {
    console.error('Error creating component:', error);
  }
  
  // Example 3: Create an API endpoint
  console.log('\nExample 3: Creating an API endpoint');
  console.log('----------------------------------');
  
  try {
    const endpoint = await build.createAPIEndpoint('/api/users', 'GET', {
      parameters: [
        { name: 'page', type: 'number', required: false, default: 1 },
        { name: 'limit', type: 'number', required: false, default: 10 }
      ],
      response: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: 'string',
            name: 'string',
            email: 'string'
          }
        }
      },
      middleware: ['auth'],
      directory: path.join(projectRoot, 'react-app', 'src', 'api')
    });
    
    console.log(`API endpoint created: ${endpoint.path}`);
    console.log(`Method: ${endpoint.method}`);
    console.log(`File created: ${endpoint.file}`);
  } catch (error) {
    console.error('Error creating API endpoint:', error);
  }
  
  // Example 4: Create a class
  console.log('\nExample 4: Creating a class');
  console.log('-------------------------');
  
  try {
    const classFile = await build.createClass('ShoppingCart', [
      { name: 'items', type: 'Array<CartItem>', visibility: 'private', value: [] }
    ], [
      {
        name: 'addItem',
        returnType: 'void',
        parameters: [{ name: 'item', type: 'CartItem' }],
        implementation: `    this.items.push(item);
`
      },
      {
        name: 'getTotal',
        returnType: 'number',
        parameters: [],
        implementation: `    return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
`
      }
    ]);
    
    console.log(`Class created: ${classFile.name}`);
    console.log(`File created: ${classFile.file}`);
  } catch (error) {
    console.error('Error creating class:', error);
  }
  
  // Example 5: Create an interface
  console.log('\nExample 5: Creating an interface');
  console.log('-------------------------------');
  
  try {
    const interfaceFile = await build.createInterface('CartItem', [
      { name: 'id', type: 'string' },
      { name: 'name', type: 'string' },
      { name: 'price', type: 'number' },
      { name: 'quantity', type: 'number', optional: true }
    ]);
    
    console.log(`Interface created: ${interfaceFile.name}`);
    console.log(`File created: ${interfaceFile.file}`);
  } catch (error) {
    console.error('Error creating interface:', error);
  }
  
  // Example 6: Create a function
  console.log('\nExample 6: Creating a function');
  console.log('-----------------------------');
  
  try {
    const functionFile = await build.createFunction('calculateTotal', {
      name: 'calculateTotal',
      returnType: 'number',
      parameters: [
        { name: 'items', type: 'Array<{ price: number; quantity: number }>' }
      ],
      async: false
    }, `  return items.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
`);
    
    console.log(`Function created: ${functionFile.name}`);
    console.log(`File created: ${functionFile.file}`);
  } catch (error) {
    console.error('Error creating function:', error);
  }
  
  // Example 7: Create a type definition
  console.log('\nExample 7: Creating a type definition');
  console.log('-----------------------------------');
  
  try {
    const typeDefFile = await build.createTypeDefinition('PaymentMethod', {
      kind: 'enum',
      value: {
        CREDIT_CARD: 'credit_card',
        PAYPAL: 'paypal',
        BANK_TRANSFER: 'bank_transfer',
        CRYPTO: 'crypto'
      }
    });
    
    console.log(`Type definition created: ${typeDefFile.name}`);
    console.log(`File created: ${typeDefFile.file}`);
  } catch (error) {
    console.error('Error creating type definition:', error);
  }
  
  console.log('\nBuild Agent Example Completed');
}

// Check if this script is being run directly
if (require.main === module) {
  runExample().catch(error => {
    console.error('Error running example:', error);
  });
}

export default runExample;