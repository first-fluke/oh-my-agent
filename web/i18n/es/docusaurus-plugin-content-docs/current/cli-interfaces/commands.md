---
title: "Comandos CLI"
description: Referencia completa de cada comando CLI de oh-my-agent, con sintaxis, opciones y ejemplos organizados por categoría.
---

# Comandos CLI

Después de instalar globalmente (`bun install --global oh-my-agent`), usa `oma` o `oh-my-agent`. Para usarlo una sola vez sin instalarlo, ejecuta `npx oh-my-agent`.

La variable de entorno `OH_MY_AG_OUTPUT_FORMAT` se puede establecer en `json` para forzar una salida legible por máquina en los comandos que la admiten. Equivale a pasar `--json` a cada comando.

## Comenzar con una tarea {#start-with-a-task}

Elige el comando más pequeño que responda a tu pregunta. Cada comando de abajo imprime una ruta o un informe que puedes revisar antes de pasar al siguiente paso.

| Tarea | Empieza aquí | Resultado esperado |
|:-----|:-----------|:----------------|
| Instalar o reparar un proyecto | `oma install` y luego `oma doctor` | Recursos instalados y un informe de salud; usa `oma doctor --profile` cuando la duda sea la resolución del modelo. |
| Encontrar un comando u opción desde un agente | `oma describe` o `oma describe "image generate"` | JSON con los argumentos, las opciones y los comandos anidados. |
| Generar una imagen | `oma image generate "<prompt>" --output json` | Rutas de imágenes y un manifiesto en `.agents/results/images/`. |
| Planificar o renderizar un video | `oma video generate "<brief>" --dry-run` | Un directorio de ejecución con artefactos de planificación; ejecuta compose y render después de escribir la composición. |
| Crear un explicador de código interactivo | `/explain` | Un artefacto HTML autocontenido y validado en `.agents/results/explain/`. |
| Resolver un motor de diagramas | `oma diagram resolve --output json` | El motor Mermaid o archify seleccionado y el motivo de la selección. |
| Investigar señales de la comunidad | `oma market detect-trap "<topic>"` | Un resultado de preflight; continúa con `oma market resolve --output json` y la ejecución upstream solo si pasa. |
| Convertir o inspeccionar un artículo | `oma scholar search "<query>"` | Resultados de búsqueda de Knows, OpenAlex o Semantic Scholar; obtén un sidecar con `oma scholar get`. |
| Crear una presentación | `oma slide create --output-dir <dir>` | Un directorio de trabajo que se puede escribir, validar, empaquetar y exportar. |
| Revisar el drift de la documentación | `oma docs verify --json` | Un informe estructurado de referencias rotas y un índice de referencias regenerado. |

El registro incluido en el repositorio es la fuente de este mapa de comandos. Los nombres canónicos de descubrimiento de abajo proceden de `oma describe`; la ayuda interactiva puede mostrar alias de compatibilidad como `slide new`, `slide viewer`, `image list-vendors` o `video list-providers`.

## Superficie actual de comandos {#current-command-surface}

Este mapa facilita recorrer las referencias extensas de abajo y descubrir las familias menos usadas. Usa `--help` de cada familia o `oma describe <path>` para consultar la gramática exacta de los argumentos; [Opciones del CLI](./options.md) contiene la matriz completa de flags del registro.

| Familia | Rutas registradas |
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
| `explain` | `explain`, `explain validate` |
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web` |
| `auth` | `auth`, `auth status` |
| `hook` | `hook`, `hook run`, `hook probe` |
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize`, `skill meta-optimize`, `skill procedure`, `skill evolution-stats`, `skill promotions`, `skill rollback` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

Cuando un comando delega los argumentos restantes a otra herramienta, el registro deja sus opciones abiertas de forma deliberada. Esto se aplica a `market run` y `diagram archify`; lee la ayuda upstream resuelta antes de ejecutar una operación que modifique datos o use la red.

---

## Configuración e instalación {#setup-installation}

### install

`oma` sin argumentos inicia el instalador interactivo. `oma install` es la forma explícita y acepta opciones para seleccionar proveedores.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

Si omites `--web-search`, `--code-intelligence` y `--semantic-memory`, se conserva la selección de proveedor guardada. `--honcho-url` y `--honcho-workspace` configuran una conexión nueva de Honcho cuando se selecciona ese proveedor. El flag raíz `-y, --yes` omite los prompts y usa los valores predeterminados; `--global` apunta a la instalación de HOME.

**Qué hace:**
1. Comprueba si existe el directorio legacy `.agent/` y lo migra a `.agents/` si lo encuentra.
2. Detecta herramientas competidoras y ofrece eliminarlas.
3. Solicita el tipo de proyecto (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Si se selecciona backend, solicita la variante del lenguaje (Python, Node.js, Rust, Other).
5. Pregunta por los symlinks de GitHub Copilot.
6. Descarga el tarball más reciente del registro.
7. Instala recursos compartidos, workflows, configuraciones y las skills seleccionadas.
8. Instala adaptaciones de los proveedores seleccionados (configuración local del proyecto; no escribe silenciosamente en el nivel HOME del proveedor).
9. Crea symlinks del CLI.
10. Ofrece la configuración **global** recomendada de git (requiere confirmación explícita):
    - `rerere.enabled=true` — reutilización de conflictos de merge entre agentes
    - `init.defaultBranch=main` — rama predeterminada coherente para repositorios nuevos
    - Se omite por completo con `--yes` / CI (muestra indicaciones para corregirlo manualmente)
11. Ofrece configurar MCP cuando corresponde.
12. Solicita la estrella de GitHub si `gh` está autenticado.

**Ejemplo:**
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor

Comprobación de salud de las instalaciones del CLI, las configuraciones MCP y el estado de las skills.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |
| `--profile` | Muestra la matriz de salud del perfil. Presenta el slug del modelo resuelto, el CLI y el estado de autenticación de cada agente a partir de `model_preset` y las sobrescrituras `agents:` activas. Consulta [Modelos por agente](../guide/per-agent-models.md). |

**Qué verifica:**
- Instalaciones del CLI: agy, claude, codex, qwen (versión y ruta).
- Estado de autenticación de cada CLI.
- Configuración MCP: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Skills instaladas: cuáles están presentes y cuál es su estado.
- Directorio del almacén de memoria: existencia y cantidad de archivos de `.agents/state/memories/` (los proyectos antiguos usan como fallback la ruta legacy `.serena/memories/`).
- Marcadores de instalación duplicados (proyecto frente a global) y advertencias relacionadas.
- Configuración **global** recomendada de git (`gitRecommended` en JSON):
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Cada discrepancia cuenta para `totalIssues`.
- Archivo de contexto del proveedor del proyecto (bloque OMA de `AGENTS.md` cuando está instalado Codex, Qwen o Claude Code ≥ 2.1.277).
- Salud de AgentMemory y de state/hooks, diagnósticos del reaper de Serena y contadores de incidencias relacionados.

**Reparación automática:** Si detecta skills ausentes, `doctor` ofrece instalarlas de forma interactiva. Si falta la configuración de git recomendada o es incorrecta, ofrece las mismas correcciones globales opt-in que install/update.

**Ejemplos:**
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

Actualiza las skills a la versión más reciente del registro.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `-f, --force` | Sobrescribe los archivos de configuración personalizados (`oma-config.yaml`, `mcp.json`, directorios `stack/`) |
| `--with-new-skills` | Instala las skills nuevas de esta versión; sin este flag, solo actualiza las skills ya instaladas. |
| `--ci` | Ejecuta en modo CI no interactivo (omite prompts y usa salida de texto plano) |
| `-y, --yes` | Omite los prompts. El alcance de proveedores no cambia: solo se actualizan los directorios de proveedores existentes, salvo que se indique `--all` o `--vendor`. |
| `--all` | Crea o actualiza todos los proveedores compatibles con alcance de proyecto. |
| `--vendor <vendors>` | Crea o actualiza proveedores concretos. Acepta una lista separada por comas, como `claude,qwen`. |

**Qué hace:**
1. Obtiene `prompt-manifest.json` del registro para comprobar la versión más reciente.
2. La compara con la versión local en `.agents/skills/_version.json`.
3. Si ya está actualizada, termina.
4. Descarga y extrae el tarball más reciente.
5. Conserva los archivos personalizados por el usuario (salvo que se use `--force`).
6. Copia los archivos nuevos sobre `.agents/`.
7. Restaura los archivos conservados.
8. Actualiza las adaptaciones de proveedores y refresca los symlinks. De forma predeterminada, solo toca los directorios de proveedores que ya existen en el proyecto.
9. Ofrece la configuración **global** recomendada de git (el mismo opt-in que en install: `rerere.enabled`, `init.defaultBranch`). Se omite con `--yes` / `--ci`.

**Ejemplos:**
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

`oma update mcp` tiene sus propias opciones `--yes`, `--ci`, `--all` y `--vendor <vendors>`. Selecciona servidores MCP de navegador compatibles (Aside, Chrome DevTools o Firefox DevTools) para los proveedores elegidos con alcance de proyecto.

### uninstall

Previsualiza o elimina archivos propiedad de OMA del directorio raíz de instalación seleccionado:

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` enumera las eliminaciones sin cambiar archivos. `--yes` omite el prompt de confirmación. Según la descripción registrada del comando, este conserva `oma-config.yaml`, `mcp.json` y las skills escritas por el usuario. Si la previsualización incluye un archivo que todavía necesitas, detente y conserva la salida de dry-run para revisarla.

### link

Regenera los archivos nativos de los proveedores a partir de la fuente de verdad `.agents/` sin reinstalar.

```
oma link [vendors...] [--global]
```

**Ejemplos:**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Sin `--global`, link apunta a `<cwd>/.agents/`; con él, apunta a `~/.agents/` (o `OMA_HOME`). Consulta [Instalación global](../guide/global-install.md).

**Qué hace:**
1. Reconstruye los archivos de agentes nativos de los proveedores a partir de `.agents/agents/`.
2. Refresca los hooks y la configuración local de los proveedores seleccionados.
3. Regenera el bloque de integración de `AGENTS.md` para cada proveedor configurado, incluido Claude Code. `CLAUDE.md` y `GEMINI.md` nunca se crean ni reciben un bloque OMA. Claude Code ≥ 2.1.277 lee `AGENTS.md` de forma nativa, pero lo ignora siempre que existe un `CLAUDE.md`, así que, cuando hay un `CLAUDE.md` propiedad del usuario, link añade una única línea de importación `@AGENTS.md`; `oma update` también elimina el bloque OMA legacy de `CLAUDE.md` en cuanto se detecta esa versión.
4. Refresca el enlace MCP de Cursor y los symlinks de skills del CLI cuando corresponde.

Úsalo después de editar `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` o las definiciones de hooks.

**Comportamiento del modelo:**
- El dispatch nativo del mismo proveedor usa el modelo definido en el archivo de agente generado por el proveedor.
- El dispatch de fallback externo usa el `default_model` de cada proveedor en `.agents/skills/oma-orchestration/config/cli-config.yaml`.

**Comportamiento del dispatch:**
- Si el proveedor de destino coincide con el runtime actual y ese runtime admite agentes de rol nativos, OMA usa el dispatch nativo.
- De lo contrario, OMA recurre a `oma agent spawn`.

### setup (flujo de trabajo) {#setup-workflow}

El workflow `/setup` (invocado dentro de una sesión de agente) ofrece una configuración interactiva del lenguaje, las instalaciones del CLI, las conexiones MCP y la asignación agente-CLI. Es distinto de `oma` (el instalador): `/setup` configura una instancia ya instalada.

---

## Supervisión y métricas {#monitoring-metrics}

### dashboard {#dashboard}

Inicia el dashboard de terminal para supervisar agentes en tiempo real.

```
oma dashboard terminal
```

No tiene opciones. Observa `.agents/state/memories/` en el directorio actual (los proyectos antiguos usan como fallback la ruta legacy `.serena/memories/`). Muestra una interfaz de caracteres de caja con el estado de la sesión, una tabla de agentes y un feed de actividad. Se actualiza con cada cambio de archivo. Pulsa `Ctrl+C` para salir.

La variable de entorno `MEMORIES_DIR` permite cambiar el directorio de memorias.

**Ejemplo:**
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web {#dashboard-web}

Inicia el dashboard web.

```
oma dashboard web
```

Inicia un servidor HTTP en `http://localhost:9847` con una conexión WebSocket para actualizaciones en vivo. Abre la URL en un navegador para ver el dashboard.

**Variables de entorno:**

| Variable | Predeterminado | Descripción |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Puerto del servidor HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Ruta del directorio de memorias (usa como fallback el legacy `{cwd}/.serena/memories` en proyectos antiguos) |

**Ejemplo:**
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats {#stats}

Muestra las métricas de productividad.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Métricas registradas:**
- Cantidad de sesiones
- Skills usadas (con su frecuencia)
- Tareas completadas
- Tiempo total de sesión
- Archivos modificados, líneas añadidas y líneas eliminadas
- Marca de tiempo de la última actualización

**Telemetría de costes** (agregada a partir de todos los archivos `session-cost-*.md` bajo `.agents/state/memories/`):
- Total de tokens de entrada (aproximación basada en caracteres del prompt; todavía no incluye tokens de salida)
- Total de spawns
- USD estimados mediante una tabla conservadora de tarifas por token de entrada y proveedor (Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M)
- Desglose por proveedor (tokens · spawns · USD)

La estimación es un mínimo, no un importe exacto de facturación. Configura `session.quota_cap` en `.agents/oma-config.yaml` para imponer límites estrictos en el momento del spawn; consulta la página Why oh-my-agent de Primeros pasos para conocer el marco de calidad en el que se usan estos límites.

Las métricas se almacenan en `.agents/state/metrics.json`; cuando existe, también se lee el archivo legacy `.serena/metrics.json`. Los datos se recopilan de las estadísticas de git y de los archivos de memoria.

**Ejemplos:**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap {#recap}

Resume el historial de conversaciones de herramientas de IA entre sesiones de Claude, Codex, Qwen y Cursor.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--window <period>` | Ventana temporal: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Fecha específica (`YYYY-MM-DD`); tiene precedencia sobre `--window` | |
| `--tool <tools>` | Filtro separado por comas: `grok,claude,codex,qwen,cursor,antigravity` | todas |
| `--top <n>` | Muestra los N proyectos o temas principales | |
| `--sort <metric>` | Ordena por `count` o `duration` | `count` |
| `--mermaid` | Genera un gráfico de Gantt de Mermaid | |
| `--graph` | Abre un gráfico interactivo en el navegador | |
| `--json` / `--output <format>` | Salida legible por máquina | `text` |

**Ejemplos:**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro {#retro}

Retrospectiva de ingeniería con métricas y tendencias.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Argumentos:**

| Argumento | Descripción | Predeterminado |
|:---------|:-----------|:--------|
| `window` | Ventana temporal para el análisis (por ejemplo, `7d`, `2w`, `1m`) | Últimos 7 días |

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |
| `--interactive` | Modo interactivo con entrada manual |
| `--compare` | Compara la ventana actual con la ventana anterior de la misma duración |

**Qué muestra:**
- Resumen apto para un tuit (métricas en una línea)
- Tabla de resumen (commits, archivos modificados, líneas añadidas/eliminadas y contribuidores)
- Tendencias frente a la última retrospectiva (si existe una instantánea anterior)
- Clasificación de contribuidores
- Distribución horaria de los commits (histograma por hora)
- Sesiones de trabajo
- Desglose de tipos de commit (feat, fix, chore, etc.)
- Hotspots (archivos con más cambios)

**Ejemplos:**
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

## Sesiones y perfiles locales {#sessions-and-local-profiles}

### state list {#state-list}

Enumera las sesiones de workflow de OMA del proyecto actual. El descubrimiento global explícito
enumera las sesiones de todos los proyectos del perfil local seleccionado:

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` es de solo lectura. No se puede combinar con la activación ni el
mantenimiento de sesiones. Las lecturas y escrituras normales de sesiones conservan el alcance del proyecto.
Las sesiones legacy de otros repositorios primero deben migrar al almacenamiento de HOME para
aparecer en el listado agregado.

### profile {#profile}

Gestiona los perfiles de almacenamiento local en `~/.oma/u/<slot>/`. Los slots son
enteros decimales no negativos; son independientes de los presets de modelos y
de las cuentas de inicio de sesión de los proveedores.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` imprime la activación del shell; al evaluarla se establece `OMA_PROFILE` en el
shell actual. Ejecutarlo por sí solo no modifica el shell padre, no cambia las
aplicaciones ya ejecutándose ni guarda un valor predeterminado separado solo para el CLI. Los comandos del CLI
y los hooks del proveedor iniciados desde el shell activado heredan el mismo perfil.
El perfil predeterminado es `0`; `OMA_STATE_HOME` cambia la raíz de almacenamiento.
`profile run <slot> -- <command> [args...]` selecciona el perfil únicamente para ese
comando y sus hijos. El separador mantiene opciones del hijo como `--help`
y `--json` asociadas al comando hijo.

---

## Gestión de agentes {#agent-management}

### agent spawn {#agent-spawn}

Inicia un proceso de subagente.

```
oma agent spawn <agent-id> <prompt> <session-id> [--vendor <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `agent-id` | Sí | Tipo de agente. Uno de: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` |
| `prompt` | Sí | Descripción de la tarea. Puede ser texto inline o una ruta a un archivo. |
| `session-id` | Sí | Identificador de sesión (formato: `session-YYYYMMDD-HHMMSS`) |

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--vendor <vendor>` | Sobrescritura del proveedor CLI: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Directorio de trabajo del agente. Si se omite, se autodetecta a partir de la configuración del monorepo. |
| `--resumed-from <run-id>` | Vincula un reintento con el ID de la ejecución anterior. |
| `--task-id <id>` | ID de la tarea del plan de sesión. Por defecto, el ID del agente. |
| `--isolation <mode>` | Modo de aislamiento por spawn. Actualmente admite `worktree`: crea un worktree git nuevo en `${tmpdir}/oma-worktrees/{sessionId}/{agentId}`, en la rama `oma/{sessionId}/{agentId}`, y ejecuta allí el agente. El worktree se conserva después de terminar; se imprimen comandos de merge o descarte para revisión manual (sin merge automático). |
| `--read-only` | Restringe el agente iniciado a herramientas no destructivas (suprime los flags de autoaprobación). `oma skill eval --live` lo usa internamente para ambos brazos de evaluación. |
| `--fallback-vendors <vendors>` | Activa una cadena ordenada y separada por comas de hasta tres proveedores CLI configurados. La continuación requiere un fallo reconocido de cuota, límite de tasa o carácter transitorio, y un checkpoint nuevo de transferencia segura. |

**Orden de resolución del proveedor:** flag `--vendor` > sobrescritura `agents:` en `oma-config.yaml` > valores predeterminados de agentes del `model_preset` activo.

**Resolución del prompt:** Si el argumento del prompt es la ruta de un archivo existente, se usa el contenido del archivo como prompt. En caso contrario, el argumento se usa como texto inline. Los protocolos de ejecución específicos del proveedor se añaden automáticamente.

**Códigos de salida:**

| Código | Significado |
|:-----|:--------|
| `0` | El proceso del proveedor terminó con 0 y existe un artefacto de resultado de sesión en el workspace. |
| `3` | El proceso del proveedor terminó con 0, pero no escribió **ningún artefacto de resultado de sesión** en el workspace (por ejemplo, agy escribió en su propia raíz de confianza en lugar de usar `-w`). Se añade un evento `blocker.raised` al historial de la sesión y `agent status` informa `no-artifact`. No consideres completado el spawn. |
| otro | El proceso del proveedor falló; se propaga su código de salida. |

**Ejemplos:**
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

**Failover de proveedores:** los candidatos de fallback deben tener una entrada de proveedor en la
configuración del CLI instalado. Cada intento usa la configuración de modelo de su proveedor de destino
y pasa por las comprobaciones de cuota de sesión existentes. El proxy multi-proveedor `pi`
queda excluido de esta primera función de fallback de proveedores.
No se crean credenciales de proveedor ni rutas de API de pago adicionales.

Cuando se habilita el failover, la tarea recibe instrucciones para preparar un
registro de transferencia segura específico de la ejecución en `.agents/results/`. El sucesor lee
ese registro y comprueba el workspace antes de continuar el trabajo pendiente.
El agotamiento de cuota sin un checkpoint utilizable termina con un
registro needs-review. La cancelación, los fallos normales de tareas y las ejecuciones completadas no inician
otro intento. `--read-only` no exime del requisito de checkpoint.

Los eventos de sesión registran el motivo de la transición y los proveedores de origen y destino; cada
intento tiene su propia identidad de ejecución y el sucesor enlaza con su predecesor.
Esto se aplica a los subprocesos iniciados por `oma agent spawn`; no
cambia automáticamente una conversación interactiva existente en una aplicación de proveedor.
Si omites `--fallback-vendors`, se conserva la ejecución habitual con un solo proveedor.

### agent status {#agent-status}

Comprueba el estado de uno o más subagentes.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `session-id` | Sí | El ID de la sesión que se comprobará |
| `agent-ids` | No | Lista de IDs de agentes separados por espacios. Si se omite, no hay salida. |

**Opciones:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Ruta raíz para las comprobaciones de memoria | Directorio actual |

**Valores de estado:**
- `completed`: Existe el archivo de resultado (con un encabezado de estado opcional).
- `running`: Existe el archivo PID y el proceso está activo.
- `crashed`: Existe el archivo PID, pero el proceso ha terminado, o no se encontró ningún archivo PID/resultado.
- `no-artifact`: El proceso del proveedor terminó con 0, pero no escribió ningún artefacto de resultado de sesión en el workspace (escritura silenciosamente redirigida; consulta `agent spawn` y su código de salida `3`). Trátalo como un spawn fallido.

**Formato de salida:** Una línea por agente: `{agent-id}:{status}`

**Ejemplos:**
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel {#agent-parallel}

Ejecuta varios subagentes en paralelo.

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `tasks` | Sí | Una ruta a un archivo YAML de tareas o, con `--inline`, especificaciones de tareas inline |

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--vendor <vendor>` | Sobrescritura del proveedor CLI para todos los agentes |
| `-i, --inline` | Modo inline: especifica las tareas como argumentos `agent:task[:workspace]` |
| `--no-wait` | Modo en segundo plano (inicia los agentes y vuelve inmediatamente) |

**Formato del archivo YAML de tareas:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Formato de tarea inline:** `agent:task` o `agent:task:workspace` (el workspace debe comenzar por `./` o `/`).

**Directorio de resultados:** `.agents/results/parallel-{timestamp}/` contiene los archivos de log de cada agente.

**Ejemplos:**
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

### agent review {#agent-review}

Ejecuta una revisión de código mediante un CLI externo de IA (codex, claude, qwen o grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--vendor <vendor>` | Proveedor CLI que se usará: `codex`, `claude`, `qwen` o `grok`. Usa `codex` cuando el proveedor resuelto en la configuración no es compatible. |
| `-p, --prompt <prompt>` | Prompt de revisión personalizado. Si se omite, se usa un prompt de revisión de código predeterminado. |
| `-w, --workspace <path>` | Ruta que se revisará. De forma predeterminada es el directorio de trabajo actual. |
| `--no-uncommitted` | Omite la revisión de cambios sin commit. Al indicarlo, solo se revisan los cambios confirmados de la sesión. |

**Qué hace:**
- Detecta automáticamente el ID de la sesión actual a partir del entorno o de la actividad reciente de git.
- Para `codex`: usa el subcomando nativo `codex review`.
- Para `claude`, `qwen`: construye una solicitud de revisión basada en un prompt e invoca el CLI con el prompt de revisión.
- De forma predeterminada, revisa los cambios sin commit del directorio de trabajo.
- Con `--no-uncommitted`, limita la revisión a los cambios confirmados durante la sesión actual.

**Ejemplos:**
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

### goal set {#goal-set}

Asocia un contrato de objetivo a un workflow persistente activo (orchestrate, ultrawork, work, ralph). El hook Stop del modo persistente aplica el contrato de forma mecánica: la finalización deja de depender del criterio del modelo.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--gate <keyword>` | Puerta de parada determinista: `typecheck`, `test` o `lint`. Se asigna al script de package.json con el mismo nombre y se ejecuta como un array argv sin shell. Mientras esté definida, el hook Stop solo permite terminar el workflow **cuando el script pasa**; si falla, bloquea la salida con el final del resultado para que el agente sepa qué corregir. Se rechazan los comandos libres: el valor de la puerta vive en un archivo de estado escribible por el agente, por lo que ejecutar cadenas arbitrarias desde él eludiría la capa de permisos. |
| `--budget-minutes <n>` | Presupuesto de tiempo de reloj medido desde la activación del workflow. Al superarlo, el hook Stop desactiva el workflow y permite una parada parcial honesta (veredicto de la máquina, registrado como `gate.failed` con `gate: "budget"` en el historial de eventos de sesión). |
| `--description <text>` | Descripción humana del objetivo. Solo informativa. |
| `--workflow <name>` | Workflow de destino cuando hay varios workflows persistentes activos. |
| `--session <id>` | Sufijo del ID de sesión del archivo de estado de destino. |

**Notas de comportamiento:**
- Si la puerta pasa, el workflow se desactiva, se emite `gate.passed` y se permite la parada.
- El fallo de la puerta y el timeout (límite estricto de 60 s) cuentan para el límite de refuerzo (5), de modo que una puerta permanentemente roja no puede bloquear las paradas para siempre; la caducidad por antigüedad de 2 horas sigue siendo el último respaldo.
- Sin un contrato de objetivo, el modo persistente se comporta exactamente igual que antes (solo prompts de refuerzo): el contrato es completamente opt-in.

**Ejemplos:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Agentes programados {#scheduled-agents}

### schedule create {#schedule-create}

Registra un trabajo de agente programado. Se requiere exactamente uno de `--cron` o `--every`.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `agent-id` | Sí | Tipo de agente: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Sí | Descripción de la tarea que se pasa al agente cuando se ejecuta |

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--cron "<expr>"` | Expresión cron de 5 campos (por ejemplo, `"0 9 * * *"`). Es mutuamente excluyente con `--every`. |
| `--every "<phrase>"` | Intervalo en lenguaje natural: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Se redondea al paso más cercano expresable en cron y muestra una nota. Es mutuamente excluyente con `--cron`. |
| `--vendor <vendor>` | Sobrescritura del proveedor CLI que se pasa a `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Se autodetecta de forma predeterminada. |
| `-w, --workspace <path>` | Directorio de trabajo del agente. De forma predeterminada es el directorio actual en el momento del registro. |
| `--once` | Modo de una sola ejecución: se ejecuta una vez y luego se elimina. |
| `--expires-after <duration>` | Caduca automáticamente el trabajo recurrente después de N días (`0` = indefinido). |
| `--env <KEY1,KEY2>` | Captura variables de entorno con nombre en `~/.agents/schedule/env/<id>` (0600) para inyectarlas al ejecutarse. Solo se capturan las claves indicadas; nunca se vuelca todo el entorno. |

**Qué hace:**
1. Analiza y valida la expresión cron (o convierte la frase de `--every` a cron).
2. Escribe el trabajo en `~/.agents/schedule/schedules.json` (manifiesto global, permisos 0600).
3. Registra el trabajo en el planificador del sistema operativo (launchd / systemd --user / schtasks). El trabajo del sistema llama a `oma schedule run <id>` en el intervalo configurado.

**Ejemplos:**
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

Consulta la [guía de agentes programados](../guide/scheduled-agents.md) para ver el recorrido completo.

### schedule list {#schedule-list}

Enumera todos los trabajos programados de todos los proyectos, agrupados por proyecto y con el estado de drift del sistema operativo.

```
oma schedule list [--json]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |

**Estados de drift:** `synced` (el manifiesto y el sistema operativo coinciden), `stale` (el registro del sistema operativo invoca un comando que el CLI actual ya no acepta; ejecuta `schedule sync` para reescribirlo, `oma update` lo hace automáticamente), `missing-in-os` (ejecuta `schedule sync` para repararlo), `orphan-in-os` (el sistema operativo tiene un trabajo que no está en el manifiesto; ejecuta `schedule sync --prune` para eliminarlo).

**Ejemplos:**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete {#schedule-delete}

Elimina un trabajo programado tanto del manifiesto como del planificador del sistema operativo.

```
oma schedule delete <id>
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `id` | Sí | ID del trabajo obtenido de `schedule list` (formato: `sch_<base32-12>`) |

**Ejemplo:**
```bash
oma schedule delete sch_abc123def456
```

### schedule run {#schedule-run}

Ejecuta un trabajo programado por ID. Este es el punto de entrada que llama el planificador del sistema operativo cuando llega la hora de ejecución. Normalmente no se invoca a mano, pero se puede usar para depurar un trabajo.

```
oma schedule run <id>
```

**Qué hace:**
1. Busca `<id>` en el manifiesto (termina con un valor distinto de cero si no lo encuentra).
2. Carga las variables de entorno capturadas desde `~/.agents/schedule/env/<id>` y las inyecta.
3. Llama a `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`.
4. Escribe el resultado en `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Actualiza `lastFiredAt` en el manifiesto; se elimina si el trabajo es `--once`.
6. Falla de forma explícita cuando caduca la autenticación: termina con un valor distinto de cero e imprime `re-auth required: <vendor>` en stderr. Nunca termina correctamente en silencio.

**Ejemplo:**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync {#schedule-sync}

Vuelve a sincronizar el manifiesto con el planificador del sistema operativo. Repara el drift después de migraciones del sistema o reinicios del planificador.

```
oma schedule sync [--prune]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--prune` | También elimina los trabajos del sistema operativo que no están en el manifiesto (orphan-in-os). Sin `--prune`, los huérfanos se informan, pero no se eliminan. |

**Ejemplos:**
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Gestión de memoria {#memory-management}

### memory init {#memory-init}

Inicializa el esquema del almacén de memoria de coordinación.

```
oma memory init [--json] [--output <format>] [--force]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |
| `--force` | Sobrescribe los archivos de esquema vacíos o existentes |

**Qué hace:** Crea la estructura de directorios `.agents/state/memories/` con los archivos de esquema iniciales que los agentes y workflows usan para leer y escribir el estado de coordinación.

**Ejemplos:**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Integración y utilidades {#integration-utilities}

### auth status {#auth-status}

Comprueba el estado de autenticación de todos los CLI compatibles.

```
oma auth status [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Comprobaciones:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

**Ejemplos:**
```bash
oma auth status
oma auth status --json
```

### bridge {#bridge}

Envía MCP stdio a un servidor Serena compartido por proyecto.

```
oma bridge [url] [--context <name>]
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `url` | No | Conecta con un endpoint gestionado por quien llama en lugar de resolver un daemon compartido |
| `--context` | No | Contexto de Serena para el daemon (predeterminado `ide`); los daemons se identifican por él |

**Qué hace:** Esto es lo que ejecuta de forma predeterminada la entrada MCP de serena de cada proveedor;
no se invoca a mano. El transporte stdio de Serena da a cada sesión de agente
su propio proceso de Python y una pila completa de servidor de lenguaje, por lo que el coste crece
con el número de sesiones abiertas. El bridge lo reduce a un servidor por
proyecto: resuelve la raíz del proyecto a partir del directorio de trabajo, inicia un
servidor HTTP de Serena fijado con `--project` si no hay uno en ejecución y conecta la
sesión con él.

Fijar `--project` es importante: un servidor iniciado sin él expone la
herramienta `activate_project`, lo que permite que cualquier sesión cambie el proyecto por debajo de
las demás.

**Arquitectura:**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Ciclo de vida:** la primera sesión inicia el servidor, las siguientes lo reutilizan y
cada proxy se registra como cliente. Cuando se desconecta la última sesión, el servidor
se mantiene caliente durante 10 minutos —un reinicio vuelve a conectarlo— y, de lo contrario,
el siguiente bridge que se inicia lo apaga. Si no se puede acceder al servidor compartido,
el proxy usa como fallback una serena stdio local de la sesión.

Puedes desactivarlo con `serena.mode: stdio` en `.agents/oma-config.yaml`.

**Ejemplo:**
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify {#verify}

Verifica la salida del subagente frente a los criterios esperados.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**Argumentos de `verify agent`:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `agent-type` | Sí | Uno de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Opciones:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Ruta del workspace que se verificará | Directorio actual |
| `--json` | Salida como JSON | |
| `--output <format>` | Formato de salida (`text` o `json`) | |

**Qué hace:** Ejecuta el script de verificación para el tipo de agente indicado y comprueba que el build termine correctamente, los resultados de las pruebas y el cumplimiento del alcance.

`verify triggers` mide la precisión del detector de palabras clave frente a un corpus de prompts etiquetado. Los umbrales porcentuales son puertas de control. La ruta registrada es `verify agent`; la forma antigua de nivel superior todavía puede aparecer en la ayuda de compatibilidad.

**Comprobaciones comunes (todos los tipos de agente):**
- **Comprobación de alcance**: Lee los alcances de tarea de `.agents/results/plan-{sessionId}.json`. Compara los archivos modificados por `git diff` con los patrones de alcance definidos. Falla si se modifican archivos fuera del alcance asignado al agente.
- **Preflight del charter**: Verifica que `result-{agent}.md` contenga un bloque `CHARTER_CHECK:` correctamente completado y sin placeholders sin rellenar.
- **Secretos hardcodeados**: Busca en archivos `.py`, `.ts`, `.tsx`, `.js`, `.dart` patrones como `password = "..."`, `api_key = "..."` (excluye archivos de prueba o ejemplo).
- **Comentarios TODO/FIXME**: Cuenta los comentarios `TODO`, `FIXME`, `HACK`, `XXX` (muestra una advertencia si encuentra alguno).

**Comprobaciones específicas del agente:**

| Tipo de agente | Comprobaciones adicionales |
|:-----------|:-----------------|
| `backend` | Validación de sintaxis Python (`py_compile`), detección de inyección SQL (f-string + palabras clave SQL), ejecución de pruebas Python (`pytest`) |
| `frontend` | Compilación de TypeScript (`tsc --noEmit`), detección de estilos inline (`style={{`), uso del tipo `any` (falla si supera 3), pruebas de frontend (`vitest`) |
| `mobile` | Análisis de Flutter/Dart (`flutter analyze` o `dart analyze`), pruebas de Flutter (`flutter test`) |
| `qa` | Verificación de autocomprobación |
| `debug` | Ejecuta pruebas Python o de frontend según el tipo de proyecto detectado |
| `pm` | Valida que exista `.agents/results/plan-{sessionId}.json` y que sea JSON válido |

**Formato de salida:**
Cada comprobación informa `PASS`, `FAIL`, `WARN` o `SKIP` con un mensaje detallado. El resultado general es `ok: true` solo si no falla ninguna comprobación.

**Ejemplos:**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook {#hook}

Envía un evento hook de proveedor mediante el router centralizado de hooks de oma (diseño 019). Es la ABI canónica que invoca el wrapper `oma-hook.sh` generado para cada proveedor. También se puede usar directamente para depurar o probar cadenas de handlers de forma aislada.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Opciones:**

| Flag | Obligatorio | Descripción |
|:-----|:---------|:-----------|
| `--vendor <v>` | Sí | Identidad del proveedor. Uno de: `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro` o `qwen`. (El proveedor `pi` **no** es válido aquí: usa el bridge `installPiExtension` dentro del proceso en lugar de `oma hook run`.) |
| `--event <e>` | Sí | Nombre del evento hook nativo registrado en la configuración del proveedor (por ejemplo, `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | No | Nombre de herramienta o matcher opcional reenviado desde el registro del hook (por ejemplo, `Bash`) |

**Contrato de stdin / stdout:**
- **stdin**: payload JSON nativo del proveedor (el mismo objeto que el proveedor pasa a los procesos hook).
- **stdout**: JSON del dialecto del proveedor (o texto plano para los prompts de kiro) cuando se activa un handler; vacío cuando ningún handler produce salida.
- **exit code**: siempre `0` (fail-open: los errores se escriben en stderr y el agente nunca queda bloqueado).

**Flujo de datos en runtime:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Depuración aislada de cadenas de handlers:**

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

Un stdout vacío significa que la cadena no produjo ninguna operación para ese evento. Un objeto JSON en stdout es el dialecto del proveedor que recibiría la sesión del agente.

**Notas de alcance:**
- Las entradas `statusLine`/hud no pasan por `oma hook run` (la visualización del hot path permanece en una ruta directa de `bun`).
- El proveedor pi usa su bridge `installPiExtension` dentro del proceso, no `oma hook run`.
- Las entregas duplicadas de una doble instalación (proyecto + global) se descartan dentro de `oma hook run` (payload idéntico lanzado por otro wrapper `oma-hook.sh`); los eventos distintos, incluidas las llamadas paralelas a herramientas, siempre se ejecutan.

Consulta `cli/commands/hook/command.ts` para la implementación del router (internamente denominada "design 019") y `cli/commands/hook/probe/` para la matriz de compatibilidad por proveedor.

**Ejemplos:**
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

### hook probe {#hook-probe}

Sondea la compatibilidad de hooks por proveedor e imprime una matriz de cobertura.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Opciones:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--vendor <list>` | Proveedores que se sondearán, separados por comas | Todos los proveedores compatibles |
| `--output <fmt>` | Formato de salida: `text`, `md` o `json` | `text` |
| `--hooks-dir <dir>` | Sobrescribe el directorio `.agents/hooks/core` | Autodetectado |

**Qué verifica:** Para cada proveedor, comprueba si están presentes los scripts de hook principales (`keyword-detector`, `persistent-mode`, etc.) y si el JSON de variante asigna correctamente los eventos a las cadenas de handlers. El código de salida es `1` si algún proveedor informa del estado `failed`.

**Ejemplos:**
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

### vault {#vault}

Gestiona claves de API y otros secretos en el llavero del sistema operativo (macOS Keychain, Linux Secret Service o Windows Credential Manager), respaldado por `@napi-rs/keyring`. Los valores nunca aparecen en el historial del shell ni en archivos de entorno; solo se registran los nombres de las claves en `~/.config/oma/vault-index.json`, de modo que `oma vault list` puede enumerarlas sin exponer sus valores.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Subcomandos:**

| Subcomando | Descripción |
|:------------|:-----------|
| `store <name>` | Solicita un valor secreto (entrada oculta) y lo escribe bajo `name` en el llavero del sistema operativo. `--value <value>` acepta el valor inline para uso no interactivo (visible en el historial del shell; se recomienda el prompt). |
| `get <name>` | Imprime el valor guardado en stdout sin decoración para poder usarlo en el shell: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Termina con el código `2` cuando la clave no existe. |
| `list` | Enumera los nombres de las claves guardadas con sus marcas de tiempo `createdAt`. Los valores nunca se muestran. |
| `rm <name>` | Elimina el secreto del llavero y del índice. |

**Reglas para nombres de claves:** de 1 a 64 caracteres de `[A-Za-z0-9._-]`. Ejemplos: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Dependencia nativa:** El módulo nativo `@napi-rs/keyring` se carga de forma diferida; si no se puede cargar (por ejemplo, en Linux sin interfaz y sin `libsecret` o `gnome-keyring`), el comando muestra un error explícito con una indicación de instalación en lugar de usar un fallback silencioso.

**Ejemplos:**
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

### cleanup {#cleanup}

Limpia procesos de subagentes huérfanos y archivos temporales.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--dry-run` | Muestra lo que se limpiaría sin hacer cambios |
| `-y, --yes` | Omite los prompts de confirmación y limpia todo |
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Qué limpia:**
- Archivos PID huérfanos del directorio temporal del sistema (`/tmp/subagent-*.pid`).
- Archivos de log huérfanos (`/tmp/subagent-*.log`).
- **Servidores de lenguaje Serena huérfanos**: cuando sale un cliente MCP (por ejemplo, Claude), su `serena start-mcp-server` se reasigna a init y sus procesos LSP hijos (`tsserver`, `pyright`, …, cientos de MB) siguen ejecutándose sin cliente. Aquí se recuperan. El caso *inactivo pero todavía conectado* lo gestiona por separado [`serena reap`](#serena).
- Directorios de Gemini Antigravity (brain, implicit, knowledge) bajo `.gemini/antigravity/`.

**Ejemplos:**
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

### serena {#serena}

Recupera memoria de los servidores de lenguaje de Serena por proyecto. Serena inicia una pila LSP
(`tsserver`, `pyright`, …, ~300 MB) por cada proyecto abierto y la mantiene activa durante
toda la sesión; con varios proyectos abiertos, el consumo se acumula. El reaper termina
los procesos LSP hijos inactivos; Serena se repara sola y los vuelve a iniciar en la siguiente llamada de herramienta (sin
necesidad de reiniciar).

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Subcomandos:**

| Comando | Descripción |
|:--------|:-----------|
| `serena reap` | Recupera ahora los LSP inactivos una vez. Las ejecuciones interactivas siempre se realizan; `--quiet` (la ruta programada) respeta el opt-in `enabled`. |
| `serena reap --dry-run` | Previsualiza los objetivos y la memoria que se liberaría; nunca termina procesos. |
| `serena reaper enable` | Instala una tarea en segundo plano que ejecuta `serena reap --quiet` cada 5 minutos (launchd / temporizador de systemd / Windows Task Scheduler). |
| `serena reaper disable` | Elimina la tarea en segundo plano. |

**Política:** `lru` (predeterminada) mantiene activos los proyectos más recientes hasta `keepWarm`
y recupera el resto; `idle` recupera cualquier proyecto inactivo más allá de `idleMinutes`. Una
ventana `graceSeconds` protege las llamadas de herramientas en curso.

**Configuración** (`.agents/oma-config.yaml`, opt-in; desactivada de forma predeterminada):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Los diagnósticos (estado KEEP/REAP por proyecto y fuente de la señal de actividad) se
muestran con [`oma doctor`](#doctor). Los LSP de Serena huérfanos (con el cliente muerto) se recuperan
con [`oma cleanup`](#cleanup) independientemente de esta configuración.

**Ejemplos:**
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

### visualize {#visualize}

Visualiza la estructura del proyecto como un grafo de dependencias.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` es un alias integrado de `visualize`.

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Qué hace:** Analiza la estructura del proyecto y genera un grafo de dependencias que muestra las relaciones entre skills, agentes, workflows y recursos compartidos.

**Ejemplos:**
```bash
oma visualize
oma viz --json
```

### search {#search}

Primitivas mecánicas de búsqueda para fetch, metadatos, RSS, medios, código y puntuación de confianza. Tiene el alias `oma s`. Todos los subcomandos escriben JSON en stdout (un objeto por línea o con formato legible mediante `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcomandos:**

| Subcomando | Propósito |
|:-----------|:--------|
| `fetch <url>` | Obtiene una URL mediante un pipeline de estrategias con escalado automático (api → probe → impersonate → browser → archive) |
| `api <url>` | Obtiene contenido mediante el handler de API de plataforma correspondiente (fase 0) |
| `api:search <query>` | Distribuye la búsqueda de palabras clave entre las plataformas que la admiten (`--platforms <list>`) |
| `meta <url>` | Extrae metadatos OGP / JSON-LD / Schema.org |
| `rss <url>` | Descubre y analiza un feed RSS / Atom |
| `rss:google <query>` | Construye una URL RSS de Google News para una consulta |
| `media <url>` | Extrae metadatos de medios mediante `yt-dlp` (1858 sitios) |
| `archive <url>` | Obtiene contenido mediante el fallback AMP / archive.today / Wayback |
| `trust <domain>` | Resuelve el nivel o la puntuación de confianza de un dominio |
| `code <query>` | Busca código mediante `gh` (GitHub) o `glab` (GitLab) |
| `doctor` | Comprueba dependencias (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Opciones comunes de los subcomandos de URL/consulta:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Timeout por estrategia | `15` (`30` para `media`) |
| `--locale <value>` | Cabecera `Accept-Language` | `en-US,en;q=0.9` |
| `--pretty` | Imprime el JSON con formato legible | `false` |

**Opciones adicionales de `fetch`:**

| Flag | Descripción |
|:-----|:-----------|
| `--only <strategies>` | Estrategias que se ejecutarán, separadas por comas (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Estrategias que se omitirán, separadas por comas |
| `--include-archive` | Añade la estrategia archive como último fallback |

**Opciones adicionales de `media`:**

| Flag | Descripción |
|:-----|:-----------|
| `--subs` | Escribe subtítulos |
| `--sub-lang <list>` | Idiomas de los subtítulos, separados por comas (predeterminado: `en`) |
| `--format <spec>` | Especificación de formato de yt-dlp |

**Opciones adicionales de `code`:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Host | `github` |
| `--language <lang>` | Filtro de lenguaje | |
| `--repo <owner/repo>` | Limita la búsqueda a un repositorio | |
| `--limit <n>` | Máximo de resultados | `20` |

**Códigos de salida:** `0` correcto, `1` error, `2` bloqueado, `3` no encontrado, `4` entrada no válida, `5` autenticación requerida, `6` timeout.

**Ejemplos:**

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

El registro también expone estos helpers explícitos de descubrimiento:

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

`search` emite JSON incluso sin `--json`. `--pretty` solo cambia la presentación; no cambia el esquema del resultado. `search web` acepta `--provider`, `--limit`, `--timeout`, `--json` y `--pretty`. Si una estrategia está bloqueada o falta una dependencia, usa la tabla de códigos de salida de arriba y vuelve a ejecutar `oma search doctor` antes de cambiar de estrategia.

### image {#image}

Generación de imágenes con IA mediante varios proveedores y dispatch paralelo consciente de la autenticación. Tiene el alias `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcomandos:**

| Subcomando | Propósito |
|:-----------|:--------|
| `generate <prompt...>` | Genera imágenes mediante `pollinations` (flux/zimage, gratis), `codex` (gpt-image-2 mediante OAuth de ChatGPT) o `antigravity` (nano-banana mediante la suscripción de Gemini Code Assist, sin clave) |
| `doctor` | Comprueba la autenticación y el estado de instalación por proveedor |
| `vendor list` | Enumera los proveedores registrados y los modelos compatibles |

**Opciones de `image generate`:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | Cualquier `WxH` cuyos bordes sean divisibles por 16, estén entre 16 y 3840 y tengan una relación de aspecto de 1:3 a 3:1; también se acepta `auto`. | predeterminado del proveedor |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | predeterminado del proveedor |
| `-n, --count <n>` | Número de imágenes (1..5) | `1` |
| `--output-dir <path>` | Directorio de salida | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | Permite rutas de salida fuera de `$PWD` | `false` |
| `--model <name>` | Sobrescritura del modelo específica del proveedor; `antigravity` la ignora porque su modelo es opaco. | predeterminado del proveedor |
| `--timeout <duration>` | Timeout por imagen | predeterminado del proveedor |
| `-r, --reference <path>` | Imagen o imágenes de referencia; repetible o separada por comas. Compatible con `codex` y `antigravity`; se rechaza en `pollinations`. Cada archivo debe ser PNG/JPEG/GIF/WebP de ≤5 MB (validado por magic bytes); máximo 10. | |
| `-y, --yes` | Omite la confirmación del coste | `false` |
| `--no-prompt-in-manifest` | Guarda el SHA256 del prompt en lugar del texto sin procesar | `false` |
| `--dry-run` | Imprime el plan y la estimación de coste; no ejecuta nada | `false` |
| `--output <format>` | Formato de salida del CLI: `text` \| `json` | `text` |

Cada ejecución escribe un `manifest.json` junto a las imágenes generadas, con el proveedor, el modelo, el prompt (o su hash), el tamaño, la calidad y el coste.

**Ejemplos:**

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

### video {#video}

Planifica, escribe y renderiza videos cortos, explicativos y de demostración. `generate` crea el brief, el guion, la especificación de render y el manifiesto de ejecución; antes de renderizar un MP4 real se necesita una composición y un compositor operativo.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` acepta `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor hyperframes|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` y `--capture-stop duration:<seconds>|selector:<css>`. Usa `--source web --url <url>` para capturar un navegador; `--source file` es el valor predeterminado. `--output-dir` selecciona la raíz de ejecución, `--allow-external-output` permite una ruta fuera de `$PWD`, `--max-usd` establece un límite de coste, `-y, --yes` omite la confirmación del coste, `--seed` estabiliza las entradas de planificación, `--timeout` limita cada llamada a un proveedor visual o de música, `--script` inyecta un `script.json` escrito por el agente y `--no-brief-in-manifest` guarda el hash del brief en lugar de su texto. `--dry-run` se detiene después de planificar. `--output text|json` controla el envoltorio del CLI.

`doctor` comprueba la toolchain almacenada en caché de HyperFrames/MPT y acepta `--install`, `--upgrade`, `--install-mpt` y `--install-strudel`. `provider list` informa de la disponibilidad del proveedor y del estado de sus claves. `compose` crea o refresca la composición de la ejecución e informa del contrato de autoría; `render` ejecuta lint, renderiza y sondea la salida. La falta de compositor, composición o dependencias de la toolchain son errores. La ruta exclusiva de pruebas `OMA_VIDEO_MOCK=1` es el único modo placeholder; una ejecución normal nunca sustituye el MP4 por un archivo de texto o diminuto.

La salida JSON correcta contiene `runDir`, `manifestPath`, `scriptPath` y `renderSpecPath`; el manifiesto registra los proveedores seleccionados, las entradas y los recursos generados. Después de `compose`, escribe la composición generada según su `AUTHORING.md` y vuelve a ejecutar `render`. Si no hay una clave de proveedor disponible, ejecuta `oma video doctor`; si falla la captura, comprueba la URL, el selector, el dispositivo y el timeout; si falla el render, corrige los diagnósticos de la composición antes de reintentarlo.

### star {#star}

Da una estrella a oh-my-agent en GitHub.

```
oma star
```

No tiene opciones. Requiere que el CLI `gh` esté instalado y autenticado. Da una estrella al repositorio `first-fluke/oh-my-agent`.

**Ejemplo:**
```bash
oma star
```

### describe {#describe}

Describe los comandos CLI como JSON para la introspección en runtime.

```
oma describe [command-path]
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|:---------|:---------|:-----------|
| `command-path` | No | Comando que se describirá. Si se omite, describe el programa raíz. |

**Qué hace:** Produce un objeto JSON con el nombre, la descripción, los argumentos, las opciones y los subcomandos del comando. Los agentes de IA lo usan para comprender las capacidades disponibles del CLI.

**Ejemplos:**
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Comandos de investigación y artefactos {#research-and-artifact-commands}

Estas familias son útiles cuando la salida es un artefacto de investigación, una presentación o un informe. Aquí se mantienen deliberadamente breves; las guías enlazadas explican el workflow y las decisiones de recuperación.

### intel suggest {#intel-suggest}

Sugiere trabajo de producto a partir de señales del mercado y del repositorio:

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` proporciona la configuración completa. Para ejecuciones puntuales, `--topic`, `--target`, `--repos`, `--since` y `--last-commits` seleccionan las entradas. `--output-dir` controla los informes locales y `--fixture` proporciona un fixture JSON local para una revisión determinista. `--create-issue` crea en GitHub los candidatos aceptados y requiere un destino configurado y confirmación; combínalo con `--base-repo <owner/name>` para seleccionar el repositorio y usa `--yes` solo en un contexto de automatización ya aprobado. `--dry-run` y `--json` son rutas seguras de inspección.

### market {#market}

La familia market delega en el motor upstream `last30days` resuelto. Empieza por la puerta y el resolver:

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` devuelve el código de salida 2 con una reformulación para temas keyword-trap o demasiado amplios; `--force` omite esa puerta solo cuando el usuario quiere continuar de forma explícita. `market resolve` acepta `--refresh` y `--offline`, y `market update` refresca la caché gestionada del motor. `market run` pasa sus argumentos restantes al motor Python resuelto y añade `--save-dir` de `market.save_dir` cuando se proporciona un tema. Lee [Investigación de mercado](../guide/market-research.md) antes de elegir flags upstream; su salida de `--help` pertenece al motor gestionado y cambia con cada versión.

### docs {#docs}

Usa la familia docs para inspeccionar el drift de la documentación. Los comandos están orientados a informes; `sync` enumera candidatos para el agente anfitrión y no edita archivos por sí mismo.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` comprueba las referencias locales y regenera `docs/generated/doc-refs.json`; `--urls-sync` espera la pasada opcional de URLs con `lychee`. `sync` usa por defecto los cambios staged y después `HEAD~1..HEAD`, y emite candidatos `{doc, changedFiles, matchedRefs}`. `i18n` informa del drift estructural entre inglés y traducción, mientras que `lint` informa de problemas de estilo en los documentos traducidos. Ninguno de estos subcomandos edita automáticamente los docs.

### slide {#slide}

`oma slide` opera sobre un directorio de trabajo con fragmentos de diapositivas HTML de 1920×1080. El recorrido mínimo es:

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

La puerta de calidad informa de desbordamientos, solapamientos y problemas de tamaño de fuente. Usa `--slide <file>` para comprobar una sola diapositiva y `--report-file <path>` con salida JSON. Exporta solo después de validar:

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

La exportación PPTX es experimental y se basa en raster. `slide import pptx <file>`, `slide asset fetch-video <url>` y `slide style list|preview|get <slug>` cubren los recursos de entrada y el descubrimiento de estilos. Usa [oma-slide](../guide/content-and-research.md#slides-and-presentations) para las decisiones de autoría y las restricciones del escenario fijo.

### scholar {#scholar}

Busca artículos y metadatos de trabajos; después valida los sidecars antes de compartirlos:

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` puede limitar los resultados de OpenAlex con `--year-min` y forzar proveedores de fallback con `--always-fallback`. `get --section` acepta `statements`, `evidence`, `relations`, `artifacts` o `citation`. `lint --lenient` convierte las referencias entre registros sin destino en advertencias; `--fail-on-warning` hace que las advertencias fallen en CI. El CLI busca primero en Knows y después usa OpenAlex y Semantic Scholar como fallback; no envía sidecars upstream.

### explain {#explain}

`/explain` es el workflow de autoría. El CLI valida artefactos ya creados:

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Pasa un archivo o `--input-dir`, pero no ambos. La validación cubre el contrato HTML autocontenido e informa de fallos legibles por máquina; no juzga la precisión de la explicación. Consulta [Explicador de código](../guide/code-explainer.md).

### diagram {#diagram}

Resuelve el motor antes de que un workflow emita un diagrama estructural:

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` acepta `--engine auto|archify|mermaid`, `--refresh` y `--offline`. `diagram update` refresca la copia gestionada de archify. `diagram archify` reenvía los argumentos restantes al ejecutable upstream resuelto y propaga su código de salida. Mermaid sigue siendo la fuente de verdad en Markdown; el HTML es un artefacto derivado. Consulta [Motor de diagramas](../guide/diagram-engine.md).

## Inspección del estado, los modelos y la memoria {#state-model-and-memory-inspection}

Las siguientes familias exponen el estado persistente de los workflows y diagnósticos de modelos y proveedores. Prefiere `--dry-run` en acciones de estilo cleanup y `--json` cuando otro programa vaya a consumir el resultado.

### state {#state}

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` registra un evento L1 con categoría y metadatos de sesión explícitos. `state migrate` mueve las sesiones legacy al perfil seleccionado. `state repair` repara los archivos de estado malformados. `state decisions list` y `state inject-log list|get` inspeccionan las decisiones requeridas y las entradas de auditoría de inyección. `state activate`, `state archive` y `state purge` son acciones explícitas; los antiguos flags booleanos de acción se rechazan. Archiva o purga solo después de revisar un dry-run, porque estos comandos cambian el estado local.

### model {#model}

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` compara el registro con las listas activas de los proveedores y puede sondear candidatos nuevos. `model probe` prueba un slug contra el CLI de su proveedor. `model propose` emite un parche de `oma-config` con `models:`; usa `--write` solo cuando tengas intención de cambiar la configuración. La disponibilidad y la cuota del proveedor pueden hacer que los sondeos fallen aunque la entrada del registro sea válida.

### comandos de evidencia de agentes {#agent-evidence-commands}

Las ejecuciones nativas de agentes usan una secuencia respaldada por evidencias:

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` carga el contexto seleccionado por el grafo; `begin` inicia una ejecución e imprime un ID de ejecución generado y una ruta de claim; `verify` recibe ese ID y ejecuta las comprobaciones fijadas (`--required`) o las limita con `--affected`; `finish` recibe el ID y la ruta del archivo de claim. `agent resume --dry-run` informa de las tareas listas y reutilizables, y `agent resume --max-attempts <n>` reintenta solo las tareas permitidas por el plan. Consulta [Resultados y reanudación de agentes](../guide/agent-results-and-resume.md) para conocer la forma del plan y del claim. Estos comandos pertenecen al contrato de ejecución de OMA; para el trabajo normal del usuario se pueden usar `agent spawn`, `agent parallel` o `agent review`.

### memory {#memory}

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` configura la conexión de Honcho o las credenciales de embeddings; `--dry-run` previsualiza los destinos sin leer ni escribir claves. `memory setup` prepara un endpoint de AgentMemory y opcionalmente puede `--install` o `--start`. `memory daemon` y `memory service` gestionan la integración con procesos locales o servicios del sistema operativo. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade` y `memory gc` son acciones de mantenimiento; inspecciona su JSON o la salida de dry-run antes de aplicarlas.

## Gestión de skills {#skill-management}

### skills audit {#skills-audit}

Comprueba si las skills instaladas tienen descripciones solapadas, generalismo de tipo agujero negro o degradación del enrutamiento por el tamaño de la biblioteca.

```
oma skill audit [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON para CI/CD |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Qué comprueba:**
- **Similitud por pares de descripciones**: similitud coseno TF-IDF entre cada par de skills instaladas. Advierte a partir de ≥ 60 % y falla a partir de ≥ 75 %.
- **Detección de agujero negro**: marca cualquier skill cuya similitud media con las demás sea un valor atípico positivo (≥ media + 1,5 × desviación estándar), lo que indica una descripción demasiado genérica que podría secuestrar el enrutamiento.
- **Degradación por tamaño de biblioteca**: advierte cuando hay más de 60 skills instaladas (la precisión del enrutamiento cae logarítmicamente a medida que crece la biblioteca).
- **Comprobación de enfoque**: advierte cuando una skill se convierte en un paquete: más de 20 documentos de referencia (archivos `.md` aparte de `SKILL.md`, excluyendo árboles vendorizados) o un cuerpo de `SKILL.md` de más de 25.000 caracteres. Las skills enfocadas rinden mejor que los paquetes (SkillsBench, arXiv:2602.12670); la solución es dividir, no eliminar.

**Códigos de salida:** `0` si todos los hallazgos están en la banda de advertencia o no hay hallazgos; `1` si al menos un par está en la banda de fallo.

**Ejemplos:**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint {#skills-lint}

Detecta problemas de autoría por skill: defectos de calidad dentro de un solo `SKILL.md`, a diferencia de `skills audit`, que comprueba las relaciones *entre* skills. Se basa en la taxonomía de problemas de skills de arXiv:2607.01456 (más del 99 % de los archivos SKILL.md reales presentan al menos uno).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--skill <id>` | Analiza una sola skill |
| `--json` | Salida como JSON para CI/CD |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Problemas genéricos (todas las skills):**

| Problema | Gravedad | Significado |
|:------|:---------|:--------|
| `missing-name` | fail | falta `name` en el frontmatter o está vacío |
| `missing-description` | fail | falta `description` en el frontmatter o está vacío; el enrutamiento depende de ella |
| `weak-description` | warn | descripción de menos de 40 caracteres; es demasiado escasa para enrutar |
| `body-too-long` | warn | cuerpo de SKILL.md de más de 500 líneas; mueve los detalles a `resources/` mediante divulgación progresiva |
| `template-placeholder` | warn | queda texto `{Placeholder}` fuera de spans de código |
| `broken-reference` | fail | referencia un archivo de `resources/`, `config/`, `scripts/` o `assets/` que no existe |

**Problemas SSL-lite** (la validación SSL-lite es obligatoria cuando el nombre declarado de una skill o el nombre de su directorio o alias expuesto empieza por `oma-`, incluso sin `## Scheduling`; un alias sin prefijo no puede eludir un nombre declarado con `oma-`. Las skills normales sin prefijo adoptan el formato al incluir `## Scheduling`):

| Problema | Gravedad | Significado |
|:------|:---------|:--------|
| `ssl-structure` | fail | las secciones de nivel superior se apartan de `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | no hay exactamente un `### Canonical command path` o `### Canonical workflow path` |
| `missing-boundaries` | warn | no existe `### When NOT to use`; las skills sin límites secuestran el enrutamiento |
| `empty-failure-recovery` | warn | falta `### Failure and recovery` o está vacío (acepta bullets o filas de tabla); codifica los mecanismos de fallo según SkillLens |

**Códigos de salida:** `0` si no hay problemas de gravedad fail; `1` si hay al menos uno.

**Ejemplos:**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval {#skills-eval}

Mide la utilidad de cada skill: ¿cargar una skill mejora realmente los resultados de tareas reservadas? Es la contraparte de *utility* de `skills audit` (que mide el solapamiento de límites de descripciones). Mientras `audit` pregunta «¿son redundantes dos skills?», `eval` pregunta «¿esta skill ayuda?».

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--skill <id>` | ID de la skill que se evaluará (nombre simple, sin separadores de ruta). Predeterminado: `_all`. |
| `--mock` | Reproduce rollouts registrados desde `_rollouts/` (predeterminado; determinista y sin dispatch de LLM). Seguro para CI. |
| `--live` | Dispatch de agentes en vivo: inicia dos brazos (baseline y treatment) por tarea mediante `oma agent spawn --read-only`. Muestra una estimación de coste y solicita confirmación salvo que se indique `--yes`. |
| `--record` | Escribe los rollouts en vivo capturados (incluidos los veredictos del juez) en `_rollouts/` para reproducirlos después con `--mock`. Solo tiene efecto con `--live`. |
| `--yes` | Omite el prompt de confirmación de la estimación de coste. Solo tiene efecto con `--live`. |
| `--task-dir <path>` | Sobrescribe el directorio de fixtures de tareas (debe estar dentro de la raíz del workspace). Predeterminado: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Limita la cantidad de tareas evaluadas (aplicado en orden de clasificación determinista). |
| `--require-coverage` | Termina con un valor distinto de cero cuando encuentra menos de 5 tareas (evita un resultado verde silencioso en CI). |
| `--json` | Salida como JSON para CI/CD |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Cómo funciona:**

Para cada fixture de tarea en `.agents/eval/<skill>/`:
1. **Brazo baseline**: el prompt de la tarea se envía sin cargar la skill.
2. **Brazo treatment**: se antepone `SKILL.md` al prompt y después se envía.
3. Cada brazo recibe una puntuación de su checker (judge de forma predeterminada; assert o regex para opt-ins deterministas).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Decisiones:**

| Decisión | Condición |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (código de salida 1) |
| `insufficient` | Menos de 5 tareas puntuables (código de salida 1 solo con `--require-coverage`) |

**Modo recomendado:** Usa `--live` con checkers judge para medir la utilidad real de la skill. Usa `--mock` para reproducir offline veredictos judge registrados o ejecutar comprobaciones deterministas del contrato con `assert`/`regex`.

**Variable de entorno:** `OMA_SKILLEVAL_MOCK=1` fuerza el modo mock independientemente de los flags.

**Códigos de salida:** `0` para pass o warn; `1` para fail o insufficient con `--require-coverage`.

**Ejemplos:**
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

Consulta la [guía de evaluación de utilidad de skills](../guide/skill-eval.md) para conocer el formato de fixtures de `.agents/eval/` y los tipos de checker.

---

### skills opt {#skills-opt}

Optimiza el `SKILL.md` de una skill mediante una evolución persistente al estilo WikiSkill. Un Maintainer consolida la evidencia observable de los rollouts en conocimiento acotado, un Proposer emite cambios limitados de adición/eliminación/reemplazo y los resultados rechazados persisten entre ejecuciones. Los candidatos deben mejorar estrictamente la división de validación reservada; `--apply` también requiere una mejora estricta en una división final de pruebas propiedad del runner. Base de investigación: WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Opciones:**

| Flag | Predeterminado | Descripción |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | ID de la skill que se optimizará (nombre simple, sin separadores de ruta). |
| `--dry-run` | **sí (predeterminado)** | Propone cambios e imprime el diff sin cambiar `SKILL.md`; la evidencia de evolución generada se sigue registrando. |
| `--apply` | — | Aplica los cambios aceptados; respalda el original antes de una escritura atómica y solo escribe una mejora validada. |
| `--mock` | **sí (predeterminado)** | Reproduce offline los cambios registrados del optimizador y los veredictos de evaluación (determinista). Seguro para CI. |
| `--live` | — | Dispatch de optimización LLM en vivo: realiza llamadas reales al modelo en cada época. Muestra una estimación de coste y solicita confirmación salvo que se indique `--yes`. |
| `--max-epochs <n>` | `8` | Número máximo de épocas de optimización. |
| `--edits-per-epoch <k>` | `4` | Cambios candidatos propuestos por época. |
| `--lr <chars>` | `600` | Presupuesto de tasa de aprendizaje textual: cambio neto máximo de caracteres por edición. |
| `--yes` | — | Omite la confirmación de la estimación de coste (solo con `--live`). |
| `--json` | — | Salida como JSON para CI/CD. |
| `--output <format>` | `text` | Formato de salida (`text` o `json`). |

**Dependencia estricta:** Requiere al menos 5 fixtures de tareas en `.agents/eval/<skill>/`. Emite un mensaje claro de error cuando encuentra menos. Consulta la [guía de evaluación de utilidad de skills](../guide/skill-eval.md) para crearlas.

**División train/validation/test:** Los fixtures se dividen de forma determinista en 60/20/20. Maintainer y Proposer solo ven la evidencia TRAIN, la selección de candidatos usa tareas VALIDATION reservadas y la división TEST propiedad del runner permanece oculta hasta que termina la evolución. `--apply` solo escribe cuando mejoran estrictamente tanto validation lift como final-test lift.

**Advertencia sobre SSOT:** Las skills cuyo ID empieza por `oma-` se sobrescriben con `oma update`. Para esas skills, se desaconseja `--apply`: usa el `--dry-run` predeterminado y sube el diff propuesto. Las skills escritas por el usuario se pueden aplicar libremente.

**Códigos de salida:** `0` si la optimización terminó; `1` si faltan fixtures o el argumento no es válido.

**Ejemplos:**
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

Consulta la [guía de optimización de skills](../guide/skill-opt.md) para ver el recorrido completo y los detalles de las protecciones de SSOT y sobreajuste.

---

### harness eval {#harness-eval}

Compara un overlay candidato de `.agents/` con el harness actual de OMA en tareas emparejadas y aisladas del repositorio. El agente de destino y la ruta del proveedor permanecen fijos; las comprobaciones deterministas puntúan los archivos y la salida producida por cada brazo.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Flag | Descripción |
|:-----|:------------|
| `--suite <path>` | YAML de suite obligatorio. La suite y los workspaces de fixtures deben estar dentro de la raíz del proyecto. |
| `--candidate <path>` | Raíz candidata obligatoria que contiene un overlay de `.agents/` acotado. |
| `--mock` | Reproduce una ejecución registrada cuyo hash coincide (predeterminado; determinista y offline). |
| `--live` | Ejecuta los brazos baseline y candidate mediante el agente de destino de la suite. |
| `--record` | Persiste una ejecución en vivo para reproducirla después con mock. Requiere `--live`. |
| `--record-file <path>` | Sobrescribe la ruta del registro; debe permanecer dentro de la raíz del proyecto. |
| `--yes` | Omite la confirmación de coste de la ejecución en vivo. |
| `--timeout-minutes <n>` | Timeout por brazo, idéntico para baseline y candidate. Predeterminado: `15`. |
| `--require-coverage` | Termina con un valor distinto de cero cuando se pueden puntuar menos de cinco tareas emparejadas. |
| `--json` | Salida de la evaluación completa como JSON. |
| `--output <format>` | Formato de salida (`text` o `json`). |

**Puerta de decisión:** pass requiere al menos 5 tareas emparejadas, un lift de al menos 5 puntos porcentuales y cero regresiones. Una regresión siempre falla. La cobertura inferior al mínimo es `insufficient` y termina con un valor distinto de cero solo con `--require-coverage`.

**Aislamiento:** los archivos candidatos solo pueden sustituir el contenido de `.agents/agents`, `.agents/rules`, `.agents/skills` y `.agents/workflows` en el brazo candidato temporal. Se rechazan hooks, configuración, estado, fixtures de evaluación, symlinks, variantes de proveedores, cambios protegidos del frontmatter de ejecución del agente y archivos del harness del proveedor propiedad de los fixtures. Un brazo falla si modifica definiciones protegidas durante la ejecución. La evaluación en vivo rechaza el descubrimiento de proveedores basado en HOME. La ruta del agente principal es fija; el anclaje del modelo de subagentes anidados todavía no se aplica.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Consulta la [guía de evaluación del harness](../guide/harness-eval.md) para conocer el esquema de la suite, las comprobaciones compatibles, el modelo de aislamiento y las limitaciones actuales.

### harness incident promote {#harness-incident-promote}

Convierte un incidente capturado en un fixture de regresión para la skill que usó el agente que falló.

```
oma harness incident promote <id> [--skill <id>] [--draft] [--force] [--json]
```

### harness feedback {#harness-feedback}

Promueve todos los incidentes sin promover y, con `--live` o `--apply`, optimiza cada skill afectada frente a su suite ampliada.

```
oma harness feedback [--scan-runs] [--live] [--apply] [--max-epochs <n>] [--incident <ids...>] [--json]
```

Consulta la [guía de casos de regresión de incidentes](../guide/harness-incidents.md).

---

### help {#help}

Muestra información de ayuda.

```
oma help
```

Muestra el texto completo de ayuda con todos los comandos disponibles.

### version {#version}

Muestra el número de versión.

```
oma version
```

Imprime la versión actual del CLI y termina.

---

## Variables de entorno {#environment-variables}

| Variable | Descripción | Usada por |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Establece `json` para forzar la salida JSON en todos los comandos que lo admiten | Todos los comandos con el flag `--json` |
| `DASHBOARD_PORT` | Puerto del dashboard web | `dashboard web` |
| `MEMORIES_DIR` | Sobrescribe la ruta del directorio de memorias | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Establece `1` para forzar el modo mock en `oma skill eval` independientemente de los flags | `skills eval` |
| `OMA_HOOK_DEDUP` | Establece `0` para desactivar la supresión de entregas duplicadas en `oma hook run`. | `hook` |
| `OMA_HOOK_DEDUP_DIR` | Sobrescribe el directorio privado de claims usado para suprimir las entregas duplicadas de hooks (predeterminado: `$XDG_RUNTIME_DIR/oma-hook-dedup`; en caso contrario, `<tmpdir>/oma-hook-dedup-<uid>`). | `hook` |

---

## Alias {#aliases}

| Alias | Comando completo |
|:------|:------------|
| `viz` | `visualize` |
