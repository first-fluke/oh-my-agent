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

---

## Per-Commando Opties

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

### agent:spawn

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--model` / `-m` | CLI-leverancier: `gemini`, `claude`, `codex`, `qwen` | Uit config |
| `--workspace` / `-w` | Werkdirectory. Auto-gedetecteerd uit monorepo-config indien weggelaten. | Auto of `.` |

**Leverancierspecifiek gedrag:**

| Leverancier | Commando | Auto-approve Vlag | Prompt Vlag |
|:-------|:--------|:-----------------|:-----------|
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
