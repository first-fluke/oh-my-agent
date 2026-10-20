#!/usr/bin/env bash
# =============================================================================
# benchmarks/run.sh — AI Harness Benchmark Runner
# =============================================================================
#
# Compares 5 Claude Code harnesses (vanilla, oma, omc, ecc, superpowers) by
# running the same benchmark prompt against each in a fully isolated environment
# and collecting per-harness output JSON, stderr, and a structured manifest.
#
# For external Harness² benchmark runs, see
# benchmarks/external/harness2/README.md.
#
# Usage:
#   ./benchmarks/run.sh [options]
#
# Options:
#   --harness <id>    Run only one harness (vanilla|oma|omc|ecc|superpowers)
#   --dry-run         Do everything except actually calling `claude -p`
#   --base <path>     Override the base directory (default: /tmp/oma-benchmark-<timestamp>)
#   -h, --help        Show this help
#
# Prerequisites:
#   - claude   in PATH  (Claude Code CLI)
#   - jq       in PATH  (JSON processor)
#   - git      in PATH
#   - bun      in PATH  (for oma harness via bunx)
#   - Authenticated `claude` CLI (OAuth login via `claude /login`) OR
#     ANTHROPIC_API_KEY set in the caller's environment
#
# =============================================================================
# INVESTIGATION FINDINGS (run before writing this script)
# =============================================================================
#
# claude --help (selected relevant flags):
#   -p / --print                 Non-interactive print mode
#   --dangerously-skip-permissions
#   --model <model>
#   --effort <level>             low|medium|high|max
#   --output-format <format>     text|json|stream-json
#   --max-budget-usd <amount>    Only works with --print
#   --no-session-persistence     Only works with --print
#   --add-dir <directories...>   Additional directories to allow tool access
#
# claude plugin --help:
#   Subcommands: disable, enable, install|i, list, marketplace, uninstall,
#                update, validate
#
# claude plugin marketplace --help:
#   Subcommands: add, list, remove|rm, update
#   add <source>  --scope user|project|local
#                 source may be a URL, path, or GitHub repo (owner/repo)
#
# claude plugin install --help:
#   install|i <plugin>  --scope user|project|local
#   plugin is resolved from configured marketplaces — the marketplace must be
#   added first before the plugin name becomes resolvable.
#
# oh-my-agent install --help (via bunx):
#   No --yes / --no-interactive flag exists.
#   The install command is interactive by default.
#   Non-interactive workaround: pipe 'yes' or set CI=true (tested below).
#
# Plugin install (omc / superpowers) via --plugin-dir:
#   Instead of `claude plugin marketplace add` + `claude plugin install` (which
#   have no --yes/--non-interactive flag and may hang waiting for prompts), we
#   git clone each plugin repo to $BASE/plugins/<harness>/ and load it at
#   runtime via `claude --plugin-dir <path>`.  No install step is required.
#
#   omc (oh-my-claudecode) --plugin-dir notes:
#     The REFERENCE.md decision matrix shows that `claude --plugin-dir <path>`
#     (direct, without the omc shim) requires OMC_PLUGIN_ROOT to be set so
#     HUD and env-aware components can resolve the same path.  However, those
#     components (HUD bundle, hooks, CLAUDE.md) are only installed by
#     `omc setup --plugin-dir-mode`, which in turn requires the omc npm CLI
#     (oh-my-claude-sisyphus) to be present.  For a cold benchmark run where
#     we only care about the plugin's skills/agents being active inside the
#     `claude -p` session, setting OMC_PLUGIN_ROOT and passing --plugin-dir is
#     sufficient.  We do NOT run `omc setup`.
#
#   superpowers: same git-clone + --plugin-dir approach; no extra setup step.
#
# ECC (everything-claude-code) install:
#   Requires: git clone + ./install.sh --profile full
#   install.sh may require HOME to be set for writing ~/.claude or similar.
#   We pass HOME=$HOMEDIR to contain it. The --profile flag is assumed;
#   if install.sh does not accept it, the script logs and marks failed.
#
# =============================================================================

set -uo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROMPT_FILE="$SCRIPT_DIR/prompt.md"
readonly ALL_HARNESSES=(vanilla oma omc ecc superpowers)
readonly MODEL="claude-opus-4-6"
readonly EFFORT="max"
readonly MAX_BUDGET_USD="20"
readonly RUN_TIMEOUT=3600  # 60 minutes per harness
readonly INSTALL_TIMEOUT=300  # 5 minutes per harness install
readonly ECC_CLONE_DIR="/tmp/ecc-src"

# ---------------------------------------------------------------------------
# Defaults (overridable via flags)
# ---------------------------------------------------------------------------
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BASE="/tmp/oma-benchmark-${TIMESTAMP}"
DRY_RUN=false
ONLY_HARNESS=""  # empty means all

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
usage() {
  grep '^# ' "$0" | grep -v '#!/' | sed 's/^# //' | head -20
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --harness)
      ONLY_HARNESS="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --base)
      BASE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
preflight_check() {
  local missing=0

  for bin in claude jq git bun; do
    if ! command -v "$bin" &>/dev/null; then
      echo "ERROR: '$bin' not found in PATH" >&2
      missing=1
    fi
  done

  # Resolve a portable timeout binary. macOS lacks GNU `timeout` by default;
  # `gtimeout` is provided by Homebrew coreutils. Fall back to a no-op `env`
  # wrapper so the script still runs (without enforcement) when neither exists.
  if command -v timeout &>/dev/null; then
    TIMEOUT_CMD=(timeout)
  elif command -v gtimeout &>/dev/null; then
    TIMEOUT_CMD=(gtimeout)
  else
    warn "No 'timeout' or 'gtimeout' found — running WITHOUT timeout enforcement."
    warn "Install GNU coreutils ('brew install coreutils') for safer runs."
    # `env` swallows the timeout-seconds arg as a no-op env assignment-ish
    # token only if it's NAME=VALUE form. We use a small inline shim instead.
    TIMEOUT_CMD=(_no_timeout)
  fi

  if [[ ! -f "$PROMPT_FILE" ]]; then
    echo "ERROR: Prompt file not found: $PROMPT_FILE" >&2
    missing=1
  fi

  if [[ -n "$ONLY_HARNESS" ]]; then
    local valid=false
    for h in "${ALL_HARNESSES[@]}"; do
      [[ "$h" == "$ONLY_HARNESS" ]] && valid=true
    done
    if [[ "$valid" == false ]]; then
      echo "ERROR: Unknown harness '$ONLY_HARNESS'. Valid: ${ALL_HARNESSES[*]}" >&2
      missing=1
    fi
  fi

  if [[ "$missing" -ne 0 ]]; then
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Fallback shim: drops the first arg (seconds) and execs the rest.
# Used when neither `timeout` nor `gtimeout` is available.
# ---------------------------------------------------------------------------
_no_timeout() { shift; "$@"; }
export -f _no_timeout

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
log()  { echo "[$(date +%H:%M:%S)] $*"; }
info() { echo "[$(date +%H:%M:%S)] INFO  $*"; }
warn() { echo "[$(date +%H:%M:%S)] WARN  $*" >&2; }
err()  { echo "[$(date +%H:%M:%S)] ERROR $*" >&2; }

# ---------------------------------------------------------------------------
# JSON helpers (writes manifest files without external deps beyond jq)
# ---------------------------------------------------------------------------

# write_harness_manifest <harness> <install_status> <install_log> <run_status>
#                        <duration> <exit_code>
write_harness_manifest() {
  local harness="$1"
  local install_status="$2"
  local install_log="$3"
  local run_status="$4"
  local duration="$5"
  local exit_code="$6"

  jq -n \
    --arg harness       "$harness" \
    --arg inst_status   "$install_status" \
    --arg inst_log      "$install_log" \
    --arg run_status    "$run_status" \
    --argjson duration  "$duration" \
    --argjson exit_code "$exit_code" \
    --arg project_dir   "$BASE/projects/$harness" \
    --arg home_dir      "$BASE/homes/$harness" \
    --arg output_file   "$BASE/results/${harness}.json" \
    --arg stderr_file   "$BASE/results/${harness}.stderr" \
    '{
      harness:             $harness,
      install_status:      $inst_status,
      install_log:         $inst_log,
      run_status:          $run_status,
      duration_seconds:    $duration,
      exit_code:           $exit_code,
      project_dir:         $project_dir,
      home_dir:            $home_dir,
      claude_output_file:  $output_file,
      claude_stderr_file:  $stderr_file
    }' > "$BASE/results/${harness}.manifest.json"
}

# ---------------------------------------------------------------------------
# Environment setup
# ---------------------------------------------------------------------------
setup_environment() {
  info "Creating base directory: $BASE"
  mkdir -p "$BASE/results"

  # Capture the real HOME before any overrides so we can seed OAuth state
  # into each harness's isolated HOME.
  REAL_HOME="${HOME}"

  for h in "${ALL_HARNESSES[@]}"; do
    # Create isolated home and empty project per harness
    mkdir -p "$BASE/homes/$h" "$BASE/projects/$h"

    # git-init the project (quiet)
    git -C "$BASE/projects/$h" init -q

    # Minimal git config scoped to this home only
    git config --file "$BASE/homes/$h/.gitconfig" user.name  "benchmark"
    git config --file "$BASE/homes/$h/.gitconfig" user.email "bench@test"

    # Seed OAuth credentials so authenticated `claude -p` works under the
    # isolated HOME. macOS stores OAuth tokens in Keychain (per-user, not
    # HOME-bound) so they remain accessible. Linux/CI keep them in
    # ~/.claude/.credentials.json. Account/config state lives in ~/.claude.json.
    if [[ -f "${REAL_HOME}/.claude.json" ]]; then
      cp "${REAL_HOME}/.claude.json" "$BASE/homes/$h/.claude.json"
    fi
    if [[ -f "${REAL_HOME}/.claude/.credentials.json" ]]; then
      mkdir -p "$BASE/homes/$h/.claude"
      cp "${REAL_HOME}/.claude/.credentials.json" \
         "$BASE/homes/$h/.claude/.credentials.json"
    fi
  done

  # Create plugins directory for --plugin-dir harnesses
  mkdir -p "$BASE/plugins"

  # Copy prompt into the run directory for traceability
  cp "$PROMPT_FILE" "$BASE/prompt.md"

  # Record claude version for reproducibility
  local claude_version
  claude_version="$(claude --version 2>&1 || true)"
  info "Claude version: $claude_version"

  # Record start time in ISO 8601
  STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

# ---------------------------------------------------------------------------
# Harness installation functions
# One function per harness. Each:
#   - writes install output to $BASE/results/<harness>.install.log
#   - returns 0 on success, non-zero on failure
# ---------------------------------------------------------------------------

install_vanilla() {
  # vanilla = bare Claude Code, nothing to install
  info "[vanilla] No installation required."
  echo "vanilla: no install needed" > "$BASE/results/vanilla.install.log"
  return 0
}

install_oma() {
  local homedir="$BASE/homes/oma"
  local projdir="$BASE/projects/oma"
  local logfile="$BASE/results/oma.install.log"

  info "[oma] Installing oh-my-agent via bunx..."

  # oh-my-agent install does not accept --yes.
  # We set CI=true which suppresses interactive prompts in most Node CLIs.
  # The install command writes into the cwd's .agents/ and .claude/ directories.
  (
    cd "$projdir"
    CI=true HOME="$homedir" \
      "${TIMEOUT_CMD[@]}" "$INSTALL_TIMEOUT" \
      bunx oh-my-agent@latest install \
      > "$logfile" 2>&1
  )
  local rc=$?

  if [[ $rc -ne 0 ]]; then
    err "[oma] Installation failed (exit $rc). See $logfile"
    return $rc
  fi

  info "[oma] Installation succeeded."
  return 0
}

install_omc() {
  # oh-my-claudecode loaded via --plugin-dir (no install step required).
  # We git clone the repo to $BASE/plugins/omc/ and pass --plugin-dir at
  # runtime.  OMC_PLUGIN_ROOT is set in the environment so HUD and other
  # env-aware components resolve the same path.
  local plugin_dir="$BASE/plugins/omc"
  local logfile="$BASE/results/omc.install.log"

  info "[omc] Cloning oh-my-claudecode to $plugin_dir"

  if "${TIMEOUT_CMD[@]}" "$INSTALL_TIMEOUT" \
       git clone --depth 1 \
         "https://github.com/Yeachan-Heo/oh-my-claudecode" \
         "$plugin_dir" 2>&1 | tee -a "$logfile"; then
    info "[omc] Clone succeeded."
    return 0
  else
    local rc=$?
    err "[omc] Clone failed (exit $rc). See $logfile"
    return $rc
  fi
}

install_ecc() {
  # everything-claude-code: git clone then ./install.sh --profile full
  # The installer writes to ~/.claude/ at the user level. Because claude
  # invocations now use REAL_HOME (required for OAuth on macOS), running
  # ecc's installer would mutate the operator's actual ~/.claude/ —
  # destructive. We skip ecc by default; run it standalone in a clean VM
  # if you need its results.
  local logfile="$BASE/results/ecc.install.log"
  cat > "$logfile" <<'EOF'
SKIPPED: ecc is not benchmarked in this run.

Reason: ecc's install.sh writes to the user-level ~/.claude/ directory.
Because claude requires the real HOME to authenticate via OAuth on macOS,
running ecc's installer here would mutate the operator's actual config.
Run ecc standalone in a disposable VM/container to benchmark it.
EOF
  warn "[ecc] Skipped — user-level install would mutate real ~/.claude/."
  return 1
  # Unreachable below — kept for reference.
  local homedir="$BASE/homes/ecc"
  local projdir="$BASE/projects/ecc"
  local clone_dir="${ECC_CLONE_DIR}-$$"  # PID-suffix to avoid conflicts

  info "[ecc] Cloning everything-claude-code..."

  {
    echo "=== git clone ==="
    git clone --depth 1 \
      "https://github.com/affaan-m/everything-claude-code" \
      "$clone_dir" 2>&1

    local rc_clone=$?
    if [[ $rc_clone -ne 0 ]]; then
      echo "FAILED: git clone exited $rc_clone"
      exit $rc_clone
    fi

    if [[ ! -f "$clone_dir/install.sh" ]]; then
      echo "FAILED: install.sh not found in cloned repo"
      exit 1
    fi

    chmod +x "$clone_dir/install.sh"

    echo "=== install.sh ==="
    # Pass the project dir if the installer supports --dir; fall back to cwd.
    # --profile full is specified per the design doc.
    (
      cd "$clone_dir"
      HOME="$homedir" \
        "${TIMEOUT_CMD[@]}" "$INSTALL_TIMEOUT" \
        bash install.sh --profile full 2>&1
    )

    local rc_install=$?
    echo "exit_code: $rc_install"

    # Clean up clone dir regardless of outcome
    rm -rf "$clone_dir"

    exit $rc_install

  } > "$logfile" 2>&1

  local rc=$?
  if [[ $rc -ne 0 ]]; then
    err "[ecc] Installation failed (exit $rc). See $logfile"
    return $rc
  fi

  info "[ecc] Installation succeeded."
  return 0
}

install_superpowers() {
  # superpowers by obra — loaded via --plugin-dir (no install step required).
  # We git clone the repo to $BASE/plugins/superpowers/ and pass --plugin-dir
  # at runtime.
  local plugin_dir="$BASE/plugins/superpowers"
  local logfile="$BASE/results/superpowers.install.log"

  info "[superpowers] Cloning superpowers to $plugin_dir"

  if "${TIMEOUT_CMD[@]}" "$INSTALL_TIMEOUT" \
       git clone --depth 1 \
         "https://github.com/obra/superpowers" \
         "$plugin_dir" 2>&1 | tee -a "$logfile"; then
    info "[superpowers] Clone succeeded."
    return 0
  else
    local rc=$?
    err "[superpowers] Clone failed (exit $rc). See $logfile"
    return $rc
  fi
}

# ---------------------------------------------------------------------------
# Run a single harness
# ---------------------------------------------------------------------------
run_harness() {
  local harness="$1"
  local homedir="$BASE/homes/$harness"
  local projdir="$BASE/projects/$harness"
  local out_file="$BASE/results/${harness}.json"
  local err_file="$BASE/results/${harness}.stderr"
  local install_log_file="$BASE/results/${harness}.install.log"

  info "========================================================"
  info "Harness: $harness"
  info "========================================================"

  # ---- Installation phase ------------------------------------------------
  local install_status="success"
  local install_log=""

  case "$harness" in
    vanilla)    install_vanilla    || install_status="failed" ;;
    oma)        install_oma        || install_status="failed" ;;
    omc)        install_omc        || install_status="failed" ;;
    ecc)        install_ecc        || install_status="failed" ;;
    superpowers) install_superpowers || install_status="failed" ;;
  esac

  # Capture the install log content (may not exist for vanilla)
  if [[ -f "$install_log_file" ]]; then
    install_log="$(cat "$install_log_file")"
  fi

  # If install failed, write manifest and skip the run
  if [[ "$install_status" == "failed" ]]; then
    warn "[$harness] Skipping run because install failed."
    write_harness_manifest \
      "$harness" \
      "failed" \
      "$install_log" \
      "skipped" \
      0 \
      -1
    return 0  # do NOT abort the whole benchmark
  fi

  # Snapshot install state for reference
  {
    echo "=== ls -la $projdir ==="
    ls -la "$projdir" 2>/dev/null || true
    echo ""
    echo "=== du -sh $homedir ==="
    du -sh "$homedir" 2>/dev/null || true
  } >> "${install_log_file:-/dev/null}" 2>/dev/null || true

  # ---- Execution phase ----------------------------------------------------
  local start_epoch end_epoch duration
  start_epoch=$(date +%s)

  local run_exit=0
  local run_status="success"

  if [[ "$DRY_RUN" == true ]]; then
    info "[$harness] DRY RUN — skipping claude -p invocation."
    echo '{"dry_run":true}' > "$out_file"
    echo ""                 > "$err_file"
  else
    info "[$harness] Launching claude -p (timeout ${RUN_TIMEOUT}s)..."

    # Determine per-harness extra flags for plugin-based harnesses.
    # omc: pass --plugin-dir pointing at the cloned repo; also export
    #      OMC_PLUGIN_ROOT so HUD and env-aware components resolve the
    #      same path without needing `omc setup`.
    # superpowers: pass --plugin-dir pointing at the cloned repo.
    local extra_flags=()
    local extra_env=()
    case "$harness" in
      omc)
        extra_flags=(--plugin-dir "$BASE/plugins/omc")
        extra_env=(OMC_PLUGIN_ROOT="$BASE/plugins/omc")
        ;;
      superpowers)
        extra_flags=(--plugin-dir "$BASE/plugins/superpowers")
        ;;
    esac

    # On macOS, OAuth credentials are gated on the real HOME (claude won't
    # authenticate when HOME is redirected). We keep the original HOME for
    # claude invocations and use --setting-sources to scope user-level
    # contamination: only project + local (per-harness $projdir) settings
    # are loaded; user-level ~/.claude/settings.json is excluded.
    auth_env=()
    [[ -n "${ANTHROPIC_API_KEY:-}" ]] && auth_env+=(ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY")
    [[ -n "${OPENAI_API_KEY:-}"    ]] && auth_env+=(OPENAI_API_KEY="$OPENAI_API_KEY")

    # Use `env` for portable VAR=VAL prefixes — bash array-expansion of
    # `VAR=VAL` tokens does NOT trigger assignment semantics when expanded
    # at command-prefix position, so an inline `HOME=… "${arr[@]}" cmd`
    # form fails with "No such file or directory". `env` consumes them.
    (
      cd "$projdir"
      env \
        HOME="$REAL_HOME" \
        "${auth_env[@]+"${auth_env[@]}"}" \
        "${extra_env[@]+"${extra_env[@]}"}" \
        "${TIMEOUT_CMD[@]}" "$RUN_TIMEOUT" \
        claude -p "$(cat "$BASE/prompt.md")" \
          --dangerously-skip-permissions \
          --model "$MODEL" \
          --effort "$EFFORT" \
          --output-format json \
          --max-budget-usd "$MAX_BUDGET_USD" \
          --no-session-persistence \
          --setting-sources project,local \
          --add-dir "$projdir" \
          "${extra_flags[@]+"${extra_flags[@]}"}" \
          > "$out_file" \
          2> "$err_file"
    )
    run_exit=$?

    case "$run_exit" in
      0)   run_status="success" ;;
      124) run_status="timeout"
           warn "[$harness] Run timed out after ${RUN_TIMEOUT}s" ;;
      *)   run_status="error"
           warn "[$harness] Run exited with code $run_exit" ;;
    esac
  fi

  end_epoch=$(date +%s)
  duration=$(( end_epoch - start_epoch ))

  info "[$harness] Completed in ${duration}s — status: $run_status"

  # ---- Manifest ------------------------------------------------------------
  write_harness_manifest \
    "$harness" \
    "$install_status" \
    "$install_log" \
    "$run_status" \
    "$duration" \
    "$run_exit"
}

# ---------------------------------------------------------------------------
# Write the final run-level manifest
# ---------------------------------------------------------------------------
write_run_manifest() {
  local finished_at
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  # Build the "results" object mapping each harness to its manifest path
  local results_obj="{}"
  for h in "${ALL_HARNESSES[@]}"; do
    results_obj="$(
      echo "$results_obj" | \
      jq --arg k "$h" --arg v "results/${h}.manifest.json" \
        '. + {($k): $v}'
    )"
  done

  jq -n \
    --arg base_dir     "$BASE" \
    --arg started_at   "$STARTED_AT" \
    --arg finished_at  "$finished_at" \
    --arg model        "$MODEL" \
    --argjson harnesses "$(printf '%s\n' "${ALL_HARNESSES[@]}" | jq -R . | jq -s .)" \
    --argjson results  "$results_obj" \
    '{
      base_dir:    $base_dir,
      started_at:  $started_at,
      finished_at: $finished_at,
      model:       $model,
      harnesses:   $harnesses,
      results:     $results
    }' > "$BASE/results/run-manifest.json"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  preflight_check

  info "Benchmark runner starting"
  info "Base directory : $BASE"
  info "Model          : $MODEL"
  info "Effort         : $EFFORT"
  info "Dry run        : $DRY_RUN"
  info "Single harness : ${ONLY_HARNESS:-all}"

  setup_environment

  # Determine which harnesses to run
  local harnesses_to_run=()
  if [[ -n "$ONLY_HARNESS" ]]; then
    harnesses_to_run=("$ONLY_HARNESS")
  else
    harnesses_to_run=("${ALL_HARNESSES[@]}")
  fi

  # Sequential execution — intentional: parallel runs on the same machine
  # would skew timing metrics (CPU/IO contention).
  for harness in "${harnesses_to_run[@]}"; do
    run_harness "$harness"
  done

  write_run_manifest

  info "All done. Results in: $BASE/results/"
  info "Run manifest: $BASE/results/run-manifest.json"

  # Print base path to stdout so collect.sh can locate it
  echo "$BASE"
}

main "$@"
