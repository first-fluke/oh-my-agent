#!/usr/bin/env sh
# oma plugin bootstrap — runs on SessionStart when oma is installed via the
# Claude Code marketplace (`/plugin install oma@oh-my-agent`).
#
# Strategy: delegate to the OFFICIAL installer (cli/install.sh) for runtime
# provisioning (bun + uv + serena + platform detection), then run the project
# wiring non-interactively. The official installer ends in an interactive
# `bunx oh-my-agent@latest < /dev/tty` step that cannot run inside a no-TTY
# hook, so we invoke it with OMA_INSTALL_NO_RUN=1 (deps only) and do the
# non-interactive `oma install --yes` ourselves.
#
# Constraints:
#   * macOS/Linux only (mirrors install.sh; Windows users use install.ps1).
#   * Idempotent: fast-path exit once the project is wired for the current
#     CLI version. Only the first session per project does real work.
#   * Never blocks or fails the session — every error path logs and exits 0.
set -eu

INSTALL_SH="https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
PRESET="${1:-all}"
case "${PRESET}" in all|frontend|security|research) ;; *) exit 0 ;; esac
PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-${0%/*}/..}"
SELECTION="${PLUGIN_DIR}/selection.json"

# Preserve configured CLI precedence and add installer locations as fallbacks.
export PATH="${PATH}:${HOME}/.bun/bin:${HOME}/.local/bin"

log() { printf '[oma-bootstrap] %s\n' "$*" >&2; }

if ! PROJECT_DIR="$(cd "${PROJECT_DIR}" 2>/dev/null && pwd -P)"; then
  log "could not access the project directory; run oma install from the project manually"
  exit 0
fi
# A plugin's data directory can be shared across projects. Keep the successful
# wiring receipt with the project whose installation it describes.
MARKER_DIR="${PROJECT_DIR}/.agents/state"
MARKER="${MARKER_DIR}/plugin-bootstrap.version"
if [ "${PRESET}" != all ]; then
  MARKER="${MARKER_DIR}/plugin-bootstrap.${PRESET}.version"
fi
INSTALL_LOG="${MARKER_DIR}/plugin-bootstrap.last-error.log"
SCOPE_MARKER="${MARKER_DIR}/plugin-bootstrap.selection"

record_install_failure() {
  log "$1"
  if ! mkdir -p "${MARKER_DIR}"; then
    log "could not save installation diagnostics"
    return 0
  fi
  if ! printf '%s\n%s\n' "$1" "${INSTALL_OUTPUT}" | tail -c 65536 >"${INSTALL_LOG}"; then
    log "could not save installation diagnostics"
    return 0
  fi
  log "installation diagnostics: ${INSTALL_LOG} (last 64 KiB)"
}

resolve_oma() {
  # Prefer a persistent global binary — workflows invoke bare `oma …` from
  # later Bash calls, so ephemeral `bunx` is not enough.
  if command -v oma >/dev/null 2>&1; then OMA_BIN="$(command -v oma)"; return 0; fi
  if [ -x "${HOME}/.bun/bin/oma" ]; then OMA_BIN="${HOME}/.bun/bin/oma"; return 0; fi
  return 1
}

project_is_wired() {
  [ -f "${PROJECT_DIR}/.agents/skills/_version.json" ] \
    && [ -f "${PROJECT_DIR}/.claude/settings.json" ] \
    && [ -x "${PROJECT_DIR}/.claude/hooks/oma-hook.sh" ] \
    && { [ -f "${PROJECT_DIR}/.agents/oma-config.yaml" ] \
      || [ -f "${PROJECT_DIR}/.agents/oma-config.cue" ]; } \
    && command -v bun >/dev/null 2>&1 \
    && OMA_BOOTSTRAP_PROJECT="${PROJECT_DIR}" OMA_BOOTSTRAP_PRESET="${PRESET}" OMA_BOOTSTRAP_SELECTION="${SELECTION}" bun -e '
      const { readFileSync, existsSync } = require("node:fs");
      const { join } = require("node:path");
      try {
        const version = JSON.parse(readFileSync(
          join(process.env.OMA_BOOTSTRAP_PROJECT, ".agents/skills/_version.json"), "utf8"));
        if (typeof version.version !== "string" || !version.version.trim() ||
            (version.mode !== undefined && version.mode !== "project")) process.exit(1);
        if (process.env.OMA_BOOTSTRAP_PRESET !== "all") {
          const selection = JSON.parse(readFileSync(process.env.OMA_BOOTSTRAP_SELECTION, "utf8"));
          if (selection.preset !== process.env.OMA_BOOTSTRAP_PRESET ||
              !Array.isArray(selection.skills) || !selection.skills.length ||
              !selection.skills.every((name) => /^oma-[a-z0-9-]+$/.test(name) &&
                existsSync(join(process.env.OMA_BOOTSTRAP_PROJECT, ".agents/skills", name, "SKILL.md")))) process.exit(1);
        }
        const settings = JSON.parse(readFileSync(
          join(process.env.OMA_BOOTSTRAP_PROJECT, ".claude/settings.json"), "utf8"));
        const events = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop"];
        const complete = events.every((event) =>
          Array.isArray(settings.hooks?.[event]) && settings.hooks[event].some((group) =>
            Array.isArray(group?.hooks) && group.hooks.some((hook) =>
              hook?.type === "command" && hook.name === `oma-hook-${event}` &&
              typeof hook.command === "string" && hook.command.includes(".claude/hooks/oma-hook.sh"))));
        process.exit(complete ? 0 : 1);
      } catch {
        process.exit(1);
      }
    ' >/dev/null 2>&1
}

read_cli_version() {
  if ! CLI_VERSION="$("${OMA_BIN}" --version 2>/dev/null)" \
    || [ -z "${CLI_VERSION}" ] || [ "${CLI_VERSION}" = unknown ]; then
    return 1
  fi
}

# ── 1. Fast-path: already wired for this CLI version ───────────────────────
if resolve_oma && read_cli_version; then
  if [ -f "${MARKER}" ] \
    && [ "$(cat "${MARKER}" 2>/dev/null || true)" = "${CLI_VERSION}" ] \
    && [ "$(cat "${SCOPE_MARKER}" 2>/dev/null || true)" = "${PRESET}" ] \
    && project_is_wired; then
    exit 0
  fi
fi

# ── 2. Provision runtimes via the official installer (deps only, no TTY) ───
if ! command -v bun >/dev/null 2>&1; then
  if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    log "curl/wget required to bootstrap. Run manually: curl -fsSL ${INSTALL_SH} | bash"
    exit 0
  fi
  if ! command -v bash >/dev/null 2>&1; then
    log "bash is required by the runtime installer; run the official installer manually"
    exit 0
  fi
  log "provisioning runtimes via official installer (first run, ~30-60s)…"
  if command -v curl >/dev/null 2>&1; then
    if ! INSTALLER_SOURCE="$(curl -fsSL "${INSTALL_SH}")"; then
      log "could not download the runtime installer; run it manually: ${INSTALL_SH}"
      exit 0
    fi
  else
    if ! INSTALLER_SOURCE="$(wget -qO- "${INSTALL_SH}")"; then
      log "could not download the runtime installer; run it manually: ${INSTALL_SH}"
      exit 0
    fi
  fi
  if ! OMA_INSTALL_NO_RUN=1 bash -c "${INSTALLER_SOURCE}" >&2; then
    log "runtime provisioning failed; run the official installer manually: ${INSTALL_SH}"
    exit 0
  fi
  export PATH="${PATH}:${HOME}/.bun/bin:${HOME}/.local/bin"
fi

# ── 2b. Ensure a persistent global `oma` binary (workflows call bare `oma`) ─
if ! resolve_oma; then
  if command -v bun >/dev/null 2>&1; then
    log "installing oma CLI globally (bun install -g oh-my-agent)…"
    bun install -g oh-my-agent >/dev/null 2>&1 || true
    export PATH="${PATH}:${HOME}/.bun/bin"
  fi
fi

if ! resolve_oma; then
  log "could not resolve oma after provisioning. Run manually: curl -fsSL ${INSTALL_SH} | bash"
  exit 0
fi

# ── 3. Non-interactive project wiring ──────────────────────────────────────
log "wiring project via oma install --yes --preset ${PRESET} (non-interactive)…"
set -- install --yes
if [ "${PRESET}" != all ]; then set -- "$@" --preset "${PRESET}"; fi
if ! INSTALL_OUTPUT="$(cd "${PROJECT_DIR}" && OMA_YES=1 OMA_INSTALL_GLOBAL=0 "${OMA_BIN}" "$@" 2>&1)"; then
  record_install_failure "oma install did not complete. Run manually in the project: oma install"
  exit 0
fi

if ! project_is_wired; then
  record_install_failure "oma install returned success but project wiring is incomplete; run oma install manually in the project"
  exit 0
fi

if ! read_cli_version; then
  log "project wiring completed but could not determine the CLI version; bootstrap will retry next session"
  exit 0
fi

if ! mkdir -p "${MARKER_DIR}" \
  || ! printf '%s' "${CLI_VERSION}" >"${MARKER}" \
  || ! printf '%s' "${PRESET}" >"${SCOPE_MARKER}"; then
  log "could not record project wiring; bootstrap will retry next session"
  exit 0
fi
log "oma is ready. Restart this session to activate workflows and hooks."
