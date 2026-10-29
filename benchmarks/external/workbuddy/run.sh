#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == suite ]]; then
  shift
  exec python3 "$(cd "$(dirname "$0")" && pwd)/suite.py" "$@"
fi
exec python3 "$(cd "$(dirname "$0")" && pwd)/run.py" "$@"
