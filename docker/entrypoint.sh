#!/bin/sh
set -e

if [ "${PRISMA_DB_PUSH:-false}" = "true" ]; then
  echo "Running prisma db push..."
  npx prisma db push
fi

exec "$@"

