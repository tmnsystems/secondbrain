#!/usr/bin/env python3
"""
Script to identify and fix duplicate files in the SecondBrain processed_content directory.

This script identifies:
1. Files with both 'done_' and regular versions
2. Files with duplicate content
3. Provides options to clean up duplicates
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

def find_content_duplicates():
    """Find files with identical content."""
    files = [f for f in os.listdir(PROCESSED_CONTENT_DIR) if f.endswith('.json')]
    
    # Group files by content hash
    hash_to_files = defaultdict(list)
    
    for filename in files:
        file_path = os.path.join(PROCESSED_CONTENT_DIR, filename)
        content_hash = get_file_content_hash(file_path)
        
        if content_hash:
            hash_to_files[content_hash].append(filename)
    
    # Filter to only include hashes with multiple files
    duplicates = {hash_val: files for hash_val, files in hash_to_files.items() if len(files) > 1}
    
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

def move_to_backup(file_list):
    """Move files to a backup directory."""
    backup_dir = os.path.join(PROCESSED_CONTENT_DIR, "duplicates_backup")
    os.makedirs(backup_dir, exist_ok=True)
    
    moved = []
    for filename in file_list:
        src_path = os.path.join(PROCESSED_CONTENT_DIR, filename)
        dst_path = os.path.join(backup_dir, filename)
        
        try:
            os.rename(src_path, dst_path)
            moved.append(filename)
            print(f"Moved {filename} to backup")
        except Exception as e:
            print(f"Error moving {filename}: {e}")
    
    return moved

def main():
    print("Finding duplicates in processed_content directory...\n")
    
    # Find 'done_' prefixed duplicates
    prefix_duplicates = find_prefixed_duplicates()
    
    if prefix_duplicates:
        print(f"Found {len(prefix_duplicates)} files with both 'done_' and regular versions:")
        for done_file, regular_file in prefix_duplicates:
            print(f"  - {done_file} and {regular_file}")
    else:
        print("No prefix duplicates found.")
    
    print("\nFinding content duplicates (files with identical content)...")
    content_duplicates = find_content_duplicates()
    
    if content_duplicates:
        print(f"Found {len(content_duplicates)} sets of files with identical content:")
        for hash_val, files in content_duplicates.items():
            print(f"  - Identical files: {', '.join(files)}")
    else:
        print("No content duplicates found.")
    
    # Handle duplicates
    if prefix_duplicates or content_duplicates:
        print("\nHow would you like to handle duplicates?")
        print("1. Keep 'done_' versions and delete regular versions")
        print("2. Keep regular versions and delete 'done_' versions")
        print("3. Move all duplicates to backup folder")
        print("4. Show details for manual review")
        print("5. Exit without changes")
        
        choice = input("\nEnter choice (1-5): ")
        
        if choice == '1':
            # Keep 'done_' versions, delete regular versions
            to_delete = [regular for done, regular in prefix_duplicates]
            delete_files(to_delete)
            print(f"Deleted {len(to_delete)} regular versions, keeping 'done_' versions.")
            
        elif choice == '2':
            # Keep regular versions, delete 'done_' versions
            to_delete = [done for done, regular in prefix_duplicates]
            delete_files(to_delete)
            print(f"Deleted {len(to_delete)} 'done_' versions, keeping regular versions.")
            
        elif choice == '3':
            # Move all duplicates to backup folder
            files_to_move = []
            for done, regular in prefix_duplicates:
                files_to_move.extend([done, regular])
            
            # Add content duplicates
            for files in content_duplicates.values():
                # Keep the first file, move the rest
                files_to_move.extend(files[1:])
            
            # Remove duplicates from the list
            files_to_move = list(set(files_to_move))
            
            moved = move_to_backup(files_to_move)
            print(f"Moved {len(moved)} files to backup folder.")
            
        elif choice == '4':
            # Show details for manual review
            print("\n=== MANUAL REVIEW DETAILS ===")
            
            print("\nPrefix Duplicates:")
            for done, regular in prefix_duplicates:
                done_path = os.path.join(PROCESSED_CONTENT_DIR, done)
                regular_path = os.path.join(PROCESSED_CONTENT_DIR, regular)
                
                # Get file sizes
                done_size = os.path.getsize(done_path)
                regular_size = os.path.getsize(regular_path)
                
                # Try to get content difference
                done_hash = get_file_content_hash(done_path)
                regular_hash = get_file_content_hash(regular_path)
                
                print(f"\n  {done} ({done_size} bytes) and {regular} ({regular_size} bytes)")
                print(f"  Content identical: {done_hash == regular_hash}")
                
                # Try to read dates from the files
                try:
                    with open(done_path, 'r') as f:
                        done_data = json.load(f)
                        done_date = done_data.get('date', 'Unknown')
                    
                    with open(regular_path, 'r') as f:
                        regular_data = json.load(f)
                        regular_date = regular_data.get('date', 'Unknown')
                    
                    print(f"  Done file date: {done_date}")
                    print(f"  Regular file date: {regular_date}")
                except Exception as e:
                    print(f"  Error reading dates: {e}")
            
            print("\nContent Duplicates:")
            for hash_val, files in content_duplicates.items():
                print(f"\n  Hash: {hash_val}")
                for filename in files:
                    file_path = os.path.join(PROCESSED_CONTENT_DIR, filename)
                    file_size = os.path.getsize(file_path)
                    print(f"  - {filename} ({file_size} bytes)")
            
            input("\nPress Enter to continue...")
            
        elif choice == '5':
            print("Exiting without changes.")
        
        else:
            print("Invalid choice. Exiting without changes.")
    
    print("\nDone.")

if __name__ == "__main__":
    main()