#!/bin/bash
#Script to check tags against releases
# check-for-unreleased-tags.sh --days DAYS
set -e

echo "=== Checking Git tags against GitHub releases ==="
echo ""

DAYS="$1"

#Check that Days is a positive integer
if [[ $DAYS =~ ^[0-9]+$ ]]; then
    echo "$DAYS is an integer, continuing"
else
    echo "Bad input for $DAYS, exiting"
    exit 1
fi


# Calculate date X days ago (compatible with both Linux and macOS)
if date -v-1d > /dev/null 2>&1; then
    # macOS date syntax
    NUMBER_OF_DAYS_AGO=$(date -u -v-${DAYS}d '+%Y-%m-%d %H:%M:%S')
    NUMBER_OF_DAYS_AGO_UNIX=$(date -u -v-${DAYS}d '+%s')
else
    # GNU date syntax (Linux)
    NUMBER_OF_DAYS_AGO=$(date -u -d "$DAYS days ago" '+%Y-%m-%d %H:%M:%S')
    NUMBER_OF_DAYS_AGO_UNIX=$(date -u -d "$DAYS days ago" '+%s')
fi
echo "Checking tags and releases created since: $NUMBER_OF_DAYS_AGO UTC"
echo ""

echo "Fetching Git tags"
git fetch --tags
ALL_TAGS=$(git tag --sort=-creatordate --format='%(creatordate:unix) %(refname:short)' | \
awk -v cutoff="$NUMBER_OF_DAYS_AGO_UNIX" '$1 >= cutoff {print $2}')
TAG_COUNT=$(echo "$ALL_TAGS" | grep -c . || true)
echo "Found $TAG_COUNT Git tags"
echo ""


echo "Fetching GitHub releases"
RELEASES=$(gh release list --limit 100 --json tagName,createdAt | \
jq -r --arg cutoff "$NUMBER_OF_DAYS_AGO" '.[] | select(.createdAt >= $cutoff) | .tagName')
RELEASE_COUNT=$(echo "$RELEASES" | grep -c . || true)
echo "Found $RELEASE_COUNT GitHub releases"
echo ""

# Find tags without releases
echo "=== Tags without corresponding releases ==="
MISSING_RELEASES=()
if [ $TAG_COUNT -gt 0 ]; then
    while IFS= read -r tag; do
        if [ -n "$tag" ] && ! echo "$RELEASES" | grep -qx "$tag"; then
            echo "  ❌ Tag '$tag' has no GitHub release"
            MISSING_RELEASES+=("$tag")
        fi
    done <<< "$ALL_TAGS"
fi

if [ ${#MISSING_RELEASES[@]} -eq 0 ]; then
    echo "  ✅ All tags have corresponding releases"
fi
echo ""

# Find releases without tags
echo "=== Releases without corresponding tags ==="
MISSING_TAGS=()
if [ $RELEASE_COUNT -gt 0 ]; then
    while IFS= read -r release; do
        if [ -n "$release" ] && ! echo "$ALL_TAGS" | grep -qx "$release"; then
            echo "  ❌ Release '$release' has no corresponding Git tag"
            MISSING_TAGS+=("$release")
        fi
    done <<< "$RELEASES"
fi

if [ ${#MISSING_TAGS[@]} -eq 0 ]; then
    echo "  ✅ All releases have corresponding tags"
fi
echo ""

# Summary and exit status
echo "=== Summary (Last $DAYS Days) ==="
echo "Git tags created: $TAG_COUNT"
echo "GitHub releases created: $RELEASE_COUNT"
echo "Tags without releases: ${#MISSING_RELEASES[@]}"
echo "Releases without tags: ${#MISSING_TAGS[@]}"
echo ""

# Fail if any mismatches found
if [ ${#MISSING_RELEASES[@]} -gt 0 ] || [ ${#MISSING_TAGS[@]} -gt 0 ]; then
    echo "❌ FAILURE: Mismatches detected between tags and releases!"
    exit 1
else
    echo "✅ SUCCESS: All tags and releases are in sync!"
    exit 0
fi