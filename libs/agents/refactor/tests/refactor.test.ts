import { RefactorAgent } from '../index';
import * as path from 'path';

describe('RefactorAgent', () => {
  let refactor: RefactorAgent;
  const testProjectRoot = path.resolve(__dirname, '../../../../');

  beforeEach(() => {
    refactor = new RefactorAgent({
      projectRoot: testProjectRoot,
      languageTarget: 'typescript@4.5',
      refactoringLevel: 'balanced'
    });
  });

  describe('initialization', () => {
    it('should initialize with default config when none provided', () => {
      const defaultRefactor = new RefactorAgent();
      expect(defaultRefactor).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customRefactor = new RefactorAgent({
        projectRoot: '/custom/path',
        languageTarget: 'es2022',
        frameworkTarget: 'react@18',
        refactoringLevel: 'aggressive',
        logLevel: 'debug'
      });
      expect(customRefactor).toBeDefined();
    });
  });

  describe('Code Analysis', () => {
    it('should analyze code structure', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const result = await refactor.analyzeCode(files);
      
      expect(result).toBeDefined();
      expect(result.files).toBe(files.length);
    });

    it('should detect dead code', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const result = await refactor.detectDeadCode(files);
      
      expect(result).toBeDefined();
      expect(result.unusedFunctions).toBeDefined();
      expect(Array.isArray(result.unusedFunctions)).toBe(true);
    });

    it('should find duplications', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const result = await refactor.findDuplications(files);
      
      expect(result).toBeDefined();
      expect(result.instances).toBeDefined();
      expect(Array.isArray(result.instances)).toBe(true);
    });
  });

  describe('Transformation', () => {
    it('should apply refactoring patterns', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const pattern = {
        name: 'Extract Method',
        description: 'Extract a code fragment into a separate method',
        type: 'extract' as const
      };
      
      const result = await refactor.applyRefactoring(files, pattern);
      
      expect(result).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
    });

    it('should extract functions', async () => {
      const file = path.join(testProjectRoot, 'libs/agents/refactor/index.ts');
      const range = {
        start: { line: 100, column: 2 },
        end: { line: 120, column: 4 }
      };
      
      const result = await refactor.extractFunction(file, range, {
        name: 'extractedFunction'
      });
      
      expect(result).toBeDefined();
      expect(result.functionName).toBe('extractedFunction');
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize algorithms', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const result = await refactor.optimizeAlgorithms(files);
      
      expect(result).toBeDefined();
      expect(result.optimizations).toBeDefined();
      expect(Array.isArray(result.optimizations)).toBe(true);
    });

    it('should optimize async patterns', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const result = await refactor.optimizeAsyncPatterns(files);
      
      expect(result).toBeDefined();
      expect(result.optimizedFunctions).toBeDefined();
      expect(Array.isArray(result.optimizedFunctions)).toBe(true);
    });
  });

  describe('Modernization', () => {
    it('should modernize code', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const result = await refactor.modernizeCode(files, 'es2022');
      
      expect(result).toBeDefined();
      expect(result.upgrades).toBeDefined();
      expect(Array.isArray(result.upgrades)).toBe(true);
    });

    it('should replace deprecated APIs', async () => {
      const files = [
        path.join(testProjectRoot, 'libs/agents/refactor/index.ts')
      ];
      const result = await refactor.replaceDeprecatedAPIs(files);
      
      expect(result).toBeDefined();
      expect(result.replacements).toBeDefined();
      expect(Array.isArray(result.replacements)).toBe(true);
    });
  });

  describe('Integrated Refactoring', () => {
    it('should refactor components', async () => {
      const componentPath = path.join(testProjectRoot, 'libs/agents/refactor/index.ts');
      const result = await refactor.refactorComponent(componentPath, {
        extractMethods: true,
        improvePerformance: true
      });
      
      expect(result).toBeDefined();
      expect(result.component).toBe('index.ts');
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
    });

    it('should refactor projects', async () => {
      const result = await refactor.refactorProject({
        codeStyle: true,
        deadCodeRemoval: true,
        performanceOptimization: true
      });
      
      expect(result).toBeDefined();
      expect(result.analysisResults).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});