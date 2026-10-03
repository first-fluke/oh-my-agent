---
title: "Guia: Projetos Multi-Agente"
sidebar_label: Projetos Multi-Agente
description: Guia completo para coordenar agentes de vários domínios entre frontend, backend, banco de dados, mobile e QA, do planejamento ao merge.
---

# Guia: Projetos Multi-Agente

## Quando usar coordenação multi-agente

Sua funcionalidade abrange vários domínios: API backend + UI frontend + schema de banco de dados + cliente mobile + revisão QA. Um único agente não consegue tratar todo o escopo, e você precisa que os domínios avancem em paralelo sem modificar os arquivos uns dos outros.

A coordenação multi-agente é a escolha certa quando:

- A tarefa envolve 2 ou mais domínios (frontend, backend, mobile, db, QA, debug, pm).
- Existem contratos de API entre domínios (por exemplo, um endpoint REST consumido pela web e pelo mobile).
- Você quer execução paralela para reduzir o tempo de parede.
- Precisa de revisão QA após a implementação em todos os domínios.

Se sua tarefa couber inteiramente em um domínio, use diretamente o agente específico.

---

## A sequência completa: /plan a /review

O workflow multi-agente recomendado segue um pipeline rígido de quatro etapas.

### Etapa 1: /plan para requisitos e decomposição da tarefa

O workflow `/plan` executa inline (sem iniciar subagentes) e produz um plano estruturado.

```
/plan
```

**O que acontece:**

1. **Coletar requisitos:** O agente PM pergunta sobre usuários-alvo, funcionalidades principais, restrições e destinos de deploy.
2. **Analisar viabilidade técnica:** Usa o provedor de inteligência de código configurado para examinar o codebase existente em busca de código reutilizável e padrões de arquitetura. A busca nativa é usada apenas para caminhos fora do projeto ou caminhos ignorados.
3. **Definir contratos de API:** Projeta contratos de endpoint (método, caminho, schemas de request/response, auth, respostas de erro) e os salva em `.agents/results/api-contracts/` (artefatos da execução), promovendo especificações duráveis para `docs/plans/contracts/` quando forem commitadas.
4. **Decompor em tarefas:** Divide o projeto em tarefas acionáveis, cada uma com agente atribuído, título, critérios de aceitação, prioridade (P0-P3) e dependências.
5. **Revisar o plano com o usuário:** Apresenta o plano completo para confirmação. O workflow não prossegue sem aprovação explícita do usuário.
6. **Salvar o plano:** Escreve o plano aprovado em `.agents/results/plan-{sessionId}.json` e registra um resumo na memória.

A saída `.agents/results/plan-{sessionId}.json` é a entrada de `/work` e `/orchestrate`.

### Etapa 2: /work ou /orchestrate para execução

Você tem dois caminhos de execução:

| Aspecto | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interação** | Interativo (usuário confirma em cada etapa) | Automatizado (executa até concluir) |
| **Planejamento PM** | Integrado (Etapa 2 executa o agente PM) | Carrega um plano quando existe; cria um inline quando não existe |
| **Ponto de controle do usuário** | Após a revisão do plano (Etapa 3) | O plano inline ainda passa pelo portão de revisão antes da distribuição |
| **Modo persistente** | Sim (não pode ser encerrado antes da conclusão) | Sim (não pode ser encerrado antes da conclusão) |
| **Melhor para** | Primeiro uso, projetos complexos que precisam de supervisão | Execuções repetidas, tarefas bem definidas |

#### /work: pipeline multi-agente interativo

```
/work
```

1. Analisa a solicitação do usuário e identifica os domínios envolvidos.
2. Executa o agente PM para decomposição da tarefa (cria plan-\{sessionId\}.json).
3. Apresenta o plano para confirmação do usuário. **Bloqueia até a confirmação.**
4. Inicia agentes por tier de prioridade (P0 primeiro, depois P1 etc.), com cada tarefa de mesma prioridade executando em paralelo.
5. Monitora o progresso dos agentes por meio de arquivos de memória.
6. Executa a revisão do agente QA em todos os entregáveis (OWASP Top 10, performance, acessibilidade e qualidade do código).
7. Se o QA encontrar problemas CRITICAL ou HIGH, inicia novamente o agente responsável com os achados do QA. Repete até 2 vezes por problema. Se o mesmo problema persistir, ativa o **Exploration Loop**: gera 2-3 abordagens alternativas, inicia o mesmo tipo de agente com prompts de hipóteses diferentes em workspaces separados, faz o QA pontuar cada uma e adota o melhor resultado.

#### /orchestrate: execução paralela automatizada

```
/orchestrate
```

1. Carrega `.agents/results/plan-{sessionId}.json`, criando um plano inline por meio de `/plan` quando não existe um plano utilizável.
2. Inicializa uma sessão com o formato de ID `session-YYYYMMDD-HHMMSS`.
3. Cria `orchestrator-session.md` e `task-board.md` no diretório de memória.
4. Inicia agentes por tier de prioridade, cada um recebendo: descrição da tarefa, contratos de API e contexto.
5. Monitora o progresso consultando os arquivos `progress-{agent}.md`.
6. Verifica cada agente concluído por meio de `verify.sh`. PASS (exit 0) aceita; FAIL (exit 1) inicia novamente com o contexto do erro (no máximo 2 retries); uma falha persistente ativa o Exploration Loop.
7. Coleta todos os arquivos `result-{agent}.md` e compila um relatório final.

### Etapa 3: agent spawn para gerenciamento de agentes no nível da CLI

O comando `agent spawn` é o mecanismo de baixo nível usado internamente pelos workflows. Você também pode usá-lo diretamente:

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Todas as flags:**

| Flag | Descrição |
|:-----|:-----------|
| `--vendor <vendor>` | Substituição do vendor da CLI (antigravity/claude/codex/cursor/opencode/qwen/grok/pi). Substitui a resolução do modelo para esta criação. |
| `-w, --workspace <path>` | Diretório de trabalho do agente. Detectado automaticamente a partir da configuração do monorepo quando omitido. |
| `--task-id <id>` | Vincula a criação a uma tarefa do plano da sessão; usa o ID do agente por padrão. |
| `--isolation worktree` | Cria um worktree Git para a criação; o padrão é não adicionar isolamento. |
| `--read-only` | Restringe o processo filho a ferramentas de inspeção e suprime flags de auto-aprovação. |

**Ordem de resolução do vendor** (a primeira correspondência vence):

1. Flag `--vendor` na linha de comando
2. Substituição em `agents:` no `oma-config.yaml` para este agente
3. Defaults de agente do `model_preset` ativo

Consulte [Modelos por agente](./per-agent-models.md) para detalhes de configuração.

**A detecção automática do workspace** verifica as configurações de monorepo nesta ordem: pnpm-workspace.yaml, package.json workspaces, lerna.json, nx.json, turbo.json, mise.toml. Cada diretório de workspace recebe uma pontuação conforme as palavras-chave do tipo de agente (por exemplo, "web", "frontend", "client" para o agente frontend). Se nenhuma configuração de monorepo for encontrada, recorre a candidatos fixos como `apps/web`, `apps/frontend`, `frontend/` etc.

**Resolução do prompt:** o argumento `<prompt>` pode ser texto inline ou caminho de arquivo. Se o caminho resolver para um arquivo existente, seu conteúdo será lido e usado como prompt. A CLI também injeta protocolos de execução específicos do vendor de `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Etapa 4: /review para verificação QA

```
/review
```

O workflow de revisão executa um pipeline QA completo:

1. **Identificar escopo:** Pergunta o que revisar (arquivos específicos, branch de funcionalidade ou projeto inteiro).
2. **Verificações de segurança automatizadas:** Executa `npm audit`, `bandit` ou equivalente.
3. **Revisão manual do OWASP Top 10:** Injeção, auth quebrada, dados sensíveis, controle de acesso, configuração incorreta, desserialização insegura, componentes vulneráveis e logging insuficiente.
4. **Análise de performance:** Queries N+1, índices ausentes, paginação sem limite, vazamentos de memória, re-renders desnecessários e tamanho de bundles.
5. **Acessibilidade:** WCAG 2.1 AA, incluindo HTML semântico, ARIA, navegação por teclado, contraste de cores e gerenciamento de foco.
6. **Qualidade do código:** Nomes, tratamento de erros, cobertura de testes, modo estrito do TypeScript, imports não usados e padrões async/await.
7. **Relatório:** Achados categorizados como CRITICAL / HIGH / MEDIUM / LOW com `file:line`, descrição e código de correção.

Para escopos grandes, o workflow delega ao subagente QA. Com a opção `--fix`, entra em um Fix-Verify Loop: inicia agentes de domínio para corrigir problemas CRITICAL/HIGH, revisa novamente e repete até 3 vezes.

---

## Estratégia de ID de sessão

Cada sessão de orquestração recebe um identificador único no formato:

```
session-YYYYMMDD-HHMMSS
```

Exemplo: `session-20260324-143052`

O ID da sessão é usado para:

- Nomear arquivos de memória (`orchestrator-session.md`, `task-board.md`)
- Rastrear processos de agente por arquivos PID no diretório temporário do sistema (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- Correlacionar arquivos de log (`/tmp/subagent-{session-id}-{agent-id}.log`)
- Agrupar resultados em `.agents/results/parallel-{timestamp}/`

O ID da sessão é gerado na Etapa 2 de `/orchestrate` e passado a todos os agentes iniciados. Isso garante que todos os agentes, logs e arquivos PID de uma execução possam ser rastreados até uma sessão.

---

## Atribuição de workspace por domínio

Cada agente é iniciado em um diretório de workspace isolado para evitar conflitos de arquivo. A atribuição segue estas regras:

### Detecção automática

Quando `-w` é omitido (ou definido como `.`), a CLI detecta o melhor workspace:

1. Examina arquivos de configuração do monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. Expande padrões glob (por exemplo, `apps/*`) para diretórios reais.
3. Pontua cada diretório conforme as palavras-chave do tipo de agente:

| Tipo de agente | Palavras-chave (em ordem de prioridade) |
|:-----------|:-----------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. A correspondência exata do nome do diretório recebe 100, a correspondência por palavra recebe 50 e a presença no caminho recebe 25.
5. O diretório com a maior pontuação vence.

### Candidatos de fallback

Se não houver configuração de monorepo, a CLI verifica os caminhos fixos na ordem:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

Se nada corresponder, o agente executa no diretório atual (`.`).

### Substituição explícita

Sempre disponível:

```bash
oma agent spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Regra de contratos primeiro

Os contratos de API são o mecanismo de sincronização entre agentes. A regra de contratos primeiro significa:

1. **Os contratos são definidos antes do início da implementação.** A Etapa 3 do workflow `/plan` produz contratos de API salvos em `.agents/results/api-contracts/` (ou `docs/plans/contracts/` para especificações duráveis).

2. **Cada agente recebe seus contratos relevantes como contexto.** Quando `/orchestrate` inicia agentes na Etapa 3, cada agente recebe "descrição da tarefa, contratos de API e contexto relevante".

3. **Os contratos definem a fronteira da interface.** Um contrato especifica:
   - Método e caminho HTTP
   - Schema do corpo da requisição (com tipos)
   - Schema do corpo da resposta (com tipos)
   - Requisitos de autenticação
   - Formatos das respostas de erro

4. **Violações de contrato são detectadas durante o monitoramento.** A Etapa 5 de `/work` usa o provedor de inteligência de código configurado para verificar o alinhamento do contrato de API entre agentes. A busca nativa é usada apenas para caminhos fora do projeto ou caminhos ignorados.

5. **A revisão QA verifica a aderência ao contrato.** A Revisão de Alinhamento do agente QA (Etapa 6 do ultrawork) compara explicitamente a implementação com o plano, incluindo contratos de API.

Sem contratos, um agente backend pode retornar `{ "user_id": 1 }` enquanto o frontend consome `{ "userId": 1 }`. A regra de contratos primeiro evita esse tipo de bug de integração.

---

## Portões de merge: 4 condições

Antes que qualquer trabalho multi-agente seja considerado concluído, quatro condições devem ser atendidas:

### 1. As verificações declaradas passam

Cada critério de aceitação tem uma verificação relevante, e as verificações declaradas pelo plano passam. Um build só é incluído quando o portão do projeto exige isso; o contrato de resultado registra os argv e o exit code reais.

### 2. Os testes passam

Todos os testes existentes continuam passando, e os novos testes cobrem a funcionalidade implementada. O agente QA revisa a cobertura como parte da Revisão de Qualidade do Código.

### 3. Somente arquivos planejados são modificados

Os agentes não devem modificar arquivos fora do escopo atribuído. A etapa de verificação confirma que somente arquivos relacionados à tarefa foram alterados. Isso evita efeitos colaterais não intencionais no código compartilhado.

### 4. A revisão QA está limpa

Não restam achados CRITICAL ou HIGH na revisão do agente QA. Achados MEDIUM e LOW podem ser documentados para sprints futuras, mas os bloqueadores precisam ser resolvidos.

No workflow ultrawork, isso se traduz em **portões de fase** explícitos (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE) com critérios em formato de checkbox, todos obrigatórios antes de prosseguir.

---

## Exemplos de criação de agentes

### Criação de um agente único

```bash
# Spawn backend agent with Gemini (default)
oma agent spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent spawn frontend "Build user dashboard with React" session-20260324-143000 --vendor claude -w ./apps/web

# Spawn from a prompt file
oma agent spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Execução paralela via agent parallel

Usando um arquivo YAML de tarefas:

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
oma agent parallel tasks.yaml
```

Usando o modo inline:

```bash
oma agent parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Modo em segundo plano (sem espera):

```bash
oma agent parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```

Com substituição de vendor:

```bash
oma agent parallel tasks.yaml --vendor claude
```

---

## Anti-padrões a evitar

### 1. Aprovar o plano sem revisão

`/orchestrate` pode criar um plano por meio de `/plan` inline quando não existe um arquivo de plano utilizável. O plano inline ainda passa pelo portão de revisão de `/plan`, e a distribuição na etapa seguinte segue essa decomposição aprovada. Para trabalhos grandes de vários domínios, execute `/plan` antecipadamente para ter um tracker durável em `docs/plans/work/` e espaço para refinar a decomposição antes de iniciar agentes.

### 2. Workspaces sobrepostos

Atribuir dois agentes ao mesmo diretório de workspace. Isso causa conflitos de arquivo em que as mudanças de um agente sobrescrevem as de outro. Sempre use diretórios de workspace separados.

### 3. Contratos de API ausentes

Iniciar agentes backend e frontend sem definir contratos primeiro. Eles farão suposições incompatíveis sobre formatos de dados, nomes de campos e tratamento de erros.

### 4. Ignorar achados do QA

Tratar a revisão QA como opcional. Achados CRITICAL e HIGH representam bugs reais que aparecerão em produção. O workflow aplica essa regra repetindo o processo até não restarem bloqueadores.

### 5. Coordenar arquivos manualmente

Tentar mesclar manualmente as saídas dos agentes em vez de deixar o pipeline de verificação e QA tratar a integração. O pipeline automatizado encontra problemas que a revisão manual deixa passar.

### 6. Paralelização excessiva

Executar tarefas P1 antes de concluir as tarefas P0. Tiers de prioridade existem porque tarefas P1 frequentemente dependem das saídas de P0. Os workflows impõem a ordem dos tiers automaticamente.

### 7. Pular a verificação

Usar `agent spawn` diretamente sem registrar depois o contrato de resultado. Execute as verificações fixadas da tarefa e conclua um claim estruturado; consulte [Resultados e retomada de agentes](/docs/guide/agent-results-and-resume). A etapa de verificação do workflow então detecta verificações reprovadas e deriva de escopo antes de os resultados serem reutilizados.

---

## Validação de integração entre domínios

Depois que todos os agentes concluírem suas tarefas individuais, a integração entre domínios deve ser validada:

1. **Alinhamento do contrato de API:** O provedor de inteligência de código configurado verifica se as implementações do backend correspondem aos contratos consumidos pelo frontend e mobile. A busca nativa é usada apenas para caminhos fora do projeto ou caminhos ignorados.

2. **Consistência de tipos:** Tipos TypeScript, dataclasses Python ou modelos Dart compartilhados entre domínios devem usar nomes e tipos de campo consistentes.

3. **Fluxo de autenticação:** Se o backend implementar auth JWT, o frontend deve enviar corretamente os tokens nos headers e o app mobile deve armazená-los e atualizá-los adequadamente.

4. **Tratamento de erros:** Todos os consumidores de uma API devem tratar as respostas de erro documentadas. Se o backend retornar `{ "error": "unauthorized", "code": 401 }`, todos os clientes devem tratar esse formato.

5. **Alinhamento do schema de banco:** Se o agente de banco criar migrações, os modelos ORM do backend devem corresponder exatamente ao schema.

A Revisão de Alinhamento do agente QA (Etapa 6 do ultrawork, Etapa 6 do work) realiza essa validação entre domínios de modo sistemático.

---

## Quando está concluído

Um projeto multi-agente está concluído quando:

- Todos os agentes de todos os tiers de prioridade terminaram com sucesso.
- Os scripts de verificação passam para cada agente (exit code 0).
- A revisão QA relata zero achados CRITICAL e HIGH.
- O alinhamento dos contratos de API entre domínios foi confirmado.
- O build é bem-sucedido e todos os testes passam.
- O relatório final é escrito na memória e apresentado ao usuário.
- O usuário dá a aprovação final (em `/work` e no SHIP_GATE do ultrawork).
