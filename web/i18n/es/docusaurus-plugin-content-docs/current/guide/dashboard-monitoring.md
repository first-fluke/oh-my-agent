---
title: "Guía: Monitoreo del dashboard"
sidebar_label: Monitoreo del dashboard
description: Monitorea sesiones de OMA desde la terminal o un dashboard web de loopback, elige el directorio de estado y recupera problemas habituales de conexión y descubrimiento.
---

# Guía: Monitoreo del dashboard

## Dos comandos de dashboard

oh-my-agent proporciona dos dashboards en tiempo real para monitorear la actividad de los agentes durante los flujos de trabajo multiagente.

| Comando | Interfaz | URL | Tecnología |
|:--------|:---------|:----|:-----------|
| `oma dashboard terminal` | Terminal (TUI) | N/A (se renderiza en la terminal) | chokidar file watcher, renderizado con picocolors |
| `oma dashboard web` | Navegador | `http://127.0.0.1:9847` (el token se imprime al iniciar) | servidor HTTP, WebSocket, chokidar file watcher |

Ambos dashboards observan `.agents/state/memories/` de forma predeterminada. Establece `MEMORIES_DIR` cuando los archivos de coordinación estén en otro lugar. El dashboard no recurre automáticamente a `.serena/memories/`.

### Dashboard de terminal

```bash
oma dashboard terminal
```

Renderiza una interfaz de caracteres de caja directamente en la terminal. Se actualiza automáticamente cuando cambian los archivos de memoria. Pulsa `Ctrl+C` para salir.

```
╔════════════════════════════════════════════════════════╗
║  OMA Memory Dashboard                                 ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**Símbolos de estado:**
- `●` (verde): en ejecución
- `✓` (cian): completado
- `✗` (rojo): fallido
- `○` (amarillo): bloqueado
- `◌` (atenuado): pendiente

### Dashboard web

```bash
oma dashboard web
```

Inicia un servidor web limitado al loopback en el puerto 9847 (configurable mediante `DASHBOARD_PORT`). OMA imprime una URL que contiene `127.0.0.1`; abre la URL exacta y conserva el token. La página usa el token para `/api/state`, `/api/recap` y las actualizaciones de WebSocket. Las solicitudes sin él devuelven `401`.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# The process also serves the recap view at /recap; use the tokenized URL it prints.
```

El dashboard web muestra la misma información que el dashboard de terminal, pero con una interfaz oscura con estilo que incluye:
- Insignia de estado de conexión (Connected / Disconnected / Connecting with auto-reconnect).
- ID de sesión y barra de estado.
- Tabla de estados de agentes con puntos de estado animados.
- Feed de actividad reciente.
- Marcas de tiempo que se actualizan automáticamente.

---

## Distribución recomendada en 3 terminales

Para los flujos multiagente, la configuración recomendada usa tres paneles de terminal:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Main Agent       │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard terminal              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc commands                                   │
│                                                                 │
│   $ oma agent status session-20260324-143052 backend frontend   │
│   $ oma stats get                                                   │
│   $ oma verify agent backend -w ./api                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**La Terminal 1** ejecuta la sesión principal del agente (Gemini CLI, Claude Code, Codex, etc.), donde interactúas con flujos como `/orchestrate` o `/work`.

**La Terminal 2** ejecuta el dashboard para monitoreo pasivo. Se actualiza automáticamente sin necesidad de interacción.

**La Terminal 3** se reserva para comandos ad hoc: consultar el estado de los agentes, ejecutar verificaciones, ver estadísticas o depurar problemas.

---

## Fuentes de datos en .agents/state/memories/

Los dashboards leen del directorio `.agents/state/memories/`. Los agentes y los flujos de trabajo rellenan este directorio con archivos de coordinación durante la ejecución. Usa `MEMORIES_DIR` en un proyecto cuyo estado se almacene en otra ubicación.

### Tipos de archivo y contenido

| Patrón de archivo | Creado por | Contenido |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | Paso 2 de `/orchestrate` | ID de sesión, hora de inicio, estado (RUNNING/COMPLETED/FAILED), versión del flujo |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Metadatos de sesión, progreso por fase y resumen de la solicitud del usuario |
| `task-board.md` | Flujos de orquestación | Tabla Markdown con asignaciones de agentes, estados y tareas |
| `progress-{agent}.md` | Cada agente generado | Número de turno, tarea actual y resultados intermedios |
| `result-{agent}.md` | Cada agente completado | Estado final (COMPLETED/FAILED), archivos modificados, problemas encontrados y entregables |
| `debug-{id}.md` | Flujo `/debug` | Diagnóstico del bug, causa raíz, corrección aplicada y ubicación de la prueba de regresión |
| `experiment-ledger-{sessionId}.md` | Experimentos reales | Evidencia comparable de línea base/candidato, comprobaciones requeridas y decisiones |
| `lessons-{sessionId}.md` | Cuando una causa reutilizable está respaldada por evidencia | Lecciones de ámbito de sesión; sin generación desencadenada por puntuación |

### Cómo los lee el dashboard

El dashboard usa varias estrategias para extraer información:

1. **Detección de sesión**: busca primero `orchestrator-session.md` y después recurre al archivo `session-*.md` modificado más recientemente. Analiza el estado a partir de las palabras clave `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED` y `ERROR`.

2. **Análisis del task board**: lee `task-board.md` como una tabla Markdown. Extrae el nombre del agente, el estado y la descripción de la tarea a partir de las columnas.

3. **Descubrimiento de agentes**: si no existe un task board, busca en todos los archivos `.md` patrones `**Agent**: {name}`, líneas `Agent: {name}` o nombres de archivo que contengan `_agent` o `-agent`.

4. **Conteo de turnos**: para cada agente descubierto, lee los archivos `progress-{agent}.md` y extrae el número de turno de los patrones `turn: N`.

5. **Feed de actividad**: enumera los 5 archivos `.md` modificados más recientemente y extrae la última línea relevante (encabezados, líneas de estado y elementos de acción) como mensaje de actividad. El dashboard web también expone la vista de recapitulación en `/recap`.

---

## Qué muestra cada dashboard

### Estado de la sesión

La sección superior muestra:
- **ID de sesión**: extraído de los archivos de sesión (formato: `session-YYYYMMDD-HHMMSS`).
- **Estado**: codificado por colores: verde para RUNNING, cian para COMPLETED, rojo para FAILED y amarillo para UNKNOWN.

### Task board

La tabla de agentes muestra cada agente detectado con:
- **Nombre del agente**: identificador del dominio (backend, frontend, mobile, qa, debug, pm).
- **Estado**: estado actual con indicador visual (running/completed/failed/blocked/pending).
- **Turno**: número de turno actual del agente (cuántas iteraciones ha completado). Se extrae de los archivos de progreso.
- **Tarea**: descripción breve de aquello en lo que trabaja el agente (truncada para que quepa).

### Progreso de los agentes

El progreso se registra mediante los archivos `progress-{agent}.md`. Cada agente actualiza su archivo mientras trabaja. El dashboard consulta estos archivos para obtener:
- Número de turno (aumenta a medida que avanza el agente).
- Acción actual (lo que el agente hace en ese momento).
- Resultados intermedios (completados parciales).

### Resultados

Cuando un agente termina, escribe `result-{agent}.md` con:
- Estado final (COMPLETED o FAILED).
- Lista de archivos modificados.
- Problemas encontrados.
- Entregables producidos.

El dashboard detecta que el agente terminó cuando existe este archivo y actualiza su estado.

---

## Runbook de resolución de problemas

### Señal 1: el agente aparece como «running», pero el turno no avanza

**Síntoma:** el dashboard muestra un agente en ejecución, pero el número de turno no ha cambiado durante varios minutos.

**Posibles causas:**
- El agente está atascado en una operación larga (escaneo de un codebase grande o llamada lenta a una API).
- El agente se cerró, pero el archivo PID aún existe.
- El agente espera una entrada del usuario (no debería ocurrir en modo de aprobación automática).

**Acciones:**
1. Comprueba el archivo de log del agente: `cat /tmp/subagent-{session-id}-{agent-id}.log`.
2. Comprueba si el proceso está realmente en ejecución: `oma agent status {session-id} {agent-id}`.
3. Si el proceso no está en ejecución, pero el estado muestra «running», el agente se cerró. Vuelve a generarlo con el contexto del error.

### Señal 2: el agente aparece como «crashed»

**Síntoma:** `oma agent status` devuelve `crashed` para un agente.

**Posibles causas:**
- El proceso del proveedor CLI terminó inesperadamente (falta de memoria, cuota de API excedida o tiempo de espera de red).
- Se eliminó el directorio de workspace o cambiaron sus permisos.
- La CLI del proveedor no está instalada o autenticada.

**Acciones:**
1. Comprueba el archivo de log para ver los detalles del error: `cat /tmp/subagent-{session-id}-{agent-id}.log`.
2. Verifica la instalación de la CLI: `oma doctor`.
3. Comprueba la autenticación: `oma auth status`.
4. Vuelve a generar el agente con la misma tarea: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`.

### Señal 3: el dashboard muestra «no agents detected yet»

**Síntoma:** el dashboard está en ejecución, pero no muestra agentes.

**Posibles causas:**
- El flujo todavía no ha llegado al paso de generación de agentes.
- El directorio `.agents/state/memories/` está vacío.
- El dashboard observa el directorio equivocado.

**Acciones:**
1. Comprueba el directorio de memorias: `ls -la .agents/state/memories/`.
2. Comprueba si el flujo aún está en la fase de planificación (todavía no se han generado agentes).
3. Asegúrate de que el dashboard observa el directorio correcto del proyecto: resuelve la ruta de memorias desde el directorio de trabajo actual.
4. Si usas una ruta personalizada: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`.

### Señal 4: el dashboard web muestra «disconnected»

**Síntoma:** la insignia de conexión del dashboard web muestra «Disconnected» en rojo.

**Posibles causas:**
- El proceso `oma dashboard web` terminó.
- El navegador usa una URL obsoleta o no contiene el token de inicio.
- Otro proceso está usando el puerto.

**Acciones:**
1. Comprueba si el proceso del dashboard está en ejecución: `ps aux | grep dashboard`.
2. Vuelve a abrir la URL exacta con token que imprimió el proceso; no elimines el token.
3. Prueba otro puerto: `DASHBOARD_PORT=8080 oma dashboard web`.
4. Comprueba la disponibilidad del puerto: `lsof -i :9847`.
5. El dashboard web se reconecta automáticamente con backoff exponencial (comienza en 1s y llega como máximo a 10s). Espera unos segundos para que se reconecte.

---

## Lista de verificación de monitoreo antes del merge

Antes de dar por terminada una sesión multiagente, verifica lo siguiente mediante el dashboard:

- [ ] **Todos los agentes muestran «completed»**: no hay agentes atascados en estado «running» o «blocked».
- [ ] **Ningún agente muestra «failed»**: si alguno falló, comprueba los logs y vuelve a generarlo.
- [ ] **El agente QA terminó su revisión**: busca `result-qa-agent.md` o `result-qa.md`.
- [ ] **Cero hallazgos CRITICAL/HIGH**: comprueba los recuentos de severidad en el archivo de resultados de QA.
- [ ] **El estado de la sesión es COMPLETED**: el archivo de sesión debe mostrar el estado final.
- [ ] **El feed de actividad muestra el informe final**: la última actividad debe ser el informe de resumen.

---

## Criterios de finalización

El monitoreo del dashboard termina cuando:
1. Todos los agentes generados llegaron a un estado terminal (completado o fallido y gestionado).
2. El ciclo de revisión QA terminó sin problemas bloqueadores.
3. El estado de la sesión refleja el resultado final.
4. Los resultados quedaron registrados en memoria para futuras consultas.

---

## Detalles técnicos

### Dashboard de terminal (oma dashboard terminal)

- **Observación de archivos:** usa [chokidar](https://github.com/paulmillr/chokidar) con `awaitWriteFinish` (umbral de estabilidad de 200ms e intervalo de sondeo de 50ms) para evitar renderizar escrituras parciales.
- **Renderizado:** limpia y vuelve a dibujar toda la terminal en cada evento de cambio de archivo. Usa `picocolors` para la salida de color ANSI y caracteres Unicode de dibujo de cajas para el borde.
- **Directorio de memoria:** se resuelve desde `MEMORIES_DIR`, después desde el argumento CLI del dashboard si se proporciona y, por último, desde `{cwd}/.agents/state/memories`.
- **Cierre ordenado:** captura `SIGINT` y `SIGTERM`, cierra el watcher de chokidar y termina limpiamente.

### Dashboard web (oma dashboard web)

- **Servidor HTTP:** `createServer` de Node.js sirve la página HTML en `/`, la página de recapitulación en `/recap`, el estado JSON en `/api/state` y los datos de recapitulación en `/api/recap`. El servidor se enlaza a `127.0.0.1`.
- **WebSocket:** usa la librería `ws`. Una conexión de origen loopback debe incluir el token del proceso en su query string. Al conectarse, el cliente recibe inmediatamente el estado completo. Después, las actualizaciones se envían como mensajes `{ type: "update", event, file, data }`.
- **Observación de archivos:** usa la misma configuración de chokidar que el dashboard de terminal. Los cambios de archivo activan una función `broadcast()` que construye el estado actual y lo envía a todos los clientes WebSocket conectados.
- **Desduplicación temporal:** las actualizaciones se desduplican durante 100ms para evitar saturar a los clientes cuando se escriben archivos rápidamente (por ejemplo, cuando varios agentes actualizan el progreso a la vez).
- **Reconexión automática:** el cliente del navegador se reconecta con backoff exponencial (1s inicial, multiplicador 1.5x y máximo de 10s) cuando se interrumpe la conexión WebSocket.
- **Puerto:** 9847 de forma predeterminada, configurable mediante la variable de entorno `DASHBOARD_PORT`. Las solicitudes API aceptan `X-OMA-Dashboard-Token` o `?token=...`; los tokens ausentes o no válidos devuelven `401`.
- **Construcción del estado:** la función `buildFullState()` agrega la información de sesión, el task board, el estado de los agentes, los recuentos de turnos y el feed de actividad en un único objeto JSON en cada actualización.
