#!/bin/bash
set -e
cd "$(git rev-parse --show-toplevel)"
pnpm --filter @workspace/db push || true
pnpm --filter @workspace/db seed || true
pnpm --filter @workspace/my-website run build
