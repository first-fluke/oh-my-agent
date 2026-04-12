---
title: Instalación
description: Guía completa de instalación de oh-my-agent — tres métodos de instalación, los seis presets con sus listas de habilidades, requisitos de herramientas CLI para los cuatro proveedores, configuración post-instalación, campos de oma-config.yaml y verificación con oma doctor.
---

# Instalación

## Requisitos Previos

- **Un IDE o CLI potenciado por IA** — al menos uno de: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor u OpenCode
- **bun** — Runtime y gestor de paquetes JavaScript (instalado automáticamente por el script si no está presente)
- **uv** — Gestor de paquetes Python para Serena MCP (instalado automáticamente si no está presente)

---

## Método 1: Instalación con Un Solo Comando (Recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Este script:
1. Detecta tu plataforma (macOS, Linux)
2. Verifica bun y uv, instalándolos si faltan
3. Ejecuta el instalador interactivo con selección de preset
4. Crea `.agents/` con las habilidades seleccionadas
5. Configura la capa de integración `.claude/` (hooks, enlaces simbólicos, configuración)
6. Configura Serena MCP si se detecta

Tiempo de instalación típico: menos de 60 segundos.

---

## Método 2: Instalación Manual vía bunx

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

### Qué Se Crea

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
├── workflows/                      # Las 14 definiciones de flujos de trabajo
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

## Método 3: Instalación Global

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
oma usage:anti          # Detección de anti-patrones de uso
oma star                # Dar estrella al repositorio
```

`oma` es la forma abreviada de `oh-my-agent`. Ambos funcionan como comandos CLI.

---

## Instalación de Herramientas CLI de IA

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

---

## oma-config.yaml

El comando `oma install` crea `.agents/oma-config.yaml`. Este es el archivo de configuración central para todo el comportamiento de oh-my-agent:

```yaml
# Idioma de respuesta para todos los agentes y flujos
language: en

# Formato de fecha usado en informes y archivos de memoria
date_format: "YYYY-MM-DD"

# Zona horaria para marcas de tiempo
timezone: "UTC"

# Herramienta CLI predeterminada para generación de agentes
# Opciones: gemini, claude, codex, qwen
default_cli: gemini

# Mapeo CLI por agente (sobrescribe default_cli)
agent_cli_mapping:
  frontend: claude       # Razonamiento complejo de UI
  backend: gemini        # Generación rápida de APIs
  mobile: gemini
  db: gemini
  pm: gemini             # Descomposición rápida
  qa: claude             # Revisión exhaustiva de seguridad
  debug: claude          # Análisis profundo de causa raíz
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Referencia de Campos

| Campo | Tipo | Predeterminado | Descripción |
|-------|------|----------------|-------------|
| `language` | string | `en` | Código de idioma de respuesta. Toda la salida de agentes, mensajes de flujos e informes usan este idioma. Soporta 11 idiomas (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Cadena de formato de fecha para marcas de tiempo en planes, archivos de memoria e informes. |
| `timezone` | string | `UTC` | Zona horaria para todas las marcas de tiempo. Usa identificadores estándar (ej., `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | CLI de respaldo cuando no existe mapeo específico por agente. Usado como nivel 3 en la prioridad de resolución de proveedor. |
| `agent_cli_mapping` | map | (vacío) | Mapea IDs de agente a proveedores CLI específicos. Tiene precedencia sobre `default_cli`. |

### Prioridad de Resolución de Proveedor

Al generar un agente, el proveedor CLI se determina por este orden de prioridad (el más alto primero):

1. Flag `--model` pasado a `oma agent:spawn`
2. Entrada `agent_cli_mapping` para ese agente específico en `oma-config.yaml`
3. Configuración `default_cli` en `oma-config.yaml`
4. `active_vendor` en `cli-config.yaml` (respaldo legacy)
5. `gemini` (respaldo fijo final)

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

### Actualización de Habilidades del Proyecto

Las habilidades y flujos de trabajo dentro de un proyecto pueden actualizarse mediante el GitHub Action (`action/`) para actualizaciones automatizadas, o manualmente re-ejecutando el instalador:

```bash
bunx oh-my-agent@latest
```

El instalador detecta instalaciones existentes y ofrece actualizar preservando tu `oma-config.yaml` y cualquier configuración personalizada.

---

## Próximos Pasos

Abre tu proyecto en tu IDE de IA y comienza a usar oh-my-agent. Las habilidades se auto-detectan. Prueba:

```
"Construir un formulario de login con validación de email usando Tailwind CSS"
```

O usa un comando de flujo de trabajo:

```
/plan funcionalidad de autenticación con JWT y tokens de refresco
```

Consulta la [Guía de Uso](/guide/usage) para ejemplos detallados, o aprende sobre los [Agentes](/core-concepts/agents) para entender qué hace cada especialista.
