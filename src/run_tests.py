#!/usr/bin/env python
"""
Test runner for SecondBrain system.

This script runs the test suite for the metaphor and values extraction modules,
verifying that they properly capture Tina's holistic teaching approach.
"""

import os
import sys
import unittest
import argparse
from pathlib import Path


def run_tests(module_name=None, verbose=False):
    """
    Run the test suite.
    
    Args:
        module_name: Optional name of specific test module to run
        verbose: Whether to show verbose output
    """
    # Add src directory to path
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, root_dir)
    
    # Set up the test loader
    loader = unittest.TestLoader()
    
    if module_name:
        # Run specific test module
        if module_name.endswith('.py'):
            module_name = module_name[:-3]
        
        # Convert module name to path
        module_path = module_name.replace('.', os.path.sep) + '.py'
        
        # Check if the module exists
        if not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), module_path)):
            print(f"Error: Test module '{module_name}' not found.")
            return 1
        
        # Import the module
        module = __import__(module_name, fromlist=['*'])
        
        # Run tests from the module
        suite = loader.loadTestsFromModule(module)
    else:
        # Run all tests
        start_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tests')
        suite = loader.discover(start_dir)
    
    # Run the tests
    verbosity = 2 if verbose else 1
    runner = unittest.TextTestRunner(verbosity=verbosity)
    result = runner.run(suite)
    
    # Return exit code based on test results
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run SecondBrain tests')
    parser.add_argument('--module', '-m', help='Specific test module to run')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose output')
    
    args = parser.parse_args()
    
    sys.exit(run_tests(args.module, args.verbose))