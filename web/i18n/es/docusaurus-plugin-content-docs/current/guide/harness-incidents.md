---
title: "Casos de regresión de incidentes"
sidebar_label: Casos de regresión de incidentes
description: Captura un fallo observado de un agente, preserva su evidencia y evalúa un harness candidato contra un contrato de regresión explícito.
---

# Casos de regresión de incidentes

`oma harness incident` conecta un fallo observado con un caso de regresión y con la evaluación del candidato que lo sigue. Registra las observaciones por separado de las hipótesis causales. Un proceso fallido por sí solo no establece que el modelo causara el incidente.

## Buscar candidatos

```bash
oma harness incident scan            # failed/blocked/partial runs with no captured incident
oma harness incident scan --json
oma harness incident scan --skeleton <run-id> > incidents/run-failure.json
```

El análisis lee `.agents/state/agent-runs/`, conserva las ejecuciones cuyo estado es `failed`, `blocked` o `partial` y descarta cualquier ejecución a la que un incidente ya capturado haga referencia mediante `source.runId`. `--skeleton` imprime la especificación de una ejecución con el id, el agente, la ejecución de origen, el fallo observado, el código de salida y, cuando el runner lo conservó, el final de la salida del agente; `expected_checks` se deja como `TODO` porque el comportamiento correcto es una decisión que el análisis no puede tomar. `oma agent spawn` y `oma agent parallel` conservan los últimos 64 KiB del registro de cada ejecución como `.agents/state/agent-runs/<run-id>.output.txt` y lo referencian desde el registro de ejecución, de modo que `capture --run` importa esa salida como observación cuando la especificación no incluye ninguna y `incident promote` puede validar contra ella la fixture derivada. Rellénala y después captura con `--run <run-id>` para que se conserven la identidad de la ejecución y la huella del workspace.

## Capturar una ejecución fallida automáticamente

```bash
oma harness feedback --scan-runs            # capture, promote, report
oma harness feedback --scan-runs --live     # and optimize the affected skills
```

Una ejecución fallida, bloqueada o parcial cuya tarea tenía un contrato no necesita ninguna especificación escrita a mano. El comportamiento esperado son los criterios de aceptación del contrato, decididos antes de la ejecución; el conjunto no cumplido son los criterios cubiertos por un registro de verificación fallido, o todos los criterios cuando la ejecución nunca llegó a verificarse. El opt-agent reescribe los criterios no cumplidos como una rúbrica de juez (`PASS only if …`), el juez califica con esa rúbrica la salida conservada de la propia ejecución, y el incidente solo se captura cuando esa salida falla: una rúbrica que el fallo supera no ha capturado el fallo. La especificación se escribe en `.agents/results/incidents/_specs/<id>.json`, se captura con la identidad de la ejecución y lleva la rúbrica como una comprobación de aceptación `output_judge`. Las ejecuciones sin una salida conservada, sin prompt o sin contrato se listan como no capturables junto con el motivo.

`output_judge` es un contrato graduado. El evaluador mecánico del harness lo informa como no evaluado; su propósito es la fixture de regresión de skill que `incident promote` deriva de ese contrato con la misma rúbrica.

## Capturar un incidente

Guarda una especificación JSON dentro del proyecto:

```json
{
  "schema_version": 1,
  "id": "incomplete-result",
  "summary": "The agent reported success while the result remained incomplete",
  "prompt": "Complete the task and update result.json",
  "agent": "backend",
  "observed": {
    "failure": "result.json still contained complete=false",
    "output": "success",
    "exit_code": 0
  },
  "initial_workspace": "initial",
  "expected_checks": [
    {
      "type": "file_json_equals",
      "path": "result.json",
      "pointer": "/complete",
      "value": true
    }
  ],
  "evidence_files": ["original-output.txt"],
  "dependencies": []
}
```

`initial_workspace`, `evidence_files` y las rutas de las fixtures de dependencias son relativas al archivo de especificación. La ruta `checker` de una comprobación de comando es relativa al proyecto. La sintaxis de las comprobaciones coincide con [Evaluación del harness](./harness-eval.md). El directorio inicial debe ser una fixture de tarea previa a la ejecución proporcionada por ti y sin archivos de instrucciones de OMA ni del proveedor; el harness que se evalúa se inyecta por separado.

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run` hace referencia a un `.agents/state/agent-runs/<run-id>.json` existente. Conserva la identidad de ejecución y de sesión, el proveedor, el estado y la huella original del workspace. Un prompt proporcionado tiene prioridad sobre el prompt registrado en la ejecución. `source.trace_id` puede enlazar un incidente reportado con una traza externa sin obtenerla ni subirla.

El manifiesto capturado se encuentra en `.agents/results/incidents/<id>/incident.json`. Incluye la instantánea inicial cuando se proporciona, los hashes de la evidencia fuente y de los archivos del comprobador, las comprobaciones de aceptación, las limitaciones y un hash del manifiesto. No se pueden sobrescribir los IDs existentes. El texto de observación sensible se suprime; la supresión se informa como un límite de la reproducción exacta. La recopilación de instantáneas rechaza los archivos no admitidos y tiene límites de archivos, cantidad y tamaño total. Las referencias de evidencia conservan hashes y rutas, no copias de cada archivo fuente referenciado.

El objeto opcional `cause` tiene `category`, `hypothesis`, `confidence` y `evidence`. Las categorías son `model`, `tool`, `config`, `context`, `application`, `evaluator` y `unknown`. Si se omite, la causa queda como `unknown`.

## Promover a una fixture de skill

```bash
oma harness incident promote <id> [--skill <id>] [--draft] [--force] --json
```

Un incidente capturado se convierte en una fixture de regresión para la skill que ejerció el agente fallido, de modo que `oma skill optimize` pueda reparar la skill contra ella. La skill se elige enrutando el prompt del incidente contra el catálogo de skills instaladas con la misma sonda a nivel de descripción que usa `oma skill eval --routing` (una llamada al modelo); cuando el enrutamiento no elige nada, se usa la primera entrada `skills:` de la definición del agente en `.agents/agents/<agent>.md` y, en su defecto, la skill instalada llamada `oma-<agent>`. `--skill` tiene prioridad, y la promoción registra cuál de las tres opciones decidió (`attribution`). La fixture se escribe en `.agents/eval/<skill>/incident-<id>.yaml` con `group: incident-<id>` para que nunca cruce la división entre train, validación y test, y la promoción se registra junto al incidente como `promotion.json`. Un incidente se promociona una sola vez.

El comprobador procede de las comprobaciones de aceptación. Cuando todas son `output_contains`, la fixture es un `assert` determinista. En caso contrario las comprobaciones no pueden ejecutarse en una evaluación de skills (no hay archivos ni comandos), así que `--draft` pide al opt-agent una rúbrica de juez que empiece con `PASS only if` y nombre el fallo observado. En ambos casos la fixture solo se admite cuando la salida fallida registrada no la supera: se rechaza un assert que la salida observada ya satisface, o una rúbrica redactada que el juez supera con esa salida, porque no son un caso de regresión. Un incidente sin salida observada no se puede validar y necesita `--force`, lo cual se registra como una limitación.

## Cerrar el bucle

```bash
oma harness feedback                 # promote every unpromoted incident, report what changed
oma harness feedback --live          # also run one optimization epoch per affected skill (dry-run)
oma harness feedback --apply --json  # write edits that pass every gate
```

`feedback` es el bucle de retroalimentación del despliegue en un solo comando: con `--scan-runs` se captura primero cada ejecución fallida con contrato que aún no esté capturada (ver arriba), después se promociona cada incidente capturado sin fixture (redactando rúbricas cuando haga falta), se agrupan las skills afectadas y, con `--live`, cada una se optimiza una vez contra su suite ampliada bajo los gates habituales (aceptación sobre datos retenidos y reservados, transferencia negativa confirmada, prueba final propiedad del runner). El informe de `.agents/results/feedback/feedback-<ts>.json` lista las promociones, los incidentes omitidos con su motivo y el resultado de cada skill con el diff, de modo que la cadena desde un fallo observado hasta una edición candidata queda como un único registro auditable. Ejecútalo después de capturar las ejecuciones fallidas del agente, desde un planificador o un hook posterior a la ejecución; `oma schedule create <agent> "Run \`oma harness feedback --scan-runs --apply --json\` and summarize the report" --cron "0 3 * * *"` es la forma nocturna, y la instantánea de estado de la sesión siguiente anuncia todo lo que haya aplicado.

Lo que sigue siendo una decisión humana: una ejecución sin contrato de tarea no tiene ningún comportamiento esperado registrado, así que `incident scan` la lista y solo se captura mediante una especificación; `--skeleton` redacta una.

## Exportar y evaluar

```bash
oma harness incident export incomplete-result --json
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --record-file incidents/comparison.json --yes --json
```

La exportación materializa la instantánea inicial guardada y una suite exploratoria de un solo caso. El hash del manifiesto y la identidad de la ejecución y la traza de origen viajan con la tarea hasta la evaluación y el registro. Los cambios en los archivos exportados, el prompt, el agente, las comprobaciones o las fuentes fijadas del comprobador invalidan la reutilización. Crea un ID de incidente nuevo para cambiar el contrato de aceptación.

De forma predeterminada, `reproduce` inicia una comparación live nueva entre base y candidato y la registra. La confirmación habitual del coste live se aplica salvo que se proporcione `--yes`. Este comando usa el proveedor de agente configurado en la tarea del harness, incluido Codex; no impone el perfil de compilador protegido del optimizador de skills a la ejecución de la tarea.

Si no se capturó ningún estado inicial, `capture` y `show` siguen funcionando, pero la exportación ejecutable y la reproducción de la ejecución se detienen con un error de evidencia faltante. El árbol de trabajo actual de una ejecución histórica no puede establecer su estado original. Ni siquiera una instantánea inicial proporcionada por separado prueba la equivalencia con esa ejecución histórica; el informe indica esta limitación.

## Elegir la operación de evidencia

```bash
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action inspect --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rescore --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action fixture-replay --record-file incidents/comparison.json \
  --transcript incidents/tool-responses.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rerun --record-file incidents/comparison.json --record --yes --json
```

| Operación | Qué ocurre |
|---|---|
| `inspect` | Lee y agrega los veredictos guardados. No se ejecuta ninguna comprobación ni agente. |
| `rescore` | Aplica las comprobaciones actuales de salida y de archivo a la evidencia sin procesar guardada. Los campos antiguos de acierto y fallo se ignoran. |
| `fixture-replay` | Reproduce los datos de respuestas de herramientas y los cambios de archivo suministrados contra el estado inicial registrado. No se ejecuta ningún modelo ni proceso de herramientas. |
| `rerun` | Inicia llamadas reales de agente de base y candidato desde el estado inicial registrado. Esto conlleva el uso normal del modelo. |

Para un contrato de aceptación revisado, crea una suite de harness aparte y usa `oma harness eval --action rescore` con la misma identidad de suite, tarea e incidente y el mismo prompt. La suite de incidentes exportada es inmutable en sí misma. Consulta [detalles de registro y reproducción](./harness-eval.md) para los requisitos de la evidencia sin procesar y el esquema de la transcripción de herramientas.

Declara las dependencias externas como `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }`. Una dependencia de fixture apunta a un archivo que usa el esquema completo de transcripción del harness, con el ID del incidente como `taskId`. La reproducción de incidentes sin conexión rechaza las dependencias live o no disponibles, los archivos de fixture que faltan, los hashes de fixture modificados, las respuestas nombradas que faltan y los cambios de peticiones, respuestas y archivos que difieren de la transcripción fijada. Tampoco puede dar fe de que el autor declarara todas las dependencias externas. Una nueva ejecución live tampoco puede garantizar que un servicio externo se comporte como lo hacía históricamente.

La captura, la exportación y la evaluación emiten eventos locales `harness.incident.*` que conectan el incidente, los hashes de candidato y de base, el modo de ejecución y los IDs de las tareas corregidas o regresionadas. Un incidente de un solo caso es evidencia de regresión, no un sustituto de las suites de validación y de prueba final. Los perfiles de harness actuales informan `promotionReady: false`; estas operaciones no establecen el aislamiento protegido de la prueba final ni promocionan automáticamente un candidato.
