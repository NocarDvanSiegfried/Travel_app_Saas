#!/bin/sh
# Fix dependencies script
# Ensures package.json and package-lock.json are in sync

set -e

echo "🔧 Fixing dependencies..."

# Remove old lock file
rm -f package-lock.json

# Install dependencies to regenerate lock file
npm install --package-lock-only

# Verify all dependencies are installed
npm ci

echo "✅ Dependencies fixed!"




