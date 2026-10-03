---
title: "Opções CLI"
description: "Referência exaustiva de todas as opções da CLI, com indicadores globais, controle de saída, opções por comando e exemplos de uso reais."
---

# Opções CLI

## Opções globais

Estas opções estão disponíveis no comando raiz `oma` / `oh-my-agent`:

| Opção | Descrição |
|:-----|:-----------|
| `-g, --global` | Opera na instalação HOME (`~/.agents/`) em vez de `<cwd>/.agents/` |
| `-y, --yes` | Ignora os prompts quando o comando selecionado oferece confirmação; as verificações de segurança específicas do comando continuam sendo aplicadas |
| `-V, --version` | Exibe o número da versão e sai |
| `-h, --help` | Exibe a ajuda do comando |

Todos os subcomandos também aceitam `-h, --help` para mostrar a ajuda específica de cada um.

`--global` define a raiz de instalação para todo o processo: `install`, `update`, `link` e `uninstall` resolvem, portanto, todos para `~/.agents/`, independentemente do diretório a partir do qual você os executa. `OMA_HOME=<abs-path>` a substitui — veja [Instalação global](../guide/global-install.md).

---

## Opções de saída {#output-options}

Muitos comandos oferecem saída legível por máquina para pipelines de CI/CD e automação. Há três formas de solicitar saída JSON, em ordem de prioridade:

### 1. Indicador --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

O indicador `--json` está disponível apenas nos caminhos individuais que o anunciam. Não deduza o suporte a partir de uma família de comandos: por exemplo, as folhas `image`, `video` e `slide` expõem `--output` quando o registro o lista, enquanto `search` tem seu próprio fluxo JSON. A matriz do registro no fim desta página é a lista de referência por caminho.

### 2. Indicador --output

```bash
oma stats get --output json
oma doctor --output text
```

O indicador `--output` aceita `text` ou `json`. Ele oferece a mesma função que `--json`, mas também permite solicitar explicitamente saída em texto (útil quando a variável de ambiente está definida como json, mas um comando específico deve produzir texto).

**Validação:** se um formato inválido for informado, a CLI lança: `Invalid output format: {value}. Expected one of text, json`.

### 3. Variável de ambiente OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Defina esta variável de ambiente como `json` para forçar saída JSON em todos os comandos que a suportam. Somente o valor `json` é reconhecido; qualquer outro valor é ignorado e a saída em texto é usada.

**Ordem de resolução:** indicador `--json` > indicador `--output` > variável de ambiente `OH_MY_AG_OUTPUT_FORMAT` > `text` (valor padrão).

### Comandos que suportam saída JSON

| Comando | `--json` | `--output` | Notas |
|:--------|:---------|:----------|:------|
| `doctor` | Sim | Sim | Inclui as verificações da CLI, o estado do MCP e o estado das skills |
| `stats` | Sim | Sim | Objeto completo de métricas |
| `retro` | Sim | Sim | Instantâneo com métricas, autores e tipos de commit |
| `cleanup` | Sim | Sim | Lista dos itens limpos |
| `auth status` | Sim | Sim | Estado de autenticação por CLI |
| `memory init` | Sim | Sim | Resultado da inicialização |
| `verify agent` / `verify triggers` | Sim | Sim | Resultados de cada verificação |
| `visualize` | Sim | Sim | Grafo de dependências em formato JSON |
| `describe` | Sempre JSON | N/A | Produz sempre JSON (comando de introspecção) |
| `recap` | Sim | Sim | Histórico de conversas por ferramenta/sessão |
| `image generate` / `image doctor` / `image vendor list` | N/A | Sim | Use `--output json`; `vendor list` é o caminho canônico de descoberta |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Sim | Use `--output json` para o envelope de execução ou o relatório de disponibilidade |
| `explain validate` | Sim | Sim | Relatório de validação do artefato |
| `diagram resolve` / `diagram update` | Sim | Sim | Resolução do engine ou resultado do cache gerenciado |
| `market resolve` / `market update` | Sim | Sim | Estado do engine de pesquisa gerenciado |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Sim | N/A | Cada caminho docs tem suas próprias opções de relatório |
| `search ...` | Sempre JSON | N/A | Todos os subcomandos `search` escrevem JSON; use `--pretty` para leitura humana |

---

## Opções por comando

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

O instalador interativo grava os parâmetros de fornecedor selecionados em `.agents/oma-config.yaml`. Os indicadores de fornecedor selecionam as integrações de pesquisa na web, de inteligência de código e de memória semântica; `--honcho-url` e `--honcho-workspace` configuram o serviço de memória Honcho quando esse fornecedor é selecionado. O indicador raiz `-y, --yes` se aplica quando um fluxo de instalação pede confirmação.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--json` | Emite JSON em vez de texto formatado. | `false` |
| `--output <format>` | Formato de saída explícito (`text` ou `json`). Consulte [Opções de saída](#output-options). | `text` |
| `--profile` | Exibe a matriz de saúde do perfil (slug de modelo resolvido, CLI e estado de autenticação por agente a partir do `model_preset` ativo e das substituições de `agents:`). Consulte [Modelos por agente](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Substitui os arquivos de configuração personalizados durante a atualização. Abrange `oma-config.yaml`, `mcp.json` e os diretórios `stack/`. Sem esta opção, esses arquivos passam por backup antes da atualização e são restaurados depois. | `false` |
| `--with-new-skills` | | Instala as skills adicionadas ao registro desde a instalação atual. | `false` |
| `--ci` | | Executa em modo CI não interativo. Ignora todas as confirmações e usa saída simples no console em vez de spinners e animações. Obrigatório em pipelines de CI/CD sem stdin. | `false` |
| `--yes` | `-y` | Ignora os prompts. Não cria os diretórios de fornecedores ausentes, exceto com `--all` ou `--vendor`. | `false` |
| `--all` | | Cria ou atualiza todos os fornecedores compatíveis no nível do projeto. | `false` |
| `--vendor <vendors>` | | Cria ou atualiza uma lista de fornecedores separados por vírgulas, por exemplo `claude,qwen`. | Apenas os diretórios de fornecedores existentes |

`oma update mcp` usa os mesmos controles `--yes`, `--ci`, `--all` e `--vendor` ao escolher os servidores MCP do navegador. Ele não usa `--force` nem `--with-new-skills`.

**Comportamento com --force:**
- `oma-config.yaml` é substituído pelo valor padrão do registro.
- `mcp.json` é substituído pelo valor padrão do registro.
- O diretório backend `stack/` (recursos específicos da linguagem) é substituído.
- Todos os outros arquivos são sempre atualizados, independentemente desta opção.

**Comportamento com --ci:**
- Nenhum `console.clear()` na inicialização.
- `@clack/prompts` é substituído por `console.log` simples.
- Os prompts de detecção de concorrentes são ignorados.
- Os erros são lançados em vez de chamar `process.exit(1)`.

**Escopo dos fornecedores:**
- `oma update` atualiza apenas os diretórios de fornecedores que já existem.
- `oma update --yes` usa o mesmo escopo de fornecedores, sem prompts.
- `oma update --all` cria ou atualiza todos os fornecedores compatíveis no nível do projeto.
- `oma update --vendor claude,qwen` cria ou atualiza somente os fornecedores listados.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--json` | Emite o resultado da reinicialização em formato JSON. | `false` |
| `--output <format>` | Emite `text` ou `json`. | `text` |

`oma stats reset` é o comando de reinicialização. A forma antiga `oma stats get --reset` não faz parte da superfície pública atual.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--interactive` | Modo interativo com entrada manual. Solicita contexto adicional que não pode ser coletado a partir do git (por exemplo, o humor ou eventos notáveis). | `false` |
| `--compare` | Compara a janela de tempo atual com a janela anterior de mesma duração. Exibe as variações (por exemplo, commits +12, linhas adicionadas -340). | `false` |

**Formato do argumento window:**
- `7d`: 7 dias
- `2w`: 2 semanas
- `1m`: 1 mês
- Omita para usar o valor padrão (7 dias)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Modo de pré-visualização. Lista todos os itens que seriam limpos sem modificar os arquivos. O código de saída é 0, independentemente do que for encontrado. | `false` |
| `--yes` | `-y` | Ignora todos os prompts de confirmação. Limpa tudo sem perguntar. Útil em scripts e na CI. | `false` |

**O que é limpo:**
1. Arquivos PID órfãos: `/tmp/subagent-*.pid`, quando o processo referenciado não está mais em execução.
2. Arquivos de log órfãos: `/tmp/subagent-*.log`, correspondentes a PIDs de processos encerrados.
3. Diretórios Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Eles acumulam estado ao longo do tempo e podem ficar muito grandes.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Vincula uma nova tentativa ao identificador da execução anterior. | |
| `--fallback-vendors` | — | Cadeia explícita e ordenada de fornecedores de fallback, separados por vírgulas. | |
| `--task-id` | — | Identificador da tarefa vindo do plano da sessão. | Identificador do agente |
| `--vendor` | — | Substituição do fornecedor da CLI. A execução aceita `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` ou `pi`. | Resolvido a partir da configuração |
| `--workspace` | `-w` | Diretório de trabalho do agente. Se omitido ou definido como `.`, a CLI detecta automaticamente o espaço de trabalho a partir dos arquivos de configuração do monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Detectado automaticamente ou `.` |
| `--isolation` | — | Modo de isolamento: `worktree` cria um worktree git por execução; o valor padrão é `none`. | `none` |
| `--read-only` | — | Limita o agente iniciado a ferramentas não destrutivas e remove os indicadores de autoaprovação. | `false` |

**Validação:**
- `agent-id` deve ser um de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` não deve conter `..`, `?`, `#`, `%` nem caracteres de controle.
- `vendor` deve ser um de: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Comportamento específico de cada fornecedor:**

| Fornecedor | Comando | Indicador de autoaprovação | Indicador de prompt |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (nenhum) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (nenhum; o prompt é posicional) |
| cursor | `cursor-agent` | específico do fornecedor | `-p` |
| opencode | `opencode` | específico do fornecedor | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | específico do fornecedor | `-p` |
| pi | `pi` | suprimido no modo `--read-only` | o prompt é posicional |

Esses valores padrão podem ser substituídos em `.agents/skills/oma-orchestration/config/cli-config.yaml`.

O Codex mantém seu sandbox workspace-write. O oma habilita o acesso à rede e adiciona a raiz do projeto, o diretório de estado do OMA (`~/.oma`) e os caches existentes de gerenciadores de pacotes como diretórios graváveis. `oma update` substitui `cli-config.yaml`; portanto, defina um modo duradouro com `OMA_CODEX_SANDBOX`: `read-only`, `workspace-write` (padrão) ou `danger-full-access` (sem sandbox e sem aprovações).

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Caminho raiz para localizar os arquivos de memória (`.agents/state/memories/result-{agent}.md`) e os arquivos PID. | Diretório de trabalho atual |

**Lógica de determinação do estado:**
1. Se `.agents/state/memories/result-{agent}.md` existe, lê o cabeçalho `## Status:`. Na ausência de cabeçalho, exibe `completed`.
2. Se o arquivo PID existe em `/tmp/subagent-{session-id}-{agent}.pid`, verifica se o PID está ativo. Exibe `running` se estiver ativo e `crashed` se tiver sido encerrado.
3. Se nenhum dos dois arquivos existe, exibe `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | Substituição do fornecedor da CLI aplicada a todos os agentes iniciados. | Resolvido para cada agente a partir da configuração |
| `--inline` | `-i` | Interpreta os argumentos de tarefa como strings `agent:task[:workspace]` em vez de um caminho de arquivo. | `false` |
| `--no-wait` | | Modo em segundo plano. Inicia todos os agentes e retorna imediatamente, sem esperar a conclusão. Os PIDs e os logs são salvos em `.agents/results/parallel-{timestamp}/`. | `false` (espera a conclusão) |

**Formato das tarefas inline:** `agent:task` ou `agent:task:workspace`
- O workspace é detectado verificando se o último segmento separado por dois-pontos começa com `./`, `/` ou é igual a `.`.
- Exemplo: `backend:Implement auth API:./api` — agent=backend, task="Implement auth API", workspace=./api.
- Exemplo: `frontend:Build login page` — agent=frontend, task="Build login page", workspace=auto-detected.

**Formato do arquivo YAML de tarefas:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--window <period>` | Janela de tempo: `1d`, `3d`, `7d`, `2w`, `30d`. Ignorada quando `--date` está definido. | `1d` |
| `--date <date>` | Data específica (`YYYY-MM-DD`). Tem prioridade sobre `--window`. | |
| `--tool <tools>` | Filtra as sessões por ferramenta. Lista separada por vírgulas: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | todas as ferramentas |
| `--top <n>` | Exibe somente os N principais projetos/temas do resumo. | sem limite |
| `--sort <metric>` | Ordena as sessões por `count` ou `duration`. | `count` |
| `--mermaid` | Exibe um diagrama de Gantt Mermaid em vez do resumo padrão. | `false` |
| `--graph` | Abre um grafo interativo no navegador. Mutuamente exclusivo com `--mermaid`. | `false` |

> **Nota:** a geração de arquivos de regras do fornecedor (por exemplo, `.cursor/rules`) a partir das skills instaladas é feita por [`oma link <vendor>`](./commands.md#link), e não por um comando `export` separado.

### search

```
oma search <subcommand> [...]
```

O grupo `search` fornece sua própria saída JSON (sem os indicadores `--json` / `--output`). Use `--pretty` nos subcomandos de URL/consulta para formatar os resultados e consulte abaixo as opções específicas de cada subcomando:

| Subcomando | Opções importantes |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (por padrão `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (por padrão `en`), `--format <spec>`, `--timeout` (por padrão `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (por padrão `github`), `--language`, `--repo`, `--limit` (por padrão `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | nenhum (executa verificações de binários para Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Códigos de saída:** `0` OK, `1` erro, `2` bloqueado, `3` não encontrado, `4` entrada inválida, `5` autenticação obrigatória, `6` tempo limite excedido. Use-os em scripts para distinguir bloqueios transitórios de entradas inválidas.

### image

```
oma image <subcommand> [...]
```

O formato de saída é controlado por cada subcomando via `--output <text|json>`.

`image generate` aceita:

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` resolve a configuração `image:` ativa e a autenticação disponível. | `auto` |
| `--size <size>` | | `WxH` com as duas bordas divisíveis por 16, de 16 a 3840, proporção de 1:3 a 3:1, ou `auto`. | valor padrão do fornecedor |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | valor padrão do fornecedor |
| `--count <n>` | `-n` | Número de imagens, de 1 a 5. | `1` |
| `--output-dir <dir>` | | Diretório de saída. Deve ficar dentro de `$PWD`, exceto se `--allow-external-output` estiver definido. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Autoriza os caminhos `--output-dir` fora de `$PWD`. | `false` |
| `--model <name>` | | Substituição de modelo específica do fornecedor. O modelo antigravity é selecionado por `agy`. | valor padrão do fornecedor |
| `--timeout <duration>` | | Tempo limite por imagem, expresso como duração. | valor padrão do fornecedor |
| `--reference <path>` | `-r` | Imagem de referência para transferência de estilo/tema. Repetível (`-r a.png -r b.png`) ou separada por vírgulas. Validada quanto ao tamanho (≤5 MB), ao formato (PNG/JPEG/GIF/WebP via magic bytes) e à quantidade (≤10). Compatível com `codex` e `antigravity`; recusada com o código de saída 4 por `pollinations`. | |
| `--yes` | `-y` | Ignora o prompt de confirmação do custo. | `false` |
| `--no-prompt-in-manifest` | | Armazena o SHA256 do prompt em vez do texto bruto em `manifest.json`. | `false` |
| `--dry-run` | | Exibe o plano e a estimativa de custo; não executa nada. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` e `image vendor list` aceitam `--output <text|json>`. `image list-vendors` permanece como um alias de ajuda; `vendor list` é o caminho canônico de descoberta.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` aceita os controles de planejamento e de captura `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` e `--capture-stop`. Aceita também `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` e `--no-brief-in-manifest`. A captura pelo navegador usa `--source web --url <url>`; `file` é a origem padrão. Uma renderização normal exige uma composição escrita e um compositor funcional; os placeholders se limitam ao caminho de teste `OMA_VIDEO_MOCK=1`.

`video doctor` informa ou instala a cadeia de ferramentas HyperFrames/MPT/Strudel. `compose` prepara o contrato de composição da execução e `render` executa o lint, renderiza e verifica a saída. `provider list` informa o estado do fornecedor e da chave. Consulte [Geração de vídeo](../guide/video-generation.md) para o manifesto de execução e a sequência de recuperação.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--force` | Substitui os arquivos de esquema vazios ou existentes em `.agents/state/memories/`. Sem esta opção, os arquivos existentes não são tocados. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Caminho para o diretório workspace a verificar. | Diretório de trabalho atual |

**Tipos de agente:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` mede a precisão do detector de palavras-chave em um corpus rotulado. Os limites percentuais são gates; use a saída JSON quando um job de CI precisar inspecionar resultados individuais. A grafia antiga `oma verify <agent-type>` é uma forma de ajuda mantida por compatibilidade; `verify agent` é o caminho registrado.

---

## Exemplos práticos

### Pipeline de CI: atualização e verificação

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Coleta automatizada de métricas

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Execução em lote de agentes com monitoramento de estado

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Limpeza na CI depois dos testes

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Verificação por workspace

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro com comparação para revisões de sprint

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script completo de verificação de saúde

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe para introspecção de agentes

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

## Registro público completo das opções

A matriz a seguir é gerada a partir do registro público de comandos mantido no repositório. Ela é o índice de cobertura desta página: uma linha com `—` não tem opções específicas do comando, enquanto as opções raiz compartilhadas e os aliases de ajuda estão descritos acima. Execute `oma describe "<path>"` para consultar a ajuda em tempo de execução quando a gramática de um valor mudar.

| Caminho de comando | Opções públicas | Função |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Instala as skills e as configurações do oh-my-agent |
| `describe` | `—` | Descreve os comandos da CLI em JSON para introspecção em tempo de execução |
| `uninstall` | `--dry-run, -y, --yes` | Remove os arquivos pertencentes ao oh-my-agent (preserva oma-config.yaml, mcp.json e as skills escritas pelo usuário) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Atualiza as skills para a versão mais recente do registro |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Seleciona os servidores MCP do navegador (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Regenera os arquivos dos fornecedores (.claude/, .cursor/, etc.) a partir da SSOT .agents/ |
| `intel` | `—` | Pipeline de inteligência de produto: pesquisa, lacunas, PRD, proposta de issue |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Sugere trabalho de produto de alto valor a partir da inteligência de mercado e de código |
| `market` | `—` | Pesquisa de mercado baseada em sinais da comunidade, via o engine last30days sempre atualizado |
| `market detect-trap` | `--force` | Verificação preflight que recusa consultas armadilha de palavras-chave |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Informa o engine last30days que o oma executará (versão gerenciada mais recente, fixada ou cópia local) e o Python usado |
| `market update` | `--json, --output <format>` | Baixa a versão mais recente do last30days para o cache gerenciado do OMA (~/.cache/oma-market/last30days) |
| `market run` | `—` | Executa o engine last30days (scripts/last30days.py) com os argumentos informados; --save-dir assume por padrão market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Verifica as instalações de CLI, as configurações de MCP e o estado das skills |
| `profile` | `—` | Gerencia os perfis de execução OMA locais |
| `profile list` | `--json, --output <format>` | Lista os perfis locais |
| `profile show` | `--json, --output <format>` | Exibe um perfil local |
| `profile create` | `--json, --output <format>` | Cria um perfil local |
| `profile use` | `--shell <shell>, --json, --output <format>` | Exibe o código shell que ativa um perfil existente |
| `profile run` | `—` | Executa um comando com OMA_PROFILE definido para o processo filho |
| `retro` | `--interactive, --compare, --json, --output <format>` | Retrospectiva de engenharia com métricas e tendências |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Resume o histórico de conversas das ferramentas de IA |
| `docs` | `—` | Detecção de drift na documentação: verifica as referências e propõe atualizações para os documentos afetados por um diff |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Extrai as referências L2 dos documentos e informa os destinos quebrados. Regenera docs/generated/doc-refs.json como efeito colateral. Código de saída: 0 = limpo, 1 = referências quebradas. A verificação de URLs é delegada ao `lychee` (instalação: brew install lychee). |
| `docs sync` | `--json` | A partir de um diff do git, lista os documentos que referenciam os arquivos alterados. O LLM host (runtime de skill) deve ler esta lista e o diff e propor correções conforme o contrato do SKILL.md — a CLI nunca edita documentos automaticamente. Intervalo padrão do diff: --cached (alterações em staging), com fallback para HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Detecta drift entre os documentos-fonte em inglês (web/docs) e as traduções i18n (web/i18n/{lang}/...). Emite sinais estruturais (número de linhas, número de títulos, carimbo de data do último commit) para cada par, para que o LLM host decida quais traduções precisam de um patch de sincronização. A CLI nunca edita as traduções. |
| `docs lint` | `--json, --locales <list>` | Verifica antipadrões de conteúdo em documentos traduzidos (travessões em idiomas de destino CJK, etc.). Complementa `oma docs i18n` (drift estrutural) com verificações de estilo e antipadrões conforme o SKILL.md do oma-translation § Stage 4. A CLI nunca corrige automaticamente — apenas informa os problemas para o LLM host reestruturar. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Emite artefatos em conformidade com os padrões a partir da SSOT .agents/ (especificação Agent Skills, pacote Agent Plugins, marketplace de plugins do Claude Code, AGENTS.md, documentos de fornecedores com escopo em cli/) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Limpa processos órfãos de subagentes e arquivos temporários |
| `bridge` | `--context <name>` | Encaminha o MCP stdio para um servidor Serena compartilhado por projeto (iniciado sob demanda) |
| `verify` | `—` | Verifica a saída de um subagente (backend/frontend/mobile/qa/debug/pm) ou mede a precisão dos gatilhos do detector de palavras-chave |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Mede a precisão dos gatilhos do detector de palavras-chave em um corpus de prompts rotulado |
| `vault` | `—` | Gerencia chaves de API e segredos no chaveiro do sistema (Keychain do macOS / Secret Service do Linux / Gerenciador de Credenciais do Windows) |
| `vault store` | `--value <value>` | Armazena um segredo sob <name> (prompt interativo de senha) |
| `vault get` | `—` | Exibe o valor armazenado no stdout (para: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Lista os nomes dos segredos armazenados (os valores nunca são exibidos) |
| `vault delete` | `—` | Remove um segredo do chaveiro e do índice |
| `star` | `—` | Dá uma estrela ao oh-my-agent no GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualiza a estrutura do projeto como um grafo de dependências |
| `search` | `—` | Primitivas de pesquisa mecânicas: fetch, meta, rss, media, trust, code |
| `search providers` | `--json, --pretty` | Lista os fornecedores de pesquisa registrados e inspeciona a seleção sem acessar a rede |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Pesquisa com o fornecedor web selecionado (o Brave tem um adaptador de CLI) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Obtém uma URL por meio de um pipeline de estratégias com escalonamento automático |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Extrai OGP / JSON-LD / Schema.org a partir de uma URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Extrai os metadados de mídia via yt-dlp (1858 sites) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Obtém via AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Resolve o nível ou a pontuação de confiança de um domínio |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Pesquisa código via gh / glab |
| `search doctor` | `—` | Verifica as dependências (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Obtém via a API da plataforma correspondente (fase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Distribui uma pesquisa por palavras-chave entre as plataformas compatíveis |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Descobre e analisa um feed RSS/Atom para uma URL |
| `search rss google` | `--locale <value>` | Monta uma URL de RSS do Google News para uma consulta |
| `harness` | `—` | Avalia overlays do harness OMA em tarefas isoladas de repositório |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Compara um overlay .agents candidato com a base atual |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Deriva uma fixture de regressão de skill a partir de um incidente capturado |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Promove incidentes e otimiza as skills afetadas |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | Habilita o ciclo de feedback agendado e com orçamento de um projeto; o modo é apply ou propose |
| `harness evolution status` | `--json, --output <format>` | Mostra a configuração, o agendamento, o trabalho pendente, os conflitos e o último ciclo |
| `harness evolution disable` | `--json, --output <format>` | Desabilita o ciclo de feedback agendado do projeto |
| `harness evolution run` | `--json, --output <format>` | Executa um ciclo sob o modo e o orçamento salvos do projeto habilitado |
| `slide` | `—` | Kit de ferramentas para apresentações HTML: criar, validar, exportar e editar decks de slides em 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Gate de qualidade geométrica: renderiza os slides via puppeteer-core e verifica estouro, sobreposição e tamanho de fonte |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Combina os arquivos por slide em uma entrega .html autônoma |
| `slide edit` | `--workspace <path>, --port <n>` | Abre o editor bbox no navegador (servidor node:http em 127.0.0.1, delegando ao runner de agentes do oma) |
| `slide doctor` | `—` | Sonda as dependências obrigatórias (chrome, puppeteer-core) e opcionais (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Cria um novo diretório de trabalho de slides com HTML inicial, assets/ e meta.json |
| `slide preview` | `--workspace <path>` | Gera viewer.html (web component deck-stage e painel de notas do apresentador, alterna com `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Exporta os slides em PDF via puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Exporta cada slide como imagem PNG via puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTAL] Exporta para PPTX via pptxgenjs (fundo rasterizado, gradientes rasterizados) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Importa um arquivo .pptx como fragmentos de slides via officeparser (bunx, melhor esforço) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Baixa um vídeo via yt-dlp para ./assets/ e exibe a referência local |
| `slide style` | `—` | Navega e obtém presets de estilo visual |
| `slide style list` | `—` | Lista os presets de estilo disponíveis (embutidos + índice bold-template) |
| `slide style preview` | `—` | Visualiza um preset de estilo no terminal |
| `slide style get` | `--refresh` | Obtém um design.md de template bold (main sempre atualizado; cache usado como fallback offline) |
| `scholar` | `—` | Sidecars de artigos do Knows.academy (com fallbacks para OpenAlex e Semantic Scholar) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Pesquisa artigos (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Encontra a melhor correspondência de artigo em knows.academy, OpenAlex e Semantic Scholar |
| `scholar get` | `--section <name>` | Obtém um sidecar (record_id do Knows) ou metadados de trabalho (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Valida um sidecar .knows.yaml ou .knows.json (v0.9.0) |
| `image` | `—` | Geração de imagens por IA com vários fornecedores e despacho paralelo ciente da autenticação |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Gera imagens via pollinations (flux/zimage, gratuito), codex (gpt-image-2, OAuth do ChatGPT) ou antigravity (gemini nano-banana via a CLI `agy`, gratuito com login no Gemini Code Assist) |
| `image doctor` | `--output <format>` | Verifica a autenticação e o estado de instalação por fornecedor |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Lista os fornecedores registrados e os modelos compatíveis |
| `video` | `—` | Geração de vídeos curtos, explicativos e de demonstração |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Gera um diretório de execução de vídeo a partir de um brief |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Verifica a disponibilidade do fornecedor de vídeo e do compositor |
| `video compose` | `--output <format>, --refresh, --offline` | Cria o projeto HyperFrames da execução na cadeia de ferramentas mais recente + heygen-com/hyperframes e exibe o contrato de autoria |
| `video render` | `--output <format>` | Renderiza novamente um diretório de execução a partir de render-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Lista os fornecedores de vídeo e sua disponibilidade |
| `serena` | `—` | Utilitários do ciclo de vida do servidor de linguagem MCP Serena |
| `serena reap` | `--dry-run, --quiet` | Encerra os processos filhos LSP do Serena inativos para recuperar memória (o Serena se recupera sozinho na próxima chamada de ferramenta) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Instala a tarefa agendada periódica do Serena Reaper (executa a cada 5 minutos) |
| `serena reaper disable` | `--dry-run` | Desinstala a tarefa agendada periódica do Serena Reaper |
| `explain` | `—` | Ferramentas de gerenciamento e validação de qualidade dos artefatos de explicação |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Valida os artefatos HTML autônomos de relatórios explain |
| `diagram` | `—` | Auxiliares do engine de diagramas (HTML interativo archify ou fallback Mermaid) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Informa qual engine de diagramas os workflows devem usar e onde o archify está |
| `diagram update` | `--json, --output <format>` | Baixa a versão mais recente do archify para o cache gerenciado do OMA (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Executa a CLI archify instalada (doctor \| guide \| validate \| deliver \| visual-check …) com as verificações de atualização desabilitadas |
| `help` | `—` | Exibe as informações de ajuda |
| `version` | `—` | Exibe o número da versão |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Inicia o dashboard de terminal (monitoramento de agentes em tempo real) |
| `dashboard web` | `—` | Inicia o dashboard web em http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Verifica o estado de autenticação de todas as CLIs compatíveis |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Despacha um evento de hook do fornecedor pelo roteador centralizado do oma (design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Sonda a compatibilidade L1 dos hooks por fornecedor e exibe uma matriz (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Acrescenta um evento de workflow OMA L1 |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migra as sessões legadas para o perfil HOME e remove os originais verificados |
| `state get` | `--json, --output <format>` | Inspeciona uma sessão OMA L1 por identificador |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspeciona o estado de workflow OMA L1 |
| `state repair` | `--dry-run, --json, --output <format>` | Repara os arquivos de estado de workflow OMA L1 |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Verifica os eventos L1 obrigatórios para um ponto de controle de workflow |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Lista os pontos de controle L1 decision.made obrigatórios |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Lista ou exibe os logs de auditoria de injeção por fronteira (D52) |
| `state inject-log get` | `--json, --output <format>` | Lista ou exibe os logs de auditoria de injeção por fronteira (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Exporta um resumo de sessão para o armazenamento de coordenação |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Verifica se o autorreparo é permitido para um agente |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspeciona o estado de workflow OMA L1 |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspeciona o estado de workflow OMA L1 |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspeciona o estado de workflow OMA L1 |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Verifica os artefatos EXEC do ralph (gate anticontorno, etapa 1.3 do ralph.md) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Associa um contrato de objetivo (gate de parada determinístico / orçamento de tempo real) a um workflow persistente ativo |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Exibe as métricas de produtividade |
| `stats reset` | `--json, --output <format>` | Exibe as métricas de produtividade |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Carrega o contexto selecionado por grafo para um prompt de delegação nativo |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Retoma tarefas incompletas seguras, reutilizando as evidências de aceitação atuais |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Inicia uma execução nativa de agente respaldada por evidências |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Executa o argv de verificação após -- e registra seu código de saída real |
| `agent finish` | `--project-root <path>` | Valida o resultado de um agente nativo com base nos recibos de verificação |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Inicia um subagente (o prompt pode ser um texto inline ou um caminho de arquivo) |
| `agent status` | `--project-root <path>` | Verifica o estado dos subagentes |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Executa vários agentes secundários em paralelo |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Faz uma revisão de código com uma CLI externa (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Compara o registro de modelos com as listas de modelos atuais dos fornecedores |
| `model probe` | `--json, --timeout <duration>` | Sonda um slug de modelo na CLI do fornecedor para verificar se ele é aceito |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Executa model:check --probe internamente e gera um patch `models:` para o oma-config com os candidatos aceitos |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Configura a conexão com o Honcho ou as credenciais locais de embedding |
| `memory init` | `--force, --json, --output <format>` | Inicializa o armazenamento de coordenação em .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Prepara a configuração de um endpoint do AgentMemory |
| `memory daemon` | `—` | Gerencia um processo daemon do AgentMemory pertencente ao OMA |
| `memory daemon status` | `--json, --output <format>` | Exibe o estado do daemon |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Inicia AgentMemory em segundo plano |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Para o daemon AgentMemory gerenciado por OMA |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Reinicia o daemon AgentMemory |
| `memory service` | `—` | Gerencia a integração do AgentMemory como serviço do sistema operacional |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Instala a integração do serviço launchd/systemd do AgentMemory |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Desinstala a integração do serviço launchd/systemd do AgentMemory |
| `memory status` | `--json, --output <format>` | Exibe o estado de saúde do fornecedor de memória semântica selecionado |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Drena as novas tentativas de observação do AgentMemory em fila |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Importa o histórico de conversas de um fornecedor em AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Mantém o armazenamento local do AgentMemory: backup, limpeza, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Mantém o armazenamento local do AgentMemory: backup, limpeza, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Mantém o armazenamento local do AgentMemory: backup, limpeza, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Mantém o armazenamento local do AgentMemory: backup, limpeza, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Faz a coleta de lixo da memória local do projeto: remove sessões L1 antigas e arquivos efêmeros do Serena |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Para, faz backup, atualiza, reinicia e verifica a saúde do AgentMemory |
| `skill` | `—` | Inspeciona e audita as skills instaladas |
| `skill audit` | `--json, --output <format>` | Verifica a similaridade das descrições de frontmatter entre as skills instaladas |
| `skill lint` | `--skill <id>, --json, --output <format>` | Detecta problemas de autoria por skill (frontmatter, estrutura, referências quebradas) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Mede o ganho de utilidade por skill (tratamento vs. linha de base em tarefas reservadas) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Otimiza o SKILL.md de uma skill para maximizar o ganho de utilidade medido em tarefas reservadas |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Propõe e pontua alterações no procedimento de evolução em skills de validação reservadas |
| `skill procedure` | `--export, --json, --output <format>` | Mostra o procedimento de evolução (prompts do otimizador e do maintainer, constituição) e seus hashes |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Agrega as execuções de otimização registradas por resultado, modo de memória e procedimento |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | Narra as promoções e os rollbacks de SKILL.md registrados para uma skill, ou para todas as skills e o procedimento com `--all` |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Restaura o corpo do SKILL.md substituído pela promoção registrada mais recente |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Registra um job de agente agendado |
| `schedule list` | `--json, --output <format>` | Lista os jobs agendados com o estado de drift do sistema (synced/missing-in-os/orphan-in-os), agrupados por projeto |
| `schedule delete` | `—` | Remove um job agendado do manifesto e do agendador do sistema |
| `schedule run` | `—` | Executa um job agendado pelo identificador (chamado pelo agendador do sistema; normalmente não é executado diretamente) |
| `schedule sync` | `--prune` | Ressincroniza o manifesto → agendador do sistema. Use --prune para remover os jobs órfãos do sistema. |
