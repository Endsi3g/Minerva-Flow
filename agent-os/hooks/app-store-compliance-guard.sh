#!/usr/bin/env bash
set -euo pipefail

# Repository entrypoint. The user-level hook contains the implementation so
# local agents and CI invoke the same read-only compliance checks.
HOOK="$HOME/.Codex/hooks/app-store-compliance-guard.sh"
if [[ ! -x "$HOOK" ]]; then
  echo "ERROR: missing executable compliance hook: $HOOK" >&2
  exit 1
fi
exec "$HOOK" "$@"
