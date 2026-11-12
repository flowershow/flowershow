#!/usr/bin/env bash
# Bring up the local test environment: Postgres + S3 mock (as in CI's e2e
# job), a .env from .env.example if there is none, migrations and seed users.
# Then run `pnpm dev` and use login.ts / browse.ts. See README.md here.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/../.." && pwd)"
cd "$APP_DIR"

if ! docker info >/dev/null 2>&1; then
  if command -v colima >/dev/null; then
    colima start --cpu 4 --memory 6
  else
    echo "No Docker runtime. Install one (e.g. brew install colima docker docker-compose) and retry." >&2
    exit 1
  fi
fi

# MinIO's images need a quay.io login, so use Adobe S3Mock like CI does.
docker compose -f "$REPO_DIR/docker-compose.yml" -p fs-testenv up -d --wait postgres
if ! docker ps --format '{{.Names}}' | grep -qx fs-testenv-s3; then
  docker rm -f fs-testenv-s3 >/dev/null 2>&1 || true
  docker run -d --name fs-testenv-s3 -p 9000:9090 \
    -e COM_ADOBE_TESTING_S3MOCK_STORE_INITIAL_BUCKETS=flowershow \
    adobe/s3mock:5.2.3 >/dev/null
fi
for _ in $(seq 1 60); do
  curl -sf http://localhost:9000/favicon.ico >/dev/null && break
  sleep 1
done

[ -f .env ] || cp .env.example .env

npx prisma migrate deploy
npx tsx --env-file=.env scripts/test-env/seed.ts

echo
echo "Ready. Next:"
echo "  pnpm dev"
echo "  npx tsx --env-file=.env scripts/test-env/login.ts te-pro"
echo "  npx tsx scripts/test-env/browse.ts te-pro /settings/billing"
