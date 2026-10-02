#!/usr/bin/env bash
# Check that user content on the R2 public domain is served sandboxed
# (ADR 0013). Usage: scripts/check-r2-headers.sh <url>...
# Pass object URLs on r2.flowershow.app, e.g. an image, an .svg, an .html, a .pdf.
set -u
status=0
for url in "$@"; do
  headers=$(curl -sSI "$url" | tr -d '\r')
  type=$(grep -i '^content-type:' <<<"$headers" | head -1 | cut -d' ' -f2- | cut -d';' -f1 | tr 'A-Z' 'a-z')
  csp=$(grep -i '^content-security-policy:' <<<"$headers" | cut -d' ' -f2-)
  nosniff=$(grep -i '^x-content-type-options:' <<<"$headers" | cut -d' ' -f2- | tr 'A-Z' 'a-z')
  problems=()
  [[ "$nosniff" == "nosniff" ]] || problems+=("missing X-Content-Type-Options: nosniff")
  if [[ "$type" == "application/pdf" ]]; then
    [[ -z "$csp" ]] || problems+=("PDF should not be sandboxed (Chrome won't render it): $csp")
  else
    [[ "$csp" == sandbox* ]] || problems+=("missing Content-Security-Policy: sandbox …")
  fi
  if ((${#problems[@]})); then
    status=1
    echo "FAIL $url ($type)"
    printf '     %s\n' "${problems[@]}"
  else
    echo "ok   $url ($type)"
  fi
done
exit $status
