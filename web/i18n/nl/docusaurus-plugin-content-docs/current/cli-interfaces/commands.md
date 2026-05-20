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

### recap

Recap van AI-tool conversatiegeschiedenis over Antigravity-, Claude-, Codex-, Gemini-, Qwen- en Cursor-sessies.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--window <period>` | Tijdvenster: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Specifieke datum (`YYYY-MM-DD`); heeft voorrang op `--window` | |
| `--tool <tools>` | Komma-gescheiden filter: `claude,codex,gemini,qwen,cursor` | alle |
| `--top <n>` | Toon top N projecten/onderwerpen | |
| `--sort <metric>` | Sorteer op `count` of `duration` | `count` |
| `--mermaid` | Uitvoer als Mermaid Gantt-grafiek | |
| `--graph` | Open interactieve grafiek in de browser | |
| `--json` / `--output <format>` | Machineleesbare uitvoer | `text` |

**Voorbeelden:**

```bash
oma recap                                     # Vandaag (1d)
oma recap --window 7d                         # Afgelopen week
oma recap --date 2026-04-20 --tool claude,codex
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactieve browsergrafiek
```

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
| `-m, --model` | CLI-leverancier: `antigravity`, `gemini`, `claude`, `codex`, `qwen` |
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

Voer een codereview uit met een externe AI CLI (antigravity, codex, claude, gemini of qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `-m, --model <vendor>` | Te gebruiken CLI-leverancier: `antigravity`, `codex`, `claude`, `gemini`, `qwen`. Standaard de geconfigureerde leverancier. |
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

**Controles:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

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

### search

Mechanische zoekprimitieven — fetch, metadata, RSS, media, code en trust scoring. Alias `oma s`. Alle subcommando's geven JSON naar stdout (een object per regel, of pretty-printed met `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcommando's:**

| Subcommando | Doel |
|:-----------|:--------|
| `fetch <url>` | Haal URL op via auto-escalerende strategiepijplijn (api → probe → impersonate → browser → archive) |
| `api <url>` | Haal op via gematchte platform-API-handler (Phase 0) |
| `api:search <query>` | Fan-out trefwoordzoekopdracht over platforms die dit ondersteunen (`--platforms <list>`) |
| `meta <url>` | Extraheer OGP / JSON-LD / Schema.org metadata |
| `rss <url>` | Ontdek en parseer RSS- / Atom-feed |
| `rss:google <query>` | Bouw een Google News RSS-URL voor een query |
| `media <url>` | Extraheer mediametadata via `yt-dlp` (1858 sites) |
| `archive <url>` | Haal op via AMP / archive.today / Wayback fallback |
| `trust <domain>` | Resolveer trust-niveau / score voor een domein |
| `code <query>` | Zoek code via `gh` (GitHub) of `glab` (GitLab) |
| `doctor` | Controleer afhankelijkheden (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Veelvoorkomende opties op URL-/query-subcommando's:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Timeout per strategie | `15` (`30` voor `media`) |
| `--locale <value>` | `Accept-Language`-header | `en-US,en;q=0.9` |
| `--pretty` | Pretty-print JSON-uitvoer | `false` |

**`fetch` extra's:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--only <strategies>` | Komma-gescheiden strategieen om te draaien (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Komma-gescheiden strategieen om over te slaan |
| `--include-archive` | Voeg archiefstrategie toe als laatste fallback |

**`media` extra's:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--subs` | Schrijf ondertitels |
| `--sub-lang <list>` | Ondertiteltalen, komma-gescheiden (standaard: `en`) |
| `--format <spec>` | yt-dlp formaat-spec |

**`code` extra's:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Host | `github` |
| `--language <lang>` | Taalfilter | |
| `--repo <owner/repo>` | Beperk tot een repo | |
| `--limit <n>` | Maximaal aantal resultaten | `20` |

**Exitcodes:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

**Voorbeelden:**

```bash
# Auto-escalerende fetch
oma search fetch https://example.com/article --pretty

# Forceer een enkele strategie
oma search fetch https://example.com --only browser

# Cross-platform trefwoordzoekopdracht via API-handlers
oma search api:search "RAG patterns" --platforms hackernews,reddit

# Vind de trust-score van een repo
oma search trust github.com

# Code zoeken (standaard GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verifieer je lokale afhankelijkheden
oma search doctor
```

### image

Multi-vendor AI beeldgeneratie met authenticatie-bewuste parallelle dispatch. Alias `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcommando's:**

| Subcommando | Doel |
|:-----------|:--------|
| `generate <prompt...>` | Genereer afbeeldingen via `pollinations` (flux/zimage, gratis), `codex` (gpt-image-2 via ChatGPT OAuth) of `gemini` (vereist API-sleutel + billing, standaard uitgeschakeld) |
| `doctor` | Controleer authenticatie- en installatiestatus per leverancier |
| `list-vendors` | Lijst geregistreerde leveranciers en ondersteunde modellen |

**`image generate` opties:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all` | `auto` |
| `--size <size>` | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto` | leverancier-standaard |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | leverancier-standaard |
| `-n, --count <n>` | Aantal afbeeldingen (1..5) | `1` |
| `--out <dir>` | Uitvoerdirectory | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | Sta `--out` paden buiten `$PWD` toe | `false` |
| `--model <name>` | Leverancierspecifieke modeloverride | |
| `--strategy <list>` | Gemini fallback-volgorde, komma-gescheiden (`mcp,stream,api`) | |
| `--timeout <seconds>` | Timeout per afbeelding | leverancier-standaard |
| `-r, --reference <path>` | Referentieafbeelding(en); herhaalbaar (`-r a.png -r b.png`) of komma-gescheiden. Ondersteund op `codex` en `gemini`; geweigerd op `pollinations`. Elk ≤5MB PNG/JPEG/GIF/WebP (magic-byte gevalideerd), max 10. | |
| `-y, --yes` | Sla kostenbevestiging over | `false` |
| `--no-prompt-in-manifest` | Sla SHA256 van prompt op in plaats van ruwe tekst | `false` |
| `--dry-run` | Print plan en kostenschatting; voer niet uit | `false` |
| `--format <format>` | CLI-uitvoerformaat: `text` \| `json` | `text` |

Elke run schrijft een `manifest.json` naast de gegenereerde afbeeldingen die leverancier, model, prompt (of hash), grootte, kwaliteit en kosten registreert.

**Voorbeelden:**

```bash
# Gratis, configuratieloze generatie
oma image generate "minimalist sunrise over mountains"

# Specifieke leverancier + grootte + aantal, sla kostenbevestiging over
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Alle leveranciers parallel ter vergelijking
oma image generate "cat astronaut" --vendor all

# Kostenschatting zonder uit te geven
oma image generate "test prompt" --dry-run

# Gebruik een referentieafbeelding voor stijl-/onderwerpoverdracht (codex of gemini)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Meerdere referenties (herhaalbaar of komma-gescheiden)
oma image generate "blend these styles" --vendor gemini -r a.png -r b.png
oma image generate "blend these styles" --vendor gemini -r a.png,b.png

# Doctor-check per leverancier
oma image doctor --format json
```

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
