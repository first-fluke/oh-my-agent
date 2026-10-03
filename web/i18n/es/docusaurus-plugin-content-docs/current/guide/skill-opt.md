---
title: "Optimización de skills"
sidebar_label: Optimización de skills
description: "Cómo usar oma skill optimize para evolucionar una skill de forma persistente y basada en evidencia, con gates deterministas de entrenamiento, validación y pruebas propiedad del runner."
---

# Optimización de skills

`oma skill optimize` evoluciona el archivo `SKILL.md` de una skill para maximizar su `utilityLift` medido por `oma skill eval`. Separa la evidencia bruta de los rollouts, el conocimiento persistente acotado y la skill ejecutable. Un Wiki Maintainer consolida los éxitos y fallos observables; un Proposer usa ese conocimiento para emitir ediciones acotadas de adición, eliminación o reemplazo. Los candidatos deben mejorar la utilidad de entrenamiento o de validación sin retroceder en ninguna de las dos divisiones, con mediciones completas de tareas y de transferencia negativa. `--apply` también requiere una prueba final propiedad del runner medida por completo y sin regresiones, y un aislamiento live verificado. En el despliegue no hay una consulta adicional de wiki durante la inferencia: la salida sigue siendo un `SKILL.md`.

Base de investigación: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

La optimización mediante la CLI requiere actualmente `--live` y genera llamadas de modelo. La ruta predeterminada (sin `--live`) y `--mock` no pueden generar ni reproducir propuestas porque no se ha implementado un cargador de propuestas registradas; se detienen antes de la evaluación. Usa `oma skill eval --mock` para la reproducción sin conexión. Las API inyectadas de optimizador y puntuador siguen disponibles para pruebas sin conexión. Pasar `--live` y `--mock` a la vez es un error.

---

## Dependencia obligatoria: fixtures de tareas de evaluación

`oma skill optimize` no puede ejecutarse sin fixtures de tareas de evaluación. Requiere al menos **5 fixtures de tareas** (`MIN_TASKS = 5`) en `.agents/eval/<skill>/`. Si encuentra menos, el comando falla inmediatamente:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

Consulta la [guía de evaluación de utilidad de skills](/docs/guide/skill-eval) para la convención del directorio `.agents/eval/<skill>/`, el esquema de fixtures, los tipos de comprobador y cómo preparar rollouts para la reproducción simulada.

La promoción también requiere un conjunto no vacío de tareas vecinas del mismo dominio que pertenezcan a otras skills. Cada puntuación de validación del candidato y la puntuación final del candidato deben medir las tareas vecinas de su división evaluada con el cuerpo exacto del candidato. La ausencia de vecinos o de grabaciones emparejadas completas no permite establecer que no haya transferencia negativa. La evaluación sin conexión solo puede reproducir grabaciones coincidentes del candidato; usa la optimización live para generar y evaluar candidatos nuevos.

La reproducción y el conocimiento acotado a la suite están ligados al contrato completo de tarea y evaluador, incluidas la rúbrica predeterminada efectiva del juez y la revisión del protocolo del puntuador. Las grabaciones anteriores y los ámbitos de conocimiento previos requieren evidencia nueva tras esta actualización de la procedencia; reetiquetar puntuaciones antiguas con hashes nuevos no establece una medición válida.

---

## Cómo funciona

Los fixtures se ordenan por ID de tarea y se dividen de forma determinista en conjuntos de **train**, **validación reservada** y **prueba final reservada al runner**. Con al menos cinco fixtures, las proporciones objetivo son 60/20/20 y cada partición contiene al menos una tarea. Por ejemplo, ocho fixtures producen cuatro tareas de train, una de validación y tres de prueba final tras el redondeo. Los fixtures que declaran el mismo `group` se asignan juntos, de modo que un hermano reformulado no pueda quedar en train mientras el original queda en la prueba final; con menos de tres grupos, la división vuelve a basarse en los ID de tarea y emite una advertencia. Las tareas de la prueba final proceden de este conjunto local de fixtures y se ocultan al Maintainer y al Proposer. Se rechazan los ID de tarea duplicados de la prueba final y el solapamiento con una división de desarrollo.

En cada época (hasta `--max-epochs`, cuyo valor predeterminado es 8):

1. **Puntuar el mejor `SKILL.md` actual en la división TRAIN** — `oma skill eval` devuelve los prompts, las salidas y la mejora observables de cada tarea. Cada tarea de una división interna debe tener ambos brazos puntuados; las comparaciones fallidas o ausentes no pueden reducir el denominador.
2. **El Wiki Maintainer consolida la evidencia** — hasta cinco fallos y tres éxitos se convierten en patrones enlazados a evidencia. Los fallos se eligen por su valor de aprendizaje: primero las regresiones y después los fallos compartidos más profundos; las tareas que ambos brazos ya aprueban se dejan fuera porque no dicen nada sobre la siguiente edición. Los éxitos se ordenan por mejora. Los patrones acotados y los resultados de gates anteriores se recuperan del sistema de memoria L1/L2/L3 de OMA.
3. **El Proposer emite K ediciones candidatas** (hasta `--edits-per-epoch`, cuyo valor predeterminado es 4). Las ediciones exactas que ya estén en el historial persistente de rechazos se omiten.
4. **Para cada edición candidata:**
   - Aplica la edición a una copia en memoria de `SKILL.md`.
   - Valida el candidato (el frontmatter `name`/`description` debe sobrevivir; el cuerpo debe poder analizarse).
   - Hace cumplir el presupuesto textual de tasa de aprendizaje: descarta ediciones cuyo cambio neto de caracteres supere `--lr` (600 caracteres de forma predeterminada).
   - Vuelve a puntuar cada tarea de la **división de validación reservada** (con comparaciones emparejadas de base y candidato en las tareas vecinas) y cada tarea de la **división de entrenamiento retenida** (sin comparaciones con vecinos).
5. **Aceptar el mejor candidato válido** según la regla de datos retenidos y reservados: el candidato no pierde nada en ninguna de las dos divisiones (`Δval ≥ 0` y `Δtrain ≥ 0`) y gana en al menos una de ellas. Los candidatos se ordenan por `Δval + Δtrain`. No se exige una ganancia estricta de validación, porque un cuerpo que ya aprueba todas las tareas de validación todavía puede repararse a partir de un fallo de entrenamiento sin ceder terreno en los datos reservados; la prueba final decide si esa reparación generaliza. La cobertura de tareas debe ser completa, la muestra no vacía de transferencia negativa debe medirse por completo y ningún vecino debe mostrar una regresión confirmada igual o inferior a `NEG_TRANSFER_FAIL = -0.1`. En las ejecuciones live, un vecino que muestra regresión en su primera comparación emparejada se vuelve a medir una vez; el delta registrado es la media de ambas comparaciones y solo una regresión reproducida (`confirmed: true`) rechaza el candidato. Las reproducciones mock no pueden volver a medir, así que una regresión observada en un único ensayo se mantiene. Los informes live deben declarar `isolation: "enforced"`. Los resultados de los gates de propuesta se registran con `deltaLift` (validación), `deltaTrainLift` y los deltas de los vecinos que respaldan el veredicto.
6. **Detener pronto** después de 2 épocas consecutivas sin una edición aceptada (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Ejecutar la prueba final propiedad del runner después de la evolución.** Tanto el cuerpo original como el ganador de validación deben cubrir todas las tareas de la prueba final. El candidato no debe perder mejora en la prueba final (`candidateLift >= baselineLift`; la ganancia por la que se aceptó ya se demostró en las divisiones de desarrollo, y exigir una ganancia estricta en una prueba pequeña y congelada haría imposible promover la mayoría de las reparaciones) y debe superar otra comprobación completa de transferencia negativa específica del candidato. `finalTest.findings` lista la mejora por tarea del cuerpo original y del candidato, de modo que una prueba fallida pueda interpretarse como una regresión real o como una sola tarea ruidosa. Las pruebas finales ausentes, incompletas o fallidas impiden la promoción. Los fallos finales medidos siguen siendo registros de auditoría y no se convierten en conocimiento de rechazo para optimizaciones posteriores.

El optimizador trabaja sobre una copia candidata en memoria durante el bucle.

Los candidatos no medidos se registran como `inconclusive`, con motivos como `insufficient-coverage`, `negative-transfer-unmeasured` o `unverified-isolation`. Se excluyen del historial de rechazos aprendido y siguen siendo aptos para un reintento una vez reparadas las condiciones de evaluación. Una regresión confirmada de un vecino, una pérdida en cualquiera de las divisiones (`split-regression`) o la ausencia de ganancia en ambas (`no-validation-lift`) es un rechazo. Los diagnósticos que indican una evaluación incompleta o un mantenimiento degradado bloquean la promoción.

---

## Uso

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Flags

| Flag | Valor predeterminado | Descripción |
|:-----|:---------------------|:------------|
| `--skill <id>` | `_all` | ID de la skill que se optimizará (nombre simple, sin separadores de ruta). |
| `--dry-run` | **sí (predeterminado)** | Propone ediciones e imprime el diff sin cambiar `SKILL.md`; la evidencia generada y los eventos de evolución se conservan igualmente. |
| `--apply` | — | Escribe el candidato validado cuando pasan todos los gates de promoción, incluida la evidencia completa de prueba final y de transferencia negativa; hace una copia de seguridad del original antes de una escritura atómica. Una skill propiedad de OMA también requiere `--yes`. |
| `--mock` | Predeterminado sin `--live` | La reproducción de propuestas en la CLI no está implementada, así que esta ruta se detiene antes de la evaluación. Usa `oma skill eval --mock` para la reproducción de evaluaciones sin conexión. |
| `--live` | — | Obligatorio en la optimización actual de la CLI. Genera llamadas de modelo reales; imprime una vista previa del coste y solicita confirmación salvo que se use `--yes`. |
| `--max-epochs <n>` | `8` | Número máximo de épocas de optimización. |
| `--edits-per-epoch <k>` | `4` | Número de ediciones candidatas que propone el LLM optimizador por época. |
| `--lr <chars>` | `600` | Presupuesto textual de tasa de aprendizaje: cambio neto máximo de caracteres por edición aceptada. |
| `--yes` | — | Omite la confirmación de la vista previa del coste live y reconoce el comportamiento de sobrescritura al aplicar una skill propiedad de OMA. |
| `--json` | — | Produce JSON para CI/CD. |
| `--output <format>` | `text` | Formato de salida (`text` o `json`). |

---

## Ejemplo mínimo de extremo a extremo

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Salida ilustrativa para ocho fixtures y un candidato que supera todos los gates de promoción:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

El diff muestra lo que escribiría el optimizador. `SKILL.md` no cambia, mientras que la evidencia de evolución generada y los resultados de gates acotados se conservan para ejecuciones futuras.

---

## Aplicar una mejora validada

Cuando estés conforme con el diff propuesto, vuelve a ejecutarlo con `--apply`:

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### El procedimiento como artefacto

Los prompts del optimizador y del maintainer son el procedimiento de mejora. Se distribuyen como valores predeterminados integrados y pueden reemplazarse con archivos bajo `.agents/evolution/` (propiedad del usuario: el manifiesto de instalación nunca los copia ni `oma update` los elimina, a diferencia de `.agents/eval/`):

| Archivo | Función | Marcadores de posición obligatorios |
|---|---|---|
| `optimizer.md` | Propone ediciones de SKILL.md a partir de la evidencia de entrenamiento y del conocimiento persistente | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (también `{{knowledge}}`) |
| `maintainer.md` | Consolida la evidencia en patrones reutilizables | `{{evidence}}`, `{{priorFacts}}` (también `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Superficies que el bucle nunca debe escribir, qué partes del procedimiento puede cambiar una metaoptimización, `anchors` predeterminados de verdad de referencia (ground truth) para las ejecuciones meta y un presupuesto de despachos | debe incluirse a sí mismo en `immutable` |

`budget.max_dispatches_per_run` (valor predeterminado `null`, sin límite) se aplica en las ejecuciones live: cada llamada de modelo subyacente (brazo de tarea, brazo vecino, juez, optimizador, maintainer) consume una unidad, y la llamada que superaría el límite se rechaza antes de realizarse. Entonces el bucle se detiene con un diagnóstico `budget:exhausted`, se omite la prueba final, se bloquea la promoción y el resultado informa `budget: { limit, used }`. El uso se registra en el resumen de la ejecución en cualquier caso, de modo que los procedimientos puedan compararse tanto por coste como por ganancia.

`oma skill procedure` imprime las fuentes activas y sus hashes; `--export` escribe los valores predeterminados para editarlos sin sobrescribir los archivos existentes. Una plantilla que omite un marcador de posición obligatorio se rechaza en lugar de degradarse en silencio. Cada ejecución registra `procedure` (un hash por parte más un hash combinado) y `memory` en su resultado, en su resumen de ejecución y en el linaje de promociones, de modo que la evidencia producida con un procedimiento nunca se confunda con la de otro.

La respuesta del optimizador se lee con tolerancia solo en cuanto al formato: se ignoran las vallas de código y las líneas en blanco, pero cualquier línea de contenido que no sea una línea `EDIT:` válida (o un `NO_ACTION` aislado) es un `parse-error`, y ahora el diagnóstico incluye la primera línea infractora para poder rastrear el fallo.

### Ablación de memoria y estadísticas a largo plazo

`--memory none` inicia una ejecución sin conocimiento previo (sin patrones recuperados ni historial de gates) y aun así la registra. Comparar ejecuciones con `--memory recall` (valor predeterminado) y con `--memory none` con el mismo presupuesto es la prueba de si el conocimiento persistente ayuda; afirmar que el bucle aprende de la experiencia requiere esa comparación, no la mera presencia de una memoria.

`oma skill evolution-stats --skill <id>` agrega todas las ejecuciones registradas de una skill a partir de `.agents/results/skill-evolution/<id>/*.jsonl`: ejecuciones por estado, propuestas por resultado de gate y la tasa de aceptación, mejoras verificadas (prueba final superada y promoción elegible), aplicaciones y reversiones, mejora final media, llamadas de modelo en las ejecuciones con medición y llamadas por mejora verificada (el coste del proceso y no el de una ejecución), y las mismas cifras desglosadas por modo de memoria y por hash de procedimiento. El informe de metaoptimización muestra las llamadas medias por ejecución interna para el procedimiento actual y para cada candidato, de modo que un procedimiento que obtiene más ganancia gastando más se vea como tal.

### Metaoptimización: el procedimiento como candidato

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` trata el prompt del optimizador (o del maintainer) como el objeto bajo prueba. Ejecuta el bucle interno (`oma skill optimize --dry-run`) en cada skill reservada indicada, `--repeats` veces, con el procedimiento actual; pide a un proposer hasta `--candidates` ediciones pequeñas de la plantilla; vuelve a ejecutar el bucle interno con cada candidato con el mismo presupuesto de `--max-epochs` y `--edits-per-epoch`; y compara cada candidato con el procedimiento actual por pares (skill, repetición) según la suma de las ganancias en la mejora de entrenamiento y en la de validación que logró el bucle interno.

Un candidato se promueve solo cuando el intervalo bootstrap pareado del 95 % de su diferencia de ganancia queda por encima de cero (con semilla, 1000 remuestreos), existen al menos tres pares y ninguna skill que mejoró con el procedimiento actual pierde más de la mitad de esa ganancia con el candidato. Una ejecución interna cuya evaluación quedó bloqueada (cobertura insuficiente, aislamiento no verificado, presupuesto agotado) se informa como fallida y se excluye de los pares, de modo que una interrupción del servicio no pueda contar como ganancia cero en uno de los brazos. Las skills reservadas deben tener margen de mejora: una skill en la que el cuerpo actual ya obtiene una puntuación perfecta no puede mostrar ganancia con ningún procedimiento. `--anchor` nombra skills que nunca se usan para la selección pero se ejecutan una vez con el procedimiento actual y con el ganador para mostrar la deriva; sin el flag se aplica la lista `anchors` de la constitución, de modo que un conjunto de referencia (ground truth) declarado una sola vez se comprueba en cada ejecución meta. Con `--apply`, la plantilla ganadora se escribe en `.agents/evolution/<target>.md` con una copia de seguridad con marca de tiempo, un parche en formato diff unificado y un registro en `.agents/results/skill-evolution/_procedure/promotions.jsonl` que incluye los hashes del padre y del candidato, el hash de la constitución y la evidencia (skills, repeticiones, presupuesto, pares, intervalo). Sin `--apply` no se escribe nada.

Lo que permanece congelado: la partición de prueba final de cada skill nunca se lee para la selección (la métrica es la ganancia de entrenamiento más la de validación), el código del evaluador y de la optimización figura como inmutable en la constitución, la constitución en sí no puede ser un objetivo y un objetivo debe aparecer en `meta_targets`. Las ejecuciones internas usan `--memory none` de forma predeterminada para que un procedimiento se juzgue por las ediciones que produce y no por el conocimiento recuperado de ejecuciones anteriores. Las ejecuciones internas de un mismo brazo se solapan entre skills (`OMA_META_CONCURRENCY`, hasta 4 de forma predeterminada), mientras que las repeticiones de una skill se mantienen en serie, porque la evidencia de cada skill se guarda en su propio archivo de artefactos. Cada ejecución interna registra el hash combinado del procedimiento con el que se ejecutó, de modo que `oma skill evolution-stats` pueda atribuir los resultados posteriores al procedimiento que los produjo.

Esta es la forma de nivel 5 descrita en la revisión sobre sistemas de automejora (la promoción retenida/reservada de Self-Harness, la evaluación repetida de ADAS con intervalos bootstrap y los evaluadores congelados como en AlphaEvolve): el propio sistema revisa el procedimiento, pero el juicio externo queda fuera del alcance del bucle. El coste escala como skills × repeticiones × (1 + candidatos) ejecuciones internas; el comando imprime el límite superior y pide confirmación salvo que se use `--yes`.

### Linaje de promociones

Cada escritura con `--apply` añade un registro a `.agents/results/skill-evolution/<skill>/promotions.jsonl` y escribe un diff unificado revisable en `promotions/<candidate-hash>.patch`, junto a él. El registro nombra los hashes del cuerpo padre y del candidato, la ruta instalada, la ruta de la copia de seguridad y la evidencia que respalda la escritura: las mejoras de validación y de prueba final, la decisión de promoción, el hash de la suite de fixtures, la revisión del protocolo del evaluador y los runtimes de origen y de destino. `oma skill promotions --skill <id>` lista el registro.

`oma skill rollback --skill <id>` restaura el cuerpo que reemplazó la aplicación más reciente. Se niega cuando el archivo instalado ya no coincide con el candidato de esa aplicación (se descartaría una edición manual posterior), cuando la copia de seguridad no coincide con el padre registrado o cuando esa aplicación ya se revirtió; una reversión correcta se añade al mismo registro con `reverses` apuntando a la aplicación. En una skill propiedad de OMA, el parche es el artefacto que hay que llevar al repositorio de origen o a una superposición de usuario, porque `oma update` sobrescribe la copia instalada; el registro marca `omaOwned: true` para que una actualización posterior no se confunda con una regresión.

`--apply` requiere al menos una edición aceptada sin pérdida de validación, `finalTest.passed: true` y `promotion.eligible: true`. Estos gates exigen una cobertura interna de tareas completa, una muestra de transferencia negativa específica del candidato, no vacía y medida por completo, y un aislamiento live aplicado (enforced). La ausencia de prueba final, las mediciones incompletas o los diagnósticos degradados del compilador impiden la escritura. Antes de la escritura atómica se crea una copia de seguridad del `SKILL.md` original, y el diff se imprime para su revisión.

La evaluación live puede satisfacer el gate de aislamiento mediante el perfil protegido de Claude o el perfil nativo de Codex. Claude conserva las comprobaciones de HOME y de objetivo. Codex verifica que el hilo efímero de app-server no tenga fuentes de instrucciones ni entornos de herramientas antes de enviar el prompt. Los demás perfiles de runtime siguen siendo exploratorios.

### Ver qué ha evolucionado

El bucle se anuncia en tres lugares, todos leídos de los registros de linaje de solo anexión y no de ninguna afirmación:

- `oma skill promotions --all` imprime una frase por cada cambio en todas las skills y en el procedimiento: qué se editó (el ancla y el reemplazo de la edición aceptada), las mejoras retenida y reservada antes y después, si la prueba final se mantuvo y, en una promoción de procedimiento, la diferencia de ganancia emparejada, su intervalo y las skills en las que se midió. `--skill <id>` limita la salida a una skill. Los registros de aplicación escritos por esta versión incluyen las ediciones aceptadas y las mejoras de entrenamiento; los registros anteriores recurren a los hashes.
- `oma doctor` muestra una nota **Evolution**: ediciones de skills aplicadas y revertidas, el último cambio por skill, promociones de procedimiento y lo que está pendiente de retroalimentar (incidentes capturados sin fixture, ejecuciones fallidas aún sin capturar), con el comando que los procesaría.
- Al inicio de una sesión, los hooks de instantánea de estado inyectan un bloque `harness evolved since your last session` que lista las promociones registradas desde la última sesión que mostró uno; cada cambio se anuncia una sola vez. El marcador se guarda en `.agents/state/evolution-notice.json`.

Activa la [evolución del harness del proyecto](./harness-evolution.md) para ejecutar ciclos de retroalimentación con presupuesto de forma programada:

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

Los ciclos automáticos aplican los cambios que pasan como superposiciones del proyecto, conservan el trabajo incompleto para reintentarlo y comparten un único cupo de despachos durante todo el ciclo. La programación predeterminada es diaria a las 03:00, hora local. Usa `--mode propose` para evaluar sin aplicar y `oma harness evolution disable` para detener la programación. La metaoptimización de procedimientos sigue siendo un comando manual independiente.

---

## Modo live

El modo live llama al Maintainer y al Proposer reales y vuelve a ejecutar los brazos de evaluación en vivo en cada época. Es costoso: cada tarea puntuada tiene llamadas de línea base y tratamiento, los fixtures de juez añaden llamadas de evaluación y la prueba final puntúa el cuerpo original y el candidato. La vista previa informa de un límite superior calculado a partir de la división real, que incluye la línea base inicial de validación, las llamadas de entrenamiento y del compilador, las llamadas de validación de los candidatos, las dos puntuaciones de la prueba final y las comprobaciones emparejadas con vecinos de cada candidato más el candidato final. Cada llamada tiene un tiempo de espera de 120 segundos. Los brazos protegidos de Claude y Codex desactivan las herramientas, el descubrimiento automático de instrucciones, MCP y la memoria de optimización.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

La vista previa del coste muestra el límite superior de llamadas de modelo subyacentes antes de realizar cualquier llamada LLM.

El Maintainer, el Proposer, los brazos de evaluación y los jueces comparten un transporte de texto protegido en directorios temporales nuevos. Claude usa su perfil restringido de la CLI. Codex usa el `codex app-server` nativo con el inicio de sesión de la CLI existente, el modelo y proveedor seleccionados y el esfuerzo de razonamiento; no sustituye un cliente con clave de API ni recurre a Claude. El perfil de Codex apunta a la CLI 0.154.x en macOS/Linux con almacenamiento nativo de credenciales en archivo y un `auth.json` existente. Cada llamada prepara un `CODEX_HOME` temporal privado que hace referencia a los archivos originales de configuración y autenticación sin copiar el contenido de las credenciales. La renovación nativa de tokens sigue usando el archivo de autenticación original. Se excluye el estado de arranque compartido y el estado temporal se limpia después. Los almacenes de credenciales keyring, auto y efímero no se admiten actualmente. El contrato del hilo se comprueba antes de enviar la entrada al modelo; las versiones, los modos de almacenamiento y los fallos de protocolo no admitidos terminan el despacho. Las herramientas, el descubrimiento de instrucciones al inicio, el acceso a MCP y la persistencia de sesión están desactivados para que los procesos del compilador no puedan leer fixtures ocultos mediante herramientas del agente. Los demás proveedores de compilador fallan de forma explícita hasta que dispongan de un transporte verificado.

El optimizador informa `proposed` para las ediciones válidas y `no-action` solo ante una respuesta `NO_ACTION` explícita. Los fallos de proceso o de API se convierten en `dispatch-error`; las respuestas mal formadas sin ediciones válidas se convierten en `parse-error`. Estos errores no pueden convertirse en listas de ediciones vacías. Si el Maintainer no puede proporcionar patrones validados, informa `degraded` con un motivo de despacho o de análisis; los patrones de respaldo se excluyen del conocimiento persistente y la ejecución no puede promover un candidato. Los fallos de evaluación aparecen en `diagnostics` y en los registros de gates de propuesta, no en el historial de rechazos aprendido.

---

## Salida JSON

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` requiere `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true` y `promotion.eligible === true`. `baselineTrainLift` y `finalTrainLift` informan de la división retenida junto con las mejoras de validación. La misma condición es el gate de `--apply`: una edición aceptada solo por una reparación de entrenamiento se escribe únicamente cuando la prueba final también pasa. La ausencia de prueba final o del objeto de promoción no puede producir `ok: true`. Los conteos de `_split` muestran la partición real de fixtures locales usada en la ejecución.

Por ejemplo, un candidato no medido puede producir este extracto del informe:

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Inspecciona `diagnostics`, `promotion.reasons` y cualquier `finalTest.blocker` antes de reintentar. `rejectedCount` no aumenta con una propuesta no concluyente. Un fallo medido en la prueba final puede aumentar el recuento de rechazos de auditoría de la ejecución y, aun así, permanece excluido del conocimiento persistente de rechazos.

---

## Advertencia de SSOT para skills `oma-*`

Las skills cuyo ID empieza por `oma-` son propiedad de oh-my-agent y `oma update` las sobrescribe. Para estas skills, se desaconseja `--apply`: usa `--dry-run` (el valor predeterminado), revisa el diff propuesto y sube los cambios al registro si la mejora es significativa. En las skills escritas por el usuario, `--apply` es seguro. La CLI muestra una advertencia cuando el objetivo pertenece a OMA:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Protección contra el sobreajuste

El Maintainer y el Proposer reciben la evidencia de rollouts de TRAIN. La selección de candidatos usa la división de VALIDATION reservada, y la división TEST, independiente, es propiedad del runner. La ejecución del compilador sin herramientas impide el acceso desde el workspace a esos fixtures y evaluadores ocultos.

Un fallo en la prueba final impide la aplicación. Su resultado sigue disponible para auditoría, pero ni los resultados del gate de la prueba final ni las propuestas no concluyentes alimentan el conocimiento persistente de optimización. Las rutas del registrador, de recarga del historial y de recuperación semántica también excluyen los resultados heredados de la prueba final, de modo que una ejecución posterior no puede usar el éxito o el fallo previos en la prueba final como retroalimentación de entrenamiento.

---

## Integración con CI

Usa la reproducción de la evaluación para una comprobación de CI sin conexión de las grabaciones existentes específicas del candidato:

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

La propia optimización mediante la CLI requiere `--live`; todavía no tiene un adaptador de reproducción de propuestas registradas. La guía anterior que describía `oma skill optimize --mock` como un optimizador completo sin conexión era incorrecta. Traslada los trabajos de reproducción sin conexión a `oma skill eval --mock`, o habilita de forma explícita la optimización live y su coste de modelo. En las ejecuciones de optimización, inspecciona `ok` y `promotion.eligible` del JSON: el código de salida cero también cubre las ejecuciones completadas que no encontraron ningún candidato promovible.

Códigos de salida de la optimización:

- `0` — la optimización terminó (con o sin mejora)
- `1` — entrada no válida o fallo de ejecución, incluidos la optimización de la CLI sin `--live`, los flags `--live --mock` en conflicto, un número insuficiente de fixtures, un proveedor de compilador no admitido, un fallo de despacho del optimizador o una salida mal formada del optimizador

---

## Consulta también

- [Evaluación de utilidad de skills](/docs/guide/skill-eval) — creación de fixtures de tareas, tipos de comprobador, modos mock/live y el directorio `_rollouts/`.
- [Comandos de la CLI](/docs/cli-interfaces/commands) — referencia de flags para todos los comandos de gestión de skills.
