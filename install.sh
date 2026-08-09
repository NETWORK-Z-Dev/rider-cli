#!/bin/bash

set -e

BASE_URL="https://dist.dcts.community/api/package/rider-cli"

command -v node >/dev/null 2>&1 || {
    echo "Node.js is required"
    exit 1
}

curl \
    --fail \
    --silent \
    --show-error \
    --location \
    "$BASE_URL/install.mjs" \
    -o /tmp/rider-install.mjs

node /tmp/rider-install.mjs

rm -f /tmp/rider-install.mjs