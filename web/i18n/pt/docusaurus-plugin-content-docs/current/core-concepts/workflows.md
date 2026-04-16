---
title: Workflows
description: "Referência completa para todos os 14 workflows do oh-my-agent — comandos slash, modos persistente vs não-persistente, palavras-chave gatilho em 11 idiomas, fases e etapas, arquivos lidos e escritos, mecânica de auto-detecção via triggers.json e keyword-detector.ts, filtragem de padrões informativos e gerenciamento de estado de modo persistente."
---

# Workflows

Workflows são processos estruturados de múltiplas etapas acionados por comandos slash ou palavras-chave em linguagem natural. Eles definem como os agentes colaboram em tarefas — desde utilitários de fase única até portões de qualidade complexos de 5 fases.

Existem 14 workflows, 3 dos quais são persistentes (mantêm estado e não podem ser interrompidos acidentalmente).

---

## Workflows Persistentes

Workflows persistentes continuam executando até que todas as tarefas sejam concluídas. Mantêm estado em `.agents/state/` e reinjetam o contexto `[OMA PERSISTENT MODE: ...]` em cada mensagem do usuário até serem explicitamente desativados.

### /orchestrate

**Descrição:** Execução paralela automatizada de agentes via CLI. Inicia subagentes via CLI, coordena através de memória MCP, monitora progresso e executa loops de verificação.

**Persistente:** Sim. Arquivo de estado: `.agents/state/orchestrate-state.json`.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "orchestrate" |
| Inglês | "parallel", "do everything", "run everything" |
| Coreano | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| Japonês | "オーケストレート", "並列実行", "自動実行" |
| Chinês | "编排", "并行执行", "自动执行" |
| Espanhol | "orquestar", "paralelo", "ejecutar todo" |
| Francês | "orchestrer", "parallèle", "tout exécuter" |
| Alemão | "orchestrieren", "parallel", "alles ausführen" |
| Português | "orquestrar", "paralelo", "executar tudo" |
| Russo | "оркестровать", "параллельно", "выполнить всё" |
| Holandês | "orkestreren", "parallel", "alles uitvoeren" |
| Polonês | "orkiestrować", "równolegle", "wykonaj wszystko" |

**Etapas:**
1. **Step 0 — Preparação:** Ler skill de coordenação, guia de context-loading, protocolo de memória. Detectar vendor.
2. **Step 1 — Carregar/Criar Plano:** Verificar `.agents/results/plan-{sessionId}.json`. Se ausente, solicitar ao usuário executar `/plan` primeiro.
3. **Step 2 — Inicializar Sessão:** Carregar `oma-config.yaml`, exibir tabela de mapeamento CLI, gerar ID de sessão (`session-YYYYMMDD-HHMMSS`), criar `orchestrator-session.md` e `task-board.md` na memória.
4. **Step 3 — Spawnar Agentes:** Para cada tier de prioridade (P0 primeiro, depois P1...), spawnar agentes usando método apropriado ao vendor (Agent tool para Claude Code, `oma agent:spawn` para Gemini/Antigravity, mediado por modelo para Codex). Nunca exceder MAX_PARALLEL.
5. **Step 4 — Monitorar:** Poll dos arquivos `progress-{agent}.md`, atualizar `task-board.md`. Observar completações, falhas, crashes.
6. **Step 5 — Verificar:** Executar `verify.sh {agent-type} {workspace}` por agente completado. Em caso de falha, re-spawnar com contexto do erro (máximo 2 retries). Após 2 retries, ativar Exploration Loop: gerar 2-3 hipóteses, spawnar experimentos paralelos, pontuar, manter o melhor.
7. **Step 6 — Coletar:** Ler todos os arquivos `result-{agent}.md`, compilar resumo.
8. **Step 7 — Relatório Final:** Apresentar resumo da sessão. Se Quality Score foi medido, incluir resumo do Experiment Ledger e auto-gerar lições.

**Arquivos lidos:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Arquivos escritos:** `orchestrator-session.md`, `task-board.md` (memória), relatório final.

**Quando usar:** Projetos grandes requerendo máximo paralelismo com coordenação automatizada.

---

### /work

**Descrição:** Coordenação multi-domínio passo a passo. PM planeja primeiro, depois agentes executam com confirmação do usuário em cada portão, seguido de revisão QA e remediação de problemas.

**Persistente:** Sim. Arquivo de estado: `.agents/state/work-state.json`.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "work", "step by step" |
| Coreano | "코디네이트", "단계별" |
| Japonês | "コーディネート", "ステップバイステップ" |
| Chinês | "协调", "逐步" |
| Espanhol | "coordinar", "paso a paso" |
| Francês | "coordonner", "étape par étape" |
| Alemão | "koordinieren", "schritt für schritt" |

**Etapas:**
1. **Step 0 — Preparação:** Ler skills, context-loading, protocolo de memória. Registrar início da sessão.
2. **Step 1 — Analisar Requisitos:** Identificar domínios envolvidos. Se domínio único, sugerir uso direto do agente.
3. **Step 2 — Planejamento pelo Agente PM:** PM decompõe requisitos, define contratos de API, cria breakdown priorizado de tarefas, salva em `.agents/results/plan-{sessionId}.json`.
4. **Step 3 — Revisar Plano:** Apresentar plano ao usuário. **Deve obter confirmação antes de prosseguir.**
5. **Step 4 — Spawnar Agentes:** Spawnar por tier de prioridade, paralelo dentro do mesmo tier, workspaces separados.
6. **Step 5 — Monitorar:** Poll de arquivos de progresso, verificar alinhamento de contrato de API entre agentes.
7. **Step 6 — Revisão QA:** Spawnar agente QA para segurança (OWASP), performance, acessibilidade, qualidade de código.
8. **Step 6.1 — Quality Score** (condicional): Medir e registrar baseline.
9. **Step 7 — Iterar:** Se problemas CRITICAL/HIGH encontrados, re-spawnar agentes responsáveis. Se mesmo problema persiste após 2 tentativas, ativar Exploration Loop.

**Quando usar:** Funcionalidades abrangendo múltiplos domínios onde você quer controle passo a passo e aprovação do usuário em cada portão.

---

### /ultrawork

**Descrição:** O workflow obcecado por qualidade. 5 fases, 17 etapas no total, 11 das quais são etapas de revisão. Cada fase tem um portão que deve passar antes de prosseguir.

**Persistente:** Sim. Arquivo de estado: `.agents/state/ultrawork-state.json`.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "ultrawork", "ulw" |

**Fases e etapas:**

| Fase | Etapas | Agente | Perspectiva de Revisão |
|------|--------|--------|----------------------|
| **PLAN** | 1-4 | Agente PM (inline) | Completude, Meta-revisão, Over-engineering/Simplicidade |
| **IMPL** | 5 | Agentes Dev (spawned) | Implementação |
| **VERIFY** | 6-8 | Agente QA (spawned) | Alinhamento, Segurança (OWASP), Prevenção de Regressão |
| **REFINE** | 9-13 | Agente Debug (spawned) | Divisão de arquivos, Reusabilidade, Impacto em Cascata, Consistência, Código Morto |
| **SHIP** | 14-17 | Agente QA (spawned) | Qualidade de Código (lint/coverage), Fluxo UX, Problemas Relacionados, Prontidão para Deploy |

**Definições de portão:**
- **PLAN_GATE:** Plano documentado, suposições listadas, alternativas consideradas, revisão de over-engineering feita, confirmação do usuário.
- **IMPL_GATE:** Build tem sucesso, testes passam, apenas arquivos planejados modificados, Quality Score baseline registrado (se medido).
- **VERIFY_GATE:** Implementação corresponde aos requisitos, zero CRITICAL, zero HIGH, sem regressões, Quality Score >= 75 (se medido).
- **REFINE_GATE:** Sem arquivos/funções grandes (> 500 linhas / > 50 linhas), oportunidades de integração capturadas, efeitos colaterais verificados, código limpo, Quality Score não regrediu.
- **SHIP_GATE:** Verificações de qualidade passam, UX verificado, problemas relacionados resolvidos, checklist de deploy completo, Quality Score final >= 75 com delta não-negativo, aprovação final do usuário.

**Comportamento em falha de portão:**
- Primeira falha: retornar à etapa relevante, corrigir e tentar novamente.
- Segunda falha no mesmo problema: ativar Exploration Loop (gerar 2-3 hipóteses, experimentar cada uma, pontuar, manter a melhor).

**Aprimoramentos condicionais:** Medição de Quality Score, decisões Keep/Discard, Experiment Ledger, Exploração de Hipóteses, Auto-aprendizado (lições de experimentos descartados).

**Condição de pular REFINE:** Tarefas simples com menos de 50 linhas.

**Quando usar:** Entrega de qualidade máxima. Quando o código deve estar pronto para produção com revisão abrangente.

---

## Workflows Não-Persistentes

### /plan

**Descrição:** Breakdown de tarefas dirigido pelo PM. Analisa requisitos, seleciona stack tecnológico, decompõe em tarefas priorizadas com dependências, define contratos de API.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "task breakdown" |
| Inglês | "plan" |
| Coreano | "계획", "요구사항 분석", "스펙 분석" |
| Japonês | "計画", "要件分析", "タスク分解" |
| Chinês | "计划", "需求分析", "任务分解" |

**Etapas:** Coletar requisitos -> Analisar viabilidade técnica (análise de código MCP) -> Definir contratos de API -> Decompor em tarefas -> Revisar com usuário -> Salvar plano.

**Saída:** `.agents/results/plan-{sessionId}.json`, escrita em memória, opcionalmente `docs/exec-plans/active/` para planos complexos.

**Execução:** Inline (sem spawning de subagentes). Consumido por `/orchestrate` ou `/work`.

---

### /exec-plan

**Descrição:** Cria, gerencia e rastreia planos de execução como artefatos de primeira classe do repositório em `docs/exec-plans/`.

**Palavras-chave gatilho:** Nenhuma (excluído da auto-detecção, deve ser invocado explicitamente).

**Etapas:** Preparação -> Analisar escopo (avaliar complexidade: Simples/Média/Complexa) -> Criar plano de execução (markdown em `docs/exec-plans/active/`) -> Definir contratos de API (se cross-boundary) -> Revisar com usuário -> Executar (passar para `/orchestrate` ou `/work`) -> Completar (mover para `completed/`).

**Saída:** `docs/exec-plans/active/{plan-name}.md` com tabela de tarefas, log de decisões, notas de progresso.

**Quando usar:** Após `/plan` para funcionalidades complexas que precisam de execução rastreada com log de decisões.

---

### /brainstorm

**Descrição:** Ideação orientada por design. Explora intenção, clarifica restrições, propõe abordagens, produz um documento de design aprovado antes do planejamento.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "brainstorm" |
| Inglês | "ideate", "explore design" |
| Coreano | "브레인스토밍", "아이디어", "설계 탐색" |
| Japonês | "ブレインストーミング", "アイデア", "設計探索" |
| Chinês | "头脑风暴", "创意", "设计探索" |

**Etapas:** Explorar contexto do projeto (análise MCP) -> Fazer perguntas de esclarecimento (uma por vez) -> Propor 2-3 abordagens com tradeoffs -> Apresentar design seção por seção (com aprovação do usuário em cada etapa) -> Salvar documento de design em `docs/plans/` -> Transição: sugerir `/plan`.

**Regras:** Sem implementação ou planejamento antes da aprovação do design. Sem saída de código. YAGNI.

---

### /deepinit

**Descrição:** Inicialização completa do projeto. Analisa um codebase existente, gera AGENTS.md, ARCHITECTURE.md e uma base de conhecimento estruturada em `docs/`.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "deepinit" |
| Coreano | "프로젝트 초기화" |
| Japonês | "プロジェクト初期化" |
| Chinês | "项目初始化" |

**Etapas:** Preparação -> Analisar codebase (tipo de projeto, arquitetura, regras implícitas, domínios, fronteiras) -> Gerar ARCHITECTURE.md (mapa de domínio, menos de 200 linhas) -> Gerar base de conhecimento `docs/` (design-docs/, exec-plans/, generated/, product-specs/, references/, docs de domínio) -> Gerar AGENTS.md raiz (~100 linhas, índice) -> Gerar arquivos AGENTS.md de fronteira (pacotes monorepo, menos de 50 linhas cada) -> Atualizar harness existente (se re-executando) -> Validar (sem links mortos, limites de linhas).

**Saída:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md e docs específicos de domínio conforme descobertos.

---

### /review

**Descrição:** Pipeline completo de revisão QA. Auditoria de segurança (OWASP Top 10), análise de performance, verificação de acessibilidade (WCAG 2.1 AA) e revisão de qualidade de código.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "code review", "security audit", "security review" |
| Inglês | "review" |
| Coreano | "리뷰", "코드 검토", "보안 검토" |
| Japonês | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chinês | "审查", "代码审查", "安全审计" |

**Etapas:** Identificar escopo da revisão -> Verificações automatizadas de segurança (npm audit, bandit) -> Revisão manual de segurança (OWASP Top 10) -> Análise de performance -> Revisão de acessibilidade (WCAG 2.1 AA) -> Revisão de qualidade de código -> Gerar relatório QA.

**Loop opcional de fix-verify** (com `--fix`): Após relatório QA, spawnar agentes de domínio para corrigir problemas CRITICAL/HIGH, re-executar QA, repetir até 3 vezes.

**Delegação:** Para escopos grandes, delega Steps 2-7 a um subagente QA.

---

### /debug

**Descrição:** Diagnóstico e correção estruturada de bugs com escrita de testes de regressão e varredura de padrões similares.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "debug" |
| Inglês | "fix bug", "fix error", "fix crash" |
| Coreano | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japonês | "デバッグ", "バグ修正", "エラー修正" |
| Chinês | "调试", "修复 bug", "修复错误" |

**Etapas:** Coletar informações do erro -> Reproduzir (MCP `search_for_pattern`, `find_symbol`) -> Diagnosticar causa raiz (MCP `find_referencing_symbols` para rastrear caminho de execução) -> Propor correção mínima (confirmação do usuário obrigatória) -> Aplicar correção + escrever teste de regressão -> Varrer padrões similares (pode spawnar subagente debug-investigator se escopo > 10 arquivos) -> Documentar bug na memória.

**Critérios de spawn de subagente:** Erro abrange múltiplos domínios, escopo de varredura > 10 arquivos ou rastreamento profundo de dependências necessário.

---

### /design

**Descrição:** Workflow de design de 7 fases produzindo DESIGN.md com tokens, padrões de componentes e regras de acessibilidade.

**Palavras-chave gatilho:**
| Idioma | Palavras-chave |
|--------|---------------|
| Universal | "design system", "DESIGN.md", "design token" |
| Inglês | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Coreano | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japonês | "デザイン", "ランディングページ", "デザインシステム" |
| Chinês | "设计", "着陆页", "设计系统" |

**Fases:** SETUP (coleta de contexto, `.design-context.md`) -> EXTRACT (opcional, de URLs de referência/Stitch) -> ENHANCE (aprimoramento de prompt vago) -> PROPOSE (2-3 direções de design com cor, tipografia, layout, movimento, componentes) -> GENERATE (DESIGN.md + tokens CSS/Tailwind/shadcn) -> AUDIT (responsivo, WCAG 2.2, heurísticas de Nielsen, verificação de AI slop) -> HANDOFF (salvar, informar usuário).

**Obrigatório:** Toda saída responsive-first (mobile 320-639px, tablet 768px+, desktop 1024px+).

---

### /scm

**Descrição:** Gera Conventional Commits com divisão automática por funcionalidade.

**Palavras-chave gatilho:** Nenhuma (excluído da auto-detecção).

**Etapas:** Analisar mudanças (git status, git diff) -> Separar funcionalidades (se > 5 arquivos abrangendo escopo/tipo diferente) -> Determinar tipo (feat/fix/refactor/docs/test/chore/style/perf) -> Determinar escopo (módulo alterado) -> Escrever descrição (imperativo, < 72 chars) -> Executar commit imediatamente (sem prompt de confirmação).

**Regras:** Nunca `git add -A`. Nunca commitar secrets. HEREDOC para mensagens multi-linha. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /tools

**Descrição:** Gerenciar visibilidade e restrições de ferramentas MCP.

**Palavras-chave gatilho:** Nenhuma (excluído da auto-detecção).

**Funcionalidades:** Mostrar status atual das ferramentas MCP, habilitar/desabilitar grupos de ferramentas (memory, code-analysis, code-edit, file-ops), alterações permanentes ou temporárias (`--temp`), parsing de linguagem natural ("memory tools only", "disable code edit").

**Grupos de ferramentas:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /stack-set

**Descrição:** Auto-detectar stack tecnológico do projeto e gerar referências específicas de linguagem para a skill backend.

**Palavras-chave gatilho:** Nenhuma (excluído da auto-detecção).

**Etapas:** Detectar (escanear manifestos: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj) -> Confirmar (exibir stack detectada, obter confirmação do usuário) -> Gerar (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` com 8 padrões obrigatórios, `stack/api-template.*`) -> Verificar.

**Saída:** Arquivos em `.agents/skills/oma-backend/stack/`. Não modifica SKILL.md ou `resources/`.

---

## Skills vs. Workflows

| Aspecto | Skills | Workflows |
|---------|--------|-----------|
| **O que são** | Expertise do agente (o que um agente sabe) | Processos orquestrados (como agentes trabalham juntos) |
| **Localização** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Ativação** | Automática via palavras-chave de roteamento | Comandos slash ou palavras-chave gatilho |
| **Escopo** | Execução de domínio único | Multi-etapa, frequentemente multi-agente |
| **Exemplos** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Auto-Detecção: Como Funciona

### O Sistema de Hooks

oh-my-agent usa um hook `UserPromptSubmit` que executa antes de cada mensagem do usuário ser processada. O sistema de hooks consiste em:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Define mapeamentos de palavra-chave para workflow para todos os 11 idiomas suportados (Inglês, Coreano, Japonês, Chinês, Espanhol, Francês, Alemão, Português, Russo, Holandês, Polonês).

2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): Lógica TypeScript que escaneia a entrada do usuário contra as palavras-chave gatilho, respeita correspondência específica de idioma e injeta contexto de ativação de workflow.

3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Aplica execução de workflow persistente verificando arquivos de estado ativos e reinjetando contexto de workflow.

### Fluxo de Detecção

1. Usuário digita entrada em linguagem natural
2. Hook verifica se `/command` explícito está presente (se sim, pular detecção para evitar duplicação)
3. Hook escaneia entrada contra listas de palavras-chave do `triggers.json`
4. Se correspondência encontrada, verificar se a entrada corresponde a padrões informativos
5. Se informativa (ex: "what is orchestrate?"), filtrar — sem ativação de workflow
6. Se acionável, injetar `[OMA WORKFLOW: {workflow-name}]` no contexto
7. O agente lê a tag injetada e carrega o arquivo de workflow correspondente de `.agents/workflows/`

### Filtragem de Padrões Informativos

A seção `informationalPatterns` do `triggers.json` define frases que indicam perguntas em vez de comandos. Estas são verificadas antes da ativação de workflow:

| Idioma | Padrões Informativos |
|--------|---------------------|
| Inglês | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| Coreano | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| Japonês | "とは", "って何", "どうやって", "説明して" |
| Chinês | "是什么", "什么是", "怎么", "解释" |

Se a entrada corresponde tanto a uma palavra-chave de workflow quanto a um padrão informativo, o padrão informativo tem prioridade e nenhum workflow é acionado.

### Workflows Excluídos

Os seguintes workflows são excluídos da auto-detecção e devem ser invocados com `/command` explícito:
- `/scm`
- `/tools`
- `/stack-set`
- `/exec-plan`

---

## Mecânica do Modo Persistente

### Arquivos de Estado

Workflows persistentes (orchestrate, ultrawork, work) criam arquivos de estado em `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── work-state.json
```

Esses arquivos contêm: nome do workflow, fase/etapa atual, ID de sessão, timestamp e qualquer estado pendente.

### Reforço

Enquanto um workflow persistente está ativo, o hook `persistent-mode.ts` injeta `[OMA PERSISTENT MODE: {workflow-name}]` em cada mensagem do usuário. Isso garante que o workflow continue executando mesmo entre turnos de conversação.

### Desativação

Para desativar um workflow persistente, o usuário diz "workflow done" (ou equivalente no idioma configurado). Isso:
1. Deleta o arquivo de estado de `.agents/state/`
2. Para de injetar o contexto de modo persistente
3. Retorna à operação normal

O workflow também pode terminar naturalmente quando todas as etapas são completadas e o portão final passa.

---

## Sequências Típicas de Workflow

### Funcionalidade Rápida
```
/plan → revisar saída → /exec-plan
```

### Projeto Multi-Domínio Complexo
```
/work → PM planeja → usuário confirma → agentes spawnam → QA revisa → corrigir problemas → entregar
```

### Entrega de Qualidade Máxima
```
/ultrawork → PLAN (4 etapas de revisão) → IMPL → VERIFY (3 etapas de revisão) → REFINE (5 etapas de revisão) → SHIP (4 etapas de revisão)
```

### Investigação de Bug
```
/debug → reproduzir → causa raiz → correção mínima → teste de regressão → varredura de padrões similares
```

### Pipeline Design-para-Implementação
```
/brainstorm → documento de design → /plan → breakdown de tarefas → /orchestrate → implementação paralela → /review → /scm
```

### Setup de Novo Codebase
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
