---
title: "CLI-commando's"
description: Volledige referentie voor alle CLI-commando's van oh-my-agent, met syntaxis, opties en voorbeelden per categorie.
---

# CLI-commando's

Gebruik na een globale installatie (`bun install --global oh-my-agent`) `oma` of `oh-my-agent`. Gebruik `npx oh-my-agent` voor eenmalig gebruik zonder installatie.

Je kunt de omgevingsvariabele `OH_MY_AG_OUTPUT_FORMAT` instellen op `json` om machineleesbare uitvoer af te dwingen voor commando's die dit ondersteunen. Dit is gelijk aan `--json` doorgeven aan elk commando.

## Begin met een taak

Kies het kleinste commando dat je vraag beantwoordt. Elk commando hieronder print een pad of rapport dat je kunt inspecteren voordat je verdergaat.

| Taak | Begin hier | Verwacht resultaat |
|:-----|:-----------|:----------------|
| Een project installeren of herstellen | `oma install` en daarna `oma doctor` | Geïnstalleerde resources en een gezondheidsrapport; gebruik `oma doctor --profile` wanneer modelresolutie de vraag is. |
| Een commando of optie van een agent vinden | `oma describe` of `oma describe "image generate"` | JSON met argumenten, opties en geneste commando's. |
| Een afbeelding genereren | `oma image generate "<prompt>" --output json` | Afbeeldingspaden en een manifest onder `.agents/results/images/`. |
| Video plannen of renderen | `oma video generate "<brief>" --dry-run` | Een runmap met planningsartefacts; compose en render pas nadat de compositie is geschreven. |
| Een interactieve code-uitleg maken | `/explain` | Een gevalideerd zelfstandig HTML-artifact onder `.agents/results/explain/`. |
| Een diagramengine bepalen | `oma diagram resolve --output json` | De geselecteerde Mermaid- of archify-engine en de reden daarvoor. |
| Communitysignalen onderzoeken | `oma market detect-trap "<topic>"` | Een preflightresultaat; ga alleen verder met `oma market resolve --output json` en de upstream-run wanneer de controle slaagt. |
| Een paper converteren of inspecteren | `oma scholar search "<query>"` | Zoekresultaten van Knows, OpenAlex of Semantic Scholar; haal een sidecar op met `oma scholar get`. |
| Een slide deck bouwen | `oma slide create --output-dir <dir>` | Een werkmap die je kunt schrijven, valideren, bundelen en exporteren. |
| Documentatiedrift controleren | `oma docs verify --json` | Een gestructureerd rapport met gebroken verwijzingen en een opnieuw gegenereerde verwijzingsindex. |

Deze commandokaart gebruikt het vastgelegde register als bron. De canonieke ontdekkingsnamen hieronder komen uit `oma describe`; interactieve help kan compatibiliteitsaliassen tonen zoals `slide new`, `slide viewer`, `image list-vendors` of `video list-providers`.

## Huidig commandolandschap

Deze kaart houdt de uitgebreide referenties hieronder scanbaar en maakt minder vaak gebruikte families vindbaar. Gebruik `--help` van een familie of `oma describe <path>` voor de exacte argumentgrammatica; [CLI-opties](./options.md) bevat de volledige vlaggenmatrix van het register.

| Familie | Geregistreerde paden |
|:-------|:-----------------|
| `install` | `install` |
| `describe` | `describe` |
| `uninstall` | `uninstall` |
| `update` | `update`, `update mcp` |
| `link` | `link` |
| `intel` | `intel`, `intel suggest` |
| `market` | `market`, `market detect-trap`, `market resolve`, `market update`, `market run` |
| `doctor` | `doctor` |
| `profile` | `profile`, `profile list`, `profile show`, `profile create`, `profile use`, `profile run` |
| `retro` | `retro` |
| `recap` | `recap` |
| `docs` | `docs`, `docs verify`, `docs sync`, `docs i18n`, `docs lint` |
| `emit` | `emit` |
| `cleanup` | `cleanup` |
| `bridge` | `bridge` |
| `verify` | `verify`, `verify agent`, `verify triggers` |
| `vault` | `vault`, `vault store`, `vault get`, `vault list`, `vault delete` |
| `star` | `star` |
| `visualize` | `visualize` |
| `search` | `search`, `search providers`, `search web`, `search fetch`, `search meta`, `search media`, `search archive`, `search trust`, `search code`, `search doctor`, `search api`, `search api fetch`, `search api search`, `search rss`, `search rss fetch`, `search rss google` |
| `harness` | `harness`, `harness eval`, `harness incident`, `harness feedback`, `harness evolution enable`, `harness evolution status`, `harness evolution disable`, `harness evolution run` |
| `slide` | `slide`, `slide validate`, `slide bundle`, `slide edit`, `slide doctor`, `slide create`, `slide preview`, `slide export`, `slide export pdf`, `slide export png`, `slide export pptx`, `slide import`, `slide import pptx`, `slide asset`, `slide asset fetch-video`, `slide style`, `slide style list`, `slide style preview`, `slide style get` |
| `scholar` | `scholar`, `scholar search`, `scholar resolve`, `scholar get`, `scholar lint` |
| `image` | `image`, `image generate`, `image doctor`, `image vendor`, `image vendor list` |
| `video` | `video`, `video generate`, `video doctor`, `video compose`, `video render`, `video provider`, `video provider list` |
| `serena` | `serena`, `serena reap`, `serena reaper`, `serena reaper enable`, `serena reaper disable` |
| `explain` | `explain`, `explain render`, `explain patch`, `explain components`, `explain validate` |
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web` |
| `auth` | `auth`, `auth status` |
| `hook` | `hook`, `hook run`, `hook probe` |
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state trajectory`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize`, `skill meta-optimize`, `skill procedure`, `skill evolution-stats`, `skill promotions`, `skill rollback` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

Wanneer een commando de resterende argumenten doorgeeft aan een andere tool, laat het register de opties bewust open. Dit geldt voor `market run` en `diagram archify`; lees de opgeloste upstream-help voordat je een wijzigende of netwerkgebonden bewerking uitvoert.

---

## Instellen en installeren

### install

`oma` zonder argumenten start de interactieve installer. `oma install` is de expliciete vorm en accepteert opties voor providerselectie.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

`--web-search`, `--code-intelligence` en `--semantic-memory` behouden de opgeslagen providerkeuze wanneer je ze weglaat. `--honcho-url` en `--honcho-workspace` configureren een nieuwe Honcho-verbinding wanneer die provider is geselecteerd. De rootvlag `-y, --yes` slaat vragen over en gebruikt standaardwaarden; `--global` richt zich op de HOME-installatie.

**Wat het doet:**
1. Controleert op de legacy-map `.agent/` en migreert die naar `.agents/` als die bestaat.
2. Detecteert concurrerende tools en biedt aan die te verwijderen.
3. Vraagt om het projecttype (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Als Backend is geselecteerd, vraagt het om de taalvariant (Python, Node.js, Rust, Other).
5. Vraagt naar GitHub Copilot-symlinks.
6. Downloadt de nieuwste tarball uit het register.
7. Installeert gedeelde resources, workflows, configuraties en geselecteerde skills.
8. Installeert vendor-aanpassingen voor geselecteerde vendors (projectlokale instellingen; geen stille vendor-schrijfacties op HOME-niveau).
9. Maakt CLI-symlinks aan.
10. Biedt aanbevolen **globale** git-configuratie aan (bevestiging via opt-in):
    - `rerere.enabled=true` — hergebruik van mergeconflicten tussen agents
    - `init.defaultBranch=main` — een consistente standaardbranch voor nieuwe repositories
    - Wordt volledig overgeslagen onder `--yes` / CI (print in plaats daarvan handmatige hersteltips)
11. Biedt aan MCP te configureren waar dat van toepassing is.
12. Vraagt om een GitHub-star als `gh` geauthenticeerd is.

**Voorbeeld:**
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor

Gezondheidscontrole voor CLI-installaties, MCP-configuraties en skillstatus.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |
| `--profile` | Toon de profielgezondheidsmatrix. Toont per agent de opgeloste modelslug, CLI en authenticatiestatus uit de actieve `model_preset`- en `agents:`-overschrijvingen. Zie [Modellen per agent](../guide/per-agent-models.md). |

**Wat het controleert:**
- CLI-installaties: agy, claude, codex, qwen (versie en pad).
- Authenticatiestatus voor elke CLI.
- MCP-configuratie: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Geïnstalleerde skills: welke skills aanwezig zijn en wat hun status is.
- Map van de memorystore: aanwezigheid en aantal bestanden van `.agents/state/memories/` (oudere projecten vallen terug op het legacy-pad `.serena/memories/`).
- Markeringen voor dubbele installatie (project tegenover globaal) en bijbehorende waarschuwingen.
- Aanbevolen **globale** git-configuratie (`gitRecommended` in JSON):
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Elke afwijking telt mee in `totalIssues`
- Vendorcontextbestand van het project (OMA-blok in `AGENTS.md` wanneer Codex, Qwen of Claude Code ≥ 2.1.277 is geïnstalleerd).
- Gezondheid van AgentMemory en state/hooks, Serena Reaper-diagnostiek en bijbehorende probleemtellers.

**Automatisch herstel:** als ontbrekende skills worden gevonden, biedt `doctor` aan ze interactief te installeren. Als aanbevolen git-configuratie ontbreekt of onjuist is, biedt het dezelfde globale opt-in-herstelacties als install/update.

**Voorbeelden:**
```bash
# Interactive text output
oma doctor

# JSON output for CI pipelines
oma doctor --json

# Pipe to jq for specific checks
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspect the profile resolution matrix
oma doctor --profile
```

### update

Werk skills bij naar de nieuwste versie uit het register.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `-f, --force` | Overschrijf door de gebruiker aangepaste configuratiebestanden (`oma-config.yaml`, `mcp.json`, `stack/`-mappen) |
| `--with-new-skills` | Installeer skills die nieuw zijn in deze release; zonder deze vlag worden alleen al geïnstalleerde skills vernieuwd. |
| `--ci` | Voer uit in niet-interactieve CI-modus (vragen overslaan, gewone tekstuitvoer) |
| `-y, --yes` | Sla vragen over. Het vendorbereik blijft gelijk: alleen bestaande vendormappen worden bijgewerkt, tenzij `--all` of `--vendor` is opgegeven. |
| `--all` | Maak alle ondersteunde projectgebonden vendors aan of werk ze bij. |
| `--vendor <vendors>` | Maak specifieke vendors aan of werk ze bij. Accepteert een kommagescheiden lijst, zoals `claude,qwen`. |

**Wat het doet:**
1. Haalt `prompt-manifest.json` uit het register op om de nieuwste versie te controleren.
2. Vergelijkt met de lokale versie in `.agents/skills/_version.json`.
3. Sluit af als de installatie al actueel is.
4. Downloadt en pakt de nieuwste tarball uit.
5. Behoudt door de gebruiker aangepaste bestanden (tenzij `--force`).
6. Kopieert nieuwe bestanden naar `.agents/`.
7. Zet behouden bestanden terug.
8. Werkt vendor-aanpassingen bij en vernieuwt symlinks. Standaard worden alleen vendormappen aangeraakt die al in het project bestaan.
9. Biedt aanbevolen **globale** git-configuratie aan (dezelfde opt-in als bij install: `rerere.enabled`, `init.defaultBranch`). Wordt overgeslagen onder `--yes` / `--ci`.

**Voorbeelden:**
```bash
# Standard update (preserves config)
oma update

# Force update (resets all config to defaults)
oma update --force

# CI mode (no prompts, no spinners)
oma update --ci

# CI mode with force
oma update --ci --force

# Update existing vendors without prompts
oma update --yes

# Create/update every supported project-scoped vendor
oma update --all

# Create/update only Claude and Qwen integrations
oma update --vendor claude,qwen

# Also refresh browser MCP selections
oma update mcp --ci
```

`oma update mcp` heeft eigen opties `--yes`, `--ci`, `--all` en `--vendor <vendors>`. Het kiest ondersteunde browser-MCP-servers (Aside, Chrome DevTools of Firefox DevTools) voor de geselecteerde projectgebonden vendors.

### uninstall

Bekijk vooraf of verwijder bestanden die OMA beheert uit de geselecteerde installatieroot:

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` somt verwijderingen op zonder bestanden te wijzigen. `--yes` slaat de bevestigingsvraag over. Het commando behoudt `oma-config.yaml`, `mcp.json` en door de gebruiker geschreven skills volgens de geregistreerde commandoomschrijving. Als de preview een bestand bevat dat je nog nodig hebt, stop dan en bewaar de dry-run-uitvoer voor beoordeling.

### link

Genereer vendor-native bestanden opnieuw vanuit de `.agents/`-bron van waarheid, zonder opnieuw te installeren.

```
oma link [vendors...] [--global]
```

**Voorbeelden:**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Zonder `--global` richt link zich op `<cwd>/.agents/`; met deze vlag op `~/.agents/` (of `OMA_HOME`). Zie [Globale installatie](../guide/global-install.md).

**Wat het doet:**
1. Bouwt vendor-native agentbestanden opnieuw op vanuit `.agents/agents/`
2. Vernieuwt hooks en lokale instellingen voor de geselecteerde vendors
3. Genereert het integratieblok in `AGENTS.md` opnieuw voor elke geconfigureerde vendor, Claude Code inbegrepen. `CLAUDE.md` en `GEMINI.md` worden nooit aangemaakt of van een OMA-blok voorzien. Claude Code ≥ 2.1.277 leest `AGENTS.md` native, maar negeert het zodra er een `CLAUDE.md` bestaat; daarom voegt link, wanneer er een `CLAUDE.md` van de gebruiker aanwezig is, één importregel `@AGENTS.md` toe; `oma update` verwijdert bovendien het legacy-OMA-blok uit `CLAUDE.md` zodra die versie wordt gedetecteerd
4. Vernieuwt de Cursor-MCP-koppeling en CLI-skillsymlinks wanneer dat relevant is

Gebruik dit na het bewerken van `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` of hookdefinities.

**Modelgedrag:**
- Native dispatch naar dezelfde vendor gebruikt het model uit het gegenereerde vendor-agentbestand.
- Externe fallback-dispatch gebruikt `default_model` van elke vendor uit `.agents/skills/oma-orchestration/config/cli-config.yaml`.

**Dispatchgedrag:**
- Als de doelvendor overeenkomt met de huidige runtime en die runtime native rolagents ondersteunt, gebruikt OMA native dispatch.
- Anders valt OMA terug op `oma agent spawn`.

### setup (workflow)

De workflow `/setup` (aangeroepen binnen een agentsessie) biedt interactieve configuratie van taal, CLI-installaties, MCP-verbindingen en agent-CLI-koppeling. Dit verschilt van `oma` (de installer): `/setup` configureert een al geïnstalleerde instantie.

---

## Monitoring en metrieken

### dashboard

Start het terminaldashboard voor realtime agentbewaking.

```
oma dashboard terminal
```

Geen opties. Bewaakt `.agents/state/memories/` in de huidige map (oudere projecten vallen terug op het legacy-pad `.serena/memories/`). Toont een box-drawinginterface met sessiestatus, agenttabel en activiteitenfeed. Wordt bij elke bestandswijziging bijgewerkt. Druk op `Ctrl+C` om af te sluiten.

Je kunt de memorymap overschrijven met de omgevingsvariabele `MEMORIES_DIR`.

**Voorbeeld:**
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web

Start het webdashboard.

```
oma dashboard web
```

Start een HTTP-server op `http://localhost:9847` met een WebSocket-verbinding voor live updates. Open de URL in een browser om het dashboard te bekijken.

**Omgevingsvariabelen:**

| Variabele | Standaard | Beschrijving |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Poort voor de HTTP/WebSocket-server |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Pad naar de memorymap (valt voor oudere projecten terug op het legacy-pad `{cwd}/.serena/memories`) |

**Voorbeeld:**
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats

Bekijk productiviteitsmetrieken.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |

**Bijgehouden metrieken:**
- Aantal sessies
- Gebruikte skills (met frequentie)
- Voltooide taken
- Totale sessieduur
- Gewijzigde bestanden, toegevoegde regels en verwijderde regels
- Tijdstip van de laatste update

**Kostentelemetrie** (samengevoegd over elk `session-cost-*.md`-bestand onder `.agents/state/memories/`):
- Totale inputtokens (benadering op basis van prompttekens; nog geen outputtokens)
- Totaal aantal spawns
- Geschatte USD met een conservatieve tabel voor inputtokenkosten per vendor (Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M)
- Uitsplitsing per vendor (tokens · spawns · USD)

De schatting is een ondergrens en geen factuurprecies bedrag. Configureer `session.quota_cap` in `.agents/oma-config.yaml` om harde budgetten af te dwingen bij het spawnen; zie de pagina Waarom oh-my-agent in Aan de slag voor de kwaliteitsgerichte hulpmiddelen waarbij deze limieten horen.

Metrieken worden opgeslagen in `.agents/state/metrics.json`; een legacy `.serena/metrics.json` wordt gelezen als die bestaat. Gegevens komen uit git-statistieken en memorybestanden.

**Voorbeelden:**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap

Vat de gespreksgeschiedenis van AI-tools in Claude-, Codex-, Qwen- en Cursorsessies samen.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--window <period>` | Tijdvenster: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Specifieke datum (`YYYY-MM-DD`); heeft voorrang op `--window` | |
| `--tool <tools>` | Kommagescheiden filter: `grok,claude,codex,qwen,cursor,antigravity` | alle |
| `--top <n>` | Toon de bovenste N projecten/onderwerpen | |
| `--sort <metric>` | Sorteer op `count` of `duration` | `count` |
| `--mermaid` | Geef een Mermaid-Gantt-grafiek terug | |
| `--graph` | Open een interactieve grafiek in de browser | |
| `--json` / `--output <format>` | Machineleesbare uitvoer | `text` |

**Voorbeelden:**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro

Technische terugblik met metrieken en trends.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Argumenten:**

| Argument | Beschrijving | Standaard |
|:---------|:-----------|:--------|
| `window` | Tijdvenster voor analyse (bijvoorbeeld `7d`, `2w`, `1m`) | Afgelopen 7 dagen |

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |
| `--interactive` | Interactieve modus met handmatige invoer |
| `--compare` | Vergelijk het huidige venster met het vorige venster van dezelfde lengte |

**Wat het toont:**
- Deelbare samenvatting (metrieken op één regel)
- Overzichtstabel (commits, gewijzigde bestanden, toegevoegde/verwijderde regels, bijdragers)
- Trends tegenover de vorige retro (als er een vorige momentopname bestaat)
- Ranglijst van bijdragers
- Verdeling van commitmomenten (histogram per uur)
- Werksessies
- Uitsplitsing van committypen (feat, fix, chore enzovoort)
- Hotspots (meest gewijzigde bestanden)

**Voorbeelden:**
```bash
# Last 7 days (default)
oma retro

# Last 30 days
oma retro 30d

# Last 2 weeks
oma retro 2w

# Compare with previous period
oma retro 7d --compare

# Interactive mode
oma retro --interactive

# JSON for automation
oma retro 7d --json
```

---

## Sessies en lokale profielen

### state list

Toon de OMA-workflowsessies van het huidige project. Expliciete globale ontdekking
verzamelt sessies uit projecten binnen het geselecteerde lokale profiel:

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` is alleen-lezen. Je kunt deze vlag niet combineren met sessieactivatie of
onderhoud. Normale sessielees- en schrijfacties behouden hun projectscope.
Legacy-sessies van andere repositories moeten eerst naar homeopslag worden gemigreerd
voordat ze in de gecombineerde lijst verschijnen.

### profile

Beheer lokale opslagprofielen onder `~/.oma/u/<slot>/`. Slots zijn
niet-negatieve decimale gehele getallen; ze staan los van modelpresets en
providerloginaccounts.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` print shellactivatie; bij evaluatie wordt `OMA_PROFILE` in de
huidige shell ingesteld. Het wijzigt de bovenliggende shell niet wanneer je het op zichzelf uitvoert, verandert al draaiende applicaties niet en slaat geen afzonderlijke CLI-standaard op. CLI-commando's
en vendorhooks die vanuit de geactiveerde shell starten, erven hetzelfde profiel.
Het standaardprofiel is `0`; `OMA_STATE_HOME` overschrijft de opslagroot.
`profile run <slot> -- <command> [args...]` selecteert het profiel alleen voor dat
commando en zijn kinderen. De scheiding zorgt dat opties zoals `--help`
en `--json` aan het kindcommando gekoppeld blijven.

---

## Agentbeheer

### agent spawn

Spawn een subagentproces.

```
oma agent spawn <agent-id> <prompt> <session-id> [--vendor <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Argumenten:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `agent-id` | Ja | Agenttype. Een van: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` |
| `prompt` | Ja | Taakomschrijving. Kan inline tekst of een bestandspad zijn. |
| `session-id` | Ja | Sessie-ID (formaat: `session-YYYYMMDD-HHMMSS`) |

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--vendor <vendor>` | Overschrijving van de CLI-vendor: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Werkmap voor de agent. Wordt automatisch uit monorepo-configuratie gedetecteerd wanneer je deze weglaat. |
| `--resumed-from <run-id>` | Koppelt een nieuwe poging aan de run-ID van de vorige run. |
| `--task-id <id>` | Taak-ID uit het sessieplan. Standaard de agent-ID. |
| `--isolation <mode>` | Isolatiemodus per spawn. Ondersteunt momenteel `worktree`: maakt een verse git-worktree aan op `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` op branch `oma/{sessionId}/{agentId}` en voert de agent daar uit. De worktree blijft na afloop behouden; merge- of discard-commando's worden afgedrukt voor handmatige beoordeling (geen automatische merge). |
| `--read-only` | Beperk de gespawnde agent tot niet-destructieve tools (onderdrukt auto-approve-flags). Intern gebruikt door `oma skill eval --live` voor beide evalarmen. |
| `--fallback-vendors <vendors>` | Kies expliciet voor een geordende, kommagescheiden keten van maximaal drie geconfigureerde CLI-vendors. Doorgaan vereist een herkende quota-, rate-limit- of tijdelijke fout en een nieuw safe-handoff-checkpoint. |

**Volgorde voor vendorresolutie:** vlag `--vendor` > `agents:`-overschrijving in `oma-config.yaml` > standaardwaarden van agents in de actieve `model_preset`.

**Promptresolutie:** als het promptargument een pad naar een bestaand bestand is, wordt de bestandsinhoud als prompt gebruikt. Anders wordt het argument als inline tekst gebruikt. Vendorspecifieke uitvoeringsprotocollen worden automatisch toegevoegd.

**Exitcodes:**

| Code | Betekenis |
|:-----|:--------|
| `0` | Het vendorproces eindigde met 0 en er bestaat een sessieresultaat-artifact in de workspace. |
| `3` | Het vendorproces eindigde met 0 maar schreef **geen sessieresultaat-artifact** in de workspace (bijvoorbeeld agy dat naar zijn eigen vertrouwde root schrijft in plaats van naar `-w`). Een `blocker.raised`-event wordt aan het sessiespoor toegevoegd en `agent status` meldt `no-artifact`. Beschouw de spawn niet als voltooid. |
| overige | Het vendorproces zelf is mislukt; de exitcode wordt doorgegeven. |

**Voorbeelden:**
```bash
# Inline prompt, auto-detect workspace
oma agent spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude -w ./api

# Allow a prepared task handoff to another configured vendor
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude --fallback-vendors codex,qwen -w ./api

# Mobile agent with auto-detected workspace
oma agent spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

**Vendorfailover:** fallbackkandidaten moeten een vendorvermelding in de
geïnstalleerde CLI-configuratie hebben. Elke poging gebruikt de modelconfiguratie van de
doelvendor en doorloopt de bestaande sessiequotacontroles. De multi-providerproxy
`pi` is uitgesloten van deze eerste vendorfallbackfunctie.
Er worden geen extra providercredentials of betaalde API-routes aangemaakt.

Wanneer failover is ingeschakeld, krijgt de taak instructies om een
run-specifiek safe-handoffrecord onder `.agents/results/` voor te bereiden. Een opvolger leest
dat record en controleert de workspace voordat het resterende werk doorgaat.
Uitputting van het quota zonder bruikbaar checkpoint stopt met een needs-reviewrecord.
Annulering, gewone taalfouten en voltooide runs starten geen nieuwe poging. `--read-only`
heft de checkpointverplichting niet op.

Sessiegebeurtenissen leggen de overgangsreden en bron-/doelvendors vast; elke
poging heeft een eigen runidentiteit en de opvolger verwijst naar zijn voorganger.
Dit geldt voor subprocessen die door `oma agent spawn` worden gestart; een bestaande interactieve conversatie in een vendorapp schakelt niet automatisch om.
Als je `--fallback-vendors` weglaat, blijft de gebruikelijke uitvoering met één vendor actief.

### agent status

Controleer de status van een of meer subagents.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Argumenten:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `session-id` | Ja | Het te controleren sessie-ID |
| `agent-ids` | Nee | Door spaties gescheiden lijst met agent-ID's. Als deze ontbreekt, is er geen uitvoer. |

**Opties:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Rootpad voor memorycontroles | Huidige map |

**Statuswaarden:**
- `completed`: het resultaatbestand bestaat (met optionele statusheader).
- `running`: het PID-bestand bestaat en het proces leeft.
- `crashed`: het PID-bestand bestaat maar het proces is gestopt, of er is geen PID-/resultaatbestand gevonden.
- `no-artifact`: het vendorproces eindigde met 0 maar schreef geen sessieresultaat-artifact in de workspace (stille verkeerd gerichte schrijfactie — zie exitcode `3` van `agent spawn`). Behandel dit als een mislukte spawn.

**Uitvoerformaat:** één regel per agent: `{agent-id}:{status}`

**Voorbeelden:**
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel

Voer meerdere subagents parallel uit.

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

**Argumenten:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `tasks` | Ja | Een pad naar een YAML-takenbestand of (met `--inline`) inline taakspecificaties |

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--vendor <vendor>` | Overschrijving van de CLI-vendor voor alle agents |
| `-i, --inline` | Inline-modus: geef taken op als argumenten in de vorm `agent:task[:workspace]` |
| `--no-wait` | Achtergrondmodus (start agents en keert direct terug) |

**Indeling van het YAML-takenbestand:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Indeling van inline-taken:** `agent:task` of `agent:task:workspace` (workspace moet beginnen met `./` of `/`).

**Resultatenmap:** `.agents/results/parallel-{timestamp}/` bevat logbestanden voor elke agent.

**Voorbeelden:**
```bash
# From YAML file
oma agent parallel tasks.yaml

# Inline mode
oma agent parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent parallel tasks.yaml --vendor claude
```

### agent review

Voer een codereview uit met een externe AI-CLI (codex, claude, qwen of grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--vendor <vendor>` | Te gebruiken CLI-vendor: `codex`, `claude`, `qwen` of `grok`. Valt terug op `codex` wanneer de opgeloste configuratievendor niet wordt ondersteund. |
| `-p, --prompt <prompt>` | Aangepaste reviewprompt. Zonder deze optie wordt een standaardcodereviewprompt gebruikt. |
| `-w, --workspace <path>` | Te reviewen pad. Standaard de huidige werkmap. |
| `--no-uncommitted` | Sla de review van niet-vastgelegde wijzigingen over. Dan worden alleen wijzigingen uit de huidige sessie beoordeeld die al zijn vastgelegd. |

**Wat het doet:**
- Detecteert het huidige sessie-ID automatisch uit de omgeving of recente gitactiviteit.
- Voor `codex`: gebruikt het native subcommando `codex review`.
- Voor `claude` en `qwen`: stelt een reviewaanvraag met prompt samen en roept de CLI aan met de reviewprompt.
- Beoordeelt standaard niet-vastgelegde wijzigingen in de werkmap.
- Met `--no-uncommitted` beperkt de review zich tot wijzigingen die in de huidige sessie zijn vastgelegd.

**Voorbeelden:**
```bash
# Review uncommitted changes with default vendor
oma agent review

# Review with codex (uses native codex review command)
oma agent review --vendor codex

# Review with claude using a custom prompt
oma agent review --vendor claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent review --no-uncommitted

# Review committed changes in a specific workspace with qwen
oma agent review --vendor qwen -w ./apps/web --no-uncommitted
```

### Doel instellen {#goal-set}

Koppel een doelcontract aan een actieve persistente workflow (orchestrate, ultrawork, work, ralph). Het contract wordt mechanisch afgedwongen door de Stop-hook van de persistente modus; voltooiing is daardoor geen inschatting van het model.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--gate <keyword>` | Deterministische stopgate: `typecheck`, `test` of `lint`. Koppelt aan het gelijknamige script in package.json, uitgevoerd als argv-array zonder shell. Zolang deze is ingesteld, mag de Stop-hook de workflow **alleen beëindigen wanneer dit script slaagt**; bij een fout blokkeert de hook met het einde van de uitvoer zodat de agent weet wat moet worden hersteld. Vrije commando's worden geweigerd — de gatewaarde staat in een door de agent beschrijfbaar statusbestand, dus willekeurige tekenreeksen daaruit uitvoeren zou de toestemmingslaag omzeilen. |
| `--budget-minutes <n>` | Klokbudget gemeten vanaf workflowactivatie. Wanneer dit wordt overschreden, deactiveert de Stop-hook de workflow en staat een eerlijke gedeeltelijke stop toe (machineverdict, vastgelegd als `gate.failed` met `gate: "budget"` in het sessiegebeurtenisspoor). |
| `--description <text>` | Menselijke beschrijving van het doel. Alleen informatief. |
| `--workflow <name>` | Doelworkflow wanneer meerdere persistente workflows actief zijn. |
| `--session <id>` | Achtervoegsel van het sessie-ID in het statusbestand. |

**Gedragsnotities:**
- Gate geslaagd → de workflow wordt gedeactiveerd, `gate.passed` wordt uitgegeven en de stop wordt toegestaan.
- Een gatefout en time-out (harde limiet van 60 s) tellen beide mee voor de reinforcementlimiet (5), zodat een permanent rode gate stops niet eindeloos blokkeert; de vervaltijd van 2 uur bij veroudering blijft de laatste beveiliging.
- Zonder doelcontract gedraagt de persistente modus zich precies als voorheen (alleen reinforcementprompts); het contract is volledig opt-in.

**Voorbeelden:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Geplande agents

### schedule create

Registreer een geplande agentjob. Precies één van `--cron` of `--every` is verplicht.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Argumenten:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `agent-id` | Ja | Agenttype: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Ja | Taakomschrijving die op het startmoment aan de agent wordt doorgegeven |

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--cron "<expr>"` | Cronexpressie met 5 velden (bijvoorbeeld `"0 9 * * *"`). Kan niet samen met `--every`. |
| `--every "<phrase>"` | Interval in natuurlijke taal: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Rondt af naar de dichtstbijzijnde in cron uitdrukbare stap en print een notitie. Kan niet samen met `--cron`. |
| `--vendor <vendor>` | CLI-vendoroverschrijving die aan `oma agent spawn` wordt doorgegeven: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Standaard automatische detectie. |
| `-w, --workspace <path>` | Werkmap voor de agent. Standaard de huidige map op het registratiemoment. |
| `--once` | Eenmalige modus: wordt één keer uitgevoerd en verwijdert zichzelf daarna. |
| `--expires-after <duration>` | Laat een terugkerende job automatisch na N dagen vervallen (`0` = onbeperkt). |
| `--env <KEY1,KEY2>` | Sla benoemde env-vars op in `~/.agents/schedule/env/<id>` (0600) voor injectie tijdens de run. Alleen de opgegeven sleutels worden vastgelegd; nooit een volledige env-dump. |

**Wat het doet:**
1. Parseert en valideert de cronexpressie (of zet de `--every`-zin om naar cron).
2. Schrijft de job naar `~/.agents/schedule/schedules.json` (globaal manifest, rechten 0600).
3. Registreert de job bij de OS-scheduler (launchd / systemd --user / schtasks). De OS-job roept `oma schedule run <id>` aan volgens het geconfigureerde interval.

**Voorbeelden:**
```bash
# Exact cron: weekdays at 9 AM
oma schedule create qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule create backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule create pm "Generate sprint plan" --cron "0 9 * * 1" --once --vendor claude -w /path/to/project

# Capture specific env vars for the job
oma schedule create backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

Zie de [gids voor geplande agents](../guide/scheduled-agents.md) voor een volledige rondleiding.

### schedule list

Toon alle geplande jobs in alle projecten, gegroepeerd per project, met de OS-driftstatus.

```
oma schedule list [--json]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON |

**Driftstatussen:** `synced` (manifest en OS zijn gelijk), `stale` (de OS-registratie roept een commando aan dat de huidige CLI niet meer accepteert; voer `schedule sync` uit om die te herschrijven, `oma update` doet dat automatisch), `missing-in-os` (voer `schedule sync` uit om te herstellen), `orphan-in-os` (OS heeft een job die niet in het manifest staat; voer `schedule sync --prune` uit om die te verwijderen).

**Voorbeelden:**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete

Verwijder een geplande job uit zowel het manifest als de OS-scheduler.

```
oma schedule delete <id>
```

**Argumenten:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `id` | Ja | Job-ID uit `schedule list` (formaat: `sch_<base32-12>`) |

**Voorbeeld:**
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Voer een geplande job uit op ID. Dit is het ingangspunt dat de OS-scheduler op het startmoment aanroept. Normaal niet handmatig uitvoeren, maar wel bruikbaar om een job te debuggen.

```
oma schedule run <id>
```

**Wat het doet:**
1. Zoekt `<id>` op in het manifest (sluit af met een niet-nulcode als het niet wordt gevonden).
2. Laadt vastgelegde env-vars uit `~/.agents/schedule/env/<id>` en injecteert ze.
3. Roept `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>` aan.
4. Schrijft het resultaat naar `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Werkt `lastFiredAt` in het manifest bij; verwijdert zichzelf als de job `--once` is.
6. Faalt luid bij verlopen authenticatie: sluit af met een niet-nulcode en print `re-auth required: <vendor>` naar stderr. Slaagt nooit stilzwijgend.

**Voorbeeld:**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Synchroniseer het manifest opnieuw met de OS-scheduler. Herstelt drift na systeemmigraties of resets van de OS-scheduler.

```
oma schedule sync [--prune]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--prune` | Verwijder ook OS-jobs die niet in het manifest staan (orphan-in-os). Zonder `--prune` worden verweesde jobs gemeld maar niet verwijderd. |

**Voorbeelden:**
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Geheugenbeheer

### memory init

Initialiseer het schema van de coordination memory store.

```
oma memory init [--json] [--output <format>] [--force]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |
| `--force` | Overschrijf lege of bestaande schemabestanden |

**Wat het doet:** Creates the `.agents/state/memories/` directory structure with initial schema files that agents and workflows use for reading and writing coordination state.

**Voorbeelden:**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Integraties en hulpprogramma's

### auth status

Controleer de authenticatiestatus van alle ondersteunde CLI's.

```
oma auth status [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |

**Controles:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI en Qwen CLI.

**Voorbeelden:**
```bash
oma auth status
oma auth status --json
```

### bridge

Proxy MCP-stdio naar een gedeelde Serena-server per project.

```
oma bridge [url] [--context <name>]
```

**Argumenten:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `url` | Nee | Maak verbinding met een door de aanroeper beheerd endpoint in plaats van een gedeelde daemon op te lossen |
| `--context` | Nee | Serena-context voor de daemon (standaard `ide`); daemons worden hierop gesleuteld |

**Wat het doet:** dit is wat de serena-MCP-entry van elke vendor standaard uitvoert —
je roept het niet handmatig aan. Serena's stdio-transport geeft elke agentsessie
een eigen Pythonproces plus een volledige language-serverstack, waardoor de kosten
meeschalen met het aantal open sessies. De bridge brengt dit terug tot één server per
project: hij bepaalt de projectroot vanuit de werkmap, start een aan `--project`
gekoppelde Serena-HTTP-server als er nog geen draait en proxyt de sessie ernaartoe.

Het vastzetten van `--project` is belangrijk — een server die zonder deze vlag start, stelt de
tool `activate_project` beschikbaar, waarmee elke sessie het project onder alle andere sessies vandaan kan wisselen.

**Architectuur:**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Levenscyclus:** de eerste sessie start de server, latere sessies hergebruiken hem en
elke proxy registreert zichzelf als client. Wanneer de laatste sessie loskoppelt, blijft de
server 10 minuten warm — een restart koppelt opnieuw — en anders wordt hij door de
volgende bridge die start afgesloten. Als de gedeelde server niet bereikbaar is,
valt de proxy terug op een sessielokale stdio-serena.

Schakel dit uit met `serena.mode: stdio` in `.agents/oma-config.yaml`.

**Voorbeeld:**
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Verifieer subagentuitvoer aan de hand van de verwachte criteria.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**Argumenten van `verify agent`:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `agent-type` | Ja | Een van: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Opties:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Te verifiëren workspacepad | Huidige map |
| `--json` | Geef uitvoer als JSON | |
| `--output <format>` | Uitvoerformaat (`text` of `json`) | |

**Wat het doet:** voert het verificatiescript voor het opgegeven agenttype uit en controleert buildsucces, testresultaten en scopeconformiteit.

`verify triggers` meet de nauwkeurigheid van de keyworddetector op een gelabeld promptcorpus. De procentuele drempels zijn gates. Het geregistreerde pad is `verify agent`; de oude spelling op hoofdniveau kan nog in compatibiliteitshelp voorkomen.

**Gemeenschappelijke controles (alle agenttypen):**
- **Scopecontrole**: leest taakscope uit `.agents/results/plan-{sessionId}.json`. Vergelijkt gewijzigde bestanden uit `git diff` met de gedefinieerde scopepatronen. Faalt als bestanden buiten de toegewezen agentscope zijn gewijzigd.
- **Charter-preflight**: controleert of `result-{agent}.md` een juist ingevuld blok `CHARTER_CHECK:` zonder open placeholders bevat.
- **Hardcoded secrets**: scant `.py`-, `.ts`-, `.tsx`-, `.js`- en `.dart`-bestanden op patronen zoals `password = "..."` en `api_key = "..."` (test- en voorbeeldbestanden uitgesloten).
- **TODO/FIXME-commentaar**: telt commentaren met `TODO`, `FIXME`, `HACK` en `XXX` (waarschuwt als er een wordt gevonden).

**Agentspecifieke controles:**

| Agenttype | Aanvullende controles |
|:-----------|:-----------------|
| `backend` | Python-syntaxisvalidatie (`py_compile`), detectie van SQL-injectie (f-string + SQL-trefwoorden), Python-tests uitvoeren (`pytest`) |
| `frontend` | TypeScript-compilatie (`tsc --noEmit`), detectie van inline styles (`style={{`), gebruik van type `any` (faalt bij > 3), frontendtests (`vitest`) |
| `mobile` | Flutter/Dart-analyse (`flutter analyze` of `dart analyze`), Flutter-tests (`flutter test`) |
| `qa` | Zelfcontrole |
| `debug` | Voert Python- of frontendtests uit op basis van het gedetecteerde projecttype |
| `pm` | Valideert dat `.agents/results/plan-{sessionId}.json` bestaat en geldige JSON bevat |

**Uitvoerformaat:**
Elke controle meldt `PASS`, `FAIL`, `WARN` of `SKIP` met een detailbericht. Het totaalresultaat is alleen `ok: true` als geen enkele controle faalt.

**Voorbeelden:**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook

Stuur een vendor-hookevent door de gecentraliseerde oma-hookrouter (design 019). Dit is de canonieke ABI die door de gegenereerde `oma-hook.sh`-wrapper van elke vendor wordt aangeroepen. Je kunt het ook rechtstreeks gebruiken om handlerketens geïsoleerd te debuggen of te testen.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Opties:**

| Vlag | Verplicht | Beschrijving |
|:-----|:---------|:-----------|
| `--vendor <v>` | Ja | Vendoridentiteit. Een van: `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro` of `qwen`. (De vendor `pi` is hier **niet** geldig — die gebruikt de in-process `installPiExtension`-bridge in plaats van `oma hook run`.) |
| `--event <e>` | Ja | Native hookeventnaam zoals geregistreerd in de vendorsettings (bijvoorbeeld `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | Nee | Optionele toolnaam/matcher die vanuit de hookregistratie wordt doorgegeven (bijvoorbeeld `Bash`) |

**Stdin-/stdout-contract:**
- **stdin**: vendor-native JSON-payload (hetzelfde object dat de vendor aan hookprocessen doorgeeft).
- **stdout**: JSON in het vendordialect (of platte tekst voor kiro-prompts) wanneer een handler afgaat; leeg wanneer geen handler uitvoer produceert.
- **exitcode**: altijd `0` (fail-open — fouten worden naar stderr geschreven en de agent wordt nooit geblokkeerd).

**Gegevensstroom tijdens runtime:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Handlerketens geïsoleerd debuggen:**

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor codex --event Stop

# Test an Antigravity BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor antigravity --event BeforeTool
```

Lege stdout betekent dat de keten voor dat event een no-op produceerde. Een JSON-object op stdout is het vendordialect dat de agentsessie zou ontvangen.

**Notities over scope:**
- `statusLine`/hud-items worden niet via `oma hook run` gerouteerd (weergave op het hot path blijft via een direct `bun`-pad lopen).
- De pi-vendor gebruikt de in-process `installPiExtension`-bridge, niet `oma hook run`.
- Dubbele leveringen van een dubbele installatie (project + globaal) worden binnen `oma hook run` genegeerd (identieke payload die door een andere `oma-hook.sh`-wrapper is gestart); verschillende events, waaronder parallelle toolaanroepen, worden altijd uitgevoerd.

Zie `cli/commands/hook/command.ts` voor de routerimplementatie (intern aangeduid als "design 019") en `cli/commands/hook/probe/` voor de compatibiliteitsmatrix per vendor.

**Voorbeelden:**
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook run --vendor qwen --event Stop

# Check Antigravity hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor antigravity --event BeforeAgent
```

---

### hook probe

Controleer hookcompatibiliteit per vendor en print een dekkingsmatrix.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Opties:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--vendor <list>` | Kommagescheiden vendors om te controleren | Alle ondersteunde vendors |
| `--output <fmt>` | Uitvoerformaat: `text`, `md` of `json` | `text` |
| `--hooks-dir <dir>` | Overschrijf de map `.agents/hooks/core` | Automatisch gedetecteerd |

**Wat het controleert:** controleert per vendor of de core-hookscripts (`keyword-detector`, `persistent-mode` enzovoort) aanwezig zijn en of de variant-JSON events juist naar handlerketens mapt. Exitcode `1` als een vendor status `failed` meldt.

**Voorbeelden:**
```bash
# Text matrix for all vendors
oma hook probe

# Markdown matrix (useful in CI PR comments)
oma hook probe --output md

# JSON for programmatic consumption
oma hook probe --output json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook probe --vendor claude,codex,antigravity
```

---

### vault

Beheer API-sleutels en andere secrets in de OS-keychain (macOS Keychain, Linux Secret Service of Windows Credential Manager), met `@napi-rs/keyring` als backend. Waarden verschijnen nooit in shellgeschiedenis of omgevingsbestanden; alleen sleutelnamen worden bijgehouden in `~/.config/oma/vault-index.json`, zodat `oma vault list` ze kan opsommen zonder geheime waarden bloot te geven.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Subcommando's:**

| Subcommando | Beschrijving |
|:------------|:-----------|
| `store <name>` | Vraagt om een secretwaarde (verborgen invoer) en schrijft die onder `name` naar de OS-keychain. `--value <value>` accepteert de waarde inline voor niet-interactief gebruik (zichtbaar in shellgeschiedenis; gebruik bij voorkeur de prompt). |
| `get <name>` | Print de opgeslagen waarde zonder opmaak naar stdout zodat die in shells kan worden gebruikt: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Sluit af met code `2` als de sleutel niet bestaat. |
| `list` | Toont opgeslagen sleutelnamen met hun tijdstempels `createdAt`. Waarden worden nooit getoond. |
| `rm <name>` | Verwijdert het secret uit de keychain en de index. |

**Regels voor sleutelnamen:** 1–64 tekens uit `[A-Za-z0-9._-]`. Voorbeelden: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Native afhankelijkheid:** de native module `@napi-rs/keyring` wordt lazy geladen; als dat mislukt (bijvoorbeeld headless Linux zonder `libsecret` of `gnome-keyring`), geeft het commando een expliciete fout met installatietip in plaats van stilzwijgend terug te vallen.

**Voorbeelden:**
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault delete anthropic
```

### cleanup

Ruim verweesde subagentprocessen en tijdelijke bestanden op.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--dry-run` | Toon wat zou worden opgeschoond zonder wijzigingen aan te brengen |
| `-y, --yes` | Sla bevestigingsvragen over en ruim alles op |
| `--json` | Geef uitvoer als JSON |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |

**Wat het opschoont:**
- Verweesde PID-bestanden in de tijdelijke systeemmap (`/tmp/subagent-*.pid`).
- Verweesde logbestanden (`/tmp/subagent-*.log`).
- **Verweesde Serena-language-servers** — wanneer een MCP-client (bijvoorbeeld Claude) afsluit, wordt `serena start-mcp-server` aan init gekoppeld en blijven de LSP-kindprocessen (`tsserver`, `pyright`, …, honderden MB) zonder client draaien. Deze worden hier opgeruimd. Het geval *inactief maar nog gekoppeld* wordt apart afgehandeld door [`serena reap`](#serena).
- Gemini Antigravity-mappen (brain, implicit, knowledge) onder `.gemini/antigravity/`.

**Voorbeelden:**
```bash
# Preview what would be cleaned
oma cleanup --dry-run

# Clean with confirmation prompts
oma cleanup

# Clean everything without prompts
oma cleanup --yes

# JSON output for automation
oma cleanup --json
```

### serena

Maak geheugen vrij van Serena's language-servers per project. Serena spawnt per open project een LSP-
stack (`tsserver`, `pyright`, …, ~300 MB) en houdt die de hele sessie warm — bij meerdere open projecten telt dit snel op. De reaper beëindigt
inactieve LSP-kindprocessen; Serena herstelt zichzelf en spawnt ze opnieuw bij de volgende toolcall (geen
restart nodig).

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Subcommando's:**

| Commando | Beschrijving |
|:--------|:-----------|
| `serena reap` | Ruim nu eenmaal inactieve LSP's op. Interactieve runs worden altijd uitgevoerd; `--quiet` (het geplande pad) respecteert de opt-in `enabled`. |
| `serena reap --dry-run` | Bekijk opruimdoelen en verwachte vrijgemaakte geheugenruimte; beëindigt nooit processen. |
| `serena reaper enable` | Installeer een achtergrondtaak die elke 5 minuten `serena reap --quiet` uitvoert (launchd / systemd-timer / Windows Task Scheduler). |
| `serena reaper disable` | Verwijder de achtergrondtaak. |

**Beleid:** `lru` (standaard) houdt de meest recent actieve projecten volgens `keepWarm`
warm en ruimt de rest op; `idle` ruimt elk project op dat langer dan `idleMinutes` inactief is. Een
venster van `graceSeconds` beschermt lopende toolcalls.

**Configuratie** (`.agents/oma-config.yaml`, opt-in — standaard uitgeschakeld):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Diagnostiek (KEEP/REAP-status per project en bron van het activiteitsignaal) wordt
getoond door [`oma doctor`](#doctor). Verweesde Serena-LSP's (met een dode client) worden
ongeacht deze instelling opgeruimd door [`oma cleanup`](#cleanup).

**Voorbeelden:**
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper enable

# Turn it back off
oma serena reaper disable
```

### visualize

Visualiseer de projectstructuur als afhankelijkheidsgraaf.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` is een ingebouwde alias voor `visualize`.

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |

**Wat het doet:** analyseert de projectstructuur en genereert een afhankelijkheidsgraaf die relaties tussen skills, agents, workflows en gedeelde resources toont.

**Voorbeelden:**
```bash
oma visualize
oma viz --json
```

### search

Mechanische zoekprimitieven voor fetch, metadata, RSS, media, code en trustscoring. Heeft alias `oma s`. Alle subcommando's schrijven JSON naar stdout (één object per regel, of mooi opgemaakt met `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcommando's:**

| Subcommando | Doel |
|:-----------|:--------|
| `fetch <url>` | Haal een URL op via een strategie-pipeline die automatisch opschaalt (api → probe → impersonate → browser → archive) |
| `api <url>` | Haal op via de passende platform-API-handler (fase 0) |
| `api:search <query>` | Zoek de trefwoorden uit over platforms die dit ondersteunen (`--platforms <list>`) |
| `meta <url>` | Haal OGP- / JSON-LD- / Schema.org-metadata op |
| `rss <url>` | Ontdek en parse een RSS- / Atom-feed |
| `rss:google <query>` | Bouw een Google News RSS-URL voor een query |
| `media <url>` | Haal mediametadata op via `yt-dlp` (1858 sites) |
| `archive <url>` | Haal op via AMP / archive.today / Wayback als fallback |
| `trust <domain>` | Bepaal het vertrouwensniveau en de score van een domein |
| `code <query>` | Zoek in code via `gh` (GitHub) of `glab` (GitLab) |
| `doctor` | Controleer afhankelijkheden (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Algemene opties voor URL-/query-subcommando's:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Time-out per strategie | `15` (`30` voor `media`) |
| `--locale <value>` | `Accept-Language`-header | `en-US,en;q=0.9` |
| `--pretty` | Maak JSON-uitvoer leesbaar op | `false` |

**Extra opties voor `fetch`:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--only <strategies>` | Kommagescheiden strategieën om uit te voeren (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Kommagescheiden strategieën om over te slaan |
| `--include-archive` | Voeg de archiefstrategie toe als laatste fallback |

**Extra opties voor `media`:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--subs` | Schrijf ondertitels |
| `--sub-lang <list>` | Ondertitelingstalen, kommagescheiden (standaard: `en`) |
| `--format <spec>` | yt-dlp-formaatspecificatie |

**Extra opties voor `code`:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Host | `github` |
| `--language <lang>` | Taalfilter | |
| `--repo <owner/repo>` | Beperk tot een repository | |
| `--limit <n>` | Maximaal aantal resultaten | `20` |

**Exitcodes:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

**Voorbeelden:**

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

Het register biedt ook deze expliciete ontdekkingshelpers:

```bash
# Inspect which providers are registered without making a network request
oma search providers --json

# Use the selected web provider with bounded output
oma search web "latest browser automation" --limit 10 --timeout 30s --pretty

# Fetch metadata and feeds directly
oma search meta https://example.com/article --pretty
oma search media https://example.com/video --subs --sub-lang en --pretty
oma search archive https://example.com/article --pretty

# Platform API and RSS routes
oma search api fetch https://example.com/article --pretty
oma search api search "RAG patterns" --platforms hackernews,reddit --pretty
oma search rss fetch https://example.com/feed.xml --pretty
oma search rss google "browser automation"
```

`search` geeft ook zonder `--json` JSON uit. `--pretty` verandert alleen de presentatie en niet het resultschema. `search web` accepteert `--provider`, `--limit`, `--timeout`, `--json` en `--pretty`. Als een strategie is geblokkeerd of een afhankelijkheid ontbreekt, gebruik dan de bovenstaande exitcodetabel en voer `oma search doctor` opnieuw uit voordat je strategieën wijzigt.

### image

AI-afbeeldingen genereren met meerdere vendors en authenticatiebewuste parallelle dispatch. Heeft alias `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcommando's:**

| Subcommando | Doel |
|:-----------|:--------|
| `generate <prompt...>` | Genereer afbeeldingen via `pollinations` (flux/zimage, gratis), `codex` (gpt-image-2 via ChatGPT OAuth) of `antigravity` (nano-banana via Gemini Code Assist-abonnement, zonder sleutel) |
| `doctor` | Controleer authenticatie en installatiestatus per vendor |
| `vendor list` | Toon geregistreerde vendors en ondersteunde modellen |

**Opties voor `image generate`:**

| Vlag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | Elke `WxH` met randen deelbaar door 16, 16–3840 en beeldverhouding 1:3–3:1; `auto` is ook toegestaan. | vendorstandaard |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | vendorstandaard |
| `-n, --count <n>` | Aantal afbeeldingen (1..5) | `1` |
| `--output-dir <path>` | Uitvoermap | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | Sta uitvoerpaden buiten `$PWD` toe | `false` |
| `--model <name>` | Vendorspecifieke modeloverschrijving; wordt genegeerd door `antigravity`, waarvan het model ondoorzichtig is. | vendorstandaard |
| `--timeout <duration>` | Time-out per afbeelding | vendorstandaard |
| `-r, --reference <path>` | Referentieafbeelding(en); herhaalbaar of kommagescheiden. Ondersteund op `codex` en `antigravity`; afgewezen op `pollinations`. Elke afbeelding ≤5MB PNG/JPEG/GIF/WebP (magic bytes gevalideerd), maximaal 10. | |
| `-y, --yes` | Sla kostenbevestiging over | `false` |
| `--no-prompt-in-manifest` | Sla de SHA256 van de prompt op in plaats van de ruwe tekst | `false` |
| `--dry-run` | Print plan en kostenraming; voer niets uit | `false` |
| `--output <format>` | CLI-uitvoerformaat: `text` \| `json` | `text` |

Elke run schrijft naast de gegenereerde afbeeldingen een `manifest.json` met vendor, model, prompt (of hash), grootte, kwaliteit en kosten.

**Voorbeelden:**

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or antigravity)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor antigravity -r a.png -r b.png
oma image generate "blend these styles" --vendor antigravity -r a.png,b.png

# Per-vendor doctor check
oma image doctor --output json
```

### video

Plan, schrijf en render korte uitleg- en demovideo's. `generate` maakt de brief, het script, de renderspecificatie en het runmanifest; voor een echte MP4 zijn eerst een compositie en werkende compositor nodig.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` accepteert `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor hyperframes|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` en `--capture-stop duration:<seconds>|selector:<css>`. Gebruik `--source web --url <url>` voor browseropname; `--source file` is de standaard. `--output-dir` kiest de runroot, `--allow-external-output` staat een pad buiten `$PWD` toe, `--max-usd` stelt een kostenplafond in, `-y, --yes` slaat de kostenbevestiging over, `--seed` stabiliseert planningsinvoer, `--timeout` begrenst elke aanroep van een visual- of muziekprovider, `--script` injecteert een door de agent geschreven `script.json` en `--no-brief-in-manifest` slaat een briefhash op in plaats van de tekst. `--dry-run` stopt na de planning. `--output text|json` bepaalt de CLI-envelop.

`doctor` controleert de gecachete HyperFrames/MPT-toolchain en accepteert `--install`, `--upgrade`, `--install-mpt` en `--install-strudel`. `provider list` rapporteert providerbeschikbaarheid en sleutelstatus. `compose` zet de runcompositie op of vernieuwt die en rapporteert het authoringcontract; `render` voert lint uit, rendert en controleert de uitvoer. Ontbrekende compositor-, compositie- of toolchaindependency's zijn fouten. Het alleen voor tests bedoelde pad `OMA_VIDEO_MOCK=1` is de enige placeholdermodus; een normale run vervangt een MP4 nooit door een tekst- of klein bestand.

Geslaagde JSON-uitvoer bevat `runDir`, `manifestPath`, `scriptPath` en `renderSpecPath`; het manifest legt geselecteerde providers, invoer en gegenereerde assets vast. Schrijf na `compose` de gegenereerde compositie volgens `AUTHORING.md` en voer daarna `render` opnieuw uit. Als een providersleutel niet beschikbaar is, voer `oma video doctor` uit; als capture mislukt, controleer URL, selector, device en time-out; als renderen mislukt, herstel eerst de compositiediagnostiek.

### star

Geef oh-my-agent een GitHub-star.

```
oma star
```

Geen opties. Vereist een geïnstalleerde en geauthenticeerde `gh`-CLI. Geeft de repository `first-fluke/oh-my-agent` een star.

**Voorbeeld:**
```bash
oma star
```

### describe

Beschrijf CLI-commando's als JSON voor runtime-introspectie.

```
oma describe [command-path]
```

**Argumenten:**

| Argument | Verplicht | Beschrijving |
|:---------|:---------|:-----------|
| `command-path` | Nee | Het te beschrijven commando. Zonder waarde wordt het hoofdprogramma beschreven. |

**Wat het doet:** geeft een JSON-object met de naam, beschrijving, argumenten, opties en subcommando's van het commando. AI-agents gebruiken dit om de beschikbare CLI-mogelijkheden te begrijpen.

**Voorbeelden:**
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Onderzoeks- en artifactcommando's

Deze families zijn nuttig wanneer de uitvoer een onderzoeksartifact, presentatie of rapport is. Ze zijn hier bewust kort gehouden; de gekoppelde gidsen leggen workflow en herstelkeuzes uit.

### intel suggest

Stel productwerk voor op basis van markt- en repositorysignalen:

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` levert de volledige configuratie. Voor eenmalige runs selecteren `--topic`, `--target`, `--repos`, `--since` en `--last-commits` de invoer. `--output-dir` bepaalt lokale rapporten en `--fixture` levert een lokaal JSON-fixture voor deterministische review. `--create-issue` maakt voor geaccepteerde kandidaten een issue aan in GitHub en vereist een geconfigureerd doel plus bevestiging; combineer dit met `--base-repo <owner/name>` om de repository te kiezen en gebruik `--yes` alleen in een al goedgekeurde automatiseringscontext. `--dry-run` en `--json` zijn veilige inspectiepaden.

### market

De marketfamilie delegeert naar de opgeloste upstream-engine `last30days`. Begin met de gate en resolver:

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` geeft exitcode 2 terug met een herformulering voor keyword traps of te brede onderwerpen; `--force` omzeilt die gate alleen wanneer de gebruiker expliciet wil doorgaan. `market resolve` accepteert `--refresh` en `--offline`, en `market update` vernieuwt de cache van de beheerde engine. `market run` geeft de resterende argumenten door aan de opgeloste Python-engine en voegt `--save-dir` uit `market.save_dir` toe wanneer een onderwerp is opgegeven. Lees [Marktonderzoek](../guide/market-research.md) voordat je upstreamflags kiest; de `--help`-uitvoer hoort bij de beheerde engine en verandert per release.

### docs

Gebruik de docs-familie om documentatiedrift te inspecteren. De commando's zijn rapportgericht; `sync` geeft kandidaten aan de host-agent en bewerkt zelf geen bestanden.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` controleert lokale verwijzingen en genereert `docs/generated/doc-refs.json` opnieuw; `--urls-sync` wacht op de optionele `lychee`-URL-pass. `sync` gebruikt standaard eerst gestagede wijzigingen en daarna `HEAD~1..HEAD`, en geeft kandidaten `{doc, changedFiles, matchedRefs}` uit. `i18n` rapporteert structurele drift tussen Engels en vertaling, terwijl `lint` stijlproblemen in vertaalde documenten meldt. Geen van deze subcommando's bewerkt docs automatisch.

### slide

`oma slide` werkt op een werkmap met HTML-slidefragmenten van 1920×1080. Een minimaal werkpad is:

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

De kwaliteitsgate rapporteert bevindingen over overflow, overlap en lettergrootte. Gebruik `--slide <file>` voor controle van één slide en `--report-file <path>` met JSON-uitvoer. Exporteer pas na validatie:

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

PPTX-export is experimenteel en rastergebaseerd. `slide import pptx <file>`, `slide asset fetch-video <url>` en `slide style list|preview|get <slug>` dekken invoerassets en stijldiscovery. Gebruik [oma-slide](../guide/content-and-research.md#slides-and-presentations) voor schrijfkeuzes en de beperkingen van het vaste podium.

### scholar

Zoek papers en werkmetadata en valideer sidecars voordat je ze deelt:

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` kan OpenAlex-resultaten beperken met `--year-min` en fallbackproviders afdwingen met `--always-fallback`. `get --section` accepteert `statements`, `evidence`, `relations`, `artifacts` of `citation`. `lint --lenient` verlaagt loshangende kruisrecordverwijzingen naar waarschuwingen; `--fail-on-warning` laat waarschuwingen in CI als fout gelden. De CLI zoekt eerst in Knows en daarna via OpenAlex en Semantic Scholar; sidecars worden niet upstream ingediend.

### explain

`/explain` is de schrijfworkflow. De CLI rendert het concept dat de workflow schrijft en valideert het resultaat:

```
oma explain render draft.md --archify
oma explain components flow
oma explain patch .agents/results/explain/2026-09-09-change.html --panel C panel.md
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

`render` zet een Markdown-concept (een bestand, of stdin met `-`) om in één zelfstandige HTML-pagina op `.agents/results/explain/{YYYY-MM-DD}-{slug}.html`; met `--output-file` kies je een ander pad. Het concept bevat alleen inhoud: één paneel per `## `-kop, met daarin componentblokken (`flow`, `sequence`, `tree`, `timeline`, `limits`, `annot`, `kv`, `callout`, `quiz`). De renderer berekent de diagramindeling, verdeelt de panelen over rijen en past het thema toe (`--theme blueprint|card`, `--mode auto|light|dark`). `--style off|warn|strict` bepaalt de tekstcontrole; bij `strict` mislukt het renderen al bij één waarschuwing. `--archify` leidt een interactief archify-diagram af uit een `flow`- of `sequence`-blok en linkt ernaar; als die stap mislukt, wordt de pagina toch geschreven. `components [name]` toont de syntaxis van een component. `patch` vervangt één paneel op basis van het concept dat in de pagina is ingesloten.

Geef een bestand of `--input-dir` op, niet beide. Validatie controleert het contract voor zelfstandig HTML en rapporteert machineleesbare fouten; de nauwkeurigheid van de uitleg wordt niet beoordeeld. Zie [Code-uitlegger](../guide/code-explainer.md).

### diagram

Bepaal de engine voordat een workflow een structureel diagram genereert:

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` accepteert `--engine auto|archify|mermaid`, `--refresh` en `--offline`. `diagram update` vernieuwt de beheerde archify-kopie. `diagram archify` geeft de resterende argumenten door aan het opgeloste upstream-executable en geeft diens exitcode door. Mermaid blijft de Markdown-bron van waarheid; de HTML is een afgeleid artifact. Zie [Diagramengine](../guide/diagram-engine.md).

## Inspectie van state, modellen en memory

De volgende families geven toegang tot persistente workflowstatus en model-/providerdiagnostiek. Geef bij opschoonachtige acties de voorkeur aan `--dry-run` en gebruik `--json` wanneer een ander programma het resultaat verwerkt.

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state trajectory <session-id>
oma state trajectory <session-id> --open
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` legt één L1-event vast met expliciete categorie- en sessiemetadata. `state migrate` verplaatst legacy-sessies naar het geselecteerde profiel. `state repair` herstelt ongeldige statusbestanden. `state decisions list` en `state inject-log list|get` inspecteren verplichte beslissingen en injectie-auditregels. `state trajectory` koppelt de L1-events van een sessie aan de transcripten van de vendorsessies waarin die draaide. Het resultaat is één overzicht, beurt voor beurt, van prompts, modelantwoorden, toolaanroepen, duur en tokengebruik; `--open` toont het in het webdashboard op `/trajectory`. Transcripten worden gelezen uit de sessieopslag van elke vendor: Claude Code, Codex, Antigravity, Grok, Qwen Code, Kiro, pi, Command Code, Kimi, DeepSeek Harness en Cursor. `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `KIMI_SHARE_DIR` en `DSH_HOME` worden gerespecteerd. Kiro legt alleen bij prompts een tijdstip vast, en Cursor legt geen tijdstippen of toolresultaten vast; een Cursor-transcript wordt daarom volledig getoond in plaats van afgebakend tot de sessie. Een vendor zonder leesbaar transcript verschijnt alleen met zijn L1-events. `state activate`, `state archive` en `state purge` zijn expliciete acties; de oude booleaanse actievlaggen worden geweigerd. Archiveer of purge pas na controle van een dry-run, omdat deze commando's de lokale status wijzigen.

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` vergelijkt het register met actuele vendorlijsten en kan nieuwe kandidaten testen. `model probe` test één slug tegen de CLI van de vendor. `model propose` geeft een `oma-config`-patch met `models:` uit; gebruik `--write` alleen wanneer je configuratie wilt wijzigen. Beschikbaarheid en quota van een vendor kunnen probes laten mislukken, ook wanneer een registervermelding geldig is.

### agent evidence commands

Native agentruns gebruiken een op bewijs gebaseerde reeks:

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` laadt grafiekgeselecteerde context; `begin` start een run en print een gegenereerd run-ID plus claimpad; `verify` ontvangt dat run-ID en voert de vastgelegde controles uit (`--required`) of beperkt ze met `--affected`; `finish` ontvangt het run-ID en het pad naar het claimbestand. `agent resume --dry-run` meldt welke taken klaar en herbruikbaar zijn, en `agent resume --max-attempts <n>` probeert alleen taken opnieuw die volgens het plan zijn toegestaan. Zie [Agentresultaten en hervatten](../guide/agent-results-and-resume.md) voor plan en claimvorm. Deze commando's zijn voor het OMA-uitvoeringscontract; voor gewoon gebruikerswerk kun je `agent spawn`, `agent parallel` of `agent review` gebruiken.

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` configureert Honcho-verbinding of embeddingcredentials; `--dry-run` toont bestemmingen zonder sleutels te lezen of schrijven. `memory setup` bereidt een AgentMemory-endpoint voor en kan dit optioneel `--install`eren of `--start`en. `memory daemon` en `memory service` beheren lokale processen of OS-service-integratie. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade` en `memory gc` zijn onderhoudsacties; inspecteer hun JSON- of dry-run-uitvoer voordat je ze toepast.

## Skillbeheer

### skills audit

Controleer geïnstalleerde skills op overlappende beschrijvingen, black-hole-generalisme en routingverval door bibliotheekgrootte.

```
oma skill audit [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--json` | Geef uitvoer als JSON voor CI/CD |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |

**Wat het controleert:**
- **Paargewijze beschrijvingsovereenkomst**: TF-IDF-cosinusovereenkomst tussen elk paar geïnstalleerde skills. Waarschuwt vanaf ≥ 60% en faalt vanaf ≥ 75%.
- **Black-hole-detectie**: markeert elke skill waarvan de gemiddelde overeenkomst met alle andere een positieve uitschieter is (≥ gemiddelde + 1,5 × standaardafwijking), wat wijst op een te algemene beschrijving die routing kan kapen.
- **Verval door bibliotheekgrootte**: waarschuwt wanneer meer dan 60 skills zijn geïnstalleerd (routingnauwkeurigheid neemt logaritmisch af naarmate de bibliotheek groeit).
- **Focuscontrole**: waarschuwt wanneer een skill uitgroeit tot een bundel — meer dan 20 referencedocs (`.md`-bestanden naast `SKILL.md`, vendortrees uitgesloten) of een `SKILL.md`-body van meer dan 25.000 tekens. Gerichte skills presteren beter dan bundels (SkillsBench, arXiv:2602.12670); splitsen is de oplossing, verwijderen niet.

**Exitcodes:** `0` alle bevindingen in de waarschuwingszone of geen bevindingen; `1` minstens één paar in de foutzone.

**Voorbeelden:**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Detecteer schrijfproblemen per skill: kwaliteitsgebreken binnen één `SKILL.md`, in tegenstelling tot `skills audit`, dat relaties *tussen* skills controleert. Gebaseerd op de skill-smell-taxonomie van arXiv:2607.01456 (meer dan 99% van de SKILL.md-bestanden uit het wild bevat minstens één smell).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--skill <id>` | Lint één skill |
| `--json` | Geef uitvoer als JSON voor CI/CD |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |

**Algemene smells (elke skill):**

| Smell | Ernst | Betekenis |
|:------|:---------|:--------|
| `missing-name` | fail | frontmatter `name` ontbreekt of is leeg |
| `missing-description` | fail | frontmatter `description` ontbreekt of is leeg — routing is ervan afhankelijk |
| `weak-description` | warn | beschrijving korter dan 40 tekens — te dun als basis voor routing |
| `body-too-long` | warn | SKILL.md-body langer dan 500 regels — verplaats details naar `resources/` achter progressive disclosure |
| `template-placeholder` | warn | achtergebleven tekst `{Placeholder}` buiten codespans |
| `broken-reference` | fail | verwijst naar een niet-bestaand bestand in `resources/`, `config/`, `scripts/` of `assets/` |

**SSL-lite-smells** (SSL-lite-validatie is verplicht wanneer de gedeclareerde naam van een skill of de zichtbare directory-/aliasnaam met `oma-` begint, ook zonder `## Scheduling`; een alias zonder voorvoegsel kan een gedeclareerde `oma-`-naam niet omzeilen. Gewone skills zonder voorvoegsel kiezen voor het formaat door `## Scheduling` op te nemen):

| Smell | Ernst | Betekenis |
|:------|:---------|:--------|
| `ssl-structure` | fail | secties op hoofdniveau wijken af van `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | niet precies één `### Canonical command path` of `### Canonical workflow path` |
| `missing-boundaries` | warn | geen `### When NOT to use` — skills zonder afbakening kapen routing |
| `empty-failure-recovery` | warn | `### Failure and recovery` ontbreekt of is leeg (bullets of tabelrijen zijn toegestaan) — leg foutmechanismen vast volgens SkillLens |

**Exitcodes:** `0` geen smells met ernst fail; `1` minstens één fail-smell.

**Voorbeelden:**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Meet de bruikbaarheid per skill: verbetert het laden van een skill de resultaten op achtergehouden taken? Dit is de *utility*-tegenhanger van `skills audit` (die overlap tussen beschrijvingsgrenzen meet). Waar `audit` vraagt "zijn twee skills redundant?", vraagt `eval` "helpt deze skill?"

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Opties:**

| Vlag | Beschrijving |
|:-----|:-----------|
| `--skill <id>` | Te evalueren skill-ID (eenvoudige naam, zonder padscheidingstekens). Standaard `_all`. |
| `--mock` | Speel vastgelegde rollouts uit `_rollouts/` opnieuw af (standaard; deterministisch, zonder LLM-dispatch). Veilig voor CI. |
| `--live` | Live agent-dispatch — start per taak twee armen (baseline en treatment) via `oma agent spawn --read-only`. Print een kostenpreview en vraag om bevestiging, tenzij `--yes`. |
| `--record` | Schrijf vastgelegde live-rollouts (inclusief judgeverdicten) naar `_rollouts/` voor later afspelen met `--mock`. Alleen zinvol met `--live`. |
| `--yes` | Sla de bevestigingsvraag voor de kostenpreview over. Alleen zinvol met `--live`. |
| `--task-dir <path>` | Overschrijf de map met taakfixtures (moet binnen de workspaceroot liggen). Standaard: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Beperk het aantal geëvalueerde taken (toegepast in deterministische sorteervolgorde). |
| `--require-coverage` | Sluit af met een niet-nulcode wanneer minder dan 5 taken zijn gevonden (voorkomt stilgroen in CI). |
| `--json` | Geef uitvoer als JSON voor CI/CD |
| `--output <format>` | Uitvoerformaat (`text` of `json`) |

**Werking:**

Voor elke taakfixture in `.agents/eval/<skill>/`:
1. **Baseline-arm** — de taakprompt wordt verstuurd zonder de skill te laden.
2. **Treatment-arm** — `SKILL.md` wordt voor de prompt geplaatst en daarna verstuurd.
3. Elke arm wordt door zijn checker gescoord (standaard judge; assert of regex voor deterministische opt-ins).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Beslissingen:**

| Beslissing | Voorwaarde |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (exitcode 1) |
| `insufficient` | Minder dan 5 scorebare taken (exitcode 1 alleen met `--require-coverage`) |

**Aanbevolen modus:** gebruik `--live` met judgecheckers om de werkelijke skillutility te meten. Gebruik `--mock` om vastgelegde judgeverdicten offline opnieuw af te spelen of deterministische `assert`/`regex`-contractcontroles uit te voeren.

**Omgevingsvariabele:** `OMA_SKILLEVAL_MOCK=1` forceert mockmodus ongeacht de vlaggen.

**Exitcodes:** `0` pass of warn; `1` fail of onvoldoende dekking met `--require-coverage`.

**Voorbeelden:**
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skill eval --skill oma-scholar

# Live run with cost preview
oma skill eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skill eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skill eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skill eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skill eval --skill oma-scholar --max-tasks 10
```

Zie de [gids voor Skill Utility Eval](../guide/skill-eval.md) voor het fixtureformaat van `.agents/eval/` en de checkertypen.

---

### skills opt

Optimaliseer een `SKILL.md` volgens persistente evolutie in WikiSkill-stijl. Een Maintainer bundelt waarneembaar rolloutbewijs tot afgebakende kennis, een Proposer geeft begrensde add/delete/replace-edits uit en afgewezen uitkomsten blijven tussen runs bestaan. Kandidaten moeten de achtergehouden validatiesplit strikt verbeteren; `--apply` vereist daarnaast strikte verbetering op een door de runner beheerde eindtestsplitsing. Onderzoeksbasis: WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Opties:**

| Vlag | Standaard | Beschrijving |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Te optimaliseren skill-ID (eenvoudige naam, zonder padscheidingstekens). |
| `--dry-run` | **ja (standaard)** | Stel edits voor en print de diff zonder `SKILL.md` te wijzigen; gegenereerd evolutiebewijs wordt nog steeds vastgelegd. |
| `--apply` | — | Pas geaccepteerde edits toe; maakt vóór een atomische schrijfactie een back-up van het origineel en schrijft alleen een gevalideerde verbetering. |
| `--mock` | **ja (standaard)** | Speel vastgelegde optimizer-edits en evalverdicten opnieuw af (deterministisch, offline). Veilig voor CI. |
| `--live` | — | Live LLM-optimizerdispatch — maakt per epoch echte modelcalls. Print een kostenpreview en vraagt om bevestiging, tenzij `--yes`. |
| `--max-epochs <n>` | `8` | Maximum aantal optimalisatie-epochs. |
| `--edits-per-epoch <k>` | `4` | Aantal voorgestelde kandidaat-edits per epoch. |
| `--lr <chars>` | `600` | Tekstueel learning-ratebudget: maximale netto tekenwijziging per edit. |
| `--yes` | — | Sla de kostenpreviewbevestiging over (alleen met `--live`). |
| `--json` | — | Geef uitvoer als JSON voor CI/CD. |
| `--output <format>` | `text` | Uitvoerformaat (`text` of `json`). |

**Harde afhankelijkheid:** vereist minstens 5 taakfixtures in `.agents/eval/<skill>/`. Geeft een duidelijke fout als er minder worden gevonden. Zie de [gids voor Skill Utility Eval](../guide/skill-eval.md) om ze te schrijven.

**Train/validation/test-splitsing:** fixtures worden deterministisch verdeeld in 60/20/20. De Maintainer en Proposer zien alleen TRAIN-bewijs, kandidaatselectie gebruikt achtergehouden VALIDATION-taken en de door de runner beheerde TEST-split blijft verborgen tot de evolutie klaar is. `--apply` schrijft alleen wanneer zowel validatie- als eindtestlift strikt verbetert.

**SSOT-opmerking:** skills met een ID dat met `oma-` begint, worden overschreven door `oma update`. Voor zulke skills wordt `--apply` afgeraden — gebruik de standaard `--dry-run` en stuur de voorgestelde diff upstream. Op skills van gebruikers kan dit vrij worden toegepast.

**Exitcodes:** `0` optimalisatie voltooid; `1` onvoldoende fixtures of ongeldig argument.

**Voorbeelden:**
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skill optimize --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skill optimize --skill oma-scholar --json

# Tune epochs and edits budget
oma skill optimize --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

Zie de [gids voor Skill Optimization](../guide/skill-opt.md) voor de volledige walkthrough en details over SSOT- en overfittingbewaking.

---

### harness eval

Vergelijk een kandidaat-overlay van `.agents/` met de huidige OMA-harness op gekoppelde, geïsoleerde repositorytaken. De doelagent en vendorroute blijven vast; deterministische controles scoren de bestanden en uitvoer die elke arm produceert.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Vlag | Beschrijving |
|:-----|:------------|
| `--suite <path>` | Vereiste suite-YAML. De suite- en fixtureworkspaces moeten binnen de projectroot liggen. |
| `--candidate <path>` | Vereiste kandidaatroot met een scoped `.agents/`-overlay. |
| `--mock` | Speel een vastgelegde run met overeenkomende hash opnieuw af (standaard; deterministisch en offline). |
| `--live` | Voer baseline- en kandidaatarmen uit via de doelagent van de suite. |
| `--record` | Bewaar een live-run voor later afspelen met mock. Vereist `--live`. |
| `--record-file <path>` | Overschrijf het opnamepad; dit moet binnen de projectroot blijven. |
| `--yes` | Sla de kostenbevestiging voor de live-run over. |
| `--timeout-minutes <n>` | Time-out per arm, gelijk voor baseline en kandidaat. Standaard: `15`. |
| `--require-coverage` | Sluit af met een niet-nulcode wanneer minder dan vijf gekoppelde taken scorebaar zijn. |
| `--json` | Geef de volledige evaluatie als JSON. |
| `--output <format>` | Uitvoerformaat (`text` of `json`). |

**Beslissingsgate:** pass vereist minstens 5 gekoppelde taken, een lift van minstens 5 procentpunten en nul regressies. Een regressie faalt altijd. Dekking onder het minimum is `insufficient` en geeft alleen met `--require-coverage` een niet-nulcode.

**Isolatie:** kandidaatbestanden mogen alleen inhoud in `.agents/agents`, `.agents/rules`, `.agents/skills` en `.agents/workflows` vervangen in de tijdelijke kandidaatarm. Hooks, configuratie, status, evalfixtures, symlinks, vendorvarianten, beschermde wijzigingen aan frontmatter voor agentuitvoering en vendor-harnessbestanden die bij fixtures horen, worden geweigerd. Een arm faalt als die tijdens uitvoering beschermde definities wijzigt. Vendordiscovery via HOME wordt voor live-evaluatie geweigerd. De primaire agentroute ligt vast; modelpinnen van geneste subagents worden nog niet afgedwongen.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Zie de [gids voor Harness Evaluation](../guide/harness-eval.md) voor het suiteschema, ondersteunde controles, isolatiemodel en huidige beperkingen.

### harness incident promote

Maak van een vastgelegd incident een regressiefixture voor de skill waar de falende agent gebruik van maakte.

```
oma harness incident promote <id> [--skill <id>] [--draft] [--force] [--json]
```

### harness feedback

Promoot elk incident dat nog niet is gepromoot en optimaliseer, met `--live` of `--apply`, elke getroffen skill tegen zijn uitgebreide suite.

```
oma harness feedback [--scan-runs] [--live] [--apply] [--max-epochs <n>] [--incident <ids...>] [--json]
```

Zie de [gids voor Incident Regression Cases](../guide/harness-incidents.md).

---

### help

Toon helpinformatie.

```
oma help
```

Toont de volledige helptekst met alle beschikbare commando's.

### version

Toon het versienummer.

```
oma version
```

Geeft de huidige CLI-versie terug en sluit af.

---

## Omgevingsvariabelen

| Variabele | Beschrijving | Gebruikt door |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Stel in op `json` om JSON-uitvoer af te dwingen op alle commando's die dit ondersteunen | Alle commando's met vlag `--json` |
| `DASHBOARD_PORT` | Poort voor het webdashboard | `dashboard web` |
| `MEMORIES_DIR` | Overschrijf het pad naar de memorymap | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Stel in op `1` om mockmodus in `oma skill eval` af te dwingen, ongeacht de vlaggen | `skills eval` |
| `OMA_HOOK_DEDUP` | Stel in op `0` om het onderdrukken van dubbele leveringen in `oma hook run` uit te schakelen. | `hook` |
| `OMA_HOOK_DEDUP_DIR` | Overschrijf de privémap voor claims die wordt gebruikt om dubbele hookleveringen te onderdrukken (standaard: `$XDG_RUNTIME_DIR/oma-hook-dedup`, anders `<tmpdir>/oma-hook-dedup-<uid>`). | `hook` |

---

## Aliassen

| Alias | Volledig commando |
|:------|:------------|
| `viz` | `visualize` |
