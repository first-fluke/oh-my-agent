# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md)

Ja quis que seu assistente de IA tivesse colegas de trabalho? E isso que o oh-my-agent faz.

Em vez de uma unica IA fazendo tudo (e se perdendo no meio do caminho), o oh-my-agent divide o trabalho entre **agentes especializados** — frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design e mais. Cada um conhece bem o seu dominio, tem suas proprias ferramentas e checklists, e nao sai da sua area.

Funciona com todas as principais IDEs de IA: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode e mais.

## Inicio Rapido

```bash
# Uma linha so (instala bun & uv automaticamente se nao tiver)
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# Ou manualmente
bunx oh-my-agent@latest
```

Escolha um preset e pronto:

| Preset | O Que Voce Ganha |
|--------|-------------|
| ✨ All | Todos os agentes e skills |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + commit |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + commit |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + commit |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + commit |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + commit |

## Seu Time de Agentes

| Agente | O Que Faz |
|-------|-------------|
| **oma-architecture** | Trade-offs de arquitetura, limites, analise com foco em ADR/ATAM/CBAM |
| **oma-backend** | APIs em Python, Node.js ou Rust |
| **oma-brainstorm** | Explora ideias antes de voce comecar a construir |
| **oma-db** | Design de schema, migrations, indexacao, vector DB |
| **oma-debug** | Analise de causa raiz, correcoes, testes de regressao |
| **oma-design** | Design systems, tokens, acessibilidade, responsividade |
| **oma-dev-workflow** | CI/CD, releases, automacao de monorepo |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-mobile** | Apps cross-platform com Flutter |
| **oma-orchestrator** | Execucao paralela de agentes via CLI |
| **oma-pdf** | Conversão de PDF para Markdown |
| **oma-pm** | Planeja tarefas, detalha requisitos, define contratos de API |
| **oma-qa** | Seguranca OWASP, performance, revisao de acessibilidade |
| **oma-scm** | Commits convencionais limpos |
| **oma-tf-infra** | IaC multi-cloud com Terraform |
| **oma-translator** | Traducao multilingual natural |

## Como Funciona

So conversar. Descreva o que voce quer e o oh-my-agent descobre quais agentes usar.

```
Voce: "Cria um app de TODO com autenticacao de usuario"
→ PM planeja o trabalho
→ Backend constroi a API de auth
→ Frontend constroi a UI em React
→ DB desenha o schema
→ QA revisa tudo
→ Pronto: codigo coordenado e revisado
```

Ou use slash commands para workflows estruturados:

| Comando | O Que Faz |
|---------|-------------|
| `/plan` | PM detalha sua feature em tarefas |
| `/work` | Execucao multi-agente passo a passo |
| `/orchestrate` | Spawn automatico e paralelo de agentes |
| `/ultrawork` | Workflow de qualidade em 5 fases com 11 gates de revisao |
| `/review` | Auditoria de seguranca + performance + acessibilidade |
| `/debug` | Debugging estruturado de causa raiz |
| `/design` | Workflow de design system em 7 fases |
| `/brainstorm` | Ideacao livre |
| `/scm` | Commit convencional com analise de type/scope |

**Auto-deteccao**: Voce nem precisa dos slash commands — palavras como "plan", "review", "debug" na sua mensagem (em 11 idiomas!) ativam automaticamente o workflow certo.

## CLI

```bash
# Instalar globalmente
bun install --global oh-my-agent   # ou: brew install oh-my-agent

# Usar em qualquer lugar
oma doctor                  # Health check
oma dashboard               # Monitoramento em tempo real
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

## Por Que oh-my-agent?

> [Saiba mais →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Portavel** — `.agents/` viaja com seu projeto, sem ficar preso a uma IDE
- **Baseado em papeis** — Agentes modelados como um time de engenharia real, nao um amontoado de prompts
- **Eficiente em tokens** — Design de skills em duas camadas economiza ~75% de tokens
- **Qualidade primeiro** — Charter preflight, quality gates e workflows de revisao integrados
- **Multi-vendor** — Misture Gemini, Claude, Codex e Qwen por tipo de agente
- **Observavel** — Dashboards no terminal e na web para monitoramento em tempo real

## Arquitetura

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

## Saiba Mais

- **[Documentacao Detalhada](./AGENTS_SPEC.md)** — Spec tecnica completa e arquitetura
- **[Agentes Suportados](./SUPPORTED_AGENTS.md)** — Matriz de suporte de agentes por IDE
- **[Docs Web](https://first-fluke.github.io/oh-my-agent/)** — Guias, tutoriais e referencia da CLI

## Sponsors

Este projeto e mantido gracas aos nossos generosos sponsors.

> **Curtiu o projeto?** Da uma estrela!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Experimente nosso template starter otimizado: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

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

[Torne-se um sponsor →](https://github.com/sponsors/first-fluke)

Veja [SPONSORS.md](../SPONSORS.md) para a lista completa de apoiadores.


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Licenca

MIT
