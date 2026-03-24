---
title: Habilidades (Skills)
description: "Guia completo da arquitetura de habilidades em duas camadas do oh-my-agent — design do SKILL.md, carregamento de recursos sob demanda, cada recurso compartilhado explicado, protocolos condicionais, tipos de recursos por skill, protocolos de execução por vendor, matemática de economia de tokens e mecânica de roteamento de habilidades."
---

# Habilidades (Skills)

Habilidades são pacotes de conhecimento estruturado que dão a cada agente sua expertise de domínio. Não são apenas prompts — contêm protocolos de execução, referências de stack tecnológico, templates de código, playbooks de erros, checklists de qualidade e exemplos few-shot, organizados em uma arquitetura de duas camadas projetada para eficiência de tokens.

---

## O Design em Duas Camadas

### Camada 1: SKILL.md (~800 bytes, sempre carregado)

Cada habilidade tem um arquivo `SKILL.md` em sua raiz. Este é sempre carregado na janela de contexto quando a habilidade é referenciada. Contém:

- **Frontmatter YAML** com `name` e `description` (usado para roteamento e exibição)
- **Quando usar / Quando NÃO usar** — condições explícitas de ativação
- **Regras principais** — as 5-15 restrições mais críticas para o domínio
- **Visão geral da arquitetura** — como o código deve ser estruturado
- **Lista de bibliotecas** — dependências aprovadas e seus propósitos
- **Referências** — ponteiros para recursos da Camada 2 (nunca carregados automaticamente)

Exemplo de frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

O campo description é crítico — contém as palavras-chave de roteamento que o sistema de roteamento de habilidades usa para corresponder tarefas a agentes.

### Camada 2: resources/ (carregado sob demanda)

O diretório `resources/` contém conhecimento profundo de execução. Esses arquivos são carregados apenas quando:
1. O agente é explicitamente invocado (via `/command` ou campo skills do agente)
2. O recurso específico é necessário para o tipo e dificuldade da tarefa atual

Este carregamento sob demanda é governado pelo guia de context-loading (`.agents/skills/_shared/core/context-loading.md`), que mapeia tipos de tarefa para recursos necessários por agente.

---

## Exemplo de Estrutura de Arquivos

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Camada 1: sempre carregado (~800 bytes)
└── resources/
    ├── execution-protocol.md         ← Camada 2: workflow passo a passo
    ├── tech-stack.md                 ← Camada 2: specs detalhadas de tecnologia
    ├── tailwind-rules.md             ← Camada 2: convenções específicas do Tailwind
    ├── component-template.tsx        ← Camada 2: template de componente React
    ├── snippets.md                   ← Camada 2: padrões de código prontos
    ├── error-playbook.md             ← Camada 2: procedimentos de recuperação de erros
    ├── checklist.md                  ← Camada 2: checklist de verificação de qualidade
    └── examples/                     ← Camada 2: exemplos few-shot de entrada/saída
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              ← Específico de domínio (queries ORM, N+1, transações)
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             ← Gerado por /stack-set (específico de linguagem)
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
├── reference/                         ← Material de referência aprofundado
│   ├── typography.md
│   ├── color-and-contrast.md
│   ├── spatial-design.md
│   ├── motion-design.md
│   ├── responsive-design.md
│   ├── component-patterns.md
│   ├── accessibility.md
│   └── shader-and-3d.md
└── examples/
    ├── design-context-example.md
    └── landing-page-prompt.md
```

---

## Tipos de Recursos por Skill

| Tipo de Recurso | Padrão de Nome | Propósito | Quando Carregado |
|-----------------|---------------|---------|-------------|
| **Protocolo de Execução** | `execution-protocol.md` | Workflow passo a passo: Analisar -> Planejar -> Implementar -> Verificar | Sempre (com SKILL.md) |
| **Stack Tecnológico** | `tech-stack.md` | Specs detalhadas de tecnologia, versões, configuração | Tarefas complexas |
| **Playbook de Erros** | `error-playbook.md` | Procedimentos de recuperação com escalação "3 strikes" | Apenas em erros |
| **Checklist** | `checklist.md` | Verificação de qualidade específica do domínio | Na etapa de Verificação |
| **Snippets** | `snippets.md` | Padrões de código prontos para copiar | Tarefas Médias/Complexas |
| **Exemplos** | `examples.md` ou `examples/` | Exemplos few-shot de entrada/saída para o LLM | Tarefas Médias/Complexas |
| **Variantes** | Diretório `stack/` | Referências específicas de linguagem/framework (geradas por `/stack-set`) | Quando stack existe |
| **Templates** | `component-template.tsx`, `screen-template.dart` | Templates boilerplate de arquivo | Na criação de componentes |
| **Referência de Domínio** | `orm-reference.md`, `anti-patterns.md`, etc. | Conhecimento profundo de domínio para subtarefas específicas | Específico por tipo de tarefa |

---

## Recursos Compartilhados (_shared/)

Todos os agentes compartilham fundamentos comuns de `.agents/skills/_shared/`. Estes são organizados em três categorias:

### Recursos Core (`.agents/skills/_shared/core/`)

| Recurso | Propósito | Quando Carregado |
|---------|---------|-------------|
| **`skill-routing.md`** | Mapeia palavras-chave de tarefas para o agente correto. Contém a tabela de Mapeamento Skill-Agente, padrões de Roteamento de Requisições Complexas, Regras de Dependência Inter-Agente, Regras de Escalação e Guia de Limite de Turnos. | Referenciado por skills de orquestração e coordenação |
| **`context-loading.md`** | Define quais recursos carregar para cada tipo de tarefa e dificuldade. Contém tabelas de mapeamento tipo-tarefa-para-recurso por agente e gatilhos de carregamento de protocolo condicional. | No início do workflow (Step 0 / Phase 0) |
| **`prompt-structure.md`** | Define os quatro elementos que cada prompt de tarefa deve conter: Goal, Context, Constraints, Done When. Inclui templates para agentes PM, implementação e QA. Lista anti-padrões (começar com apenas um Goal). | Referenciado pelo agente PM e todos os workflows |
| **`clarification-protocol.md`** | Define níveis de incerteza (LOW/MEDIUM/HIGH) com ações para cada um. Contém gatilhos de incerteza, templates de escalação, itens de verificação requeridos por tipo de agente e comportamento em modo subagente. | Quando requisitos são ambíguos |
| **`context-budget.md`** | Gerenciamento de orçamento de tokens. Define estratégia de leitura de arquivos (usar `find_symbol` não `read_file`), orçamentos de carregamento de recursos por tier de modelo (Flash: ~3.100 tokens / Pro: ~5.000 tokens), tratamento de arquivos grandes e sintomas de overflow de contexto. | No início do workflow |
| **`difficulty-guide.md`** | Critérios para classificar tarefas como Simples/Média/Complexa. Define contagens esperadas de turnos, ramificação de protocolo (Fast Track / Standard / Extended) e recuperação de avaliação errada. | No início da tarefa (Step 0) |
| **`reasoning-templates.md`** | Templates de raciocínio estruturado para preencher para padrões comuns de decisão (ex: template de Decisão de Exploração #6 usado pelo Exploration Loop). | Durante decisões complexas |
| **`quality-principles.md`** | 4 princípios universais de qualidade aplicados em todos os agentes. | No início de workflows focados em qualidade (ultrawork) |
| **`vendor-detection.md`** | Protocolo para detectar o ambiente de execução atual (Claude Code, Codex CLI, Gemini CLI, Antigravity, CLI Fallback). Usa verificações de marcadores: Agent tool = Claude Code, apply_patch = Codex, @-syntax = Gemini. | No início do workflow |
| **`session-metrics.md`** | Pontuação de Dívida de Clarificação (CD) e rastreamento de métricas de sessão. Define tipos de eventos (clarify +10, correct +25, redo +40), limiares (CD >= 50 = RCA, CD >= 80 = pausa) e pontos de integração. | Durante sessões de orquestração |
| **`common-checklist.md`** | Checklist universal de qualidade aplicado na verificação final de tarefas Complexas (além dos checklists específicos do agente). | Etapa de Verificação de tarefas Complexas |
| **`lessons-learned.md`** | Repositório de aprendizados de sessões passadas, auto-gerado a partir de violações de Dívida de Clarificação e experimentos descartados. Organizado por seção de domínio. | Referenciado após erros e no fim da sessão |
| **`api-contracts/`** | Diretório contendo template de contrato de API e contratos gerados. `template.md` define o formato por endpoint (method, path, schemas de request/response, auth, erros). | Quando trabalho cross-boundary é planejado |

### Recursos de Runtime (`.agents/skills/_shared/runtime/`)

| Recurso | Propósito |
|---------|---------|
| **`memory-protocol.md`** | Formato de arquivo de memória e operações para subagentes CLI. Define protocolos On Start, During Execution e On Completion usando ferramentas de memória configuráveis (read/write/edit). Inclui extensão de rastreamento de experimentos. |
| **`execution-protocols/claude.md`** | Padrões de execução específicos do Claude Code. Injetado por `oh-my-ag agent:spawn` quando vendor é claude. |
| **`execution-protocols/gemini.md`** | Padrões de execução específicos do Gemini CLI. |
| **`execution-protocols/codex.md`** | Padrões de execução específicos do Codex CLI. |
| **`execution-protocols/qwen.md`** | Padrões de execução específicos do Qwen CLI. |

Protocolos de execução específicos de vendor são injetados automaticamente por `oh-my-ag agent:spawn` — agentes não precisam carregá-los manualmente.

### Recursos Condicionais (`.agents/skills/_shared/conditional/`)

Estes são carregados apenas quando condições específicas são atendidas durante a execução:

| Recurso | Condição de Gatilho | Carregado Por | Tokens Aprox. |
|---------|---------------------|--------------|--------------|
| **`quality-score.md`** | Fase VERIFY ou SHIP começa em um workflow que suporta medição de qualidade | Orquestrador (passa para prompt do agente QA) | ~250 |
| **`experiment-ledger.md`** | Primeiro experimento registrado após estabelecer baseline IMPL | Orquestrador (inline, após medição de baseline) | ~250 |
| **`exploration-loop.md`** | Mesmo portão falha duas vezes no mesmo problema | Orquestrador (inline, antes de spawnar agentes de hipótese) | ~250 |

Impacto no orçamento: aproximadamente 750 tokens no total se todos os 3 forem carregados. Como o carregamento é condicional, sessões típicas carregam 1-2 destes. O orçamento flash-tier permanece dentro da alocação de aproximadamente 3.100 tokens.

---

## Como Habilidades Roteiam via skill-routing.md

O mapa de roteamento de habilidades define como tarefas são correspondidas a agentes:

### Roteamento Simples (Domínio Único)

Um prompt contendo "Build a login form with Tailwind CSS" corresponde às palavras-chave `UI`, `component`, `form`, `Tailwind` e roteia para **oma-frontend**.

### Roteamento de Requisições Complexas

Requisições multi-domínio seguem ordens de execução estabelecidas:

| Padrão da Requisição | Ordem de Execução |
|---------------------|------------------|
| "Create a fullstack app" | oma-pm -> (oma-backend + oma-frontend) paralelo -> oma-qa |
| "Create a mobile app" | oma-pm -> (oma-backend + oma-mobile) paralelo -> oma-qa |
| "Fix bug and review" | oma-debug -> oma-qa |
| "Design and build a landing page" | oma-design -> oma-frontend |
| "I have an idea for a feature" | oma-brainstorm -> oma-pm -> agentes relevantes -> oma-qa |
| "Do everything automatically" | oma-orchestrator (internamente: oma-pm -> agentes -> oma-qa) |

### Regras de Dependência Inter-Agente

**Podem executar em paralelo (sem dependências):**
- oma-backend + oma-frontend (quando contrato de API é pré-definido)
- oma-backend + oma-mobile (quando contrato de API é pré-definido)
- oma-frontend + oma-mobile (independentes um do outro)

**Devem executar sequencialmente:**
- oma-brainstorm -> oma-pm (design vem antes do planejamento)
- oma-pm -> todos os outros agentes (planejamento vem primeiro)
- agente de implementação -> oma-qa (revisão após implementação)
- oma-backend -> oma-frontend/oma-mobile (quando não há contrato de API pré-definido)

**QA é sempre por último**, exceto quando o usuário solicita revisão de arquivos específicos apenas.

---

## Matemática de Economia de Tokens

Considere uma sessão de orquestração com 5 agentes (pm, backend, frontend, mobile, qa):

**Sem divulgação progressiva:**
- Cada agente carrega todos os recursos: ~4.000 tokens por agente
- Total: 5 x 4.000 = 20.000 tokens consumidos antes de qualquer trabalho

**Com divulgação progressiva:**
- Camada 1 apenas para todos os agentes: 5 x 800 = 4.000 tokens
- Camada 2 carregada apenas para agentes ativos (tipicamente 1-2 por vez): +1.500 tokens
- Total: ~5.500 tokens

**Economia: aproximadamente 72-75%**

Em modelos flash-tier (128K de contexto), esta é a diferença entre ter 108K tokens disponíveis para trabalho versus 125K tokens — uma margem significativa para tarefas complexas.

---

## Carregamento de Recursos por Dificuldade da Tarefa

O guia de dificuldade classifica tarefas em três níveis, que determinam quanto da Camada 2 é carregado:

### Simples (3-5 turnos esperados)

Mudança em arquivo único, requisitos claros, repetição de padrões existentes.

Carrega: Apenas `execution-protocol.md`. Pular análise, prosseguir diretamente para implementação com checklist mínimo.

### Média (8-15 turnos esperados)

2-3 mudanças de arquivo, algumas decisões de design necessárias, aplicar padrões a novos domínios.

Carrega: `execution-protocol.md` + `examples.md`. Protocolo padrão com análise breve e verificação completa.

### Complexa (15-25 turnos esperados)

4+ mudanças de arquivo, decisões de arquitetura necessárias, introdução de novos padrões, dependências de outros agentes.

Carrega: `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. Protocolo estendido com checkpoints, gravação de progresso mid-execução e verificação completa incluindo `common-checklist.md`.

---

## Mapas de Tarefas do Context-Loading (Por Agente)

O guia de context-loading fornece mapeamentos detalhados tipo-tarefa-para-recurso. Aqui estão os mapeamentos principais:

### Agente Backend

| Tipo de Tarefa | Recursos Necessários |
|---------------|---------------------|
| Criação de API CRUD | stack/snippets.md (route, schema, model, test) |
| Autenticação | stack/snippets.md (JWT, password) + stack/tech-stack.md |
| Migração de DB | stack/snippets.md (migration) |
| Otimização de performance | examples.md (exemplo N+1) |
| Modificação de código existente | examples.md + Serena MCP |

### Agente Frontend

| Tipo de Tarefa | Recursos Necessários |
|---------------|---------------------|
| Criação de componente | snippets.md + component-template.tsx |
| Implementação de formulário | snippets.md (form + Zod) |
| Integração com API | snippets.md (TanStack Query) |
| Estilização | tailwind-rules.md |
| Layout de página | snippets.md (grid) + examples.md |

### Agente Design

| Tipo de Tarefa | Recursos Necessários |
|---------------|---------------------|
| Criação de design system | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Design de landing page | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
| Auditoria de design | checklist.md + anti-patterns.md |
| Exportação de design tokens | design-tokens.md |
| Efeitos 3D / shader | reference/shader-and-3d.md + reference/motion-design.md |
| Revisão de acessibilidade | reference/accessibility.md + checklist.md |

### Agente QA

| Tipo de Tarefa | Recursos Necessários |
|---------------|---------------------|
| Revisão de segurança | checklist.md (seção Security) |
| Revisão de performance | checklist.md (seção Performance) |
| Revisão de acessibilidade | checklist.md (seção Accessibility) |
| Auditoria completa | checklist.md (completo) + self-check.md |
| Pontuação de qualidade | quality-score.md (condicional) |

---

## Composição de Prompt do Orquestrador

Quando o orquestrador compõe prompts para subagentes, inclui apenas recursos relevantes à tarefa:

1. Seção Core Rules do SKILL.md do agente
2. `execution-protocol.md`
3. Recursos correspondentes ao tipo específico de tarefa (dos mapas acima)
4. `error-playbook.md` (sempre incluído — recuperação é essencial)
5. Serena Memory Protocol (modo CLI)

Esta composição direcionada evita carregar recursos desnecessários, maximizando o contexto disponível do subagente para trabalho real.
