#!/bin/bash
# Test generation script for SecondBrain
# Creates test scaffolding for components

# Check if target directory is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <target_directory> [test_framework]"
  echo "Example: $0 /Volumes/Envoy/SecondBrain/agents/planner jest"
  exit 1
fi

TARGET_DIR=$1
TEST_FRAMEWORK=${2:-"jest"}  # Default to jest if not specified
TEST_DIR="${TARGET_DIR}/tests"

# Create test directory if it doesn't exist
mkdir -p "$TEST_DIR"

echo "Generating tests for: $TARGET_DIR"
echo "Using test framework: $TEST_FRAMEWORK"

# Find all JavaScript/TypeScript files in the target directory
FILES=$(find "$TARGET_DIR" -maxdepth 2 -type f -name "*.js" -o -name "*.ts" | grep -v "test\|spec\|node_modules")

# For each file, create a test file
for FILE in $FILES; do
  FILENAME=$(basename "$FILE")
  BASENAME="${FILENAME%.*}"
  TEST_FILE="$TEST_DIR/${BASENAME}.test.ts"
  
  # Skip if test file already exists
  if [ -f "$TEST_FILE" ]; then
    echo "Skipping $BASENAME - test already exists"
    continue
  fi
  
  echo "Generating test for: $BASENAME"
  
  # Create Jest test scaffold
  if [ "$TEST_FRAMEWORK" = "jest" ]; then
    cat > "$TEST_FILE" << EOF
import { ${BASENAME} } from '../${FILENAME}';

describe('${BASENAME}', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  test('should initialize correctly', () => {
    // Test initialization
    const instance = new ${BASENAME}();
    expect(instance).toBeDefined();
  });

  test('should perform its main function correctly', () => {
    // Test main functionality
    const instance = new ${BASENAME}();
    // Add assertions here
  });

  test('should handle errors appropriately', () => {
    // Test error handling
    const instance = new ${BASENAME}();
    // Add error scenario and assertions
  });

  test('should handle edge cases', () => {
    // Test edge cases
    const instance = new ${BASENAME}();
    // Add edge case testing
  });
});
EOF
  # Create Mocha test scaffold
  elif [ "$TEST_FRAMEWORK" = "mocha" ]; then
    cat > "$TEST_FILE" << EOF
import { expect } from 'chai';
import { ${BASENAME} } from '../${FILENAME}';

describe('${BASENAME}', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should initialize correctly', () => {
    // Test initialization
    const instance = new ${BASENAME}();
    expect(instance).to.exist;
  });

  it('should perform its main function correctly', () => {
    // Test main functionality
    const instance = new ${BASENAME}();
    // Add assertions here
  });

  it('should handle errors appropriately', () => {
    // Test error handling
    const instance = new ${BASENAME}();
    // Add error scenario and assertions
  });

  it('should handle edge cases', () => {
    // Test edge cases
    const instance = new ${BASENAME}();
    // Add edge case testing
  });
});
EOF
  # Create Pytest test scaffold
  elif [ "$TEST_FRAMEWORK" = "pytest" ]; then
    TEST_FILE="$TEST_DIR/test_${BASENAME}.py"
    cat > "$TEST_FILE" << EOF
import pytest
from ..${BASENAME} import ${BASENAME}

@pytest.fixture
def ${BASENAME.toLowerCase()}_instance():
    """Create a ${BASENAME} instance for testing."""
    return ${BASENAME}()

def test_initialization(${BASENAME.toLowerCase()}_instance):
    """Test that the ${BASENAME} initializes correctly."""
    assert ${BASENAME.toLowerCase()}_instance is not None

def test_main_functionality(${BASENAME.toLowerCase()}_instance):
    """Test the main functionality of ${BASENAME}."""
    # Add test implementation
    pass

def test_error_handling(${BASENAME.toLowerCase()}_instance):
    """Test error handling in ${BASENAME}."""
    # Add test implementation
    pass

def test_edge_cases(${BASENAME.toLowerCase()}_instance):
    """Test edge cases for ${BASENAME}."""
    # Add test implementation
    pass
EOF
  else
    echo "Unsupported test framework: $TEST_FRAMEWORK"
    exit 1
  fi
done

# Create test configuration file if doesn't exist
if [ "$TEST_FRAMEWORK" = "jest" ] && [ ! -f "${TARGET_DIR}/jest.config.js" ]; then
  cat > "${TARGET_DIR}/jest.config.js" << EOF
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true
};
EOF
elif [ "$TEST_FRAMEWORK" = "mocha" ] && [ ! -f "${TARGET_DIR}/.mocharc.js" ]; then
  cat > "${TARGET_DIR}/.mocharc.js" << EOF
module.exports = {
  require: ['ts-node/register'],
  extension: ['ts'],
  spec: 'tests/**/*.test.ts',
  timeout: 5000,
  recursive: true
};
EOF
elif [ "$TEST_FRAMEWORK" = "pytest" ] && [ ! -f "${TARGET_DIR}/pytest.ini" ]; then
  cat > "${TARGET_DIR}/pytest.ini" << EOF
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --verbose --cov=. --cov-report=term --cov-report=html
EOF
fi

echo "Test generation complete. Generated $(find "$TEST_DIR" -type f | wc -l) test files."
echo "Test files are located in: $TEST_DIR"