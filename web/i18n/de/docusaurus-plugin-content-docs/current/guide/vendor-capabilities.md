---
title: Vendor-Fähigkeiten und Pakete
description: Skill-Erkennung, Agentendefinitionen, Hooks und Paketformate über die OMA-Vendors.
---

# Vendor-Fähigkeiten und Pakete

`cli/constants/vendor-capabilities.ts` hält für jeden unterstützten Host die Skill-Erkennung, das Agentenverzeichnis, die Hook-Bridge und das Paketmanifest fest. Die Vendor-Schlüssel entsprechen `ALL_CLI_VENDORS`; die Pfade der Skill-Projektion kommen aus `CLI_SKILLS_DIR`, damit Projekt- und globale Installationen ihre bestehenden Ziele behalten.

| Host | Gemeinsame Skills ohne Vendor-Links | Agentenverzeichnis | Hook-Bridge | Paketmanifest |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Nein | — | Einstellungen | `antigravity-plugin/plugin.json` |
| Claude Code | Nein | `.claude/agents` | Einstellungen | `.claude-plugin/plugin.json` |
| Codex | Nein | `.codex/agents` | Einstellungen | `plugin.json` |
| Command Code | Nein | `.commandcode/agents` | Einstellungen | `commandcode-mod/package.json` |
| Copilot CLI | Nein | `.github/agents` | Einstellungen | `plugin.json` (Agent Plugins package) |
| Cursor | Nein | `.cursor/agents` | Einstellungen | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Einstellungen | `.grok-plugin/plugin.json` |
| Hermes | Nein | — | — | `plugin.json` (Agent Plugins package) |
| Kilo Code | Ja | `.kilo/agents` | Erweiterung | `opencode-package/package.json` |
| Kimi | Nein | — | Einstellungen | `.kimi-plugin/plugin.json` |
| Kiro | Nein | `.kiro/agents` | Einstellungen | `plugin.json` (Agent Plugins package) |
| OpenCode | Nein | `.opencode/agents` | Erweiterung | `opencode-package/package.json` |
| Pi | Ja | — | Erweiterung | `pi-package/package.json` |
| Qwen Code | Ja | `.qwen/agents` | Einstellungen | `plugin.json` (Agent Plugins package) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

„Ohne Vendor-Links“ bedeutet, dass OMA die gemeinsame Erkennung in beiden Installationsmodi nutzen kann. Die reine Projektsuche von Kimi ersetzt nicht die bestehende globale Skill-Projektion. Eine Hook-Bridge oder ein Agentenverzeichnis bedeutet keinen Subprozess-Laufzeitadapter. Gemini ist kein OMA-Vendor; die Antigravity CLI hat eine eigene Integration.

## Agent-Plugins-Paket {#agent-plugins-package}

Das Repository-Root ist ein [Agent Plugins 1.0](https://agent-plugins.org/)-Paket, und `oma emit` erzeugt es aus der `.agents/`-SSOT neu:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Git- und Marketplace-Installationen klonen das Repository ohne Abhängigkeiten, daher ist das Root das Paket. Eine Installation über einen lokalen Pfad oder `owner/repo:path` kopiert stattdessen das Verzeichnis, auf das Sie zeigen, und das Repository-Root trägt außerdem den Quellbaum, `node_modules` und die Website. Verwenden Sie dafür die saubere Kopie, die `oma emit --target agent-plugin` nach `codex-plugin/` schreibt (in diesem Repository: `bun cli/cli.ts emit --target agent-plugin`), oder entpacken Sie `oma-agent-plugin.tar.gz` aus einem [GitHub-Release](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` wird erzeugt und ist gitignored, nicht committet. Weil jeder Host diesen Baum vollständig installiert, verweisen seine Skills auf eine Kopie der gemeinsamen Leitfäden unter `skills/_shared/`; nur das Root-`skills/` bündelt sie in jeden Skill, denn `bunx skills use first-fluke/oh-my-agent@<skill>` kopiert ein einzelnes Skill-Verzeichnis daraus.

Die Manifest-Keywords (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) sind zugleich Kiros Aktivierungswortschatz. Das Manifest deklariert keine Komponentenpfade, was die Spezifikation verbietet; jeder Host liest die festen Orte. Kein Host braucht neben `plugin.json` ein natives Manifest: Copilot liest ein Root-Manifest von Agent Plugins vor `.claude-plugin/plugin.json`, und Qwen Code lädt das Paket über seinen Agent-Plugins-Adapter, ohne `qwen-extension.json` zu erzeugen.

| Host | Lädt | Installation |
| --- | --- | --- |
| GitHub Copilot CLI | Skills, MCP-Server und aus `com.github.copilot/`: 12 benutzerdefinierte Agenten, 20 Workflow-Slash-Befehle, 6 dateibezogene Regeln, 4 Lifecycle-Hooks | `copilot plugin install first-fluke/oh-my-agent` (klont das Root-Paket), `copilot plugin install /absolute/path/to/codex-plugin` auf der erzeugten Kopie, oder `copilot plugin marketplace add first-fluke/oh-my-agent` und danach `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | Skills und MCP-Server (Servernamen erhalten bei der Installation einen Namespace); Aktivierung über die Manifest-Keywords | `kiro-cli powers install /absolute/path/to/codex-plugin` auf der erzeugten Kopie (CLI 2.25+), oder **Add Custom Power → Import power from GitHub** mit der Repository-URL |
| Qwen Code | Skills und MCP-Server als Erweiterung `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` oder `qwen extensions link /absolute/path/to/codex-plugin` auf der erzeugten Kopie (Ursprung Agent Plugins). Die nackte Repository-URL öffnet Qwens interaktive Plugin-Auswahl, weil das Root auch den Claude-Marketplace trägt; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` wählt den Eintrag `oma` dieses Marketplaces nicht interaktiv (laut Qwens Dokumentation wird er danach aus dem Claude-Manifest umgewandelt). |
| Hermes Agent | Skills als `oma:<skill>` und die MCP-Server für stdio und Streamable HTTP | `hermes plugins install first-fluke/oh-my-agent --no-enable`, danach `hermes plugins enable oma` |
| Codex | Skills und MCP-Server | `codex plugin marketplace add first-fluke/oh-my-agent`, danach `codex plugin add oma@oh-my-agent` |

### Komponenten der Copilot CLI {#copilot-cli-components}

Copilot liest nicht portable Komponenten aus dem Namespace `com.github.copilot/`, den `oma emit` aus der SSOT füllt:

- `agents/<name>.agent.md`: dieselben benutzerdefinierten Copilot-Agenten, die eine Projektinstallation nach `.github/agents/` schreibt.
- `commands/<workflow>.md`: ein Slash-Befehl pro verfügbarem Workflow; jeder liest `.agents/workflows/<workflow>.md` des Projekts.
- `rules/<rule>.instructions.md`: die Regeln mit einem Datei-Glob (`applyTo`) oder `alwaysApply: true`; Regeln auf Anfrage bleiben bei der Projektinstallation.
- `hooks/hooks.json` mit `scripts/plugin-bootstrap.sh` und `scripts/plugin-hook.sh`: dieselben fail-open-Skripte wie der Marketplace-Eintrag von Claude Code, ausgeführt mit `OMA_PLUGIN_VENDOR=copilot`. SessionStart stellt die CLI bereit und führt `oma install --yes` für das aktuelle Projekt aus; UserPromptSubmit, PreToolUse (Bash) und Stop leiten an `oma hook --vendor copilot` weiter, bis die eigene Registrierung `.github/hooks/oma.json` des Projekts übernimmt. Jeder Befehl endet mit `|| true`, sodass eine fehlende CLI oder ein nicht aufgelöstes Plugin-Root einen Tool-Aufruf nie blockiert.

Workflows, Agenten und Regeln verweisen auf den `.agents/`-Baum des Projekts. Ohne die oma-CLI stellt das Paket weiterhin Skills und MCP-Server bereit; der Bootstrap-Hook ergänzt den Rest in der ersten Sitzung.

### Prüfprotokoll {#validation-record}

Geprüft am 2026-11-08, wobei das Home jedes Hosts auf ein temporäres Verzeichnis zeigte; es lief kein Modellaufruf, Hook oder MCP-Server. `<path>/codex-plugin` ist der Baum, den `oma emit --target agent-plugin` schreibt:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` meldete `Installed 33 skills`; `plugin list --json` zeigt `oma` in der Paketversion als aktiviert; die zwischengespeicherte Kopie unter `installed-plugins/_direct/` enthält `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` gefolgt von `copilot plugin install oma@oh-my-agent` installierte den vollständigen Eintrag auch live aus dem Checkout. Copilot warnt, dass direkte Installationen zugunsten von `plugin@marketplace` veraltet sind.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (mit `KIRO_HOME` und `KIRO_DATA_DIR` auf dem temporären Verzeichnis) meldete `Installed power "oma"` und kopierte das Paket nach `powers/installed/oma/`. Kiro ignoriert `USERPROFILE`; verwenden Sie `KIRO_HOME`, um das Home zu verlegen.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` meldete `installed successfully and enabled`; `qwen extensions list` zeigt `Origin: AgentPlugins`, 33 Skills und die MCP-Server `context7`, `serena` und `aside`.
- Hermes Agent: hier nicht installiert. Manifest, Skill-Frontmatter und `mcp.json` wurden gegen die Regeln in Hermes' `hermes_cli/agent_plugins.py` geprüft (keine unbekannten Felder, gültige Namen, stdio-Befehle als einzelne Tokens); Hermes verlangt keinen Block `extensions["com.nousresearch.hermes"]`.

Die CI erzeugt das Paket aus dem Checkout und installiert es bei jedem Push in festgeschriebene Releases von Copilot CLI und Qwen Code (Job `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Pi-Pakete {#pi-packages}

Pi erkennt Projekt-`.agents/skills` und globale `~/.agents/skills` direkt. Eine Projektinstallation von OMA braucht daher keine Projektion nach `.pi/skills`.

Für die Verteilung außerhalb einer OMA-Installation erzeugt die Release-Pipeline das Pi-Skill-Paket und veröffentlicht es auf npm als `oh-my-agent-pi`; oder Sie erzeugen es selbst:

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

Führen Sie in diesem Quell-Repository die lokale CLI als `bun cli/cli.ts emit --target pi-package` aus. Die Standardausgabe ist `pi-package/` (gitignored; der Baum wird erzeugt, nicht committet); `--output-dir <base>` schreibt ihn unter `<base>/pi-package/`.

Die erzeugte `package.json` deklariert `pi.skills: ["./skills"]`, enthält das Keyword `pi-package` und verwendet die Repository-Version. Die gemeinsamen Leitfäden, auf die Skills verweisen, werden einmal unter `skills/_shared/` erzeugt (pi lädt das Paket vollständig), daher trägt kein Skill eine eigene Kopie. Das Paket hat keine Workspace-Abhängigkeiten und keine Installationsskripte. Es verteilt Skills; die Projektinstallation von OMA liefert die Pi-Hook-Erweiterung getrennt.

Pi unterstützt außerdem Git- und npm-Quellen. Das Repository deklariert seine Quell-Skills bereits in der Root-`package.json`, sodass `pi install git:github.com/first-fluke/oh-my-agent@<tag>` sie finden kann. Pi führt für Git-Pakete mit `package.json` die Abhängigkeitsinstallation aus; das erzeugte Paket vermeidet den Abhängigkeitsbaum des Quell-Workspace. `oma emit` selbst veröffentlicht nicht; der Release-Workflow veröffentlicht das erzeugte Paket auf npm.

Dieses Format wurde am 2026-11-05 gegen die Dokumentation und den Paket-Resolver des installierten Pi 0.78.1 geprüft. Die nur lesende Auflösung sowohl des Quell-Repositorys als auch des erzeugten Pakets lud 33 Skills mit null Diagnosen, ohne ein Paket zu installieren oder ein Modell zu kontaktieren.

## Plugin-Paket für OpenCode und Kilo Code {#opencode-and-kilo-code-plugin-package}

`oma link` installiert die Hook-Bridge der opencode-Familie pro Projekt: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` für Kilo) plus die Handler-Einträge, die sie startet, registriert unter `plugin` in `opencode.json` / `kilo.json`. Dieselbe Bridge wird auch als npm-Plugin-Paket erzeugt, damit ein Projekt (oder eine globale Konfiguration) sie ohne Installation pro Projekt laden kann:

```bash
oma emit --target opencode-package
```

Die Standardausgabe ist `opencode-package/` (das einzige erzeugte Paket, das committet bleibt, damit ein Klon es als Verzeichnis-Plugin laden kann); `--output-dir <base>` schreibt es unter `<base>/opencode-package/`. Das Paket (`oh-my-agent-opencode`) enthält die unveränderte SSOT-Bridge (`oma.ts`), einen Paketeinstieg (`index.ts`, die `main`/`exports`), einen erzeugten Handler-Einstieg pro eigenständigem Hook-Skript (jedes führt `oma hook script --vendor opencode --script <name>` aus), `filter-test-output.sh` und eine README. Es hat keine Abhängigkeiten; die `oma`-CLI muss im PATH liegen und `bun` muss installiert sein, und jeder Hook fällt offen aus, wenn eines von beiden fehlt.

Die beiden Hosts laden Paket-Plugins über verschiedene Verträge, und der Einstieg bedient beide aus einem Default-Export: OpenCode 2.x liest `{ id, setup(ctx) }`, und `setup` registriert `ctx.session.hook("prompt" | "context" | "experimental.idle")` sowie `ctx.tool.hook("execute.before")`, jeweils auf die Handler `chat.message`, `experimental.chat.system.transform`, `session.idle` und `tool.execute.before` der Bridge abgebildet; Kilo Code und OpenCode 1.18.29+ verlangen ein Objekt mit `server()`, und das ist die Bridge selbst. Die Handler-Logik wird nicht dupliziert.

Registrieren Sie es über den Paketnamen in `.opencode/opencode.json` (Projekt) oder `~/.config/opencode/opencode.json` (global); OpenCode installiert npm-Plugins beim Start in seinen Cache:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code liest denselben Schlüssel aus `.kilo/kilo.json` oder `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` trägt den Eintrag für Sie ein. Beide Hosts dispatchen mit der gemeinsamen Identität `opencode`, die im Claude-JSON-Dialekt antwortet, den die Bridge liest. Ein Projekt, in dem `oma link` bereits `./plugins/oma/oma.ts` registriert hat, braucht das Paket nicht; behalten Sie eines von beiden.

OpenCode 2.x akzeptiert außerdem ein Verzeichnis-Plugin (`"plugin": ["../path/to/opencode-package"]`, relativ zur Konfigurationsdatei), das das erzeugte Paket ohne npm lädt. OpenCode 2.x verlangt, dass konfigurierte Plugin-Pfade Verzeichnisse sind, und lehnt einen Eintrag aus einer einzelnen Datei ab: die projektbezogene Registrierung `./plugins/oma/oma.ts`, die `oma link` schreibt, wird dort übersprungen („configured plugin path must be a directory“). Verwenden Sie auf OpenCode 2.x daher dieses Paket; Kilo Code lädt die projektbezogene Datei weiterhin.

Geprüft am 2026-11-08 gegen OpenCode 2.2.6 und Kilo Code CLI 7.8.27: beide lösten `plugin: ["oh-my-agent-opencode"]` aus der Projektkonfiguration auf (`opencode debug config`, `kilo debug config`), OpenCode versuchte die npm-Installation (ein 404, bis das Paket veröffentlicht ist) und blieb fail-open, und mit dem Paket im Plugin-Cache jedes Hosts (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`) erhielt ein Lauf ohne Benutzeroberfläche `run "orchestrate: say hi"` gegen einen lokalen OpenAI-kompatiblen Endpunkt auf beiden Hosts `[OMA WORKFLOW: ORCHESTRATE]` im System-Prompt, gefolgt von den Wiedereintritten des persistenten Modus bis zur Verstärkungsgrenze. Der Release-Workflow veröffentlicht das erzeugte Paket mit jedem CLI-Release auf npm als `oh-my-agent-opencode`.

## Mod-Paket für Command Code {#command-code-mod-package}

Die Hooks in der Einstellungsdatei von Command Code (`.commandcode/settings.json`, installiert durch `oma link`) decken nur `SessionStart`, `PostToolUse` und `Stop` ab. Ein [Mod](https://commandcode.ai/docs/mods) sieht den vollständigen Lebenszyklus, daher erzeugt OMA auch ein Mod-Paket:

```bash
oma emit --target commandcode-mod
```

Die Standardausgabe ist `commandcode-mod/` (gitignored; der Baum wird erzeugt, nicht committet). Seine `package.json` trägt das Keyword `cmd-mod` und einen Block `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), sodass eine Installation die Hook-Bridge und jeden OMA-Skill mitbringt. `mods/oma.ts` bildet die ModApi-Hooks über `oma hook script --vendor commandcode --script <name>` auf die Core-Handler ab: `transformInput` führt keyword-detector und skill-injector aus (der Prompt geht unverändert durch), `appendSystemPrompt` injiziert den erkannten Kontext, `onSessionStart` führt code-intelligence-primer und state-boundary aus, `beforeToolCall` führt scm-guard (ein Deny wird zu `{block: true}`) und test-filter auf `shell_command` aus, und `onStop` wandelt eine Blockade des persistenten Modus in `{continue: true, reason}` um. Das Paket hat keine Abhängigkeiten und braucht keinen Build-Schritt; jeder Hook fällt ohne die `oma`-CLI offen aus.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Geprüft am 2026-11-08 gegen Command Code 1.88.5: `cmd mods inspect` meldete die registrierten Hooks, `cmd mods add -g <local path>` installierte das Paket und `cmd mods list` zeigte `oma · user · from local:…`, und das Antreiben der Hooks des Mods gegen die CLI injizierte `[OMA WORKFLOW: ORCHESTRATE]`, blockierte `git add .env` und gab ein Continue des persistenten Modus zurück. Ein modellgestützter Zug `cmd -p` wurde nicht ausgeführt (kein Command-Code-Konto auf dem Testrechner). Der Release-Workflow veröffentlicht das erzeugte Paket mit jedem CLI-Release auf npm als `oh-my-agent-commandcode`.

## Prüfung des Cursor-Plugins {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f` stellt bereit:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

Seine Plugin-CLI hat keinen Befehl zur Installation eines einzelnen Plugins. Die Marketplace-Registrierung ist eine Konto-Operation, die ein Git-Repository indiziert; sie bietet keine isolierte lokale Installationsprüfung. OMA registriert während des Erzeugens nicht automatisch einen Marketplace.

Am 2026-11-05 lösten sich die beiden Skill-Verzeichnisse, das Agentenverzeichnis, das Regelverzeichnis, die MCP-Datei und das Logo des committeten Cursor-Manifests innerhalb des Repositorys auf. Die CLI-Hilfe bestätigte die Unterstützung für das Laden eines lokalen Plugin-Verzeichnisses. Die Marketplace-Registrierung des Kontos und eine Live-Modellsitzung wurden nicht ausgeführt.

## Claude-kompatible Plugin-Hosts {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode und Kimi Code lesen Plugin-Manifeste, deren Form von `.claude-plugin/plugin.json` von Claude Code abstammt. `oma emit` erzeugt aus der Wahrheitsquelle `.agents/` je Host ein natives Manifest. Ein Git-Klon dieses Repositorys ist das installierbare Paket für Grok, ZCode und Kimi; der Antigravity-Baum wird erzeugt (`oma emit --target antigravity-plugin` oder das Release-Asset `oma-antigravity-plugin.tar.gz`), weil sein Validator das Repository-Root ablehnt:

| Host | Emit-Ziel | Committetes Artefakt | Skills | Agenten | MCP | Hooks |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | keines; erzeugtes `antigravity-plugin/` (in sich geschlossen, Release-Asset) | `skills/` | `agents/` (konvertiert) | `mcp_config.json` | nicht ausgeliefert |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | Root-`skills/` | `.agents/agents/*.md` | eingebettete `mcpServers` | nicht deklariert |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | Root-`skills/` | `.agents/agents/*.md` | eingebettete `mcpServers` | nicht deklariert |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | Root-`skills/` | `.agents/agents/*.md` | eingebettete `mcpServers` | nicht deklariert |

Keines dieser Pakete liefert Hooks aus. Die Claude-Plugin-Hooks lösen das Projekt aus `CLAUDE_PROJECT_DIR` und `${CLAUDE_PLUGIN_ROOT}` auf, die diese Hosts nicht setzen, und Antigravity und Kimi führen Plugin-Hooks mit dem Plugin-Verzeichnis als Arbeitsverzeichnis aus. Workflows und Projekt-Hooks kommen daher von der `oma`-CLI (`bun install -g oh-my-agent`, danach `oma install`), die die native Hook-Bridge jedes Hosts bereitstellt. Skills, Agenten, Regeln und MCP-Server funktionieren ohne sie.

Führen Sie in diesem Quell-Repository die lokale CLI als `bun cli/cli.ts emit --target <target>` aus; `--output-dir <base>` schreibt jedes Artefakt unter `<base>` auf demselben relativen Pfad. Das CI-Drift-Gate (`bun run --cwd cli check:emit-drift`) schlägt fehl, wenn ein committetes Manifest von einem frischen Emit abweicht, und Release Please hebt die Version jedes committeten Manifests mit dem CLI-Release an; die erzeugten Bäume für lokale Pfade nehmen ihre Version vom Release-Tag, bei dem sie erzeugt werden.

### Antigravity CLI (`agy`)

Das Paket folgt [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json`, validiert gegen `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` plus eine `rules/<rule>.md` pro OMA-Regel (`trigger: always_on | glob | model_decision`, kommagetrennte `globs`), `mcp_config.json`, `assets/logo.png` und eine README. Ein in sich geschlossener Baum wird erzeugt, weil `agy plugin validate --strict` das Repository-Root ablehnt (die Root-`AGENTS.md` und Claudes `hooks/hooks.json` werden als nie geladen gemeldet). Installieren Sie das Verzeichnis `antigravity-plugin/`, nicht die Repository-URL oder das Root: zeigt man auf das Root, lädt agy dort stattdessen die Agent-Plugins-`plugin.json`, also 33 Skills, keine Agenten oder Regeln, und `mcp.json` nur, solange das Flag `enable-agent-plugins-spec` an ist (`agy plugin validate --json .`, agy 1.5.3).

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

Skills werden als `/<skill-name>` geladen; MCP-Server erhalten den Namespace `oma_<server>`. `agy plugin import claude` importiert außerdem eine vorhandene Claude-Code-Installation. Am 2026-11-08 bestand der erzeugte Baum `agy plugin validate --strict` (agy 1.5.3) mit 0 Fehlern und 0 Warnungen: 33 Skills, 12 Agenten, 14 Regeln, 3 MCP-Server.

### Grok Build CLI

Grok liest Claude-Code-Plugins und Marketplaces ohne Einrichtung, daher funktioniert `.claude-plugin/` bereits. Die native `.grok-plugin/plugin.json` ergänzt ausdrückliche Deklarationen für Skills, Agenten und MCP, und `.grok-plugin/marketplace.json` listet denselben Eintrag `oma` sowie die Domänen-Roots `oma-frontend`, `oma-security` und `oma-research` wie der Claude-Marketplace, mit lokalen Quellen (`{"type": "local", "path": ...}`), der Form, die Groks Katalog-Validator ohne festgeschriebenen Commit-SHA akzeptiert.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok war auf dem erzeugenden Host nicht installiert; Manifest und Katalog werden von den CLI-Tests strukturell gegen die dokumentierte Feldmenge und die Katalogregeln von `xai-org/plugin-marketplace` geprüft.

### ZCode

ZCode löst zuerst `.zcode-plugin/plugin.json` auf und fällt auf `.claude-plugin/plugin.json` zurück, daher löst sich das Repository-Root nativ auf und jedes Domänen-Root über sein Claude-Manifest. Die Installation erfolgt nur über die Oberfläche:

1. Öffnen Sie **Settings → Plugins**.
2. Klicken Sie auf **Create → Add marketplace** (oben rechts) und geben Sie `first-fluke/oh-my-agent`, die Git-URL oder den Pfad eines lokalen Klons ein. ZCode prüft den Marketplace, bevor es ihn hinzufügt.
3. Klicken Sie im Segment **Personal** auf **Install** bei `oma` (oder einem Domänen-Eintrag) und warten Sie, bis der Status zu **Installed** wechselt. Plugins sind standardmäßig aktiviert.
4. Verwenden Sie später **Manage installed → Check for updates**; ZCode vergleicht die Katalogversionsangabe in `.zcode-plugin/marketplace.json` mit der installierten `plugin.json`, daher folgen beide dem CLI-Release.

ZCode war auf dem erzeugenden Host nicht installiert; das Namensmuster des Manifests (`^[a-z0-9][a-z0-9._-]{0,127}$`), die Feldmenge und die Marketplace-Form werden von den CLI-Tests zugesichert.

### Kimi Code CLI

`.kimi-plugin/plugin.json` zeigt `skills` auf das Scan-Verzeichnis `skills/` im Root, listet jede Datei `.agents/agents/*.md` (bereits in Kimis Agentenformat: Frontmatter `name` und `description`, Markdown-Körper als System-Prompt), setzt `mcpServers` inline und trägt den Block `interface`, den `/plugins` anzeigt.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi kopiert das Plugin nach `$KIMI_CODE_HOME/plugins/managed/oma/` und wendet es auf jedes Projekt an; Skills werden als `/skill:oma:<skill-name>` aufgerufen. Kimi war auf dem erzeugenden Host nicht installiert; die Manifest-Oberfläche (erlaubte Felder, die Pfadregel `./`, die Hook-Feldmenge) wird von den CLI-Tests zugesichert.

## Qwen Agent Board

Die experimentelle [Dokumentation zum Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) beschreibt `qwen board task`, `claim`, `done`, `ask` und `answer`. Das Board koordiniert lokale Dateien; es startet, verbindet oder überwacht keine Agentenprozesse.

OMA kann ausdrückliche Board-Operationen weiterleiten, wenn die installierte Qwen-CLI den Befehl `board` anbietet:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

Der Adapter unterstützt außerdem `claim`, `ask`, `answer` und `decline`. Er prüft die Root-Hilfe, bevor er eine Operation weiterleitet. Er ergänzt den Ausführungszustand und die Belege von OMA; er markiert OMA-Arbeit nie automatisch als abgeschlossen.

Das installierte Qwen Code 0.20.1 bot am 2026-11-05 die CLI-Befehle `board` und `agents` nicht an. `qwen board --help` gab die Root-Hilfe zurück, daher besteht diese Installation die Fähigkeitsprüfung nicht. Eine echte native Board-Operation bleibt ungeprüft; es gibt keine Integration `agents join`.
