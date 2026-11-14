---
title: Agentes
description: "Referência do catálogo de skills do OMA (gerado a partir do SKILL.md), dos papéis de dispatch, das definições de agentes e suas projeções nativas, das regras de cada skill, de autorização e clarificação, das regras de escopo, da estratégia de workspace, do loop de revisão da orquestração e da memória de runtime."
---

# Agentes

O OMA separa [skills](../getting-started/glossary.md#skill), papéis de dispatch e [definições de agentes](../getting-started/glossary.md#agent-definition). Uma skill roteia e carrega orientações de domínio; um papel canônico é a identidade de runtime usada no dispatch; uma definição versionada dá ao subagente uma persona nativa do vendor. Essas camadas se sobrepõem por design, então use o limite da tarefa e os critérios de aceitação para decidir se uma única skill basta.

---

## Catálogo de skills {#skill-catalog}

Esta tabela é a lista oficial das skills instaladas. Ela é gerada a partir do frontmatter de cada `.agents/skills/<name>/SKILL.md` por `cli/scripts/generate-skill-catalog.mjs`; execute o script com `--check` para detectar divergências. A seção `## References` do SKILL.md de cada skill lista seus arquivos de recursos e quando lê-los.

<!-- oma:generated skill-catalog:start -->
<!-- Generated from SKILL.md frontmatter under .agents/skills by cli/scripts/generate-skill-catalog.mjs. Do not edit this block by hand. -->

| Skill | Use it for |
|---|---|
| [`oma-academic-writing`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-academic-writing/SKILL.md) | Draft and revise academic prose against a rubric, evidence, and citation requirements. Use for essays, reports, literature reviews, or academic style audits. |
| [`oma-architecture`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-architecture/SKILL.md) | Evaluate system boundaries and architectural tradeoffs. Use for architecture decisions, design reviews, and ADRs. |
| [`oma-backend`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-backend/SKILL.md) | Implement server APIs, authentication, and application data access. Schema modeling and query tuning use oma-db. |
| [`oma-brainstorm`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-brainstorm/SKILL.md) | Explore goals, constraints, and alternative approaches before choosing a design. Use when the user requests ideation or design exploration. |
| [`oma-coordination`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-coordination/SKILL.md) | Shared coordination rules for multi-agent work: plan reuse, contract alignment, workspace ownership, and QA handoff. Loaded by the /work, /orchestrate, and /ultrawork workflows; also use for manual step-by-step coordination. |
| [`oma-db`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-db/SKILL.md) | Design schemas and migrations, tune queries, or plan vector retrieval and database operations. Application API implementation uses oma-backend. |
| [`oma-debug`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-debug/SKILL.md) | Diagnose a reproducible failure, fix its cause, and verify the regression. Use for crashes, incorrect behavior, and failing tests. |
| [`oma-design`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-design/SKILL.md) | Define or review a visual system, DESIGN.md, or redesign direction. Use for typography, layout, color, motion, and interaction design decisions. |
| [`oma-dev-workflow`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-dev-workflow/SKILL.md) | Configure development tasks, git hooks, CI/CD, or release automation. Use when creating or fixing a repository development workflow. |
| [`oma-docs`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-docs/SKILL.md) | Check documentation references, sync docs to code changes, and detect translation drift. Use for documentation maintenance in a repository. |
| [`oma-explanation`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-explanation/SKILL.md) | Create an offline HTML explanation of a code change (diff, PR, branch) or of a topic, system, or question. Use when a visual walkthrough document is requested. |
| [`oma-frontend`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-frontend/SKILL.md) | Implement or modify web UI in React, Next.js, or Angular. Use for components, pages, styles, forms, and frontend state or data flows. |
| [`oma-hwp`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-hwp/SKILL.md) | Convert Hangul HWP, HWPX, or HWPML documents to Markdown with kordoc. Use for text, table, and image extraction from these formats. |
| [`oma-image`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-image/SKILL.md) | Generate raster images or reference-guided variations through the OMA image CLI. Use for image assets or explicit vendor comparisons; pixel editing uses an editor. |
| [`oma-market`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-market/SKILL.md) | Research customer pain points, trends, and competitors through the OMA market engine. Use for market discovery or voice-of-customer analysis. |
| [`oma-mobile`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-mobile/SKILL.md) | Implement Flutter, React Native, native Swift, or native Kotlin Android apps. Use for mobile screens, widgets, platform integrations, and application data flows. |
| [`oma-observability`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-observability/SKILL.md) | Design or troubleshoot telemetry, SLOs, and incident diagnostics. Route to the relevant signal, system boundary, or vendor guide. |
| [`oma-orchestration`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-orchestration/SKILL.md) | Dispatch and supervise parallel specialist agents with durable task state. Use when automated multi-agent execution is requested. |
| [`oma-pdf`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-pdf/SKILL.md) | Extract PDF text, headings, tables, and images into Markdown using opendataloader-pdf. Use for PDF parsing, not PDF layout creation. |
| [`oma-pm`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-pm/SKILL.md) | Turn product requirements into scoped tasks with dependencies and acceptance criteria. Use for implementation planning and prioritization. |
| [`oma-qa`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-qa/SKILL.md) | Review changes for correctness, security, accessibility, and performance. Use for scoped quality reviews or verification plans; bug fixes use oma-debug. |
| [`oma-recap`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-recap/SKILL.md) | Summarize AI conversation histories for a specified date or period. Use for daily work recaps and cross-tool activity summaries. |
| [`oma-refactor`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-refactor/SKILL.md) | Restructure existing code while preserving observable behavior. Use for targeted technical debt or hotspot work with characterization tests. |
| [`oma-scholar`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-scholar/SKILL.md) | Search academic literature and generate, validate, or compare Knows paper sidecars. Use for claim/evidence analysis and literature synthesis. |
| [`oma-scm`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-scm/SKILL.md) | Manage Git branches, merges, conflicts, commits, and release baselines. Use for repository history and change-management operations. |
| [`oma-search`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-search/SKILL.md) | Find external documentation, web sources, or remote code with citations. Local code navigation uses the configured code tools. |
| [`oma-security`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-security/SKILL.md) | Scan application source, agent skills, and MCP components, validate findings, and configure scan gates. Penetration tests of a scoped web test deployment run only on a user-supplied, reviewed runtime platform. Use oma-qa for broad quality reviews and domain skills for remediation. |
| [`oma-skill-creation`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-skill-creation/SKILL.md) | Create or revise OMA skills and their references. Use for skill routing, execution contracts, conditional loading, and authoring validation. |
| [`oma-slide`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-slide/SKILL.md) | Create, import, revise, or export presentation decks through the OMA slide CLI or the ppt-master route. Use for HTML slides, editable PPTX, and PDF, PNG, or PPTX deck delivery. |
| [`oma-tf-infra`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-tf-infra/SKILL.md) | Create or review Terraform infrastructure and plans. Use for cloud resources, IAM, networking, state management, and infrastructure changes. |
| [`oma-translation`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-translation/SKILL.md) | Translate or revise localized UI strings and prose while preserving meaning, terminology, placeholders, and structure. |
| [`oma-video`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-video/SKILL.md) | Create videos through the OMA video CLI, or analyze and edit existing clips with media tools. Use for frame extraction, visual analysis, silence cuts, dubbing assembly, sound effects, scripts, and composition; audio-only work uses oma-voice. |
| [`oma-voice`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-voice/SKILL.md) | Generate or transcribe speech with Voicebox or VoiceStudio, or process existing audio locally. Use for narration, transcripts, timed speech, and loudness conversion; video editing uses oma-video. |
<!-- oma:generated skill-catalog:end -->

---

## Papéis de dispatch {#dispatch-roles}

O runtime faz o dispatch por papel canônico. Cada papel, exceto `orchestrator`, tem uma definição versionada em `.agents/agents/`, cujo frontmatter `skills:` indica as skills que ela carrega. A primeira skill listada é a responsável pela tarefa.

| Papel | Arquivo de definição | Também aceito | Skills |
|------|-----------------|---------------|--------|
| `orchestrator` | nenhum (papel de coordenação de runtime) | | |
| `pm` | `pm-planner.md` | `pm-planner` | oma-pm |
| `architecture` | `architecture-reviewer.md` | `architecture-reviewer` | oma-architecture |
| `qa` | `qa-reviewer.md` | `qa-reviewer` | oma-qa |
| `backend` | `backend-engineer.md` | `backend-engineer` | oma-backend |
| `frontend` | `frontend-engineer.md` | `frontend-engineer` | oma-frontend, oma-design |
| `mobile` | `mobile-engineer.md` | `mobile-engineer` | oma-mobile |
| `db` | `db-engineer.md` | `db-engineer` | oma-db |
| `debug` | `debug-investigator.md` | `debug-investigator` | oma-debug |
| `refactor` | `refactor-engineer.md` | `refactor-engineer` | oma-refactor |
| `docs` | `docs-curator.md` | `docs-curator` | oma-docs |
| `tf-infra` | `tf-infra-engineer.md` | `tf-infra-engineer` | oma-tf-infra |
| `explore` | `research-explorer.md` | `research-explorer`, `explorer` | oma-search, oma-market, oma-scholar |

O sufixo final `-agent` também é aceito (`qa-agent` é resolvido como `qa`).

### Arquivos de agentes nativos {#native-agent-files}

As definições de agentes em `.agents/agents/` são a fonte de verdade. O OMA as projeta em arquivos nativos do vendor para runtimes que aceitam subagentes personalizados:

| Runtime | Arquivos de agentes nativos |
|---------|--------------------|
| Claude Code | `.claude/agents/<name>.md` |
| Codex CLI | `.codex/agents/<name>.toml` |
| Cursor | `.cursor/agents/` |
| OpenCode | `.opencode/agents/` |
| Kiro | `.kiro/agents/` |
| Grok | `.grok/agents/` |
| CommandCode | `.commandcode/agents/` |
| Qwen Code | `.qwen/agents/` |

O pi não tem um sistema de arquivos de agentes, então `oma agent spawn` incorpora a persona da definição diretamente no prompt. Os arquivos gerados são atualizados por `oma link`, `oma install` e `oma update`.

### Como um papel é despachado {#how-a-role-is-dispatched}

Quando um workflow mapeia um agente para o mesmo vendor do runtime atual, ele usa primeiro o arquivo de agente nativo desse runtime. Tarefas entre vendors recorrem a `oma agent spawn`.

```mermaid
flowchart TD
    task["Agent task"] --> resolve["Resolve the target vendor from oma-config"]
    resolve --> free{"model_preset: free?"}
    free -->|yes| spawn["oma agent spawn"]
    free -->|no| same{"Target vendor is the current runtime and a native path is verified?"}
    same -->|yes| native["Native subagent file"]
    same -->|no| spawn
```

> **Dispatch do modelo por agente:** o vendor, o modelo e o esforço de cada papel vêm de `.agents/oma-config.yaml` (ou de `.agents/oma-config.cue`, com uma sobreposição `.local` opcional). Com `model_preset: auto`, o padrão em novas instalações, os papéis sem override em `agents:` seguem as configurações nativas de agente e modelo do runtime atual; `model_preset: free` sempre faz o dispatch por `oma agent spawn`. Consulte [Modelos por agente](../guide/per-agent-models.md) para detalhes de configuração e [`oma doctor --profile`](../cli-interfaces/commands.md#doctor) para inspecionar a matriz ativa.

---

## Categorias de skills {#agent-categories}

| Categoria | Skills | Responsabilidade |
|----------|--------|---------------|
| **Ideação** | oma-brainstorm | Explorar ideias, propor abordagens e produzir documentos de design |
| **Arquitetura** | oma-architecture | Limites de sistema/módulo/serviço, análises no estilo ADR/ATAM/CBAM e registros de tradeoffs |
| **Planejamento** | oma-pm | Decompor requisitos, dividir tarefas, definir contratos de API e atribuir prioridades |
| **Implementação** | oma-frontend, oma-backend, oma-mobile, oma-db | Escrever código nos respectivos domínios |
| **Design** | oma-design | Sistemas de design, DESIGN.md, tokens, tipografia, cores, movimento e acessibilidade |
| **Infraestrutura** | oma-tf-infra | Provisionamento Terraform multi-cloud, IAM, otimização de custos e policy-as-code |
| **DevOps** | oma-dev-workflow | Task runner mise, CI/CD, migrações, coordenação de releases e automação de monorepo |
| **Observabilidade** | oma-observability | Pipelines de observabilidade, roteamento de rastreabilidade, sinais MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), gestão de SLO, investigação de incidentes e ajuste de transporte |
| **Qualidade** | oma-qa | Auditoria de segurança (OWASP), performance, acessibilidade (WCAG) e revisão de qualidade de código |
| **Depuração** | oma-debug | Reprodução de bugs, análise de causa raiz, correções mínimas e testes de regressão |
| **Localização** | oma-translation | Tradução contextual que preserva tom, registro e termos do domínio |
| **Coordenação** | oma-orchestration, oma-coordination | Orquestração multiagente automatizada; regras de coordenação compartilhadas e coordenação manual passo a passo |
| **Git** | oma-scm | Geração de Conventional Commits e divisão de commits por funcionalidade |
| **Busca e recuperação** | oma-search | Roteador de busca para fontes externas com citações (docs Context7, providers web, código remoto `gh`/`glab` e fetch de URLs conhecidas) |
| **Retrospectiva** | oma-recap | Análise do histórico de conversas entre ferramentas e resumos de trabalho temáticos |
| **Processamento de documentos** | oma-hwp, oma-pdf | Conversão de HWP/HWPX/HWPML e PDF para Markdown para ingestão em LLM/RAG |
| **Documentação** | oma-docs | Manutenção da documentação: referências quebradas, documentos afetados por um diff, deriva de tradução e lint de documentos traduzidos |
| **Explicação** | oma-explanation | Explicações HTML offline de uma mudança de código (diff, PR, branch, intervalo de commits) ou de um tema, sistema ou pergunta |
| **Escrita acadêmica** | oma-academic-writing, oma-scholar | Redação e auditoria de prosa acadêmica de nível de publicação e pesquisa acadêmica, busca e peer review com sidecars Knows |
| **Segurança** | oma-security | Scan de código-fonte de aplicações, pacotes de skills de agentes e componentes MCP (Deepsec, scanners da Cisco), com validação independente de achados e gates de CI; testes de penetração de um deploy de teste web com escopo definido somente em uma plataforma ARTEX fornecida e revisada pelo usuário |
| **Refatoração** | oma-refactor | Reestruturação incremental que preserva comportamento, com foco em hotspots, redes de testes de caracterização e commits apenas de refatoração |
| **Pesquisa de mercado** | oma-market | Pesquisa de pain points, tendências, concorrentes e descoberta a partir de sinais comunitários, com frameworks SWOT/Porter 5F/PESTEL escolhidos automaticamente pela intenção |
| **Criação de skills** | oma-skill-creation | Criação e validação de skills OMA no formato SSL-lite |
| **Geração de mídia** | oma-image, oma-slide, oma-video, oma-voice | Geração de imagens por IA, apresentações HTML, vídeos curtos/explicativos/de demonstração e TTS/STT local |

---

## Referência detalhada dos agentes {#detailed-agent-reference}

Estes resumos explicam o domínio e as regras principais de cada skill. O SKILL.md da própria skill é a fonte de verdade: a seção `## References` lista os arquivos de recursos e a condição para ler cada um, por isso esta página não copia essas listas.

### oma-brainstorm

**Domínio:** Ideação orientada por design antes do planejamento ou implementação.

**Quando usar:** Explorar uma nova ideia de funcionalidade, entender a intenção do usuário, comparar abordagens. Use antes de `/plan` para requisições complexas ou ambíguas.

**Quando NÃO usar:** Requisitos claros (vá para oma-pm), implementação (vá para agentes de domínio), revisão de código (vá para oma-qa).

**Regras principais:**
- Sem implementação ou planejamento antes da aprovação do design
- Uma pergunta de esclarecimento por vez (não em lotes)
- Comparar duas ou três abordagens viáveis quando as alternativas ajudam a decisão; se as restrições deixarem menos opções, explicar o motivo em vez de inventar alternativas
- Apresentar o design seção por seção, resolvendo apenas as escolhas relevantes ainda em aberto
- YAGNI: projete apenas o necessário

**Workflow:** O workflow `/brainstorm` executa 7 etapas: Contexto, Perguntas, Abordagens (opcionalmente alimentadas por TRIZ-lite), Design, Revisão Cega, Documentação (salva em `docs/decisions/`), Transição para `/plan`.

---

### oma-architecture

**Domínio:** Arquitetura de software/sistemas, incluindo limites de módulos e serviços, análise de tradeoffs, síntese de partes interessadas e registros de decisão.

**Quando usar:** Escolher ou revisar arquitetura de sistema, definir limites de módulo/serviço/propriedade, comparar opções arquiteturais com tradeoffs explícitos, investigar dores arquiteturais (amplificação de mudanças, dependências ocultas, APIs estranhas), priorizar investimentos ou refatorações arquiteturais, escrever recomendações de arquitetura ou ADRs.

**Quando NÃO usar:** Sistemas visuais/de design (use oma-design), planejamento de funcionalidades e decomposição de tarefas (use oma-pm), implementação de Terraform (use oma-tf-infra), diagnóstico de bugs (use oma-debug), revisão de segurança/performance/acessibilidade (use oma-qa).

**Metodologias:** Roteamento diagnóstico, comparação design-twice, análise de risco no estilo ATAM, priorização no estilo CBAM, registros de decisão no estilo ADR.

**Regras principais:**
- Diagnosticar o problema arquitetural antes de selecionar um método
- Usar a metodologia mais leve e suficiente para a decisão atual
- Distinguir design arquitetural do design de UI/visual e da entrega em Terraform
- Consultar agentes de partes interessadas apenas quando a decisão for suficientemente transversal para justificar o custo
- A qualidade da recomendação importa mais que o teatro do consenso: consultar amplamente, decidir explicitamente
- Cada recomendação deve declarar premissas, tradeoffs, riscos e etapas de validação
- Ser consciente de custo por padrão: custo de implementação, custo operacional, complexidade da equipe, custo de mudanças futuras

---

### oma-pm

**Domínio:** Gerenciamento de produto, incluindo análise de requisitos, decomposição de tarefas e contratos de API.

**Quando usar:** Decompor funcionalidades complexas, determinar viabilidade, priorizar trabalho, definir contratos de API.

**Regras principais:**
- Design API-first: definir contratos antes das tarefas de implementação
- Cada tarefa tem: agente, título, critérios de aceitação, prioridade, dependências
- Minimizar dependências para máxima execução paralela
- Segurança e testes são parte de cada tarefa (não fases separadas)
- Tarefas devem ser completáveis por um único agente
- Gerar o plano JSON como handoff para o orquestrador; o orquestrador cria o task board e é o responsável por ele

**Saída:** `.agents/results/plan-{sessionId}.json` com tiers numéricos de prioridade (`1` = independente; tiers menores rodam primeiro), além do relatório com escopo de execução `result-{agentId}-{taskId}-{runId}-{sessionId}.md` no armazenamento de memória configurado.

---

### oma-frontend

**Domínio:** Web UI em React/Next.js ou Angular com TypeScript. Projetos React usam FSD-lite; projetos Angular seguem `resources/angular-rules.md`.

**Quando usar:** Construir interfaces de usuário, componentes, lógica do lado do cliente, estilização, validação de formulários, integração com API.

**Stack tecnológico:**
- React + Next.js (Server Components por padrão, Client Components para interatividade)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (primitivas somente leitura, estender via cva/wrappers)
- FSD-lite: raiz `src/` + feature `src/features/*/` (sem importações cross-feature)

**Bibliotecas (projetos React/Next.js):**
| Propósito | Biblioteca |
|-----------|-----------|
| Datas | luxon |
| Estilização | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks ou @mantine/hooks |
| Utils | es-toolkit |
| Tipos | type-fest |
| Estado URL | nuqs |
| Estado Servidor | TanStack Query (hooks gerados pelo orval quando existe uma spec OpenAPI) |
| Estado Cliente | Jotai ou Zustand, escolhido pela intenção, sem padrão (minimizar uso) |
| Formulários | @tanstack/react-form + Zod |
| Auth | better-auth |
| Animação | motion (`motion/react`) para projetos novos |

**Regras principais:**
- shadcn/ui primeiro, estender via cva, nunca modificar `components/ui/*` diretamente
- Mapeamento 1:1 de design tokens (nunca hardcode cores)
- Proxy de requisições: preserve a convenção `proxy.ts` existente do Next.js 16+; verifique a versão instalada e o roteamento antes de propor renomear para `middleware.ts`
- Sem prop drilling além de 3 níveis; use a biblioteca de estado de cliente do projeto (atoms Jotai ou uma store Zustand)
- Imports absolutos com `@/` obrigatório
- Meta de FCP < 1s
- Breakpoints responsivos: 320px, 768px, 1024px, 1440px

**Checklist do portão de qualidade:**
- Acessibilidade: labels ARIA, headings semânticos, navegação por teclado
- Mobile: verificado em viewports mobile
- Performance: sem CLS, carregamento rápido
- Resiliência: Error Boundaries e Loading Skeletons
- Testes: lógica coberta por Vitest
- Qualidade: typecheck e lint passam

---

### oma-backend

**Domínio:** APIs, lógica do lado do servidor, autenticação, operações de banco de dados.

**Quando usar:** APIs REST/GraphQL, o código de acesso a dados e as migrações que uma mudança de API exige, auth, lógica de negócio do servidor, jobs em background.

**Quando NÃO usar:** Modelagem de schema, design de índices e tuning de consultas (use oma-db), UI de frontend (use oma-frontend), código mobile (use oma-mobile).

**Arquitetura:** Router (HTTP) -> Service (Lógica de Negócio) -> Repository (Acesso a Dados) -> Models.

**Detecção de stack:** Lê primeiro os manifestos do projeto (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) e o código existente para determinar linguagem e framework. A referência de stack é complementar: `stack/` quando existe; caso contrário, o `variants/<language>/` correspondente. Um projeto instalado com um preset escolhido tem `stack/` e não tem `variants/`; os layouts de plugin e de código-fonte têm `variants/` e não têm `stack/`. Se nenhum dos dois se aplicar, o agente pergunta ao usuário ou sugere `/stack-set`.

**Presets distribuídos:** Python (Litestar com SQLAlchemy 2 (async) por meio do Advanced Alchemy, modelos msgspec, auth JWT integrada), Node.js (NestJS + Prisma, testado com Vitest) e Rust (Axum + SQLx). Um projeto instalado com o preset FastAPI anterior mantém o FastAPI. Esses padrões só se aplicam quando o projeto de destino não tem uma escolha estabelecida; uma edição com escopo definido não autoriza uma migração de stack.

**Regras principais:**
- Arquitetura limpa: sem lógica de negócio em route handlers
- Todas as entradas validadas com a biblioteca de validação do projeto
- Apenas consultas parametrizadas (nunca interpolação de string em SQL)
- JWT + Argon2id para auth (bcrypt aceitável apenas por compatibilidade legada); aplique rate limit aos endpoints de auth
- Async onde suportado; anotações de tipo em todas as assinaturas
- Exceções customizadas via módulo centralizado de erros
- Estratégia explícita de carregamento ORM, boundaries de transação, lifecycle seguro
- Os comandos de verificação são selecionados a partir do projeto (com preferência pelo bloco `verify:` de `stack/stack.yaml`) e executados somente quando o usuário ou o workflow ativo exige; verificações não executadas são reportadas

<!-- oma-docs:ignore-start -->
A referência de stack contém `stack.yaml` (a declaração estruturada e o contrato `verify:` que `oma verify agent backend` executa), `tech-stack.md`, `snippets.md` e `api-template.*`. O `/stack-set` gera um `stack/` específico do projeto a partir da base de código detectada.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Domínio:** Apps mobile multiplataforma e nativos (Flutter, React Native, Swift native iOS e Kotlin native Android).

**Quando usar:** Apps mobile nativos (iOS + Android), padrões de UI específicos mobile, funcionalidades de plataforma (câmera, GPS, push notifications), arquitetura offline-first; apps Swift native iOS usando SwiftUI e `swift-openapi-generator`.

**Arquitetura:** Clean Architecture: domain -> data -> presentation. Para Swift iOS: layout de projeto `App/Core/Features/Shared`. Para Kotlin Android: `app/{ui,data,di}` + `api-client`. A lógica de negócio nunca fica em widgets, views ou composables.

**Stacks tecnológicos:**
- Flutter/Dart: Riverpod/Bloc (gerenciamento de estado), Dio com interceptors (API), GoRouter (navegação), Material Design 3 (Android) + iOS HIG.
- React Native: Zustand + TanStack Query (estado), axios por trás de hooks do TanStack Query (API).
- Swift native iOS (iOS 17+): SwiftUI + `@Observable` (Observation framework), `swift-openapi-generator` da Apple para clientes de API, layout `App/Core/Features/Shared`.
- Kotlin native Android (API 26+): Jetpack Compose + Material 3, `@HiltViewModel` + `StateFlow`, clientes do OpenAPI Generator (`kotlin` / `jvm-ktor`) sobre Ktor com um engine OkHttp injetado, layout `app/{ui,data,di}` + `api-client`.

**Regras principais:**
- O gerenciamento de estado é a solução da variante (Flutter: Riverpod/Bloc; React Native: Zustand + TanStack Query; Swift: `@MainActor @Observable`; Kotlin: `@HiltViewModel` + `StateFlow`); sem setState bruto nem estado ad hoc para lógica complexa
- Liberar recursos com o ciclo de vida da plataforma: controllers do Flutter em `dispose()`, cleanups de effects no React Native, `.task {}` estruturado no Swift, `viewModelScope` no Kotlin
- Usar o transporte da plataforma com interceptação de auth/retry/logging; tratar offline graciosamente
- Meta de 60fps; cobrir todas as plataformas em que o app é distribuído
- Secrets ficam somente em armazenamento seguro (flutter_secure_storage, Keychain, react-native-keychain, armazenamento baseado no Android Keystore)
- E2E para fluxos críticos do usuário: Maestro (Flutter, React Native, Kotlin) ou XCUITest (Swift native)
- Testes e verificações E2E rodam somente quando o usuário ou o workflow ativo exige; builds rodam somente mediante pedido explícito
- Swift: usar `@Observable` em vez de `ObservableObject` no iOS 17+; gerar clientes de API a partir de specs OpenAPI via `swift-openapi-generator`
- Kotlin: chamar a `*Api` gerada para endpoints cobertos pela spec; o Ktor é uma camada agnóstica de engine, então o engine OkHttp é injetado onde o cliente é construído e o `MockEngine` o substitui nos testes

**Variantes de plataforma:** `variants/` fornece `flutter/`, `react-native/`, `swift-ios/` e `kotlin-android/`, cada um com `stack.yaml`, `tech-stack.md` e `snippets.md` (padrões de camada de dados, estado, tela e testes, incluindo o snippet de serviço de API ou de repositório), além do `stack.schema.json` compartilhado. O agente usa `stack/` quando ele existe e, caso contrário, lê diretamente o `variants/<platform>/` correspondente; o `/stack-set` grava `stack/` a partir do projeto detectado, tendo a variante como base. Uma skill instalada sem variante mantém seu diretório `variants/`.

---

### oma-db

**Domínio:** Arquitetura de banco de dados em SQL, NoSQL e bancos de dados vetoriais.

**Quando usar:** Design de schema, ERD, normalização, indexação, transações, planejamento de capacidade, estratégia de backup, design de migrações, arquitetura de vector DB/RAG, revisão de anti-padrões, design com consciência de conformidade (ISO 27001/27002/22301).

**Workflow padrão:** Explorar (identificar entidades, padrões de acesso, volume) -> Projetar (schema, restrições, transações) -> Otimizar (índices, particionamento, arquivamento, anti-padrões).

**Regras principais:**
- Escolher modelo primeiro, engine depois
- 3NF padrão para relacional; documentar tradeoffs BASE para distribuído
- Documentar todas as três camadas de schema: externa, conceitual, interna
- Integridade é de primeira classe: entidade, domínio, referencial, regra de negócio
- Concorrência nunca é implícita: definir boundaries de transação e níveis de isolamento
- Vector DBs são infraestrutura de recuperação, não fonte de verdade
- Nunca tratar busca vetorial como substituto direto de busca lexical

**Entregáveis obrigatórios:** Resumo do schema externo, schema conceitual, schema interno, tabela de padrões de dados, glossário, estimativa de capacidade, estratégia de backup/recuperação. Para vector/RAG: política de versão de embedding, política de chunking, estratégia de recuperação híbrida.

---

### oma-design

**Domínio:** Sistemas visuais, `DESIGN.md` e direção de redesign: decisões de tipografia, layout, cor, movimento e design de interação.

**Quando usar:** Definir ou alterar um sistema visual ou uma direção de design substancial, revisar uma UI existente ou refinar uma direção escolhida, extrair decisões de design de uma UI existente, de capturas de tela ou de referências fornecidas.

**Quando NÃO usar:** Implementar a UI da aplicação ou exportar tokens específicos de framework (use oma-frontend ou oma-mobile), planejar o escopo do produto (use oma-pm), gerar uma imagem (use oma-image), revisão geral de corretude ou de segurança (use oma-qa ou oma-security).

**Seleção de fornecedor:** A skill resolve a intenção de design do projeto e carrega uma skill de design externa por operação por meio de `resources/external-design-skills.md`:

| Operação | Fornecedor |
|-----------|----------|
| Direção visual para dashboards, painéis de administração, UI de produto SaaS ou ferramentas internas | Interface Design |
| Revisão pós-implementação de hierarquia, densidade, consistência ou acabamento de uma interface de produto | Interface Design `design-review` |
| Outra crítica de UI existente, auditoria técnica ou de acessibilidade, polimento ou extração de sistema | Impeccable |
| Outra direção de arte web nova ou uma reformulação visual autorizada | Taste |
| Tarefa apenas de documentação ou de contrato de tokens, sem novo julgamento visual | Permanece local |

**Workflow:** Inspecionar a UI, os artefatos de design e o brief e estabelecer escopo, plataforma, stack em uso, idiomas, preservação da marca e verificação -> selecionar e carregar o fornecedor -> aplicar o resultado à decisão ou ao artefato solicitado -> verificar o resultado afetado com `resources/checklist.md` e passar a implementação ao especialista de frontend ou mobile.

**Regras principais:**
- Reutilizar `.design-context.md` e `DESIGN.md` quando existirem; atualizar `DESIGN.md` somente quando o sistema visual mudar e criar `.design-context.md` somente quando uma etapa substancial de descoberta embasar a decisão
- Uma correção com escopo definido reutiliza a UI e os tokens afetados; não precisa de um documento de descoberta
- Para um site ou app existente, seguir `resources/redesign-protocol.md` e classificar entre Preserve e Overhaul antes de propor
- Manter marca, conteúdo, URLs, navegação, contratos de formulário, analytics e textos legais existentes dentro do escopo autorizado
- Manter as fontes em uso quando forem adequadas; para ko/ja/zh, verificar cobertura de glifos, fallback, quebra de linha e métricas legíveis
- WCAG AA é a meta de acessibilidade padrão, ou a meta mais rigorosa do projeto; os requisitos de responsividade, de movimento reduzido e de plataforma são repassados ao fornecedor selecionado
- Usar assets e afirmações reais do projeto; rotular conceitos e placeholders
- Manter a stack de implementação existente; o especialista de implementação é o responsável por CSS, Tailwind, sintaxe de biblioteca de componentes e dependências
- Operações apenas de revisão permanecem somente leitura
- Perguntar apenas sobre a escolha relevante ainda não resolvida; um fornecedor solicitado explicitamente que esteja indisponível é reportado, não substituído

**Saída:** A decisão de design, os achados ou o handoff de implementação solicitados, com a evidência observada, o fornecedor e a operação selecionados e os limites de capacidade ou de verificação. `DESIGN.md` e `.design-context.md` são gravados somente quando as condições acima se aplicam. Stitch e getdesign são entradas opcionais.

---

### oma-tf-infra

**Domínio:** Infraestrutura como código com Terraform, multi-cloud.

**Quando usar:** Provisionamento em AWS/GCP/Azure/Oracle Cloud, configuração Terraform, autenticação CI/CD (OIDC), CDN/load balancers/storage/networking, gerenciamento de estado, infraestrutura de conformidade ISO.

**Detecção de cloud:** Lê providers e prefixos de recursos do Terraform (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Inclui tabela completa de mapeamento de recursos multi-cloud.

**Regras principais:**
- Agnóstico de provider: detectar cloud a partir do contexto do projeto
- Estado remoto com versionamento e locking
- OIDC-first para auth CI/CD
- Plan antes de apply sempre
- IAM de menor privilégio
- Taguear tudo (Environment, Project, Owner, CostCenter)
- Sem secrets no código
- Fixar versão de todos os providers e módulos
- Sem auto-approve em produção

---

### oma-dev-workflow

**Domínio:** Automação de tarefas monorepo e CI/CD.

**Quando usar:** Executar dev servers, executar lint/format/typecheck entre apps, migrações de banco de dados, geração de API, builds i18n, builds de produção, otimização de CI/CD, validação pre-commit e configuração de ferramentas de lint, format e typecheck específicas de linguagem, lint de Dockerfile e commitlint.

**Regras principais:**
- Usar tarefas `mise run` em vez de comandos diretos do gerenciador de pacotes; descobri-las com `mise tasks --all` e ler a definição de uma tarefa desconhecida antes de executá-la
- Executar lint e test no escopo alterado; CI deve pular apps não alterados
- Validar mensagens de commit com commitlint por meio de um hook `commit-msg` provisionado localmente; nunca baixar pacotes a partir de um Git hook
- Manter as tarefas de checagem sem mutação: expor `lint`, `format:check` e `typecheck` e manter separado o `format`, que altera arquivos
- Uma validação pulada não é uma aprovação; um verificador que não consegue rodar é reportado como incompleto, não substituído por um placeholder ou por um build
- Preferir testes herméticos; testes que precisam de Docker ou de serviços externos pertencem a uma tarefa de integração separada e opt-in, fora dos hooks padrão e dos gates de CI obrigatórios
- Nunca fazer hardcode de secrets em `mise.toml`; nunca executar tarefas destrutivas sem confirmação

**Recursos:** `mise-basics.md`, `tooling-profiles.md`, `validation-pipeline.md`, `example-task-wiring.md` (migrações, infraestrutura Docker local opcional, geração de cliente de API, builds i18n), `release-coordination.md` e `troubleshooting.md`, cada um carregado em seu gatilho declarado.

---

### oma-observability

**Domínio:** Roteador de observabilidade e rastreabilidade baseado em intenção, através de camadas, fronteiras e sinais.

**Quando usar:**
- Configuração de pipeline: OTel SDK + Collector + backend de vendor
- Rastreabilidade através de fronteiras de serviço e domínio: propagadores W3C, baggage, multi-tenant, multi-cloud
- Ajuste de transporte: limiares UDP/MTU, OTLP gRPC vs HTTP, topologia Collector DaemonSet vs sidecar, receitas de sampling
- Forense de incidentes: localização em 6 dimensões (code / service / layer / host / region / infra)
- Seleção de categoria de vendor: OSS full-stack vs SaaS comercial vs especialista em alta cardinalidade vs especialista em profiling
- Observability-as-code: dashboards Grafana Jsonnet, CRD PrometheusRule, YAML OpenSLO, alertas SLO burn-rate
- Meta-observabilidade: saúde própria do pipeline, desvio de relógio, guardrails de cardinalidade, matriz de retenção
- Cobertura de sinais MELT+P: metrics, logs, traces, profiles, cost, audit, privacy
- Migrações de pipeline de logs avaliadas com base no suporte upstream atual e nos requisitos do projeto

**Quando NÃO usar:** Observabilidade de LLM ops / gen_ai (use Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage de pipeline de dados (OpenLineage + Marquez, dbt test, Airflow lineage), telemetria de camada física IoT / datacenter (Nlyte, Sunbird, Device42), orquestração de chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), infraestrutura GPU / TPU (NVIDIA DCGM Exporter), cadeia de suprimento de software (sigstore, in-toto, SLSA), workflow de resposta a incidentes / paging (PagerDuty, Jira Service Management, Grafana Cloud IRM), inspeção completa de pacotes TLS, scan de segurança ou testes de penetração (use oma-security; esta skill cobre apenas telemetria de segurança), configuração de único vendor já coberta pela skill própria daquele vendor.

**Regras principais:**
- Classificar intenção antes de rotear: setup | migrate | investigate | alert | trace | tune | route
- Carregar recursos conforme seus gatilhos: o protocolo de execução, o único guia que a rota de intenção seleciona e, depois, um guia de camada, fronteira, sinal ou transporte somente quando seu gatilho estiver presente. Nenhuma referência é pré-carregamento obrigatório
- Usar `resources/vendor-categories.md` somente quando for preciso selecionar categoria ou delegar a um vendor; delegar a skills próprias do vendor em vez de duplicar a documentação do vendor
- Carregar o único guia de transporte que corresponde ao problema observado: UDP/MTU, protocolo OTLP, topologia do Collector ou sampling
- Antes de declarar uma configuração completa, verificar a saúde do pipeline, a sincronização de relógio, os limites de cardinalidade e a retenção em relação aos requisitos do projeto e registrar as verificações que não puderam ser executadas
- Verificar o suporte upstream atual, a estabilidade de atributos e as orientações de migração na documentação oficial e no status da CNCF quando afetarem a recomendação. Os arquivos de recursos não fixam versões de spec por arquivo; `resources/standards.md` contém a única declaração sobre a atualidade da spec e das semconv
- W3C Trace Context como propagador padrão, com as traduções por cloud de `resources/boundaries/cross-application.md` quando necessário
- Aplicar a redação de PII e os controles de baggage cientes de sampling na coleta; verificar os requisitos de retenção, apagamento e auditoria do sistema de destino
- Entregar configuração funcional ou propostas rotuladas explicitamente; scaffolds e verificações não confirmadas não contam como configuração concluída

A matriz de cobertura tem quatro camadas (L3, L4, mesh, L7), quatro fronteiras (multi-tenant, cross-application, SLO, release) e sete sinais (metrics, logs, traces, profiles, cost, audit, privacy).

---

### oma-qa

**Domínio:** Garantia de qualidade, cobrindo segurança, performance, acessibilidade e qualidade de código.

**Quando usar:** Revisão final antes do deploy, auditorias de segurança, análise de performance, conformidade de acessibilidade, análise de cobertura de testes.

**Quando NÃO usar:** Scans conduzidos por scanners, testes de penetração, validação de achados ou gates de CI de segurança (use oma-security), implementação inicial e novas funcionalidades (use os agentes de domínio).

**Ordem de prioridade da revisão:** Segurança > Performance > Acessibilidade > Qualidade de Código.

**Níveis de severidade:**
- **CRITICAL**: Brecha de segurança, risco de perda de dados
- **HIGH**: Bloqueia lançamento
- **MEDIUM**: Corrigir neste sprint
- **LOW**: Backlog

**Regras principais:**
- Cada achado deve incluir arquivo:linha, descrição e correção
- Selecionar as verificações automatizadas que correspondem à stack detectada e ao escopo da revisão (por exemplo, uma auditoria de dependências, análise estática de segurança ou uma auditoria de performance em runtime); revisar estaticamente quando uma ferramenta ou um alvo não estiver disponível
- Executar os comandos de lint, teste e cobertura do projeto quando o pedido de revisão ou o workflow ativo exigir essa evidência; caso contrário, reportá-los como não executados
- Cada achado de defeito deve ser reproduzível; hipóteses e verificações indisponíveis são registradas como lacunas de verificação, e nenhum PASS é emitido enquanto verificações obrigatórias continuarem sem verificação
- Os achados de segurança aqui são achados de revisão de código; candidatos de scanner, prova de exploit e as disposições `confirmed` / `needs_validation` pertencem ao oma-security
- Fornecer código de correção, não apenas descrições

---

### oma-debug

**Domínio:** Diagnóstico e correção de bugs.

**Quando usar:** Bugs reportados por usuários, crashes, problemas de performance, falhas intermitentes, race conditions, bugs de regressão.

**Metodologia:** Reproduzir primeiro, depois diagnosticar. Nunca adivinhar correções.

**Regras principais:**
- Identificar causa raiz, não apenas sintomas
- Correção mínima: alterar apenas o necessário
- Cada correção recebe um teste de regressão; reexecutá-lo com a verificação que falhava originalmente (vermelho antes da correção, verde depois)
- Executar suítes mais amplas somente quando o usuário ou o workflow ativo exigir; caso contrário, reportá-las como não executadas
- Buscar padrões similares em outros lugares
- Documentar o bug em `.agents/results/bugs/`: o relatório condensado de `resources/debugging-checklist.md` ou o `resources/bug-report-template.md` completo para bugs Complex ou CRITICAL/HIGH

**Ferramentas de inteligência de código usadas (Gortex ou Serena):**
- `find_symbol("functionName")` ou a navegação de símbolos do Gortex: localizar a função
- `find_referencing_symbols("Component")` ou a análise de impacto do Gortex: encontrar todos os usos
- `search_for_pattern("error pattern")` ou a busca do Gortex: encontrar problemas similares

---

### oma-translation

**Domínio:** Tradução multilíngue com consciência de contexto.

**Quando usar:** Traduzir strings de UI, documentação, textos de marketing, revisar traduções existentes, criar glossários.

**Método de tradução:** Quatro etapas: ler o significado e a sintaxe protegida, escolher o registro, reconstruir no idioma de destino e preservar o estilo do autor onde ele for pertinente. A verificação é proporcional ao risco do conteúdo: a sintaxe protegida e a estrutura são sempre verificadas; conteúdo substancial e o modo de revisão também usam a rubrica (naturalidade, precisão, registro, terminologia, integridade técnica).

**Regras principais:**
- Escanear arquivos de locale existentes primeiro para corresponder às convenções
- Traduzir significado, não palavras
- Preservar conotações emocionais
- Nunca produzir traduções palavra por palavra
- Nunca misturar registros dentro de um texto
- Preservar terminologia específica de domínio como está

---

### oma-orchestration

**Domínio:** Coordenação automatizada multiagente via CLI spawning.

**Quando usar:** Funcionalidades complexas requerendo múltiplos agentes em paralelo, execução automatizada, implementação full-stack.

**Padrões de configuração:**

| Configuração | Padrão | Descrição |
|--------------|--------|-----------|
| MAX_PARALLEL | 3 | Máximo de subagentes concorrentes |
| MAX_RECOVERY_ATTEMPTS | 3 | Total de novas tentativas e hipóteses de exploração por tarefa, incluindo a tentativa original |
| POLL_INTERVAL | backoff limitado | Fallback usado apenas quando as notificações de conclusão não estão disponíveis (subagentes nativos do Claude Code retornam de forma síncrona) |

Estes são padrões do workflow; as configurações de modelo, vendor, paralelismo e orçamento são resolvidas a partir da configuração do projeto.

**Fases do workflow:** Plan → References (selecionar referências por tarefa) → Setup (artefatos de sessão e de task board) → Execute (despachar tarefas prontas dentro de MAX_PARALLEL) → Monitor → Verify (loop de revisão) → Collect (claims e relatórios com escopo de execução).

**Referências de tarefa:** Cada tarefa é comparada com as assinaturas de intenção das skills instaladas, e o coordenador seleciona as referências de que ela precisa. Uma skill correspondida com confiança é suficiente; o conjunto só se amplia quando a classificação é incerta ou quando uma dependência exige outro domínio. A seleção e o motivo são registrados no task board como notas do coordenador; o launcher não os impõe.

**Loop de revisão agente-para-agente:** veja [Fluxo de orquestração](#orchestration-flow) para o diagrama e os limites do loop.

**Evidência de sessão:** Registra correções relevantes e achados de revisão julgados quando útil, com causa, impacto e verificação. Não há pontuação de penalidade nem pausa acionada por pontuação.

---

### oma-scm

**Domínio:** Gerenciamento de configuração de software (SCM) e Git, cobrindo branching, merges, worktrees, baselines, prontidão para auditoria e Conventional Commits.

**Quando usar:** Após mudanças de código (`/scm`), conflitos de merge, estratégia de branches, releases/tags ou qualquer questão de CM do repositório.

**Tipos de commit:** feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert.

**Workflow (commits):** Analisar mudanças → Dividir por funcionalidade quando necessário → tipo → escopo → descrição (imperativo, menos de 72 caracteres, minúscula, sem ponto final) → fazer commit com caminhos explícitos.

**Regras:**
- Não usar `git add -A` ou `git add .` sem autorização explícita
- Nunca commitar arquivos de secrets
- Sempre especificar arquivos ao fazer staging
- Escrever a mensagem em um arquivo e fazer commit com `git commit -F <message-file>`
- Não reescrever histórico compartilhado sem autorização explícita; usar `--force-with-lease`, nunca `--force` simples
- Trailers de coautoria só são incluídos quando a configuração efetiva `scm.co_author` os habilita e fornece nome e e-mail.

---

### oma-coordination

**Domínio:** Regras de coordenação compartilhadas para trabalho multiagente: reutilização de plano, alinhamento de contratos, propriedade de workspace e handoff para QA.

**Quando usar:** Qualquer workflow que despacha mais de um agente especialista. `/work`, `/orchestrate` e `/ultrawork` carregam esta skill e aplicam seus guardrails. Use-a também para coordenação manual, passo a passo, em que você conduz cada dispatch, e quando agentes compartilham um contrato de API ou de dados.

**Quando NÃO usar:** Tarefas de domínio único (usar o agente de domínio diretamente). O dispatch, o monitoramento e a verificação automatizados pertencem ao oma-orchestration; esta skill fornece apenas as regras que ele aplica.

**Regras principais:**
- Reutilizar um plano válido; chamar oma-pm somente quando a decomposição ou os contratos precisarem mudar
- Spawnar em paralelo tarefas independentes do mesmo tier de prioridade, cada uma em seu próprio workspace ou com `--isolation worktree`
- Atualizar os contratos das fronteiras de API alteradas antes do trabalho dependente de frontend ou mobile
- A revisão de QA é sempre a etapa final
- Encaminhar defeitos bloqueantes de QA e lacunas de verificação obrigatória de volta ao agente responsável e, em seguida, executar novamente as verificações afetadas

**Workflow:** Plano (reutilizar ou PM) → Spawn por tier de prioridade → Monitorar → Revisão de QA → Corrigir problemas → Entregar.

**Diferença para oma-orchestration:** A coordination fornece as regras e guia uma execução manual em que o usuário controla o ritmo; o orchestrator é o responsável pela execução automatizada (resolução de dispatch, limite de paralelismo, orçamento de recuperação e loop de revisão).

---

### oma-search

**Domínio:** Roteador de busca para fontes externas. Ele seleciona o canal de que uma solicitação precisa e retorna fontes com evidências de suporte e limites de recuperação.

**Rotas:**

| Rota | Execução | Escopo |
|-------|-----------|-------|
| `docs` | Resolução de bibliotecas e consultas no Context7; descoberta do site oficial quando necessário | Documentação oficial dentro das restrições de versão solicitadas |
| `web` | O `providers.web` configurado: ferramentas do runtime para `native`, um adaptador de CLI para `brave` ou `exa` | Descobrir URLs relevantes para uma consulta |
| `code` | `oma search code` pelo host de código selecionado (`gh` ou `glab`) | Correspondências de implementação remotas dentro das restrições de host e repositório |
| `fetch` | Um leitor de URL disponível ou `oma search fetch <url>` | Ler uma URL já fornecida ou descoberta |

**Quando usar:** Documentação de bibliotecas, pesquisa web, busca de código remoto, leitura de URLs conhecidas e solicitações cujo canal de fonte externa precisa ser selecionado. Outras skills a usam para obter fontes externas.

**Quando NÃO usar:** Exploração somente local do código (use diretamente a inteligência de código configurada), análise de histórico ou blame do Git (use oma-scm), análise de arquitetura (use oma-architecture).

**Regras principais:**
- `--docs`, `--code` ou `--web` explícitos selecionam a rota; caso contrário, a skill seleciona uma rota primária e usa `resources/intent-rules.md` somente quando a seleção não é clara
- Outra rota só é adicionada quando a lacuna de evidência restante exige; a skill não faz fan-out por padrão
- `--strict` exige fontes primárias ou oficiais adequadas, com conteúdo de suporte inspecionado; `--wide` inclui resultados mais amplos com suas limitações; `--gitlab` seleciona o GitLab como host de código
- Os resultados trazem a URL da fonte ou a referência de arquivo, a rota, o provider efetivo, o tipo de fonte, o status de leitura do conteúdo, as evidências de suporte e as limitações relevantes
- Snippets e trechos de busca são evidência limitada; fontes não lidas são identificadas
- Sem pontuações de confiança fabricadas: um nome de provider ou um rótulo de domínio não verifica uma afirmação individual. `oma search trust <domain>` é um diagnóstico de domínio opcional, e `resources/source-provenance.md` se aplica quando a procedência precisa de interpretação
- Um provider web indisponível, não autenticado ou com rate limit é reportado; uma escolha explícita de provider não é substituída silenciosamente pela busca nativa
- Uma busca sem URLs candidatas é refinada dentro das restrições originais ou reportada como sem resultado; a recuperação de URLs não substitui resultados de busca ausentes
- Quando nenhuma fonte atende a `--strict`, a lacuna é reportada; um conjunto de resultados mais amplo não satisfaz a solicitação estrita
- Nada é instalado automaticamente: nenhum provider, navegador ou dependência

---

### oma-recap

**Domínio:** Análise de histórico de conversas em várias ferramentas de IA (Claude, Codex, Gemini, Antigravity, Qwen, Cursor, Grok) com resumos de trabalho temáticos diários/periódicos.

**Quando usar:** Resumir um dia ou período de atividade de trabalho, compreender o fluxo de trabalho em várias ferramentas de IA, analisar padrões de troca de ferramentas entre sessões, preparar standups diários / retros semanais / registros de trabalho.

**Quando NÃO usar:** Retrospectiva de mudanças de código baseada em commits Git (use `oma retro`), monitoramento de agentes em tempo real (use `oma dashboard terminal`), métricas de produtividade (use `oma stats get`).

**Processo:**
1. Resolver data ou janela de tempo a partir de entrada em linguagem natural (today, yesterday, last Monday, data explícita)
2. Obter os dados da conversa com `oma recap --date YYYY-MM-DD --json` para um dia do calendário ou `oma recap --window 7d --json` para uma janela móvel (`1d`, `3d`, `7d`, `2w`, `30d`); restrinja com `--tool`
3. Agrupar por conteúdo (projetos e temas), não por ferramenta; uma janela de 3 dias ou mais agrupa por projeto em vez de por dia
4. Extrair temas (funcionalidades trabalhadas, bugs corrigidos, ferramentas exploradas)
5. Renderizar resumo temático diário/periódico

---

### oma-hwp

**Domínio:** Conversão de HWP / HWPX / HWPML (processador de texto coreano) para Markdown usando `kordoc`.

**Quando usar:** Converter documentos HWP coreanos (`.hwp`, `.hwpx`, `.hwpml`) para Markdown, preparar documentos governamentais/empresariais coreanos para contexto de LLM ou RAG, extrair conteúdo estruturado (tabelas, cabeçalhos, listas, imagens, notas de rodapé, hyperlinks) de HWP.

**Quando NÃO usar:** Arquivos PDF (use oma-pdf), XLSX/DOCX (fora de escopo), gerar/editar HWP (fora de escopo), arquivos já em texto (use a ferramenta Read diretamente).

**Regras principais:**
- Use `bunx kordoc@latest` para executar (nenhuma instalação necessária); sempre passe `@latest` ou uma versão fixada
- O formato de saída padrão é Markdown
- Se nenhum diretório de saída for especificado, a saída vai para o mesmo diretório da entrada
- O kordoc cuida da preservação de estrutura (cabeçalhos, tabelas, tabelas aninhadas, notas de rodapé, hyperlinks, imagens)
- As defesas de segurança (ZIP bomb, XXE, SSRF, XSS) são fornecidas pelo kordoc; não adicione as suas próprias
- Para HWP criptografados ou bloqueados por DRM, reporte claramente a limitação ao usuário
- Pós-processe com `resources/flatten-tables.ts` para converter blocos HTML `<table>` em tabelas pipe GFM e remover caracteres da Private Use Area da fonte Hancom

---

### oma-pdf

**Domínio:** Conversão de PDF para Markdown usando `opendataloader-pdf`.

**Quando usar:** Converter documentos PDF para Markdown para contexto de LLM ou RAG, extrair conteúdo estruturado (tabelas, cabeçalhos, listas) de PDFs, preparar dados PDF para consumo por IA.

**Quando NÃO usar:** Gerar/criar PDFs (use ferramentas documentais apropriadas), editar PDFs existentes (fora de escopo), leitura simples de arquivos já em texto (use a ferramenta Read diretamente).

**Regras principais:**
- Use `uvx opendataloader-pdf` para executar (nenhuma instalação necessária)
- O formato de saída padrão é Markdown
- Se nenhum diretório de saída for especificado, a saída vai para o mesmo diretório do PDF de entrada
- Preserve a estrutura do documento (cabeçalhos, tabelas, listas, imagens)
- Para PDFs escaneados, use o modo híbrido com OCR
- Sempre execute `uvx mdformat` na saída para normalizar a formatação Markdown
- Valide se o Markdown de saída é legível e bem estruturado
- Reporte quaisquer problemas de conversão (tabelas ausentes, texto distorcido) ao usuário

---

### oma-academic-writing

**Domínio:** Prosa acadêmica em inglês, pronta para publicação: redigir, revisar e auditar ensaios, relatórios, seções de análise, resumos executivos, conclusões e revisões de literatura.

**Quando usar:** Redigir ou revisar relatórios e seções de análise acadêmica, escrever resumos executivos, conclusões ou revisões de literatura, reescrever prosa com aparência de IA em inglês natural, polir um texto para qualidade de topo (HD, A, top-band) e revisar variedade de frases, qualidade verbal, modalização e conformidade anti-IA.

**Quando NÃO usar:** Tradução (use oma-translation), descoberta de fontes, coleta de citações ou busca bibliográfica (use oma-scholar), documentação de código/README/texto de referência de API (use a skill de domínio correspondente), texto informal ou de marketing e escrita acadêmica que não seja em inglês (redija em inglês e depois encaminhe para oma-translation).

**Modos:** `draft` (título + prosa + Writing Notes + Claim-Evidence Map), `revise` (original + revisão + lista de mudanças), `review` (relatório PASS/FAIL de conformidade sobre estrutura de frases, qualidade verbal, anti-IA, especificidade, modalização, clareza de parágrafos, ritmo e alinhamento entre alegações e evidências).

**Regras principais:**
- Cite as restrições da rubrica fornecida antes de julgar a conformidade; sem rubrica, explique os achados em relação ao escopo solicitado em vez de inventar critérios
- Toda frase deve ser verificável; nunca invente dados, estatísticas ou citações
- Escolha os verbos pelo significado exato e pelo suporte que têm (`resources/academic-verb-guide.md`); mantenha um verbo comum quando ele for preciso e natural
- Revise estruturas repetidas e a extensão das frases no contexto (`resources/sentence-structure-reference.md`); mude o ritmo onde isso melhorar a clareza, sem cotas por tipo de frase
- Ajuste a força da modalização à força da evidência conforme `resources/hedging-guide.md`, incluindo os limites que ele define para intensificadores e marcadores de opinião em primeira pessoa
- Cada alegação deve apontar para evidência no Claim-Evidence Map; enfraqueça ou remova alegações sem suporte

**Workflow:** 6 etapas — READ a rubrica e o rascunho e cite as restrições, PLAN parágrafos como Topic-Support-Conclude, DRAFT conforme as orientações de frases, verbos e modalização, AUDIT com a checklist anti-IA, REVERSE-OUTLINE e construa o Claim-Evidence Map, POLISH com coesão, especificidade, contagem de palavras, ritmo e variação na extensão dos parágrafos.

---

### oma-security

**Domínio:** Scan e validação de segurança para código-fonte de aplicações, pacotes de skills de agentes e componentes MCP. Testes de penetração de um deploy de teste web com escopo definido rodam somente em uma plataforma de execução fornecida e revisada pelo usuário.

**Quando usar:** Fazer scan de um repositório ou de um diff de código-fonte; inspecionar um pacote de skill, um servidor MCP ou uma configuração; executar um teste de penetração de runtime delimitado contra um deploy de teste concreto e autorizado, em uma plataforma de execução que você fornece e já revisou; validar candidatos apontados por scanners; configurar um gate de CI específico de um engine; resolver problemas de credenciais, cobertura, matchers, cota ou estado retomável de um scanner.

**Quando NÃO usar:** Revisão ampla de corretude, performance, acessibilidade ou qualidade (use oma-qa), comparação de ferramentas ou pesquisa sem execução (use oma-search), decisões de arquitetura de segurança (use oma-architecture), correção no código do produto (use oma-debug ou a skill responsável de backend/frontend/mobile/infraestrutura).

**Engine padrão por alvo:**

| Alvo | Engine padrão |
|--------|----------------|
| Código-fonte da aplicação ou diff de código-fonte | Deepsec (Cisco AI Deep SAST quando selecionado explicitamente) |
| Diretório ou pacote de skill de agente | Cisco Skill Scanner |
| Código-fonte, configuração ou servidor MCP | Cisco MCP Scanner |
| Deploy de teste web (`web_runtime`, `pentest`) | Nenhum por padrão. ARTEX somente mediante pedido explícito, em uma plataforma fornecida e revisada pelo usuário |
| Reprodução local delimitada | Método de validação da Cloudflare (sem rede externa) |

**Regras principais:**
- Um scan geral de repositório seleciona apenas o código-fonte; scans de skill, MCP e runtime não são adicionados por implicação
- O teste de runtime não tem engine embutido nem padrão. Um pedido de runtime ou de código-fonte mais runtime não seleciona o ARTEX por implicação, e a skill não instala, compila nem implanta uma plataforma ARTEX. Sem um pedido explícito de ARTEX, um deploy de teste web concreto e uma plataforma revisada, a etapa de runtime é registrada como `skipped` e as demais operações selecionadas continuam
- Um resultado com falha ou vazio nunca seleciona automaticamente outro engine, modelo ou analisador pago
- Preserve e retome o estado existente de `.deepsec/`; nunca reinicialize para apagar uma execução com falha ou ruidosa
- Uma chave ou ferramenta instalada não autoriza chamadas pagas nem um escopo mais amplo; reutilize a autorização existente conforme a política de execução compartilhada
- Cada candidato único vai para um verificador novo que não o descobriu; `confirmed` exige prova observada de forma independente
- Nenhum resultado estabelece que um alvo é seguro; um gate não pode passar enquanto verificações obrigatórias estiverem incompletas

**Saída:** um `.agents/results/security/<run-id>/` por invocação com `run.json`, `findings.json` e `report.md` (além de `runtime.json` para execuções de runtime web e `gate.json` para CI).

---

### oma-docs

**Domínio:** Manutenção da documentação em quatro modos: `verify` (referências quebradas; regenera `docs/generated/doc-refs.json`), `sync` (documentos que referenciam arquivos alterados em um diff), `i18n` (deriva de tradução) e `lint` (problemas de estilo em documentos traduzidos).

**Quando usar:** Depois de uma refatoração, renomeação ou remoção de arquivo, para encontrar referências obsoletas nos documentos; antes de uma release, para confirmar que comandos CLI, caminhos de arquivo e chaves de configuração ainda existem; depois de um git diff importante, para localizar documentos que referenciam arquivos alterados; verificações rotineiras de deriva de tradução.

**Quando NÃO usar:** Pesquisa geral de código-fonte (use oma-search), implementação de aplicação (use o especialista responsável), tradução de texto conhecido (use oma-translation).

**Regras principais:**
- Pedidos apenas de revisão produzem propostas; um pedido de edição com escopo já existente autoriza aplicar essas correções sem nova aprovação por arquivo
- A CLI emite dados estruturados; o host LLM faz a síntese e o rascunho dos patches. Não invente achados da CLI nem chame uma API de LLM de vendor a partir da CLI de docs
- Arquivos com secrets (`.env*`, chaves privadas, credenciais) nunca aparecem em relatórios de diff nem em patches
- Respeite blocos de ignore, `oma-docs: skip` e as exclusões configuradas
- A verificação de URLs é delegada ao `lychee` (opcional); o hook de workflow só roda quando `docs.auto_verify` está habilitado e apenas emite avisos

**Workflow:** `oma docs verify --json`, `oma docs sync <range> --json`, `oma docs i18n --json` ou `oma docs lint --json` → inspecionar os resultados estruturados → verificar cada correção em relação ao código atual → aplicar as correções autorizadas → executar novamente as verificações afetadas. `verify` sai com 0 quando está limpo e com 1 quando encontra referências quebradas.

---

### oma-explanation

**Domínio:** Explicações em HTML offline e autocontidas em dois modos: modo de mudança (um diff, PR, branch ou intervalo de commits, com contexto, intuição, percurso pelo código e um quiz de cinco perguntas) e modo de tema (um conceito, sistema ou pergunta como uma folha visual de uma página).

**Quando usar:** Explicar um diff, pull request, branch ou intervalo de commits, ou um tema, sistema ou pergunta, como uma única página HTML que funciona offline.

**Workflow:** O modelo escreve um rascunho em Markdown; `oma explain render` o transforma em um único arquivo HTML em `.agents/results/explain/{YYYY-MM-DD}-{slug}.html`, e `oma explain validate` o verifica (corrigir e validar novamente no máximo 3 vezes). A página é aberta com `oma explain render --open`; uma abertura que falha não conta como falha. A ativação ocorre apenas por `/explain`, pela menção do nome da skill ou por delegação; a skill fica fora das dicas por palavra-chave.

**Quando NÃO usar:** Uma página documental comum, implementação de recurso em andamento ou deck de slides (use `oma-slide` para apresentações).

---

### oma-image

**Domínio:** Geração de imagens de IA com dispatch paralelo entre vendors e consciência de autenticação (Codex `gpt-image-2`, modelos da família Gemini “nano-banana” do Antigravity via `agy`, com o modelo exato selecionado internamente, Pollinations flux/zimage).

**Quando usar:** Gerar imagens, assets visuais, ilustrações, fotos de produto, concept art ou mockups; comparar saídas de vários modelos de imagem para o mesmo prompt; produzir imagens a partir de prompts em workflows de edição.

**Quando NÃO usar:** Editar uma imagem existente ou manipular fotos, gerar vídeos ou áudio (use oma-video/oma-voice), compor vetores/SVG estruturados em linha ou apenas redimensionar/converter assets.

**Regras principais:**
- Resolva o brief: use os detalhes fornecidos e padrões criativos razoáveis e pergunte somente quando uma escolha ausente mudar o resultado de forma relevante. Um prompt ampliado não precisa de aprovação separada quando a geração já está autorizada
- Dispatch com autenticação: execute apenas vendors autenticados; com `--vendor all`, todos os vendors solicitados precisam estar disponíveis
- Proteção de custo: confirme antes de execuções com custo estimado ≥ $0.20 (`--yes`/`OMA_IMAGE_YES=1` ignora essa etapa); `pollinations` e `antigravity` são gratuitos por padrão
- Segurança de caminho: saídas fora de `$PWD` exigem `--allow-external-output`; `n` máximo = 5
- Saídas registradas: toda execução grava `manifest.json` junto às imagens com prompt, vendor/modelo, entradas e metadados do artefato. Isso registra dados de reprodutibilidade, mas não promete pixels idênticos.
- Encaminhe automaticamente imagens de referência anexadas com `--reference <path>` (codex/antigravity)
- As configurações do projeto ficam em `image:` no `.agents/oma-config.yaml`; os padrões distribuídos ficam na CLI

**Workflow:** PREPARE (resolva o brief e escolha o vendor) → ACQUIRE (valide autenticação, referências e caminho de saída) → ACT (`oma image generate`) → VERIFY (manifesto, arquivos e código de saída) → FINALIZE (caminhos de saída e avisos).

---

### oma-market

**Domínio:** Pesquisa de mercado por sinais comunitários: extração de pain points, detecção de tendências, posicionamento de concorrentes e descoberta. A pesquisa roda no mecanismo upstream [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web e outros), que é instalado como skill por meio da skills CLI.

**Quando usar:** Extrair pain points reais de posts da comunidade, detectar tendências em uma categoria em janelas de 7/30/90/180 dias, analisar sentimento de concorrentes e posicionamento com SWOT/Porter 5F, fazer descoberta aberta (`--discover`), pesquisar pessoas, empresas ou tickers, identificar sinais de contratação e executar investigações de acompanhamento.

**Quando NÃO usar:** Pesquisa web geral sem enquadramento de mercado (use oma-search diretamente), literatura acadêmica (use oma-scholar), dashboards ao vivo ou monitoramento agendado (encapsule esta skill em `oma schedule <action>`).

**Regras principais:**
- Execute detect-trap primeiro: nunca rode o mecanismo sem preflight (`--force` somente após reconfirmação explícita do usuário)
- Um mecanismo, instalado como skill: `oma market resolve` lê a instalação feita pela skills CLI (ou uma versão fixada); `oma market update` o instala quando falta e o atualiza nos demais casos, depois que o usuário concorda
- Siga literalmente o `SKILL.md` do mecanismo resolvido; a única substituição é `oma market run <args>` no lugar da chamada bruta `python3 scripts/last30days.py`
- Nunca use somente WebSearch: sem mecanismo, sem Python 3.12+ ou com saída diferente de zero, pare e informe
- Fontes que exigem chave só são ativadas pelo assistente de configuração upstream com consentimento do usuário; fontes ignoradas continuam visíveis no rodapé
- Frameworks citam somente clusters do mecanismo. O badge do mecanismo é a primeira linha; o brief candidato é gravado primeiro e, depois, as LAWs 1–8 upstream e a auto-verificação de `resources/output-laws.md` precisam passar no arquivo gravado antes da entrega
- Um único brief por execução em `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; frameworks alternam automaticamente por intenção (pain/trend → SWOT, competitor → SWOT + Porter 5F, discovery → SWOT + PESTEL)

**Workflow:** detect-trap → `oma market resolve` → leia o SKILL.md upstream → etapas upstream de pré-pesquisa (assistente de configuração, resolução de handle/subreddit, plano de consultas) → `oma market run … --emit=compact` → sintetize conforme o OUTPUT CONTRACT upstream → adicione as seções de frameworks entre o corpo do mecanismo e o rodapé do mecanismo → grave → faça a auto-verificação do arquivo gravado, corrija e verifique novamente.

---

### oma-refactor

**Domínio:** Refatoração que preserva comportamento: reestruturação incremental segura com foco em code smells/SATD/hotspots, redes de testes de caracterização e commits apenas de refatoração.

**Quando usar:** Executar refatoração em arquivos ou módulos específicos (extrair, mover, renomear, decompor, alinhar idioma), refatoração preparatória antes de uma funcionalidade, recuperar um legado/brownfield (descoberta de seams e testes de caracterização), selecionar alvos por hotspot (churn × complexidade) ou auditar se o código está seguro para refatorar agora.

**Quando NÃO usar:** Corrigir um bug reportado ou comportamento que falha (use oma-debug; refatoração não deve mudar comportamento), auditar segurança/performance/acessibilidade (use oma-qa), definir design de sistema/limites de módulos/ADRs (use oma-architecture), projetar schema ou mecânicas de migração de DB (use oma-db), dividir ou preparar commits (use oma-scm) ou otimizar performance como objetivo.

**Regras principais:**
- Preservação de comportamento: o contrato do consumidor, atento à Lei de Hyrum, é inviolável; tuning é efeito colateral, nunca objetivo
- Verificável: nunca reestruture sem uma rede de segurança; se ela faltar ou for fraca, escreva primeiro testes de caracterização (golden-master) em commits separados
- Incremental: uma transformação nomeada por commit; em falhas repetidas use Mikado (registre o pré-requisito, reverta completamente e recorra)
- Separado (dois chapéus): nunca misture mudanças de comportamento em commits de refatoração (somente commits com tipo `refactor:`)
- Econômico: legibilidade é o objetivo dominante; não refatore código que será removido nem código frio com pouco churn
- Desvio de convenção exige a rota de ADR do oma-architecture, não uma edição local; todas as métricas são proxies (Goodhart)

**Workflow:** PREPARE (classifique green/brownfield, qualquer limite de tamanho já existente no projeto e ranking de hotspots) → ACQUIRE (leia o código com ferramentas de símbolos e colete métricas e sinais do git) → REASON (planeje a sequência de transformação atômica/expand-contract) → ACT (uma transformação engine-first) → VERIFY (rode novamente os testes sem mudanças → commit, ou reverta com Mikado; quando a execução de testes estiver descartada, pare antes da próxima transformação e reporte a aplicada como não verificada) → FINALIZE (delta de métricas e veredito de legibilidade).

---

### oma-scholar

**Domínio:** Companheiro de pesquisa acadêmica que usa a especificação de sidecars `.knows.yaml` do Knows: gerar, validar, revisar, consultar e comparar sidecars estruturados de artigos, além de buscar dados em knows.academy.

**Quando usar:** Leitura econômica de artigos por sidecars (~700 tokens de claims contra ~10K do PDF completo), geração de `.knows.yaml` a partir de rascunhos/LaTeX/notas, validação da estrutura antes de compartilhar, produção de peer reviews como sidecars, consulta ou resumo de sidecars existentes, comparação estrutural entre dois artigos e busca/recuperação no knows.academy.

**Quando NÃO usar:** Busca web geral ou conteúdo não acadêmico (use oma-search), tradução de artigos (use oma-translation), parsing de PDF sem sidecar (use oma-pdf) ou fluxo completo de peer review com sistema editorial.

**Modos:** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Regras principais:**
- A especificação-alvo é v0.9.0 / perfil `paper@1`; o host LLM gera sidecars (nunca chame um SDK LLM externo)
- Anti-fabricação: se DOI/venue/year não estiver visível na fonte, omita a chave inteira; nunca escreva `doi: TODO` nem adivinhe
- Os formatos dos campos seguem exatamente `resources/sidecar-spec.md`: nomes de campos, o único objeto `provenance.actor`, enums fechados, números sem aspas e IDs em kebab-case com prefixo
- As regras locais de geração e o lint acompanham a compatibilidade de produção, não o schema canônico completo da v0.9; `resources/canonical-delta.md` cobre a diferença ao importar ou fazer lint de um registro de terceiros
- Claims com evidência usam `supported_by`; definições e questões em aberto podem ficar ancoradas na fonte. `oma scholar lint` avisa abaixo de 1.5 relações por statement, mas a proporção é um diagnóstico, não uma cota
- Valide antes de compartilhar (`oma scholar lint`); use `--lenient` para sidecars de terceiros
- knows.academy → fallback para OpenAlex em artigos antigos ou anteriores a 2026; a API proxy pública não exige autenticação

**Workflow:** PREPARE (modo + fonte) → ACQUIRE (metadados, seções ou texto local) → REASON (extraia claims, evidências e relações) → ACT (gere/linte/revise/analise/compare/busque) → VERIFY (schema, enums, IDs e relações) → FINALIZE (sidecar/relatório/resumo com ressalvas).

---

### oma-skill-creation

**Domínio:** Criar e validar skills OMA no formato Markdown SSL-lite (Scheduling / Structural Flow / Logical Operations / References).

**Quando usar:** Criar uma skill nova em `.agents/skills/{name}/SKILL.md`, atualizar uma skill existente para o formato SSL-lite, adicionar um caminho canônico de comando ou workflow a uma skill intensiva em execução, auditar se a skill tem roteamento, execução, validação e recuperação suficientes e decidir se exemplos pertencem ao corpo ou a `resources/`.

**Quando NÃO usar:** Instalar skills de terceiros em `$CODEX_HOME/skills` (externo), criar um pacote de plugin Codex (externo), escrever um plano geral de projeto que não seja sobre autoria de skills (use oma-pm) ou editar diretamente código de produto, infraestrutura, frontend, backend ou mobile (use a skill especialista correspondente).

**Regras principais:**
- Mantenha exatamente as quatro seções de nível superior: Scheduling, Structural Flow, Logical Operations, References
- Preserve frontmatter YAML com `name` e `description` claros; execute `oma skill audit` depois de editar a descrição (aviso em ≥ 60%, falha em ≥ 75% de colisão de cosseno TF-IDF)
- Inclua limites concretos de `When NOT to use` com rotas para skills adjacentes
- Adicione exatamente um caminho canônico inline (`Canonical command path` para comandos frágeis/repetíveis, `Canonical workflow path` para fluxos de julgamento/pesquisa)
- Coloque detalhes longos específicos de variantes em `resources/`, não no corpo principal; não crie README/changelog/docs de instalação dentro de uma skill

**Workflow:** PREPARE (propósito, gatilhos, limites, entradas/saídas e dependências) → ACQUIRE (leia 1-3 skills análogas e convenções) → REASON (inline vs `resources/`) → ACT (redija a partir do template SSL-lite) → VERIFY (checagens estruturais, de roteamento, execução e formatação) → FINALIZE (arquivos alterados e relatório de validação).

---

### oma-slide

**Domínio:** Geração de apresentações HTML com muitas animações em um palco fixo de 1920×1080, com validate/bundle/export determinísticos para PDF/PNG/PPTX por meio da CLI `oma slide`, além de uma rota `native-pptx` que produz arquivos PowerPoint editáveis por meio da skill upstream [ppt-master](https://github.com/hugohe3/ppt-master).

**Quando usar:** Criar uma apresentação a partir de tema ou outline, aprimorar ou reformatar um deck existente, gerar HTML por slide com animações e estética baseada na doutrina de design, exportar deck para PDF/PNG/PPTX, aplicar um preset de estilo nomeado ou exportar/importar do Canva. Use a rota `native-pptx` para um PPTX editável, para preencher ou editar um PPTX existente mantendo seu design, para transformar um documento em um deck PPTX, para templates reutilizáveis ou para PPTX/MP4 narrado.

**Quando NÃO usar:** Criar um documento comum sem slides, gerar somente imagens (use oma-image diretamente), definir marca ou sistema de design (use oma-design) ou executar operações CLI determinísticas (validate/bundle/export) sem geração (chame a CLI `oma slide` diretamente).

**Regras principais:**
- A skill escreve o HTML; a CLI faz todo o resto (scaffold, validate, bundle, export)
- Use somente assets locais: sem URLs remotas em `<img src>`/`<video src>`, apenas `./assets/<file>`
- Para CJK, a fonte Pretendard é obrigatória em qualquer slide coreano, japonês ou chinês
- O wrapper `prefers-reduced-motion`, estados de foco visíveis e a estrutura canônica de slide são obrigatórios em todos os slides: `oma slide validate` mede cada `.slide` dentro de `.deck-stage` como o quadro de 1920×1080, sem opt-out por slide ou por elemento
- No máximo 3 iterações de auto-fix na validação; depois apresente o diff ao usuário
- Encaminhe geração de imagens para oma-image; o Canva MCP é opcional e só é provisionado automaticamente com consentimento explícito do usuário
- `native-pptx`: carrega o ppt-master do catálogo de skills do runtime ou com `bunx skills use hugohe3/ppt-master@ppt-master`, nunca o modifica, instala seus pacotes Python somente com consentimento e segue os gates próprios dele

**CLI:** `oma slide create` (scaffold do workspace), `oma slide style get` (buscar um arquivo de estilo), `oma slide asset fetch-video` (download de vídeo), `oma slide import pptx`, `oma slide validate`, `oma slide bundle`, `oma slide export pdf|png|pptx`, `oma slide edit` e `oma slide doctor`.

**Workflow:** 7 fases — DETECT (rota + modo), DISCOVER (reutilize o propósito, o público, a quantidade de slides e os assets fornecidos; uma única pergunta agrupada somente para escolhas ausentes que afetem o deck de forma relevante), STYLE (o estilo fornecido, as convenções do deck existente ou um preset adequado; 3 previews ao vivo somente quando a exploração de estilo for solicitada ou quando a direção for uma escolha relevante em aberto), GENERATE (`slide-NN.html` em 1920×1080), VALIDATE (`oma slide validate`, ≤3 loops de auto-fix), REVIEW (viewer e editor bbox opcional), DELIVER (`bundle` + exportação opcional para PDF/PNG/PPTX).

---

### oma-video

**Domínio:** Criação de vídeos por meio da CLI `oma video`, além de análise e edição de clipes existentes com ferramentas de mídia locais.

**Quando usar:** Gerar vídeos curtos e explainers, fazer demonstrações a partir de um arquivo `--capture` gravado por uma pessoa, renderizar novamente uma execução existente, extrair frames, analisar objetos visíveis, remover pausas e montar clipes dublados.

**Quando NÃO usar:** Uma única imagem estática (oma-image), um deck de slides (oma-slide), processamento apenas de áudio ou geração/transcrição de fala (oma-voice), tradução falada (oma-translation) ou live streaming.

**Regras principais:**
- Encaminhe o trabalho com clipes existentes para a referência de processamento de mídia antes da seleção de modo de criação/provider; essas operações usam ferramentas instaladas, não um novo modo de geração da CLI
- A configuração de providers é opcional por chave para fallbacks de assets compatíveis. Os providers de stock e AIGC (Pexels, Pixelle) só são alcançados com `--visual stock` ou `--visual aigc` e a respectiva chave de ambiente; caso contrário, os visuais são stills do `oma-image`, que não exigem chave. Uma falha do compositor nunca é substituída por um vídeo fallback
- Um frame do `oma-slide` só é usado em uma cena cujo `visual.ref` é um diretório de deck existente; o provider não gera um deck, e uma cena de slide sem deck renderiza um placeholder
- A criação usa a proteção de custo em ≥ `$0.20` (`--yes`/`OMA_VIDEO_YES=1` para trabalho pago já autorizado) e limites de 180 s de duração / 40 cenas; essas configurações ficam em `video:` no `.agents/oma-config.yaml`
- Entradas de render são registradas em `render-spec.json`, junto com assets, seed e Pretendard incorporado; `OMA_VIDEO_MOCK=1` é um harness de teste para fixtures golden, não uma entrega ao usuário
- A captura de demonstração é feita por uma pessoa; `--source web --url` fornece contexto e não inicia a gravação nem automatiza o login. Mascare tokens de URL em logs/manifest
- Uma demonstração precisa de `--polish` para passar a captura pela composição `Demo`, na qual as informações pessoais são mascaradas. Sem `--polish`, o MP4 de saída é a captura bruta, sem máscara, que só pode ser entregue depois que a verificação de informações pessoais não encontrar nada a mascarar
- Segurança de caminho (`--allow-external-output` para saída fora de `$PWD`)

**Workflow:** PREPARE (modo/aspect/locale; informe os padrões inferidos e pergunte somente quando a resposta mudar o resultado) → ACQUIRE (verifique a disponibilidade dos providers, valide o caminho de captura e o custo) → ACT (script → voice ∥ visuals ∥ captions → render-spec → render) → VERIFY (schema, hashes do manifest, código de saída e mp4) → FINALIZE (run-dir, caminho do mp4 e avisos de cobertura).

Clipes existentes usam a inspeção de stream/PTS da fonte, critérios explícitos de seleção de frames ou de corte e uma timeline de edição comum para áudio e vídeo. Detectores de fala e de amplitude podem divergir; resolva os intervalos em disputa a partir do conteúdo solicitado em vez de aumentar os cortes. A dublagem pode copiar a imagem codificada original enquanto substitui o áudio.

---

### oma-voice

**Domínio:** Geração e transcrição de fala locais por meio do Voicebox, além de conversão de áudio existente, ajuste de duração e processamento de loudness com FFmpeg.

**Quando usar:** Gerar áudio curto de notificação para conclusão ou bloqueio de tarefa de agente, produzir voiceover/narração/assets de áudio (mp3 ou wav), transcrever arquivos de áudio locais (mp3, wav, m4a, webm, flac) para Markdown e comparar perfis de voz executando o mesmo texto novamente com ids de perfil diferentes.

Use também para ajustar uma fala existente a uma janela solicitada, fazer resampling, converter canais e aplicar perfis de loudness solicitados. O posicionamento no vídeo continua com o oma-video.

**Quando NÃO usar:** TTS em cloud ou vozes multilíngues de alta fidelidade em cloud, ditado em tempo real pelo microfone do terminal (use o ditado por hotkey do Voicebox), upload de amostra de clonagem ou criação de perfil (feito na UI desktop do Voicebox), vídeo/música/design de som.

**Regras principais:**
- O Voicebox é obrigatório para geração/transcrição; o processamento de áudio existente dispensa as verificações de saúde, de perfil e de modelo dele
- Um perfil é obrigatório apenas para TTS; a transcrição e o processamento de arquivos locais não exigem um
- Limites de tamanho: TTS aceita no máximo 5000 caracteres por chamada, STT aceita 30 minutos; v1 não faz chunking automático
- Transparência de invocação automática: notificações só disparam quando a tarefa excede `auto_notify_after_sec` (padrão 60s); sempre anuncie a intenção em uma linha
- Um caminho de saída solicitado explicitamente autoriza esse destino; esclareça a substituição ambígua de arquivos não relacionados. Uma chamada interrompida não grava saída parcial
- Áudios e transcrições persistidos incluem um manifest; o processamento registra dados reais de fonte/operação, sem ids de geração inventados

**Workflow:** PREPARE (valide texto/áudio/idioma/caminho/perfil) → ACQUIRE (esclareça uma vez se faltar algum sinal) → ACT (MCP `voicebox_speak` ou `voicebox_transcribe`) → VERIFY (presença de áudio/transcrição e campos do manifest) → FINALIZE (grave `manifest.json` e informe o caminho).

Solicitações sobre arquivos existentes são encaminhadas ao processamento local antes desta sequência do Voicebox. Preserve o áudio bruto, derive as metas de andamento e de loudness a partir da entrega solicitada e mantenha as medições técnicas separadas da naturalidade da fala, que não é avaliada.

---

## Autorização e clarificação {#charter-preflight-charter_check}

Os agentes não imprimem um bloco fixo de preflight. Toda definição em `.agents/agents/` remete a `.agents/skills/_shared/core/execution-policy.md`, que `oma agent spawn` injeta no prompt de cada subagente junto com `.agents/skills/_shared/runtime/result-contract.md`.

| Situação | O que o agente faz |
|-----------|---------------------|
| O objetivo e a autorização estão claros; restam detalhes rotineiros | Usa as convenções do repositório, declara as suposições relevantes e prossegue |
| Uma preferência poderia melhorar o resultado | Faz uma pergunta opcional e concisa e continua o trabalho independente |
| A falta de informação altera de forma relevante a corretude ou o escopo | Faz a pergunta específica e pausa apenas o trabalho dependente |
| Uma ação precisa de autorização ainda não concedida | Prepara o resultado revisável, explica a ação e então pergunta |

Um subagente iniciado por spawn não pode perguntar diretamente ao usuário. Ele informa o fato exato que falta e qualquer trabalho independente concluído em um resultado estruturado `blocked` ou `partial`, e o coordenador responde a partir do contexto existente ou pergunta ao usuário. Consulte `.agents/skills/_shared/core/clarification-protocol.md`.

---

## Carregamento de skills {#two-layer-skill-loading}

Um agente lê por inteiro o SKILL.md da skill responsável e lê os arquivos de `resources/` um de cada vez, somente quando a tarefa atende ao gatilho declarado de cada arquivo: seções do checklist para verificações ainda não resolvidas, um playbook de erros somente após uma falha observada, `common-checklist.md` somente para uma revisão ampla entre domínios. A dificuldade define um orçamento flexível de tamanho; ela nunca acrescenta skills nem checklists completos. Consulte [Skills](./skills.md) para o modelo de carregamento e [Carregamento de recursos por tarefa](./skills.md#resource-loading-by-task).

---

## Execução com escopo {#scoped-execution}

Os agentes operam sob limites estritos de domínio:

- Um agente frontend não modifica código backend
- Um agente backend não toca em componentes de UI
- Um agente de DB não implementa endpoints de API
- Os agentes documentam dependências fora do escopo para os outros agentes

Quando, durante a execução, é descoberta uma tarefa de outro domínio, o agente a registra em seu arquivo de resultado como item de escalonamento, em vez de tentar tratá-la.

---

## Estratégia de workspace {#workspace-strategy}

Em projetos multiagente, workspaces separados evitam conflitos de arquivo:

```text
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Os workspaces são especificados com a flag `-w` ao iniciar agentes:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

`-w` é opcional; o workspace é detectado automaticamente quando omitido. Use `--task-id` para que cada execução corresponda à sua tarefa do plano, `--isolation worktree` para dar a cada spawn sua própria git worktree e `--read-only` para restringir uma passagem de revisão a ferramentas não destrutivas:

```bash
oma agent spawn backend prompts/auth-api.md session-01 --task-id task-2 --isolation worktree
oma agent spawn qa prompts/review.md session-01 --task-id task-5 --read-only
```

---

## Fluxo de orquestração {#orchestration-flow}

Ao executar um workflow multiagente (`/orchestrate` ou `/work`):

1. **O agente PM** decompõe a solicitação em tarefas com tiers numéricos de prioridade (`1` = sem dependências; tiers menores rodam primeiro), dependências e critérios de aceitação. Um plano existente válido é reutilizado
2. **Sessão inicializada**: ID de sessão gerado, referências por tarefa selecionadas e `orchestrator-session-{sessionId}.md` e `task-board-{sessionId}.md` criados no armazenamento de memória configurado
3. **Tarefas do tier 1** são iniciadas em paralelo (até MAX_PARALLEL agentes simultâneos)
4. **Progresso monitorado**: o orquestrador prefere as notificações de conclusão do host; em execuções de `oma agent spawn` sem elas, um coordenador consulta os arquivos com escopo de execução `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` que mudaram, com backoff limitado. Subagentes nativos do Claude Code retornam de forma síncrona
5. **Tiers seguintes** são iniciados quando suas dependências são concluídas
6. **O loop de revisão** roda para cada agente concluído (veja abaixo)
7. **Resultados coletados** dos arquivos de resultado com escopo de execução e das claims estruturadas
8. **Relatório final** com resumo da sessão, arquivos alterados e problemas restantes

### Loop de revisão agente-para-agente {#agent-to-agent-review-loop}

Fonte: `.agents/skills/oma-orchestration/SKILL.md` (PHASE 4.5).

```mermaid
flowchart TD
    done["Agent completes work"] --> self["1. Mechanical self-check: lint, type-check, tests, diff scope"]
    self --> supported{"Automated verify supported for this agent type?"}
    supported -->|"backend, frontend, mobile, qa, debug, pm"| verify["2. oma verify agent"]
    supported -->|"db, refactor, architecture, tf-infra, docs"| skip["Record SKIP"]
    verify -->|PASS| review["3. QA cross-review"]
    skip --> review
    verify -->|FAIL| fix["Agent fixes from the feedback"]
    review -->|FAIL| fix
    fix --> self
    review -->|PASS| accept["Accept result"]
```

A auto-verificação é apenas mecânica. A qualidade do design e os critérios de aceitação são julgados na revisão cruzada do QA, porque os agentes tendem a superestimar a própria saída.

| Contador | Máx. | Ao exceder |
|---------|-----|-------------|
| Ciclos de auto-verificação e correção | 3 | Escalar para a revisão cruzada de qualquer forma |
| Rejeições na revisão cruzada | 2 | Reportar ao usuário com o histórico de revisões |
| Total de iterações do loop | 5 | Parar a recuperação; preservar as verificações com falha e retornar `partial` ou `failed` |

---

## Definições de agentes {#agent-definitions}

`.agents/agents/` contém 12 definições de subagentes versionadas que são a fonte de verdade, uma por papel na tabela de [Papéis de dispatch](#dispatch-roles). Cada arquivo define a identidade do agente e `skills:`, uma seção de protocolo de execução que aponta para a política de execução e o contrato de resultado compartilhados, e as regras do domínio; alguns acrescentam um resumo da arquitetura ou do processo. Eles são usados ao iniciar subagentes pela ferramenta Task/Agent (Claude Code) ou pela CLI, e o OMA os projeta nos [arquivos de agentes nativos](#native-agent-files) de cada runtime.

---

## Estado de runtime (armazenamento de memória do projeto) {#runtime-state-project-memory-store}

Durante sessões de orquestração, os agentes coordenam por arquivos de memória compartilhados em `.agents/state/memories/` (projetos antigos usam como fallback o caminho legado `.serena/memories/`). Altere o caminho ou os nomes das ferramentas com `memoryConfig` em `.agents/mcp.json`, não no `.mcp.json` da raiz do repositório, que é a lista de servidores MCP do Claude Code:

| Arquivo | Proprietário | Finalidade | Outros |
|------|-------|---------|--------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | ID da sessão, status, hora de início e rastreamento de fases | Somente leitura |
| `task-board-{sessionId}.md` | Orchestrator | Atribuições de tarefas, prioridades e atualizações de status | Somente leitura |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Essa execução | Progresso turno a turno: ações, arquivos lidos/modificados e status atual | Lido pelo orquestrador |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Essa execução | Saída final: status (completed/failed), resumo, arquivos alterados e checklist dos critérios de aceitação | Lido pelo orquestrador |
| `session-metrics-{sessionId}.md` | Orchestrator | Evidência de sessão opcional: correções relevantes, retrabalho e achados de revisão julgados | Lido pelo QA |
| `lessons-{sessionId}.md` | Orchestrator | Lições da sessão baseadas em evidências | Lido por todos |
| `experiment-ledger-{sessionId}.md` | Orchestrator/QA | Evidências de experimentos reais | Lido por todos |

As ferramentas de memória são configuráveis. Por padrão, os agentes leem e escrevem esses arquivos de coordenação diretamente com suas ferramentas nativas (`Read`, `Write`, `Edit`), mas ferramentas personalizadas e um caminho-base personalizado podem ser definidos em `.agents/mcp.json`:

```json
{
  "memoryConfig": {
    "provider": "file",
    "basePath": ".agents/state/memories",
    "tools": {
      "read": "Read",
      "write": "Write",
      "edit": "Edit"
    }
  }
}
```

Os dashboards (`oma dashboard terminal` e `oma dashboard web`) observam esses arquivos de memória para monitoramento em tempo real.

---

## Relacionados {#related}

- [Skills](./skills.md): como uma skill é selecionada e como seus recursos são carregados
- [Workflows](./workflows.md): workflows de barra que leem skills
- [Execução paralela](./parallel-execution.md)
- [Resultados de agentes e retomada](../guide/agent-results-and-resume.md): o ciclo de vida `oma agent begin` → `oma agent verify` → `oma agent finish`
- [Modelos por agente](../guide/per-agent-models.md)
- [Monitoramento com dashboard](../guide/dashboard-monitoring.md)
