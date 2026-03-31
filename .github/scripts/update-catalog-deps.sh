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

echo ""
echo "--- Checking outdated packages ---"
OUTDATED_OUTPUT=$(pnpm outdated "${DEFAULT_CATALOG_DEPS[@]}" 2>&1 || true)

if [[ -z "$OUTDATED_OUTPUT" ]] || echo "$OUTDATED_OUTPUT" | grep -q "All packages are up to date"; then
  echo "All catalog dependencies are up to date."
  exit 0
fi

echo "$OUTDATED_OUTPUT"

if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "--- Dry run: would update the above packages ---"
  exit 0
fi

echo ""
echo "--- Updating default catalog dependencies ---"
pnpm update "${DEFAULT_CATALOG_DEPS[@]}" --recursive

echo ""
echo "--- Regenerating lockfile ---"
pnpm install

echo ""
echo "--- Summary of changes ---"
git diff --stat pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null || echo "(not in a git repo or no changes)"

echo ""
echo "=== Catalog dependency update complete ==="
