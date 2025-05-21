#!/usr/bin/env python3
"""
Script to automatically clean up duplicate files in the SecondBrain processed_content directory.
This non-interactive version keeps 'done_' versions and deletes regular duplicates.
"""

import os
import sys
import json
import hashlib
from pathlib import Path
from collections import defaultdict

PROCESSED_CONTENT_DIR = "/Volumes/Envoy/SecondBrain/processed_content"

def get_file_content_hash(file_path):
    """Get a hash of the file content to identify identical files."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        # Create a hash of the content
        return hashlib.md5(content.encode()).hexdigest()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

def find_prefixed_duplicates():
    """Find files that exist both with and without the 'done_' prefix."""
    files = os.listdir(PROCESSED_CONTENT_DIR)
    
    # Get all files that start with 'done_'
    done_files = [f for f in files if f.startswith('done_') and f.endswith('.json')]
    
    duplicates = []
    
    # For each 'done_' file, check if the non-prefixed version exists
    for done_file in done_files:
        # Remove 'done_' prefix to get the regular filename
        regular_file = done_file[5:]
        
        if regular_file in files:
            duplicates.append((done_file, regular_file))
    
    return duplicates

def delete_files(file_list):
    """Delete files from the processed_content directory."""
    deleted = []
    for filename in file_list:
        file_path = os.path.join(PROCESSED_CONTENT_DIR, filename)
        try:
            os.remove(file_path)
            deleted.append(filename)
            print(f"Deleted {filename}")
        except Exception as e:
            print(f"Error deleting {filename}: {e}")
    
    return deleted

def create_backup_dir():
    """Create backup directory if it doesn't exist."""
    backup_dir = os.path.join(PROCESSED_CONTENT_DIR, "duplicates_backup")
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir

def main():
    print("Finding duplicates in processed_content directory...\n")
    
    # Find 'done_' prefixed duplicates
    prefix_duplicates = find_prefixed_duplicates()
    
    if prefix_duplicates:
        print(f"Found {len(prefix_duplicates)} files with both 'done_' and regular versions:")
        for done_file, regular_file in prefix_duplicates:
            print(f"  - {done_file} and {regular_file}")
            
        # Create backup directory
        backup_dir = create_backup_dir()
            
        # Keep 'done_' versions, delete regular versions
        to_delete = [regular for done, regular in prefix_duplicates]
        deleted = delete_files(to_delete)
        print(f"\nDeleted {len(deleted)} regular versions, keeping 'done_' versions.")
        
    else:
        print("No prefix duplicates found.")
    
    print("\nDone.")

if __name__ == "__main__":
    main()