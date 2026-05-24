---
title: "Opções CLI"
description: "Referência exaustiva para todas as opções CLI — flags globais, controle de saída, opções por comando e padrões de uso do mundo real."
---

# Opções CLI

## Opções globais

Estas opções estão disponíveis no comando raiz `oma` / `oh-my-agent`:

| Flag | Descrição |
|:-----|:-----------|
| `-V, --version` | Mostrar número da versão e sair |
| `-h, --help` | Exibir ajuda para o comando |

Todos os subcomandos também suportam `-h, --help` para mostrar seu texto de ajuda específico.

---

## Opções de saída

Muitos comandos suportam saída legível por máquina para pipelines CI/CD e automação. Existem três formas de solicitar saída JSON, em ordem de prioridade:

### 1. Flag --json

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

A flag `--json` é a forma mais simples de obter saída JSON. Disponível em: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. Flag --output

```bash
oma stats --output json
oma doctor --output text
```

A flag `--output` aceita `text` ou `json`. Fornece a mesma funcionalidade que `--json` mas também permite solicitar explicitamente saída em texto (útil quando a variável de ambiente está definida como json mas você quer texto para um comando específico).

**Validação:** Se um formato inválido é fornecido, o CLI lança: `Invalid output format: {value}. Expected one of text, json`.

### 3. Variável de ambiente OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats # gera JSON
oma doctor # gera JSON
oma retro # gera JSON
```

Defina esta variável de ambiente como `json` para forçar saída JSON em todos os comandos que a suportam. Apenas `json` é reconhecido; qualquer outro valor é ignorado e usa texto como padrão.

**Ordem de resolução:** flag `--json` > flag `--output` > variável env `OH_MY_AG_OUTPUT_FORMAT` > `text` (padrão).

### Comandos que suportam saída JSON

| Comando | `--json` | `--output` | Notas |
|:--------|:---------|:----------|:------|
| `doctor` | Sim | Sim | Inclui verificações CLI, status MCP, status de skills |
| `stats` | Sim | Sim | Objeto completo de métricas |
| `retro` | Sim | Sim | Snapshot com métricas, autores, tipos de commit |
| `cleanup` | Sim | Sim | Lista de itens limpos |
| `auth:status` | Sim | Sim | Status de autenticação por CLI |
| `memory:init` | Sim | Sim | Resultado da inicialização |
| `verify` | Sim | Sim | Resultados de verificação por check |
| `visualize` | Sim | Sim | Grafo de dependências como JSON |
| `describe` | Sempre JSON | N/A | Sempre gera JSON (comando de introspecção) |
| `recap` | Sim | Sim | Histórico de conversas por ferramenta/sessão |
| `export` | Sim | Sim | Status de exportação e caminhos de destino |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | N/A | Use `--format json` em vez de `--json` |
| `search ...` | Sempre JSON | N/A | Todos os subcomandos `search` retornam JSON em stream; use `--pretty` para leitura humana |

---

## Opções por comando

### oma (install)

```
oma
```

Sem flags. O instalador interativo solicita a seleção de preset e escreve `model_preset` em `.agents/oma-config.yaml`.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Descrição | Padrão |
|:-----|:----------|:-------|
| `--json` | Emite JSON em vez de texto formatado. | `false` |
| `--output <format>` | Formato de saída explícito (`text` ou `json`). Veja [Opções de Saída](#opções-de-saída). | `text` |
| `--profile` | Mostra a matriz de saúde do perfil — slug do modelo resolvido, CLI e status de autenticação por agente a partir do `model_preset` ativo e dos overrides em `agents:`. Veja [Per-Agent Models](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--ci]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--force` | `-f` | Sobrescrever arquivos de config customizados pelo usuário durante a atualização. Afeta: `oma-config.yaml`, `mcp.json`, diretórios `stack/`. Sem esta flag, estes arquivos são backupeados antes da atualização e restaurados depois. | `false` |
| `--ci` | | Executar em modo CI não-interativo. Pula todos os prompts de confirmação, usa saída plain console em vez de spinners e animações. Necessário para pipelines CI/CD onde stdin não está disponível. | `false` |

**Comportamento com --force:**
- `oma-config.yaml` é substituído pelo padrão do registro.
- `mcp.json` é substituído pelo padrão do registro.
- Diretório `stack/` do backend (recursos específicos de linguagem) é substituído.
- Todos os outros arquivos são sempre atualizados independente desta flag.

**Comportamento com --ci:**
- Sem `console.clear()` no início.
- `@clack/prompts` é substituído por `console.log` plain.
- Prompts de detecção de concorrentes são pulados.
- Erros fazem throw em vez de chamar `process.exit(1)`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| Flag | Descrição | Padrão |
|:-----|:----------|:-------|
| `--reset` | Resetar todos os dados de métricas. Deleta `.serena/metrics.json` e recria com valores vazios. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Descrição | Padrão |
|:-----|:----------|:-------|
| `--interactive` | Modo interativo com entrada manual de dados. Solicita contexto adicional que não pode ser coletado do git (ex: humor, eventos notáveis). | `false` |
| `--compare` | Comparar a janela de tempo atual contra a janela anterior de mesmo tamanho. Mostra métricas delta (ex: commits +12, linhas adicionadas -340). | `false` |

**Formato do argumento window:**
- `7d` — 7 dias
- `2w` — 2 semanas
- `1m` — 1 mês
- Omitir para padrão (7 dias)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--dry-run` | | Modo preview. Lista todos os itens que seriam limpos mas não faz mudanças. Exit code 0 independente dos achados. | `false` |
| `--yes` | `-y` | Pular todos os prompts de confirmação. Limpa tudo sem perguntar. Útil em scripts e CI. | `false` |

**O que é limpo:**
1. Arquivos PID órfãos: `/tmp/subagent-*.pid` onde o processo referenciado não está mais executando.
2. Arquivos de log órfãos: `/tmp/subagent-*.log` correspondendo a PIDs mortos.
3. Diretórios Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/` — estes acumulam estado ao longo do tempo e podem crescer bastante.

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--model` | `-m` | Sobrescrita de vendor CLI. Deve ser um de: `antigravity`, `claude`, `codex`, `qwen`. Sobrescreve toda resolução de vendor baseada em config. | Resolvido da config |
| `--workspace` | `-w` | Diretório de trabalho para o agente. Se omitido ou definido como `.`, o CLI auto-detecta o workspace a partir de arquivos de configuração de monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Auto-detectado ou `.` |

**Validação:**
- `agent-id` deve ser um de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` não deve conter `..`, `?`, `#`, `%` ou caracteres de controle.
- `vendor` deve ser um de: `antigravity`, `claude`, `codex`, `qwen`.

**Comportamento específico de vendor:**

| Vendor | Comando | Flag Auto-approve | Flag de Prompt |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (nenhuma) | `-p` |
| codex | `codex` | `--full-auto` | (nenhuma — prompt é posicional) |
| qwen | `qwen` | `--yolo` | `-p` |

Estes padrões podem ser sobrescritos em `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--root` | `-r` | Caminho raiz para localizar arquivos de memória (`.serena/memories/result-{agent}.md`) e arquivos PID. | Diretório de trabalho atual |

**Lógica de determinação de status:**
1. Se `.serena/memories/result-{agent}.md` existe: lê header `## Status:`. Se sem header, reporta `completed`.
2. Se arquivo PID existe em `/tmp/subagent-{session-id}-{agent}.pid`: verifica se PID está vivo. Reporta `running` se vivo, `crashed` se morto.
3. Se nenhum arquivo existe: reporta `crashed`.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--model` | `-m` | Sobrescrita de vendor CLI aplicada a todos os agentes spawnados. | Resolvido por agente da config |
| `--inline` | `-i` | Interpretar argumentos de tarefa como strings `agent:task[:workspace]` em vez de caminho de arquivo. | `false` |
| `--no-wait` | | Modo background. Inicia todos os agentes e retorna imediatamente sem esperar conclusão. Lista de PIDs e logs são salvos em `.agents/results/parallel-{timestamp}/`. | `false` (espera conclusão) |

**Formato de tarefa inline:** `agent:task` ou `agent:task:workspace`
- Workspace é detectado verificando se o último segmento separado por dois-pontos começa com `./`, `/` ou é igual a `.`.
- Exemplo: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Exemplo: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=auto-detectado.

**Formato de arquivo YAML de tarefas:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # opcional
- agent: frontend
task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flag | Descrição | Padrão |
|:-----|:----------|:-------|
| `--window <period>` | Janela de tempo: `1d`, `3d`, `7d`, `2w`, `30d`. Ignorada quando `--date` está definido. | `1d` |
| `--date <date>` | Data específica (`YYYY-MM-DD`). Tem precedência sobre `--window`. | |
| `--tool <tools>` | Filtra sessões por ferramenta. Separado por vírgula: `claude`, `codex`, `qwen`, `cursor`. | todas as ferramentas |
| `--top <n>` | Mostra apenas os top N projetos/tópicos no resumo. | sem limite |
| `--sort <metric>` | Ordena sessões por `count` ou `duration`. | `count` |
| `--mermaid` | Gera um gráfico Gantt do Mermaid em vez do resumo padrão. | `false` |
| `--graph` | Abre um grafo interativo no navegador. Mutuamente exclusivo com `--mermaid`. | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--dir <path>` | `-d` | Diretório de destino onde escrever as regras exportadas. | `process.cwd()` |

**Formatos suportados:** `cursor` (escreve arquivos `.cursor/rules` derivados das skills instaladas).

### search

```
oma search <subcommand> [...]
```

O grupo `search` traz seu próprio JSON de saída (sem flags `--json` / `--output`). Use `--pretty` em subcomandos de URL/query para pretty-print dos resultados, e dependa das opções específicas por subcomando abaixo:

| Subcomando | Opções Notáveis |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (padrão `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (padrão `en`), `--format <spec>`, `--timeout` (padrão `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (padrão `github`), `--language`, `--repo`, `--limit` (padrão `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | nenhuma — executa verificações de binários para Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` |

**Códigos de saída:** `0` ok, `1` erro, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Use estes em scripts para diferenciar bloqueios transitórios de entradas inválidas.

### image

```
oma image <subcommand> [...]
```

O formato de saída é controlado por subcomando via `--format <text|json>` (não a flag compartilhada `--json`).

`image generate` aceita:

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`. `auto` resolve a partir de `image-config.yaml` e da autenticação disponível. | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`. | padrão do vendor |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | padrão do vendor |
| `--count <n>` | `-n` | Número de imagens, 1..5. | `1` |
| `--out <dir>` | | Diretório de saída. Deve estar dentro de `$PWD` a menos que `--allow-external-out` esteja definida. | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | Permite caminhos `--out` fora de `$PWD`. | `false` |
| `--model <name>` | | Override de modelo específico do vendor (ex: `gpt-image-2`, `flux`, `imagen-4`). | padrão do vendor |
| `--strategy <list>` | | Ordem de fallback do Gemini, separada por vírgula: `mcp`, `stream`, `api`. | padrão do vendor |
| `--timeout <seconds>` | | Timeout por imagem. | padrão do vendor |
| `--reference <path>` | `-r` | Imagem de referência para transferência de estilo/sujeito. Repetível (`-r a.png -r b.png`) ou separada por vírgula. Validada por tamanho (≤5MB), formato (PNG/JPEG/GIF/WebP via magic bytes) e contagem (≤10). Suportada em `codex` (passa `-i` para `codex exec`) e `gemini` (inline base64 `inlineData`). Rejeitada com exit 4 em `pollinations`. | |
| `--yes` | `-y` | Pula o prompt de confirmação de custo. | `false` |
| `--no-prompt-in-manifest` | | Armazena SHA256 do prompt em vez do texto bruto em `manifest.json`. | `false` |
| `--dry-run` | | Imprime o plano e a estimativa de custo; não executa. | `false` |
| `--format <format>` | | `text` \| `json`. | `text` |

`image doctor` e `image list-vendors` aceitam apenas `--format <text|json>`.

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| Flag | Descrição | Padrão |
|:-----|:----------|:-------|
| `--force` | Sobrescrever arquivos de schema vazios ou existentes em `.serena/memories/`. Sem esta flag, arquivos existentes não são tocados. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--workspace` | `-w` | Caminho para o diretório de workspace a verificar. | Diretório de trabalho atual |

**Tipos de agente:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## Exemplos práticos

### Pipeline CI: atualizar e verificar

```bash
# Atualizar em modo CI, depois executar doctor para verificar instalação
oma update --ci
oma doctor --json | jq '.healthy'
```

### Coleta automatizada de métricas

```bash
# Coletar métricas como JSON e enviar para sistema de monitoramento
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Execução em lote de agentes com monitoramento de status

```bash
# Iniciar agentes em background
oma agent:parallel tasks.yaml --no-wait

# Verificar status periodicamente
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Limpeza em CI após testes

```bash
# Limpar todos os processos órfãos sem prompts
oma cleanup --yes --json
```

### Verificação com workspace

```bash
# Verificar cada domínio em seu workspace
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro com comparação para sprint reviews

```bash
# Retro de sprint de duas semanas com comparação ao sprint anterior
oma retro 2w --compare

# Salvar como JSON para relatório de sprint
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script completo de verificação de saúde

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Verificar instalações CLI
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Verificar status de auth
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# Verificar métricas
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe para introspecção de agentes

```bash
# Um agente de IA pode descobrir comandos disponíveis
oma describe | jq '.command.subcommands[] | {name, description}'

# Obter detalhes sobre um comando específico
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
