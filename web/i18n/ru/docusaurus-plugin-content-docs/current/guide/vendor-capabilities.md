---
title: Возможности и пакеты поставщиков
description: Обнаружение навыков, определения агентов, хуки и форматы пакетов у поставщиков OMA.
---

# Возможности и пакеты поставщиков

`cli/constants/vendor-capabilities.ts` записывает обнаружение навыков, каталог агентов, мост хуков и манифест пакета каждого поддерживаемого хоста. Ключи поставщиков совпадают с `ALL_CLI_VENDORS`; пути проекции навыков берутся из `CLI_SKILLS_DIR`, поэтому проектная и глобальная установки сохраняют существующие назначения.

| Хост | Общие навыки без ссылок поставщика | Каталог агентов | Мост хуков | Манифест пакета |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Нет | — | Settings | `antigravity-plugin/plugin.json` |
| Claude Code | Нет | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | Нет | `.codex/agents` | Settings | `plugin.json` |
| Command Code | Нет | `.commandcode/agents` | Settings | `commandcode-mod/package.json` |
| Copilot CLI | Нет | `.github/agents` | Settings | `plugin.json` (пакет Agent Plugins) |
| Cursor | Нет | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Settings | `.grok-plugin/plugin.json` |
| Hermes | Нет | — | — | `plugin.json` (пакет Agent Plugins) |
| Kilo Code | Да | `.kilo/agents` | Extension | `opencode-package/package.json` |
| Kimi | Нет | — | Settings | `.kimi-plugin/plugin.json` |
| Kiro | Нет | `.kiro/agents` | Settings | `plugin.json` (пакет Agent Plugins) |
| OpenCode | Нет | `.opencode/agents` | Extension | `opencode-package/package.json` |
| Pi | Да | — | Extension | `pi-package/package.json` |
| Qwen Code | Да | `.qwen/agents` | Settings | `plugin.json` (пакет Agent Plugins) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

«Без ссылок поставщика» значит, что OMA может использовать общее обнаружение в обоих режимах установки. Одно только сканирование проекта у Kimi не заменяет существующую глобальную проекцию навыков. Мост хуков или каталог агентов не означают адаптер runtime подпроцесса. Gemini не является поставщиком OMA; у Antigravity CLI своя интеграция.

## Пакет Agent Plugins {#agent-plugins-package}

Корень репозитория — это пакет [Agent Plugins 1.0](https://agent-plugins.org/), и `oma emit` заново создаёт его из SSOT `.agents/`:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Установки через Git и marketplace клонируют репозиторий без зависимостей, поэтому пакетом является корень. Установка по локальному пути или `owner/repo:path` вместо этого копирует каталог, на который вы указываете, а корень репозитория также содержит дерево исходников, `node_modules` и сайт. Для них используйте чистую копию, которую `oma emit --target agent-plugin` записывает в `codex-plugin/` (в этом репозитории: `bun cli/cli.ts emit --target agent-plugin`), или распакуйте `oma-agent-plugin.tar.gz` из [релиза GitHub](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` генерируется и игнорируется Git, в репозиторий не коммитится. Поскольку каждый хост устанавливает это дерево целиком, его навыки ссылаются на одну копию общих руководств в `skills/_shared/`; только корневой `skills/` вкладывает их в каждый навык, потому что `bunx skills use first-fluke/oh-my-agent@<skill>` копирует из него один каталог навыка.

Ключевые слова манифеста (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) — это также словарь активации Kiro. Манифест не объявляет пути компонентов, что спецификация запрещает; каждый хост читает фиксированные расположения. Ни одному хосту не нужен нативный манифест рядом с `plugin.json`: Copilot читает корневой манифест Agent Plugins раньше `.claude-plugin/plugin.json`, а Qwen Code загружает пакет через свой адаптер Agent Plugins, не создавая `qwen-extension.json`.

| Хост | Загружает | Установка |
| --- | --- | --- |
| GitHub Copilot CLI | навыки, MCP-серверы и из `com.github.copilot/`: 12 пользовательских агентов, 20 slash-команд рабочих процессов, 6 правил с областью файла, 4 хука жизненного цикла | `copilot plugin install first-fluke/oh-my-agent` (клонирует корневой пакет), `copilot plugin install /absolute/path/to/codex-plugin` на сгенерированной копии или `copilot plugin marketplace add first-fluke/oh-my-agent`, затем `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | навыки и MCP-серверы (имена серверов при установке получают пространство имён); активируется по ключевым словам манифеста | `kiro-cli powers install /absolute/path/to/codex-plugin` на сгенерированной копии (CLI 2.25+) или **Add Custom Power → Import power from GitHub** с URL репозитория |
| Qwen Code | навыки и MCP-серверы как расширение `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` или `qwen extensions link /absolute/path/to/codex-plugin` на сгенерированной копии (происхождение Agent Plugins). Голый URL репозитория открывает интерактивный выбор плагина Qwen, потому что корень также несёт marketplace Claude; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` неинтерактивно выбирает запись `oma` этого marketplace (по документации Qwen она затем преобразуется из манифеста Claude). |
| Hermes Agent | навыки как `oma:<skill>` и MCP-серверы stdio / Streamable HTTP | `hermes plugins install first-fluke/oh-my-agent --no-enable`, затем `hermes plugins enable oma` |
| Codex | навыки и MCP-серверы | `codex plugin marketplace add first-fluke/oh-my-agent`, затем `codex plugin add oma@oh-my-agent` |

### Компоненты Copilot CLI

Copilot читает непереносимые компоненты из пространства имён `com.github.copilot/`, которое `oma emit` заполняет из SSOT:

- `agents/<name>.agent.md`: те же пользовательские агенты Copilot, которые установка проекта записывает в `.github/agents/`.
- `commands/<workflow>.md`: одна slash-команда на доступный рабочий процесс; каждая читает `.agents/workflows/<workflow>.md` проекта.
- `rules/<rule>.instructions.md`: правила с glob файла (`applyTo`) или `alwaysApply: true`; правила по запросу остаются у установки проекта.
- `hooks/hooks.json` со `scripts/plugin-bootstrap.sh` и `scripts/plugin-hook.sh`: те же fail-open скрипты, что у записи marketplace Claude Code, запускаются с `OMA_PLUGIN_VENDOR=copilot`. SessionStart готовит CLI и выполняет `oma install --yes` для текущего проекта; UserPromptSubmit, PreToolUse (Bash) и Stop передаются в `oma hook --vendor copilot`, пока регистрация собственного `.github/hooks/oma.json` проекта не перехватит их. Каждая команда заканчивается `|| true`, поэтому отсутствующий CLI или неразрешённый корень плагина никогда не блокируют вызов инструмента.

Рабочие процессы, агенты и правила ссылаются на дерево `.agents/` проекта. Без CLI oma пакет всё ещё даёт навыки и MCP-серверы; хук bootstrap добавляет остальное в первой сессии.

### Запись проверки

Проверено 2026-11-08: домашний каталог каждого хоста указывал на временный каталог; вызова модели, хука или MCP-сервера не было. `<path>/codex-plugin` — это дерево, которое записывает `oma emit --target agent-plugin`:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` сообщил `Installed 33 skills`; `plugin list --json` показывает `oma` включённым на версии пакета; кэшированная копия в `installed-plugins/_direct/` содержит `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` с последующим `copilot plugin install oma@oh-my-agent` также установил полную запись напрямую из checkout. Copilot предупреждает, что прямые установки устарели в пользу `plugin@marketplace`.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (с `KIRO_HOME` и `KIRO_DATA_DIR` на временном каталоге) сообщил `Installed power "oma"` и скопировал пакет в `powers/installed/oma/`. Kiro игнорирует `USERPROFILE`; чтобы перенести его домашний каталог, используйте `KIRO_HOME`.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` сообщил `installed successfully and enabled`; `qwen extensions list` показывает `Origin: AgentPlugins`, 33 навыка и MCP-серверы `context7`, `serena` и `aside`.
- Hermes Agent: здесь не установлен. Манифест, frontmatter навыков и `mcp.json` сверены с правилами в `hermes_cli/agent_plugins.py` Hermes (нет неизвестных полей, имена корректны, команды stdio — одиночные токены); Hermes не требует блока `extensions["com.nousresearch.hermes"]`.

CI создаёт пакет из checkout и устанавливает его в закреплённые релизы Copilot CLI и Qwen Code на каждый push (задание `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Пакеты Pi

Pi обнаруживает проектные `.agents/skills` и глобальные `~/.agents/skills` напрямую. Поэтому установка OMA в проект не требует проекции `.pi/skills`.

Для распространения вне установки OMA конвейер релиза создаёт пакет навыков Pi и публикует его в npm как `oh-my-agent-pi`; либо создайте его сами:

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

В этом репозитории исходников запускайте локальный CLI как `bun cli/cli.ts emit --target pi-package`. Вывод по умолчанию — `pi-package/` (игнорируется Git; дерево генерируется, не коммитится); `--output-dir <base>` записывает его в `<base>/pi-package/`.

Сгенерированный `package.json` объявляет `pi.skills: ["./skills"]`, включает ключевое слово `pi-package` и использует версию репозитория. Общие руководства, на которые ссылаются навыки, создаются один раз в `skills/_shared/` (pi загружает пакет целиком), поэтому ни один навык не несёт свою копию. У пакета нет зависимостей workspace и скриптов установки. Он распространяет навыки; установка проекта OMA отдельно поставляет расширение хуков Pi.

Pi также поддерживает источники Git и npm. Репозиторий уже объявляет исходные навыки в корневом `package.json`, поэтому `pi install git:github.com/first-fluke/oh-my-agent@<tag>` может их обнаружить. Pi запускает установку зависимостей для Git-пакетов, содержащих `package.json`; сгенерированный пакет избегает дерева зависимостей исходного workspace. Сам `oma emit` не публикует; рабочий процесс релиза публикует сгенерированный пакет в npm.

Этот формат сверен с документацией установленного пакета Pi 0.78.1 и резолвером пакетов 2026-11-05. Разрешение только на чтение и репозитория исходников, и сгенерированного пакета загрузило 33 навыка с нулём диагностик, без установки пакета и обращения к модели.

## Пакет плагина OpenCode и Kilo Code

`oma link` устанавливает мост хуков семейства opencode для каждого проекта: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` для Kilo) плюс записи обработчиков, которые он запускает, зарегистрированные в `plugin` файлов `opencode.json` / `kilo.json`. Тот же мост также создаётся как npm-пакет плагина, чтобы проект (или глобальная конфигурация) мог загрузить его без установки на каждый проект:

```bash
oma emit --target opencode-package
```

Вывод по умолчанию — `opencode-package/` (единственный создаваемый пакет, который остаётся закоммиченным, чтобы клон мог загрузить его как плагин-каталог); `--output-dir <base>` записывает его в `<base>/opencode-package/`. Пакет (`oh-my-agent-opencode`) содержит неизменный мост SSOT (`oma.ts`), точку входа пакета (`index.ts`, `main`/`exports`), по одной сгенерированной записи обработчика на каждый отдельный скрипт хука (каждый выполняет `oma hook script --vendor opencode --script <name>`), `filter-test-output.sh` и README. Зависимостей нет; CLI `oma` должен быть в PATH, а `bun` должен быть установлен, и каждый хук работает в режиме fail-open, если чего-то из этого нет.

Два хоста загружают плагины пакета по разным контрактам, и точка входа обслуживает оба из одного экспорта по умолчанию: OpenCode 2.x читает `{ id, setup(ctx) }`, и `setup` регистрирует `ctx.session.hook("prompt" | "context" | "experimental.idle")` и `ctx.tool.hook("execute.before")`, каждый адаптирован на обработчики моста `chat.message`, `experimental.chat.system.transform`, `session.idle` и `tool.execute.before`; Kilo Code и OpenCode 1.18.29+ требуют объект с `server()`, и это сам мост. Логика обработчиков не дублируется.

Зарегистрируйте его по имени пакета в `.opencode/opencode.json` (проект) или `~/.config/opencode/opencode.json` (глобально); OpenCode устанавливает npm-плагины в свой кэш при запуске:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code читает тот же ключ из `.kilo/kilo.json` или `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` добавляет запись за вас. Оба хоста диспетчеризуют с общей идентичностью `opencode`, которая отвечает на диалекте Claude JSON, который читает мост. Проекту, где `oma link` уже зарегистрировал `./plugins/oma/oma.ts`, пакет не нужен; оставьте что-то одно.

OpenCode 2.x также принимает плагин-каталог (`"plugin": ["../path/to/opencode-package"]`, относительно файла конфигурации), который загружает сгенерированный пакет без npm. OpenCode 2.x требует, чтобы настроенные пути плагинов были каталогами, и отклоняет запись из одного файла: регистрация `./plugins/oma/oma.ts` на проект, которую записывает `oma link`, там пропускается («configured plugin path must be a directory»), поэтому на OpenCode 2.x используйте этот пакет; Kilo Code по-прежнему загружает файл проекта.

Проверено 2026-11-08 на OpenCode 2.2.6 и Kilo Code CLI 7.8.27: оба разрешили `plugin: ["oh-my-agent-opencode"]` из конфигурации проекта (`opencode debug config`, `kilo debug config`), OpenCode попытался установить npm (404, пока пакет не опубликован) и остался fail-open, а когда пакет лежал в кэше плагинов каждого хоста (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`), headless `run "orchestrate: say hi"` против локального endpoint, совместимого с OpenAI, получил `[OMA WORKFLOW: ORCHESTRATE]` в системном prompt на обоих хостах, затем повторные входы постоянного режима до лимита подкрепления. Рабочий процесс релиза публикует сгенерированный пакет в npm как `oh-my-agent-opencode` с каждым релизом CLI.

## Пакет мода Command Code

Хуки файла настроек Command Code (`.commandcode/settings.json`, устанавливается через `oma link`) покрывают только `SessionStart`, `PostToolUse` и `Stop`. [Мод](https://commandcode.ai/docs/mods) видит полный жизненный цикл, поэтому OMA также создаёт пакет мода:

```bash
oma emit --target commandcode-mod
```

Вывод по умолчанию — `commandcode-mod/` (игнорируется Git; дерево генерируется, не коммитится). Его `package.json` несёт ключевое слово `cmd-mod` и блок `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), поэтому одна установка приносит мост хуков и каждый навык OMA. `mods/oma.ts` сопоставляет хуки ModApi с основными обработчиками через `oma hook script --vendor commandcode --script <name>`: `transformInput` запускает keyword-detector и skill-injector (prompt проходит без изменений), `appendSystemPrompt` внедряет обнаруженный контекст, `onSessionStart` запускает code-intelligence-primer и state-boundary, `beforeToolCall` запускает scm-guard (отказ становится `{block: true}`) и test-filter на `shell_command`, а `onStop` превращает блок постоянного режима в `{continue: true, reason}`. У пакета нет зависимостей и шага сборки; каждый хук работает в режиме fail-open без CLI `oma`.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Проверено 2026-11-08 на Command Code 1.88.5: `cmd mods inspect` сообщил зарегистрированные хуки, `cmd mods add -g <local path>` установил пакет, и `cmd mods list` показал `oma · user · from local:…`, а прогон хуков мода против CLI внедрил `[OMA WORKFLOW: ORCHESTRATE]`, заблокировал `git add .env` и вернул продолжение постоянного режима. Ход `cmd -p` с моделью не проверялся (на тестовой машине не было аккаунта Command Code). Рабочий процесс релиза публикует сгенерированный пакет в npm как `oh-my-agent-commandcode` с каждым релизом CLI.

## Проверка плагина Cursor

Cursor Agent `2026.10.22-27dcf5f` предоставляет:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

У его CLI плагинов нет команды установки отдельного плагина. Регистрация marketplace — это операция аккаунта, которая индексирует Git-репозиторий; изолированной локальной проверки установки она не даёт. OMA не регистрирует marketplace автоматически во время emit.

2026-11-05 два каталога навыков, каталог агентов, каталог правил, файл MCP и логотип закоммиченного манифеста Cursor разрешились внутри репозитория. Справка CLI подтвердила поддержку загрузки локального каталога плагина. Регистрация marketplace аккаунта и живая сессия модели не проверялись.

## Хосты плагинов, совместимые с Claude {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode и Kimi Code читают манифесты плагинов, форма которых происходит от `.claude-plugin/plugin.json` Claude Code. `oma emit` создаёт один нативный манифест на хост из источника истины `.agents/`. Git-клон этого репозитория является устанавливаемым пакетом для Grok, ZCode и Kimi; дерево Antigravity генерируется (`oma emit --target antigravity-plugin` или архив релиза `oma-antigravity-plugin.tar.gz`), потому что его валидатор отклоняет корень репозитория:

| Хост | Цель emit | Закоммиченный артефакт | Навыки | Агенты | MCP | Хуки |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | нет; сгенерированный `antigravity-plugin/` (самодостаточный, архив релиза) | `skills/` | `agents/` (преобразованы) | `mcp_config.json` | не поставляются |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | корневой `skills/` | `.agents/agents/*.md` | встроенные `mcpServers` | не объявлены |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | корневой `skills/` | `.agents/agents/*.md` | встроенные `mcpServers` | не объявлены |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | корневой `skills/` | `.agents/agents/*.md` | встроенные `mcpServers` | не объявлены |

Ни один из этих пакетов не поставляет хуки. Хуки плагина Claude разрешают проект из `CLAUDE_PROJECT_DIR` и `${CLAUDE_PLUGIN_ROOT}`, которые эти хосты не задают, а Antigravity и Kimi запускают хуки плагина с каталогом плагина в качестве рабочего каталога. Поэтому рабочие процессы и хуки проекта приходят из CLI `oma` (`bun install -g oh-my-agent`, затем `oma install`), который готовит нативный мост хуков каждого хоста. Навыки, агенты, правила и MCP-серверы работают и без него.

В этом репозитории исходников запускайте локальный CLI как `bun cli/cli.ts emit --target <target>`; `--output-dir <base>` записывает каждый артефакт в `<base>` по тому же относительному пути. Гейт дрейфа CI (`bun run --cwd cli check:emit-drift`) падает, когда закоммиченный манифест отличается от свежего emit, а Release Please поднимает версию каждого закоммиченного манифеста вместе с релизом CLI; сгенерированные деревья локального пути берут версию из тега релиза, на котором они создаются.

### Antigravity CLI (`agy`)

Пакет следует [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json`, проверенный по схеме `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` плюс по одному `rules/<rule>.md` на каждое правило OMA (`trigger: always_on | glob | model_decision`, `globs` через запятую), `mcp_config.json`, `assets/logo.png` и README. Самодостаточное дерево создаётся, потому что `agy plugin validate --strict` отклоняет корень репозитория (корневой `AGENTS.md` и Claude `hooks/hooks.json` сообщаются как никогда не загружаемые). Устанавливайте каталог `antigravity-plugin/`, а не URL или корень репозитория: если указать корень, agy загружает лежащий там `plugin.json` Agent Plugins — 33 навыка, без агентов и правил, и `mcp.json` только пока включён флаг `enable-agent-plugins-spec` (`agy plugin validate --json .`, agy 1.5.3).

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

Навыки загружаются как `/<skill-name>`; MCP-серверы получают пространство имён `oma_<server>`. `agy plugin import claude` также импортирует существующую установку Claude Code. 2026-11-08 сгенерированное дерево прошло `agy plugin validate --strict` (agy 1.5.3) с 0 ошибок и 0 предупреждений: 33 навыка, 12 агентов, 14 правил, 3 MCP-сервера.

### Grok Build CLI

Grok читает плагины и marketplace Claude Code без настройки, поэтому `.claude-plugin/` уже работает. Нативный `.grok-plugin/plugin.json` добавляет явные объявления навыков, агентов и MCP, а `.grok-plugin/marketplace.json` перечисляет ту же запись `oma` и предметные корни `oma-frontend`, `oma-security`, `oma-research`, что и marketplace Claude, с локальными источниками (`{"type": "local", "path": ...}`), формой, которую валидатор каталога Grok принимает без закреплённого commit sha.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok не был установлен на хосте, который выполняет emit; манифест и каталог структурно проверяются тестами CLI по документированному набору полей и правилам каталога `xai-org/plugin-marketplace`.

### ZCode

ZCode сначала разрешает `.zcode-plugin/plugin.json` и откатывается к `.claude-plugin/plugin.json`, поэтому корень репозитория разрешается нативно, а каждый предметный корень — через свой манифест Claude. Установка только через GUI:

1. Откройте **Settings → Plugins**.
2. Нажмите **Create → Add marketplace** (справа сверху) и введите `first-fluke/oh-my-agent`, Git URL или путь локального клона. ZCode проверяет marketplace перед добавлением.
3. В сегменте **Personal** нажмите **Install** у `oma` (или предметной записи) и дождитесь смены статуса на **Installed**. Плагины включены по умолчанию.
4. Позже используйте **Manage installed → Check for updates**; ZCode сравнивает версию записи каталога в `.zcode-plugin/marketplace.json` с установленным `plugin.json`, поэтому оба следуют релизу CLI.

ZCode не был установлен на хосте, который выполняет emit; шаблон имени манифеста (`^[a-z0-9][a-z0-9._-]{0,127}$`), набор полей и форма marketplace проверяются тестами CLI.

### Kimi Code CLI

`.kimi-plugin/plugin.json` указывает `skills` на каталог сканирования корневого `skills/`, перечисляет каждый файл `.agents/agents/*.md` (уже в формате агента Kimi: frontmatter `name` и `description`, тело Markdown как системный prompt), встраивает `mcpServers` и несёт блок `interface`, который показывает `/plugins`.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi копирует плагин в `$KIMI_CODE_HOME/plugins/managed/oma/` и применяет его к каждому проекту; навыки вызываются как `/skill:oma:<skill-name>`. Kimi не был установлен на хосте, который выполняет emit; поверхность манифеста (допустимые поля, правило пути `./`, набор полей хука) проверяется тестами CLI.

## Доска агентов Qwen

Экспериментальная [документация Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) описывает `qwen board task`, `claim`, `done`, `ask` и `answer`. Доска координирует локальные файлы; она не запускает, не присоединяет и не наблюдает процессы агентов.

OMA может пересылать явные операции доски, когда установленный Qwen CLI объявляет команду `board`:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

Адаптер также поддерживает `claim`, `ask`, `answer` и `decline`. Он проверяет справку корня перед пересылкой операции. Он дополняет состояние выполнения и квитанции OMA; он никогда не помечает работу OMA завершённой автоматически.

Установленный Qwen Code 0.20.1 не показывал команды CLI `board` или `agents` на 2026-11-05. `qwen board --help` вернул справку корня, поэтому эта установка не проходит проверку возможности. Реальная нативная операция доски остаётся непроверенной; интеграции `agents join` нет.
