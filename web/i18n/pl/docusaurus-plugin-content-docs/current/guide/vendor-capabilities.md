---
title: Możliwości dostawców i pakiety
description: Odkrywanie umiejętności, definicje agentów, hooki i formaty pakietów u dostawców OMA.
---

# Możliwości dostawców i pakiety {#vendor-capabilities-and-packages}

`cli/constants/vendor-capabilities.ts` zapisuje dla każdego obsługiwanego hosta odkrywanie umiejętności, katalog agentów, mostek hooków i manifest pakietu. Klucze dostawców zgadzają się z `ALL_CLI_VENDORS`; ścieżki projekcji umiejętności pochodzą z `CLI_SKILLS_DIR`, aby instalacje projektowe i globalne zachowały istniejące miejsca docelowe.

| Host | Współdzielone umiejętności bez dowiązań dostawcy | Katalog agentów | Mostek hooków | Manifest pakietu |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Nie | — | Settings | `antigravity-plugin/plugin.json` |
| Claude Code | Nie | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | Nie | `.codex/agents` | Settings | `plugin.json` |
| Command Code | Nie | `.commandcode/agents` | Settings | `commandcode-mod/package.json` |
| Copilot CLI | Nie | `.github/agents` | Settings | `plugin.json` (pakiet Agent Plugins) |
| Cursor | Nie | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Settings | `.grok-plugin/plugin.json` |
| Hermes | Nie | — | — | `plugin.json` (pakiet Agent Plugins) |
| Kilo Code | Tak | `.kilo/agents` | Extension | `opencode-package/package.json` |
| Kimi | Nie | — | Settings | `.kimi-plugin/plugin.json` |
| Kiro | Nie | `.kiro/agents` | Settings | `plugin.json` (pakiet Agent Plugins) |
| OpenCode | Nie | `.opencode/agents` | Extension | `opencode-package/package.json` |
| Pi | Tak | — | Extension | `pi-package/package.json` |
| Qwen Code | Tak | `.qwen/agents` | Settings | `plugin.json` (pakiet Agent Plugins) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

„Bez dowiązań dostawcy” oznacza, że OMA może używać współdzielonego odkrywania w obu trybach instalacji. Samo skanowanie projektu przez Kimi nie zastępuje istniejącej globalnej projekcji umiejętności. Mostek hooków albo katalog agentów nie oznacza adaptera runtime'u podprocesu. Gemini nie jest dostawcą OMA; Antigravity CLI ma własną integrację.

## Pakiet Agent Plugins {#agent-plugins-package}

Katalog główny repozytorium jest pakietem [Agent Plugins 1.0](https://agent-plugins.org/), a `oma emit` odtwarza go ze SSOT w `.agents/`:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Instalacje z Git i marketplace klonują repozytorium bez zależności, więc katalog główny jest pakietem. Instalacja ze ścieżki lokalnej albo `owner/repo:path` kopiuje natomiast wskazany katalog, a katalog główny repozytorium niesie też drzewo źródłowe, `node_modules` i witrynę. Dla tych przypadków użyj czystej kopii, którą `oma emit --target agent-plugin` zapisuje do `codex-plugin/` (w tym repozytorium: `bun cli/cli.ts emit --target agent-plugin`), albo rozpakuj `oma-agent-plugin.tar.gz` z [wydania GitHub](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` jest generowany i ignorowany przez git, nie jest commitowany. Ponieważ każdy host instaluje to drzewo w całości, jego umiejętności odwołują się do jednej kopii współdzielonych przewodników w `skills/_shared/`; tylko główne `skills/` dołącza je do każdej umiejętności, bo `bunx skills use first-fluke/oh-my-agent@<skill>` kopiuje z niego pojedynczy katalog umiejętności.

Słowa kluczowe manifestu (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) są też słownikiem aktywacji Kiro. Manifest nie deklaruje ścieżek komponentów, czego specyfikacja zabrania; każdy host czyta stałe lokalizacje. Żaden host nie potrzebuje natywnego manifestu obok `plugin.json`: Copilot czyta główny manifest Agent Plugins przed `.claude-plugin/plugin.json`, a Qwen Code ładuje pakiet przez swój adapter Agent Plugins bez generowania `qwen-extension.json`.

| Host | Ładuje | Instalacja |
| --- | --- | --- |
| GitHub Copilot CLI | umiejętności, serwery MCP oraz z `com.github.copilot/`: 12 agentów niestandardowych, 20 poleceń slash workflowów, 6 reguł ograniczonych do plików, 4 hooki cyklu życia | `copilot plugin install first-fluke/oh-my-agent` (klonuje pakiet główny), `copilot plugin install /absolute/path/to/codex-plugin` na wyemitowanej kopii albo `copilot plugin marketplace add first-fluke/oh-my-agent`, a następnie `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | umiejętności i serwery MCP (nazwy serwerów dostają przestrzeń nazw przy instalacji); aktywuje się na słowach kluczowych manifestu | `kiro-cli powers install /absolute/path/to/codex-plugin` na wyemitowanej kopii (CLI 2.25+) albo **Add Custom Power → Import power from GitHub** z adresem URL repozytorium |
| Qwen Code | umiejętności i serwery MCP jako rozszerzenie `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` albo `qwen extensions link /absolute/path/to/codex-plugin` na wyemitowanej kopii (pochodzenie Agent Plugins). Sam adres URL repozytorium otwiera interaktywny wybór wtyczki Qwen, bo katalog główny niesie też marketplace Claude; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` wybiera wpis `oma` tego marketplace nieinteraktywnie (według dokumentacji Qwen jest on wtedy konwertowany z manifestu Claude). |
| Hermes Agent | umiejętności jako `oma:<skill>` oraz serwery MCP stdio / Streamable HTTP | `hermes plugins install first-fluke/oh-my-agent --no-enable`, a następnie `hermes plugins enable oma` |
| Codex | umiejętności i serwery MCP | `codex plugin marketplace add first-fluke/oh-my-agent`, a następnie `codex plugin add oma@oh-my-agent` |

### Komponenty Copilot CLI {#copilot-cli-components}

Copilot czyta nieprzenośne komponenty z przestrzeni nazw `com.github.copilot/`, którą `oma emit` wypełnia ze SSOT:

- `agents/<name>.agent.md`: te same niestandardowe agenty Copilot, które instalacja projektu zapisuje do `.github/agents/`.
- `commands/<workflow>.md`: jedno polecenie slash na dostępny workflow; każde czyta `.agents/workflows/<workflow>.md` projektu.
- `rules/<rule>.instructions.md`: reguły z globem plików (`applyTo`) albo `alwaysApply: true`; reguły na żądanie zostają przy instalacji projektu.
- `hooks/hooks.json` ze `scripts/plugin-bootstrap.sh` i `scripts/plugin-hook.sh`: te same skrypty fail-open co we wpisie marketplace Claude Code, uruchamiane z `OMA_PLUGIN_VENDOR=copilot`. SessionStart dostarcza CLI i uruchamia `oma install --yes` dla bieżącego projektu; UserPromptSubmit, PreToolUse (Bash) i Stop przekazują do `oma hook --vendor copilot`, dopóki nie przejmie tego rejestracja `.github/hooks/oma.json` projektu. Każde polecenie kończy się `|| true`, więc brakujące CLI albo nierozstrzygnięty katalog główny wtyczki nigdy nie blokuje wywołania narzędzia.

Workflowy, agenci i reguły odwołują się do drzewa `.agents/` projektu. Bez CLI oma pakiet nadal dostarcza umiejętności i serwery MCP; hook bootstrapu dodaje resztę przy pierwszej sesji.

### Rekord walidacji {#validation-record}

Sprawdzono 2026-11-08, kierując katalog domowy każdego hosta na katalog roboczy; nie uruchomiono wywołania modelu, hooka ani serwera MCP. `<path>/codex-plugin` to drzewo zapisywane przez `oma emit --target agent-plugin`:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` zgłosiło `Installed 33 skills`; `plugin list --json` pokazuje `oma` włączone w wersji pakietu; kopia w cache pod `installed-plugins/_direct/` zawiera `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>`, a następnie `copilot plugin install oma@oh-my-agent` również zainstalowało pełny wpis na żywo z checkoutu. Copilot ostrzega, że instalacje bezpośrednie są przestarzałe na rzecz `plugin@marketplace`.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (z `KIRO_HOME` i `KIRO_DATA_DIR` na katalogu roboczym) zgłosiło `Installed power "oma"` i skopiowało pakiet do `powers/installed/oma/`. Kiro ignoruje `USERPROFILE`; do przeniesienia katalogu domowego użyj `KIRO_HOME`.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` zgłosiło `installed successfully and enabled`; `qwen extensions list` pokazuje `Origin: AgentPlugins`, 33 umiejętności oraz serwery MCP `context7`, `serena` i `aside`.
- Hermes Agent: tutaj niezainstalowany. Manifest, frontmatter umiejętności i `mcp.json` sprawdzono względem reguł w `hermes_cli/agent_plugins.py` Hermesa (brak nieznanych pól, poprawne nazwy, polecenia stdio jako pojedyncze tokeny); Hermes nie wymaga bloku `extensions["com.nousresearch.hermes"]`.

CI emituje pakiet z checkoutu i instaluje go w przypiętych wydaniach Copilot CLI i Qwen Code przy każdym pushu (job `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Pakiety Pi {#pi-packages}

Pi odkrywa projektowe `.agents/skills` i globalne `~/.agents/skills` bezpośrednio. Instalacja OMA w projekcie nie wymaga więc projekcji `.pi/skills`.

Do dystrybucji poza instalacją OMA potok wydań emituje pakiet umiejętności Pi i publikuje go w npm jako `oh-my-agent-pi`; można też wyemitować go samodzielnie:

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

W tym repozytorium źródłowym uruchom lokalne CLI jako `bun cli/cli.ts emit --target pi-package`. Domyślne wyjście to `pi-package/` (ignorowane przez git; drzewo jest generowane, nie commitowane); `--output-dir <base>` zapisuje je w `<base>/pi-package/`.

Wygenerowany `package.json` deklaruje `pi.skills: ["./skills"]`, zawiera słowo kluczowe `pi-package` i używa wersji repozytorium. Współdzielone przewodniki, do których odwołują się umiejętności, są emitowane raz w `skills/_shared/` (pi ładuje pakiet w całości), więc żadna umiejętność nie niesie własnej kopii. Pakiet nie ma zależności workspace ani skryptów instalacji. Dystrybuuje umiejętności; instalacja projektowa OMA dostarcza rozszerzenie hooków Pi osobno.

Pi obsługuje też źródła Git i npm. Repozytorium już deklaruje swoje umiejętności źródłowe w głównym `package.json`, więc `pi install git:github.com/first-fluke/oh-my-agent@<tag>` może je odkryć. Pi uruchamia instalację zależności dla pakietów Git zawierających `package.json`; wyemitowany pakiet unika drzewa zależności workspace źródła. Sam `oma emit` nie publikuje; workflow wydań publikuje wyemitowany pakiet w npm.

Ten format sprawdzono 2026-11-05 względem dokumentacji zainstalowanego pakietu Pi 0.78.1 i resolvera pakietów. Rozstrzygnięcie tylko do odczytu zarówno repozytorium źródłowego, jak i wyemitowanego pakietu załadowało 33 umiejętności z zerową diagnostyką, bez instalowania pakietu i bez kontaktu z modelem.

## Pakiet wtyczki OpenCode i Kilo Code {#opencode-and-kilo-code-plugin-package}

`oma link` instaluje mostek hooków rodziny opencode per projekt: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` dla Kilo) oraz wpisy handlerów, które uruchamia, zarejestrowane pod `plugin` w `opencode.json` / `kilo.json`. Ten sam mostek jest też emitowany jako pakiet wtyczki npm, aby projekt (albo konfiguracja globalna) mógł go załadować bez instalacji per projekt:

```bash
oma emit --target opencode-package
```

Domyślne wyjście to `opencode-package/` (jedyny emitowany pakiet, który pozostaje commitowany, więc klon może załadować go jako wtyczkę katalogową); `--output-dir <base>` zapisuje je w `<base>/opencode-package/`. Pakiet (`oh-my-agent-opencode`) zawiera niezmieniony mostek SSOT (`oma.ts`), wpis pakietu (`index.ts`, `main`/`exports`), jeden wygenerowany wpis handlera na samodzielny skrypt hooka (każdy uruchamia `oma hook script --vendor opencode --script <name>`), `filter-test-output.sh` i README. Nie ma zależności; CLI `oma` musi być na PATH, a `bun` musi być zainstalowany, i każdy hook działa w trybie fail-open, gdy brakuje jednego z nich.

Oba hosty ładują wtyczki pakietowe przez różne kontrakty, a wpis obsługuje oba z jednego domyślnego eksportu: OpenCode 2.x czyta `{ id, setup(ctx) }`, a `setup` rejestruje `ctx.session.hook("prompt" | "context" | "experimental.idle")` i `ctx.tool.hook("execute.before")`, każde zaadaptowane na handlery mostka `chat.message`, `experimental.chat.system.transform`, `session.idle` i `tool.execute.before`; Kilo Code i OpenCode 1.18.29+ wymagają obiektu z `server()`, którym jest sam mostek. Logika handlerów nie jest duplikowana.

Zarejestruj go nazwą pakietu w `.opencode/opencode.json` (projekt) albo `~/.config/opencode/opencode.json` (globalnie); OpenCode instaluje wtyczki npm do swojego cache przy starcie:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code czyta ten sam klucz z `.kilo/kilo.json` albo `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` dodaje wpis. Oba hosty dispatchują ze współdzieloną tożsamością `opencode`, która odpowiada w dialekcie JSON Claude czytanym przez mostek. Projekt, w którym `oma link` już zarejestrował `./plugins/oma/oma.ts`, nie potrzebuje pakietu; zostaw jedno albo drugie.

OpenCode 2.x przyjmuje też wtyczkę katalogową (`"plugin": ["../path/to/opencode-package"]`, względnie wobec pliku konfiguracji), która ładuje wyemitowany pakiet bez npm. OpenCode 2.x wymaga, aby skonfigurowane ścieżki wtyczek były katalogami, i odrzuca wpis jednoplikowy: rejestracja per projekt `./plugins/oma/oma.ts`, którą zapisuje `oma link`, jest tam pomijana („configured plugin path must be a directory”), więc na OpenCode 2.x użyj tego pakietu; Kilo Code nadal ładuje plik per projekt.

Zweryfikowano 2026-11-08 względem OpenCode 2.2.6 i Kilo Code CLI 7.8.27: oba rozstrzygnęły `plugin: ["oh-my-agent-opencode"]` z konfiguracji projektu (`opencode debug config`, `kilo debug config`), OpenCode próbowało instalacji npm (404, dopóki pakiet nie zostanie opublikowany) i pozostało w trybie fail-open, a po umieszczeniu pakietu w cache wtyczek każdego hosta (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`) bezgłowe `run "orchestrate: say hi"` wobec lokalnego endpointu zgodnego z OpenAI otrzymało `[OMA WORKFLOW: ORCHESTRATE]` w prompcie systemowym na obu hostach, a następnie ponowne wejścia trybu trwałego aż do limitu wzmocnień. Workflow wydań publikuje wyemitowany pakiet w npm jako `oh-my-agent-opencode` przy każdym wydaniu CLI.

## Pakiet modu Command Code {#command-code-mod-package}

Hooki pliku ustawień Command Code (`.commandcode/settings.json`, instalowane przez `oma link`) obejmują tylko `SessionStart`, `PostToolUse` i `Stop`. [Mod](https://commandcode.ai/docs/mods) widzi pełny cykl życia, więc OMA emituje też pakiet modu:

```bash
oma emit --target commandcode-mod
```

Domyślne wyjście to `commandcode-mod/` (ignorowane przez git; drzewo jest generowane, nie commitowane). Jego `package.json` niesie słowo kluczowe `cmd-mod` i blok `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), więc jedna instalacja przynosi mostek hooków i każdą umiejętność OMA. `mods/oma.ts` mapuje hooki ModApi na handlery rdzenia przez `oma hook script --vendor commandcode --script <name>`: `transformInput` uruchamia keyword-detector i skill-injector (prompt przechodzi bez zmian), `appendSystemPrompt` wstrzykuje wykryty kontekst, `onSessionStart` uruchamia code-intelligence-primer i state-boundary, `beforeToolCall` uruchamia scm-guard (odmowa staje się `{block: true}`) i test-filter na `shell_command`, a `onStop` zamienia blokadę trybu trwałego w `{continue: true, reason}`. Pakiet nie ma zależności i nie wymaga kroku budowania; każdy hook działa w trybie fail-open bez CLI `oma`.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Zweryfikowano 2026-11-08 względem Command Code 1.88.5: `cmd mods inspect` zgłosiło zarejestrowane hooki, `cmd mods add -g <local path>` zainstalowało pakiet, a `cmd mods list` pokazało `oma · user · from local:…`, a sterowanie hookami modu wobec CLI wstrzyknęło `[OMA WORKFLOW: ORCHESTRATE]`, zablokowało `git add .env` i zwróciło kontynuację trybu trwałego. Tury `cmd -p` opartej na modelu nie ćwiczono (brak konta Command Code na maszynie testowej). Workflow wydań publikuje wyemitowany pakiet w npm jako `oh-my-agent-commandcode` przy każdym wydaniu CLI.

## Weryfikacja wtyczki Cursor {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f` udostępnia:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

CLI wtyczek nie ma polecenia instalacji pojedynczej wtyczki. Rejestracja marketplace jest operacją konta, która indeksuje repozytorium Git; nie daje izolowanej lokalnej kontroli instalacji. OMA nie rejestruje marketplace automatycznie podczas emisji.

2026-11-05 oba katalogi umiejętności commitowanego manifestu Cursor, katalog agentów, katalog reguł, plik MCP i logo rozstrzygnęły się wewnątrz repozytorium. Pomoc CLI potwierdziła obsługę ładowania lokalnego katalogu wtyczki. Rejestracji marketplace konta i żywej sesji modelu nie ćwiczono.

## Hosty wtyczek zgodne z Claude {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode i Kimi Code czytają manifesty wtyczek, których kształt wywodzi się z `.claude-plugin/plugin.json` Claude Code. `oma emit` generuje jeden natywny manifest na hosta ze źródła prawdy `.agents/`. Klon git tego repozytorium jest instalowalnym pakietem dla Grok, ZCode i Kimi; drzewo Antigravity jest generowane (`oma emit --target antigravity-plugin` albo asset wydania `oma-antigravity-plugin.tar.gz`), bo jego walidator odrzuca katalog główny repozytorium:

| Host | Cel emisji | Commitowany artefakt | Umiejętności | Agenci | MCP | Hooki |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | brak; emitowane `antigravity-plugin/` (samowystarczalne, asset wydania) | `skills/` | `agents/` (skonwertowane) | `mcp_config.json` | niedostarczane |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | główne `skills/` | `.agents/agents/*.md` | wbudowane `mcpServers` | niezadeklarowane |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | główne `skills/` | `.agents/agents/*.md` | wbudowane `mcpServers` | niezadeklarowane |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | główne `skills/` | `.agents/agents/*.md` | wbudowane `mcpServers` | niezadeklarowane |

Żaden z tych pakietów nie dostarcza hooków. Hooki wtyczki Claude rozstrzygają projekt z `CLAUDE_PROJECT_DIR` i `${CLAUDE_PLUGIN_ROOT}`, których te hosty nie ustawiają, a Antigravity i Kimi uruchamiają hooki wtyczki z katalogiem wtyczki jako katalogiem roboczym. Workflowy i hooki projektu pochodzą więc z CLI `oma` (`bun install -g oh-my-agent`, a następnie `oma install`), które dostarcza natywny mostek hooków każdego hosta. Umiejętności, agenci, reguły i serwery MCP działają bez niego.

W tym repozytorium źródłowym uruchom lokalne CLI jako `bun cli/cli.ts emit --target <target>`; `--output-dir <base>` zapisuje każdy artefakt pod `<base>` w tej samej ścieżce względnej. Bramka dryfu CI (`bun run --cwd cli check:emit-drift`) kończy się niepowodzeniem, gdy commitowany manifest różni się od świeżej emisji, a Release Please podbija wersję każdego commitowanego manifestu wraz z wydaniem CLI; generowane drzewa ścieżki lokalnej biorą wersję z tagu wydania, przy którym są emitowane.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

Pakiet jest zgodny z [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json` walidowany względem `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` plus jeden `rules/<rule>.md` na regułę OMA (`trigger: always_on | glob | model_decision`, `globs` rozdzielone przecinkami), `mcp_config.json`, `assets/logo.png` i README. Emitowane jest samowystarczalne drzewo, bo `agy plugin validate --strict` odrzuca katalog główny repozytorium (główne `AGENTS.md` i Claude `hooks/hooks.json` są raportowane jako nigdy nieładowane). Instaluj katalog `antigravity-plugin/`, nie URL ani katalog główny repozytorium: skierowane na katalog główny, agy ładuje znajdujący się tam `plugin.json` Agent Plugins — 33 umiejętności, bez agentów i reguł, a `mcp.json` tylko gdy włączona jest flaga `enable-agent-plugins-spec` (`agy plugin validate --json .`, agy 1.5.3).

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

Umiejętności ładują się jako `/<skill-name>`; serwery MCP dostają przestrzeń nazw `oma_<server>`. `agy plugin import claude` importuje też istniejącą instalację Claude Code. 2026-11-08 wyemitowane drzewo przeszło `agy plugin validate --strict` (agy 1.5.3) z 0 błędami i 0 ostrzeżeniami: 33 umiejętności, 12 agentów, 14 reguł, 3 serwery MCP.

### Grok Build CLI {#grok-build-cli}

Grok czyta wtyczki i marketplace Claude Code bez konfiguracji, więc `.claude-plugin/` już działa. Natywny `.grok-plugin/plugin.json` dodaje jawne deklaracje umiejętności, agentów i MCP, a `.grok-plugin/marketplace.json` wymienia ten sam wpis `oma` oraz korzenie domenowe `oma-frontend`, `oma-security`, `oma-research` co marketplace Claude, ze źródłami lokalnymi (`{"type": "local", "path": ...}`), formą akceptowaną przez walidator katalogu Grok bez przypiętego sha commita.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok nie był zainstalowany na hoście emitującym; manifest i katalog są sprawdzane strukturalnie przez testy CLI względem udokumentowanego zestawu pól i reguł katalogu `xai-org/plugin-marketplace`.

### ZCode {#zcode}

ZCode rozstrzyga najpierw `.zcode-plugin/plugin.json` i wraca do `.claude-plugin/plugin.json`, więc katalog główny repozytorium rozstrzyga się natywnie, a każdy korzeń domenowy przez swój manifest Claude. Instalacja jest tylko w GUI:

1. Otwórz **Settings → Plugins**.
2. Kliknij **Create → Add marketplace** (prawy górny róg) i podaj `first-fluke/oh-my-agent`, URL Git albo ścieżkę lokalnego klonu. ZCode waliduje marketplace przed dodaniem.
3. W segmencie **Personal** kliknij **Install** przy `oma` (albo wpisie domenowym) i poczekaj, aż status zmieni się na **Installed**. Wtyczki są domyślnie włączone.
4. Później użyj **Manage installed → Check for updates**; ZCode porównuje wersję wpisu katalogu w `.zcode-plugin/marketplace.json` z zainstalowanym `plugin.json`, więc oba śledzą wydanie CLI.

ZCode nie był zainstalowany na hoście emitującym; wzorzec nazwy manifestu (`^[a-z0-9][a-z0-9._-]{0,127}$`), zestaw pól i kształt marketplace są zapewniane przez testy CLI.

### Kimi Code CLI {#kimi-code-cli}

`.kimi-plugin/plugin.json` wskazuje `skills` na główny katalog skanowania `skills/`, wymienia każdy plik `.agents/agents/*.md` (już w formacie agenta Kimi: frontmatter `name` i `description`, treść Markdown jako prompt systemowy), wbudowuje `mcpServers` i niesie blok `interface` pokazywany przez `/plugins`.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi kopiuje wtyczkę do `$KIMI_CODE_HOME/plugins/managed/oma/` i stosuje ją do każdego projektu; umiejętności wywołuje się jako `/skill:oma:<skill-name>`. Kimi nie był zainstalowany na hoście emitującym; powierzchnia manifestu (dozwolone pola, reguła ścieżki `./`, zestaw pól hooków) jest zapewniana przez testy CLI.

## Qwen Agent Board {#qwen-agent-board}

Eksperymentalna [dokumentacja Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) opisuje `qwen board task`, `claim`, `done`, `ask` i `answer`. Tablica koordynuje pliki lokalne; nie uruchamia, nie dołącza ani nie monitoruje procesów agentów.

OMA może przekazywać jawne operacje tablicy, gdy zainstalowane CLI Qwen ogłasza polecenie `board`:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

Adapter obsługuje też `claim`, `ask`, `answer` i `decline`. Przed przekazaniem operacji sprawdza pomoc katalogu głównego. Uzupełnia stan wykonania i pokwitowania OMA; nigdy nie oznacza pracy OMA jako ukończonej automatycznie.

Zainstalowany Qwen Code 0.20.1 nie udostępniał poleceń CLI `board` ani `agents` w dniu 2026-11-05. `qwen board --help` zwróciło pomoc katalogu głównego, więc ta instalacja nie przechodzi kontroli możliwości. Rzeczywista natywna operacja tablicy pozostaje niezweryfikowana; nie ma integracji `agents join`.
