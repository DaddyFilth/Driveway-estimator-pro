#!/usr/bin/env bash
set -euo pipefail

# Simple guard
if [ ! -f package.json ]; then
  echo "package.json not found in current directory" >&2
  exit 1
fi

# Ensure jq and yq exist
if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed" >&2
  exit 1
fi

if ! command -v yq >/dev/null 2>&1; then
  echo "yq is required but not installed (go-yq or mikefarah/yq)" >&2
  exit 1
fi

# Extract pnpm section from package.json
PNPM_JSON=$(jq -e '.pnpm // empty' package.json || true)

if [ -z "$PNPM_JSON" ]; then
  echo "No pnpm field found in package.json; nothing to migrate" >&2
  exit 0
fi

# Convert pnpm JSON object to YAML and write pnpm-workspace.yaml
# This preserves whatever keys were under "pnpm" (e.g. packages, catalog, overrides, etc.)
echo "$PNPM_JSON" | yq -P e - > pnpm-workspace.yaml

echo "Created pnpm-workspace.yaml from package.json#pnpm"

# Remove pnpm key from package.json
jq 'del(.pnpm)' package.json > package.json.__tmp
mv package.json.__tmp package.json

echo "Removed pnpm field from package.json"
echo "Migration complete."
