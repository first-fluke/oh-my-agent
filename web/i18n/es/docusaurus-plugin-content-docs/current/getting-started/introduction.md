---
title: Introducción
description: Descripción completa de oh-my-agent, el framework de orquestación multiagente que convierte asistentes de programación basados en IA en equipos de ingeniería especializados con 33 paquetes de skills, 12 definiciones de subagentes, carga progresiva de skills y portabilidad entre IDEs.
---

# Introducción

oh-my-agent es un framework de orquestación multiagente para IDEs y herramientas CLI con IA. En lugar de depender de un único asistente de IA para todo, oh-my-agent distribuye el trabajo entre 33 paquetes de skills y 13 roles canónicos de despacho. Doce archivos de definición de subagentes versionados definen perfiles reutilizables para implementación, revisión, planificación, depuración, documentación, investigación e infraestructura. `research-explorer.md` se asigna al rol canónico `explore`; `orchestrator` es un rol de coordinación del runtime sin un archivo de definición independiente.

OMA proporciona comprobaciones mecánicas cuando las invocas o cuando seleccionas un workflow que las incluye. `oma verify agent <agent-type>` ejecuta las comprobaciones del tipo de agente seleccionado; `/ralph` añade verificación respaldada por artefactos y un bucle de juez; los hooks Stop habilitados de los proveedores pueden mantener abierto un workflow mientras se ejecutan sus comprobaciones configuradas. Cargar una skill por sí solo no establece la aceptación, y un prompt normal no ejecuta automáticamente todas las puertas del workflow. Usa los criterios de aceptación del workflow y los archivos resultantes para decidir qué está completo.

Todo el sistema vive en un directorio `.agents/` portable dentro de tu proyecto. Puedes cambiar entre Claude Code, Codex CLI, Antigravity CLI o IDE, Cursor, OpenCode y otras herramientas compatibles, y la configuración de tus agentes viaja con el código.

Si eres nuevo en OMA, empieza con [Inicio rápido](./quick-start.md) y después lee [Valores predeterminados importantes](./important-defaults.md). La instalación crea la SSOT y las integraciones de proveedores; la primera comprobación útil es `oma doctor`; la primera tarea útil es un cambio pequeño de un solo dominio. Pasa a `/work` o `/orchestrate` solo cuando la tarea necesite coordinación.

---

## El paradigma multiagente

Los asistentes de programación tradicionales basados en IA suelen gestionar frontend, backend, base de datos, seguridad e infraestructura desde un único contexto de prompt. Esto puede causar:

- **Dilución del contexto**: cargar conocimiento de todos los dominios desperdicia la ventana de contexto.
- **Propiedad poco clara**: una tarea entre dominios no tiene un límite explícito para cada parte.
- **Coordinación manual**: las funcionalidades complejas que abarcan varios dominios necesitan handoffs elegidos por el host o el usuario.

oh-my-agent resuelve esto mediante especialización:

1. **Cada skill tiene un dominio principal.** La skill frontend conoce React/Next.js, shadcn/ui, TailwindCSS v4 y la arquitectura FSD-lite. La skill backend conoce el patrón Repository-Service-Router, las consultas parametrizadas y la autenticación JWT. Los dominios pueden solaparse en sus límites, así que usa los criterios de aceptación de la tarea para decidir cuándo hace falta una segunda skill o un workflow coordinador.

2. **Los agentes pueden ejecutarse en paralelo.** Mientras un agente backend construye una API, un agente frontend puede trabajar en su propio workspace. El orquestador coordina mediante archivos duraderos y acotados a la ejecución, además de registros de ejecución.

3. **La orientación de calidad está integrada.** Las skills incluyen listas de comprobación de dominio, playbooks de errores y reglas de charter. El preflight del charter acota el alcance antes de escribir código; la revisión de QA se ejecuta cuando el workflow seleccionado la incluye o cuando la solicitas.

---

## Catálogo actual: 33 skills, 12 definiciones y 21 workflows

El catálogo separa tres conceptos fáciles de confundir:

- **Skills**: los 33 paquetes de conocimiento de dominio bajo `.agents/skills/*/SKILL.md`. Se enrutan desde la intención en lenguaje natural y cargan sus recursos progresivamente.
- **Definiciones de agentes**: los 12 archivos bajo `.agents/agents/`. Proporcionan personas de subagente nativas del proveedor y referencian una o más skills.
- **Workflows**: las 21 definiciones de procesos bajo `.agents/workflows/`. Cuatro son persistentes (`orchestrate`, `work`, `ultrawork` y `ralph`); los demás producen un informe y no mantienen activo el modo persistente.

Las secciones siguientes conservan el catálogo detallado de skills. Cuando cambia un nombre o una descripción, el frontmatter de `SKILL.md` activo es la autoridad.

Los 12 archivos de definición versionados cubren los 13 roles de runtime mediante alias: `research-explorer.md` se asigna a `explore`, mientras que `orchestrator` solo existe en el runtime. Los demás archivos de definición se asignan a los roles nombrados en [Agentes](../core-concepts/agents.md).

### Ideación, arquitectura y planificación

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-brainstorm** | Ideación centrada en el diseño | Explora la intención del usuario, propone 2-3 enfoques con análisis de compensaciones y produce documentos de diseño antes de escribir código. Workflow de 6 fases: Contexto, Preguntas, Enfoques, Diseño, Documentación y transición a `/plan`. |
| **oma-architecture** | Especialista en arquitectura de sistemas | Límites de módulos, servicios y propiedad, análisis de compensaciones y síntesis de partes interesadas. Metodologías: enrutamiento diagnóstico, comparación de diseño doble, registros de decisiones estilo ATAM, priorización estilo CBAM y registros ADR. Es consciente del coste por defecto. |
| **oma-pm** | Product manager | Descompone requisitos en tareas priorizadas con dependencias. Define contratos de API. Produce `.agents/results/plan-{sessionId}.json` y un tablero de tareas acotado a la sesión. Admite conceptos de ISO 21500, marcos de riesgo ISO 31000 y gobernanza ISO 38500. |

### Implementación

| Agente | Rol | Stack y recursos |
|-------|------|-----------------|
| **oma-frontend** | Especialista en UI/UX | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui y arquitectura FSD-lite. Librerías: luxon (fechas), ahooks o @mantine/hooks (hooks), es-toolkit (utilidades), Jotai/Zustand (estado cliente), TanStack Query mediante hooks generados por orval (estado servidor), @tanstack/react-form + Zod (formularios), better-auth (auth) y nuqs (estado de URL). Recursos: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md`, `checklist.md`. |
| **oma-backend** | Especialista en API y servidor | Arquitectura limpia (Router-Service-Repository-Models). Independiente del stack; detecta Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET a partir de los manifiestos del proyecto. JWT + Argon2id para auth. Recursos: `execution-protocol.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Admite `/stack-set` para generar referencias `stack/` específicas del lenguaje. |
| **oma-mobile** | Móvil multiplataforma | Flutter, Dart, Riverpod/Bloc para el estado, Dio con interceptores para llamadas API y GoRouter para navegación. Arquitectura limpia: domain-data-presentation. Material Design 3 (Android) + iOS HIG. Objetivo de 60fps. También admite iOS nativo con Swift: SwiftUI + `@Observable` (iOS 17+), `swift-openapi-generator` de Apple para clientes API y estructura `App/Core/Features/Shared`. Recursos: `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md`, `error-playbook.md`; `/stack-set` materializa las variantes por plataforma. |
| **oma-db** | Arquitectura de bases de datos | Modelado de bases SQL, NoSQL y vectoriales. Diseño de esquemas (3NF por defecto), normalización, índices, transacciones, planificación de capacidad y estrategia de copias de seguridad. Admite diseños conscientes de ISO 27001/27002/22301. Recursos: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Diseño

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-design** | Especialista en sistemas de diseño | Crea DESIGN.md con tokens, tipografía, sistemas de color, motion design (motion/react, GSAP, Three.js), diseño responsive-first y cumplimiento de WCAG 2.2. Workflow de 7 fases: Setup, Extract, Enhance, Propose, Generate, Audit y Handoff. Aplica antipatrones (sin "AI slop"). Integración opcional con Stitch MCP. Recursos: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, además de `reference/` con guías de tipografía, color, espacio, motion, responsive, componentes, accesibilidad y shaders. |

### Infraestructura, DevOps y observabilidad

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-tf-infra** | Infraestructura como código | Terraform multi-cloud (AWS, GCP, Azure, Oracle Cloud). Auth basada en OIDC, IAM con mínimo privilegio, policy-as-code (OPA/Sentinel) y optimización de costes. Admite controles de IA ISO/IEC 42001, continuidad ISO 22301 y documentación de arquitectura ISO/IEC/IEEE 42010. Recursos: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Automatización de tareas de monorepo | mise task runner, pipelines CI/CD, migraciones de base de datos, coordinación de releases, hooks de Git y validación pre-commit. Recursos: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |
| **oma-observability** | Router de observabilidad basado en intención | Cobertura de señales MELT+P (métricas/logs/trazas/perfiles/coste/auditoría/privacidad), ajuste de transporte (UDP/MTU, OTLP gRPC frente a HTTP, topología de Collector, muestreo), propagación de W3C Trace Context, gestión de SLO y alertas por burn rate, forense de incidentes (localización en 6 dimensiones) y metaobservabilidad (salud propia, sincronización de reloj, cardinalidad, retención). Prioriza CNCF; Fluentd está obsoleto (usa Fluent Bit u OTel Collector). |

### Calidad y depuración

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-qa** | Aseguramiento de calidad | Auditoría de seguridad (OWASP Top 10), análisis de rendimiento, accesibilidad (WCAG 2.2 AA) y revisión de calidad de código. Severidad: CRITICAL/HIGH/MEDIUM/LOW con archivo:línea y código de remediación. Admite características de calidad ISO/IEC 25010 y alineación de pruebas ISO/IEC 29119. Recursos: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Diagnóstico y corrección de bugs | Metodología reproduce-first. Análisis de causa raíz, correcciones mínimas, pruebas de regresión obligatorias y búsqueda de patrones similares. Usa herramientas MCP de inteligencia de código (Gortex o Serena) para rastrear símbolos. Recursos: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |
| **oma-refactor** | Refactorización que conserva el comportamiento | Reestructuración incremental segura con redes de pruebas de caracterización. Selección de hotspots (complejidad × churn), selección de code smells/SATD, reversión con el método Mikado si falla, expand-contract para cambios con estado y commits solo de refactorización (sin mezclar cambios de comportamiento). Transformaciones engine-first (renombrado del IDE, jscodeshift/ast-grep), métricas mediante `uvx lizard` / `uvx radon`. La legibilidad es el criterio de éxito; las métricas son indicadores indirectos. |

### Localización, coordinación y git

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-translation** | Traducción contextual | Flujo de seis escenas: Prepare, Acquire, Reason, Act, Verify y Finalize. El método de traducción tiene cuatro pasos: leer el significado y la sintaxis protegida, elegir el registro, reconstruir en el idioma objetivo y conservar el estilo del autor donde corresponda. Los perfiles por idioma (`resources/lang/{code}.md`) contienen reglas de registro y tipografía. Recursos: `translation-rubric.md`, `anti-ai-patterns.md`, `lang/{ko,ja,zh,en}.md`. |
| **oma-orchestration** | Coordinador multiagente automatizado | Lanza subagentes CLI en paralelo, coordina mediante archivos duraderos de sesión, tablero, progreso y resultados, y supervisa los bucles de verificación. Configurable: MAX_PARALLEL (3 por defecto), MAX_RETRIES (2 por defecto), POLL_INTERVAL (30s por defecto). Incluye un bucle de revisión entre agentes y evidencia de sesión opcional. Recursos: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Gestión de configuración de software (SCM) + Git | Gestiona estrategias de ramas, flujos de merge/rebase/conflicto, worktrees, líneas base y seguimiento del estado de releases. También guía mensajes Conventional Commit con staging seguro; los trailers de coautor proceden de la configuración efectiva `scm.co_author` cuando está habilitada. |
| **oma-coordination** | Guía manual de workflows multiagente | Coordinación paso a paso de agentes PM, Frontend, Backend, Mobile y QA mediante `oma agent spawn`. Comienza con la descomposición del PM, lanza tareas de la misma prioridad en workspaces separados, supervisa archivos de progreso/resultados acotados a la ejecución, alinea contratos API/datos antes del trabajo frontend/mobile y termina con la revisión de QA. Es la contraparte manual de `oma-orchestration`. |

### Búsqueda, retrospectiva y procesamiento de documentos

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-search** | Router de búsqueda basado en intención | Dirige consultas a Context7 (documentación), búsqueda web nativa, `gh`/`glab` (código) e inteligencia de código local (Gortex o Serena). Puntúa la confianza de dominio en todos los resultados no locales. Enrutamiento fail-forward (docs→web→fetch). Flags: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | Retrospectiva de trabajo entre herramientas | Analiza historiales de conversación de Grok, Claude, Codex, Gemini, Qwen, Cursor y Antigravity. Resuelve entradas de fecha/ventana en lenguaje natural, agrupa por herramienta y sesión, extrae temas, renderiza resúmenes diarios o por periodo y registra cuándo la CLI limita a 30 días una ventana solicitada. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | Conversión de documentos de procesador de texto coreano mediante `bunx kordoc@latest`. Conserva headings, tablas (incluidas las anidadas), notas al pie, hipervínculos e imágenes. Elimina caracteres del área de uso privado de Hancom mediante el postprocesador `flatten-tables.ts`. |
| **oma-pdf** | PDF → Markdown | Conversión de documentos PDF mediante `uvx opendataloader-pdf`. Conserva headings, tablas, listas e imágenes; modo híbrido OCR para PDF escaneados; salida normalizada con `uvx mdformat`. |

### Redacción académica y de investigación

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-academic-writing** | Prosa inglesa de nivel publicable | Redacta, revisa y audita ensayos, informes, resúmenes ejecutivos, conclusiones y revisiones bibliográficas. Aplica simultáneamente cuatro protocolos: estructura de la oración (4 tipos, longitud y comienzos variados), verbos (sustituye verbos genéricos prohibidos a partir de un corpus académico por niveles), hedging (fuerza ajustada a la evidencia) y cumplimiento anti-IA. Gate de la rúbrica quote-before-judgment, Claim-Evidence Map y reverse outlining. Modos: `draft` / `revise` / `review`. |
| **oma-scholar** | Compañero de sidecars de artículos de investigación | Busca, genera, valida, revisa y compara artículos académicos mediante la especificación de sidecars `.knows.yaml` de Knows (v0.9.0 / `paper@1`). Acceso eficiente a claims/evidencia/relaciones (~700 tokens solo para claims frente a ~10K para el PDF completo). `oma scholar search/resolve/get/lint` sobre knows.academy con fallback automático a OpenAlex para artículos anteriores a 2026. Anti-fabricación: omite campos desconocidos en lugar de adivinarlos. |

### Seguridad

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-deepsec** | Driver de escáner de vulnerabilidades basado en agentes | Opera Vercel `deepsec` (`bunx deepsec`) de extremo a extremo: ejecuta `init` sobre el workspace `.deepsec/`, escribe un `INFO.md` específico del proyecto, ejecuta pasadas `scan`/`process`/`triage`/`revalidate`/`export` conscientes del coste, protege PR mediante `process --diff` con un patrón CI de dos jobs y crea matchers personalizados. Calibra con `--limit 50 --concurrency 5` antes de una pasada grande y declara una previsión en dólares antes del trabajo de pago; el coste varía según el tamaño del repositorio y el backend. Backends: `codex` (gpt-5.5) o `claude` (claude-opus-4-8). |

### Documentación y metaherramientas

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-docs** | Detector de drift documental | El modo `verify` comprueba de forma determinista `docs/**/*.md` para detectar referencias rotas (rutas de archivos, comandos CLI, claves de configuración, variables de entorno y scripts) y termina con 0/1; el modo `sync` relaciona un diff de Git con documentos candidatos y prepara propuestas de parches del host LLM confirmadas por documento (nunca se aplican automáticamente). La comprobación de URL se delega en `lychee`; la CLI emite JSON estructurado y el host LLM hace toda la síntesis (sin llamadas al SDK del proveedor). Nunca modifica `.agents/`. |
| **oma-skill-creation** | Especialista en autoría de skills SSL-lite | Crea, actualiza y audita skills OMA en formato SSL-lite con las cuatro secciones obligatorias (Scheduling / Structural Flow / Logical Operations / References). Clasifica el tipo de skill, inserta exactamente una ruta canónica inline, aplica rutas cruzadas `When NOT to use` y ejecuta `oma skill audit` para detectar colisiones de descripción (aviso ≥ 60%, fallo ≥ 75% de similitud TF-IDF). Mueve el detalle largo de variantes a `resources/`. |
| **oma-explanation** | Explicador de cambios de código | Convierte un diff, PR, rama o rango de commits en un explicador HTML autocontenido y offline con Background, Intuition, Code y Quiz. El workflow `/explain` valida el artefacto final y lo escribe en `.agents/results/explain/`. |

### Investigación de mercado

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-market** | Inteligencia de señales de comunidad | Ejecuta el motor upstream `last30days` (Reddit con votos y comentarios reales, X, transcripciones de YouTube, TikTok, HN, Polymarket, GitHub, arXiv, Techmeme, Bluesky, web y más) mediante `oma market run`; oma mantiene el motor **siempre en su versión más reciente** (`~/.cache/oma-market/`), aplica `detect-trap` en cada ejecución, clasifica la intención (dolor / tendencia / competidor / descubrimiento) y añade secciones SWOT / 5 fuerzas de Porter / PESTEL. Emite un brief conforme a LAW en `.agents/results/market/{slug}-{YYYYMMDD}.md`. |

### Generación de medios y contenido

| Agente | Rol | Capacidades principales |
|-------|------|-------------------------|
| **oma-image** | Router de imágenes multi-proveedor | Despacho paralelo consciente de autenticación a Codex (`gpt-image-2` mediante ChatGPT OAuth, CLI-first), modelos Gemini de la familia Antigravity “nano-banana” mediante la CLI `agy` + Gemini Code Assist (el modelo exacto lo selecciona internamente) y Pollinations (`flux`/`zimage` gratuitos). Protocolo de aclaración/amplificación antes de generar, hasta 10 imágenes de referencia, guardrail de coste (confirmar a partir de ≥ $0.20) y `manifest.json` para reproducibilidad. CLI: `oma image generate`, `oma image doctor` y `oma image vendor list`. |
| **oma-slide** | Generador de decks HTML con animaciones | Genera presentaciones distintivas y sin "AI slop" en un escenario fijo de 1920×1080, después valida la geometría de forma determinista, crea un HTML autocontenido y exporta a PDF/PNG/PPTX mediante la CLI `oma slide`. Presets de estilo + plantillas marcadas, regla CJK→Pretendard, `prefers-reduced-motion` + foco visible obligatorios y bucle de validación con un máximo de 3 autocorrecciones. Delega las imágenes en `oma-image`; exportación/importación opcional mediante Canva MCP. |
| **oma-video** | Router de vídeos cortos, explainers y demos | Crea shorts/reels (9:16), explainers (16:9) y demos grabadas por una persona (16:9) mediante la CLI `oma video`. El bus determinista de recursos (`script.json` → `timing.json` → `render-spec.json`) alimenta un compositor HyperFrames gestionado; los proveedores pueden usar alternativas locales, mientras que la falta de composición/toolchain o los errores de renderizado hacen fallar la ejecución. La captura humana nunca automatiza credenciales. |
| **oma-voice** | TTS y STT local-first | Controla el servidor MCP Voicebox para notificaciones en el dispositivo, TTS de recursos y transcripción sin llamadas cloud ni coste por llamada. TTS usa WAV por defecto y puede transcodificarse localmente a MP3; la transcripción acepta rutas de audio o base64. Las llamadas TTS tienen un límite de 5000 caracteres y las entradas STT de 30 minutos; las ejecuciones persistidas de recursos/transcripciones escriben un manifiesto. |

---

## Modelo de divulgación progresiva

oh-my-agent usa una arquitectura de skills de dos capas para evitar agotar la ventana de contexto:

**Capa 1: SKILL.md (cargada cuando se enruta la skill)**
Contiene la identidad del agente, las condiciones de enrutamiento, las reglas principales y la orientación "when to use / when NOT to use". Esto es todo lo que se carga cuando el agente no está trabajando activamente.

**Capa 2: resources/ (cargados bajo demanda)**
Contiene protocolos de ejecución, referencias de stack tecnológico, snippets de código, playbooks de errores, listas de comprobación y ejemplos. Solo se cargan cuando se invoca el agente para una tarea y, aun así, solo los recursos pertinentes al tipo de tarea, según la evaluación de dificultad y el mapa tarea-recurso de `context-loading.md`.

Cuánto contexto ahorra esto depende de las skills y de la tarea, así que mídelo en lugar de suponer una cifra. Consulta las [matemáticas del ahorro de tokens](../core-concepts/skills.md#token-savings-math) para ver el script y qué cubren sus estimaciones.

---

## .agents/: la única fuente de verdad (SSOT)

Todo lo que oh-my-agent necesita vive en el directorio `.agents/`:

```
.agents/
├── oma-config.yaml         # Shared preferences and provider/model settings
├── oma-config.cue          # Optional schema-backed configuration
├── skills/                 # 33 skill directories + _shared resources
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{skill}/         # Per-skill SKILL.md + resources/variants
├── workflows/              # 21 workflow definitions
├── agents/                 # 12 subagent definitions
├── results/plan-{sessionId}.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

El directorio `.claude/` existe únicamente como capa de integración con el IDE. Contiene symlinks que apuntan a `.agents/`, además de hooks para la detección de palabras clave y el statusline HUD. El directorio `.agents/state/memories/` contiene el estado de coordinación en tiempo de ejecución durante las sesiones de orquestación (los proyectos antiguos recurren a la ruta heredada `.serena/memories/`).

Esta arquitectura hace que la configuración del agente sea:
- **Portable**: puedes cambiar de IDE sin reconfigurar.
- **Versionada**: puedes confirmar `.agents/` junto con el código.
- **Compartible**: el equipo obtiene la misma configuración de agentes.

---

## IDEs y herramientas CLI compatibles

oh-my-agent funciona con los IDEs y CLIs con IA seleccionados mediante la carga nativa de skills/prompts o archivos de integración generados:

| Herramienta | Método de integración | Agentes paralelos |
|------|-------------------|----------------|
| **Claude Code** | Skills nativas + herramienta Agent | Herramienta Task para paralelismo real |
| **Antigravity CLI/IDE** | Skills y ajustes MCP proyectados para `agy` | `oma agent spawn` |
| **Codex CLI** | Skills cargadas automáticamente | Peticiones paralelas mediadas por el modelo |
| **Cursor** | Skills mediante integración `.cursor/` | Spawns manuales |
| **OpenCode** | Skills + puente de plugin en proceso + subagentes generados (`.opencode/agents/`) | `oma agent spawn --vendor opencode` |
| **Kimi Code CLI** | Hooks + skills en `~/.kimi-code/` (escritura en HOME con consentimiento; también lee `.agents/skills/` de la SSOT de forma nativa); MCP Serena acotado al proyecto | `oma agent spawn --vendor kimi` |

El spawn de agentes se adapta a cada proveedor seleccionado mediante detección de proveedor y la configuración activa. Los runtimes del mismo proveedor pueden usar subagentes nativos; el trabajo entre proveedores recurre a `oma agent spawn`. Consulta [Ejecución paralela](../core-concepts/parallel-execution.md) para las reglas de despacho.

---

## Sistema de enrutamiento de skills

Cuando envías un prompt, oh-my-agent determina qué agente lo gestiona mediante el mapa de enrutamiento de skills (`.agents/skills/_shared/core/skill-routing.md`):

| Palabras clave de dominio | Se enruta a |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, Swift, SwiftUI, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestration |

Para las solicitudes complejas que abarcan varios dominios, el enrutamiento sigue órdenes de ejecución establecidas. Por ejemplo, "Create a fullstack app" se enruta a: oma-pm (plan), después oma-backend + oma-frontend (implementación paralela) y finalmente oma-qa (revisión).

---

## Statusline HUD

Al ejecutarse en Claude Code, oh-my-agent muestra un indicador persistente `[OMA]` en la barra de estado con:
- El nombre del modelo (por ejemplo, Opus, Sonnet).
- El uso de contexto con colores (verde < 70%, amarillo 70-85%, rojo > 85%).
- El estado del workflow activo (si hay uno persistente en ejecución).

El HUD usa `.claude/hooks/hud.ts` mediante la funcionalidad `statusLine` de Claude Code.

---

## Detección automática de workflows

No necesitas escribir `/command` para activar workflows. El sistema de hooks de oh-my-agent analiza tu entrada en lenguaje natural con los triggers de palabras clave definidos en `.agents/hooks/core/triggers.json` (integrados en el binario `oma` y compartidos por todos los proveedores), con soporte para 11 idiomas (inglés, coreano, japonés, chino, español, francés, alemán, portugués, ruso, neerlandés y polaco).

- **Entrada accionable** (por ejemplo, "plan the auth feature") → carga automáticamente el workflow.
- **Entrada informativa** (por ejemplo, "what is orchestrate?") → se filtra y no activa ningún workflow.
- **`/command` explícito** → el hook omite la detección para evitar duplicados.
- **Workflows persistentes** → vuelven a inyectar el contexto en cada mensaje hasta que digas "workflow done".

Cada evento del hook se entrega mediante la ABI canónica `oma hook run`: el proveedor ejecuta `oma-hook.sh --vendor <v> --event <nativeEvent>`, que lo dirige a la cadena de handlers en proceso y emite el dialecto específico del proveedor por stdout (siempre termina con 0, fail-open).

---

## Compatibilidad entre proveedores

oh-my-agent no se limita a Claude Code. Los proveedores con hooks comparten la misma ABI `oma hook run`, mientras que los proveedores de extensiones usan su puente en proceso:

| Proveedor | Entrega del hook | StatusLine |
|--------|--------------|------------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts` (directo, sin cambios) |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | — |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | Ruta `bun` mediante `ui.statusLine` |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | — |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | — |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | — |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop` (TOML global `[[hooks]]` en `~/.kimi-code/config.toml`) | — |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | — |
| **pi** | Puente en proceso (`installPiExtension`) — no pasa por `oma hook run` | — |

El directorio `.agents/` sigue siendo la fuente de verdad. La instalación enlaza o proyecta sus skills, workflows, hooks y definiciones de agentes en los proveedores seleccionados; las capacidades varían según el proveedor. Tanto los subagentes nativos del mismo proveedor como los agentes entre proveedores lanzados por CLI leen de esa fuente.

---

## Qué sigue

- **[Instalación](./installation.md)**: tres métodos de instalación, presets, configuración de CLIs y verificación.
- **[Agentes](/docs/core-concepts/agents)**: inmersión en las 33 skills, 13 roles de despacho y el preflight de charter.
- **[Skills](/docs/core-concepts/skills)**: explicación de la arquitectura de dos capas.
- **[Workflows](/docs/core-concepts/workflows)**: los 21 workflows con sus triggers y fases.
- **[Guía de uso](/docs/guide/usage)**: ejemplos reales desde tareas individuales hasta orquestación completa.
