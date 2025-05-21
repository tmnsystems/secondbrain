#!/usr/bin/env python3
"""
masterplan_sync.py

Sync masterplan.md into JSON and propagate to each app for fast local access.
"""
import os
import json

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_MD = os.path.join(ROOT_DIR, 'masterplan.md')
MASTER_JSON = os.path.join(ROOT_DIR, 'masterplan.json')
APPS_DIR = os.path.join(ROOT_DIR, 'apps')

def load_master():
    with open(MASTER_MD, 'r', encoding='utf-8') as f:
        return f.read()

def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def sync_masterplan():
    content = load_master()
    data = {'masterplan': content}
    # Write root JSON
    write_json(MASTER_JSON, data)
    # Propagate to each app
    if os.path.isdir(APPS_DIR):
        for name in os.listdir(APPS_DIR):
            app_path = os.path.join(APPS_DIR, name)
            if os.path.isdir(app_path):
                dest = os.path.join(app_path, 'masterplan.json')
                write_json(dest, data)
                print(f'Updated {dest}')
    else:
        print(f'Apps directory not found: {APPS_DIR}')

if __name__ == '__main__':
    sync_masterplan()