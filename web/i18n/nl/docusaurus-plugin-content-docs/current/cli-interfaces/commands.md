---
title: "CLI-Commando's"
description: Volledige referentie voor elk oh-my-agent CLI-commando — syntaxis, opties, voorbeelden, georganiseerd per categorie.
---

# CLI-Commando's

Na globale installatie (`bun install --global oh-my-agent`), gebruik `oma` of `oh-my-agent`. Voor eenmalig gebruik zonder installatie: `npx oh-my-agent`.

De omgevingsvariabele `OH_MY_AG_OUTPUT_FORMAT` kan op `json` worden gezet om machineleesbare uitvoer te forceren op commando's die dit ondersteunen.

---

## Setup & Installatie

### oma (install)

Het standaardcommando zonder argumenten start de interactieve installer.

```
oma
```

Migratiecheck, concurrentdetectie, preset-selectie, tarball download, skills installatie, leveranciersaanpassingen, symlinks, git rerere en MCP-configuratie.

### doctor

Gezondheidscontrole voor CLI-installaties, MCP-configs en skill-status.

```
oma doctor [--json] [--output <format>]
```

### update

Skills bijwerken naar de nieuwste versie.

```
oma update [-f | --force] [--ci]
```

| Vlag | Beschrijving |
|:-----|:-----------|
| `-f, --force` | Overschrijf gebruikersaanpassingen (oma-config.yaml, mcp.json, stack/) |
| `--ci` | Niet-interactieve CI-modus (geen prompts, platte tekst) |

---

## Monitoring & Metrieken

### dashboard

```
oma dashboard
```

Terminal-dashboard voor realtime agentmonitoring. Bewaakt `.serena/memories/`. `MEMORIES_DIR` omgevingsvariabele om pad te overschrijven.

### dashboard:web

```
oma dashboard:web
```

Webdashboard op `http://localhost:9847`. Omgevingsvariabelen: `DASHBOARD_PORT` (standaard 9847), `MEMORIES_DIR`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

Productiviteitsmetrieken: sessieaantal, gebruikte skills, voltooide taken, sessietijd, bestandswijzigingen.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

Engineering retrospectief. Vensterformaat: `7d`, `2w`, `1m`. Toont samenvatting, trends, bijdragers, committijdverdeling, hotspots.

---

## Agentbeheer

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Argument | Vereist | Beschrijving |
|:---------|:--------|:-----------|
| `agent-id` | Ja | `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Ja | Taakbeschrijving (inline tekst of bestandspad) |
| `session-id` | Ja | Sessie-identificator |

| Vlag | Beschrijving |
|:-----|:-----------|
| `-m, --model` | CLI-leverancier: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace` | Werkdirectory (auto-gedetecteerd uit monorepo-config indien weggelaten) |

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

Uitvoerformaat: een regel per agent: `{agent-id}:{status}` (completed/running/crashed).

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

YAML-takenbestand of inline modus (`agent:task[:workspace]`).

### agent:review

Voer een codereview uit met een externe AI CLI (codex, claude, gemini of qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `-m, --model <vendor>` | Te gebruiken CLI-leverancier: `codex`, `claude`, `gemini`, `qwen`. Standaard de geconfigureerde leverancier. |
| `-p, --prompt <prompt>` | Aangepaste reviewprompt. Indien weggelaten wordt een standaard codereview-prompt gebruikt. |
| `-w, --workspace <path>` | Pad om te reviewen. Standaard de huidige werkdirectory. |
| `--no-uncommitted` | Sla review van niet-gecommitte wijzigingen over. Alleen gecommitte wijzigingen in de sessie worden gereviewed. |

**Wat het doet:**
- Detecteert automatisch de huidige sessie-ID vanuit de omgeving of recente git-activiteit.
- Voor `codex`: gebruikt het native `codex review`-subcommando.
- Voor `claude`, `gemini`, `qwen`: stelt een prompt-gebaseerd reviewverzoek samen en roept de CLI aan met de reviewprompt.
- Standaard worden niet-gecommitte wijzigingen in de werkdirectory gereviewed.
- Met `--no-uncommitted` wordt de review beperkt tot wijzigingen die binnen de huidige sessie zijn gecommit.

**Voorbeelden:**
```bash
# Review niet-gecommitte wijzigingen met standaardleverancier
oma agent:review

# Review met codex (gebruikt native codex review-commando)
oma agent:review -m codex

# Review met claude met een aangepaste prompt
oma agent:review -m claude -p "Focus op beveiligingskwetsbaarheden en invoervalidatie"

# Review een specifiek pad
oma agent:review -w ./apps/api

# Review alleen gecommitte wijzigingen (sla werkboom over)
oma agent:review --no-uncommitted

# Review gecommitte wijzigingen in een specifieke werkruimte met gemini
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## Geheugenbeheer

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

Initialiseert de `.serena/memories/`-directorystructuur.

---

## Integratie & Hulpmiddelen

### auth:status
```
oma auth:status [--json]
```
Authenticatiestatus van alle ondersteunde CLI's.

### bridge
```
oma bridge [url]
```
Protocol-bridge tussen MCP stdio en Streamable HTTP transport.

### verify
```
oma verify <agent-type> [-w <workspace>] [--json]
```
Verifieer subagentuitvoer. Agent-types: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

### cleanup
```
oma cleanup [--dry-run] [-y | --yes] [--json]
```
Ruimt op: verweesde PID-bestanden, logbestanden, Gemini Antigravity-directory's.

### visualize
```
oma visualize [--json]
oma viz [--json]
```
Afhankelijkheidsgrafiek van projectstructuur.

### star
```
oma star
```
Geef oh-my-agent een ster op GitHub. Vereist `gh` CLI.

### describe
```
oma describe [command-path]
```
Beschrijf CLI-commando's als JSON voor runtime-introspectie.

### help / version
```
oma help
oma version
```

---

## Omgevingsvariabelen

| Variabele | Beschrijving | Gebruikt Door |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Zet op `json` voor JSON-uitvoer | Alle commando's met `--json` |
| `DASHBOARD_PORT` | Poort voor webdashboard | `dashboard:web` |
| `MEMORIES_DIR` | Overschrijf memories-directorypad | `dashboard`, `dashboard:web` |

---

## Aliassen

| Alias | Volledig Commando |
|:------|:------------|
| `viz` | `visualize` |
