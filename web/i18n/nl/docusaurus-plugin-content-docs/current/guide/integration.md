---
title: "Gids: Integratie in een bestaand project"
sidebar_label: Bestaande projecten
description: Complete gids voor het toevoegen van oh-my-agent aan een bestaand project, met het CLI-pad, handmatige installatie, verificatie, de SSOT-symlinkstructuur en een uitleg van wat de installer onder de motorkap doet.
---

# Gids: Integratie in een bestaand project

## Twee integratiepaden

Je kunt oh-my-agent op twee manieren aan een bestaand project toevoegen:

1. **CLI-pad:** voer `oma` (of `npx oh-my-agent`) uit en volg de interactieve prompts. Dit is voor de meeste gebruikers de aanbevolen route.
2. **Handmatig pad:** kopieer bestanden en configureer symlinks zelf. Dit is handig in beperkte omgevingen of bij aangepaste opstellingen.

Beide paden leveren hetzelfde resultaat op: een map `.agents/` (de SSOT) plus vendor-native gegenereerde bestanden zoals `.claude/agents/`, `.codex/agents/` en `.qwen/agents/`.

---

## CLI-pad: stap voor stap

### 1. Installeer de CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```


Na een globale installatie zijn de commando’s `oma` (of `oh-my-agent`) beschikbaar.

### 2. Ga naar de projectroot

```bash
cd /path/to/your/project
```


Voer de installer uit vanuit de projectmap die je wilt configureren. OMA schrijft de SSOT relatief ten opzichte van de installatieroot. Een Git-repository wordt aanbevolen voor review en rollback, maar de installer vereist die niet.

### 3. Voer de installer uit

```bash
oma
```


De standaardopdracht zonder subcommando start de interactieve installer.

### 4. Kies het projecttype

De installer toont deze presets:

| Preset | Inbegrepen skills |
|:-------|:---------------|
| **All** | Alle beschikbare skills |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | React/Next.js-skills |
| **Backend** | Python/Node.js/Rust-backendskills |
| **Mobile** | Flutter/Dart-skills voor mobiel |
| **DevOps** | Terraform-, CI/CD- en workflow-skills |
| **Custom** | Afzonderlijke skills kiezen uit de volledige lijst |

### 5. Kies de backendtaal (indien van toepassing)

Als je een preset met de backendskill kiest, vraagt de installer om een taalvariant:

- **Python:** FastAPI/SQLAlchemy (standaard)
- **Node.js:** NestJS/Hono + Prisma/Drizzle
- **Rust:** Axum/Actix-web
- **Other / Auto-detect:** later configureren met `/stack-set`

### 6. Configureer IDE-symlinks

De installer maakt altijd Claude Code-symlinks aan (`.claude/skills/`). Ook genereert hij native agentbestanden, hooks, settings en integratiebestanden voor de geselecteerde vendor. De huidige vendorfamilies zijn Antigravity, Claude, Codex, Cursor, Kiro, Kimi en Qwen, met extensiepaden voor pi en OpenCode. Als er een map `.github/` bestaat, kan hij automatisch GitHub Copilot-symlinks aanmaken. Wanneer je **ZCode** selecteert, maakt hij workflows als slash-commands beschikbaar via symlinks naar `.zcode/commands/*.md` (alleen workflows, zonder agentbestanden of hooks). Anders vraagt hij:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```


### 7. Aanbevolen globale Git-configuratie

Aan het einde van `oma install` en `oma update` controleert de CLI twee **globale** Git-instellingen die multi-agentworkflows helpen:

| Sleutel | Gewenste waarde | Waarom |
|:----|:--------------|:----|
| `rerere.enabled` | `true` | Opgeslagen oplossingen hergebruiken: merges met meerdere agents raken vaak dezelfde conflicten en rerere speelt je eerdere fix opnieuw af |
| `init.defaultBranch` | `main` | Een consistente standaardbranchnaam voor nieuwe repositories |

Als een waarde ontbreekt of anders is, vraagt de CLI interactief om bevestiging (standaard **ja**):

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```


Als je bevestigt, voert de CLI het equivalent uit van:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```


**Niet-interactieve paden** (`--yes`, `--ci`, `CI=true`) schrijven nooit naar de globale Git-configuratie. Ze tonen alleen een overslaanmelding met de commando’s voor de handmatige oplossing.

`oma doctor` rapporteert dezelfde controles onder **Git Config**, telt afwijkingen als problemen, toont ze als `gitRecommended` in de JSON-uitvoer van `--json` en kan fixes interactief toepassen.

### 8. MCP-configuratie

Als er een Antigravity IDE-MCP-configuratie bestaat (`~/.gemini/antigravity/mcp_config.json`), biedt de installer aan om de Serena MCP-bridge te configureren:

```
Configure Serena MCP with bridge? (Required for full functionality)
```


Als je dit accepteert, wordt het volgende ingesteld:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```


Als de Gemini CLI-instellingen bestaan (`~/.gemini/settings.json`), biedt de installer op dezelfde manier aan om Serena voor Gemini CLI in HTTP-modus te configureren:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```


### 9. Voltooiing

De installer toont een samenvatting van alles wat is geïnstalleerd:

- Lijst met geïnstalleerde skills
- Locatie van de skillsmap
- Aangemaakte symlinks
- Overgeslagen items (indien aanwezig)

---

## Handmatig pad

Voor omgevingen waarin de interactieve CLI niet beschikbaar is, zoals CI-pipelines, beperkte shells of bedrijfscomputers.

### Stap 1: downloaden en uitpakken

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```


### Stap 2: bestanden naar je project kopiëren

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```


`oma link` genereert `.claude/`, `.codex/`, `.qwen/` en verwante vendor-native bestanden opnieuw vanuit `.agents/agents/`. Tijdens runtime gebruikt OMA alleen native dispatch als de vendor van de huidige runtime overeenkomt met de doelvendor van die agent. Gemengde vendorsetups blijven werken; agents die niet overeenkomen vallen terug op een externe `oma agent spawn`.

Voor Qwen Code staan de gegenereerde Markdown-definities in `.qwen/agents/`. Selecteer een OMA-rol via de `subagent_type` van de Agent-tool, bijvoorbeeld `backend-engineer`. Controleer de beschikbare definities met `/agents manage` in Qwen Code. Native agents gebruiken dezelfde [resultaatlevenscyclus](./agent-results-and-resume.md) als CLI-spawns: `oma agent begin`, `oma agent verify` en `oma agent finish`. Gebruik bij `model_preset: free` het commando `oma agent spawn`, zodat het kindproces de gatewayconfiguratie ontvangt.

Qwen Code gebruikt dezelfde `code-intelligence-primer` als de andere vendors. Net als Claude Code registreert het de gedeelde primer op `SessionStart` en `UserPromptSubmit`: de richtlijnen worden eenmaal per sessie geïnjecteerd en opnieuw na compactie. De primer volgt de geconfigureerde provider (Serena of Gortex), bevat richtlijnen voor uitgestelde tools en staat een native fallback toe wanneer de provider niet beschikbaar is of een timeout geeft. Qwen voegt geen aparte blokkering van codezoekopdrachten of tracking van providerresultaten toe.

Voer na het bijwerken van de CLI `oma link qwen` uit om de hookinstellingen en de wrapper opnieuw te genereren en start daarna een nieuwe Qwen-sessie. Tests van de hookuitvoer verifiëren het integratiecontract; ze garanderen niet welke tool een model kiest.

### Stap 3: gebruikersvoorkeuren configureren

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```


### Stap 4: de memorymap initialiseren

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```


---

## Verificatiechecklist

Controleer na de installatie, ongeacht het gekozen pad, of alles correct is ingesteld:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```


De doctor-opdracht controleert:

| Controle | Wat wordt gecontroleerd |
|:----------------|:----------------|
| **CLI-installaties** | agy, claude, codex en qwen (versie en beschikbaarheid) |
| **Authenticatie** | API-key- of OAuth-status voor elke CLI |
| **MCP-configuratie** | Serena MCP-serverconfiguratie voor elke CLI-omgeving |
| **Skillstatus** | Welke skills zijn geïnstalleerd en of ze actueel zijn |

Handmatige verificatieopdrachten:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```


---

## Multi-IDE-symlinkstructuur (SSOT-concept)

oh-my-agent gebruikt een Single Source of Truth-architectuur (SSOT). De map `.agents/` is de enige plaats waar skills, workflows, configuraties en agentdefinities leven. Alle IDE-specifieke mappen bevatten alleen symlinks die terugwijzen naar `.agents/`.

### Directory-indeling

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```


### Waarom symlinks?

Wanneer `oma update` `.agents/` vernieuwt, neemt elke IDE die ernaar verwijst de wijziging over. Skills worden één keer opgeslagen in plaats van per IDE te worden gekopieerd. Als je `.claude/` verwijdert, verwijder je je skills niet: de SSOT in `.agents/` blijft intact. Symlinks zijn bovendien klein en geven in Git een schone diff.

---

## Veiligheidstips en rollbackstrategie

### Voor de installatie

1. **Commit je huidige werk.** De installer maakt nieuwe mappen en bestanden aan. Met een schone Git-status kun je alles terugdraaien met `git checkout .`.
2. **Controleer de map `.agents/`.** Als die door een andere tool is aangemaakt, maak dan eerst een back-up. De installer overschrijft de map.

### Na de installatie

1. **Controleer wat is aangemaakt.** Voer `git status` uit om alle nieuwe bestanden te bekijken. De installer maakt alleen bestanden in `.agents/`, `.claude/` en eventueel `.github/`.
2. **Controleer `.gitignore`.** In een Git-repository voegen install, update en link automatisch runtime-entry’s toe aan de root-`.gitignore` (`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/` en `docs/plans/`). Controleer of ze zijn toegevoegd. De meeste teams committen `.agents/` en `.claude/` om de setup te delen. Alleen voor `.serena/` moet je zelf kiezen: Serena beheert zijn eigen cache via een interne `.serena/.gitignore`. Je kunt dus `.serena/project.yml` committen als gedeelde projectconfiguratie, of de hele map negeren:

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```


### Rollback

Verwijder oh-my-agent volledig uit een project met:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```


Of zet de wijzigingen eenvoudig terug met Git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```


---

## Dashboard instellen

Na de installatie kun je realtime monitoring instellen. Zie de [Dashboard Monitoring-gids](/docs/guide/dashboard-monitoring) voor alle details.

Snelle setup:

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```


---

## Wat de installer onder de motorkap doet

Wanneer je `oma` uitvoert (de installopdracht), gebeurt precies het volgende:

### 1. Legacy-migratie

De installer controleert of de oude map `.agent/` (enkelvoud) bestaat en migreert die zo nodig naar `.agents/` (meervoud). Dit is een eenmalige migratie voor gebruikers die vanaf oudere versies upgraden.

### 2. Detectie van concurrerende tools

De installer zoekt naar concurrerende tools en biedt aan ze te verwijderen om conflicten te voorkomen.

### 3. Tarball downloaden

De installer downloadt de nieuwste releasetarball uit de GitHub-releases van oh-my-agent. Deze tarball bevat de volledige map `.agents/` met alle skills, gedeelde resources, workflows, configuraties en agentdefinities.

### 4. Gedeelde resources installeren

`installShared()` kopieert de map `_shared/` naar `.agents/skills/_shared/`. Die bevat:

- `core/`: skillrouting, context loading, promptstructuur, kwaliteitsprincipes, vendordetectie en API-contracten.
- `runtime/`: memoryprotocol en uitvoeringsprotocollen per vendor.
- `conditional/`: resources die alleen onder bepaalde voorwaarden worden geladen (quality score, exploration loop).

### 5. Workflows installeren

`installWorkflows()` kopieert alle workflowbestanden naar `.agents/workflows/`. Dit zijn de definities voor `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` en `/stack-set`.

### 6. Configuratie installeren

`installConfigs()` kopieert aanvullende bestanden naar `.agents/config/`, maakt `.agents/mcp.json` aan en initialiseert de gebruikersconfiguratie `.agents/oma-config.yaml` of `.agents/oma-config.cue`. Bestaande gebruikersbestanden blijven behouden tenzij `--force` wordt gebruikt. `oma update` behoudt de gebruikersconfiguratie ook en voegt indien nodig nieuwe top-level-sleutels uit het sjabloon toe.

### 7. Skills installeren

Voor elke geselecteerde skill kopieert `installSkill()` de skillmap naar `.agents/skills/{skill-name}/`. Als een variant is geselecteerd, bijvoorbeeld Python voor backend, wordt ook de map `stack/` met taalspecifieke resources ingesteld.

### 8. Vendor-aanpassingen

`installVendorAdaptations()` installeert IDE-specifieke bestanden voor de geselecteerde ondersteunde vendors:

- Agentdefinities (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- Hookconfiguraties (`.claude/hooks/`, `.codex/hooks.json`)
- Settingsbestanden en de gedeelde vendorgids (alleen `AGENTS.md`, Claude Code ≥ 2.1.277 inbegrepen). `CLAUDE.md` en `GEMINI.md` krijgen nooit een OMA-blok; een bestaand `CLAUDE.md` van de gebruiker krijgt alleen een importregel `@AGENTS.md`, zodat Claude Code `AGENTS.md` niet overslaat

Codex beveiligt zijn hooks achter een eenmalige vertrouwensstap. `.codex/hooks.json` wordt dus pas uitgevoerd nadat je het eenmaal hebt beoordeeld via de Codex-browser `/hooks`. Zie [Codex Hook Trust](/docs/guide/codex-hook-trust) voor details.

### 9. CLI-symlinks

`createCliSymlinks()` maakt symlinks van IDE-specifieke mappen naar de SSOT:

- `.claude/skills/{skill}` → `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` → `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` → `../../.agents/skills/{skill}` (als Copilot is ingeschakeld)

Vendor-native agentbestanden worden door `oma link`, `oma install` of `oma update` uit `.agents/agents/` gegenereerd en niet rechtstreeks als symlink aangemaakt.

### 10. Globale workflows

`installGlobalWorkflows()` installeert workflowbestanden die mogelijk globaal nodig zijn, buiten de projectmap.

### 11. Aanbevolen Git-configuratie + MCP

Zoals hierboven in het CLI-pad beschreven, configureren install en update optioneel de aanbevolen **globale** Git-instellingen (`rerere.enabled`, `init.defaultBranch`) na interactieve toestemming. Waar van toepassing kunnen ze ook MCP-instellingen configureren.
