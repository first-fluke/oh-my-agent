---
title: Installatie
description: Installeer oh-my-agent, kies skills en providers, bekijk de gegenereerde projectbestanden, configureer model- en runtime-defaults en controleer de setup met oma doctor.
---

# Installatie

## Vereisten {#prerequisites}

- **Een AI-aangedreven IDE of CLI**: minstens één ondersteunde host, zoals Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot of Hermes
- **bun**: JavaScript-runtime en pakketbeheerder (wordt automatisch door het installatiescript geïnstalleerd als deze ontbreekt)
- **uv**: Python-pakketbeheerder (het bootstrap-script biedt installatie aan als deze ontbreekt)
- **Code-intelligenceprovider**: Serena is de standaardprovider. Gortex wordt ook ondersteund wanneer je die in de providerconfiguratie selecteert. De installer kan Serena bootstrappen met `uv tool install` en gaat met een waarschuwing verder wanneer een optionele dependency niet beschikbaar is. Bij een geselecteerde Gortex registreren `oma install` en `oma update` in projectmodus het project bij de Gortex-daemon (`gortex track`) wanneer het nog niet wordt getrackt, en voegen ze de door OMA gegenereerde mappen via de Gortex-CLI toe aan de uitsluitlijst van dat project; er wordt niets in de projectmap geschreven. Gortex zelf moet apart worden geïnstalleerd.

De installer groepeert integraties op basis van capability. Hook-vendors zijn Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro en Qwen; OpenCode en pi gebruiken extension bridges; GitHub Copilot en Hermes krijgen skill-links; en ZCode krijgt workflowcommando's. Je kunt meer dan één vendor selecteren, maar voor je eerste taak heb je alleen de host nodig die je wilt gebruiken.

---

## Methode 1: installatie met één regel {#method-1-one-liner-install}

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
3. Installeert het `oma`-commando globaal met `bun install --global oh-my-agent`, tenzij `oma` al in je PATH staat (hooks en workflows roepen het aan)
4. Start de interactieve installer met selectie van preset en provider
5. Maakt `.agents/` aan met de door jou geselecteerde skills en configuratie
6. Stelt runtime-integratielagen in (hooks, symlinks en instellingen voor gedetecteerde vendors)
7. Configureert code-intelligence- en memory-MCP-servers

De bootstrap gaat door na fouten met optionele dependencies en geeft vervolgcommando's. AgentMemory is de standaardprovider voor semantisch geheugen: `oma install` en `oma update` mislukken als de installatie, het opstarten of de health check ervan mislukt. Kies `providers.semantic_memory: none` of `honcho`, of zet `OMA_NO_AGENTMEMORY=1`, om de automatische voorbereiding van AgentMemory over te slaan. Voer `oma doctor` uit nadat de installer klaar is.

### Wat de installer standaard nog meer doet {#what-the-installer-also-does-by-default}

- **Aside-browser-MCP**: vooraf geselecteerd in de interactieve setup en, als hij ontbreekt, geïnstalleerd met `curl -fsSL https://releases.aside.com/install.sh | bash`, maar alleen als je hem geselecteerd laat. Deselecteer hem in de browser-MCP-stap of later met `oma update mcp`.
- **AgentMemory-service**: `bun install -g @agentmemory/agentmemory`, geregistreerd als login-service (launchd, systemd-user-unit of geplande taak in Windows).
- **CUE**: geïnstalleerd door het bootstrapscript met `brew install cue` (macOS/Linux) of `winget` (Windows), en opnieuw door `oma install` als Serena de code-intelligence-provider is.
- **Schrijft buiten het project**: `~/.claude.json` (markeert het project als vertrouwde Claude Code-workspace), `~/.serena/` (OMA-context, minimale antwoordgrootte, projectregistratie), `~/.cursor/cli-config.json` (zet de commit-attributie van Cursor uit), `~/.grok/config.toml` (telemetrie) en `~/.gemini/antigravity-cli/` (HUD), elk alleen voor een geselecteerde vendor. Voordat skills worden gelinkt in vendormappen in je homedirectory (Antigravity, Hermes, Kimi), wordt eerst gevraagd.
- **Telemetrie-opt-outs**: Claude `DISABLE_TELEMETRY=1` (dit zet ook Claude Code Remote Control uit) en de gebruiksstatistieken van Gemini, Qwen, Codex en Grok. Stel `telemetry: true` in om de standaardinstellingen van de vendors te behouden.
- **Claude Code-instellingen**: niet-ingestelde sleutels in `.claude/settings.json` worden aangevuld, waaronder `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180` en env-flags die auto memory, adaptive thinking, foutrapportage en de ingebouwde git-instructies uitzetten. Waarden die je al hebt ingesteld, blijven behouden.
- **Co-author-trailer**: de commit-attributie van Claude Code wordt `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`, en PR's krijgen een regel "Generated with oh-my-agent". Stel `scm.co_author.enabled: false` in om dit uit te zetten.
- **commit-msg-guard**: `.githooks/commit-msg` weigert `Co-authored-by`-adressen die niet in `.githooks/co-authors.allow` of `scm.co_author.email` staan. `git config --local core.hooksPath .githooks` wordt alleen ingesteld als er geen andere hooks actief zijn; anders toont oma hoe je de guard koppelt. Stel `scm.co_author.enforce_hook: false` in om je af te melden.
- **Updates op de achtergrond**: `oma update` werkt de `oma`-CLI op de achtergrond bij (`auto_update_cli: false` of `OMA_SKIP_VERSION_CHECK=1` om dat te stoppen) en voert `uv tool upgrade serena-agent --prerelease=allow` uit (`serena.auto_update: false` om dat te stoppen).
- **Serena-opruimtimer**: met Serena in de standaardmodus `bridge` registreert de eerste agentsessie die een gedeelde Serena-server start een timer die inactieve gedeelde Serena-servers elke 5 minuten stopt (launchd `dev.oma.serena-daemon-gc`, systemd-user-timer `oma-serena-daemon-gc.timer` of geplande taak in Windows `OMA Serena Daemon GC`). Stel `serena.mode: stdio` in om de gedeelde server en de timer over te slaan. `oma uninstall` verwijdert de timer niet.
- **Niet-interactieve runs** (`-y`, `OMA_YES=1`, `CI=true`) gebruiken de skillpreset `All`, `model_preset: auto` en Python als backendtaal. Ze selecteren geen browser-MCP (en slaan het installatiescript van Aside over), tenzij `mcp.devtools_browsers` er al een bevat.

---

## Methode 2: handmatige installatie via bunx {#method-2-manual-install-via-bunx}

```bash
bunx oh-my-agent@latest
```

Dit start de interactieve installer zonder de dependency-bootstrap. bun moet al geïnstalleerd zijn.

De installer vraagt je een [skillpreset](./glossary.md#skill-preset) te kiezen. De huidige presets zijn gedefinieerd in `PRESETS` in `cli/constants/skill-data.ts`:

### Presets

Kies de preset die past bij het werk dat de repository nodig heeft. In de onderstaande skillnamen is het voorvoegsel `oma-` weggelaten.

| Preset | Kies deze voor | Inbegrepen skills | Aantal |
|--------|-------------------------------|-----------------|-------|
| **all** | Elk project, of wanneer je wilt dat elke workflow direct werkt | Elke skill in het register | 33 |
| **fullstack** | Web- en mobiele clients met een backend en Terraform-infrastructuur | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | Een webfrontend met een backend en database | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | Een mobiele app met een backend en database | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | Alleen een web-UI | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | Een API of service met een database | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | Alleen een mobiele app | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | Werk aan infrastructuur, CI/CD en observability | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **research** | Papers, marktonderzoek en PDF/HWP-conversie | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | Design-assets, afbeeldingen, voice en geschreven content | design, image, voice, academic-writing, translation, scm | 6 |

Presets zijn bundels van skills; ze maken niet voor elke skill één subagentdefinitie aan. De `all`-preset wordt opgebouwd uit het live skillregister, dus de lijst kan meegroeien met de repository. Domeinpresets bevatten alleen de skills voor hun focus.

### Workflows die skills buiten een preset nodig hebben {#workflows-that-need-skills-outside-a-preset}

Elke preset installeert alle workflow- en agentdefinities, maar verschillende workflows lezen een skill die domeinpresets niet installeren. Bekijk deze tabel voordat je een domeinpreset kiest:

| Workflow | Leest skill | Presets die deze bevatten |
|----------|-------------|-------------------------|
| `/work`, `/orchestrate` | oma-coordination, oma-orchestration | all |
| `/ultrawork`, `/ralph` | oma-coordination; de `refactor-engineer`-agent die het spawnt, gebruikt oma-refactor | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/convert` (PDF, HWP) | oma-pdf, oma-hwp | all, research |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture`, `/brainstorm`, `/plan`, `/review`, `/debug` | oma-architecture, oma-brainstorm, oma-pm, oma-qa, oma-debug | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/scm` | oma-scm | elke preset |

Om later een ontbrekende skill toe te voegen, voer je `oma doctor` uit vanuit de projectroot, accepteer je de prompt voor de ontbrekende skill en kies je **Select individually**.

De gedeelde resources (`_shared/`) worden altijd geïnstalleerd, ongeacht de preset. Dit omvat core-routing, context loading, promptstructuur, vendordetectie, uitvoeringsprotocollen en het memoryprotocol.

### Wat wordt aangemaakt {#what-gets-created}

Na de installatie bevat je project:

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 21, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── config/                  # Shipped defaults (defaults.yaml)
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

De installer maakt alleen vendor-directories aan voor de hosts die je selecteert. De hookbron blijft in `.agents/hooks/core/`; gegenereerde vendorbestanden zijn integratie-output. In oudere projecten kan Serena ook de legacy-directory `.serena/memories/` gebruiken.

---

## Methode 3: globale installatie {#method-3-global-install}

Voor gebruik op CLI-niveau (dashboards, agent-spawning en diagnostiek) installeer je oh-my-agent globaal:

:::note
Deze sectie installeert het `oma`-commando. Dat is niet hetzelfde als `oma install --global`, dat skills, workflows en regels voor elk project installeert in de globale OMA-home (`~/.oma/.agents/`). Zie [Globale installatie](../guide/global-install.md).
:::

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
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
```

`oma` is kort voor `oh-my-agent`. Beide werken als CLI-commando's.

---

## Installatie van AI CLI-tools {#ai-cli-tool-installation}

Je hebt minstens één AI CLI-tool nodig. oh-my-agent ondersteunt meerdere vendors. Je kunt ze combineren door verschillende CLI's voor verschillende agenten te gebruiken via de agent-CLI-mapping.

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
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.8 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-6.1-terra, effort: high }
```

### Veldreferentie {#field-reference}

| Veld | Type | Verplicht | Beschrijving |
|-------|------|----------|-------------|
| `language` | string | Ja | Code voor de antwoordtaal. Ondersteunt en, ko, ja, zh, es, fr, de, pt, ru, nl en pl. |
| `model_preset` | string | Ja | Sleutel van de actieve [modelpreset](./glossary.md#model-preset). `auto` volgt de huidige runtime; vaste sleutels zijn onder meer `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` en `mixed`. Aangepaste presetsleutels zijn ook geldig. Zie [Modellen per agent](../guide/per-agent-models.md). |
| `default_cli` | string | Nee | Fallback-CLI voor `oma agent spawn` wanneer expliciete agentinstellingen en de geselecteerde preset geen vendor opleveren. |
| `free` | map | Nee | Gatewayinstellingen voor FreeLLMAPI wanneer `model_preset: free` wordt gebruikt; bewaar API-sleutels in omgevingsvariabelen. |
| `providers` | map | Nee | Capability-providers: `code_intelligence` (`serena` of `gortex`), `code_intelligence_guard` (`block` of `off`), `docs` (`context7`), `web` (`native` of `brave`) en `semantic_memory` (`agentmemory`, `honcho` of `none`). |
| `date_format` | string | Nee | Tijdstempelformaat (`ISO`, `US`, `EU`). Standaard: `ISO`. |
| `timezone` | string | Nee | Tijdzone-identificator (bijvoorbeeld `Asia/Seoul`). Weggelaten waarden gebruiken de tijdzone van het hostsysteem. |
| `auto_update_cli` | boolean | Nee | Of routinematige CLI-controles op de achtergrond mogen bijwerken. Standaard: `true` (uitschakelen met `false`). |
| `telemetry` | boolean | Nee | Opt-in voor telemetrie van vendors. Standaard: `false`. |
| `agents` | map | Nee | Gedeeltelijke overschrijvingen per agent (alleen object-`AgentSpec`). Worden ondiep samengevoegd met de standaardwaarden van de preset. |
| `models` | map | Nee | Door de gebruiker gedefinieerde modelslugs, voorheen in `models.yaml`. |
| `custom_presets` | map | Nee | Door de gebruiker gedefinieerde presets. Ondersteunt `extends:` voor gedeeltelijke overerving van een ingebouwde preset. |
| `mcp.devtools_browsers` | list | Nee | Browsers voor DevTools MCP: `aside`, `chrome` of `firefox`. Weggelaten betekent dat de bestaande setup behouden blijft; `[]` schakelt de browserserver expliciet uit. |
| `serena.mode` | string | Nee | `bridge` deelt een project-Serena-server en is de standaard; `stdio` kiest voor één proces per sessie. |
| `serena.auto_update` | boolean | Nee | Of `oma update` Serena bijwerkt. Standaard: `true`. |

> **Configuratieformaat:** Een geldige `.agents/oma-config.cue` wordt als gedeelde configuratie geëvalueerd. Als de gedeelde CUE-evaluatie mislukt, kan de loader terugvallen op `.agents/oma-config.yaml`; een lokale overlay (`oma-config.local.cue` of `.yaml`) is optioneel, maar een ongeldige lokale intentie is fataal. `OMA_MODEL_PRESET` overschrijft de bestandswaarde voor het huidige proces.

### Vendorresolutie {#vendor-resolution}

Bij het spawnen van een agent lost de CLI de instellingen op in deze volgorde: `agents.<id>`, de geselecteerde `model_preset`, de orchestrator-fallback van de preset en daarna `default_cli`. Met `model_preset: auto` levert de native configuratie van de huidige runtime het model; een onbekende runtime valt terug op `default_cli`. Zie [Modellen per agent](../guide/per-agent-models.md) voor de volledige matrix.

---

## Verificatie: `oma doctor` {#verification-oma-doctor}

Controleer na installatie en setup of alles werkt:

```bash
oma doctor
```

Dit commando controleert:
- Of de geselecteerde host-CLI is geïnstalleerd en bereikbaar is; optionele tools worden apart gerapporteerd
- Of geconfigureerde MCP-serververmeldingen geldig zijn (bijvoorbeeld Serena, Gortex, Context7 of DevTools)
- Of skillbestanden bestaan met geldige SKILL.md-frontmatter
- Of symlinks en hookscripts naar geldige doelen wijzen
- Of hooks correct zijn geconfigureerd in de instellingenbestanden van de vendor
- Of de geselecteerde code-intelligence- en memoryproviders bereikbaar zijn (bij Gortex ook of het huidige project zich in de getrackte set van de daemon bevindt)
- Of `oma-config.cue` / `oma-config.yaml` geldig is en de vereiste velden bevat

Als er iets mis is, identificeert `oma doctor` het ontbrekende of ongeldige onderdeel en maakt het onderscheid tussen blokkades voor de eerste taak en waarschuwingen over optionele integraties.

Voer het volgende uit om het opgeloste model en de CLI voor elke agent te bekijken:

```bash
oma doctor --profile
```

Zie [Modellen per agent](../guide/per-agent-models.md) voor de volledige matrix en migratiedetails.

---

## Bijwerken {#updating}

### CLI bijwerken {#cli-update}

```bash
oma update
```

Hiermee werk je de globale oh-my-agent-CLI bij naar de nieuwste versie.

### Projectskills bijwerken {#project-skills-update}

Skills en workflows in een project kunnen via de GitHub Action (`action/`) automatisch worden bijgewerkt, of handmatig door de installer opnieuw uit te voeren:

```bash
bunx oh-my-agent@latest
```

De installer detecteert bestaande installaties en biedt aan deze bij te werken, terwijl je `oma-config.yaml` en aangepaste configuratie behouden blijven.

---

## Wat volgt {#what-is-next}

Open je project in de geselecteerde AI-IDE of CLI en begin oh-my-agent te gebruiken. Skill-routing is afhankelijk van de host; ingeschakelde hooks kunnen workflows detecteren. Probeer:

```text
"Build a login form with email validation using Tailwind CSS"
```

Of gebruik een workflowcommando:

```text
/plan authentication feature with JWT and refresh tokens
```

Zie de [Gebruiksgids](/docs/guide/usage) voor gedetailleerde voorbeelden, of lees over [Agenten](/docs/core-concepts/agents) om te begrijpen wat elke specialist doet. Als de installatie of een hook zich niet gedraagt zoals verwacht, zie dan [Probleemoplossing](../guide/troubleshooting.md).
