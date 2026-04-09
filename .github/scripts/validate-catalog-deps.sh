#!/usr/bin/env bash
set -euo pipefail

# Validate that every catalog-managed dependency in pnpm-workspace.yaml
# is covered by a matching ignore pattern in .github/dependabot.yml.
#
# This prevents Dependabot from opening PRs for catalog deps, which would
# corrupt the lockfile (dependabot-core #14339).
#
# Usage:
#   ./.github/scripts/validate-catalog-deps.sh           # Run from repo root
#
# Exit codes:
#   0 = all catalog deps are covered
#   1 = one or more catalog deps missing from ignore list

WORKSPACE_FILE="pnpm-workspace.yaml"
DEPENDABOT_FILE=".github/dependabot.yml"

if [[ ! -f "$WORKSPACE_FILE" ]]; then
  echo "ERROR: $WORKSPACE_FILE not found (run from repo root)"
  exit 1
fi

if [[ ! -f "$DEPENDABOT_FILE" ]]; then
  echo "ERROR: $DEPENDABOT_FILE not found"
  exit 1
fi

CATALOG_DEPS=$(awk '/^catalog:/{found=1; next} /^[^ ]/{if(found) exit} found && /^  /' "$WORKSPACE_FILE" \
  | sed "s/^  //; s/^'//; s/':.*//" | sed "s/:.*//" | sort)

IGNORE_PATTERNS=$(grep 'dependency-name:' "$DEPENDABOT_FILE" \
  | sed 's/.*dependency-name: *//; s/"//g; s/'"'"'//g' | sort -u)

uncovered=()
while IFS= read -r dep; do
  [[ -z "$dep" ]] && continue
  covered=false
  while IFS= read -r pattern; do
    # shellcheck disable=SC2053
    if [[ "$dep" == $pattern ]]; then
      covered=true
      break
    fi
  done <<< "$IGNORE_PATTERNS"
  if [[ "$covered" == "false" ]]; then
    uncovered+=("$dep")
  fi
done <<< "$CATALOG_DEPS"

if [[ ${#uncovered[@]} -gt 0 ]]; then
  echo "::error::Catalog deps not in Dependabot ignore list: ${uncovered[*]}"
  echo "Add them to the ignore: section in $DEPENDABOT_FILE"
  exit 1
fi

echo "All catalog deps covered by Dependabot ignore list"
