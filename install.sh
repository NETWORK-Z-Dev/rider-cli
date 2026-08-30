#!/bin/bash

set -e

BASE_URL="https://dist.dcts.community/api/package/rider-cli"
INSTALL_DIR="$HOME/.rider-cli"

ARCH="$(uname -m)"

if [ "$ARCH" = "x86_64" ]; then
    BINARY="rider-linux-x64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    BINARY="rider-linux-arm64"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

curl --fail --location "$BASE_URL/$BINARY" -o "$INSTALL_DIR/rider"

chmod 755 "$INSTALL_DIR/rider"

if [ "$(id -u)" -eq 0 ]; then
    install -m 755 "$INSTALL_DIR/rider" /usr/local/bin/rider
else
    sudo install -m 755 "$INSTALL_DIR/rider" /usr/local/bin/rider
fi

echo "Rider CLI installed"