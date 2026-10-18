#!/usr/bin/env sh
set -e

REPO="flowershow/flowershow"
BINARY="fl"
# Override with FL_INSTALL_DIR to install somewhere you can write without sudo,
# e.g. FL_INSTALL_DIR="$HOME/.local/bin" (useful for AI agents and CI).
INSTALL_DIR="${FL_INSTALL_DIR:-/usr/local/bin}"

# Detect OS
OS="$(uname -s)"
case "$OS" in
  Linux)  OS="linux" ;;
  Darwin) OS="darwin" ;;
  *)
    echo "Unsupported OS: $OS"
    echo "Please download manually from https://github.com/${REPO}/releases"
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
    echo "Please download manually from https://github.com/${REPO}/releases"
    exit 1
    ;;
esac

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL "$1"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -qO- "$1"; }
else
  echo "Error: curl or wget is required"
  exit 1
fi

# Resolve the newest CLI release (tags look like cli/vX.Y.Z). The repo also
# publishes npm package releases (e.g. @flowershow/remark-wiki-link@x.y.z), so
# GitHub's "Latest" release is not guaranteed to be a CLI release and
# releases/latest/download can't be relied on. Pin a version with
# FL_VERSION=2.6.0 (with or without a leading "v").
if [ -n "$FL_VERSION" ]; then
  TAG="cli/v${FL_VERSION#v}"
else
  # The releases list is newest-first. Split the JSON on commas so each field
  # is on its own line (works whether or not the API pretty-prints), then take
  # the first non-prerelease cli/v* tag.
  TAG="$(fetch "https://api.github.com/repos/${REPO}/releases?per_page=100" 2>/dev/null \
    | tr ',' '\n' \
    | awk '
        /"tag_name"[[:space:]]*:/ {
          tag = $0
          sub(/.*"tag_name"[[:space:]]*:[[:space:]]*"/, "", tag)
          sub(/".*/, "", tag)
        }
        /"prerelease"[[:space:]]*:[[:space:]]*false/ {
          if (tag ~ /^cli\/v[0-9]/) { print tag; exit }
          tag = ""
        }
      ' || true)"
fi

ARCHIVE="${BINARY}_${OS}_${ARCH}.tar.gz"
if [ -n "$TAG" ]; then
  URL="https://github.com/${REPO}/releases/download/${TAG}/${ARCHIVE}"
  echo "Downloading fl ${TAG#cli/} for ${OS}/${ARCH}..."
else
  # GitHub API unavailable (e.g. rate-limited): fall back to the "Latest"
  # release, which the release workflows keep pointed at the newest CLI release.
  URL="https://github.com/${REPO}/releases/latest/download/${ARCHIVE}"
  echo "Could not resolve the latest CLI release from the GitHub API; trying the 'Latest' release."
  echo "Downloading fl for ${OS}/${ARCH}..."
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if ! fetch "$URL" | tar xz -C "$TMP_DIR" || [ ! -f "$TMP_DIR/$BINARY" ]; then
  echo "Error: failed to download or extract $URL"
  echo "Please download manually from https://github.com/${REPO}/releases"
  exit 1
fi

# Install binary
if [ -n "$FL_INSTALL_DIR" ]; then
  mkdir -p "$INSTALL_DIR"
fi

if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/$BINARY"
else
  echo "Installing to $INSTALL_DIR (requires sudo)..."
  sudo mv "$TMP_DIR/$BINARY" "$INSTALL_DIR/$BINARY"
fi

chmod +x "$INSTALL_DIR/$BINARY"

# Create flowershow alias
ALIAS="flowershow"
if [ -w "$INSTALL_DIR" ]; then
  ln -sf "$INSTALL_DIR/$BINARY" "$INSTALL_DIR/$ALIAS"
else
  sudo ln -sf "$INSTALL_DIR/$BINARY" "$INSTALL_DIR/$ALIAS"
fi

echo "fl installed successfully to $INSTALL_DIR/$BINARY"
echo "Also available as '$ALIAS'."
case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) echo "Note: $INSTALL_DIR is not on your PATH. Add it, e.g. export PATH=\"$INSTALL_DIR:\$PATH\"" ;;
esac
echo "Run 'fl login' to get started."
