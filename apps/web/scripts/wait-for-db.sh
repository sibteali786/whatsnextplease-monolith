#!/usr/bin/env bash
set -e

until pg_isready -h localhost -p 5432 -U postgres; do
	echo "Postgres is unavailable - sleeping"
	sleep 2
done

echo "Postgres is up!"
