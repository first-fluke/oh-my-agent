---
title: Instalación
description: Instala oh-my-agent, elige skills y proveedores, entiende los archivos de proyecto generados, configura los valores predeterminados de modelo y runtime, y verifica la configuración con oma doctor.
---

# Instalación

## Requisitos previos

- **Un IDE o CLI con IA**: al menos un host compatible, como Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot o Hermes.
- **bun**: runtime de JavaScript y gestor de paquetes (el script de instalación lo instala automáticamente si falta).
- **uv**: gestor de paquetes de Python (el script de bootstrap ofrece instalarlo si falta).
- **Proveedor de inteligencia de código**: Serena es el proveedor predeterminado. Gortex también es compatible cuando se selecciona en la configuración de proveedores. El instalador puede preparar Serena con `uv tool install`; continúa con una advertencia cuando falta una dependencia opcional. Con Gortex seleccionado, `oma install` y `oma update` en modo proyecto registran el proyecto en el daemon de Gortex (`gortex track`) cuando aún no está rastreado y añaden los directorios generados por OMA a la lista de exclusión de ese proyecto a través de la CLI de Gortex; no se escribe nada en el árbol del proyecto. Gortex en sí debe instalarse por separado.

El instalador agrupa las integraciones por capacidad. Los proveedores de hooks incluyen Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro y Qwen; OpenCode y pi usan puentes de extensión; GitHub Copilot y Hermes reciben enlaces a skills; y ZCode recibe comandos de workflow. Puedes seleccionar más de un proveedor, pero para la primera tarea solo necesitas el host que vayas a utilizar.

---

## Método 1: instalación con un solo comando

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Ambos scripts de bootstrap se comportan igual:

1. Detectan la plataforma (macOS, Linux o Windows).
2. Comprueban bun y uv (y serena si se elige) y los instalan si faltan.
3. Instalan el comando `oma` de forma global con `bun install --global oh-my-agent`, salvo que `oma` ya esté en tu PATH (los hooks y los workflows lo llaman).
4. Ejecutan el instalador interactivo con selección de preset y proveedor.
5. Crean `.agents/` con las skills y la configuración seleccionadas.
6. Preparan las capas de integración del runtime (hooks, symlinks y ajustes de los proveedores detectados).
7. Configuran los servidores MCP de inteligencia de código y memoria.

El bootstrap continúa después de fallos de dependencias opcionales e informa de los comandos de seguimiento. AgentMemory es el proveedor de memoria semántica predeterminado: `oma install` y `oma update` fallan si falla su instalación, su arranque o su comprobación de estado. Seleccionar `providers.semantic_memory: none` u `honcho`, o definir `OMA_NO_AGENTMEMORY=1`, omite la preparación automática de AgentMemory. Ejecuta `oma doctor` cuando termine el instalador.

### Qué más hace el instalador por defecto {#what-the-installer-also-does-by-default}

- **MCP de navegador Aside**: viene preseleccionado en la configuración interactiva y, si falta, se instala con `curl -fsSL https://releases.aside.com/install.sh | bash`, solo si lo mantienes seleccionado. Desmárcalo en el paso del MCP de navegador o más tarde con `oma update mcp`.
- **Servicio AgentMemory**: `bun install -g @agentmemory/agentmemory`, registrado como servicio de inicio de sesión (launchd, unidad de usuario de systemd o tarea programada de Windows).
- **CUE**: lo instala el script de bootstrap con `brew install cue` (macOS/Linux) o `winget` (Windows), y de nuevo `oma install` cuando Serena es el proveedor de inteligencia de código.
- **Escrituras fuera del proyecto**: `~/.claude.json` (marca el proyecto como espacio de trabajo de confianza de Claude Code), `~/.serena/` (contexto de OMA, tamaño mínimo de respuesta, registro del proyecto), `~/.cursor/cli-config.json` (desactiva la atribución de commits de Cursor), `~/.grok/config.toml` (telemetría) y `~/.gemini/antigravity-cli/` (HUD), cada uno solo para un proveedor seleccionado. Antes de enlazar skills en las carpetas de proveedores del directorio personal (Antigravity, Hermes, Kimi), pregunta.
- **Exclusiones de telemetría**: Claude `DISABLE_TELEMETRY=1` (esto también desactiva Claude Code Remote Control) y las estadísticas de uso de Gemini, Qwen, Codex y Grok. Define `telemetry: true` para conservar los valores predeterminados de cada proveedor.
- **Ajustes de Claude Code**: se completan las claves sin definir en `.claude/settings.json`, entre ellas `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180` y flags de env que desactivan la auto memory, el adaptive thinking, el reporte de errores y las instrucciones de git integradas. Los valores que ya hayas definido se conservan.
- **Trailer de coautoría**: la atribución de commits de Claude Code pasa a ser `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`, y las PR reciben una línea "Generated with oh-my-agent". Define `scm.co_author.enabled: false` para desactivarlo.
- **Protección commit-msg**: `.githooks/commit-msg` rechaza las direcciones `Co-authored-by` que no estén en `.githooks/co-authors.allow` ni en `scm.co_author.email`. `git config --local core.hooksPath .githooks` solo se configura cuando no hay otros hooks activos; si los hay, oma muestra cómo encadenar la protección. Define `scm.co_author.enforce_hook: false` para desactivarla.
- **Actualizaciones en segundo plano**: `oma update` actualiza la CLI de `oma` en segundo plano (`auto_update_cli: false` u `OMA_SKIP_VERSION_CHECK=1` para detenerlo) y ejecuta `uv tool upgrade serena-agent --prerelease=allow` (`serena.auto_update: false` para detenerlo).
- **Temporizador de limpieza de Serena**: con Serena en el modo `bridge` predeterminado, la primera sesión de agente que inicia un servidor Serena compartido registra un temporizador que detiene cada 5 minutos los servidores Serena compartidos inactivos (launchd `dev.oma.serena-daemon-gc`, temporizador de usuario de systemd `oma-serena-daemon-gc.timer` o tarea programada de Windows `OMA Serena Daemon GC`). Define `serena.mode: stdio` para omitir el servidor compartido y su temporizador. `oma uninstall` no elimina el temporizador.
- **Las ejecuciones no interactivas** (`-y`, `OMA_YES=1`, `CI=true`) usan el preset de skills `All`, `model_preset: auto` y Python como lenguaje de backend. No seleccionan ningún MCP de navegador (y omiten el script de instalación de Aside) salvo que `mcp.devtools_browsers` ya incluya uno.

---

## Método 2: instalación manual vía bunx

```bash
bunx oh-my-agent@latest
```

Esto inicia el instalador interactivo sin el bootstrap de dependencias. Debes tener bun instalado de antemano.

El instalador te pide seleccionar un [preset de skills](./glossary.md#skill-preset). Los presets actuales se definen en `PRESETS` en `cli/constants/skill-data.ts`:

### Presets {#presets}

Elige el preset que se ajuste al trabajo que necesita el repositorio. Los nombres de skills de abajo omiten el prefijo `oma-`.

| Preset | Elígelo cuando el proyecto sea | Skills incluidas | Número |
|--------|-------------------------------|-----------------|-------|
| **all** | Cualquier proyecto, o quieres que todos los workflows funcionen desde el principio | Todas las skills del registro | 33 |
| **fullstack** | Clientes web y móviles con un backend e infraestructura de Terraform | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | Un frontend web con un backend y una base de datos | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | Una app móvil con un backend y una base de datos | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | Solo una interfaz web | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | Una API o un servicio con una base de datos | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | Solo una app móvil | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | Trabajo de infraestructura, CI/CD y observabilidad | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **research** | Artículos académicos, estudios de mercado y conversión de PDF/HWP | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | Recursos de diseño, imágenes, voz y contenido escrito | design, image, voice, academic-writing, translation, scm | 6 |

Los presets son paquetes de skills; no crean una definición de subagente por cada skill. El preset `all` se expande desde el registro activo de skills, así que la lista puede crecer con el repositorio. Los presets de dominio incluyen solo las skills necesarias para ese enfoque.

### Workflows que necesitan skills fuera de un preset {#workflows-that-need-skills-outside-a-preset}

Todos los presets instalan todas las definiciones de workflows y agentes, pero varios workflows leen una skill que los presets de dominio no instalan. Consulta esta tabla antes de elegir un preset de dominio:

| Workflow | Lee la skill | Presets que la incluyen |
|----------|-------------|-------------------------|
| `/work`, `/orchestrate` | oma-coordination, oma-orchestration | all |
| `/ultrawork`, `/ralph` | oma-coordination; el agente `refactor-engineer` que genera usa oma-refactor | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/convert` (PDF, HWP) | oma-pdf, oma-hwp | all, research |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture`, `/brainstorm`, `/plan`, `/review`, `/debug` | oma-architecture, oma-brainstorm, oma-pm, oma-qa, oma-debug | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/scm` | oma-scm | todos los presets |

Para añadir más tarde una skill que falte, ejecuta `oma doctor` desde la raíz del proyecto, acepta el aviso de skills ausentes y elige **Select individually**.

Los recursos compartidos (`_shared/`) siempre se instalan, independientemente del preset. Incluyen el enrutamiento central, la carga de contexto, la estructura del prompt, la detección de proveedores, los protocolos de ejecución y el protocolo de memoria.

### Qué se crea

Después de la instalación, tu proyecto contendrá:

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 21, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── config/                  # Shipped defaults (defaults.yaml)
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

El instalador solo crea directorios de proveedores para los hosts que selecciones. El código fuente de los hooks permanece en `.agents/hooks/core/`; los archivos de proveedores generados son salidas de integración. Serena también puede usar el directorio heredado `.serena/memories/` en proyectos antiguos.

---

## Método 3: instalación global {#method-3-global-install}

Para usar la CLI (dashboards, spawns de agentes y diagnósticos), instala oh-my-agent globalmente:

:::note
Esta sección instala el comando `oma`. No es lo mismo que `oma install --global`, que instala skills, workflows y reglas en el home global de OMA (`~/.oma/.agents/`) para todos los proyectos. Consulta [Instalación global](../guide/global-install.md).
:::

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

Esto instala el comando `oma` globalmente y te da acceso a todos los comandos CLI desde cualquier directorio:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
```

`oma` es la forma abreviada de `oh-my-agent`. Ambos funcionan como comandos CLI.

---

## Instalación de herramientas CLI de IA

Necesitas al menos una herramienta CLI de IA instalada. oh-my-agent es compatible con varios proveedores, y puedes combinarlos usando diferentes CLIs para diferentes agentes mediante la asignación agente-CLI.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

La autenticación es automática en la primera ejecución. Claude Code usa `.claude/` para hooks y ajustes, con las skills enlazadas desde `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Después de instalarlo, ejecuta `codex login` para autenticarte.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Ejecuta `/auth` dentro de la CLI para autenticarte.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

`agy` gestiona la autenticación en la primera ejecución. El binario es `agy`. En entornos headless, define la variable de entorno `ANTIGRAVITY_API_KEY`. `oma doctor` informa del estado de autenticación mediante `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

El comando `oma install` crea `.agents/oma-config.yaml`. Este es el archivo de configuración central de todo el comportamiento de oh-my-agent:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Referencia de campos

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `language` | string | Sí | Código de idioma de respuesta. Admite en, ko, ja, zh, es, fr, de, pt, ru, nl y pl. |
| `model_preset` | string | Sí | Clave del [preset de modelos](./glossary.md#model-preset) activo. `auto` sigue el runtime actual; las claves fijas incluyen `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` y `mixed`. También son válidas las claves de presets personalizados. Consulta [Modelos por agente](../guide/per-agent-models.md). |
| `default_cli` | string | No | CLI de fallback para `oma agent spawn` cuando los ajustes explícitos del agente y el preset seleccionado no resuelven un proveedor. |
| `free` | map | No | Ajustes del gateway FreeLLMAPI usados cuando `model_preset: free`; conserva las claves API en variables de entorno. |
| `providers` | map | No | Proveedores de capacidades: `code_intelligence` (`serena` o `gortex`), `code_intelligence_guard` (`block` u `off`), `docs` (`context7`), `web` (`native` o `brave`) y `semantic_memory` (`agentmemory`, `honcho` o `none`). |
| `date_format` | string | No | Formato de marca de tiempo (`ISO`, `US`, `EU`). Predeterminado: `ISO`. |
| `timezone` | string | No | Identificador de zona horaria (por ejemplo, `Asia/Seoul`). Los valores omitidos usan la zona horaria del sistema anfitrión. |
| `auto_update_cli` | boolean | No | Indica si las comprobaciones rutinarias de la CLI pueden actualizar en segundo plano. Predeterminado: `true` (desactiva con `false`). |
| `telemetry` | boolean | No | Activación de telemetría del proveedor. Predeterminado: `false`. |
| `agents` | map | No | Sobrescrituras parciales por agente (`AgentSpec` solo de objeto). Se fusionan superficialmente sobre los valores predeterminados del preset. |
| `models` | map | No | Slugs de modelos definidos por el usuario, antes ubicados en `models.yaml`. |
| `custom_presets` | map | No | Presets definidos por el usuario. Admite `extends:` para herencia parcial de un preset integrado. |
| `mcp.devtools_browsers` | list | No | Navegadores para DevTools MCP: `aside`, `chrome` o `firefox`. Omitirlo conserva la configuración existente; `[]` desactiva explícitamente el servidor del navegador. |
| `serena.mode` | string | No | `bridge` comparte un servidor Serena del proyecto y es el valor predeterminado; `stdio` opta por un proceso por sesión. |
| `serena.auto_update` | boolean | No | Indica si `oma update` actualiza Serena. Predeterminado: `true`. |

> **Formato de configuración:** Un `.agents/oma-config.cue` válido se evalúa como configuración compartida. Si falla la evaluación del CUE compartido, el cargador puede recurrir a `.agents/oma-config.yaml`; una sobrecarga local (`oma-config.local.cue` o `.yaml`) es opcional y una intención local inválida es fatal. `OMA_MODEL_PRESET` sobrescribe el valor del archivo para el proceso actual.

### Resolución de proveedores

Al generar un agente, la CLI resuelve los ajustes en este orden: `agents.<id>`, el `model_preset` seleccionado, el fallback del orquestador del preset y después `default_cli`. Con `model_preset: auto`, la configuración nativa del runtime actual proporciona el modelo; un runtime desconocido recurre a `default_cli`. Consulta [Modelos por agente](../guide/per-agent-models.md) para ver la matriz completa.

---

## Verificación: `oma doctor`

Después de instalar y configurar, verifica que todo funciona:

```bash
oma doctor
```

Este comando comprueba:
- Que la CLI del host seleccionado está instalada y disponible; las herramientas opcionales se informan por separado.
- Que las entradas de los servidores MCP configurados son válidas (por ejemplo, Serena, Gortex, Context7 o DevTools).
- Que los archivos de skills existen con un frontmatter válido en SKILL.md.
- Que los symlinks y scripts de hooks apuntan a destinos válidos.
- Que los hooks están configurados correctamente en los archivos de ajustes del proveedor.
- Que los proveedores seleccionados de inteligencia de código y memoria son accesibles (con Gortex, también si el proyecto actual está en el conjunto de proyectos rastreados del daemon).
- Que `oma-config.cue` / `oma-config.yaml` es válido y contiene los campos obligatorios.

Si algo falla, `oma doctor` identifica el elemento ausente o inválido y separa los bloqueadores de la primera tarea de las advertencias de integración opcionales.

Para inspeccionar el modelo y la CLI resueltos de cada agente, ejecuta:

```bash
oma doctor --profile
```

Consulta [Modelos por agente](../guide/per-agent-models.md) para la matriz completa y los detalles de migración.

---

## Actualización

### Actualización de la CLI

```bash
oma update
```

Esto actualiza la CLI global de oh-my-agent a la versión más reciente.

### Actualización de skills del proyecto

Las skills y workflows de un proyecto pueden actualizarse mediante la GitHub Action (`action/`) para actualizaciones automáticas o volviendo a ejecutar manualmente el instalador:

```bash
bunx oh-my-agent@latest
```

El instalador detecta las instalaciones existentes y ofrece actualizarlas conservando `oma-config.yaml` y cualquier configuración personalizada.

---

## Qué sigue

Abre tu proyecto en el IDE o CLI con IA seleccionado y comienza a usar oh-my-agent. El enrutamiento de skills depende del host; los hooks habilitados pueden detectar workflows. Prueba:

```text
"Build a login form with email validation using Tailwind CSS"
```

O usa un comando de workflow:

```text
/plan authentication feature with JWT and refresh tokens
```

Consulta la [Guía de uso](/docs/guide/usage) para ver ejemplos detallados o aprende sobre [Agentes](/docs/core-concepts/agents) para entender qué hace cada especialista. Si la instalación o un hook no se comportan como esperabas, consulta [Solución de problemas](../guide/troubleshooting.md).
