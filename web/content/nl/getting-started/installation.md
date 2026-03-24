---
title: Installatie
description: Volledige installatiegids voor oh-my-agent — drie installatiemethoden, alle zes presets met hun skill-lijsten, CLI-toolvereisten voor alle vier leveranciers, post-installatie configuratie, user-preferences.yaml velden en verificatie met oma doctor.
---

# Installatie

## Vereisten

- **Een AI-aangedreven IDE of CLI** — minimaal een van: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor of OpenCode
- **bun** — JavaScript-runtime en pakketbeheerder (automatisch geinstalleerd door het installatiescript indien afwezig)
- **uv** — Python-pakketbeheerder voor Serena MCP (automatisch geinstalleerd indien afwezig)

---

## Methode 1: One-Liner Installatie (Aanbevolen)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Dit script:
1. Detecteert je platform (macOS, Linux)
2. Controleert op bun en uv, installeert deze indien nodig
3. Start de interactieve installer met presetselectie
4. Maakt `.agents/` aan met je geselecteerde skills
5. Stelt `.claude/`-integratielaag in (hooks, symlinks, instellingen)
6. Configureert Serena MCP indien gedetecteerd

Typische installatietijd: minder dan 60 seconden.

---

## Methode 2: Handmatige Installatie via bunx

```bash
bunx oh-my-agent
```

Dit start de interactieve installer zonder de afhankelijkheidsbootstrap. Je hebt bun al nodig.

De installer vraagt je een preset te selecteren, die bepaalt welke skills worden geinstalleerd:

### Presets

| Preset | Inbegrepen Skills |
|--------|------------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-commit, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |

Elke preset bevat oma-pm (planning), oma-qa (review), oma-debug (bugfixing), oma-brainstorm (ideevorming) en oma-commit (git) als basisagenten. Domeinspecifieke presets voegen de relevante implementatieagenten toe.

De gedeelde bronnen (`_shared/`) worden altijd geinstalleerd ongeacht de preset. Dit omvat kernroutering, contextlading, promptstructuur, leveranciersdetectie, uitvoeringsprotocollen en geheugenprotocol.

### Wat er Wordt Aangemaakt

Na de installatie bevat je project:

```
.agents/
├── config/
│   └── user-preferences.yaml      # Je voorkeuren (aangemaakt door /setup)
├── skills/
│   ├── _shared/                    # Gedeelde bronnen (altijd geinstalleerd)
│   │   ├── core/                   # skill-routing, context-loading, etc.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/               # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Andere geselecteerde skills
├── workflows/                      # Alle 14 workflowdefinities
├── agents/                         # Subagentdefinities
├── mcp.json                        # MCP-serverconfiguratie
├── plan.json                       # Leeg (gevuld door /plan)
├── state/                          # Leeg (gebruikt door persistente workflows)
└── results/                        # Leeg (gevuld door agentuitvoeringen)

.claude/
├── settings.json                   # Hooks en permissies
├── hooks/
│   ├── triggers.json               # Trefwoord-naar-workflow mapping (11 talen)
│   ├── keyword-detector.ts         # Auto-detectielogica
│   ├── persistent-mode.ts          # Persistente workflow-handhaving
│   └── hud.ts                      # [OMA] statusbalk-indicator
├── skills/                         # Symlinks -> .agents/skills/
└── agents/                         # Subagentdefinities voor IDE

.serena/
└── memories/                       # Runtimestatus (gevuld tijdens sessies)
```

---

## Methode 3: Globale Installatie

Voor CLI-niveau gebruik (dashboards, agent-spawning, diagnostiek), installeer oh-my-agent globaal:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# of
npm install --global oh-my-agent
```

Dit installeert het `oma`-commando globaal, waardoor je toegang hebt tot alle CLI-commando's vanuit elke directory:

```bash
oma doctor              # Gezondheidscontrole
oma dashboard           # Terminal-monitoring
oma dashboard:web       # Webdashboard op http://localhost:9847
oma agent:spawn         # Agenten spawnen vanaf terminal
oma agent:parallel      # Parallelle agentuitvoering
oma agent:status        # Agentstatus controleren
oma stats               # Sessiestatistieken
oma retro               # Retrospectieve analyse
oma cleanup             # Sessieartefacten opruimen
oma update              # oh-my-agent bijwerken
oma verify              # Agentuitvoer verifieren
oma visualize           # Afhankelijkheidsvisualisatie
oma describe            # Projectstructuur beschrijven
oma bridge              # SSE-naar-stdio bridge voor Antigravity
oma memory:init         # Geheugenprovider initialiseren
oma auth:status         # CLI-authenticatiestatus controleren
oma usage:anti          # Gebruiks-anti-patroondetectie
oma star                # Repository een ster geven
```

De globale `oma`-alias is equivalent aan `oh-my-ag` (de volledige commandonaam).

---

## AI CLI-Tool Installatie

Je hebt minimaal een AI CLI-tool nodig. oh-my-agent ondersteunt vier leveranciers, en je kunt ze combineren — verschillende CLI's gebruiken voor verschillende agenten via de agent-CLI-mapping.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# of
npm install --global @google/gemini-cli
```

Authenticatie is automatisch bij eerste uitvoering. Gemini CLI leest standaard skills uit `.agents/skills/`.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# of
npm install --global @anthropic-ai/claude-code
```

Authenticatie is automatisch bij eerste uitvoering. Claude Code gebruikt `.claude/` voor hooks en instellingen, met skills gesymlinkt vanuit `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# of
npm install --global @openai/codex
```

Na installatie, voer `codex login` uit om te authenticeren.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Na installatie, voer `/auth` uit binnen de CLI om te authenticeren.

---

## Post-Installatie Setup: `/setup`

Na de installatie, open je project in je AI IDE en voer het `/setup`-commando uit. Deze interactieve workflow (gedefinieerd in `.agents/workflows/setup.md`) begeleidt je door:

### Stap 1: Taalinstellingen

Stelt de antwoordtaal in voor alle agenten en workflows. Ondersteunde waarden zijn onder andere: `en`, `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl`.

### Stap 2: CLI-Installatiestatus

Scant naar geinstalleerde CLI's (`which gemini`, `which claude`, `which codex`) en toont hun versies. Biedt installatiecommando's voor ontbrekende CLI's.

### Stap 3: MCP-Verbindingsstatus

Verifieert MCP-serverconfiguratie voor elke CLI:
- Gemini CLI: controleert `~/.gemini/settings.json`
- Claude CLI: controleert `~/.claude.json` of `--mcp-config`
- Codex CLI: controleert `~/.codex/config.toml`
- Antigravity IDE: controleert `~/.gemini/antigravity/mcp_config.json`

Biedt aan om Serena MCP te configureren in Command-modus (eenvoudig, een proces per sessie) of SSE-modus (gedeelde server, lager geheugengebruik, vereist het `oma bridge`-commando voor Antigravity).

### Stap 4: Agent-CLI Mapping

Configureert welke CLI welke agent afhandelt. Bijvoorbeeld, je zou `frontend` en `qa` naar Claude kunnen routeren (beter in redeneren) en `backend` en `pm` naar Gemini (snellere generatie).

### Stap 5: Samenvatting

Toont de volledige configuratie en stelt volgende stappen voor.

---

## user-preferences.yaml

De `/setup`-workflow maakt `.agents/config/user-preferences.yaml` aan. Dit is het centrale configuratiebestand voor al het oh-my-agent gedrag:

```yaml
# Antwoordtaal voor alle agenten en workflows
language: en

# Datumnotatie gebruikt in rapporten en geheugenbestanden
date_format: "YYYY-MM-DD"

# Tijdzone voor tijdstempels
timezone: "UTC"

# Standaard CLI-tool voor agent-spawning
# Opties: gemini, claude, codex, qwen
default_cli: gemini

# Per-agent CLI-mapping (overschrijft default_cli)
agent_cli_mapping:
  frontend: claude       # Complexe UI-redenering
  backend: gemini        # Snelle API-generatie
  mobile: gemini
  db: gemini
  pm: gemini             # Snelle decompositie
  qa: claude             # Grondige beveiligingsreview
  debug: claude          # Diepgaande oorzaakanalyse
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Veldreferentie

| Veld | Type | Standaard | Beschrijving |
|------|------|-----------|-------------|
| `language` | string | `en` | Antwoordtaalcode. Alle agentuitvoer, workflowberichten en rapporten gebruiken deze taal. Ondersteunt 11 talen (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Datumnotatiestring voor tijdstempels in plannen, geheugenbestanden en rapporten. |
| `timezone` | string | `UTC` | Tijdzone voor alle tijdstempels. Gebruikt standaard tijdzone-identificatoren (bijv. `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | Fallback-CLI wanneer er geen agentspecifieke mapping bestaat. Gebruikt als niveau 3 in leveranciersresolutieprioriteit. |
| `agent_cli_mapping` | map | (leeg) | Mapt agent-ID's naar specifieke CLI-leveranciers. Heeft voorrang op `default_cli`. |

### Leveranciersresolutieprioriteit

Bij het spawnen van een agent wordt de CLI-leverancier bepaald door deze prioriteitsvolgorde (hoogste eerst):

1. `--vendor`-vlag meegegeven aan `oma agent:spawn`
2. `agent_cli_mapping`-vermelding voor die specifieke agent in `user-preferences.yaml`
3. `default_cli`-instelling in `user-preferences.yaml`
4. `active_vendor` in `cli-config.yaml` (legacy fallback)
5. `gemini` (hardgecodeerde laatste fallback)

---

## Verificatie: `oma doctor`

Na installatie en setup, controleer of alles werkt:

```bash
oma doctor
```

Dit commando controleert:
- Alle vereiste CLI-tools zijn geinstalleerd en bereikbaar
- MCP-serverconfiguratie is geldig
- Skill-bestanden bestaan met geldige SKILL.md frontmatter
- Symlinks in `.claude/skills/` verwijzen naar geldige doelen
- Hooks zijn correct geconfigureerd in `.claude/settings.json`
- Geheugenprovider is bereikbaar (Serena MCP)
- `user-preferences.yaml` is geldige YAML met vereiste velden

Als er iets mis is, vertelt `oma doctor` je precies wat je moet repareren, met kopieer-en-plak commando's.

---

## Bijwerken

### CLI Bijwerken

```bash
oma update
```

Dit werkt de globale oh-my-agent CLI bij naar de nieuwste versie.

### Project Skills Bijwerken

Skills en workflows binnen een project kunnen worden bijgewerkt via de GitHub Action (`action/`) voor geautomatiseerde updates, of handmatig door de installer opnieuw uit te voeren:

```bash
bunx oh-my-agent
```

De installer detecteert bestaande installaties en biedt aan bij te werken met behoud van je `user-preferences.yaml` en eventuele aangepaste configuratie.

---

## Wat Volgt

Open je project in je AI IDE en begin oh-my-agent te gebruiken. Skills worden automatisch gedetecteerd. Probeer:

```
"Bouw een inlogformulier met e-mailvalidatie met Tailwind CSS"
```

Of gebruik een workflowcommando:

```
/plan authenticatie-functie met JWT en refresh tokens
```

Zie de [Gebruiksgids](/guide/usage) voor gedetailleerde voorbeelden, of leer over [Agenten](/core-concepts/agents) om te begrijpen wat elke specialist doet.
