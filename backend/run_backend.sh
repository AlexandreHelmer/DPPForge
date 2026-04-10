#!/bin/sh
set -eu
cd "$(dirname "$0")"
set -a
. ./env
set +a
exec .venv/bin/python app/manage.py runserver 0.0.0.0:8103
