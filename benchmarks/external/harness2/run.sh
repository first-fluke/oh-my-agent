#!/usr/bin/env bash
# =============================================================================
# benchmarks/external/harness2/run.sh — Harness² external benchmark runner
# =============================================================================
#
# Wraps google-research/harness2 without touching the generated
# benchmarks/README.md scoreboard. Every non-plan invocation writes a
# results/<run-id>/manifest.json recording the OMA commit, Harness² commit,
# models, benchmark, substrate, k/mode/seed, network policy, and commands.
#
# Usage:
#   run.sh demo  [--k N] [--plan]
#   run.sh setup <jb|lab|wb> [--subset office|web|code] [--substrate oc|cx] [--dry-run] [--plan]
#   run.sh check <jb|lab|wb> [--subset office|web|code] [--substrate oc|cx] [--plan]
#   run.sh run   <jb|lab|wb> [options] --network-policy TEXT --yes
#   run.sh judge <jb|lab|wb> [options] --yes
#   run.sh report <jb|lab|wb> [options]
#   run.sh bench <jb|lab|wb> [options] --network-policy TEXT --yes
#
# Options:
#   --k N                 recursion budget (default: 1)
#   --mode MODE           parallel | sequential (agg | seq accepted upstream)
#   --seed N              stream-order seed
#   --substrate oc|cx     executor substrate (default: oc)
#   --subset S            wb only: office | web | code
#   --only-domains LIST   run/bench only
#   --max-tasks N         run/bench only
#   --workers N           run/bench only
#   --dry-run             pass --dry-run to the upstream command
#   --plan                print planned commands and exit (safe on macOS)
#   --yes                 acknowledge model spend (or set HARNESS2_YES=1)
#   -h, --help            show this help
#
# Requirements:
#   Linux (for anything except --plan), git, uv, Python 3.12.
#   Model-backed runs also need gcloud + Vertex AI access; wb also needs
#   Docker; lab also needs Pandoc + Poppler. The demo needs no credentials.
#
# See README.md for security, network, and reproducibility requirements.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi
readonly SCRIPT_DIR REPO_ROOT

readonly HARNESS2_REPO_URL="${HARNESS2_REPO_URL:-https://github.com/google-research/harness2.git}"
readonly HARNESS2_REF="${HARNESS2_REF:-main}"
readonly HARNESS2_PYTHON="${HARNESS2_PYTHON:-3.12}"
readonly WORK_ROOT="${OMA_HARNESS2_DIR:-$SCRIPT_DIR/.work}"
readonly CHECKOUT="$WORK_ROOT/harness2"
readonly RESULTS_ROOT="${OMA_HARNESS2_RESULTS_DIR:-$SCRIPT_DIR/results}"
readonly VENV_BIN="$CHECKOUT/.venv/bin"

BENCH=""
SUBSET=""
SUBSTRATE="oc"
K=1
MODE="parallel"
SEED=""
WORKERS=""
ONLY_DOMAINS=""
MAX_TASKS=""
NETWORK_POLICY=""
PLAN=false
DRY_RUN=false
ASSUME_YES="${HARNESS2_YES:-0}"
HARNESS2_COMMIT=""
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
OMA_COMMIT="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || true)"
CMD=""
RUN_ID=""
RUN_DIR=""
COMMAND_LOG=""

case "$ASSUME_YES" in
  1|true|yes) ASSUME_YES=1 ;;
  *) ASSUME_YES=0 ;;
esac

usage() {
  cat <<'EOF'
Harness² external benchmark runner

Usage:
  run.sh demo  [--k N] [--plan]
  run.sh setup <jb|lab|wb> [--subset office|web|code] [--substrate oc|cx] [--dry-run] [--plan]
  run.sh check <jb|lab|wb> [--subset office|web|code] [--substrate oc|cx] [--plan]
  run.sh run   <jb|lab|wb> [options] --network-policy TEXT --yes
  run.sh judge <jb|lab|wb> [options] --yes
  run.sh report <jb|lab|wb> [options]
  run.sh bench <jb|lab|wb> [options] --network-policy TEXT --yes

Options:
  --k N                 recursion budget (default: 1)
  --mode MODE           parallel | sequential (agg | seq accepted upstream)
  --seed N              stream-order seed
  --substrate oc|cx     executor substrate (default: oc)
  --subset S            wb only: office | web | code
  --only-domains LIST   run/bench only
  --max-tasks N         run/bench only
  --workers N           run/bench only
  --dry-run             pass --dry-run to the upstream command
  --plan                print planned commands and exit (safe on macOS)
  --yes                 acknowledge model spend (or set HARNESS2_YES=1)
  -h, --help            show this help

Examples:
  ./benchmarks/external/harness2/run.sh demo
  ./benchmarks/external/harness2/run.sh bench lab --k 1 --plan
  ./benchmarks/external/harness2/run.sh bench lab --k 1 \
    --network-policy "blocked: huggingface.co,hf.co,github.com,raw.githubusercontent.com" \
    --yes

Environment:
  HARNESS2_REF            upstream branch/tag/commit (default: main)
  HARNESS2_REPO_URL       upstream clone URL
  HARNESS2_PYTHON         Python version for uv (default: 3.12)
  HARNESS2_EXTRAS         pip extras (default: render; cx adds bridge)
  OMA_HARNESS2_DIR        checkout/work root (default: <script>/.work)
  OMA_HARNESS2_RESULTS_DIR results root (default: <script>/results)
  HARNESS2_YES            same as --yes when set to 1/true/yes
EOF
  exit 0
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

note() {
  printf '==> %s\n' "$*" >&2
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

require_linux() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    die "Harness² benchmark runs require Linux (found $(uname -s)). Use a Linux container/VM, or rerun with --plan. See README.md."
  fi
}

plan_cmd() {
  printf '  '
  printf '%q ' "$@"
  printf '\n'
}

run_in_checkout() {
  local -a cmd=("$@")
  local line
  line="$(printf '%q ' "${cmd[@]}")"
  printf '%s\n' "$line" >> "$COMMAND_LOG"
  note "$line"
  ( cd "$CHECKOUT" && "${cmd[@]}" )
}

run_in_checkout_tee() {
  local out="$1"
  shift
  local -a cmd=("$@")
  local line
  line="$(printf '%q ' "${cmd[@]}") | tee $(printf '%q' "$out")"
  printf '%s\n' "$line" >> "$COMMAND_LOG"
  note "$line"
  ( cd "$CHECKOUT" && "${cmd[@]}" ) | tee "$out"
}

write_manifest() {
  local code="$1"
  if [[ -z "${RUN_DIR:-}" ]]; then
    return 0
  fi
  mkdir -p "$RUN_DIR"
  local py="$VENV_BIN/python"
  if [[ ! -x "$py" ]]; then
    py="python3"
  fi
  "$py" - "$RUN_DIR/manifest.json" "$code" <<'PY'
import datetime
import json
import os
import sys

path = sys.argv[1]
code = int(sys.argv[2])
env = os.environ.get


def as_int(name):
    value = env(name, "").strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def as_csv(name):
    return [part for part in (p.strip() for p in env(name, "").split(",")) if part]


commands = []
log = env("COMMAND_LOG", "")
if log and os.path.exists(log):
    with open(log, encoding="utf-8") as handle:
        commands = [line.rstrip("\n") for line in handle if line.strip()]

manifest = {
    "schema": 1,
    "command": env("RUN_CMD", ""),
    "oma_commit": env("OMA_COMMIT", ""),
    "harness2": {
        "repo": env("HARNESS2_REPO_URL", ""),
        "ref": env("HARNESS2_REF", ""),
        "commit": env("HARNESS2_COMMIT", ""),
    },
    "bench": env("BENCH", ""),
    "subset": env("SUBSET", "") or None,
    "substrate": env("SUBSTRATE", ""),
    "k": as_int("K"),
    "mode": env("MODE", ""),
    "seed": as_int("SEED"),
    "only_domains": as_csv("ONLY_DOMAINS"),
    "max_tasks": as_int("MAX_TASKS"),
    "workers": as_int("WORKERS"),
    "dry_run": env("DRY_RUN_ENV", "0") == "1",
    "network_policy": env("NETWORK_POLICY", "")
    or "unspecified (dry-run or no executor call)",
    "models": {
        "solver": env("HARNESS2_SOLVER_MODEL", "") or "upstream-default",
        "improver": env("HARNESS2_IMPROVER_MODEL", "") or "upstream-default",
        "judge": env("HARNESS2_JUDGE_MODEL", "") or "upstream-default",
    },
    "vertex": {
        "project": env("GOOGLE_CLOUD_PROJECT", ""),
        "region": env("GOOGLE_CLOUD_LOCATION", ""),
    },
    "started_at": env("STARTED_AT", ""),
    "finished_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "exit_code": code,
    "commands": commands,
    "raw_runs_dir": "runs",
}

with open(path, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, indent=2, sort_keys=True)
    handle.write("\n")
PY
}

phase_demo() {
  local -a args=("$VENV_BIN/harness2-demo" --output "$RUN_DIR/demo" --k "$K")
  if [[ "$PLAN" == true ]]; then
    plan_cmd "${args[@]}"
  else
    run_in_checkout "${args[@]}"
  fi
}

phase_setup() {
  local -a args=("$VENV_BIN/harness2-setup" "$BENCH" --substrate "$SUBSTRATE")
  if [[ -n "$SUBSET" ]]; then
    args+=(--subset "$SUBSET")
  fi
  if [[ "$DRY_RUN" == true ]]; then
    args+=(--dry-run)
  fi
  if [[ "$PLAN" == true ]]; then
    plan_cmd "${args[@]}"
  else
    run_in_checkout "${args[@]}"
  fi
}

phase_check() {
  local -a args=("$VENV_BIN/harness2-check" --bench "$BENCH" --substrate "$SUBSTRATE")
  if [[ -n "$SUBSET" ]]; then
    args+=(--subset "$SUBSET")
  fi
  if [[ "$PLAN" == true ]]; then
    plan_cmd "${args[@]}"
  else
    run_in_checkout "${args[@]}"
  fi
}

phase_run() {
  local -a args=(
    "$VENV_BIN/harness2"
    --bench "$BENCH"
    --substrate "$SUBSTRATE"
    --k "$K"
    --mode "$MODE"
  )
  if [[ -n "$SUBSET" ]]; then
    args+=(--subset "$SUBSET")
  fi
  if [[ -n "$SEED" ]]; then
    args+=(--seed "$SEED")
  fi
  if [[ -n "$WORKERS" ]]; then
    args+=(--workers "$WORKERS")
  fi
  if [[ -n "$ONLY_DOMAINS" ]]; then
    args+=(--only-domains "$ONLY_DOMAINS")
  fi
  if [[ -n "$MAX_TASKS" ]]; then
    args+=(--max-tasks "$MAX_TASKS")
  fi
  if [[ "$DRY_RUN" == true ]]; then
    args+=(--dry-run)
  fi
  if [[ "$PLAN" == true ]]; then
    plan_cmd "${args[@]}"
  else
    run_in_checkout "${args[@]}"
  fi
}

phase_judge() {
  local -a args=(
    "$VENV_BIN/harness2-judge"
    --bench "$BENCH"
    --substrate "$SUBSTRATE"
    --k "$K"
    --mode "$MODE"
  )
  if [[ -n "$SUBSET" ]]; then
    args+=(--subset "$SUBSET")
  fi
  if [[ -n "$SEED" ]]; then
    args+=(--seed "$SEED")
  fi
  if [[ "$PLAN" == true ]]; then
    plan_cmd "${args[@]}"
  else
    run_in_checkout "${args[@]}"
  fi
}

phase_report() {
  local -a args=(
    "$VENV_BIN/harness2-report"
    --bench "$BENCH"
    --substrate "$SUBSTRATE"
    --k "$K"
    --mode "$MODE"
  )
  if [[ -n "$SUBSET" ]]; then
    args+=(--subset "$SUBSET")
  fi
  if [[ -n "$SEED" ]]; then
    args+=(--seed "$SEED")
  fi
  if [[ "$PLAN" == true ]]; then
    plan_cmd "${args[@]}"
    printf '  # stdout -> %s/report.txt\n' "$RUN_DIR"
  else
    run_in_checkout_tee "$RUN_DIR/report.txt" "${args[@]}"
  fi
}

print_plan() {
  local extras="${HARNESS2_EXTRAS:-render}"
  if [[ "$SUBSTRATE" == "cx" && "$extras" != *bridge* ]]; then
    extras="render,bridge"
  fi
  cat <<EOF
Harness² external benchmark plan
  oma commit:  ${OMA_COMMIT:-unknown}
  checkout:    $CHECKOUT
  upstream:    $HARNESS2_REPO_URL @ $HARNESS2_REF
  command:     $CMD
  bench:       ${BENCH:-demo}
  subset:      ${SUBSET:-none}
  substrate:   $SUBSTRATE
  k:           $K
  mode:        $MODE
  seed:        ${SEED:-none}
  dry-run:     $DRY_RUN
  results:     $RUN_DIR

Prepare:
EOF
  plan_cmd git clone "$HARNESS2_REPO_URL" "$CHECKOUT"
  plan_cmd git -C "$CHECKOUT" fetch --tags --force origin
  plan_cmd git -C "$CHECKOUT" checkout --detach "$HARNESS2_REF"
  plan_cmd uv venv --python "$HARNESS2_PYTHON" "$CHECKOUT/.venv"
  printf '  '
  printf '(cd %q && ' "$CHECKOUT"
  printf '%q ' env VIRTUAL_ENV="$CHECKOUT/.venv" uv pip install -e ".[$extras]"
  printf ')\n'
  printf 'Commands:\n'
  case "$CMD" in
    demo)
      phase_demo
      ;;
    setup)
      phase_setup
      ;;
    check)
      phase_check
      ;;
    run)
      phase_run
      ;;
    judge)
      phase_judge
      ;;
    report)
      phase_report
      ;;
    bench)
      phase_setup
      phase_check
      phase_run
      if [[ "$DRY_RUN" != true ]]; then
        phase_judge
        phase_report
      fi
      ;;
  esac
  printf 'Manifest (on execution): %s/manifest.json\n' "$RUN_DIR"
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
if [[ $# -eq 0 ]]; then
  usage
fi

CMD="$1"
shift

case "$CMD" in
  -h|--help|help)
    usage
    ;;
  demo|setup|check|run|judge|report|bench)
    ;;
  *)
    die "unknown command: $CMD (see --help)"
    ;;
esac

if [[ "$CMD" != "demo" ]]; then
  if [[ $# -gt 0 && "$1" != --* ]]; then
    BENCH="$1"
    shift
  fi
  if [[ -z "$BENCH" ]]; then
    die "$CMD requires a benchmark: jb, lab, or wb"
  fi
  case "$BENCH" in
    jb|lab|wb) ;;
    *) die "unknown benchmark: $BENCH (expected jb, lab, or wb)" ;;
  esac
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --subset)
      SUBSET="${2:-}"
      shift 2
      ;;
    --substrate)
      SUBSTRATE="${2:-}"
      shift 2
      ;;
    --k)
      K="${2:-}"
      shift 2
      ;;
    --mode|--modes)
      MODE="${2:-}"
      shift 2
      ;;
    --seed)
      SEED="${2:-}"
      shift 2
      ;;
    --workers)
      WORKERS="${2:-}"
      shift 2
      ;;
    --only-domains)
      ONLY_DOMAINS="${2:-}"
      shift 2
      ;;
    --max-tasks)
      MAX_TASKS="${2:-}"
      shift 2
      ;;
    --network-policy)
      NETWORK_POLICY="${2:-}"
      shift 2
      ;;
    --yes)
      ASSUME_YES=1
      shift
      ;;
    --plan)
      PLAN=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      die "unknown option: $1 (see --help)"
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
if ! [[ "$K" =~ ^[1-9][0-9]*$ ]]; then
  die "--k must be a positive integer"
fi
if [[ -n "$SEED" ]] && ! [[ "$SEED" =~ ^-?[0-9]+$ ]]; then
  die "--seed must be an integer"
fi
if [[ -n "$WORKERS" ]] && ! [[ "$WORKERS" =~ ^[1-9][0-9]*$ ]]; then
  die "--workers must be a positive integer"
fi
if [[ -n "$MAX_TASKS" ]] && ! [[ "$MAX_TASKS" =~ ^[1-9][0-9]*$ ]]; then
  die "--max-tasks must be a positive integer"
fi

case "$SUBSTRATE" in
  oc|cx) ;;
  *) die "--substrate must be oc or cx" ;;
esac
case "$MODE" in
  parallel|sequential|agg|seq) ;;
  *) die "--mode must be parallel or sequential (agg/seq accepted upstream)" ;;
esac
if [[ -n "$SUBSET" ]]; then
  case "$SUBSET" in
    office|web|code) ;;
    *) die "--subset must be office, web, or code" ;;
  esac
  if [[ "$BENCH" != "wb" ]]; then
    die "--subset only applies to wb"
  fi
fi

case "$CMD" in
  demo)
    if [[ -n "$SUBSET" || -n "$ONLY_DOMAINS" || -n "$MAX_TASKS" || -n "$WORKERS" ]]; then
      die "demo accepts only --k and --plan"
    fi
    ;;
  setup|check)
    if [[ -n "$ONLY_DOMAINS" || -n "$MAX_TASKS" || -n "$WORKERS" ]]; then
      die "--only-domains/--max-tasks/--workers are only valid for run and bench"
    fi
    ;;
  judge|report)
    if [[ -n "$ONLY_DOMAINS" || -n "$MAX_TASKS" || -n "$WORKERS" ]]; then
      die "--only-domains/--max-tasks/--workers are not accepted by $CMD"
    fi
    if [[ "$DRY_RUN" == true ]]; then
      die "--dry-run is not supported by $CMD"
    fi
    ;;
esac

if [[ "$BENCH" == "wb" && -z "$SUBSET" && ( "$CMD" == "run" || "$CMD" == "bench" ) ]]; then
  die "wb requires --subset office, web, or code for runs"
fi

if [[ ( "$CMD" == "run" || "$CMD" == "bench" ) && "$DRY_RUN" != true && "$PLAN" != true && -z "$NETWORK_POLICY" ]]; then
  die "pass --network-policy so the manifest records egress restrictions (use 'unrestricted' only if you accept rubric leakage)"
fi

if [[ ( "$CMD" == "run" || "$CMD" == "judge" || "$CMD" == "bench" ) && "$DRY_RUN" != true && "$PLAN" != true && "$ASSUME_YES" != 1 ]]; then
  die "refusing to spend model calls without --yes (or HARNESS2_YES=1)"
fi

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-${CMD}-${BENCH:-demo}-${SUBSTRATE}-k${K}-${MODE}-$$"
RUN_DIR="$RESULTS_ROOT/$RUN_ID"

if [[ "$PLAN" == true ]]; then
  print_plan
  exit 0
fi

require_linux
require_cmd git
require_cmd uv

case "$CMD" in
  check|run|judge|bench)
    require_cmd gcloud
    ;;
esac
case "$CMD" in
  setup|bench)
    require_cmd npm
    ;;
esac
if [[ "$BENCH" == "wb" && ( "$CMD" == "setup" || "$CMD" == "run" || "$CMD" == "bench" ) ]]; then
  require_cmd docker
fi
if [[ "$BENCH" == "lab" ]]; then
  case "$CMD" in
    check|run|judge|bench)
      require_cmd pandoc
      require_cmd pdftoppm
      ;;
  esac
fi

if [[ "$SUBSTRATE" == "cx" && -z "${HARNESS2_CODEX_BASE_URL:-}" ]]; then
  note "WARNING: --substrate cx needs harness2-bridge; set HARNESS2_CODEX_BASE_URL or start the bridge (see README.md)"
fi

mkdir -p "$RESULTS_ROOT" "$RUN_DIR"
COMMAND_LOG="$RUN_DIR/commands.log"
: > "$COMMAND_LOG"
export HARNESS2_RUNS_DIR="$RUN_DIR/runs"

EXTRAS="${HARNESS2_EXTRAS:-render}"
if [[ "$SUBSTRATE" == "cx" && "$EXTRAS" != *bridge* ]]; then
  EXTRAS="render,bridge"
fi

export BENCH SUBSET SUBSTRATE K MODE SEED WORKERS ONLY_DOMAINS MAX_TASKS
export NETWORK_POLICY STARTED_AT OMA_COMMIT HARNESS2_REPO_URL HARNESS2_REF
export HARNESS2_COMMIT COMMAND_LOG RUN_CMD="$CMD"
if [[ "$DRY_RUN" == true ]]; then
  export DRY_RUN_ENV=1
else
  export DRY_RUN_ENV=0
fi

trap 'code=$?; trap - EXIT; write_manifest "$code" || true; exit "$code"' EXIT

prepare_checkout() {
  note "preparing Harness² checkout at $CHECKOUT"
  mkdir -p "$WORK_ROOT"
  if [[ ! -d "$CHECKOUT/.git" ]]; then
    git clone "$HARNESS2_REPO_URL" "$CHECKOUT"
  fi
  git -C "$CHECKOUT" fetch --tags --force origin
  local target="$HARNESS2_REF"
  if git -C "$CHECKOUT" rev-parse --verify --quiet "origin/$HARNESS2_REF" >/dev/null; then
    target="origin/$HARNESS2_REF"
  fi
  git -C "$CHECKOUT" checkout --detach "$target" >/dev/null
  HARNESS2_COMMIT="$(git -C "$CHECKOUT" rev-parse HEAD)"
  export HARNESS2_COMMIT
  note "Harness² commit: $HARNESS2_COMMIT"

  if [[ ! -x "$VENV_BIN/python" ]]; then
    note "creating Python $HARNESS2_PYTHON venv"
    uv venv --python "$HARNESS2_PYTHON" "$CHECKOUT/.venv"
  fi
  local stamp="$CHECKOUT/.venv/.oma-installed-${HARNESS2_COMMIT:0:12}-${EXTRAS//,/-}"
  if [[ ! -f "$stamp" ]]; then
    note "installing harness2[$EXTRAS]"
    ( cd "$CHECKOUT" && VIRTUAL_ENV="$CHECKOUT/.venv" uv pip install -e ".[$EXTRAS]" )
    touch "$stamp"
  fi
}

prepare_checkout

case "$CMD" in
  demo)
    phase_demo
    ;;
  setup)
    phase_setup
    ;;
  check)
    phase_check
    ;;
  run)
    phase_run
    ;;
  judge)
    phase_judge
    ;;
  report)
    phase_report
    ;;
  bench)
    phase_setup
    phase_check
    phase_run
    if [[ "$DRY_RUN" == true ]]; then
      note "upstream dry-run complete; skipping judge/report"
    else
      phase_judge
      phase_report
    fi
    ;;
esac

note "manifest: $RUN_DIR/manifest.json"