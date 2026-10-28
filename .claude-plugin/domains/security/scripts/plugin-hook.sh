#!/usr/bin/env sh
# Marketplace hooks use the installed CLI after project bootstrap completes.
set -eu

case "${1:-}" in
  UserPromptSubmit|PreToolUse|Stop) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
[ -f "${PROJECT_DIR}/.agents/oma-config.yaml" ] \
  || [ -f "${PROJECT_DIR}/.agents/oma-config.cue" ] \
  || exit 0
cd "${PROJECT_DIR}" || exit 0

export PATH="${PATH}:${HOME}/.bun/bin:${HOME}/.local/bin"

# The project registration owns this event after bootstrap and session restart.
# Leaving both registrations active can run a long Stop gate twice.
if [ -x "${PROJECT_DIR}/.claude/hooks/oma-hook.sh" ] \
  && command -v bun >/dev/null 2>&1 \
  && OMA_PLUGIN_PROJECT="${PROJECT_DIR}" OMA_PLUGIN_EVENT="$1" OMA_PLUGIN_MATCHER="${2:-}" bun -e '
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    try {
      const event = process.env.OMA_PLUGIN_EVENT;
      const tool = process.env.OMA_PLUGIN_MATCHER;
      const settings = JSON.parse(readFileSync(
        join(process.env.OMA_PLUGIN_PROJECT, ".claude/settings.json"), "utf8"));
      const groups = settings.hooks?.[event];
      const owns = Array.isArray(groups) && groups.some((group) => {
        if (tool && group?.matcher && group.matcher !== "*" &&
            !new RegExp(`^(?:${group.matcher})$`).test(tool)) return false;
        return Array.isArray(group?.hooks) && group.hooks.some((hook) =>
          hook?.type === "command" && hook.name === `oma-hook-${event}` &&
          typeof hook.command === "string" && hook.command.includes(".claude/hooks/oma-hook.sh"));
      });
      process.exit(owns ? 0 : 1);
    } catch {
      process.exit(1);
    }
  ' >/dev/null 2>&1; then
  exit 0
fi

if ! command -v oma >/dev/null 2>&1; then
  exit 0
fi

if [ -n "${2:-}" ]; then
  OMA_HOOK_WRAPPER="$0" oma hook --vendor claude --event "$1" --matcher "$2" || true
else
  OMA_HOOK_WRAPPER="$0" oma hook --vendor claude --event "$1" || true
fi
