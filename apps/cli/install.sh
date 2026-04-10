#!/usr/bin/env sh
set -e

BASE_URL="https://github.com/flowershow/flowershow/releases/latest/download"
BINARY="fl"
INSTALL_DIR="/usr/local/bin"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
  *)
    echo "Unsupported OS: $OS"
    echo "Please download manually from https://github.com/flowershow/flowershow/releases"
    exit 1
    ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)          ARCH="amd64" ;;
  arm64 | aarch64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    echo "Please download manually from https://github.com/flowershow/flowershow/releases"
    exit 1
    ;;
esac

ARCHIVE="${BINARY}_${OS}_${ARCH}.tar.gz"
URL="${BASE_URL}/${ARCHIVE}"

echo "Downloading fl for ${OS}/${ARCH}..."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL" | tar xz -C "$TMP_DIR"
elif command -v wget >/dev/null 2>&1; then
  wget -qO- "$URL" | tar xz -C "$TMP_DIR"
else
  echo "Error: curl or wget is required"
  exit 1
fi

# Install binary
if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/$BINARY"
else
  echo "Installing to $INSTALL_DIR (requires sudo)..."
  sudo mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/$BINARY"
fi

chmod +x "$INSTALL_DIR/$BINARY"

echo "fl installed successfully to $INSTALL_DIR/$BINARY"
echo "Run 'fl login' to get started."
