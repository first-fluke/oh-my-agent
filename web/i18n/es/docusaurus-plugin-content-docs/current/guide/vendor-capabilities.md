---
title: Capacidades y paquetes de los vendors
description: Descubrimiento de skills, definiciones de agentes, hooks y formatos de paquete en los vendors de OMA.
---

# Capacidades y paquetes de los vendors

`cli/constants/vendor-capabilities.ts` registra el descubrimiento de skills, el directorio de agentes, el puente de hooks y el manifiesto de paquete de cada host soportado. Sus claves de vendor coinciden con `ALL_CLI_VENDORS`; las rutas de proyección de skills salen de `CLI_SKILLS_DIR`, así que las instalaciones de proyecto y globales conservan sus destinos actuales.

| Host | Skills compartidas sin enlaces de vendor | Directorio de agentes | Puente de hooks | Manifiesto del paquete |
| --- | --- | --- | --- | --- |
| Antigravity CLI | No | — | Settings | `antigravity-plugin/plugin.json` |
| Claude Code | No | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | No | `.codex/agents` | Settings | `plugin.json` |
| Command Code | No | `.commandcode/agents` | Settings | `commandcode-mod/package.json` |
| Copilot CLI | No | `.github/agents` | Settings | `plugin.json` (Agent Plugins package) |
| Cursor | No | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Settings | `.grok-plugin/plugin.json` |
| Hermes | No | — | — | `plugin.json` (Agent Plugins package) |
| Kilo Code | Sí | `.kilo/agents` | Extension | `opencode-package/package.json` |
| Kimi | No | — | Settings | `.kimi-plugin/plugin.json` |
| Kiro | No | `.kiro/agents` | Settings | `plugin.json` (Agent Plugins package) |
| OpenCode | No | `.opencode/agents` | Extension | `opencode-package/package.json` |
| Pi | Sí | — | Extension | `pi-package/package.json` |
| Qwen Code | Sí | `.qwen/agents` | Settings | `plugin.json` (Agent Plugins package) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

«Sin enlaces de vendor» significa que OMA puede usar el descubrimiento compartido en ambos modos de instalación. El escaneo de proyecto de Kimi, por sí solo, no sustituye su proyección global de skills ya existente. Un puente de hooks o un directorio de agentes no implica un adaptador de runtime por subproceso. Gemini no es un vendor de OMA; Antigravity CLI tiene su propia integración.

## Paquete Agent Plugins {#agent-plugins-package}

La raíz del repositorio es un paquete [Agent Plugins 1.0](https://agent-plugins.org/), y `oma emit` lo regenera desde la fuente de verdad de `.agents/`:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Las instalaciones por Git y por marketplace clonan el repositorio sin dependencias, así que la raíz es el paquete. Una instalación por ruta local o `owner/repo:path` copia el directorio que indiques, y la raíz del repositorio también contiene el árbol de código, `node_modules` y el sitio web. Para esos casos, usa la copia limpia que `oma emit --target agent-plugin` escribe en `codex-plugin/` (en este repositorio: `bun cli/cli.ts emit --target agent-plugin`), o descomprime `oma-agent-plugin.tar.gz` de una [release de GitHub](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` se genera y está en gitignore; no se hace commit. Como cada host instala ese árbol entero, sus skills referencian una sola copia de las guías compartidas en `skills/_shared/`; solo la `skills/` de la raíz las incluye dentro de cada skill, porque `bunx skills use first-fluke/oh-my-agent@<skill>` copia un único directorio de skill fuera de ella.

Las palabras clave del manifiesto (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) son también el vocabulario de activación de Kiro. El manifiesto no declara rutas de componentes, lo que la especificación prohíbe; cada host lee las ubicaciones fijas. Ningún host necesita un manifiesto nativo junto a `plugin.json`: Copilot lee un manifiesto Agent Plugins en la raíz antes que `.claude-plugin/plugin.json`, y Qwen Code carga el paquete mediante su adaptador de Agent Plugins sin generar `qwen-extension.json`.

| Host | Carga | Instalación |
| --- | --- | --- |
| GitHub Copilot CLI | skills, servidores MCP y, desde `com.github.copilot/`: 12 agentes personalizados, 20 slash commands de workflow, 6 reglas con ámbito de archivo, 4 hooks de ciclo de vida | `copilot plugin install first-fluke/oh-my-agent` (clona el paquete de la raíz), `copilot plugin install /absolute/path/to/codex-plugin` sobre la copia emitida, o `copilot plugin marketplace add first-fluke/oh-my-agent` y después `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | skills y servidores MCP (los nombres de servidor reciben espacio de nombres al instalar); se activa con las palabras clave del manifiesto | `kiro-cli powers install /absolute/path/to/codex-plugin` sobre la copia emitida (CLI 2.25+), o **Add Custom Power → Import power from GitHub** con la URL del repositorio |
| Qwen Code | skills y servidores MCP como la extensión `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` o `qwen extensions link /absolute/path/to/codex-plugin` sobre la copia emitida (origen Agent Plugins). La URL del repositorio a secas abre el selector interactivo de plugins de Qwen, porque la raíz también lleva el marketplace de Claude; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` selecciona la entrada `oma` de ese marketplace sin interacción (según la documentación de Qwen, entonces se convierte desde el manifiesto de Claude). |
| Hermes Agent | skills como `oma:<skill>` y los servidores MCP stdio / Streamable HTTP | `hermes plugins install first-fluke/oh-my-agent --no-enable`, después `hermes plugins enable oma` |
| Codex | skills y servidores MCP | `codex plugin marketplace add first-fluke/oh-my-agent` y después `codex plugin add oma@oh-my-agent` |

### Componentes de Copilot CLI {#copilot-cli-components}

Copilot lee los componentes no portables del espacio de nombres `com.github.copilot/` que `oma emit` rellena desde la fuente de verdad:

- `agents/<name>.agent.md`: los mismos agentes personalizados de Copilot que una instalación de proyecto escribe en `.github/agents/`.
- `commands/<workflow>.md`: un slash command por cada workflow disponible; cada uno lee `.agents/workflows/<workflow>.md` del proyecto.
- `rules/<rule>.instructions.md`: las reglas con un glob de archivo (`applyTo`) o `alwaysApply: true`; las reglas que se aplican bajo petición se quedan en la instalación del proyecto.
- `hooks/hooks.json` con `scripts/plugin-bootstrap.sh` y `scripts/plugin-hook.sh`: los mismos scripts fail-open que la entrada de marketplace de Claude Code, ejecutados con `OMA_PLUGIN_VENDOR=copilot`. SessionStart aprovisiona la CLI y ejecuta `oma install --yes` para el proyecto actual; UserPromptSubmit, PreToolUse (Bash) y Stop reenvían a `oma hook --vendor copilot` hasta que toma el relevo el registro propio del proyecto en `.github/hooks/oma.json`. Cada comando termina en `|| true`, así que una CLI ausente o una raíz de plugin sin resolver nunca bloquea una llamada a herramienta.

Los workflows, los agentes y las reglas referencian el árbol `.agents/` del proyecto. Sin la CLI de oma, el paquete sigue aportando skills y servidores MCP; el hook de bootstrap añade el resto en la primera sesión.

### Registro de validación {#validation-record}

Comprobado el 2026-11-08 con el home de cada host apuntando a un directorio temporal; no se ejecutó ninguna llamada a modelo, hook ni servidor MCP. `<path>/codex-plugin` es el árbol que escribe `oma emit --target agent-plugin`:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` informó `Installed 33 skills`; `plugin list --json` muestra `oma` habilitado en la versión del paquete; la copia en caché bajo `installed-plugins/_direct/` contiene `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` seguido de `copilot plugin install oma@oh-my-agent` también instaló la entrada completa en vivo desde el checkout. Copilot avisa de que las instalaciones directas quedan en desuso en favor de `plugin@marketplace`.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (con `KIRO_HOME` y `KIRO_DATA_DIR` en el directorio temporal) informó `Installed power "oma"` y copió el paquete a `powers/installed/oma/`. Kiro ignora `USERPROFILE`; usa `KIRO_HOME` para reubicar su home.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` informó `installed successfully and enabled`; `qwen extensions list` muestra `Origin: AgentPlugins`, 33 skills y los servidores MCP `context7`, `serena` y `aside`.
- Hermes Agent: no está instalado aquí. Se comprobaron el manifiesto, el frontmatter de las skills y `mcp.json` contra las reglas de `hermes_cli/agent_plugins.py` de Hermes (sin campos desconocidos, nombres válidos, comandos stdio como tokens únicos); Hermes no exige un bloque `extensions["com.nousresearch.hermes"]`.

CI emite el paquete desde el checkout y lo instala en releases fijadas de Copilot CLI y Qwen Code en cada push (job `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Paquetes de Pi {#pi-packages}

Pi descubre `.agents/skills` del proyecto y `~/.agents/skills` global directamente. Instalar OMA en un proyecto no exige, por tanto, una proyección `.pi/skills`.

Para distribuirlo fuera de una instalación de OMA, el pipeline de release emite el paquete de skills de Pi y lo publica en npm como `oh-my-agent-pi`; o emítelo tú mismo:

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

En este repositorio de código, ejecuta la CLI local como `bun cli/cli.ts emit --target pi-package`. La salida por defecto es `pi-package/` (en gitignore; el árbol se genera, no se hace commit); `--output-dir <base>` lo escribe bajo `<base>/pi-package/`.

El `package.json` generado declara `pi.skills: ["./skills"]`, incluye la palabra clave `pi-package` y usa la versión del repositorio. Las guías compartidas que referencian las skills se emiten una sola vez bajo `skills/_shared/` (pi carga el paquete entero), así que ninguna skill lleva su propia copia. El paquete no tiene dependencias de workspace ni scripts de instalación. Distribuye skills; la instalación de proyecto de OMA aporta por separado su extensión de hooks de Pi.

Pi también admite fuentes Git y npm. El repositorio ya declara sus skills de origen en el `package.json` de la raíz, así que `pi install git:github.com/first-fluke/oh-my-agent@<tag>` puede descubrirlas. Pi ejecuta la instalación de dependencias en los paquetes Git que contienen `package.json`; el paquete emitido evita el árbol de dependencias del workspace de origen. `oma emit` en sí no publica; el workflow de release publica el paquete emitido en npm.

Este formato se comprobó contra la documentación del paquete Pi 0.78.1 instalado y su resolutor de paquetes el 2026-11-05. La resolución de solo lectura del repositorio de origen y del paquete emitido cargó 33 skills con cero diagnósticos, sin instalar un paquete ni contactar un modelo.

## Paquete de plugin de OpenCode y Kilo Code {#opencode-and-kilo-code-plugin-package}

`oma link` instala el puente de hooks de la familia opencode por proyecto: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` para Kilo) más las entradas de handler que genera, registradas bajo `plugin` en `opencode.json` / `kilo.json`. El mismo puente también se emite como paquete de plugin npm para que un proyecto (o una configuración global) pueda cargarlo sin una instalación por proyecto:

```bash
oma emit --target opencode-package
```

La salida por defecto es `opencode-package/` (el único paquete emitido que permanece en el commit, para que un clone pueda cargarlo como plugin de directorio); `--output-dir <base>` lo escribe bajo `<base>/opencode-package/`. El paquete (`oh-my-agent-opencode`) contiene el puente de la fuente de verdad sin cambios (`oma.ts`), una entrada de paquete (`index.ts`, el `main`/`exports`), una entrada de handler generada por cada script de hook independiente (cada una ejecuta `oma hook script --vendor opencode --script <name>`), `filter-test-output.sh` y un README. No tiene dependencias; la CLI `oma` debe estar en el PATH y `bun` debe estar instalado, y cada hook queda fail-open cuando falta cualquiera de los dos.

Los dos hosts cargan plugins de paquete con contratos distintos, y la entrada sirve a ambos desde un único export por defecto: OpenCode 2.x lee `{ id, setup(ctx) }` y `setup` registra `ctx.session.hook("prompt" | "context" | "experimental.idle")` y `ctx.tool.hook("execute.before")`, cada uno adaptado a los handlers del puente `chat.message`, `experimental.chat.system.transform`, `session.idle` y `tool.execute.before`; Kilo Code y OpenCode 1.18.29+ exigen un objeto con `server()`, que es el propio puente. La lógica de los handlers no se duplica.

Regístralo por nombre de paquete en `.opencode/opencode.json` (proyecto) o `~/.config/opencode/opencode.json` (global); OpenCode instala los plugins npm en su caché al arrancar:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

Kilo Code lee la misma clave en `.kilo/kilo.json` o `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` añade la entrada por ti. Ambos hosts despachan con la identidad compartida `opencode`, que responde en el dialecto JSON de Claude que lee el puente. Un proyecto en el que `oma link` ya registró `./plugins/oma/oma.ts` no necesita el paquete; conserva uno u otro.

OpenCode 2.x también acepta un plugin de directorio (`"plugin": ["../path/to/opencode-package"]`, relativo al archivo de configuración), que carga el paquete emitido sin npm. Ten en cuenta que OpenCode 2.x exige que las rutas de plugin configuradas sean directorios y rechaza una entrada de un solo archivo: el registro por proyecto `./plugins/oma/oma.ts` que escribe `oma link` se omite ahí ("configured plugin path must be a directory"), así que en OpenCode 2.x usa este paquete; Kilo Code sigue cargando el archivo por proyecto.

Verificado el 2026-11-08 contra OpenCode 2.2.6 y Kilo Code CLI 7.8.27: ambos resolvieron `plugin: ["oh-my-agent-opencode"]` desde la configuración del proyecto (`opencode debug config`, `kilo debug config`), OpenCode intentó la instalación npm (un 404 hasta que se publique el paquete) y se mantuvo fail-open, y con el paquete colocado en la caché de plugins de cada host (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`) una ejecución headless `run "orchestrate: say hi"` contra un endpoint local compatible con OpenAI recibió `[OMA WORKFLOW: ORCHESTRATE]` en su system prompt en ambos hosts, seguida de las reentradas del modo persistente hasta el tope de refuerzo. El workflow de release publica el paquete emitido en npm como `oh-my-agent-opencode` con cada release de la CLI.

## Paquete mod de Command Code {#command-code-mod-package}

Los hooks del archivo de ajustes de Command Code (`.commandcode/settings.json`, instalados por `oma link`) cubren solo `SessionStart`, `PostToolUse` y `Stop`. Un [mod](https://commandcode.ai/docs/mods) ve el ciclo de vida completo, así que OMA también emite un paquete mod:

```bash
oma emit --target commandcode-mod
```

La salida por defecto es `commandcode-mod/` (en gitignore; el árbol se genera, no se hace commit). Su `package.json` lleva la palabra clave `cmd-mod` y un bloque `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), así que una instalación trae el puente de hooks y todas las skills de OMA. `mods/oma.ts` mapea los hooks de ModApi a los handlers del núcleo mediante `oma hook script --vendor commandcode --script <name>`: `transformInput` ejecuta keyword-detector y skill-injector (el prompt pasa sin cambios), `appendSystemPrompt` inyecta el contexto detectado, `onSessionStart` ejecuta code-intelligence-primer y state-boundary, `beforeToolCall` ejecuta scm-guard (una denegación pasa a `{block: true}`) y test-filter en `shell_command`, y `onStop` convierte un bloqueo del modo persistente en `{continue: true, reason}`. El paquete no tiene dependencias y no necesita paso de build; cada hook queda fail-open sin la CLI `oma`.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Verificado el 2026-11-08 contra Command Code 1.88.5: `cmd mods inspect` informó de los hooks registrados, `cmd mods add -g <local path>` instaló el paquete y `cmd mods list` mostró `oma · user · from local:…`, y al ejercer los hooks del mod contra la CLI se inyectó `[OMA WORKFLOW: ORCHESTRATE]`, se bloqueó `git add .env` y se devolvió un continue del modo persistente. No se ejerció un turno `cmd -p` respaldado por un modelo (no había cuenta de Command Code en la máquina de prueba). El workflow de release publica el paquete emitido en npm como `oh-my-agent-commandcode` con cada release de la CLI.

## Verificación del plugin de Cursor {#cursor-plugin-verification}

Cursor Agent `2026.10.22-27dcf5f` expone:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

Su CLI de plugins no tiene un comando para instalar un plugin individual. El registro en un marketplace es una operación de cuenta que indexa un repositorio Git; no ofrece una comprobación aislada de instalación local. OMA no registra un marketplace automáticamente durante la emisión.

El 2026-11-05, los dos directorios de skills, el directorio de agentes, el directorio de reglas, el archivo MCP y el logo del manifiesto de Cursor que está en el repositorio se resolvieron dentro de él. La ayuda de la CLI confirmó el soporte para cargar un directorio de plugin local. No se ejercieron el registro del marketplace de la cuenta ni una sesión de modelo en vivo.

## Hosts de plugins compatibles con Claude {#claude-compatible-plugin-hosts}

Antigravity CLI, Grok Build CLI, ZCode y Kimi Code leen manifiestos de plugin cuya forma desciende de `.claude-plugin/plugin.json` de Claude Code. `oma emit` genera un manifiesto nativo por host desde la fuente de verdad de `.agents/`. Un clone git de este repositorio es el paquete instalable para Grok, ZCode y Kimi; el árbol de Antigravity se genera (`oma emit --target antigravity-plugin`, o el asset de release `oma-antigravity-plugin.tar.gz`) porque su validador rechaza la raíz del repositorio:

| Host | Destino de emit | Artefacto en el repositorio | Skills | Agentes | MCP | Hooks |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | ninguno; `antigravity-plugin/` emitido (autocontenido, asset de release) | `skills/` | `agents/` (convertidos) | `mcp_config.json` | no se incluye |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | `skills/` de la raíz | `.agents/agents/*.md` | `mcpServers` en línea | no se declara |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | `skills/` de la raíz | `.agents/agents/*.md` | `mcpServers` en línea | no se declara |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | `skills/` de la raíz | `.agents/agents/*.md` | `mcpServers` en línea | no se declara |

Ninguno de estos paquetes incluye hooks. Los hooks del plugin de Claude resuelven el proyecto desde `CLAUDE_PROJECT_DIR` y `${CLAUDE_PLUGIN_ROOT}`, que estos hosts no definen, y Antigravity y Kimi ejecutan los hooks de plugin con el directorio del plugin como directorio de trabajo. Los workflows y los hooks de proyecto vienen, por tanto, de la CLI `oma` (`bun install -g oh-my-agent` y después `oma install`), que aprovisiona el puente de hooks nativo de cada host. Las skills, los agentes, las reglas y los servidores MCP funcionan sin ella.

En este repositorio de código, ejecuta la CLI local como `bun cli/cli.ts emit --target <target>`; `--output-dir <base>` escribe cada artefacto bajo `<base>` en la misma ruta relativa. El gate de deriva de CI (`bun run --cwd cli check:emit-drift`) falla cuando un manifiesto del repositorio difiere de una emisión nueva, y Release Please sube la versión de cada manifiesto del repositorio con la release de la CLI; los árboles de ruta local generados toman su versión de la etiqueta de release en la que se emiten.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

El paquete sigue [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json` validado contra `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` más un `rules/<rule>.md` por regla de OMA (`trigger: always_on | glob | model_decision`, `globs` separados por comas), `mcp_config.json`, `assets/logo.png` y un README. Se emite un árbol autocontenido porque `agy plugin validate --strict` rechaza la raíz del repositorio (se informa que la `AGENTS.md` de la raíz y el `hooks/hooks.json` de Claude nunca se cargan). Instala el directorio `antigravity-plugin/`, no la URL ni la raíz del repositorio: apuntado a la raíz, agy carga el `plugin.json` de Agent Plugins que hay ahí: 33 skills, sin agentes ni reglas, y `mcp.json` solo mientras su flag `enable-agent-plugins-spec` está activo (`agy plugin validate --json .`, agy 1.5.3).

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

Las skills se cargan como `/<skill-name>`; los servidores MCP llevan el espacio de nombres `oma_<server>`. `agy plugin import claude` también importa una instalación existente de Claude Code. El 2026-11-08 el árbol emitido pasó `agy plugin validate --strict` (agy 1.5.3) con 0 errores y 0 avisos: 33 skills, 12 agentes, 14 reglas, 3 servidores MCP.

### Grok Build CLI {#grok-build-cli}

Grok lee plugins y marketplaces de Claude Code sin configuración, así que `.claude-plugin/` ya funciona. El `plugin.json` nativo de `.grok-plugin/` añade declaraciones explícitas de skills, agentes y MCP, y `.grok-plugin/marketplace.json` lista la misma entrada `oma` y las raíces de dominio `oma-frontend`, `oma-security` y `oma-research` que el marketplace de Claude, con fuentes locales (`{"type": "local", "path": ...}`), la forma que acepta el validador de catálogo de Grok sin un sha de commit fijado.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

Grok no estaba instalado en el host que emitía; los tests de la CLI comprueban de forma estructural el manifiesto y el catálogo contra el conjunto de campos documentado y las reglas de catálogo de `xai-org/plugin-marketplace`.

### ZCode {#zcode}

ZCode resuelve primero `.zcode-plugin/plugin.json` y, si no, `.claude-plugin/plugin.json`, así que la raíz del repositorio se resuelve de forma nativa y cada raíz de dominio se resuelve mediante su manifiesto de Claude. La instalación es solo por GUI:

1. Abre **Settings → Plugins**.
2. Pulsa **Create → Add marketplace** (arriba a la derecha) e introduce `first-fluke/oh-my-agent`, la URL de Git o la ruta de un clone local. ZCode valida el marketplace antes de añadirlo.
3. En el segmento **Personal**, pulsa **Install** en `oma` (o en una entrada de dominio) y espera a que el estado pase a **Installed**. Los plugins quedan habilitados por defecto.
4. Más tarde, usa **Manage installed → Check for updates**; ZCode compara la versión de la entrada de catálogo en `.zcode-plugin/marketplace.json` con el `plugin.json` instalado, así que ambos siguen la release de la CLI.

ZCode no estaba instalado en el host que emitía; los tests de la CLI comprueban el patrón del nombre del manifiesto (`^[a-z0-9][a-z0-9._-]{0,127}$`), el conjunto de campos y la forma del marketplace.

### Kimi Code CLI {#kimi-code-cli}

`.kimi-plugin/plugin.json` apunta `skills` al directorio de escaneo `skills/` de la raíz, lista cada archivo `.agents/agents/*.md` (ya en el formato de agente de Kimi: frontmatter `name` y `description`, cuerpo Markdown como system prompt), incluye `mcpServers` en línea y lleva el bloque `interface` que muestra `/plugins`.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

Kimi copia el plugin a `$KIMI_CODE_HOME/plugins/managed/oma/` y lo aplica a todos los proyectos; las skills se invocan como `/skill:oma:<skill-name>`. Kimi no estaba instalado en el host que emitía; los tests de la CLI comprueban la superficie del manifiesto (campos permitidos, regla de ruta `./`, conjunto de campos de hooks).

## Qwen Agent Board {#qwen-agent-board}

La [documentación experimental de Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) describe `qwen board task`, `claim`, `done`, `ask` y `answer`. El board coordina archivos locales; no arranca, une ni monitoriza procesos de agentes.

OMA puede reenviar operaciones explícitas del board cuando la CLI de Qwen instalada anuncia el comando `board`:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

El adaptador también admite `claim`, `ask`, `answer` y `decline`. Comprueba la ayuda de la raíz antes de reenviar una operación. Complementa el estado de ejecución y los recibos de OMA; nunca marca el trabajo de OMA como completado de forma automática.

La Qwen Code 0.20.1 instalada no exponía los comandos de CLI `board` ni `agents` el 2026-11-05. `qwen board --help` devolvió la ayuda de la raíz, así que esta instalación no supera la comprobación de capacidad. Una operación real del board nativo sigue sin verificarse; no hay integración de `agents join`.
