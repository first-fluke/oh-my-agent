---
title: "Guía: Proyectos multiagente"
sidebar_label: Proyectos multiagente
description: Guía completa para coordinar agentes de varios dominios en frontend, backend, base de datos, mobile y QA, desde la planificación hasta el merge.
---

# Guía: Proyectos multiagente

## Cuándo usar la coordinación multiagente

Tu funcionalidad abarca varios dominios: API de backend + UI de frontend + esquema de base de datos + cliente mobile + revisión de QA. Un solo agente no puede cubrir todo el alcance y necesitas que los dominios avancen en paralelo sin pisar los archivos de los demás.

La coordinación multiagente es la opción adecuada cuando:

- La tarea involucra 2 o más dominios (frontend, backend, mobile, db, QA, debug, pm).
- Hay contratos API entre dominios (por ejemplo, un endpoint REST que consumen la web y mobile).
- Quieres ejecutar en paralelo para reducir el tiempo transcurrido.
- Necesitas una revisión de QA después de la implementación en todos los dominios.

Si tu tarea cabe por completo en un solo dominio, usa directamente el agente específico.

---

## La secuencia completa: de /plan a /review

El flujo multiagente recomendado sigue un pipeline estricto de cuatro pasos.

### Paso 1: /plan para requisitos y descomposición de tareas

El flujo `/plan` se ejecuta inline (sin generar subagentes) y produce un plan estructurado.

```
/plan
```

Qué sucede:

1. **Recopilar requisitos**: el agente PM pregunta por los usuarios objetivo, las funcionalidades principales, las restricciones y los destinos de despliegue.
2. **Analizar la viabilidad técnica**: usa el proveedor configurado de inteligencia de código para explorar el codebase existente en busca de código reutilizable y patrones de arquitectura. La búsqueda nativa solo se usa para rutas fuera del proyecto o rutas ignoradas.
3. **Definir contratos API**: diseña contratos de endpoints (método, ruta, esquemas de solicitud y respuesta, autenticación y respuestas de error) y los guarda en `.agents/results/api-contracts/` (artefactos de la ejecución); las especificaciones duraderas pasan a `docs/plans/contracts/` cuando se hace commit.
4. **Descomponer en tareas**: divide el proyecto en tareas accionables, cada una con agente asignado, título, criterios de aceptación, prioridad (P0-P3) y dependencias.
5. **Revisar el plan con el usuario**: presenta el plan completo para confirmación. El flujo no continúa sin la aprobación explícita del usuario.
6. **Guardar el plan**: escribe el plan aprobado en `.agents/results/plan-{sessionId}.json` y registra un resumen en memoria.

El archivo `.agents/results/plan-{sessionId}.json` es la entrada tanto para `/work` como para `/orchestrate`.

### Paso 2: /work u /orchestrate para la ejecución

Hay dos rutas de ejecución:

| Aspecto | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interacción** | Interactiva (el usuario confirma en cada etapa) | Automatizada (se ejecuta hasta completar) |
| **Planificación PM** | Integrada (el Paso 2 ejecuta el agente PM) | Carga un plan cuando existe; crea uno inline cuando falta |
| **Punto de control del usuario** | Después de revisar el plan (Paso 3) | El plan inline pasa por su puerta de revisión antes de generar agentes |
| **Modo persistente** | Sí (no puede terminarse hasta completar) | Sí (no puede terminarse hasta completar) |
| **Mejor para** | Primer uso y proyectos complejos que requieren supervisión | Ejecuciones repetidas y tareas bien definidas |

#### /work: pipeline multiagente interactiva

```
/work
```

1. Analiza la solicitud del usuario e identifica los dominios involucrados.
2. Ejecuta el agente PM para descomponer las tareas (crea plan-{sessionId}.json).
3. Presenta el plan para confirmación del usuario. **Se bloquea hasta que se confirme.**
4. Genera agentes por nivel de prioridad (primero P0, después P1, etc.); las tareas con la misma prioridad se ejecutan en paralelo.
5. Supervisa el progreso de los agentes mediante archivos de memoria.
6. Ejecuta la revisión del agente QA sobre todos los entregables (OWASP Top 10, rendimiento, accesibilidad y calidad de código).
7. Si QA encuentra problemas CRITICAL o HIGH, vuelve a generar el agente responsable con los hallazgos de QA. Repite el proceso hasta 2 veces por problema. Si el mismo problema persiste, activa el **Bucle de exploración**: genera 2-3 enfoques alternativos, inicia el mismo tipo de agente con prompts basados en hipótesis distintas en workspaces separados, hace que QA puntúe cada resultado y adopta el mejor.

#### /orchestrate: ejecución paralela automatizada

```
/orchestrate
```

1. Carga `.agents/results/plan-{sessionId}.json`; si no hay un plan utilizable, crea uno inline mediante `/plan`.
2. Inicializa una sesión con el formato de ID `session-YYYYMMDD-HHMMSS`.
3. Crea `orchestrator-session.md` y `task-board.md` en el directorio de memoria.
4. Genera agentes por nivel de prioridad y entrega a cada uno la descripción de la tarea, los contratos API y el contexto.
5. Supervisa el progreso consultando los archivos `progress-{agent}.md`.
6. Verifica cada agente completado mediante `verify.sh`. PASS (salida 0) lo acepta; FAIL (salida 1) lo vuelve a generar con el contexto del error (máximo 2 reintentos); un fallo persistente activa el Bucle de exploración.
7. Recopila todos los archivos `result-{agent}.md` y compila el informe final.

### Paso 3: agent spawn para gestionar agentes desde la CLI

El comando `agent spawn` es el mecanismo de bajo nivel que los flujos usan internamente. También puedes usarlo directamente:

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Todas las opciones:**

| Opción | Descripción |
|:-----|:-----------|
| `--vendor <vendor>` | Sobrescritura del proveedor CLI (antigravity/claude/codex/cursor/opencode/qwen/grok/pi). Cambia la resolución del modelo para este spawn. |
| `-w, --workspace <path>` | Directorio de trabajo del agente. Se detecta automáticamente desde la configuración del monorepo si se omite. |
| `--task-id <id>` | Vincula el spawn a una tarea del plan de sesión; el valor predeterminado es el ID del agente. |
| `--isolation worktree` | Crea un worktree de Git para el spawn; el valor predeterminado no añade aislamiento. |
| `--read-only` | Restringe el hijo a herramientas de inspección y suprime las opciones de aprobación automática. |

**Orden de resolución del proveedor** (gana la primera coincidencia):

1. La opción `--vendor` de la línea de comandos.
2. La sobrescritura `agents:` de `oma-config.yaml` para este agente.
3. Los valores predeterminados de agentes del `model_preset` activo.

Consulta [Modelos por agente](./per-agent-models.md) para conocer los detalles de configuración.

La **detección automática del workspace** comprueba las configuraciones de monorepo en este orden: pnpm-workspace.yaml, package.json workspaces, lerna.json, nx.json, turbo.json, mise.toml. Puntúa cada directorio de workspace según palabras clave del tipo de agente (por ejemplo, «web», «frontend» y «client» para el agente frontend). Si no encuentra una configuración de monorepo, recurre a candidatos codificados como `apps/web`, `apps/frontend`, `frontend/`, etc.

La **resolución del prompt** permite que el argumento `<prompt>` sea texto inline o una ruta de archivo. Si la ruta resuelve a un archivo existente, lee su contenido y lo usa como prompt. La CLI también inyecta los protocolos de ejecución específicos del proveedor desde `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Paso 4: /review para la verificación de QA

```
/review
```

El flujo de revisión ejecuta un pipeline completo de QA:

1. **Identificar el alcance**: pregunta qué debe revisarse (archivos concretos, una rama de funcionalidad o todo el proyecto).
2. **Comprobaciones de seguridad automatizadas**: ejecuta `npm audit`, `bandit` o el equivalente.
3. **Revisión manual de OWASP Top 10**: inyección, autenticación rota, datos sensibles, control de acceso, configuración incorrecta, deserialización insegura, componentes vulnerables y registro insuficiente.
4. **Análisis de rendimiento**: consultas N+1, índices faltantes, paginación sin límites, fugas de memoria, renderizados innecesarios y tamaños de bundles.
5. **Accesibilidad**: WCAG 2.1 AA, incluido HTML semántico, ARIA, navegación por teclado, contraste de color y gestión del foco.
6. **Calidad de código**: nombres, manejo de errores, cobertura de pruebas, modo estricto de TypeScript, importaciones sin uso y patrones async/await.
7. **Informe**: hallazgos categorizados como CRITICAL / HIGH / MEDIUM / LOW, con `file:line`, descripción y código de remediación.

En alcances grandes, el flujo delega en el subagente de QA. Con la opción `--fix`, entra en un Bucle de corrección y verificación: genera agentes de dominio para corregir los problemas CRITICAL/HIGH, vuelve a revisar y repite hasta 3 veces.

---

## Estrategia del ID de sesión

Cada sesión de orquestación recibe un identificador único con este formato:

```
session-YYYYMMDD-HHMMSS
```

Ejemplo: `session-20260324-143052`

El ID de sesión se usa para:

- Nombrar archivos de memoria (`orchestrator-session.md`, `task-board.md`).
- Rastrear procesos de agentes mediante archivos PID en el directorio temporal del sistema (`/tmp/subagent-{session-id}-{agent-id}.pid`).
- Correlacionar archivos de log (`/tmp/subagent-{session-id}-{agent-id}.log`).
- Agrupar resultados en `.agents/results/parallel-{timestamp}/`.

El ID de sesión se genera en el Paso 2 de `/orchestrate` y se entrega a todos los agentes generados. Así se pueden rastrear la sesión, los logs y los archivos PID de una misma ejecución.

---

## Asignación de workspace por dominio

Cada agente se genera en un directorio de workspace aislado para evitar conflictos de archivos. La asignación sigue estas reglas:

### Detección automática

Cuando se omite `-w` (o se establece en `.`), la CLI detecta el mejor workspace de la siguiente manera:

1. Explora los archivos de configuración del monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. Expande los patrones glob (por ejemplo, `apps/*`) a directorios reales.
3. Puntúa cada directorio según las palabras clave del tipo de agente:

| Tipo de agente | Palabras clave (en orden de prioridad) |
|:-----------|:---------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. La coincidencia exacta con el nombre del directorio obtiene 100 puntos, una coincidencia de contenido obtiene 50 y una coincidencia en la ruta obtiene 25.
5. Gana el directorio con la puntuación más alta.

### Candidatos de respaldo

Si no existe una configuración de monorepo, la CLI comprueba estas rutas codificadas en orden:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`.
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`.
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`.

Si ninguna coincide, el agente se ejecuta en el directorio actual (`.`).

### Sobrescritura explícita

Siempre está disponible:

```bash
oma agent spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Regla de contratos primero

Los contratos API son el mecanismo de sincronización entre agentes. La regla de contratos primero significa lo siguiente:

1. **Los contratos se definen antes de comenzar la implementación.** El Paso 3 del flujo `/plan` produce contratos API que se guardan en `.agents/results/api-contracts/` (o en `docs/plans/contracts/` para especificaciones duraderas).

2. **Cada agente recibe sus contratos relevantes como contexto.** Cuando `/orchestrate` genera agentes en el Paso 3, cada uno recibe «descripción de la tarea, contratos API y contexto relevante».

3. **Los contratos definen el límite de la interfaz.** Un contrato especifica:
   - Método HTTP y ruta.
   - Esquema del cuerpo de la solicitud (con tipos).
   - Esquema del cuerpo de la respuesta (con tipos).
   - Requisitos de autenticación.
   - Formatos de respuesta de error.

4. **Las violaciones de contrato se detectan durante el monitoreo.** El Paso 5 de `/work` usa el proveedor configurado de inteligencia de código para verificar la alineación del contrato API entre agentes. La búsqueda nativa solo se usa para rutas fuera del proyecto o rutas ignoradas.

5. **La revisión QA comprueba el cumplimiento del contrato.** La revisión de alineación del agente QA (Paso 6 de ultrawork y Paso 6 de work) compara explícitamente la implementación con el plan, incluidos los contratos API.

Sin contratos, un agente de backend podría devolver `{ "user_id": 1 }` mientras el agente de frontend consume `{ "userId": 1 }`. La regla de contratos primero evita este tipo de bug de integración.

---

## Puertas de merge: 4 condiciones

Antes de considerar completo cualquier trabajo multiagente, deben cumplirse cuatro condiciones:

### 1. Las comprobaciones declaradas tienen éxito

Cada criterio de aceptación tiene una comprobación pertinente y pasan las comprobaciones que declara el plan. El build solo se incluye cuando lo exige la puerta del proyecto; el contrato de resultados registra el argv y el código de salida reales.

### 2. Las pruebas pasan

Todas las pruebas existentes siguen pasando y las nuevas cubren la funcionalidad implementada. El agente QA revisa la cobertura como parte de su revisión de calidad de código.

### 3. Solo se modificaron archivos planificados

Los agentes no deben modificar archivos fuera del alcance asignado. El paso de verificación comprueba que solo hayan cambiado archivos relacionados con la tarea del agente. Así se evitan efectos secundarios no previstos en el código compartido.

### 4. La revisión QA está limpia

No quedan hallazgos CRITICAL ni HIGH en la revisión del agente QA. Los hallazgos MEDIUM y LOW pueden documentarse para futuros sprints, pero los bloqueadores deben resolverse.

En el flujo ultrawork, estas condiciones se convierten en puertas de fase explícitas (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE y SHIP_GATE), cada una con criterios de casilla que deben aprobarse antes de continuar.

---

## Ejemplos de spawn

### Spawn de un solo agente

```bash
# Spawn backend agent with Gemini (default)
oma agent spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent spawn frontend "Build user dashboard with React" session-20260324-143000 --vendor claude -w ./apps/web

# Spawn from a prompt file
oma agent spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Ejecución paralela mediante agent parallel

Con un archivo YAML de tareas:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent parallel tasks.yaml
```

Con el modo inline:

```bash
oma agent parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Modo en segundo plano (sin esperar):

```bash
oma agent parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```

Con sobrescritura de proveedor:

```bash
oma agent parallel tasks.yaml --vendor claude
```

---

## Anti-patrones que conviene evitar

### 1. Aprobar el plan sin revisarlo

`/orchestrate` puede crear un plan mediante `/plan` inline cuando no existe un archivo de plan utilizable. Ese plan inline sigue pasando por la puerta de revisión de `/plan`, y la generación de agentes del paso siguiente sigue la descomposición aprobada. Para trabajos grandes que abarcan varios dominios, ejecuta `/plan` al principio para obtener un tracker duradero en `docs/plans/work/` y margen para refinar la descomposición antes de generar agentes.

### 2. Workspaces superpuestos

Asignar el mismo directorio de workspace a dos agentes provoca conflictos de archivos: los cambios de uno pueden sobrescribir los del otro. Usa siempre directorios de workspace separados.

### 3. Contratos API faltantes

Generar agentes de backend y frontend sin definir primero los contratos hace que adopten suposiciones incompatibles sobre formatos de datos, nombres de campos y manejo de errores.

### 4. Ignorar los hallazgos de QA

Tratar la revisión QA como opcional. Los hallazgos CRITICAL y HIGH representan bugs reales que llegarán a producción. El flujo lo impone repitiendo el ciclo hasta que no queden bloqueadores.

### 5. Coordinación manual de archivos

Intentar fusionar manualmente los resultados de los agentes en lugar de dejar que el pipeline de verificación y QA gestione la integración. La verificación automatizada detecta problemas que la revisión manual puede pasar por alto.

### 6. Paralelización excesiva

Ejecutar tareas P1 antes de completar las tareas P0. Los niveles de prioridad existen porque las tareas P1 suelen depender de resultados P0. Los flujos aplican automáticamente el orden por nivel.

### 7. Omitir la verificación

Usar `agent spawn` directamente sin registrar después el contrato de resultados. Ejecuta las comprobaciones fijadas para la tarea y completa un claim estructurado; consulta [Resultados y reanudación de agentes](/docs/guide/agent-results-and-resume). El paso de verificación del flujo detectará después las comprobaciones fallidas y el desvío de alcance antes de reutilizar los resultados.

---

## Validación de la integración entre dominios

Después de que todos los agentes completen sus tareas individuales, hay que validar la integración entre dominios:

1. **Alineación de contratos API**: el proveedor configurado de inteligencia de código comprueba que las implementaciones de backend coincidan con los contratos que consumen frontend y mobile. La búsqueda nativa solo se usa para rutas fuera del proyecto o rutas ignoradas.

2. **Consistencia de tipos**: los tipos de TypeScript, las dataclasses de Python o los modelos de Dart compartidos entre dominios deben usar nombres y tipos de campo coherentes.

3. **Flujo de autenticación**: si el backend implementa autenticación JWT, el frontend debe enviar correctamente los tokens en las cabeceras y mobile debe almacenarlos y renovarlos de forma adecuada.

4. **Manejo de errores**: todos los consumidores de una API deben manejar las respuestas de error documentadas. Si el backend devuelve `{ "error": "unauthorized", "code": 401 }`, todos los clientes deben manejar este formato.

5. **Alineación del esquema de base de datos**: si el agente de base de datos crea migraciones, los modelos ORM de backend deben coincidir exactamente con el esquema.

La revisión de alineación del agente QA (Paso 6 de ultrawork y Paso 6 de work) realiza esta validación entre dominios de forma sistemática.

---

## Cuándo está terminado

Un proyecto multiagente está completo cuando:

- Todos los agentes de todos los niveles de prioridad terminaron correctamente.
- Los scripts de verificación pasan para todos los agentes (código de salida 0).
- La revisión QA informa de cero hallazgos CRITICAL y cero HIGH.
- Se confirmó la alineación de los contratos API entre dominios.
- El build termina correctamente y todas las pruebas pasan.
- El informe final se escribió en memoria y se presentó al usuario.
- El usuario dio la aprobación final (en `/work` y en SHIP_GATE de ultrawork).
