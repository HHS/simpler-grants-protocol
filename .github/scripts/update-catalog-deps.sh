#!/usr/bin/env bash
set -euo pipefail

# Update catalog-managed dependencies in pnpm-workspace.yaml and regenerate
# the lockfile. These deps are excluded from Dependabot to avoid lockfile
# corruption (dependabot-core #14339).
#
# Two modes, controlled by --majors-only:
#
#   Default (within-major)
#     Bumps each dep to the latest version on the same compatibility line.
#     ^X.Y.Z (X>=1)  stay within major X — e.g. typescript ^5.9.3 -> ^5.x.y
#     ^0.Y.Z         stay within 0.x line — e.g. @typespec/rest ^0.80.0 -> ^0.81.x
#                    (lets TypeSpec ecosystem minor bumps through, blocks 0.x -> 1.0)
#     ~X.Y.Z         stay within minor X.Y
#     pinned         no auto-bump
#
#   --majors-only
#     Inverts the filter: only proposes bumps that CROSS the boundary above
#     (typescript 5 -> 6, zod 3 -> 4, @types/node 20 -> 25, etc.). Use this to
#     surface breaking-change candidates in a separate draft PR. Install runs
#     with --ignore-scripts because prepare hooks will usually fail under a
#     major bump; PR CI is the source of truth for whether the bump is viable.
#
# Usage:
#   ./.github/scripts/update-catalog-deps.sh                     # within-major, apply
#   ./.github/scripts/update-catalog-deps.sh --dry-run           # within-major, check only
#   ./.github/scripts/update-catalog-deps.sh --majors-only       # majors-only, apply
#   ./.github/scripts/update-catalog-deps.sh --majors-only --dry-run
#
# Exit codes:
#   0 = updates available (applied unless --dry-run)
#   1 = error
#   2 = no updates available
#
# Catalog deps are parsed from pnpm-workspace.yaml (both `catalog:` and
# `catalogs: <name>:` sections).

DRY_RUN=false
MAJORS_ONLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    --majors-only) MAJORS_ONLY=true ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

if [[ "$MAJORS_ONLY" == "true" ]]; then
  echo "=== Checking for MAJOR-VERSION catalog dependency updates ==="
else
  echo "=== Checking for catalog dependency updates (within-major) ==="
fi

WORKSPACE_FILE="pnpm-workspace.yaml"
if [[ ! -f "$WORKSPACE_FILE" ]]; then
  echo "ERROR: $WORKSPACE_FILE not found"
  exit 1
fi

UPDATED_COUNT=0

# check_and_update_dep <dep_name> <current_range> <catalog_label>
#
# Picks the newest stable version on the relevant side of the dep's compat
# boundary (see header) and updates pnpm-workspace.yaml when a newer version
# is available. In --majors-only mode the boundary filter is inverted so only
# versions OUTSIDE the current compat line are considered.
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

  # Compute the boundary prefix that defines the dep's current compat line.
  # We filter the published versions list rather than passing a semver range
  # to npm directly because `npm view <pkg>@<range> version` emits one line
  # per matching version, which is awkward to parse. Filtering also lets us
  # exclude prereleases uniformly.
  local major="${base_version%%.*}"
  local rest="${base_version#*.}"
  local minor="${rest%%.*}"
  local boundary_prefix
  if [[ "$prefix" == "~" ]]; then
    # ~X.Y.Z -> X.Y.* is the compat line
    boundary_prefix="${major}.${minor}."
  elif [[ "$prefix" == "^" ]]; then
    # ^X.Y.Z -> X.* is the compat line (this also captures 0.x minor bumps,
    # which the TypeSpec ecosystem treats as in-band)
    boundary_prefix="${major}."
  else
    # pinned: compat line is the exact version
    boundary_prefix="${base_version}"
  fi

  local raw_versions
  raw_versions=$(npm view "$dep_name" versions --json 2>/dev/null) || {
    echo "  WARNING: Could not fetch versions for $dep_name, skipping"
    return
  }

  # Default mode: pick highest stable version WITHIN the compat boundary.
  # --majors-only: pick highest stable version OUTSIDE it (cross-boundary bump).
  local jq_filter
  if [[ "$MAJORS_ONLY" == "true" ]]; then
    jq_filter='select((startswith($p) | not) and (test("[-+]") | not))'
  else
    jq_filter='select(startswith($p) and (test("[-+]") | not))'
  fi

  local latest
  latest=$(printf '%s' "$raw_versions" \
    | jq -r --arg p "$boundary_prefix" "
        (if type == \"array\" then . else [.] end) | .[] | ${jq_filter}
      " \
    | sort -V \
    | tail -n1)

  if [[ -z "$latest" ]]; then
    if [[ "$MAJORS_ONLY" == "false" ]]; then
      echo "  WARNING: No matching version for $dep_name within ${boundary_prefix}*, skipping"
    fi
    # In majors-only mode, "no out-of-boundary versions" is the common case
    # (most deps don't have a major waiting) and not worth logging per-dep.
    return
  fi

  # Is the latest strictly newer than base_version?
  local newer
  newer=$(printf '%s\n%s\n' "$base_version" "$latest" | sort -V | tail -1)

  if [[ "$latest" != "$base_version" && "$newer" == "$latest" ]]; then
    local new_range="${prefix}${latest}"
    local label="$catalog_label"
    [[ "$MAJORS_ONLY" == "true" ]] && label="major:${catalog_label}"
    echo "  UPDATE (${label}): $dep_name $current_range -> $new_range"

    if [[ "$DRY_RUN" == "false" ]]; then
      # Build sed pattern that matches both quoted and unquoted dep names.
      # Use | as delimiter since dep names contain /
      # Match: '  <dep_name>: <range>' or '  '<dep_name>': <range>'
      # Also handle 4-space indent for named catalogs
      sed -i.bak "s|\\([ ]*\\)\\(['\"]\\{0,1\\}${dep_name}['\"]\\{0,1\\}\\): *${current_range}|\\1\\2: ${new_range}|" "$WORKSPACE_FILE"
    fi

    UPDATED_COUNT=$((UPDATED_COUNT + 1))
  elif [[ "$MAJORS_ONLY" == "false" ]]; then
    echo "  OK ($catalog_label): $dep_name ${current_range} (latest in range: $latest)"
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
  if [[ "$MAJORS_ONLY" == "true" ]]; then
    echo "No major-version updates available."
  else
    echo "All catalog dependencies are up to date."
  fi
  exit 2
fi

echo "$UPDATED_COUNT catalog dep(s) have updates."

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry run: no changes applied."
  exit 0
fi

echo ""
echo "--- Regenerating lockfile ---"
# Catalog edits above changed pnpm-workspace.yaml; override CI's frozen
# default to update the lockfile. In --majors-only mode skip the workspace
# `prepare` scripts: tsc et al. will fail under a major bump, and that's
# expected — the resulting draft PR's CI is where we want that signal.
install_flags=(--no-frozen-lockfile)
if [[ "$MAJORS_ONLY" == "true" ]]; then
  install_flags+=(--ignore-scripts)
fi
pnpm install "${install_flags[@]}"

echo ""
echo "--- Summary of changes ---"
git diff --stat pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null || echo "(not in a git repo or no changes)"

echo ""
echo "=== Catalog dependency update complete ==="
