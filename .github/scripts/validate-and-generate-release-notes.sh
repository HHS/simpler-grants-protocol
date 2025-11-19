#!/bin/bash
# Script to validate tags and generate release notes
# Usage: validate-and-generate-release-notes.sh --prefix PREFIX --config-file CONFIG --release-tag TAG [--previous-tag PREV_TAG] [--dry-run] [--repository REPO] [--github-output OUTPUT_FILE]

set -e

# Parse arguments
PREFIX=""
CONFIG_FILE=""
RELEASE_TAG=""
PREVIOUS_TAG=""
DRY_RUN="false"
REPOSITORY="${GITHUB_REPOSITORY}"
GITHUB_OUTPUT_FILE="${GITHUB_OUTPUT:-$GITHUB_OUTPUT}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --prefix)
      PREFIX="$2"
      shift 2
      ;;
    --config-file)
      CONFIG_FILE="$2"
      shift 2
      ;;
    --release-tag)
      RELEASE_TAG="$2"
      shift 2
      ;;
    --previous-tag)
      # Checks if the next argument ($2) exists and is not another option (does not start with --)
      if [[ -n "$2" ]] && [[ ! "$2" =~ ^-- ]]; then
        PREVIOUS_TAG="$2"
        shift 2
      else
        shift
      fi
      ;;
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --repository)
      REPOSITORY="$2"
      shift 2
      ;;
    --github-output)
      GITHUB_OUTPUT_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate required arguments
if [[ -z "$PREFIX" ]] || [[ -z "$CONFIG_FILE" ]] || [[ -z "$RELEASE_TAG" ]] || [[ -z "$REPOSITORY" ]]; then
  echo "Error: Missing required arguments"
  echo "Usage: $0 --prefix PREFIX --config-file CONFIG --release-tag TAG [--previous-tag PREV_TAG] [--dry-run] [--repository REPO] [--github-output OUTPUT_FILE]"
  exit 1
fi

# Validate tag prefix
if [[ ! "$RELEASE_TAG" == "$PREFIX"* ]]; then
  echo "✗ Latest tag '$RELEASE_TAG' must start with '$PREFIX'"
  exit 1
fi

# Validate tag exists
if ! git rev-parse "$RELEASE_TAG" >/dev/null 2>&1; then
  echo "✗ Tag '$RELEASE_TAG' does not exist"
  exit 1
fi

echo "✓ Latest tag '$RELEASE_TAG' is valid"

# Generate release notes
if [[ -n "$PREVIOUS_TAG" ]]; then
  echo "Generating release notes between $PREVIOUS_TAG and $RELEASE_TAG"
  NOTES=$(gh api repos/"$REPOSITORY"/releases/generate-notes \
    -f tag_name="$RELEASE_TAG" \
    -f previous_tag_name="$PREVIOUS_TAG" \
    -f configuration_file_path="$CONFIG_FILE" \
    -q '.body')
else
  echo "Generating release notes for $RELEASE_TAG"
  NOTES=$(gh api repos/"$REPOSITORY"/releases/generate-notes \
    -f tag_name="$RELEASE_TAG" \
    -f configuration_file_path="$CONFIG_FILE" \
    -q '.body')
fi

# Output notes using multiline format
if [[ -n "$GITHUB_OUTPUT_FILE" ]]; then
  echo "notes<<EOF" >> "$GITHUB_OUTPUT_FILE"
  echo "$NOTES" >> "$GITHUB_OUTPUT_FILE"
  echo "EOF" >> "$GITHUB_OUTPUT_FILE"
fi

# Display notes in dry-run mode
if [[ "$DRY_RUN" == "true" ]]; then
  echo ""
  echo "=== DRY RUN MODE - Release notes preview ==="
  echo "Latest tag: $RELEASE_TAG"
  echo "Previous tag: $PREVIOUS_TAG"
  echo ""
  echo "$NOTES"
  echo "=== End of preview ==="
fi

