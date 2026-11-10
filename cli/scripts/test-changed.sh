#!/bin/sh
# Pre-push test step (hk.pkl). Runs only the tests affected by files changed
# since the upstream branch; the full suite belongs to CI.
#
# Lives in a script rather than inline in hk.pkl because hk runs inline checks
# through the platform shell: on Windows that is cmd.exe, where the POSIX
# `base=$(...)` assignment is not a command, so the step "passed" without
# running a single test. `sh` (Git for Windows) is always available where the
# other hook steps already use it.
#
# Git exports repository-local variables in hooks. Tests create their own
# repositories; inheriting these variables redirects their Git operations
# here, so they are unset first.
set -eu
base=$(git rev-parse --verify -q '@{upstream}' || echo origin/main)
for v in $(git rev-parse --local-env-vars); do
  unset "$v"
done
CI=true bun run test --changed "$base"
