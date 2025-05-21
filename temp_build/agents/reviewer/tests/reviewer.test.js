"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const path = __importStar(require("path"));
describe('ReviewerAgent', () => {
    let reviewer;
    const testProjectRoot = path.resolve(__dirname, '../../../../');
    beforeEach(() => {
        reviewer = new index_1.ReviewerAgent({
            projectRoot: testProjectRoot,
            testDir: 'libs/agents/reviewer/tests',
            coverageThreshold: 80,
            logLevel: 'info'
        });
    });
    describe('initialization', () => {
        it('should initialize with default config when none provided', () => {
            const defaultReviewer = new index_1.ReviewerAgent();
            expect(defaultReviewer).toBeDefined();
        });
        it('should initialize with custom config', () => {
            const customReviewer = new index_1.ReviewerAgent({
                projectRoot: '/custom/path',
                testDir: 'custom-tests',
                coverageThreshold: 90,
                stylePreference: 'google',
                logLevel: 'debug'
            });
            expect(customReviewer).toBeDefined();
        });
    });
    describe('Static Analysis', () => {
        it('should lint code files', async () => {
            const files = [
                path.join(testProjectRoot, 'libs/agents/reviewer/index.ts')
            ];
            const result = await reviewer.lintCode(files);
            expect(result).toBeDefined();
            expect(result.issues).toBeDefined();
            expect(Array.isArray(result.issues)).toBe(true);
        });
        it('should perform type checking', async () => {
            const files = [
                path.join(testProjectRoot, 'libs/agents/reviewer/index.ts')
            ];
            const result = await reviewer.checkTypes(files);
            expect(result).toBeDefined();
            expect(result.errors).toBeDefined();
            expect(Array.isArray(result.errors)).toBe(true);
        });
        it('should analyze code complexity', async () => {
            const files = [
                path.join(testProjectRoot, 'libs/agents/reviewer/index.ts')
            ];
            const result = await reviewer.analyzeComplexity(files);
            expect(result).toBeDefined();
            expect(result.files).toBeDefined();
            expect(Array.isArray(result.files)).toBe(true);
        });
    });
    describe('Test Management', () => {
        it('should discover tests', async () => {
            const result = await reviewer.discoverTests();
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
        it('should run tests', async () => {
            const result = await reviewer.runTests();
            expect(result).toBeDefined();
            expect(typeof result.passed).toBe('boolean');
        });
        it('should analyze coverage', async () => {
            const result = await reviewer.analyzeCoverage();
            expect(result).toBeDefined();
            expect(result.overall).toBeDefined();
        });
    });
    describe('Integrated Review', () => {
        it('should perform a complete project review', async () => {
            const result = await reviewer.reviewProject({
                linting: true,
                typeChecking: true,
                testing: false,
                coverage: false,
                documentation: true,
                security: true,
                performance: false
            });
            expect(result).toBeDefined();
            expect(result.score).toBeDefined();
            expect(result.grade).toBeDefined();
            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
        });
        it('should review a component', async () => {
            const componentPath = path.join(testProjectRoot, 'libs/agents/reviewer/index.ts');
            const result = await reviewer.reviewComponent(componentPath);
            expect(result).toBeDefined();
            expect(result.name).toBe('index.ts');
            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
        });
        it('should review a file', async () => {
            const filePath = path.join(testProjectRoot, 'libs/agents/reviewer/index.ts');
            const result = await reviewer.reviewFile(filePath);
            expect(result).toBeDefined();
            expect(result.path).toBe(filePath);
            expect(result.recommendations).toBeDefined();
            expect(Array.isArray(result.recommendations)).toBe(true);
        });
    });
});
