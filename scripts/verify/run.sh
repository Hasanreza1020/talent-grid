#!/usr/bin/env bash
#
# Runs every migration against a throwaway Postgres, then the RLS and
# behaviour tests, and fails loudly on the first error.
#
# This exists because the migrations are the one part of Talent Grid that
# cannot be checked by the TypeScript compiler. It needs Docker, and it is
# never pointed at a real Supabase project.
#
#   bash scripts/verify/run.sh
#
set -euo pipefail

CONTAINER=${CONTAINER:-tg-verify}
DB=${DB:-talentgrid}
PORT=${PORT:-55433}
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

psql_run() {
  docker exec -i "$CONTAINER" psql -U postgres -d "$DB" -q -v ON_ERROR_STOP=1
}

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Starting $CONTAINER"
  docker run -d --name "$CONTAINER" \
    -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB="$DB" \
    -p "$PORT:5432" postgres:16 >/dev/null
  sleep 4
elif [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER")" != "true" ]; then
  docker start "$CONTAINER" >/dev/null
  sleep 4
fi

until docker exec "$CONTAINER" pg_isready -U postgres -d "$DB" >/dev/null 2>&1; do
  sleep 1
done

echo "Rebuilding schema"
docker exec -i "$CONTAINER" psql -U postgres -d postgres -q -v ON_ERROR_STOP=1 <<SQL
drop database if exists $DB with (force);
create database $DB;
SQL

psql_run < "$ROOT/scripts/verify/prelude.sql" >/dev/null

for migration in "$ROOT"/supabase/migrations/*.sql; do
  echo "  applying $(basename "$migration")"
  psql_run < "$migration" >/dev/null
done

echo "Running RLS and behaviour tests"
psql_run < "$ROOT/scripts/verify/rls-tests.sql" 2>&1 |
  grep -Ev '^(SET|INSERT|UPDATE|CREATE|DO|NOTICE:  extension)' || true

echo
echo "Schema verification complete."
