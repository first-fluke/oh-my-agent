---
title: Habilidades
description: Guía completa de la arquitectura de habilidades en dos capas de oh-my-agent — diseño de SKILL.md, carga de recursos bajo demanda, cada recurso compartido explicado, protocolos condicionales, tipos de recursos por habilidad, protocolos de ejecución por proveedor, cálculo de ahorro de tokens y mecánica de enrutamiento de habilidades.
---

# Habilidades

Las habilidades son paquetes de conocimiento estructurado que otorgan a cada agente su experiencia de dominio. No son simples prompts — contienen protocolos de ejecución, referencias de stack tecnológico, plantillas de código, guías de resolución de errores, listas de verificación de calidad y ejemplos few-shot, organizados en una arquitectura de dos capas diseñada para la eficiencia de tokens.

---

## El Diseño de Dos Capas

### Capa 1: SKILL.md (~800 bytes, siempre cargada)

Cada habilidad tiene un archivo `SKILL.md` en su raíz. Este siempre se carga en la ventana de contexto cuando se referencia la habilidad. Contiene:

- **Frontmatter YAML** con `name` y `description` (usado para enrutamiento y visualización)
- **Cuándo usar / Cuándo NO usar** — condiciones explícitas de activación
- **Reglas principales** — las 5-15 restricciones más críticas del dominio
- **Vista general de arquitectura** — cómo debe estructurarse el código
- **Lista de librerías** — dependencias aprobadas y sus propósitos
- **Referencias** — punteros a recursos de Capa 2 (nunca se cargan automáticamente)

Ejemplo de frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

El campo description es crítico — contiene las palabras clave de enrutamiento que el sistema de enrutamiento de habilidades usa para emparejar tareas con agentes.

### Capa 2: resources/ (cargada bajo demanda)

El directorio `resources/` contiene conocimiento profundo de ejecución. Estos archivos se cargan solo cuando:
1. El agente es invocado explícitamente (vía `/command` o campo skills del agente)
2. El recurso específico es necesario para el tipo de tarea y dificultad actuales

Esta carga bajo demanda se gobierna por la guía de carga de contexto (`.agents/skills/_shared/core/context-loading.md`), que mapea tipos de tareas a recursos requeridos por agente.

---

## Ejemplo de Estructura de Archivos

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Capa 1: siempre cargada (~800 bytes)
└── resources/
    ├── execution-protocol.md         ← Capa 2: flujo paso a paso
    ├── tech-stack.md                 ← Capa 2: especificaciones tecnológicas detalladas
    ├── tailwind-rules.md             ← Capa 2: convenciones específicas de Tailwind
    ├── component-template.tsx        ← Capa 2: plantilla de componente React
    ├── snippets.md                   ← Capa 2: patrones de código listos para copiar
    ├── error-playbook.md             ← Capa 2: procedimientos de recuperación de errores
    ├── checklist.md                  ← Capa 2: lista de verificación de calidad
    └── examples/                     ← Capa 2: ejemplos few-shot entrada/salida
        └── examples.md
```

---

## Tipos de Recursos por Habilidad

| Tipo de Recurso | Patrón de Nombre | Propósito | Cuándo se Carga |
|-----------------|------------------|-----------|-----------------|
| **Protocolo de Ejecución** | `execution-protocol.md` | Flujo paso a paso: Analizar -> Planificar -> Implementar -> Verificar | Siempre (con SKILL.md) |
| **Stack Tecnológico** | `tech-stack.md` | Especificaciones tecnológicas detalladas, versiones, configuración | Tareas complejas |
| **Guía de Errores** | `error-playbook.md` | Procedimientos de recuperación con escalamiento de "3 strikes" | Solo en caso de error |
| **Lista de Verificación** | `checklist.md` | Verificación de calidad específica del dominio | En el paso de Verificación |
| **Snippets** | `snippets.md` | Patrones de código listos para copiar y pegar | Tareas Medias/Complejas |
| **Ejemplos** | `examples.md` o `examples/` | Ejemplos few-shot entrada/salida para el LLM | Tareas Medias/Complejas |
| **Variantes** | directorio `stack/` | Referencias específicas del lenguaje/framework (generadas por `/stack-set`) | Cuando existe el stack |
| **Plantillas** | `component-template.tsx`, `screen-template.dart` | Plantillas de archivos boilerplate | Al crear componentes |
| **Referencia de Dominio** | `orm-reference.md`, `anti-patterns.md`, etc. | Conocimiento profundo del dominio para subtareas específicas | Específico del tipo de tarea |

---

## Recursos Compartidos (_shared/)

Todos los agentes comparten fundamentos comunes desde `.agents/skills/_shared/`. Están organizados en tres categorías:

### Recursos Core (`.agents/skills/_shared/core/`)

| Recurso | Propósito | Cuándo se Carga |
|---------|-----------|-----------------|
| **`skill-routing.md`** | Mapea palabras clave de tareas al agente correcto. Contiene la tabla de Mapeo Skill-Agente, patrones de Enrutamiento de Solicitudes Complejas, Reglas de Dependencia entre Agentes, Reglas de Escalamiento y Guía de Límite de Turnos. | Referenciado por habilidades de orquestación y coordinación |
| **`context-loading.md`** | Define qué recursos cargar para qué tipo de tarea y dificultad. Contiene tablas de mapeo tipo-tarea-a-recurso por agente y disparadores de carga de protocolos condicionales. | Al inicio del flujo (Paso 0 / Fase 0) |
| **`prompt-structure.md`** | Define los cuatro elementos que debe contener cada prompt de tarea: Objetivo, Contexto, Restricciones, Completado Cuando. Incluye plantillas para agentes PM, implementación y QA. Lista anti-patrones (empezar solo con un Objetivo). | Referenciado por agente PM y todos los flujos |
| **`clarification-protocol.md`** | Define niveles de incertidumbre (LOW/MEDIUM/HIGH) con acciones para cada uno. Contiene disparadores de incertidumbre, plantillas de escalamiento, elementos de verificación requeridos por tipo de agente y comportamiento en modo subagente. | Cuando los requisitos son ambiguos |
| **`context-budget.md`** | Gestión del presupuesto de tokens. Define estrategia de lectura de archivos (usar `find_symbol` no `read_file`), presupuestos de carga de recursos por tier de modelo (Flash: ~3,100 tokens / Pro: ~5,000 tokens), manejo de archivos grandes y síntomas de desbordamiento de contexto. | Al inicio del flujo |
| **`difficulty-guide.md`** | Criterios para clasificar tareas como Simple/Media/Compleja. Define conteos de turnos esperados, ramificación de protocolo (Vía Rápida / Estándar / Extendida) y recuperación de errores de clasificación. | Al inicio de la tarea (Paso 0) |
| **`reasoning-templates.md`** | Plantillas de razonamiento estructurado para completar en patrones de decisión comunes (ej., plantilla de Decisión de Exploración #6 usada por el Bucle de Exploración). | Durante decisiones complejas |
| **`quality-principles.md`** | 4 principios universales de calidad aplicados a todos los agentes. | Al inicio del flujo para flujos enfocados en calidad (ultrawork) |
| **`vendor-detection.md`** | Protocolo para detectar el entorno de ejecución actual (Claude Code, Codex CLI, Gemini CLI, Antigravity, CLI Fallback). Usa verificaciones de marcadores: herramienta Agent = Claude Code, apply_patch = Codex, sintaxis @ = Gemini. | Al inicio del flujo |
| **`session-metrics.md`** | Puntuación de Deuda de Clarificación (DC) y seguimiento de métricas de sesión. Define tipos de eventos (clarify +10, correct +25, redo +40), umbrales (DC >= 50 = RCA, DC >= 80 = pausa) y puntos de integración. | Durante sesiones de orquestación |
| **`common-checklist.md`** | Lista de verificación universal de calidad aplicada en la verificación final de tareas Complejas (además de las listas específicas del agente). | Paso de Verificación de tareas Complejas |
| **`lessons-learned.md`** | Repositorio de aprendizajes de sesiones pasadas, auto-generado a partir de incumplimientos de Deuda de Clarificación y experimentos descartados. Organizado por sección de dominio. | Referenciado después de errores y al final de sesión |
| **`api-contracts/`** | Directorio con plantilla de contrato API y contratos generados. `template.md` define el formato por endpoint (método, ruta, esquemas de solicitud/respuesta, autenticación, errores). | Cuando se planifica trabajo que cruza límites |

### Recursos Runtime (`.agents/skills/_shared/runtime/`)

| Recurso | Propósito |
|---------|-----------|
| **`memory-protocol.md`** | Formato de archivos de memoria y operaciones para subagentes CLI. Define protocolos Al Inicio, Durante Ejecución y Al Completar usando herramientas de memoria configurables (read/write/edit). Incluye extensión de seguimiento de experimentos. |
| **`execution-protocols/claude.md`** | Patrones de ejecución específicos de Claude Code. Inyectado por `oh-my-ag agent:spawn` cuando el proveedor es claude. |
| **`execution-protocols/gemini.md`** | Patrones de ejecución específicos de Gemini CLI. |
| **`execution-protocols/codex.md`** | Patrones de ejecución específicos de Codex CLI. |
| **`execution-protocols/qwen.md`** | Patrones de ejecución específicos de Qwen CLI. |

Los protocolos de ejecución específicos del proveedor se inyectan automáticamente por `oh-my-ag agent:spawn` — los agentes no necesitan cargarlos manualmente.

### Recursos Condicionales (`.agents/skills/_shared/conditional/`)

Estos se cargan solo cuando se cumplen condiciones específicas durante la ejecución:

| Recurso | Condición de Disparo | Cargado Por | Tokens Aprox. |
|---------|---------------------|-------------|---------------|
| **`quality-score.md`** | La fase VERIFY o SHIP comienza en un flujo que soporta medición de calidad | Orquestador (pasa al prompt del agente QA) | ~250 |
| **`experiment-ledger.md`** | Se registra el primer experimento después de establecer una línea base IMPL | Orquestador (inline, después de la medición de línea base) | ~250 |
| **`exploration-loop.md`** | La misma puerta falla dos veces en el mismo problema | Orquestador (inline, antes de generar agentes de hipótesis) | ~250 |

Impacto en presupuesto: aproximadamente 750 tokens en total si se cargan los 3. Como la carga es condicional, las sesiones típicas cargan 1-2 de estos. El presupuesto flash-tier se mantiene dentro de la asignación de aproximadamente 3,100 tokens.

---

## Cómo se Enrutan las Habilidades vía skill-routing.md

El mapa de enrutamiento de habilidades define cómo se emparejan las tareas con los agentes:

### Enrutamiento Simple (Dominio Único)

Un prompt que contiene "Build a login form with Tailwind CSS" coincide con las palabras clave `UI`, `component`, `form`, `Tailwind`, y se enruta a **oma-frontend**.

### Enrutamiento de Solicitudes Complejas

Las solicitudes multi-dominio siguen órdenes de ejecución establecidos:

| Patrón de Solicitud | Orden de Ejecución |
|---------------------|-------------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) paralelo -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) paralelo -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> agentes relevantes -> oma-qa |
| "Do everything automatically" | oma-orchestrator (internamente: oma-pm -> agentes -> oma-qa) |

### Reglas de Dependencia entre Agentes

**Pueden ejecutarse en paralelo (sin dependencias):**
- oma-backend + oma-frontend (cuando el contrato API está predefinido)
- oma-backend + oma-mobile (cuando el contrato API está predefinido)
- oma-frontend + oma-mobile (independientes entre sí)

**Deben ejecutarse secuencialmente:**
- oma-brainstorm -> oma-pm (el diseño viene antes de la planificación)
- oma-pm -> todos los demás agentes (la planificación va primero)
- agente de implementación -> oma-qa (revisión después de implementación)
- oma-backend -> oma-frontend/oma-mobile (cuando no hay contrato API predefinido)

**QA siempre va al final**, excepto cuando el usuario solicita revisión de archivos específicos solamente.

---

## Cálculo de Ahorro de Tokens

Consideremos una sesión de orquestación de 5 agentes (pm, backend, frontend, mobile, qa):

**Sin divulgación progresiva:**
- Cada agente carga todos los recursos: ~4,000 tokens por agente
- Total: 5 x 4,000 = 20,000 tokens consumidos antes de cualquier trabajo

**Con divulgación progresiva:**
- Solo Capa 1 para todos los agentes: 5 x 800 = 4,000 tokens
- Capa 2 cargada solo para agentes activos (típicamente 1-2 a la vez): +1,500 tokens
- Total: ~5,500 tokens

**Ahorro: aproximadamente 72-75%**

En modelos flash-tier (contexto de 128K), esta es la diferencia entre tener 108K tokens disponibles para trabajo versus 125K tokens — un margen significativo para tareas complejas.

---

## Carga de Recursos por Dificultad de Tarea

La guía de dificultad clasifica las tareas en tres niveles, que determinan cuánto de la Capa 2 se carga:

### Simple (3-5 turnos esperados)

Cambio de un solo archivo, requisitos claros, repitiendo patrones existentes.

Carga: solo `execution-protocol.md`. Omitir análisis, proceder directamente a implementación con lista mínima.

### Media (8-15 turnos esperados)

2-3 cambios de archivos, algunas decisiones de diseño necesarias, aplicando patrones a nuevos dominios.

Carga: `execution-protocol.md` + `examples.md`. Protocolo estándar con análisis breve y verificación completa.

### Compleja (15-25 turnos esperados)

4+ cambios de archivos, decisiones de arquitectura requeridas, introduciendo nuevos patrones, dependencias con otros agentes.

Carga: `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. Protocolo extendido con checkpoints, registro de progreso a mitad de ejecución y verificación completa incluyendo `common-checklist.md`.

---

## Mapas de Carga de Contexto por Tarea (Por Agente)

La guía de carga de contexto proporciona mapeos detallados tipo-tarea-a-recurso. Estos son los mapeos clave:

### Agente Backend

| Tipo de Tarea | Recursos Requeridos |
|---------------|---------------------|
| Creación de API CRUD | stack/snippets.md (route, schema, model, test) |
| Autenticación | stack/snippets.md (JWT, password) + stack/tech-stack.md |
| Migración de BD | stack/snippets.md (migration) |
| Optimización de rendimiento | examples.md (ejemplo N+1) |
| Modificación de código existente | examples.md + Serena MCP |

### Agente Frontend

| Tipo de Tarea | Recursos Requeridos |
|---------------|---------------------|
| Creación de componentes | snippets.md + component-template.tsx |
| Implementación de formularios | snippets.md (form + Zod) |
| Integración con API | snippets.md (TanStack Query) |
| Estilos | tailwind-rules.md |
| Layout de página | snippets.md (grid) + examples.md |

### Agente Design

| Tipo de Tarea | Recursos Requeridos |
|---------------|---------------------|
| Creación de sistema de diseño | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Diseño de landing page | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
| Auditoría de diseño | checklist.md + anti-patterns.md |
| Exportación de tokens de diseño | design-tokens.md |
| Efectos 3D / shader | reference/shader-and-3d.md + reference/motion-design.md |
| Revisión de accesibilidad | reference/accessibility.md + checklist.md |

### Agente QA

| Tipo de Tarea | Recursos Requeridos |
|---------------|---------------------|
| Revisión de seguridad | checklist.md (sección Seguridad) |
| Revisión de rendimiento | checklist.md (sección Rendimiento) |
| Revisión de accesibilidad | checklist.md (sección Accesibilidad) |
| Auditoría completa | checklist.md (completa) + self-check.md |
| Puntuación de calidad | quality-score.md (condicional) |

---

## Composición de Prompts del Orquestador

Cuando el orquestador compone prompts para subagentes, incluye solo recursos relevantes para la tarea:

1. Sección de Reglas Principales del SKILL.md del agente
2. `execution-protocol.md`
3. Recursos que coinciden con el tipo de tarea específico (de los mapas anteriores)
4. `error-playbook.md` (siempre incluido — la recuperación es esencial)
5. Protocolo de Memoria Serena (modo CLI)

Esta composición dirigida evita cargar recursos innecesarios, maximizando el contexto disponible del subagente para el trabajo real.
