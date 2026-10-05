---
title: "Comandos CLI"
description: "Referência completa de cada comando da CLI do oh-my-agent, com sintaxe, opções e exemplos organizados por categoria."
---

# Comandos CLI

Após uma instalação global (`bun install --global oh-my-agent`), use `oma` ou `oh-my-agent`. Para uma execução pontual sem instalação, execute `npx oh-my-agent`.

A variável de ambiente `OH_MY_AG_OUTPUT_FORMAT` pode ser definida como `json` para forçar uma saída legível por máquina nos comandos que a suportam. Isso equivale a passar `--json` a cada comando relevante.

## Comece por uma tarefa

Escolha o menor comando que responde a sua pergunta. Cada comando abaixo exibe um caminho ou relatório que você pode examinar antes de passar à etapa seguinte.

| Tarefa | Comece aqui | Resultado esperado |
|:-----|:-----------|:----------------|
| Instalar ou reparar um projeto | `oma install` e depois `oma doctor` | Recursos instalados e relatório de estado; use `oma doctor --profile` se o problema envolver a resolução do modelo. |
| Encontrar um comando ou opção a partir de um agente | `oma describe` ou `oma describe "image generate"` | JSON que descreve os argumentos, opções e comandos aninhados. |
| Gerar uma imagem | `oma image generate "<prompt>" --output json` | Caminhos das imagens e manifesto em `.agents/results/images/`. |
| Preparar ou produzir um vídeo | `oma video generate "<brief>" --dry-run` | Diretório de execução que contém os artefatos de planejamento; componha e renderize somente depois de escrever a composição. |
| Criar um explicador de código interativo | `/explain` | Artefato HTML autônomo validado em `.agents/results/explain/`. |
| Resolver um motor de diagramas | `oma diagram resolve --output json` | Motor Mermaid ou archify selecionado e justificativa. |
| Pesquisar sinais da comunidade | `oma market detect-trap "<topic>"` | Resultado da pré-verificação; prossiga com `oma market resolve --output json` e a execução posterior somente se o controle for aprovado. |
| Converter ou inspecionar um artigo | `oma scholar search "<query>"` | Resultados de pesquisa do Knows, OpenAlex ou Semantic Scholar; recupere um sidecar com `oma scholar get`. |
| Criar uma apresentação | `oma slide create --output-dir <dir>` | Diretório de trabalho que pode ser escrito, validado, agrupado e exportado. |
| Examinar o drift documental | `oma docs verify --json` | Relatório estruturado de referências quebradas e índice de referências regenerado. |

O registro mantido no repositório é a fonte deste mapa de comandos. Os nomes canônicos de descoberta abaixo vêm de `oma describe`; a ajuda interativa pode exibir aliases de compatibilidade como `slide new`, `slide viewer`, `image list-vendors` ou `video list-providers`.

## Superfície atual dos comandos

Este mapa facilita a navegação pelas referências detalhadas abaixo e a descoberta de famílias menos comuns. Use `--help` de cada família ou `oma describe <path>` para conhecer a gramática exata dos argumentos; [Opções CLI](./options.md) contém a matriz completa de opções do registro.

| Família | Caminhos registrados |
|:-------|:-----------------|
| `install` | `install` |
| `describe` | `describe` |
| `uninstall` | `uninstall` |
| `update` | `update`, `update mcp` |
| `link` | `link` |
| `intel` | `intel`, `intel suggest` |
| `market` | `market`, `market detect-trap`, `market resolve`, `market update`, `market run` |
| `doctor` | `doctor` |
| `profile` | `profile`, `profile list`, `profile show`, `profile create`, `profile use`, `profile run` |
| `retro` | `retro` |
| `recap` | `recap` |
| `docs` | `docs`, `docs verify`, `docs sync`, `docs i18n`, `docs lint` |
| `emit` | `emit` |
| `cleanup` | `cleanup` |
| `bridge` | `bridge` |
| `verify` | `verify`, `verify agent`, `verify triggers` |
| `vault` | `vault`, `vault store`, `vault get`, `vault list`, `vault delete` |
| `star` | `star` |
| `visualize` | `visualize` |
| `search` | `search`, `search providers`, `search web`, `search fetch`, `search meta`, `search media`, `search archive`, `search trust`, `search code`, `search doctor`, `search api`, `search api fetch`, `search api search`, `search rss`, `search rss fetch`, `search rss google` |
| `harness` | `harness`, `harness eval`, `harness incident`, `harness feedback`, `harness evolution enable`, `harness evolution status`, `harness evolution disable`, `harness evolution run` |
| `slide` | `slide`, `slide validate`, `slide bundle`, `slide edit`, `slide doctor`, `slide create`, `slide preview`, `slide export`, `slide export pdf`, `slide export png`, `slide export pptx`, `slide import`, `slide import pptx`, `slide asset`, `slide asset fetch-video`, `slide style`, `slide style list`, `slide style preview`, `slide style get` |
| `scholar` | `scholar`, `scholar search`, `scholar resolve`, `scholar get`, `scholar lint` |
| `image` | `image`, `image generate`, `image doctor`, `image vendor`, `image vendor list` |
| `video` | `video`, `video generate`, `video doctor`, `video compose`, `video render`, `video provider`, `video provider list` |
| `serena` | `serena`, `serena reap`, `serena reaper`, `serena reaper enable`, `serena reaper disable` |
| `explain` | `explain`, `explain validate` |
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web` |
| `auth` | `auth`, `auth status` |
| `hook` | `hook`, `hook run`, `hook probe` |
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state trajectory`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize`, `skill meta-optimize`, `skill procedure`, `skill evolution-stats`, `skill promotions`, `skill rollback` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

Quando um comando delega os argumentos restantes a outra ferramenta, o registro deixa suas opções abertas de propósito. Isso se aplica a `market run` e `diagram archify`; consulte a ajuda upstream resolvida antes de executar uma operação que modifica dados ou usa a rede.

---

## Configuração e instalação

### install

`oma` sem argumentos inicia o instalador interativo. `oma install` é a forma explícita e aceita opções para selecionar fornecedores.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

`--web-search`, `--code-intelligence` e `--semantic-memory` mantêm a escolha de fornecedor registrada quando são omitidas. `--honcho-url` e `--honcho-workspace` configuram uma nova conexão Honcho quando esse fornecedor é selecionado. A opção raiz `-y, --yes` ignora os prompts e usa os valores padrão; `--global` direciona a instalação para HOME.

**O que o comando faz:**
1. Procura um diretório antigo `.agent/` e migra-o para `.agents/` se ele existir.
2. Detecta ferramentas concorrentes e propõe removê-las.
3. Solicita o tipo de projeto (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Se o backend for selecionado, solicita a variante de linguagem (Python, Node.js, Rust, Other).
5. Pergunta se links simbólicos do GitHub Copilot são desejados.
6. Baixa o arquivo mais recente do registro.
7. Instala os recursos compartilhados, workflows, configurações e skills selecionados.
8. Instala as adaptações de fornecedor para os fornecedores selecionados (configurações locais do projeto; nenhuma escrita silenciosa no nível HOME).
9. Cria os links simbólicos da CLI.
10. Propõe uma configuração git **global** recomendada (confirmação opcional):
    - `rerere.enabled=true` — reutilização de conflitos de merge entre agentes
    - `init.defaultBranch=main` — branch padrão consistente para novos repositórios
    - Completamente ignorada com `--yes` / CI (instruções de correção manual são exibidas no lugar)
11. Propõe configurar MCP quando aplicável.
12. Pede uma estrela no GitHub se `gh` estiver autenticado.

**Exemplo:**
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor

Verificação de saúde das instalações da CLI, configurações MCP e estado das skills.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe a saída em formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--profile` | Exibe a matriz de saúde dos perfis. Ela indica o slug de modelo resolvido, a CLI e o estado de autenticação de cada agente conforme o `model_preset` ativo e as substituições de `agents:`. Consulte [Modelos por agente](../guide/per-agent-models.md). |

**Verificações realizadas:**
- Instalações da CLI: agy, claude, codex, qwen (versão e caminho).
- Estado de autenticação de cada CLI.
- Configuração MCP: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Skills instaladas: quais skills estão presentes e o estado de cada uma.
- Diretório do armazenamento de memória: existência de `.agents/state/memories/` e número de arquivos (projetos mais antigos recorrem ao caminho legado `.serena/memories/`).
- Marcadores de instalação dupla (projeto e global) e avisos associados.
- Configuração git **global** recomendada (`gitRecommended` no JSON):
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Cada divergência é contabilizada em `totalIssues`
- Arquivo de contexto do fornecedor do projeto (bloco OMA de `AGENTS.md` quando Codex, Qwen ou Claude Code ≥ 2.1.277 está instalado).
- AgentMemory, estado/saúde dos hooks, diagnósticos do reaper Serena e contadores de incidentes associados.

**Reparo automático:** se skills ausentes forem detectadas, `doctor` propõe instalá-las de forma interativa. Se a configuração git recomendada estiver ausente ou incorreta, ele propõe as mesmas correções globais opcionais de install/update.

**Exemplos:**
```bash
# Interactive text output
oma doctor

# JSON output for CI pipelines
oma doctor --json

# Pipe to jq for specific checks
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspect the profile resolution matrix
oma doctor --profile
```

### update

Atualiza as skills para a versão mais recente do registro.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `-f, --force` | Substitui os arquivos de configuração personalizados (`oma-config.yaml`, `mcp.json`, diretórios `stack/`) |
| `--with-new-skills` | Instala as skills adicionadas nesta versão; sem esta opção, apenas as skills já instaladas são atualizadas. |
| `--ci` | Executa em modo CI não interativo (ignora os prompts, saída em texto simples) |
| `-y, --yes` | Ignora os prompts. O escopo dos fornecedores permanece inalterado: somente os diretórios existentes são atualizados, exceto com `--all` ou `--vendor`. |
| `--all` | Cria ou atualiza todos os fornecedores compatíveis no nível do projeto. |
| `--vendor <vendors>` | Cria ou atualiza fornecedores específicos. Aceita uma lista separada por vírgulas, como `claude,qwen`. |

**O que o comando faz:**
1. Obtém `prompt-manifest.json` do registro para verificar a versão mais recente.
2. Compara com a versão local em `.agents/skills/_version.json`.
3. Sai se a versão já estiver atualizada.
4. Baixa e extrai o arquivo mais recente.
5. Preserva os arquivos personalizados pelo usuário (exceto com `--force`).
6. Copia os arquivos novos para `.agents/`.
7. Restaura os arquivos preservados.
8. Atualiza as adaptações dos fornecedores e os links simbólicos. Por padrão, apenas os diretórios de fornecedores já presentes no projeto são afetados.
9. Propõe a configuração git **global** recomendada (com a mesma confirmação opcional da instalação: `rerere.enabled`, `init.defaultBranch`). Ela é ignorada com `--yes` / `--ci`.

**Exemplos:**
```bash
# Standard update (preserves config)
oma update

# Force update (resets all config to defaults)
oma update --force

# CI mode (no prompts, no spinners)
oma update --ci

# CI mode with force
oma update --ci --force

# Update existing vendors without prompts
oma update --yes

# Create/update every supported project-scoped vendor
oma update --all

# Create/update only Claude and Qwen integrations
oma update --vendor claude,qwen

# Also refresh browser MCP selections
oma update mcp --ci
```

`oma update mcp` tem suas próprias opções `--yes`, `--ci`, `--all` e `--vendor <vendors>`. Ele seleciona os servidores MCP de navegador suportados (Aside, Chrome DevTools ou Firefox DevTools) para os fornecedores selecionados no nível do projeto.

### uninstall

Visualiza ou remove arquivos pertencentes ao OMA a partir da raiz de instalação selecionada:

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` lista as remoções sem modificar os arquivos. `--yes` ignora o prompt de confirmação. O comando preserva `oma-config.yaml`, `mcp.json` e as skills escritas pelo usuário, conforme a descrição registrada do comando. Se a visualização incluir um arquivo de que você ainda precisa, pare e guarde a saída do dry-run para análise.

### link

Regenera os arquivos nativos dos fornecedores a partir da fonte de verdade `.agents/` sem reinstalar.

```
oma link [vendors...] [--global]
```

**Exemplos:**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Sem `--global`, o `link` tem como alvo `<cwd>/.agents/`; com essa opção, `~/.agents/` (ou `OMA_HOME`). Consulte [Instalação global](../guide/global-install.md).

**O que o comando faz:**
1. Reconstrói os arquivos nativos de agentes dos fornecedores a partir de `.agents/agents/`.
2. Atualiza os hooks e as configurações locais dos fornecedores selecionados.
3. Regenera o bloco de integração `AGENTS.md` para todo fornecedor configurado, inclusive o Claude Code. `CLAUDE.md` e `GEMINI.md` nunca são criados nem recebem um bloco OMA. O Claude Code ≥ 2.1.277 lê `AGENTS.md` nativamente, mas o ignora sempre que existe um `CLAUDE.md`; por isso, quando há um `CLAUDE.md` pertencente ao usuário, o `oma link` acrescenta uma única linha de importação `@AGENTS.md`; o `oma update` também remove o bloco OMA legado do `CLAUDE.md` assim que essa versão é detectada.
4. Atualiza a vinculação MCP do Cursor e os links simbólicos das skills da CLI quando aplicável.

Use este comando depois de modificar `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` ou as definições de hooks.

**Comportamento dos modelos:**
- A delegação nativa para o mesmo fornecedor usa o modelo definido no arquivo de agente gerado para esse fornecedor.
- A delegação de fallback externa usa o `default_model` de cada fornecedor em `.agents/skills/oma-orchestration/config/cli-config.yaml`.

**Comportamento da delegação:**
- Se o fornecedor de destino corresponde ao ambiente de execução atual e esse ambiente suporta agentes nativos por função, o OMA usa delegação nativa.
- Caso contrário, o OMA recorre a `oma agent spawn`.

### setup (workflow)

O workflow `/setup` (invocado em uma sessão de agente) permite configurar interativamente o idioma, as instalações de CLI, as conexões MCP e o mapeamento agente-CLI. Ele difere de `oma` (o instalador): `/setup` configura uma instância já instalada.

---

## Monitoramento e métricas

### dashboard

Inicia o dashboard do terminal para monitorar agentes em tempo real.

```
oma dashboard terminal
```

Nenhuma opção. Monitora `.agents/state/memories/` no diretório atual (projetos mais antigos recorrem ao caminho legado `.serena/memories/`). A interface em caracteres de desenho de caixa exibe o estado das sessões, a tabela de agentes e o feed de atividade. Ela é atualizada a cada alteração de arquivo. Pressione `Ctrl+C` para sair.

O diretório de memórias pode ser substituído pela variável de ambiente `MEMORIES_DIR`.

**Exemplo:**
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web

Inicia o dashboard web.

```
oma dashboard web
```

Inicia um servidor HTTP no endereço `http://localhost:9847` com uma conexão WebSocket para atualizações ao vivo. Abra esta URL em um navegador para exibir o dashboard.

**Variáveis de ambiente:**

| Variável | Valor padrão | Descrição |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Porta do servidor HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Caminho do diretório de memórias (recorre a `{cwd}/.serena/memories` em projetos mais antigos) |

**Exemplo:**
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats

Exibe as métricas de produtividade.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe em formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Métricas acompanhadas:**
- Número de sessões
- Skills usadas (com frequência)
- Tarefas concluídas
- Duração total das sessões
- Arquivos modificados, linhas adicionadas, linhas removidas
- Timestamp da última atualização

**Telemetria de custos** (agregada em cada arquivo `session-cost-*.md` sob `.agents/state/memories/`):
- Número total de tokens de entrada (aproximação baseada nos caracteres do prompt, ainda sem tokens de saída)
- Número total de delegações
- Estimativa em USD conforme uma tabela conservadora de preços por token de entrada e fornecedor (Claude 3 $/M, Codex 5 $/M, Gemini 0,3 $/M, Qwen 0 $/M, Cursor 5 $/M, Antigravity 0,3 $/M)
- Distribuição por fornecedor (tokens · delegações · USD)

A estimativa é um piso, não um valor fiel ao faturamento. Configure `session.quota_cap` em `.agents/oma-config.yaml` para impor orçamentos rígidos no momento da criação de agentes; consulte a página "Por que escolher o oh-my-agent" em Primeiros passos para conhecer o arsenal voltado à qualidade a que esses limites pertencem.

As métricas são armazenadas em `.agents/state/metrics.json`; `.serena/metrics.json` é lido quando existe. Os dados são coletados das estatísticas do git e dos arquivos de memória.

**Exemplos:**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap

Resume o histórico de conversas das ferramentas de IA entre sessões Claude, Codex, Qwen e Cursor.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Opções:**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--window <period>` | Janela de tempo: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Data específica (`YYYY-MM-DD`); tem prioridade sobre `--window` | |
| `--tool <tools>` | Filtro separado por vírgulas: `grok,claude,codex,qwen,cursor,antigravity` | todas |
| `--top <n>` | Exibe os N principais projetos/temas | |
| `--sort <metric>` | Ordena por `count` ou `duration` | `count` |
| `--mermaid` | Exibe um diagrama de Gantt Mermaid | |
| `--graph` | Abre um grafo interativo no navegador | |
| `--json` / `--output <format>` | Saída legível por máquina | `text` |

**Exemplos:**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro

Retrospectiva de engenharia com métricas e tendências.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Argumentos:**

| Argumento | Descrição | Valor padrão |
|:---------|:-----------|:--------|
| `window` | Janela de tempo da análise (por exemplo, `7d`, `2w`, `1m`) | Últimos 7 dias |

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe em formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--interactive` | Modo interativo com entrada manual |
| `--compare` | Compara a janela de tempo atual com a janela anterior de mesma duração |

**O que é exibido:**
- Resumo publicável (métricas em uma linha)
- Tabela de resumo (commits, arquivos modificados, linhas adicionadas/removidas, contribuidores)
- Tendências em relação à última retrospectiva (se existir um instantâneo anterior)
- Ranking de contribuidores
- Distribuição horária dos commits (histograma)
- Sessões de trabalho
- Distribuição dos tipos de commit (feat, fix, chore, etc.)
- Áreas sensíveis (arquivos mais modificados)

**Exemplos:**
```bash
# Last 7 days (default)
oma retro

# Last 30 days
oma retro 30d

# Last 2 weeks
oma retro 2w

# Compare with previous period
oma retro 7d --compare

# Interactive mode
oma retro --interactive

# JSON for automation
oma retro 7d --json
```

---

## Sessões e perfis locais

### state list

Lista as sessões de workflow OMA do projeto atual. A descoberta global explícita lista as sessões de todos os projetos no perfil local selecionado:

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` é somente leitura. Ele não pode ser combinado com a ativação ou a manutenção de uma sessão. As leituras e gravações normais de sessões continuam limitadas ao escopo do projeto. As sessões legadas de outros repositórios devem primeiro ser migradas para o armazenamento HOME antes de aparecer na listagem agregada.

### profile

Gerencia perfis de armazenamento locais em `~/.oma/u/<slot>/`. Os slots são inteiros decimais não negativos; eles são distintos das predefinições de modelos e das contas de login dos fornecedores.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` exibe o código de ativação do shell; ao ser avaliado, ele define `OMA_PROFILE` no shell atual. Executado sozinho, não modifica o shell pai, não altera aplicativos já em execução nem salva um padrão separado apenas para a CLI. Os comandos da CLI e os hooks de fornecedores iniciados no shell ativado herdam o mesmo perfil. O perfil padrão é `0`; `OMA_STATE_HOME` substitui a raiz de armazenamento.
`profile run <slot> -- <command> [args...]` seleciona o perfil somente para este comando e seus filhos. O separador mantém as opções filhas, como `--help` e `--json`, associadas ao comando filho.

---

## Gerenciamento de agentes

### agent spawn

Inicia um processo de agente secundário.

```
oma agent spawn <agent-id> <prompt> <session-id> [--vendor <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `agent-id` | Sim | Tipo de agente. Um de: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` |
| `prompt` | Sim | Descrição da tarefa. Pode ser um texto inline ou um caminho de arquivo. |
| `session-id` | Sim | Identificador de sessão (formato `session-YYYYMMDD-HHMMSS`) |

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--vendor <vendor>` | Substituição do fornecedor da CLI: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Diretório de trabalho do agente. Detectado automaticamente a partir da configuração do monorepo, se omitido. |
| `--resumed-from <run-id>` | Vincula uma nova tentativa ao ID da execução anterior. |
| `--task-id <id>` | ID da tarefa no plano da sessão. Por padrão, o ID do agente. |
| `--isolation <mode>` | Modo de isolamento por execução. Atualmente suporta `worktree`: cria um novo worktree git em `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` na branch `oma/{sessionId}/{agentId}` e executa o agente nele. O worktree é mantido após o término; os comandos de merge ou de descarte são exibidos para revisão manual (sem merge automático). |
| `--read-only` | Limita o agente iniciado a ferramentas não destrutivas e remove as opções de autoaprovação. Usado internamente por `oma skill eval --live` nos dois braços da avaliação. |
| `--fallback-vendors <vendors>` | Ativa uma cadeia ordenada, separada por vírgulas, de até três fornecedores de CLI configurados. A continuação exige uma falha reconhecida de cota, limite de taxa ou falha transitória, além de um novo ponto de controle de transferência segura. |

**Resolução do fornecedor:** a opção `--vendor` tem prioridade, seguida pela substituição `agents:` em `oma-config.yaml` e, depois, pelos valores padrão de agente do `model_preset` ativo.

**Resolução do prompt:** se o argumento do prompt for o caminho de um arquivo existente, seu conteúdo é usado; caso contrário, o argumento é tratado como texto inline. Os protocolos de execução específicos do fornecedor são adicionados automaticamente.

**Códigos de saída:**

| Código | Significado |
|:-----|:--------|
| `0` | O processo do fornecedor foi concluído com o código 0 e existe um artefato de resultado de sessão no espaço de trabalho. |
| `3` | O processo do fornecedor foi concluído com o código 0, mas não gravou **nenhum artefato de resultado de sessão** no espaço de trabalho (por exemplo, o agy grava em sua própria raiz de confiança em vez de `-w`). Um evento `blocker.raised` é adicionado ao registro da sessão e `agent status` exibe `no-artifact`. A execução não deve ser considerada concluída. |
| outro | O próprio processo do fornecedor falhou; seu código de saída é repassado. |

**Exemplos:**
```bash
# Inline prompt, auto-detect workspace
oma agent spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude -w ./api

# Allow a prepared task handoff to another configured vendor
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude --fallback-vendors codex,qwen -w ./api

# Mobile agent with auto-detected workspace
oma agent spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

**Fallback entre fornecedores:** os candidatos de fallback devem ter uma entrada de fornecedor na configuração instalada da CLI. Cada tentativa usa a configuração de modelo do fornecedor de destino e passa pelas verificações de cota de sessão existentes. O proxy multifornecedor `pi` fica excluído deste recurso inicial de fallback. Nenhuma credencial de fornecedor adicional nem rota de API paga é criada.

Quando o fallback está ativado, a tarefa recebe a instrução de preparar um registro de handoff seguro, específico da execução, em `.agents/results/`. Um sucessor lê esse registro e verifica o workspace antes de continuar o trabalho restante. Uma cota esgotada sem checkpoint utilizável termina com um registro needs-review. Um cancelamento, uma falha comum de tarefa ou uma execução concluída não dispara uma nova tentativa. `--read-only` não dispensa a exigência de checkpoint.

Os eventos da sessão registram o motivo da transição e os fornecedores de origem e destino; cada tentativa tem sua própria identidade de execução e o sucessor aponta para o antecessor. Isso se aplica aos subprocessos iniciados por `oma agent spawn`; o comando não troca automaticamente uma conversa interativa existente em um aplicativo de fornecedor. Omitir `--fallback-vendors` mantém a execução normal com um único fornecedor.

### agent status

Verifica o estado de um ou mais subagentes.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `session-id` | Sim | Identificador de sessão a verificar. |
| `agent-ids` | Não | Lista de IDs de agentes separados por espaços. Se omitida, nenhuma saída é produzida. |

**Opções:**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Caminho raiz usado nas verificações de memória | Diretório atual |

**Valores de estado:**
- `completed`: o arquivo de resultado existe (com um cabeçalho de estado opcional).
- `running`: o arquivo PID existe e o processo está ativo.
- `crashed`: o arquivo PID existe, mas o processo foi encerrado, ou nenhum arquivo PID/resultado foi encontrado.
- `no-artifact`: o processo do fornecedor foi concluído com o código 0, mas não gravou nenhum artefato de resultado de sessão no espaço de trabalho (gravação silenciosamente redirecionada — veja o código de saída `3` de `agent spawn`). Trate como uma execução com falha.

**Formato de saída:** uma linha por agente: `{agent-id}:{status}`.

**Exemplos:**
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel

Executa vários agentes secundários em paralelo.

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `tasks` | Sim | O caminho de um arquivo de tarefas YAML ou, com `--inline`, especificações de tarefas inline |

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--vendor <vendor>` | Substituição do fornecedor da CLI para todos os agentes iniciados. |
| `-i, --inline` | Modo inline: especifica as tarefas como argumentos `agent:task[:workspace]`. |
| `--no-wait` | Modo em segundo plano (inicia os agentes e retorna imediatamente). |

**Formato do arquivo YAML de tarefas:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Formato das tarefas inline:** `agent:task` ou `agent:task:workspace` (o workspace deve começar com `./` ou `/`).

**Diretório de resultados:** `.agents/results/parallel-{timestamp}/` contém os arquivos de log de cada agente.

**Exemplos:**
```bash
# From YAML file
oma agent parallel tasks.yaml

# Inline mode
oma agent parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent parallel tasks.yaml --vendor claude
```

### agent review

Executa uma revisão de código com uma CLI de IA externa (codex, claude, qwen ou grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--vendor <vendor>` | Fornecedor de CLI a usar: `codex`, `claude`, `qwen` ou `grok`. Por padrão, `codex` quando o fornecedor resolvido não é compatível. |
| `-p, --prompt <prompt>` | Prompt de revisão personalizado. Sem esta opção, um prompt de revisão padrão é usado. |
| `-w, --workspace <path>` | Caminho a revisar. Por padrão, o diretório de trabalho atual. |
| `--no-uncommitted` | Ignora a revisão das alterações não commitadas. Com esta opção, somente as alterações commitadas na sessão são revisadas. |

**O que o comando faz:**
- Detecta automaticamente o identificador da sessão atual a partir do ambiente ou da atividade recente do git.
- Para `codex`, usa o subcomando nativo `codex review`.
- Para `claude` e `qwen`, monta uma chamada baseada em um prompt e inicia a CLI com o prompt de revisão.
- Por padrão, examina as alterações não commitadas no diretório de trabalho.
- Com `--no-uncommitted`, limita a revisão às alterações commitadas na sessão.

**Exemplos:**
```bash
# Review uncommitted changes with default vendor
oma agent review

# Review with codex (uses native codex review command)
oma agent review --vendor codex

# Review with claude using a custom prompt
oma agent review --vendor claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent review --no-uncommitted

# Review committed changes in a specific workspace with qwen
oma agent review --vendor qwen -w ./apps/web --no-uncommitted
```

### goal set {#goal-set}

Associa um contrato de objetivo a um workflow persistente ativo (orchestrate, ultrawork, work, ralph). O contrato é aplicado mecanicamente pelo hook Stop do modo persistente: o encerramento deixa de depender apenas do julgamento do modelo.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--gate <keyword>` | Gate de parada determinístico: `typecheck`, `test` ou `lint`. Corresponde ao script de mesmo nome em package.json, executado como um array argv, sem shell. Enquanto estiver definido, o hook Stop só permite o fim do workflow **quando esse script passa**; em caso de falha, ele bloqueia com o final da saída para que o agente saiba o que corrigir. Comandos livres são rejeitados — o valor do gate fica em um arquivo de estado gravável pelo agente, então executar strings arbitrárias a partir dele contornaria a camada de permissão. |
| `--budget-minutes <n>` | Orçamento de tempo real (wall-clock), medido a partir da ativação do workflow. Quando excedido, o hook Stop desativa o workflow e permite uma parada parcial honesta (veredito de máquina, registrado como `gate.failed` com `gate: "budget"` na trilha de eventos da sessão). |
| `--description <text>` | Descrição humana do objetivo. Apenas informativa. |
| `--workflow <name>` | Workflow de destino quando vários workflows persistentes estão ativos. |
| `--session <id>` | Sufixo do ID da sessão de destino no arquivo de estado. |

**Notas de comportamento:**
- Gate aprovado → o workflow é desativado, `gate.passed` é emitido e a parada é permitida.
- Falha do gate e estouro do prazo (limite rígido de 60 s) contam, ambos, para o limite de reforços (5); assim, um gate que falha continuamente não pode bloquear paradas indefinidamente. A expiração por inatividade de 2 horas permanece como a última rede de segurança.
- Sem contrato de objetivo, o modo persistente se comporta exatamente como antes (apenas os prompts de reforço se aplicam): o contrato é totalmente opcional.

**Exemplos:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Agentes agendados

### schedule create

Registra um job de agente agendado. Exatamente uma das opções `--cron` e `--every` é obrigatória.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `agent-id` | Sim | Tipo de agente: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Sim | Descrição da tarefa passada ao agente no momento do disparo |

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--cron "<expr>"` | Expressão cron de 5 campos (por exemplo, `"0 9 * * *"`). Mutuamente exclusiva com `--every`. |
| `--every "<phrase>"` | Intervalo em linguagem natural: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Arredonda para o passo mais próximo que o cron consegue expressar e exibe uma nota. Mutuamente exclusiva com `--cron`. |
| `--vendor <vendor>` | Substituição do fornecedor da CLI repassada a `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Detecção automática por padrão. |
| `-w, --workspace <path>` | Diretório de trabalho do agente. Por padrão, o diretório atual no momento do registro. |
| `--once` | Modo de execução única: dispara uma vez e depois se remove. |
| `--expires-after <duration>` | Expira automaticamente a tarefa recorrente após N dias (`0` = indefinido). |
| `--env <KEY1,KEY2>` | Captura as variáveis de ambiente indicadas em `~/.agents/schedule/env/<id>` (0600) para injeção no momento da execução. Somente as chaves listadas são capturadas, nunca o ambiente inteiro. |

**O que o comando faz:**
1. Analisa e valida a expressão cron (ou converte a frase `--every` em cron).
2. Grava a tarefa em `~/.agents/schedule/schedules.json` (manifesto global, permissões 0600).
3. Registra a tarefa no agendador do sistema (launchd / systemd --user / schtasks). A tarefa do sistema chama `oma schedule run <id>` no intervalo configurado.

**Exemplos:**
```bash
# Exact cron: weekdays at 9 AM
oma schedule create qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule create backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule create pm "Generate sprint plan" --cron "0 9 * * 1" --once --vendor claude -w /path/to/project

# Capture specific env vars for the job
oma schedule create backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

Consulte o [guia de agentes agendados](../guide/scheduled-agents.md) para o passo a passo completo.

### schedule list

Lista todos os jobs agendados de todos os projetos, agrupados por projeto, com o estado de drift do sistema operacional.

```
oma schedule list [--json]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe em formato JSON |

**Estados de drift:** `synced` (manifesto e sistema consistentes), `stale` (o registro no sistema invoca um comando que a CLI atual não aceita mais; execute `schedule sync` para reescrevê-lo, e o `oma update` faz isso automaticamente), `missing-in-os` (execute `schedule sync` para reparar), `orphan-in-os` (o sistema tem um job ausente do manifesto; execute `schedule sync --prune` para removê-lo).

**Exemplos:**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete

Remove um job agendado do manifesto e do agendador do sistema.

```
oma schedule delete <id>
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `id` | Sim | Identificador do job fornecido por `schedule list` (formato: `sch_<base32-12>`) |

**Exemplo:**
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Executa um job agendado pelo identificador. Este é o ponto de entrada chamado pelo agendador do sistema no momento do disparo. Este comando normalmente não é executado manualmente, mas permite depurar uma tarefa.

```
oma schedule run <id>
```

**O que o comando faz:**
1. Procura `<id>` no manifesto (sai com código diferente de zero se não for encontrado).
2. Carrega as variáveis de ambiente capturadas a partir de `~/.agents/schedule/env/<id>` e as injeta.
3. Chama `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`.
4. Grava o resultado em `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Atualiza `lastFiredAt` no manifesto; remove-se quando o job está no modo `--once`.
6. Falha de forma explícita quando a autenticação expira: sai com código diferente de zero e exibe `re-auth required: <vendor>` no stderr. Nunca tem sucesso silenciosamente.

**Exemplo:**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Ressincroniza o manifesto com o agendador do sistema. Repara drifts após uma migração do sistema ou redefinição do agendador.

```
oma schedule sync [--prune]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--prune` | Remove também os jobs do sistema ausentes do manifesto (orphan-in-os). Sem `--prune`, os jobs órfãos são informados, mas não são removidos. |

**Exemplos:**
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Gerenciamento de memória

### memory init

Inicializa o esquema do armazenamento de memória de coordenação.

```
oma memory init [--json] [--output <format>] [--force]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe em formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--force` | Substitui os arquivos de esquema vazios ou existentes |

**O que o comando faz:** cria a estrutura de diretórios `.agents/state/memories/` e os arquivos de esquema iniciais usados pelos agentes e workflows para ler e gravar o estado de coordenação.

**Exemplos:**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Integração e utilitários

### auth status

Verifica o estado de autenticação de todas as CLIs compatíveis.

```
oma auth status [--json] [--output <format>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe em formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Verificações:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

**Exemplos:**
```bash
oma auth status
oma auth status --json
```

### bridge

Encaminha o protocolo MCP stdio para um servidor Serena compartilhado por projeto.

```
oma bridge [url] [--context <name>]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `url` | Não | Conecta-se a um endpoint gerenciado pelo chamador em vez de resolver um daemon compartilhado |
| `--context` | Não | Contexto Serena do daemon (por padrão `ide`); os daemons são indexados por esse contexto |

**O que o comando faz:** é o que a entrada MCP do Serena de cada fornecedor executa por padrão — você não o executa manualmente. O transporte stdio do Serena dá a cada sessão de agente seu próprio processo Python e uma pilha completa de servidor de linguagem, de modo que o custo cresce com o número de sessões abertas. O bridge reduz esse custo a um servidor por projeto: resolve a raiz do projeto a partir do diretório de trabalho, inicia um servidor HTTP do Serena fixado em `--project` caso nenhum esteja em execução e, em seguida, encaminha a sessão para ele.

Fixar `--project` é importante: um servidor iniciado sem essa opção expõe a ferramenta `activate_project`, que permite a qualquer sessão trocar o projeto subjacente de todas as outras.

**Arquitetura:**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Ciclo de vida:** a primeira sessão inicia o servidor, as seguintes o reutilizam e cada proxy se registra como cliente. Quando a última sessão se desconecta, o servidor permanece ativo por 10 minutos — uma reinicialização se reconecta — e depois é encerrado pelo próximo bridge que for iniciado. Se o servidor compartilhado estiver inacessível, o proxy recorre a uma instância Serena stdio local da sessão.

Desative esse comportamento com `serena.mode: stdio` em `.agents/oma-config.yaml`.

**Exemplo:**
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Verifica a saída de um subagente conforme os critérios esperados.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**Argumentos de `verify agent`:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `agent-type` | Sim | Um de: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Opções:**

| Opção | Descrição | Valor padrão |
|:--------|:-----------|:--------|
| `-w, --workspace <path>` | Espaço de trabalho a verificar | Diretório atual |
| `--json` | Exibe em formato JSON | |
| `--output <format>` | Formato de saída (`text` ou `json`) | |

**O que o comando faz:** executa o script de verificação do tipo de agente indicado, verificando o sucesso da compilação, os resultados dos testes e a conformidade com o escopo.

`verify triggers` mede a precisão do detector de palavras-chave em um corpus de prompts rotulado. Os limites percentuais são gates. O caminho registrado é `verify agent`; a forma antiga no nível raiz ainda pode aparecer na ajuda de compatibilidade.

**Verificações comuns (todos os tipos de agente):**
- **Verificação de escopo**: lê os escopos de tarefa em `.agents/results/plan-{sessionId}.json`. Compara os arquivos modificados no `git diff` com os padrões de escopo definidos. Falha se arquivos fora do escopo atribuído ao agente forem modificados.
- **Pré-verificação do charter**: verifica se `result-{agent}.md` contém um bloco `CHARTER_CHECK:` corretamente preenchido, sem placeholders não preenchidos.
- **Segredos fixos no código**: examina os arquivos `.py`, `.ts`, `.tsx`, `.js`, `.dart` em busca de padrões como `password = "..."` e `api_key = "..."` (arquivos de teste e de exemplo são excluídos).
- **Comentários TODO/FIXME**: conta os comentários `TODO`, `FIXME`, `HACK` e `XXX` (avisa se algum for encontrado).

**Verificações específicas de cada agente:**

| Tipo de agente | Verificações adicionais |
|:-----------|:-----------------|
| `backend` | Validação de sintaxe Python (`py_compile`), detecção de injeção de SQL (f-string + palavras-chave SQL), execução dos testes Python (`pytest`) |
| `frontend` | Compilação TypeScript (`tsc --noEmit`), detecção de estilos inline (`style={{`), uso do tipo `any` (falha acima de 3), testes de frontend (`vitest`) |
| `mobile` | Análise Flutter/Dart (`flutter analyze` ou `dart analyze`), testes Flutter (`flutter test`) |
| `qa` | Autoverificação |
| `debug` | Executa os testes de Python ou de frontend conforme o tipo de projeto detectado |
| `pm` | Verifica se `.agents/results/plan-{sessionId}.json` existe e contém um JSON válido |

**Formato de saída:**
Cada verificação informa `PASS`, `FAIL`, `WARN` ou `SKIP` com uma mensagem detalhada. O resultado global é `ok: true` somente se nenhuma verificação falhar.

**Exemplos:**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook

Despacha um evento de hook do fornecedor pelo roteador centralizado de hooks do oma (design 019). Esta é a ABI canônica chamada pelo wrapper `oma-hook.sh` gerado para cada fornecedor. O comando também pode ser usado diretamente para depurar ou testar cadeias de handlers isoladamente.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Opções:**

| Opção | Obrigatório | Descrição |
|:-----|:-----------|:-----------|
| `--vendor <v>` | Sim | Identidade do fornecedor. Um de: `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro` ou `qwen`. (O fornecedor `pi` **não** é válido aqui: ele usa o bridge `installPiExtension` em processo em vez de `oma hook run`.) |
| `--event <e>` | Sim | Nome do evento de hook nativo registrado nas configurações do fornecedor (por exemplo, `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | Não | Nome de ferramenta ou matcher opcional repassado pelo registro do hook (por exemplo, `Bash`) |

**Contrato de stdin / stdout:**
- **stdin**: payload JSON nativo do fornecedor (o mesmo objeto que o fornecedor repassa aos processos de hook).
- **stdout**: JSON no dialeto do fornecedor (ou texto simples para os prompts do kiro) quando um handler dispara; vazio quando nenhum handler produz saída.
- **código de saída**: sempre `0` (fail-open — os erros são gravados no stderr e o agente nunca é bloqueado).

**Fluxo de dados em tempo de execução:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Depurar cadeias de handlers isoladamente:**

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor codex --event Stop

# Test an Antigravity BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor antigravity --event BeforeTool
```

Uma saída stdout vazia significa que a cadeia não fez nada para esse evento. Um objeto JSON no stdout é o dialeto do fornecedor que a sessão do agente receberia.

**Notas de escopo:**
- As entradas `statusLine`/hud não passam por `oma hook run` (a exibição no caminho crítico continua em um caminho `bun` direto).
- O fornecedor pi usa seu bridge em processo `installPiExtension`, e não `oma hook run`.
- Entregas duplicadas de uma instalação dupla em projeto e global são descartadas dentro de `oma hook run` (payload idêntico iniciado por outro wrapper `oma-hook.sh`); eventos distintos, inclusive chamadas de ferramenta em paralelo, sempre são executados.

Consulte `cli/commands/hook/command.ts` para a implementação do roteador (chamado internamente de "design 019") e `cli/commands/hook/probe/` para a matriz de compatibilidade por fornecedor.

**Exemplos:**
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook run --vendor qwen --event Stop

# Check Antigravity hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor antigravity --event BeforeAgent
```

---

### hook probe

Sonda a compatibilidade dos hooks por fornecedor e exibe uma matriz de cobertura.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Opções:**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--vendor <list>` | Fornecedores a sondar, separados por vírgulas | Todos os fornecedores compatíveis |
| `--output <fmt>` | Formato de saída: `text`, `md` ou `json` | `text` |
| `--hooks-dir <dir>` | Substitui o diretório `.agents/hooks/core` | Detectado automaticamente |

**O que o comando verifica:** para cada fornecedor, sonda se os scripts de hook principais (`keyword-detector`, `persistent-mode`, etc.) estão presentes e se o JSON de variante mapeia corretamente os eventos para as cadeias de handlers. O código de saída é `1` se algum fornecedor informar o estado `failed`.

**Exemplos:**
```bash
# Text matrix for all vendors
oma hook probe

# Markdown matrix (useful in CI PR comments)
oma hook probe --output md

# JSON for programmatic consumption
oma hook probe --output json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook probe --vendor claude,codex,antigravity
```

### vault

Gerencia chaves de API e outros segredos no chaveiro do sistema (Keychain do macOS, Secret Service do Linux ou Gerenciador de Credenciais do Windows), com suporte de `@napi-rs/keyring`. Os valores nunca aparecem no histórico do shell nem em arquivos de ambiente; somente os nomes das chaves são rastreados em `~/.config/oma/vault-index.json`, para que `oma vault list` possa enumerá-las sem expor os valores secretos.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Subcomandos:**

| Subcomando | Descrição |
|:------------|:-----------|
| `store <name>` | Solicita um valor secreto (entrada oculta) e o grava sob `name` no chaveiro do sistema. `--value <value>` aceita o valor inline para uso não interativo (visível no histórico do shell; prefira o prompt). |
| `get <name>` | Exibe o valor armazenado no stdout, sem decoração, para que possa ser usado em shells: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Sai com o código `2` se a chave não existir. |
| `list` | Lista os nomes das chaves armazenadas com o carimbo de data `createdAt`. Os valores nunca são exibidos. |
| `rm <name>` | Remove o segredo do chaveiro e do índice. |

**Regras para nomes de chaves:** de 1 a 64 caracteres entre `[A-Za-z0-9._-]`. Exemplos: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Dependência nativa:** o módulo nativo `@napi-rs/keyring` é carregado sob demanda; se não puder ser carregado (por exemplo, em Linux headless sem `libsecret` ou `gnome-keyring`), o comando exibe um erro explícito com uma dica de instalação em vez de recorrer silenciosamente a um fallback.

**Exemplos:**
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault delete anthropic
```

### cleanup

Limpa processos órfãos de subagentes e arquivos temporários.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--dry-run` | Exibe o que seria limpo, sem modificar os arquivos |
| `-y, --yes` | Ignora os prompts de confirmação e limpa tudo |
| `--json` | Exibe em formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**O que o comando limpa:**
- Arquivos PID órfãos no diretório temporário do sistema (`/tmp/subagent-*.pid`).
- Arquivos de log órfãos (`/tmp/subagent-*.log`).

- **Servidores de linguagem Serena órfãos** — quando um cliente MCP (por exemplo, Claude) é encerrado, o `serena start-mcp-server` dele é readotado pelo init e seus processos filhos LSP (`tsserver`, `pyright`, …, centenas de MB) continuam em execução sem cliente. Eles são recuperados aqui. O caso *ocioso, mas ainda conectado* é tratado separadamente por [`serena reap`](#serena).
- Diretórios Gemini Antigravity (brain, implicit, knowledge) sob `.gemini/antigravity/`.

**Exemplos:**
```bash
# Preview what would be cleaned
oma cleanup --dry-run

# Clean with confirmation prompts
oma cleanup

# Clean everything without prompts
oma cleanup --yes

# JSON output for automation
oma cleanup --json
```

### serena

Recupera memória dos servidores de linguagem do Serena de cada projeto. O Serena inicia uma pilha LSP (`tsserver`, `pyright`, …, cerca de 300 MB) para cada projeto aberto e a mantém ativa durante toda a sessão; com vários projetos abertos, esse consumo cresce rapidamente. O reaper encerra os processos filhos LSP inativos; o Serena se recupera sozinho e os reinicia na próxima chamada de ferramenta, sem necessidade de reinicialização.

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Subcomandos:**

| Comando | Descrição |
|:--------|:-----------|
| `serena reap` | Recupera agora os LSPs inativos, uma vez. Execuções interativas sempre são executadas; `--quiet` (o caminho agendado) respeita a adesão opcional `enabled`. |
| `serena reap --dry-run` | Visualiza os alvos e a memória que seria liberada — nunca encerra processos. |
| `serena reaper enable` | Instala uma tarefa em segundo plano que executa `serena reap --quiet` a cada 5 minutos (launchd / timer do systemd / Agendador de Tarefas do Windows). |
| `serena reaper disable` | Remove a tarefa em segundo plano. |

**Política:** `lru` (padrão) mantém ativos os `keepWarm` projetos usados mais recentemente e recupera os demais; `idle` recupera qualquer projeto inativo há mais de `idleMinutes`. Uma janela `graceSeconds` protege as chamadas de ferramenta em andamento.

**Configuração** (`.agents/oma-config.yaml`, adesão opcional — desabilitada por padrão):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Os diagnósticos (estado KEEP/REAP por projeto e origem do sinal de atividade) são exibidos por [`oma doctor`](#doctor). Os LSPs do Serena órfãos (cliente encerrado) são recuperados por [`oma cleanup`](#cleanup), independentemente dessa configuração.

**Exemplos:**
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper enable

# Turn it back off
oma serena reaper disable
```

### visualize

Visualiza a estrutura do projeto como um grafo de dependências.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` é um alias integrado de `visualize`.

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe em formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**O que o comando faz:** analisa a estrutura do projeto e gera um grafo de dependências mostrando as relações entre skills, agentes, workflows e recursos compartilhados.

**Exemplos:**
```bash
oma visualize
oma viz --json
```

### search

Primitivas mecânicas de pesquisa que cobrem busca, metadados, RSS, mídia, código e avaliação de confiança. Alias: `oma s`. Todos os subcomandos escrevem JSON em stdout (um objeto por linha ou saída formatada com `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcomandos:**

| Subcomando | Função |
|:-----------|:--------|
| `fetch <url>` | Obtém uma URL por meio de um pipeline de estratégias com escalonamento automático (api → probe → impersonate → browser → archive) |
| `api <url>` | Obtém via o handler de API da plataforma correspondente (fase 0) |
| `api:search <query>` | Distribui uma pesquisa por palavras-chave entre as plataformas compatíveis (`--platforms <list>`) |
| `meta <url>` | Extrai os metadados OGP / JSON-LD / Schema.org |
| `rss <url>` | Descobre e analisa um feed RSS / Atom |
| `rss:google <query>` | Monta uma URL de RSS do Google News para uma consulta |
| `media <url>` | Extrai os metadados de mídia via `yt-dlp` (1858 sites) |
| `archive <url>` | Obtém via o fallback AMP / archive.today / Wayback |
| `trust <domain>` | Resolve o nível ou a pontuação de confiança de um domínio |
| `code <query>` | Pesquisa código via `gh` (GitHub) ou `glab` (GitLab) |
| `doctor` | Verifica as dependências (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Opções comuns dos subcomandos de URL/consulta:**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Tempo limite por estratégia | `15` (`30` para `media`) |
| `--locale <value>` | Cabeçalho `Accept-Language` | `en-US,en;q=0.9` |
| `--pretty` | Formata a saída JSON | `false` |

**Opções adicionais de `fetch`:**

| Opção | Descrição |
|:-----|:-----------|
| `--only <strategies>` | Estratégias a executar, separadas por vírgulas (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Estratégias a ignorar, separadas por vírgulas |
| `--include-archive` | Acrescenta a estratégia de archive como último fallback |

**Opções adicionais de `media`:**

| Opção | Descrição |
|:-----|:-----------|
| `--subs` | Grava as legendas |
| `--sub-lang <list>` | Idiomas das legendas, separados por vírgulas (padrão: `en`) |
| `--format <spec>` | Especificação de formato do yt-dlp |

**Opções adicionais de `code`:**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Host | `github` |
| `--language <lang>` | Filtro de linguagem | |
| `--repo <owner/repo>` | Limita a um repositório | |
| `--limit <n>` | Número máximo de resultados | `20` |

**Códigos de saída:** `0` OK, `1` erro, `2` bloqueado, `3` não encontrado, `4` entrada inválida, `5` autenticação obrigatória, `6` tempo limite excedido.

**Exemplos:**

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

O registro também expõe os seguintes auxiliares explícitos de descoberta:

```bash
# Inspect which providers are registered without making a network request
oma search providers --json

# Use the selected web provider with bounded output
oma search web "latest browser automation" --limit 10 --timeout 30s --pretty

# Fetch metadata and feeds directly
oma search meta https://example.com/article --pretty
oma search media https://example.com/video --subs --sub-lang en --pretty
oma search archive https://example.com/article --pretty

# Platform API and RSS routes
oma search api fetch https://example.com/article --pretty
oma search api search "RAG patterns" --platforms hackernews,reddit --pretty
oma search rss fetch https://example.com/feed.xml --pretty
oma search rss google "browser automation"
```

`search` emite JSON mesmo sem `--json`. `--pretty` altera apenas a apresentação; não altera o esquema do resultado. `search web` aceita `--provider`, `--limit`, `--timeout`, `--json` e `--pretty`. Se uma estratégia for bloqueada ou faltar uma dependência, use a tabela de códigos de saída acima e execute `oma search doctor` novamente antes de mudar de estratégia.

### image

Gera imagens de IA com vários fornecedores e delegação paralela sensível a autenticação. Alias: `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcomandos:**

| Subcomando | Função |
|:-----------|:--------|
| `generate <prompt...>` | Gera imagens via `pollinations` (flux/zimage, gratuito), `codex` (gpt-image-2 via OAuth do ChatGPT) ou `antigravity` (nano-banana via assinatura do Gemini Code Assist, sem chave) |
| `doctor` | Verifica a autenticação e o estado de instalação para cada fornecedor |
| `vendor list` | Lista os fornecedores registrados e os modelos compatíveis |

**Opções de `image generate`:**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | Qualquer valor `WxH` cujas bordas sejam divisíveis por 16, de 16 a 3840, e com proporção de 1:3 a 3:1; `auto` também é aceito. | Valor padrão do fornecedor |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | Valor padrão do fornecedor |
| `-n, --count <n>` | Número de imagens (1..5) | `1` |
| `--output-dir <path>` | Diretório de saída | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | Autoriza os caminhos de saída fora de `$PWD` | `false` |
| `--model <name>` | Substituição de modelo específica do fornecedor; ignorada por `antigravity`, cujo modelo é opaco. | Valor padrão do fornecedor |
| `--timeout <duration>` | Tempo limite por imagem | Valor padrão do fornecedor |
| `-r, --reference <path>` | Imagem(ns) de referência; repetível ou separada por vírgulas. Compatível com `codex` e `antigravity`, recusada por `pollinations`. Cada arquivo ≤5 MB em PNG/JPEG/GIF/WebP (validação por magic bytes), no máximo 10. | |
| `-y, --yes` | Ignora a confirmação de custo | `false` |
| `--no-prompt-in-manifest` | Armazena o SHA256 do prompt em vez do texto bruto | `false` |
| `--dry-run` | Exibe o plano e a estimativa de custo; não executa nada | `false` |
| `--output <format>` | Formato de saída da CLI: `text` \| `json` | `text` |

Cada execução grava um `manifest.json` ao lado das imagens geradas; ele registra o fornecedor, o modelo, o prompt (ou seu hash), o tamanho, a qualidade e o custo.

**Exemplos:**

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or antigravity)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor antigravity -r a.png -r b.png
oma image generate "blend these styles" --vendor antigravity -r a.png,b.png

# Per-vendor doctor check
oma image doctor --output json
```

### video

Planeja, escreve e renderiza vídeos curtos, explicativos e de demonstração. `generate` cria o brief, o script, a especificação de renderização e o manifesto de execução; uma composição e um compositor funcional são necessários antes de renderizar um MP4 de verdade.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` aceita `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor hyperframes|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` e `--capture-stop duration:<seconds>|selector:<css>`. Use `--source web --url <url>` para uma captura do navegador; `--source file` é o valor padrão. `--output-dir` escolhe a raiz de execução, `--allow-external-output` autoriza um caminho fora de `$PWD`, `--max-usd` define um teto de custo, `-y, --yes` pula a confirmação de custo, `--seed` estabiliza as entradas de planejamento, `--timeout` limita cada chamada a um provedor visual ou de música, `--script` injeta um `script.json` escrito pelo agente e `--no-brief-in-manifest` armazena um hash do brief em vez do texto. `--dry-run` para após o planejamento. `--output text|json` controla o envelope da CLI.

`doctor` verifica a cadeia de ferramentas HyperFrames/MPT em cache e aceita `--install`, `--upgrade`, `--install-mpt` e `--install-strudel`. `provider list` informa a disponibilidade dos fornecedores e o estado das chaves. `compose` cria ou atualiza a composição da execução e exibe o contrato de autoria; `render` executa o lint, renderiza e verifica a saída. A ausência do compositor, da composição ou de uma dependência da cadeia de ferramentas é um erro. O caminho reservado a testes `OMA_VIDEO_MOCK=1` é o único modo de substituição; uma execução normal nunca substitui o resultado por um MP4 de texto ou de tamanho mínimo.

Uma saída JSON bem-sucedida contém `runDir`, `manifestPath`, `scriptPath` e `renderSpecPath`; o manifesto registra os fornecedores selecionados, as entradas e os recursos gerados. Depois de `compose`, escreva a composição gerada conforme o `AUTHORING.md` dela e execute `render` novamente. Se uma chave de fornecedor estiver indisponível, execute `oma video doctor`; se a captura falhar, verifique a URL, o seletor, o dispositivo e o tempo limite; se a renderização falhar, corrija os diagnósticos da composição antes de tentar novamente.

### star

Dá uma estrela ao oh-my-agent no GitHub.

```
oma star
```

Nenhuma opção. A CLI `gh` deve estar instalada e autenticada. O comando adiciona uma estrela ao repositório `first-fluke/oh-my-agent`.

**Exemplo:**
```bash
oma star
```

### describe

Descreve os comandos da CLI em JSON para introspecção em tempo de execução.

```
oma describe [command-path]
```

**Argumentos:**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `command-path` | Não | Comando a descrever. Se omitido, descreve o programa raiz. |

**O que o comando faz:** exibe um objeto JSON contendo o nome, a descrição, os argumentos, as opções e os subcomandos do comando. Agentes de IA o usam para entender os recursos disponíveis da CLI.

**Exemplos:**
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Comandos de pesquisa e artefatos

Estas famílias são úteis quando a saída é um artefato de pesquisa, uma apresentação ou um relatório. Elas são intencionalmente curtas aqui; os guias relacionados explicam o workflow e as opções de recuperação.

### intel suggest

Sugere trabalho de produto a partir de sinais de mercado e do repositório:

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` fornece a configuração completa. Para execuções pontuais, `--topic`, `--target`, `--repos`, `--since` e `--last-commits` definem as entradas. `--output-dir` controla os relatórios locais e `--fixture` fornece uma fixture JSON local para revisão determinística. `--create-issue` registra os candidatos aceitos no GitHub e exige um destino configurado, além de confirmação; combine-o com `--base-repo <owner/name>` para selecionar o repositório e use `--yes` apenas em um contexto de automação já aprovado. `--dry-run` e `--json` são caminhos seguros de inspeção.

### market

A família market delega para o engine upstream `last30days` resolvido. Comece pelo gate e pelo resolvedor:

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` retorna o código 2 com uma reformulação para temas problemáticos de palavras-chave armadilha ou amplos demais; `--force` contorna esta proteção somente se o usuário quiser explicitamente continuar. `market resolve` aceita `--refresh` e `--offline`, enquanto `market update` atualiza o cache do engine gerenciado. `market run` repassa seus argumentos restantes ao engine Python resolvido e adiciona `--save-dir` a partir de `market.save_dir` quando um tema é informado. Leia [Pesquisa de mercado](../guide/market-research.md) antes de escolher as opções do engine; a saída de `--help` dele pertence ao engine gerenciado e muda a cada versão.

### docs

Use a família docs para examinar o drift documental. Os comandos produzem relatórios; `sync` lista candidatos para o agente host e não modifica arquivos.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` verifica as referências locais e regenera `docs/generated/doc-refs.json`; `--urls-sync` aguarda a etapa opcional de URLs do `lychee`. `sync` usa por padrão as alterações em staging e, depois, `HEAD~1..HEAD`, e emite candidatos `{doc, changedFiles, matchedRefs}`. `i18n` informa o drift estrutural entre o inglês e a tradução, enquanto `lint` informa problemas de estilo dos documentos traduzidos. Nenhum desses subcomandos edita a documentação automaticamente.

### slide

`oma slide` trabalha em um diretório de fragmentos HTML de slides em 1920×1080. O menor fluxo funcional é:

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

O gate de qualidade sinaliza estouros, sobreposições e problemas de tamanho de fonte. Use `--slide <file>` para verificar um único slide e `--report-file <path>` com a saída JSON. Exporte somente após validar:

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

A exportação PPTX é experimental e baseada em imagens rasterizadas. `slide import pptx <file>`, `slide asset fetch-video <url>` e `slide style list|preview|get <slug>` cobrem os recursos de entrada e a descoberta de estilos. Use [oma-slide](../guide/content-and-research.md#slides-and-presentations) para as decisões de autoria e as restrições do palco fixo.

### scholar

Pesquisa artigos e metadados de trabalhos e valida sidecars antes do compartilhamento:

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` pode limitar os resultados do OpenAlex com `--year-min` e forçar os fornecedores de fallback com `--always-fallback`. `get --section` aceita `statements`, `evidence`, `relations`, `artifacts` ou `citation`. `lint --lenient` rebaixa referências cruzadas pendentes a avisos; `--fail-on-warning` faz os avisos falharem na CI. A CLI consulta primeiro o Knows e depois os fallbacks OpenAlex e Semantic Scholar; ela não envia sidecars para o upstream.

### explain

`/explain` é o workflow de autoria. A CLI valida os artefatos já criados:

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Passe um arquivo ou `--input-dir`, nunca os dois. A validação cobre o contrato HTML autônomo e sinaliza falhas legíveis por máquina; ela não avalia a exatidão da explicação. Consulte [Explicador de código](../guide/code-explainer.md).

### diagram

Resolva o engine antes que um workflow emita um diagrama estrutural:

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` aceita `--engine auto|archify|mermaid`, `--refresh` e `--offline`. `diagram update` atualiza a cópia gerenciada do archify. `diagram archify` repassa os argumentos restantes ao executável upstream resolvido e propaga o código de saída dele. O Mermaid continua sendo a fonte de verdade em Markdown; o HTML é um artefato derivado. Consulte [Motor de diagramas](../guide/diagram-engine.md).

## Inspeção de estado, modelos e memória

As famílias seguintes expõem o estado persistente dos workflows e os diagnósticos de modelos e fornecedores. Prefira `--dry-run` para ações do tipo limpeza e `--json` quando outro programa consumir o resultado.

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state trajectory <session-id>
oma state trajectory <session-id> --open
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` registra um evento L1 com uma categoria e metadados explícitos da sessão. `state migrate` move sessões legadas para o perfil selecionado. `state repair` repara arquivos de estado malformados. `state decisions list` e `state inject-log list|get` inspecionam as decisões obrigatórias e as entradas de auditoria de injeção. `state trajectory` combina os eventos L1 de uma sessão com as transcrições das sessões de vendor em que ela foi executada (Claude Code, Codex, Antigravity e Grok). O resultado é um único registro, turno a turno, de prompts, respostas do modelo, chamadas de ferramenta, durações e uso de tokens; `--open` o exibe no dashboard web, em `/trajectory`. Os demais vendors aparecem apenas com seus eventos L1. As transcrições são lidas de `CLAUDE_CONFIG_DIR` ou `~/.claude`, `CODEX_HOME` ou `~/.codex`, `~/.gemini/antigravity-cli` e `~/.grok`. `state activate`, `state archive` e `state purge` são ações explícitas; os antigos indicadores booleanos de ação são rejeitados. Arquive ou faça limpeza somente após examinar um dry-run, pois esses comandos modificam o estado local.

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` compara o registro com as listas ao vivo dos fornecedores e pode sondar novos candidatos. `model probe` testa um slug na CLI do fornecedor. `model propose` gera um patch `models:` para o `oma-config`; use `--write` somente se você pretende modificar a configuração. A disponibilidade do fornecedor e a cota podem fazer as sondagens falharem mesmo quando uma entrada do registro é válida.

### agent evidence commands

As execuções nativas de agentes seguem uma sequência apoiada por evidências:

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` carrega o contexto selecionado pelo grafo; `begin` inicia uma execução e exibe um ID gerado e um caminho de claim; `verify` recebe esse ID e executa as verificações fixadas (`--required`) ou as restringe com `--affected`; `finish` recebe o ID e o caminho do arquivo de claim. `agent resume --dry-run` informa as tarefas prontas e reutilizáveis, enquanto `agent resume --max-attempts <n>` só tenta novamente tarefas autorizadas pelo plano. Consulte [Resultados e retomada de agentes](../guide/agent-results-and-resume.md) para o formato do plano e do claim. Esses comandos pertencem ao contrato de execução do OMA; o trabalho comum do usuário pode usar `agent spawn`, `agent parallel` ou `agent review`.

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` configura credenciais de conexão do Honcho ou de embedding; `--dry-run` visualiza os destinos sem ler nem gravar chaves. `memory setup` prepara um endpoint do AgentMemory e pode, opcionalmente, instalá-lo ou iniciá-lo com `--install` ou `--start`. `memory daemon` e `memory service` gerenciam a integração com um processo local ou um serviço do sistema operacional. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade` e `memory gc` são ações de manutenção; inspecione a saída JSON ou o dry-run antes de aplicá-las.

## Gerenciamento de skills

### skills audit

Verifica as skills instaladas em busca de descrições sobrepostas, de generalismo que captura tudo ("buraco negro") e de degradação do roteamento ligada ao tamanho da biblioteca.

```
oma skill audit [--json] [--output <format>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe JSON para a CI/CD |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Verificações realizadas:**
- **Similaridade pareada das descrições**: similaridade de cosseno TF-IDF entre cada par de skills instaladas. Avisa a partir de ≥ 60%, falha a partir de ≥ 75%.
- **Detecção de generalismo abrangente (buraco negro)**: sinaliza qualquer skill cuja similaridade média com as demais seja um valor atípico positivo (≥ média + 1,5 × desvio-padrão), o que indica uma descrição genérica demais que pode desviar o roteamento.
- **Degradação ligada ao tamanho da biblioteca**: avisa quando mais de 60 skills estão instaladas (a precisão do roteamento diminui de forma logarítmica à medida que a biblioteca cresce).
- **Verificação de foco**: avisa quando uma skill se expande até virar um bundle — mais de 20 documentos de referência (arquivos `.md` além de `SKILL.md`, excluídas as árvores vendored) ou um corpo de `SKILL.md` com mais de 25.000 caracteres. Skills focadas superam bundles (SkillsBench, arXiv:2602.12670); a correção é dividir, não remover.

**Códigos de saída:** `0` se todos os resultados estão na faixa de aviso ou se não há nenhum; `1` se ao menos um par está na faixa de falha.

**Exemplos:**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Detecta problemas de autoria específicos de uma skill em um único `SKILL.md`, ao contrário de `skills audit`, que verifica as relações *entre* skills. A verificação usa a taxonomia de smells de skill do arXiv:2607.01456 (mais de 99% dos arquivos SKILL.md encontrados na prática apresentam ao menos um smell).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--skill <id>` | Verifica uma única skill |
| `--json` | Exibe JSON para a CI/CD |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Problemas genéricos (todas as skills):**

| Problema | Severidade | Significado |
|:------|:---------|:--------|
| `missing-name` | fail | `name` ausente ou vazio no frontmatter |
| `missing-description` | fail | `description` ausente ou vazia no frontmatter — o roteamento depende dela |
| `weak-description` | warn | Descrição com menos de 40 caracteres — fina demais para o roteamento |
| `body-too-long` | warn | Corpo do SKILL.md com mais de 500 linhas — mova o detalhe para `resources/` com divulgação progressiva |
| `template-placeholder` | warn | Texto `{Placeholder}` residual fora de trechos de código |
| `broken-reference` | fail | Referência a um arquivo `resources/`, `config/`, `scripts/` ou `assets/` inexistente |

**Problemas SSL-lite** (a validação SSL-lite é obrigatória quando o nome declarado de uma skill ou o nome exposto do seu diretório/alias começa com `oma-`, mesmo sem `## Scheduling`; um alias sem prefixo não pode contornar um nome declarado com `oma-`. Skills comuns sem prefixo adotam o formato ao incluir `## Scheduling`):

| Problema | Severidade | Significado |
|:------|:---------|:--------|
| `ssl-structure` | fail | Seções de primeiro nível diferentes de `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | Não existe exatamente um `### Canonical command path` ou `### Canonical workflow path` |
| `missing-boundaries` | warn | Nenhum `### When NOT to use` — skills sem limites desviam o roteamento |
| `empty-failure-recovery` | warn | `### Failure and recovery` ausente ou vazio (bullets e linhas de tabela são aceitos) — codifique os mecanismos de falha conforme o SkillLens |

**Códigos de saída:** `0` quando não há problemas de severidade fail; `1` se ao menos um problema fail estiver presente.

**Exemplos:**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Mede a utilidade de cada skill: carregar uma skill realmente melhora os resultados em tarefas reservadas? Este é o complemento de *utilidade* de `skills audit` (que mede a sobreposição dos limites das descrições). Enquanto `audit` pergunta "duas skills são redundantes?", `eval` pergunta "esta skill ajuda?".

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Opções:**

| Opção | Descrição |
|:-----|:-----------|
| `--skill <id>` | Identificador da skill a avaliar (nome simples, sem separadores de caminho). Padrão: `_all`. |
| `--mock` | Reproduz as execuções registradas a partir de `_rollouts/` (padrão; determinístico, sem despacho para LLM). Seguro para a CI. |
| `--live` | Despacho de agente ao vivo — inicia dois braços (referência e tratamento) por tarefa via `oma agent spawn --read-only`. Exibe uma pré-visualização do custo e pede confirmação, a menos que `--yes` seja usado. |
| `--record` | Grava as execuções ao vivo capturadas (incluindo os veredictos do juiz) em `_rollouts/` para uma futura reprodução com `--mock`. Relevante somente com `--live`. |
| `--yes` | Ignora a confirmação da pré-visualização do custo. Relevante somente com `--live`. |
| `--task-dir <path>` | Substitui o diretório das fixtures de tarefas (deve ficar dentro da raiz do workspace). Padrão: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Limita o número de tarefas avaliadas (aplicado na ordem de classificação determinística). |
| `--require-coverage` | Sai com código diferente de zero quando menos de 5 tarefas são encontradas (evita um falso verde silencioso na CI). |
| `--json` | Exibe JSON para a CI/CD |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Como funciona:**

Para cada fixture de tarefa em `.agents/eval/<skill>/`:
1. **Braço de referência** — o prompt da tarefa é despachado sem carregar a skill.
2. **Braço de tratamento** — `SKILL.md` é adicionado ao início do prompt, e então o prompt é despachado.
3. Cada braço é avaliado pelo seu verificador (juiz por padrão; assert ou regex para adesões determinísticas).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Decisões:**

| Decisão | Condição |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (código de saída 1) |
| `insufficient` | Menos de 5 tarefas avaliáveis (código de saída 1 somente com `--require-coverage`) |

**Modo recomendado:** use `--live` com verificadores do tipo juiz para medir a utilidade real de uma skill. Use `--mock` para reproduzir offline veredictos de juiz registrados ou para executar verificações de contrato determinísticas `assert`/`regex`.

**Variável de ambiente:** `OMA_SKILLEVAL_MOCK=1` força o modo simulado independentemente dos indicadores.

**Códigos de saída:** `0` para pass ou warn; `1` para fail ou insufficient com `--require-coverage`.

**Exemplos:**
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skill eval --skill oma-scholar

# Live run with cost preview
oma skill eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skill eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skill eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skill eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skill eval --skill oma-scholar --max-tasks 10
```

Consulte o [guia de avaliação da utilidade de skills](../guide/skill-eval.md) para o formato das fixtures `.agents/eval/` e os tipos de verificadores.

---

### skills opt

Otimiza o `SKILL.md` de uma skill com uma evolução persistente no estilo WikiSkill. Um Maintainer consolida as evidências observáveis das execuções em conhecimento delimitado, um Proposer emite edições limitadas de adição/remoção/substituição e os resultados rejeitados persistem entre as execuções. Os candidatos devem melhorar estritamente a divisão de validação reservada; `--apply` exige, além disso, uma melhoria estrita em uma divisão final de teste pertencente ao runner. Base de pesquisa: WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Opções:**

| Opção | Valor padrão | Descrição |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Identificador da skill a otimizar (nome simples, sem separadores de caminho). |
| `--dry-run` | **sim (padrão)** | Propõe as alterações e exibe o diff sem modificar `SKILL.md`; as evidências de evolução geradas ainda assim são registradas. |
| `--apply` | — | Aplica as alterações aceitas; faz backup do original antes de uma gravação atômica e grava apenas uma melhoria validada. |
| `--mock` | **sim (padrão)** | Reproduz as edições do otimizador e os veredictos de avaliação registrados (determinístico, offline). Seguro para a CI. |
| `--live` | — | Despacho do otimizador LLM ao vivo — gera chamadas reais de modelo a cada época. Exibe uma pré-visualização do custo e pede confirmação, a menos que `--yes` seja usado. |
| `--max-epochs <n>` | `8` | Número máximo de épocas de otimização. |
| `--edits-per-epoch <k>` | `4` | Número de edições candidatas propostas por época. |
| `--lr <chars>` | `600` | Orçamento textual de taxa de aprendizado: variação líquida máxima de caracteres por edição. |
| `--yes` | — | Ignora a confirmação da pré-visualização do custo (somente com `--live`). |
| `--json` | — | Exibe JSON para a CI/CD. |
| `--output <format>` | `text` | Formato de saída (`text` ou `json`). |

**Dependência obrigatória:** exige pelo menos 5 fixtures de tarefa em `.agents/eval/<skill>/`. Exibe uma mensagem clara se esse número não for atingido. Consulte o [guia de avaliação da utilidade de skills](../guide/skill-eval.md) para saber como escrevê-las.

**Divisão treino/validação/teste:** as fixtures são divididas de forma determinística em 60/20/20. O Maintainer e o Proposer veem apenas as evidências TRAIN, a seleção dos candidatos usa as tarefas VALIDATION reservadas e a divisão TEST pertencente ao runner permanece oculta até o fim da evolução. `--apply` grava somente se o ganho de validação e o ganho do teste final melhorarem estritamente.

**Ressalva sobre o SSOT:** skills cujo identificador começa com `oma-` são sobrescritas por `oma update`. Para essas skills, `--apply` é desaconselhado — use o `--dry-run` padrão e repasse o diff proposto ao upstream. As skills escritas pelo usuário se aplicam livremente.

**Códigos de saída:** `0` se a otimização foi concluída; `1` se as fixtures forem insuficientes ou se o argumento for inválido.

**Exemplos:**
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skill optimize --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skill optimize --skill oma-scholar --json

# Tune epochs and edits budget
oma skill optimize --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

Consulte o [guia de otimização de skills](../guide/skill-opt.md) para o passo a passo completo e os detalhes das proteções contra SSOT / overfitting.

---

### harness eval

Compara um overlay `.agents/` candidato com o harness OMA atual em tarefas pareadas e isoladas de repositório. O agente-alvo e a rota do fornecedor permanecem fixos; verificações determinísticas avaliam os arquivos e a saída produzidos por cada braço.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Opção | Descrição |
|:-----|:------------|
| `--suite <path>` | Suite YAML obrigatória. A suite e os workspaces de fixtures devem ficar dentro da raiz do projeto. |
| `--candidate <path>` | Raiz candidata obrigatória, contendo um overlay `.agents/` delimitado. |
| `--mock` | Reproduz uma execução registrada cujo hash corresponde (padrão; determinístico e offline). |
| `--live` | Executa os braços de referência e candidato com o agente de destino da suite. |
| `--record` | Persiste uma execução ao vivo para uma reprodução mock futura. Exige `--live`. |
| `--record-file <path>` | Substitui o caminho da gravação; ele deve permanecer dentro da raiz do projeto. |
| `--yes` | Ignora a confirmação de custo da execução ao vivo. |
| `--timeout-minutes <n>` | Tempo limite por braço, idêntico para a referência e o candidato. Padrão: `15`. |
| `--require-coverage` | Sai com código diferente de zero quando menos de cinco tarefas pareadas são avaliáveis. |
| `--json` | Exibe a avaliação completa em formato JSON. |
| `--output <format>` | Formato de saída (`text` ou `json`). |

**Gate de decisão:** pass exige pelo menos 5 tarefas pareadas, um ganho de pelo menos 5 pontos percentuais e nenhuma regressão. Uma regressão sempre falha. Uma cobertura abaixo do mínimo resulta em `insufficient` e só sai com código diferente de zero com `--require-coverage`.

**Isolamento:** os arquivos candidatos podem substituir somente o conteúdo de `.agents/agents`, `.agents/rules`, `.agents/skills` e `.agents/workflows` no braço candidato temporário. Hooks, configuração, estado, fixtures de avaliação, links simbólicos, variantes de fornecedores, alterações protegidas do frontmatter de execução dos agentes e arquivos do harness de fornecedor pertencentes às fixtures são recusados. Um braço falha se modificar definições protegidas durante a execução. A descoberta de fornecedores baseada em HOME é recusada na avaliação ao vivo. A rota do agente principal é fixa; a fixação do modelo de subagentes aninhados ainda não é aplicada.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Consulte o [guia de avaliação do harness](../guide/harness-eval.md) para o esquema da suite, as verificações compatíveis, o modelo de isolamento e as limitações atuais.

### harness incident promote

Transforma um incidente capturado em uma fixture de regressão para a skill que o agente com falha exercitou.

```
oma harness incident promote <id> [--skill <id>] [--draft] [--force] [--json]
```

### harness feedback

Promove todos os incidentes ainda não promovidos e, com `--live` ou `--apply`, otimiza cada skill afetada em relação à sua suite ampliada.

```
oma harness feedback [--scan-runs] [--live] [--apply] [--max-epochs <n>] [--incident <ids...>] [--json]
```

Consulte o [guia de casos de regressão de incidentes](../guide/harness-incidents.md).

---

### help

Exibe as informações de ajuda.

```
oma help
```

Exibe o texto completo de ajuda com todos os comandos disponíveis.

### version

Exibe o número da versão.

```
oma version
```

Exibe a versão atual da CLI e sai.

---

## Variáveis de ambiente

| Variável | Descrição | Usada por |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Defina como `json` para forçar a saída JSON em todos os comandos que a suportam | Todos os comandos com a opção `--json` |
| `DASHBOARD_PORT` | Porta do dashboard web | `dashboard web` |
| `MEMORIES_DIR` | Substitui o caminho do diretório de memórias | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Defina como `1` para forçar o modo simulado (mock) em `oma skill eval`, independentemente dos indicadores | `skills eval` |
| `OMA_HOOK_DEDUP` | Defina como `0` para desativar a supressão de entregas duplicadas em `oma hook run`. | `hook` |
| `OMA_HOOK_DEDUP_DIR` | Substitui o diretório privado de claims usado para suprimir entregas duplicadas de hooks (padrão: `$XDG_RUNTIME_DIR/oma-hook-dedup`; se ausente, `<tmpdir>/oma-hook-dedup-<uid>`). | `hook` |

---

## Alias

| Alias | Comando completo |
|:------|:------------|
| `viz` | `visualize` |
