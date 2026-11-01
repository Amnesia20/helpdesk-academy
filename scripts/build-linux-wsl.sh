#!/bin/bash
# Builds the Linux downloads (AppImage + .deb) inside WSL on a Windows PC, then
# copies them into this project's dist\ folder. No admin rights needed.
#   From PowerShell in the project folder:  wsl -d Ubuntu -- bash scripts/build-linux-wsl.sh
# It uses a private copy of Node.js in ~/.local/node and builds in ~/hda-build,
# a copy of the project without node_modules, dist, data or .env (your keys).
set -euo pipefail

NODE_VERSION=v24.18.0
# The project folder is the one above this script. Run the script as a file
# (bash scripts/build-linux-wsl.sh), not piped into bash.
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$HOME/hda-build"
if [ ! -f "$SRC/package.json" ] || ! grep -q '"name": "helpdesk-academy"' "$SRC/package.json"; then
  echo "This doesn't look like the HelpDesk Academy folder: $SRC" >&2
  echo "Run it from the project folder:  wsl -d Ubuntu -- bash scripts/build-linux-wsl.sh" >&2
  exit 1
fi

if [ ! -x "$HOME/.local/node/bin/node" ] || [ "$("$HOME/.local/node/bin/node" -v)" != "$NODE_VERSION" ]; then
  echo "Getting Node.js $NODE_VERSION for Linux..."
  rm -rf "$HOME/.local/node" && mkdir -p "$HOME/.local/node"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.xz" | tar -xJ -C "$HOME/.local/node" --strip-components=1
fi
export PATH="$HOME/.local/node/bin:$PATH"
echo "node $(node -v), npm $(npm -v)"

echo "Copying the project to $WORK..."
rm -rf "$WORK" && mkdir -p "$WORK"
(cd "$SRC" && tar --exclude=./node_modules --exclude=./dist --exclude=./data --exclude=./.env --exclude=./.git -cf - .) | (cd "$WORK" && tar -xf -)

cd "$WORK"
npm ci --no-audit --no-fund
npm run dist:linux

mkdir -p "$SRC/dist"
cp dist/*.AppImage dist/*.deb dist/latest-linux.yml "$SRC/dist/"
echo
echo "Copied to dist:"
(cd "$SRC/dist" && ls -la *-Linux.* latest-linux.yml)
