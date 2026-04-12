---
title: Introducción
description: Una visión completa de oh-my-agent — el framework de orquestación multiagente que transforma los asistentes de codificación con IA en equipos de ingeniería especializados con 14 agentes de dominio, carga progresiva de habilidades y portabilidad entre IDEs.
---

# Introducción

oh-my-agent es un framework de orquestación multiagente para IDEs y herramientas CLI potenciados por IA. En lugar de depender de un único asistente de IA para todo, oh-my-agent descompone el trabajo entre 14 agentes especializados — cada uno modelado como un rol real de un equipo de ingeniería con su propio conocimiento de stack tecnológico, protocolos de ejecución, guías de resolución de errores y listas de verificación de calidad.

Todo el sistema reside en un directorio portable `.agents/` dentro de tu proyecto. Cambia entre Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor o cualquier otra herramienta compatible — la configuración de tus agentes viaja con tu código.

---

## El Paradigma Multiagente

Los asistentes de codificación con IA tradicionales operan como generalistas. Manejan frontend, backend, bases de datos, seguridad e infraestructura con el mismo contexto de prompt y el mismo nivel de experiencia. Esto genera:

- **Dilución de contexto** — cargar conocimiento de todos los dominios desperdicia la ventana de contexto
- **Calidad inconsistente** — un generalista no puede igualar a un especialista en ningún dominio individual
- **Falta de coordinación** — las funcionalidades complejas que abarcan múltiples dominios se manejan secuencialmente

oh-my-agent resuelve esto con especialización:

1. **Cada agente conoce un dominio en profundidad.** El agente frontend conoce React/Next.js, shadcn/ui, TailwindCSS v4, arquitectura FSD-lite. El agente backend conoce el patrón Repository-Service-Router, consultas parametrizadas, autenticación JWT. No se solapan.

2. **Los agentes se ejecutan en paralelo.** Mientras el agente backend construye tu API, el agente frontend ya está creando la interfaz. El orquestador coordina mediante memoria compartida.

3. **La calidad está integrada.** Cada agente tiene una lista de verificación específica del dominio y una guía de resolución de errores. La verificación previa de charter detecta la ampliación del alcance antes de escribir código. La revisión de QA es un paso de primera clase, no algo secundario.

---

## Los 14 Agentes

### Ideación y Planificación

| Agente | Rol | Capacidades Clave |
|--------|-----|-------------------|
| **oma-brainstorm** | Ideación orientada al diseño | Explora la intención del usuario, propone 2-3 enfoques con análisis de compromisos, produce documentos de diseño antes de escribir código. Flujo de trabajo de 6 fases: Contexto, Preguntas, Enfoques, Diseño, Documentación, Transición a `/plan`. |
| **oma-pm** | Product manager | Descompone requisitos en tareas priorizadas con dependencias. Define contratos de API. Genera `.agents/results/plan-{sessionId}.json` y `task-board.md`. Soporta conceptos ISO 21500, marco de riesgos ISO 31000, gobernanza ISO 38500. |

### Implementación

| Agente | Rol | Stack Tecnológico y Recursos |
|--------|-----|------------------------------|
| **oma-frontend** | Especialista en UI/UX | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, arquitectura FSD-lite. Librerías: luxon (fechas), ahooks (hooks), es-toolkit (utilidades), Jotai (estado cliente), TanStack Query (estado servidor), @tanstack/react-form + Zod (formularios), better-auth (autenticación), nuqs (estado URL). Recursos: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | Especialista en API y servidor | Arquitectura limpia (Router-Service-Repository-Models). Agnóstico al stack — detecta Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET desde los manifiestos del proyecto. JWT + bcrypt para autenticación. Recursos: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Soporta `/stack-set` para generar referencias `stack/` específicas del lenguaje. |
| **oma-mobile** | Multiplataforma móvil | Flutter, Dart, Riverpod/Bloc para gestión de estado, Dio con interceptores para llamadas API, GoRouter para navegación. Arquitectura limpia: domain-data-presentation. Material Design 3 (Android) + iOS HIG. Objetivo de 60fps. Recursos: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Arquitectura de bases de datos | Modelado de bases de datos SQL, NoSQL y vectoriales. Diseño de esquemas (3NF por defecto), normalización, indexación, transacciones, planificación de capacidad, estrategia de respaldos. Soporta diseño consciente de ISO 27001/27002/22301. Recursos: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Diseño

| Agente | Rol | Capacidades Clave |
|--------|-----|-------------------|
| **oma-design** | Especialista en sistemas de diseño | Crea DESIGN.md con tokens, tipografía, sistemas de color, diseño de movimiento (motion/react, GSAP, Three.js), layouts responsive-first, conformidad WCAG 2.2. Flujo de 7 fases: Configuración, Extracción, Mejora, Propuesta, Generación, Auditoría, Entrega. Aplica anti-patrones (sin "AI slop"). Integración opcional con Stitch MCP. Recursos: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, más directorio `reference/` con guías de tipografía, color, espaciado, movimiento, diseño responsive, patrones de componentes, accesibilidad y shaders. |

### Infraestructura y DevOps

| Agente | Rol | Capacidades Clave |
|--------|-----|-------------------|
| **oma-tf-infra** | Infraestructura como código | Terraform multi-nube (AWS, GCP, Azure, Oracle Cloud). Autenticación OIDC-first, IAM de mínimo privilegio, política como código (OPA/Sentinel), optimización de costos. Soporta controles de IA ISO/IEC 42001, continuidad ISO 22301, documentación de arquitectura ISO/IEC/IEEE 42010. Recursos: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Automatización de tareas en monorepos | mise task runner, pipelines CI/CD, migraciones de bases de datos, coordinación de releases, git hooks, validación pre-commit. Recursos: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### Calidad y Depuración

| Agente | Rol | Capacidades Clave |
|--------|-----|-------------------|
| **oma-qa** | Aseguramiento de calidad | Auditoría de seguridad (OWASP Top 10), análisis de rendimiento, accesibilidad (WCAG 2.1 AA), revisión de calidad de código. Severidad: CRITICAL/HIGH/MEDIUM/LOW con archivo:línea y código de remediación. Soporta características de calidad ISO/IEC 25010 y alineación de pruebas ISO/IEC 29119. Recursos: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Diagnóstico y corrección de bugs | Metodología de reproducción primero. Análisis de causa raíz, correcciones mínimas, pruebas de regresión obligatorias, escaneo de patrones similares. Usa Serena MCP para rastreo de símbolos. Recursos: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Localización, Coordinación y Git

| Agente | Rol | Capacidades Clave |
|--------|-----|-------------------|
| **oma-translator** | Traducción consciente del contexto | Método de traducción en 4 etapas: Analizar Fuente, Extraer Significado, Reconstruir en Idioma Destino, Verificar. Preserva tono, registro y terminología del dominio. Detección de patrones anti-IA. Soporta traducción por lotes (archivos i18n). Modo refinado opcional de 7 etapas para calidad de publicación. Recursos: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Coordinador multiagente automatizado | Genera subagentes CLI en paralelo, coordina mediante memoria MCP, monitorea progreso, ejecuta bucles de verificación. Configurable: MAX_PARALLEL (por defecto 3), MAX_RETRIES (por defecto 2), POLL_INTERVAL (por defecto 30s). Incluye bucle de revisión agente-a-agente y monitoreo de Deuda de Clarificación. Recursos: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Commits convencionales | Analiza cambios, determina tipo/alcance, divide por funcionalidad cuando es apropiado, genera mensajes de commit en formato Conventional Commits. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

---

## Modelo de Divulgación Progresiva

oh-my-agent utiliza una arquitectura de habilidades de dos capas para prevenir el agotamiento de la ventana de contexto:

**Capa 1 — SKILL.md (~800 bytes, siempre cargada):**
Contiene la identidad del agente, condiciones de enrutamiento, reglas principales y guía de "cuándo usar / cuándo NO usar". Esto es todo lo que se carga cuando el agente no está trabajando activamente.

**Capa 2 — resources/ (cargada bajo demanda):**
Contiene protocolos de ejecución, referencias de stack tecnológico, snippets de código, guías de resolución de errores, listas de verificación y ejemplos. Estos se cargan solo cuando el agente es invocado para una tarea, e incluso entonces, solo los recursos relevantes para el tipo de tarea específico (basándose en la evaluación de dificultad y el mapeo tarea-recurso en `context-loading.md`).

Este diseño ahorra aproximadamente un 75% de tokens en comparación con cargar todo por adelantado. Para modelos flash-tier (contexto de 128K), el presupuesto total de recursos es aproximadamente 3,100 tokens — apenas el 2.4% de la ventana de contexto.

---

## .agents/ — La Fuente Única de Verdad (SSOT)

Todo lo que oh-my-agent necesita reside en el directorio `.agents/`:

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 15 directorios de habilidades (14 agentes + _shared)
│   ├── _shared/            # Recursos centrales usados por todos los agentes
│   └── oma-{agent}/        # SKILL.md + resources/ por agente
├── workflows/              # 14 definiciones de flujos de trabajo
├── agents/                 # 7 definiciones de subagentes
├── results/plan-{sessionId}.json               # Salida del plan generado
├── state/                  # Archivos de estado de flujos activos
├── results/                # Archivos de resultados de agentes
└── mcp.json                # Configuración del servidor MCP
```

El directorio `.claude/` existe solo como capa de integración del IDE — contiene enlaces simbólicos que apuntan de vuelta a `.agents/`, además de hooks para detección de palabras clave y la barra de estado del HUD. El directorio `.serena/memories/` almacena el estado en tiempo de ejecución durante las sesiones de orquestación.

Esta arquitectura significa que la configuración de tus agentes es:
- **Portable** — cambia de IDE sin reconfigurar
- **Versionada** — haz commit de `.agents/` junto con tu código
- **Compartible** — los miembros del equipo obtienen la misma configuración

---

## IDEs y Herramientas CLI Compatibles

oh-my-agent funciona con cualquier IDE o CLI potenciado por IA que soporte carga de habilidades/prompts:

| Herramienta | Método de Integración | Agentes Paralelos |
|-------------|----------------------|-------------------|
| **Claude Code** | Habilidades nativas + herramienta Agent | Herramienta Task para paralelismo real |
| **Gemini CLI** | Habilidades auto-cargadas desde `.agents/skills/` | `oma agent:spawn` |
| **Codex CLI** | Habilidades auto-cargadas | Peticiones paralelas mediadas por modelo |
| **Antigravity IDE** | Habilidades auto-cargadas | `oma agent:spawn` |
| **Cursor** | Habilidades vía integración `.cursor/` | Generación manual |
| **OpenCode** | Carga de habilidades | Generación manual |

La generación de agentes se adapta automáticamente a cada proveedor mediante el protocolo de detección de proveedor, que verifica marcadores específicos (por ejemplo, la herramienta `Agent` para Claude Code, `apply_patch` para Codex CLI).

---

## Sistema de Enrutamiento de Habilidades

Cuando envías un prompt, oh-my-agent determina qué agente lo maneja usando el mapa de enrutamiento de habilidades (`.agents/skills/_shared/core/skill-routing.md`):

| Palabras Clave del Dominio | Enrutado A |
|---------------------------|------------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

Para solicitudes complejas que abarcan múltiples dominios, el enrutamiento sigue órdenes de ejecución establecidos. Por ejemplo, "Crear una aplicación fullstack" se enruta a: oma-pm (planificación) luego oma-backend + oma-frontend (implementación paralela) luego oma-qa (revisión).

---

## Próximos Pasos

- **[Instalación](./installation)** — Tres métodos de instalación, presets, configuración del CLI y verificación
- **[Agentes](/core-concepts/agents)** — Inmersión profunda en los 14 agentes y la verificación previa de charter
- **[Habilidades](/core-concepts/skills)** — La arquitectura de dos capas explicada
- **[Flujos de Trabajo](/core-concepts/workflows)** — Los 14 flujos de trabajo con disparadores y fases
- **[Guía de Uso](/guide/usage)** — Ejemplos reales desde tareas simples hasta orquestación completa
