---
title: Comandos CLI
description: Referencia completa de cada comando CLI de oh-my-agent — sintaxis, opciones, ejemplos, organizados por categoría.
---

# Comandos CLI

Después de instalar globalmente (`bun install --global oh-my-agent`), usa `oma` o `oh-my-agent`. Para uso puntual sin instalar, ejecuta `npx oh-my-agent`.

La variable de entorno `OH_MY_AG_OUTPUT_FORMAT` se puede establecer como `json` para forzar salida legible por máquina en los comandos que lo soportan. Esto equivale a pasar `--json` a cada comando.

---

## Configuración e Instalación

### oma (install)

El comando por defecto sin argumentos inicia el instalador interactivo.

```
oma
```

**Qué hace:**
1. Verifica si existe el directorio legacy `.agent/` y migra a `.agents/` si lo encuentra.
2. Detecta y ofrece eliminar herramientas competidoras.
3. Solicita el tipo de proyecto (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Si se selecciona backend, solicita la variante del lenguaje (Python, Node.js, Rust, Other).
5. Pregunta sobre los symlinks de GitHub Copilot.
6. Descarga el tarball más reciente del registro.
7. Instala recursos compartidos, flujos de trabajo, configuraciones y habilidades seleccionadas.
8. Instala adaptaciones de proveedores para todos (Claude, Codex, Gemini, Qwen).
9. Crea symlinks del CLI.
10. Ofrece habilitar `git rerere`.
11. Ofrece configurar MCP para Antigravity IDE y Gemini CLI.

**Ejemplo:**
```bash
cd /path/to/my-project
oma
# Seguir los prompts interactivos
```

### doctor

Verificación de salud de las instalaciones CLI, configuraciones MCP y estado de habilidades.

```
oma doctor [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Qué verifica:**
- Instalaciones CLI: gemini, claude, codex, qwen (versión y ruta).
- Estado de autenticación de cada CLI.
- Configuración MCP: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Habilidades instaladas: qué habilidades están presentes y su estado.

**Ejemplos:**
```bash
# Salida de texto interactiva
oma doctor

# Salida JSON para pipelines de CI
oma doctor --json

# Filtrar con jq para verificaciones específicas
oma doctor --json | jq '.clis[] | select(.installed == false)'
```

### update

Actualizar habilidades a la última versión del registro.

```
oma update [-f | --force] [--ci]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `-f, --force` | Sobrescribir archivos de configuración personalizados (`oma-config.yaml`, `mcp.json`, directorios `stack/`) |
| `--ci` | Ejecutar en modo CI no interactivo (omitir prompts, salida en texto plano) |

**Qué hace:**
1. Obtiene `prompt-manifest.json` del registro para verificar la última versión.
2. Compara con la versión local en `.agents/skills/_version.json`.
3. Si ya está actualizado, termina.
4. Descarga y extrae el tarball más reciente.
5. Preserva archivos personalizados por el usuario (a menos que se use `--force`).
6. Copia los archivos nuevos sobre `.agents/`.
7. Restaura los archivos preservados.
8. Actualiza adaptaciones de proveedores y refresca symlinks.

**Ejemplos:**
```bash
# Actualización estándar (preserva configuración)
oma update

# Actualización forzada (restablece toda la configuración a valores por defecto)
oma update --force

# Modo CI (sin prompts, sin spinners)
oma update --ci

# Modo CI con fuerza
oma update --ci --force
```

---

## Monitoreo y Métricas

### dashboard

Iniciar el dashboard de terminal para monitoreo de agentes en tiempo real.

```
oma dashboard
```

Sin opciones. Observa `.serena/memories/` en el directorio actual. Renderiza una interfaz con dibujo de cajas mostrando estado de sesión, tabla de agentes y feed de actividad. Se actualiza con cada cambio de archivo. Presiona `Ctrl+C` para salir.

El directorio de memorias se puede sobreescribir con la variable de entorno `MEMORIES_DIR`.

**Ejemplo:**
```bash
# Uso estándar
oma dashboard

# Directorio de memorias personalizado
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

### dashboard:web

Iniciar el dashboard web.

```
oma dashboard:web
```

Inicia un servidor HTTP en `http://localhost:9847` con conexión WebSocket para actualizaciones en vivo. Abre la URL en un navegador para ver el dashboard.

**Variables de entorno:**

| Variable | Predeterminado | Descripción |
|:---------|:---------------|:-----------|
| `DASHBOARD_PORT` | `9847` | Puerto para el servidor HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | Ruta al directorio de memorias |

**Ejemplo:**
```bash
# Uso estándar
oma dashboard:web

# Puerto personalizado
DASHBOARD_PORT=8080 oma dashboard:web
```

### stats

Ver métricas de productividad.

```
oma stats [--json] [--output <format>] [--reset]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |
| `--reset` | Restablecer todos los datos de métricas |

**Métricas rastreadas:**
- Conteo de sesiones
- Habilidades usadas (con frecuencia)
- Tareas completadas
- Tiempo total de sesión
- Archivos modificados, líneas agregadas, líneas eliminadas
- Marca de tiempo de última actualización

Las métricas se almacenan en `.serena/metrics.json`. Los datos se recopilan de estadísticas de git y archivos de memoria.

**Ejemplos:**
```bash
# Ver métricas actuales
oma stats

# Salida JSON
oma stats --json

# Restablecer todas las métricas
oma stats --reset
```

### retro

Retrospectiva de ingeniería con métricas y tendencias.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Argumentos:**

| Argumento | Descripción | Predeterminado |
|:----------|:-----------|:---------------|
| `window` | Ventana de tiempo para análisis (ej., `7d`, `2w`, `1m`) | Últimos 7 días |

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |
| `--interactive` | Modo interactivo con entrada manual |
| `--compare` | Comparar ventana actual vs ventana anterior del mismo tamaño |

**Qué muestra:**
- Resumen tipo tweet (métricas en una línea)
- Tabla resumen (commits, archivos modificados, líneas agregadas/eliminadas, contribuidores)
- Tendencias vs última retro (si existe snapshot previo)
- Tabla de líderes de contribuidores
- Distribución temporal de commits (histograma por hora)
- Sesiones de trabajo
- Desglose de tipos de commit (feat, fix, chore, etc.)
- Hotspots (archivos más modificados)

**Ejemplos:**
```bash
# Últimos 7 días (por defecto)
oma retro

# Últimos 30 días
oma retro 30d

# Últimas 2 semanas
oma retro 2w

# Comparar con el período anterior
oma retro 7d --compare

# Modo interactivo
oma retro --interactive

# JSON para automatización
oma retro 7d --json
```

---

## Gestión de Agentes

### agent:spawn

Generar un proceso de subagente.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

**Argumentos:**

| Argumento | Requerido | Descripción |
|:----------|:----------|:-----------|
| `agent-id` | Sí | Tipo de agente. Uno de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Sí | Descripción de la tarea. Puede ser texto inline o una ruta a un archivo. |
| `session-id` | Sí | Identificador de sesión (formato: `session-YYYYMMDD-HHMMSS`) |

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `-m, --model <vendor>` | Proveedor CLI: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | Directorio de trabajo del agente. Se auto-detecta desde la configuración del monorepo si se omite. |

**Orden de resolución del proveedor:** flag `--model` > `model_preset (per-agent overrides via `agents:`)` en oma-config.yaml > `default_cli` > `active_vendor` en cli-config.yaml > `gemini`.

**Resolución del prompt:** Si el argumento prompt es una ruta a un archivo existente, se usa el contenido del archivo como prompt. De lo contrario, el argumento se usa como texto inline. Los protocolos de ejecución específicos del proveedor se agregan automáticamente.

**Ejemplos:**
```bash
# Prompt inline, auto-detectar workspace
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt desde archivo, workspace explícito
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Cambiar proveedor a Claude
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# Agente mobile con workspace auto-detectado
oma agent:spawn mobile "Add biometric login" session-20260324-143000
```

### agent:status

Verificar el estado de uno o más subagentes.

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**Argumentos:**

| Argumento | Requerido | Descripción |
|:----------|:----------|:-----------|
| `session-id` | Sí | El ID de sesión a verificar |
| `agent-ids` | No | Lista de IDs de agentes separada por espacios. Si se omite, no hay salida. |

**Opciones:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:---------------|
| `-r, --root <path>` | Ruta raíz para verificaciones de memoria | Directorio actual |

**Valores de estado:**
- `completed` — El archivo de resultado existe (con encabezado de estado opcional).
- `running` — El archivo PID existe y el proceso está activo.
- `crashed` — El archivo PID existe pero el proceso está muerto, o no se encontró archivo PID/resultado.

**Formato de salida:** Una línea por agente: `{agent-id}:{status}`

**Ejemplos:**
```bash
# Verificar agentes específicos
oma agent:status session-20260324-143000 backend frontend

# Salida:
# backend:running
# frontend:completed

# Verificar con ruta raíz personalizada
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

Ejecutar múltiples subagentes en paralelo.

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Argumentos:**

| Argumento | Requerido | Descripción |
|:----------|:----------|:-----------|
| `tasks` | Sí | Ruta a un archivo YAML de tareas, o (con `--inline`) especificaciones de tareas inline |

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `-m, --model <vendor>` | Proveedor CLI para todos los agentes |
| `-i, --inline` | Modo inline: especificar tareas como argumentos `agent:task[:workspace]` |
| `--no-wait` | Modo en segundo plano — iniciar agentes y retornar inmediatamente |

**Formato del archivo YAML de tareas:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # opcional, auto-detectado si se omite
  - agent: frontend
    task: "Build user dashboard"
    workspace: ./web
```

**Formato de tarea inline:** `agent:task` o `agent:task:workspace` (el workspace debe comenzar con `./` o `/`).

**Directorio de resultados:** `.agents/results/parallel-{timestamp}/` contiene archivos de log de cada agente.

**Ejemplos:**
```bash
# Desde archivo YAML
oma agent:parallel tasks.yaml

# Modo inline
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Modo en segundo plano (sin espera)
oma agent:parallel tasks.yaml --no-wait

# Cambiar proveedor para todos los agentes
oma agent:parallel tasks.yaml -m claude
```

### agent:review

Ejecutar una revisión de código usando un CLI externo de IA (codex, claude, gemini o qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `-m, --model <vendor>` | Proveedor CLI a usar: `codex`, `claude`, `gemini`, `qwen`. Por defecto usa el proveedor resuelto desde la configuración. |
| `-p, --prompt <prompt>` | Prompt de revisión personalizado. Si se omite, se usa un prompt de revisión de código predeterminado. |
| `-w, --workspace <path>` | Ruta a revisar. Por defecto usa el directorio de trabajo actual. |
| `--no-uncommitted` | Omitir revisión de cambios no confirmados. Cuando se establece, solo se revisan los cambios confirmados en la sesión. |

**Qué hace:**
- Detecta el ID de sesión actual automáticamente desde el entorno o la actividad reciente de git.
- Para `codex`: usa el subcomando nativo `codex review`.
- Para `claude`, `gemini`, `qwen`: construye una solicitud de revisión basada en prompt e invoca el CLI con el prompt de revisión.
- Por defecto, revisa los cambios no confirmados en el directorio de trabajo.
- Con `--no-uncommitted`, restringe la revisión a los cambios confirmados dentro de la sesión actual.

**Ejemplos:**
```bash
# Revisar cambios no confirmados con el proveedor por defecto
oma agent:review

# Revisar con codex (usa el comando nativo codex review)
oma agent:review -m codex

# Revisar con claude usando un prompt personalizado
oma agent:review -m claude -p "Focus on security vulnerabilities and input validation"

# Revisar una ruta específica
oma agent:review -w ./apps/api

# Revisar solo cambios confirmados (omitir árbol de trabajo)
oma agent:review --no-uncommitted

# Revisar cambios confirmados en un workspace específico con gemini
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## Gestión de Memoria

### memory:init

Inicializar el esquema de memoria de Serena.

```
oma memory:init [--json] [--output <format>] [--force]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |
| `--force` | Sobrescribir archivos de esquema vacíos o existentes |

**Qué hace:** Crea la estructura de directorio `.serena/memories/` con archivos de esquema iniciales que las herramientas de memoria MCP usan para leer y escribir el estado del agente.

**Ejemplos:**
```bash
# Inicializar memoria
oma memory:init

# Forzar sobrescritura del esquema existente
oma memory:init --force
```

---

## Integración y Utilidades

### auth:status

Verificar el estado de autenticación de todos los CLIs soportados.

```
oma auth:status [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Verifica:** Gemini (API key), Claude (API key u OAuth), Codex (API key), Qwen (API key).

**Ejemplos:**
```bash
oma auth:status
oma auth:status --json
```

### bridge

Puente de MCP stdio a transporte Streamable HTTP.

```
oma bridge [url]
```

**Argumentos:**

| Argumento | Requerido | Descripción |
|:----------|:----------|:-----------|
| `url` | No | La URL del endpoint Streamable HTTP (ej., `http://localhost:12341/mcp`) |

**Qué hace:** Actúa como puente de protocolo entre el transporte stdio de MCP (usado por Antigravity IDE) y el transporte Streamable HTTP (usado por el servidor Serena MCP). Esto es necesario porque Antigravity IDE no soporta transportes HTTP/SSE directamente.

**Arquitectura:**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**Ejemplo:**
```bash
# Puente al servidor Serena local
oma bridge http://localhost:12341/mcp
```

### verify

Verificar la salida del subagente contra criterios esperados.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**Argumentos:**

| Argumento | Requerido | Descripción |
|:----------|:----------|:-----------|
| `agent-type` | Sí | Uno de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Opciones:**

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:---------------|
| `-w, --workspace <path>` | Ruta del workspace a verificar | Directorio actual |
| `--json` | Salida como JSON | |
| `--output <format>` | Formato de salida (`text` o `json`) | |

**Qué hace:** Ejecuta el script de verificación para el tipo de agente especificado, comprobando éxito del build, resultados de pruebas y cumplimiento de alcance.

**Ejemplos:**
```bash
# Verificar salida del backend en workspace por defecto
oma verify backend

# Verificar frontend en workspace específico
oma verify frontend -w ./apps/web

# Salida JSON para CI
oma verify backend --json
```

### cleanup

Limpiar procesos huérfanos de subagentes y archivos temporales.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Opciones:**

| Flag | Descripción |
|:-----|:-----------|
| `--dry-run` | Mostrar qué se limpiaría sin realizar cambios |
| `-y, --yes` | Omitir prompts de confirmación y limpiar todo |
| `--json` | Salida como JSON |
| `--output <format>` | Formato de salida (`text` o `json`) |

**Qué limpia:**
- Archivos PID huérfanos en el directorio temporal del sistema (`/tmp/subagent-*.pid`).
- Archivos de log huérfanos (`/tmp/subagent-*.log`).
- Directorios de Gemini Antigravity (brain, implicit, knowledge) bajo `.gemini/antigravity/`.

**Ejemplos:**
```bash
# Vista previa de lo que se limpiaría
oma cleanup --dry-run

# Limpiar con prompts de confirmación
oma cleanup

# Limpiar todo sin prompts
oma cleanup --yes

# Salida JSON para automatización
oma cleanup --json
```

### visualize

Visualizar la estructura del proyecto como un grafo de dependencias.

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

**Qué hace:** Analiza la estructura del proyecto y genera un grafo de dependencias que muestra las relaciones entre habilidades, agentes, flujos de trabajo y recursos compartidos.

**Ejemplos:**
```bash
oma visualize
oma viz --json
```

### star

Dar estrella a oh-my-agent en GitHub.

```
oma star
```

Sin opciones. Requiere que el CLI `gh` esté instalado y autenticado. Da estrella al repositorio `first-fluke/oh-my-agent`.

**Ejemplo:**
```bash
oma star
```

### describe

Describir comandos CLI como JSON para introspección en tiempo de ejecución.

```
oma describe [command-path]
```

**Argumentos:**

| Argumento | Requerido | Descripción |
|:----------|:----------|:-----------|
| `command-path` | No | El comando a describir. Si se omite, describe el programa raíz. |

**Qué hace:** Genera un objeto JSON con el nombre, descripción, argumentos, opciones y subcomandos del comando. Usado por agentes de IA para comprender las capacidades disponibles del CLI.

**Ejemplos:**
```bash
# Describir todos los comandos
oma describe

# Describir un comando específico
oma describe agent:spawn

# Describir un subcomando
oma describe "agent:parallel"
```

### help

Mostrar información de ayuda.

```
oma help
```

Muestra el texto de ayuda completo con todos los comandos disponibles.

### version

Mostrar el número de versión.

```
oma version
```

Muestra la versión actual del CLI y termina.

---

## Variables de Entorno

| Variable | Descripción | Usado por |
|:---------|:-----------|:----------|
| `OH_MY_AG_OUTPUT_FORMAT` | Establecer como `json` para forzar salida JSON en todos los comandos que lo soporten | Todos los comandos con flag `--json` |
| `DASHBOARD_PORT` | Puerto para el dashboard web | `dashboard:web` |
| `MEMORIES_DIR` | Sobreescribir la ruta del directorio de memorias | `dashboard`, `dashboard:web` |

---

## Alias

| Alias | Comando completo |
|:------|:----------------|
| `viz` | `visualize` |
