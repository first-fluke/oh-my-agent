---
title: "CLI-opties"
description: Uitputtende referentie voor alle CLI-opties, met globale flags, uitvoerbeheer, opties per commando en praktische gebruikspatronen.
---

# CLI-opties

## Globale opties

Deze opties zijn beschikbaar op het hoofdcommando `oma` / `oh-my-agent`:

| Flag | Beschrijving |
|:-----|:-----------|
| `-g, --global` | Werk met de HOME-installatie (`~/.agents/`) in plaats van met `<cwd>/.agents/`. |
| `-y, --yes` | Sla bevestigingsvragen over wanneer het gekozen commando bevestiging ondersteunt; veiligheidscontroles per commando blijven van kracht. |
| `-V, --version` | Toon het versienummer en sluit af. |
| `-h, --help` | Toon de help voor het commando. |

Alle subcommando's ondersteunen ook `-h, --help` om hun eigen helptekst te tonen.

`--global` stelt de installatieroot voor het hele proces in. Daardoor verwijzen `install`, `update`, `link` en `uninstall` altijd naar `~/.agents/`, ongeacht de map van waaruit je ze uitvoert. `OMA_HOME=<abs-path>` overschrijft deze instelling — zie [Globale installatie](../guide/global-install.md).

---

## Uitvoeropties

Veel commando's ondersteunen machineleesbare uitvoer voor CI/CD-pipelines en automatisering. Je kunt op drie manieren JSON-uitvoer aanvragen, in deze prioriteitsvolgorde:

### 1. --json-vlag

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

De vlag `--json` is alleen beschikbaar op de afzonderlijke paden die dit expliciet aangeven. Leid ondersteuning niet af uit een commandofamilie: `image`, `video` en `slide` bieden bijvoorbeeld `--output` op de paden waar het register dit vermeldt, terwijl `search` een eigen JSON-stream heeft. De registermatrix aan het einde van deze pagina is de gezaghebbende lijst per pad.

### 2. --output-vlag

```bash
oma stats get --output json
oma doctor --output text
```

De vlag `--output` accepteert `text` of `json`. Deze biedt dezelfde functionaliteit als `--json`, maar laat je ook expliciet tekstuitvoer aanvragen (handig wanneer de omgevingsvariabele op json staat en je voor één commando tekst wilt).

**Validatie:** bij een ongeldig formaat geeft de CLI deze fout: `Invalid output format: {value}. Expected one of text, json`.

### 3. Omgevingsvariabele OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Stel deze omgevingsvariabele in op `json` om JSON-uitvoer af te dwingen voor alle commando's die dit ondersteunen. Alleen `json` wordt herkend; elke andere waarde wordt genegeerd en valt terug op tekst.

**Volgorde:** vlag `--json` > vlag `--output` > omgevingsvariabele `OH_MY_AG_OUTPUT_FORMAT` > `text` (standaard).

### Commando's met JSON-uitvoer

| Commando | `--json` | `--output` | Opmerkingen |
|:--------|:---------|:----------|:------|
| `doctor` | Ja | Ja | Bevat CLI-controles, MCP-status en skillstatus. |
| `stats` | Ja | Ja | Volledig metriekobject. |
| `retro` | Ja | Ja | Momentopname met metrieken, auteurs en committypen. |
| `cleanup` | Ja | Ja | Lijst van opgeschoonde items. |
| `auth status` | Ja | Ja | Authenticatiestatus per CLI. |
| `memory init` | Ja | Ja | Resultaat van de initialisatie. |
| `verify agent` / `verify triggers` | Ja | Ja | Verificatieresultaten per controle. |
| `visualize` | Ja | Ja | Afhankelijkheidsgraaf als JSON. |
| `describe` | Altijd JSON | n.v.t. | Geeft altijd JSON-uitvoer (introspectiecommando). |
| `recap` | Ja | Ja | Gespreksgeschiedenis per tool/sessie. |
| `image generate` / `image doctor` / `image vendor list` | n.v.t. | Ja | Gebruik `--output json`; `vendor list` is het canonieke ontdekkingspad. |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | n.v.t. | Ja | Gebruik `--output json` voor de run-envelop of het gereedheidsrapport. |
| `explain validate` | Ja | Ja | Validatierapport van het artifact. |
| `diagram resolve` / `diagram update` | Ja | Ja | Engine-resolutie of resultaat uit de beheerde cache. |
| `market resolve` / `market update` | Ja | Ja | Status van de beheerde research-engine. |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Ja | n.v.t. | Elk docs-pad gebruikt zijn eigen rapportopties. |
| `search ...` | Altijd JSON | n.v.t. | Alle `search`-subcommando's streamen JSON; gebruik `--pretty` voor leesbare uitvoer. |

---

## Opties per commando

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

De interactieve installer schrijft de geselecteerde providerinstellingen naar `.agents/oma-config.yaml`. De providerflags kiezen de integraties voor websearch, code-intelligentie en semantisch geheugen; `--honcho-url` en `--honcho-workspace` configureren de Honcho-geheugendienst wanneer die provider is gekozen. De rootflag `-y, --yes` geldt wanneer een installatieproces om bevestiging vraagt.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--json` | Geef JSON terug in plaats van opgemaakte tekst. | `false` |
| `--output <format>` | Expliciet uitvoerformaat (`text` of `json`). Zie [Uitvoeropties](#uitvoeropties). | `text` |
| `--profile` | Toon de profielgezondheidsmatrix (opgeloste modelslug, CLI en authenticatiestatus per agent uit de actieve `model_preset`- en `agents:`-overschrijvingen). Zie [Modellen per agent](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Overschrijf tijdens de update door de gebruiker aangepaste configuratiebestanden. Dit betreft `oma-config.yaml`, `mcp.json` en `stack/`-mappen. Zonder deze vlag worden deze bestanden vóór de update geback-upt en daarna teruggezet. | `false` |
| `--with-new-skills` | | Installeer skills die sinds de huidige installatie aan het register zijn toegevoegd. | `false` |
| `--ci` | | Voer uit in niet-interactieve CI-modus. Sla alle bevestigingsvragen over en gebruik gewone console-uitvoer in plaats van spinners en animaties. Vereist voor CI/CD-pipelines zonder stdin. | `false` |
| `--yes` | `-y` | Sla bevestigingsvragen over. Maakt geen ontbrekende vendormappen aan tenzij dit wordt gecombineerd met `--all` of `--vendor`. | `false` |
| `--all` | | Maak alle ondersteunde projectgebonden vendors aan of werk ze bij. | `false` |
| `--vendor <vendors>` | | Maak een kommagescheiden vendorlijst aan of werk die bij, bijvoorbeeld `claude,qwen`. | Alleen bestaande vendormappen |

`oma update mcp` gebruikt dezelfde besturing met `--yes`, `--ci`, `--all` en `--vendor` bij het kiezen van browser-MCP-servers. Dit commando gebruikt `--force` en `--with-new-skills` niet.

**Gedrag met --force:**
- `oma-config.yaml` wordt vervangen door de standaard uit het register.
- `mcp.json` wordt vervangen door de standaard uit het register.
- De backendmap `stack/` (taalspecifieke resources) wordt vervangen.
- Alle andere bestanden worden altijd bijgewerkt, ongeacht deze vlag.

**Gedrag met --ci:**
- Geen `console.clear()` bij de start.
- `@clack/prompts` wordt vervangen door `console.log`.
- Vragen over concurrentdetectie worden overgeslagen.
- Fouten worden gegooid in plaats van `process.exit(1)` aan te roepen.

**Vendorbereik:**
- `oma update` werkt alleen vendormappen bij die al bestaan.
- `oma update --yes` gebruikt hetzelfde vendorbereik, zonder vragen.
- `oma update --all` maakt alle ondersteunde projectgebonden vendors aan of werkt ze bij.
- `oma update --vendor claude,qwen` maakt alleen de opgegeven vendors aan of werkt ze bij.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Flag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--json` | Geef het resetresultaat terug als JSON. | `false` |
| `--output <format>` | Geef `text` of `json` terug. | `text` |

`oma stats reset` is het resetcommando. De voormalige schrijfwijze `oma stats get --reset` maakt geen deel uit van het huidige openbare oppervlak.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--interactive` | Interactieve modus met handmatige gegevensinvoer. Vraagt aanvullende context die niet uit git kan worden gehaald (bijvoorbeeld stemming en opvallende gebeurtenissen). | `false` |
| `--compare` | Vergelijk het huidige tijdvenster met het vorige venster van dezelfde lengte. Toont verschilmetrieken (bijvoorbeeld commits +12, toegevoegde regels -340). | `false` |

**Indeling van het venster:**
- `7d`: 7 dagen
- `2w`: 2 weken
- `1m`: 1 maand
- Laat weg voor de standaardwaarde (7 dagen)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Voorbeeldmodus. Somt alle items op die zouden worden opgeschoond, maar wijzigt niets. Exitcode 0, ongeacht de bevindingen. | `false` |
| `--yes` | `-y` | Sla alle bevestigingsvragen over. Ruimt alles op zonder vragen. Handig in scripts en CI. | `false` |

**Wat wordt opgeschoond:**
1. Verweesde PID-bestanden: `/tmp/subagent-*.pid` waarvan het aangewezen proces niet meer draait.
2. Verweesde logbestanden: `/tmp/subagent-*.log` die bij beëindigde PID's horen.
3. Gemini Antigravity-mappen: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Deze verzamelen na verloop van tijd status en kunnen groot worden.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Koppel een retry aan de voorafgaande run-ID. | |
| `--fallback-vendors` | — | Expliciete, geordende kommagescheiden keten van fallback-vendors. | |
| `--task-id` | — | Taak-ID uit het sessieplan. | Agent-ID |
| `--vendor` | — | Overschrijving van de CLI-vendor. De runtime accepteert `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` of `pi`. | Uit configuratie opgelost |
| `--workspace` | `-w` | Werkmap voor de agent. Als deze ontbreekt of `.` is, detecteert de CLI de workspace automatisch aan de hand van monorepo-configuratiebestanden (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Automatisch gedetecteerd of `.` |
| `--isolation` | — | Isolatiemodus: `worktree` maakt per spawn een git-worktree aan; de standaard is `none`. | `none` |
| `--read-only` | — | Beperk de gespawnde agent tot niet-destructieve tools en onderdruk auto-approve-flags. | `false` |

**Validatie:**
- `agent-id` moet een van deze waarden zijn: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` mag geen `..`, `?`, `#`, `%` of control-tekens bevatten.
- `vendor` moet een van deze waarden zijn: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Vendorgedrag:**

| Vendor | Commando | Flag voor automatisch goedkeuren | Promptflag |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | geen | `-p` |
| codex | `codex` | `--sandbox workspace-write` | geen; prompt is positioneel |
| cursor | `cursor-agent` | vendorafhankelijk | `-p` |
| opencode | `opencode` | vendorafhankelijk | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | vendorafhankelijk | `-p` |
| pi | `pi` | onderdrukt in de modus `--read-only` | prompt is positioneel |

Deze standaardwaarden kunnen worden overschreven in `.agents/skills/oma-orchestration/config/cli-config.yaml`.

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Rootpad voor het vinden van memorybestanden (`.agents/state/memories/result-{agent}.md`) en PID-bestanden. | Huidige werkmap |

**Logica voor statusbepaling:**
1. Als `.agents/state/memories/result-{agent}.md` bestaat, wordt de header `## Status:` gelezen. Zonder header wordt `completed` gemeld.
2. Als er een PID-bestand op `/tmp/subagent-{session-id}-{agent}.pid` bestaat, wordt gecontroleerd of de PID actief is. Bij een actieve PID wordt `running` gemeld, anders `crashed`.
3. Als geen van beide bestanden bestaat, wordt `crashed` gemeld.

### agent parallel

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | Overschrijving van de CLI-vendor die op alle gespawnde agents wordt toegepast. | Per agent uit configuratie opgelost |
| `--inline` | `-i` | Interpreteer taakargumenten als tekenreeksen in de vorm `agent:task[:workspace]` in plaats van als een bestandspad. | `false` |
| `--no-wait` | | Achtergrondmodus. Start alle agents en keert direct terug zonder op voltooiing te wachten. PID-lijst en logs worden opgeslagen in `.agents/results/parallel-{timestamp}/`. | `false` (wacht op voltooiing) |

**Indeling van inline-taken:** `agent:task` of `agent:task:workspace`
- De workspace wordt gedetecteerd door te controleren of het laatste segment na een dubbele punt begint met `./`, `/` of gelijk is aan `.`.
- Voorbeeld: `backend:Implement auth API:./api` — agent=backend, taak="Implement auth API", workspace=./api.
- Voorbeeld: `frontend:Build login page` — agent=frontend, taak="Build login page", workspace=automatisch gedetecteerd.

**Indeling van het YAML-takenbestand:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--window <period>` | Tijdvenster: `1d`, `3d`, `7d`, `2w`, `30d`. Wordt genegeerd wanneer `--date` is ingesteld. | `1d` |
| `--date <date>` | Specifieke datum (`YYYY-MM-DD`). Heeft voorrang op `--window`. | |
| `--tool <tools>` | Filter sessies op tool. Kommagescheiden: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | alle tools |
| `--top <n>` | Toon alleen de bovenste N projecten/onderwerpen in het overzicht. | onbeperkt |
| `--sort <metric>` | Sorteer sessies op `count` of `duration`. | `count` |
| `--mermaid` | Geef een Mermaid-Gantt-grafiek terug in plaats van het standaardoverzicht. | `false` |
| `--graph` | Open een interactieve grafiek in de browser. Kan niet samen met `--mermaid`. | `false` |

> **Opmerking:** Het genereren van vendorregelbestanden (bijvoorbeeld `.cursor/rules`) uit geïnstalleerde skills gebeurt via [`oma link <vendor>`](./commands.md#link), niet via een afzonderlijk `export`-commando.

### search

```
oma search <subcommand> [...]
```

De groep `search` heeft een eigen JSON-uitvoer (geen vlaggen `--json` / `--output`). Gebruik `--pretty` op URL-/query-subcommando's om resultaten leesbaar op te maken en gebruik de onderstaande opties per subcommando:

| Subcommando | Belangrijke opties |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (standaard `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (standaard `en`), `--format <spec>`, `--timeout` (standaard `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (standaard `github`), `--language`, `--repo`, `--limit` (standaard `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | geen (voert binaire controles uit voor Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Exitcodes:** `0` ok, `1` fout, `2` geblokkeerd, `3` niet gevonden, `4` ongeldige invoer, `5` authenticatie vereist, `6` time-out. Gebruik deze in scripts om tijdelijke blokkades van ongeldige invoer te onderscheiden.

### image

```
oma image <subcommand> [...]
```

Het uitvoerformaat wordt per subcommando geregeld met `--output <text|json>`.

`image generate` accepteert:

| Flag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` wordt opgelost vanuit de actieve `image:`-configuratie en beschikbare authenticatie. | `auto` |
| `--size <size>` | | `WxH` waarbij beide randen deelbaar zijn door 16, 16–3840 bedragen, de beeldverhouding 1:3–3:1 is, of `auto`. | vendorstandaard |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | vendorstandaard |
| `--count <n>` | `-n` | Aantal afbeeldingen, 1..5. | `1` |
| `--output-dir <dir>` | | Uitvoermap. Deze moet binnen `$PWD` liggen tenzij `--allow-external-output` is ingesteld. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Sta `--output-dir`-paden buiten `$PWD` toe. | `false` |
| `--model <name>` | | Leverancierspecifieke modeloverschrijving. Het antigravity-model wordt door `agy` geselecteerd. | vendorstandaard |
| `--timeout <duration>` | | Time-out per afbeelding met een duurwaarde. | vendorstandaard |
| `--reference <path>` | `-r` | Referentieafbeelding voor overdracht van stijl/onderwerp. Herhaalbaar (`-r a.png -r b.png`) of kommagescheiden. Wordt gecontroleerd op grootte (≤5MB), formaat (PNG/JPEG/GIF/WebP via magic bytes) en aantal (≤10). Ondersteund op `codex` en `antigravity`; op `pollinations` afgewezen met exitcode 4. | |
| `--yes` | `-y` | Sla de bevestigingsvraag over kosten over. | `false` |
| `--no-prompt-in-manifest` | | Sla de SHA256 van de prompt op in plaats van de ruwe tekst in `manifest.json`. | `false` |
| `--dry-run` | | Druk plan en kostenraming af; voer niets uit. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` en `image vendor list` accepteren `--output <text|json>`. `image list-vendors` blijft een helpalias; `vendor list` is het canonieke ontdekkingspad.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` accepteert de plannings- en opnameopties `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` en `--capture-stop`. Daarnaast accepteert het `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` en `--no-brief-in-manifest`. Gebruik voor browseropname `--source web --url <url>`; `file` is de standaardbron. Voor een normale render zijn een geschreven compositie en een werkende compositor nodig; placeholders zijn beperkt tot het testpad `OMA_VIDEO_MOCK=1`.

`video doctor` rapporteert of installeert de Remotion/MPT/Strudel-toolchain. `compose` bereidt het compositiecontract van de run voor en `render` voert typechecks uit, rendert en controleert de uitvoer. `provider list` rapporteert de status van providers en sleutels. Lees [Video genereren](../guide/video-generation.md) voor het runmanifest en de herstelvolgorde.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Flag | Beschrijving | Standaard |
|:-----|:-----------|:--------|
| `--force` | Overschrijf lege of bestaande schemabestanden in `.agents/state/memories/`. Zonder deze vlag worden bestaande bestanden niet aangeraakt. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flag | Kort | Beschrijving | Standaard |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Pad naar de workspacemap die moet worden geverifieerd. | Huidige werkmap |

**Agenttypen:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` meet de nauwkeurigheid van de keyworddetector op een gelabeld corpus. De procentuele drempels zijn gates; gebruik JSON-uitvoer wanneer een CI-job afzonderlijke bevindingen moet inspecteren. De oude schrijfwijze `oma verify <agent-type>` is een compatibele helpvorm; `verify agent` is het geregistreerde pad.

---

## Praktische voorbeelden

### CI-pipeline: bijwerken en verifiëren

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Geautomatiseerde metriekverzameling

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Batchuitvoering van agents met statusbewaking

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Opschonen in CI na tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Workspacebewuste verificatie

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro met vergelijking voor sprintreviews

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Volledig healthchecks­cript

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe voor agentintrospectie

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

## Volledig openbare optieregister

De volgende matrix is gegenereerd uit het openbare commandoregister in de repository. Dit is de dekkingsindex voor deze pagina: een rij met `—` heeft geen opties die specifiek zijn voor het commando; de gedeelde rootflags en helpaliassen staan hierboven beschreven. Voer `oma describe "<path>"` uit om runtime-help te bekijken wanneer de grammaticaregels van een waarde veranderen.

| Commandopad | Openbare opties | Doel |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Installeer oh-my-agent-skills en configuraties |
| `describe` | `—` | Beschrijf CLI-commando's als JSON voor runtime-introspectie |
| `uninstall` | `--dry-run, -y, --yes` | Verwijder bestanden die door oh-my-agent worden beheerd; behoud oma-config.yaml, mcp.json en door de gebruiker geschreven skills |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Werk skills bij naar de nieuwste versie uit het register |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Kies browser-MCP-servers (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Genereer vendorbestanden (.claude/, .cursor/ enzovoort) opnieuw vanuit de .agents/ SSOT |
| `intel` | `—` | Productintelligentie-pipeline voor onderzoek, hiaten, PRD en issuevoorstellen |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Stel waardevol productwerk voor op basis van markt- en code-intelligentie |
| `market` | `—` | Marktonderzoek naar communitysignalen via de altijd actuele last30days-engine |
| `market detect-trap` | `--force` | Preflightcontrole die zoekopdrachten met keyword traps weigert |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Rapporteer welke last30days-engine oma uitvoert (beheerde nieuwste versie, vastgepinde versie of lokale kopie) en welke Python wordt gebruikt |
| `market update` | `--json, --output <format>` | Download de nieuwste last30days-release naar de beheerde oma-cache (~/.cache/oma-market/last30days) |
| `market run` | `—` | Voer de last30days-engine (scripts/last30days.py) uit met de opgegeven argumenten; --save-dir gebruikt standaard market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Controleer CLI-installaties, MCP-configuraties en skillstatus |
| `profile` | `—` | Beheer lokale OMA-uitvoeringsprofielen |
| `profile list` | `--json, --output <format>` | Toon lokale profielen |
| `profile show` | `--json, --output <format>` | Toon een lokaal profiel |
| `profile create` | `--json, --output <format>` | Maak een lokaal profiel aan |
| `profile use` | `--shell <shell>, --json, --output <format>` | Print shellcode om een bestaand profiel te activeren |
| `profile run` | `—` | Voer één commando uit met OMA_PROFILE ingesteld voor het onderliggende proces |
| `retro` | `--interactive, --compare, --json, --output <format>` | Technische terugblik met metrieken en trends |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Vat gespreksgeschiedenis van AI-tools samen |
| `docs` | `—` | Detecteer documentatiedrift: controleer verwijzingen en stel updates voor op basis van gewijzigde bestanden |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Haal L2-verwijzingen uit docs en rapporteer ongeldige doelen. Genereert docs/generated/doc-refs.json opnieuw als neveneffect. Exitcode: 0 = schoon, 1 = gebroken verwijzingen. URL-controle wordt gedelegeerd aan `lychee` (installatie: brew install lychee). |
| `docs sync` | `--json` | Geef voor een git-diff de docs op die naar gewijzigde bestanden verwijzen. De host-LLM (skillruntime) hoort deze lijst en de diff te lezen en patches voor te stellen volgens het SKILL.md-contract; de CLI past nooit automatisch docs aan. Standaard diffbereik: --cached (gestagede wijzigingen), met terugval op HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Detecteer drift tussen Engelse brondocs (web/docs) en i18n-vertalingen (web/i18n/{lang}/...). Geeft per paar structurele signalen (regelaantal, aantal headings en tijdstip van de laatste commit), zodat de host-LLM kan beslissen welke vertalingen een diff-sync-patch nodig hebben. De CLI bewerkt vertalingen nooit. |
| `docs lint` | `--json, --locales <list>` | Lint vertaalde docs op inhoudelijke antip patronen (em-dashes in CJK-doelen enzovoort). Vormt een aanvulling op oma docs i18n (structurele drift) met stijl- en antipatrooncontroles volgens `oma docs i18n` en oma-translation SKILL.md § Stage 4. De CLI herstelt niets automatisch en meldt alleen problemen die de host-LLM moet herstructureren. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Genereer standaardenconforme artifacts vanuit de .agents/ SSOT (Agent Skills-specificatie, Agent Plugins-pakket, Claude Code-pluginmarketplace, AGENTS.md en vendor-docs met cli/-scope) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Ruim verweesde subagentprocessen en tijdelijke bestanden op |
| `bridge` | `--context <name>` | Proxy MCP-stdio naar een gedeelde Serena-server per project (on demand gestart) |
| `verify` | `—` | Controleer subagentuitvoer (backend/frontend/mobile/qa/debug/pm) of meet de nauwkeurigheid van keyworddetector-triggers |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` | geen |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Meet de nauwkeurigheid van keyworddetector-triggers op een gelabeld promptcorpus |
| `vault` | `—` | Beheer API-sleutels en secrets in de OS-keychain (macOS Keychain / Linux Secret Service / Windows Credential Manager) |
| `vault store` | `--value <value>` | Sla een secret op onder <name> (interactieve wachtwoordvraag) |
| `vault get` | `—` | Print de opgeslagen waarde naar stdout (bijvoorbeeld: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Toon opgeslagen secretnamen; waarden worden nooit getoond |
| `vault delete` | `—` | Verwijder een secret uit de keychain en de index |
| `star` | `—` | Geef oh-my-agent een GitHub-star |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualiseer de projectstructuur als afhankelijkheidsgraaf |
| `search` | `—` | Mechanische zoekprimitieven: fetch, meta, rss, media, trust en code |
| `search providers` | `--json, --pretty` | Toon geregistreerde searchproviders en inspecteer de selectie zonder netwerkverzoeken |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Zoek met de geselecteerde webprovider (Brave heeft een CLI-adapter) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Haal een URL op via een strategie-pipeline die automatisch opschaalt |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Haal OGP / JSON-LD / Schema.org uit een URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Haal mediametadata op via yt-dlp (1858 sites) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Haal op via AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Bepaal vertrouwensniveau en score van een domein |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Zoek in code via gh / glab |
| `search doctor` | `—` | Controleer afhankelijkheden (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` | geen |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Haal gegevens op via de passende platform-API (fase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Voer een zoekopdracht uit over platforms die dit ondersteunen |
| `search rss` | `—` | geen |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Ontdek en parse een RSS/Atom-feed voor een URL |
| `search rss google` | `--locale <value>` | Bouw een Google News RSS-URL voor een zoekopdracht |
| `harness` | `—` | Evalueer OMA-harness-overlays tegen geïsoleerde repositorytaken |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Vergelijk een kandidaat-.agents-overlay met de huidige baseline |
| `slide` | `—` | HTML-presentatietoolkit voor het opzetten, valideren, exporteren en bewerken van slide decks van 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Geometrische kwaliteitsgate: rendert slides via puppeteer-core en controleert overflow, overlap en lettergrootte |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Voeg bestanden per slide samen tot één zelfstandig .html-deliverable |
| `slide edit` | `--workspace <path>, --port <n>` | Open de browsereditor voor bboxen (node:http-server op 127.0.0.1 die doorstuurt naar de oma-agentrunner) |
| `slide doctor` | `—` | Controleer vereiste afhankelijkheden (chrome, puppeteer-core) en optionele afhankelijkheden (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Maak een nieuwe slide-werkmap aan met start-HTML, assets/ en meta.json |
| `slide preview` | `--workspace <path>` | Bouw viewer.html (deck-stage-webcomponent met speaker-notespaneel, schakelaar met `n`) |
| `slide export` | `—` | geen |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Exporteer slides naar PDF via puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Exporteer elke slide als PNG-afbeelding via puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTEEL] Exporteer naar PPTX via pptxgenjs (rastergebaseerd, verlopen worden gerasteriseerd) |
| `slide import` | `—` | geen |
| `slide import pptx` | `--workspace <path>` | Importeer een .pptx-bestand in slidefragmenten via officeparser (bunx, best effort) |
| `slide asset` | `—` | geen |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Download video via yt-dlp naar ./assets/ en print de lokale verwijzing |
| `slide style` | `—` | Blader door stijlpresets en haal ze op |
| `slide style list` | `—` | Toon beschikbare stijlpresets (meegeleverde presets en bold-template-index) |
| `slide style preview` | `—` | Bekijk een stijlpreset in de terminal |
| `slide style get` | `--refresh` | Haal een bold-template design.md op (altijd de nieuwste main; gecachet voor offline terugval) |
| `scholar` | `—` | Paper-sidecars van Knows.academy (met terugval op OpenAlex en Semantic Scholar) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Zoek papers (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Vind de beste paper-match via knows.academy, OpenAlex en Semantic Scholar |
| `scholar get` | `--section <name>` | Haal een sidecar (Knows record_id) of werkmetadata op (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Valideer een .knows.yaml- of .knows.json-sidecar (v0.9.0) |
| `image` | `—` | AI-afbeeldingen genereren met meerdere vendors en authenticatiebewuste parallelle dispatch |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Genereer afbeeldingen via pollinations (flux/zimage, gratis), codex (gpt-image-2, ChatGPT OAuth) of antigravity (gemini nano-banana via de `agy`-CLI, gratis met Gemini Code Assist-aanmelding) |
| `image doctor` | `--output <format>` | Controleer authenticatie en installatiestatus per vendor |
| `image vendor` | `—` | geen |
| `image vendor list` | `--output <format>` | Toon geregistreerde vendors en ondersteunde modellen |
| `video` | `—` | Korte video-, uitleg- en demovideo's genereren |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Genereer een videorunmap vanuit een brief |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Controleer of videoprovider en compositor klaar zijn |
| `video compose` | `--output <format>, --refresh, --offline` | Zet het Remotion-project van de run op met de nieuwste toolchain en remotion-dev/skills; print het authoringcontract |
| `video render` | `--output <format>` | Render een runmap opnieuw vanuit render-spec.json |
| `video provider` | `—` | geen |
| `video provider list` | `--output <format>` | Toon videoproviders en beschikbaarheid |
| `serena` | `—` | Hulpmiddelen voor de levenscyclus van de Serena-MCP-language-server |
| `serena reap` | `--dry-run, --quiet` | Beëindig inactieve Serena-LSP-kindprocessen om geheugen vrij te maken (Serena herstelt zichzelf bij de volgende toolcall) |
| `serena reaper` | `—` | geen |
| `serena reaper enable` | `--dry-run` | Installeer de periodieke Serena Reaper-scheduled task (elke 5 minuten) |
| `serena reaper disable` | `--dry-run` | Verwijder de periodieke Serena Reaper-scheduled task |
| `explain` | `—` | Beheer van explain-artifacts en tools voor kwaliteitsvalidatie uitleggen |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Valideer zelfstandige HTML-rapportartefacts van explain |
| `diagram` | `—` | Hulpmiddelen voor diagramengines (interactieve archify-HTML of Mermaid-fallback) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Rapporteer welke diagramengine-workflows moeten gebruiken en waar archify staat |
| `diagram update` | `--json, --output <format>` | Download de nieuwste archify-release naar de beheerde oma-cache (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Voer de geïnstalleerde archify-CLI uit (doctor \| guide \| validate \| deliver \| visual-check …) met uitgeschakelde updatecontroles |
| `help` | `—` | Toon helpinformatie |
| `version` | `—` | Toon het versienummer |
| `dashboard` | `—` | geen |
| `dashboard terminal` | `—` | Start het terminaldashboard (realtime agentbewaking) |
| `dashboard web` | `—` | Start het webdashboard op http://127.0.0.1:9847 |
| `auth` | `—` | geen |
| `auth status` | `--json, --output <format>` | Controleer de authenticatiestatus van alle ondersteunde CLI's |
| `hook` | `—` | geen |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Stuur een vendor-hookevent door de gecentraliseerde oma-hookrouter (design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Controleer L1-hookcompatibiliteit per vendor en print een matrix (D63) |
| `state` | `—` | geen |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Voeg een OMA L1-workflowevent toe |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migreer legacy-sessies naar het homeprofiel en verwijder geverifieerde originelen |
| `state get` | `--json, --output <format>` | Inspecteer één OMA L1-sessie op ID |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecteer de OMA L1-workflowstatus |
| `state repair` | `--dry-run, --json, --output <format>` | Herstel OMA L1-workflowstatusbestanden |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Controleer verplichte L1-events voor een workflowcheckpoint |
| `state decisions` | `—` | geen |
| `state decisions list` | `--json, --output <format>` | Toon vereiste L1 decision.made-checkpoints |
| `state inject-log` | `—` | geen |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Toon of bekijk inject-auditlogs per boundary (D52) |
| `state inject-log get` | `--json, --output <format>` | Toon of bekijk inject-auditlogs per boundary (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Exporteer een sessiesamenvatting naar de coordination store |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Controleer of self-healing voor een agent is toegestaan |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecteer de OMA L1-workflowstatus |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecteer de OMA L1-workflowstatus |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecteer de OMA L1-workflowstatus |
| `ralph` | `—` | geen |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Controleer ralph EXEC-artifacts (anti-omzeilingsgate, ralph.md stap 1.3) |
| `goal` | `—` | geen |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Koppel een goalcontract (deterministische stopgate / klokbudget) aan een actieve persistente workflow |
| `stats` | `—` | geen |
| `stats get` | `--json, --output <format>` | Bekijk productiviteitsmetrieken |
| `stats reset` | `--json, --output <format>` | Bekijk productiviteitsmetrieken |
| `agent` | `—` | geen |
| `agent context` | `--project-root <path>, --difficulty <level>` | Laad grafiekgeselecteerde context voor een native dispatchprompt |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Hervat veilige onvoltooide taken en hergebruik het huidige acceptatiebewijs |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Start een native agentrun met bewijs |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Voer verificatie-argv uit na -- en leg de echte exitcode vast |
| `agent finish` | `--project-root <path>` | Valideer een native agentresultaat met de verificatiereceipts |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Spawn een subagent (prompt kan inline tekst of een bestandspad zijn) |
| `agent status` | `--project-root <path>` | Controleer de status van subagents |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Voer meerdere subagents parallel uit |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Voer een codereview uit via een externe CLI (codex/claude/qwen/grok) |
| `model` | `—` | geen |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Controleer het modelregister tegen actuele modellijsten van vendors |
| `model probe` | `--json, --timeout <duration>` | Test een modelslug via de vendor-CLI om te verifiëren dat die wordt geaccepteerd |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Voer intern model:check --probe uit en genereer een oma-config-patch met `models:` voor geaccepteerde kandidaten |
| `memory` | `—` | geen |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Configureer Honcho-verbinding of lokale embeddingcredentials |
| `memory init` | `--force, --json, --output <format>` | Initialiseer de coordination store in .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Bereid de configuratie van het AgentMemory-endpoint voor |
| `memory daemon` | `—` | Beheer een door OMA beheerde AgentMemory-daemon |
| `memory daemon status` | `--json, --output <format>` | Toon de daemonstatus |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Start AgentMemory op de achtergrond |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Stop de door OMA beheerde AgentMemory-daemon |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Herstart de door OMA beheerde AgentMemory-daemon |
| `memory service` | `—` | Beheer de OS-service-integratie van AgentMemory |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Installeer de launchd/systemd-service-integratie van AgentMemory |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Verwijder de launchd/systemd-service-integratie van AgentMemory |
| `memory status` | `--json, --output <format>` | Toon de gezondheid van de geselecteerde provider voor semantisch geheugen |
| `memory retry` | `—` | geen |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Verwerk wachtrijitems met observe-retries van AgentMemory |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Importeer gespreksgeschiedenis van vendors in AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Onderhoud lokale AgentMemory-opslag: maak back-ups, snoei en voer vacuum uit |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Onderhoud lokale AgentMemory-opslag: maak back-ups, snoei en voer vacuum uit |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Onderhoud lokale AgentMemory-opslag: maak back-ups, snoei en voer vacuum uit |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Onderhoud lokale AgentMemory-opslag: maak back-ups, snoei en voer vacuum uit |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Ruim projectlokaal geheugen op: snoei oude L1-sessies en tijdelijke Serena-bestanden |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Stop, maak een back-up, upgrade, herstart en voer een healthcheck van AgentMemory uit |
| `skill` | `—` | Inspecteer en audit geïnstalleerde skills |
| `skill audit` | `--json, --output <format>` | Controleer gelijkenis van frontmatterbeschrijvingen tussen geïnstalleerde skills |
| `skill lint` | `--skill <id>, --json, --output <format>` | Detecteer schrijfproblemen per skill (frontmatter, structuur en gebroken verwijzingen) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --require-coverage, --neg-transfer, --json, --output <format>` | Meet de utiliteitswinst per skill (treatment tegenover baseline op achtergehouden taken) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --json, --output <format>` | Optimaliseer een SKILL.md om de gemeten utiliteitswinst op achtergehouden taken te maximaliseren |
| `schedule` | `—` | geen |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Registreer een geplande agentjob |
| `schedule list` | `--json, --output <format>` | Toon geplande jobs met OS-driftstatus (synced/missing-in-os/orphan-in-os), gegroepeerd per project |
| `schedule delete` | `—` | Verwijder een geplande job uit het manifest en de OS-scheduler |
| `schedule run` | `—` | Voer een geplande job uit op ID (aangeroepen door de OS-scheduler; normaal niet rechtstreeks) |
| `schedule sync` | `--prune` | Synchroniseer manifest → OS-scheduler opnieuw. Gebruik --prune om verweesde OS-jobs te verwijderen. |
