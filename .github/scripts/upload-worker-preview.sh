#!/usr/bin/env bash
set -euo pipefail

# Upload a new preview version of the worker in the current directory and
# report its preview URL.
#
# `versions upload` uploads a new, undeployed version of the website to the worker
# defined in `website/wrangler.jsonc` instead of creating a new worker per PR.
#
# `--preview-alias` makes `<ALIAS>-<WORKER>.<SUBDOMAIN>.workers.dev`
# point to the latest uploaded version for each PR.
#
# Because Cloudflare retains the 1000 most recently deployed aliases, and each
# PR reuses a single alias, PR previews don't need a separate cleanup step.
# See https://developers.cloudflare.com/workers/configuration/previews/#rules-and-limitations
#
# Usage:
#   <path to>/upload-worker-preview.sh <alias> <message> [config]
#
# Example, from website/:
#   ../.github/scripts/upload-worker-preview.sh pr-1079 "PR #1079 @ 38d81c1"
#
# `config` is an optional wrangler config path. The website passes the
# build-generated `dist/server/wrangler.json` (#1078), since the checked-in
# `website/wrangler.jsonc` deliberately omits `main`.
#
# Exit codes:
#   0 = version uploaded and preview URL found
#   1 = bad arguments, wrangler failure, or no preview URL in wrangler's output

ALIAS="${1:?usage: upload-worker-preview.sh <alias> <message> [config]}"
MESSAGE="${2:?usage: upload-worker-preview.sh <alias> <message> [config]}"
CONFIG="${3:-}"

# An array so an empty CONFIG contributes no argument at all.
config_args=()
if [[ -n "$CONFIG" ]]; then
  if [[ ! -f "$CONFIG" ]]; then
    echo "::error::wrangler config '$CONFIG' not found. Did the build run?"
    exit 1
  fi
  config_args=(--config "$CONFIG")
fi

# The label wrangler prints before the alias URL. It's the only machine-readable
# handle on the URL, so a reworded label has to fail loudly rather than yield an
# empty result.
LABEL="Version Preview Alias URL"

# `pnpm dlx` allows us to use wrangler without running a full `pnpm install`
# `wrangler@4` pins wrangler to the major version in the website dependencies
#
# tee keeps wrangler's output in the CI log while capturing it for parsing
# pipefail (set above) makes a wrangler failure fail this script as well
pnpm dlx wrangler@4 versions upload \
  "${config_args[@]+"${config_args[@]}"}" \
  --preview-alias "$ALIAS" \
  --message "$MESSAGE" 2>&1 | tee upload.log

url=$(grep -F "$LABEL" upload.log | grep -oE 'https://[^[:space:]]+' | head -n1 || true)
if [[ -z "$url" ]]; then
  echo "::error::No '$LABEL' URL in wrangler's output. If the upload succeeded," \
    "wrangler likely changed this log line; update LABEL in $(basename "$0")."
  exit 1
fi

echo "Preview URL: $url"
echo "url=$url" >>"${GITHUB_OUTPUT:-/dev/null}"
