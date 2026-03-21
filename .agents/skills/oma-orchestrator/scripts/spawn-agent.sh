#!/bin/bash
# spawn-agent.sh - Wrapper for oh-my-ag agent:spawn
# Usage: ./spawn-agent.sh <agent-id> <prompt> <session-id> [-w workspace] [-v vendor]

exec oh-my-ag agent:spawn "$@"
