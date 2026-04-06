---
title: "Guia: Projetos Multi-Agente"
description: "Guia completo para coordenar múltiplos agentes de domínio entre frontend, backend, banco de dados, mobile e QA — do planejamento ao merge."
---

# Guia: Projetos Multi-Agente

## Quando Usar Coordenação Multi-Agente

Sua funcionalidade abrange múltiplos domínios — API backend + UI frontend + schema de banco de dados + cliente mobile + revisão QA. Um único agente não consegue lidar com o escopo completo, e você precisa que os domínios progridam em paralelo sem pisar nos arquivos uns dos outros.

A coordenação multi-agente é a escolha correta quando:

- A tarefa envolve 2 ou mais domínios (frontend, backend, mobile, db, QA, debug, pm).
- Existem contratos de API entre domínios (ex: um endpoint REST consumido por web e mobile).
- Você quer execução paralela para reduzir o tempo real.
- Você precisa de revisão QA após implementação em todos os domínios.

Se sua tarefa cabe inteiramente em um domínio, use o agente específico diretamente.

---

## A Sequência Completa: /plan até /review

O workflow multi-agente recomendado segue um pipeline estrito de quatro etapas.

### Step 1: /plan — Requisitos e Decomposição de Tarefas

O workflow `/plan` executa inline (sem spawning de subagentes) e produz um plano estruturado.

```
/plan
```

O que acontece:

1. **Coletar requisitos** — O agente PM pergunta sobre usuários-alvo, funcionalidades principais, restrições e alvos de deploy.
2. **Analisar viabilidade técnica** — Usa ferramentas de análise de código MCP (`get_symbols_overview`, `find_symbol`, `search_for_pattern`) para escanear o codebase existente em busca de código reutilizável e padrões de arquitetura.
3. **Definir contratos de API** — Projeta contratos de endpoint (method, path, schemas de request/response, auth, respostas de erro) e os salva em `.agents/skills/_shared/core/api-contracts/`.
4. **Decompor em tarefas** — Quebra o projeto em tarefas acionáveis, cada uma com: agente atribuído, título, critérios de aceitação, prioridade (P0-P3) e dependências.
5. **Revisar plano com usuário** — Apresenta o plano completo para confirmação. O workflow não prosseguirá sem aprovação explícita do usuário.
6. **Salvar plano** — Escreve o plano aprovado em `.agents/plan.json` e registra um resumo na memória.

A saída `.agents/plan.json` é a entrada para ambos `/work` e `/orchestrate`.

### Step 2: /work ou /orchestrate — Execução

Você tem dois caminhos de execução:

| Aspecto | /work | /orchestrate |
|:--------|:-----------|:-------------|
| **Interação** | Interativo — usuário confirma em cada etapa | Automatizado — executa até conclusão |
| **Planejamento PM** | Integrado (Step 2 executa agente PM) | Requer plan.json do /plan |
| **Checkpoint do usuário** | Após revisão do plano (Step 3) | Antes de iniciar (plano deve existir) |
| **Modo persistente** | Sim — não pode ser terminado até completar | Sim — não pode ser terminado até completar |
| **Melhor para** | Primeiro uso, projetos complexos precisando de supervisão | Execuções repetidas, tarefas bem definidas |

#### /work — Pipeline Multi-Agente Interativo

```
/work
```

1. Analisa a requisição do usuário e identifica domínios envolvidos.
2. Executa o agente PM para decomposição de tarefas (cria plan.json).
3. Apresenta plano para confirmação do usuário — **bloqueia até confirmação**.
4. Spawna agentes por tier de prioridade (P0 primeiro, depois P1, etc.), com cada tarefa de mesma prioridade executando em paralelo.
5. Monitora progresso dos agentes via arquivos de memória.
6. Executa revisão do agente QA em todos os entregáveis (OWASP Top 10, performance, acessibilidade, qualidade de código).
7. Se QA encontrar problemas CRITICAL ou HIGH, re-spawna o agente responsável com achados do QA. Repete até 2 vezes por problema. Se o mesmo problema persiste, ativa o **Exploration Loop** — gera 2-3 abordagens alternativas, spawna o mesmo tipo de agente com diferentes prompts de hipótese em workspaces separados, QA pontua cada um, e o melhor resultado é adotado.

#### /orchestrate — Execução Paralela Automatizada

```
/orchestrate
```

1. Carrega `.agents/plan.json` (não prosseguirá sem um).
2. Inicializa sessão com formato de ID `session-YYYYMMDD-HHMMSS`.
3. Cria `orchestrator-session.md` e `task-board.md` no diretório de memória.
4. Spawna agentes por tier de prioridade, cada um recebendo: descrição da tarefa, contratos de API e contexto.
5. Monitora progresso fazendo poll dos arquivos `progress-{agent}.md`.
6. Verifica cada agente completado via `verify.sh` — PASS (exit 0) aceita, FAIL (exit 1) re-spawna com contexto do erro (máximo 2 retries), e falha persistente aciona o Exploration Loop.
7. Coleta todos os arquivos `result-{agent}.md` e compila relatório final.

### Step 3: agent:spawn — Gerenciamento de Agentes via CLI

O comando `agent:spawn` é o mecanismo de baixo nível que workflows chamam internamente. Você também pode usá-lo diretamente:

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Todas as flags:**

| Flag | Descrição |
|:-----|:-----------|
| `-m, --model <vendor>` | Sobrescrita de vendor CLI (gemini/claude/codex/qwen). Sobrescreve toda config. |
| `-w, --workspace <path>` | Diretório de trabalho para o agente. Auto-detectado da config monorepo se omitido. |

**Ordem de resolução de vendor** (primeira correspondência vence):

1. Flag `--model` na linha de comando
2. `agent_cli_mapping` em `oma-config.yaml` para este tipo específico de agente
3. `default_cli` em `oma-config.yaml`
4. `active_vendor` em `cli-config.yaml`
5. `gemini` (padrão codificado)

**Auto-detecção de workspace** verifica configs de monorepo nesta ordem: pnpm-workspace.yaml, package.json workspaces, lerna.json, nx.json, turbo.json, mise.toml. Cada diretório de workspace é pontuado contra palavras-chave do tipo de agente (ex: "web", "frontend", "client" para o agente frontend). Se nenhuma config de monorepo é encontrada, recorre a candidatos codificados como `apps/web`, `apps/frontend`, `frontend/`, etc.

### Step 4: /review — Verificação QA

```
/review
```

O workflow de revisão executa um pipeline QA completo:

1. **Identificar escopo** — Pergunta o que revisar (arquivos específicos, branch de feature ou projeto inteiro).
2. **Verificações automatizadas de segurança** — Executa `npm audit`, `bandit` ou equivalente.
3. **Revisão manual OWASP Top 10** — Injection, broken auth, dados sensíveis, controle de acesso, misconfiguration, insecure deserialization, componentes vulneráveis, logging insuficiente.
4. **Análise de performance** — Queries N+1, índices ausentes, paginação unbounded, memory leaks, re-renders desnecessários, tamanhos de bundle.
5. **Acessibilidade** — WCAG 2.1 AA: HTML semântico, ARIA, navegação por teclado, contraste de cor, gerenciamento de foco.
6. **Qualidade de código** — Nomenclatura, tratamento de erros, cobertura de testes, TypeScript strict mode, imports não usados, padrões async/await.
7. **Relatório** — Achados categorizados como CRITICAL / HIGH / MEDIUM / LOW com `arquivo:linha`, descrição e código de correção.

Para escopos grandes, o workflow delega para o subagente QA. Com a opção `--fix`, entra em um Loop Fix-Verify: spawna agentes de domínio para corrigir problemas CRITICAL/HIGH, re-executa QA, repete até 3 vezes.

---

## Estratégia de Session ID

Cada sessão de orquestração recebe um identificador único no formato:

```
session-YYYYMMDD-HHMMSS
```

Exemplo: `session-20260324-143052`

O session ID é usado para:

- Nomear arquivos de memória (`orchestrator-session.md`, `task-board.md`)
- Rastrear processos de agentes via arquivos PID no diretório temp do sistema (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- Correlacionar arquivos de log (`/tmp/subagent-{session-id}-{agent-id}.log`)
- Agrupar resultados em `.agents/results/parallel-{timestamp}/`

---

## Atribuição de Workspace por Domínio

Cada agente é spawnado em um diretório de workspace isolado para prevenir conflitos de arquivo.

### Detecção Automática

Quando `-w` é omitido (ou definido como `.`), o CLI detecta o melhor workspace:

1. Escaneia arquivos de config de monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. Expande padrões glob (ex: `apps/*`) em diretórios reais.
3. Pontua cada diretório contra palavras-chave do tipo de agente:

| Tipo de Agente | Palavras-chave (em ordem de prioridade) |
|:--------------|:---------------------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. Correspondência exata de nome de diretório pontua 100, contém-palavra pontua 50, caminho-contém pontua 25.
5. Diretório com maior pontuação vence.

### Candidatos de Fallback

Se nenhuma config de monorepo existe, o CLI verifica caminhos codificados em ordem:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

Se nada corresponde, o agente executa no diretório atual (`.`).

### Sobrescrita Explícita

Sempre disponível:

```bash
oma agent:spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Regra de Contrato Primeiro

Contratos de API são o mecanismo de sincronização entre agentes. A regra de contrato primeiro significa:

1. **Contratos são definidos antes da implementação começar.** O Step 3 do workflow `/plan` produz contratos de API que são salvos em `.agents/skills/_shared/core/api-contracts/`.

2. **Cada agente recebe seus contratos relevantes como contexto.** Quando `/orchestrate` spawna agentes no Step 3, cada agente recebe "descrição da tarefa, contratos de API, contexto relevante."

3. **Contratos definem a fronteira de interface.** Um contrato especifica:
   - Método HTTP e path
   - Schema do corpo de request (com tipos)
   - Schema do corpo de response (com tipos)
   - Requisitos de autenticação
   - Formatos de resposta de erro

4. **Violações de contrato são detectadas durante monitoramento.** Step 5 do `/work` usa ferramentas de análise de código MCP (`find_symbol`, `search_for_pattern`) para verificar alinhamento de contrato de API entre agentes.

5. **Revisão QA verifica aderência ao contrato.** A Revisão de Alinhamento do agente QA (Step 6 no ultrawork) compara explicitamente implementação contra o plano, incluindo contratos de API.

**Por que isso importa:** Sem contratos, um agente backend pode retornar `{ "user_id": 1 }` enquanto o agente frontend consome `{ "userId": 1 }`. A regra de contrato primeiro elimina esta classe de bugs de integração inteiramente.

---

## Portões de Merge: 4 Condições

Antes de qualquer trabalho multi-agente ser considerado completo, quatro condições devem ser atendidas:

### 1. Build Tem Sucesso

Todo código compila e builda sem erros. Isso é verificado pelo script de verificação (`verify.sh`), que executa comandos de build apropriados ao tipo de agente.

### 2. Testes Passam

Todos os testes existentes continuam passando, e novos testes cobrem a funcionalidade implementada. O agente QA revisa cobertura de testes como parte de sua Revisão de Qualidade de Código.

### 3. Apenas Arquivos Planejados Modificados

Agentes não devem modificar arquivos fora de seu escopo atribuído. A etapa de verificação verifica que apenas arquivos relacionados à tarefa do agente foram alterados. Isso previne agentes de fazer efeitos colaterais indesejados em código compartilhado.

### 4. Revisão QA Aprovada

Nenhum achado CRITICAL ou HIGH permanece da revisão do agente QA. Achados MEDIUM e LOW podem ser documentados para sprints futuros, mas bloqueadores devem ser resolvidos.

No workflow ultrawork, esses se traduzem em **portões de fase** explícitos (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE) com critérios estilo checkbox que devem todos passar antes de prosseguir.

---

## Exemplos de Spawn

### Spawn de Agente Único

```bash
# Spawnar agente backend com Gemini (padrão)
oma agent:spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawnar agente frontend com Claude, workspace explícito
oma agent:spawn frontend "Build user dashboard with React" session-20260324-143000 -m claude -w ./apps/web

# Spawnar de arquivo de prompt
oma agent:spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Execução Paralela via agent:parallel

Usando arquivo YAML de tarefas:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent:parallel tasks.yaml
```

Usando modo inline:

```bash
oma agent:parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Modo background (sem espera):

```bash
oma agent:parallel tasks.yaml --no-wait
# Retorna imediatamente, resultados escritos em .agents/results/parallel-{timestamp}/
```

Com sobrescrita de vendor:

```bash
oma agent:parallel tasks.yaml -m claude
```

---

## Anti-Padrões a Evitar

### 1. Pular o Plano

Iniciar `/orchestrate` sem um plan.json. O workflow recusará prosseguir. Sempre execute `/plan` primeiro, ou use `/work` que tem planejamento integrado.

### 2. Workspaces Sobrepostos

Atribuir dois agentes ao mesmo diretório de workspace. Isso causa conflitos de arquivo — as mudanças de um agente sobrescrevem as do outro. Sempre use diretórios de workspace separados.

### 3. Contratos de API Ausentes

Spawnar agentes backend e frontend sem definir contratos primeiro. Eles farão suposições incompatíveis sobre formatos de dados, nomes de campos e tratamento de erros.

### 4. Ignorar Achados do QA

Tratar revisão QA como opcional. Achados CRITICAL e HIGH representam bugs reais que aparecerão em produção. O workflow aplica isso fazendo loop até nenhum bloqueador permanecer.

### 5. Coordenação Manual de Arquivos

Tentar fazer merge manual das saídas de agentes em vez de deixar o pipeline de verificação e QA tratar a integração. O pipeline automatizado detecta problemas que revisão manual perde.

### 6. Over-Paralelização

Executar tarefas P1 antes das tarefas P0 completarem. Tiers de prioridade existem porque tarefas P1 frequentemente dependem de saídas P0. Os workflows aplicam ordenação de tiers automaticamente.

### 7. Pular Verificação

Usar `agent:spawn` diretamente sem executar o script de verificação depois. A etapa de verificação detecta falhas de build, regressões de testes e violações de escopo que de outra forma se propagariam.

---

## Validação de Integração Cross-Domínio

Após todos os agentes completarem suas tarefas individuais, a integração cross-domínio deve ser validada:

1. **Alinhamento de contrato de API** -- Ferramentas MCP (`find_symbol`, `search_for_pattern`) verificam que implementações backend correspondem aos contratos consumidos por frontend e mobile.

2. **Consistência de tipos** -- Tipos TypeScript, dataclasses Python ou modelos Dart compartilhados entre domínios devem usar nomes de campos e tipos consistentes.

3. **Fluxo de autenticação** -- Se o backend implementa auth JWT, o frontend deve enviar tokens corretamente nos headers, e o app mobile deve armazená-los e renová-los adequadamente.

4. **Tratamento de erros** -- Todos os consumidores de uma API devem tratar as respostas de erro documentadas. Se o backend retorna `{ "error": "unauthorized", "code": 401 }`, todos os clientes devem tratar este formato.

5. **Alinhamento de schema de banco de dados** -- Se o agente de banco de dados cria migrações, os modelos ORM do backend devem corresponder exatamente ao schema.

A Revisão de Alinhamento do agente QA (Step 6 no ultrawork, Step 6 no work) realiza esta validação cross-domínio sistematicamente.

---

## Quando Está Pronto

Um projeto multi-agente está completo quando:

- Todos os agentes em todos os tiers de prioridade completaram com sucesso.
- Scripts de verificação passam para cada agente (exit code 0).
- Relatório QA reporta zero CRITICAL e zero HIGH achados.
- Alinhamento de contrato de API cross-domínio está confirmado.
- Build tem sucesso e todos os testes passam.
- O relatório final está escrito na memória e apresentado ao usuário.
- Usuário dá aprovação final (no `/work` e SHIP_GATE do ultrawork).
