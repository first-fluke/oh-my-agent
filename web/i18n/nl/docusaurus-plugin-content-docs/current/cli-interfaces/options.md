---
title: "CLI-Opties"
description: Uitgebreide referentie voor alle CLI-opties — globale vlaggen, uitvoerbeheer, per-commando opties en praktijkgebruikspatronen.
---

# CLI-Opties

## Globale Opties

| Vlag | Beschrijving |
|:-----|:-----------|
| `-V, --version` | Toon het versienummer en sluit af |
| `-h, --help` | Toon help voor het commando |

Alle subcommando's ondersteunen ook `-h, --help` om hun specifieke helptekst te tonen.

---

## Uitvoeropties

Veel commando's ondersteunen machineleesbare uitvoer voor CI/CD-pipelines en automatisering. Er zijn drie manieren om JSON-uitvoer aan te vragen, in prioriteitsvolgorde:

### 1. --json Vlag

```bash
oma stats --json
oma doctor --json
```

Beschikbaar op: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. --output Vlag

```bash
oma stats --output json
oma doctor --output text
```

Accepteert `text` of `json`.

### 3. OH_MY_AG_OUTPUT_FORMAT Omgevingsvariabele

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # levert JSON
```

**Resolutievolgorde:** `--json` vlag > `--output` vlag > `OH_MY_AG_OUTPUT_FORMAT` env var > `text` (standaard).

### Commando's met JSON-Ondersteuning

| Commando | `--json` | `--output` | Opmerkingen |
|:--------|:---------|:----------|:------|
| `doctor` | Ja | Ja | CLI-checks, MCP-status, skill-status |
| `stats` | Ja | Ja | Volledig metriekenobject |
| `retro` | Ja | Ja | Snapshot met metrieken, auteurs, committypes |
| `cleanup` | Ja | Ja | Lijst van opgeruimde items |
| `auth:status` | Ja | Ja | Authenticatiestatus per CLI |
| `memory:init` | Ja | Ja | Initialisatieresultaat |
| `verify` | Ja | Ja | Verificatieresultaten per controle |
| `visualize` | Ja | Ja | Afhankelijkheidsgrafiek als JSON |
| `describe` | Altijd JSON | N/B | Altijd JSON (introspectiecommando) |
| `recap` | Ja | Ja | Conversatiegeschiedenis per tool/sessie |
| `export` | Ja | Ja | Exportstatus en doelpaden |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | N/B | Gebruik `--format json` in plaats van `--json` |
| `search ...` | Altijd JSON | N/B | Alle `search`-subcommando's streamen JSON; gebruik `--pretty` voor menselijk leesbare uitvoer |

---

## Per-Commando Opties

### oma (install)

```
oma
```

Geen vlaggen. De interactieve installer vraagt om preset-selectie en schrijft `model_preset` naar `.agents/oma-config.yaml`.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--json` | Geef JSON in plaats van geformatteerde tekst. | `false` |
| `--output <format>` | Expliciet uitvoerformaat (`text` of `json`). Zie [Uitvoeropties](#uitvoeropties). | `text` |
| `--profile` | Toon de profielgezondheidsmatrix — geresolveerd modelslug, CLI en authenticatiestatus per agent vanuit het actieve `model_preset` en `agents:`-overrides. Zie [Per-Agent Models](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--ci]
```

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--force` / `-f` | Overschrijft oma-config.yaml, mcp.json, stack/. Zonder deze vlag worden deze bestanden geback-upt en hersteld. | `false` |
| `--ci` | Niet-interactieve CI-modus. Slaat bevestigingsprompts over, gebruikt platte console-uitvoer. | `false` |

### stats

| Vlag | Beschrijving |
|:-----|:-----------|
| `--reset` | Reset alle metriekendata. Verwijdert `.serena/metrics.json` en maakt opnieuw aan. |

### retro

| Vlag | Beschrijving |
|:-----|:-----------|
| `--interactive` | Interactieve modus met handmatige gegevensinvoer. |
| `--compare` | Vergelijk huidig venster met vorige periode van dezelfde lengte. |

**Vensterargumentformaat:** `7d` (7 dagen), `2w` (2 weken), `1m` (1 maand).

### cleanup

| Vlag | Beschrijving |
|:-----|:-----------|
| `--dry-run` | Voorbeeldmodus. Lijst items zonder wijzigingen. |
| `--yes` / `-y` | Sla bevestigingsprompts over. |

**Wat wordt opgeruimd:**
1. Verlaten PID-bestanden: `/tmp/subagent-*.pid` waarbij het bijbehorende proces niet meer actief is.
2. Verlaten logbestanden: `/tmp/subagent-*.log` die overeenkomen met dode PID's.
3. Gemini Antigravity-mappen: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Deze verzamelen in de loop van de tijd state en kunnen groot worden.

### agent:spawn

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--model` / `-m` | CLI-leverancier: `antigravity`, `gemini`, `claude`, `codex`, `qwen` | Uit config |
| `--workspace` / `-w` | Werkdirectory. Auto-gedetecteerd uit monorepo-config indien weggelaten. | Auto of `.` |

**Validatie:**
- `agent-id` moet één van zijn: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` mag niet bevatten: `..`, `?`, `#`, `%`, of stuurcodes.
- `vendor` moet één van zijn: `antigravity`, `gemini`, `claude`, `codex`, `qwen`.

**Leverancierspecifiek gedrag:**

| Leverancier | Commando | Auto-approve Vlag | Prompt Vlag |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (geen) | `-p` |
| codex | `codex` | `--full-auto` | (positioneel) |
| qwen | `qwen` | `--yolo` | `-p` |

### agent:status

| Vlag | Beschrijving |
|:-----|:-----------|
| `--root` / `-r` | Rootpad voor geheugenbestandlocatie |

**Statuswaarden:** `completed`, `running`, `crashed`.

### agent:parallel

| Vlag | Beschrijving |
|:-----|:-----------|
| `--model` / `-m` | CLI-leverancier voor alle agenten |
| `--inline` / `-i` | Inline modus: `agent:task[:workspace]` |
| `--no-wait` | Achtergrondmodus — start en keer onmiddellijk terug |

**Inline taakformaat:** `agent:task` of `agent:task:workspace` (werkruimte moet beginnen met `./`, `/` of gelijk zijn aan `.`).

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--window <period>` | Tijdvenster: `1d`, `3d`, `7d`, `2w`, `30d`. Genegeerd wanneer `--date` is gezet. | `1d` |
| `--date <date>` | Specifieke datum (`YYYY-MM-DD`). Heeft voorrang op `--window`. | |
| `--tool <tools>` | Filter sessies op tool. Komma-gescheiden: `claude`, `codex`, `gemini`, `qwen`, `cursor`. | alle tools |
| `--top <n>` | Toon alleen top N projecten/onderwerpen in de samenvatting. | onbeperkt |
| `--sort <metric>` | Sorteer sessies op `count` of `duration`. | `count` |
| `--mermaid` | Geef een Mermaid Gantt-grafiek in plaats van de standaardsamenvatting. | `false` |
| `--graph` | Open een interactieve grafiek in de browser. Wederzijds uitsluitend met `--mermaid`. | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| Vlag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--dir <path>` | `-d` | Doeldirectory om de geexporteerde regels naartoe te schrijven. | `process.cwd()` |

**Ondersteunde formaten:** `cursor` (schrijft `.cursor/rules`-bestanden afgeleid van de geinstalleerde skills).

### search

```
oma search <subcommand> [...]
```

De `search`-groep levert eigen JSON-uitvoer (geen `--json` / `--output`-vlaggen). Gebruik `--pretty` op URL-/query-subcommando's om resultaten pretty te printen, en vertrouw op subcommando-specifieke opties hieronder:

| Subcommando | Belangrijke Opties |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (standaard `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (standaard `en`), `--format <spec>`, `--timeout` (standaard `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (standaard `github`), `--language`, `--repo`, `--limit` (standaard `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | geen — voert binaire checks uit voor Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` |

**Exitcodes:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Gebruik deze in scripts om transiente blokkades van ongeldige invoer te onderscheiden.

### image

```
oma image <subcommand> [...]
```

Het uitvoerformaat wordt per subcommando bestuurd via `--format <text|json>` (niet de gedeelde `--json`-vlag).

`image generate` accepteert:

| Vlag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`. `auto` resolveert vanuit `image-config.yaml` en beschikbare auth. | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`. | leverancier-standaard |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | leverancier-standaard |
| `--count <n>` | `-n` | Aantal afbeeldingen, 1..5. | `1` |
| `--out <dir>` | | Uitvoerdirectory. Moet binnen `$PWD` zijn tenzij `--allow-external-out` is gezet. | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | Sta `--out` paden buiten `$PWD` toe. | `false` |
| `--model <name>` | | Leverancierspecifieke modeloverride (bijv. `gpt-image-2`, `flux`, `imagen-4`). | leverancier-standaard |
| `--strategy <list>` | | Gemini fallback-volgorde, komma-gescheiden van `mcp`, `stream`, `api`. | leverancier-standaard |
| `--timeout <seconds>` | | Timeout per afbeelding. | leverancier-standaard |
| `--reference <path>` | `-r` | Referentieafbeelding voor stijl-/onderwerpoverdracht. Herhaalbaar (`-r a.png -r b.png`) of komma-gescheiden. Gevalideerd op grootte (≤5MB), formaat (PNG/JPEG/GIF/WebP via magic bytes) en aantal (≤10). Ondersteund op `codex` (geeft `-i` door aan `codex exec`) en `gemini` (inlines base64 `inlineData`). Geweigerd met exit 4 op `pollinations`. | |
| `--yes` | `-y` | Sla de kostenbevestigingsprompt over. | `false` |
| `--no-prompt-in-manifest` | | Sla SHA256 van de prompt op in plaats van de ruwe tekst in `manifest.json`. | `false` |
| `--dry-run` | | Print plan en kostenschatting; voer niet uit. | `false` |
| `--format <format>` | | `text` \| `json`. | `text` |

`image doctor` en `image list-vendors` accepteren alleen `--format <text|json>`.

---

## Praktijkvoorbeelden

### CI Pipeline: Bijwerken en Verifieren

```bash
oma update --ci
oma doctor --json | jq '.healthy'
```

### Geautomatiseerde Metriekenverzameling

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Batch Agentuitvoering met Statusmonitoring

```bash
oma agent:parallel tasks.yaml --no-wait
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Opruimen in CI Na Tests

```bash
oma cleanup --yes --json
```

### Werkruimte-Bewuste Verificatie

```bash
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro met Vergelijking voor Sprintreviews

```bash
oma retro 2w --compare
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Volledig Gezondheidscontrolescript

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Gezondheidscontrole ==="
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "ONTBREEKT" end)"'
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'
oma stats --json | jq -r '"Sessies: \(.sessions), Taken: \(.tasksCompleted)"'
echo "=== Klaar ==="
```

### Describe voor Agent-Introspectie

```bash
oma describe | jq '.command.subcommands[] | {name, description}'
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
