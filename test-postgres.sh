#!/bin/sh
set -eu
# Only creates/uses the disposable test database, never the application database.
docker compose exec -T db sh -c 'psql -U witness -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '\''witness_test'\''" | grep -q 1 || createdb -U witness witness_test'
docker compose exec -T api sh -c 'export TEST_DATABASE_URL="${DATABASE_URL%/witness}/witness_test"; pytest -q'
