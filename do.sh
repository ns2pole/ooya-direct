#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

git add --all
git commit -m "改修中"
git push
