---
title: Estrutura do Projeto
description: Árvore de diretórios atualizada após a separação dos workspaces CLI e web docs.
---

# Estrutura do Projeto

Árvore detalhada de diretórios para este repositório.

```text
.
├── .agents/
│   ├── config/
│   │   └── user-preferences.yaml   # Idioma, fuso horário, mapeamento CLI
│   ├── workflows/
│   │   ├── brainstorm.md           # /brainstorm (ideação design-first)
│   │   ├── coordinate.md           # /coordinate (orquestração multi-agente via UI)
│   │   ├── deepinit.md             # /deepinit (inicialização profunda do projeto)
│   │   ├── exec-plan.md            # /exec-plan (execução de plano)
│   │   ├── orchestrate.md          # /orchestrate (execução paralela CLI automatizada)
│   │   ├── plan.md                 # /plan (decomposição de tarefas PM)
│   │   ├── review.md               # /review (pipeline QA completo)
│   │   ├── debug.md                # /debug (correção estruturada de bugs)
│   │   ├── setup.md                # /setup (configuração CLI e MCP)
│   │   ├── tools.md                # /tools (gestão de ferramentas MCP)
│   │   └── ultrawork.md            # /ultrawork (execução máxima paralela)
│   └── skills/
│       ├── _shared/                    # Recursos comuns (não é uma habilidade)
│       │   ├── serena-memory-protocol.md
│       │   ├── common-checklist.md
│       │   ├── skill-routing.md
│       │   ├── context-loading.md
│       │   ├── context-budget.md
│       │   ├── reasoning-templates.md
│       │   ├── clarification-protocol.md
│       │   ├── difficulty-guide.md
│       │   ├── lessons-learned.md
│       │   ├── verify.sh
│       │   └── api-contracts/
│       ├── oma-backend/              # FastAPI
│       ├── oma-brainstorm/                 # Ideação design-first
│       ├── oma-commit/                     # Habilidade de commits convencionais
│       ├── oma-db/                   # Banco de dados e esquemas
│       ├── oma-debug/                # Correção de bugs
│       ├── oma-dev-workflow/               # CI/CD e fluxo de desenvolvimento
│       ├── oma-frontend/             # React/Next.js
│       ├── oma-mobile/               # Flutter
│       ├── oma-orchestrator/               # Criador de sub-agentes baseado em CLI
│       ├── oma-pm/                   # Gerente de produto
│       ├── oma-qa/                   # Segurança e QA
│       ├── oma-tf-infra/             # Infraestrutura como código Terraform
│       ├── oma-translator/                 # Tradução multilíngue
│       └── oma-coordination/             # Coordenação multi-agente
│       # Cada habilidade tem:
│       #   SKILL.md              (~40 linhas, otimizado para tokens)
│       #   resources/
│       #     ├── execution-protocol.md  (etapas chain-of-thought)
│       #     ├── examples.md            (entrada/saída few-shot)
│       #     ├── checklist.md           (auto-verificação)
│       #     ├── error-playbook.md      (recuperação de falhas)
│       #     ├── tech-stack.md          (especificações técnicas detalhadas)
│       #     └── snippets.md            (padrões de copiar-colar)
├── .serena/
│   └── memories/                   # Estado de runtime (ignorado pelo git)
├── package.json
├── docs/
│   ├── USAGE.md                    # Guia detalhado de uso (Inglês)
│   ├── USAGE.ko.md                 # Guia detalhado de uso (Coreano)
│   ├── project-structure.md        # Referência completa da estrutura (Inglês)
│   └── project-structure.ko.md     # Referência completa da estrutura (Coreano)
├── README.md                       # Este arquivo (Inglês)
└── README.ko.md                    # Guia em coreano
```
