---
title: "Guía: Solución de problemas"
sidebar_label: Solución de problemas
description: "Diagnostica fallos de instalación, configuración, proveedores, hooks, dashboard, programación, evaluación y resultados de agentes por síntoma o por el mensaje de error exacto, con comprobaciones y soluciones respaldadas por el código fuente."
---

# Solución de problemas

Comienza con un diagnóstico legible por máquina desde la raíz del proyecto o de la instalación:

```bash
oma doctor --json
```

El comando debe terminar con un JSON que identifique la instalación, el proveedor, la configuración y los hallazgos de integración. Añade `--profile` cuando el problema esté relacionado con la resolución del modelo o de un agente. Conserva el JSON al informar de un problema: contiene las rutas y comprobaciones seleccionadas sin exigir una suposición en prosa.

## Encuentra tu síntoma {#find-your-symptom}

| Síntoma | Ir a |
|---------|-------|
| OMA lee la configuración equivocada, o una actualización reemplazó tus ajustes | [La CLI o la instalación usan archivos equivocados](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` u `oma update` no puede descargar una versión | [Una instalación o actualización no puede descargar la versión](#an-install-or-update-cannot-download-the-release) |
| Una CLI o un modelo de un proveedor no se inicia | [Un proveedor no se inicia](#a-vendor-does-not-start) |
| Los hooks están instalados, pero no ocurre nada | [Los hooks están instalados, pero no se ejecutan](#hooks-are-installed-but-do-not-run) |
| El dashboard está vacío, desconectado o no se inicia | [El dashboard está vacío o desconectado](#the-dashboard-is-empty-or-disconnected) |
| Falta un trabajo programado o falló | [Falta una programación o no se ejecutó](#a-schedule-is-missing-or-did-not-run) |
| La evaluación u optimización de skills no informa de cobertura | [La evaluación u optimización no informa de cobertura](#evaluation-or-optimization-reports-no-coverage) |
| Una ejecución de agente no se verifica, no termina o no se reanuda | [Un resultado no puede finalizarse ni reanudarse](#a-result-cannot-finish-or-resume) |
| La CLI imprimió un mensaje de error | [Encuentra tu error](#find-your-error) |

## Encuentra tu error {#find-your-error}

La CLI imprime cada uno de los mensajes siguientes. Busca el que coincida con el inicio del mensaje.

| Mensaje | Causa | Solución |
|---------|-------|-----|
| `Unknown plan task: <id>` | El ID de tarea (de `--task-id` o, de forma predeterminada, el ID del agente) no es un `id` de tarea en `.agents/results/plan-<session>.json` | Pasa `--task-id` con un ID de tarea del plan |
| `Plan is immutable after dispatch; ...` | El plan de la sesión cambió después de su primer despacho | Restaura el plan, o guarda el plan modificado con un nuevo ID de sesión (y un nuevo `lineage_id` si definiste uno) |
| `Task acceptance contract changed before dispatch` o `Plan changed before dispatch` | Se editó el plan mientras se iniciaba una ejecución | Reintenta cuando el plan sea estable |
| `Attempt limit reached for workflow lineage and logical goal` | Se agotó el `max_attempts` del plan (3 de forma predeterminada, incluido el primer intento) | Inspecciona los intentos fallidos antes de planificar otro |
| `Cannot verify a finished run; start a new run` | `oma agent verify` se ejecutó después de que terminara la ejecución | Inicia una nueva ejecución con `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` no recibió ningún modo de verificación, o recibió más de uno | Usa exactamente uno de `--required`, `--affected PATH...` o `-- <argv>` |
| `No complete test selection for affected paths: ...` | El grafo no tiene una selección de pruebas completa para esas rutas | Usa `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | Se llamó a `oma agent finish` sobre una ejecución iniciada por `oma agent spawn` o `parallel` | Escribe la declaración de resultados (claim) en la ruta inyectada; el padre finaliza la ejecución |
| `Resume requires a session plan with task contracts` | La sesión no tiene archivo de plan | La reanudación solo funciona en sesiones basadas en un plan; vuelve a generar la tarea en su lugar |
| `A resume coordinator already owns this session` | Hay otro `oma agent resume` en curso para la sesión, o su lease procede de otro host | Espera a que termine la otra reanudación; un lease que dejó un proceso muerto en el mismo host se recupera automáticamente |
| `No graph-backed context found for <agent>` | No existe contexto de grafo para ese agente | Corrige la definición de la tarea, o continúa con la ruta de búsqueda nativa documentada del proyecto |
| `Dashboard failed: port 9847 is already in use. ...` | Otro proceso ocupa el puerto del dashboard | `DASHBOARD_PORT=8080 oma dashboard web`, o detén el otro proceso |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` no es un entero entre 1 y 65535 | Define un puerto válido, o quita la variable para usar 9847 |
| `Removed option <old>. Use <new>.` | El comando usó una forma de opción que se eliminó | Usa la opción que indica el mensaje |
| `Unknown command: ... Use oma --help.` | La ruta del comando se eliminó o se renombró | Ejecuta `oma --help` u `oma describe` para ver las rutas actuales |
| `oma agent spawn` termina con el código 3 | El proveedor terminó con 0, pero la ejecución no acabó en `completed` | Lee `unresolved` en el registro de ejecución; consulta [Resultados y reanudación de agentes](./agent-results-and-resume.md) |

## La CLI o la instalación usan archivos equivocados {#the-cli-or-install-is-using-the-wrong-files}

Comprueba el contexto explícitamente:

```bash
oma doctor --json
oma doctor --profile
```

| Síntoma | Causa | Solución |
|---------|-------|-----|
| Se ignora un ajuste, o prevalece un valor global predeterminado | Los comandos leen los valores globales predeterminados de `$OMA_HOME/.agents/` (de forma predeterminada, `~/.oma/.agents/`), después la configuración compartida del proyecto más cercano y una superposición local. Las raíces de proyecto de distintos ancestros no se combinan | Comprueba qué rutas de configuración seleccionó `oma doctor --json` y edita el archivo que realmente se lee |
| OMA se detiene al cargar la configuración | Existen a la vez un archivo CUE local y uno YAML local, o un archivo local tiene un formato incorrecto. OMA se detiene en lugar de ignorar la sobreescritura en silencio | Elimina uno de los dos archivos locales, o corrige el que tiene el formato incorrecto |
| La configuración del usuario se reemplazó después de una actualización | La actualización se ejecutó con `--force`. Las actualizaciones normales conservan la configuración propiedad del usuario; el modo forzado puede reemplazarla | Actualiza sin `--force` y después inspecciona la configuración y las rutas generadas |
| Se ignoran los ajustes de `oma-config.yaml`, y `language` o `timezone` muestran valores de la plantilla | Un `oma update` antiguo copió el `oma-config.cue` incluido junto a su YAML. CUE tiene prioridad sobre YAML, así que prevalecieron los valores de la plantilla | `oma update` elimina esa copia mientras siga siendo una plantilla sin modificar y la guarda en `.agents/backup/stray-shared-config/`. Si la editó, conserve un solo archivo de configuración compartida y elimine el otro |
| `oma doctor` advierte sobre `timezone: Asia/Seoul` | Las plantillas antiguas incluían `Asia/Seoul` como zona horaria predeterminada, y su sistema usa otra | Elimine la línea `timezone` para seguir la zona horaria del sistema. Para conservar `Asia/Seoul`, defínala en su configuración local (`oma-config.local.yaml` o `.local.cue`) |

Consulta la [referencia de configuración](/docs/guide/configuration-reference) para ver el orden de los archivos. Después de una actualización, inspecciona la configuración y las rutas generadas:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` mantiene la ejecución sin interacción.

## Una instalación o actualización no puede descargar la versión {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` y la reparación de `oma doctor` descargan la versión que indica `prompt-manifest.json` en `main`. Primero prueban el asset `agent-skills.tar.gz` de la release de GitHub `cli-v<version>`, verificado con su archivo `.sha256`; después, el archivo fuente de esa etiqueta y, por último, un clon superficial de la etiqueta. Una discrepancia de checksum, o un payload cuyo `.agents/skills/_version.json` indica una versión distinta, detiene la ejecución en lugar de probar otra fuente.
<!-- oma-docs:ignore-end -->

| Síntoma | Causa | Solución |
|---------|-------|-----|
| La descarga falla justo después de una release | El manifiesto indica una versión cuyos assets aún se están publicando | Espera unos minutos y reintenta |
| Necesitas contenido sin publicar de `main` | Las releases solo instalan contenido etiquetado | Actívalo expresamente para una ejecución con `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

La ejecución imprime una advertencia: el contenido de la rama main no es una release etiquetada ni está verificado por checksum.

## Un proveedor no se inicia {#a-vendor-does-not-start}

Ejecuta la comprobación de autenticación del proveedor y después inspecciona el perfil resuelto por OMA:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Síntoma | Causa | Solución |
|---------|-------|-----|
| La CLI del proveedor no está autenticada | La sesión del proveedor caducó o nunca se configuró | Vuelve a autenticarte con el comando exacto del proveedor que muestra `oma doctor` |
| Se rechaza una sobreescritura del modelo | La sobreescritura no usa el formato `owner/model` que acepta el esquema, o su proveedor no admite el transporte CLI seleccionado | Usa el formato `owner/model` con un proveedor que admita el transporte |
| `model_preset: free` no puede llegar a su gateway | La URL de gateway o el modelo resueltos son incorrectos, o la variable de entorno de la clave de API configurada está vacía | Comprueba la URL de gateway y el modelo con `oma doctor --profile` y después define la clave en la variable de entorno |
| Un proceso hijo termina sin artefacto de resultado | El hijo no escribió su declaración de resultados (claim) en la ruta inyectada | Inspecciona el directorio de ejecución y el estado del padre (ver más abajo) |

Si omites el mapa `free`, los valores predeterminados son `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` y el modelo `auto`; nunca pongas la clave de API en YAML.

Un hijo generado recibe la identidad de la ejecución y las instrucciones para informar del resultado, escribe la declaración de resultados (claim) en la ruta inyectada y comunica sus artefactos; el padre finaliza el registro de ejecución gestionado (receipt) después de capturar el código de salida. Los hijos de solo lectura devuelven `OMA_RESULT_JSON: ...`; esa línea se registra como una inspección y no satisface la verificación ejecutable.

## Los hooks están instalados, pero no se ejecutan {#hooks-are-installed-but-do-not-run}

| Síntoma | Causa | Solución |
|---------|-------|-----|
| Codex no ejecuta los hooks de OMA | Los hooks aún no son de confianza: es la primera instalación, o una actualización cambió la cadena de comando de un hook | Inspecciona `.codex/hooks.json` y después ejecuta `/hooks` dentro de Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Los subprocesos de Codex generados por OMA pasan la opción de bypass para su propia invocación administrada; eso no confía en un hook dentro de una sesión de Codex que inicies tú. Consulta [Confianza en hooks de Codex](/docs/guide/codex-hook-trust).

## El dashboard está vacío o desconectado {#the-dashboard-is-empty-or-disconnected}

Inicia el dashboard de terminal desde el proyecto que contiene los archivos de sesión:

```bash
oma dashboard terminal
```

| Síntoma | Causa | Solución |
|---------|-------|-----|
| `No agents detected yet` | El flujo de trabajo aún no ha escrito archivos de sesión, tarea o progreso en el directorio de memoria observado, o el dashboard observa otro directorio | Espera al primer archivo de progreso; ejecuta desde la raíz del proyecto, pasa `--project-root <path>` o define `MEMORIES_DIR` |
| No aparecen los archivos del directorio heredado `.serena/memories/` | El dashboard lee `.agents/state/memories/` y no busca en el directorio heredado | Define `MEMORIES_DIR` con el directorio que contiene los archivos |
| `oma dashboard web` termina con `port 9847 is already in use` | Otro proceso ocupa el puerto | Usa otro `DASHBOARD_PORT` |
| La página web sigue en Disconnected después de reiniciar el dashboard | Cada inicio crea un nuevo token de acceso, y la pestaña abierta conserva el anterior | Recarga la página |

El dashboard web se enlaza a loopback e imprime su URL. Ábrela; la página lleva su propio token para la API web y WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Encontrarás más señales del dashboard en [Monitorización del dashboard](./dashboard-monitoring.md#troubleshooting-runbook).

## Falta una programación o no se ejecutó {#a-schedule-is-missing-or-did-not-run}

Inspecciona el manifiesto y el estado del planificador. Los dos primeros comandos son de solo lectura; los dos últimos cambian el estado:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Síntoma | Causa | Solución |
|---------|-------|-----|
| `schedule list` muestra `missing-in-os` o `stale` | Falta el registro en el sistema operativo o está desactualizado | `oma schedule sync` |
| El registro de ejecución muestra `Unknown command: schedule:run` | El registro es anterior al cambio de nombre del comando | `oma update` lo vuelve a sincronizar automáticamente; `oma schedule sync` también lo reescribe |
| `schedule list` muestra `orphan-in-os` | Un trabajo del sistema operativo no tiene entrada en el manifiesto | `oma schedule sync --prune`, solo cuando deban eliminarse los trabajos huérfanos |
| Una programación creada nunca se registró | Se creó con `--dry-run`, que solo muestra una vista previa | Vuelve a crearla sin `--dry-run` |
| No se registró un intervalo recurrente | El intervalo necesita redondeo | Revisa la vista previa y después acepta el redondeo con `--accept-rounded` |
| El trabajo se ejecutó, pero falló | El proveedor terminó con un código distinto de cero, o el registro indica `re-auth required` | Comprueba el registro de ejecución en `~/.oma/schedule/runs/<id>/` y vuelve a autenticar el proveedor |

## La evaluación u optimización no informa de cobertura {#evaluation-or-optimization-reports-no-coverage}

| Síntoma | Causa | Solución |
|---------|-------|-----|
| La evaluación u optimización de skills no informa de cobertura | Hay menos de cinco fixtures en `.agents/eval/<skill>/` | Añade fixtures hasta tener al menos cinco |
| El modo simulado rechaza los rollouts registrados | La procedencia de los rollouts registrados no coincide con la skill actual ni con los hashes de los fixtures | Vuelve a registrar con el modo live; no copies un archivo `_rollouts` antiguo a un directorio de una skill nueva ni lo trates como evidencia actual |
| `--apply` se niega a escribir | `--apply` requiere un resultado de validación positivo y estricto, además de una división de prueba propiedad del runner que haya pasado | Conserva el `--dry-run` predeterminado mientras revisas el diff propuesto, y corrige primero la validación fallida |

Una skill propiedad de OMA modificada por `--apply` puede sobrescribirse con un `oma update` posterior.

## Un resultado no puede finalizarse ni reanudarse {#a-result-cannot-finish-or-resume}

Inspecciona los archivos de ejecución y del plan:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Síntoma | Causa | Solución |
|---------|-------|-----|
| Una declaración de resultados completada se rechaza o se degrada | Un registro de verificación (receipt) fallido, entradas modificadas, artefactos ausentes, elementos sin resolver o un contrato de tarea cambiado | Ejecuta `oma agent verify RUN_ID --required` antes de finalizar y corrige lo que informe el registro de verificación |
| La reanudación deja una tarea en `blocked` | La reanudación automática necesita `retry_policy: "safe"`, un prompt reproducible e intentos disponibles | Lee el motivo en el informe de dry-run. El plan queda congelado tras su primer despacho, así que define `retry_policy` en el plan de una nueva sesión o vuelve a ejecutar la tarea manualmente |
| La reanudación no reintenta una tarea | Un proceso activo, o un intento nativo interrumpido sin un resultado parcial o fallido claro, se deja intacto para evitar trabajo duplicado | Espera al proceso activo, o finaliza primero el intento nativo |

Consulta [Resultados y reanudación de agentes](./agent-results-and-resume.md) para ver el ciclo de vida completo.

## Pedir ayuda {#ask-for-help}

Al pedir ayuda, incluye la salida relevante de `oma doctor --json`, el comando, el ID de sesión/ejecución y el mensaje sin resolver. No incluyas credenciales ni el contenido de archivos que contengan secretos. Abre una incidencia en [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## Ver también {#see-also}

- [Uso de OMA](./usage.md#troubleshooting): problemas de configuración inicial, como skills o CLI ausentes y conflictos del espacio de trabajo
- [Monitorización del dashboard](./dashboard-monitoring.md#troubleshooting-runbook): señales de dashboard atascado, caído o desconectado
- [Resultados y reanudación de agentes](./agent-results-and-resume.md): registros de ejecución, declaraciones de resultados y recuperación
- [Glosario](../getting-started/glossary.md): términos como [registro de ejecución y declaración de resultados](../getting-started/glossary.md#run-record-and-claim)
