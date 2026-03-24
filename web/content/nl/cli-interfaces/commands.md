---
title: "CLI-Commando's"
description: Volledige referentie voor elk oh-my-agent CLI-commando — syntaxis, opties, voorbeelden, georganiseerd per categorie.
---

# CLI-Commando's

Na globale installatie (`bun install --global oh-my-agent`), gebruik `oma` of `oh-my-ag`. Beide zijn aliassen voor dezelfde binary. Voor eenmalig gebruik zonder installatie: `npx oh-my-agent`.

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
| `-f, --force` | Overschrijf gebruikersaanpassingen (user-preferences.yaml, mcp.json, stack/) |
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
oma agent:spawn <agent-id> <prompt> <session-id> [-v <vendor>] [-w <workspace>]
```

| Argument | Vereist | Beschrijving |
|:---------|:--------|:-----------|
| `agent-id` | Ja | `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Ja | Taakbeschrijving (inline tekst of bestandspad) |
| `session-id` | Ja | Sessie-identificator |

| Vlag | Beschrijving |
|:-----|:-----------|
| `-v, --vendor` | CLI-leverancier: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace` | Werkdirectory (auto-gedetecteerd uit monorepo-config indien weggelaten) |

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

Uitvoerformaat: een regel per agent: `{agent-id}:{status}` (completed/running/crashed).

### agent:parallel

```
oma agent:parallel [tasks...] [-v <vendor>] [-i | --inline] [--no-wait]
```

YAML-takenbestand of inline modus (`agent:task[:workspace]`).

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

### usage:anti
```
oma usage:anti [--json] [--raw]
```
Modelgebruiksquota van Antigravity IDE.

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
| `oma` | `oh-my-ag` |
| `viz` | `visualize` |
