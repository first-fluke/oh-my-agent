# oma-market error playbook

| Symptom | Cause | Action |
|---|---|---|
| `detect-trap` exit 2 | keyword-trap / demographic-shopping / too-broad topic | Show REFUSE + reframe; stop. `--force` only after explicit user reconfirmation |
| `oma market resolve` → `ok: false`, "engine unavailable" | first run offline, or `market.managed: false` with no local copy | `oma market update` once online, or set `market.path` / `LAST30DAYS_HOME` |
| `resolve` → "Python 3.12+" hint | no compatible interpreter | relay hint (`brew install python@3.12` / `apt install python3.12` / `uv python install 3.12`) or set `market.python` / `LAST30DAYS_PYTHON`; stop, never WebSearch-only |
| `engine.status: stale` | GitHub unreachable / rate-limited during refresh | proceed on cached engine; mention version in report |
| Engine prints setup-wizard prompts | first run, no `~/.config/last30days/.env` | follow upstream Step 0 in chat; never answer consent questions on the user's behalf |
| Engine non-zero exit | source/network/auth failure | report stderr verbatim; check `oma market run "<topic>" --diagnose` |
| Sources listed as skipped in footer | keys / cookies absent | keep the list visible; suggest the upstream setup wizard for those sources |
| Output has `Sources:` block, `—`, `##` in body | LAW violation during synthesis | fix per upstream LAWs and `output-laws.md` self-check before writing |
