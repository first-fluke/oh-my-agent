---
title: Estrutura do Projeto
description: "Árvore de diretórios completa de uma instalação oh-my-agent com cada arquivo e diretório explicado — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, skills symlinks, agents), .serena/memories/, e a estrutura do repositório fonte do oh-my-agent."
---

# Estrutura do Projeto

Após instalar o oh-my-agent, seu projeto ganha três árvores de diretórios: `.agents/` (a única fonte de verdade), `.claude/` (camada de integração com IDE) e `.serena/` (estado em tempo de execução). Esta página documenta cada arquivo e seu propósito.

---

## Árvore de diretórios completa

```
your-project/
├── .agents/                          ← Única Fonte de Verdade (SSOT)
│   ├── oma-config.yaml           ← Idioma, model_preset, overrides de agente
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
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── tech-stack.md
│   │   │       ├── snippets.md
│   │   │       ├── screen-template.dart
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translator/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       └── anti-ai-patterns.md
│   │   │
│   │   ├── oma-orchestrator/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/
│   │   ├── orchestrate.md             ← Persistente: execução paralela automatizada
│   │   ├── work.md             ← Persistente: coordenação passo a passo
│   │   ├── ultrawork.md              ← Persistente: workflow de qualidade em 5 fases
│   │   ├── plan.md                   ← Breakdown de tarefas PM + artefatos de tracker de plano
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
│   │   ├── orchestrate-state.json     ← (existe apenas quando o workflow está ativo)
│   │   ├── ultrawork-state.json
│   │   └── work-state.json
│   ├── results/                       ← Arquivos de resultado dos agentes
│   │   └── result-{agent}.md          ← (criado por agentes finalizados)
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
        ├── session-work.md      ← Estado de sessão do workflow Work
        ├── session-ultrawork.md       ← Estado de sessão do workflow Ultrawork
        ├── tool-overrides.md          ← Restrições temporárias de ferramentas (/tools --temp)
        └── archive/
            └── metrics-{date}.md      ← Métricas de sessão arquivadas
```

---

## .agents/ — a fonte de verdade

Este é o diretório central. Tudo que os agentes precisam reside aqui. É o único diretório que importa para o comportamento dos agentes — todos os outros diretórios são derivados dele.

### config/

**`oma-config.yaml`** — Arquivo de configuração central com:
- `language`: Código do idioma de resposta (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Formato de timestamp (padrão: `YYYY-MM-DD`)
- `timezone`: Identificador de fuso horário (padrão: `UTC`)
- `model_preset`: Chave do model preset ativo (built-in ou customizado)
- `agents`: Overrides opcionais por agente (`AgentSpec` apenas como objeto)
- `models`: Slugs de modelo opcionais definidos pelo usuário
- `custom_presets`: Presets opcionais definidos pelo usuário com `extends:` opcional

### skills/

Onde a expertise dos agentes reside. 22 diretórios no total: 21 skills de agente + 1 diretório de recursos compartilhados.

**`_shared/`** — Recursos usados por todos os agentes:
- `core/` — Roteamento, carregamento de contexto, estrutura de prompt, protocolo de clarificação, orçamento de contexto, avaliação de dificuldade, templates de raciocínio, princípios de qualidade, detecção de vendor, métricas de sessão, checklist comum, lições aprendidas, templates de contrato de API
- `runtime/` — Protocolo de memória para subagentes CLI, protocolos de execução específicos de vendor (claude, codex, qwen)
- `conditional/` — Medição de quality score, rastreamento de experiment ledger, protocolo de exploration loop (carregados apenas quando acionados)

**`oma-{agent}/`** — Diretórios de skill por agente. Cada um contém:
- `SKILL.md` (~800 bytes) — Camada 1: sempre carregado. Identidade, roteamento, regras principais.
- `resources/` — Camada 2: sob demanda. Protocolos de execução, exemplos, checklists, playbooks de erros, stacks tecnológicos, snippets, templates.
- Alguns agentes têm subdiretórios adicionais: `stack/` (oma-backend, gerado por /stack-set), `reference/` (oma-design), `scripts/` (oma-orchestrator), `config/` (oma-orchestrator, oma-scm).

### workflows/

16 arquivos Markdown definindo comportamento de comandos slash. Cada arquivo contém:
- Frontmatter YAML com `description`
- Seção de regras obrigatórias (idioma de resposta, ordenação de etapas, requisitos de ferramentas MCP)
- Instruções de detecção de vendor
- Protocolo de execução passo a passo
- Definições de portão (para workflows persistentes)

Workflows persistentes: `orchestrate.md`, `work.md`, `ultrawork.md`.
Não persistentes: `plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

7 arquivos de definição de subagentes usados ao spawnar agentes via Task tool (Claude Code) ou CLI. Cada arquivo define:
- Frontmatter: `name`, `description`, `skills` (qual skill carregar)
- Referência ao protocolo de execução
- Template de charter preflight (CHARTER_CHECK)
- Resumo de arquitetura
- Regras específicas de domínio (10 regras)
- Declaração: "Nunca modificar arquivos de `.agents/`"

### plan-\{sessionId\}.json

Gerado pelo workflow `/plan`. Contém o breakdown estruturado de tarefas com atribuições de agentes, prioridades, dependências e critérios de aceitação. Consumido por `/orchestrate` e `/work`. O tracker legível por humanos correspondente fica em `docs/plans/work/{NNN}-{name}.md` (ciclo de vida via o campo `Status`). Referências de design permanentes ficam ao lado em `docs/plans/designs/{NNN}-{name}.md`.

### state/

Arquivos de estado de workflow ativo para workflows persistentes. Esses arquivos JSON existem apenas enquanto um workflow persistente está executando. Deletá-los (ou dizer "workflow done") desativa o workflow.

### results/

Arquivos de resultado dos agentes. Criados por agentes completados com status (completed/failed), resumo, arquivos alterados e checklist de critérios de aceitação. Lidos pelo orquestrador durante a coleta e pelos dashboards para monitoramento.

### mcp.json

Configuração do servidor MCP incluindo:
- Definições de servidor (Serena, etc.)
- Configuração de memória: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (nomes de ferramentas read/write/edit)
- Definições de grupo de ferramentas para gerenciamento `/tools`

---

## .claude/ — integração com IDE

Este diretório conecta oh-my-agent ao Claude Code e outras IDEs.

### settings.json

Registra hooks e permissões para Claude Code. Contém referências aos scripts de hook e suas condições de acionamento (ex: `UserPromptSubmit`).

### hooks/

**`triggers.json`** — O mapeamento de palavras-chave para workflow. Define:
- `workflows`: Mapa de nome de workflow para `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }`. `keywords` são frases literais; `patterns` são strings regex brutas (compiladas com flags `iu`).
- `informationalPatterns`: Frases que indicam perguntas (filtradas da auto-detecção)
- `excludedWorkflows`: Workflows que requerem invocação explícita com `/command`
- `cjkScripts`: Códigos de idioma usando scripts CJK (ko, ja, zh)

As seções de idioma em `keywords`, `patterns` e `informationalPatterns` seguem esta convenção:
- `*` — Universal/Inglês. Sempre carregado independentemente da configuração `language` em `.agents/oma-config.yaml`.
- `en` — Carregado por compatibilidade retroativa. Funcionalmente equivalente a `*`. Novo conteúdo em inglês deve ir em `*`.
- `ko`/`ja`/`zh`/etc. — Específicos por idioma. Carregados apenas quando `language: <code>` estiver definido em `.agents/oma-config.yaml`.

**`keyword-detector.ts`** — Hook TypeScript que:
1. Sanitiza a entrada (remove blocos de código, strings entre aspas, blocos de eco do sistema colados)
2. Escaneia a entrada limpa contra `keywords` gatilho (literais) e `patterns` (regex)
3. Verifica padrões informativos em uma janela de 60 caracteres ao redor de cada correspondência
4. Aplica guarda de reforço (suprime se o mesmo workflow foi acionado 2+ vezes em 60s)
5. Injeta `[OMA WORKFLOW: ...]` ou `[OMA PERSISTENT MODE: ...]` no contexto

**`persistent-mode.ts`** — Verifica arquivos de estado ativos em `.agents/state/` e reforça execução de workflow persistente.

**`hud.ts`** — Renderiza o indicador `[OMA]` na barra de status mostrando: nome do modelo, uso de contexto (cor codificada: verde/amarelo/vermelho) e estado do workflow ativo.

### skills/

Symlinks apontando para `.agents/skills/`. Isso torna as skills visíveis para IDEs que leem de `.claude/skills/` mantendo `.agents/` como a única fonte de verdade.

### agents/

Definições de subagentes formatadas para a ferramenta Agent do Claude Code. Estas referenciam os arquivos de skill e incluem o template CHARTER_CHECK.

---

## .serena/memories/ — estado em tempo de execução

Onde agentes escrevem seu progresso durante sessões de orquestração. Este diretório é observado pelos dashboards para atualizações em tempo real.

| Arquivo | Proprietário | Propósito |
|---------|-------------|---------|
| `orchestrator-session.md` | Orquestrador | Metadados de sessão: ID, status, hora de início, fase atual |
| `task-board.md` | Orquestrador | Atribuições de tarefas: agente, tarefa, prioridade, status, dependências |
| `progress-{agent}.md` | Aquele agente | Atualizações turno a turno: ações realizadas, arquivos lidos/modificados, status atual |
| `result-{agent}.md` | Aquele agente | Saída final: status de conclusão, resumo, arquivos alterados, critérios de aceitação |
| `session-metrics.md` | Orquestrador | Eventos de Dívida de Clarificação, progressão de Quality Score |
| `experiment-ledger.md` | Orquestrador/QA | Linhas de experimento quando Quality Score está ativo |
| `session-work.md` | Workflow Work | Estado de sessão específico do Work |
| `session-ultrawork.md` | Workflow Ultrawork | Rastreamento de fases específico do Ultrawork |
| `tool-overrides.md` | Workflow /tools | Restrições temporárias de ferramentas (escopo da sessão) |
| `archive/metrics-{date}.md` | Sistema | Métricas de sessão arquivadas (retenção de 30 dias) |

Caminhos de arquivos de memória e nomes de ferramentas são configuráveis em `.agents/mcp.json` via `memoryConfig`.

---

## Estrutura do repositório fonte do oh-my-agent

Se você está trabalhando no oh-my-agent em si (não apenas usando-o), o repositório é um monorepo:

```
oh-my-agent/
├── cli/                  ← Código fonte da CLI (TypeScript, built com bun)
│   ├── src/              ← Código fonte
│   ├── package.json
│   └── install.sh        ← Instalador bootstrap
├── web/                  ← Site de documentação (Docusaurus)
│   ├── docs/             ← Páginas de documentação em inglês (locale base)
│   └── i18n/             ← Páginas de documentação traduzidas
├── action/               ← GitHub Action para atualizações automatizadas de skills
├── docs/                 ← READMEs traduzidos e especificações
├── .agents/              ← EDITÁVEL no repo fonte (este É o código fonte)
├── .claude/              ← Integração com IDE
├── .serena/              ← Estado de runtime de desenvolvimento
├── CLAUDE.md             ← Instruções do projeto para Claude Code
└── package.json          ← Config do workspace raiz
```

No repo fonte, modificações em `.agents/` são permitidas (esta é a exceção SSOT para o repo fonte em si). As regras de `.agents/` sobre não modificar este diretório aplicam-se a projetos consumidores, não ao repositório oh-my-agent.

Comandos de desenvolvimento (executados a partir da raiz do repositório):
- `bun run test` — Testes CLI (vitest)
- `bun run lint` — Lint dos workspaces CLI e web
- `bun run build` — Build CLI
- `bun run typecheck` — Type-check de CLI e web
- Commits devem seguir formato de commit convencional (commitlint aplicado)
