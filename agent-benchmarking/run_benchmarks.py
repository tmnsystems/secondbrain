#!/usr/bin/env python3
"""
Agent Benchmarking Runner

This script orchestrates the full benchmarking process for comparing
Jules, Codex, and Claude as AI coding agents.
"""

import os
import sys
import json
import argparse
import asyncio
import subprocess
from datetime import datetime
from typing import List, Dict, Any

def setup_environment():
    """Set up the environment for benchmarking"""
    print("Setting up environment...")
    
    # Create required directories if they don't exist
    for directory in ['tasks', 'reports']:
        os.makedirs(directory, exist_ok=True)
    
    # Check if tasks exist, create them if not
    if not os.path.exists('tasks/legacy_refactor'):
        print("Setting up benchmark tasks...")
        subprocess.run([sys.executable, 'setup_tasks.py'])
    
    # Check if config exists, create if not
    if not os.path.exists('config.json'):
        print("Creating default configuration...")
        default_config = {
            "use_notion": True,
            "notion_database_id": os.environ.get('NOTION_BENCHMARK_DB_ID', ''),
            "github_repo": os.environ.get('GITHUB_REPO', 'username/repo'),
            "smart_router_enabled": True,
            "agents": ["Jules", "Codex", "Claude"]
        }
        with open('config.json', 'w') as f:
            json.dump(default_config, f, indent=2)
    
    print("Environment setup complete.")

def check_github_setup(repo_name):
    """Check if GitHub is set up for Jules integration"""
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        print("WARNING: GITHUB_TOKEN environment variable not set.")
        print("Jules integration requires a GitHub token.")
        print("Set it with: export GITHUB_TOKEN=your_token")
        return False
    
    try:
        result = subprocess.run(
            [sys.executable, 'setup_github.py', '--repo', repo_name],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"WARNING: GitHub setup failed with code {result.returncode}")
            print(result.stderr)
            return False
        
        print("GitHub setup verified.")
        return True
    except Exception as e:
        print(f"ERROR checking GitHub setup: {e}")
        return False

async def run_benchmark(task_id):
    """Run the benchmark for a specific task"""
    print(f"Running benchmark for task: {task_id}")
    
    # Run the agent_benchmark.py script
    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, 'agent_benchmark.py', 
            '--task', task_id,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            print(f"Benchmark failed with code {process.returncode}")
            print(stderr.decode())
            return False
        
        print(stdout.decode())
        return True
    except Exception as e:
        print(f"ERROR running benchmark: {e}")
        return False

async def run_smart_router(task_id):
    """Run the smart agent router on a task"""
    print(f"Running smart agent router for task: {task_id}")
    
    # Get the task specification
    task_path = os.path.join('tasks', task_id, 'task_spec.json')
    
    try:
        process = await asyncio.create_subprocess_exec(
            sys.executable, 'smart_agent_router.py',
            '--task', task_path,
            '--format', 'text',
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            print(f"Smart router failed with code {process.returncode}")
            print(stderr.decode())
            return None
        
        # Extract recommended agent from output
        output = stdout.decode()
        print(output)
        
        for line in output.split('\n'):
            if "Recommended Agent:" in line:
                agent = line.split(':')[1].strip()
                return agent
        
        return None
    except Exception as e:
        print(f"ERROR running smart router: {e}")
        return None

def load_available_tasks():
    """Load the list of available benchmark tasks"""
    tasks = []
    
    if os.path.exists('tasks'):
        for item in os.listdir('tasks'):
            task_dir = os.path.join('tasks', item)
            if os.path.isdir(task_dir) and os.path.exists(os.path.join(task_dir, 'task_spec.json')):
                tasks.append(item)
    
    return tasks

async def main():
    parser = argparse.ArgumentParser(description="Run AI coding agent benchmarks")
    parser.add_argument('--task', help='Specific task to benchmark (all if not specified)')
    parser.add_argument('--agent', choices=['Jules', 'Codex', 'Claude', 'smart'],
                      help='Specific agent to test (all if not specified)')
    parser.add_argument('--setup-only', action='store_true',
                      help='Only set up the environment, don\'t run benchmarks')
    parser.add_argument('--github-setup', action='store_true',
                      help='Run GitHub setup for Jules integration')
    
    args = parser.parse_args()
    
    # Step 1: Set up environment
    setup_environment()
    
    # Step 2: If requested, set up GitHub for Jules
    if args.github_setup:
        with open('config.json', 'r') as f:
            config = json.load(f)
            repo_name = config.get('github_repo', '')
        
        if not repo_name:
            print("ERROR: GitHub repository not configured in config.json")
            return 1
        
        if not check_github_setup(repo_name):
            print("GitHub setup failed. Fix the issues before running benchmarks.")
            if not args.setup_only:
                return 1
    
    # If setup only, exit here
    if args.setup_only:
        return 0
    
    # Step 3: Determine which tasks to run
    available_tasks = load_available_tasks()
    
    if not available_tasks:
        print("ERROR: No benchmark tasks found.")
        return 1
    
    if args.task:
        if args.task in available_tasks:
            tasks_to_run = [args.task]
        else:
            print(f"ERROR: Task '{args.task}' not found.")
            print(f"Available tasks: {', '.join(available_tasks)}")
            return 1
    else:
        tasks_to_run = available_tasks
    
    # Step 4: Run benchmarks
    success = True
    for task in tasks_to_run:
        # If using smart agent routing
        if args.agent == 'smart':
            recommended_agent = await run_smart_router(task)
            if recommended_agent:
                print(f"Smart router recommends using {recommended_agent} for task '{task}'")
                # In a real implementation, we would run only the recommended agent
            else:
                print(f"Smart router failed for task '{task}', running all agents")
                # Fall back to running all agents
        
        # Run the benchmark
        benchmark_success = await run_benchmark(task)
        if not benchmark_success:
            success = False
    
    return 0 if success else 1

if __name__ == "__main__":
    asyncio.run(main())