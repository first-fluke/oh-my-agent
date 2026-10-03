---
title: Habilidades
description: Guía completa de la arquitectura de dos capas de OMA con 33 habilidades, incluido el enrutamiento de SKILL.md, los recursos bajo demanda, los protocolos compartidos y condicionales, la ejecución por proveedor, las mediciones de tokens y la mecánica de enrutamiento.
---

# Habilidades

Las habilidades son paquetes de conocimiento estructurado que proporcionan a cada rol de despacho la orientación de su dominio. Incluyen protocolos de ejecución, referencias de stack tecnológico, plantillas de código, guías de recuperación de errores, listas de verificación de calidad y ejemplos cuando la habilidad los proporciona, organizados en una arquitectura de dos capas diseñada para ahorrar tokens.

---

## El diseño de dos capas

### Capa 1: SKILL.md (cargada cuando se enruta la habilidad)

Cada habilidad tiene un archivo `SKILL.md` en su raíz. Entra en la ventana de contexto cuando se enruta la habilidad: el hook inyector pasa una **referencia de ruta**, no el contenido, de modo que una habilidad que no se enruta no cuesta nada más allá de su `description`. Contiene:

- **Frontmatter YAML** con `name` y `description` (se usa para el enrutamiento y la visualización)
- **Cuándo usar / Cuándo NO usar**: condiciones explícitas de activación
- **Reglas principales**: las 5-15 restricciones más importantes del dominio
- **Vista general de la arquitectura**: cómo debe estructurarse el código
- **Lista de librerías**: dependencias aprobadas y sus propósitos
- **Referencias**: punteros a recursos de la Capa 2 (nunca se cargan automáticamente)

Ejemplo de frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

El campo `description` es crítico porque contiene las palabras clave de enrutamiento que el sistema de enrutamiento de habilidades usa para asociar tareas con agentes.

### Capa 2: resources/ (cargada bajo demanda)

El directorio `resources/` contiene conocimiento profundo para la ejecución. Estos archivos se cargan solo cuando:
1. El host o el flujo de trabajo ha seleccionado la habilidad (por ejemplo, mediante una coincidencia nativa o un comando explícito)
2. La tarea actual cumple la condición de carga de la referencia

Esta carga bajo demanda está gobernada por la guía de carga de contexto (`.agents/skills/_shared/core/context-loading.md`), que distingue las instrucciones del punto de entrada de las referencias seleccionadas por la tarea.

---

## Ejemplo de estructura de archivos

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Tipos de recursos por habilidad

| Tipo de recurso | Patrón de nombre | Propósito | Cuándo se carga |
|-----------------|------------------|-----------|-----------------|
| **Protocolo de ejecución** | `execution-protocol.md` | Flujo paso a paso: Analyze -> Plan -> Implement -> Verify | Cuando la operación seleccionada necesita los detalles de su comando o contrato |
| **Stack tecnológico** | `tech-stack.md` | Especificaciones detalladas de tecnología, versiones y configuración | Framework seleccionado o decisión de stack |
| **Guía de errores** | `error-playbook.md` | Procedimientos de recuperación con escalamiento de "3 strikes" | Solo cuando ocurre un error |
| **Lista de verificación** | `checklist.md` | Verificación de calidad específica del dominio | En el paso Verify |
| **Snippets** | `snippets.md` | Patrones de código listos para copiar y pegar | Implementación o estructura de salida poco familiares |
| **Ejemplos** | `examples.md` o `examples/` | Ejemplos few-shot de entrada/salida para el LLM | Implementación o estructura de salida poco familiares |
| **Variantes** | Directorio `variants/` | Referencias específicas del lenguaje o framework. Backend incluye semillas `node`, `python` y `rust`; mobile incluye un esquema y puede recibir referencias de plataforma generadas. | Cuando existe un stack coincidente |
| **Plantillas** | `component-template.tsx`, `screen-template.dart` | Plantillas de archivos boilerplate | Al crear un componente |
| **Referencia de dominio** | `orm-reference.md`, `anti-patterns.md`, etc. | Conocimiento profundo del dominio para subtareas específicas | Según el tipo de tarea |

---

## Recursos compartidos (_shared/)

Todos los agentes comparten fundamentos comunes de `.agents/skills/_shared/`. Se organizan en tres categorías:

### Recursos core (`.agents/skills/_shared/core/`)

| Recurso | Propósito | Cuándo se carga |
|---------|-----------|-----------------|
| **`skill-routing.md`** | Enruta según el resultado de la tarea, la responsabilidad sobre ella y las dependencias reales; sin cadena de agentes obligatoria ni cuota de turnos. | Lo consultan las habilidades de orquestación y coordinación |
| **`context-loading.md`** | Punto de entrada de la habilidad responsable, referencias condicionales y límites de carga en runtime. | Al componer el contexto |
| **`prompt-structure.md`** | Orienta el traspaso de tareas poco familiares con objetivo, contexto, restricciones reales y evidencia de aceptación; sin plantilla obligatoria para tareas directas. | Lo consultan el agente PM y todos los flujos |
| **`clarification-protocol.md`** | Resuelve los detalles rutinarios a partir del contexto y solo solicita la información o la autorización relevantes que falten. | Cuando los requisitos son ambiguos |
| **`context-budget.md`** | Estimaciones de tamaño de archivo, medición del prompt real, lecturas acotadas y checkpoints. | Tareas largas o diagnóstico de sobrecarga de contexto |
| **`difficulty-guide.md`** | Elige la profundidad de planificación y los entregables según las dependencias y las necesidades de verificación. | Cuando la descomposición necesita una estimación de dificultad |
| **`quality-principles.md`** | Orientación sobre alcance, mantenibilidad, evidencia y verificación proporcional. | Al comenzar flujos centrados en calidad (ultrawork) |
| **`vendor-detection.md`** | Protocolo para detectar el entorno de runtime actual (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen y CLI alternativa). Usa marcadores del host y el estado del proveedor configurado. | Al comenzar el flujo |
| **`session-metrics.md`** | Evidencia de sesión opcional, sin puntuaciones de penalización conversacional ni del evaluador. | Retrospectiva solicitada o corrección relevante |
| **`common-checklist.md`** | Comprobaciones aplicables entre dominios; sin límites globales de líneas ni requisito generalizado de captura de errores. | Revisión entre dominios cuando es relevante |
| **`lessons-learned.md`** | Captura y aplica lecciones respaldadas por evidencia, con condiciones de versión y de activación; sin umbral automático de RCA. | Después de errores y al terminar la sesión |
| **`api-contracts/`** | Plantilla de contrato opcional. Reutiliza los esquemas del proyecto; los contratos generados viven fuera de los archivos fuente de la habilidad. | Al planificar trabajo entre fronteras |

### Recursos runtime (`.agents/skills/_shared/runtime/`)

| Recurso | Propósito |
|---------|-----------|
| **`memory-protocol.md`** | Formato y operaciones de archivos de memoria para subagentes CLI. Define los protocolos On Start, During Execution y On Completion con herramientas de memoria configurables (read/write/edit), además de la extensión para seguimiento de experimentos. |
| **`execution-protocols/claude.md`** | Patrones de ejecución específicos de Claude Code. `oma agent spawn` los inyecta cuando el proveedor es claude. |
| **`execution-protocols/antigravity.md`** | Patrones de ejecución de Antigravity CLI (`agy`). |
| **`execution-protocols/codex.md`** | Patrones de ejecución específicos de Codex CLI. |
| **`execution-protocols/commandcode.md`** | Patrones de ejecución de CommandCode. |
| **`execution-protocols/grok.md`** | Patrones de ejecución de Grok. |
| **`execution-protocols/kimi.md`** | Patrones de ejecución de Kimi Code. |
| **`execution-protocols/kiro.md`** | Patrones de ejecución de Kiro. |
| **`execution-protocols/opencode.md`** | Patrones de ejecución de la extensión OpenCode. |
| **`execution-protocols/pi.md`** | Patrones de ejecución de la extensión pi. |
| **`execution-protocols/qwen.md`** | Patrones de ejecución específicos de Qwen CLI. |

Los protocolos de ejecución específicos del proveedor se inyectan automáticamente en los agentes generados por CLI mediante `oma agent spawn`. Los subagentes nativos usan las reglas de integración del proveedor seleccionado.

### Recursos condicionales (`.agents/skills/_shared/conditional/`)

Solo se cargan cuando se cumplen condiciones específicas durante la ejecución:

| Recurso | Condición de activación | Quién lo carga |
|---------|-------------------------|----------------|
| **`quality-score.md`** | Se necesita una línea base definida o una comparación de experimentos | Orquestador (lo pasa al prompt del agente QA) |
| **`experiment-ledger.md`** | Se registra el primer experimento después de establecer una línea base IMPL | Orquestador (inline, después de la medición de línea base) |
| **`exploration-loop.md`** | La recuperación falla repetidamente y las alternativas merecen probarse dentro del presupuesto | Orquestador (inline, antes de generar agentes de hipótesis) |

Estos recursos quedan diferidos hasta que se aplica el disparador de cada uno. La dificultad por sí sola no los inyecta.

---

## Cómo se enrutan las habilidades mediante skill-routing.md

El mapa de enrutamiento de habilidades define cómo se asocian las tareas con los agentes:

### Enrutamiento simple (un solo dominio)

Un prompt que contenga "Build a login form with Tailwind CSS" coincide con las palabras clave `UI`, `component`, `form`, `Tailwind` y se enruta a **oma-frontend**.

### Enrutamiento de solicitudes complejas

Las solicitudes multidominio siguen órdenes de ejecución establecidos:

| Patrón de solicitud | Orden de ejecución |
|---------------------|--------------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) en paralelo -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) en paralelo -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> agentes relevantes -> oma-qa |
| "Do everything automatically" | oma-orchestration (internamente: oma-pm -> agentes -> oma-qa) |

### Reglas de dependencia entre agentes

**Pueden ejecutarse en paralelo (sin dependencias):**
- oma-backend + oma-frontend (cuando el contrato de API está definido)
- oma-backend + oma-mobile (cuando el contrato de API está definido)
- oma-frontend + oma-mobile (independientes entre sí)

**Deben ejecutarse secuencialmente:**
- oma-brainstorm -> oma-pm (el diseño precede a la planificación)
- oma-pm -> todos los demás agentes (la planificación es lo primero)
- agente de implementación -> oma-qa (la revisión ocurre después de la implementación)
- oma-backend -> oma-frontend/oma-mobile (cuando no existe un contrato de API predefinido)

**QA siempre es el último**, salvo cuando el usuario solicita revisar solo archivos específicos.

---

## Cálculo de ahorro de tokens {#token-savings-math}

Mide antes de afirmar que hay ahorro:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

El script informa estimaciones (bytes UTF-8 / 4) para escenarios de tamaño de archivo. `routed` es solo el punto de entrada; `simple`, `medium` y `complex` añaden archivos hipotéticos de protocolo, ejemplos y stack para comparar. Sus nombres se conservan por compatibilidad con el script, no como instrucciones de precarga. `all` es un techo de tamaño de los recursos, no una configuración de runtime. Un checkout nuevo puede usar una semilla de plataforma como proxy de tamaño; no carga todas las plataformas.

El comando de contexto muestra la inyección real del contexto de la tarea. No incluye el resto de la conversación ni todas las instrucciones del host o del runtime. Usa un prompt ensamblado o la telemetría de uso para medir el total de tokens de entrada, la latencia y el costo en un modelo concreto. No los infieras a partir del tamaño del repositorio ni de los recuentos de copias espejo generadas.

## Carga de recursos por tarea

Todos los niveles de dificultad comienzan con la habilidad responsable. El grafo es un índice de referencias; la adyacencia no autoriza a cargar otro especialista, una guía de errores ni un flujo de experimentos condicional.

El cargador usa presupuestos flexibles de 1,500 / 4,000 / 8,000 tokens estimados para Simple / Medium / Complex. Un punto de entrada que supera el presupuesto se conserva y se informa del exceso. Las referencias de apoyo siguen diferidas, salvo que se seleccionen de forma explícita una vez resuelto su disparador de tarea. Un punto de entrada requerido nunca se sustituye por documentos más pequeños no relacionados.

La verificación se ajusta al riesgo de la tarea y a los requisitos del proyecto. Una etiqueta de dificultad no exige una suite de pruebas completa, una respuesta de preflight fija ni una segunda aprobación de un trabajo ya autorizado.

## Mapas de carga de contexto por tarea (por agente)

Estos son ejemplos de referencias para consultar cuando la tarea las necesita. Usa el índice actual de la habilidad responsable y selecciona solo las secciones aplicables:

### Agente backend

| Tipo de tarea | Recursos requeridos |
|---------------|---------------------|
| Creación de API CRUD | `variants/{node,python,rust}/snippets.md` coincidente cuando existe |
| Autenticación | `snippets.md` de la variante coincidente + `tech-stack.md` cuando existe |
| Migración de base de datos | `snippets.md` de la variante coincidente cuando existe |
| Optimización de rendimiento | `orm-reference.md` y cualquier ejemplo coincidente proporcionado por la habilidad |
| Modificación de código existente | Proveedor de inteligencia de código del proyecto y recursos de ejecución relevantes |

### Agente frontend

| Tipo de tarea | Recursos requeridos |
|---------------|---------------------|
| Creación de componentes | `snippets.md` + patrones de componentes existentes del proyecto |
| Implementación de formularios | `snippets.md` (formularios + Zod) |
| Integración de API | `snippets.md` (TanStack Query) |
| Estilos | `tailwind-rules.md` |
| Layout de página | `snippets.md` (grid) |

### Agente de diseño

| Tipo de tarea | Recursos requeridos |
|---------------|---------------------|
| Creación de sistema de diseño | `reference/typography.md` + `reference/color-and-contrast.md` + `reference/spatial-design.md` + `design-md-spec.md` |
| Diseño de landing page | `reference/component-patterns.md` + `reference/motion-design.md` + `prompt-enhancement.md` |
| Auditoría de diseño | `checklist.md` + `anti-patterns.md` |
| Exportación de tokens de diseño | `design-tokens.md` |
| Efectos 3D o shaders | `reference/shader-and-3d.md` + `reference/motion-design.md` |
| Revisión de accesibilidad | `reference/accessibility.md` + `checklist.md` |

### Agente QA

| Tipo de tarea | Recursos requeridos |
|---------------|---------------------|
| Revisión de seguridad | `checklist.md` (sección Security) |
| Revisión de rendimiento | `checklist.md` (sección Performance) |
| Revisión de accesibilidad | `checklist.md` (sección Accessibility) |
| Auditoría completa | `checklist.md` (completo) + `self-check.md` |
| Comparación de una métrica definida | `quality-score.md` (condicional) |

---

## Composición de prompts del orquestador

Cuando el orquestador compone prompts para subagentes, incluye solo los recursos relevantes para la tarea:

1. Ruta del `SKILL.md` de la habilidad responsable (el despacho mediante CLI ya inyecta el contenido)
2. La sección de `execution-protocol.md` de una operación seleccionada, cuando hace falta
3. Recursos que coinciden con el tipo de tarea concreto (según los mapas anteriores)
4. La sección relevante de `error-playbook.md`, solo después de un fallo observado
5. Memory Protocol (modo CLI)

Esta composición dirigida evita cargar recursos innecesarios y maximiza el contexto disponible para el trabajo real del subagente.

---

## Evidencia de sesión y revisión retrospectiva

Los registros de sesión recogen las correcciones relevantes, los cambios de alcance, el retrabajo y los hallazgos de revisión dirimidos, con evidencia. La aclaración necesaria no se penaliza. Las antiguas puntuaciones ponderadas CD y EA y las reglas de RCA activadas por umbrales se han eliminado: eran instrucciones de prompt, no métricas calculadas por la CLI.

Usa los resultados de tareas existentes siempre que sea posible. Un archivo `session-metrics-{sessionId}.md` independiente es opcional en el almacén de coordinación configurado. Un fallo repetido o una retrospectiva solicitada pueden justificar una lección, pero una comprobación fallida ordinaria o un hallazgo en disputa no establecen una automáticamente. Conserva los registros históricos; no los reescribas en el nuevo formato.

`oma stats` informa de la productividad y de los resúmenes de uso y costo registrados. `oma retro` agrupa en sugerencias los eventos reales de puertas, bloqueos y decisiones faltantes. Ninguno calcula puntuaciones CD/EA a partir de estos artefactos Markdown.

## Descomposición de tareas y recuperación de contexto

Planifica en torno a las dependencias y al comportamiento que se puede verificar de forma independiente. Un número fijo de sprints, la cantidad de archivos y las estimaciones de turnos no determinan la profundidad de la revisión ni la finalización. Mantén las pruebas y el manejo de errores junto al comportamiento que verifican.

Ante un estancamiento observado o una pérdida de contexto útil, guarda el trabajo completado, los criterios pendientes, las rutas relevantes y la evidencia de verificación antes de reanudar o volver a despachar. Conserva el trabajo existente y evita duplicar un intento en curso. La proporción entre turnos y progreso, por sí sola, no exige un reinicio.

## Medición y exploración condicionales

Una línea base definida o una comparación de experimentos activa la guía de medición; el mero hecho de tener pruebas o lint no la activa. Registra métricas comparables con unidades, método, revisión y evidencia. Las comprobaciones obligatorias de corrección y seguridad siguen siendo independientes. OMA no tiene ninguna fórmula compuesta predeterminada, puerta de calificación por letras ni reversión activada por puntuación.

Un experimento real registra su hipótesis, la evidencia de la línea base y del candidato, las comprobaciones obligatorias, la decisión y los archivos que le pertenecen. Los fallos repetidos pueden justificar probar otro mecanismo dentro del presupuesto de recuperación existente. Aísla los cambios del experimento, conserva las ediciones no relacionadas y verifica el candidato integrado antes de reanudar la puerta.
