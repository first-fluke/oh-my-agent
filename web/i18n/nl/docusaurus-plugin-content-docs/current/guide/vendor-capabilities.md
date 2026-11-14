---
title: Vendorcapabilities en pakketten
description: Skillontdekking, agentdefinities, hooks en pakketformaten bij de OMA-vendors.
---

# Vendorcapabilities en pakketten

`cli/constants/vendor-capabilities.ts` legt voor elke ondersteunde host de skillontdekking, de agentmap, de hookbrug en het pakketmanifest vast. De vendorsleutels komen overeen met `ALL_CLI_VENDORS`; de projectiepaden van skills komen uit `CLI_SKILLS_DIR`, zodat project- en globale installaties hun bestaande bestemmingen houden.

| Host | Gedeelde skills zonder vendorlinks | Agentmap | Hookbrug | Pakketmanifest |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Nee | — | Settings | `antigravity-plugin/plugin.json` |
| Claude Code | Nee | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | Nee | `.codex/agents` | Settings | `plugin.json` |
| Command Code | Nee | `.commandcode/agents` | Settings | `commandcode-mod/package.json` |
| Copilot CLI | Nee | `.github/agents` | Settings | `plugin.json` (Agent Plugins-pakket) |
| Cursor | Nee | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Settings | `.grok-plugin/plugin.json` |
| Hermes | Nee | — | — | `plugin.json` (Agent Plugins-pakket) |
| Kilo Code | Ja | `.kilo/agents` | Extensie | `opencode-package/package.json` |
| Kimi | Nee | — | Settings | `.kimi-plugin/plugin.json` |
| Kiro | Nee | `.kiro/agents` | Settings | `plugin.json` (Agent Plugins-pakket) |
| OpenCode | Nee | `.opencode/agents` | Extensie | `opencode-package/package.json` |
| Pi | Ja | — | Extensie | `pi-package/package.json` |
| Qwen Code | Ja | `.qwen/agents` | Settings | `plugin.json` (Agent Plugins-pakket) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

"Zonder vendorlinks" betekent dat OMA gedeelde ontdekking in beide installatiemodi kan gebruiken. Alleen de projectscan van Kimi vervangt de bestaande globale skillprojectie niet. Een hookbrug of een agentmap betekent niet dat er een subprocess-runtimeadapter is. Gemini is geen OMA-vendor; Antigravity CLI heeft een eigen integratie.

## Agent Plugins-pakket {#agent-plugins-package}

De repositoryroot is een [Agent Plugins 1.0](https://agent-plugins.org/)-pakket, en `oma emit` genereert het opnieuw vanuit de SSOT `.agents/`:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Git- en marketplace-installaties klonen de repository zonder afhankelijkheden, dus de root is het pakket. Een installatie via een lokaal pad of `owner/repo:path` kopieert in plaats daarvan de map waar je naartoe wijst, en de repositoryroot bevat ook de bronboom, `node_modules` en de website. Gebruik daarvoor de schone kopie die `oma emit --target agent-plugin` naar `codex-plugin/` schrijft (in deze repository: `bun cli/cli.ts emit --target agent-plugin`), of pak `oma-agent-plugin.tar.gz` uit een [GitHub-release](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` wordt gegenereerd en staat in gitignore; het wordt niet gecommit. Omdat elke host die boom in zijn geheel installeert, verwijzen de skills naar één kopie `skills/_shared/` van de gedeelde gidsen; alleen de root-`skills/` bundelt ze in elke skill, omdat `bunx skills use first-fluke/oh-my-agent@<skill>` één skillmap daaruit kopieert.

De manifesttrefwoorden (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) zijn ook de activeringswoordenschat van Kiro. Het manifest declareert geen componentpaden, wat de specificatie verbiedt; elke host leest de vaste locaties. Geen host heeft een native manifest naast `plugin.json` nodig: Copilot leest een rootmanifest van Agent Plugins vóór `.claude-plugin/plugin.json`, en Qwen Code laadt het pakket via de Agent Plugins-adapter zonder `qwen-extension.json` te genereren.

| Host | Laadt | Installatie |
| --- | --- | --- |
| GitHub Copilot CLI | skills, MCP-servers, en uit `com.github.copilot/`: 12 custom agents, 20 workflow-slashcommando's, 6 bestandsgebonden regels, 4 lifecycle-hooks | `copilot plugin install first-fluke/oh-my-agent` (kloont het rootpakket), `copilot plugin install /absolute/path/to/codex-plugin` op de geëmitte kopie, of `copilot plugin marketplace add first-fluke/oh-my-agent` en daarna `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | skills en MCP-servers (servernamen krijgen bij installatie een namespace); activeert op de manifesttrefwoorden | `kiro-cli powers install /absolute/path/to/codex-plugin` op de geëmitte kopie (CLI 2.25+), of **Add Custom Power → Import power from GitHub** met de repository-URL |
| Qwen Code | skills en MCP-servers als de extensie `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` of `qwen extensions link /absolute/path/to/codex-plugin` op de geëmitte kopie (oorsprong Agent Plugins). De kale repository-URL opent de interactieve pluginkiezer van Qwen, omdat de root ook de Claude-marketplace bevat; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` selecteert de invoer `oma` van die marketplace niet-interactief (volgens de docs van Qwen wordt die daarna vanuit het Claude-manifest omgezet). |
| Hermes Agent | skills als `oma:<skill>` en de stdio- en Streamable HTTP-MCP-servers | `hermes plugins install first-fluke/oh-my-agent --no-enable`, daarna `hermes plugins enable oma` |
| Codex | skills en MCP-servers | `codex plugin marketplace add first-fluke/oh-my-agent` en daarna `codex plugin add oma@oh-my-agent` |

### Componenten van Copilot CLI {#copilot-cli-components}

Copilot leest niet-draagbare componenten uit de namespace `com.github.copilot/` die `oma emit` vanuit de SSOT vult:

- `agents/<name>.agent.md`: dezelfde custom agents van Copilot die een projectinstallatie naar `.github/agents/` schrijft.
- `commands/<workflow>.md`: één slashcommando per beschikbare workflow; elk leest `.agents/workflows/<workflow>.md` van het project.
- `rules/<rule>.instructions.md`: de regels met een bestandglob (`applyTo`) of `alwaysApply: true`; on-request-regels blijven bij de projectinstallatie.
- `hooks/hooks.json` met `scripts/plugin-bootstrap.sh` en `scripts/plugin-hook.sh`: dezelfde fail-open scripts als de marketplace-invoer van Claude Code, uitgevoerd met `OMA_PLUGIN_VENDOR=copilot`. SessionStart voorziet de CLI en voert `oma install --yes` uit voor het huidige project; UserPromptSubmit, PreToolUse (Bash) en Stop sturen door naar `oma hook --vendor copilot` totdat de eigen registratie `.github/hooks/oma.json` van het project het overneemt. Elk commando eindigt op `|| true`, zodat een ontbrekende CLI of een onopgeloste pluginroot een toolaanroep nooit blokkeert.

Workflows, agenten en regels verwijzen naar de boom `.agents/` van het project. Zonder de oma-CLI levert het pakket nog steeds skills en MCP-servers; de bootstrap-hook voegt de rest toe bij de eerste sessie.

### Validatierecord {#validation-record}

Gecontroleerd op 2026-11-08 met de home van elke host gericht op een scratchmap; er liep geen modelaanroep, hook of MCP-server. `<path>/codex-plugin` is de boom die `oma emit --target agent-plugin` schrijft:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` meldde `Installed 33 skills`; `plugin list --json` toont `oma` ingeschakeld op de pakketversie; de gecachte kopie onder `installed-plugins/_direct/` bevat `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` gevolgd door `copilot plugin install oma@oh-my-agent` installeerde de volledige invoer ook live vanuit de checkout. Copilot waarschuwt dat directe installaties zijn verouderd ten gunste van `plugin@marketplace`.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (met `KIRO_HOME` en `KIRO_DATA_DIR` op de scratchmap) meldde `Installed power "oma"` en kopieerde het pakket naar `powers/installed/oma/`. Kiro negeert `USERPROFILE`; gebruik `KIRO_HOME` om de home te verplaatsen.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` meldde `installed successfully and enabled`; `qwen extensions list` toont `Origin: AgentPlugins`, 33 skills en de MCP-servers `context7`, `serena` en `aside`.
- Hermes Agent: hier niet geïnstalleerd. Het manifest, de skill-frontmatter en `mcp.json` zijn gecontroleerd tegen de regels in `hermes_cli/agent_plugins.py` van Hermes (geen onbekende velden, geldige namen, stdio-commando's als losse tokens); Hermes vereist geen blok `extensions["com.nousresearch.hermes"]`.

CI schrijft het pakket vanuit de checkout weg en installeert het bij elke push in vastgezette releases van Copilot CLI en Qwen Code (job `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Pi-pakketten {#pi-packages}

Pi ontdekt project-`.agents/skills` en globale `~/.agents/skills` rechtstreeks. OMA in een project installeren vereist daarom geen projectie `.pi/skills`.

Voor distributie buiten een OMA-installatie emit de releasepijplijn het Pi-skillpakket en publiceert het naar npm als `oh-my-agent-pi`; of emit het zelf:

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

Voer in deze bronrepository de lokale CLI uit als `bun cli/cli.ts emit --target pi-package`. De standaarduitvoer is `pi-package/` (gitignore; de boom wordt gegenereerd, niet gecommit); `--output-dir <base>` schrijft die onder `<base>/pi-package/`.

De gegenereerde `package.json` declareert `pi.skills: ["./skills"]`, bevat het trefwoord `pi-package` en gebruikt de repositoryversie. De gedeelde gidsen waarnaar skills verwijzen, worden één keer geëmit onder `skills/_shared/` (pi laadt het pakket in zijn geheel), dus geen skill draagt een eigen kopie. Het pakket heeft geen workspace-afhankelijkheden of installatiescripts. Het distribueert skills; de projectinstallatie van OMA levert de Pi-hookextensie apart.

Pi ondersteunt ook Git- en npm-bronnen. De repository declareert de bronskills al in de root-`package.json`, dus `pi install git:github.com/first-fluke/oh-my-agent@<tag>` kan ze ontdekken. Pi voert afhankelijkheidsinstallatie uit voor Git-pakketten die `package.json` bevatten; het geëmitte pakket vermijdt de afhankelijkheidsboom van de bronworkspace. `oma emit` publiceert zelf niet; de releaseworkflow publiceert het geëmitte pakket naar npm.

Dit formaat is op 2026-11-05 gecontroleerd tegen de documentatie en de pakketresolver van het geïnstalleerde Pi 0.78.1. Alleen-lezen resolutie van zowel de bronrepository als het geëmitte pakket laadde 33 skills met nul diagnostiek, zonder een pakket te installeren of een model te benaderen.

## Pluginpakket voor OpenCode en Kilo Code {#opencode-and-kilo-code-plugin-package}

`oma link` installeert de hookbrug van de opencode-familie per project: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` voor Kilo) plus de handlerinvoeren die het start, geregistreerd onder `plugin` in `opencode.json` / `kilo.json`. Dezelfde brug wordt ook als npm-pluginpakket geëmit, zodat een project (of een globale configuratie) die kan laden zonder een installatie per project:

```bash
oma emit --target opencode-package
```

De standaarduitvoer is `opencode-package/` (het enige geëmitte pakket dat gecommit blijft, zodat een clone het als directoryplugin kan laden); `--output-dir <base>` schrijft het onder `<base>/opencode-package/`. Het pakket (`oh-my-agent-opencode`) bevat de ongewijzigde SSOT-brug (`oma.ts`), een pakketinvoer (`index.ts`, de `main`/`exports`), één gegenereerde handlerinvoer per zelfstandig hookscript (elk voert `oma hook script --vendor opencode --script <name>` uit), `filter-test-output.sh` en een README. Het heeft geen afhankelijkheden; de `oma`-CLI moet op PATH staan en `bun` moet geïnstalleerd zijn, en elke hook faalt open wanneer een van beide ontbreekt.

De twee hosts laden pakketplugins via verschillende contracten, en de invoer bedient beide vanuit één default export: OpenCode 2.x leest `{ id, setup(ctx) }` en `setup` registreert `ctx.session.hook("prompt" | "context" | "experimental.idle")` en `ctx.tool.hook("execute.before")`, elk omgezet naar de handlers `chat.message`, `experimental.chat.system.transform`, `session.idle` en `tool.execute.before` van de brug; Kilo Code en OpenCode 1.18.29+ vereisen een object met `server()`, en dat is de brug zelf. Handlerlogica wordt niet gedupliceerd.

Registreer het op pakketnaam in `.opencode/opencode.json` (project) of `~/.config/opencode/opencode.json` (globaal); OpenCode installeert npm-plugins bij het opstarten in de cache:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code leest dezelfde sleutel uit `.kilo/kilo.json` of `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` voegt de invoer voor je toe. Beide hosts dispatchen met de gedeelde identiteit `opencode`, die antwoordt in het Claude-JSON-dialect dat de brug leest. Een project waarin `oma link` al `./plugins/oma/oma.ts` heeft geregistreerd, heeft het pakket niet nodig; houd er één van de twee.

OpenCode 2.x accepteert ook een directoryplugin (`"plugin": ["../path/to/opencode-package"]`, relatief ten opzichte van het configuratiebestand), die het geëmitte pakket zonder npm laadt. OpenCode 2.x vereist dat geconfigureerde pluginpaden mappen zijn en weigert een invoer van één bestand: de registratie `./plugins/oma/oma.ts` per project die `oma link` schrijft, wordt daar overgeslagen ("configured plugin path must be a directory"). Gebruik op OpenCode 2.x daarom dit pakket; Kilo Code laadt het bestand per project nog steeds.

Geverifieerd op 2026-11-08 tegen OpenCode 2.2.6 en Kilo Code CLI 7.8.27: beide losten `plugin: ["oh-my-agent-opencode"]` op vanuit de projectconfiguratie (`opencode debug config`, `kilo debug config`), OpenCode probeerde de npm-installatie (een 404 tot het pakket is gepubliceerd) en bleef fail-open, en met het pakket in de plugincache van elke host (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`) ontving een headless `run "orchestrate: say hi"` tegen een lokaal OpenAI-compatibel endpoint op beide hosts `[OMA WORKFLOW: ORCHESTRATE]` in de system prompt, gevolgd door de herhaalde invoeren van de persistente modus tot de reinforcementlimiet. De releaseworkflow publiceert het geëmitte pakket bij elke CLI-release naar npm als `oh-my-agent-opencode`.

## Modpakket voor Command Code {#command-code-mod-package}

De hooks in het instellingenbestand van Command Code (`.commandcode/settings.json`, geïnstalleerd door `oma link`) dekken alleen `SessionStart`, `PostToolUse` en `Stop`. Een [mod](https://commandcode.ai/docs/mods) ziet de volledige levenscyclus, dus OMA emit ook een modpakket:

```bash
oma emit --target commandcode-mod
```

De standaarduitvoer is `commandcode-mod/` (gitignore; de boom wordt gegenereerd, niet gecommit). De `package.json` draagt het trefwoord `cmd-mod` en een blok `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), zodat één installatie de hookbrug en elke OMA-skill meeneemt. `mods/oma.ts` koppelt de ModApi-hooks via `oma hook script --vendor commandcode --script <name>` aan de kernhandlers: `transformInput` voert keyword-detector en skill-injector uit (de prompt gaat ongewijzigd door), `appendSystemPrompt` injecteert de gedetecteerde context, `onSessionStart` voert code-intelligence-primer en state-boundary uit, `beforeToolCall` voert scm-guard uit (een weigering wordt `{block: true}`) en test-filter op `shell_command`, en `onStop` zet een blok van de persistente modus om in `{continue: true, reason}`. Het pakket heeft geen afhankelijkheden en heeft geen buildstap nodig; elke hook faalt open zonder de `oma`-CLI.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Geverifieerd op 2026-11-08 tegen Command Code 1.88.5: `cmd mods inspect` meldde de geregistreerde hooks, `cmd mods add -g <local path>` installeerde het pakket en `cmd mods list` toonde `oma · user · from local:…`, en het aansturen van de hooks van de mod tegen de CLI injecteerde `[OMA WORKFLOW: ORCHESTRATE]`, blokkeerde `git add .env` en gaf een continue van de persistente modus terug. Een modelgedragen beurt `cmd -p` is niet uitgevoerd (geen Command Code-account op de testmachine). De releaseworkflow publiceert het geëmitte pakket bij elke CLI-release naar npm als `oh-my-agent-commandcode`.

## Pluginverificatie van Cursor {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f` biedt:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

De plugin-CLI heeft geen commando om een afzonderlijke plugin te installeren. Marketplace-registratie is een accountbewerking die een Git-repository indexeert; ze biedt geen geïsoleerde lokale installatiecontrole. OMA registreert tijdens het emitten niet automatisch een marketplace.

Op 2026-11-05 vielen de twee skillmappen, de agentmap, de regelmappen, het MCP-bestand en het logo van het gecommitte Cursor-manifest allemaal binnen de repository. De CLI-hulp bevestigde ondersteuning voor het laden van een lokale pluginmap. Registratie van een accountmarketplace en een live modelsessie zijn niet uitgevoerd.

## Claude-compatibele pluginhosts {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode en Kimi Code lezen pluginmanifesten waarvan de vorm afstamt van `.claude-plugin/plugin.json` van Claude Code. `oma emit` genereert per host één native manifest vanuit de bron van waarheid `.agents/`. Een git-clone van deze repository is het installeerbare pakket voor Grok, ZCode en Kimi; de boom van Antigravity wordt gegenereerd (`oma emit --target antigravity-plugin`, of het release-asset `oma-antigravity-plugin.tar.gz`) omdat de validator de repositoryroot weigert:

| Host | Emit-doel | Gecommit artefact | Skills | Agenten | MCP | Hooks |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | geen; geëmit `antigravity-plugin/` (zelfstandig, release-asset) | `skills/` | `agents/` (geconverteerd) | `mcp_config.json` | niet meegeleverd |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | root `skills/` | `.agents/agents/*.md` | inline `mcpServers` | niet gedeclareerd |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | root `skills/` | `.agents/agents/*.md` | inline `mcpServers` | niet gedeclareerd |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | root `skills/` | `.agents/agents/*.md` | inline `mcpServers` | niet gedeclareerd |

Geen van deze pakketten levert hooks mee. De hooks van de Claude-plugin lossen het project op vanuit `CLAUDE_PROJECT_DIR` en `${CLAUDE_PLUGIN_ROOT}`, wat deze hosts niet instellen, en Antigravity en Kimi draaien pluginhooks met de pluginmap als werkmap. Workflows en projecthooks komen daarom van de `oma`-CLI (`bun install -g oh-my-agent`, daarna `oma install`), die de native hookbrug van elke host voorziet. Skills, agenten, regels en MCP-servers werken zonder die CLI.

Voer in deze bronrepository de lokale CLI uit als `bun cli/cli.ts emit --target <target>`; `--output-dir <base>` schrijft elk artefact onder `<base>` op hetzelfde relatieve pad. De CI-driftgate (`bun run --cwd cli check:emit-drift`) faalt wanneer een gecommit manifest afwijkt van een verse emit, en Release Please verhoogt de versie van elk gecommit manifest samen met de CLI-release; de gegenereerde bomen voor lokale paden nemen hun versie van de releasetag waarop ze worden geëmit.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

Het pakket volgt [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json` gevalideerd tegen `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` plus één `rules/<rule>.md` per OMA-regel (`trigger: always_on | glob | model_decision`, kommagescheiden `globs`), `mcp_config.json`, `assets/logo.png` en een README. Er wordt een zelfstandige boom geëmit omdat `agy plugin validate --strict` de repositoryroot weigert (de root-`AGENTS.md` en Claude-`hooks/hooks.json` worden gemeld als nooit geladen). Installeer de map `antigravity-plugin/`, niet de repository-URL of de root: wijs je naar de root, dan laadt agy daar de Agent Plugins-`plugin.json`. Dat zijn 33 skills, geen agenten of regels, en `mcp.json` alleen zolang de vlag `enable-agent-plugins-spec` aan staat (`agy plugin validate --json .`, agy 1.5.3).

```bash
# From a release asset:
tar -xzf oma-antigravity-plugin.tar.gz        # unpacks antigravity-plugin/
# Or from a clone (the tree is generated, not committed):
git clone https://github.com/first-fluke/oh-my-agent
cd oh-my-agent && bun install && bun cli/cli.ts emit --target antigravity-plugin
agy plugin validate --strict ./antigravity-plugin
agy plugin install ./antigravity-plugin
agy plugin list
agy --agent pm-planner
```

Skills laden als `/<skill-name>`; MCP-servers krijgen de namespace `oma_<server>`. `agy plugin import claude` importeert ook een bestaande installatie van Claude Code. Op 2026-11-08 slaagde de geëmitte boom voor `agy plugin validate --strict` (agy 1.5.3) met 0 fouten en 0 waarschuwingen: 33 skills, 12 agenten, 14 regels, 3 MCP-servers.

### Grok Build CLI {#grok-build-cli}

Grok leest plugins en marketplaces van Claude Code zonder setup, dus `.claude-plugin/` werkt al. Het native `.grok-plugin/plugin.json` voegt expliciete declaraties voor skills, agenten en MCP toe, en `.grok-plugin/marketplace.json` noemt dezelfde invoer `oma` en de domeinroots `oma-frontend`, `oma-security` en `oma-research` als de Claude-marketplace, met lokale bronnen (`{"type": "local", "path": ...}`), de vorm die de catalogusvalidator van Grok accepteert zonder een vastgezette commit-sha.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok was niet geïnstalleerd op de host die emit; het manifest en de catalogus worden structureel door de CLI-tests gecontroleerd tegen de gedocumenteerde veldset en de catalogusregels van `xai-org/plugin-marketplace`.

### ZCode {#zcode}

ZCode lost eerst `.zcode-plugin/plugin.json` op en valt terug op `.claude-plugin/plugin.json`, dus de repositoryroot lost native op en elke domeinroot via het Claude-manifest. Installatie gaat alleen via de GUI:

1. Open **Settings → Plugins**.
2. Klik op **Create → Add marketplace** (rechtsboven) en voer `first-fluke/oh-my-agent`, de Git-URL of het pad van een lokale clone in. ZCode valideert de marketplace voordat die wordt toegevoegd.
3. Klik onder het segment **Personal** op **Install** bij `oma` (of een domeininvoer) en wacht tot de status **Installed** wordt. Plugins zijn standaard ingeschakeld.
4. Gebruik later **Manage installed → Check for updates**; ZCode vergelijkt de catalogusversie in `.zcode-plugin/marketplace.json` met de geïnstalleerde `plugin.json`, dus beide volgen de CLI-release.

ZCode was niet geïnstalleerd op de host die emit; het naampatroon van het manifest (`^[a-z0-9][a-z0-9._-]{0,127}$`), de veldset en de marketplacevorm worden door de CLI-tests gecontroleerd.

### Kimi Code CLI {#kimi-code-cli}

`.kimi-plugin/plugin.json` wijst `skills` naar de scanmap van de root-`skills/`, noemt elk bestand `.agents/agents/*.md` (al in het agentformaat van Kimi: frontmatter `name` en `description`, Markdown-body als de system prompt), zet `mcpServers` inline en draagt het blok `interface` dat `/plugins` toont.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi kopieert de plugin naar `$KIMI_CODE_HOME/plugins/managed/oma/` en past die op elk project toe; skills worden aangeroepen als `/skill:oma:<skill-name>`. Kimi was niet geïnstalleerd op de host die emit; het manifestoppervlak (toegestane velden, de padregel `./`, de veldset van hooks) wordt door de CLI-tests gecontroleerd.

## Qwen Agent Board {#qwen-agent-board}

De experimentele [documentatie van Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) beschrijft `qwen board task`, `claim`, `done`, `ask` en `answer`. Het bord coördineert lokale bestanden. Het start geen agentprocessen, sluit zich er niet bij aan en bewaakt ze niet.

OMA kan expliciete bordbewerkingen doorsturen wanneer de geïnstalleerde Qwen-CLI het commando `board` aanbiedt:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

De adapter ondersteunt ook `claim`, `ask`, `answer` en `decline`. Hij controleert de roothulp voordat een bewerking wordt doorgestuurd. Hij vult de uitvoeringsstatus en receipts van OMA aan; hij markeert OMA-werk nooit automatisch als voltooid.

De geïnstalleerde Qwen Code 0.20.1 bood op 2026-11-05 geen CLI-commando's `board` of `agents`. `qwen board --help` gaf de roothulp terug, dus deze installatie faalt de capabilitycontrole. Een echte native bordbewerking blijft ongeverifieerd; er is geen integratie `agents join`.
