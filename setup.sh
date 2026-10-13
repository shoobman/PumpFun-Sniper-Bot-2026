#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

# Change this to your actual entry point file (e.g., script.js or script.ts)
INPUT_FILE="./setup.ts"

echo "🔨 Building for Linux / WSL..."
bun build "$INPUT_FILE" --compile --outfile ./setup/setup

echo "🔨 Building for Windows (x64)..."
bun build "$INPUT_FILE" --compile --target=bun-windows-x64 --outfile ./setup/setup.exe

echo "✨ Build complete! Generated:"
echo "   - ./setup (Linux/WSL)"
echo "   - setup.exe (Windows)"