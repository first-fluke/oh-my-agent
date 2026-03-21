#!/bin/bash
# verify.sh - Wrapper for oh-my-ag verify
# Usage: ./verify.sh <agent-type> [workspace-path]

AGENT_TYPE="${1:-}"
WORKSPACE="${2:-.}"

exec oh-my-ag verify "$AGENT_TYPE" --workspace "$WORKSPACE"
