#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

ALL=false
STRIPE=false
GITHUB=false
SEARCH=false

for arg in "$@"; do
  case "$arg" in
    --stripe)  STRIPE=true ;;
    --github)  GITHUB=true ;;
    --search)  SEARCH=true ;;
    --all)     ALL=true ;;
    -h|--help)
      echo "Usage: pnpm dev:local [flags]"
      echo ""
      echo "Start local development without Docker."
      echo "Runs minio, inngest, worker, and app as local processes."
      echo ""
      echo "Flags:"
      echo "  --stripe   Include Stripe CLI webhook forwarding"
      echo "  --github   Include Smee GitHub webhook proxy"
      echo "  --search   Include Typesense search engine"
      echo "  --all      Include all optional services"
      echo "  -h, --help Show this help"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg"
      echo "Run 'pnpm dev:local --help' for usage."
      exit 1
      ;;
  esac
done

if $ALL; then
  STRIPE=true
  GITHUB=true
  SEARCH=true
fi

# Collect background PIDs for cleanup
PIDS=()
cleanup() {
  echo ""
  echo "Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "Starting minio..."
minio server ~/minio &
PIDS+=($!)

echo "Starting inngest dev server..."
npx inngest-cli@latest dev &
PIDS+=($!)

if $SEARCH; then
  echo "Starting typesense..."
  mkdir -p /tmp/typesense-data
  typesense-server --data-dir=/tmp/typesense-data --api-key=xyz --api-port=8108 &
  PIDS+=($!)
fi

if $STRIPE; then
  echo "Starting stripe webhook forwarding..."
  stripe listen --forward-to http://localhost:3000/api/stripe/webhook &
  PIDS+=($!)
fi

if $GITHUB; then
  # Load GH_WEBHOOK_URL from .env if not already set
  if [[ -z "${GH_WEBHOOK_URL:-}" ]] && [[ -f apps/flowershow/.env ]]; then
    GH_WEBHOOK_URL=$(grep '^GH_WEBHOOK_URL=' apps/flowershow/.env | cut -d= -f2-)
  fi
  if [[ -n "${GH_WEBHOOK_URL:-}" ]]; then
    echo "Starting GitHub webhook proxy (smee)..."
    npx smee -u "$GH_WEBHOOK_URL" -t http://localhost:3000/api/webhook &
    PIDS+=($!)
  else
    echo "Warning: GH_WEBHOOK_URL not set, skipping GitHub webhook proxy"
  fi
fi

echo ""
echo "Services:"
echo "  MinIO       -> localhost:9000 (console: localhost:9001)"
echo "  Inngest     -> localhost:8288"
$SEARCH && echo "  Typesense   -> localhost:8108"
$STRIPE && echo "  Stripe CLI  -> forwarding to localhost:3000"
$GITHUB && echo "  Smee        -> forwarding to localhost:3000"
echo ""

echo "Starting worker and app..."
pnpm turbo dev --filter=markdown-processing-worker --filter=@flowershow/app &
PIDS+=($!)

wait
