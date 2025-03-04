#!/bin/bash

set -e  # Exit on error

PACKAGE_VERSION=$(node -p "require('./package.json').version")
PACKAGE_NAME=$(node -p "require('./package.json').name")

# Check if the version exists in the registry (returns empty if not found)
VERSION_EXISTS=$(npm view $PACKAGE_NAME@$PACKAGE_VERSION version 2>/dev/null || echo "")

if [ -n "$VERSION_EXISTS" ]; then
  echo "❌ Version $PACKAGE_VERSION is already published. Please bump the version."
  exit 1
fi

if ! git diff --quiet; then
  echo "❌ Uncommitted changes detected. Please commit before publishing."
  exit 1
fi

echo "✅ Prepublish checks passed!"
