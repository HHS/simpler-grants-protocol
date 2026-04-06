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
# Exit codes:
#   0 = updates available (applied unless --dry-run)
#   1 = error
#   2 = no updates available
#
# Catalog deps are parsed from the `catalog:` section of pnpm-workspace.yaml.

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

DEFAULT_CATALOG_DEPS=()
while IFS= read -r dep; do
  DEFAULT_CATALOG_DEPS+=("$dep")
done < <(
  awk '/^catalog:/{found=1; next} /^[^ ]/{if(found) exit} found && /^  /' "$WORKSPACE_FILE" \
    | sed "s/^  //; s/^'//; s/':.*//" \
    | sed "s/:.*//" \
    | sort
)

if [[ ${#DEFAULT_CATALOG_DEPS[@]} -eq 0 ]]; then
  echo "ERROR: No dependencies found in catalog: section of $WORKSPACE_FILE"
  exit 1
fi

echo "Found ${#DEFAULT_CATALOG_DEPS[@]} catalog deps: ${DEFAULT_CATALOG_DEPS[*]}"

echo ""
echo "--- Checking outdated packages (default catalog) ---"

HAS_DEFAULT_UPDATES=false
DEFAULT_OUTDATED=$(pnpm outdated "${DEFAULT_CATALOG_DEPS[@]}" 2>&1) || EXIT_CODE=$?
EXIT_CODE=${EXIT_CODE:-0}
if [[ $EXIT_CODE -eq 1 ]]; then
  HAS_DEFAULT_UPDATES=true
elif [[ $EXIT_CODE -ne 0 ]]; then
  echo "ERROR: pnpm outdated failed (exit code $EXIT_CODE):"
  echo "$DEFAULT_OUTDATED"
  exit 1
fi

echo ""
echo "--- Checking outdated packages (website catalog) ---"

HAS_WEBSITE_UPDATES=false
WEBSITE_OUTDATED=$(pnpm outdated vitest --filter website 2>&1) || EXIT_CODE=$?
EXIT_CODE=${EXIT_CODE:-0}
if [[ $EXIT_CODE -eq 1 ]]; then
  HAS_WEBSITE_UPDATES=true
elif [[ $EXIT_CODE -ne 0 ]]; then
  echo "ERROR: pnpm outdated failed for website catalog (exit code $EXIT_CODE):"
  echo "$WEBSITE_OUTDATED"
  exit 1
fi

if [[ "$HAS_DEFAULT_UPDATES" == "false" && "$HAS_WEBSITE_UPDATES" == "false" ]]; then
  echo "All catalog dependencies are up to date."
  exit 2
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
