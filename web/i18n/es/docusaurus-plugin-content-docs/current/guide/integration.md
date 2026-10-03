---
title: "Guía: Integración de un proyecto existente"
sidebar_label: Proyectos existentes
description: Guía completa para añadir oh-my-agent a un proyecto existente, con la ruta de la CLI, la ruta manual, la verificación, la estructura de symlinks del SSOT y lo que hace el instalador internamente.
---

# Guía: Integración de un proyecto existente

## Dos vías de integración

Hay dos formas de añadir oh-my-agent a un proyecto existente:

1. **Ruta de la CLI**: ejecuta `oma` (o `npx oh-my-agent`) y sigue los prompts interactivos. Es la opción recomendada para la mayoría de usuarios.
2. **Ruta manual**: copia los archivos y configura los symlinks por tu cuenta. Resulta útil en entornos restringidos o con configuraciones personalizadas.

Ambas vías producen el mismo resultado: un directorio `.agents/` (el SSOT), además de archivos generados nativos de los proveedores como `.claude/agents/`, `.codex/agents/` y `.qwen/agents/`.

---

## Ruta de la CLI: paso a paso

### 1. Instalar la CLI

```bash
# Global install (recommended)
bun install --global oh-my-agent

# Or use npx for one-time runs
npx oh-my-agent
```

Después de la instalación global, el comando `oma` (o `oh-my-agent`) estará disponible.

### 2. Ir a la raíz del proyecto

```bash
cd /path/to/your/project
```

Ejecuta el instalador desde el directorio del proyecto que quieres configurar. OMA escribe el SSOT en relación con su raíz de instalación; se recomienda usar un repositorio Git para revisar y revertir cambios, pero el instalador no lo exige.

### 3. Ejecutar el instalador

```bash
oma
```

El comando predeterminado (sin subcomando) inicia el instalador interactivo.

### 4. Seleccionar el tipo de proyecto

El instalador presenta estos presets:

| Preset | Skills incluidas |
|:-------|:---------------|
| **All** | Todas las skills disponibles |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | Skills de React/Next.js |
| **Backend** | Skills de backend para Python/Node.js/Rust |
| **Mobile** | Skills móviles para Flutter/Dart |
| **DevOps** | Skills de Terraform + CI/CD + Workflow |
| **Custom** | Elegir skills individuales de la lista completa |

### 5. Elegir el lenguaje de backend (si corresponde)

Si seleccionaste un preset que incluye la skill de backend, se te pedirá elegir una variante de lenguaje:

- **Python**: FastAPI/SQLAlchemy (predeterminado)
- **Node.js**: NestJS/Hono + Prisma/Drizzle
- **Rust**: Axum/Actix-web
- **Other / Auto-detect**: configurar más adelante con `/stack-set`

### 6. Configurar los symlinks del IDE

El instalador siempre crea symlinks de Claude Code (`.claude/skills/`). También genera los archivos de agente nativos, hooks, configuraciones y archivos de integración del proveedor seleccionado; las familias de proveedores actuales incluyen Antigravity, Claude, Codex, Cursor, Kiro, Kimi y Qwen, además de rutas de extensión para pi y OpenCode. Si existe un directorio `.github/`, puede crear automáticamente symlinks de GitHub Copilot. Al seleccionar **ZCode**, expone los workflows como slash-commands mediante symlinks `.zcode/commands/*.md` (solo workflows, sin archivos de agentes ni hooks). En otros casos, pregunta:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Configuración global de git recomendada

Hacia el final de `oma install` y `oma update`, la CLI inspecciona dos configuraciones **globales** de git que ayudan a los workflows multiagente:

| Clave | Valor deseado | Motivo |
|:----|:--------------|:----|
| `rerere.enabled` | `true` | Reutiliza resoluciones registradas: los merges multiagente suelen encontrar los mismos conflictos y rerere vuelve a aplicar tu corrección anterior |
| `init.defaultBranch` | `main` | Mantiene un nombre de rama predeterminado coherente para los repositorios nuevos |

Si falta un valor o es diferente, la CLI ofrece confirmarlo de forma interactiva (la opción predeterminada es **sí**):

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse) (unset)
Set git init.defaultBranch to main? (Recommended global default) (currently "master")
```

Al aceptarlo, se ejecuta el equivalente de:

```bash
git config --global rerere.enabled true
git config --global init.defaultBranch main
```

Las rutas no interactivas (`--yes`, `--ci`, `CI=true`) nunca escriben la configuración global de git. Solo muestran una nota de omisión con los comandos para corregirlo manualmente.

`oma doctor` informa de las mismas comprobaciones en **Git Config**, cuenta las diferencias como incidencias, las expone como `gitRecommended` en la salida `--json` y puede aplicar las correcciones de forma interactiva.

### 8. Configuración de MCP

Si existe una configuración de MCP de Antigravity IDE (`~/.gemini/antigravity/mcp_config.json`), el instalador ofrece configurar el puente de Serena MCP:

```
Configure Serena MCP with bridge? (Required for full functionality)
```

Si lo aceptas, configura:

```json
{
  "mcpServers": {
    "serena": {
      "command": "npx",
      "args": ["-y", "oh-my-agent@latest", "bridge", "http://localhost:12341/mcp"],
      "disabled": false
    }
  }
}
```

De forma similar, si existe una configuración de Gemini CLI (`~/.gemini/settings.json`), ofrece configurar Serena para Gemini CLI en modo HTTP:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. Finalización

El instalador muestra un resumen de todo lo instalado:

- Lista de skills instaladas
- Ubicación del directorio de skills
- Symlinks creados
- Elementos omitidos, si los hay

---

## Ruta manual

Para entornos en los que la CLI interactiva no está disponible (pipelines de CI, shells restringidos o máquinas corporativas).

### Paso 1: descargar y extraer

```bash
# Download the latest tarball from the registry
VERSION=$(curl -s https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/prompt-manifest.json | jq -r '.version')
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz" -o agent-skills.tar.gz

# Verify checksum
curl -L "https://github.com/first-fluke/oh-my-agent/releases/download/cli-v${VERSION}/agent-skills.tar.gz.sha256" -o agent-skills.tar.gz.sha256
sha256sum -c agent-skills.tar.gz.sha256

# Extract
tar -xzf agent-skills.tar.gz
```

### Paso 2: copiar los archivos al proyecto

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Regenerate vendor-native files from the SSOT
cd /path/to/your/project
oma link
```

`oma link` regenera `.claude/`, `.codex/`, `.qwen/` y los archivos nativos de los proveedores relacionados a partir de `.agents/agents/`. En runtime, OMA usa el despacho nativo solo cuando el proveedor del runtime actual coincide con el proveedor objetivo de ese agente. Las configuraciones con varios proveedores siguen funcionando, pero los agentes que no coinciden recurren a `oma agent spawn` externo.

Para Qwen Code, las definiciones Markdown generadas viven en `.qwen/agents/`. Selecciona un rol de OMA mediante el `subagent_type` de la herramienta Agent, por ejemplo `backend-engineer`. Consulta las definiciones disponibles con `/agents manage` en Qwen Code. Los agentes nativos usan el mismo [ciclo de vida de resultados](./agent-results-and-resume.md) que los agentes generados mediante la CLI: `oma agent begin`, `oma agent verify` y `oma agent finish`. Con `model_preset: free`, usa `oma agent spawn` para que el hijo reciba la configuración del gateway.

Qwen Code usa el mismo `code-intelligence-primer` que los demás proveedores. Igual que Claude Code, registra la guía inicial (primer) compartida en `SessionStart` y `UserPromptSubmit`: se inyecta una vez por sesión y de nuevo tras la compactación. Esta guía sigue al proveedor configurado (Serena o Gortex), incluye indicaciones sobre herramientas diferidas y permite el fallback nativo cuando el proveedor no está disponible o agota el tiempo de espera. Qwen no añade ningún bloqueo de búsqueda de código ni seguimiento de resultados del proveedor por separado.

Después de actualizar la CLI, ejecuta `oma link qwen` para regenerar los ajustes de hooks y el wrapper, y luego inicia una sesión nueva de Qwen. Las pruebas de la salida de los hooks verifican el contrato de integración; no garantizan qué herramienta elegirá un modelo.

### Paso 3: configurar las preferencias del usuario

```bash
mkdir -p /path/to/your/project/.agents
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
model_preset: antigravity
EOF
```

### Paso 4: inicializar el directorio de memoria

```bash
oma memory init
# Or manually:
mkdir -p /path/to/your/project/.agents/state/memories
```

---

## Lista de verificación

Después de la instalación, por cualquiera de las dos vías, verifica que todo esté configurado correctamente:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

El comando doctor comprueba:

| Comprobación | Qué verifica |
|:------|:----------------|
| **Instalaciones de CLI** | agy, claude, codex, qwen (versión y disponibilidad) |
| **Autenticación** | Estado de la API key o de OAuth para cada CLI |
| **Configuración de MCP** | Configuración del servidor Serena MCP para cada entorno de CLI |
| **Estado de las skills** | Qué skills están instaladas y si están actualizadas |

Comandos de verificación manual:

```bash
# Verify .agents/ directory exists
ls -la .agents/

# Verify skills are installed
ls .agents/skills/

# Verify symlinks point to correct targets
ls -la .claude/skills/

# Verify config exists
cat .agents/oma-config.yaml

# Verify memory directory
ls .agents/state/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Estructura de symlinks multi-IDE (concepto SSOT)

oh-my-agent usa una arquitectura de fuente única de verdad (SSOT). El directorio `.agents/` es el único lugar donde viven las skills, los workflows, las configuraciones y las definiciones de agentes. Los directorios específicos de cada IDE contienen únicamente symlinks que apuntan de vuelta a `.agents/`.

### Estructura de directorios

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Shipped auxiliary config files
      ...
    oma-config.yaml                 # User-owned project configuration
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json    # Current plan (generated by /plan)
    skills/                         # Installed skills
      _shared/                      # Shared resources across all skills
        core/                       # Core protocols and references
        runtime/                    # Runtime execution protocols
        conditional/                # Conditionally-loaded resources
      oma-frontend/                 # Frontend skill
      oma-backend/                  # Backend skill
      oma-qa/                       # QA skill
      ...
    workflows/                      # Workflow definitions
      orchestrate.md
      work.md
      ultrawork.md
      plan.md
      ...
    state/                          # Runtime coordination state
      memories/                     # Coordination artifacts (progress-*, result-*, task-board, session-cost-*)
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .zcode/                           # ZCode — workflow commands only (optional)
    commands/                       # -> .agents/workflows/*
  .serena/                          # Serena MCP storage (separate from OMA state)
    memories/                       # Serena's own onboarding memories
    metrics.json                    # Productivity metrics
```

### ¿Por qué symlinks?

Cuando `oma update` actualiza `.agents/`, todos los IDE que apuntan a ese directorio reciben el cambio. Las skills se almacenan una sola vez en lugar de copiarse para cada IDE. Eliminar `.claude/` no elimina las skills: el SSOT de `.agents/` permanece intacto. Los symlinks también ocupan poco y generan diffs limpios en git.

---

## Consejos de seguridad y estrategia de reversión

### Antes de instalar

1. **Haz commit de tu trabajo actual.** El instalador crea directorios y archivos nuevos. Un estado de git limpio permite usar `git checkout .` para deshacerlo todo.
2. **Comprueba si ya existe un directorio `.agents/`.** Si lo ha creado otra herramienta, haz una copia de seguridad antes. El instalador lo sobrescribirá.

### Después de instalar

1. **Revisa lo que se creó.** Ejecuta `git status` para ver todos los archivos nuevos. El instalador solo crea archivos en `.agents/`, `.claude/` y, opcionalmente, `.github/`.
2. **Revisa `.gitignore`.** En un repositorio git, install/update/link añaden automáticamente las entradas de runtime a tu `.gitignore` raíz (`.antigravitycli/`, `.agents/results/`, `.agents/state/`, `.agents/backup/`, `docs/plans/`); verifica que se hayan añadido. La mayoría de los equipos confirman `.agents/` y `.claude/` para compartir la configuración. La entrada que queda a tu criterio es `.serena/`: Serena gestiona su propia caché mediante un `.serena/.gitignore` interno, así que puedes confirmar `.serena/project.yml` (la configuración de proyecto compartida) o ignorar todo el directorio:

```gitignore
# optional — ignore Serena entirely (runtime memory)
.serena/
```

### Reversión

Para eliminar por completo oh-my-agent de un proyecto:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

O simplemente revierte los cambios con git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Configuración del dashboard

Después de instalar, puedes configurar la monitorización en tiempo real. Consulta la [guía de Dashboard Monitoring](/docs/guide/dashboard-monitoring) para conocer todos los detalles.

Configuración rápida:

```bash
# Terminal dashboard (watches .agents/state/memories/ for changes)
oma dashboard terminal

# Web dashboard (browser-based; OMA prints a tokenized loopback URL)
oma dashboard web
```

---

## Qué hace el instalador internamente

Cuando ejecutas `oma` (el comando de instalación), esto es exactamente lo que sucede:

### 1. Migración de legacy

El instalador comprueba si existe el antiguo directorio `.agent/` (singular) y, si lo encuentra, lo migra a `.agents/` (plural). Es una migración única para quienes actualizan desde versiones anteriores.

### 2. Detección de competidores

El instalador busca herramientas competidoras y ofrece eliminarlas para evitar conflictos.

### 3. Descarga del tarball

El instalador descarga el tarball de la última versión desde los releases de GitHub de oh-my-agent. El tarball contiene el directorio `.agents/` completo con todas las skills, recursos compartidos, workflows, configuraciones y definiciones de agentes.

### 4. Instalación de recursos compartidos

`installShared()` copia el directorio `_shared/` a `.agents/skills/_shared/`. Incluye:

- `core/`: enrutamiento de skills, carga de contexto, estructura de prompts, principios de calidad, detección de proveedores y contratos de API.
- `runtime/`: protocolo de memoria y protocolos de ejecución por proveedor.
- `conditional/`: recursos que solo se cargan cuando se cumplen condiciones concretas (quality score, bucle de exploración).

### 5. Instalación de workflows

`installWorkflows()` copia todos los archivos de workflow a `.agents/workflows/`. Son las definiciones de `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` y `/stack-set`.

### 6. Instalación de configuración

`installConfigs()` copia archivos auxiliares a `.agents/config/`, crea `.agents/mcp.json` e inicializa el `.agents/oma-config.yaml` o `.agents/oma-config.cue` propiedad del usuario. Los archivos del usuario existentes se conservan salvo que se use `--force`; `oma update` también mantiene la configuración del usuario y añade nuevas claves de nivel superior de la plantilla cuando es necesario.

### 7. Instalación de skills

Para cada skill seleccionada, `installSkill()` copia el directorio de la skill a `.agents/skills/{skill-name}/`. Si se seleccionó una variante (por ejemplo, Python para backend), también configura el directorio `stack/` con recursos específicos del lenguaje.

### 8. Adaptaciones de proveedores

`installVendorAdaptations()` instala archivos específicos del IDE para los proveedores seleccionados:

- Definiciones de agentes (`.claude/agents/*.md`, `.codex/agents/*.toml`, `.gemini/agents/*.md`)
- Configuraciones de hooks (`.claude/hooks/`, `.codex/hooks.json`)
- Archivos de configuración y el documento de integración de proveedor compartido (solo `AGENTS.md`, incluido Claude Code ≥ 2.1.277). `CLAUDE.md` y `GEMINI.md` nunca reciben un bloque OMA; un `CLAUDE.md` existente propiedad del usuario solo recibe una línea de importación `@AGENTS.md` para que Claude Code no omita `AGENTS.md`

Codex protege sus hooks tras un paso único de confianza, por lo que `.codex/hooks.json` no se ejecuta hasta que lo revises una vez mediante el navegador de hooks `/hooks` de Codex. Consulta [Codex Hook Trust](/docs/guide/codex-hook-trust) para obtener más información.

### 9. Symlinks de la CLI

`createCliSymlinks()` crea symlinks desde los directorios específicos del IDE al SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (si Copilot está habilitado)

Los archivos de agentes nativos del proveedor se generan desde `.agents/agents/` mediante `oma link`, `oma install` u `oma update`, en lugar de enlazarse directamente.

### 10. Workflows globales

`installGlobalWorkflows()` instala archivos de workflow que pueden ser necesarios globalmente (fuera del directorio del proyecto).

### 11. Configuración de git recomendada + MCP

Como se describe en la ruta de la CLI anterior, install/update puede configurar de forma opcional los ajustes **globales** de git recomendados (`rerere.enabled`, `init.defaultBranch`) mediante consentimiento interactivo y puede configurar ajustes de MCP cuando corresponde.
