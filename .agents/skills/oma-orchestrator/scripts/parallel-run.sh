#!/bin/bash
# parallel-run.sh - Wrapper for oh-my-ag agent:parallel
# Usage: ./parallel-run.sh <tasks-file.yaml> [--vendor <vendor>]
#        ./parallel-run.sh --inline "backend:task1" "frontend:task2" ...

exec oh-my-ag agent:parallel "$@"
