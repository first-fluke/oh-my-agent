---
title: Guia de Uso
description: "Guia de uso abrangente do oh-my-agent — início rápido, exemplos detalhados do mundo real cobrindo tarefas únicas, projetos multi-domínio, correção de bugs, sistemas de design, execução paralela via CLI e ultrawork. Todos os comandos de workflow, exemplos de auto-detecção em múltiplos idiomas, todas as 21 skills com casos de uso, configuração de dashboard, conceitos-chave, dicas e solução de problemas."
---

# Como Usar o oh-my-agent

## Início Rápido

1. Abra seu projeto em uma IDE com IA (Claude Code, Gemini CLI, Cursor, Antigravity, etc.)
2. As skills são auto-detectadas de `.agents/skills/`
3. Descreva o que você quer em linguagem natural — oh-my-agent roteia para o agente correto
4. Para trabalho multi-agente, use `/work` ou `/orchestrate`

Esse é todo o workflow. Nenhuma sintaxe especial é necessária para tarefas de domínio único.

---

## Exemplo 1: Tarefa Única Simples

**Você digita:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**O que acontece:**

1. A skill `oma-frontend` ativa automaticamente (palavras-chave: "form", "component", "Tailwind CSS")
2. Camada 1 (SKILL.md) já está carregada — identidade do agente, regras principais, lista de bibliotecas
3. Recursos da Camada 2 carregam sob demanda:
   - `execution-protocol.md` — o workflow de 4 etapas (Analisar, Planejar, Implementar, Verificar)
   - `snippets.md` — padrões de formulário + validação Zod
   - `component-template.tsx` — estrutura de componente React
4. O agente emite um **CHARTER_CHECK**:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
5. O agente implementa:
   - Componente React com TypeScript em `src/features/auth/components/login-form.tsx`
   - Schema de validação Zod em `src/features/auth/utils/login-validation.ts`
   - Testes Vitest em `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Loading skeleton em `src/features/auth/components/skeleton/login-form-skeleton.tsx`
6. O agente executa o checklist: acessibilidade (labels ARIA, HTML semântico, navegação por teclado), viewport mobile, performance (sem CLS), error boundaries

**Saída:** Um componente React pronto para produção com TypeScript, validação, testes e acessibilidade — não apenas uma sugestão.

---

## Exemplo 2: Projeto Multi-Domínio

**Você digita:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**O que acontece:**

1. A detecção de palavras-chave identifica isso como multi-domínio (frontend + backend + mobile)
2. Se você não usou um comando de workflow, oh-my-agent sugere `/work` ou `/orchestrate`

**Usando `/work` (passo a passo com controle do usuário):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1 — Agente PM planeja:**
   - Identifica domínios: backend (API de auth, task CRUD), frontend (login, UI de lista de tarefas), mobile (app Flutter)
   - Define contratos de API: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - Cria breakdown priorizado de tarefas:
     - P0: Backend auth API, Backend task CRUD API
     - P1: Frontend login/register, Frontend task list, Mobile auth screens, Mobile task list
     - P2: QA review
   - Salva em `.agents/results/plan-{sessionId}.json`

4. **Step 2 — Você revisa e confirma o plano**

5. **Step 3 — Agentes spawnados por prioridade:**
   ```bash
   # Tier P0 (paralelo)
   oma agent:spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent:spawn db "User and task schema design" session-todo-01 &
   wait

   # Tier P1 (paralelo, após P0 completar)
   oma agent:spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent:spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Step 4 — Agente QA revisa:**
   - Segurança: Conformidade OWASP Top 10 (validação JWT, CSRF, verificação de SQL injection)
   - Performance: Verificação de query N+1, verificação de paginação
   - Acessibilidade: WCAG 2.1 AA em todos os componentes frontend
   - Cross-domínio: Alinhamento de contrato de API entre frontend, mobile e backend

7. **Step 5 — Iterar:** Se QA encontrar problemas CRITICAL, re-spawnar o agente responsável com o relatório QA.

---

## Exemplo 3: Correção de Bug

**Você digita:**
```
There's a bug — clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**O que acontece:**

1. `oma-debug` ativa automaticamente (palavras-chave: "bug", "error", "Cannot read property")
2. **Step 1 — Coletar:** A mensagem de erro e contexto são capturados
3. **Step 2 — Reproduzir:** MCP `search_for_pattern` encontra a chamada `.map()` em `src/features/tasks/components/task-list.tsx`
4. **Step 3 — Diagnosticar:** MCP `find_referencing_symbols` rastreia o fluxo de dados:
   - Hook `useQuery` busca tarefas da API
   - Componente renderiza antes dos dados chegarem
   - `tasks` é `undefined` durante o estado de loading
   - Causa raiz: verificação de loading state ausente antes de `.map()`
5. **Step 4 — Propor correção:** Apresentar mudança mínima — adicionar verificação de loading state e null guard
6. **Step 5 — Implementar:**
   - Adicionar loading skeleton enquanto dados carregam
   - Adicionar null check: `tasks?.map()` ou early return para loading state
   - Escrever teste de regressão que verifica componente renderiza corretamente quando `tasks` é undefined
7. **Step 6 — Varredura de padrões similares:** MCP `search_for_pattern` busca outras chamadas `.map()` em arrays potencialmente undefined
   - Encontra 3 padrões similares em `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`
   - Aplica proativamente o mesmo padrão de correção
8. **Step 7 — Documentar:** Relatório de bug escrito na memória com causa raiz, correção e prevenção

---

## Exemplo 4: Design System

**Você digita:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**O que acontece:**

1. `oma-design` ativa (palavras-chave: "design", "landing page", "dark", "premium")
2. **Fase 1 — SETUP:** Verifica `.design-context.md`. Se ausente, pergunta:
   - Quais idiomas o serviço suporta? (en only / + CJK)
   - Público-alvo? (B2B, usuários técnicos, 25-45)
   - Personalidade da marca? (profissional / premium)
   - Direção estética? (dark premium)
   - Sites de referência? (usuário fornece exemplos)
   - Acessibilidade? (WCAG AA)
3. **Fase 3 — ENHANCE:** Se o prompt é vago, transforma em especificação seção por seção
4. **Fase 4 — PROPOSE:** Apresenta 3 direções de design:
   - **Direção A: "Midnight Observatory"** — Navy profundo (#0f1729), acentos cyan (#22d3ee), Inter + JetBrains Mono, layout bento grid, reveals acionados por scroll
   - **Direção B: "Carbon Interface"** — Cinza neutro (#18181b), acentos amber (#f59e0b), fontes do sistema, layout xadrez, micro-interações acionadas por hover
   - **Direção C: "Deep Space"** — Dark puro (#0a0a0a), acentos emerald (#10b981), Geist + Geist Mono, seções full-bleed, animações de entrada
5. **Fase 5 — GENERATE:** Baseado na direção escolhida, gera:
   - `DESIGN.md` com 6 seções (tipografia, cor, espaçamento, movimento, componentes, acessibilidade)
   - CSS custom properties
   - Extensões de config Tailwind
   - Variáveis de tema shadcn/ui
6. **Fase 6 — AUDIT:** Executa verificações para responsivo (mínimo 320px), WCAG 2.2, heurísticas de Nielsen, detecção de AI slop
7. **Fase 7 — HANDOFF:** "Design completo. Execute `/orchestrate` para implementar com oma-frontend."

---

## Exemplo 5: Execução Paralela via CLI

```bash
# Agente único — tarefa simples
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# Três agentes em paralelo — funcionalidade full-stack
oma agent:spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# Monitorar enquanto agentes trabalham (terminal separado)
oma dashboard        # TUI no terminal
oma dashboard:web    # UI web em http://localhost:9847

# Após implementação, executar QA
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01

# Verificar estatísticas da sessão após conclusão
oma stats
```

---

## Exemplo 6: Ultrawork — Qualidade Máxima

**Você digita:**
```
/ultrawork Build a payment processing module with Stripe integration
```

**O que acontece (5 fases, 17 etapas, 11 etapas de revisão):**

**Fase 1 — PLAN (Steps 1-4, Agente PM inline):**
- Step 1: Criar plano com breakdown de tarefas, contratos de API, dependências
- Step 2: Revisão do Plano — verificação de completude
- Step 3: Meta Revisão — auto-verificar se a revisão foi suficiente
- Step 4: Revisão de Over-Engineering — foco em MVP, sem complexidade desnecessária
- PLAN_GATE: Plano documentado, suposições listadas, usuário confirma

**Fase 2 — IMPL (Step 5, Agentes Dev spawnados):**
- Agente backend implementa integração Stripe (webhooks, idempotência, tratamento de erros)
- Agente frontend constrói fluxo de checkout e UI de status de pagamento
- Step 5.2: Medir baseline Quality Score (testes, lint, typecheck)
- IMPL_GATE: Build tem sucesso, testes passam, apenas arquivos planejados modificados

**Fase 3 — VERIFY (Steps 6-8, Agente QA spawnado):**
- Step 6: Revisão de Alinhamento — implementação corresponde ao plano?
- Step 7: Revisão de Segurança/Bugs — OWASP, npm audit, melhores práticas de segurança Stripe
- Step 8: Revisão de Melhoria/Regressão — sem regressões introduzidas
- VERIFY_GATE: Zero CRITICAL, zero HIGH, Quality Score >= 75

**Fase 4 — REFINE (Steps 9-13, Agente Debug spawnado):**
- Step 9: Dividir arquivos grandes (> 500 linhas) e funções (> 50 linhas)
- Step 10: Revisão de Integração/Reutilização — eliminar lógica duplicada
- Step 11: Revisão de Efeitos Colaterais — rastrear impacto em cascata com `find_referencing_symbols`
- Step 12: Revisão Completa de Mudanças — consistência de nomenclatura, alinhamento de estilo
- Step 13: Limpar código morto
- REFINE_GATE: Quality Score não regrediu, código limpo

**Fase 5 — SHIP (Steps 14-17, Agente QA spawnado):**
- Step 14: Revisão de Qualidade de Código — lint, tipos, cobertura
- Step 15: Verificação de Fluxo UX — jornada end-to-end de pagamento do usuário
- Step 16: Revisão de Problemas Relacionados — verificação final de impacto em cascata
- Step 17: Prontidão para Deploy — gerenciamento de secrets, scripts de migração, plano de rollback
- SHIP_GATE: Todas as verificações passam, usuário dá aprovação final

---

## Todos os Comandos de Workflow

| Comando | Tipo | O Que Faz | Quando Usar |
|---------|------|----------|-------------|
| `/orchestrate` | Persistente | Execução automatizada de agentes em paralelo com monitoramento e loops de verificação | Grandes projetos precisando de máximo paralelismo |
| `/work` | Persistente | Coordenação multi-domínio passo a passo com aprovação do usuário em cada portão | Funcionalidades abrangendo múltiplos agentes onde você quer controle |
| `/ultrawork` | Persistente | Workflow de qualidade de 5 fases, 17 etapas com 11 checkpoints de revisão | Entrega de qualidade máxima, código crítico para produção |
| `/plan` | Não-persistente | Breakdown de tarefas dirigido pelo PM e definição de contrato de API | Antes de qualquer trabalho multi-agente complexo |
| `/exec-plan` | Não-persistente | Criar e rastrear planos de execução como artefatos do repositório | Funcionalidades complexas precisando de progresso rastreado e logs de decisão |
| `/brainstorm` | Não-persistente | Ideação orientada por design com propostas de 2-3 abordagens | Antes de se comprometer com uma abordagem de implementação |
| `/deepinit` | Não-persistente | Inicialização completa do projeto — AGENTS.md, ARCHITECTURE.md, docs/ | Configurar oh-my-agent em um codebase existente |
| `/review` | Não-persistente | Pipeline QA: segurança OWASP, performance, acessibilidade, qualidade de código | Antes de merge de código, revisão pré-deploy |
| `/debug` | Não-persistente | Debugging estruturado: reproduzir, diagnosticar, corrigir, teste de regressão, varredura | Investigando bugs e erros |
| `/design` | Não-persistente | Workflow de design em 7 fases produzindo DESIGN.md com tokens | Construir sistemas de design, landing pages, redesigns de UI |
| `/scm` | Não-persistente | Commit convencional com auto-detecção de tipo/escopo e divisão por funcionalidade | Após completar mudanças de código |
| `/tools` | Não-persistente | Gerenciamento de visibilidade de ferramentas MCP (enable/disable grupos) | Controlar quais ferramentas MCP agentes podem usar |
| `/stack-set` | Não-persistente | Auto-detectar stack tecnológico do projeto e gerar referências backend | Configurar convenções de codificação específicas de linguagem |

---

## Exemplos de Auto-Detecção

oh-my-agent detecta palavras-chave de workflow em 11 idiomas. Aqui estão exemplos mostrando como linguagem natural aciona workflows:

| Você Digita | Workflow Detectado | Idioma |
|-------------|-------------------|--------|
| "plan the authentication feature" | `/plan` | Inglês |
| "do everything in parallel" | `/orchestrate` | Inglês |
| "review the code for security" | `/review` | Inglês |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | Inglês |
| "design a landing page for our product" | `/design` | Inglês |
| "fix the login bug" | `/debug` | Inglês |
| "계획 세워줘" | `/plan` | Coreano |
| "버그 수정해줘" | `/debug` | Coreano |
| "디자인 시스템 만들어줘" | `/design` | Coreano |
| "자동으로 실행해" | `/orchestrate` | Coreano |
| "コードレビューして" | `/review` | Japonês |
| "計画を立てて" | `/plan` | Japonês |
| "修复这个 bug" | `/debug` | Chinês |
| "设计一���着陆页" | `/design` | Chinês |
| "revisar código" | `/review` | Espanhol |
| "diseña la página" | `/design` | Espanhol |
| "debuggen" | `/debug` | Alemão |
| "coordonner étape par étape" | `/work` | Francês |

**Consultas informativas são filtradas:**

| Você Digita | Resultado |
|-------------|----------|
| "what is orchestrate?" | Nenhum workflow acionado (padrão informativo: "what is") |
| "explain how /plan works" | Nenhum workflow acionado (padrão informativo: "explain") |
| "어떻게 사용해?" | Nenhum workflow acionado (padrão informativo: "어떻게") |
| "レビューとは何ですか" | Nenhum workflow acionado (padrão informativo: "とは") |

---

## Todas as 14 Skills — Referência Rápida

| Skill | Melhor Para | Saída Principal |
|-------|-----------|----------------|
| **oma-brainstorm** | "Tenho uma ideia", explorar abordagens | Documento de design em `docs/plans/` |
| **oma-pm** | "planeje isso", breakdown de tarefas | `.agents/results/plan-{sessionId}.json`, `task-board.md` |
| **oma-frontend** | Componentes UI, formulários, páginas, estilização | Componentes React/TypeScript, testes Vitest |
| **oma-backend** | APIs, auth, lógica de servidor, migrações | Endpoints, modelos, serviços, testes |
| **oma-db** | Design de schema, ERD, ajuste de queries, planejamento de capacidade | Documentação de schema, scripts de migração, glossário |
| **oma-mobile** | Apps mobile, funcionalidades de plataforma | Telas Flutter, gerenciamento de estado, testes |
| **oma-design** | Sistemas de design, landing pages, tokens | `DESIGN.md`, tokens CSS/Tailwind, specs de componentes |
| **oma-qa** | Auditoria de segurança, performance, acessibilidade | Relatório QA com achados CRITICAL/HIGH/MEDIUM/LOW |
| **oma-debug** | Investigação de bugs, análise de causa raiz | Código corrigido + testes de regressão + correções de padrões similares |
| **oma-tf-infra** | Provisionamento de infraestrutura cloud | Módulos Terraform, políticas IAM, estimativas de custo |
| **oma-dev-workflow** | CI/CD, tarefas monorepo, automação de releases | Configs mise.toml, definições de pipeline |
| **oma-translator** | Conteúdo multilingual, arquivos i18n | Texto traduzido preservando tom e registro |
| **oma-orchestrator** | Execução paralela automatizada de agentes | Resultados orquestrados de múltiplos agentes |
| **oma-scm** | Commits Git | Conventional Commits com tipo/escopo adequado |

---

## Configuração de Dashboard

### Dashboard no Terminal

```bash
oma dashboard
```

Exibe tabela com atualização ao vivo no seu terminal:
- ID da sessão e status geral (RUNNING / COMPLETED / FAILED)
- Linhas por agente: status, contagem de turnos, última atividade, tempo decorrido
- Observa `.serena/memories/` para atualizações de progresso em tempo real

### Dashboard Web

```bash
oma dashboard:web
# Abre http://localhost:9847
```

Recursos:
- Atualizações em tempo real via WebSocket (sem refresh manual)
- Reconexão automática em quedas de conexão
- Status da sessão com indicadores de agente codificados por cor (verde=completo, amarelo=executando, vermelho=falhou)
- Streaming de log de atividade dos arquivos de progresso e resultado
- Dados históricos de sessão

### Layout Recomendado

Use 3 terminais:
1. **Terminal de dashboard:** `oma dashboard` — monitoramento contínuo
2. **Terminal de comandos:** Comandos de spawn de agentes, comandos de workflow
3. **Terminal de build:** Execuções de teste, logs de build, operações git

---

## Conceitos-Chave Explicados

### Divulgação Progressiva

Skills carregam em duas camadas para economizar tokens. Camada 1 (SKILL.md, ~800 bytes) está sempre presente. Camada 2 (resources/) carrega apenas quando o agente está trabalhando, e apenas os recursos correspondentes à dificuldade da tarefa. Isso economiza aproximadamente 75% dos tokens comparado a carregar tudo antecipadamente. Em modelos flash-tier (128K de contexto), isso significa aproximadamente 125K tokens disponíveis para trabalho real em vez de 108K.

### Otimização de Tokens

Além da divulgação progressiva, oh-my-agent otimiza tokens através de:
- **Gerenciamento de orçamento de contexto** -- sem leitura completa de arquivos; use `find_symbol` em vez de `read_file`
- **Carregamento preguiçoso de recursos** -- carregar playbooks de erro apenas em erros, checklists apenas na verificação
- **Ramificação baseada em dificuldade** -- Tarefas simples pulam análise e usam checklists mínimos
- **Rastreamento de progresso** -- agentes registram arquivos lidos para prevenir releituras

### Spawning via CLI

Quando você executa `oma agent:spawn`, o CLI:
1. Resolve o vendor (usando a prioridade de 5 níveis)
2. Injeta o protocolo de execução específico do vendor de `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`
3. Compõe o prompt do agente usando as regras principais do SKILL.md, protocolo de execução e recursos relevantes à tarefa
4. Spawna o agente como processo CLI independente
5. O agente escreve progresso em `.serena/memories/progress-{agent}.md`
6. Ao completar, escreve resultado final em `.serena/memories/result-{agent}.md`

### Memória Serena

Agentes coordenam através de arquivos de memória compartilhados em `.serena/memories/`. O orquestrador escreve `orchestrator-session.md` (estado da sessão) e `task-board.md` (atribuições de tarefas). Cada agente escreve seu próprio `progress-{agent}.md` (atualizações turno a turno) e `result-{agent}.md` (saída final). Ferramentas de memória são configuráveis — padrões são `read_memory`, `write_memory`, `edit_memory` via Serena MCP.

### Workspaces

A flag `-w` em `agent:spawn` isola um agente em um diretório específico. Isso é crítico para execução paralela — sem isolamento de workspace, dois agentes podem modificar o mesmo arquivo simultaneamente, criando conflitos. Layout padrão de workspace: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).

---

## Dicas

1. **Seja específico nos prompts.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" produz resultados melhores que "make an app."

2. **Use workspaces para agentes paralelos.** Sempre passe `-w ./path` para prevenir conflitos de arquivo entre agentes executando simultaneamente.

3. **Trave contratos de API antes de spawnar agentes de implementação.** Execute `/plan` primeiro para que agentes frontend e backend concordem em formatos de endpoints.

4. **Monitore ativamente.** Abra um terminal de dashboard para detectar agentes falhando cedo em vez de descobrir problemas após todos os agentes completarem.

5. **Itere com re-spawns.** Se a saída de um agente não está correta, re-spawne com a tarefa original mais contexto de correção. Não recomece.

6. **Comece com `/work` quando inseguro.** Fornece orientação passo a passo com confirmação do usuário em cada portão.

7. **Use `/brainstorm` antes de `/plan` para ideias ambíguas.** Brainstorm clarifica intenção e abordagem antes do agente PM decompor em tarefas.

8. **Execute `/deepinit` em novos codebases.** Cria AGENTS.md e ARCHITECTURE.md que ajudam todos os agentes a entender a estrutura do projeto.

9. **Configure mapeamento agente-CLI.** Roteie tarefas de raciocínio complexo (qa, debug, frontend) para Claude e tarefas de geração rápida (backend, pm) para Gemini.

10. **Use `/ultrawork` para código crítico para produção.** O workflow de 5 fases e 11 etapas de revisão detecta problemas que workflows mais simples perdem.

---

## Solução de Problemas

| Problema | Causa | Solução |
|----------|-------|--------|
| Skills não detectadas na IDE | `.agents/skills/` ausente ou sem arquivos `SKILL.md` | Execute o instalador (`bunx oh-my-agent@latest`), verifique symlinks em `.claude/skills/`, reinicie a IDE |
| CLI não encontrada ao spawnar | CLI de IA não instalada globalmente | `which gemini` / `which claude` — instale CLIs ausentes conforme o guia de instalação |
| Agentes produzindo código conflitante | Sem isolamento de workspace | Use workspaces separados: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard mostra "No agents detected" | Agentes ainda não escreveram na memória | Espere agentes iniciarem (primeira escrita no turno 1), ou verifique se session ID corresponde |
| Dashboard web não inicia | Dependências não instaladas | Execute `bun install` no diretório web/ primeiro |
| Relatório QA tem 50+ problemas | Normal para primeira revisão de codebases grandes | Foque em severidade CRITICAL e HIGH primeiro. Documente MEDIUM/LOW para sprints futuros. |
| Auto-detecção aciona workflow errado | Ambiguidade de palavra-chave | Use `/command` explícito em vez de linguagem natural. Reporte falsos acionamentos para melhoria. |
| Workflow persistente não para | Arquivo de estado ainda existe | Diga "workflow done" no chat, ou delete manualmente o arquivo de estado de `.agents/state/` |
| Agente bloqueado em HIGH clarification | Requisitos muito ambíguos | Forneça as respostas específicas que o agente solicitou, depois re-execute |
| Ferramentas MCP não funcionam | Serena não configurado ou não executando | Verifique config MCP com `oma doctor` |
| Agente excede limite de turnos | Tarefa muito complexa para turnos padrão | Aumente turnos com flag `-t 30`, ou decomponha em tarefas menores |
| CLI errada usada para agente | model_preset (per-agent overrides via `agents:`) não configurado | Execute `oma install` para configurar, ou edite `oma-config.yaml` diretamente |

---

Para padrões de tarefas de domínio único, veja [Guia de Skill Única](./single-skill.md).
Para detalhes de integração em projetos, veja [Guia de Integração](./integration.md).
