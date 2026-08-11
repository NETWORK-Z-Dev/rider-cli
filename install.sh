#!/bin/bash

set -e

BASE_URL="https://dist.dcts.community/api/package/rider-cli"

if ! command -v bun >/dev/null 2>&1; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

curl --fail --silent --show-error --location "$BASE_URL/install.mjs" -o /tmp/rider-install.mjs
bun /tmp/rider-install.mjs
rm -f /tmp/rider-install.mjs