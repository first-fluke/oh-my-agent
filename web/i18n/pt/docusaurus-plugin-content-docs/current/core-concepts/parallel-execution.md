---
title: Execução Paralela
description: "Guia completo para executar múltiplos agentes oh-my-agent simultaneamente — sintaxe do agent:spawn com todas as opções, modo inline agent:parallel, padrões com workspace, configuração multi-CLI, prioridade de resolução de vendor, monitoramento com dashboards, estratégia de session ID e anti-padrões a evitar."
---

# Execução Paralela

A vantagem central do oh-my-agent é executar múltiplos agentes especializados simultaneamente. Enquanto o agente backend implementa sua API, o agente frontend cria a interface, e o agente mobile constrói as telas do app — tudo coordenado através de memória compartilhada.

---

## agent:spawn — Spawning de Agente Único

### Sintaxe Básica

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### Parâmetros

| Parâmetro | Obrigatório | Descrição |
|-----------|------------|-----------|
| `agent-id` | Sim | Identificador do agente: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Sim | Descrição da tarefa (string entre aspas ou caminho para arquivo de prompt) |
| `session-id` | Sim | Agrupa agentes trabalhando na mesma funcionalidade. Formato: `session-YYYYMMDD-HHMMSS` ou qualquer string única. |
| `options` | Não | Veja tabela de opções abaixo |

### Opções

| Flag | Curta | Descrição |
|------|-------|-----------|
| `--workspace <path>` | `-w` | Diretório de trabalho para o agente. Agentes modificam apenas arquivos dentro deste diretório. |
| `--model <name>` | `-m` | Sobrescrever vendor CLI para este spawn específico. Opções: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Sobrescrever limite padrão de turnos para este agente. |
| `--json` | | Saída do resultado como JSON (útil para scripting). |
| `--no-wait` | | Disparar e esquecer — retornar imediatamente sem esperar conclusão. |

### Exemplos

```bash
# Spawnar agente backend com vendor padrão
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawnar com isolamento de workspace
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Sobrescrever vendor para este agente específico
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Definir limite de turnos maior para tarefa complexa
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Usar arquivo de prompt em vez de texto inline
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Spawning Paralelo com Processos em Background

Para executar múltiplos agentes simultaneamente, use processos em background do shell:

```bash
# Spawnar 3 agentes em paralelo
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Bloqueia até todos os agentes completarem
```

O `&` executa cada agente em background. `wait` bloqueia até todos os processos em background terminarem.

### Padrão com Workspace

Sempre atribua workspaces separados ao executar agentes em paralelo para prevenir conflitos de arquivo:

```bash
# Execução paralela full-stack
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# Após implementação, executar QA (sequencial — depende da implementação)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — Modo Paralelo Inline

Para uma sintaxe mais limpa que gerencia processos em background automaticamente:

### Sintaxe

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### Exemplos

```bash
# Execução paralela básica
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# Com no-wait (disparar e esquecer)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Todos os agentes compartilham a mesma sessão automaticamente
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

A flag `-i` (inline) permite especificar pares agente-prompt diretamente no comando.

---

## Configuração Multi-CLI

Nem todos os CLIs de IA performam igualmente em todos os domínios. oh-my-agent permite rotear agentes para o CLI que melhor trata seu domínio.

### Exemplo de Configuração Completa

```yaml
# .agents/oma-config.yaml

# Idioma de resposta
language: en

# Formato de data para relatórios
date_format: "YYYY-MM-DD"

# Fuso horário para timestamps
timezone: "Asia/Seoul"

# CLI padrão (usado quando não existe mapeamento específico de agente)
default_cli: gemini

# Roteamento de CLI por agente
model_preset (per-agent overrides via `agents:`):
  frontend: claude       # Raciocínio complexo de UI, composição de componentes
  backend: gemini        # Scaffolding rápido de API, geração de CRUD
  mobile: gemini         # Geração rápida de código Flutter
  db: gemini             # Design rápido de schema
  pm: gemini             # Decomposição rápida de tarefas
  qa: claude             # Revisão minuciosa de segurança e acessibilidade
  debug: claude          # Análise profunda de causa raiz, rastreamento de símbolos
  design: claude         # Decisões nuançadas de design, detecção de anti-padrões
  tf-infra: gemini       # Geração de HCL
  dev-workflow: gemini   # Configuração de task runner
  translator: claude     # Tradução nuançada com sensibilidade cultural
  orchestrator: gemini   # Coordenação rápida
  commit: gemini         # Geração simples de mensagem de commit
```

### Prioridade de Resolução de Vendor

Quando `oma agent:spawn` determina qual CLI usar, segue esta prioridade (maior vence):

| Prioridade | Fonte | Exemplo |
|-----------|-------|---------|
| 1 (maior) | Flag `--model` | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `model_preset (per-agent overrides via `agents:`)` | `model_preset (per-agent overrides via `agents:`).backend: gemini` em oma-config.yaml |
| 3 | `default_cli` | `default_cli: gemini` em oma-config.yaml |
| 4 | `active_vendor` | Configuração legada `cli-config.yaml` |
| 5 (menor) | Fallback codificado | `gemini` |

Isso significa que uma flag `--model` sempre vence. Se nenhuma flag é fornecida, o sistema verifica mapeamento específico do agente, depois o padrão, depois config legada, e finalmente recorre a Gemini.

---

## Métodos de Spawn Específicos por Vendor

O mecanismo de spawn varia por IDE/CLI:

| Vendor | Como Agentes São Spawnados | Tratamento de Resultado |
|--------|---------------------------|------------------------|
| **Claude Code** | `Agent` tool com definições `.claude/agents/{name}.md`. Múltiplas chamadas Agent na mesma mensagem = paralelismo real. | Retorno síncrono |
| **Codex CLI** | Requisição de subagente paralelo mediada por modelo | Saída JSON |
| **Gemini CLI** | Comando CLI `oma agent:spawn` | Poll de memória MCP |
| **Antigravity IDE** | Apenas `oma agent:spawn` (subagentes customizados não disponíveis) | Poll de memória MCP |
| **CLI Fallback** | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Poll de arquivo de resultado |

Ao executar dentro do Claude Code, o workflow usa a ferramenta `Agent` diretamente:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Múltiplas chamadas da ferramenta Agent na mesma mensagem executam como paralelismo real — sem espera sequencial.

---

## Monitoramento de Agentes

### Dashboard no Terminal

```bash
oma dashboard
```

Exibe uma tabela ao vivo com:
- ID da sessão e status geral
- Status por agente (running, completed, failed)
- Contagem de turnos
- Última atividade dos arquivos de progresso
- Tempo decorrido

O dashboard observa `.serena/memories/` para atualizações em tempo real. Atualiza conforme os agentes escrevem progresso.

### Dashboard Web

```bash
oma dashboard:web
# Abre http://localhost:9847
```

Recursos:
- Atualizações em tempo real via WebSocket
- Reconexão automática em quedas de conexão
- Indicadores coloridos de status do agente
- Streaming de log de atividade dos arquivos de progresso e resultado
- Histórico de sessões

### Layout Recomendado de Terminal

Use 3 terminais para visibilidade ótima:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard         │   Comandos de spawn  │
│   (monitoramento ao     │   de agentes         │
│    vivo)                │                      │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Logs de teste/build, operações git           │
│                                                │
└────────────────────────────────────────────────┘
```

### Verificando Status de Agente Individual

```bash
oma agent:status <session-id> <agent-id>
```

Retorna o status atual de um agente específico: running, completed ou failed, junto com contagem de turnos e última atividade.

---

## Estratégia de Session ID

Session IDs agrupam agentes trabalhando na mesma funcionalidade. Melhores práticas:

- **Uma sessão por funcionalidade:** Todos os agentes trabalhando em "autenticação de usuário" compartilham `session-auth-01`
- **Formato:** Use IDs descritivos: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Auto-gerado:** O orquestrador gera IDs no formato `session-YYYYMMDD-HHMMSS`
- **Reutilizável para iteração:** Use o mesmo session ID ao re-spawnar agentes com refinamentos

Session IDs determinam:
- Quais arquivos de memória os agentes leem e escrevem (`progress-{agent}.md`, `result-{agent}.md`)
- O que o dashboard monitora
- Como resultados são agrupados no relatório final

---

## Dicas para Execução Paralela

### Faça

1. **Trave contratos de API primeiro.** Execute `/plan` antes de spawnar agentes de implementação para que agentes frontend e backend concordem em endpoints, schemas de request/response e formatos de erro.

2. **Use um session ID por funcionalidade.** Isso mantém saídas dos agentes agrupadas e monitoramento do dashboard coerente.

3. **Atribua workspaces separados.** Sempre use `-w` para isolar agentes:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Monitore ativamente.** Abra um terminal de dashboard para detectar problemas cedo — um agente falhando desperdiça turnos se não for detectado rapidamente.

5. **Execute QA após implementação.** Spawne o agente QA sequencialmente após todos os agentes de implementação completarem:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Itere com re-spawns.** Se a saída de um agente precisa de refinamento, re-spawne com a tarefa original mais contexto de correção. Não inicie uma nova sessão.

7. **Comece com `/work` se inseguro.** O workflow work guia você pelo processo passo a passo com confirmação do usuário em cada portão.

### Não Faça

1. **Não spawne agentes no mesmo workspace.** Dois agentes escrevendo no mesmo diretório criarão conflitos de merge e sobrescreverão o trabalho um do outro.

2. **Não exceda MAX_PARALLEL (padrão 3).** Mais agentes concorrentes nem sempre significa resultados mais rápidos. Cada agente precisa de recursos de memória e CPU. O padrão de 3 é calibrado para a maioria dos sistemas.

3. **Não pule a etapa de planejamento.** Spawnar agentes sem um plano leva a implementações desalinhadas — o frontend constrói contra um formato de API enquanto o backend constrói outro.

4. **Não ignore agentes falhados.** O trabalho de um agente falhado está incompleto. Verifique `result-{agent}.md` para o motivo da falha, corrija o prompt e re-spawne.

5. **Não misture session IDs para trabalho relacionado.** Se agentes backend e frontend estão trabalhando na mesma funcionalidade, devem compartilhar um session ID para que o orquestrador possa coordená-los.

---

## Exemplo de Ponta a Ponta

Um workflow completo de execução paralela para construir uma funcionalidade de autenticação de usuário:

```bash
# Passo 1: Planejar a funcionalidade
# (Na sua IDE de IA, execute /plan ou descreva a funcionalidade)
# Isso cria .agents/results/plan-{sessionId}.json com breakdown de tarefas

# Passo 2: Spawnar agentes de implementação em paralelo
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Passo 3: Monitorar em terminal separado
# Terminal 2:
oma dashboard

# Passo 4: Esperar todos os agentes de implementação
wait

# Passo 5: Executar revisão QA
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Passo 6: Se QA encontrar problemas, re-spawnar agentes específicos com correções
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Passo 7: Re-executar QA para verificar correções
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
