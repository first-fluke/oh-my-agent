---
title: Guia de uso
sidebar_label: Usando o OMA
description: "Guia de uso do OMA, cobrindo a seleção de tarefas orientada ao leitor, exemplos de skill única e de vários domínios, workflows, auto-detecção, todos os 33 pacotes de skills, execução paralela via CLI, dashboards, padrões e recuperação."
---

# Como usar o oh-my-agent

## Início rápido

1. Abra seu projeto em uma IDE ou CLI selecionada com IA (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen ou outro host compatível)
2. O host selecionado pode carregar skills de `.agents/skills/`; hooks habilitados podem detectar workflows por palavras-chave em linguagem natural
3. Descreva em linguagem natural o que você quer. O host ou workflow selecionado encaminha a tarefa para a skill relevante
4. Para trabalho com vários agentes, use `/work` ou `/orchestrate`

Tarefas de um único domínio não precisam de sintaxe especial. Use o [guia de seleção de skills e workflows](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) para escolher entre uma skill única, `/work`, `/orchestrate`, `/ultrawork` e `/ralph`. Consulte o [Início rápido](../getting-started/quick-start.md) para a configuração e [Padrões importantes](../getting-started/important-defaults.md) antes de trocar os fornecedores.

---

## Exemplo 1: tarefa única simples

**Você digita:**

```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**O que acontece:**

1. O host encaminha a solicitação para `oma-frontend` (palavras-chave como "form", "component" e "Tailwind CSS" são sinais de roteamento)
2. A camada 1 (SKILL.md) já está carregada com a identidade do agente, as regras centrais e a lista de bibliotecas
3. Os recursos da camada 2 são carregados sob demanda:
   - `execution-protocol.md`: o workflow de 4 etapas (Analyze, Plan, Implement, Verify)
   - `snippets.md`: padrões de formulário e validação com Zod
   - padrões de componentes existentes e `snippets.md` quando fornecidos pela skill
4. O agente produz um **CHARTER_CHECK**:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. O agente implementa:
   - Componente React com TypeScript em `src/features/auth/components/login-form.tsx`
   - Schema de validação Zod em `src/features/auth/utils/login-validation.ts`
   - Testes Vitest em `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Skeleton de carregamento em `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
6. O agente executa a checklist: acessibilidade (labels ARIA, HTML semântico, navegação por teclado), viewport mobile, performance (sem CLS) e error boundaries

**Resultado esperado:** Um componente React delimitado com TypeScript, validação, testes e evidências de acessibilidade quando o projeto oferecer essas verificações. O prompt e o workflow selecionado determinam quais arquivos e verificações realmente serão executados.

---

## Exemplo 2: projeto multi-domínio

**Você digita:**

```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**O que acontece:**

1. Essa solicitação abrange trabalho de frontend, backend e mobile. O agente host pode usar esse escopo para recomendar uma abordagem de coordenação.
2. Com o hook de detecção de palavras-chave habilitado, "Build a TODO app" corresponde a um padrão configurado de `/orchestrate` e pode ativá-lo. O hook corresponde ao texto; ele não classifica a solicitação como multi-domínio. Use um comando explícito para selecionar o workflow desejado.

**Usando `/work` (passo a passo com controle do usuário):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Etapa 1, o agente PM planeja:**
   - Identifica os domínios: backend (API de auth, CRUD de tarefas), frontend (login, UI da lista de tarefas), mobile (app Flutter)
   - Define contratos de API: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - Cria um breakdown de tarefas priorizado:
     - P0: API de auth do backend, API de CRUD de tarefas do backend
     - P1: login/registro do frontend, lista de tarefas do frontend, telas de auth mobile, lista de tarefas mobile
     - P2: revisão QA
   - Salva em `.agents/results/plan-{sessionId}.json`

4. **Etapa 2, revisar o plano:** O agente apresenta o plano e continua dentro da autorização existente, perguntando somente quando falta uma decisão relevante ou uma nova autorização.

5. **Etapa 3, iniciar agentes por prioridade:**
   ```bash
   # P0 tier (parallel)
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Etapa 4, o agente QA revisa:**
   - Segurança: conformidade com OWASP Top 10 (validação JWT, CSRF, verificação de injeção SQL)
   - Performance: verificação de queries N+1 e paginação
   - Acessibilidade: WCAG 2.1 AA em todos os componentes frontend
   - Entre domínios: alinhamento do contrato de API entre frontend, mobile e backend

7. **Etapa 5, iterar:** Se o QA encontrar problemas CRITICAL, inicie novamente o agente responsável com o relatório de QA.

---

## Exemplo 3: correção de bug

**Você digita:**

```
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**O que acontece:**

1. `oma-debug` é ativada automaticamente (palavras-chave: "bug", "error", "Cannot read property")
2. **Etapa 1, coletar:** A mensagem de erro e o contexto são capturados
<!-- oma-docs:ignore-start -->
3. **Etapa 2, reproduzir:** MCP `search_for_pattern` encontra a chamada `.map()` em `src/features/tasks/components/task-list.tsx`
<!-- oma-docs:ignore-end -->
4. **Etapa 3, diagnosticar:** MCP `find_referencing_symbols` rastreia o fluxo de dados:
   - O hook `useQuery` busca tarefas da API
   - O componente renderiza antes de os dados chegarem
   - `tasks` é `undefined` durante o estado de carregamento
   - Causa raiz: falta uma verificação do estado de carregamento antes de `.map()`
5. **Etapa 4, propor a correção:** Apresentar mudança mínima adicionando a verificação de carregamento e uma guarda para nulo
6. **Etapa 5, implementar:**
   - Adicionar um skeleton de carregamento enquanto os dados são buscados
   - Adicionar a verificação de nulo: `tasks?.map()` ou retorno antecipado para o estado de carregamento
   - Escrever um teste de regressão que confirme que o componente renderiza corretamente quando `tasks` é undefined
7. **Etapa 6, procurar padrões semelhantes:** MCP `search_for_pattern` procura outras chamadas `.map()` em arrays potencialmente indefinidos
   - Encontra 3 padrões semelhantes em `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`
   - Aplica proativamente o mesmo padrão de correção
8. **Etapa 7, documentar:** O relatório do bug é escrito na memória com causa raiz, correção e prevenção

---

## Exemplo 4: sistema de design

**Você digita:**

```
Design a dark premium landing page for my B2B SaaS analytics product
```

**O que acontece:**

1. `oma-design` é ativada (palavras-chave: "design", "landing page", "dark", "premium")
2. **Fase 1, SETUP:** Verifica `.design-context.md`. Se estiver ausente, pergunta:
   - Quais idiomas o serviço suporta? (somente en / + CJK)
   - Público-alvo? (B2B, usuários técnicos, 25-45)
   - Personalidade da marca? (profissional / premium)
   - Direção estética? (dark premium)
   - Sites de referência? (o usuário fornece exemplos)
   - Acessibilidade? (WCAG AA)
3. **Fase 3, ENHANCE:** Se o prompt for vago, transforma-o em uma especificação seção por seção
4. **Fase 4, PROPOSE:** Apresenta 3 direções de design:
   - **Direção A: "Midnight Observatory"**: Navy profundo (#0f1729), acentos cyan (#22d3ee), Inter + JetBrains Mono, layout bento grid, revelações acionadas por scroll
   - **Direção B: "Carbon Interface"**: Cinza neutro (#18181b), acentos amber (#f59e0b), fontes do sistema, layout xadrez, micro-interações acionadas por hover
   - **Direção C: "Deep Space"**: Dark puro (#0a0a0a), acentos emerald (#10b981), Geist + Geist Mono, seções full-bleed, animações de entrada
5. **Fase 5, GENERATE:** Com base na direção escolhida, gera:
   - `DESIGN.md` com 6 seções (tipografia, cor, espaçamento, movimento, componentes, acessibilidade)
   - propriedades customizadas CSS
   - extensões da configuração Tailwind
   - variáveis de tema shadcn/ui
6. **Fase 6, AUDIT:** Executa verificações de responsividade (mínimo de 320px), WCAG 2.2, heurísticas de Nielsen e detecção de AI slop
7. **Fase 7, HANDOFF:** "Design concluído. Execute `/orchestrate` para implementar com oma-frontend."

---

## Exemplo 5: execução paralela via CLI

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web    # Web UI at http://localhost:9847

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

Se o runtime atual corresponder ao vendor-alvo em `.agents/oma-config.yaml`, os workflows devem preferir subagentes nativos:

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`, selecionado por meio do `subagent_type` da ferramenta Agent
- Antigravity CLI/IDE -> `oma agent spawn` por meio de `agy`

Tarefas entre vendors e `model_preset: free` usam `oma agent spawn`. O dispatch nativo ainda exige o [ciclo de vida do resultado](./agent-results-and-resume.md) para registrar a evidência de verificação.

---

## Exemplo 6: ultrawork para qualidade máxima

**Você digita:**

```
/ultrawork Build a payment processing module with Stripe integration
```

**O que acontece (5 fases, 17 etapas, 12 etapas de revisão isoladas):**

**Fase 1, PLAN (etapas 1-4, agente PM inline):**
- Etapa 1: Criar plano com breakdown de tarefas, contratos de API e dependências
- Etapa 2: Revisão do plano (verificação de completude; todos os requisitos estão mapeados?)
- Etapa 3: Meta-revisão (verificar se a revisão foi suficiente)
- Etapa 4: Revisão de over-engineering (foco em MVP, sem complexidade desnecessária)
- PLAN_GATE: Plano documentado, suposições listadas e escopo autorizado

**Fase 2, IMPL (etapa 5, agentes Dev iniciados):**
- O agente backend implementa a integração Stripe (webhooks, idempotência, tratamento de erros)
- O agente frontend cria o fluxo de checkout e a UI do status do pagamento
- Etapa 5.2: Registrar um baseline somente quando uma comparação de medição definida for necessária
- IMPL_GATE: As verificações aplicáveis sem emissão e os testes passam, somente arquivos planejados foram modificados; verificações de build são executadas apenas quando solicitadas explicitamente

**Fase 3, VERIFY (etapas 6-8, agente QA iniciado):**
- Etapa 6: Revisão de alinhamento (a implementação corresponde ao plano?)
- Etapa 7: Revisão de segurança e bugs (OWASP, npm audit, práticas recomendadas de segurança do Stripe)
- Etapa 8: Revisão de melhoria e regressão (nenhuma regressão foi introduzida)
- VERIFY_GATE: Zero CRITICAL, zero HIGH, metas de medição aplicáveis do projeto atingidas

**Fase 4, REFINE (etapas 9-13, agente de refatoração iniciado):**
- Etapa 9: Dividir arquivos grandes (> 500 linhas) e funções (> 50 linhas)
- Etapa 10: Revisão de integração e reuso (eliminar lógica duplicada)
- Etapa 11: Revisão de efeitos colaterais (rastrear o impacto em cascata com `find_referencing_symbols`)
- Etapa 12: Revisão completa das mudanças (consistência de nomes, alinhamento de estilo)
- Etapa 13: Limpar código morto
- REFINE_GATE: nenhuma regressão medida pendente, código limpo

**Fase 5, SHIP (etapas 14-17, agente QA iniciado):**
- Etapa 14: Revisão de qualidade do código (lint, tipos, cobertura)
- Etapa 15: Verificação do fluxo UX (jornada de pagamento do usuário de ponta a ponta)
- Etapa 16: Revisão de problemas relacionados (verificação final do impacto em cascata)
- Etapa 17: Prontidão para deploy (gerenciamento de secrets, scripts de migração, plano de rollback)
- SHIP_GATE: Todas as verificações passam; reutilize a autorização existente. Publicar ou fazer deploy exige autorização para essa ação.

---

## Todos os comandos de workflow

| Comando | Tipo | O que faz | Quando usar |
|---------|------|-----------|-------------|
| `/orchestrate` | Persistente | Carrega ou cria um plano e então delega a execução paralela com monitoramento e verificação | Tarefas independentes adequadas à coordenação paralela automatizada |
| `/work` | Persistente | Planejamento, implementação e QA passo a passo em vários domínios dentro do escopo autorizado | Funcionalidades que abrangem vários domínios e exigem entrega coordenada |
| `/ultrawork` | Persistente | Workflow de qualidade em 5 fases e 17 etapas com 12 checkpoints de revisão isolados | Entrega de qualidade máxima, código crítico para produção |
| `/plan` | Não persistente | Breakdown de tarefas conduzido pelo PM, contratos de API e artefatos de plano acompanhados em `docs/plans/work/` (arquivos sequenciais `NNN-name.md`, campo Status para o ciclo de vida) | Antes de qualquer trabalho complexo com vários agentes; funcionalidades complexas que precisam de progresso acompanhado e registros de decisão |
| `/brainstorm` | Não persistente | Ideação orientada ao design com propostas de 2-3 abordagens | Antes de se comprometer com uma abordagem de implementação |
| `/deepinit` | Não persistente | Inicialização completa do projeto (AGENTS.md, ARCHITECTURE.md, docs/) | Configurar o oh-my-agent em um codebase existente |
| `/review` | Não persistente | Pipeline de QA: segurança OWASP, performance, acessibilidade e qualidade do código | Antes de fazer merge, revisão pré-deploy |
| `/debug` | Não persistente | Debugging estruturado: reproduzir, diagnosticar, corrigir, teste de regressão e varredura | Investigar bugs e erros |
| `/design` | Não persistente | Workflow de design em 7 fases que produz DESIGN.md com tokens | Construir sistemas de design, landing pages e redesigns de UI |
| `/scm` | Não persistente | Workflow de SCM para Git (branch/merge/conflito/worktree/baseline) e geração de Conventional Commit com detecção automática de tipo/escopo e divisão por funcionalidade | Depois de concluir mudanças de código ou ao tratar tarefas de gerenciamento de configuração do repositório |
| `/tools` | Não persistente | Gerenciamento da visibilidade de ferramentas MCP (habilitar/desabilitar grupos) | Controlar quais ferramentas MCP os agentes podem usar |
| `/stack-set` | Não persistente | Detecta automaticamente a stack do projeto e gera referências para backend ou mobile (Swift/Flutter/RN) | Configurar convenções de código específicas da linguagem |
| `/architecture` | Não persistente | Diagnóstico de arquitetura, comparação e registros de decisão | Revisar fronteiras ou escolher uma arquitetura |
| `/convert` | Não persistente | Encaminha a conversão de documentos para a skill apropriada | Converter fontes HWP/HWPX ou PDF |
| `/docs` | Não persistente | Verificação da documentação e propostas de sincronização direcionadas ao diff | Conferir a documentação contra o codebase atual |
| `/explain` | Não persistente | Gera e valida um explainer HTML offline de mudanças de código | Ensinar um diff, PR, branch ou intervalo de commits |
| `/recap` | Não persistente | Resume o trabalho nos históricos das ferramentas de IA compatíveis | Retrospectivas diárias ou por período |
| `/schedule` | Não persistente | Registra jobs recorrentes de agentes | Recaps noturnos, scans ou manutenção |
| `/video` | Não persistente | Compõe vídeos reproduzíveis a partir de scripts, narração e visuais | Shorts, explainers e demos |
| `/ralph` | Persistente | Execução repetida de ultrawork com um juiz independente e salvaguardas de loop | Solicitações explícitas para repetir a execução até que os critérios mecânicos de conclusão passem |

---

## Exemplos de auto-detecção

oh-my-agent detecta palavras-chave de workflows em 11 idiomas. Estes exemplos mostram como a linguagem natural aciona workflows:

| Você digita | Workflow detectado | Idioma |
|-------------|-------------------|--------|
| "planeje a funcionalidade de autenticação" | `/plan` | Português |
| "faça tudo em paralelo" | `/orchestrate` | Português |
| "revise o código quanto à segurança" | `/review` | Português |
| "faça brainstorming de ideias para o dashboard" | `/brainstorm` | Português |
| "crie uma landing page para nosso produto" | `/design` | Português |
| "corrija o bug de login" | `/debug` | Português |
| "계획 세워줘" | `/plan` | Coreano |
| "버그 수정해줘" | `/debug` | Coreano |
| "디자인 시스템 만들어줘" | `/design` | Coreano |
| "자동으로 실행해" | `/orchestrate` | Coreano |
| "コードレビューして" | `/review` | Japonês |
| "計画を立てて" | `/plan` | Japonês |
| "修复这个 bug" | `/debug` | Chinês |
| "设计一个着陆页" | `/design` | Chinês |
| "revisar código" | `/review` | Espanhol |
| "diseña la página" | `/design` | Espanhol |
| "debuggen" | `/debug` | Alemão |
| "coordonner étape par étape" | `/work` | Francês |
| "não pare até terminar" | `/ralph` | Português |
| "끝까지 해" | `/ralph` | Coreano |
| "最後までやって" | `/ralph` | Japonês |

**Consultas informativas são filtradas:**

| Você digita | Resultado |
|-------------|----------|
| "o que é orchestrate?" | Nenhum workflow é acionado (padrão informativo: "what is") |
| "explique como funciona /plan" | Nenhum workflow é acionado (padrão informativo: "explain") |
| "어떻게 사용해?" | Nenhum workflow é acionado (padrão informativo: "어떻게") |
| "レビューとは何ですか" | Nenhum workflow é acionado (padrão informativo: "とは") |

---

## Todas as 33 skills: referência rápida

O preset `all` do instalador segue o registro ativo. A tabela agrupa cada skill atual pelo uso principal; uma skill ainda pode coordenar com outra em uma fronteira.

| Skill | Melhor para | Saída principal |
|-------|-------------|-----------------|
| **oma-academic-writing** | Redação acadêmica, revisão e análise anti-AI | Prosa orientada à publicação e revisões de claims/evidências |
| **oma-architecture** | Fronteiras de sistema, tradeoffs e ADRs | Recomendação de arquitetura ou registro de decisão |
| **oma-backend** | APIs, auth, lógica de servidor e migrações | Alterações de router/serviço/repositório e verificação |
| **oma-brainstorm** | Ideias ambíguas e comparação de abordagens | Documento de design em `docs/plans/designs/` |
| **oma-coordination** | Coordenação manual de vários agentes | Orientação passo a passo para tarefas e handoffs |
| **oma-db** | Design de schema, ERD, ajuste de queries e planejamento de capacidade | Documentação de schema, migrações e plano de recuperação |
| **oma-debug** | Reprodução de bugs e análise de causa raiz | Correção mínima, evidência de regressão e varredura de padrões |
| **oma-deepsec** | Varredura de vulnerabilidades com agentes | Relatórios de scan, triagem, revalidação e gates |
| **oma-design** | Sistemas de design, landing pages e tokens | `DESIGN.md`, tokens e orientação de componentes |
| **oma-dev-workflow** | CI/CD, monorepos, migrações e automação de releases | Configuração de workflow e verificações de release |
| **oma-docs** | Referências quebradas e deriva documental | Relatório de verificação ou candidatos de sync por diff |
| **oma-explanation** | Walkthroughs de diff, PR, branch ou commits | Explainer HTML offline com Background, Intuition, Code e Quiz |
| **oma-frontend** | Componentes UI, formulários, páginas e estilização Angular ou React | Alterações frontend e verificações relevantes |
| **oma-hwp** | Conversão HWP/HWPX/HWPML | Markdown com headings, tabelas, imagens e links |
| **oma-image** | Geração de imagens e assets visuais | Execução de imagem reproduzível com manifest |
| **oma-market** | Pain points, tendências, concorrentes e pesquisa de descoberta | Brief de pesquisa compatível com LAW e frameworks |
| **oma-mobile** | Trabalho Flutter, React Native e Swift iOS | Telas mobile, estado, integração de plataforma e testes |
| **oma-observability** | Traces, métricas, logs, profiles, SLOs e forense de incidentes | Recomendação de observabilidade por camada ou orientação de implementação |
| **oma-orchestration** | Execução paralela automatizada de agentes | Planos coordenados, atualizações de memória e coleta de resultados |
| **oma-pdf** | Conversão de PDF e extração com OCR | Markdown com ordem de leitura, tabelas, listas e imagens |
| **oma-pm** | Requisitos, breakdown de tarefas e contratos de API | `.agents/results/plan-{sessionId}.json` e quadro de tarefas |
| **oma-qa** | Revisão de segurança, performance, acessibilidade e qualidade | Relatório de achados com severidade e evidência de correção |
| **oma-recap** | Retrospectivas de trabalho entre ferramentas | Recap diário ou por período em `.agents/results/recap/` |
| **oma-refactor** | Refatoração segura orientada por comportamento | Mudança incremental com métricas e segurança de caracterização |
| **oma-scholar** | Pesquisa acadêmica e sidecars de artigos | Sidecar `.knows.yaml` validado ou síntese de literatura |
| **oma-scm** | SCM, Git e gerenciamento de worktrees | Commits convencionais e orientação de baseline |
| **oma-search** | Busca com pontuação de confiança em docs, web, código e recursos locais | Resultados de busca roteados com rótulos de confiança |
| **oma-skill-creation** | Criar e auditar skills OMA | Arquivos de skill SSL-lite e resultados de `oma skill audit` |
| **oma-slide** | Decks HTML e exportação multimodal | Deck HTML acessível com notas e artefatos exportados |
| **oma-tf-infra** | Provisionamento Terraform multi-cloud | Módulos Terraform, políticas IAM e controles de infraestrutura |
| **oma-translation** | Localização contextual de UI, docs e prosa | Texto traduzido com placeholders, estrutura e registro preservados |
| **oma-video** | Vídeos curtos, explainers e demos | Execução de vídeo reproduzível com manifest |
| **oma-voice** | TTS/STT local e voiceovers | Áudio sintetizado ou transcrição local |

---

## Configuração de dashboard

### Dashboard no terminal

```bash
oma dashboard terminal
```

Exibe uma tabela com atualização ao vivo no terminal:
- ID da sessão e status geral
- Status por agente (running, completed, failed)
- Contagem de turnos
- Atividade mais recente dos arquivos de progresso
- Tempo decorrido

O dashboard observa `.agents/state/memories/` para atualizações de progresso em tempo real.

### Dashboard web

```bash
oma dashboard web
# Opens http://localhost:9847
```

Recursos:
- Atualizações em tempo real via WebSocket (sem refresh manual)
- Reconexão automática após quedas de conexão
- Status da sessão com indicadores de agente codificados por cor (verde=concluído, amarelo=executando, vermelho=falhou)
- Streaming do log de atividade dos arquivos de progresso e resultado
- Dados históricos da sessão

### Layout recomendado

Use 3 terminais:
1. **Terminal de dashboard:** `oma dashboard terminal` para monitoramento contínuo
2. **Terminal de comandos:** comandos de criação de agentes e comandos de workflow
3. **Terminal de build:** execuções de teste, logs de build e operações Git

---

## Conceitos-chave explicados

### Divulgação progressiva

As skills são carregadas em duas camadas para economizar tokens. A camada 1 (`SKILL.md`, mediana de cerca de 2.631 tokens na árvore atual de 33 skills) entra no contexto quando o host roteia a skill; o injetor passa um caminho, não o conteúdo. A camada 2 (`resources/`) é lida somente conforme a tarefa exige, de acordo com os tiers de dificuldade. Medido em uma sessão com 5 agentes, uma tarefa Simples ou Média mantém cerca de 18-19K tokens de contexto de skills contra um teto de 73K, deixando aproximadamente 109K de um contexto de 128K para o trabalho real; uma tarefa Complexa mantém cerca de 39K, deixando aproximadamente 89K. Consulte a [matemática da economia de tokens](../core-concepts/skills.md#token-savings-math) para a tabela e o script que reproduz o cálculo.

### Otimização de tokens

Além da divulgação progressiva, o oh-my-agent otimiza tokens por meio de:
- **Gerenciamento do orçamento de contexto:** sem leituras completas de arquivos; use `find_symbol` em vez de `read_file`
- **Carregamento preguiçoso de recursos:** carregue playbooks de erro somente em erros e checklists somente durante a verificação
- **Ramificação por dificuldade:** tarefas Simples pulam a análise e usam checklists mínimos
- **Acompanhamento de progresso:** agentes registram arquivos lidos para evitar releituras

### Criação via CLI

Quando você executa `oma agent spawn`, a CLI:
1. Resolve o vendor do papel a partir das opções explícitas, substituições de agente, preset de modelo e fallback configurado
2. Injeta o protocolo de execução específico do vendor de `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`
3. Compõe o prompt do agente usando as regras centrais do SKILL.md, o protocolo de execução e os recursos relevantes à tarefa
4. Inicia o agente como um processo CLI independente
5. A execução registra um recibo estruturado em `.agents/state/agent-runs/` e injeta um caminho de claim
6. O agente escreve um claim estruturado; arquivos Markdown de progresso e resultado legíveis por humanos são complementares

### Armazenamento de memória do projeto

Os agentes coordenam por meio de arquivos duráveis em `.agents/state/memories/` (projetos antigos recorrem ao caminho legado `.serena/memories/`). O orquestrador escreve arquivos de sessão e quadro de tarefas específicos da execução. Cada execução escreve `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` e `result-{agentId}-{taskId}-{runId}-{sessionId}.md` quando a saída Markdown de progresso ou resultado está habilitada; recibos e claims estruturados em `.agents/state/agent-runs/` são a autoridade para criações via CLI. Os agentes leem e escrevem esses arquivos com suas ferramentas nativas; o mapeamento de ferramentas permanece configurável em `.agents/mcp.json → memoryConfig.tools`.

### Workspaces

<!-- oma-docs:ignore-start -->
A flag `-w` em `agent spawn` isola um agente em um diretório específico. Isso é essencial para execução paralela. Sem isolamento de workspace, dois agentes podem modificar o mesmo arquivo simultaneamente, criando conflitos. Layout padrão: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Dicas

1. **Seja específico nos prompts.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" produz resultados melhores que "make an app."
2. **Use workspaces para agentes paralelos.** Sempre passe `-w ./path` para evitar conflitos de arquivo entre agentes em execução simultânea.
3. **Trave os contratos de API antes de criar agentes de implementação.** Execute `/plan` primeiro para que os agentes frontend e backend concordem sobre as formas dos endpoints.
4. **Monitore ativamente.** Abra um terminal de dashboard para detectar agentes com falha cedo, em vez de descobrir problemas depois que todos terminarem.
5. **Itere criando agentes novamente.** Se a saída de um agente não estiver correta, recrie-o com a tarefa original e o contexto da correção. Não recomece do zero.
6. **Ajuste a coordenação à tarefa.** Comece com uma skill única para um domínio; use o [guia de seleção](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) quando a tarefa precisar de coordenação ou de um processo explícito de qualidade.
7. **Use `/brainstorm` antes de `/plan` para ideias ambíguas.** O brainstorm esclarece a intenção e a abordagem antes de o agente PM decompor as tarefas.
8. **Execute `/deepinit` em codebases novos.** Ele cria AGENTS.md e ARCHITECTURE.md, que ajudam todos os agentes a entender a estrutura do projeto.
9. **Configure `model_preset`.** Comece com `auto`, escolha um preset fixo como `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` ou `mixed`, ou use `free` com seu gateway local. Adicione substituições `agents:` para controle detalhado. Consulte [Modelos por agente](./per-agent-models.md).
10. **Use `/ultrawork` quando quiser explicitamente seu processo completo de revisão.** O workflow de 5 fases executa 12 etapas de revisão isoladas; carregar skills, por si só, não executa essas verificações.

---

## Solução de problemas

| Problema | Causa | Correção |
|---------|-------|---------|
| Skills não detectadas na IDE | `.agents/skills/` ausente ou sem arquivos `SKILL.md` | Execute o instalador (`bunx oh-my-agent@latest`), verifique os symlinks em `.claude/skills/` e reinicie a IDE |
| CLI não encontrada ao criar agente | CLI de IA selecionada não instalada ou fora do `PATH` | Execute `which <selected-cli>` (por exemplo, `claude`, `codex`, `agy`, `qwen` ou `kiro`), abra um novo shell ou instale-a conforme o guia de instalação |
| Agentes produzindo código conflitante | Sem isolamento de workspace | Use workspaces separados: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard mostra "No agents detected" | Os agentes ainda não escreveram na memória | Aguarde os agentes iniciarem (primeira escrita no turno 1) ou verifique se o ID de sessão corresponde |
| Dashboard web não inicia | Dependências não instaladas | Execute `bun install` no diretório web/ primeiro |
| Relatório QA tem mais de 50 problemas | Normal na primeira revisão de codebases grandes | Concentre-se primeiro na severidade CRITICAL e HIGH. Documente MEDIUM/LOW para sprints futuras. |
| Auto-detecção aciona o workflow errado | Ambiguidade de palavras-chave | Use `/command` explícito em vez de linguagem natural. Relate falsos acionamentos para melhoria. |
| Workflow persistente não para | O arquivo de estado ainda existe | Diga "workflow done" no chat ou exclua manualmente o arquivo de estado de `.agents/state/` |
| Agente bloqueado em esclarecimento HIGH | Requisitos muito ambíguos | Forneça as respostas específicas solicitadas pelo agente e execute novamente |
| Ferramentas MCP não funcionam | Serena não configurado ou não executando | Execute `oma doctor` para verificar a configuração MCP |
| Agente excede seu orçamento de execução | Tarefa complexa demais para uma execução | Decomponha a tarefa, use um workflow com limites de tarefa explícitos ou tente novamente com um contrato de aceitação mais estreito |
| CLI errada usada para o agente | `model_preset` não configurado ou substituição do agente ausente | Execute `oma install` para configurar ou defina `model_preset` em `oma-config.yaml`. Consulte [Modelos por agente](./per-agent-models.md). |

---

Para padrões de tarefas de domínio único, consulte o [Guia de Skill Única](./single-skill.md).
Para detalhes de integração em projetos, consulte o [Guia de Integração](./integration.md).
