# 021 — Serena Memory Reaper + Language Reconcile

> Status: design approved (brainstorm). Next: `/plan` to decompose into tasks.
> Date: 2026-06-15

## Problem

Report: "Serena spins up per-project and keeps eating ~400 MB each." Verified on the
maintainer's machine.

### Measured facts (runtime evidence)

| Fact | Measurement |
|------|-------------|
| Active Serena MCP roots | 3 — one per open Claude Code session (`oh-my-agent`, `shopzy`, `graph-xgb`) |
| Serena's own Python process | ~14 MB each (negligible) |
| Total Serena ecosystem RSS | 476 MB across 13 processes |
| Orphans (PPID=1) | 0 — every root has a live `claude` parent; not a leak |
| Registered projects in `serena_config.yml` | 29, but only the 3 with live sessions spawn processes |

**Root finding:** the 400 MB is **not** Serena itself — it is the **language servers**
Serena spawns per project (TypeScript LS + 2–3 `tsserver` instances 38/93/36 MB +
`typingsInstaller` 36 MB + `bash-language-server` 40 MB + `pyright` 42/9 MB ≈ 330–400 MB
for one warmed TS project).

**Footprint = (open projects) × (languages declared) × (LSP weight).**

For a user who keeps **5+ projects open at all times**, this is 5 × ~300 MB ≈ **1.5 GB+**.

### Why it persists ("warm forever")

`serena/ls_manager.py` (`LanguageServerManager`) has spawn (`add_language_server`) and
stop (`stop_all` / `_stop_language_server`) machinery, plus lazy/self-heal restart via
`_ensure_functional_ls` (called on every `get_language_server()`). But:

- The only `timeout` config is `tool_timeout: 240` (per-call, not idle).
- `LanguageServerManager.__init__` holds **no last-used timestamp, no timer, no idle field**.
- LSPs are stopped **only** on project/agent shutdown → warm for the entire session
  (observed 21 h uptime).

serena 1.3.0 has **no idle-shutdown setting** — the feature does not exist.

## Decision

Two orthogonal, **oma-owned, no-upstream-PR** tracks. Upstream PR to `oraios/serena`
was explicitly rejected by the user.

### Key enabling insight (code + runtime verified)

`SolidLanguageServer.is_running()` checks the real process. `_ensure_functional_ls`
runs on every `get_language_server()` call and transparently `restart_language_server()`
if the LSP is not running — **regardless of who killed it.** Therefore oma can kill idle
LSP children externally and serena will self-heal respawn on the next tool call. No Claude
reboot, no MCP restart. Only cost: cold-start latency on the first call after reap.

serena writes per-session logs at `~/.serena/logs/<date>/mcp_*_<PID>.txt` recording each
`CallToolRequest` with a timestamp → a usable external "last activity per project" signal.

## Track C′ — External LSP Reaper (root-cause-equivalent, no PR)

### Architecture

```
oma serena reap
  ├─ discover: ps `serena start-mcp-server` → roots (PID + project)
  ├─ last activity: parse ~/.serena/logs/<date>/mcp_*_<PID>.txt last CallToolRequest
  │                 fallback → file mtime → LSP CPU-idle sampling (3-tier)
  ├─ policy: LRU-N (default) | idle-timeout
  ├─ kill -TERM (LSP children ONLY; escalate -KILL after grace)
  └─ serena _ensure_functional_ls respawns on next tool call
  └─(periodic)─ launchd/systemd via existing oma service framework
```

### Components

- **`cli/io/serena-reaper.ts`** (new) — pure detection/policy/validation functions
  (input: ps output + log strings) + thin kill adapter.
  - `SerenaRoot { pid, project, lastActivityMs, lspChildren, rss }`
  - `LspProc { pid, name, rss }`
- **LSP allow-list**: `tsserver`, `typescript-language-server`, `pyright`,
  `*-language-server`, `gopls`, `rust-analyzer`, `jdtls`, `bash-language-server`.
  serena Python root is on an explicit **block-list** — never killed.
- **`cli/commands/doctor/serena-reap.ts`** (new) — diagnostic-only: report current
  Serena memory + reapable amount + active signal source.
- **`oma serena reap [--dry-run] [--quiet]`** — on-demand; dry-run shown first.
- **`oma serena reaper:enable|disable`** — periodic background agent reusing
  `renderLaunchdService` / `renderSystemdService` / `renderWindowsTaskXml` +
  `serviceCommands`, label `dev.oma.serena-reaper`, `StartInterval` ~300 s.

### Config (`~/.agents/oma-config.yaml`)

```yaml
serena_reaper:
  enabled: false     # opt-in (T1-4); 5+ concurrent-project users turn on
  policy: lru        # lru | idle
  keep_warm: 2       # LRU-N
  idle_minutes: 10
  grace_seconds: 90  # in-flight protection: never kill if activity within window
```

## Track A — Language Reconcile (resource right-sizing, no PR)

- **Extend `SKILL_LANGUAGE_MAP`** (`cli/io/serena.ts`): add `oma-db → ["python"]`.
  `bash` is never auto-added (40 MB, low value) — explicit opt-in only.
- **Reconcile (additive merge — user decision):** `ensureSerenaProjectConfig` extended
  so an existing `project.yml` gets skill-derived languages **added** when missing.
  Existing entries are **never removed** (preserves intentional user choices).
- **Block serena autogenerate:** oma-installed projects always write explicit
  `languages:` so `ProjectConfig.autogenerate` (file scan) never fills broadly.

## Blind Review Resolutions (Step 5)

### Tier 1 (resolved)

- **T1-1 (SRE) LRU "activity" definition** — LRU key = `max(last tool-call,
  parent claude recent CPU activity)`. Keeps LSPs warm while the user is active in a
  project even without recent serena tool calls.
- **T1-2 (Security) wrong-process kill** — 3-fold pre-kill check: (a) target PID's
  ancestry includes the serena root PID, (b) name matches LSP allow-list regex,
  (c) exec path under `~/.serena/` or `serena-agent/`. All three required.
- **T1-3 (Maintainability) log-format coupling** — version-guarded parser + mandatory
  mtime/CPU 3-tier fallback; `oma doctor` always surfaces the active signal source
  (no silent failure).
- **T1-4 (DX) surprise kills** — `enabled: false` default (opt-in); reaper writes
  `~/.serena/logs/oma-reaper.log` ("reaped <project> LSPs, idle 12m, freed 280 MB");
  on-demand always dry-run first.

### Tier 2

- **T2-1 (QA)** — detection/policy/validation as pure functions over ps+log strings;
  kill is a thin adapter; fixture-based deterministic tests.
- **T2-2 (Track A)** — additive keeps leftovers; `oma doctor` advisory surfaces
  "unmapped/heavy language (bash 40 MB) present — manual removal recommended". No auto-delete.
- **T2-3 (Perf)** — reaper overhead negligible; immediate no-op when 0 roots.

### Tier 3 (deferred)

- T3-1: shared SSE Serena daemon (small win, separate track).
- T3-2: suppress tsserver multi-instance (serena LSP init-option territory, hard to control).

## Out of Scope

- Modifying `oraios/serena` source / upstream PR.
- Runtime monkeypatch / site-packages overlay (wiped by `uv tool upgrade`).

## Expected Impact

5+ projects open: ~1.5 GB → ~300–600 MB (only actively-used 1–2 kept warm via LRU-N),
entirely within oma, zero upstream dependency. Track A trims the constant (e.g. −40 MB ×
projects by dropping stray bash-ls), reducing cold-start frequency.

## Affected Files

| File | Change |
|------|--------|
| `cli/io/serena-reaper.ts` | new — detection/policy/validation pure fns + kill adapter |
| `cli/commands/doctor/serena-reap.ts` | new — diagnostic check |
| `cli/io/serena.ts` | extend `SKILL_LANGUAGE_MAP`; additive reconcile in `ensureSerenaProjectConfig` |
| `cli/platform/` (serena reaper service) | new — reuse render*Service + serviceCommands, label `dev.oma.serena-reaper` |
| oma CLI command registration | `oma serena reap`, `oma serena reaper:enable|disable` |
| config schema / docs | `serena_reaper` block in oma-config |
```
