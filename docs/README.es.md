# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

¿Alguna vez quisiste que tu asistente de IA tuviera compañeros de trabajo? Eso es lo que hace oh-my-agent.

En vez de que una sola IA haga todo (y se pierda a mitad de camino), oh-my-agent reparte el trabajo entre **agentes especializados**: frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design y más. Cada uno conoce su dominio a fondo, tiene sus propias herramientas y checklists, y se mantiene en su carril.

Funciona con todos los IDEs de IA principales: Antigravity, Claude Code, Codex, Cursor, Grok Build, Kimi Code, OpenCode, Pi, Qwen Code y más.

## Inicio Rápido

```bash
# macOS / Linux — instala bun, uv y serena automáticamente si faltan
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — instala bun, uv y serena automáticamente si faltan
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# O manualmente (cualquier SO, requiere bun + uv + serena)
bunx oh-my-agent@latest
```

### Instalación vía Agent Package Manager

<details>
<summary><a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) de Microsoft: distribución solo de skills. Click para expandir.</summary>

> No lo confundas con el APM (Application Performance Monitoring) de `oma-observability`.

```bash
# Todos los skills, desplegados en cada runtime detectado
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Un solo skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM solo trae los skills. Para workflows, reglas, `oma-config.yaml`, hooks de detección de palabras clave y el CLI `oma agent:spawn`, usa `bunx oh-my-agent@latest`. Elige una sola forma de distribución por proyecto para no acabar con todo desincronizado.

</details>

Elige un preset y listo:

| Preset | Lo Que Incluye |
|--------|-------------|
| **All** | **Todos los agentes y skills** |
| Backend | architecture + backend + brainstorm + db + debug + dev-workflow + pm + qa + scm |
| Content | academic-writer + design + image + scm + translator + voice |
| DevOps | architecture + brainstorm + debug + dev-workflow + observability + pm + qa + scm + tf-infra |
| Frontend | architecture + brainstorm + debug + design + frontend + pm + qa + scm |
| Fullstack | architecture + backend + brainstorm + db + debug + design + dev-workflow + frontend + mobile + pm + qa + scm + tf-infra |
| Fullstack Mobile | architecture + backend + brainstorm + db + debug + design + dev-workflow + mobile + pm + qa + scm |
| Fullstack Web | architecture + backend + brainstorm + db + debug + design + dev-workflow + frontend + pm + qa + scm |
| Mobile | architecture + brainstorm + debug + mobile + pm + qa + scm |
| Research | academic-writer + hwp + market + pdf + scholar + scm + search + translator |

## Compatible con Todos los Agentes

`oh-my-agent` mantiene `.agents/` como única fuente de verdad (SSOT) y la proyecta al diseño nativo de cada runtime. Así, todas las herramientas compatibles comparten los mismos skills, workflows y reglas.

<table>
<colgroup>
<col span="6" style="width:16.67%" />
</colgroup>
<tr>
<td align="center">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>nativo + adaptador</sub>
</td>
<td align="center">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>nativo + adaptador</sub>
</td>
<td align="center">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>SSOT nativo</sub>
</td>
<td align="center">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>nativo + adaptador</sub>
</td>
<td align="center">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>dispatch nativo</sub>
</td>
<td align="center">
<a href="https://github.com/esengine/DeepSeek-Reasonix"><img src="https://github.com/deepseek-ai.png?size=120" alt="Reasonix" width="48" height="48" /></a><br/>
<strong>Reasonix</strong><br/>
<sub>compatible nativamente</sub>
</td>
</tr>
<tr>
<td align="center">
<a href="https://pi.dev/"><img src="./assets/agents/pi.svg" alt="Pi" width="48" height="48" /></a><br/>
<strong>Pi</strong><br/>
<sub>compatible nativamente</sub>
</td>
<td align="center">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>compatible nativamente</sub>
</td>
<td align="center">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>compatible nativamente</sub>
</td>
<td align="center">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>skills por symlink</sub>
</td>
<td align="center">
<a href="https://grok.x.ai"><img src="./assets/agents/grok.png" alt="Grok Build" width="48" height="48" /></a><br/>
<strong>Grok Build</strong><br/>
<sub>hooks nativos</sub>
</td>
<td align="center">
<a href="https://kiro.dev"><img src="./assets/agents/kiro.png" alt="Kiro CLI" width="48" height="48" /></a><br/>
<strong>Kiro CLI</strong><br/>
<sub>hooks nativos + agentes</sub>
</td>
</tr>
</table>

<p align="center"><sub><a href="./SUPPORTED_AGENTS.md">& más</a></sub></p>

## Tu Equipo de Agentes

| Agente | Qué Hace |
|-------|-------------|
| **oma-academic-writer** | Redacta, revisa y audita prosa académica hasta alcanzar calidad de publicación |
| **oma-architecture** | Evalúa trade-offs arquitectónicos y define límites de módulos con análisis ADR/ATAM/CBAM |
| **oma-backend** | Construye y protege tus APIs en Python, Node.js o Rust |
| **oma-brainstorm** | Explora ideas contigo antes de que te comprometas a construir |
| **oma-db** | Diseña tu esquema, migraciones, índices y almacenes vectoriales |
| **oma-debug** | Encuentra la causa raíz, corrige el bug y escribe un test de regresión |
| **oma-deepsec** | Escanea tu código en busca de vulnerabilidades y bloquea pull requests con riesgos |
| **oma-design** | Construye sistemas de diseño con tokens, accesibilidad y layouts responsive |
| **oma-dev-workflow** | Automatiza tu CI/CD, releases y tareas de monorepo |
| **oma-docs** | Detecta referencias rotas en tu documentación y señala los docs afectados por cambios en el código |
| **oma-explainer** | Convierte un diff, PR o rama en un explicador HTML interactivo autónomo con cuestionario |
| **oma-frontend** | Construye tu UI con React/Next.js, TypeScript, Tailwind CSS v4 y shadcn/ui |
| **oma-hwp** | Convierte archivos HWP, HWPX y HWPML a Markdown |
| **oma-image** | Genera imágenes a través de varios proveedores de IA a la vez |
| **oma-market** | Investiga tu mercado a partir de señales de comunidad y lo encuadra con SWOT, Porter's 5F y PESTEL |
| **oma-mobile** | Construye apps móviles multiplataforma con Flutter |
| **oma-observability** | Enruta el trabajo de observabilidad entre métricas, logs, trazas, SLOs y forense de incidentes |
| **oma-orchestrator** | Ejecuta múltiples agentes en paralelo desde el CLI |
| **oma-pdf** | Convierte archivos PDF a Markdown |
| **oma-pm** | Planifica tareas, desglosa requisitos y define contratos de API |
| **oma-qa** | Revisa tu código en busca de problemas de seguridad OWASP, rendimiento y accesibilidad |
| **oma-recap** | Convierte tu historial de conversaciones en resúmenes de trabajo organizados por tema |
| **oma-refactor** | Refactoriza el código sin cambiar su comportamiento usando hotspots, pruebas de caracterización y commits solo de refactor |
| **oma-scholar** | Busca literatura académica y te ayuda a llevar a cabo revisiones por pares |
| **oma-scm** | Gestiona tus ramas, fusiones, worktrees y Conventional Commits |
| **oma-search** | Dirige cada consulta a la mejor fuente y puntúa qué tan confiable es el resultado |
| **oma-slide** | Genera decks de presentaciones HTML distintivos y ricos en animaciones, y exporta a PDF/PNG/PPTX |
| **oma-tf-infra** | Aprovisiona infraestructura multi-cloud con Terraform |
| **oma-translator** | Traduce entre idiomas de forma que parezca escrito por un hablante nativo |
| **oma-video** | Genera videos cortos, explicativos y demos mediante un pipeline de Remotion que funciona sin claves |
| **oma-voice** | Genera voiceovers y transcribe audio en el dispositivo, sin necesidad de nube |

<details>
<summary>Herramientas internas y meta</summary>

| Agente | Qué Hace |
|-------|-------------|
| **oma-coordination** | Guía la coordinación manual paso a paso de los agentes PM, frontend, backend, móvil y QA |
| **oma-skill-creator** | Escribe y audita nuevos skills OMA en formato SSL-lite |

</details>

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
| 0 | `/deepinit` | Mapea tu base de código existente en AGENTS.md, ARCHITECTURE.md y docs |
| 1 | `/brainstorm` | Explora ideas contigo antes de que te comprometas a construir |
| 2 | `/architecture` | Sopesa los trade-offs de tu diseño y traza límites de módulo limpios |
| 2 | `/design` | Construye tu sistema de diseño con tokens, accesibilidad y layouts responsive |
| 2 | `/plan` | Desglosa tu feature en tareas priorizadas |
| 3 | `/work` | Construye tu feature paso a paso a través de varios agentes |
| 3 | `/orchestrate` | Ejecuta varios agentes en paralelo para construir tu feature más rápido |
| 3 | `/ultrawork` | Construye tu feature a través de cinco fases de calidad con gates; cada revisión se ejecuta en una sesión de revisor nueva y aislada (revisión de contexto cruzado / cross-context review) |
| 3 | `/ralph` | Repite `/ultrawork` hasta que un verificador independiente cumple todos los criterios |
| 4 | `/review` | Revisa tu código en busca de problemas de seguridad, rendimiento y accesibilidad |
| 4 | `/deepsec` | Ejecuta un escaneo de seguridad profundo y bloquea los pull requests arriesgados |
| 5 | `/debug` | Encuentra la causa raíz, corrige el bug y escribe una prueba de regresión |
| 5 | `/docs` | Revisa tus docs en busca de referencias rotas y parchea las que tocan tus cambios de código |
| 6 | `/scm` | Gestiona tus ramas, merges y Conventional Commits |
| - | `/schedule` | Programa un trabajo de agente para ejecutarse en un intervalo recurrente |

**Auto-detección**: Ni siquiera necesitas slash commands. Palabras clave como "arquitectura", "plan", "review" y "debug" en tu mensaje (¡en 11 idiomas!) activan automáticamente el flujo correcto. La precisión de la detección se mide, no se supone: `oma verify triggers` evalúa el detector contra un corpus etiquetado de 171 prompts (actualmente **0% de missed-fire**, menos del 10% de false-fire) y lo controla en CI.

### Modelos por agente

Configura `model_preset` en `.agents/oma-config.yaml` para elegir qué modelos de IA usa cada agente:

```yaml
language: en
model_preset: mixed   # antigravity | claude | codex | cursor | kiro | mixed | qwen

# Optional per-agent overrides
agents:
  backend: { model: openai/gpt-5.5, effort: high }
```

- `oma doctor --profile` — imprime la matriz de modelos resuelta por rol
- Guía completa: [`web/docs/guide/per-agent-models.md`](../web/docs/guide/per-agent-models.md)

## ¿Por Qué oh-my-agent?

- **Portable**: `.agents/` viaja con tu proyecto, no queda atrapado en un IDE. `oma emit` proyecta la misma SSOT en artefactos de estándar abierto: carpetas de skills conformes con [Agent Skills](https://agentskills.io/specification), un `.claude-plugin/marketplace.json` y `AGENTS.md`, de modo que los skills de oma funcionan en cualquier herramienta que lea la spec abierta, con una comprobación de drift en CI que mantiene honesta la salida generada
- **Basado en roles**: agentes modelados como un equipo de ingeniería real, no un montón de prompts
- **Eficiente en tokens**: diseño de skills en dos capas ahorra ~75% de tokens ([cómo funciona](../web/docs/guide/usage.md))
- **Calidad primero**: Charter preflight, quality gates y flujos de revisión integrados:
  - `oma verify <agent>` — una batería de chequeos deterministas por tipo de agente: un núcleo común (scope violation, charter alignment, secretos hardcoded, escaneo de TODOs, declared outputs) más chequeos específicos por tipo (TypeScript strict, tests, raw SQL, Flutter analyze, inline styles, …)
  - `session.quota_cap` — topes de tokens / spawn / por-vendor por sesión en `oma-config.yaml`; el Step 5 de `orchestrate` bloquea el siguiente spawn al excederse
  - workflow `ralph` — un JUDGE independiente re-verifica cada criterion en cada iteración para detectar regresiones silenciosas; cache para tests >30s
  - Exploration Loop — tras 2 reintentos, `orchestrate` lanza variantes de hipótesis en paralelo y conserva la de mayor puntaje
  - Auto-routing de monorepo — `detectWorkspace` lee pnpm / nx / turbo / lerna y enruta cada agente a su workspace
- **Multi-vendor**: mezcla Antigravity, Claude, Codex, Cursor, Kiro y Qwen por tipo de agente
- **Observable**: dashboards en terminal y web para monitoreo en tiempo real

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

- **[Documentación Detallada](./AGENTS_SPEC.md)**: spec técnico completo y arquitectura
- **[Agentes Soportados](./SUPPORTED_AGENTS.md)**: matriz de soporte de agentes por IDE
- **[Docs Web](https://first-fluke.github.io/oh-my-agent/)**: guías, tutoriales y referencia del CLI

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

- Li, X., Liu, Y., Chen, W., You, B., Di, Z., He, Y., Zheng, S., Choe, K. W., Sun, J., Wang, S., Tao, C., Li, B., Zhao, X., Geng, H., Wu, X., Zhou, J., Chen, X., Xing, H., Li, Y., … Song, D. (2026). *SkillsBench: Benchmarking how well agent skills work across diverse tasks* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2602.12670
- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508
- Yang, Y., Gong, Z., Huang, W., Yang, Q., Zhou, Z., Huang, Z., Li, Y., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, Y., Chen, D., Yang, X., & Luo, C. (2026). *SkillOpt: Executive strategy for self-evolving agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23904
- Huang, Z., Xu, J., Yang, Y., Gong, Z., Yang, Q., Tian, M., Wang, X., Lv, C., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, X., Chen, D., Zheng, X., & Luo, C. (2026). *From raw experience to skill consumption: A systematic study of model-generated agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23899
- Hong, D. B., Imani, A., & Ahmed, I. (2026). *From anatomy to smells: An empirical study of SKILL.md in agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2607.01456


## Licencia

MIT
