---
title: "Opções CLI"
description: "Referência exaustiva para todas as opções CLI — flags globais, controle de saída, opções por comando e padrões de uso do mundo real."
---

# Opções CLI

## Opções Globais

Estas opções estão disponíveis no comando raiz `oh-my-ag` / `oma`:

| Flag | Descrição |
|:-----|:-----------|
| `-V, --version` | Mostrar número da versão e sair |
| `-h, --help` | Exibir ajuda para o comando |

Todos os subcomandos também suportam `-h, --help` para mostrar seu texto de ajuda específico.

---

## Opções de Saída

Muitos comandos suportam saída legível por máquina para pipelines CI/CD e automação. Existem três formas de solicitar saída JSON, em ordem de prioridade:

### 1. Flag --json

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

A flag `--json` é a forma mais simples de obter saída JSON. Disponível em: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `usage:anti`, `memory:init`, `verify`, `visualize`.

### 2. Flag --output

```bash
oma stats --output json
oma doctor --output text
```

A flag `--output` aceita `text` ou `json`. Fornece a mesma funcionalidade que `--json` mas também permite solicitar explicitamente saída em texto (útil quando a variável de ambiente está definida como json mas você quer texto para um comando específico).

**Validação:** Se um formato inválido é fornecido, o CLI lança: `Invalid output format: {value}. Expected one of text, json`.

### 3. Variável de Ambiente OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # gera JSON
oma doctor   # gera JSON
oma retro    # gera JSON
```

Defina esta variável de ambiente como `json` para forçar saída JSON em todos os comandos que a suportam. Apenas `json` é reconhecido; qualquer outro valor é ignorado e usa texto como padrão.

**Ordem de resolução:** flag `--json` > flag `--output` > variável env `OH_MY_AG_OUTPUT_FORMAT` > `text` (padrão).

### Comandos que Suportam Saída JSON

| Comando | `--json` | `--output` | Notas |
|:--------|:---------|:----------|:------|
| `doctor` | Sim | Sim | Inclui verificações CLI, status MCP, status de skills |
| `stats` | Sim | Sim | Objeto completo de métricas |
| `retro` | Sim | Sim | Snapshot com métricas, autores, tipos de commit |
| `cleanup` | Sim | Sim | Lista de itens limpos |
| `auth:status` | Sim | Sim | Status de autenticação por CLI |
| `usage:anti` | Sim | Sim | Cotas de uso de modelo |
| `memory:init` | Sim | Sim | Resultado da inicialização |
| `verify` | Sim | Sim | Resultados de verificação por check |
| `visualize` | Sim | Sim | Grafo de dependências como JSON |
| `describe` | Sempre JSON | N/A | Sempre gera JSON (comando de introspecção) |

---

## Opções Por Comando

### update

```
oma update [-f | --force] [--ci]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--force` | `-f` | Sobrescrever arquivos de config customizados durante atualização. Afeta: `user-preferences.yaml`, `mcp.json`, diretórios `stack/`. Sem esta flag, estes arquivos são backupeados antes da atualização e restaurados depois. | `false` |
| `--ci` | | Executar em modo CI não-interativo. Pula todos os prompts de confirmação, usa saída plain console em vez de spinners e animações. Necessário para pipelines CI/CD onde stdin não está disponível. | `false` |

**Comportamento com --force:**
- `user-preferences.yaml` é substituído pelo padrão do registro.
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
3. Diretórios Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`.

### usage:anti

```
oma usage:anti [--json] [--output <format>] [--raw]
```

| Flag | Descrição | Padrão |
|:-----|:----------|:-------|
| `--raw` | Despejar resposta RPC bruta do Antigravity IDE sem parsing. Útil para debugar problemas de conexão. | `false` |

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-v <vendor>] [-w <workspace>]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--vendor` | `-v` | Sobrescrita de vendor CLI. Deve ser um de: `gemini`, `claude`, `codex`, `qwen`. Sobrescreve toda resolução de vendor baseada em config. | Resolvido da config |
| `--workspace` | `-w` | Diretório de trabalho para o agente. Se omitido ou definido como `.`, o CLI auto-detecta o workspace de arquivos de configuração monorepo. | Auto-detectado ou `.` |

**Validação:**
- `agent-id` deve ser um de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` não deve conter `..`, `?`, `#`, `%` ou caracteres de controle.
- `vendor` deve ser um de: `gemini`, `claude`, `codex`, `qwen`.

**Comportamento específico de vendor:**

| Vendor | Comando | Flag Auto-approve | Flag de Prompt |
|:-------|:--------|:-----------------|:-----------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (nenhuma) | `-p` |
| codex | `codex` | `--full-auto` | (nenhuma — prompt é posicional) |
| qwen | `qwen` | `--yolo` | `-p` |

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
oma agent:parallel [tasks...] [-v <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Curta | Descrição | Padrão |
|:-----|:------|:----------|:-------|
| `--vendor` | `-v` | Sobrescrita de vendor CLI aplicada a todos os agentes spawnados. | Resolvido por agente da config |
| `--inline` | `-i` | Interpretar argumentos de tarefa como strings `agent:task[:workspace]` em vez de caminho de arquivo. | `false` |
| `--no-wait` | | Modo background. Inicia todos os agentes e retorna imediatamente sem esperar conclusão. Lista de PIDs e logs são salvos em `.agents/results/parallel-{timestamp}/`. | `false` (espera conclusão) |

**Formato de tarefa inline:** `agent:task` ou `agent:task:workspace`
- Workspace é detectado verificando se o último segmento separado por dois-pontos começa com `./`, `/` ou é igual a `.`.

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

## Exemplos Práticos

### Pipeline CI: Atualizar e Verificar

```bash
# Atualizar em modo CI, depois executar doctor para verificar instalação
oma update --ci
oma doctor --json | jq '.healthy'
```

### Coleta Automatizada de Métricas

```bash
# Coletar métricas como JSON e enviar para sistema de monitoramento
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Execução em Lote de Agentes com Monitoramento de Status

```bash
# Iniciar agentes em background
oma agent:parallel tasks.yaml --no-wait

# Verificar status periodicamente
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Limpeza em CI Após Testes

```bash
# Limpar todos os processos órfãos sem prompts
oma cleanup --yes --json
```

### Verificação com Workspace

```bash
# Verificar cada domínio em seu workspace
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro com Comparação para Sprint Reviews

```bash
# Retro de sprint de duas semanas com comparação ao sprint anterior
oma retro 2w --compare

# Salvar como JSON para relatório de sprint
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script Completo de Verificação de Saúde

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

### Describe para Introspecção de Agentes

```bash
# Um agente de IA pode descobrir comandos disponíveis
oma describe | jq '.command.subcommands[] | {name, description}'

# Obter detalhes sobre um comando específico
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
