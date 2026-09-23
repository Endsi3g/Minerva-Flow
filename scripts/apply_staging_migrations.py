#!/usr/bin/env python3
"""
Minerva Flow — Direct HTTPS Migration Runner for Supabase Management API
Executes database migrations via HTTPS (port 443) without requiring direct Postgres TCP access (port 5432).
"""

import os
import sys
import glob
import re
import json
import urllib.request
import urllib.error

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "lhosxxtvgmedwarwgjhb")
ACCESS_TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()

if not ACCESS_TOKEN:
    print("\n❌ Error: SUPABASE_ACCESS_TOKEN is not set.")
    print("\nTo generate a token (10 seconds):")
    print("  1. Go to: https://supabase.com/dashboard/account/tokens")
    print("  2. Click 'Generate new token', name it 'Flow Migration'")
    print("  3. Run:")
    print(f"     SUPABASE_ACCESS_TOKEN='sbp_...' python3 scripts/apply_staging_migrations.py\n")
    sys.exit(1)

API_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

def execute_sql(query: str):
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "User-Agent": "MinervaFlow-MigrationRunner/1.0"
    }
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(API_URL, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data) if data else {}
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP {e.code}: {error_body}")
    except Exception as e:
        raise RuntimeError(f"Network error: {e}")

def main():
    print(f"🚀 Minerva Flow — Running Staging Migrations via HTTPS API")
    print(f"📦 Target Project: {PROJECT_REF}")
    
    # 1. Initialize schema_migrations
    print("⚙️  Ensuring supabase_migrations table exists...")
    init_sql = """
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version text NOT NULL PRIMARY KEY,
        statements text[],
        name text
    );
    """
    execute_sql(init_sql)

    # 2. Fetch applied migrations
    applied = set()
    try:
        res = execute_sql("SELECT version FROM supabase_migrations.schema_migrations;")
        if isinstance(res, list):
            for row in res:
                if isinstance(row, dict) and "version" in row:
                    applied.add(str(row["version"]))
    except Exception as e:
        print(f"⚠️  Could not read schema_migrations: {e}")

    # 3. Load migration files
    mig_dir = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations")
    files = sorted([f for f in os.listdir(mig_dir) if f.endswith(".sql")])
    print(f"📂 Found {len(files)} migration files ({len(applied)} already applied).")

    unapplied = []
    for f in files:
        m = re.match(r"^([0-9]+)_(.*)\.sql$", f)
        version = m.group(1) if m else f
        name = m.group(2) if m else f
        if version not in applied:
            unapplied.append((f, version, name))

    if not unapplied:
        print("✅ Remote database is already up to date! All migrations are applied.")
        return

    print(f"⚡ Applying {len(unapplied)} migrations...\n")

    success_count = 0
    for filename, version, name in unapplied:
        filepath = os.path.join(mig_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            sql_content = f.read().strip()

        print(f"  ▶ Applying [{version}] {name}...", end=" ", flush=True)
        wrapped_sql = f"""
        BEGIN;
        {sql_content};
        INSERT INTO supabase_migrations.schema_migrations (version, name) 
        VALUES ('{version}', '{name}') 
        ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;
        COMMIT;
        """
        try:
            execute_sql(wrapped_sql)
            print("✓ OK")
            success_count += 1
        except Exception as e:
            print(f"❌ FAILED")
            print(f"\nError applying {filename}:\n{e}\n")
            sys.exit(1)

    print(f"\n🎉 Successfully applied {success_count}/{len(unapplied)} migrations!")

if __name__ == "__main__":
    main()
