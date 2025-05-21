#!/usr/bin/env python3
"""
GitHub Setup for Jules Integration

This script helps set up a GitHub repository for benchmarking with Jules.
It creates necessary labels and prepares the repository structure.
"""

import os
import sys
import argparse
import json
from github import Github, GithubException

def setup_github_repository(token, repo_name, jules_label="assign-to-jules"):
    """
    Set up a GitHub repository for Jules integration
    
    Args:
        token: GitHub personal access token
        repo_name: Name of the repository (format: username/repo)
        jules_label: Label that triggers Jules assignment
    """
    try:
        # Initialize GitHub API client
        g = Github(token)
        
        # Get the repository
        repo = g.get_repo(repo_name)
        print(f"Successfully connected to repository: {repo_name}")
        
        # Check if Jules label exists, create if not
        existing_labels = [label.name for label in repo.get_labels()]
        if jules_label not in existing_labels:
            repo.create_label(
                name=jules_label,
                color="5319e7",  # Purple color
                description="Assign this task to Jules for automated coding"
            )
            print(f"Created '{jules_label}' label")
        else:
            print(f"Label '{jules_label}' already exists")
            
        # Create README file in the benchmark directory if it doesn't exist
        try:
            repo.get_contents("benchmarks/README.md")
            print("Benchmark README already exists")
        except GithubException:
            # Create benchmark directory and README
            benchmark_readme = """# Jules Benchmarking

This directory contains benchmark tasks for evaluating Jules against other AI coding agents.

## Available Tasks

- Legacy Refactor: Replace deprecated APIs with modern alternatives
- Multi-File Update: Update imports and dependencies across multiple files
- Security Enhancement: Improve input validation and error handling

## How to Run

Assign the 'assign-to-jules' label to issues to activate Jules.

## Results

Benchmark results are stored in the 'results' directory.
"""
            repo.create_file(
                path="benchmarks/README.md",
                message="Add benchmark README",
                content=benchmark_readme
            )
            print("Created benchmark README.md")
            
        # Check if issue template exists for Jules tasks
        try:
            repo.get_contents(".github/ISSUE_TEMPLATE/jules_task.md")
            print("Jules issue template already exists")
        except GithubException:
            # Create issue template
            issue_template = """---
name: Jules Task
about: Task for Jules to complete
title: "[JULES] "
labels: assign-to-jules
assignees: ''

---

## Task Description

**Title:** 

**File(s) to Modify:** 

**Objective:** 

**Success Criteria:**
- 
- 
- 

## Additional Context

Any other information that might help Jules complete the task.
"""
            try:
                # Try to get the .github/ISSUE_TEMPLATE directory
                repo.get_contents(".github/ISSUE_TEMPLATE")
            except GithubException:
                # Create .github directory if it doesn't exist
                try:
                    repo.get_contents(".github")
                except GithubException:
                    repo.create_file(
                        path=".github/README.md",
                        message="Create .github directory",
                        content="# GitHub Configuration\n"
                    )
                    print("Created .github directory")
                    
                # Create ISSUE_TEMPLATE directory
                repo.create_file(
                    path=".github/ISSUE_TEMPLATE/README.md",
                    message="Create ISSUE_TEMPLATE directory",
                    content="# Issue Templates\n"
                )
                print("Created ISSUE_TEMPLATE directory")
                
            # Create Jules task template
            repo.create_file(
                path=".github/ISSUE_TEMPLATE/jules_task.md",
                message="Add Jules task issue template",
                content=issue_template
            )
            print("Created Jules issue template")
            
        print("\nRepository setup complete! You can now create issues with the 'assign-to-jules' label.")
        print("When Jules becomes available, it will automatically process these issues.")
        
    except GithubException as e:
        print(f"GitHub API error: {e}")
        return False
    except Exception as e:
        print(f"Error setting up GitHub repository: {e}")
        return False
        
    return True

def create_sample_issue(token, repo_name, task_spec_path, jules_label="assign-to-jules"):
    """
    Create a sample issue for Jules based on a task specification
    
    Args:
        token: GitHub personal access token
        repo_name: Name of the repository (format: username/repo)
        task_spec_path: Path to the task specification JSON file
        jules_label: Label that triggers Jules assignment
    """
    try:
        # Load task specification
        with open(task_spec_path, 'r') as f:
            task_spec = json.load(f)
            
        # Initialize GitHub API client
        g = Github(token)
        
        # Get the repository
        repo = g.get_repo(repo_name)
        
        # Get the label
        label = repo.get_label(jules_label)
        
        # Prepare issue content
        title = f"[JULES] {task_spec['title']}"
        body = f"""## Task Description

**Title:** {task_spec['title']}

**File(s) to Modify:** {task_spec['file']}

**Objective:** {task_spec['description']}

**Success Criteria:**
"""
        for criterion in task_spec['criteria']:
            body += f"- {criterion}\n"
            
        body += "\n## Additional Context\n\n"
        if 'reference_docs' in task_spec:
            body += "**Reference Documentation:**\n"
            for doc in task_spec['reference_docs']:
                body += f"- {doc}\n"
                
        # Create the issue
        issue = repo.create_issue(
            title=title,
            body=body,
            labels=[label]
        )
        
        print(f"Created sample issue: {issue.html_url}")
        return True
        
    except GithubException as e:
        print(f"GitHub API error: {e}")
        return False
    except Exception as e:
        print(f"Error creating sample issue: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Set up GitHub repository for Jules benchmarking")
    parser.add_argument('--token', type=str, help='GitHub personal access token')
    parser.add_argument('--repo', type=str, help='Repository name (username/repo)')
    parser.add_argument('--label', type=str, default='assign-to-jules', 
                      help='Label for Jules assignment (default: assign-to-jules)')
    parser.add_argument('--create-issue', action='store_true', 
                      help='Create a sample issue for Jules')
    parser.add_argument('--task-spec', type=str, default='tasks/legacy_refactor/task_spec.json',
                      help='Path to task specification for sample issue')
    
    args = parser.parse_args()
    
    # Get token from environment if not provided
    token = args.token or os.environ.get('GITHUB_TOKEN')
    if not token:
        print("Error: GitHub token not provided. Use --token or set GITHUB_TOKEN environment variable.")
        return 1
        
    # Get repo from environment if not provided
    repo_name = args.repo or os.environ.get('GITHUB_REPO')
    if not repo_name:
        print("Error: Repository name not provided. Use --repo or set GITHUB_REPO environment variable.")
        return 1
    
    # Set up the repository
    success = setup_github_repository(token, repo_name, args.label)
    if not success:
        return 1
        
    # Create sample issue if requested
    if args.create_issue:
        if not os.path.exists(args.task_spec):
            print(f"Error: Task specification file not found: {args.task_spec}")
            return 1
            
        success = create_sample_issue(token, repo_name, args.task_spec, args.label)
        if not success:
            return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())