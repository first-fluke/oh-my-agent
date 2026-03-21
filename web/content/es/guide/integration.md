---
title: Integracion en proyecto existente
description: Flujo de integracion seguro y no destructivo para agregar skills de oh-my-agent a un proyecto Antigravity existente.
---

# Integrar en un proyecto existente

Esta guia reemplaza el flujo de trabajo heredado del `AGENT_GUIDE.md` raiz y refleja la estructura actual del workspace (`cli` + `web`) y el comportamiento de la CLI.

## Objetivo

Agregar skills de `oh-my-agent` a un proyecto existente sin sobrescribir los activos actuales.

## Ruta recomendada (CLI)

Ejecute esto en la raiz del proyecto destino:

```bash
bunx oh-my-agent
```

Lo que hace:

- Instala o actualiza `.agents/skills/*`
- Instala recursos compartidos en `.agents/skills/_shared`
- Instala `.agents/workflows/*`
- Instala `.agents/config/user-preferences.yaml`
- Opcionalmente instala flujos de trabajo globales en `~/.gemini/antigravity/global_workflows`

## Ruta manual segura

Use esta opcion cuando necesite control total sobre cada directorio copiado.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Copiar solo los directorios de skills faltantes (ejemplo)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Copiar recursos compartidos si faltan
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Copiar flujos de trabajo si faltan
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Copiar preferencias de usuario predeterminadas solo si faltan
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Lista de verificacion

```bash
# 9 skills instalables (excluyendo _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Recursos compartidos
[ -d .agents/skills/_shared ] && echo ok

# 7 flujos de trabajo
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Verificacion basica de comandos
bunx oh-my-agent doctor
```

## Paneles opcionales

Los paneles son opcionales y usan la CLI instalada:

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

URL predeterminada del panel web: `http://localhost:9847`

## Estrategia de reversion

Antes de la integracion, cree un commit de punto de control en su proyecto:

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

Si necesita deshacer, revierta ese commit con el proceso habitual de su equipo.

## Soporte de enlaces simbolicos multi-CLI

Cuando ejecuta `bunx oh-my-agent`, vera este mensaje despues de seleccionar los skills:

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Seleccione las herramientas CLI adicionales que usa junto con Antigravity. El instalador:

1. Instala los skills en `.agents/skills/` (la ubicacion nativa de Antigravity)
2. Crea enlaces simbolicos desde el directorio de skills de cada CLI seleccionada hacia `.agents/skills/`

Esto asegura una unica fuente de verdad mientras permite que los skills funcionen en multiples herramientas CLI.

### Estructura de enlaces simbolicos

```
.agents/skills/oma-frontend/      ← Fuente (SSOT)
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

El instalador omite los enlaces simbolicos existentes y advierte si existe un directorio real en la ubicacion destino.

## Notas

- No sobrescriba las carpetas existentes en `.agents/skills/*` a menos que tenga la intencion de reemplazar skills personalizados.
- Mantenga los archivos de politica especificos del proyecto (`.agents/config/*`) bajo la propiedad de su repositorio.
- Para patrones de orquestacion multi-agente, continue con la [`Guia de uso`](./usage.md).
