#!/usr/bin/env sh
# Marketplace hooks use the installed CLI after project bootstrap completes.
#
# OMA_PLUGIN_VENDOR selects the host whose project registration this plugin
# copy must defer to and whose payload contract `oma hook` should parse:
#   claude  (default) — Claude Code marketplace entry (.claude/settings.json)
#   copilot           — Agent Plugins package, com.github.copilot/ namespace
#                       (.github/hooks/oma.json)
set -eu

case "${1:-}" in
  UserPromptSubmit|PreToolUse|Stop) ;;
  *) exit 0 ;;
esac

VENDOR="${OMA_PLUGIN_VENDOR:-claude}"
case "${VENDOR}" in
  claude)
    PROJECT_HOOK_DIR=".claude/hooks"
    PROJECT_SETTINGS=".claude/settings.json"
    ;;
  copilot)
    PROJECT_HOOK_DIR=".github/hooks"
    PROJECT_SETTINGS=".github/hooks/oma.json"
    ;;
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
if [ -x "${PROJECT_DIR}/${PROJECT_HOOK_DIR}/oma-hook.sh" ] \
  && command -v bun >/dev/null 2>&1 \
  && OMA_PLUGIN_PROJECT="${PROJECT_DIR}" OMA_PLUGIN_EVENT="$1" OMA_PLUGIN_MATCHER="${2:-}" \
     OMA_PLUGIN_VENDOR="${VENDOR}" OMA_PLUGIN_SETTINGS="${PROJECT_SETTINGS}" \
     OMA_PLUGIN_HOOK_DIR="${PROJECT_HOOK_DIR}" bun -e '
    const { readFileSync } = require("node:fs");
    const { join } = require("node:path");
    try {
      const event = process.env.OMA_PLUGIN_EVENT;
      const tool = process.env.OMA_PLUGIN_MATCHER;
      const wrapper = `${process.env.OMA_PLUGIN_HOOK_DIR}/oma-hook.sh`;
      const settings = JSON.parse(readFileSync(
        join(process.env.OMA_PLUGIN_PROJECT, process.env.OMA_PLUGIN_SETTINGS), "utf8"));
      const groups = settings.hooks?.[event];
      const matches = (matcher) => !tool || !matcher || matcher === "*" ||
        new RegExp(`^(?:${matcher})$`).test(tool);
      const owns = Array.isArray(groups) && groups.some((group) => {
        if (process.env.OMA_PLUGIN_VENDOR === "copilot") {
          // Copilot hook files are flat: {type, bash, timeoutSec[, matcher]}.
          return matches(group?.matcher) && group?.type === "command" &&
            typeof group.bash === "string" && group.bash.includes(wrapper);
        }
        if (!matches(group?.matcher)) return false;
        return Array.isArray(group?.hooks) && group.hooks.some((hook) =>
          hook?.type === "command" && hook.name === `oma-hook-${event}` &&
          typeof hook.command === "string" && hook.command.includes(wrapper));
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
  OMA_HOOK_WRAPPER="$0" oma hook --vendor "${VENDOR}" --event "$1" --matcher "$2" || true
else
  OMA_HOOK_WRAPPER="$0" oma hook --vendor "${VENDOR}" --event "$1" || true
fi
