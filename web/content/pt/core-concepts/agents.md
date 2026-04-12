---
title: Agentes
description: "Referência completa para todos os 14 agentes do oh-my-agent — seus domínios, stacks tecnológicos, arquivos de recursos, capacidades, protocolo de charter preflight, carregamento de habilidades em duas camadas, regras de execução com escopo, portões de qualidade, estratégia de workspace, fluxo de orquestração e memória em tempo de execução."
---

# Agentes

Agentes no oh-my-agent são papéis especializados de engenharia. Cada agente possui um domínio definido, conhecimento de stack tecnológico, arquivos de recursos, portões de qualidade e restrições de execução. Agentes não são chatbots genéricos — são trabalhadores com escopo que permanecem em sua faixa e seguem protocolos estruturados.

---

## Categorias de Agentes

| Categoria | Agentes | Responsabilidade |
|-----------|---------|-----------------|
| **Ideação** | oma-brainstorm | Explorar ideias, propor abordagens, produzir documentos de design |
| **Planejamento** | oma-pm | Decomposição de requisitos, breakdown de tarefas, contratos de API, atribuição de prioridades |
| **Implementação** | oma-frontend, oma-backend, oma-mobile, oma-db | Escrever código de produção em seus respectivos domínios |
| **Design** | oma-design | Sistemas de design, DESIGN.md, tokens, tipografia, cor, movimento, acessibilidade |
| **Infraestrutura** | oma-tf-infra | Provisionamento Terraform multi-cloud, IAM, otimização de custos, política como código |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migrações, coordenação de releases, automação monorepo |
| **Qualidade** | oma-qa | Auditoria de segurança (OWASP), performance, acessibilidade (WCAG), revisão de qualidade de código |
| **Depuração** | oma-debug | Reprodução de bugs, análise de causa raiz, correções mínimas, testes de regressão |
| **Localização** | oma-translator | Tradução com consciência de contexto preservando tom, registro e termos de domínio |
| **Coordenação** | oma-orchestrator, oma-coordination | Orquestração multi-agente automatizada e manual |
| **Git** | oma-scm | Geração de Conventional Commits, divisão de commits por funcionalidade |

---

## Referência Detalhada dos Agentes

### oma-brainstorm

**Domínio:** Ideação orientada por design antes do planejamento ou implementação.

**Quando usar:** Explorar uma nova ideia de funcionalidade, entender a intenção do usuário, comparar abordagens. Use antes de `/plan` para requisições complexas ou ambíguas.

**Quando NÃO usar:** Requisitos claros (vá para oma-pm), implementação (vá para agentes de domínio), revisão de código (vá para oma-qa).

**Regras principais:**
- Sem implementação ou planejamento antes da aprovação do design
- Uma pergunta de esclarecimento por vez (não em lotes)
- Sempre propor 2-3 abordagens com uma opção recomendada
- Design seção por seção com confirmação do usuário em cada etapa
- YAGNI — projete apenas o necessário

**Workflow:** 6 fases: Exploração de contexto, Perguntas, Abordagens, Design, Documentação (salva em `docs/plans/`), Transição para `/plan`.

**Recursos:** Usa apenas recursos compartilhados (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-pm

**Domínio:** Gerenciamento de produto — análise de requisitos, decomposição de tarefas, contratos de API.

**Quando usar:** Decompor funcionalidades complexas, determinar viabilidade, priorizar trabalho, definir contratos de API.

**Regras principais:**
- Design API-first: definir contratos antes das tarefas de implementação
- Cada tarefa tem: agente, título, critérios de aceitação, prioridade, dependências
- Minimizar dependências para máxima execução paralela
- Segurança e testes são parte de cada tarefa (não fases separadas)
- Tarefas devem ser completáveis por um único agente
- Saída em JSON plan + task-board.md para compatibilidade com o orquestrador

**Saída:** `.agents/results/plan-{sessionId}.json`, `.agents/brain/current-plan.md`, escrita em memória para o orquestrador.

**Recursos:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Limite de turnos:** Padrão 10, máximo 15.

---

### oma-frontend

**Domínio:** Web UI — React, Next.js, TypeScript com arquitetura FSD-lite.

**Quando usar:** Construir interfaces de usuário, componentes, lógica do lado do cliente, estilização, validação de formulários, integração com API.

**Stack tecnológico:**
- React + Next.js (Server Components por padrão, Client Components para interatividade)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (primitivas somente leitura, estender via cva/wrappers)
- FSD-lite: raiz `src/` + feature `src/features/*/` (sem importações cross-feature)

**Bibliotecas:**
| Propósito | Biblioteca |
|-----------|-----------|
| Datas | luxon |
| Estilização | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks |
| Utils | es-toolkit |
| Estado URL | nuqs |
| Estado Servidor | TanStack Query |
| Estado Cliente | Jotai (minimizar uso) |
| Formulários | @tanstack/react-form + Zod |
| Auth | better-auth |

**Regras principais:**
- shadcn/ui primeiro, estender via cva, nunca modificar `components/ui/*` diretamente
- Mapeamento 1:1 de design tokens (nunca hardcode cores)
- Proxy sobre middleware (Next.js 16+ usa `proxy.ts`, não `middleware.ts` para lógica de proxy)
- Sem prop drilling além de 3 níveis — use Jotai atoms
- Imports absolutos com `@/` obrigatório
- Meta de FCP < 1s
- Breakpoints responsivos: 320px, 768px, 1024px, 1440px

**Recursos:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Checklist do portão de qualidade:**
- Acessibilidade: labels ARIA, headings semânticos, navegação por teclado
- Mobile: verificado em viewports mobile
- Performance: sem CLS, carregamento rápido
- Resiliência: Error Boundaries e Loading Skeletons
- Testes: lógica coberta por Vitest
- Qualidade: typecheck e lint passam

**Limite de turnos:** Padrão 20, máximo 30.

---

### oma-backend

**Domínio:** APIs, lógica do lado do servidor, autenticação, operações de banco de dados.

**Quando usar:** APIs REST/GraphQL, migrações de banco de dados, auth, lógica de negócio do servidor, jobs em background.

**Arquitetura:** Router (HTTP) -> Service (Lógica de Negócio) -> Repository (Acesso a Dados) -> Models.

**Detecção de stack:** Lê manifestos do projeto (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) para determinar linguagem e framework. Recorre ao diretório `stack/` se presente, ou pede ao usuário para executar `/stack-set`.

**Regras principais:**
- Arquitetura limpa: sem lógica de negócio em route handlers
- Todas as entradas validadas com a biblioteca de validação do projeto
- Apenas consultas parametrizadas (nunca interpolação de string em SQL)
- JWT + bcrypt para auth; rate limit em endpoints de auth
- Async onde suportado; anotações de tipo em todas as assinaturas
- Exceções customizadas via módulo centralizado de erros
- Estratégia explícita de carregamento ORM, boundaries de transação, lifecycle seguro

**Recursos:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Recursos específicos de stack em `stack/` (gerados por `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Limite de turnos:** Padrão 20, máximo 30.

---

### oma-mobile

**Domínio:** Apps mobile multiplataforma — Flutter, React Native.

**Quando usar:** Apps mobile nativos (iOS + Android), padrões de UI específicos mobile, funcionalidades de plataforma (câmera, GPS, push notifications), arquitetura offline-first.

**Arquitetura:** Clean Architecture: domain -> data -> presentation.

**Stack tecnológico:** Flutter/Dart, Riverpod/Bloc (gerenciamento de estado), Dio com interceptors (API), GoRouter (navegação), Material Design 3 (Android) + iOS HIG.

**Regras principais:**
- Riverpod/Bloc para gerenciamento de estado (sem setState bruto para lógica complexa)
- Todos os controllers dispostos no método `dispose()`
- Dio com interceptors para chamadas de API; tratar offline graciosamente
- Meta de 60fps; testar em ambas as plataformas

**Recursos:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Limite de turnos:** Padrão 20, máximo 30.

---

### oma-db

**Domínio:** Arquitetura de banco de dados — SQL, NoSQL, bancos de dados vetoriais.

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

**Recursos:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domínio:** Sistemas de design, UI/UX, gerenciamento de DESIGN.md.

**Quando usar:** Criar sistemas de design, landing pages, design tokens, paletas de cores, tipografia, layouts responsivos, revisão de acessibilidade.

**Workflow:** 7 fases: Setup (coleta de contexto) -> Extração (opcional, a partir de URLs de referência) -> Aprimoramento (aprimoramento de prompt vago) -> Proposta (2-3 direções de design) -> Geração (DESIGN.md + tokens) -> Auditoria (responsivo, WCAG, Nielsen, verificação de AI slop) -> Entrega.

**Aplicação de anti-padrões ("sem AI slop"):**
- Tipografia: stack de fontes do sistema por padrão; sem Google Fonts padrão sem justificativa
- Cor: sem gradientes purple-to-blue, sem orbs/blobs de gradiente, sem branco puro em preto puro
- Layout: sem cards aninhados, sem layouts desktop-only, sem layouts cookie-cutter de 3 métricas
- Movimento: sem bounce easing em todo lugar, sem animações > 800ms, deve respeitar prefers-reduced-motion
- Componentes: sem glassmorphism em todo lugar, todos os elementos interativos precisam de alternativas de teclado/toque

**Regras principais:**
- Verificar `.design-context.md` primeiro; criar se ausente
- Stack de fontes do sistema por padrão (fontes CJK-ready para ko/ja/zh)
- WCAG AA mínimo para todos os designs
- Responsive-first (mobile como padrão)
- Apresentar 2-3 direções, obter confirmação

**Recursos:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, mais diretório `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d) e `examples/` (design-context-example, landing-page-prompt).

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

**Recursos:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domínio:** Automação de tarefas monorepo e CI/CD.

**Quando usar:** Executar dev servers, executar lint/format/typecheck entre apps, migrações de banco de dados, geração de API, builds i18n, builds de produção, otimização de CI/CD, validação pre-commit.

**Regras principais:**
- Sempre usar tarefas `mise run` em vez de comandos diretos do gerenciador de pacotes
- Executar lint/test apenas em apps alterados
- Validar mensagens de commit com commitlint
- CI deve pular apps não alterados
- Nunca usar comandos diretos do gerenciador de pacotes quando existem tarefas mise

**Recursos:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-qa

**Domínio:** Garantia de qualidade — segurança, performance, acessibilidade, qualidade de código.

**Quando usar:** Revisão final antes do deploy, auditorias de segurança, análise de performance, conformidade de acessibilidade, análise de cobertura de testes.

**Ordem de prioridade da revisão:** Segurança > Performance > Acessibilidade > Qualidade de Código.

**Níveis de severidade:**
- **CRITICAL**: Brecha de segurança, risco de perda de dados
- **HIGH**: Bloqueia lançamento
- **MEDIUM**: Corrigir neste sprint
- **LOW**: Backlog

**Regras principais:**
- Cada achado deve incluir arquivo:linha, descrição e correção
- Executar ferramentas automatizadas primeiro (npm audit, bandit, lighthouse)
- Sem falsos positivos — cada achado deve ser reproduzível
- Fornecer código de correção, não apenas descrições

**Recursos:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Limite de turnos:** Padrão 15, máximo 20.

---

### oma-debug

**Domínio:** Diagnóstico e correção de bugs.

**Quando usar:** Bugs reportados por usuários, crashes, problemas de performance, falhas intermitentes, race conditions, bugs de regressão.

**Metodologia:** Reproduzir primeiro, depois diagnosticar. Nunca adivinhar correções.

**Regras principais:**
- Identificar causa raiz, não apenas sintomas
- Correção mínima: alterar apenas o necessário
- Cada correção recebe um teste de regressão
- Buscar padrões similares em outros lugares
- Documentar em `.agents/brain/bugs/`

**Ferramentas Serena MCP usadas:**
- `find_symbol("functionName")` — localizar a função
- `find_referencing_symbols("Component")` — encontrar todos os usos
- `search_for_pattern("error pattern")` — encontrar problemas similares

**Recursos:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Limite de turnos:** Padrão 15, máximo 25.

---

### oma-translator

**Domínio:** Tradução multilingual com consciência de contexto.

**Quando usar:** Traduzir strings de UI, documentação, textos de marketing, revisar traduções existentes, criar glossários.

**Método em 4 estágios:** Analisar Fonte (registro, intenção, termos de domínio, referências culturais, conotações emocionais, mapeamento de linguagem figurada) -> Extrair Significado (remover estrutura da fonte) -> Reconstruir no Idioma Alvo (ordem natural de palavras, correspondência de registro, divisão/fusão de frases) -> Verificar (rubrica de naturalidade + verificação de padrão anti-IA).

**Modo refinado opcional de 7 estágios** para qualidade de publicação: estende com estágios de Revisão Crítica, Revisão e Polimento.

**Regras principais:**
- Escanear arquivos de locale existentes primeiro para corresponder às convenções
- Traduzir significado, não palavras
- Preservar conotações emocionais
- Nunca produzir traduções palavra por palavra
- Nunca misturar registros dentro de um texto
- Preservar terminologia específica de domínio como está

**Recursos:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Domínio:** Coordenação automatizada multi-agente via CLI spawning.

**Quando usar:** Funcionalidades complexas requerendo múltiplos agentes em paralelo, execução automatizada, implementação full-stack.

**Padrões de configuração:**

| Configuração | Padrão | Descrição |
|--------------|--------|-----------|
| MAX_PARALLEL | 3 | Máximo de subagentes concorrentes |
| MAX_RETRIES | 2 | Tentativas de retry por tarefa falhada |
| POLL_INTERVAL | 30s | Intervalo de verificação de status |
| MAX_TURNS (impl) | 20 | Limite de turnos para backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Limite de turnos para qa/debug |
| MAX_TURNS (plan) | 10 | Limite de turnos para pm |

**Fases do workflow:** Plan -> Setup (ID de sessão, inicialização de memória) -> Execute (spawn por tier de prioridade) -> Monitor (poll de progresso) -> Verify (automatizado + loop de revisão cruzada) -> Collect (compilar resultados).

**Loop de revisão agente-para-agente:**
1. Auto-revisão: agente verifica próprio diff contra critérios de aceitação
2. Verificação automatizada: `oma verify {agent-type} --workspace {workspace}`
3. Revisão cruzada: Agente QA revisa mudanças
4. Em caso de falha: problemas alimentados de volta para correção (máximo 5 iterações totais do loop)

**Monitoramento de Dívida de Clarificação:** Rastreia correções do usuário durante sessões. Eventos pontuados como clarify (+10), correct (+25), redo (+40). CD >= 50 aciona RCA obrigatória. CD >= 80 pausa a sessão.

**Recursos:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domínio:** Geração de commits Git seguindo Conventional Commits.

**Quando usar:** Após completar mudanças de código, ao executar `/scm`.

**Tipos de commit:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow:** Analisar mudanças -> Dividir por funcionalidade (se > 5 arquivos abrangendo diferentes escopos) -> Determinar tipo -> Determinar escopo -> Escrever descrição (imperativo, < 72 chars, minúscula, sem ponto final) -> Executar commit imediatamente.

**Regras:**
- Nunca usar `git add -A` ou `git add .`
- Nunca commitar arquivos de secrets
- Sempre especificar arquivos ao fazer staging
- Usar HEREDOC para mensagens de commit multi-linha
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

## Charter Preflight (CHARTER_CHECK)

Antes de escrever qualquer código, cada agente de implementação deve emitir um bloco CHARTER_CHECK:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {domínio do agente}
- Must NOT do: {3 restrições do escopo da tarefa}
- Success criteria: {critérios mensuráveis}
- Assumptions: {padrões aplicados}
```

**Propósito:**
- Declara o que o agente fará e não fará
- Detecta desvio de escopo antes que o código seja escrito
- Torna suposições explícitas para revisão do usuário
- Fornece critérios de sucesso testáveis

**Níveis de clarificação:**
- **LOW**: Requisitos claros. Prosseguir com suposições declaradas.
- **MEDIUM**: Parcialmente ambíguo. Listar opções, prosseguir com a mais provável.
- **HIGH**: Muito ambíguo. Definir status como bloqueado, listar perguntas, NÃO escrever código.

No modo subagente (spawned via CLI), agentes não podem perguntar diretamente aos usuários. LOW prossegue, MEDIUM restringe e interpreta, HIGH bloqueia e retorna perguntas para o orquestrador transmitir.

---

## Carregamento de Habilidades em Duas Camadas

O conhecimento de cada agente é dividido em duas camadas:

**Camada 1 — SKILL.md (~800 bytes):**
Sempre carregado. Contém frontmatter (name, description), quando usar / não usar, regras principais, visão geral da arquitetura, lista de bibliotecas e referências aos recursos da Camada 2.

**Camada 2 — resources/ (carregado sob demanda):**
Carregado apenas quando o agente está trabalhando ativamente, e apenas os recursos correspondentes ao tipo e dificuldade da tarefa:

| Dificuldade | Recursos Carregados |
|-------------|-------------------|
| **Simples** | Apenas execution-protocol.md |
| **Média** | execution-protocol.md + examples.md |
| **Complexa** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Recursos adicionais são carregados durante a execução conforme necessário:
- `checklist.md` — na etapa de Verificação
- `error-playbook.md` — apenas quando erros ocorrem
- `common-checklist.md` — para verificação final de tarefas Complexas

---

## Execução com Escopo

Agentes operam sob limites estritos de domínio:

- Um agente de frontend não modifica código backend
- Um agente de backend não toca em componentes de UI
- Um agente de DB não implementa endpoints de API
- Agentes documentam dependências fora do escopo para outros agentes

Quando uma tarefa pertencente a um domínio diferente é descoberta durante a execução, o agente a documenta em seu arquivo de resultado como item de escalação, em vez de tentar tratá-la.

---

## Estratégia de Workspace

Para projetos multi-agente, workspaces separados previnem conflitos de arquivo:

```
./apps/api      → workspace do agente backend
./apps/web      → workspace do agente frontend
./apps/mobile   → workspace do agente mobile
```

Workspaces são especificados com a flag `-w` ao spawnar agentes:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Fluxo de Orquestração

Ao executar um workflow multi-agente (`/orchestrate` ou `/work`):

1. **Agente PM** decompõe a requisição em tarefas específicas de domínio com prioridades (P0, P1, P2) e dependências
2. **Sessão inicializada** — ID de sessão gerado, `orchestrator-session.md` e `task-board.md` criados na memória
3. **Tarefas P0** spawned em paralelo (até MAX_PARALLEL agentes concorrentes)
4. **Progresso monitorado** — orquestrador faz poll dos arquivos `progress-{agent}.md` a cada POLL_INTERVAL
5. **Tarefas P1** spawned após P0 completar, e assim por diante
6. **Loop de verificação** executa para cada agente completado (auto-revisão -> verificação automatizada -> revisão cruzada pelo QA)
7. **Resultados coletados** de todos os arquivos `result-{agent}.md`
8. **Relatório final** com resumo da sessão, arquivos alterados, problemas remanescentes

---

## Definições de Agentes

Agentes são definidos em dois locais:

**`.agents/agents/`** — Contém 7 arquivos de definição de subagentes:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

Esses arquivos definem a identidade do agente, referência ao protocolo de execução, template CHARTER_CHECK, resumo da arquitetura e regras. São usados ao spawnar subagentes via Task/Agent tool (Claude Code) ou CLI.

**`.claude/agents/`** — Definições de subagentes específicas da IDE que referenciam os arquivos `.agents/agents/` via symlinks ou cópias diretas para compatibilidade com Claude Code.

---

## Estado em Tempo de Execução (Memória Serena)

Durante sessões de orquestração, agentes coordenam através de arquivos de memória compartilhados em `.serena/memories/` (configurável via `mcp.json`):

| Arquivo | Proprietário | Propósito | Outros |
|---------|-------------|---------|--------|
| `orchestrator-session.md` | Orquestrador | ID da sessão, status, hora de início, rastreamento de fases | Somente leitura |
| `task-board.md` | Orquestrador | Atribuições de tarefas, prioridades, atualizações de status | Somente leitura |
| `progress-{agent}.md` | Aquele agente | Progresso turno a turno: ações realizadas, arquivos lidos/modificados, status atual | Orquestrador lê |
| `result-{agent}.md` | Aquele agente | Saída final: status (completed/failed), resumo, arquivos alterados, checklist de critérios de aceitação | Orquestrador lê |
| `session-metrics.md` | Orquestrador | Rastreamento de Dívida de Clarificação, progressão de Quality Score | QA lê |
| `experiment-ledger.md` | Orquestrador/QA | Rastreamento de experimentos quando Quality Score está ativo | Todos leem |

Ferramentas de memória são configuráveis. O padrão usa Serena MCP (`read_memory`, `write_memory`, `edit_memory`), mas ferramentas customizadas podem ser configuradas em `mcp.json`:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Dashboards (`oma dashboard` e `oma dashboard:web`) observam esses arquivos de memória para monitoramento em tempo real.
