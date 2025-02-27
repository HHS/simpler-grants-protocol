#!/bin/bash

set -e  # Exit on error

PACKAGE_VERSION=$(node -p "require('./package.json').version")
PUBLISHED_VERSION=$(npm info . version || echo "0.0.0")

if [ "$PACKAGE_VERSION" == "$PUBLISHED_VERSION" ]; then
  echo "❌ Version $PACKAGE_VERSION is already published. Please bump the version."
  exit 1
fi

if ! git diff --quiet; then
  echo "❌ Uncommitted changes detected. Please commit before publishing."
  exit 1
fi

echo "✅ Prepublish checks passed!"
