#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Collect --profile flags from arguments
PROFILES=()
ALL=false

for arg in "$@"; do
  case "$arg" in
    --stripe)  PROFILES+=(--profile stripe) ;;
    --github)  PROFILES+=(--profile github) ;;
    --search)  PROFILES+=(--profile search) ;;
    --all)     ALL=true ;;
    -h|--help)
      echo "Usage: pnpm dev:up [flags]"
      echo ""
      echo "Start local development infrastructure and app processes."
      echo ""
      echo "Flags:"
      echo "  --stripe   Include Stripe CLI webhook forwarding"
      echo "  --github   Include Smee GitHub webhook proxy"
      echo "  --search   Include Typesense search engine"
      echo "  --all      Include all optional services"
      echo "  -h, --help Show this help"
      echo ""
      echo "Examples:"
      echo "  pnpm dev:up                  # Core: Postgres, MinIO, Inngest + app"
      echo "  pnpm dev:up --stripe         # Core + Stripe webhook forwarding"
      echo "  pnpm dev:up --stripe --github # Core + Stripe + GitHub webhooks"
      echo "  pnpm dev:up:all              # Everything"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg"
      echo "Run 'pnpm dev:up --help' for usage."
      exit 1
      ;;
  esac
done

if $ALL; then
  PROFILES=(--profile stripe --profile github --profile search)
fi

echo "▶ Starting infrastructure services..."
docker compose ${PROFILES[@]+"${PROFILES[@]}"} up -d

echo "▶ Waiting for services to be healthy..."
docker compose up -d --wait postgres minio inngest

echo "✔ Infrastructure ready."
echo ""
echo "  PostgreSQL  → localhost:5433  (flowershow-dev)"
echo "  MinIO       → localhost:9000  (console: localhost:9001)"
echo "  Inngest     → localhost:8288"

for arg in "$@"; do
  case "$arg" in
    --search|--all) echo "  Typesense   → localhost:8108" ;;
  esac
done

echo ""
echo "▶ Starting app and worker..."
exec pnpm turbo dev
