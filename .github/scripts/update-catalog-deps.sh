#!/usr/bin/env bash
set -euo pipefail

# Update catalog-managed dependencies to latest versions by modifying
# pnpm-workspace.yaml version ranges and regenerating the lockfile.
# These deps are excluded from Dependabot to avoid lockfile corruption
# (dependabot-core #14339).
#
# Usage:
#   ./.github/scripts/update-catalog-deps.sh           # Update and regenerate lockfile
#   ./.github/scripts/update-catalog-deps.sh --dry-run  # Check only, no changes
#
# Exit codes:
#   0 = updates available (applied unless --dry-run)
#   1 = error
#   2 = no updates available
#
# Catalog deps are parsed from pnpm-workspace.yaml (both `catalog:` and
# `catalogs: <name>:` sections).

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo "=== Checking for catalog dependency updates ==="

WORKSPACE_FILE="pnpm-workspace.yaml"
if [[ ! -f "$WORKSPACE_FILE" ]]; then
  echo "ERROR: $WORKSPACE_FILE not found"
  exit 1
fi

UPDATED_COUNT=0

# check_and_update_dep <dep_name> <current_range> <catalog_label>
#
# Queries npm for the latest version, compares against the current range,
# and updates pnpm-workspace.yaml if a newer version is available.
check_and_update_dep() {
  local dep_name="$1"
  local current_range="$2"
  local catalog_label="$3"

  # Extract prefix (^, ~, or empty) and base version
  local prefix=""
  local base_version="$current_range"
  if [[ "$current_range" == "^"* ]]; then
    prefix="^"
    base_version="${current_range:1}"
  elif [[ "$current_range" == "~"* ]]; then
    prefix="~"
    base_version="${current_range:1}"
  fi

  # Query npm registry for latest version
  local latest
  latest=$(npm view "$dep_name" version 2>/dev/null) || {
    echo "  WARNING: Could not fetch latest version for $dep_name, skipping"
    return
  }

  # Compare versions: is latest newer than base_version?
  local newer
  newer=$(printf '%s\n%s\n' "$base_version" "$latest" | sort -V | tail -1)

  if [[ "$latest" != "$base_version" && "$newer" == "$latest" ]]; then
    local new_range="${prefix}${latest}"
    echo "  UPDATE ($catalog_label): $dep_name $current_range -> $new_range"

    if [[ "$DRY_RUN" == "false" ]]; then
      # Build sed pattern that matches both quoted and unquoted dep names.
      # Use | as delimiter since dep names contain /
      # Match: '  <dep_name>: <range>' or '  '<dep_name>': <range>'
      # Also handle 4-space indent for named catalogs
      sed -i.bak "s|\\([ ]*\\)\\(['\"]\\{0,1\\}${dep_name}['\"]\\{0,1\\}\\): *${current_range}|\\1\\2: ${new_range}|" "$WORKSPACE_FILE"
    fi

    UPDATED_COUNT=$((UPDATED_COUNT + 1))
  else
    echo "  OK ($catalog_label): $dep_name ${current_range} (latest: $latest)"
  fi
}

# --- Process default catalog ---
echo ""
echo "--- Checking default catalog deps ---"

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  # Parse dep name: strip leading spaces and quotes, extract up to the colon
  dep_name=$(echo "$line" | sed "s/^  //; s/^['\"]//; s/['\"] *:.*//; s/ *:.*//")
  # Parse version range: everything after the colon+space
  current_range=$(echo "$line" | sed "s/^[^:]*: *//")

  check_and_update_dep "$dep_name" "$current_range" "default"
done < <(
  awk '/^catalog:/{found=1; next} /^[^ ]/{if(found) exit} found && /^  [^ ]/' "$WORKSPACE_FILE"
)

# --- Process named catalogs (e.g. catalogs: website:) ---
# Extract named catalog sections: lines indented with 4 spaces under a named catalog
echo ""
echo "--- Checking named catalog deps ---"

current_catalog=""
while IFS= read -r line; do
  # Detect catalog name lines (2-space indent, ends with colon)
  if echo "$line" | grep -qE '^  [a-zA-Z].*:$'; then
    current_catalog=$(echo "$line" | sed 's/^ *//; s/:$//')
    continue
  fi
  # Dep lines are indented with 4 spaces
  if [[ -n "$current_catalog" ]] && echo "$line" | grep -qE '^    [^ ]'; then
    dep_name=$(echo "$line" | sed "s/^    //; s/^['\"]//; s/['\"] *:.*//; s/ *:.*//")
    current_range=$(echo "$line" | sed "s/^[^:]*: *//")
    check_and_update_dep "$dep_name" "$current_range" "$current_catalog"
  fi
done < <(
  awk '/^catalogs:/{found=1; next} /^[^ ]/{if(found) exit} found' "$WORKSPACE_FILE"
)

# Clean up sed backup files
rm -f "${WORKSPACE_FILE}.bak"

echo ""
if [[ $UPDATED_COUNT -eq 0 ]]; then
  echo "All catalog dependencies are up to date."
  exit 2
fi

echo "$UPDATED_COUNT catalog dep(s) have updates."

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run: no changes applied."
  exit 0
fi

echo ""
echo "--- Regenerating lockfile ---"
# Catalog edits above changed pnpm-workspace.yaml; override CI's frozen default to update the lockfile.
pnpm install --no-frozen-lockfile

echo ""
echo "--- Summary of changes ---"
git diff --stat pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null || echo "(not in a git repo or no changes)"

echo ""
echo "=== Catalog dependency update complete ==="
