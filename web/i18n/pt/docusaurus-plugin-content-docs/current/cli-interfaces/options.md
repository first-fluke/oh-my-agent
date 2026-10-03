---
title: "Opções CLI"
description: "Referência exaostiva de todas os opções CLI, com indicadores globais, controle de saída, opções por comando e exemplos concrets."
---

# Opções CLI

## Opções globais

Estes opções são disponíveis em a comando raiz `oma` / `oh-my-agent` :

| Opção | Descrição |
|:-----|:-----------|
| `-g, --global` | Agit em a instalação HOME (`~/.agents/`) em vez de `<cwd>/.agents/` |
| `-y, --yes` | Ignora os prompts quando a comando selecionada prenderização em carga a confirmação ; os controles de segurança próprios a a comando permanecem aplicados |
| `-V, --version` | Exibe o número da versão depois sai |
| `-h, --help` | Exibe o ajuda de a comando |

Toutes os sob-comandos prennent aosse em carga `-h, --help` para exiber seu ajuda específica.

`--global` defimão a raiz de instalação para tout o processo : `install`, `update`, `link` e `uninstall` resolvem portanto todos para `~/.agents/`, quel que seja o diretório a partir de lequel vous os execute. `OMA_HOME=<abs-path>` a substitui — veja [Instalação global](../guide/global-install.md).

---

## Opções de saída {#output-options}

De números comandos prennent em carga uma saída lisible por machinão para os pipelines CI/CD e a automação. Il existe trois manières de perguntar uma saída JSON, em a ordem de prioridade suivant :

### 1. Indicador --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

L'indicador `--json` é disponível somente em os caminhos individoais que o annoncent. Ne dédoisez pas sa prise em carga a partir de uma família de comandos : por exemplo, os folhas `image`, `video` e `slide` expõent `--output` quando o registro o lista, enquanto `search` possède son próprio fluxo JSON. A matriz do registro a a fim de esta page é a lista de referência para cada caminho.

### 2. Indicador --output

```bash
oma stats get --output json
oma doctor --output text
```

L'indicador `--output` aceita `text` ou `json`. Il offre a mesmo função que `--json` tout em permitetant de perguntar explaquitamente uma saída texto (utile quando a variable de ambiente vaot json mas que uma comando especifica deve prodoire do texto).

**Validação :** se um formato inválido é fourni, o CLI lança : `Invalid output format: {value}. Expected one of text, json`.

### 3. Variável de ambiente OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Defima esta variable de ambiente a `json` para forcer uma saída JSON em todas os comandos que a prennent em carga. Seule a valor `json` é reconhecidoe ; qualquer outro valor é ignorada e a saída texto é utilisée.

**Ordre de resolução :** indicador `--json` > indicador `--output` > variable de ambiente `OH_MY_AG_OUTPUT_FORMAT` > `text` (valor por padrão).

### Comandos que suportam saída JSON

| Comando | `--json` | `--output` | Notas |
|:--------|:---------|:----------|:------|
| `doctor` | Sim | Sim | Inclui os controles CLI, o estado MCP e o estado dos skills |
| `stats` | Sim | Sim | Objetoo completo dos métricas |
| `retro` | Sim | Sim | Instantané com métricas, autores e tipos de commit |
| `cleanup` | Sim | Sim | Lista dos itens limpos |
| `auth status` | Sim | Sim | Estado de autenticação por CLI |
| `memory init` | Sim | Sim | Resultado de o inicialização |
| `verify agent` / `verify triggers` | Sim | Sim | Resultados de verificação para cada verificação |
| `visualize` | Sim | Sim | Graphe de dependências ao formato JSON |
| `describe` | Sempre JSON | N/A | Produz sempre do JSON (comando de introspecção) |
| `recap` | Sim | Sim | Histórico dos conversas por ferramenta/sessão |
| `image generate` / `image doctor` / `image vendor list` | N/A | Sim | Use `--output json` ; `vendor list` é o caminho canônico de descoberta |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Sim | Use `--output json` para o envelope de execução ou o relatório de disponibilidade |
| `explain validate` | Sim | Sim | Relatório de validação de o artefato |
| `diagram resolve` / `diagram update` | Sim | Sim | Resolução do engine ou resultado do cache gerenciado |
| `market resolve` / `market update` | Sim | Sim | Estado do engine de pesquisa gerenciado |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Sim | N/A | Cada caminho docs tem suas próprias opções de relatório |
| `search ...` | Sempre JSON | N/A | Toutes os sob-comandos `search` escrevem do JSON ; use `--pretty` para uma leitura humana |

---

## Opções por comando

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

O instalador interativo escreve os parâmetros de fornecedor selecionados em `.agents/oma-config.yaml`. Os indicadores de fornecedor selecionam os integrações de pesquisa na web, de inteligência de código e de memória semântica ; `--honcho-url` e `--honcho-workspace` configuram o serviço de memória Honcho quando ce fornecedor é selecionado. L'indicador raiz `-y, --yes` s'applique quando um fluxo de instalação pergunta uma confirmação.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--json` | Emite do JSON em vez de um texto mis em forme. | `false` |
| `--output <format>` | Formato de saída explícito (`text` ou `json`). Consulte [Opções de saída](#output-options). | `text` |
| `--profile` | Exibe a matriz de saúde do perfil (slug de modelo resolvido, CLI e estado de autenticação por agent a partir de o `model_preset` ativo e os sobrescritas `agents:`). Consulte [Modèles por agent](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Substitui os arquivos de configuração personalizados dorante a atualização. Abrange `oma-config.yaml`, `mcp.json` e os diretórios `stack/`. Sem esta opção, estes arquivos são salvos antes a atualização depois restaorados. | `false` |
| `--with-new-skills` | | Instala os skills adicionadas ao registro a partir de a instalação atual. | `false` |
| `--ci` | | Executa em mode CI non interativo. Ignora todas os confirmaçãos e usa uma saída console simples ao lieu dos spinners e animations. Obrigatório para os pipelines CI/CD sem stdin. | `false` |
| `--yes` | `-y` | Ignora os prompts. Ne cria pas os diretórios de fornecedores ausentes exceto com `--all` ou `--vendor`. | `false` |
| `--all` | | Cria ou met a jour todos os fornecedores pris em carga ao nível do projeto. | `false` |
| `--vendor <vendors>` | | Cria ou met a jour uma lista de fornecedores separados por dos vírgulas, por exemplo `claude,qwen`. | Diretórios de fornecedores existentes |

`oma update mcp` usa os mesmos controles `--yes`, `--ci`, `--all` e `--vendor` para escolher os servidors MCP do navegador. Il não usa ni `--force` ni `--with-new-skills`.

**Comportement com --force :**
- `oma-config.yaml` é remplacé por a valor por padrão do registro.
- `mcp.json` é remplacé por a valor por padrão do registro.
- O diretório backend `stack/` (recursos próprios ao linguagem) é remplacé.
- Todos os outros arquivos são sempre atualizados, quela que seja esta opção.

**Comportement com --ci :**
- Nenhum `console.clear()` ao inicialização.
- `@clack/prompts` é remplacé por `console.log` simples.
- Os prompts de detecção dos concurrents são ignoradas.
- Os erros são levées ao lieu de appeler `process.exit(1)`.

**Portaée dos fornecedores :**
- `oma update` não met a jour que os diretórios de fornecedores já presentes.
- `oma update --yes` usa a mesmo abrangência sem prompts.
- `oma update --all` cria ou met a jour todos os fornecedores pris em carga ao nível do projeto.
- `oma update --vendor claude,qwen` cria ou met a jour somente os fornecedores listés.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--json` | Emite o resultado de a réinicialização ao formato JSON. | `false` |
| `--output <format>` | Emite `text` ou `json`. | `text` |

`oma stats reset` é a comando de réinicialização. A forma antiga `oma stats get --reset` não fait pas parte de a sobreface pública atual.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--interactive` | Mode interativo com entrada manual. Solaquita um contexto supplémentaire impossible a recueillir a partir de git (por exemplo o humeur ou dos eventos notables). | `false` |
| `--compare` | Compara a período atual com a período précédente de mesmo doração. Exibe os écarts (por exemplo commits +12, linhas adicionadas -340). | `false` |

**Formato de o argumento window :**
- `7d` : 7 dias
- `2w` : 2 semanas
- `1m` : 1 meses
- Omitir para a valor por padrão (7 dias)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Mode pré-visualização. Lista todos os éléments que seraient nettoyés sem modificar os arquivos. O código de saída vaot 0 quelas que sejam os constatations. | `false` |
| `--yes` | `-y` | Ignora todas os prompts de confirmação. Nettoie tout sem perguntar. Utile em os scripts e a CI. | `false` |

**Este que é nettoyé :**
1. Arquivos PID órfãos : `/tmp/subagent-*.pid` quando o processo referenciado não tournão plus.
2. Arquivos logs órfãos : `/tmp/subagent-*.log` correspondente a dos PID morts.
3. Diretórios Gemini Antigravity : `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Ils accumulent o estado ao fil do temps e podem devenir volumineux.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Lie uma nova tentativa a o identificador de execução que a précède. | |
| `--fallback-vendors` | — | Chaînão explícito e ordenada de fornecedores de fallback, separados por dos vírgulas. | |
| `--task-id` | — | Identificador de tarefa issu do plan de sessão. | Identificador de o agente |
| `--vendor` | — | Surcarga do fornecedor CLI. A execução aceita `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` ou `pi`. | Resolvido a partir de a configuração |
| `--workspace` | `-w` | Diretório de trabalho de o agente. Se omis ou défimi a `.`, o CLI detecta automaticamente o espaço de trabalho a partir de os arquivos de configuração do monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Détecté automaticamente ou `.` |
| `--isolation` | — | Mode de isolamento : `worktree` cria um worktree git por execução ; a valor por padrão é `none`. | `none` |
| `--read-only` | — | Limite o agente executado aos ferramentas non dostructifs e remove os indicadores de autoaprovação. | `false` |

**Validação :**
- `agent-id` deve être o um de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` não deve pas contenir `..`, `?`, `#`, `%` ni de caractères de controle.
- `vendor` deve être o um de : `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Comportement próprio a cada fornecedor :**

| Fornecedor | Comando | Indicador de autoaprovação | Indicador de prompt |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claode | `claude` | (nenhum) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (nenhum ; o prompt é positionnel) |
| cursor | `cursor-agent` | próprio ao fornecedor | `-p` |
| opencódigo | `opencode` | próprio ao fornecedor | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | próprio ao fornecedor | `-p` |
| pi | `pi` | supprimé em mode `--read-only` | o prompt é positionnel |

Estes valores por padrão podem être remplacées em `.agents/skills/oma-orchestration/config/cli-config.yaml`.

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Caminho raiz para localizar os arquivos memória (`.agents/state/memories/result-{agent}.md`) e os arquivos PID. | Diretório de trabalho atual |

**Logique de détermination de o estado :**
1. Se `.agents/state/memories/result-{agent}.md` existe, lit o em-tête `## Status:`. En o absence de em-tête, exibe `completed`.
2. Se o arquivo PID existe a `/tmp/subagent-{session-id}-{agent}.pid`, verifica se o PID é ativo. Exibe `running` se ele é ativo, `crashed` se ele é paradaé.
3. Se nenhum dos dois arquivos não existe, exibe `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | Surcarga do fornecedor CLI aplicadoe a todos os agents executados. | Resolvido para cada agent a partir de a configuração |
| `--inline` | `-i` | Interprète os argumentos de tarefa como dos cadeias `agent:task[:workspace]` plutôt que um caminho de arquivo. | `false` |
| `--no-wait` | | Mode em segundo plano. Inicia todos os agents depois retorna immédiatement sem attendre a fim. Os PID e logs são registrados em `.agents/results/parallel-{timestamp}/`. | `false` (attend a fim) |

**Formato das tarefas inline :** `agent:task` ou `agent:task:workspace`
- O workspace é detectado em vérifiant se o último segment separado por dois-points comonce por `./`, `/` ou vaot `.`.
- Exemplo : `backend:Implement auth API:./api` — agent=backend, task="Implement auth API", workspace=./api.
- Exemplo : `frontend:Build login page` — agent=frontend, task="Build login page", workspace=aoto-detected.

**Formato do arquivo YAML de tarefas :**
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
| `--window <period>` | Período : `1d`, `3d`, `7d`, `2w`, `30d`. Ignorada quando `--date` é défimi. | `1d` |
| `--date <date>` | Date especifica (`YYYY-MM-DD`). Prioritaire em `--window`. | |
| `--tool <tools>` | Filtre os sessões por ferramenta. Lista separada por dos vírgulas : `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | todos os ferramentas |
| `--top <n>` | Exibe somente os N primeiros projetos/temas do résumé. | sem limite |
| `--sort <metric>` | Trie os sessões por `count` ou `duration`. | `count` |
| `--mermaid` | Exibe um diagrama de Gantt Mermaid ao lieu do résumé por padrão. | `false` |
| `--graph` | Ouvre um grafo interativo em o navegador. Mutuelament exclusif com `--mermaid`. | `false` |

> **Note :** a geração de arquivos de regras fornecedor (por exemplo `.cursor/rules`) a partir de os skills instalados é gerenciada por [`oma link <vendor>`](./commands.md#link), e non por uma comando `export` distincte.

### search

```
oma search <subcommand> [...]
```

O grupo `search` fornece sa próprio saída JSON (sem indicadores `--json` / `--output`). Use `--pretty` em os sob-comandos URL/consulta para mettre os resultados em forme e reportez-vous aos opções próprios aos sob-comandos ci-dossob :

| Sob-comando | Opções importantes |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (por padrão `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (por padrão `en`), `--format <spec>`, `--timeout` (por padrão `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (por padrão `github`), `--language`, `--repo`, `--limit` (por padrão `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | nenhum (executa os controles binaires de Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Códigos de saída :** `0` OK, `1` erro, `2` bloqueado, `3` não encontrado, `4` entrada inválido, `5` autenticação obrigatórioe, `6` tempo limite excedido. Use-os em os scripts para distinguer os blocages transitórias dos entradas inválidos.

### image

```
oma image <subcommand> [...]
```

O formato de saída é controlado por cada sob-comando via `--output <text|json>`.

`image generate` aceita :

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` resolve a configuração `image:` ativa e a autenticação disponível. | `auto` |
| `--size <size>` | | `WxH` com dois bords divisibles por 16, de 16 a 3840, relatório de aspect 1:3–3:1, ou `auto`. | valor por padrão do fornecedor |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | valor por padrão do fornecedor |
| `--count <n>` | `-n` | Nombre de imagens, 1..5. | `1` |
| `--output-dir <dir>` | | Diretório de saída. Doit se trouver em `$PWD` exceto se `--allow-external-output` é défimi. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Autoriza os caminhos `--output-dir` fora de `$PWD`. | `false` |
| `--model <name>` | | Surcarga de modelo próprio ao fornecedor. O modelo antigravity é selecionado por `agy`. | valor por padrão do fornecedor |
| `--timeout <duration>` | | Délai por image sob forme de doração. | valor por padrão do fornecedor |
| `--reference <path>` | `-r` | Image de referência para o transfert de style/tema. Répétable (`-r a.png -r b.png`) ou separada por dos vírgulas. Validée conforme a tamanho (≤5 Mo), o formato (PNG/JPEG/GIF/WebP via bytes magiques) e a quantidade (≤10). Prise em carga por `codex` e `antigravity` ; recusada com o código de saída 4 por `pollinations`. | |
| `--yes` | `-y` | Ignora o prompt de confirmação do custo. | `false` |
| `--no-prompt-in-manifest` | | Armazena o SHA256 do prompt ao lieu do texto brut em `manifest.json`. | `false` |
| `--dry-run` | | Exibe o plan e o estimation do custo ; não executa rien. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` e `image vendor list` aceitant `--output <text|json>`. `image list-vendors` permanece um alias de ajuda ; `vendor list` é o caminho canônico de descoberta.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` aceita os controles de planejamento e de capture `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` e `--capture-stop`. Il aceita aosse `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` e `--no-brief-in-manifest`. A capture navegador usa `--source web --url <url>` ; `file` é a origem por padrão. Um renderização normal néestessite uma composition escrevee e um compositor função ; os substituiçãos são limitados ao caminho de test `OMA_VIDEO_MOCK=1`.

`video doctor` informa ou installe a cadeia de ferramentas Remotion/MPT/Strudel. `compose` prepara o contrato de composition de a execução e `render` verifica os types, produz o renderização e verifica a saída. `provider list` informa o estado do fornecedor e de a chave. Consulte [Geração vidéo](../guide/video-generation.md) para o manifesto de execução e a sequência de recuperação.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--force` | Substitui os arquivos de esquema vidos ou existentes em `.agents/state/memories/`. Sem esta opção, os arquivos existentes não são pas touchés. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Opção | Curto | Descrição | Valor padrão |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Caminho para o diretório workspace a verificar. | Diretório de trabalho atual |

**Tipos de agentes :** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` mesmo a específicosion do detectaor de palavras-chave em um corpus annoté. Os seuils em porcentagem são dos proteções ; use a saída JSON quando uma tarefa CI deve examiner os resultados individoais. A forma antiga `oma verify <agent-type>` é uma ajuda de compatibilité ; `verify agent` é o caminho registrado.

---

## Exemplos pratiques

### Pipelinão CI : atualização e verificação

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Collecte aotomatisée dos métricas

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Exécution batch de agentes com sobreveillance de o estado

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Nettoyage em CI depois os tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Vérification conforme o workspace

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro com comparaison para os revisãos de sprint

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Script complet de controle de saúde

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

### Describe para o introspecção dos agents

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

## Registro público complet dos opções

A matriz a seguir é gerada a partir do registro público de comandos mantido no repositório. Ela é o índice de cobertura desta página: uma linha com `—` não tem opções específicas do comando, enquanto as opções raiz compartilhadas e os aliases de ajuda estão descritos acima. Execute `oma describe "<path>"` para consultar a ajuda em tempo de execução quando a gramática de um valor mudar.

| Caminho de comando | Opções publiques | Função |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Instala os skills e configurações oh-my-agent |
| `describe` | `—` | Descreve os comandos da CLI em JSON para introspecção em tempo de execução |
| `uninstall` | `--dry-run, -y, --yes` | Remove os arquivos appartenant a oh-my-agent (preserva oma-config.yaml, mcp.json e os skills escritos por o usuário) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Atualiza os skills para a mas recente versão do registro |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Sélectionnão os servidors MCP do navegador (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Regenera os arquivos dos fornecedores (.claode/, .cursor/, etc.) a partir de a SSOT .agents/ |
| `intel` | `—` | Pipelinão de intelligence produz : pesquisa, lacumas, PRD, proposition de issue |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Propõe um trabalho produz a forte valor a partir de o intelligence do marché e do código |
| `market` | `—` | Procura de marché fundoée em os sinais comunitários via o engine sempre a jour last30days |
| `market detect-trap` | `--force` | Verifica de prévol que refuse os consultas piégées por os palavras-chave |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Sinaliza o engine last30days qu'oma executara (versão gerenciada, épinglée ou copie local) e o Python utilisé |
| `market update` | `--json, --output <format>` | Baixa a mas recente versão last30days em o cache gerenciado do OMA (~/.cache/oma-market/last30days) |
| `market run` | `—` | Executa o engine last30days (scripts/last30days.py) com os argumentos fournis ; --save-dir usa por padrão market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Verifica os instalações CLI, os configurações MCP e o estado dos skills |
| `profile` | `—` | Gerencia os perfis de execução OMA locais |
| `profile list` | `--json, --output <format>` | Lista os perfis locais |
| `profile show` | `--json, --output <format>` | Exibe um perfil local |
| `profile create` | `--json, --output <format>` | Cria um perfil local |
| `profile use` | `--shell <shell>, --json, --output <format>` | Exibe o código shell que ativa um perfil existente |
| `profile run` | `—` | Executa uma comando com OMA_PROFILE défimi para o processo enfant |
| `retro` | `--interactive, --compare, --json, --output <format>` | Retrospectiva de engenharia com métricas e tendências |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Récapitule o histórico dos conversas dos ferramentas IA |
| `docs` | `—` | Détection de a drift documentaire : verifica os referências e propose dos alterações a jour para os documents touchés por um diff |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Extrai os referências L2 dos documents e informa os destinos quebradas. Regenera docs/generated/doc-refs.json como effet secondaire. Code de saída : 0 = próprio, 1 = referências quebradas. A verificação dos URL é delegadoe a `lychee` (installation : brew install lychee). |
| `docs sync` | `--json` | À partir de um diff git, lista os documents que référencent os arquivos modificados. O LLM hôte (runtime de skill) lit esta lista e o diff, depois propose dos correções conforme o contrato SKILL.md — o CLI não modifica nunca automaticamente os documents. Plage por padrão : --cached (alterações indexées), fallback para HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Detecta a drift entre os fontes inglêses (web/docs) e os traduçãos i18n (web/i18n/{lang}/...). Emite dos sinais estruturals (número de linhas, titres, horodatage do último commit) para cada paire afim que o LLM hôte décide quelas traduçãos synchroniser. O CLI não modifica nunca os traduçãos. |
| `docs lint` | `--json, --locales <list>` | Verifica os anti-patterns de contém em os documents traduzidos (tirets cadratins em os destinos CJK, etc.). Complète `oma docs i18n` (drift estruturalle) por dos controles de style próprios a oma-translation ` Stage 4. O CLI não corrige nunca automaticamente : il não fait que informar os problemas a reestruturar ao LLM hôte. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Emite dos artefatos conformes aos standards a partir de a SSOT .agents/ (spécification Agent Skills, paquet Agent Plugins, marketplace de plugins Claode Code, AGENTS.md, documents fornecedores limitados a cli/) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Nettoie os processo de agentes secondaires e arquivos temporaires órfãos |
| `bridge` | `--context <name>` | Fait transiter MCP stdio para um servidor Serena compartilhado por projeto (démarré a a pergunta) |
| `verify` | `—` | Verifica a saída de um agent secondaire (backend/frontend/mobile/qa/debug/pm) ou mesmo a específicosion dos gatilhos do detectaor de palavras-chave |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Mede a específicosion dos gatilhos do detectaor de palavras-chave em um corpus de prompts annoté |
| `vault` | `—` | Gerencia chaves de API e segredos em o trousseao do sistema (Trousseao macOS / Secret Service Linux / Gestionnaire de identificadores Windows) |
| `vault store` | `--value <value>` | Armazena um secret sob <name> (prompt de mot de passa interativo) |
| `vault get` | `—` | Exibe a valor stockée em stdout (para : export KEY=$(oma vaolt get <name>)) |
| `vault list` | `--json` | Lista os nomes dos secrets stockés (os valores não são nunca exibidos) |
| `vault delete` | `—` | Remove um secret do trousseao e de o índice |
| `star` | `—` | Adaçãoa uma estrela a oh-my-agent em GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualiza a estrutura do projeto como um grafo de dependências |
| `search` | `—` | Primitives de pesquisa mécaniques : fetch, meta, rss, media, trust, código |
| `search providers` | `--json, --pretty` | Lista os fornecedores de pesquisa registrados e inspeciona a seleção sem accès rede |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Procura com o fornecedor web selecionado (Brave possède um adaptateur CLI) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Obtém uma URL via o pipeline a escalade automático |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Extrai OGP / JSON-LD / Schema.org a partir de uma URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Extrai os métadados multimédias via yt-dlp (1858 sites) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Obtém via AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Resolve o nível ou score de confiança de um domainão |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Procura do código via gh / glab |
| `search doctor` | `—` | Verifica os dependências (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Obtém via o gerenciador de API de plataforma correspondente (fase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Diffuse uma pesquisa por palavras-chave para os plataformas compatibles |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Découvre e analyse um fluxo RSS/Atom para uma URL |
| `search rss google` | `--locale <value>` | Construit uma URL RSS Google News para uma consulta |
| `harness` | `—` | Avalia os sobrecouches do harness OMA em dos tarefas de repositório isolées |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Compara uma candidate .agents com a base atual |
| `slide` | `—` | Boîte a ferramentas de apresentaçãos HTML : criar, válidor, exporter e modificar dos conjuntox de slidos 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Portae de qualidade géométrique : renderização os slidos via puppeteer-core e controle débordements, chevaochements e tamanho dos poliestes |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Fusionnão os arquivos por diapositive em um livrable .html autônomo |
| `slide edit` | `--workspace <path>, --port <n>` | Ouvre o editor bbox em o navegador (servidor node:http em 127.0.0.1, delegação ao runner de agentes oma) |
| `slide doctor` | `—` | Sonda os dependências obrigatórioes (chrome, puppeteer-core) e opcionais (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Cria um novo diretório de trabalho de slidos com HTML, recursos/ e meta.json de départ |
| `slide preview` | `--workspace <path>` | Construit viewer.html (composant web deck-stage e panneao de notes orateur, bascule com `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Exporta os slidos em PDF via puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Exporta cada diapositive em image PNG via puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPÉRIMENTAL] Exporta em PPTX via pptxgenjs (fundo rasterisé, gradientes rasterisés) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Importa um arquivo .pptx em fragments de slidos via officeparser (bunx, ao mieux) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Baixa uma vidéo via yt-dlp em ./assets/ e exibe a referência local |
| `slide style` | `—` | Percorre e recupera dos préréglages de style visuel |
| `slide style list` | `—` | Lista os préréglages de style disponíveis (index vendo + bold-template) |
| `slide style preview` | `—` | Visualiza um préréglage de style em o terminal |
| `slide style get` | `--refresh` | Obtém um design.md de modelo bold (main sempre a jour ; cache utilisé fora linha) |
| `scholar` | `—` | Sidecars de articles Knows.academy (fallbacks OpenAlex e Semantic Scholar) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Procura dos articles (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Trouve a meilseue correspondência de article em knows.academy, OpenAlex e Semantic Scholar |
| `scholar get` | `--section <name>` | Obtém um sidecar (record_id Knows) ou dos métadados de trabalho (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Valida um sidecar .knows.yaml ou .knows.json (v0.9.0) |
| `image` | `—` | Geração de imagens IA com vários fornecedores e delegação parallèle tenant compte de a autenticação |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Gera dos imagens via pollinations (fluxo/zimage, gratuito), codex (gpt-image-2, OAuth ChatGPT) ou antigravity (gemini nano-banana via o CLI `agy`, gratuito com connexion Gemini Code Assist) |
| `image doctor` | `--output <format>` | Verifica a autenticação e o estado de instalação por fornecedor |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Lista os fornecedores registrados e os modelos pris em carga |
| `video` | `—` | Geração de vidéos curtas, explicatives e de démonstration |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Gera um diretório de execução vidéo a partir de um brief |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Verifica a disponibilidade do fornecedor vidéo e do compositor |
| `video compose` | `--output <format>, --refresh, --offline` | Cria o projeto Remotion de a execução em a mas recente cadeia de ferramentas + remotion-dev/skills e exibe o contrato de escrita |
| `video render` | `--output <format>` | Produz a novo o renderização de um diretório de execução a partir de renderizaçãoer-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Lista os fornecedores vidéo e seu disponibilidade |
| `serena` | `—` | Utilitaires do cycle de vie do servidor de linguagem MCP Serena |
| `serena reap` | `--dry-run, --quiet` | Para os processos filhos LSP Serena inativos para recuperar de a memória (Serena se se recupera ao prochain chamada de ferramenta) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Instala a tarefa agendada périodique do reaper Serena (todas os 5 minutos) |
| `serena reaper disable` | `--dry-run` | Desinstala a tarefa agendada périodique do reaper Serena |
| `explain` | `—` | Gerenciamento e validação qualidade dos artefatos de explicação |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Valida os artefatos HTML autônomos de relatórios explain |
| `diagram` | `—` | Assistants de engine de diagramas (HTML interativo archify ou fallback Mermaid) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Sinaliza o engine de diagramas a usar por os workflows e o local de archify |
| `diagram update` | `--json, --output <format>` | Baixa a mas recente versão archify em o cache gerenciado do OMA (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Inicia o CLI archify instalado (doctor \| guia \| validate \| deliver \| visual-check …) com os controles de atualização desabilitados |
| `help` | `—` | Exibe as informações de ajuda |
| `version` | `—` | Exibe o número da versão |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Inicia o tabela de bord terminal (sobreveillance de agentes em temps réel) |
| `dashboard web` | `—` | Inicia o dashboard web em http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Verifica o estado de autenticação de todos os CLI pris em carga |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Distribue um evento de hook fornecedor via o roteador oma centralizado (design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Sonda a compatibilité L1 dos hooks por fornecedor e exibe uma matriz (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Adaçãoa um evento de workflow OMA L1 |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migre os sessões históricos para o perfil HOME e remove os originãox verificados |
| `state get` | `--json, --output <format>` | Inspecte uma sessão OMA L1 por identificador |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte o estado de workflow OMA L1 |
| `state repair` | `--dry-run, --json, --output <format>` | Repara os arquivos de estado de workflow OMA L1 |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Verifica os eventos L1 obrigatório para um point de controle de workflow |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Lista os points de controle L1 decision.made obrigatório |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Lista ou exibe os logs de aodit de injection por frontière (D52) |
| `state inject-log get` | `--json, --output <format>` | Lista ou exibe os logs de aodit de injection por frontière (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Exporta um résumé de sessão para o magasin de coordination |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Verifica se o autorreparo é autorisée para um agent |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte o estado de workflow OMA L1 |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte o estado de workflow OMA L1 |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspecte o estado de workflow OMA L1 |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Verifica os artefatos EXEC de ralph (proteção anti-contornament, étape 1.3 de ralph.md) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Associa um contrato de objetoivo (proteção de parada determinístico / budget em temps réel) a um workflow persistant ativo |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Exibe as métricas de prodotividade |
| `stats reset` | `--json, --output <format>` | Exibe as métricas de prodotividade |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Carrega o contexto selecionado por grafo para um prompt de delegação nativo |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Retoma os tarefas incompletas seguras em réutilisant os éléments de acceptation atuais |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Inicia uma execução nativo de agente appuyée por dos éléments de evidência |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Executa os argv de verificação depois -- e enregistre seu código de saída réel |
| `agent finish` | `--project-root <path>` | Valida um resultado de agente nativo com ses recebidos de verificação |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Inicia um agent secondaire (o prompt pode être um texto inline ou um caminho de arquivo) |
| `agent status` | `--project-root <path>` | Verifica o estado dos agents secondaires |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Executa vários agentes secundários em paralelo |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Effectue uma revisão de código com um CLI externão (codex/claode/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Compara o registro dos modelos aos listas de modelos dos fornecedores |
| `model probe` | `--json, --timeout <duration>` | Sonda um slug de modelo aoprès de son CLI fornecedor para verificar son acceptation |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Executa model:check --probe em interno e produz um patch `models:` para oma-config com os candidatos acceptés |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Configure a connexion Honcho ou os identificadores locais de embeddding |
| `memory init` | `--force, --json, --output <format>` | Inicializa o magasin de coordination em .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Pse recupera a configuração de um endpoint AgentMemory |
| `memory daemon` | `—` | Gerencia um processo daemon AgentMemory appartenant a OMA |
| `memory daemon status` | `--json, --output <format>` | Exibe o estado do daemon |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Inicia AgentMemory em segundo plano |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Para o daemon AgentMemory gerenciado por OMA |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Reinicia o daemon AgentMemory |
| `memory service` | `—` | Gerencia o intégration de AgentMemory como serviço do sistema de exploitation |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Instala o intégration do serviço laonchd/systemd de AgentMemory |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Desinstala o intégration do serviço laonchd/systemd de AgentMemory |
| `memory status` | `--json, --output <format>` | Exibe o estado de saúde do fornecedor de memória semântica selecionado |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Drena os nouvelas tentativas de observation AgentMemory em file |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Importa o histórico de conversas de um fornecedor em AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient o armazenamento local AgentMemory : salvaguarda, limpeza, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient o armazenamento local AgentMemory : salvaguarda, limpeza, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient o armazenamento local AgentMemory : salvaguarda, limpeza, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Entretient o armazenamento local AgentMemory : salvaguarda, limpeza, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Collecte os déchets de a memória local do projeto : limpeza os anciennes sessões L1 e arquivos Serena éphémères |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Para, salvaguarda, met a nível, reinicia e controle a saúde de AgentMemory |
| `skill` | `—` | Inspecte e aodite os skills instalados |
| `skill audit` | `--json, --output <format>` | Verifica a similarité dos descrições de frontmatter entre skills instalados |
| `skill lint` | `--skill <id>, --json, --output <format>` | Detecta os padrãos de escrita por skill (frontmatter, estrutura, referências quebradas) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --require-coverage, --neg-transfer, --json, --output <format>` | Mede o gain de utilidade por skill (traitement contra referência em dos tarefas mantidos) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --json, --output <format>` | Otimiza o SKILL.md de uma skill para maximiser o gain de utilidade medição em os tarefas mantidos |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Registra um job de agente agendado |
| `schedule list` | `--json, --output <format>` | Lista os tarefas agendadas com o estado de drift do sistema (synced/missing-in-os/orphan-in-os), regroupées por projeto |
| `schedule delete` | `—` | Remove um job agendado do manifesto e do agendador do sistema |
| `schedule run` | `—` | Executa um job agendado pelo identificador (chamada por o agendador do sistema ; normalmente non executadoe diretamente) |
| `schedule sync` | `--prune` | Ressincroniza o manifesto → agendador do sistema. Use --prunão para remover os tarefas sistema órfãoes. |
