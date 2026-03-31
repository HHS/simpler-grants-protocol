#!/usr/bin/env bash
set -euo pipefail

# Update catalog-managed dependencies to latest compatible versions.
# These deps are managed via pnpm-workspace.yaml catalogs and are excluded
# from Dependabot to avoid lockfile corruption (dependabot-core #14339).
#
# Usage:
#   ./.github/scripts/update-catalog-deps.sh           # Update and regenerate lockfile
#   ./.github/scripts/update-catalog-deps.sh --dry-run  # Check only, no changes
#
# Catalog deps (from pnpm-workspace.yaml):
#   Default catalog: @types/node, @typespec/compiler, @typespec/http,
#     @typespec/json-schema, @typespec/openapi, @typespec/openapi3,
#     @typespec/rest, @typespec/versioning, @vitest/coverage-v8,
#     eslint-plugin-vitest, vitest
#   Website catalog: vitest (separate version ^4.x)

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo "=== Checking for catalog dependency updates ==="

# Define catalog-managed packages
# IMPORTANT: Must match the `catalog:` section in pnpm-workspace.yaml.
# The validation below will fail if they drift apart.
DEFAULT_CATALOG_DEPS=(
  "@types/node"
  "@typespec/compiler"
  "@typespec/http"
  "@typespec/json-schema"
  "@typespec/openapi"
  "@typespec/openapi3"
  "@typespec/rest"
  "@typespec/versioning"
  "@vitest/coverage-v8"
  "eslint-plugin-vitest"
  "vitest"
)

WORKSPACE_FILE="pnpm-workspace.yaml"
if [[ -f "$WORKSPACE_FILE" ]]; then
  YAML_DEPS=$(awk '/^catalog:/{found=1; next} /^[^ ]/{if(found) exit} found && /^  /' "$WORKSPACE_FILE" | sed "s/^  //; s/^'//; s/':.*//" | sed "s/:.*//" | sort)
  SCRIPT_DEPS=$(printf '%s\n' "${DEFAULT_CATALOG_DEPS[@]}" | sort)
  if [[ "$YAML_DEPS" != "$SCRIPT_DEPS" ]]; then
    echo "ERROR: DEFAULT_CATALOG_DEPS does not match catalog: in $WORKSPACE_FILE"
    echo ""
    echo "In pnpm-workspace.yaml but not in script:"
    comm -23 <(echo "$YAML_DEPS") <(echo "$SCRIPT_DEPS") | sed 's/^/  /'
    echo "In script but not in pnpm-workspace.yaml:"
    comm -13 <(echo "$YAML_DEPS") <(echo "$SCRIPT_DEPS") | sed 's/^/  /'
    echo ""
    echo "Update DEFAULT_CATALOG_DEPS in this script to match pnpm-workspace.yaml."
    exit 1
  fi
fi

echo ""
echo "--- Checking outdated packages (default catalog) ---"

HAS_DEFAULT_UPDATES=false
DEFAULT_OUTDATED=$(pnpm outdated "${DEFAULT_CATALOG_DEPS[@]}" 2>&1) && true || HAS_DEFAULT_UPDATES=true

echo ""
echo "--- Checking outdated packages (website catalog) ---"

HAS_WEBSITE_UPDATES=false
WEBSITE_OUTDATED=$(pnpm outdated vitest --filter website 2>&1) && true || HAS_WEBSITE_UPDATES=true

if [[ "$HAS_DEFAULT_UPDATES" == "false" && "$HAS_WEBSITE_UPDATES" == "false" ]]; then
  echo "All catalog dependencies are up to date."
  exit 0
fi

[[ "$HAS_DEFAULT_UPDATES" == "true" ]] && echo "$DEFAULT_OUTDATED"
[[ "$HAS_WEBSITE_UPDATES" == "true" ]] && echo "$WEBSITE_OUTDATED"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "--- Dry run: would update the above packages ---"
  exit 0
fi

echo ""
echo "--- Updating default catalog dependencies ---"
pnpm update "${DEFAULT_CATALOG_DEPS[@]}" --recursive

# The website uses a separate vitest version via the "website" named catalog.
# pnpm update --recursive above should handle it, but ensure the website
# workspace gets its vitest updated too.
echo ""
echo "--- Updating website catalog dependencies ---"
pnpm update vitest --filter website

echo ""
echo "--- Regenerating lockfile ---"
pnpm install

echo ""
echo "--- Summary of changes ---"
git diff --stat pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null || echo "(not in a git repo or no changes)"

echo ""
echo "=== Catalog dependency update complete ==="
