---
title: Execução Paralela
description: "Execute vários papéis de dispatch do OMA em paralelo com a sintaxe atual da CLI, arquivos de tarefas, modo inline, isolamento de workspace, resolução de modelo e vendor, monitoramento, IDs de sessão e padrões de recuperação."
---

# Execução Paralela

A principal vantagem do oh-my-agent é executar vários agentes especializados simultaneamente. Enquanto o agente backend implementa uma API, o agente frontend cria a interface e o agente mobile constrói telas do app, o orquestrador os coordena por meio de estado de execução durável e recibos.

---

## agent:spawn: criação de um agente

### Sintaxe básica

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Parâmetros

| Parâmetro | Obrigatório | Descrição |
|-----------|----------|-------------|
| `agent-id` | Sim | Papel canônico de dispatch: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` ou `explore` |
| `prompt` | Sim | Descrição da tarefa (string entre aspas ou caminho para um arquivo de prompt) |
| `session-id` | Sim | Agrupa agentes que trabalham na mesma funcionalidade. Formato: `session-YYYYMMDD-HHMMSS` ou qualquer string única. |
| `options` | Não | Consulte a tabela de opções abaixo |

### Opções

| Flag | Curta | Descrição |
|-----------|----------|-------------|
| `--workspace <path>` | `-w` | Diretório de trabalho do agente. Os agentes só modificam arquivos dentro desse diretório. |
| `--model <vendor>` | `-m` | Substitui o vendor da CLI para esta criação (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` ou `pi`). |
| `--resumed-from <run-id>` | | Vincula um retry à execução anterior respaldada por evidências. |
| `--fallback-vendors <vendors>` | | Fallbacks de vendor ordenados e separados por vírgula quando o primário não puder executar. |
| `--task-id <id>` | | Vincula a criação a um ID de tarefa do plano da sessão. |
| `--isolation <mode>` | | `worktree` cria um worktree Git novo no diretório temporário de worktrees do OMA. O worktree permanece para revisão e merge ou descarte. |
| `--read-only` | | Restringe o agente criado a ferramentas não destrutivas. |

### Exemplos

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## Criação paralela com processos em segundo plano

Para executar vários agentes simultaneamente, use processos em segundo plano do shell:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

O `&` executa cada agente em segundo plano. `wait` bloqueia até que todos os processos em segundo plano terminem.

### Padrão com workspace {#workspace-aware-pattern}

Sempre atribua workspaces separados ao executar agentes em paralelo para evitar conflitos de arquivos:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel: modo paralelo inline

Para uma sintaxe mais limpa que gerencia automaticamente o processamento em segundo plano:

### Sintaxe

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Exemplos

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

A flag `--inline` analisa cada argumento `agent:task`. Adicione um terceiro caminho delimitado por dois-pontos (`agent:task:workspace`) quando a tarefa precisar de um workspace específico. Sem `--inline`, passe um arquivo de tarefas YAML com `{tasks: [{id?, agent, task, workspace?}]}`. `--session` associa os resultados paralelos a uma sessão existente.

---

## Configuração multi-CLI

oh-my-agent encaminha cada agente para a CLI apropriada por meio de `model_preset` em `.agents/oma-config.yaml`. Escolha um preset integrado para o vendor usado e, opcionalmente, substitua agentes individuais.

### Exemplo de configuração

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Presets integrados: `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` e `mixed`. Consulte [Modelos por agente](../guide/per-agent-models.md) para obter detalhes.

### Resolução de vendor

Quando `oma agent spawn` determina qual CLI usar:

| Prioridade | Fonte | Exemplo |
|---------|---------|---------|
| 1 (mais alta) | Flag `--vendor` | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | Substituição em `agents:` no `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | Defaults de agente do `model_preset` ativo | busca do preset para o papel do agente |

A flag `--vendor` sempre vence. Se nenhuma flag for fornecida, o sistema verifica as substituições de `agents:`, depois os defaults do preset e, por fim, a CLI de fallback configurada. Com `model_preset: auto`, as configurações nativas do runtime atual fornecem o modelo.

---

## Métodos de criação específicos do vendor

O mecanismo de criação varia conforme a IDE ou CLI:

| Vendor | Como os agentes são criados | Tratamento do resultado |
|--------|-----------------------------|-------------------------|
| **Claude Code** | Tarefas do mesmo vendor usam a ferramenta Agent com `.claude/agents/{name}.md`; tarefas entre vendors recorrem a `oma agent spawn`. | Retorno síncrono |
| **Codex CLI** | Tarefas do mesmo vendor usam agentes personalizados nativos de `.codex/agents/{name}.toml`; tarefas entre vendors recorrem a `oma agent spawn`. | Saída JSON |
| **Antigravity CLI/IDE** | `oma agent spawn` por meio do runtime `agy`; subagentes nativos personalizados não são necessários | Poll de recibos e arquivos de resultado duráveis |
| **Cursor** | Usa a integração gerada do Cursor quando disponível; caso contrário, `oma agent spawn` | Poll do arquivo de resultado |
| **OpenCode / pi** | Usa a ponte de extensão em processo quando selecionado; o trabalho entre vendors usa `oma agent spawn` | Poll do arquivo de resultado |
| **Fallback da CLI** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Poll do resultado respaldado por evidências |

Ao executar dentro do Claude Code, o workflow usa diretamente a ferramenta `Agent`:

```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Várias chamadas da ferramenta Agent na mesma mensagem executam em paralelo real, sem espera sequencial.

A mesma regra de dispatch se aplica a todos os vendors:

1. Resolva `target_vendor_for_agent` a partir de `.agents/oma-config.yaml`
2. Se corresponder ao vendor do runtime atual, use o arquivo de agente nativo desse vendor
3. Se não corresponder, use `oma agent spawn` somente para esse agente

---

## Monitoramento de agentes

### Dashboard no terminal

```bash
oma dashboard terminal
```

Exibe uma tabela ao vivo com:
- ID da sessão e status geral
- Status por agente (running, completed, failed)
- Contagem de turnos
- Atividade mais recente dos arquivos de progresso
- Tempo decorrido

O dashboard observa `.agents/state/memories/` em busca de atualizações em tempo real. Ele é atualizado à medida que os agentes escrevem progresso.

### Dashboard web

```bash
oma dashboard web
# Opens http://localhost:9847
```

Recursos:
- Atualizações em tempo real via WebSocket
- Reconexão automática após quedas de conexão
- Indicadores coloridos de status dos agentes
- Streaming do log de atividade dos arquivos de progresso e resultado
- Histórico da sessão

### Layout de terminal recomendado

Use 3 terminais para visibilidade ideal:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Verificação do status de um agente

```bash
oma agent status <session-id> <agent-id>
```

Retorna o status atual de um agente específico: running, completed ou failed, junto com a contagem de turnos e a última atividade.

---

## Estratégia de ID de sessão

IDs de sessão agrupam agentes que trabalham na mesma funcionalidade. Práticas recomendadas:

- **Uma sessão por funcionalidade:** Todos os agentes que trabalham em "autenticação de usuário" compartilham `session-auth-01`
- **Formato:** Use IDs descritivos: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Gerado automaticamente:** O orquestrador gera IDs no formato `session-YYYYMMDD-HHMMSS`
- **Reutilizável para iteração:** Use o mesmo ID de sessão ao criar novamente agentes com refinamentos

Os IDs de sessão determinam:
- Quais arquivos de memória específicos da execução os agentes leem e escrevem (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`)
- O que o dashboard monitora
- Como os resultados são agrupados no relatório final

---

## Dicas para execução paralela

### Faça

1. **Trave os contratos de API primeiro.** Execute `/plan` antes de criar agentes de implementação para que os agentes frontend e backend concordem sobre endpoints, schemas de request/response e formatos de erro.

2. **Use um ID de sessão por funcionalidade.** Isso mantém as saídas dos agentes agrupadas e o monitoramento do dashboard coerente.

3. **Atribua workspaces separados.** Sempre use `-w` para isolar os agentes:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitore ativamente.** Abra um terminal com dashboard para detectar problemas cedo. Um agente com falha desperdiça turnos se o problema não for detectado rapidamente.

5. **Execute QA após a implementação.** Crie o agente QA sequencialmente depois que todos os agentes de implementação terminarem:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Itere recriando agentes.** Se a saída de um agente precisar de refinamento, recrie-o com a tarefa original e o contexto da correção. Não inicie uma sessão nova.

7. **Comece com `/work` se estiver em dúvida.** O workflow orienta você passo a passo, com confirmação do usuário em cada portão.

### Não faça

1. **Não crie agentes no mesmo workspace.** Dois agentes escrevendo no mesmo diretório criarão conflitos e sobrescreverão o trabalho um do outro.

2. **Não exceda MAX_PARALLEL (padrão 3).** Mais agentes concorrentes nem sempre são mais rápidos. Cada agente precisa de memória e CPU; o padrão 3 é ajustado para a maioria dos sistemas.

3. **Não pule a etapa do plano.** Criar agentes sem um plano leva a implementações desalinhadas, em que o frontend constrói contra uma forma de API e o backend contra outra.

4. **Não ignore agentes que falharam.** O trabalho de um agente que falhou está incompleto. Verifique seu claim estruturado ou o arquivo de resultado específico da execução para saber o motivo, corrija o prompt e crie-o novamente.

5. **Não misture IDs de sessão para trabalho relacionado.** Se agentes backend e frontend estiverem trabalhando na mesma funcionalidade, eles devem compartilhar um ID de sessão para que o orquestrador possa coordená-los.

---

## Exemplo de ponta a ponta

Um workflow completo de execução paralela para construir uma funcionalidade de autenticação de usuário:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
