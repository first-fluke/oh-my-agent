---
title: "Evaluación de utilidad de skills"
sidebar_label: Evaluación de skills
description: Cómo escribir fixtures de tareas de evaluación para oma skill eval, la convención del directorio .agents/eval/, los tipos de comprobador y los modos de ejecución mock/live.
---

# Evaluación de utilidad de skills

`oma skill eval` mide si cargar una skill mejora realmente los resultados de las tareas del agente. Responde a una pregunta distinta de `oma skill audit` (que pregunta «¿son redundantes dos skills?»): pregunta «¿esta skill ayuda?».

El diseño sigue dos hallazgos de investigación: WikiSkill (arXiv:2608.27454) separa experiencia en bruto, conocimiento persistente y skills ejecutables, conservando gates reservados para la evolución; SkillLens (arXiv:2605.23899) muestra que la utilidad de una skill es independiente de que su descripción sea distintiva: una skill distinta puede seguir siendo inútil y una que se solapa puede seguir ayudando.

---

## Cómo funciona

Para cada fixture de tarea, el comando ejecuta dos brazos:

1. **Brazo base**: envía el prompt de la tarea a un agente sin la skill.
2. **Brazo de tratamiento**: antepone `SKILL.md` al prompt y envía la misma tarea.

Cada brazo recibe una puntuación (0 = falla, 1 = pasa) mediante el comprobador de la tarea. La métrica principal es:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Una skill aprueba cuando `utilityLift ≥ 5%`. Por debajo de ese umbral se marca como advertencia (mejora marginal) o como fallo (sin mejora). Se necesitan al menos 5 tareas puntuables para emitir un veredicto.

---

## Convención `.agents/eval/<skill>/`

Coloca los fixtures de tareas bajo `.agents/eval/<skill>/`. Esta ruta está dentro de `.agents/`, pero fuera del propio directorio de la skill, por lo que sobrevive a `oma update` sin sobrescribir evaluaciones escritas por el usuario.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

Los archivos cuyo nombre empieza por `_` se omiten al cargar los fixtures. El subdirectorio `_rollouts/` contiene las salidas registradas de los brazos de ejecuciones anteriores con `--live --record`.

## Esquema del fixture de tarea

Cada fixture es un archivo YAML con los campos siguientes:

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| Campo | Obligatorio | Descripción |
|:------|:---------|:-----------|
| `id` | Sí | Identificador único de la tarea (se usa en nombres de rollouts e informes) |
| `skill` | Sí | Skill evaluada (coincide con el nombre del directorio padre) |
| `domain` | Sí | Etiqueta de dominio que se usa para agrupar y para seleccionar las tareas vecinas de transferencia negativa |
| `prompt` | Sí | Prompt de tarea que se envía a ambos brazos |
| `checker` | No | Cómo puntuar la salida del brazo. Si se omite, el valor predeterminado es `{ type: judge }`. |
| `weight` | Sí | Peso relativo para la media ponderada (usa `1` salvo que las tareas tengan distinta importancia) |
| `group` | No | Etiqueta de familia. `oma skill optimize` mantiene los fixtures que comparten un grupo en la misma partición de train/validación/prueba final, de modo que un fixture casi duplicado no pueda filtrarse a través de la división. |

### Tipos de comprobador

#### judge (predeterminado)

Un LLM evalúa la salida del brazo contra una rúbrica y devuelve PASS o FAIL. Es el valor predeterminado cuando se omite `checker` o `checker.type`.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

El campo `rubric` es opcional; si se omite se usa la rúbrica predeterminada: «¿La respuesta satisface correcta y completamente el prompt de la tarea?».

También puedes escribir la rúbrica en el nivel superior para abreviar:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Importante:** en modo `--mock`, las tareas judge necesitan un veredicto registrado previamente en `_rollouts/`. Si no hay un veredicto registrado para una tarea, se excluye del informe con una advertencia. Ejecuta `--live --record` para poblar primero los rollouts.

Lo mismo ocurre con cualquier tipo de comprobador cuando falta por completo un brazo: la tarea se excluye en vez de recibir una puntuación 0. La ausencia de datos no es una respuesta fallida; puntuarla haría que ambos brazos fueran 0 y un lift cero se leería como `decision: "fail"`. Si las exclusiones reducen el recuento puntuado por debajo de `MIN_TASKS`, se muestra `coverage: "insufficient"`.

#### assert (opt-in)

Comprobación determinista de subcadenas. Úsala para verificar contratos, formatos o llamadas a herramientas donde la salida esperada sea exacta.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

Aprueba cuando cada string de `expect_contains` está presente en la salida del brazo.

#### regex (opt-in)

Coincidencia determinista de expresión regular. Úsala cuando se necesite un patrón en lugar de una cadena exacta.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Los patrones de más de 200 caracteres reciben una puntuación 0 (protección contra ReDoS). La salida se trunca a 10.000 caracteres antes de hacer la coincidencia.

---

## Modos de ejecución

### --mock (predeterminado)

Reproduce los rollouts registrados desde `_rollouts/`. Es completamente determinista y funciona sin conexión: no se llama a ningún LLM.

- Para comprobadores `assert`/`regex`, las puntuaciones se calculan a partir de las cadenas de salida registradas.
- Para comprobadores `judge`, reproduce el campo `score` registrado por `--live --record`.

Si una tarea judge no tiene una puntuación registrada en `_rollouts/`, se excluye del informe (con una advertencia en consola). Así el modo mock permanece estrictamente sin conexión.

Las grabaciones también se comprueban para detectar obsolescencia. Los cambios en el cuerpo de la skill, los prompts, los contratos de tarea y de comprobador, las rúbricas efectivas del juez y las revisiones del protocolo del evaluador invalidan las entradas afectadas. También se descartan, con una advertencia que nombra el archivo y el recuento, las entradas sin procedencia. Si quedan menos de `MIN_TASKS` tareas puntuables, la ejecución informa `coverage: "insufficient"` en lugar de un veredicto.

:::note `oma skill optimize --mock`
El optimizador puntúa cuerpos candidatos de SKILL.md. Como una grabación solo es válida para el cuerpo con el que se creó, los cuerpos candidatos no tienen rollouts coincidentes y aparecen como no cubiertos. Usa `--live` para puntuar candidatos.
:::

Seguro para CI. Define `OMA_SKILLEVAL_MOCK=1` para forzar este modo.

```bash
oma skill eval --skill oma-scholar
```

### --live

Crea brazos de agente reales mediante `oma agent spawn --read-only`. Cada brazo de tarea se ejecuta en su propio workspace temporal, de modo que los archivos producidos por un brazo no afectan a otro. Los fallos de proceso, los envoltorios de error de la API y los fallos del juez excluyen toda la comparación emparejada de la puntuación y del registro; la salida parcial es un dato de diagnóstico.

Antes del despacho, el comando muestra una vista previa del costo con el número de tareas, despachos de brazos, despachos del juez y proveedor resuelto. Confirma con `y` o salta la confirmación con `--yes`.

Los otros controles son útiles en CI y al investigar la cobertura:

| Opción | Efecto |
| --- | --- |
| `--task-dir <path>` | Evalúa fixtures desde un directorio distinto de `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Limita el número de fixtures para una ejecución live acotada. |
| `--trials <n>` | Repite cada brazo `n` veces (1-10). El brazo que se inicia primero alterna entre ensayos, las puntuaciones por tarea se promedian y el informe incorpora la varianza dentro de cada tarea. Las tareas vecinas de `--neg-transfer` se ejecutan una vez. |
| `--neg-transfer` | Mide la skill candidata en tareas del mismo dominio que pertenecen a otras skills; está desactivado por defecto. |
| `--routing` | Mide la activación: para cada tarea, pregunta qué skill instalada se cargaría dada la `description` de cada skill. En live mide (un despacho adicional por tarea); en mock reproduce una grabación de enrutamiento hecha con el mismo catálogo. |
| `--require-coverage` | Termina con código distinto de cero cuando quedan menos de cinco tareas emparejadas puntuables o cuando una comprobación de transferencia negativa solicitada está incompleta. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Medición de la transferencia negativa

Con `--neg-transfer`, cada tarea vecina seleccionada se ejecuta dos veces: primero una base nueva, sin el candidato, y después un tratamiento con el cuerpo exacto del candidato inyectado. Los vecinos son las tareas de otras skills del mismo `domain`. Cuando ninguna otra skill comparte el dominio, se usa en su lugar una muestra acotada entre dominios (hasta seis tareas, repartidas entre las demás skills) y `negativeTransferCoverage.scope` informa `cross-domain`; la interferencia de un cuerpo inyectado no se limita a su propio dominio, y un dominio único no debe imposibilitar la comprobación. Ambos brazos usan el mismo evaluador y workspaces vacíos separados. El delta es la puntuación de tratamiento menos la puntuación base; un valor negativo significa que el candidato perjudicó esa tarea vecina. La vista previa live incluye estos despachos adicionales de brazos y del juez. `--max-tasks` también limita la muestra de vecinos, con una advertencia cuando se omiten tareas.

Usa `--live --neg-transfer --record` para guardar comparaciones específicas del candidato bajo `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. La reproducción mock requiere que coincidan la identidad del candidato, el hash del cuerpo, el hash completo de tarea y comprobador, y un ID de comparación compartido por ambos brazos. Las grabaciones de evaluación ordinarias de un vecino no pueden sustituir esta medición.

Cada entrada de `negativeTransfer` incluye `trials` (las comparaciones emparejadas que respaldan `delta`). La optimización vuelve a medir una vez un vecino con regresión antes de rechazar un candidato y añade `confirmed` (`true` cuando la repetición también mostró regresión, `false` cuando no); `oma skill eval --neg-transfer` informa la comparación única. El informe incluye `negativeTransferCoverage` con `status`, `expected` y `scored`. El estado es `not-requested` cuando no se pasa el flag, `measured` cuando todos los vecinos seleccionados tienen un resultado emparejado válido y la muestra no está vacía, e `insufficient` cuando hay cero vecinos o falta alguna comparación. Por tanto, un array `negativeTransfer` vacío no establece la ausencia de regresiones. El `ok` del JSON es false cuando la cobertura de transferencia negativa solicitada es insuficiente.

#### Aislamiento de la skill (mantener honesta la base) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` solo tiene sentido si el **brazo base se ejecuta sin la skill objetivo**. El problema es que un agente enviado carga automáticamente todas las skills instaladas en su runtime, por lo que una base ingenua también recogería la skill que se supone que se mide; la comparación quedaría contaminada (base ≈ tratamiento y lift ≈ 0).

Para evitarlo, `--live` ejecuta **ambos brazos en workspaces temporales separados**. Los perfiles protegidos de Claude y Codex desactivan el descubrimiento automático de skills e instrucciones y las herramientas del agente. El tratamiento recibe la skill objetivo **solo** mediante el `SKILL.md` inyectado. Los perfiles exploratorios usan un directorio de skills filtrado sin la skill objetivo, pero eso por sí solo no demuestra el aislamiento.

Un directorio de trabajo limpio oculta el descubrimiento de skills local del proyecto, pero el aislamiento en runtime también depende del perfil del proveedor. El informe declara el nivel verificado mediante `isolation`:

| Estado | Significado |
|---|---|
| `enforced` | Claude protegido con un ID de objetivo válido y sin copia HOME, o Codex nativo con supresión del descubrimiento y de las herramientas y con comprobaciones del hilo en runtime. Un contrato de runtime fallido aborta el despacho. |
| `best-effort` | Un runtime sin perfil de texto protegido, un ID de objetivo no válido o una copia HOME de Claude; el aislamiento no está verificado. |
| `unavailable` | Proveedor basado en HOME (por ejemplo, **antigravity**, que lee `~/.gemini/antigravity-cli/skills`); un cwd limpio no puede ocultarlo. Se muestra una advertencia y el resultado queda marcado como de baja confianza. |
| n/a | Modo mock: no hay despacho live. |

Otros perfiles de runtime siguen disponibles para la evaluación exploratoria, pero los resultados `best-effort` y `unavailable` bloquean la promoción de la optimización live. El proveedor de evaluación sigue la configuración de modelos del proyecto. Codex usa su inicio de sesión nativo de la CLI y el modelo y proveedor configurados mediante `app-server`; no cambia silenciosamente a Claude ni a un cliente con clave de API. El contrato protegido de Codex apunta a la CLI 0.154.x en macOS/Linux con almacenamiento nativo de credenciales en archivo y un `auth.json` existente. Un directorio de configuración temporal privado hace referencia a los archivos originales de configuración y autenticación y excluye el estado de arranque compartido; las credenciales no se copian y la renovación nativa usa el archivo de autenticación original. Los almacenes de credenciales keyring, auto y efímero no se admiten actualmente. Las versiones, los modos de almacenamiento y los fallos de contrato no admitidos se convierten en errores de despacho.

Los jueces se ejecutan en directorios temporales nuevos con la memoria de optimización desactivada. Los jueces de Claude y Codex usan el mismo transporte de texto protegido que los brazos de evaluación. La configuración del proveedor del juez queda fija durante la ejecución.

### --live --record

Ejecuta brazos live y escribe las salidas capturadas (incluidos los veredictos del juez para tareas con comprobador judge) en `_rollouts/<hash>.json`. El nombre es un hash SHA-256 determinista del conjunto de IDs de tareas, no una fecha ni un valor aleatorio.

Úsalo para sembrar ejecuciones `--mock` en tu propia máquina y mantenerlas sin conexión en repeticiones posteriores.

Cada entrada incluye procedencia para que una reproducción posterior pueda saber si todavía aplica:

| Campo | Registrado en | Comparado con |
|---|---|---|
| `skillBodyHash` | solo `treatment` | el cuerpo de SKILL.md evaluado |
| `promptHash` | ambos brazos | el `prompt` actual del fixture |
| `taskHash` | ambos brazos | la tarea completa, el comprobador efectivo o la rúbrica predeterminada del juez, y `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | ambos brazos (`--trials` > 1) | empareja la base y el tratamiento de una repetición; ausente cuando hay un solo ensayo |
| `judgeResponse` | tareas judge | el texto del veredicto del juez sin envoltorio (de tamaño limitado), que se conserva para poder auditar el `score` almacenado |

Las salidas de los brazos se registran como el texto de la respuesta. Cuando una CLI de proveedor devuelve un envoltorio de resultado JSON, se almacena y puntúa el campo `result`; los comprobadores `assert`/`regex` nunca comparan los metadatos del envoltorio, ni el analizador del juez los lee.

El brazo base oculta la skill, así que editar solo SKILL.md no invalida su grabación. Los cambios en el contrato de la tarea o del evaluador invalidan ambos brazos. La grabación live vuelve a ejecutar ambos brazos.

Las grabaciones anteriores a la procedencia completa de tarea y evaluador deben regenerarse con `--live --record` (y `--neg-transfer` para las comparaciones de vecinos); añadir hashes nuevos a puntuaciones antiguas no permite verificarlas. El mismo contrato participa en la identidad de la suite de optimización, de modo que el conocimiento anterior acotado a la suite no se reutiliza bajo el contrato actualizado. Mantén `SKILL_EVAL_PROTOCOL_REVISION` incrementándolo cuando cambie el comportamiento del puntuador, los prompts y el análisis de veredictos del juez, u otro comportamiento implícito del evaluador.

:::caution `_rollouts/` es solo local: no lo confirmes
Una grabación solo se reproduce para el cuerpo exacto de SKILL.md con el que se creó. Edita una skill y sus grabaciones de tratamiento se descartan en la siguiente ejecución `--mock`, así que una grabación incluida en el repositorio quedaría obsoleta cuando alguien descargue el siguiente cambio y mostraría advertencias.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

Después de una ejecución live correcta, el informe incluye recuentos de base y tratamiento, `utilityLift`, `coverage: "ok"`, el estado de aislamiento y una decisión pass/warn/fail. Una ejecución mock posterior reutiliza solo grabaciones cuyos prompts y cuerpo de la skill de tratamiento sigan coincidiendo.

---

### Concurrencia y tiempos de espera de despacho

Los brazos live, los brazos vecinos, las llamadas al juez y las sondas de enrutamiento se ejecutan mediante un pool acotado de `OMA_SKILL_EVAL_CONCURRENCY` subprocesos (4 de forma predeterminada, 16 como máximo). Los dos brazos de un ensayo siempre se ejecutan juntos en directorios vacíos separados, y el brazo que se inicia primero alterna entre ensayos; los resultados conservan el orden de las tareas, de modo que las grabaciones y las puntuaciones son las mismas que en una ejecución en serie. Define la variable en 1 para serializar.

Cada brazo live y cada llamada al juez se termina a la fuerza tras `OMA_SKILL_EVAL_TIMEOUT_MS` (180000 de forma predeterminada). Un despacho que agota el tiempo de espera se reintenta una vez antes de excluir la tarea del informe, porque una respuesta lenta es un fallo de transporte, no una respuesta; un segundo tiempo de espera agotado excluye la tarea (y, en la optimización, hace fallar la cobertura de la división). Aumenta el límite para los fixtures que legítimamente necesitan respuestas largas.

## Enrutamiento: ¿se selecciona la skill?

El lift de utilidad mide lo que hace el cuerpo una vez cargado. Los proveedores deciden si cargar una skill a partir de su `description` del frontmatter, así que un cuerpo mejor que nunca se selecciona no es una mejora. `--routing` envía el prompt de cada tarea, junto con el nombre y la descripción de cada skill instalada, al mismo modelo protegido y le pide la única skill que cargaría (o `NONE`). Que se elija la skill objetivo es una activación; que se elija otra skill es un enrutamiento erróneo; `NONE` es un fallo.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

El informe JSON incluye `routing` con `status`, los recuentos, `activationRate`, `misroutedTo` y `catalogSize`; cada hallazgo incluye `routing: target | other | none | unparsed`. Con `--record`, las elecciones se guardan en `_rollouts/<hash>.routing.json` junto con un hash del catálogo. Un `--mock --routing` posterior las reproduce solo mientras no cambie ninguna descripción ni tarea; en caso contrario, `status` es `stale` y no se cuenta nada.

Esto mide la descripción frente al catálogo a través del transporte protegido. No ejercita el mecanismo de descubrimiento propio del proveedor, que el perfil protegido desactiva deliberadamente, ni mide si se sigue el procedimiento de la skill cargada; eso sigue siendo la medición de utilidad.

## Un conjunto mínimo de fixtures funcionales

Para emitir un veredicto se necesitan cinco fixtures (`MIN_TASKS = 5`). Este es un conjunto mínimo para una skill `oma-scholar` imaginaria:

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

Repite el proceso para al menos tres tareas más. Después ejecuta:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Leer el informe

**Salida de texto:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**Salida JSON** (mediante `--json`):

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` suma lo que el proveedor informó para los brazos puntuados y, por separado, para sus llamadas al juez: número de despachos, tokens de entrada y de salida (incluidas las lecturas y escrituras de caché) y costo en USD. `status` es `actual` cuando todos los despachos informaron su uso, `partial` cuando algunos no lo hicieron y `unknown` cuando ninguno lo hizo (un transporte solo de texto, como el puente de Codex, no informa nada). Los rollouts registrados llevan `usage` y `judgeUsage` en cada entrada, de modo que una reproducción mock informa el costo de la grabación que reutiliza en lugar de cero.

`repeatability` separa la variación entre tareas de la variación entre repeticiones. `liftCi95` es un intervalo t pareado del 95 % sobre los lifts por tarea (null con menos de dos tareas puntuadas). Con `--trials` de dos o más, `withinTaskStdDev` es la desviación estándar media por tarea del lift por ensayo, y `status` es `stable` solo cuando el intervalo excluye el cero por el mismo lado que el lift; en caso contrario es `unstable` y un `pass` se degrada a `warn`. Una ejecución de un solo ensayo informa `single-trial`: puede mostrar lift, pero no que el lift se repita.

`ok` es `true` solo cuando `coverage === "ok"`, `decision === "pass"` y cualquier comprobación de transferencia negativa solicitada tiene cobertura suficiente. El campo `isolation` informa si el brazo base se ejecutó realmente sin la skill objetivo (consulta [Aislamiento de la skill](#skill-isolation-keeping-the-baseline-honest)); `isolation` es `"n/a"` en modo `--mock`.

---

## Integración con CI

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Códigos de salida:
- `0`: pass o warn
- `1`: fail o cobertura insuficiente de tareas o de transferencia negativa con `--require-coverage`

---

## Elegir live o mock

Usa `--live` con comprobadores judge para medir la utilidad real en tareas abiertas. Usa `--mock` para reproducir veredictos judge registrados previamente sin conexión o para ejecutar comprobaciones de contrato deterministas `assert`/`regex`.

El determinismo de mock se conserva registrando el veredicto binario del juez (PASS/FAIL) en la entrada del rollout durante `--live --record` y reproduciendo después esa puntuación registrada en ejecuciones `--mock`; no se vuelve a llamar al LLM.

**Salida de datos:** durante `--live`, el despacho del juez envía la salida del brazo candidato al proveedor configurado para que la califique. Al inicio de cada ejecución live se muestra una advertencia de una sola vez.

Si una ejecución mock informa de cobertura insuficiente, inspecciona la advertencia en busca de entradas `_rollouts` descartadas o ausentes y ejecuta después una pasada de grabación live tras corregir el fixture o la skill. La promoción live requiere un perfil protegido de Claude o Codex que funcione, con `isolation: "enforced"`; los demás perfiles siguen siendo exploratorios.

---

## Distribuir tareas de evaluación con una skill

Las skills pueden incluir un conjunto de tareas de evaluación colocando fixtures en `.agents/eval/<skill>/`. Son archivos escritos por el usuario fuera del directorio de la skill, por lo que sobreviven a `oma update`. Al crear una skill nueva con `oma-skill-creation`, añade un conjunto de fixtures `eval/` correspondiente para que los autores futuros puedan verificar el efecto de la skill. Consulta `.agents/skills/oma-skill-creation/SKILL.md` para el flujo de autoría de skills.
