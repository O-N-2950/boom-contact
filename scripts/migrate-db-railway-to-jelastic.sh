#!/usr/bin/env bash
# Migration DB Railway → Jelastic (dump/restore). AUCUN secret en dur :
#   SRC_DATABASE_URL  = URL PostgreSQL Railway (source)
#   DST_DATABASE_URL  = URL PostgreSQL Jelastic (cible)
# Usage : SRC_DATABASE_URL=... DST_DATABASE_URL=... ./scripts/migrate-db-railway-to-jelastic.sh
set -euo pipefail
: "${SRC_DATABASE_URL:?SRC_DATABASE_URL manquant}"
: "${DST_DATABASE_URL:?DST_DATABASE_URL manquant}"
STAMP=$(date +%Y%m%d-%H%M%S)
DUMP="/tmp/boom-contact-${STAMP}.dump"

echo "1/4 — Dump source (custom format, compressé)…"
pg_dump --format=custom --no-owner --no-privileges --file="$DUMP" "$SRC_DATABASE_URL"
echo "    → $DUMP ($(du -h "$DUMP" | cut -f1))"

echo "2/4 — Comptes source (vérification post-restore)…"
psql "$SRC_DATABASE_URL" -At -c \
  "SELECT relname||'='||n_live_tup FROM pg_stat_user_tables ORDER BY relname;" | tee "/tmp/counts-src-${STAMP}.txt"

echo "3/4 — Restore cible (--clean --if-exists : idempotent, re-jouable)…"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DST_DATABASE_URL" "$DUMP"

echo "4/4 — Comptes cible…"
psql "$DST_DATABASE_URL" -At -c \
  "SELECT relname||'='||n_live_tup FROM pg_stat_user_tables ORDER BY relname;" | tee "/tmp/counts-dst-${STAMP}.txt"

if diff -u "/tmp/counts-src-${STAMP}.txt" "/tmp/counts-dst-${STAMP}.txt"; then
  echo "✅ Comptes identiques — migration OK"
else
  echo "⚠️ Comptes différents (peut être normal si la source a écrit pendant le dump) — vérifier manuellement"
fi
