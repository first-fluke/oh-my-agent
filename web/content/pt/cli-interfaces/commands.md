---
title: "Comandos CLI"
description: "Referência completa para cada comando CLI do oh-my-agent — sintaxe, opções, exemplos, organizados por categoria."
---

# Comandos CLI

Após instalar globalmente (`bun install --global oh-my-agent`), use `oma` ou `oh-my-agent`. Para uso único sem instalar, execute `npx oh-my-agent`.

A variável de ambiente `OH_MY_AG_OUTPUT_FORMAT` pode ser definida como `json` para forçar saída legível por máquina em comandos que a suportam. Isso é equivalente a passar `--json` para cada comando.

---

## Setup e Instalação

### oma (install)

O comando padrão sem argumentos lança o instalador interativo.

```
oma
```

**O que faz:**
1. Verifica diretório legado `.agent/` e migra para `.agents/` se encontrado.
2. Detecta e oferece remover ferramentas concorrentes.
3. Solicita tipo de projeto (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Se backend é selecionado, solicita variante de linguagem (Python, Node.js, Rust, Other).
5. Pergunta sobre symlinks para GitHub Copilot.
6. Baixa o tarball mais recente do registro.
7. Instala recursos compartilhados, workflows, configs e skills selecionadas.
8. Instala adaptações de vendor para todos os vendors (Claude, Codex, Gemini, Qwen).
9. Cria symlinks CLI.
10. Oferece habilitar `git rerere`.
11. Oferece configurar MCP para Antigravity IDE e Gemini CLI.

**Exemplo:**
```bash
cd /path/to/my-project
oma
# Siga os prompts interativos
```

### doctor

Verificação de saúde para instalações CLI, configs MCP e status de skills.

```
oma doctor [--json] [--output <format>]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**O que verifica:**
- Instalações CLI: gemini, claude, codex, qwen (versão e caminho).
- Status de autenticação para cada CLI.
- Configuração MCP: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Skills instaladas: quais skills estão presentes e seu status.

**Exemplos:**
```bash
# Saída texto interativa
oma doctor

# Saída JSON para pipelines CI
oma doctor --json

# Pipe para jq para verificações específicas
oma doctor --json | jq '.clis[] | select(.installed == false)'
```

### update

Atualizar skills para a versão mais recente do registro.

```
oma update [-f | --force] [--ci]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `-f, --force` | Sobrescrever arquivos de config customizados (`oma-config.yaml`, `mcp.json`, diretórios `stack/`) |
| `--ci` | Executar em modo CI não-interativo (pular prompts, saída em texto puro) |

**O que faz:**
1. Busca `prompt-manifest.json` do registro para verificar a versão mais recente.
2. Compara com a versão local em `.agents/skills/_version.json`.
3. Se já estiver atualizado, encerra.
4. Baixa e extrai o tarball mais recente.
5. Preserva arquivos customizados pelo usuário (a menos que `--force` seja usado).
6. Copia novos arquivos sobre `.agents/`.
7. Restaura arquivos preservados.
8. Atualiza adaptações de vendor e atualiza symlinks.

**Exemplos:**
```bash
# Atualização padrão (preserva config)
oma update

# Atualização forçada (reseta toda config para padrões)
oma update --force

# Modo CI (sem prompts, sem spinners)
oma update --ci

# Modo CI com force
oma update --ci --force
```

---

## Monitoramento e Métricas

### dashboard

Iniciar o dashboard de terminal para monitoramento de agentes em tempo real.

```
oma dashboard
```

Sem opções. Observa `.serena/memories/` no diretório atual. Renderiza UI com box-drawing com status de sessão, tabela de agentes e feed de atividade. Atualiza em cada mudança de arquivo. Pressione `Ctrl+C` para sair.

O diretório de memories pode ser sobrescrito com a variável de ambiente `MEMORIES_DIR`.

**Exemplo:**
```bash
# Uso padrão
oma dashboard

# Diretório de memories customizado
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

### dashboard:web

Iniciar o dashboard web.

```
oma dashboard:web
```

Inicia servidor HTTP em `http://localhost:9847` com conexão WebSocket para atualizações ao vivo.

**Variáveis de ambiente:**

| Variável | Padrão | Descrição |
|:---------|:-------|:-----------|
| `DASHBOARD_PORT` | `9847` | Porta para o servidor HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | Caminho para o diretório de memories |

### stats

Visualizar métricas de produtividade.

```
oma stats [--json] [--output <format>] [--reset]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--reset` | Resetar todos os dados de métricas |

**Métricas rastreadas:**
- Contagem de sessões
- Skills usadas (com frequência)
- Tarefas completadas
- Tempo total de sessão
- Arquivos alterados, linhas adicionadas, linhas removidas
- Timestamp de última atualização

Métricas são armazenadas em `.serena/metrics.json`. Dados são coletados de estatísticas git e arquivos de memória.

**Exemplos:**
```bash
# Visualizar métricas atuais
oma stats

# Saída JSON
oma stats --json

# Resetar todas as métricas
oma stats --reset
```

### retro

Retrospectiva de engenharia com métricas e tendências.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Argumentos:**

| Argumento | Descrição | Padrão |
|:---------|:----------|:-------|
| `window` | Janela de tempo para análise (ex: `7d`, `2w`, `1m`) | Últimos 7 dias |

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--interactive` | Modo interativo com entrada manual |
| `--compare` | Comparar janela atual vs período anterior de mesmo tamanho |

**O que mostra:**
- Resumo tweetável (métricas em uma linha)
- Tabela resumo (commits, arquivos alterados, linhas adicionadas/removidas, contribuidores)
- Tendências vs última retro
- Leaderboard de contribuidores
- Distribuição de tempo de commits (histograma por hora)
- Sessões de trabalho
- Breakdown de tipos de commit (feat, fix, chore, etc.)
- Hotspots (arquivos mais alterados)

**Exemplos:**
```bash
# Últimos 7 dias (padrão)
oma retro

# Últimos 30 dias
oma retro 30d

# Últimas 2 semanas
oma retro 2w

# Comparar com período anterior
oma retro 7d --compare

# Modo interativo
oma retro --interactive

# JSON para automação
oma retro 7d --json
```

---

## Gerenciamento de Agentes

### agent:spawn

Spawnar um processo de subagente.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:-----------|:-----------|
| `agent-id` | Sim | Tipo de agente. Um de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Sim | Descrição da tarefa. Pode ser texto inline ou caminho para um arquivo. |
| `session-id` | Sim | Identificador de sessão (formato: `session-YYYYMMDD-HHMMSS`) |

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `-m, --model <vendor>` | Sobrescrita de vendor CLI: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | Diretório de trabalho para o agente. Auto-detectado de config monorepo se omitido. |

**Ordem de resolução de vendor:** flag `--model` > `agent_cli_mapping` em oma-config.yaml > `default_cli` > `active_vendor` em cli-config.yaml > `gemini`.

**Resolução de prompt:** Se o argumento prompt for um caminho para um arquivo existente, o conteúdo do arquivo é usado como prompt. Caso contrário, o argumento é usado como texto inline. Protocolos de execução específicos do vendor são anexados automaticamente.

**Exemplos:**
```bash
# Prompt inline, auto-detectar workspace
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt de arquivo, workspace explícito
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Sobrescrever vendor para Claude
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# Agente mobile com workspace auto-detectado
oma agent:spawn mobile "Add biometric login" session-20260324-143000
```

### agent:status

Verificar status de um ou mais subagentes.

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:-----------|:-----------|
| `session-id` | Sim | O ID da sessão a verificar |
| `agent-ids` | Não | Lista de IDs de agentes separados por espaço. Se omitido, sem saída. |

**Opções:**

| Flag | Descrição | Padrão |
|:-----|:-----------|:-------|
| `-r, --root <path>` | Caminho raiz para verificações de memória | Diretório atual |

**Valores de status:**
- `completed` — Arquivo de resultado existe (com header de status opcional).
- `running` — Arquivo PID existe e processo está vivo.
- `crashed` — Arquivo PID existe mas processo está morto, ou nenhum arquivo PID/resultado encontrado.

**Formato de saída:** Uma linha por agente: `{agent-id}:{status}`

**Exemplos:**
```bash
# Verificar agentes específicos
oma agent:status session-20260324-143000 backend frontend

# Saída:
# backend:running
# frontend:completed

# Verificar com root customizado
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

Executar múltiplos subagentes em paralelo.

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:-----------|:-----------|
| `tasks` | Sim | Caminho para um arquivo YAML de tarefas, ou (com `--inline`) especificações inline de tarefas |

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `-m, --model <vendor>` | Sobrescrita de vendor CLI para todos os agentes |
| `-i, --inline` | Modo inline: especificar tarefas como argumentos `agent:task[:workspace]` |
| `--no-wait` | Modo background — iniciar agentes e retornar imediatamente |

**Formato de arquivo YAML de tarefas:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # opcional, auto-detectado se omitido
  - agent: frontend
    task: "Build user dashboard"
    workspace: ./web
```

**Formato inline de tarefas:** `agent:task` ou `agent:task:workspace` (workspace deve começar com `./` ou `/`).

**Diretório de resultados:** `.agents/results/parallel-{timestamp}/` contém arquivos de log para cada agente.

**Exemplos:**
```bash
# De arquivo YAML
oma agent:parallel tasks.yaml

# Modo inline
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Modo background (sem espera)
oma agent:parallel tasks.yaml --no-wait

# Sobrescrever vendor para todos os agentes
oma agent:parallel tasks.yaml -m claude
```

### agent:review

Executar uma revisão de código usando uma CLI de IA externa (codex, claude, gemini ou qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `-m, --model <vendor>` | Vendor CLI a ser usado: `codex`, `claude`, `gemini`, `qwen`. Padrão é o vendor resolvido a partir da configuração. |
| `-p, --prompt <prompt>` | Prompt de revisão customizado. Se omitido, um prompt padrão de revisão de código é usado. |
| `-w, --workspace <path>` | Caminho para revisar. Padrão é o diretório de trabalho atual. |
| `--no-uncommitted` | Pular revisão de mudanças não commitadas. Quando definido, apenas mudanças commitadas na sessão são revisadas. |

**O que faz:**
- Detecta automaticamente o ID da sessão atual a partir do ambiente ou atividade git recente.
- Para `codex`: usa o subcomando nativo `codex review`.
- Para `claude`, `gemini`, `qwen`: constrói uma solicitação de revisão baseada em prompt e invoca a CLI com o prompt de revisão.
- Por padrão, revisa mudanças não commitadas no diretório de trabalho.
- Com `--no-uncommitted`, restringe a revisão a mudanças commitadas dentro da sessão atual.

**Exemplos:**
```bash
# Revisar mudanças não commitadas com vendor padrão
oma agent:review

# Revisar com codex (usa o comando nativo codex review)
oma agent:review -m codex

# Revisar com claude usando um prompt customizado
oma agent:review -m claude -p "Focus on security vulnerabilities and input validation"

# Revisar um caminho específico
oma agent:review -w ./apps/api

# Revisar apenas mudanças commitadas (pular working tree)
oma agent:review --no-uncommitted

# Revisar mudanças commitadas em um workspace específico com gemini
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## Gerenciamento de Memória

### memory:init

Inicializar o schema de memória Serena.

```
oma memory:init [--json] [--output <format>] [--force]
```

**O que faz:** Cria a estrutura do diretório `.serena/memories/` com arquivos iniciais de schema que as ferramentas de memória MCP usam para leitura e escrita de estado de agentes.

---

## Integração e Utilitários

### auth:status

Verificar status de autenticação de todos os CLIs suportados.

```
oma auth:status [--json] [--output <format>]
```

**Verifica:** Gemini (API key), Claude (API key ou OAuth), Codex (API key), Qwen (API key).


### bridge

Bridge MCP stdio para transporte Streamable HTTP.

```
oma bridge [url]
```

**O que faz:** Atua como bridge de protocolo entre transporte MCP stdio (usado pelo Antigravity IDE) e transporte Streamable HTTP (usado pelo servidor Serena MCP).

**Arquitetura:**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

### verify

Verificar saída de subagente contra critérios esperados.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**O que faz:** Executa o script de verificação para o tipo de agente especificado, verificando sucesso de build, resultados de teste e conformidade de escopo.

### cleanup

Limpar processos de subagentes órfãos e arquivos temporários.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**O que limpa:**
- Arquivos PID órfãos no diretório temp do sistema (`/tmp/subagent-*.pid`).
- Arquivos de log órfãos (`/tmp/subagent-*.log`).
- Diretórios Gemini Antigravity (brain, implicit, knowledge) sob `.gemini/antigravity/`.

### visualize

Visualizar estrutura do projeto como grafo de dependências.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` é um alias integrado para `visualize`.

### star

Dar estrela no oh-my-agent no GitHub.

```
oma star
```

Requer CLI `gh` instalada e autenticada.

### describe

Descrever comandos CLI como JSON para introspecção em runtime.

```
oma describe [command-path]
```

**O que faz:** Gera um objeto JSON com nome, descrição, argumentos, opções e subcomandos do comando. Usado por agentes de IA para entender capacidades CLI disponíveis.

### help

Mostrar informações de ajuda.

```
oma help
```

### version

Mostrar número da versão.

```
oma version
```

---

## Variáveis de Ambiente

| Variável | Descrição | Usado Por |
|:---------|:----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Defina como `json` para forçar saída JSON em todos os comandos que a suportam | Todos os comandos com flag `--json` |
| `DASHBOARD_PORT` | Porta para o dashboard web | `dashboard:web` |
| `MEMORIES_DIR` | Sobrescrever caminho do diretório de memories | `dashboard`, `dashboard:web` |

---

## Aliases

| Alias | Comando Completo |
|:------|:--------------|
| `viz` | `visualize` |
