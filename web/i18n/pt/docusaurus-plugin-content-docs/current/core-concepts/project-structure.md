---
title: Estrutura do Projeto
description: "Árvore de diretórios completa de uma instalação oh-my-agent com cada arquivo e diretório explicado — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, skills symlinks, agents), .serena/memories/, e a estrutura do repositório fonte do oh-my-agent."
---

# Estrutura do Projeto

Após instalar o oh-my-agent, seu projeto ganha três árvores de diretórios: `.agents/` (a única fonte de verdade), `.claude/` (camada de integração com IDE) e `.serena/` (estado em tempo de execução). Esta página documenta cada arquivo e seu propósito.

---

## Árvore de Diretórios Completa

```
your-project/
├── .agents/                          ← Única Fonte de Verdade (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    ← Idioma, fuso horário, mapeamento CLI
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Recursos usados por TODOS os agentes
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── tailwind-rules.md
│   │   │       ├── component-template.tsx
│   │   │       ├── snippets.md
│   │   │       ├── error-playbook.md
│   │   │       ├── checklist.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── examples.md
│   │   │   │   ├── orm-reference.md
│   │   │   │   ├── checklist.md
│   │   │   │   └── error-playbook.md
│   │   │   └── stack/                 ← Gerado por /stack-set
│   │   │       ├── stack.yaml
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       └── api-template.*
│   │   │
│   │   └── ...                        ← Outros diretórios de skills
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             ← Persistente: execução paralela automatizada
│   │   ├── work.md             ← Persistente: coordenação passo a passo
│   │   ├── ultrawork.md              ← Persistente: workflow de qualidade em 5 fases
│   │   ├── plan.md                   ← Breakdown de tarefas PM
│   │   ├── exec-plan.md              ← Gerenciamento de plano de execução
│   │   ├── brainstorm.md             ← Ideação orientada por design
│   │   ├── deepinit.md               ← Inicialização de projeto
│   │   ├── review.md                 ← Pipeline de revisão QA
│   │   ├── debug.md                  ← Debugging estruturado
│   │   ├── design.md                 ← Workflow de design em 7 fases
│   │   ├── scm.md                 ← Commits convencionais
│   │   ├── tools.md                  ← Gerenciamento de ferramentas MCP
│   │   └── stack-set.md              ← Configuração de stack tecnológico
│   │
│   ├── agents/
│   │   ├── backend-engineer.md        ← Def. de subagente: backend
│   │   ├── frontend-engineer.md       ← Def. de subagente: frontend
│   │   ├── mobile-engineer.md         ← Def. de subagente: mobile
│   │   ├── db-engineer.md             ← Def. de subagente: database
│   │   ├── qa-reviewer.md             ← Def. de subagente: QA
│   │   ├── debug-investigator.md      ← Def. de subagente: debug
│   │   └── pm-planner.md             ← Def. de subagente: PM
│   │
│   ├── results/plan-{sessionId}.json                      ← Saída de plano gerado (populado por /plan)
│   ├── state/                         ← Arquivos de estado de workflow ativos
│   ├── results/                       ← Arquivos de resultado dos agentes
│   └── mcp.json                       ← Configuração do servidor MCP
│
├── .claude/                           ← Camada de Integração com IDE
│   ├── settings.json                  ← Registro de hooks e permissões
│   ├── hooks/
│   │   ├── triggers.json              ← Mapeamento palavra-chave para workflow (11 idiomas)
│   │   ├── keyword-detector.ts        ← Lógica de auto-detecção
│   │   ├── persistent-mode.ts         ← Aplicação de workflow persistente
│   │   └── hud.ts                     ← Indicador [OMA] na statusline
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Definições de subagentes para Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Estado em Tempo de Execução (Serena MCP)
    └── memories/
        ├── orchestrator-session.md    ← ID da sessão, status, rastreamento de fases
        ├── task-board.md              ← Atribuições de tarefas e status
        ├── progress-{agent}.md        ← Atualizações de progresso por agente
        ├── result-{agent}.md          ← Saídas finais por agente
        ├── session-metrics.md         ← Rastreamento de Dívida de Clarificação e Quality Score
        ├── experiment-ledger.md       ← Rastreamento de experimentos (condicional)
        └── archive/
            └── metrics-{date}.md      ← Métricas de sessão arquivadas
```

---

## .agents/ — A Fonte de Verdade

Este é o diretório central. Tudo que os agentes precisam reside aqui. É o único diretório que importa para o comportamento dos agentes — todos os outros diretórios são derivados dele.

### config/

**`oma-config.yaml`** — Arquivo de configuração central com:
- `language`: Código do idioma de resposta (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Formato de timestamp (padrão: `YYYY-MM-DD`)
- `timezone`: Identificador de fuso horário (padrão: `UTC`)
- `default_cli`: Vendor CLI de fallback (gemini, claude, codex, qwen)
- `agent_cli_mapping`: Sobrescritas de roteamento CLI por agente

### skills/

Onde a expertise dos agentes reside. 15 diretórios no total: 14 skills de agente + 1 diretório de recursos compartilhados.

**`_shared/`** — Recursos usados por todos os agentes:
- `core/` — Roteamento, carregamento de contexto, estrutura de prompt, protocolo de clarificação, orçamento de contexto, avaliação de dificuldade, templates de raciocínio, princípios de qualidade, detecção de vendor, métricas de sessão, checklist comum, lições aprendidas, templates de contrato de API
- `runtime/` — Protocolo de memória para subagentes CLI, protocolos de execução específicos de vendor (claude, gemini, codex, qwen)
- `conditional/` — Medição de quality score, rastreamento de experiment ledger, protocolo de exploration loop (carregados apenas quando acionados)

**`oma-{agent}/`** — Diretórios de skill por agente. Cada um contém:
- `SKILL.md` (~800 bytes) — Camada 1: sempre carregado. Identidade, roteamento, regras principais.
- `resources/` — Camada 2: sob demanda. Protocolos de execução, exemplos, checklists, playbooks de erros, stacks tecnológicos, snippets, templates.
- Alguns agentes têm subdiretórios adicionais: `stack/` (oma-backend), `reference/` (oma-design), `examples/` (oma-design), `scripts/` (oma-orchestrator), `config/` (oma-orchestrator, oma-scm).

### workflows/

14 arquivos Markdown definindo comportamento de comandos slash. Cada arquivo contém:
- Frontmatter YAML com `description`
- Seção de regras obrigatórias (idioma de resposta, ordenação de etapas, requisitos de ferramentas MCP)
- Instruções de detecção de vendor
- Protocolo de execução passo a passo
- Definições de portão (para workflows persistentes)

### agents/

7 arquivos de definição de subagentes usados ao spawnar agentes via Task tool (Claude Code) ou CLI. Cada arquivo define:
- Frontmatter: `name`, `description`, `skills` (qual skill carregar)
- Referência ao protocolo de execução
- Template CHARTER_CHECK
- Resumo de arquitetura
- Regras específicas de domínio (10 regras)
- Declaração: "Nunca modificar arquivos de `.agents/`"

### plan-\{sessionId\}.json

Gerado pelo workflow `/plan`. Contém o breakdown estruturado de tarefas com atribuições de agentes, prioridades, dependências e critérios de aceitação. Consumido por `/orchestrate`, `/work` e `/exec-plan`.

### state/

Arquivos de estado de workflow ativo para workflows persistentes. Esses arquivos JSON existem apenas enquanto um workflow persistente está executando. Deletá-los (ou dizer "workflow done") desativa o workflow.

### results/

Arquivos de resultado dos agentes. Criados por agentes completados com status (completed/failed), resumo, arquivos alterados e checklist de critérios de aceitação.

### mcp.json

Configuração do servidor MCP incluindo:
- Definições de servidor (Serena, etc.)
- Configuração de memória: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (nomes de ferramentas read/write/edit)
- Definições de grupo de ferramentas para gerenciamento `/tools`

---

## .claude/ — Integração com IDE

Este diretório conecta oh-my-agent ao Claude Code e outras IDEs.

### settings.json

Registra hooks e permissões para Claude Code. Contém referências aos scripts de hook e suas condições de acionamento (ex: `UserPromptSubmit`).

### hooks/

**`triggers.json`** — O mapeamento de palavras-chave para workflow. Define:
- `workflows`: Mapa de nome de workflow para `{ persistent: boolean, keywords: { language: [...] } }`
- `informationalPatterns`: Frases que indicam perguntas (filtradas da auto-detecção)
- `excludedWorkflows`: Workflows que requerem invocação explícita com `/command`
- `cjkScripts`: Códigos de idioma usando scripts CJK (ko, ja, zh)

**`keyword-detector.ts`** — Hook TypeScript que:
1. Escaneia entrada do usuário contra palavras-chave gatilho
2. Verifica padrões informativos
3. Injeta `[OMA WORKFLOW: ...]` ou `[OMA PERSISTENT MODE: ...]` no contexto

**`persistent-mode.ts`** — Verifica arquivos de estado ativos em `.agents/state/` e reforça execução de workflow persistente.

**`hud.ts`** — Renderiza o indicador `[OMA]` na barra de status mostrando: nome do modelo, uso de contexto (cor codificada: verde/amarelo/vermelho) e estado do workflow ativo.

### skills/

Symlinks apontando para `.agents/skills/`. Isso torna as skills visíveis para IDEs que leem de `.claude/skills/` mantendo `.agents/` como a única fonte de verdade.

### agents/

Definições de subagentes formatadas para a ferramenta Agent do Claude Code.

---

## .serena/memories/ — Estado em Tempo de Execução

Onde agentes escrevem seu progresso durante sessões de orquestração. Este diretório é observado pelos dashboards para atualizações em tempo real.

| Arquivo | Proprietário | Propósito |
|---------|-------------|---------|
| `orchestrator-session.md` | Orquestrador | Metadados de sessão: ID, status, hora de início, fase atual |
| `task-board.md` | Orquestrador | Atribuições de tarefas: agente, tarefa, prioridade, status, dependências |
| `progress-{agent}.md` | Aquele agente | Atualizações turno a turno: ações realizadas, arquivos lidos/modificados, status atual |
| `result-{agent}.md` | Aquele agente | Saída final: status de conclusão, resumo, arquivos alterados, critérios de aceitação |
| `session-metrics.md` | Orquestrador | Eventos de Dívida de Clarificação, progressão de Quality Score |
| `experiment-ledger.md` | Orquestrador/QA | Linhas de experimento quando Quality Score está ativo |
| `tool-overrides.md` | Workflow /tools | Restrições temporárias de ferramentas (escopo da sessão) |
| `archive/metrics-{date}.md` | Sistema | Métricas de sessão arquivadas (retenção de 30 dias) |

Caminhos de arquivos de memória e nomes de ferramentas são configuráveis em `.agents/mcp.json` via `memoryConfig`.

---

## Estrutura do Repositório Fonte do oh-my-agent

Se você está trabalhando no oh-my-agent em si (não apenas usando-o), o repositório é um monorepo:

```
oh-my-agent/
├── cli/                  ← Código fonte da CLI (TypeScript, built com bun)
│   ├── src/              ← Código fonte
│   ├── package.json
│   └── install.sh        ← Instalador bootstrap
├── web/                  ← Site de documentação (Next.js)
│   └── content/
│       └── en/           ← Páginas de documentação em inglês
├── action/               ← GitHub Action para atualizações automatizadas de skills
├── docs/                 ← READMEs traduzidos e especificações
├── .agents/              ← EDITÁVEL no repo fonte (este É o código fonte)
├── .claude/              ← Integração com IDE
├── .serena/              ← Estado de runtime de desenvolvimento
├── CLAUDE.md             ← Instruções do projeto para Claude Code
└── package.json          ← Config do workspace raiz
```

No repo fonte, modificações em `.agents/` são permitidas (esta é a exceção SSOT para o repo fonte em si). As regras de `.agents/` sobre não modificar este diretório aplicam-se a projetos consumidores, não ao repositório oh-my-agent.

Comandos de desenvolvimento:
- `bun run test` — Testes CLI (vitest)
- `bun run lint` — Lint
- `bun run build` — Build CLI
- Commits devem seguir formato de commit convencional (commitlint aplicado)
