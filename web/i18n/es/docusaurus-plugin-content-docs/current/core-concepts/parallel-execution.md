---
title: Ejecución en paralelo
description: Ejecuta varios roles de despacho de OMA en paralelo con la sintaxis actual de la CLI, archivos de tareas, modo inline, aislamiento de workspaces, resolución de modelos y proveedores, monitoreo, IDs de sesión y patrones de recuperación.
---

# Ejecución en paralelo

La principal ventaja de oh-my-agent es ejecutar varios agentes especializados al mismo tiempo. Mientras el agente de backend implementa una API, el agente de frontend crea la interfaz y el agente mobile construye las pantallas de la app, el orquestador los coordina mediante un estado de ejecución persistente y recibos que registran cada ejecución.

---

## `agent:spawn`: generación de un solo agente

### Sintaxis básica

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Parámetros

| Parámetro | Obligatorio | Descripción |
|-----------|-------------|-------------|
| `agent-id` | Sí | Rol de despacho canónico: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` o `explore` |
| `prompt` | Sí | Descripción de la tarea (cadena entre comillas o ruta a un archivo de prompt) |
| `session-id` | Sí | Agrupa los agentes que trabajan en la misma funcionalidad. Formato: `session-YYYYMMDD-HHMMSS` o cualquier cadena única. |
| `options` | No | Consulta la tabla de opciones siguiente |

### Opciones

| Flag | Corto | Descripción |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Directorio de trabajo del agente. Los agentes solo modifican archivos dentro de este directorio. |
| `--vendor <vendor>` | | Sobrescribe el proveedor de CLI para esta generación (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` o `pi`). |
| `--resumed-from <run-id>` | | Vincula un reintento con la ejecución anterior respaldada por evidencia. |
| `--fallback-vendors <vendors>` | | Proveedores alternativos ordenados y separados por comas cuando el principal no puede ejecutarse. |
| `--task-id <id>` | | Vincula la generación con un ID de tarea del plan de la sesión. |
| `--isolation <mode>` | | `worktree` crea un worktree de Git nuevo en el directorio temporal de worktrees de OMA. El worktree permanece para revisarlo y fusionarlo o descartarlo. |
| `--read-only` | | Restringe el agente generado a herramientas no destructivas. |

### Ejemplos

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## Generación paralela con procesos en segundo plano

Para ejecutar varios agentes simultáneamente, usa procesos de shell en segundo plano:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

`&` ejecuta cada agente en segundo plano. `wait` espera hasta que terminan todos los procesos en segundo plano.

### Patrón con workspaces {#workspace-aware-pattern}

Asigna siempre workspaces separados al ejecutar agentes en paralelo para evitar conflictos de archivos:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## `agent:parallel`: modo paralelo inline

Para usar una sintaxis más sencilla que gestione automáticamente los procesos en segundo plano:

### Sintaxis

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Ejemplos

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

El flag `--inline` analiza cada argumento con formato `agent:task`. Añade una tercera ruta separada por dos puntos (`agent:task:workspace`) cuando la tarea necesita un workspace específico. Sin `--inline`, pasa un archivo YAML de tareas con `{tasks: [{id?, agent, task, workspace?}]}`. `--session` asocia los resultados paralelos con una sesión existente.

---

## Configuración multi-CLI

oh-my-agent enruta cada agente a la CLI adecuada mediante `model_preset` en `.agents/oma-config.yaml`. Elige un preset integrado para el proveedor que uses y, de forma opcional, sobrescribe agentes individuales.

### Ejemplo de configuración

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Los presets integrados son `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` y `mixed`. Consulta [Modelos por agente](../guide/per-agent-models.md) para obtener más información.

### Resolución del proveedor

Cuando `oma agent spawn` determina qué CLI usar:

| Prioridad | Fuente | Ejemplo |
|-----------|--------|---------|
| 1 (más alta) | Flag `--vendor` | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | Sobrescritura `agents:` en `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | Valores predeterminados del agente en `model_preset` activo | búsqueda del preset para el rol del agente |

El flag `--vendor` siempre tiene prioridad. Si no se proporciona, el sistema revisa las sobrescrituras de `agents:`, después los valores predeterminados del preset y finalmente la CLI alternativa configurada. Con `model_preset: auto`, la configuración nativa del runtime actual proporciona el modelo.

---

## Métodos de generación específicos del proveedor

El mecanismo de generación varía según la IDE o CLI:

| Proveedor | Cómo se generan los agentes | Gestión del resultado |
|-----------|-----------------------------|-----------------------|
| **Claude Code** | Las tareas del mismo proveedor usan la herramienta Agent con `.claude/agents/{name}.md`; las tareas entre proveedores recurren a `oma agent spawn`. | Retorno síncrono |
| **Codex CLI** | Las tareas del mismo proveedor usan agentes personalizados nativos de `.codex/agents/{name}.toml`; las tareas entre proveedores recurren a `oma agent spawn`. | Salida JSON |
| **Antigravity CLI/IDE** | `oma agent spawn` mediante el runtime `agy`; no se requieren subagentes nativos personalizados. | Recibo persistente (registro de la ejecución) y sondeo del archivo de resultados |
| **Cursor** | Usa la integración generada de Cursor cuando está disponible; de lo contrario, `oma agent spawn`. | Sondeo del archivo de resultados |
| **OpenCode / pi** | Usa el puente de extensiones en proceso cuando se selecciona; el trabajo entre proveedores usa `oma agent spawn`. | Sondeo del archivo de resultados |
| **CLI alternativa** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Sondeo de resultados respaldados por evidencia |

Cuando se ejecuta dentro de Claude Code, el flujo usa directamente la herramienta `Agent`:

```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Varias llamadas a la herramienta Agent en el mismo mensaje se ejecutan realmente en paralelo, sin espera secuencial.

La misma regla de despacho se aplica entre proveedores:

1. Resuelve `target_vendor_for_agent` desde `.agents/oma-config.yaml`.
2. Si coincide con el proveedor del runtime actual, usa el archivo de agente nativo de ese proveedor.
3. Si no coincide, usa `oma agent spawn` solo para ese agente.

---

## Monitoreo de agentes

### Dashboard de terminal

```bash
oma dashboard terminal
```

Muestra una tabla en vivo con:
- ID de sesión y estado general
- Estado de cada agente (en ejecución, completado, fallido)
- Recuento de turnos
- Actividad más reciente de los archivos de progreso
- Tiempo transcurrido

El dashboard observa `.agents/state/memories/` para recibir actualizaciones en tiempo real. Se actualiza cuando los agentes escriben su progreso.

### Dashboard web

```bash
oma dashboard web
# Opens http://localhost:9847
```

Incluye:
- Actualizaciones en tiempo real mediante WebSocket
- Reconexión automática cuando se interrumpe la conexión
- Indicadores de estado de los agentes con colores
- Registro de actividad transmitido desde los archivos de progreso y resultados
- Historial de sesiones

### Distribución de terminales recomendada

Usa 3 terminales para tener una visibilidad adecuada:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Comprobar el estado de un agente individual

```bash
oma agent status <session-id> <agent-id>
```

Devuelve el estado actual de un agente específico: en ejecución, completado o fallido, junto con el recuento de turnos y la última actividad.

---

## Estrategia de ID de sesión

Los IDs de sesión agrupan a los agentes que trabajan en la misma funcionalidad. Buenas prácticas:

- **Una sesión por funcionalidad:** todos los agentes que trabajan en "autenticación de usuarios" comparten `session-auth-01`.
- **Formato:** usa IDs descriptivos: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`.
- **Generación automática:** el orquestador genera IDs con formato `session-YYYYMMDD-HHMMSS`.
- **Reutilización para iterar:** usa el mismo ID de sesión al volver a generar agentes con refinamientos.

Los IDs de sesión determinan:

- Qué archivos de memoria del ámbito de la ejecución leen y escriben (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`).
- Qué supervisa el dashboard.
- Cómo se agrupan los resultados en el informe final.

---

## Consejos para la ejecución en paralelo

### Hacer

1. **Fija primero los contratos de API.** Ejecuta `/plan` antes de generar agentes de implementación para que frontend y backend coincidan en endpoints, esquemas de solicitud/respuesta y formatos de error.

2. **Usa un ID de sesión por funcionalidad.** Así los resultados de los agentes quedan agrupados y el dashboard puede supervisarlos juntos.

3. **Asigna workspaces separados.** Usa siempre `-w` para aislar a los agentes:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitorea activamente.** Abre un dashboard de terminal para detectar problemas pronto. Un agente que falla consume turnos si no se detecta a tiempo.

5. **Ejecuta QA después de la implementación.** Genera el agente QA secuencialmente cuando terminen todos los agentes de implementación:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Itera volviendo a generar agentes.** Si el resultado de un agente necesita ajustes, vuelve a generarlo con la tarea original y el contexto de la corrección. No empieces una sesión nueva.

7. **Empieza con `/work` si tienes dudas.** El flujo de trabajo te guía paso a paso, con confirmación del usuario en cada puerta.

### No hacer

1. **No generes agentes en el mismo workspace.** Dos agentes que escriben en el mismo directorio crean conflictos y pueden sobrescribir trabajo.

2. **No superes MAX_PARALLEL (3 por defecto).** Más concurrencia no siempre es más rápida. El valor predeterminado está ajustado para la mayoría de los sistemas.

3. **No omitas la planificación.** Generar agentes sin un plan provoca desalineación: por ejemplo, frontend puede implementar una forma de API distinta de la de backend.

4. **No ignores agentes fallidos.** Su trabajo está incompleto. Revisa su claim estructurado, que declara el resultado de la ejecución, o su archivo de resultados de ámbito de ejecución, corrige el prompt y vuelve a generarlo.

5. **No mezcles IDs de sesión para trabajo relacionado.** Si backend y frontend trabajan en la misma funcionalidad, deben compartir un ID de sesión para que el orquestador pueda coordinarlos.

---

## Ejemplo de extremo a extremo

Un flujo completo para una funcionalidad de autenticación de usuarios:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
