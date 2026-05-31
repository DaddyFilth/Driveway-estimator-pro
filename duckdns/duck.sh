#!/usr/bin/env sh
set -eu

: "${DUCKDNS_DOMAIN:?Set DUCKDNS_DOMAIN before running duck.sh}"
: "${DUCKDNS_TOKEN:?Set DUCKDNS_TOKEN before running duck.sh}"

curl --fail --silent --show-error --get "https://www.duckdns.org/update" \
  --data-urlencode "domains=${DUCKDNS_DOMAIN}" \
  --data-urlencode "token=${DUCKDNS_TOKEN}" \
  --data-urlencode "ip=" \
  --output "${HOME}/duckdns/duck.log"
