---
title: Ejecución en Paralelo
description: Guía completa para ejecutar múltiples agentes de oh-my-agent simultáneamente — sintaxis de agent:spawn con todas las opciones, modo inline agent:parallel, patrones con workspace, configuración multi-CLI, prioridad de resolución de proveedor, monitoreo con dashboards, estrategia de ID de sesión y anti-patrones a evitar.
---

# Ejecución en Paralelo

La ventaja principal de oh-my-agent es ejecutar múltiples agentes especializados simultáneamente. Mientras el agente backend implementa tu API, el agente frontend crea la interfaz y el agente mobile construye las pantallas de la app — todo coordinado a través de memoria compartida.

---

## agent:spawn — Generación de Un Solo Agente

### Sintaxis Básica

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [opciones]
```

### Parámetros

| Parámetro | Requerido | Descripción |
|-----------|-----------|-------------|
| `agent-id` | Sí | Identificador del agente: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Sí | Descripción de la tarea (cadena entre comillas o ruta a un archivo de prompt) |
| `session-id` | Sí | Agrupa agentes trabajando en la misma funcionalidad. Formato: `session-YYYYMMDD-HHMMSS` o cualquier cadena única. |
| `opciones` | No | Ver tabla de opciones abajo |

### Opciones

| Flag | Corto | Descripción |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Directorio de trabajo para el agente. Los agentes solo modifican archivos dentro de este directorio. |
| `--model <name>` | `-m` | Sobrescribir proveedor CLI para esta generación específica. Opciones: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Sobrescribir límite de turnos por defecto para este agente. |
| `--json` | | Salida del resultado como JSON (útil para scripting). |
| `--no-wait` | | Disparar y olvidar — retorna inmediatamente sin esperar completación. |

### Ejemplos

```bash
# Generar un agente backend con proveedor por defecto
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Generar con aislamiento de workspace
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Sobrescribir proveedor para este agente específico
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Establecer un límite de turnos más alto para una tarea compleja
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Usar un archivo de prompt en lugar de texto inline
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Generación Paralela con Procesos en Segundo Plano

Para ejecutar múltiples agentes simultáneamente, usa procesos en segundo plano del shell:

```bash
# Generar 3 agentes en paralelo
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Bloquear hasta que todos los agentes completen
```

El `&` ejecuta cada agente en segundo plano. `wait` bloquea hasta que todos los procesos en segundo plano terminen.

### Patrón con Workspace

Siempre asigna workspaces separados al ejecutar agentes en paralelo para prevenir conflictos de archivos:

```bash
# Ejecución paralela full-stack
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# Después de implementación, ejecutar QA (secuencial — depende de implementación)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — Modo Paralelo Inline

Para una sintaxis más limpia que maneja la gestión de procesos en segundo plano automáticamente:

### Sintaxis

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [opciones]
```

### Ejemplos

```bash
# Ejecución paralela básica
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# Con no-wait (disparar y olvidar)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Todos los agentes comparten la misma sesión automáticamente
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

El flag `-i` (inline) permite especificar pares agente-prompt directamente en el comando.

---

## Configuración Multi-CLI

No todos los CLIs de IA rinden igual en todos los dominios. oh-my-agent te permite dirigir agentes al CLI que mejor maneja su dominio.

### Ejemplo de Configuración Completa

```yaml
# .agents/oma-config.yaml

# Idioma de respuesta
language: en

# Formato de fecha para informes
date_format: "YYYY-MM-DD"

# Zona horaria para marcas de tiempo
timezone: "Asia/Seoul"

# CLI predeterminado (usado cuando no existe mapeo específico por agente)
default_cli: gemini

# Enrutamiento CLI por agente
agent_cli_mapping:
  frontend: claude       # Razonamiento complejo de UI, composición de componentes
  backend: gemini        # Scaffolding rápido de API, generación CRUD
  mobile: gemini         # Generación rápida de código Flutter
  db: gemini             # Diseño rápido de esquemas
  pm: gemini             # Descomposición rápida de tareas
  qa: claude             # Revisión exhaustiva de seguridad y accesibilidad
  debug: claude          # Análisis profundo de causa raíz, rastreo de símbolos
  design: claude         # Decisiones de diseño matizadas, detección de anti-patrones
  tf-infra: gemini       # Generación HCL
  dev-workflow: gemini   # Configuración de task runner
  translator: claude     # Traducción matizada con sensibilidad cultural
  orchestrator: gemini   # Coordinación rápida
  commit: gemini         # Generación simple de mensajes de commit
```

### Prioridad de Resolución de Proveedor

Cuando `oma agent:spawn` determina qué CLI usar, sigue esta prioridad (el más alto gana):

| Prioridad | Fuente | Ejemplo |
|-----------|--------|---------|
| 1 (más alta) | flag `--model` | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | `agent_cli_mapping.backend: gemini` en oma-config.yaml |
| 3 | `default_cli` | `default_cli: gemini` en oma-config.yaml |
| 4 | `active_vendor` | Configuración legacy en `cli-config.yaml` |
| 5 (más baja) | Respaldo fijo | `gemini` |

Esto significa que un flag `--model` siempre gana. Si no se proporciona flag, el sistema verifica el mapeo específico del agente, luego el predeterminado, luego la configuración legacy, y finalmente recurre a Gemini.

---

## Métodos de Generación Específicos por Proveedor

El mecanismo de generación varía por IDE/CLI:

| Proveedor | Cómo se Generan los Agentes | Manejo de Resultados |
|-----------|----------------------------|---------------------|
| **Claude Code** | Herramienta `Agent` con definiciones `.claude/agents/{name}.md`. Múltiples llamadas Agent en el mismo mensaje = paralelo real. | Retorno sincrónico |
| **Codex CLI** | Solicitud de subagente paralelo mediada por modelo | Salida JSON |
| **Gemini CLI** | Comando CLI `oma agent:spawn` | Sondeo de memoria MCP |
| **Antigravity IDE** | Solo `oma agent:spawn` (subagentes personalizados no disponibles) | Sondeo de memoria MCP |
| **CLI Fallback** | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Sondeo de archivo de resultados |

Cuando se ejecuta dentro de Claude Code, el flujo usa la herramienta `Agent` directamente:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Múltiples llamadas a la herramienta Agent en el mismo mensaje se ejecutan como paralelo real — sin espera secuencial.

---

## Monitoreo de Agentes

### Dashboard de Terminal

```bash
oma dashboard
```

Muestra una tabla en vivo con:
- ID de sesión y estado general
- Estado por agente (ejecutándose, completado, fallido)
- Conteo de turnos
- Última actividad de archivos de progreso
- Tiempo transcurrido

El dashboard observa `.serena/memories/` para actualizaciones en tiempo real. Se refresca a medida que los agentes escriben progreso.

### Dashboard Web

```bash
oma dashboard:web
# Abre http://localhost:9847
```

Funcionalidades:
- Actualizaciones en tiempo real vía WebSocket
- Auto-reconexión en caídas de conexión
- Indicadores de estado de agentes con color
- Streaming de registro de actividad desde archivos de progreso y resultados
- Historial de sesiones

### Layout de Terminal Recomendado

Usa 3 terminales para visibilidad óptima:

```
+---------------------------+----------------------+
|                           |                      |
|   Terminal 1:             |   Terminal 2:        |
|   oma dashboard           |   Comandos de        |
|   (monitoreo en vivo)     |   generación de      |
|                           |   agentes            |
+---------------------------+----------------------+
|                                                  |
|   Terminal 3:                                    |
|   Logs de test/build, operaciones git            |
|                                                  |
+--------------------------------------------------+
```

### Verificar Estado de Agente Individual

```bash
oma agent:status <session-id> <agent-id>
```

Retorna el estado actual de un agente específico: ejecutándose, completado o fallido, junto con conteo de turnos y última actividad.

---

## Estrategia de ID de Sesión

Los IDs de sesión agrupan agentes trabajando en la misma funcionalidad. Mejores prácticas:

- **Una sesión por funcionalidad:** Todos los agentes trabajando en "autenticación de usuario" comparten `session-auth-01`
- **Formato:** Usa IDs descriptivos: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Auto-generado:** El orquestador genera IDs en formato `session-YYYYMMDD-HHMMSS`
- **Reutilizable para iteración:** Usa el mismo ID de sesión al regenerar agentes con refinamientos

Los IDs de sesión determinan:
- Qué archivos de memoria los agentes leen y escriben (`progress-{agent}.md`, `result-{agent}.md`)
- Qué monitorea el dashboard
- Cómo se agrupan los resultados en el informe final

---

## Consejos para Ejecución Paralela

### Hacer

1. **Bloquear contratos API primero.** Ejecutar `/plan` antes de generar agentes de implementación para que frontend y backend estén de acuerdo en endpoints, esquemas de solicitud/respuesta y formatos de error.

2. **Usar un ID de sesión por funcionalidad.** Esto mantiene las salidas de agentes agrupadas y el monitoreo del dashboard coherente.

3. **Asignar workspaces separados.** Siempre usar `-w` para aislar agentes:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitorear activamente.** Abrir una terminal de dashboard para detectar problemas temprano — un agente fallando desperdicia turnos si no se detecta rápidamente.

5. **Ejecutar QA después de implementación.** Generar el agente QA secuencialmente después de que todos los agentes de implementación completen:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Iterar con regeneraciones.** Si la salida de un agente necesita refinamiento, regenerarlo con la tarea original más contexto de corrección. No iniciar una nueva sesión.

7. **Empezar con `/work` si no estás seguro.** El flujo de coordinación te guía paso a paso con confirmación del usuario en cada puerta.

### No Hacer

1. **No generar agentes en el mismo workspace.** Dos agentes escribiendo en el mismo directorio crearán conflictos de merge y sobrescribirán el trabajo del otro.

2. **No exceder MAX_PARALLEL (por defecto 3).** Más agentes concurrentes no siempre significa resultados más rápidos. Cada agente necesita recursos de memoria y CPU. El predeterminado de 3 está ajustado para la mayoría de sistemas.

3. **No omitir el paso de plan.** Generar agentes sin un plan lleva a implementaciones desalineadas — el frontend construye contra una forma de API mientras el backend construye otra.

4. **No ignorar agentes fallidos.** El trabajo de un agente fallido está incompleto. Verificar `result-{agent}.md` para la razón del fallo, corregir el prompt y regenerar.

5. **No mezclar IDs de sesión para trabajo relacionado.** Si los agentes backend y frontend están trabajando en la misma funcionalidad, deben compartir un ID de sesión para que el orquestador pueda coordinarlos.

---

## Ejemplo de Extremo a Extremo

Un flujo completo de ejecución paralela para construir una funcionalidad de autenticación de usuario:

```bash
# Paso 1: Planificar la funcionalidad
# (En tu IDE de IA, ejecutar /plan o describir la funcionalidad)
# Esto crea .agents/plan.json con desglose de tareas

# Paso 2: Generar agentes de implementación en paralelo
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Paso 3: Monitorear en una terminal separada
# Terminal 2:
oma dashboard

# Paso 4: Esperar a que todos los agentes de implementación terminen
wait

# Paso 5: Ejecutar revisión QA
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Paso 6: Si QA encuentra problemas, regenerar agentes específicos con correcciones
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Paso 7: Re-ejecutar QA para verificar correcciones
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
