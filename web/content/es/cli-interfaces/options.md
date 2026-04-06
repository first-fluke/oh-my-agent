---
title: Opciones del CLI
description: Referencia exhaustiva de todas las opciones CLI — flags globales, control de salida, opciones por comando y patrones de uso reales.
---

# Opciones del CLI

## Opciones Globales

Estas opciones están disponibles en el comando raíz `oma` / `oh-my-agent`:

| Flag | Descripción |
|:-----|:-----------|
| `-V, --version` | Mostrar el número de versión y salir |
| `-h, --help` | Mostrar la ayuda del comando |

Todos los subcomandos también soportan `-h, --help` para mostrar su texto de ayuda específico.

---

## Opciones de Salida

Muchos comandos soportan salida legible por máquina para pipelines de CI/CD y automatización. Hay tres formas de solicitar salida JSON, en orden de prioridad:

### 1. Flag --json

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

El flag `--json` es la forma más sencilla de obtener salida JSON. Disponible en: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `usage:anti`, `memory:init`, `verify`, `visualize`.

### 2. Flag --output

```bash
oma stats --output json
oma doctor --output text
```

El flag `--output` acepta `text` o `json`. Proporciona la misma funcionalidad que `--json` pero también permite solicitar explícitamente salida en texto (útil cuando la variable de entorno está configurada como json pero se desea texto para un comando específico).

**Validación:** Si se proporciona un formato inválido, el CLI lanza: `Invalid output format: {value}. Expected one of text, json`.

### 3. Variable de Entorno OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # salida JSON
oma doctor   # salida JSON
oma retro    # salida JSON
```

Establece esta variable de entorno como `json` para forzar salida JSON en todos los comandos que lo soporten. Solo se reconoce `json`; cualquier otro valor se ignora y se usa texto por defecto.

**Orden de resolución:** flag `--json` > flag `--output` > variable de entorno `OH_MY_AG_OUTPUT_FORMAT` > `text` (por defecto).

### Comandos que Soportan Salida JSON

| Comando | `--json` | `--output` | Notas |
|:--------|:---------|:----------|:------|
| `doctor` | Sí | Sí | Incluye verificaciones CLI, estado MCP, estado de habilidades |
| `stats` | Sí | Sí | Objeto completo de métricas |
| `retro` | Sí | Sí | Snapshot con métricas, autores, tipos de commit |
| `cleanup` | Sí | Sí | Lista de elementos limpiados |
| `auth:status` | Sí | Sí | Estado de autenticación por CLI |
| `usage:anti` | Sí | Sí | Cuotas de uso de modelos |
| `memory:init` | Sí | Sí | Resultado de inicialización |
| `verify` | Sí | Sí | Resultados de verificación por chequeo |
| `visualize` | Sí | Sí | Grafo de dependencias como JSON |
| `describe` | Siempre JSON | N/A | Siempre genera JSON (comando de introspección) |

---

## Opciones por Comando

### update

```
oma update [-f | --force] [--ci]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:---------------|
| `--force` | `-f` | Sobrescribir archivos de configuración personalizados durante la actualización. Afecta: `oma-config.yaml`, `mcp.json`, directorios `stack/`. Sin este flag, estos archivos se respaldan antes de la actualización y se restauran después. | `false` |
| `--ci` | | Ejecutar en modo CI no interactivo. Omite todos los prompts de confirmación, usa salida de consola plana en lugar de spinners y animaciones. Requerido para pipelines de CI/CD donde stdin no está disponible. | `false` |

**Comportamiento con --force:**
- `oma-config.yaml` se reemplaza con el valor por defecto del registro.
- `mcp.json` se reemplaza con el valor por defecto del registro.
- El directorio `stack/` de backend (recursos específicos del lenguaje) se reemplaza.
- Todos los demás archivos siempre se actualizan independientemente de este flag.

**Comportamiento con --ci:**
- Sin `console.clear()` al inicio.
- `@clack/prompts` se reemplaza con `console.log` plano.
- Los prompts de detección de competidores se omiten.
- Los errores lanzan excepción en lugar de llamar a `process.exit(1)`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:---------------|
| `--reset` | Restablecer todos los datos de métricas. Elimina `.serena/metrics.json` y lo recrea con valores vacíos. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:---------------|
| `--interactive` | Modo interactivo con entrada manual de datos. Solicita contexto adicional que no se puede obtener de git (ej., estado de ánimo, eventos notables). | `false` |
| `--compare` | Comparar la ventana de tiempo actual contra la ventana anterior del mismo tamaño. Muestra métricas delta (ej., commits +12, líneas agregadas -340). | `false` |

**Formato del argumento de ventana:**
- `7d` — 7 días
- `2w` — 2 semanas
- `1m` — 1 mes
- Omitir para el valor por defecto (7 días)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:---------------|
| `--dry-run` | | Modo de vista previa. Lista todos los elementos que se limpiarían sin realizar cambios. Código de salida 0 independientemente de los hallazgos. | `false` |
| `--yes` | `-y` | Omitir todos los prompts de confirmación. Limpia todo sin preguntar. Útil en scripts y CI. | `false` |

**Qué se limpia:**
1. Archivos PID huérfanos: `/tmp/subagent-*.pid` donde el proceso referenciado ya no está en ejecución.
2. Archivos de log huérfanos: `/tmp/subagent-*.log` que coinciden con PIDs muertos.
3. Directorios de Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/` — estos acumulan estado con el tiempo y pueden crecer mucho.

### usage:anti

```
oma usage:anti [--json] [--output <format>] [--raw]
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:---------------|
| `--raw` | Volcar la respuesta RPC sin procesar del IDE Antigravity sin parsear. Útil para depurar problemas de conexión. | `false` |

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:---------------|
| `--model` | `-m` | Proveedor CLI. Debe ser uno de: `gemini`, `claude`, `codex`, `qwen`. Sobrescribe toda la resolución de proveedor basada en configuración. | Resuelto desde config |
| `--workspace` | `-w` | Directorio de trabajo del agente. Si se omite o se establece como `.`, el CLI auto-detecta el workspace desde archivos de configuración del monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Auto-detectado o `.` |

**Validación:**
- `agent-id` debe ser uno de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` no debe contener `..`, `?`, `#`, `%`, ni caracteres de control.
- `vendor` debe ser uno de: `gemini`, `claude`, `codex`, `qwen`.

**Comportamiento específico por proveedor:**

| Proveedor | Comando | Flag Auto-aprobación | Flag de Prompt |
|:----------|:--------|:---------------------|:--------------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (ninguno) | `-p` |
| codex | `codex` | `--full-auto` | (ninguno — el prompt es posicional) |
| qwen | `qwen` | `--yolo` | `-p` |

Estos valores por defecto se pueden sobrescribir en `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:---------------|
| `--root` | `-r` | Ruta raíz para localizar archivos de memoria (`.serena/memories/result-{agent}.md`) y archivos PID. | Directorio de trabajo actual |

**Lógica de determinación de estado:**
1. Si `.serena/memories/result-{agent}.md` existe: lee el encabezado `## Status:`. Si no hay encabezado, reporta `completed`.
2. Si existe archivo PID en `/tmp/subagent-{session-id}-{agent}.pid`: verifica si el PID está activo. Reporta `running` si está activo, `crashed` si está muerto.
3. Si no existe ningún archivo: reporta `crashed`.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:---------------|
| `--model` | `-m` | Proveedor CLI aplicado a todos los agentes generados. | Resuelto por agente desde config |
| `--inline` | `-i` | Interpretar argumentos de tareas como cadenas `agent:task[:workspace]` en lugar de una ruta de archivo. | `false` |
| `--no-wait` | | Modo en segundo plano. Inicia todos los agentes y retorna inmediatamente sin esperar a que terminen. La lista de PIDs y logs se guardan en `.agents/results/parallel-{timestamp}/`. | `false` (espera a que terminen) |

**Formato de tarea inline:** `agent:task` o `agent:task:workspace`
- El workspace se detecta verificando si el último segmento separado por dos puntos comienza con `./`, `/`, o es igual a `.`.
- Ejemplo: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Ejemplo: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=auto-detectado.

**Formato del archivo YAML de tareas:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # opcional
  - agent: frontend
    task: "Build user dashboard"
```

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| Flag | Descripción | Predeterminado |
|:-----|:-----------|:---------------|
| `--force` | Sobrescribir archivos de esquema vacíos o existentes en `.serena/memories/`. Sin este flag, los archivos existentes no se tocan. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| Flag | Corto | Descripción | Predeterminado |
|:-----|:------|:-----------|:---------------|
| `--workspace` | `-w` | Ruta al directorio del workspace a verificar. | Directorio de trabajo actual |

**Tipos de agente:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## Ejemplos Prácticos

### Pipeline de CI: Actualizar y Verificar

```bash
# Actualizar en modo CI, luego ejecutar doctor para verificar la instalación
oma update --ci
oma doctor --json | jq '.healthy'
```

### Recopilación Automatizada de Métricas

```bash
# Recopilar métricas como JSON y enviar a un sistema de monitoreo
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Ejecución por Lotes de Agentes con Monitoreo de Estado

```bash
# Iniciar agentes en segundo plano
oma agent:parallel tasks.yaml --no-wait

# Verificar estado periódicamente
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Limpieza en CI Después de Pruebas

```bash
# Limpiar todos los procesos huérfanos sin prompts
oma cleanup --yes --json
```

### Verificación con Workspace

```bash
# Verificar cada dominio en su workspace
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro con Comparación para Revisiones de Sprint

```bash
# Retro de sprint de dos semanas con comparación con el sprint anterior
oma retro 2w --compare

# Guardar como JSON para informe de sprint
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script Completo de Verificación de Salud

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Verificar instalaciones CLI
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Verificar estado de autenticación
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# Verificar métricas
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe para Introspección de Agentes

```bash
# Un agente de IA puede descubrir los comandos disponibles
oma describe | jq '.command.subcommands[] | {name, description}'

# Obtener detalles sobre un comando específico
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
