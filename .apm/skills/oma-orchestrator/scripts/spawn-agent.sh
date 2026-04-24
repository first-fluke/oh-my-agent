#!/bin/bash
# spawn-agent.sh - Wrapper for oma agent:spawn
# Usage: ./spawn-agent.sh <agent-id> <prompt> <session-id> [-w workspace] [-v vendor]

exec oma agent:spawn "$@"
