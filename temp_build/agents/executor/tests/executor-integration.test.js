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
/**
 * Integration tests for the ExecutorAgent
 */
const executor_1 = require("../executor");
const types_1 = require("../types");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
describe('ExecutorAgent Integration Tests', () => {
    let executor;
    const testDir = path.join(process.cwd(), 'test-output', 'executor-tests');
    beforeAll(async () => {
        // Create test directory if it doesn't exist
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        // Initialize executor agent
        executor = new executor_1.ExecutorAgent({
            workingDir: testDir,
            logLevel: 'debug'
        });
        await executor.initialize();
    });
    afterAll(async () => {
        await executor.shutdown();
        // Cleanup (uncomment to clean up after tests)
        // if (fs.existsSync(testDir)) {
        //   fs.rmSync(testDir, { recursive: true, force: true });
        // }
    });
    describe('Command Execution', () => {
        test('should execute simple echo command', async () => {
            const result = await executor.executeCommand('echo "Hello, World!"');
            expect(result.exitCode).toBe(0);
            expect(result.stdout.trim()).toBe('Hello, World!');
            expect(result.stderr).toBe('');
        });
        test('should handle command timeouts', async () => {
            const result = await executor.executeCommand('sleep 3', { timeoutMs: 1000 });
            expect(result.exitCode).not.toBe(0);
            expect(result.timedOut).toBe(true);
        });
        test('should reject potentially unsafe commands', async () => {
            const dangerousCommand = 'rm -rf /';
            const safeCommandsOnly = true;
            // Use internal validation
            const validateResult = await executor['validateCommand'](dangerousCommand, safeCommandsOnly);
            expect(validateResult).toBe(false);
        });
    });
    describe('File Operations', () => {
        test('should create and read a test file', async () => {
            const testFilePath = path.join(testDir, 'test-file.txt');
            const testContent = 'This is a test file';
            // Write file
            const writeResult = await executor.performFileOperation('write', {
                path: testFilePath,
                data: testContent
            });
            expect(writeResult.success).toBe(true);
            // Read file
            const readResult = await executor.performFileOperation('read', {
                path: testFilePath
            });
            expect(readResult.success).toBe(true);
            expect(readResult.data).toBe(testContent);
            // Clean up
            await executor.performFileOperation('delete', {
                path: testFilePath
            });
        });
    });
    describe('Git Operations', () => {
        test('should check git version', async () => {
            const result = await executor.performGitOperation(types_1.GitOperation.STATUS);
            // This test may fail if git is not installed
            expect(result.success).toBe(true);
        });
    });
    describe('Error Handling', () => {
        test('should handle command not found errors', async () => {
            const result = await executor.executeCommand('non-existent-command');
            expect(result.success).toBe(false);
            expect(result.exitCode).not.toBe(0);
            expect(result.error).toBeDefined();
        });
    });
});
