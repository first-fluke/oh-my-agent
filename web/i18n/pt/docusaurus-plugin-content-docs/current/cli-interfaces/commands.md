---
title: "Comandos CLI"
description: "Referência completa para cada comando CLI do oh-my-agent — sintaxe, opções, exemplos, organizados por categoria."
---

# Comandos CLI

Após instalar globalmente (`bun install --global oh-my-agent`), use `oma` ou `oh-my-agent`. Para uso único sem instalar, execute `npx oh-my-agent`.

A variável de ambiente `OH_MY_AG_OUTPUT_FORMAT` pode ser definida como `json` para forçar saída legível por máquina em comandos que a suportam. Isso é equivalente a passar `--json` para cada comando.

---

## Setup e instalação

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
8. Instala adaptações de vendor para todos os vendors (Antigravity, Claude, Codex, Qwen).
9. Aplica configurações recomendadas do Claude Code (`~/.claude/settings.json`) quando o Claude Code é detectado.
10. Cria symlinks CLI.
11. Oferece habilitar `git rerere`.
12. Oferece configurar MCP para Antigravity IDE e Gemini CLI.
13. Solicita estrela no GitHub se `gh` está autenticado.

**Exemplo:**
```bash
cd /path/to/my-project
oma
# Siga os prompts interativos
```

### doctor

Verificação de saúde para instalações CLI, configs MCP e status de skills.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--profile` | Mostra a matriz de saúde do perfil — exibe o slug do modelo resolvido, a CLI e o status de autenticação por agente a partir do `model_preset` ativo e dos overrides em `agents:`. Veja [Per-Agent Models](../guide/per-agent-models.md). |

**O que verifica:**
- Instalações CLI: agy, claude, codex, qwen (versão e caminho).
- Status de autenticação para cada CLI.
- Configuração MCP: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Skills instaladas: quais skills estão presentes e seu status.
- Diretório de memória do Serena: existência de `.serena/memories/` e contagem de arquivos.
- Workflows globais: verifica o status de instalação de `~/.gemini/antigravity/global_workflows/`.
- Git rerere: se `rerere.enabled` está configurado globalmente.
- Configurações recomendadas do Claude Code: verifica `~/.claude/settings.json` para configuração ideal:
- `cleanupPeriodDays >= 180` (preserva histórico de conversas)
- `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS >= 100000`
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE >= 80`
- `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` definidos como `"1"`
- Strings de atribuição para commits e PRs
- CLAUDE.md no nível do usuário: verifica se `~/.claude/CLAUDE.md` contém o bloco de integração OMA (`<!-- OMA:START`).

**Auto-reparo:** Se skills ou configurações ausentes forem detectadas, o `doctor` oferece instalá-las interativamente. Para configurações do Claude Code, ele pode aplicar valores recomendados automaticamente.

**Exemplos:**
```bash
# Saída texto interativa
oma doctor

# Saída JSON para pipelines CI
oma doctor --json

# Pipe para jq para verificações específicas
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspecionar a matriz de resolução de perfil
oma doctor --profile
```

### update

Atualizar skills para a versão mais recente do registro.

```
oma update [-f | --force] [--ci]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `-f, --force` | Sobrescrever arquivos de config customizados pelo usuário (`oma-config.yaml`, `mcp.json`, diretórios `stack/`) |
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

### link

Regerar arquivos nativos de vendor a partir da fonte de verdade `.agents/` sem reinstalar.

```
oma link [vendors...]
```

**Exemplos:**

```bash
# Regerar todos os vendors configurados
oma link

# Regerar apenas arquivos de Claude e Codex
oma link claude codex
```

**O que faz:**
1. Reconstrói arquivos de agente nativos de vendor a partir de `.agents/agents/`
2. Atualiza hooks e configurações locais para os vendors selecionados
3. Regera os blocos de integração `CLAUDE.md`, `GEMINI.md` ou `AGENTS.md`
4. Atualiza a vinculação MCP do Cursor e os symlinks de skills da CLI quando relevante

Use isso após editar `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` ou definições de hook.

**Comportamento de modelo:**
- O dispatch nativo same-vendor usa o modelo definido no arquivo de agente do vendor gerado.
- O dispatch de fallback externo usa o `default_model` de cada vendor a partir de `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

**Comportamento de dispatch:**
- Se o vendor de destino corresponder ao runtime atual e esse runtime suportar agentes nativos de role, o OMA usa dispatch nativo.
- Caso contrário, o OMA recorre a `oma agent:spawn`.

### setup (workflow)

O workflow `/setup` (invocado dentro de uma sessão de agente) fornece configuração interativa de linguagem, instalações CLI, conexões MCP e mapeamento agente-CLI. Isso é diferente de `oma` (o instalador) — `/setup` configura uma instância já instalada.
---

## Monitoramento e métricas

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

Inicia servidor HTTP em `http://localhost:9847` com conexão WebSocket para atualizações ao vivo. Abra a URL em um navegador para ver o dashboard.

**Variáveis de ambiente:**

| Variável | Padrão | Descrição |
|:---------|:-------|:-----------|
| `DASHBOARD_PORT` | `9847` | Porta para o servidor HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | Caminho para o diretório de memories |

**Exemplo:**
```bash
# Uso padrão
oma dashboard:web

# Porta customizada
DASHBOARD_PORT=8080 oma dashboard:web
```

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

### recap

Recapitular o histórico de conversas de ferramentas de IA entre sessões do Claude, Codex, Qwen e Cursor.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Opções:**

| Flag | Descrição | Padrão |
|:-----|:-----------|:--------|
| `--window <period>` | Janela de tempo: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Data específica (`YYYY-MM-DD`); tem precedência sobre `--window` | |
| `--tool <tools>` | Filtro separado por vírgula: `claude,codex,qwen,cursor` | todos |
| `--top <n>` | Mostrar os top N projetos/tópicos | |
| `--sort <metric>` | Ordenar por `count` ou `duration` | `count` |
| `--mermaid` | Saída como gráfico Gantt do Mermaid | |
| `--graph` | Abrir grafo interativo no navegador | |
| `--json` / `--output <format>` | Saída legível por máquina | `text` |

**Exemplos:**

```bash
oma recap                                     # Hoje (1d)
oma recap --window 7d                         # Última semana
oma recap --date 2026-04-20 --tool claude,codex
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Grafo interativo no navegador
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
- Tendências vs última retro (se snapshot anterior existir)
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

## Gerenciamento de agentes

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
| `-m, --model <vendor>` | Sobrescrita de vendor CLI: `antigravity`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | Diretório de trabalho para o agente. Auto-detectado de config monorepo se omitido. |

**Ordem de resolução de vendor:** flag `--model` > override `agents:` em `oma-config.yaml` > defaults de agente do `model_preset` ativo.

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
workspace: ./api # opcional, auto-detectado se omitido
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

Executar uma revisão de código usando uma CLI de IA externa (codex, claude ou qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `-m, --model <vendor>` | Vendor CLI a ser usado: `antigravity`, `codex`, `claude`, `qwen`. Padrão é o vendor resolvido a partir da configuração. |
| `-p, --prompt <prompt>` | Prompt de revisão customizado. Se omitido, um prompt padrão de revisão de código é usado. |
| `-w, --workspace <path>` | Caminho para revisar. Padrão é o diretório de trabalho atual. |
| `--no-uncommitted` | Pular revisão de mudanças não commitadas. Quando definido, apenas mudanças commitadas na sessão são revisadas. |

**O que faz:**
- Detecta automaticamente o ID da sessão atual a partir do ambiente ou atividade git recente.
- Para `codex`: usa o subcomando nativo `codex review`.
- Para `claude`, `qwen`: constrói uma solicitação de revisão baseada em prompt e invoca a CLI com o prompt de revisão.
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

## Gerenciamento de memória

### memory:init

Inicializar o schema de memória Serena.

```
oma memory:init [--json] [--output <format>] [--force]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--force` | Sobrescrever arquivos de schema vazios ou existentes |

**O que faz:** Cria a estrutura do diretório `.serena/memories/` com arquivos iniciais de schema que as ferramentas de memória MCP usam para leitura e escrita de estado de agentes.

**Exemplos:**
```bash
# Inicializar memória
oma memory:init

# Forçar sobrescrita do schema existente
oma memory:init --force
```

---

## Integração e utilitários

### auth:status

Verificar status de autenticação de todos os CLIs suportados.

```
oma auth:status [--json] [--output <format>]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Verifica:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

**Exemplos:**
```bash
oma auth:status
oma auth:status --json
```

### bridge

Bridge MCP stdio para transporte Streamable HTTP.

```
oma bridge [url]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:-----------|:-----------|
| `url` | Não | URL do endpoint Streamable HTTP (ex: `http://localhost:12341/mcp`) |

**O que faz:** Atua como bridge de protocolo entre transporte MCP stdio (usado pelo Antigravity IDE) e transporte Streamable HTTP (usado pelo servidor Serena MCP). Isso é necessário porque o Antigravity IDE não suporta transportes HTTP/SSE diretamente.

**Arquitetura:**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**Exemplo:**
```bash
# Bridge para servidor Serena local
oma bridge http://localhost:12341/mcp
```

### verify

Verificar saída de subagente contra critérios esperados.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:-----------|:-----------|
| `agent-type` | Sim | Um de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Opções:**

| Flag | Descrição | Padrão |
|:-----|:-----------|:-------|
| `-w, --workspace <path>` | Caminho do workspace a verificar | Diretório atual |
| `--json` | Saída como JSON | |
| `--output <format>` | Formato de saída (`text` ou `json`) | |

**O que faz:** Executa o script de verificação para o tipo de agente especificado, verificando sucesso de build, resultados de teste e conformidade de escopo.

**Verificações comuns (todos os tipos de agente):**
- **Verificação de Escopo**: Lê os escopos de tarefa de `.agents/results/plan-{sessionId}.json`. Compara os arquivos alterados pelo `git diff` contra os padrões de escopo definidos. Falha se arquivos forem modificados fora do escopo atribuído ao agente.
- **Charter Preflight**: Verifica se `result-{agent}.md` contém um bloco `CHARTER_CHECK:` corretamente preenchido sem placeholders não preenchidos.
- **Hardcoded Secrets**: Escaneia arquivos `.py`, `.ts`, `.tsx`, `.js`, `.dart` em busca de padrões como `password = "..."`, `api_key = "..."` (exclui arquivos de teste/exemplo).
- **Comentários TODO/FIXME**: Conta comentários `TODO`, `FIXME`, `HACK`, `XXX` (avisa se algum for encontrado).

**Verificações específicas por agente:**

| Tipo de Agente | Verificações Adicionais |
|:-----------|:-----------------|
| `backend` | Validação de sintaxe Python (`py_compile`), detecção de SQL injection (f-string + palavras-chave SQL), execução de testes Python (`pytest`) |
| `frontend` | Compilação TypeScript (`tsc --noEmit`), detecção de inline style (`style={{`), uso de tipo `any` (falha se > 3), testes de frontend (`vitest`) |
| `mobile` | Análise Flutter/Dart (`flutter analyze` ou `dart analyze`), testes Flutter (`flutter test`) |
| `qa` | Verificação de self-check |
| `debug` | Executa testes Python ou de frontend conforme o tipo de projeto detectado |
| `pm` | Valida que `.agents/results/plan-{sessionId}.json` existe e é JSON válido |

**Formato de saída:**
Cada verificação reporta `PASS`, `FAIL`, `WARN` ou `SKIP` com uma mensagem de detalhe. O resultado geral é `ok: true` apenas se zero verificações falharem.

**Exemplos:**
```bash
# Verificar saída de backend no workspace padrão
oma verify backend

# Verificar frontend em workspace específico
oma verify frontend -w ./apps/web

# Saída JSON para CI
oma verify backend --json
```

### cleanup

Limpar processos de subagentes órfãos e arquivos temporários.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--dry-run` | Mostrar o que seria limpo sem fazer alterações |
| `-y, --yes` | Pular prompts de confirmação e limpar tudo |
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**O que limpa:**
- Arquivos PID órfãos no diretório temp do sistema (`/tmp/subagent-*.pid`).
- Arquivos de log órfãos (`/tmp/subagent-*.log`).
- Diretórios Gemini Antigravity (brain, implicit, knowledge) sob `.gemini/antigravity/`.

**Exemplos:**
```bash
# Pré-visualizar o que seria limpo
oma cleanup --dry-run

# Limpar com prompts de confirmação
oma cleanup

# Limpar tudo sem prompts
oma cleanup --yes

# Saída JSON para automação
oma cleanup --json
```

### visualize

Visualizar estrutura do projeto como grafo de dependências.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` é um alias integrado para `visualize`.

**Opções:**

| Flag | Descrição |
|:-----|:-----------|
| `--json` | Saída como JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**O que faz:** Analisa a estrutura do projeto e gera um grafo de dependências mostrando relações entre skills, agentes, workflows e recursos compartilhados.

**Exemplos:**
```bash
oma visualize
oma viz --json
```

### search

Primitivas mecânicas de busca — fetch, metadata, RSS, mídia, código e trust scoring. Aliasado como `oma s`. Todos os subcomandos imprimem JSON em stdout (um objeto por linha, ou pretty-printed com `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcomandos:**

| Subcomando | Propósito |
|:-----------|:--------|
| `fetch <url>` | Faz fetch da URL via pipeline de estratégias com auto-escalada (api → probe → impersonate → browser → archive) |
| `api <url>` | Fetch via handler de API da plataforma correspondente (Phase 0) |
| `api:search <query>` | Busca por palavra-chave em fan-out entre plataformas suportadas (`--platforms <list>`) |
| `meta <url>` | Extrai metadata OGP / JSON-LD / Schema.org |
| `rss <url>` | Descobre e parseia feed RSS / Atom |
| `rss:google <query>` | Constrói uma URL de RSS do Google News para uma query |
| `media <url>` | Extrai metadata de mídia via `yt-dlp` (1858 sites) |
| `archive <url>` | Fetch via fallback AMP / archive.today / Wayback |
| `trust <domain>` | Resolve nível/score de confiança para um domínio |
| `code <query>` | Busca código via `gh` (GitHub) ou `glab` (GitLab) |
| `doctor` | Verifica dependências (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Opções comuns em subcomandos de URL/query:**

| Flag | Descrição | Padrão |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Timeout por estratégia | `15` (`30` para `media`) |
| `--locale <value>` | Header `Accept-Language` | `en-US,en;q=0.9` |
| `--pretty` | Saída JSON pretty-printed | `false` |

**Extras de `fetch`:**

| Flag | Descrição |
|:-----|:-----------|
| `--only <strategies>` | Estratégias separadas por vírgula a executar (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Estratégias separadas por vírgula a pular |
| `--include-archive` | Anexa a estratégia archive como último fallback |

**Extras de `media`:**

| Flag | Descrição |
|:-----|:-----------|
| `--subs` | Escreve legendas |
| `--sub-lang <list>` | Idiomas das legendas, separados por vírgula (padrão: `en`) |
| `--format <spec>` | Especificação de formato do yt-dlp |

**Extras de `code`:**

| Flag | Descrição | Padrão |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Host | `github` |
| `--language <lang>` | Filtro de linguagem | |
| `--repo <owner/repo>` | Restringe a um repo | |
| `--limit <n>` | Máximo de resultados | `20` |

**Códigos de saída:** `0` ok, `1` erro, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

**Exemplos:**

```bash
# Fetch com auto-escalada
oma search fetch https://example.com/article --pretty

# Forçar uma única estratégia
oma search fetch https://example.com --only browser

# Busca cross-platform por palavra-chave via handlers de API
oma search api:search "RAG patterns" --platforms hackernews,reddit

# Encontrar o trust score de um repo
oma search trust github.com

# Busca de código (padrão GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verificar suas dependências locais
oma search doctor
```

### image

Geração de imagens com IA multi-vendor com dispatch paralelo ciente de autenticação. Aliasado como `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcomandos:**

| Subcomando | Propósito |
|:-----------|:--------|
| `generate <prompt...>` | Gera imagens via `pollinations` (flux/zimage, gratuito), `codex` (gpt-image-2 via ChatGPT OAuth) ou `gemini` (precisa de API key + cobrança, desabilitado por padrão) |
| `doctor` | Verifica autenticação e status de instalação por vendor |
| `list-vendors` | Lista os vendors registrados e modelos suportados |

**Opções de `image generate`:**

| Flag | Descrição | Padrão |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all` | `auto` |
| `--size <size>` | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto` | padrão do vendor |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | padrão do vendor |
| `-n, --count <n>` | Número de imagens (1..5) | `1` |
| `--out <dir>` | Diretório de saída | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | Permite caminhos `--out` fora de `$PWD` | `false` |
| `--model <name>` | Override de modelo específico do vendor | |
| `--strategy <list>` | Ordem de fallback do Gemini, separada por vírgula (`mcp,stream,api`) | |
| `--timeout <seconds>` | Timeout por imagem | padrão do vendor |
| `-r, --reference <path>` | Imagem(ns) de referência; repetível (`-r a.png -r b.png`) ou separado por vírgula. Suportado em `codex` e `gemini`; rejeitado em `pollinations`. Cada uma ≤5MB PNG/JPEG/GIF/WebP (validado por magic-byte), máximo 10. | |
| `-y, --yes` | Pular confirmação de custo | `false` |
| `--no-prompt-in-manifest` | Armazena SHA256 do prompt em vez do texto bruto | `false` |
| `--dry-run` | Imprime o plano e a estimativa de custo; não executa | `false` |
| `--format <format>` | Formato de saída da CLI: `text` \| `json` | `text` |

Cada execução escreve um `manifest.json` ao lado das imagens geradas registrando vendor, modelo, prompt (ou hash), tamanho, qualidade e custo.

**Exemplos:**

```bash
# Geração gratuita, sem configuração
oma image generate "minimalist sunrise over mountains"

# Vendor + tamanho + contagem específicos, pular prompt de custo
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Todos os vendors em paralelo para comparação
oma image generate "cat astronaut" --vendor all

# Estimativa de custo sem gastar
oma image generate "test prompt" --dry-run

# Usar imagem de referência para guiar estilo / sujeito (codex ou gemini)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Múltiplas referências (repetíveis ou separadas por vírgula)
oma image generate "blend these styles" --vendor gemini -r a.png -r b.png
oma image generate "blend these styles" --vendor gemini -r a.png,b.png

# Verificação doctor por vendor
oma image doctor --format json
```

### star

Dar estrela no oh-my-agent no GitHub.

```
oma star
```

Sem opções. Requer CLI `gh` instalada e autenticada. Dá estrela no repositório `first-fluke/oh-my-agent`.

**Exemplo:**
```bash
oma star
```

### describe

Descrever comandos CLI como JSON para introspecção em runtime.

```
oma describe [command-path]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:-----------|:-----------|
| `command-path` | Não | O comando a descrever. Se omitido, descreve o programa raiz. |

**O que faz:** Gera um objeto JSON com o nome, descrição, argumentos, opções e subcomandos do comando. Usado por agentes de IA para entender as capacidades CLI disponíveis.

**Exemplos:**
```bash
# Descrever todos os comandos
oma describe

# Descrever um comando específico
oma describe agent:spawn

# Descrever um subcomando
oma describe "agent:parallel"
```

### help

Mostrar informações de ajuda.

```
oma help
```

Exibe o texto completo de ajuda com todos os comandos disponíveis.

### version

Mostrar número da versão.

```
oma version
```

Imprime a versão atual da CLI e sai.

---

## Variáveis de ambiente

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
