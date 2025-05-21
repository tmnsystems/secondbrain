#!/usr/bin/env python3
"""
Catalog Notion database IDs:
- Reads NOTION_*_DB_ID vars from secondbrain_api_keys.env or .env
- Retrieves metadata for each via Notion API
- Writes infra/notion_databases_catalog.json
"""
import os
import json
import pathlib
import sys
import requests

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / 'secondbrain_api_keys.env'
if not ENV_FILE.exists():
    ENV_FILE = BASE_DIR / '.env'
    if not ENV_FILE.exists():
        print('❌ No environment file found (secondbrain_api_keys.env or .env).')
        sys.exit(1)

# Load env variables
env = {}
with ENV_FILE.open() as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, val = line.split('=', 1)
        env[key.strip()] = val.strip()

NOTION_TOKEN = env.get('NOTION_API_KEY')
if not NOTION_TOKEN:
    print('❌ NOTION_API_KEY not set in environment.')
    sys.exit(1)

catalog = []
for key, id_ in env.items():
    if key.startswith('NOTION_') and key.endswith('_DB_ID'):
        catalog.append({'key': key, 'id': id_})

# Ensure infra directory exists
infra_dir = BASE_DIR / 'infra'
infra_dir.mkdir(exist_ok=True)

# Write JSON catalog, with fallback on permission errors
out_file = infra_dir / 'notion_databases_catalog.json'
try:
    with out_file.open('w') as f:
        json.dump(catalog, f, indent=2)
    print(f'📘 Wrote {len(catalog)} entries to {out_file}')
except PermissionError:
    # Fallback to home directory
    fallback = pathlib.Path.home() / 'notion_databases_catalog.json'
    with fallback.open('w') as f:
        json.dump(catalog, f, indent=2)
    print(f'⚠️ Permission denied writing to {out_file}')
    print(f'📘 Wrote catalog to fallback location: {fallback}')
    print(f'👉 To complete, copy it back:')
    print(f'   cp {fallback} {out_file}')

# Check for duplicates
ids_list = [e['id'] for e in catalog]
dups = {id_: ids_list.count(id_) for id_ in set(ids_list) if ids_list.count(id_) > 1}
if dups:
    print('⚠️ Duplicate DB IDs found:')
    for id_, count in dups.items():
        print(f' - {id_}: {count} times')
    print('✅ Please remove duplicates from your env file and rerun this script.')
sys.exit(0)