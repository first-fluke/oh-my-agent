#!/bin/bash
# verify.sh - Wrapper for oma verify
# Usage: ./verify.sh <agent-type> [workspace-path]

AGENT_TYPE="${1:-}"
WORKSPACE="${2:-.}"

case "$AGENT_TYPE" in
  backend|frontend|mobile|qa|debug|pm) ;;
  db|refactor|architecture|tf-infra|docs)
    echo "SKIP: oma verify does not support agent type '$AGENT_TYPE'; continue with mechanical checks and QA cross-review."
    exit 0
    ;;
  *)
    echo "ERROR: unknown orchestrator agent type '$AGENT_TYPE'" >&2
    exit 2
    ;;
esac

exec oma verify "$AGENT_TYPE" --workspace "$WORKSPACE"
