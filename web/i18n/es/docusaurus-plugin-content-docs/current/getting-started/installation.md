---
title: Instalación
description: Guía completa de instalación de oh-my-agent — tres métodos de instalación, los presets integrados con sus listas de habilidades, requisitos de herramientas CLI por proveedor, configuración post-instalación, campos de oma-config.yaml y verificación con oma doctor.
---

# Instalación

## Requisitos previos

- **Un IDE o CLI potenciado por IA** — al menos uno de: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity CLI (`agy`), Antigravity IDE, Cursor u OpenCode
- **bun** — Runtime y gestor de paquetes JavaScript (instalado automáticamente por el script si no está presente)
- **uv** — Gestor de paquetes Python para Serena MCP (instalado automáticamente si no está presente)

---

## Método 1: instalación con un solo comando (recomendado)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Ambos scripts de bootstrap se comportan igual:
1. Detecta tu plataforma (macOS, Linux o Windows)
2. Verifica bun, uv y serena, instalándolos si faltan
3. Ejecuta el instalador interactivo con selección de preset
4. Crea `.agents/` con las habilidades seleccionadas
5. Configura la capa de integración `.claude/` (hooks, enlaces simbólicos, configuración)
6. Configura Serena MCP si se detecta

Tiempo de instalación típico: menos de 60 segundos.

---

## Método 2: instalación manual vía bunx

```bash
bunx oh-my-agent@latest
```

Esto lanza el instalador interactivo sin el bootstrap de dependencias. Necesitas tener bun ya instalado.

El instalador te pide seleccionar un preset, que determina qué habilidades se instalan:

### Presets

| Preset | Habilidades Incluidas |
|--------|----------------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-scm, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |

Cada preset incluye oma-pm (planificación), oma-qa (revisión), oma-debug (corrección de bugs), oma-brainstorm (ideación) y oma-scm (git) como agentes base. Los presets específicos de dominio añaden los agentes de implementación relevantes.

Los recursos compartidos (`_shared/`) se instalan siempre independientemente del preset. Esto incluye enrutamiento central, carga de contexto, estructura de prompts, detección de proveedor, protocolos de ejecución y protocolo de memoria.

### Qué se crea

Después de la instalación, tu proyecto contendrá:

```
.agents/
├── config/
│   └── oma-config.yaml      # Tus preferencias
├── skills/
│   ├── _shared/                    # Recursos compartidos (siempre instalados)
│   │   ├── core/                   # skill-routing, context-loading, etc.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/               # Según el preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Otras habilidades seleccionadas
├── workflows/                      # Las 16 definiciones de flujos de trabajo
├── agents/                         # Definiciones de subagentes
├── mcp.json                        # Configuración del servidor MCP
├── results/plan-{sessionId}.json                       # Vacío (poblado por /plan)
├── state/                          # Vacío (usado por flujos persistentes)
└── results/                        # Vacío (poblado por ejecuciones de agentes)

.claude/
├── settings.json                   # Hooks y permisos
├── hooks/
│   ├── triggers.json               # Mapeo palabra clave-flujo (11 idiomas)
│   ├── keyword-detector.ts         # Lógica de auto-detección
│   ├── persistent-mode.ts          # Aplicación de flujos persistentes
│   └── hud.ts                      # Indicador [OMA] en barra de estado
├── skills/                         # Enlaces simbólicos → .agents/skills/
└── agents/                         # Definiciones de subagentes para IDE

.serena/
└── memories/                       # Estado en tiempo de ejecución (poblado durante sesiones)
```

---

## Método 3: instalación global

Para uso a nivel de CLI (dashboards, generación de agentes, diagnósticos), instala oh-my-agent globalmente:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# o
npm install --global oh-my-agent
```

Esto instala el comando `oma` globalmente, dándote acceso a todos los comandos CLI desde cualquier directorio:

```bash
oma doctor              # Verificación de salud
oma dashboard           # Monitoreo en terminal
oma dashboard:web       # Dashboard web en http://localhost:9847
oma agent:spawn         # Generar agentes desde terminal
oma agent:parallel      # Ejecución paralela de agentes
oma agent:status        # Verificar estado de agentes
oma stats               # Estadísticas de sesión
oma retro               # Análisis retrospectivo
oma cleanup             # Limpiar artefactos de sesión
oma update              # Actualizar oh-my-agent
oma verify              # Verificar salida de agentes
oma visualize           # Visualización de dependencias
oma describe            # Describir estructura del proyecto
oma bridge              # Puente SSE-a-stdio para Antigravity
oma memory:init         # Inicializar proveedor de memoria
oma auth:status         # Verificar estado de autenticación CLI
oma star                # Dar estrella al repositorio
```

`oma` es la forma abreviada de `oh-my-agent`. Ambos funcionan como comandos CLI.

---

## Instalación de herramientas CLI de IA

Necesitas al menos una herramienta CLI de IA instalada. oh-my-agent soporta cuatro proveedores, y puedes combinarlos — usando diferentes CLIs para diferentes agentes mediante el mapeo agente-CLI.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# o
npm install --global @google/gemini-cli
```

La autenticación es automática en la primera ejecución. Gemini CLI lee las habilidades desde `.agents/skills/` por defecto.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# o
npm install --global @anthropic-ai/claude-code
```

La autenticación es automática en la primera ejecución. Claude Code usa `.claude/` para hooks y configuración, con habilidades enlazadas simbólicamente desde `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# o
npm install --global @openai/codex
```

Después de instalar, ejecuta `codex login` para autenticarte.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Después de instalar, ejecuta `/auth` dentro del CLI para autenticarte.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

La autenticación la gestiona `agy` en la primera ejecución. El binario es `agy`. Para entornos headless, establece la variable de entorno `ANTIGRAVITY_API_KEY`. `oma doctor` informa el estado de autenticación vía `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

El comando `oma install` crea `.agents/oma-config.yaml`. Este es el archivo de configuración central para todo el comportamiento de oh-my-agent:

```yaml
# Requerido
language: en
model_preset: antigravity   # integrados: antigravity, claude, codex, qwen, cursor, mixed

# Opcional — preferencias de fecha/hora
date_format: ISO
timezone: UTC

# Opcional — actualizar el CLI automáticamente en segundo plano
auto_update_cli: true

# Opcional — sobrescritura parcial por agente (objeto únicamente, fusión superficial)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Opcional — slugs de modelo definidos por el usuario
# models:
#   my-model: { cli: gemini, cli_model: gemini-3-flash, supports: { thinking: true } }

# Opcional — presets definidos por el usuario
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Referencia de campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `language` | string | Sí | Código de idioma de respuesta. Soporta en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Sí | Clave de preset activo. Una de las claves integradas (`antigravity`, `claude`, `codex`, `qwen`, `cursor`, `mixed`) o una clave de `custom_presets`. Ver [Configuración de Modelo por Agente](../guide/per-agent-models.md). |
| `date_format` | string | No | Formato de marca de tiempo (`ISO`, `US`, `EU`). Por defecto: `ISO`. |
| `timezone` | string | No | Identificador de zona horaria (ej., `Asia/Seoul`). Por defecto: `UTC`. |
| `agents` | map | No | Sobrescrituras parciales por agente (`AgentSpec` solo objeto). Fusión superficial sobre los valores por defecto del preset. |
| `models` | map | No | Slugs de modelo definidos por el usuario, antes en `models.yaml`. |
| `custom_presets` | map | No | Presets definidos por el usuario. Soporta `extends:` para herencia parcial de un preset integrado. |

### Resolución de proveedor

Al generar un agente, el proveedor CLI se resuelve desde el `model_preset` activo (y cualquier sobrescritura en `agents:`). Ver [Configuración de Modelo por Agente](../guide/per-agent-models.md) para detalles completos.

---

## Verificación: `oma doctor`

Después de la instalación y configuración, verifica que todo funciona:

```bash
oma doctor
```

Este comando verifica:
- Todas las herramientas CLI requeridas están instaladas y accesibles
- La configuración del servidor MCP es válida
- Los archivos de habilidades existen con frontmatter SKILL.md válido
- Los enlaces simbólicos en `.claude/skills/` apuntan a destinos válidos
- Los hooks están correctamente configurados en `.claude/settings.json`
- El proveedor de memoria es alcanzable (Serena MCP)
- `oma-config.yaml` es YAML válido con campos requeridos

Si algo está mal, `oma doctor` te dice exactamente qué corregir, con comandos para copiar y pegar.

---

## Actualización

### Actualización del CLI

```bash
oma update
```

Esto actualiza el CLI global de oh-my-agent a la última versión.

### Actualización de habilidades del proyecto

Las habilidades y flujos de trabajo dentro de un proyecto pueden actualizarse mediante el GitHub Action (`action/`) para actualizaciones automatizadas, o manualmente re-ejecutando el instalador:

```bash
bunx oh-my-agent@latest
```

El instalador detecta instalaciones existentes y ofrece actualizar preservando tu `oma-config.yaml` y cualquier configuración personalizada.

---

## Próximos pasos

Abre tu proyecto en tu IDE de IA y comienza a usar oh-my-agent. Las habilidades se auto-detectan. Prueba:

```
"Construir un formulario de login con validación de email usando Tailwind CSS"
```

O usa un comando de flujo de trabajo:

```
/plan funcionalidad de autenticación con JWT y tokens de refresco
```

Consulta la [Guía de Uso](/docs/guide/usage) para ejemplos detallados, o aprende sobre los [Agentes](/docs/core-concepts/agents) para entender qué hace cada especialista.
