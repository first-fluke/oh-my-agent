---
title: "Evaluación del harness"
sidebar_label: Evaluación del harness
description: Evalúa una superposición completa de harness de OMA con tareas emparejadas en repositorios aislados y comprobaciones deterministas de artefactos.
---

# Evaluación del harness

`oma harness eval` mide si un harness candidato de OMA mejora un agente objetivo fijo sin cambiar su modelo. Adapta el patrón de evaluación en tiempo de prueba de [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307): mantiene fijo el modelo objetivo, cambia el harness y compara los resultados en las mismas tareas.

Este comando evalúa una unidad mayor que `oma skill eval`:

| Comando | Tratamiento | Objetivo de la puntuación |
|:--------|:----------|:-------------|
| `oma skill eval` | Un cuerpo `SKILL.md` | Salida del agente |
| `oma harness eval` | Una superposición `.agents/` con alcance | Archivos y salida producidos en un workspace de repositorio |

Usa skill eval para responder «¿esta skill ayuda?». Usa harness eval para responder «¿esta combinación de skills, flujos de trabajo, reglas e instrucciones de agente hace que el agente fijo complete tareas del repositorio de forma más fiable?».

## Modelo de evaluación

Una ejecución live evalúa cada tarea como un experimento emparejado:

1. OMA captura el fixture inicial de la tarea. Una instantánea completa inicializa ambos brazos para que partan de los mismos archivos, aunque el fixture de origen cambie durante la ejecución.
2. OMA copia las definiciones actuales de `agents`, `config`, `rules`, `skills` y `workflows` en ese workspace y las proyecta al formato del proveedor seleccionado.
3. OMA repite la preparación en un segundo workspace nuevo y aplica allí la superposición candidata.
4. En ambos brazos usa el mismo agente principal, ruta de proveedor, prompt, permisos de escritura y tiempo de espera.
5. Las comprobaciones deterministas inspeccionan el workspace resultante y, opcionalmente, la salida del agente. Las comprobaciones de comando de confianza se ejecutan después en una copia nueva de los artefactos de la tarea.

El proyecto real nunca se usa como directorio de trabajo de un brazo. OMA captura la salida sin procesar y los artefactos finales de la tarea antes de las comprobaciones y de la limpieza del workspace temporal. El sandbox del proceso propio del proveedor seleccionado sigue siendo la autoridad para el acceso fuera del directorio de trabajo.

## Diseño del candidato

La ruta candidata es un directorio que contiene un árbol `.agents/` parcial:

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

Solo se aceptan archivos bajo `.agents/agents`, `.agents/rules`, `.agents/skills` y `.agents/workflows`. Se rechazan hooks, fixtures del evaluador, estado, resultados, archivos de configuración, symlinks y variantes de agentes de proveedores. Los campos protegidos del frontmatter del agente, como `model`, `tools`, `effort` y los límites de ejecución, deben coincidir con la base. Un brazo también falla si el agente en ejecución modifica las definiciones protegidas de `.agents/` antes de puntuar.

## Formato de la suite

Una suite es un archivo YAML y un directorio de fixture por tarea:

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

La versión 2 requiere tanto tareas `validation` como tareas `final-test`. Cada tarea debe declarar su partición. La partición predeterminada es `validation`; usa `--partition final-test` para una ejecución final aparte después de seleccionar el candidato. Las dos particiones no pueden compartir ni anidar directorios de fixtures. Mantén los archivos de grabación fuera de los directorios de fixtures, de las superposiciones candidatas y de las entradas del evaluador; estas ubicaciones se rechazan para evitar que ejecuciones posteriores vean las comprobaciones finales. Las suites de la versión 1 se siguen ejecutando como `exploratory`; no se pueden seleccionar como final-test.

Los IDs de tarea deben ser únicos. Las rutas de fixtures y comprobaciones deben permanecer dentro del proyecto y del workspace de la tarea. Las suites y los fixtures también deben permanecer fuera de las definiciones base que se copian en cada brazo. Los fixtures no pueden contener symlinks ni superficies de control del harness de agentes, como `.agents`, `.codex`, `.claude`, directorios de skills de proveedores o archivos de instrucciones del agente raíz. Esto evita que los datos de la tarea oculten el harness controlado de cualquiera de los dos brazos.

Los directorios de dependencias generados, como `node_modules` y `.venv`, no se copian desde el harness base. Incluye el código fuente de los helpers deterministas y los manifiestos de dependencias en la skill; prepara las dependencias de runtime en el fixture de la tarea cuando una comprobación las necesite.

### Tipos de comprobación

| Tipo | Campos | Condición de aprobación |
|:-----|:-------|:-------------|
| `file_exists` | `path` | La ruta existe cuando termina el brazo. |
| `file_not_exists` | `path` | La ruta no existe. |
| `file_contains` | `path`, `value` | El archivo existe y contiene el valor. |
| `file_not_contains` | `path`, `value` | El archivo existe y no contiene el valor. |
| `output_contains` | `value` | La salida capturada del agente contiene el valor. |
| `output_not_contains` | `value` | La salida capturada del agente no contiene el valor. |
| `output_judge` | `rubric` | Contrato graduado que acompaña a los incidentes; el evaluador mecánico lo informa como no evaluado (consulta [Casos de regresión de incidentes](./harness-incidents.md)). |
| `file_json_equals` | `path`, `value`, `pointer` opcional | El JSON analizado del archivo es igual a `value`, opcionalmente en un JSON Pointer. |
| `output_json_equals` | `value`, `pointer` opcional | La salida capturada es JSON válido y es igual a `value`, opcionalmente en un JSON Pointer. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | El subproceso de confianza termina dentro de su tiempo de espera y devuelve el código de salida especificado. |

Las aserciones JSON comparan valores analizados, incluidos los tipos; un texto que afirme el éxito no puede satisfacer una aserción de estado JSON. `pointer` usa la sintaxis de JSON Pointer, como `/result/count`, y por defecto se aplica al valor completo.

Las comprobaciones de comando las crea el propietario de confianza de la suite:

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` se resuelve de forma relativa al archivo de la suite. Debe ser un archivo de código fuente regular y autónomo, almacenado fuera de cada fixture, de la superposición candidata y de las definiciones `.agents` base. `argv[0]` debe ser la ruta absoluta de un ejecutable ubicado fuera del proyecto; `{checker}` debe ser un argumento completo. OMA pasa los argumentos directamente, sin interpolación del shell. Los tiempos de espera deben ser enteros positivos no mayores de 300.000 milisegundos. Los códigos de salida son enteros de 0 a 255.

Antes del dispatch, OMA toma una instantánea de los bytes del código fuente del comprobador y calcula el hash de las definiciones del evaluador y del ejecutable. Después del dispatch, copia los artefactos de la tarea a un workspace temporal aparte, escribe fuera de esos artefactos el comprobador de la instantánea y lo invoca allí. Cada comando recibe una copia nueva; un comprobador no puede alterar la entrada de la siguiente comprobación. Las proyecciones del harness generadas se excluyen y los symlinks de los artefactos se rechazan. Si el código fuente del comprobador cambia durante un brazo, ese brazo falla; nunca se sustituye la instantánea por el código fuente modificado. El comprobador debe usar aserciones fijas sobre los artefactos o el comportamiento de la aplicación, y no debe delegar su veredicto en pruebas ni scripts de paquetes que el candidato pueda editar.

Las comprobaciones y las rutas de los comprobadores no se añaden al prompt del agente ni al fixture. La entrada de la tarea seleccionada es necesariamente visible durante su ejecución. Esto protege la integridad del evaluador y separa las particiones; no impide que un proceso del mismo usuario lea otros archivos del host.

## Ejecutar y registrar

El modo live envía dos dispatches por tarea seleccionada, muestra una vista previa de dispatches y requiere confirmación:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

Usa `--yes` para la ejecución no interactiva y `--timeout-minutes` para definir el mismo límite de tiempo de pared por brazo. La ejecución live requiere un proveedor que descubra los archivos del harness relativos al workspace del proyecto. OMA rechaza el descubrimiento basado en HOME porque la base podría ver contenido candidato instalado globalmente.

`--record` escribe un registro JSON inmutable de versión 2. La ubicación predeterminada es `_runs/`, junto a la suite, con los hashes de base y candidato en el nombre del archivo. Usa un `--record-file` nuevo para otra ejecución live; un destino existente se rechaza antes del dispatch. Los registros conservan:

- la identidad de la suite, la partición, la procedencia del prompt y de los fixtures, los hashes de base y candidato, y los hashes del evaluador, de los comprobadores y de los ejecutables;
- la salida original y su hash, incluida la salida estándar de diagnóstico disponible de los dispatches fallidos;
- los manifiestos de artefactos inicial y final, con los bytes de los archivos, los hashes por archivo, los modos de archivo y de directorio, y un digest del manifiesto;
- las referencias a los comprobadores, los resultados de los brazos, la identidad del incidente cuando se proporciona y el hash del registro de origen en una repetición.

Las instantáneas de tareas están limitadas a 5 MiB por archivo, 32 MiB en total y 2.000 entradas. Los symlinks, los archivos especiales, las rutas que contienen secretos, los archivos ilegibles y los datos de tamaño excesivo se registran como omisiones. Los controles del harness copiados se excluyen de los artefactos finales de la tarea. Las instantáneas incompletas siguen siendo limitaciones de evidencia explícitas; no pueden servir para una repetición con archivos fijados ni para volver a puntuar archivos. La salida sin procesar aún puede respaldar comprobaciones solo de salida cuando el dispatch original tuvo éxito.

Los registros tienen su propio hash de integridad. Se rechaza un hash de registro o de artefacto modificado. Estos hashes identifican la evidencia; no certifican el confinamiento del proceso ni hacen que un resultado esté listo para su promoción.

### Condiciones de ejecución

Cada evaluación live o de repetición resuelve un manifiesto de ejecución antes del primer dispatch y lo almacena en el registro como `manifest`. El manifiesto nombra las condiciones a las que se refiere un veredicto, de modo que una puntuación almacenada nunca se confunda con evidencia sobre otro modelo, otra CLI u otra compilación de OMA:

| Campo | Significado |
|---|---|
| `vendor`, `dispatchMode`, `runtimeVendor`, `command` | Ruta de dispatch resuelta y nombre del ejecutable de la CLI. |
| `model`, `modelSource` | El modelo que OMA resolvió a partir del plan del agente o del valor predeterminado del proveedor. `vendor-session` significa que la propia configuración de sesión del proveedor selecciona el modelo y que OMA no lo fijó. |
| `effort`, `thinking` | Ajustes de razonamiento tomados del plan del agente cuando existen. |
| `cliVersion`, `cliVersionStatus` | Primera línea de `<command> --version` (`probed`), o `unavailable` cuando la sonda falló. |
| `omaVersion`, `platform`, `arch`, `node` | Host y compilación de OMA. |
| `environmentPolicy` | Nombres de las variables de entorno que recibieron los brazos, las entradas forzadas y cuántas se descartaron. Los valores nunca se registran. |
| `memory`, `confinement` | `memory: disabled` en todos los brazos; `confinement` indica qué restringe y qué no restringe el dispatch (workspace temporal, red sin restricciones, credenciales heredadas, herramientas predeterminadas del proveedor). |
| `manifestHash` | Identidad de las condiciones anteriores. |

El manifiesto es una descripción, no una certificación: registra lo que OMA resolvió, y los campos de confinamiento indican explícitamente que no se aplica aislamiento de red ni de credenciales. `promotionReady` sigue siendo `false`.

### Política de entorno

Ambos brazos reciben el mismo entorno, filtrado mediante una lista de permitidos. Las variables base (`PATH`, `HOME` y los ajustes de configuración regional, de directorio temporal, de proxy y de certificados), todas las variables `OMA_*` y los prefijos de credenciales y de detección de runtime del proveedor de destino se transmiten al proceso; las entradas que un builder de dispatch añade para la invocación se conservan. Todo lo demás se descarta para que un candidato no pueda alcanzar por accidente un token de despliegue ni la clave de otro proveedor. `OMA_NO_AGENTMEMORY=1` se fuerza para que la memoria del proveedor no pueda transportar contexto entre los brazos de base y de candidato.

Define `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2` para transmitir variables adicionales que una tarea realmente necesite. Los nombres aparecen en el manifiesto bajo `environmentPolicy.extra`. Para un proveedor sin un conjunto de prefijos conocido, el manifiesto informa `vendorKnown: false` y al proceso solo llegan las entradas base, `OMA_*` y de passthrough.

## Reutilizar una grabación

El comando distingue cuatro acciones:

| Acción | Trabajo realizado | Llamadas a agente/modelo |
|:-------|:---------------|:------------------|
| `inspect` | Agrega los veredictos guardados de los brazos tras validar la procedencia. No se ejecuta ninguna comprobación. | Ninguna |
| `rescore` | Aplica las comprobaciones actuales de salida y de archivo a la salida sin procesar y a los bytes de los artefactos originales. | Ninguna |
| `fixture-replay` | Hace coincidir una transcripción suministrada de peticiones de herramientas, reproduce sus respuestas de fixture y sus cambios de archivos, y después aplica las comprobaciones admitidas. | Ninguna |
| `rerun` | Ejecuta el agente configurado en workspaces nuevos inicializados a partir de las instantáneas iniciales registradas. | Dos por tarea seleccionada |

`--action inspect` es el valor predeterminado. `--mock` es un alias de la inspección y no se puede combinar con otra acción. Ni la inspección ni la reproducción de fixtures vuelven a ejecutar un agente.

### Inspeccionar los veredictos guardados

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

La inspección requiere que coincidan los hashes originales de la suite, la partición, el evaluador, la base y el candidato. Muestra las puntuaciones registradas sin invocar comprobadores ni volver a evaluar la salida. Los registros de la versión 1 siguen disponibles para inspección cuando coincide la procedencia requerida. Los registros anteriores a los que les falta la procedencia de partición o de evaluador no pueden pasar la validación actual de la CLI. Los veredictos heredados no se pueden reetiquetar como nueva evidencia sin procesar: recopila un registro live nuevo para volver a puntuar, reproducir fixtures o hacer una repetición con archivos fijados.

### Volver a puntuar la evidencia original

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

Volver a puntuar usa las comprobaciones actuales e ignora los valores `passed` originales y los veredictos de las comprobaciones. La identidad de la suite, el ID de la tarea, el prompt y la identidad del incidente, la base, el candidato y la partición seleccionada deben seguir coincidiendo. Las definiciones de los comprobadores pueden cambiar; el nuevo resultado describe cómo se comportan los bytes originales frente a esas comprobaciones. Los cambios en los archivos de fixture actuales no sustituyen los artefactos finales registrados.

Las comprobaciones de comando son insuficientes para volver a puntuar sin conexión porque el registro no fija el runtime ni el entorno externos. Las comprobaciones dirigidas a artefactos excluidos o incompletos también son insuficientes. Un dispatch original fallido deja salida de diagnóstico, que no puede convertirse en una medición válida al volver a puntuar. Usa una repetición live cuando los criterios de aceptación actuales requieran ejecutar comandos.

### Reproducir fixtures de herramientas

Un archivo de transcripción contiene un objeto o un array de objetos con IDs de tarea únicos. Proporciona una transcripción por cada tarea seleccionada:

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

Las peticiones deben coincidir exactamente con la secuencia de pasos por nombre de herramienta y valor de la petición. `writes` y `removes` son cambios opcionales de archivos de la tarea, con rutas relativas; no pueden salir del workspace ni modificar los controles del harness. Los nombres de herramienta son datos y no se ejecuta ningún comando de la transcripción. `output` son datos de fixture, necesarios cuando una comprobación de salida los requiere.

Cada dependencia declarada tiene un `name`, un `repeatability` (`fixture`, `live` o `unavailable`) y, opcionalmente, un `reason` y una referencia `fixture`. Una dependencia de fixture requiere un paso coincidente con ese nombre de herramienta. Las dependencias live o no disponibles hacen que la reproducción sea insuficiente. El campo opcional `fixture` es descriptivo; la reproducción consume los pasos suministrados en lugar de cargar esa ruta. La reproducción de la transcripción valida las dependencias declaradas y no establece que se hayan capturado todas las dependencias históricas.

Ambos brazos registrados deben tener la misma instantánea inicial completa. OMA aplica la misma transcripción a cada brazo y ejecuta las comprobaciones actuales de salida y de archivo. Las comprobaciones de comando requieren una repetición live. Estos resultados muestran que la secuencia de fixtures suministrada se puede reproducir; no pueden establecer una mejora del comportamiento del candidato ni la reproducibilidad del modelo.

### Repetir el agente desde archivos iniciales fijados

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

Una repetición requiere identidades de suite y de tarea coincidentes e instantáneas iniciales completas e idénticas en ambos brazos originales. Inicia llamadas reales al agente con la base, el candidato, la ruta de proveedor y modelo configurada y las comprobaciones actuales. No usa los artefactos finales originales como estado de partida. Por tanto, una edición posterior del fixture de origen no puede cambiar silenciosamente el estado inicial registrado.

Las repeticiones tienen la misma vista previa de dispatch, la misma confirmación y el mismo comportamiento de tiempo de espera que las ejecuciones live. Pueden usar un candidato modificado; selecciona explícitamente el registro original con `--record-file`. Añade `--record` para guardar un archivo nuevo en el mismo directorio, con nombre terminado en `-rerun-<timestamp>.json`, enlazado al hash del registro de origen. El registro original se conserva.

Los archivos fijados no reproducen el estado de servicios externos, el comportamiento del reloj ni el muestreo del modelo. Una repetición es evidencia nueva del comportamiento bajo las condiciones indicadas, no una afirmación de que la trayectoria original del agente se haya reproducido de forma determinista.

### Condiciones registradas en la reproducción

`inspect`, `rescore` y `fixture-replay` informan el manifiesto almacenado en el registro con `conditions: "recorded"`, o con `conditions: "unavailable"` para un registro anterior a los manifiestos. OMA también resuelve las condiciones actuales y enumera cada diferencia de proveedor, modo de dispatch, modelo, effort, thinking, versión de la CLI, versión de OMA o host como limitación de la reproducción y como obstáculo para la promoción:

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

La versión de la CLI solo se sondea en la reproducción cuando el propio registro lleva una versión sondeada; un par sin sondear se informa como no comparable en lugar de igual. Los veredictos registrados siguen siendo visibles bajo sus condiciones originales. No son evidencia sobre el candidato bajo las condiciones actuales hasta que una evaluación live o de repetición produzca un registro cuyo manifiesto coincida.

### Consumo

Cada brazo almacena `usage` cuando el proveedor lo informó: tokens de entrada y de salida, costo en USD, tiempo de pared y el modelo que produjo la mayor parte de la salida. La evaluación los suma como `usage` con `status` `actual`, `partial` (algunos brazos no informaron nada) o `unknown`. Los envoltorios de resultado del proveedor se desenvuelven antes de ejecutar las comprobaciones y antes de registrar la salida, de modo que `output_contains` y `output_json_equals` ven la respuesta del agente y no los metadatos JSON que la rodean; el uso dentro del envoltorio es lo que alimenta este campo.

### Etiquetas del informe

Los informes incluyen `executionMode`, `evidenceStatus` (`complete`, `insufficient` o `legacy`), `replayLimitations` y, cuando está disponible, `sourceRecordHash`. Los informes live y de repetición añaden `manifest`, `conditions: "current"` y `traceSession`. La completitud de la evidencia describe lo que la acción actual puede inspeccionar o evaluar. Las limitaciones heredadas del incidente siguen siendo visibles aunque la captura actual de archivos esté completa. `promotionReady` sigue siendo `false` en todos los modos.

## Eventos de traza

Cada evaluación live o de repetición escribe eventos enlazados en la sesión local `oma-harness-<suite-id>`:

| Evento | Carga útil |
|---|---|
| `harness.eval.started` | Acción, hashes de suite, base, candidato y evaluador, partición, hash del manifiesto, proveedor resuelto, modelo, versión de la CLI y número de tareas. |
| `harness.arm.completed` | Uno por brazo: tarea, brazo, estado de aprobación, duración, hash de la salida, error de dispatch, código de salida, indicador de tiempo de espera agotado y la traza del brazo. `parentEventId` apunta al evento de inicio. |
| `harness.eval.completed` | Decisión, lift, estado de la evidencia y, cuando se usó `--record`, la ruta y el hash del registro. |

Todos los eventos de una evaluación comparten un `causalityKey`. Cuando no se puede escribir un evento, el informe lista `Trace event <kind> was not recorded` como limitación de la reproducción en lugar de omitirlo en silencio.

Cada ejecución de un brazo también almacena `diagnostics` y `trace` en el registro:

- `diagnostics`: código de salida, señal, indicador de tiempo de espera agotado y los últimos 8 KiB de stderr con `stderrStatus` (`captured`, `truncated` o `unavailable`).
- `trace`: lo que el harness pudo observar. `output` es `complete`, `partial` (un proceso fallido aún produjo stdout) o `unavailable`; `artifacts` indica si la instantánea final está completa; `changedPaths` lista los archivos que el brazo añadió, modificó o eliminó respecto al workspace inicial fijado (limitado a 200, con `changedPathsTruncated`); `toolCalls` es siempre `unsupported` porque las CLI de los proveedores no exponen al harness observaciones por herramienta.

Por tanto, un brazo fallido conserva su salida parcial, el final de stderr, el estado de salida y los cambios de archivos, de modo que el último error pueda rastrearse hasta lo que cambió el brazo. La observación ausente se registra como un estado; nunca se interpreta como una ejecución limpia.

## Métricas y gate de decisión

Cada tarea aprueba solo cuando todas las comprobaciones aprueban. Las puntuaciones son medias ponderadas de las tareas emparejadas:

```text
lift = candidateScore - baselineScore
```

OMA también informa de:

- tareas corregidas: la base falló y el candidato aprobó;
- tareas regresionadas: la base aprobó y el candidato falló;
- cobertura: se necesitan al menos cinco tareas emparejadas y puntuables.

La decisión de puntuación es `pass` cuando el lift es de al menos 5 puntos porcentuales y no hay regresiones. Cualquier regresión hace fallar al candidato. Un lift no negativo inferior a 5 puntos genera una advertencia, y menos de cinco tareas emparejadas produce una decisión `insufficient`. Añade `--require-coverage` para que una cobertura insuficiente termine con código distinto de cero en CI. Una puntuación no es evidencia cuando falta un brazo, el hash del registro está obsoleto o una comprobación determinista está incompleta. Los errores de dispatch live y de integridad del evaluador fuerzan una decisión de fallo; no pueden contar como lift satisfactorio. Al volver a puntuar y en la reproducción de fixtures se omiten de los pares puntuables los brazos con evidencia insuficiente y se informa una decisión `insufficient`, en lugar de tratar la evidencia ausente como una regresión del candidato.

Que la puntuación apruebe no establece la elegibilidad para la promoción. Los informes incluyen la partición, el hash del evaluador, `promotionReady: false` y los obstáculos explícitos. Las ejecuciones heredadas y de validación carecen de evidencia de final-test. Las rutas de dispatch actuales no certifican el confinamiento del acceso al sistema de archivos, de modo que ni siquiera una ejecución de final-test puede reclamar una evaluación final protegida ni autorizar la promoción. Este campo sigue siendo false hasta que un proveedor de ejecución pueda establecer ese límite.

## Límite actual

Las superposiciones candidatas se producen externamente; este comando no implementa un builder ni un bucle automatizado `harness opt`. Están disponibles la captura de artefactos, la nueva puntuación sin conexión, la reproducción de fixtures de herramientas, las repeticiones con archivos fijados, la selección de particiones, los evaluadores capturados mediante instantánea, los manifiestos de ejecución, una lista de variables de entorno permitidas y los eventos de traza enlazados, pero no se establecen la confidencialidad de los datos reservados a nivel de sistema operativo, el confinamiento de red o de credenciales, los ensayos estocásticos repetidos, la contabilidad de tokens ni la fijación forzada del modelo para llamadas de subagentes anidados. La lista de variables de entorno permitidas limita qué variables hereda un proceso del proveedor; no impide que una CLI de proveedor lea su propio almacén de credenciales ni que acceda a la red. Hasta que exista fijación para llamadas anidadas, las suites que pretendan medir un único modelo fijo deben evitar flujos candidatos que creen otros roles de agente configurados.
