---
title: "Guía: Integración en Proyecto Existente"
description: Guía completa para agregar oh-my-agent a un proyecto existente — vía CLI, vía manual, verificación, estructura de enlaces simbólicos SSOT y qué hace el instalador internamente.
---

# Guía: Integración en Proyecto Existente

## Dos Vías de Integración

Hay dos formas de agregar oh-my-agent a un proyecto existente:

1. **Via CLI** — Ejecuta `oma` (o `npx oh-my-agent`) y sigue los prompts interactivos. Recomendado para la mayoria de usuarios.
2. **Via manual** — Copia archivos y configura symlinks manualmente. Util para entornos restringidos o configuraciones personalizadas.

Ambas vias producen el mismo resultado: un directorio `.agents/` (el SSOT) con symlinks apuntando los directorios especificos del IDE hacia el.

---

## Vía CLI: Paso a Paso

### 1. Instalar el CLI

```bash
# Instalacion global (recomendada)
bun install --global oh-my-agent

# O usar npx para ejecuciones puntuales
npx oh-my-agent
```

Después de la instalación global, el comando `oma` (o `oh-my-agent`) está disponible.

### 2. Navegar a la Raiz del Proyecto

```bash
cd /path/to/your/project
```

El instalador espera ejecutarse desde la raiz del proyecto (donde reside `.git/`).

### 3. Ejecutar el Instalador

```bash
oma
```

El comando por defecto (sin subcomando) inicia el instalador interactivo.

### 4. Seleccionar Tipo de Proyecto

El instalador presenta estos presets:

| Preset | Habilidades Incluidas |
|:-------|:---------------------|
| **All** | Todas las habilidades disponibles |
| **Fullstack** | Frontend + Backend + PM + QA |
| **Frontend** | Habilidades React/Next.js |
| **Backend** | Habilidades backend Python/Node.js/Rust |
| **Mobile** | Habilidades movil Flutter/Dart |
| **DevOps** | Habilidades Terraform + CI/CD + Workflow |
| **Custom** | Elegir habilidades individuales de la lista completa |

### 5. Elegir Lenguaje Backend (si aplica)

Si seleccionaste un preset que incluye la habilidad backend, se te pide elegir una variante de lenguaje:

- **Python** — FastAPI/SQLAlchemy (predeterminado)
- **Node.js** — NestJS/Hono + Prisma/Drizzle
- **Rust** — Axum/Actix-web
- **Other / Auto-detect** — Configurar despues con `/stack-set`

### 6. Configurar Symlinks de IDE

El instalador siempre crea symlinks de Claude Code (`.claude/skills/`). Si existe un directorio `.github/`, tambien crea symlinks de GitHub Copilot automaticamente. De lo contrario, pregunta:

```
Also create symlinks for GitHub Copilot? (.github/skills/)
```

### 7. Configuracion de Git Rerere

El instalador verifica si `git rerere` (reuse recorded resolution) esta habilitado. Si no, ofrece habilitarlo globalmente:

```
Enable git rerere? (Recommended for multi-agent merge conflict reuse)
```

Esto se recomienda porque los flujos multiagente pueden producir conflictos de merge, y rerere recuerda como los resolviste para aplicar la misma resolucion automaticamente la proxima vez.

### 8. Configuracion MCP

Si existe una configuracion MCP de Antigravity IDE (`~/.gemini/antigravity/mcp_config.json`), el instalador ofrece configurar el puente Serena MCP:

```
Configure Serena MCP with bridge? (Required for full functionality)
```

Si se acepta, configura:

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

De forma similar, si existen configuraciones de Gemini CLI (`~/.gemini/settings.json`), ofrece configurar Serena para Gemini CLI en modo HTTP:

```json
{
  "mcpServers": {
    "serena": {
      "url": "http://localhost:12341/mcp"
    }
  }
}
```

### 9. Finalizacion

El instalador muestra un resumen de todo lo instalado:
- Lista de habilidades instaladas
- Ubicacion del directorio de habilidades
- Symlinks creados
- Elementos omitidos (si los hay)

---

## Vía Manual

Para entornos donde el CLI interactivo no esta disponible (pipelines de CI, shells restringidos, maquinas corporativas).

### Paso 1: Descargar y Extraer

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

### Paso 2: Copiar Archivos a Tu Proyecto

```bash
# Copy the core .agents/ directory
cp -r .agents/ /path/to/your/project/.agents/

# Create Claude Code symlinks
mkdir -p /path/to/your/project/.claude/skills
mkdir -p /path/to/your/project/.claude/agents

# Symlink skills (example for a fullstack project)
ln -sf ../../.agents/skills/oma-frontend /path/to/your/project/.claude/skills/oma-frontend
ln -sf ../../.agents/skills/oma-backend /path/to/your/project/.claude/skills/oma-backend
ln -sf ../../.agents/skills/oma-qa /path/to/your/project/.claude/skills/oma-qa
ln -sf ../../.agents/skills/oma-pm /path/to/your/project/.claude/skills/oma-pm

# Symlink shared resources
ln -sf ../../.agents/skills/_shared /path/to/your/project/.claude/skills/_shared

# Symlink workflow routers
for workflow in .agents/workflows/*.md; do
  name=$(basename "$workflow" .md)
  ln -sf ../../.agents/workflows/"$name".md /path/to/your/project/.claude/skills/"$name".md
done

# Symlink agent definitions
for agent in .agents/agents/*.md; do
  name=$(basename "$agent")
  ln -sf ../../.agents/agents/"$name" /path/to/your/project/.claude/agents/"$name"
done
```

### Paso 3: Configurar Preferencias de Usuario

```bash
mkdir -p /path/to/your/project/.agents/config
cat > /path/to/your/project/.agents/oma-config.yaml << 'EOF'
language: en
date_format: ISO
timezone: UTC
default_cli: gemini

agent_cli_mapping:
  frontend: gemini
  backend: gemini
  mobile: gemini
  qa: gemini
  debug: gemini
  pm: gemini
EOF
```

### Paso 4: Inicializar Directorio de Memoria

```bash
oma memory:init
# Or manually:
mkdir -p /path/to/your/project/.serena/memories
```

---

## Lista de Verificación

Despues de la instalacion (por cualquiera de las dos vias), verifica que todo este configurado correctamente:

```bash
# Run the doctor command for a full health check
oma doctor

# Check output format for CI
oma doctor --json
```

El comando doctor verifica:

| Verificacion | Que Comprueba |
|:-------------|:-------------|
| **Instalaciones CLI** | gemini, claude, codex, qwen — version y disponibilidad |
| **Autenticacion** | Estado de API key u OAuth para cada CLI |
| **Configuracion MCP** | Configuracion del servidor Serena MCP para cada entorno CLI |
| **Estado de habilidades** | Que habilidades estan instaladas y si estan actualizadas |

Comandos de verificacion manual:

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
ls .serena/memories/ 2>/dev/null || echo "Memory not initialized"

# Check version
cat .agents/skills/_version.json 2>/dev/null
```

---

## Estructura de Enlaces Simbólicos Multi-IDE (Concepto SSOT)

oh-my-agent usa una arquitectura de Fuente Unica de Verdad (SSOT). El directorio `.agents/` es el unico lugar donde residen las habilidades, flujos de trabajo, configuraciones y definiciones de agentes. Todos los directorios especificos del IDE contienen solo symlinks que apuntan de vuelta a `.agents/`.

### Estructura de Directorios

```
your-project/
  .agents/                          # SSOT — the real files live here
    agents/                         # Agent definition files
      backend-engineer.md
      frontend-engineer.md
      qa-reviewer.md
      ...
    config/                         # Configuration
      oma-config.yaml
    mcp.json                        # MCP server configuration
    results/plan-{sessionId}.json                       # Current plan (generated by /plan)
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
    results/                        # Agent execution results
  .claude/                          # Claude Code — symlinks only
    skills/                         # -> .agents/skills/* and .agents/workflows/*
    agents/                         # -> .agents/agents/*
  .github/                          # GitHub Copilot — symlinks only (optional)
    skills/                         # -> .agents/skills/*
  .serena/                          # MCP memory storage
    memories/                       # Runtime memory files
    metrics.json                    # Productivity metrics
```

### Por Que Symlinks?

- **Una actualizacion, todos los IDEs se benefician.** Cuando `oma update` refresca `.agents/`, cada IDE recoge los cambios automaticamente.
- **Sin duplicacion.** Las habilidades se almacenan una vez, no se copian por IDE.
- **Eliminacion segura.** Borrar `.claude/` no destruye tus habilidades. El SSOT en `.agents/` permanece intacto.
- **Compatible con git.** Los symlinks son pequenos y generan diffs limpios.

---

## Consejos de Seguridad y Estrategia de Reversión

### Antes de la Instalacion

1. **Confirma tu trabajo actual.** El instalador crea nuevos directorios y archivos. Tener un estado git limpio significa que puedes hacer `git checkout .` para deshacer todo.
2. **Verifica si existe un directorio `.agents/`.** Si existe de otra herramienta, haz un respaldo primero. El instalador lo sobrescribira.

### Despues de la Instalacion

1. **Revisa lo que se creo.** Ejecuta `git status` para ver todos los archivos nuevos. El instalador crea archivos solo en `.agents/`, `.claude/` y opcionalmente `.github/`.
2. **Agrega a `.gitignore` selectivamente.** La mayoria de equipos confirman `.agents/` y `.claude/` para compartir la configuracion. Pero `.serena/` (memoria en tiempo de ejecucion) y `.agents/results/` (resultados de ejecucion) deberian ignorarse en git:

```gitignore
# oh-my-agent runtime files
.serena/
.agents/results/
.agents/state/
```

### Reversion

Para eliminar completamente oh-my-agent de un proyecto:

```bash
# Remove the SSOT directory
rm -rf .agents/

# Remove IDE symlinks
rm -rf .claude/skills/ .claude/agents/
rm -rf .github/skills/  # if created

# Remove runtime files
rm -rf .serena/
```

O simplemente revertir con git:

```bash
git checkout -- .agents/ .claude/
git clean -fd .agents/ .claude/ .serena/
```

---

## Configuración del Dashboard

Despues de la instalacion, puedes configurar monitoreo en tiempo real. Consulta la [guia de Monitoreo con Dashboard](/docs/guide/dashboard-monitoring) para detalles completos.

Configuracion rapida:

```bash
# Terminal dashboard (watches .serena/memories/ for changes)
oma dashboard

# Web dashboard (browser-based, http://localhost:9847)
oma dashboard:web
```

---

## Qué Hace el Instalador Internamente

Cuando ejecutas `oma` (el comando de instalacion), esto es exactamente lo que sucede:

### 1. Migracion Legacy

El instalador verifica el antiguo directorio `.agent/` (singular) y lo migra a `.agents/` (plural) si lo encuentra. Esta es una migracion unica para usuarios que actualizan desde versiones anteriores.

### 2. Deteccion de Competidores

El instalador escanea herramientas competidoras y ofrece eliminarlas para evitar conflictos.

### 3. Descarga del Tarball

El instalador descarga el tarball de la ultima version desde los releases de GitHub de oh-my-agent. Este tarball contiene el directorio `.agents/` completo con todas las habilidades, recursos compartidos, flujos de trabajo, configuraciones y definiciones de agentes.

### 4. Instalacion de Recursos Compartidos

`installShared()` copia el directorio `_shared/` a `.agents/skills/_shared/`. Esto incluye:

- `core/` — Enrutamiento de habilidades, carga de contexto, estructura de prompt, principios de calidad, deteccion de proveedor, contratos API.
- `runtime/` — Protocolo de memoria, protocolos de ejecucion por proveedor.
- `conditional/` — Recursos cargados solo cuando se cumplen condiciones especificas (quality score, bucle de exploracion).

### 5. Instalacion de Flujos de Trabajo

`installWorkflows()` copia todos los archivos de flujo a `.agents/workflows/`. Estas son las definiciones para `/orchestrate`, `/work`, `/ultrawork`, `/plan`, `/exec-plan`, `/brainstorm`, `/deepinit`, `/review`, `/debug`, `/design`, `/scm`, `/tools` y `/stack-set`.

### 6. Instalacion de Configuracion

`installConfigs()` copia archivos de configuracion por defecto a `.agents/config/`, incluyendo `oma-config.yaml` y `mcp.json`. Si estos archivos ya existen, se preservan (no se sobrescriben) a menos que se use `--force`.

### 7. Instalacion de Habilidades

Para cada habilidad seleccionada, `installSkill()` copia el directorio de la habilidad a `.agents/skills/{skill-name}/`. Si se selecciono una variante (ej., Python para backend), tambien configura el directorio `stack/` con recursos especificos del lenguaje.

### 8. Adaptaciones de Proveedores

`installVendorAdaptations()` instala archivos especificos del IDE para todos los proveedores soportados (Claude, Codex, Gemini, Qwen):

- Definiciones de agentes (`.claude/agents/*.md`)
- Configuraciones de hooks (`.claude/hooks/`)
- Archivos de configuracion
- Instrucciones de proyecto CLAUDE.md

### 9. Symlinks del CLI

`createCliSymlinks()` crea symlinks desde directorios especificos del IDE al SSOT:

- `.claude/skills/{skill}` -> `../../.agents/skills/{skill}`
- `.claude/skills/{workflow}.md` -> `../../.agents/workflows/{workflow}.md`
- `.claude/agents/{agent}.md` -> `../../.agents/agents/{agent}.md`
- `.github/skills/{skill}` -> `../../.agents/skills/{skill}` (si Copilot esta habilitado)

### 10. Flujos de Trabajo Globales

`installGlobalWorkflows()` instala archivos de flujo que pueden ser necesarios globalmente (fuera del directorio del proyecto).

### 11. Configuracion de Git Rerere + MCP

Como se describe en la via CLI arriba, el instalador opcionalmente configura git rerere y las configuraciones MCP.
