#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  echo "SUPABASE_DB_PASSWORD is required to apply migration 0125 to the linked Supabase project." >&2
  exit 2
fi

echo "Applying migration 0125 to the linked Supabase project…"
SUPABASE_DB_PASSWORD="$SUPABASE_DB_PASSWORD" npx supabase db push --linked --yes

echo "Checking delivery columns through PostgREST…"
node --input-type=module <<'NODE'
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
for (const [table, columns] of [["restaurants", "delivery_enabled,delivery_base_fee,delivery_per_km_fee,delivery_free_km,delivery_max_km,delivery_average_speed_kmh"], ["orders", "delivery_address,delivery_lat,delivery_lng,delivery_distance_km,delivery_fee,delivery_eta_minutes"]]) {
  const { error } = await supabase.from(table).select(columns).limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: delivery columns available`);
}
NODE
