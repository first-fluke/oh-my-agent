---
title: Installatie
description: Installeer oh-my-agent, kies skills en providers, bekijk de gegenereerde projectbestanden, configureer model- en runtime-defaults en controleer de setup met oma doctor.
---

# Installatie

## Vereisten

- **Een AI-aangedreven IDE of CLI**: minstens één ondersteunde host, zoals Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot of Hermes
- **bun**: JavaScript-runtime en pakketbeheerder (wordt automatisch door het installatiescript geïnstalleerd als deze ontbreekt)
- **uv**: Python-pakketbeheerder (het bootstrap-script biedt installatie aan als deze ontbreekt)
- **Code-intelligenceprovider**: Serena is de standaardprovider. Gortex wordt ook ondersteund wanneer je die in de providerconfiguratie selecteert. De installer kan Serena bootstrappen met `uv tool install` en gaat met een waarschuwing verder wanneer een optionele dependency niet beschikbaar is. Bij een geselecteerde Gortex registreren `oma install` en `oma update` in projectmodus het project bij de Gortex-daemon (`gortex track`) wanneer het nog niet wordt getrackt, en voegen ze de door OMA gegenereerde mappen via de Gortex-CLI toe aan de uitsluitlijst van dat project; er wordt niets in de projectmap geschreven. Gortex zelf moet apart worden geïnstalleerd.

De installer groepeert integraties op basis van capability. Hook-leveranciers zijn Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro en Qwen; OpenCode en pi gebruiken extension bridges; GitHub Copilot en Hermes krijgen skill-links; en ZCode krijgt workflowcommando's. Je kunt meer dan één leverancier selecteren, maar voor je eerste taak heb je alleen de host nodig die je wilt gebruiken.

---

## Methode 0: skills-CLI (snelst voor alleen skills)

Installeer het OMA-skillpakket in gedetecteerde agent-runtimes:

```bash
npx skills add first-fluke/oh-my-agent
```

Dit is de lichtste instap wanneer je skills wilt zonder de volledige harness. Gebruik voor workflows, regels, hooks, gates en `oma agent spawn` Methode 1 of 2 hieronder.

## Methode 1: installatie met één regel (volledige harness)


```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Beide bootstrap-scripts werken hetzelfde:
1. Detecteert je platform (macOS, Linux of Windows)
2. Controleert op bun en uv (en op serena als je die kiest) en installeert ze als ze ontbreken
3. Start de interactieve installer met selectie van preset en provider
4. Maakt `.agents/` aan met de door jou geselecteerde skills en configuratie
5. Stelt runtime-integratielagen in (hooks, symlinks en instellingen voor gedetecteerde leveranciers)
6. Configureert code-intelligence- en memory-MCP-servers

De bootstrap gaat door na fouten met optionele dependencies en geeft vervolgcommando's. Voer `oma doctor` uit nadat de installer klaar is.

---

## Methode 2: handmatige installatie via bunx

```bash
bunx oh-my-agent@latest
```

Dit start de interactieve installer zonder de dependency-bootstrap. bun moet al geïnstalleerd zijn.

De installer vraagt je een skill-preset te kiezen. De huidige presets zijn gedefinieerd in `cli/constants/skill-data.ts`:

### Presets

| Preset | Inbegrepen skills |
|--------|------------------|
| **all** | Alle 33 huidige skill-pakketten |
| **fullstack** | Architectuur, brainstormen, design, frontend, backend, mobile, database, PM, QA, debugging, SCM, Terraform en developer workflow |
| **fullstack-web** | Fullstack-webimplementatie, architectuur, design, PM, QA, debugging, SCM en developer workflow |
| **fullstack-mobile** | Mobilegerichte fullstackimplementatie, architectuur, design, PM, QA, debugging, SCM en developer workflow |
| **frontend** | Architectuur, brainstormen, design, frontend, PM, QA, debugging en SCM |
| **backend** | Architectuur, brainstormen, backend, database, PM, QA, debugging, SCM en developer workflow |
| **mobile** | Architectuur, brainstormen, mobile, PM, QA, debugging en SCM |
| **devops** | Architectuur, brainstormen, Terraform, developer workflow, observability, PM, QA, debugging en SCM |
| **research** | Scholar, market, PDF, HWP, academic writing, search, translation en SCM |
| **content** | Design, image, voice, academic writing, translation en SCM |

Presets zijn bundels van skills; ze maken niet voor elke skill één subagentdefinitie aan. De `all`-preset wordt opgebouwd uit het live skillregister, dus de lijst kan meegroeien met de repository. Domeinpresets bevatten alleen de skills die voor hun focus nodig zijn.

De gedeelde resources (`_shared/`) worden altijd geïnstalleerd, ongeacht de preset. Dit omvat core-routing, context loading, promptstructuur, leveranciersdetectie, uitvoeringsprotocollen en het memoryprotocol.

### Wat wordt aangemaakt

Na de installatie bevat je project:

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

De installer maakt alleen vendor-directories aan voor de hosts die je selecteert. De hookbron blijft in `.agents/hooks/core/`; gegenereerde vendorbestanden zijn integratie-output. In oudere projecten kan Serena ook de legacy-directory `.serena/memories/` gebruiken.

---

## Methode 3: globale installatie

Voor gebruik op CLI-niveau (dashboards, agent-spawning en diagnostiek) installeer je oh-my-agent globaal:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

Hiermee installeer je het `oma`-commando globaal, zodat je vanuit elke directory toegang hebt tot alle CLI-commando's:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` is kort voor `oh-my-agent`. Beide werken als CLI-commando's.

---

## Installatie van AI CLI-tools

Je hebt minstens één AI CLI-tool nodig. oh-my-agent ondersteunt meerdere leveranciers. Je kunt ze combineren door verschillende CLI's voor verschillende agenten te gebruiken via de agent-CLI-mapping.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

Authenticatie gebeurt automatisch bij de eerste run. Claude Code gebruikt `.claude/` voor hooks en instellingen, met skills die vanuit `.agents/skills/` zijn gesymlinkt.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Voer na installatie `codex login` uit om te authenticeren.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Voer na installatie `/auth` uit in de CLI om te authenticeren.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Authenticatie wordt bij de eerste run door `agy` afgehandeld. Het binaire bestand heet `agy`. Stel voor headless omgevingen de omgevingsvariabele `ANTIGRAVITY_API_KEY` in. `oma doctor` rapporteert de authenticatiestatus via `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

Het commando `oma install` maakt `.agents/oma-config.yaml` aan. Dit is het centrale configuratiebestand voor al het gedrag van oh-my-agent:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Veldreferentie

| Veld | Type | Verplicht | Beschrijving |
|-------|------|----------|-------------|
| `language` | string | Ja | Code voor de antwoordtaal. Ondersteunt en, ko, ja, zh, es, fr, de, pt, ru, nl en pl. |
| `model_preset` | string | Ja | Actieve presetsleutel. `auto` volgt de huidige runtime; vaste sleutels zijn onder meer `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` en `mixed`. Aangepaste presetsleutels zijn ook geldig. Zie [Modellen per agent](../guide/per-agent-models.md). |
| `default_cli` | string | Nee | Fallback-CLI voor `oma agent spawn` wanneer expliciete agentinstellingen en de geselecteerde preset geen leverancier opleveren. |
| `free` | map | Nee | Gatewayinstellingen voor FreeLLMAPI wanneer `model_preset: free` wordt gebruikt; bewaar API-sleutels in omgevingsvariabelen. |
| `providers` | map | Nee | Capability-providers: `code_intelligence` (`serena` of `gortex`), `code_intelligence_guard` (`block` of `off`), `docs` (`context7`), `web` (`native` of `brave`) en `semantic_memory` (`agentmemory`, `honcho` of `none`). |
| `date_format` | string | Nee | Tijdstempelformaat (`ISO`, `US`, `EU`). Standaard: `ISO`. |
| `timezone` | string | Nee | Tijdzone-identificator (bijvoorbeeld `Asia/Seoul`). Weggelaten waarden gebruiken de tijdzone van het hostsysteem. |
| `auto_update_cli` | boolean | Nee | Of routinematige CLI-controles op de achtergrond mogen bijwerken. Standaard: `true` (uitschakelen met `false`). |
| `telemetry` | boolean | Nee | Opt-in voor telemetrie van leveranciers. Standaard: `false`. |
| `agents` | map | Nee | Gedeeltelijke overschrijvingen per agent (alleen object-`AgentSpec`). Worden ondiep samengevoegd met de standaardwaarden van de preset. |
| `models` | map | Nee | Door de gebruiker gedefinieerde modelslugs, voorheen in `models.yaml`. |
| `custom_presets` | map | Nee | Door de gebruiker gedefinieerde presets. Ondersteunt `extends:` voor gedeeltelijke overerving van een ingebouwde preset. |
| `mcp.devtools_browsers` | list | Nee | Browsers voor DevTools MCP: `aside`, `chrome` of `firefox`. Weggelaten betekent dat de bestaande setup behouden blijft; `[]` schakelt de browserserver expliciet uit. |
| `serena.mode` | string | Nee | `bridge` deelt een project-Serena-server en is de standaard; `stdio` kiest voor één proces per sessie. |
| `serena.auto_update` | boolean | Nee | Of `oma update` Serena bijwerkt. Standaard: `true`. |

> **Configuratieformaat:** Een geldige `.agents/oma-config.cue` wordt als gedeelde configuratie geëvalueerd. Als de gedeelde CUE-evaluatie mislukt, kan de loader terugvallen op `.agents/oma-config.yaml`; een lokale overlay (`oma-config.local.cue` of `.yaml`) is optioneel, maar een ongeldige lokale intentie is fataal. `OMA_MODEL_PRESET` overschrijft de bestandswaarde voor het huidige proces.

### Leveranciersresolutie

Bij het spawnen van een agent lost de CLI de instellingen op in deze volgorde: `agents.<id>`, de geselecteerde `model_preset`, de orchestrator-fallback van de preset en daarna `default_cli`. Met `model_preset: auto` levert de native configuratie van de huidige runtime het model; een onbekende runtime valt terug op `default_cli`. Zie [Modellen per agent](../guide/per-agent-models.md) voor de volledige matrix.

---

## Verificatie: `oma doctor`

Controleer na installatie en setup of alles werkt:

```bash
oma doctor
```

Dit commando controleert:
- Of de geselecteerde host-CLI is geïnstalleerd en bereikbaar is; optionele tools worden apart gerapporteerd
- Of geconfigureerde MCP-serververmeldingen geldig zijn (bijvoorbeeld Serena, Gortex, Context7 of DevTools)
- Of skillbestanden bestaan met geldige SKILL.md-frontmatter
- Of symlinks en hookscripts naar geldige doelen wijzen
- Of hooks correct zijn geconfigureerd in de instellingenbestanden van de leverancier
- Of de geselecteerde code-intelligence- en memoryproviders bereikbaar zijn (bij Gortex ook of het huidige project zich in de getrackte set van de daemon bevindt)
- Of `oma-config.cue` / `oma-config.yaml` geldig is en de vereiste velden bevat

Als er iets mis is, identificeert `oma doctor` het ontbrekende of ongeldige onderdeel en maakt het onderscheid tussen blokkades voor de eerste taak en waarschuwingen over optionele integraties.

Voer het volgende uit om het opgeloste model en de CLI voor elke agent te bekijken:

```bash
oma doctor --profile
```

Zie [Modellen per agent](../guide/per-agent-models.md) voor de volledige matrix en migratiedetails.

---

## Bijwerken

### CLI bijwerken

```bash
oma update
```

Hiermee werk je de globale oh-my-agent-CLI bij naar de nieuwste versie.

### Projectskills bijwerken

Skills en workflows in een project kunnen via de GitHub Action (`action/`) automatisch worden bijgewerkt, of handmatig door de installer opnieuw uit te voeren:

```bash
bunx oh-my-agent@latest
```

De installer detecteert bestaande installaties en biedt aan deze bij te werken, terwijl je `oma-config.yaml` en aangepaste configuratie behouden blijven.

---

## Wat volgt

Open je project in de geselecteerde AI-IDE of CLI en begin oh-my-agent te gebruiken. Skill-routing is afhankelijk van de host; ingeschakelde hooks kunnen workflows detecteren. Probeer:

```
"Build a login form with email validation using Tailwind CSS"
```

Of gebruik een workflowcommando:

```
/plan authentication feature with JWT and refresh tokens
```

Zie de [Gebruiksgids](/docs/guide/usage) voor gedetailleerde voorbeelden, of lees over [Agenten](/docs/core-concepts/agents) om te begrijpen wat elke specialist doet.
