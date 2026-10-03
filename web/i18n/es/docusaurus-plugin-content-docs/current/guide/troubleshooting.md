---
title: "Guía: Solución de problemas"
sidebar_label: Solución de problemas
description: "Diagnostica fallos de instalación, configuración, proveedores, dashboard, programación, evaluación y resultados de agentes con comprobaciones respaldadas por el código fuente."
---

# Solución de problemas

Comienza con un diagnóstico legible por máquina desde la raíz del proyecto o de la instalación:

```bash
oma doctor --json
```

El comando debe terminar con un JSON que identifique la instalación, el proveedor, la configuración y los hallazgos de integración. Añade `--profile` cuando el problema esté relacionado con la resolución del modelo o de un agente. Conserva el JSON al informar de un problema: contiene las rutas y comprobaciones seleccionadas sin exigir una suposición en prosa.

## La CLI o la instalación usan archivos equivocados

Comprueba el contexto explícitamente:

```bash
oma doctor --json
oma doctor --profile
```

Los comandos del proyecto leen el `.agents/oma-config.cue` o `.agents/oma-config.yaml` más cercano y después una superposición local. Un comando global lee la raíz de instalación de HOME. Si existen un archivo CUE local y uno YAML local, elimina uno de ellos. Si un archivo local tiene un formato incorrecto, OMA se detiene en lugar de ignorar la sobreescritura en silencio. Consulta la [referencia de configuración](/docs/guide/configuration-reference).

Después de una actualización, inspecciona la configuración y las rutas generadas:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` mantiene la ejecución sin interacción. Si la configuración del usuario se reemplazó inesperadamente, comprueba si se usó `--force`: las actualizaciones normales conservan la configuración propiedad del usuario, mientras que el modo forzado puede reemplazarla.

## Una instalación o actualización no puede descargar la versión

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` y la reparación de `oma doctor` descargan la versión que indica `prompt-manifest.json` en `main`. Primero prueban el asset `agent-skills.tar.gz` de la release de GitHub `cli-v<version>`, verificado con su archivo `.sha256`; después, el archivo fuente de esa etiqueta y, por último, un clon superficial de la etiqueta. Una discrepancia de checksum, o un payload cuyo `.agents/skills/_version.json` indica una versión distinta, detiene la ejecución en lugar de probar otra fuente.
<!-- oma-docs:ignore-end -->

Justo después de crear una release, el manifiesto puede indicar una versión cuyos assets aún se están publicando; espera unos minutos y reintenta. Para instalar a propósito contenido sin publicar de la rama `main`, actívalo expresamente en esa ejecución:

```bash
OMA_UPDATE_CHANNEL=main oma update
```

La ejecución imprime una advertencia: el contenido de la rama main no es una release etiquetada ni está verificado por checksum.

## Un proveedor no se inicia

Ejecuta la comprobación de autenticación del proveedor y después inspecciona el perfil resuelto por OMA:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Usa el comando exacto del proveedor que muestra `oma doctor` para volver a autenticarte. Una sobreescritura del modelo debe usar el formato `owner/model` aceptado por el esquema, y su proveedor debe admitir el transporte CLI seleccionado. Para `model_preset: free`, comprueba la URL de gateway y el modelo resueltos con `oma doctor --profile` y verifica que la variable de entorno de la clave de API configurada contenga una clave. Si omites el mapa `free`, los valores predeterminados son `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` y el modelo `auto`; nunca pongas la clave de API en YAML.

Si un proceso hijo termina sin un artefacto de resultado, inspecciona el directorio de ejecución y el estado del padre. Un hijo generado recibe la identidad de la ejecución y las instrucciones para informar del resultado, escribe la declaración de resultados (claim) en la ruta inyectada y comunica sus artefactos; el padre finaliza el registro de ejecución gestionado (receipt) después de capturar el código de salida. Los hijos de solo lectura devuelven `OMA_RESULT_JSON: ...`; esa línea se registra como una inspección y no satisface la verificación ejecutable.

## Los hooks están instalados, pero no se ejecutan

En Codex, inspecciona el archivo generado y sigue el flujo de confianza de una sola vez:

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Ejecuta `/hooks` después de la primera instalación y después de una actualización que cambie una cadena de comando. Los subprocesos de Codex generados por OMA pasan la opción de bypass para su propia invocación administrada; eso no confía en un hook dentro de una sesión de Codex que inicies tú. Consulta [Confianza en hooks de Codex](/docs/guide/codex-hook-trust).

## El dashboard está vacío o desconectado

Inicia el dashboard de terminal desde el proyecto que contiene los archivos de sesión:

```bash
oma dashboard terminal
```

Lee `.agents/state/memories/` de forma predeterminada. Define `MEMORIES_DIR` cuando el estado esté en otro lugar. El dashboard web se enlaza a loopback e imprime una URL con token:

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Abre la URL exacta que imprime el comando; la API web y WebSocket requieren el token del dashboard. Si el puerto está ocupado, usa otro `DASHBOARD_PORT`. Si no aparece ningún agente, comprueba que el flujo de trabajo haya escrito archivos de sesión, tarea y progreso en el directorio de memoria seleccionado. El dashboard no busca automáticamente el directorio heredado `.serena/memories/`.

## Falta una programación o no se ejecutó

Inspecciona el manifiesto y el estado del planificador:

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` informa de `synced`, `stale`, `missing-in-os` y `orphan-in-os`. `schedule sync` restaura los trabajos que faltan y reescribe los registros obsoletos del sistema operativo (una línea `Unknown command: schedule:run` en el registro de ejecución indica que el registro del sistema operativo es anterior al cambio de nombre del comando; `oma update` lo vuelve a sincronizar automáticamente); añade `--prune` solo cuando deban eliminarse los trabajos huérfanos del sistema operativo. Una vista previa creada con `--dry-run` no registra ningún trabajo. Para un intervalo recurrente, acepta el redondeo de OMA con `--accept-rounded` después de revisar la vista previa. Comprueba el registro de ejecución en `~/.agents/schedule/runs/<id>/` para detectar una salida de proveedor distinta de cero o `re-auth required`.

## La evaluación u optimización no informa de cobertura

La evaluación y la optimización de skills requieren al menos cinco fixtures de tareas en `.agents/eval/<skill>/`. En modo simulado, la procedencia de los rollouts registrados debe coincidir con la skill actual y con los hashes de los fixtures. Vuelve a registrar con el modo live cuando cambie el fixture o la skill; no copies un archivo `_rollouts` antiguo a un directorio de una skill nueva y lo trates como evidencia actual.

Para la optimización, conserva el `--dry-run` predeterminado mientras revisas el diff propuesto. `--apply` requiere un resultado de validación positivo y estricto, además de una división de prueba propiedad del runner que haya pasado; una skill propiedad de OMA puede sobrescribirse con una actualización posterior de `oma update`.

## Un resultado no puede finalizarse ni reanudarse

Inspecciona los archivos de ejecución y del plan:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Ejecuta `oma agent verify RUN_ID --required` antes de finalizar. Una declaración de resultados completada con un registro de verificación fallido, entradas modificadas, artefactos ausentes, elementos sin resolver o un contrato de tarea cambiado se rechaza o se degrada. La reanudación solo es automática para tareas con `retry_policy: "safe"`, un prompt reproducible y reintentos disponibles. Un proceso activo o un intento nativo interrumpido sin un resultado parcial o fallido claro se deja intacto para evitar trabajo duplicado. Consulta [Resultados y reanudación de agentes](/docs/guide/agent-results-and-resume).

Al pedir ayuda, incluye la salida relevante de `oma doctor --json`, el comando, el ID de sesión/ejecución y el mensaje sin resolver. No incluyas credenciales ni el contenido de archivos que contengan secretos.
