# oh-my-agent: Arnês Multi-Agente Portátil

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

O arnês de agente portátil e baseado em funções para engenharia séria assistida por IA.

Orquestre 10 agentes de domínio especializados (PM, Frontend, Backend, DB, Mobile, QA, Debug, Brainstorm, DevWorkflow, Terraform) via **Serena Memory**. O `oh-my-agent` usa `.agents/` como a fonte de verdade para habilidades e fluxos de trabalho portáteis e é compatível com outras IDEs e CLIs de IA. Ele combina agentes baseados em funções, fluxos de trabalho explícitos, observabilidade em tempo real e orientação com reconhecimento de padrões para equipes que desejam menos confusão de IA e uma execução mais disciplinada.

> **Gostou deste projeto?** Dê uma estrela!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Experimente nosso template inicial otimizado: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

## Índice

- [Arquitetura](#arquitetura)
- [Por que diferente](#por-que-diferente)
- [Compatibilidade](#compatibilidade)
- [Especificação `.agents`](#especificação-agents)
- [O Que É Isso?](#o-que-é-isso)
- [Início Rápido](#início-rápido)
- [Patrocinadores](#patrocinadores)
- [Licença](#licença)

## Por que diferente

- **`.agents/` é a fonte da verdade**: skills, workflows, recursos compartilhados e configuração vivem em uma estrutura de projeto portátil em vez de ficar presos dentro de um plugin IDE.
- **Equipes de agentes baseadas em funções**: agentes PM, QA, DB, Infra, Frontend, Backend, Mobile, Debug e Workflow são modelados como uma organização de engenharia, não apenas uma pilha de prompts.
- **Orquestração workflow-first**: planejamento, revisão, depuração e execução coordenada são workflows de primeira classe, não reflexões tardias.
- **Design consciente de padrões**: agentes agora carregam orientação focada para planejamento ISO, QA, continuidade/segurança de banco de dados e governança de infraestrutura.
- **Construído para verificação**: dashboards, geração de manifestos, protocolos de execução compartilhados e saídas estruturadas favorecem rastreabilidade sobre geração apenas por vibe.

## Compatibilidade

`oh-my-agent` é projetado em torno de `.agents/` e depois faz ponte para outras pastas de skills específicas de ferramentas quando necessário.

| Ferramenta / IDE | Fonte de Skills | Modo de Interoperabilidade | Notas |
|------------|---------------|--------------|-------|
| Antigravity | `.agents/skills/` | Nativo | Layout principal fonte-da-verdade |
| Claude Code | `.claude/skills/` + `.claude/agents/` | Nativo + Adaptador | Skills de domínio via symlink, workflow skills, subagentes e CLAUDE.md nativos |
| OpenCode | `.agents/skills/` | Nativo-compatível | Usa a mesma fonte de skills de nível de projeto |
| Amp | `.agents/skills/` | Nativo-compatível | Compartilha a mesma fonte de nível de projeto |
| Codex CLI | `.agents/skills/` | Nativo-compatível | Funciona da mesma fonte de skills de projeto |
| Cursor | `.agents/skills/` | Nativo-compatível | Pode consumir a mesma fonte de skills de nível de projeto |
| GitHub Copilot | `.github/skills/` | Symlink opcional | Instalado quando selecionado durante o setup |

Veja [SUPPORTED_AGENTS.md](./SUPPORTED_AGENTS.md) para a matriz de suporte atual e notas de interoperabilidade.

### Integração Nativa com Claude Code

O Claude Code tem integração nativa de primeira classe, além dos symlinks:

- **`CLAUDE.md`** — identidade do projeto, arquitetura e regras (carregado automaticamente pelo Claude Code)
- **`.claude/skills/`** — 12 workflow skills mapeadas a partir de `.agents/workflows/` (ex.: `/orchestrate`, `/coordinate`, `/ultrawork`)
- **`.claude/agents/`** — 7 definições de subagentes invocados via Task tool (backend-engineer, frontend-engineer, mobile-engineer, db-engineer, qa-reviewer, debug-investigator, pm-planner)
- **Padrões de loop nativos** — Review Loop, Issue Remediation Loop e Phase Gate Loop usando resultados síncronos do Task tool, sem necessidade de polling via CLI

As skills de domínio (oma-backend, oma-frontend, etc.) permanecem como symlinks de `.agents/skills/`. As workflow skills são arquivos SKILL.md nativos que referenciam o `.agents/workflows/*.md` correspondente como fonte de verdade.

## Especificação `.agents`

`oh-my-agent` trata `.agents/` como uma convenção de projeto portátil para skills, workflows e contexto compartilhado de agentes.

- Skills vivem em `.agents/skills/<skill-name>/SKILL.md`
- Recursos compartilhados vivem em `.agents/skills/_shared/`
- Workflows vivem em `.agents/workflows/*.md`
- Configuração do projeto vive em `.agents/config/`
- Metadados CLI e empacotamento permanecem alinhados através de manifestos gerados

Veja [AGENTS_SPEC.md](./AGENTS_SPEC.md) para o layout do projeto, arquivos necessários, regras de interoperabilidade e modelo fonte-da-verdade.

## Arquitetura

```mermaid
flowchart TD
    subgraph Workflows["Fluxos de Trabalho"]
        direction TB
        W0["/brainstorm"]
        W1["/coordinate"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
        W6["/deepinit"]
    end

    subgraph Orchestration["Orquestração"]
        direction TB
        PM[oma-pm]
        ORC[orchestrator]
    end

    subgraph Domain["Agentes de Domínio"]
        direction TB
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        TF[oma-tf-infra]
    end

    subgraph Quality["Qualidade"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end


    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> CMT([commit])
```

## O Que É Isso?

Uma coleção de **Habilidades Agent** que permite o desenvolvimento colaborativo multi-agente. O trabalho é distribuído entre agentes especialistas:

| Agente | Especialização | Gatilhos |
|-------|---------------|----------|
| **Brainstorm** | Ideação com design-first antes do planejamento | "brainstorm", "ideate", "explore idea" |
| **PM Agent** | Análise de requisitos, decomposição de tarefas, arquitetura | "planejar", "dividir", "o que devemos construir" |
| **Frontend Agent** | React/Next.js, TypeScript, Tailwind CSS | "UI", "componente", "estilo" |
| **Backend Agent** | FastAPI, PostgreSQL, autenticação JWT | "API", "banco de dados", "autenticação" |
| **DB Agent** | Modelagem SQL/NoSQL, normalização, integridade, backup, capacidade | "ERD", "schema", "database design", "index tuning" |
| **Mobile Agent** | Desenvolvimento Flutter multiplataforma | "app mobile", "iOS/Android" |
| **QA Agent** | Segurança OWASP Top 10, performance, acessibilidade | "revisar segurança", "auditoria", "verificar performance" |
| **Debug Agent** | Diagnóstico de bugs, análise de causa raiz, testes de regressão | "bug", "erro", "crash" |
| **Developer Workflow** | Automação de tarefas monorepo, tarefas mise, CI/CD, migrações, release | "workflow dev", "tarefas mise", "pipeline CI/CD" |
| **TF Infra Agent** | Provisionamento IaC multi-nuvem (AWS, GCP, Azure, OCI) | "infraestrutura", "terraform", "config cloud" |
| **Orchestrator** | Execução paralela de agentes via CLI com Serena Memory | "executar agente", "execução paralela" |
| **Commit** | Commits Convencionais com regras específicas do projeto | "commit", "salvar mudanças" |

## Início Rápido

### Pré-requisitos

- **AI IDE** (Antigravity, Claude Code, Codex, Gemini, etc.)

### Opção 1: Instalação em Uma Linha (Recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Detecta e instala automaticamente dependências ausentes (bun, uv) e inicia a configuração interativa.

### Opção 2: Instalação Manual

```bash
# Instale o bun se você não tiver:
# curl -fsSL https://bun.sh/install | bash

# Instale o uv se você não tiver:
# curl -LsSf https://astral.sh/uv/install.sh | sh

bunx oh-my-agent
```

Selecione seu tipo de projeto e as habilidades serão instaladas em `.agents/skills/`.

| Preset | Habilidades |
|--------|--------|
| ✨ All | Tudo |
| 🌐 Fullstack | brainstorm, frontend, backend, db, pm, qa, debug, commit |
| 🎨 Frontend | brainstorm, frontend, pm, qa, debug, commit |
| ⚙️ Backend | brainstorm, backend, db, pm, qa, debug, commit |
| 📱 Mobile | brainstorm, mobile, pm, qa, debug, commit |
| 🚀 DevOps | brainstorm, tf-infra, oma-dev-workflow, pm, qa, debug, commit |

### Opção 3: Instalação Global (Para o Orchestrator)

Para usar as ferramentas principais globalmente ou executar o SubAgent Orchestrator:

```bash
bun install --global oh-my-agent
```

Você também precisará de pelo menos uma ferramenta CLI:

| CLI | Instalação | Autenticação |
|-----|---------|------|
| Gemini | `bun install --global @google/gemini-cli` | `gemini auth` |
| Claude | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth` |
| Codex | `bun install --global @openai/codex` | `codex auth` |
| Qwen | `bun install --global @qwen-code/qwen` | `qwen auth` |

### Opção 4: Integrar em Projeto Existente

**Recomendado (CLI):**

Execute o seguinte comando na raiz do seu projeto para instalar/atualizar automaticamente habilidades e fluxos de trabalho:

```bash
bunx oh-my-agent
```

> **Dica:** Execute `bunx oh-my-agent doctor` após a instalação para verificar se tudo está configurado corretamente (incluindo fluxos de trabalho globais).

### 2. Chat

**Tarefa simples** (agente único ativa automaticamente):

```
"Criar um formulário de login com Tailwind CSS e validação de formulário"
→ oma-frontend ativa
```

**Projeto complexo** (/coordinate workflow):

```
"Construir um app TODO com autenticação de usuário"
→ /coordinate → PM Agent planeja → agentes criados no Agent Manager
```

**Implantação máxima** (/ultrawork workflow):

```
"Refatorar módulo de auth, adicionar testes de API e atualizar docs"
→ /ultrawork → Tarefas independentes executam em paralelo entre agentes
```

**Fazer commit de mudanças** (commits convencionais):

```
/commit
→ Analisar mudanças, sugerir tipo/escopo do commit, criar commit com Co-Author
```

### 3. Monitorar com Dashboards

Para detalhes de configuração e uso do dashboard, veja [`docs/USAGE.pt.md`](./docs/USAGE.pt.md#dashboards-em-tempo-real).

## Patrocinadores

Este projeto é mantido graças aos nossos generosos patrocinadores.

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Logos do tier Champion ($100/mês) aqui -->

### 🛸 Booster

<!-- Logos do tier Booster ($30/mês) aqui -->

### ☕ Contributor

<!-- Nomes do tier Contributor ($10/mês) aqui -->

[Torne-se um patrocinador →](https://github.com/sponsors/first-fluke)

Veja [SPONSORS.md](./SPONSORS.md) para uma lista completa de apoiadores.

## Histórico de Estrelas

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## Licença

MIT
