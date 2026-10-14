---
title: "Guía: Agentes programados"
sidebar_label: Agentes programados
description: "Ejecuta cualquier agente con una programación recurrente o única mediante el programador del sistema (launchd en macOS, systemd en Linux y Task Scheduler en Windows), sin mantener abierto un runtime de proveedor."
---

# Agentes programados

`oma schedule` permite ejecutar cualquier agente según una programación temporal, independientemente del runtime de IA que esté abierto (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode o pi). El programador del sistema activa el trabajo y este llama a `oma agent spawn` sin interfaz usando las credenciales del proveedor que ya están guardadas en el disco.

---

## Cómo funciona

Cuando ejecutas `oma schedule create`, oma:

1. Escribe un registro de trabajo en el manifiesto global, en `~/.oma/schedule/schedules.json`.
2. Registra el trabajo en el programador del sistema (launchd en macOS, systemd --user en Linux o Task Scheduler en Windows). El trabajo del sistema llama a `oma schedule run <id>` en el intervalo cron configurado.
3. Cuando llega la hora, `oma schedule run` busca el trabajo, inyecta las variables de entorno capturadas, llama a `oma agent spawn` y escribe el log de ejecución en `~/.oma/schedule/runs/<id>/<timestamp>.md`.

El manifiesto es la única fuente de verdad (SSOT). El programador del sistema solo ejecuta. Todo el estado —definiciones de trabajos, logs de ejecución y marcas de última activación— vive bajo `~/.oma/schedule/`.

### Solo global por diseño

`oma schedule` es deliberadamente global para el usuario, no por proyecto. Como el programador del sistema ejecuta los trabajos independientemente del directorio de trabajo actual, un registro central es la única SSOT práctica. Cada trabajo registra el proyecto al que pertenece mediante `workspace` y `projectLabel`, de modo que `schedule list` pueda agrupar los trabajos por proyecto aunque el registro sea compartido.

No existe un flag `--global`; los comandos de schedule usan `$OMA_HOME/schedule/`, que por defecto es `~/.oma/schedule/`. Los trabajos registrados en el sistema operativo reciben explícitamente el directorio home resuelto, de modo que abren el mismo registro sin un shell de login. Ejecuta `oma schedule sync` después de mover el home para actualizar los comandos de los trabajos y las rutas de los logs.

### Backends del sistema operativo

| Plataforma | Backend principal | Fallback | stderr de `oma schedule run` |
|---|---|---|---|
| macOS | launchd (plist + `launchctl`) | — | `runs/<id>/stderr.log` |
| Linux | temporizador systemd --user | `crontab` del usuario cuando `systemctl --user` no está disponible | `runs/<id>/stderr.log` (systemd); no se guarda (crontab) |
| Windows | Task Scheduler (`schtasks`) | — | No se guarda |

oma selecciona automáticamente el backend disponible. No tienes que configurarlo manualmente.

---

## Comparación: schedule, ralph y Claude /loop

Estas tres funcionalidades se confunden a veces porque todas implican «volver a ejecutar más tarde». Son conceptos distintos.

| Funcionalidad | Activador | Alcance | ¿Sobrevive al reinicio del proveedor? |
|---|---|---|---|
| `oma schedule` | Basado en tiempo (cron) | Entre proveedores, nivel del sistema operativo | Sí: el programador del sistema se activa aunque no haya un runtime de proveedor abierto |
| `ralph` | Basado en finalización (bucle del hook Stop) | Entre proveedores | Solo mientras la sesión actual esté activa; ralph es un bucle de «seguir hasta terminar», no un temporizador |
| Claude Code `/loop` | Basado en tiempo (cron en proceso) | Solo runtime de Claude | No: solo se activa mientras Claude Code se ejecuta |

Usa `schedule` cuando quieras que un trabajo se ejecute a las 9:00 cada día laborable. Usa `ralph` cuando quieras que un agente siga iterando hasta alcanzar un umbral de calidad. Usa `/loop` solo dentro de Claude Code cuando no necesites portabilidad entre proveedores.

---

## Inicio rápido

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run at the next 15:00 and remove the job after a successful run
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abcdefgh2345
```

`schedule create` muestra el ID del trabajo que necesitan `run` y `delete`:

```text
Scheduled job registered: sch_abcdefgh2345
  Agent:   qa-reviewer
  Cron:    0 9 * * 1-5
  Vendor:  auto
  Project: my-project
  Once:    false
```

Activa un trabajo nuevo una vez a mano para comprobar el prompt y las credenciales del proveedor antes de su primera ejecución programada:

```bash
oma schedule run sch_abcdefgh2345
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
```

---

## Comandos

### schedule create

Registra un trabajo de agente programado.

```bash
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <Nd>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|---|---|---|
| `agent-id` | Sí | Agente que se pasa a `oma agent spawn`: un ID canónico (`orchestrator`, `architecture`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `qa`, `docs`, `tf-infra`, `explore`) o un nombre de definición como `qa-reviewer` o `backend-engineer`. No se valida al registrar el trabajo, así que ejecuta `oma schedule run <id>` una vez después de crearlo. |
| `prompt` | Sí | Descripción de la tarea que se pasa al agente al ejecutarse |

**Opciones:**

| Flag | Descripción |
|---|---|
| `--cron "<expr>"` | Expresión cron de 5 campos (por ejemplo, `"0 9 * * *"` para las 9:00 todos los días). Es mutuamente excluyente con `--every`. |
| `--every "<phrase>"` | Intervalo en lenguaje natural (consulta la tabla siguiente). Es mutuamente excluyente con `--cron`. |
| `--vendor <vendor>` | Sobrescritura del proveedor CLI que se pasa a `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Por defecto, se detecta automáticamente desde `oma-config.yaml`. |
| `-w, --workspace <path>` | Directorio de trabajo del agente en tiempo de ejecución. Por defecto, es el directorio de trabajo actual al registrar el trabajo. |
| `--once` | Modo de una sola ejecución: el trabajo se elimina después de la primera ejecución que termina con código 0. Una ejecución fallida conserva el trabajo, de modo que vuelve a activarse en la siguiente coincidencia de cron. El valor predeterminado es recurrente. |
| `--expires-after <duration>` | Elimina un trabajo recurrente en su primera activación después de esta antigüedad. Usa días completos con unidad, como `30d`; un número sin unidad (`30`) se rechaza. `0` significa indefinido (valor predeterminado). |
| `--env <KEY1,KEY2>` | Captura las variables de entorno nombradas (solo las listadas) en `~/.oma/schedule/env/<id>` (permisos 0600) para inyectarlas al ejecutarse. Los secretos nunca se escriben en el manifiesto. |
| `--dry-run` | Muestra el cron resuelto y cualquier nota de redondeo sin escribir un trabajo del programador, una entrada del manifiesto ni un archivo de entorno. |
| `--accept-rounded` | Se necesita para registrar un intervalo en lenguaje natural después de que OMA lo redondee a un paso que cron pueda expresar. Previsualízalo primero con `--dry-run`. |

Se requiere exactamente uno de `--cron` o `--every`.

#### --every: intervalos en lenguaje natural

`--every` acepta las siguientes formas. oma las analiza como una expresión cron de 5 campos y muestra una nota cuando el intervalo solicitado se redondea al paso cron más cercano que se puede expresar.

| Forma | Ejemplo | Notas |
|---|---|---|
| Unidad compacta | `5m`, `2h`, `1d` | Minuto, hora, día |
| Every + compacta | `every 20m`, `every 2h` | |
| Every + palabra | `every 5 minutes`, `every 2 hours` | Se aceptan unidades en plural |
| Segundos | `30s` | Se eleva al mínimo de 1 minuto; cron no puede expresar intervalos inferiores a un minuto |

Los intervalos no divisibles se redondean al paso limpio más cercano y se muestra una nota. Por ejemplo, `--every 7m` se redondea a `6m` (`*/6`) porque 7 no divide 60.

Previsualiza un intervalo redondeado antes de registrarlo:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Note: Requested every 7m -- 7 is not a divisor of 60; rounded to every 6m (*/6 * * * *).
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Si omites la previsualización, el comando se niega a registrar un intervalo redondeado. Las programaciones usan las reglas de hora local del programador del sistema seleccionado.

**Ejemplos:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

Enumera todos los trabajos programados de todos los proyectos, agrupados por proyecto y con el estado de drift del sistema operativo.

```bash
oma schedule list [--json]
```

**Opciones:**

| Flag | Descripción |
|---|---|
| `--json` | Salida JSON legible por máquinas |

**Estados de drift:**

| Estado | Significado |
|---|---|
| `synced` | El trabajo existe tanto en el manifiesto como en el programador del sistema |
| `stale` | El trabajo está registrado, pero el registro del sistema operativo invoca un comando que el CLI actual ya no acepta (por ejemplo, `schedule:run <id>` escrito antes de la estandarización de las rutas de comandos). Ejecuta `schedule sync` para reescribirlo; `oma update` lo hace automáticamente. |
| `missing-in-os` | El trabajo está en el manifiesto, pero falta en el programador del sistema. Ejecuta `schedule sync` para repararlo. |
| `orphan-in-os` | Existe una programación de agente (`dev.oma.sch_*`) en el programador del sistema, pero no en el manifiesto. Ejecuta `schedule sync --prune` para eliminarla. |

Los servicios internos como `dev.oma.agentmemory`, `dev.oma.serena-daemon-gc` y `dev.oma.serena-reaper` tienen sus propios gestores de servicio. `schedule list` los excluye de la detección de huérfanos y `schedule sync --prune` los conserva.

**Salida (texto):**

Los trabajos se agrupan por etiqueta de proyecto. Cada fila muestra: ID, expresión cron, agente, proveedor, backend del sistema operativo, si es recurrente y estado de drift.

```text
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abcdefgh2345   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_mnopqrst4567   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

Los trabajos creados por `oma harness evolution enable` aparecen con el agente `__builtin__`; ejecutan `oma harness evolution run --scheduled` en ese proyecto. Gestiónalos con `oma harness evolution enable` y `disable` (consulta [Evolución del harness del proyecto](./harness-evolution.md)) en lugar de `oma schedule delete`. `oma schedule builtin-evolution-add` y `oma schedule inspect`, que aparecen en `oma schedule --help`, son helpers internos de ese comando.

**Ejemplos:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Elimina un trabajo programado tanto del manifiesto como del programador del sistema.

```bash
oma schedule delete <id>
```

**Argumentos:**

| Argumento | Obligatorio | Descripción |
|---|---|---|
| `id` | Sí | ID del trabajo procedente de `schedule list` (formato: `sch_<base32-12>`) |

Si falla la eliminación del programador del sistema (por ejemplo, si el backend no está disponible temporalmente), se muestra una advertencia, pero la entrada del manifiesto se elimina igualmente.

**Ejemplo:**

```bash
oma schedule delete sch_abcdefgh2345
```

---

### schedule run

Ejecuta un trabajo programado por ID. El programador del sistema lo invoca cuando llega la hora y normalmente no se llama a mano.

```bash
oma schedule run <id>
```

El wrapper:
1. Busca el ID del trabajo en el manifiesto. Termina con un código distinto de cero si no lo encuentra. Si ya transcurrió `--expires-after`, elimina el trabajo en lugar de ejecutarlo.
2. Carga las variables de entorno capturadas desde `~/.oma/schedule/env/<id>` (si existe) y las inyecta en el proceso creado.
3. Llama a `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Escribe el resultado de la ejecución en `~/.oma/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Actualiza `lastFiredAt` en el manifiesto.
6. Si se definió `--once` y el agente terminó con código 0, elimina el trabajo (manifiesto y programador del sistema).

**Los fallos de autenticación son explícitos:** si las credenciales del proveedor han caducado, el trabajo termina con un código distinto de cero y escribe `re-auth required: <vendor>` en stderr (se guarda en `runs/<id>/stderr.log` con launchd y systemd). El proveedor aparece como `unknown` cuando el trabajo se creó sin `--vendor`. No termina silenciosamente como correcto.

Puedes invocar `schedule run` manualmente para depurar:

```bash
oma schedule run sch_abcdefgh2345
```

---

### schedule sync

Vuelve a sincronizar el manifiesto con el programador del sistema. Úsalo después de migraciones del sistema, reinicios del programador o para reparar drift.

```bash
oma schedule sync [--prune]
```

**Opciones:**

| Flag | Descripción |
|---|---|
| `--prune` | Elimina también los trabajos que están en el programador del sistema pero no en el manifiesto (estado orphan-in-os). Sin `--prune`, los huérfanos se informan, pero no se eliminan. |

**Ejemplos:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` ejecuta la misma reconciliación (sin `--prune`) después de cada actualización, de modo que una versión del CLI que cambie la sintaxis del comando `oma schedule run` no pueda dejar los registros existentes del sistema operativo apuntando a un comando que el nuevo binario rechaza. Los registros escritos por versiones anteriores con `oma schedule:run <id>` también siguen funcionando: esa sintaxis legacy se sigue aceptando para los trabajos invocados por el sistema operativo.

---

## Diseño de almacenamiento

Todo el estado de schedule vive bajo `~/.oma/schedule/`:

```text
~/.oma/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abcdefgh2345    # Captured env vars for this job (permissions 0600)
├── running/                # Lease files while a job runs
└── runs/
    └── sch_abcdefgh2345/
        ├── 2026-06-16T09-00-00-000Z.md   # One log per fire: session, exit code, agent output
        ├── stdout.log                    # launchd and systemd only: stdout of oma schedule run
        └── stderr.log                    # launchd and systemd only: stderr, e.g. re-auth required
```

Permisos:
- Directorio `~/.oma/schedule/`: `0700`
- Archivos `schedules.json` y `env/<id>`: `0600`

**Los secretos nunca se escriben en `schedules.json`.** El flag `--env` escribe solo las claves nombradas en un archivo separado `0600` bajo `env/`. Solo se capturan las claves indicadas explícitamente; nunca se almacena un volcado completo del entorno.

---

## Notas de seguridad

- `schedule create` es una operación de ruta confiable: solo el usuario autenticado puede registrar trabajos. No expongas `schedule create` a entradas externas o no confiables. Un prompt programado es código arbitrario que se ejecuta en el futuro.
- `schedule run` solo ejecuta trabajos cuyo ID existe en el manifiesto. No es posible inyectar argv arbitrario.
- Las credenciales del proveedor en disco (por ejemplo, `~/.codex/auth.json`, `~/.grok/auth.json`) se usan tal cual para el despacho sin interfaz. No se aplica autenticación adicional. Si caducan, el trabajo falla de forma explícita.

---

## Consejos y solución de problemas

**Comprobar los logs de ejecución:**

```bash
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
cat ~/.oma/schedule/runs/sch_abcdefgh2345/2026-06-16T09-00-00-000Z.md
```

**El trabajo muestra `missing-in-os` después de reiniciar el sistema:**

Ejecuta `oma schedule sync` para volver a registrar todos los trabajos del manifiesto en el programador del sistema.

**El trabajo se activó, pero las credenciales del proveedor habían caducado:**

En macOS (launchd) y Linux (systemd), busca `re-auth required: <vendor>` en `~/.oma/schedule/runs/<id>/stderr.log`. El log de ejecución `<timestamp>.md` contiene la salida propia del agente y el código de salida. Los backends crontab y Task Scheduler no conservan este stderr; ejecuta `oma schedule run <id>` en una terminal para verlo. Vuelve a autenticarte con el CLI del proveedor (por ejemplo, `claude login`, `codex login`) y ejecuta `oma schedule run <id>` manualmente para verificarlo antes de la siguiente activación programada.

**Cambiar un trabajo:**

No existe `schedule update`. Crea primero el reemplazo y después elimina el ID antiguo con `oma schedule delete <old-id>`. `--env` copia los valores de las variables al crear el trabajo, así que, después de rotar un secreto, vuelve a crear el trabajo con el nuevo valor exportado en tu shell.

**`--every` redondeó mi intervalo:**

Cuando oma redondea el intervalo, muestra una nota que explica el cambio. Si necesitas un intervalo exacto que no divida limpiamente 60 minutos o 24 horas, usa `--cron` con una expresión explícita de 5 campos.

**Eliminar todos los trabajos de un proyecto:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Compatibilidad con Windows:**

En Windows, oma usa `schtasks` para registrar trabajos. Los registros de Task Scheduler no se pueden leer de vuelta, así que `schedule list` informa de todos los trabajos registrados como `stale`, y `schedule sync` (que también ejecuta `oma update`) los vuelve a registrar todos. En Windows, considera `stale` como algo esperado; `missing-in-os` y `orphan-in-os` siguen indicando drift.

Ten en cuenta que `schtasks` no puede expresar todas las formas de cron. Las formas compatibles son: `*/N * * * *` (cada N minutos), `M * * * *` (cada hora en :M), `M H * * *` (diario), `M H * * D` (semanal; `D` puede ser un solo día, un rango como `1-5` o una lista separada por comas como `1,3,5`) y `M H D * *` (mensual). Las demás expresiones (por ejemplo, una lista separada por comas en el campo de minutos) se rechazan al ejecutar `schedule create` en Windows.

`--every` solo produce una forma compatible para intervalos de minutos que dividen 60 (por ejemplo `--every 5m` o `--every 30m`). Los intervalos de horas y días (`--every 2h`, `--every "every 6 hours"`, `--every 1d`) y los pasos de horas como `--cron "0 */4 * * *"` producen `0 */N * * *` o `0 0 */N * *`, que Task Scheduler rechaza en `schedule create`. En Windows, usa una hora fija, por ejemplo `--cron "0 9 * * 1-5"`.

---

## Consulta también

- [Evolución del harness del proyecto](./harness-evolution.md): el trabajo integrado `__builtin__` que ejecuta la mejora de skills con presupuesto.
- [Evaluación del harness](./harness-eval.md): cómo encajan entre sí los comandos de evaluación.
