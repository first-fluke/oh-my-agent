# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

¿Alguna vez quisiste que tu asistente de IA tuviera compañeros de trabajo? Eso es lo que hace oh-my-agent.

En vez de que una sola IA haga todo (y se pierda a mitad de camino), oh-my-agent reparte el trabajo entre **agentes especializados** — frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design y más. Cada uno conoce su dominio a fondo, tiene sus propias herramientas y checklists, y se mantiene en su carril.

Funciona con todos los IDEs de IA principales: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode y más.

Los subagentes nativos del proveedor se generan desde `.agents/agents/`:
- Claude Code usa `.claude/agents/*.md`
- Codex CLI usa `.codex/agents/*.toml`
- Gemini CLI usa `.gemini/agents/*.md`

Cuando un workflow resuelve un agente al mismo proveedor que el runtime actual, debe usar primero la ruta de subagente nativo de ese proveedor. Las tareas entre proveedores recurren a `oma agent:spawn`.

## Inicio Rápido

```bash
# macOS / Linux — instala bun y uv automáticamente si faltan
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — instala bun y uv automáticamente si faltan
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# O manualmente (cualquier SO, requiere bun + uv)
bunx oh-my-agent@latest
```

### Instalación vía Agent Package Manager

<details>
<summary><a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) de Microsoft — distribución solo de skills. Click para expandir.</summary>

> No lo confundas con el APM (Application Performance Monitoring) de `oma-observability`.

```bash
# 22 skills, desplegados en cada runtime detectado
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Un solo skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM lee el puntero `skills: .agents/skills/` de `.claude-plugin/plugin.json`, así que el SSOT en `.agents/` es la única fuente — sin paso de build ni mirror.

APM solo trae los 22 skills. Para workflows, reglas, `oma-config.yaml`, hooks de detección de palabras clave y el CLI `oma agent:spawn`, usa `bunx oh-my-agent@latest`. Elige una sola forma de distribución por proyecto para no acabar con todo desincronizado.

</details>

Elige un preset y listo:

| Preset | Lo Que Incluye |
|--------|-------------|
| ✨ All | Todos los agentes y skills |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Tu Equipo de Agentes

| Agente | Qué Hace |
|-------|-------------|
| **oma-architecture** | Trade-offs arquitectónicos, límites, análisis con mirada ADR/ATAM/CBAM |
| **oma-backend** | APIs en Python, Node.js o Rust |
| **oma-brainstorm** | Explora ideas antes de que te lances a construir |
| **oma-db** | Diseño de esquemas, migraciones, indexación, vector DB |
| **oma-debug** | Análisis de causa raíz, correcciones, tests de regresión |
| **oma-design** | Sistemas de diseño, tokens, accesibilidad, responsive |
| **oma-dev-workflow** | CI/CD, releases, automatización de monorepo |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-hwp** | Conversión de HWP/HWPX/HWPML a Markdown |
| **oma-image** | Generación de imágenes IA multi-proveedor |
| **oma-mobile** | Apps multiplataforma con Flutter |
| **oma-observability** | Router de observabilidad — APM/RUM, métricas/logs/trazas/perfiles, SLO, forense de incidentes, ajuste de transporte |
| **oma-orchestrator** | Ejecución paralela de agentes vía CLI |
| **oma-pdf** | Conversión de PDF a Markdown |
| **oma-pm** | Planifica tareas, desglosa requisitos, define contratos de API |
| **oma-qa** | Seguridad OWASP, rendimiento, revisión de accesibilidad |
| **oma-recap** | Analisis del historial de conversaciones y resumenes tematicos de trabajo |
| **oma-scm** | SCM (gestión de configuración del software): ramas, fusiones, worktrees, líneas base; Conventional Commits |
| **oma-search** | Router de búsqueda basado en intención + puntuación de confianza — docs, web, código, local |
| **oma-tf-infra** | IaC multi-cloud con Terraform (Infrastructure as Code) |
| **oma-translator** | Traducción multilingüe natural |

## Cómo Funciona

Solo chatea. Describe lo que quieres y oh-my-agent se encarga de elegir los agentes adecuados.

```
Tú: "Construye una app de TODO con autenticación de usuarios"
→ PM planifica el trabajo
→ Backend construye la API de auth
→ Frontend construye la UI en React
→ DB diseña el esquema
→ QA revisa todo
→ Listo: código coordinado y revisado
```

O usa slash commands para flujos estructurados:

| Paso | Comando | Qué Hace |
|------|---------|-------------|
| 1 | `/brainstorm` | Ideación libre |
| 2 | `/architecture` | Revisión de arquitectura, trade-offs, análisis estilo ADR/ATAM/CBAM |
| 2 | `/design` | Flujo de sistema de diseño en 7 fases |
| 2 | `/plan` | PM desglosa tu feature en tareas |
| 3 | `/work` | Ejecución multi-agente paso a paso |
| 3 | `/orchestrate` | Lanzamiento automatizado de agentes en paralelo |
| 3 | `/ultrawork` | Flujo de calidad en 5 fases con 11 puertas de revisión |
| 4 | `/review` | Auditoría de seguridad + rendimiento + accesibilidad |
| 5 | `/debug` | Debugging estructurado de causa raíz |
| 6 | `/scm` | Flujo SCM y Git con soporte de Conventional Commits |

**Auto-detección**: Ni siquiera necesitas slash commands — palabras clave como "arquitectura", "plan", "review" y "debug" en tu mensaje (¡en 11 idiomas!) activan automáticamente el flujo correcto.

## CLI

```bash
# Instalar globalmente
bun install --global oh-my-agent   # o: brew install oh-my-agent

# Usar donde sea
oma doctor                  # Chequeo de salud
oma dashboard               # Monitoreo de agentes en tiempo real
oma link                    # Regenera .claude/.codex/.gemini/etc. desde .agents/
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

La selección de modelo sigue dos capas:
- El despacho nativo del mismo proveedor usa la definición de agente generada en `.claude/agents/`, `.codex/agents/` o `.gemini/agents/`.
- El despacho entre proveedores o el fallback por CLI usa los valores por defecto del proveedor en `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

**modelos por agente**: cada agente puede apuntar a un modelo y `effort` propios desde `.agents/oma-config.yaml`. Vienen cinco runtime profiles listos: `claude-only`, `codex-only`, `gemini-only`, `antigravity`, `qwen-only`. Revisa la matriz de auth resuelta con `oma doctor --profile`. Guía completa: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

## ¿Por Qué oh-my-agent?

> [Leer más →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Portable** — `.agents/` viaja con tu proyecto, no queda atrapado en un IDE
- **Basado en roles** — Agentes modelados como un equipo de ingeniería real, no un montón de prompts
- **Eficiente en tokens** — Diseño de skills en dos capas ahorra ~75% de tokens
- **Calidad primero** — Charter preflight, quality gates y flujos de revisión integrados
- **Multi-vendor** — Mezcla Gemini, Claude, Codex y Qwen por tipo de agente
- **Observable** — Dashboards en terminal y web para monitoreo en tiempo real

## Arquitectura

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## Más Información

- **[Documentación Detallada](./AGENTS_SPEC.md)** — Spec técnico completo y arquitectura
- **[Agentes Soportados](./SUPPORTED_AGENTS.md)** — Matriz de soporte de agentes por IDE
- **[Docs Web](https://first-fluke.github.io/oh-my-agent/)** — Guías, tutoriales y referencia del CLI

## Sponsors

Este proyecto se mantiene gracias a nuestros generosos sponsors.

> **¿Te gusta este proyecto?** ¡Dale una estrella!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Prueba nuestra plantilla starter optimizada: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[Hazte sponsor →](https://github.com/sponsors/first-fluke)

Consulta [SPONSORS.md](../SPONSORS.md) para la lista completa de supporters.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Referencias

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026


## Licencia

MIT
