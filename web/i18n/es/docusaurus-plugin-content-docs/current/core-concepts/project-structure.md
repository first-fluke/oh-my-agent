---
title: Estructura del proyecto
description: Mapa orientado al lector de una instalación de oh-my-agent, con la SSOT bajo .agents/, recursos representativos de skills, workflows, definiciones de agentes versionadas, estado del runtime, capas de integración de proveedores y la estructura del repositorio fuente.
---

# Estructura del proyecto

Después de instalar oh-my-agent, tu proyecto obtiene dos árboles de directorios principales: `.agents/` (la única fuente de verdad, incluido el almacén de coordinación `.agents/state/memories/`) y las capas de integración del runtime (por ejemplo, `.claude/`, `.cursor/` y `.codex/`). Si eliges Serena como proveedor de inteligencia de código, también puede existir un directorio `.serena/` opcional para sus memorias de incorporación. Esta página explica los archivos compartidos y las rutas opcionales o generadas que importan al solucionar problemas.

---

## Árbol de directorios representativo

El árbol siguiente muestra en detalle los recursos compartidos y las skills de dominio representativas. El catálogo actual tiene 33 directorios de skills; las skills omitidas siguen el mismo patrón de `SKILL.md` con `resources/`, `variants/` o directorios específicos opcionales. Trata el árbol activo de `.agents/` como la autoridad cuando un archivo generado u opcional no esté presente.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/: la fuente de verdad

Este es el directorio central. Todo lo que necesitan los agentes vive aquí. Es el único directorio que importa para el comportamiento de los agentes; todos los demás directorios se derivan de él.

### oma-config.cue y oma-config.yaml

**`oma-config.yaml`**: archivo de configuración central con:
- `language`: código de idioma de respuesta (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl).
- `date_format`: cadena de formato de marca de tiempo (`ISO`, `US` o `EU`; predeterminado `ISO`).
- `timezone`: identificador de zona horaria IANA; los valores omitidos usan la zona horaria del sistema.
- `model_preset`: clave del preset de modelo activo (`auto` por defecto o un preset fijo/personalizado).
- `providers`: proveedores de capacidades para documentación, web, inteligencia de código y memoria semántica.
- `auto_update_cli`: comprobación de actualizaciones en segundo plano (predeterminado `true`, se desactiva con `false`).
- `telemetry`: activación de telemetría del proveedor (predeterminado `false`).
- `mcp.devtools_browsers`: lista opcional de navegadores; omitirla conserva las entradas existentes.
- `agents`: sobrescrituras opcionales por agente (`AgentSpec` solo de objeto).
- `models`: slugs de modelos opcionales definidos por el usuario.
- `custom_presets`: presets opcionales definidos por el usuario con `extends:` opcional.

### skills/

Aquí vive la experiencia de las skills. En el catálogo actual hay 33 directorios de skills además de los recursos `_shared`; el preset `all` se deriva de este árbol activo.

**`_shared/`**: recursos usados por todos los agentes:
- `core/`: enrutamiento, carga de contexto, estructura de prompts, protocolo de aclaración, presupuesto de contexto, evaluación de dificultad, plantillas de razonamiento, principios de calidad, detección de proveedores, métricas de sesión, lista común de comprobaciones, lecciones aprendidas y plantillas de contratos API.
- `runtime/`: protocolo de memoria, especificación de eventos, contrato de resultados y protocolos de ejecución específicos del proveedor.
- `conditional/`: medición de quality score, seguimiento del experiment ledger y protocolo del exploration loop (solo se carga cuando se activa).

**`oma-{skill}/`**: directorios de cada skill. Cada uno contiene:
- `SKILL.md`: capa 1, cargada cuando se enruta la skill; identidad, enrutamiento y reglas principales.
- `resources/`: capa 2, bajo demanda; protocolos de ejecución, ejemplos, listas de comprobación, playbooks de errores, stacks tecnológicos, snippets y plantillas.
- Algunas skills tienen subdirectorios adicionales: `variants/` (semillas de backend/móvil), referencias `stack/` generadas por `/stack-set`, `reference/` (oma-design) y scripts/configuración propios de la skill.

### workflows/

21 archivos Markdown que definen el comportamiento de los comandos slash. Cada archivo contiene:
- frontmatter YAML con `description`.
- sección de reglas obligatorias (idioma de respuesta, orden de pasos y requisitos de herramientas MCP).
- instrucciones de detección de proveedores.
- protocolo de ejecución paso a paso.
- definiciones de puertas (para workflows persistentes).

Workflows persistentes: `orchestrate.md`, `work.md`, `ultrawork.md` y `ralph.md`.
Los workflows no persistentes incluyen `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` y `video.md`.

### agents/

12 archivos de definición de subagentes que se usan al lanzar agentes mediante la herramienta Task (Claude Code) o la CLI. Cada archivo define:
- frontmatter: `name`, `description` y `skills` (qué skill cargar).
- referencia al protocolo de ejecución.
- plantilla de preflight de charter (CHARTER_CHECK).
- resumen de arquitectura.
- reglas específicas del dominio (10 reglas).
- declaración: "Never modify `.agents/` files".

### plan-\{sessionId\}.json

Generado por el workflow `/plan`. Contiene el desglose estructurado con asignaciones de agentes, prioridades, dependencias y criterios de aceptación. `/orchestrate` y `/work` lo consumen. El tracker legible por humanos asociado vive en `docs/plans/work/{NNN}-{name}.md` (su ciclo de vida usa el campo `Status`). Las referencias de diseño permanentes viven junto a él en `docs/plans/designs/{NNN}-{name}.md`.

### state/

Archivos de estado activos de workflows persistentes. Estos JSON solo existen mientras se ejecuta un workflow persistente. Eliminarlos (o decir "workflow done") desactiva el workflow.

El subdirectorio `state/memories/` es el almacén canónico de memoria de coordinación: estado de la sesión del orquestador, tablero de tareas, archivos de progreso y resultados por agente, métricas de sesión y telemetría de coste. Es la ruta que observan los dashboards y que la CLI resuelve primero (los proyectos antiguos recurren a la ubicación heredada `.serena/memories/`). Consulta [.agents/state/memories/: estado en tiempo de ejecución](#agentsstatememories-runtime-state).

### results/

Archivos de resultados de agentes. Los crean los agentes completados con estado (completado/fallido), resumen, archivos modificados y lista de criterios de aceptación. El orquestador los lee durante la recopilación y los dashboards los usan para monitorizar.

### mcp.json

Configuración de servidores MCP que incluye:
- definiciones de servidor (Serena, etc.).
- configuración de memoria: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (nombres de herramientas read/write/edit).
- definiciones de grupos de herramientas para la gestión con `/tools`.

---

## .claude/: integración con el IDE

Este directorio conecta oh-my-agent con Claude Code y otros IDEs.

### settings.json

Registra hooks y permisos para Claude Code. Cada entrada de evento usa ahora la ABI canónica `oma hook run`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

La entrada `statusLine` conserva una ruta directa `bun` (visualización de ruta rápida, no pasa por `oma hook run`).

### hooks/

El directorio `hooks/` de un proveedor contiene **solo los archivos que algo ejecuta o lee de ese directorio durante el runtime**. La cadena de handlers (detección de palabras clave, modo persistente, inyección de skills, …) se ejecuta dentro del binario `oma` mediante `oma hook run`; los archivos `.ts` de los handlers se incluyen en la CLI durante el build y NO se materializan en los directorios de proveedores.

**`oma-hook.sh`**: script wrapper generado por `oma link`/`oma install`/`oma update`. Cada evento de hook del proveedor pasa por este archivo. El orden de resolución en runtime es `$OMA_BIN` (sobrescritura explícita) → `command -v oma` (PATH) → directorios de instalación conocidos como `$HOME/.bun/bin` y `$HOME/.local/share/mise/shims` (los agentes iniciados desde una GUI heredan un PATH mínimo) → `exit 0` (fail-open, nunca bloquea al agente). No se escribe nada específico de la máquina en el script, así que es idéntico byte a byte para cada desarrollador y se puede confirmar con seguridad. Pasa `"$@"` literalmente para que los argumentos `--vendor`, `--event` y `--matcher` lleguen sin cambios a `oma hook run`. Incluye el preámbulo de autoduplicación que suprime el doble disparo cuando una instalación de proyecto y otra global registran el mismo evento.

**`hud.ts`**: renderiza el indicador `[OMA]` en la barra de estado con el nombre del modelo, el uso de contexto (codificado por color: verde/amarillo/rojo) y el estado del workflow activo. Se registra directamente bajo `statusLine` (no se enruta por `oma hook run`) para conservar la latencia de renderizado de la ruta rápida. Solo se materializa para proveedores cuya variante registra un evento `statusLine` o exclusivo del HUD (por ejemplo, claude, antigravity y qwen). Infiere el dialecto del proveedor a partir de su propia ruta instalada, por lo que la copia por proveedor es necesaria para que funcione.

**`filter-test-output.sh`**: filtro de shell que recorta la salida ruidosa de los runners de pruebas. El handler de test-filter en proceso reescribe los comandos de prueba Bash detectados para que pasen por `<hookDir>/filter-test-output.sh`, así que este archivo se materializa para cada proveedor cuya variante registra `test-filter.ts` (todos salvo cursor).

#### Dónde vive realmente la lógica de los handlers

Las fuentes de los handlers son la SSOT en `.agents/hooks/core/` y se ejecutan en proceso mediante `oma hook run`:

**`keyword-detector.ts`**: handler puro (`run(input, ctx): HandlerResult | null`) para la detección de palabras clave. Lógica:
1. Sanitiza la entrada (elimina bloques de código, cadenas entrecomilladas y bloques de eco del sistema pegados).
2. Analiza la entrada limpia contra `keywords` de activación (literales) y `patterns` (regex).
3. Comprueba patrones informativos en una ventana de 60 caracteres alrededor de cada coincidencia.
4. Aplica el guard de refuerzo (suprime el evento si el mismo workflow se activó 2 o más veces en 60 s).
5. Devuelve un resultado `context` que inyecta `[OMA WORKFLOW: ...]` o `[OMA PERSISTENT MODE: ...]`.

**`persistent-mode.ts`**: handler puro (`run()`) que comprueba archivos de estado activos en `.agents/state/` y refuerza la ejecución de workflows persistentes. Se llama en proceso mediante `oma hook run` en eventos `Stop`.

**`scm-guard.ts`**: handler puro (`run()`) en `PreToolUse` (herramientas Bash/shell) que deniega `git add` de archivos probablemente secretos. Aplica `forbidden_patterns` menos `allowed_exceptions` de `.agents/skills/oma-scm/config/commit-config.yaml` (valores integrados cuando falta la configuración). Se ejecuta antes de `test-filter` en la cadena de claude, codex, cursor, grok, kimi, kiro y qwen, y en el puente de opencode (`tool.execute.before` lanza un error para bloquear) y el puente de pi (`tool_call` devuelve `{ block: true, reason }`); un comando precedido por `OMA_SCM_ALLOW_SECRETS=1` omite el guard después de la aprobación explícita del usuario. El staging amplio (`git add -A` / `git add .`) no se bloquea intencionadamente: esa regla depende del consentimiento del usuario, que el hook no puede observar.

**`code-intelligence-guard.ts`**: handler puro (`run()`) en `PreToolUse` que aplica de forma mecánica la regla "Code Search". Mientras `providers.code_intelligence` se resuelva a `serena` (o `gortex`) y `providers.code_intelligence_guard` no sea `off`, deniega las herramientas de búsqueda nativas (`Grep` y `Glob` en Claude Code) y los comandos de shell cuyo binario inicial sea una búsqueda recursiva de código (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`), y el motivo de la denegación nombra la herramienta del proveedor que debe usarse en su lugar (`search_for_pattern`, `find_file`, `find_symbol`). El `grep` no recursivo (filtros con pipe, archivos individuales), `find` sin predicado de nombre y las lecturas nunca se ven afectados. Se registra justo después de `scm-guard` para claude, codex, cursor, grok, kimi, kiro y qwen; el instalador toma la unión de los matchers de la cadena, de modo que la entrada `PreToolUse` de Claude pasa a ser `Bash|Grep|Glob`. Un comando de shell que contenga `OMA_CI_ALLOW_NATIVE=1` sigue omitiendo el guard, pero solo como vía de escape para operadores en búsquedas de recursos fuera del proyecto o de rutas ignoradas que el guard no reconoció. El motivo de la denegación no nombra ese prefijo, y no es un recurso alternativo para el código fuente del proyecto.

**`triggers.json`**: mapa de palabra clave a workflow, integrado estáticamente en el binario `oma` durante el build (fuente: `.agents/hooks/core/triggers.json`). Define:
- `workflows`: mapa del nombre de workflow a `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` son frases literales; `patterns` son cadenas regex sin procesar (compiladas con flags `iu`). `explicit` (solo en workflows persistentes) enumera las palabras clave que cuentan como invocación explícita (solo esas activan el modo persistente; cualquier otra coincidencia se inyecta como sugerencia).
- `informationalPatterns`: frases que indican preguntas (se filtran de la autodetección).
- `excludedWorkflows`: workflows que requieren invocación explícita con `/command`.

Las secciones de idioma de `keywords`, `patterns` e `informationalPatterns` siguen esta convención:
- `*`: universal/inglés.
- `en`: funcionalmente equivale a `*`.
- `ko`/`ja`/`zh`/etc.: formulación específica del idioma.

Todas las secciones se cargan siempre; el ajuste `language` de `.agents/oma-config.yaml` solo controla el idioma de las respuestas. Los límites de palabra dependen de la propia palabra clave: las palabras clave ASCII coinciden como palabras completas, y las que contienen texto no ASCII coinciden como subcadenas.

#### Materialización por proveedor: antes → después

Las instalaciones antiguas copiaban el conjunto **completo** de `.agents/hooks/core/` (unos 20 archivos) en el directorio de hooks de cada proveedor, aunque el despacho en proceso convertía la mayoría en archivos muertos:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Ahora el instalador deriva una lista permitida del JSON de variante del proveedor (`requiredVariantScripts` en `cli/platform/hooks-composer.ts`) y materializa solo lo que ese proveedor ejecuta o lee:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Proveedor | Archivos materializados | Motivo |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, sin statusLine |
| cursor | `oma-hook.sh` | sin statusLine ni test-filter |
| commandcode | `oma-hook.sh` | Solo Stop — Command Code no tiene evento de prompt y PreToolUse no puede reescribir la entrada ([referencia de hooks](https://commandcode.ai/docs/hooks/reference)). |
| antigravity | ninguno (proyecto) — `hud.ts` + hooks core copiados en `~/.gemini/antigravity-cli/hooks/` | agy solo lee ajustes desde HOME y hooks del workspace desde `.agents/hooks.json`, que ejecuta los handlers directamente desde `.agents/hooks/core/`; nunca se carga un `.gemini/antigravity-cli/` de proyecto (`homeOnly`). |
| pi | conjunto completo de `.agents/hooks/core/` bajo `.pi/extensions/oma/` | el puente de pi lanza handlers como subprocesos en lugar de usar hooks de ajustes |

El directorio de destino se limpia antes de copiar, así que volver a ejecutar `oma install`/`oma update`/`oma link` sobre una instalación antigua elimina automáticamente los archivos obsoletos de copia completa.

#### Depurar una cadena de handlers de forma aislada

Puedes ejecutar cualquier cadena de handlers contra un payload real sin activar la sesión de agente en vivo:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` siempre termina con 0 (fail-open). Una salida stdout vacía significa que la cadena no produjo ninguna operación para ese evento. El JSON con el dialecto del proveedor (o texto plano para los prompts de kiro) se escribe en stdout cuando se activa un handler.

#### Migración desde instalaciones pre-019

Las instalaciones existentes que tengan las entradas antiguas `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` se migran automáticamente la próxima vez que ejecutes `oma install`, `oma update` o `oma link`. El instalador usa reemplazo basado en marcadores: solo sustituye los grupos de hooks gestionados por OMA (identificados por sus patrones `name`/`command`); los grupos que hayas añadido tú se conservan en su orden original. La ruta `statusLine`/HUD no cambia. El puente en proceso de pi no se ve afectado. Consulta `cli/commands/hook/command.ts` para la implementación del router (internamente llamada "design 019") y `cli/platform/hooks-composer/` para la lógica de materialización por proveedor.

### skills/

Symlinks que apuntan a `.agents/skills/`. Esto hace visibles las skills para los IDEs que leen `.claude/skills/`, a la vez que conserva `.agents/` como fuente única de verdad.

### agents/

Definiciones de subagentes formateadas para la herramienta Agent de Claude Code. Referencian los archivos de skills e incluyen la plantilla CHARTER_CHECK.

---

## .agents/state/memories/: estado en tiempo de ejecución {#agentsstatememories-runtime-state}

Aquí escriben los agentes su progreso durante las sesiones de orquestación. Este es el almacén canónico de memoria de coordinación; la CLI lo resuelve primero y recurre a `.serena/memories/` para proyectos creados antes del traslado. Los archivos de sesión y del tablero incluyen el ID de sesión; los archivos de progreso y resultado incluyen los IDs de agente, tarea, ejecución y sesión. Este directorio lo observan los dashboards para actualizaciones en tiempo real.

| Archivo | Propietario | Propósito |
|------|-------------|----------|
| `orchestrator-session-{sessionId}.md` | Orquestador | Metadatos de la sesión: ID, estado, hora de inicio y fase actual. |
| `task-board-{sessionId}.md` | Orquestador | Asignaciones de tareas: agente, tarea, prioridad, estado y dependencias. |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Esa ejecución | Actualizaciones turno a turno: acciones realizadas, archivos leídos/modificados y estado actual. |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Esa ejecución | Salida final: estado completado/fallido, resumen, archivos modificados y criterios de aceptación. |
| `session-metrics.md` | Orquestador | Correcciones relevantes y evidencia de experimentos. |
| `experiment-ledger.md` | Orquestador/QA | Filas de evidencia de experimentos reales. |
| `session-work.md` | Workflow Work | Estado específico de la sesión de Work. |
| `session-ultrawork.md` | Workflow Ultrawork | Seguimiento de fases específico de Ultrawork. |
| `session-cost-{sessionId}.md` | Sistema | Telemetría de coste de spawns por sesión. |
| `archive/metrics-{date}.md` | Sistema | Métricas archivadas del sistema (retención de 30 días). |

Las rutas de archivos de memoria y los nombres de herramientas se configuran en `.agents/mcp.json` mediante `memoryConfig`.

Las memorias de incorporación propias de Serena (`code_style.md`, `project_purpose.md` y archivos de conocimiento similares) permanecen en `.serena/memories/` y están separadas de estos artefactos de coordinación.

---

## Estructura del repositorio fuente de oh-my-agent

Si trabajas en oh-my-agent mismo (no solo lo usas), el repositorio es un monorepo:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

En el repositorio fuente, se permite modificar `.agents/` (es la excepción SSOT para el propio repositorio fuente). Las reglas de `.agents/` sobre no modificar este directorio se aplican a los proyectos consumidores, no al repositorio de oh-my-agent.

Comandos de desarrollo (ejecutados desde la raíz del repositorio):
- `bun run test`: pruebas de la CLI (vitest).
- `bun run lint`: lint de los workspaces de CLI y web.
- `bun run build`: build de la CLI.
- `bun run typecheck`: comprobación de tipos de CLI y web.
- Los commits deben seguir el formato conventional commit (commitlint aplicado).
