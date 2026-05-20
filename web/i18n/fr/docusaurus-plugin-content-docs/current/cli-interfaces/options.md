---
title: Options CLI
description: Référence exhaustive de toutes les options CLI — flags globaux, contrôle de sortie, options par commande et patterns d'utilisation réels.
---

# Options CLI

## Options globales

Ces options sont disponibles sur la commande racine `oma` / `oh-my-agent` :

| Flag | Description |
|:-----|:-----------|
| `-V, --version` | Output the version number and exit |
| `-h, --help` | Display help for the command |

Toutes les sous-commandes supportent également `-h, --help` pour afficher leur aide spécifique.

---

## Options de sortie

De nombreuses commandes supportent une sortie lisible par machine pour les pipelines CI/CD et l'automatisation. Il existe trois manières de demander une sortie JSON, par ordre de priorité :

### 1. --json Flag

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

Le flag `--json` est la manière la plus simple d'obtenir une sortie JSON. Disponible sur : `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. --output Flag

```bash
oma stats --output json
oma doctor --output text
```

Le flag `--output` accepte `text` ou `json`. Il offre la même fonctionnalité que `--json` mais vous permet aussi de demander explicitement une sortie texte (utile lorsque la variable d'environnement est définie à json mais que vous souhaitez du texte pour une commande spécifique).

**Validation :** Si un format invalide est fourni, le CLI lève : `Invalid output format: {value}. Expected one of text, json`.

### 3. OH_MY_AG_OUTPUT_FORMAT Environment Variable

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # outputs JSON
oma doctor   # outputs JSON
oma retro    # outputs JSON
```

Définissez cette variable d'environnement à `json` pour forcer la sortie JSON sur toutes les commandes qui le supportent. Seul `json` est reconnu ; toute autre valeur est ignorée et le défaut est texte.

**Ordre de résolution :** flag `--json` > flag `--output` > variable d'environnement `OH_MY_AG_OUTPUT_FORMAT` > `text` (par défaut).

### Commandes supportant la sortie JSON

| Command | `--json` | `--output` | Notes |
|:--------|:---------|:----------|:------|
| `doctor` | Yes | Yes | Includes CLI checks, MCP status, skill status |
| `stats` | Yes | Yes | Full metrics object |
| `retro` | Yes | Yes | Snapshot with metrics, authors, commit types |
| `cleanup` | Yes | Yes | List of cleaned items |
| `auth:status` | Yes | Yes | Authentication status per CLI |
| `memory:init` | Yes | Yes | Initialization result |
| `verify` | Yes | Yes | Verification results per check |
| `visualize` | Yes | Yes | Dependency graph as JSON |
| `describe` | Always JSON | N/A | Always outputs JSON (introspection command) |
| `recap` | Yes | Yes | Historique de conversation par outil/session |
| `export` | Yes | Yes | Statut d'export et chemins cibles |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | N/A | Utilisez `--format json` à la place de `--json` |
| `search ...` | Always JSON | N/A | Toutes les sous-commandes `search` émettent du JSON ; utilisez `--pretty` pour la lecture humaine |

---

## Options par commande

### oma (install)

```
oma
```

Aucun flag. L'installateur interactif demande la sélection d'un preset et écrit `model_preset` dans `.agents/oma-config.yaml`.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Description | Default |
|:-----|:------------|:--------|
| `--json` | Émet du JSON au lieu d'un texte formaté. | `false` |
| `--output <format>` | Format de sortie explicite (`text` ou `json`). Voir [Options de sortie](#options-de-sortie). | `text` |
| `--profile` | Affiche la matrice de santé des profils — slug de modèle résolu, CLI et statut d'authentification par agent à partir du `model_preset` actif et des surcharges `agents:`. Voir [Per-Agent Models](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--ci]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Overwrite user-customized config files during update. Affects: `oma-config.yaml`, `mcp.json`, `stack/` directories. Without this flag, these files are backed up before the update and restored afterward. | `false` |
| `--ci` | | Run in non-interactive CI mode. Skips all confirmation prompts, uses plain console output instead of spinners and animations. Required for CI/CD pipelines where stdin is not available. | `false` |

**Behavior with --force:**
- `oma-config.yaml` is replaced with the registry default.
- `mcp.json` is replaced with the registry default.
- Backend `stack/` directory (language-specific resources) is replaced.
- All other files are always updated regardless of this flag.

**Behavior with --ci:**
- No `console.clear()` on start.
- `@clack/prompts` is replaced with plain `console.log`.
- Competitor detection prompts are skipped.
- Errors throw instead of calling `process.exit(1)`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--reset` | Reset all metrics data. Deletes `.serena/metrics.json` and recreates it with empty values. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--interactive` | Interactive mode with manual data entry. Prompts for additional context that cannot be gathered from git (e.g., mood, notable events). | `false` |
| `--compare` | Compare the current time window against the previous window of the same length. Shows delta metrics (e.g., commits +12, lines added -340). | `false` |

**Window argument format:**
- `7d` — 7 days
- `2w` — 2 weeks
- `1m` — 1 month
- Omit for default (7 days)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Preview mode. Lists all items that would be cleaned but makes no changes. Exit code 0 regardless of findings. | `false` |
| `--yes` | `-y` | Skip all confirmation prompts. Cleans everything without asking. Useful in scripts and CI. | `false` |

**What gets cleaned:**
1. Orphaned PID files: `/tmp/subagent-*.pid` where the referenced process is no longer running.
2. Orphaned log files: `/tmp/subagent-*.log` matching dead PIDs.
3. Gemini Antigravity directories: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/` — these accumulate state over time and can grow large.

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | CLI vendor override. Must be one of: `antigravity`, `gemini`, `claude`, `codex`, `qwen`. Overrides all config-based vendor resolution. | Resolved from config |
| `--workspace` | `-w` | Working directory for the agent. If omitted or set to `.`, the CLI auto-detects the workspace from monorepo configuration files (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Auto-detected or `.` |

**Validation:**
- `agent-id` must be one of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` must not contain `..`, `?`, `#`, `%`, or control characters.
- `vendor` must be one of: `antigravity`, `gemini`, `claude`, `codex`, `qwen`.

**Vendor-specific behavior:**

| Vendor | Command | Auto-approve Flag | Prompt Flag |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (none) | `-p` |
| codex | `codex` | `--full-auto` | (none — prompt is positional) |
| qwen | `qwen` | `--yolo` | `-p` |

These defaults can be overridden in `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Root path for locating memory files (`.serena/memories/result-{agent}.md`) and PID files. | Current working directory |

**Status determination logic:**
1. If `.serena/memories/result-{agent}.md` exists: reads `## Status:` header. If no header, reports `completed`.
2. If PID file exists at `/tmp/subagent-{session-id}-{agent}.pid`: checks if the PID is alive. Reports `running` if alive, `crashed` if dead.
3. If neither file exists: reports `crashed`.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | CLI vendor override applied to all spawned agents. | Resolved per-agent from config |
| `--inline` | `-i` | Interpret task arguments as `agent:task[:workspace]` strings instead of a file path. | `false` |
| `--no-wait` | | Background mode. Starts all agents and returns immediately without waiting for completion. PID list and logs are saved to `.agents/results/parallel-{timestamp}/`. | `false` (waits for completion) |

**Inline task format:** `agent:task` or `agent:task:workspace`
- Workspace is detected by checking if the last colon-separated segment starts with `./`, `/`, or equals `.`.
- Example: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Example: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=auto-detected.

**YAML tasks file format:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # optional
  - agent: frontend
    task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flag | Description | Default |
|:-----|:------------|:--------|
| `--window <period>` | Fenêtre temporelle : `1d`, `3d`, `7d`, `2w`, `30d`. Ignoré lorsque `--date` est défini. | `1d` |
| `--date <date>` | Date spécifique (`YYYY-MM-DD`). Prioritaire sur `--window`. | |
| `--tool <tools>` | Filtre les sessions par outil. Liste séparée par des virgules : `claude`, `codex`, `gemini`, `qwen`, `cursor`. | tous les outils |
| `--top <n>` | N'affiche que les N premiers projets/sujets dans le résumé. | illimité |
| `--sort <metric>` | Trie les sessions par `count` ou `duration`. | `count` |
| `--mermaid` | Émet un diagramme de Gantt Mermaid au lieu du résumé par défaut. | `false` |
| `--graph` | Ouvre un graphe interactif dans le navigateur. Mutuellement exclusif avec `--mermaid`. | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| Flag | Short | Description | Default |
|:-----|:------|:------------|:--------|
| `--dir <path>` | `-d` | Répertoire cible où écrire les règles exportées. | `process.cwd()` |

**Formats pris en charge :** `cursor` (écrit les fichiers `.cursor/rules` dérivés des compétences installées).

### search

```
oma search <subcommand> [...]
```

Le groupe `search` gère sa propre sortie JSON (pas de flags `--json` / `--output`). Utilisez `--pretty` sur les sous-commandes URL/requête pour formater la sortie, et appuyez-vous sur les options spécifiques ci-dessous :

| Sous-commande | Options notables |
|:--------------|:-----------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (défaut `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (défaut `en`), `--format <spec>`, `--timeout` (défaut `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (défaut `github`), `--language`, `--repo`, `--limit` (défaut `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | aucun — exécute des vérifications binaires pour Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` |

**Codes de sortie :** `0` ok, `1` erreur, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Utilisez-les dans les scripts pour distinguer les blocages transitoires des entrées invalides.

### image

```
oma image <subcommand> [...]
```

Le format de sortie est contrôlé par sous-commande via `--format <text|json>` (et non le flag partagé `--json`).

`image generate` accepte :

| Flag | Short | Description | Default |
|:-----|:------|:------------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`. `auto` se résout à partir de `image-config.yaml` et de l'authentification disponible. | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`. | défaut du fournisseur |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | défaut du fournisseur |
| `--count <n>` | `-n` | Nombre d'images, 1..5. | `1` |
| `--out <dir>` | | Répertoire de sortie. Doit être à l'intérieur de `$PWD` sauf si `--allow-external-out` est défini. | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | Autorise les chemins `--out` hors de `$PWD`. | `false` |
| `--model <name>` | | Surcharge de modèle spécifique au fournisseur (par exemple `gpt-image-2`, `flux`, `imagen-4`). | défaut du fournisseur |
| `--strategy <list>` | | Ordre de fallback Gemini, séparé par des virgules parmi `mcp`, `stream`, `api`. | défaut du fournisseur |
| `--timeout <seconds>` | | Timeout par image. | défaut du fournisseur |
| `--reference <path>` | `-r` | Image de référence pour le transfert de style/sujet. Répétable (`-r a.png -r b.png`) ou séparée par virgules. Validée en taille (≤ 5 Mo), format (PNG/JPEG/GIF/WebP via magic bytes) et nombre (≤ 10). Pris en charge sur `codex` (passe `-i` à `codex exec`) et `gemini` (inline base64 `inlineData`). Rejeté avec exit 4 sur `pollinations`. | |
| `--yes` | `-y` | Saute la confirmation de coût. | `false` |
| `--no-prompt-in-manifest` | | Stocke le SHA256 du prompt au lieu du texte brut dans `manifest.json`. | `false` |
| `--dry-run` | | Affiche le plan et l'estimation de coût ; n'exécute pas. | `false` |
| `--format <format>` | | `text` \| `json`. | `text` |

`image doctor` et `image list-vendors` n'acceptent que `--format <text|json>`.

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--force` | Overwrite empty or existing schema files in `.serena/memories/`. Without this flag, existing files are not touched. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Path to the workspace directory to verify. | Current working directory |

**Agent types:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## Exemples pratiques

### CI Pipeline: Update and Verify

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automated Metrics Collection

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Batch Agent Execution with Status Monitoring

```bash
# Start agents in background
oma agent:parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Cleanup in CI After Tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Workspace-Aware Verification

```bash
# Verify each domain in its workspace
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro with Comparison for Sprint Reviews

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Full Health Check Script

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe for Agent Introspection

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
