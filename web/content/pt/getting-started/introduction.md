---
title: Introdução
description: "Uma visão abrangente do oh-my-agent — o framework de orquestração multi-agente que transforma assistentes de programação com IA em equipes de engenharia especializadas, com 14 agentes de domínio, carregamento progressivo de habilidades e portabilidade entre IDEs."
---

# Introdução

oh-my-agent é um framework de orquestração multi-agente para IDEs e ferramentas de linha de comando com IA. Em vez de depender de um único assistente de IA para tudo, oh-my-agent distribui o trabalho entre 14 agentes especializados — cada um modelado a partir de um papel real de equipe de engenharia, com seu próprio conhecimento de stack tecnológico, protocolos de execução, playbooks de erros e checklists de qualidade.

Todo o sistema reside em um diretório portátil `.agents/` dentro do seu projeto. Alterne entre Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor ou qualquer outra ferramenta suportada — sua configuração de agentes acompanha seu código.

---

## O Paradigma Multi-Agente

Assistentes tradicionais de programação com IA operam como generalistas. Eles lidam com frontend, backend, banco de dados, segurança e infraestrutura com o mesmo contexto de prompt e o mesmo nível de expertise. Isso leva a:

- **Diluição de contexto** — carregar conhecimento de todos os domínios desperdiça a janela de contexto
- **Qualidade inconsistente** — um generalista não consegue igualar um especialista em nenhum domínio específico
- **Sem coordenação** — funcionalidades complexas que abrangem múltiplos domínios são tratadas sequencialmente

oh-my-agent resolve isso com especialização:

1. **Cada agente conhece profundamente um domínio.** O agente frontend conhece React/Next.js, shadcn/ui, TailwindCSS v4, arquitetura FSD-lite. O agente backend conhece o padrão Repository-Service-Router, consultas parametrizadas, autenticação JWT. Eles não se sobrepõem.

2. **Agentes executam em paralelo.** Enquanto o agente backend constrói sua API, o agente frontend já está criando a interface. O orquestrador coordena via memória compartilhada.

3. **Qualidade é incorporada ao processo.** Cada agente possui um checklist específico de domínio e um playbook de erros. O preflight de charter detecta desvios de escopo antes que o código seja escrito. A revisão de QA é uma etapa de primeira classe, não uma reflexão tardia.

---

## Todos os 14 Agentes

### Ideação e Planejamento

| Agente | Função | Capacidades Principais |
|--------|--------|----------------------|
| **oma-brainstorm** | Ideação orientada por design | Explora a intenção do usuário, propõe 2-3 abordagens com análise de tradeoffs, produz documentos de design antes de qualquer código ser escrito. Fluxo de 6 fases: Contexto, Perguntas, Abordagens, Design, Documentação, Transição para `/plan`. |
| **oma-pm** | Gerente de produto | Decomposição de requisitos em tarefas priorizadas com dependências. Define contratos de API. Gera `.agents/plan.json` e `task-board.md`. Suporta conceitos ISO 21500, framework de risco ISO 31000, governança ISO 38500. |

### Implementação

| Agente | Função | Stack Tecnológico e Recursos |
|--------|--------|-------------------------------|
| **oma-frontend** | Especialista em UI/UX | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, arquitetura FSD-lite. Bibliotecas: luxon (datas), ahooks (hooks), es-toolkit (utils), Jotai (estado cliente), TanStack Query (estado servidor), @tanstack/react-form + Zod (formulários), better-auth (auth), nuqs (estado URL). Recursos: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | Especialista em API e servidor | Arquitetura limpa (Router-Service-Repository-Models). Agnóstico de stack — detecta Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET a partir dos manifestos do projeto. JWT + bcrypt para auth. Recursos: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Suporta `/stack-set` para geração de referências específicas de linguagem em `stack/`. |
| **oma-mobile** | Multiplataforma mobile | Flutter, Dart, Riverpod/Bloc para gerenciamento de estado, Dio com interceptors para chamadas de API, GoRouter para navegação. Arquitetura limpa: domain-data-presentation. Material Design 3 (Android) + iOS HIG. Meta de 60fps. Recursos: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Arquitetura de banco de dados | Modelagem SQL, NoSQL e banco de dados vetorial. Design de schema (3NF padrão), normalização, indexação, transações, planejamento de capacidade, estratégia de backup. Suporta design com consciência ISO 27001/27002/22301. Recursos: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agente | Função | Capacidades Principais |
|--------|--------|----------------------|
| **oma-design** | Especialista em sistema de design | Cria DESIGN.md com tokens, tipografia, sistemas de cor, design de movimento (motion/react, GSAP, Three.js), layouts responsivos, conformidade WCAG 2.2. Fluxo de 7 fases: Setup, Extração, Aprimoramento, Proposta, Geração, Auditoria, Entrega. Aplica anti-padrões (sem "AI slop"). Integração opcional com Stitch MCP. Recursos: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, mais diretório `reference/` com guias de tipografia, cor, espaçamento, movimento, responsividade, componentes, acessibilidade e shaders. |

### Infraestrutura e DevOps

| Agente | Função | Capacidades Principais |
|--------|--------|----------------------|
| **oma-tf-infra** | Infraestrutura como código | Terraform multi-cloud (AWS, GCP, Azure, Oracle Cloud). Auth OIDC-first, IAM de menor privilégio, política como código (OPA/Sentinel), otimização de custos. Suporta controles de IA ISO/IEC 42001, continuidade ISO 22301, documentação de arquitetura ISO/IEC/IEEE 42010. Recursos: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Automação de tarefas monorepo | mise task runner, pipelines CI/CD, migrações de banco de dados, coordenação de releases, git hooks, validação pre-commit. Recursos: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### Qualidade e Depuração

| Agente | Função | Capacidades Principais |
|--------|--------|----------------------|
| **oma-qa** | Garantia de qualidade | Auditoria de segurança (OWASP Top 10), análise de performance, acessibilidade (WCAG 2.1 AA), revisão de qualidade de código. Severidade: CRITICAL/HIGH/MEDIUM/LOW com arquivo:linha e código de correção. Suporta características de qualidade ISO/IEC 25010 e alinhamento de testes ISO/IEC 29119. Recursos: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Diagnóstico e correção de bugs | Metodologia reproduce-first. Análise de causa raiz, correções mínimas, testes de regressão obrigatórios, varredura de padrões similares. Usa Serena MCP para rastreamento de símbolos. Recursos: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Localização, Coordenação e Git

| Agente | Função | Capacidades Principais |
|--------|--------|----------------------|
| **oma-translator** | Tradução com consciência de contexto | Método de tradução em 4 estágios: Analisar Fonte, Extrair Significado, Reconstruir no Idioma Alvo, Verificar. Preserva tom, registro e terminologia de domínio. Detecção de padrões anti-IA. Suporta tradução em lote (arquivos i18n). Modo refinado opcional de 7 estágios para qualidade de publicação. Recursos: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Coordenador multi-agente automatizado | Inicia subagentes CLI em paralelo, coordena via memória MCP, monitora progresso, executa loops de verificação. Configurável: MAX_PARALLEL (padrão 3), MAX_RETRIES (padrão 2), POLL_INTERVAL (padrão 30s). Inclui loop de revisão agente-para-agente e monitoramento de Dívida de Clarificação. Recursos: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-commit** | Commits convencionais | Analisa mudanças, determina tipo/escopo, divide por funcionalidade quando apropriado, gera mensagens de commit no formato Conventional Commits. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

---

## Modelo de Divulgação Progressiva

oh-my-agent usa uma arquitetura de habilidades em duas camadas para evitar o esgotamento da janela de contexto:

**Camada 1 — SKILL.md (~800 bytes, sempre carregado):**
Contém a identidade do agente, condições de roteamento, regras principais e orientação de "quando usar / quando NÃO usar". Isso é tudo que é carregado quando o agente não está trabalhando ativamente.

**Camada 2 — resources/ (carregado sob demanda):**
Contém protocolos de execução, referências de stack tecnológico, trechos de código, playbooks de erros, checklists e exemplos. São carregados apenas quando o agente é invocado para uma tarefa, e mesmo assim, apenas os recursos relevantes para o tipo específico de tarefa (baseado na avaliação de dificuldade e no mapeamento tarefa-recurso em `context-loading.md`).

Este design economiza aproximadamente 75% dos tokens em comparação com o carregamento de tudo antecipadamente. Para modelos flash-tier (128K de contexto), o orçamento total de recursos é de aproximadamente 3.100 tokens — apenas 2,4% da janela de contexto.

---

## .agents/ — A Única Fonte de Verdade (SSOT)

Tudo que oh-my-agent precisa reside no diretório `.agents/`:

```
.agents/
├── config/                 # user-preferences.yaml
├── skills/                 # 15 diretórios de habilidades (14 agentes + _shared)
│   ├── _shared/            # Recursos compartilhados por todos os agentes
│   └── oma-{agent}/        # SKILL.md + resources/ por agente
├── workflows/              # 14 definições de workflows
├── agents/                 # 7 definições de subagentes
├── plan.json               # Saída do plano gerado
├── state/                  # Arquivos de estado de workflow ativos
├── results/                # Arquivos de resultado dos agentes
└── mcp.json                # Configuração do servidor MCP
```

O diretório `.claude/` existe apenas como camada de integração com a IDE — contém symlinks apontando de volta para `.agents/`, além de hooks para detecção de palavras-chave e o indicador de statusline do HUD. O diretório `.serena/memories/` mantém o estado em tempo de execução durante sessões de orquestração.

Esta arquitetura significa que sua configuração de agentes é:
- **Portátil** — troque de IDE sem reconfigurar
- **Versionada** — commit de `.agents/` junto com seu código
- **Compartilhável** — membros da equipe recebem a mesma configuração de agentes

---

## IDEs e Ferramentas CLI Suportadas

oh-my-agent funciona com qualquer IDE ou CLI com IA que suporte carregamento de habilidades/prompts:

| Ferramenta | Método de Integração | Agentes Paralelos |
|------------|-------------------------|-------------------|
| **Claude Code** | Habilidades nativas + Agent tool | Task tool para paralelismo real |
| **Gemini CLI** | Habilidades auto-carregadas de `.agents/skills/` | `oh-my-ag agent:spawn` |
| **Codex CLI** | Habilidades auto-carregadas | Requisições paralelas mediadas por modelo |
| **Antigravity IDE** | Habilidades auto-carregadas | `oh-my-ag agent:spawn` |
| **Cursor** | Habilidades via integração `.cursor/` | Execução manual |
| **OpenCode** | Carregamento de habilidades | Execução manual |

A execução de agentes se adapta automaticamente a cada fornecedor via protocolo de detecção de vendor, que verifica marcadores específicos (ex: a ferramenta `Agent` para Claude Code, `apply_patch` para Codex CLI).

---

## Sistema de Roteamento de Habilidades

Quando você envia um prompt, oh-my-agent determina qual agente o trata usando o mapa de roteamento de habilidades (`.agents/skills/_shared/core/skill-routing.md`):

| Palavras-chave do Domínio | Roteado Para |
|-------------------------------|-------------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

Para requisições complexas que abrangem múltiplos domínios, o roteamento segue ordens de execução estabelecidas. Por exemplo, "Crie um app fullstack" é roteado para: oma-pm (plano) depois oma-backend + oma-frontend (implementação paralela) depois oma-qa (revisão).

---

## Próximos Passos

- **[Instalação](./installation)** — Três métodos de instalação, presets, configuração do CLI e verificação
- **[Agentes](/core-concepts/agents)** — Mergulho profundo em todos os 14 agentes e preflight de charter
- **[Habilidades](/core-concepts/skills)** — A arquitetura de duas camadas explicada
- **[Workflows](/core-concepts/workflows)** — Todos os 14 workflows com gatilhos e fases
- **[Guia de Uso](/guide/usage)** — Exemplos reais de tarefas simples a orquestração completa
