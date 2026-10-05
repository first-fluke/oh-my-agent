---
title: "Opciones del CLI"
description: Referencia exhaustiva de todas las opciones del CLI, con flags globales, control de salida, opciones por comando y patrones de uso reales.
---

# Opciones del CLI

## Opciones globales {#global-options}

Estas opciones están disponibles en el comando raíz `oma` / `oh-my-agent`:

| Flag | Descripción |
|:-----|:-----------|
| `-g, --global` | Opera sobre la instalación de HOME (`~/.agents/`) en lugar de `<cwd>/.agents/` |
| `-y, --yes` | Omite los prompts cuando el comando seleccionado admite confirmación; las comprobaciones de seguridad específicas del comando se siguen aplicando |
| `-V, --version` | Muestra el número de versión y termina |
| `-h, --help` | Muestra la ayuda del comando |

Todos los subcomandos también admiten `-h, --help` para mostrar su texto de ayuda específico.

`--global` establece la raíz de instalación para todo el proceso, por lo que `install`, `update`, `link` y `uninstall` resuelven en `~/.agents/` independientemente del directorio desde el que se ejecuten. `OMA_HOME=<abs-path>` la sobrescribe; consulta [Instalación global](../guide/global-install.md).

---

## Opciones de salida {#output-options}

Muchos comandos admiten salida legible por máquina para pipelines de CI/CD y automatización. Hay tres formas de solicitar salida JSON, en orden de prioridad:

### 1. Flag --json {#json-flag}

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

El flag `--json` solo está disponible en las rutas individuales que lo anuncian. No infieras la compatibilidad a partir de una familia de comandos: por ejemplo, las hojas `image`, `video` y `slide` exponen `--output` cuando el registro lo indica, mientras que `search` tiene su propio flujo JSON. La matriz del registro al final de esta página es la lista autorizada por ruta.

### 2. Flag --output {#output-flag}

```bash
oma stats get --output json
oma doctor --output text
```

El flag `--output` acepta `text` o `json`. Ofrece la misma función que `--json`, pero también permite solicitar explícitamente una salida de texto (útil cuando la variable de entorno está configurada como json, pero quieres texto para un comando concreto).

**Validación:** Si se proporciona un formato no válido, el CLI lanza: `Invalid output format: {value}. Expected one of text, json`.

### 3. Variable de entorno OH_MY_AG_OUTPUT_FORMAT {#oh-my-ag-output-format-environment-variable}

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Establece esta variable de entorno en `json` para forzar la salida JSON en todos los comandos que la admiten. Solo se reconoce `json`; cualquier otro valor se ignora y se usa texto por defecto.

**Orden de resolución:** flag `--json` > flag `--output` > variable de entorno `OH_MY_AG_OUTPUT_FORMAT` > `text` (predeterminado).

### Comandos que admiten salida JSON {#commands-supporting-json-output}

| Comando | `--json` | `--output` | Notas |
|:--------|:---------|:----------|:------|
| `doctor` | Sí | Sí | Incluye comprobaciones del CLI, estado de MCP y estado de las skills |
| `stats` | Sí | Sí | Objeto completo de métricas |
| `retro` | Sí | Sí | Instantánea con métricas, autores y tipos de commit |
| `cleanup` | Sí | Sí | Lista de elementos limpiados |
| `auth status` | Sí | Sí | Estado de autenticación por CLI |
| `memory init` | Sí | Sí | Resultado de la inicialización |
| `verify agent` / `verify triggers` | Sí | Sí | Resultados de verificación por comprobación |
| `visualize` | Sí | Sí | Grafo de dependencias como JSON |
| `describe` | Siempre JSON | N/A | Siempre produce JSON (comando de introspección) |
| `recap` | Sí | Sí | Historial de conversaciones por herramienta y sesión |
| `image generate` / `image doctor` / `image vendor list` | N/A | Sí | Usa `--output json`; `vendor list` es la ruta canónica de descubrimiento |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Sí | Usa `--output json` para el envoltorio de ejecución o el informe de disponibilidad |
| `explain validate` | Sí | Sí | Informe de validación del artefacto |
| `explain render` / `explain patch` / `explain components` | Sí | Sí | Informe de renderizado: archivo, advertencias, estado del sidecar |
| `diagram resolve` / `diagram update` | Sí | Sí | Resolución del motor o resultado de la caché gestionada |
| `market resolve` / `market update` | Sí | Sí | Estado del motor de investigación gestionado |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Sí | N/A | Cada ruta de docs usa sus propias opciones de informe |
| `search ...` | Siempre JSON | N/A | Todos los subcomandos de `search` emiten JSON; usa `--pretty` para leerlo de forma humana |

---

## Opciones por comando {#per-command-options}

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

El instalador interactivo escribe en `.agents/oma-config.yaml` la configuración de proveedores seleccionada. Los flags de proveedor seleccionan las integraciones de web-search, code-intelligence y semantic-memory; `--honcho-url` y `--honcho-workspace` configuran el servicio de memoria Honcho cuando se selecciona ese proveedor. El flag raíz `-y, --yes` se aplica cuando un flujo de instalación solicita confirmación.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--json` | Emite JSON en lugar de texto con formato. | `false` |
| `--output <format>` | Formato de salida explícito (`text` o `json`). Consulta [Opciones de salida](#output-options). | `text` |
| `--profile` | Muestra la matriz de salud del perfil (slug de modelo resuelto, CLI y estado de autenticación por agente a partir de `model_preset` y las sobrescrituras `agents:` activas). Consulta [Modelos por agente](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Sobrescribe los archivos de configuración personalizados durante la actualización. Afecta a `oma-config.yaml`, `mcp.json` y los directorios `stack/`. Sin este flag, estos archivos se respaldan antes de actualizar y se restauran después. | `false` |
| `--with-new-skills` | | Instala las skills añadidas al registro desde la instalación actual. | `false` |
| `--ci` | | Ejecuta en modo CI no interactivo. Omite todos los prompts de confirmación y usa salida de consola plana en lugar de spinners y animaciones. Es necesario para pipelines de CI/CD donde stdin no está disponible. | `false` |
| `--yes` | `-y` | Omite los prompts. No crea directorios de proveedores ausentes salvo que se combine con `--all` o `--vendor`. | `false` |
| `--all` | | Crea o actualiza todos los proveedores compatibles con alcance de proyecto. | `false` |
| `--vendor <vendors>` | | Crea o actualiza una lista de proveedores separada por comas, por ejemplo `claude,qwen`. | Solo directorios de proveedores existentes |

`oma update mcp` usa los mismos controles `--yes`, `--ci`, `--all` y `--vendor` al elegir servidores MCP de navegador. No usa `--force` ni `--with-new-skills`.

**Comportamiento con --force:**
- `oma-config.yaml` se reemplaza por el valor predeterminado del registro.
- `mcp.json` se reemplaza por el valor predeterminado del registro.
- Se reemplaza el directorio `stack/` de backend (recursos específicos del lenguaje).
- Todos los demás archivos se actualizan siempre, independientemente de este flag.

**Comportamiento con --ci:**
- No se ejecuta `console.clear()` al inicio.
- `@clack/prompts` se sustituye por `console.log` plano.
- Se omiten los prompts de detección de competidores.
- Los errores se lanzan en lugar de llamar a `process.exit(1)`.

**Alcance de proveedores:**
- `oma update` solo actualiza los directorios de proveedores que ya existen.
- `oma update --yes` usa el mismo alcance de proveedores, sin prompts.
- `oma update --all` crea o actualiza todos los proveedores compatibles con alcance de proyecto.
- `oma update --vendor claude,qwen` solo crea o actualiza los proveedores enumerados.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--json` | Emite el resultado del reset como JSON. | `false` |
| `--output <format>` | Emite `text` o `json`. | `text` |

`oma stats reset` es el comando de reset. La forma anterior `oma stats get --reset` no forma parte de la superficie pública actual.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--interactive` | Modo interactivo con entrada manual de datos. Solicita contexto adicional que no se puede obtener de git (por ejemplo, estado de ánimo o eventos destacados). | `false` |
| `--compare` | Compara la ventana temporal actual con la anterior de la misma duración. Muestra métricas delta (por ejemplo, commits +12, líneas añadidas -340). | `false` |

**Formato del argumento de ventana:**
- `7d`: 7 días
- `2w`: 2 semanas
- `1m`: 1 mes
- Omitir para usar el valor predeterminado (7 días)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Modo de previsualización. Enumera todos los elementos que se limpiarían, pero no hace cambios. El código de salida es 0 independientemente de los hallazgos. | `false` |
| `--yes` | `-y` | Omite todos los prompts de confirmación. Limpia todo sin preguntar. Es útil en scripts y CI. | `false` |

**Qué se limpia:**
1. Archivos PID huérfanos: `/tmp/subagent-*.pid` cuyo proceso referenciado ya no está en ejecución.
2. Archivos de log huérfanos: `/tmp/subagent-*.log` que coinciden con PIDs terminados.
3. Directorios de Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Acumulan estado con el tiempo y pueden crecer mucho.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Enlaza un reintento con el ID de su ejecución anterior. | |
| `--fallback-vendors` | — | Cadena explícita y ordenada de proveedores de fallback, separada por comas. | |
| `--task-id` | — | ID de tarea del plan de sesión. | ID del agente |
| `--vendor` | — | Sobrescritura del proveedor CLI. El runtime acepta `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` o `pi`. | Resuelto desde la configuración |
| `--workspace` | `-w` | Directorio de trabajo del agente. Si se omite o se establece en `.`, el CLI detecta automáticamente el workspace a partir de archivos de configuración del monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Detectado automáticamente o `.` |
| `--isolation` | — | Modo de aislamiento: `worktree` crea un worktree de git por ejecución; el valor predeterminado es `none`. | `none` |
| `--read-only` | — | Restringe el agente iniciado a herramientas no destructivas y suprime los flags de aprobación automática. | `false` |

**Validación:**
- `agent-id` debe ser uno de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` no debe contener `..`, `?`, `#`, `%` ni caracteres de control.
- `vendor` debe ser uno de: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Comportamiento específico del proveedor:**

| Proveedor | Comando | Flag de aprobación automática | Flag de prompt |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (ninguno) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (ninguno; el prompt es posicional) |
| cursor | `cursor-agent` | específico del proveedor | `-p` |
| opencode | `opencode` | específico del proveedor | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | específico del proveedor | `-p` |
| pi | `pi` | suprimido en modo `--read-only` | el prompt es posicional |

Estos valores predeterminados se pueden sobrescribir en `.agents/skills/oma-orchestration/config/cli-config.yaml`.

Codex conserva su sandbox workspace-write. oma habilita el acceso a la red y añade como directorios escribibles la raíz del proyecto, el directorio de estado de OMA (`~/.oma`) y las cachés de gestores de paquetes que ya existen. `oma update` reemplaza `cli-config.yaml`, así que define un modo persistente con `OMA_CODEX_SANDBOX`: `read-only`, `workspace-write` (predeterminado) o `danger-full-access` (sin sandbox y sin aprobaciones).

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Ruta raíz para localizar archivos de memoria (`.agents/state/memories/result-{agent}.md`) y archivos PID. | Directorio de trabajo actual |

**Lógica para determinar el estado:**
1. Si existe `.agents/state/memories/result-{agent}.md`, lee el encabezado `## Status:`. Si no hay encabezado, informa `completed`.
2. Si existe el archivo PID en `/tmp/subagent-{session-id}-{agent}.pid`, comprueba si el PID sigue activo. Informa `running` si está activo y `crashed` si ha terminado.
3. Si no existe ninguno de los dos archivos, informa `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | Sobrescritura del proveedor CLI aplicada a todos los agentes iniciados. | Resuelto por agente desde la configuración |
| `--inline` | `-i` | Interpreta los argumentos de tareas como cadenas `agent:task[:workspace]` en lugar de una ruta de archivo. | `false` |
| `--no-wait` | | Modo en segundo plano. Inicia todos los agentes y vuelve inmediatamente sin esperar a que terminen. La lista de PIDs y los logs se guardan en `.agents/results/parallel-{timestamp}/`. | `false` (espera la finalización) |

**Formato de tarea inline:** `agent:task` o `agent:task:workspace`
- El workspace se detecta comprobando si el último segmento separado por dos puntos empieza por `./`, `/` o es igual a `.`.
- Ejemplo: `backend:Implement auth API:./api`: agent=backend, task="Implement auth API", workspace=./api.
- Ejemplo: `frontend:Build login page`: agent=frontend, task="Build login page", workspace=autodetectado.

**Formato del archivo YAML de tareas:**
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

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--window <period>` | Ventana temporal: `1d`, `3d`, `7d`, `2w`, `30d`. Se ignora cuando se establece `--date`. | `1d` |
| `--date <date>` | Fecha específica (`YYYY-MM-DD`). Tiene precedencia sobre `--window`. | |
| `--tool <tools>` | Filtra sesiones por herramienta. Separadas por comas: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | todas las herramientas |
| `--top <n>` | Muestra solo los N proyectos o temas principales del resumen. | sin límite |
| `--sort <metric>` | Ordena las sesiones por `count` o `duration`. | `count` |
| `--mermaid` | Genera un gráfico de Gantt de Mermaid en lugar del resumen predeterminado. | `false` |
| `--graph` | Abre un gráfico interactivo en el navegador. Es mutuamente excluyente con `--mermaid`. | `false` |

> **Nota:** La generación de archivos de reglas de proveedores (por ejemplo, `.cursor/rules`) a partir de las skills instaladas la gestiona [`oma link <vendor>`](./commands.md#link), no un comando `export` separado.

### search

```
oma search <subcommand> [...]
```

El grupo `search` proporciona su propia salida JSON (sin flags `--json` / `--output`). Usa `--pretty` en los subcomandos de URL/consulta para imprimir los resultados con formato y apóyate en las opciones específicas de cada subcomando que aparecen abajo:

| Subcomando | Opciones destacadas |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (predeterminado `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (predeterminado `en`), `--format <spec>`, `--timeout` (predeterminado `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (predeterminado `github`), `--language`, `--repo`, `--limit` (predeterminado `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | ninguno (ejecuta comprobaciones binarias para Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Códigos de salida:** `0` correcto, `1` error, `2` bloqueado, `3` no encontrado, `4` entrada no válida, `5` autenticación requerida, `6` timeout. Úsalos en scripts para diferenciar bloqueos transitorios de entradas no válidas.

### image

```
oma image <subcommand> [...]
```

El formato de salida se controla por subcomando mediante `--output <text|json>`.

`image generate` acepta:

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` se resuelve a partir de la configuración `image:` activa y la autenticación disponible. | `auto` |
| `--size <size>` | | `WxH` con ambos bordes divisibles por 16, entre 16 y 3840, con una relación de aspecto de 1:3 a 3:1, o `auto`. | predeterminado del proveedor |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | predeterminado del proveedor |
| `--count <n>` | `-n` | Número de imágenes, 1..5. | `1` |
| `--output-dir <dir>` | | Directorio de salida. Debe estar dentro de `$PWD`, salvo que se establezca `--allow-external-output`. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Permite rutas de `--output-dir` fuera de `$PWD`. | `false` |
| `--model <name>` | | Sobrescritura del modelo específica del proveedor. `agy` selecciona el modelo de antigravity. | predeterminado del proveedor |
| `--timeout <duration>` | | Timeout por imagen mediante un valor de duración. | predeterminado del proveedor |
| `--reference <path>` | `-r` | Imagen de referencia para transferir estilo o tema. Repetible (`-r a.png -r b.png`) o separada por comas. Se valida el tamaño (≤5 MB), el formato (PNG/JPEG/GIF/WebP mediante magic bytes) y la cantidad (≤10). Compatible con `codex` y `antigravity`; se rechaza con el código de salida 4 en `pollinations`. | |
| `--yes` | `-y` | Omite el prompt de confirmación del coste. | `false` |
| `--no-prompt-in-manifest` | | Guarda el SHA256 del prompt en lugar del texto sin procesar en `manifest.json`. | `false` |
| `--dry-run` | | Imprime el plan y la estimación de coste; no ejecuta nada. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` y `image vendor list` aceptan `--output <text|json>`. `image list-vendors` sigue siendo un alias de ayuda; `vendor list` es la ruta canónica de descubrimiento.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` acepta los controles de planificación y captura `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` y `--capture-stop`. También acepta `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` y `--no-brief-in-manifest`. La captura del navegador usa `--source web --url <url>`; `file` es la fuente predeterminada. Un render normal requiere una composición escrita y un compositor operativo; los placeholders se limitan a la ruta de pruebas `OMA_VIDEO_MOCK=1`.

`video doctor` informa o provisiona la toolchain de HyperFrames/MPT/Strudel. `compose` prepara el contrato de composición de la ejecución y `render` ejecuta lint, renderiza y sondea la salida. `provider list` informa del estado del proveedor y de sus claves. Lee [Generación de videos](../guide/video-generation.md) para consultar el manifiesto de ejecución y la secuencia de recuperación.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:--------|
| `--force` | Sobrescribe los archivos de esquema vacíos o existentes en `.agents/state/memories/`. Sin este flag, no se tocan los archivos existentes. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Ruta del directorio del workspace que se verificará. | Directorio de trabajo actual |

**Tipos de agente:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` mide la precisión de keyword-detector frente a un corpus etiquetado. Los umbrales porcentuales son puertas de control; usa salida JSON cuando un trabajo de CI necesite inspeccionar hallazgos individuales. La forma antigua `oma verify <agent-type>` es una variante de ayuda de compatibilidad; `verify agent` es la ruta registrada.

---

## Ejemplos prácticos {#practical-examples}

### Pipeline de CI: actualizar y verificar {#ci-pipeline-update-and-verify}

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Recopilación automatizada de métricas {#automated-metrics-collection}

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Ejecución por lotes de agentes con supervisión de estado {#batch-agent-execution-with-status-monitoring}

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Limpieza en CI después de las pruebas {#cleanup-in-ci-after-tests}

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Verificación consciente del workspace {#workspace-aware-verification}

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro con comparación para revisiones de sprint {#retro-with-comparison-for-sprint-reviews}

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script completo de comprobación de salud {#full-health-check-script}

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

### Describe para la introspección de agentes {#describe-for-agent-introspection}

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## Registro completo de opciones públicas {#complete-public-option-registry}

La siguiente matriz se genera a partir del registro público de comandos incluido en el repositorio. Es el índice de cobertura de esta página: una fila con `—` no tiene opciones específicas del comando, mientras que los flags raíz compartidos y los alias de ayuda se describen arriba. Ejecuta `oma describe "<path>"` para inspeccionar la ayuda del runtime cuando cambie la gramática de un valor.

| Ruta del comando | Opciones públicas | Propósito |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Instala las skills y configuraciones de oh-my-agent |
| `describe` | `—` | Describe los comandos CLI como JSON para la introspección en runtime |
| `uninstall` | `--dry-run, -y, --yes` | Elimina los archivos propiedad de oh-my-agent (conserva oma-config.yaml, mcp.json y las skills escritas por el usuario) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Actualiza las skills a la versión más reciente del registro |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Elige servidores MCP de navegador (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Regenera los archivos de proveedores (.claude/, .cursor/, etc.) desde la SSOT de .agents/ |
| `intel` | `—` | Pipeline de inteligencia de producto: investigación, brechas, PRD y propuesta de issue |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Sugiere trabajo de producto de alto valor a partir de inteligencia de mercado y código |
| `market` | `—` | Investigación de mercado basada en señales de la comunidad mediante el motor last30days siempre actualizado |
| `market detect-trap` | `--force` | Comprobación de preflight que rechaza consultas keyword-trap |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Informa del motor last30days que ejecutará oma (última versión gestionada, pin o copia local) y del Python que usa |
| `market update` | `--json, --output <format>` | Descarga la versión más reciente de last30days en la caché gestionada de oma (~/.cache/oma-market/last30days) |
| `market run` | `—` | Ejecuta el motor last30days (scripts/last30days.py) con los argumentos indicados; --save-dir usa market.save_dir por defecto |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Comprueba las instalaciones del CLI, las configuraciones MCP y el estado de las skills |
| `profile` | `—` | Gestiona los perfiles de ejecución locales de OMA |
| `profile list` | `--json, --output <format>` | Enumera perfiles locales |
| `profile show` | `--json, --output <format>` | Muestra un perfil local |
| `profile create` | `--json, --output <format>` | Crea un perfil local |
| `profile use` | `--shell <shell>, --json, --output <format>` | Imprime código de shell para activar un perfil existente |
| `profile run` | `—` | Ejecuta un comando con OMA_PROFILE establecido para el proceso hijo |
| `retro` | `--interactive, --compare, --json, --output <format>` | Retrospectiva de ingeniería con métricas y tendencias |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Resume el historial de conversaciones de herramientas de IA |
| `docs` | `—` | Detección de drift documental: verifica referencias y propone actualizaciones para docs afectados por el diff |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Extrae referencias L2 de los docs e informa de destinos rotos. Regenera docs/generated/doc-refs.json como efecto secundario. Código de salida: 0 = limpio, 1 = se encontraron referencias rotas. La comprobación de enlaces URL se delega en `lychee` (instalación: brew install lychee). |
| `docs sync` | `--json` | Dado un diff de git, enumera los docs que hacen referencia a los archivos modificados. Se espera que el LLM anfitrión (runtime de la skill) lea esta lista y el diff y proponga parches según el contrato de SKILL.md; el CLI nunca edita docs automáticamente. Rango de diff predeterminado: --cached (cambios staged), fallback a HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Detecta drift entre docs fuente en inglés (web/docs) y traducciones i18n (web/i18n/{lang}/...). Emite señales estructurales (cantidad de líneas, cantidad de headings, marca temporal del último commit) por par para que el LLM anfitrión decida qué traducciones requieren un parche de diff-sync. El CLI nunca edita traducciones. |
| `docs lint` | `--json, --locales <list>` | Analiza docs traducidos en busca de antipatrones de contenido (em dash en targets CJK, etc.). Complementa `oma docs i18n` (drift estructural) con comprobaciones de estilo/antipatrones según oma-translation SKILL.md § Stage 4. El CLI nunca corrige automáticamente; solo informa de problemas para que el LLM anfitrión reestructure. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Emite artefactos conformes a estándares desde la SSOT de .agents/ (especificación Agent Skills, paquete Agent Plugins, marketplace de plugins de Claude Code, AGENTS.md y docs de proveedores con alcance cli/) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Limpia procesos de subagentes huérfanos y archivos temporales |
| `bridge` | `--context <name>` | Envía MCP stdio a un servidor Serena compartido por proyecto (se inicia bajo demanda) |
| `verify` | `—` | Verifica la salida de subagentes (backend/frontend/mobile/qa/debug/pm) o mide la precisión de los triggers de keyword-detector |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Mide la precisión de los triggers de keyword-detector frente a un corpus de prompts etiquetado |
| `vault` | `—` | Gestiona claves de API y secretos en el llavero del sistema operativo (macOS Keychain / Linux Secret Service / Windows Credential Manager) |
| `vault store` | `--value <value>` | Guarda un secreto bajo <name> (prompt interactivo de contraseña) |
| `vault get` | `—` | Imprime el valor guardado en stdout (para: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Enumera los nombres de secretos guardados (los valores nunca se muestran) |
| `vault delete` | `—` | Elimina un secreto del llavero y del índice |
| `star` | `—` | Da una estrella a oh-my-agent en GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualiza la estructura del proyecto como un grafo de dependencias |
| `search` | `—` | Primitivas mecánicas de búsqueda: fetch, meta, rss, media, trust y code |
| `search providers` | `--json, --pretty` | Enumera los proveedores de búsqueda registrados e inspecciona la selección sin llamadas de red |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Busca con el proveedor web seleccionado (Brave tiene un adaptador de CLI) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Obtiene una URL mediante un pipeline de estrategias con escalado automático |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Extrae OGP / JSON-LD / Schema.org de una URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Extrae metadatos de medios mediante yt-dlp (1858 sitios) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Obtiene contenido mediante AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Resuelve el nivel o la puntuación de confianza de un dominio |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Busca código mediante gh / glab |
| `search doctor` | `—` | Comprueba dependencias (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Obtiene contenido mediante la API de plataforma correspondiente (fase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Distribuye la búsqueda de palabras clave entre plataformas compatibles |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Descubre y analiza un feed RSS/Atom para una URL |
| `search rss google` | `--locale <value>` | Construye una URL RSS de Google News para una consulta |
| `harness` | `—` | Evalúa overlays del harness de OMA frente a tareas aisladas del repositorio |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Compara un overlay candidato de .agents/ con la línea base actual |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Deriva un fixture de regresión de skill a partir de un incidente capturado |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Promueve incidentes y optimiza las skills afectadas |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | Habilita el ciclo de retroalimentación programado de un proyecto, sujeto a presupuesto; el modo es apply o propose |
| `harness evolution status` | `--json, --output <format>` | Muestra la configuración, la programación, el trabajo pendiente, los conflictos y el último ciclo |
| `harness evolution disable` | `--json, --output <format>` | Deshabilita el ciclo de retroalimentación programado del proyecto |
| `harness evolution run` | `--json, --output <format>` | Ejecuta un ciclo con el modo y el presupuesto guardados del proyecto habilitado |
| `slide` | `—` | Kit de presentaciones HTML: crea, valida, exporta y edita decks de diapositivas de 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Puerta de calidad geométrica: renderiza diapositivas mediante puppeteer-core y comprueba desbordamiento, solapamiento y tamaño de fuente |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Fusiona archivos por diapositiva en un entregable .html autocontenido |
| `slide edit` | `--workspace <path>, --port <n>` | Abre el editor bbox del navegador (servidor node:http en 127.0.0.1, despacha al runner de agentes de oma) |
| `slide doctor` | `—` | Sondea dependencias requeridas (chrome, puppeteer-core) y opcionales (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Crea un directorio de trabajo de diapositivas con HTML inicial, assets/ y meta.json |
| `slide preview` | `--workspace <path>` | Construye viewer.html (componente web deck-stage y panel de notas del orador, se alterna con `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Exporta las diapositivas a PDF mediante puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Exporta cada diapositiva como imagen PNG mediante puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTAL] Exporta a PPTX mediante pptxgenjs (basado en raster, con degradados rasterizados) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Importa un archivo .pptx en fragmentos de diapositivas mediante officeparser (bunx, en el mejor de los casos) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Descarga un video mediante yt-dlp en ./assets/ e imprime la referencia local |
| `slide style` | `—` | Explora y obtiene presets de estilo de diseño |
| `slide style list` | `—` | Enumera presets de estilo disponibles (índice de proveedores y de bold-template) |
| `slide style preview` | `—` | Previsualiza un preset de estilo en la terminal |
| `slide style get` | `--refresh` | Obtiene un design.md de plantilla en negrita (main siempre actualizado; cacheado para fallback offline) |
| `scholar` | `—` | Sidecars de artículos de Knows.academy (con OpenAlex y Semantic Scholar como fallback) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Busca artículos (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Encuentra la mejor coincidencia de artículo en knows.academy, OpenAlex y Semantic Scholar |
| `scholar get` | `--section <name>` | Obtiene un sidecar (knows record_id) o metadatos de una obra (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Valida un sidecar .knows.yaml o .knows.json (v0.9.0) |
| `image` | `—` | Generación de imágenes de IA con varios proveedores y distribución paralela según autenticación |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Genera imágenes mediante pollinations (flux/zimage, gratis), codex (gpt-image-2, ChatGPT OAuth) o antigravity (gemini nano-banana mediante el CLI `agy`, gratis con inicio de sesión de Gemini Code Assist) |
| `image doctor` | `--output <format>` | Comprueba la autenticación y el estado de instalación de cada proveedor |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Enumera los proveedores registrados y los modelos compatibles |
| `video` | `—` | Generación de videos cortos, explicativos y de demostración |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Genera un directorio de ejecución de video a partir de un brief |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Comprueba la disponibilidad del proveedor de video y del compositor |
| `video compose` | `--output <format>, --refresh, --offline` | Crea el proyecto HyperFrames de la ejecución con la toolchain más reciente y heygen-com/hyperframes; imprime el contrato de autoría |
| `video render` | `--output <format>` | Vuelve a renderizar un directorio de ejecución desde render-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Enumera los proveedores de video y su disponibilidad |
| `serena` | `—` | Utilidades del ciclo de vida del servidor de lenguaje Serena MCP |
| `serena reap` | `--dry-run, --quiet` | Mata procesos hijos LSP de Serena inactivos para recuperar memoria (Serena se repara sola en la siguiente llamada de herramienta) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Instala la tarea programada periódica de Serena Reaper (se ejecuta cada 5 minutos) |
| `serena reaper disable` | `--dry-run` | Desinstala la tarea programada periódica de Serena Reaper |
| `explain` | `—` | Explica las herramientas de gestión de artefactos y validación de calidad |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Valida artefactos de informes HTML de explain autocontenidos |
| `explain render` | `--output-file <path>, --theme <name>, --mode <mode>, --style <level>, --lang <code>, --archify, --no-archify, --open, --output <format>, --json` | Renderiza un borrador Markdown (archivo o stdin) como una página HTML explicativa autocontenida |
| `explain patch` | `--panel <id>, --open, --output <format>, --json` | Sustituye un panel de una página renderizada usando su borrador incrustado |
| `explain components` | `--output <format>, --json` | Lista los componentes disponibles para un borrador o muestra la sintaxis de uno |
| `diagram` | `—` | Ayudantes del motor de diagramas (HTML interactivo de archify o fallback a Mermaid) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Informa de qué motor de diagramas deben usar los workflows y dónde está archify |
| `diagram update` | `--json, --output <format>` | Descarga la versión más reciente de archify en la caché gestionada de oma (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Ejecuta el CLI de archify instalado (doctor \| guide \| validate \| deliver \| visual-check …) con las comprobaciones de actualización desactivadas |
| `help` | `—` | Muestra información de ayuda |
| `version` | `—` | Muestra el número de versión |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Inicia el dashboard de terminal (supervisión de agentes en tiempo real) |
| `dashboard web` | `—` | Inicia el dashboard web en http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Comprueba el estado de autenticación de todos los CLI compatibles |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Distribuye un evento de hook del proveedor mediante el router de hooks centralizado de oma (diseño 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Sondea la compatibilidad de hooks L1 por proveedor e imprime una matriz (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Añade un evento de workflow L1 de OMA |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migra sesiones heredadas al perfil de inicio y elimina los originales verificados |
| `state get` | `--json, --output <format>` | Inspecciona una sesión L1 de OMA por ID |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecciona el estado de workflow L1 de OMA |
| `state repair` | `--dry-run, --json, --output <format>` | Repara los archivos de estado del workflow L1 de OMA |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Verifica los eventos L1 requeridos para un checkpoint del workflow |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Enumera los checkpoints L1 decision.made requeridos |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Enumera o muestra registros de auditoría de inject por frontera (D52) |
| `state inject-log get` | `--json, --output <format>` | Enumera o muestra registros de auditoría de inject por frontera (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Exporta un resumen de sesión al almacén de coordinación |
| `state trajectory` | `--category <category>, --open, --width <columns>, --sequence, --ascii, --json, --output <format>` | Muestra la trayectoria de una sesión: eventos L1 combinados con las transcripciones del proveedor |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Comprueba si se permite la autorreparación para un agente |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecciona el estado de workflow L1 de OMA |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecciona el estado de workflow L1 de OMA |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecciona el estado de workflow L1 de OMA |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Verifica artefactos EXEC de ralph (puerta anticircunvención, ralph.md Step 1.3) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Adjunta un contrato de objetivo (puerta de parada determinista / presupuesto de tiempo real) a un workflow persistente activo |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Muestra métricas de productividad |
| `stats reset` | `--json, --output <format>` | Muestra métricas de productividad |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Carga el contexto seleccionado por el grafo para un prompt de dispatch nativo |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Reanuda tareas incompletas seguras y reutiliza la evidencia de aceptación actual |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Inicia una ejecución de agente nativo respaldada por evidencia |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Ejecuta el argv de verificación después de -- y registra su código de salida real |
| `agent finish` | `--project-root <path>` | Valida un resultado de agente nativo frente a sus comprobantes de verificación |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Inicia un subagente (el prompt puede ser texto inline o una ruta de archivo) |
| `agent status` | `--project-root <path>` | Comprueba el estado de los subagentes |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Ejecuta varios subagentes en paralelo |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Ejecuta una revisión de código mediante un CLI externo (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Comprueba el registro de modelos frente a las listas de modelos activas de los proveedores |
| `model probe` | `--json, --timeout <duration>` | Sondea un slug de modelo mediante el CLI de su proveedor para verificar que lo acepta |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Ejecuta internamente model:check --probe y genera un parche `models:` de oma-config para los candidatos aceptados |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Configura la conexión de Honcho o las credenciales de embeddings locales |
| `memory init` | `--force, --json, --output <format>` | Inicializa el almacén de coordinación en .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Prepara la configuración del endpoint de AgentMemory |
| `memory daemon` | `—` | Gestiona un proceso daemon de AgentMemory propiedad de OMA |
| `memory daemon status` | `--json, --output <format>` | Muestra el estado del daemon |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Inicia AgentMemory en segundo plano |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Detiene el daemon de AgentMemory propiedad de OMA |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Reinicia el daemon de AgentMemory propiedad de OMA |
| `memory service` | `—` | Gestiona la integración de AgentMemory con los servicios del sistema operativo |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Instala la integración del servicio launchd/systemd de AgentMemory |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Desinstala la integración del servicio launchd/systemd de AgentMemory |
| `memory status` | `--json, --output <format>` | Muestra el estado del proveedor de memoria semántica seleccionado |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Vacía los reintentos de observe de AgentMemory en cola |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Importa el historial de conversaciones del proveedor en AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Mantiene el almacenamiento local de AgentMemory: copia de seguridad, depuración y vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Mantiene el almacenamiento local de AgentMemory: copia de seguridad, depuración y vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Mantiene el almacenamiento local de AgentMemory: copia de seguridad, depuración y vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Mantiene el almacenamiento local de AgentMemory: copia de seguridad, depuración y vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Recoge la memoria local del proyecto: depura sesiones L1 antiguas y archivos Serena efímeros |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Detiene, respalda, actualiza, reinicia y comprueba el estado de AgentMemory |
| `skill` | `—` | Inspecciona y audita las skills instaladas |
| `skill audit` | `--json, --output <format>` | Comprueba la similitud de las descripciones del frontmatter entre las skills instaladas |
| `skill lint` | `--skill <id>, --json, --output <format>` | Detecta problemas de autoría por skill (frontmatter, estructura y referencias rotas) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Mide la mejora de utilidad por skill (tratamiento frente a línea base en tareas reservadas) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Optimiza el SKILL.md de una skill para maximizar la mejora de utilidad medida en tareas reservadas |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Propone y puntúa cambios en el procedimiento de evolución sobre skills reservadas |
| `skill procedure` | `--export, --json, --output <format>` | Muestra el procedimiento de evolución (prompts del optimizador y del maintainer, constitución) y sus hashes |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Agrega las ejecuciones de optimización registradas por resultado, modo de memoria y procedimiento |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | Narra las promociones y las reversiones registradas de SKILL.md para una skill, o para todas las skills y el procedimiento con `--all` |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Restaura el cuerpo de SKILL.md sustituido por la promoción registrada más reciente |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Registra un trabajo de agente programado |
| `schedule list` | `--json, --output <format>` | Enumera trabajos programados con el estado de drift del sistema operativo (synced/missing-in-os/orphan-in-os), agrupados por proyecto |
| `schedule delete` | `—` | Elimina un trabajo programado del manifiesto y del programador del sistema operativo |
| `schedule run` | `—` | Ejecuta un trabajo programado por ID (lo invoca el programador del sistema operativo; normalmente no se llama directamente) |
| `schedule sync` | `--prune` | Vuelve a sincronizar manifiesto → programador del sistema operativo. Usa --prune para eliminar trabajos huérfanos del sistema operativo. |
