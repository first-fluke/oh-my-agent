---
title: "Comandos CLI"
description: "Referência completa de cada comando da CLI do oh-my-agent, com sintaxe, opções e exemplos organizados por categoria."
---

# Comandos CLI

Após uma instalação global (`bun install --global oh-my-agent`), use `oma` ou `oh-my-agent`. Para uma execução pontual sem instalação, execute `npx oh-my-agent`.

A variável de ambiente `OH_MY_AG_OUTPUT_FORMAT` pode ser definida como `json` para forçar uma saída legível por máquina nos comandos que a suportam. Isso equivale a passar `--json` a cada comando relevante.

## Comece por uma tarefa

Escolha o menor comando que responde a sua pergunta. Cada comando abaixo exibe um caminho ou relatório que você pode examinar antes de passar a etapa seguinte.

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
| `harness` | `harness`, `harness eval` |
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
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

Quando um comando delega os argumentos restantes a outra ferramenta, o registro deixa suas opções abertas de propósito. Isso se aplica a `market run` e `diagram archify` ; consulte a ajuda upstream resolvida antes de executar uma operação que modifica dados ou usa a rede.

---

## Configuração e installation

### install

`oma` sem argumentos inicia o instalador interativo. `oma install` é a forma explícita e aceita opções para selecionar fornecedores.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

`--web-search`, `--code-intelligence` e `--semantic-memory` mantêm a escolha de fornecedor registrada quando são omitidas. `--honcho-url` e `--honcho-workspace` configuram uma nova conexão Honcho quando esse fornecedor é selecionado. A opção raiz `-y, --yes` ignora os prompts e usa os valores padrão ; `--global` direciona a instalação para HOME.

**O que o comando faz :**
1. Procura um diretório antigo `.agent/` e migra-o para `.agents/` se ele existir.
2. Detecta ferramentas concorrentes e propõe removê-las.
3. Solaquita o tipo de projeto (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Se o backend for selecionado, solaquita a variante de linguagem (Python, Node.js, Rust, Other).
5. Pergunta se links simbólicos do GitHub Copilot são dosejados.
6. Baixa o arquivo mas recente do registro.
7. Instala os recursos compartilhados, workflows, configurações e skills selecionados.
8. Instala as adaptações de fornecedor para os fornecedores selecionados (configurações locais do projeto; nenhuma escrita silenciosa no nível HOME).
9. Cria os links simbólicos da CLI.
10. Propõe uma configuração git **global** recomendada (confirmação opcional) :
    - `rerere.enabled=true` — reutilização de conflitos de merge entre agentes
    - `init.defaultBranch=main` — branch padrão consistente para novos repositórios
    - Completamente ignorada com `--yes` / CI (instruções de correção manual são exibidas no lugar)
11. Propõe configurar MCP quando aplicável.
12. Solaquita uma estrela no GitHub se `gh` é autenticado.

**Exemplo :**
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

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe a saída ao formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--profile` | Exibe a matriz de saúde dos perfis. Ela indique o slug de modelo resolvido, o CLI e o estado de autenticação de cada agent conforme o `model_preset` ativo e os sobrescritas `agents:`. Consulte [Modèles por agent](../guide/per-agent-models.md). |

**Verificações realizadas :**
- Instalações da CLI : agy, claode, codex, qwen (versão e caminho).
- Estado de autenticação de cada CLI.
- Configuração MCP : `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Skills instaladas : skills présentes e estado de chacuma.
- Diretório do armazenamento de memória : existence de `.agents/state/memories/` e número de arquivos (os projetos plus antigos usam em fallback o caminho histórico `.serena/memories/`).
- Indicadores de instalação dopla (projeto e global) e avisos associados.
- Configuração git **global** recomendada (`gitRecommended` em o JSON) :
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Cada divergência é contabilizada em `totalIssues`
- Arquivos de contexto dos fornecedores do projeto (por exemplo os blocs OMA de `CLAUDE.md` / `AGENTS.md` quando o CLI correspondente é instalado).
- AgentMemory, estado/saúde dos hooks, diagnósticos do reaper Serena e contadores de incidentes associados.

**Reparo automático :** se skills ausentes forem detectadas, `doctor` propõe instalá-las de forma interativa. Se a configuração git recomendada é absente ou incorrecte, il propõe as mesmas correções globais opcionais de install/update.

**Exemplos :**
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

Atualiza as skills para a versão mas recente do registro.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `-f, --force` | Substitui os arquivos de configuração personalizados (`oma-config.yaml`, `mcp.json`, diretórios `stack/`) |
| `--with-new-skills` | Instala os skills adicionadas em esta versão ; sem esta opção, únicoes os skills já instalados são atualizados. |
| `--ci` | Executa em mode CI non interativo (ignore os prompts, saída em texto simples) |
| `-y, --yes` | Ignora os prompts. A abrangência dos fornecedores permanece inalterada : somente os diretórios existentes são atualizados, exceto com `--all` ou `--vendor`. |
| `--all` | Cria ou met a jour todos os fornecedores pris em carga ao nível do projeto. |
| `--vendor <vendors>` | Cria ou met a jour dos fornecedores específicos. Aceita uma lista separada por dos vírgulas, como `claude,qwen`. |

**O que o comando faz :**
1. Obtém `prompt-manifest.json` do registro para verificar a versão mas recente.
2. Compara com a versão local em `.agents/skills/_version.json`.
3. Sai se a versão já estiver atualizada.
4. Baixa e extrai o arquivo mas recente.
5. Preserva os arquivos personalizados pelo usuário (exceto com `--force`).
6. Copia os arquivos novos para `.agents/`.
7. Restaora os arquivos preservados.
8. Atualiza as adaptações dos fornecedores e os links simbólicos. Por padrão, apenas os diretórios de fornecedores já presentes no projeto são afetados.
9. Propõe a configuração git **global** recomendada (como dorante de a instalação : `rerere.enabled`, `init.defaultBranch`). Ela é ignorada com `--yes` / `--ci`.

**Exemplos :**
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

`oma update mcp` tem suas próprias opções `--yes`, `--ci`, `--all` e `--vendor <vendors>`. Ela seleciona os servidores MCP de navegador suportados (Aside, Chrome DevTools ou Firefox DevTools) para os fornecedores selecionados ao nível do projeto.

### uninstall

Visualiza ou remove arquivos pertencentes ao OMA a partir da raiz de instalação selecionada :

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` lista as remoções sem modificar os arquivos. `--yes` ignora o prompt de confirmação. O comando preserva `oma-config.yaml`, `mcp.json` e os skills escritos por o usuário conforme a descrição registradoe de a comando. Se a visualização incluir um arquivo de que você ainda precisa, pare e guarde a saída do dry-run para análise.

### link

Regenera os arquivos nativos dos fornecedores a partir da fonte de verdade `.agents/` sem reinstalar.

```
oma link [vendors...] [--global]
```

**Exemplos :**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Sem `--global`, link destino `<cwd>/.agents/` ; com esta opção, il destino `~/.agents/` (ou `OMA_HOME`). Consulte [Instalação global](../guide/global-install.md).

**O que o comando faz :**
1. Reconstrói os arquivos nativos de agentes dos fornecedores a partir de `.agents/agents/`.
2. Atualiza os hooks e as configurações locais dos fornecedores selecionados.
3. Regenera os blocos de integração `CLAUDE.md`, `GEMINI.md` ou `AGENTS.md`.
4. Atualiza a vinculação MCP do Cursor e os links simbólicos das skills da CLI quando aplicável.

Use este comando depois de modificar `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` ou os definições de hooks.

**Comportamento dos modelos :**
- A delegação nativa para o mesmo fornecedor usa o modelo definido no arquivo de agente gerado para esse fornecedor.
- A delegação de fallback externa usa o `default_model` de cada fornecedor em `.agents/skills/oma-orchestration/config/cli-config.yaml`.

**Comportamento da delegação :**
- Se o fornecedor de destino corresponde ao ambiente de execução atual e esse ambiente suporta agentes nativos por função, o OMA usa delegação nativa.
- Caso contrário, o OMA recorre a `oma agent spawn`.

### setup (workflow)

O workflow `/setup` (invocado em uma sessão de agente) permite configurar interativamente o linguagem, os instalações CLI, os conexões MCP e a correspondência agent-CLI. Ele difere de `oma` (o instalador) : `/setup` configura uma instância já instalada.

---

## Surveillance e métricas

### dashboard

Inicia o dashboard do terminal para monitorar agentes em tempo real.

```
oma dashboard terminal
```

Nenhuma opção. Monitora `.agents/state/memories/` em o diretório atual (os projetos plus antigos usam em fallback `.serena/memories/`). A interface de caracteres de caixa exibe o estado das sessões, a tabela de agentes e o fluxo de atividade. Ela é atualizada a cada alteração de arquivo. Pressione `Ctrl+C` para sair.

O diretório de memórias pode ser substituído pela variável de ambiente `MEMORIES_DIR`.

**Exemplo :**
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

**Variáveis de ambiente :**

| Variable | Valor padrão | Descrição |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Porta do servidor HTTP/WebSocket |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Caminho do diretório de memórias (retorna a `{cwd}/.serena/memories` para os projetos plus antigos) |

**Exemplo :**
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats

Exibe as métricas de prodotividade.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe ao formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Métricas acompanhadas :**
- Nombre de sessões
- Skills usadas (com fréquence)
- Tarefas concluídas
- Duração total das sessões
- Arquivos modificados, linhas adicionadas, linhas removidas
- Timestamp da última atualização

**Telemetria de custos** (agregada em cada arquivo `session-cost-*.md` sob `.agents/state/memories/`) :
- Número total de tokens de entrada (approximation fundoée em os caractères do prompt, sem tokens de saída para o instant)
- Nombre total de delegações
- Estimativa em USD conforme uma tabela conservadora de preços por token de entrada e fornecedor (Claode 3 $/M, Codex 5 $/M, Gemini 0,3 $/M, Qwen 0 $/M, Cursor 5 $/M, Antigravity 0,3 $/M)
- Distribuição por fornecedor (tokens · delegações · USD)

A estimativa é um piso, não um valor fiel ao faturamento. Configure `session.quota_cap` em `.agents/oma-config.yaml` para impor orçamentos rígidos na execução ; consulte a page Pourquoi oh-my-agent em os guias de inicialização para o arsenal axé em a qualidade aoquel estes plafundos appartennent.

As métricas são armazenadas em `.agents/state/metrics.json` ; `.serena/metrics.json` é lido quando existe. Os dados são coletados das estatísticas do git e dos arquivos de memória.

**Exemplos :**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap

Resume o histórico de conversas das ferramentas de IA entre sessões Claode, Codex, Qwen e Cursor.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Opções :**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--window <period>` | Período : `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Date especifica (`YYYY-MM-DD`) ; prioritário em `--window` | |
| `--tool <tools>` | Filtre separado por dos vírgulas : `grok,claude,codex,qwen,cursor,antigravity` | todos |
| `--top <n>` | Exibe os N primeiros projetos/temas | |
| `--sort <metric>` | Trie conforme `count` ou `duration` | `count` |
| `--mermaid` | Exibe um diagrama de Gantt Mermaid | |
| `--graph` | Ouvre um grafo interativo em o navegador | |
| `--json` / `--output <format>` | Saída lisible por machinão | `text` |

**Exemplos :**

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

**Argumentos :**

| Argumento | Descrição | Valor padrão |
|:---------|:-----------|:--------|
| `window` | Período de analyse (por exemplo `7d`, `2w`, `1m`) | 7 últimos dias |

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe ao formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--interactive` | Mode interativo com entrada manual |
| `--compare` | Compara a período atual com a período précédente de mesmo doração |

**Contenu affiché :**
- Resumo publicável (métricas em uma linha)
- Tabela de resumo (commits, arquivos modificados, linhas adicionadas/removidas, contribuidores)
- Tendências em relação a última retrospectiva (se um instantâneo précédent existe)
- Ranking de contribuidores
- Distribuição horária dos commits (histogramme)
- Sessões de trabalho
- Distribuição dos tipos de commit (feat, fix, chore, etc.)
- Áreas sensíveis (arquivos os plus modificados)

**Exemplos :**
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

Lista as sessões de workflow OMA do projeto atual. A descoberta global explícita lista as sessões de todos os projetos no perfil local selecionado :

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` é somente leitura. Ele não pode ser combinado com o activation ou a maintenance de uma sessão. As leituras e gravações de sessões normais continuam limitadas ao projeto. As sessões históricas de outros repositórios devem primeiro ser migradas para o armazenamento HOME antes de aparecer em a lista agregada.

### profile

Gerencia perfis de armazenamento locais em `~/.oma/u/<slot>/`. Os slots são inteiros decimais não negativos ; eles são distintos das predefinições de modelos e das contas de login dos fornecedores.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` exibe a ativação do shell ; sua avaliação defimão `OMA_PROFILE` no shell atual. Executada sozinha, ela não modifica o shell parent, os aplicativos já executadoes ni um parâmetro CLI distinct por padrão. Os comandos da CLI e hooks de fornecedores iniciados no shell ativado herdam o mesmo perfil. O perfil padrão é `0` ; `OMA_STATE_HOME` substitui a raiz de armazenamento.
`profile run <slot> -- <command> [args...]` seleciona o perfil somente para este comando e seus filhos. O separador mantém as opções filhas como `--help` e `--json` attachées a a comando enfant.

---

## Gerenciamento dos agents

### agent spawn

Inicia um processo de agente secundário.

```
oma agent spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Argumentos :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `agent-id` | Sim | Tipo de agente. Um de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Sim | Descrição de a tarefa. Pode ser um texto inline ou um caminho de arquivo. |
| `session-id` | Sim | Identificador de sessão (formato `session-YYYYMMDD-HHMMSS`) |

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--vendor <vendor>` | Surcarga do fornecedor CLI : `antigravity`, `claude`, `codex`, `cursor`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Diretório de trabalho de o agente. Détecté automaticamente a partir de a configuração do monorepo se ele é omis. |
| `--isolation <mode>` | Mode de isolamento por execução. Atualmente suporta `worktree` : cria um worktree git a `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` em a branch `oma/{sessionId}/{agentId}` e y executa o agente. O worktree é mantido depois a fim ; os comandos de mesclagem ou de suppression são exibidos para uma revisão manual (nenhuma mesclagem automático). |
| `--read-only` | Limite o agente executado aos ferramentas non dostructifs e remove os opções de autoaprovação. Utilisé em interno por `oma skill eval --live` para os dois branchs de avaliação. |
| `--fallback-vendors <vendors>` | Ativa uma cadeia ordenada, separada por dos vírgulas, de ao plus trois fornecedores CLI configurados. A continuation exige um falha reconhecido lié ao quota, a a limitation de débit ou a uma pane transitoire, assim que um novo point de controle de transmission segura. |

**Resolução do fornecedor :** a opção `--vendor` tem prioridade, seguida pela a sobrescrita `agents:` em `oma-config.yaml`, e depois pelos valores padrão do perfil de agentes do `model_preset` ativo.

**Resolução do prompt :** se o argumento do prompt for o caminho de um arquivo existente, seu conteúdo é usado ; caso contrário, o argumento é tratado como texto inline. Os protocolos de execução específicos do fornecedor são adicionados automaticamente.

**Códigos de saída :**

| Code | Signification |
|:-----|:--------|
| `0` | O processo do fornecedor foi  concluído com o código 0 e um artefato de resultado de sessão existe em o espaço de trabalho. |
| `3` | O processo do fornecedor foi  concluído com o código 0 mas não tem escreve nenhum artefato de resultado em o espaço de trabalho (por exemplo agy escreve em sa próprio raiz de confiança em vez de `-w`). Um evento `blocker.raised` é adicionado a a rastreio de sessão e `agent status` exibe `no-artifact`. O execução não deve pas être considerado como concluído. |
| outro | O processo do fornecedor lui-mesmo a échoué ; son código de saída é propagé. |

**Exemplos :**
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

**Fallback entre fornecedores :** os candidatos de fallback devem ter uma entrada na configuração instalada da CLI. Cada tentativa usa a configuração de modelo do fornecedor de destino e passa por os controles de quota de sessão existentes. O proxy multiforncedor `pi` fica excluído desta primeira função de fallback. Nenhum novo identificador de fornecedor ou rota de API paga é criado.

Quando o fallback está ativado, a tarefa recebe a instrução de preparar um registro de handoff seguro, próprio a a execução, sob `.agents/results/`. Um sucessor lê esse registro e verifica o workspace antes de continuar o trabalho restante. Uma quota esgotada sem checkpoint utilizável para com um registro needs-review. Um cancelamento, uma falha comum ou uma execução concluída não dispara uma nova tentativa. `--read-only` não dispensa essa exigência de checkpoint.

Os eventos da sessão registram o motivo da transição e os fornecedores de origem e destino ; cada tentativa tem sua própria identidade de execução e aponta para a anterior. Isso se aplica aos subprocessos iniciados por `oma agent spawn` ; o comando não altera automaticamente uma conversaa interativa existente em uma aplicativo fornecedor. Omitir `--fallback-vendors` mantém a execução normal com um único fornecedor.

### agent status

Verifica o estado de um ou mas agentes secundários.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Argumentos :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `session-id` | Sim | Identificador de sessão a verificar. |
| `agent-ids` | Não | Lista de identificadores de agentes separados por dos espaestes. Se ela é omise, nenhuma saída não é produze. |

**Opções :**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Caminho raiz utilisé para os controles de memória | Diretório atual |

**Valores de estado :**
- `completed` : o arquivo de resultado existe (com um em-tête de estado opcional).
- `running` : o arquivo PID existe e o processo está ativo.
- `crashed` : o arquivo PID existe, mas o processo está parado, ou nenhum arquivo PID/resultado não tem été trouvé.
- `no-artifact` : o processo fornecedor foi  concluído com o código 0 mas não tem escreve nenhum artefato de resultado em o espaço de trabalho (escrita silenciosament redirigée — veja o código de saída `3` de `agent spawn`). Trate como uma execução com falha.

**Formato de saída :** uma linha por agent : `{agent-id}:{status}`.

**Exemplos :**
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
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Argumentos :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `tasks` | Sim | Soit o caminho de um arquivo de tarefas YAML, seja dos especificações inline com `--inline` |

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--vendor <vendor>` | Surcarga do fornecedor CLI para todos os agents executados. |
| `-i, --inline` | Mode inline : spécifie os tarefas como argumentos `agent:task[:workspace]`. |
| `--no-wait` | Mode em segundo plano (lance os agents e retorna immédiatement). |

**Formato do arquivo YAML de tarefas :**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Formato das tarefas inline :** `agent:task` ou `agent:task:workspace` (o workspace deve começar por `./` ou `/`).

**Diretório dos resultados :** `.agents/results/parallel-{timestamp}/` contient os arquivos logs de cada agent.

**Exemplos :**
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

Executa uma revisão de código com uma CLI de IA externa (codex, claode, qwen ou grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--vendor <vendor>` | Fornecedor CLI : `codex`, `claude`, `qwen` ou `grok`. Por padrão, `codex` quando o fornecedor resolvido não é pas pris em carga. |
| `-p, --prompt <prompt>` | Prompt de revisão personnalisé. Sem esta opção, um prompt de revisão por padrão é utilisé. |
| `-w, --workspace <path>` | Caminho a examiner. Por padrão, o diretório atual. |
| `--no-uncommitted` | Ignora a revisão dos alterações non commitées. Com esta opção, únicoes os alterações commitées em a sessão são examinées. |

**O que o comando faz :**
- Detecta automaticamente o identificador de sessão atual a partir de o ambiente ou o activité git récente.
- Para `codex`, usa o subcomando nativo `codex review`.
- Para `claude` e `qwen`, monta uma chamada baseada em um prompt e inicia a CLI com o prompt de revisão.
- Por padrão, examina as alterações não commitadas no diretório de trabalho.
- Com `--no-uncommitted`, limita a revisão às alterações commitadas na sessão.

**Exemplos :**
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

Associa um contrato de objetoivo a um workflow persistente ativo (orchestrate, ultrawork, work, ralph). O contrato é aplicado mecanicamente pelo hook Stop do modo persistente : o encerramento deixa de depender apenas do julgamento do modelo.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--gate <keyword>` | Garde de parada determinístico : `typecheck`, `test` ou `lint`. Se mappe para o script de mesmo nomee em package.json, executado como tabela argv sem shell. Tant qu'ela é défimie, o hook Stop não autoriza a fim do workflow que se ce script aprovado ; em cas de falha, il bloque com a fim de a saída para permitetre a correction. Os comandos libres são recusadas — a valor de a proteção réside em um arquivo de estado modifiable por o agente, e executar dos cadeias arbitraires a partir de ce arquivo contornarait a couche de autorização. |
| `--budget-minutes <n>` | Budget em temps réel medição a partir de o activation do workflow. Uma fois dépassé, o hook Stop désactive o workflow e autoriza um parada honnête e partel (verdict machinão registrado como `gate.failed` com `gate: "budget"` em a rastreio dos eventos de sessão). |
| `--description <text>` | Descrição humainão de o objectif. Informatoif somente. |
| `--workflow <name>` | Workflow ciblé quando ele y em a vários persistants. |
| `--session <id>` | Suffixa de identificador de sessão do arquivo de estado. |

**Notas de comportement :**
- Gate aprovada → o workflow é desativado, `gate.passed` é émis e a parada é autorizada.
- Falha do gate e estouro do prazo (plafundo strict de 60 s) ambos contam no limite de reforços (5) ; um gate que falha continuamente não pode bloquear paradas indefinidamente. L'expiration de péremption a 2 heures permanece o último filet de segurança.
- Sem contrato de objetoivo, o mode persistant comporta-se exatamente como antes (somente os prompts de renforcement s'appliquent) : o contrato é entièrement opcional.

**Exemplos :**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Agents planifiés

### schedule create

Registra um job de agente agendado. Exatamente uma das opções `--cron` e `--every` é obrigatória.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Argumentos :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `agent-id` | Sim | Tipo de agente : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Sim | Descrição de a tarefa transmise a o agente ao moment do disparament |

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--cron "<expr>"` | Expression cron a 5 champs (por exemplo `"0 9 * * *"`). Mutuelament exclusive com `--every`. |
| `--every "<phrase>"` | Intervalle em linguagem naturel : `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Arrondi a o étape exprimable por cron a plus proche, com affichage de uma note. Mutuelament exclusive com `--cron`. |
| `--vendor <vendor>` | Surcarga do fornecedor CLI transmise a `oma agent spawn` : `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Détection automático por padrão. |
| `-w, --workspace <path>` | Diretório de trabalho de o agente. Por padrão, o diretório atual ao moment de o enregistrement. |
| `--once` | Mode a execução unique : se dispara uma fois, depois se remove. |
| `--expires-after <duration>` | Expire automaticamente a tarefa récurrente depois N dias (`0` = indéfimi). |
| `--env <KEY1,KEY2>` | Capture os variables de ambiente nomeemées em `~/.agents/schedule/env/<id>` (0600) para injection a a execução. Seules os chaves listées são capturées, nunca tout o ambiente. |

**O que o comando faz :**
1. Analisa e valida a expressão cron (ou converte a frase `--every` em cron).
2. Grava a tarefa em `~/.agents/schedule/schedules.json` (manifesto global, permissions 0600).
3. Registra a tarefa no agendador do sistema (laonchd / systemd --user / schtasks). A tarefa do sistema chama `oma schedule run <id>` a o intervalle configurado.

**Exemplos :**
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

Consulte o [guia dos agents planifiés](../guide/scheduled-agents.md) para o parcours complet.

### schedule list

Lista todos os jobs agendados de todos os projetos, regroupées por projeto, com o estado de drift do sistema operacional.

```
oma schedule list [--json]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe ao formato JSON |

**Estados de drift :** `synced` (manifesto e sistema consistentes), `missing-in-os` (execute `schedule sync` para reparar), `orphan-in-os` (o sistema possède uma tarefa absente do manifesto ; execute `schedule sync --prune` para removê-a).

**Exemplos :**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete

Remove um job agendado do manifesto e do agendador do sistema.

```
oma schedule delete <id>
```

**Argumentos :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `id` | Sim | Identificador de tarefa fourni por `schedule list` (formato : `sch_<base32-12>`) |

**Exemplo :**
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Executa um job agendado pelo identificador. Este é o ponto de entrada chamado pelo agendador do sistema no momento do disparo. Este comando normalmente não é executado manualmente, mas permite depurar uma tarefa.

```
oma schedule run <id>
```

**O que o comando faz :**
1. Procura `<id>` em o manifesto (sai com código diferente de zero se ele é não encontrado).
2. Carrega as variáveis de ambiente capturadas a partir de `~/.agents/schedule/env/<id>` e as injeta.
3. Chama `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`.
4. Grava o resultado em `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Atualiza `lastFiredAt` em o manifesto ; remove-se quando a tarefa está no modo `--once`.
6. Falha explaquitamente quando a autenticação expira : sai com código diferente de zero e exibe `re-auth required: <vendor>` em stderr. Nunca tem sucesso silenciosamente.

**Exemplo :**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Ressincroniza o manifesto com o agendador do sistema. Repara drifts após uma migração do sistema ou redefinição do agendador.

```
oma schedule sync [--prune]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--prune` | Remove também os tarefas sistema absentes do manifesto (orphan-in-os). Sem `--prune`, os tarefas órfãoes são signalées mas mantidos. |

**Exemplos :**
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Gerenciamento de a memória

### memory init

Inicializa o esquema do armazenamento de memória de coordenação.

```
oma memory init [--json] [--output <format>] [--force]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe ao formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |
| `--force` | Substitui os arquivos de esquema vidos ou existentes |

**O que o comando faz :** cria a estrutura de diretórios `.agents/state/memories/` e os arquivos de esquema initiaox utilisés por os agents e os workflows para lire e escrever o estado de coordination.

**Exemplos :**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Intégrations e utilitaires

### auth status

Verifica o estado de autenticação de todos os CLI pris em carga.

```
oma auth status [--json] [--output <format>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe ao formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Verificações :** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claode CLI, Codex CLI, Cursor CLI, Qwen CLI.

**Exemplos :**
```bash
oma auth status
oma auth status --json
```

### bridge

Fait transiter o protocole MCP stdio para um servidor Serena compartilhado por projeto.

```
oma bridge [url] [--context <name>]
```

**Argumentos :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `url` | Não | Se connecte a um endpoint gerenciado por o chamador em vez de resolver um daemon compartilhado |
| `--context` | Não | Contexto Serena do daemon (por padrão `ide`) ; os daemons são indexés por ce contexto |

**O que o comando faz :** é ce qu'executa por padrão o entrada MCP Serena de cada fornecedor — vous não a execute pas manuelament. O transport stdio de Serena donnão a cada sessão de agente son próprio processo Python e uma pilha complète de servidor de linguagem, se bien que o custo aumente com o número de sessões abertoes. O bridge ramènão ce custo a um servidor por projeto : il resolve a raiz do projeto a partir de o diretório de trabalho, démarre um servidor HTTP Serena épinglé por `--project` dorantequ'nenhum servidor não tourne, depois relaie a sessão para celui-ci.

L'épinglage de `--project` é important : um servidor démarré sem esta opção expõe o ferramenta `activate_project`, que permite a não importe quela sessão de changer o projeto sob-jacent de todas os outros.

**Architecture :**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Cycle de vie :** a primeira sessão démarre o servidor, os suivantes o reutilizam e cada proxy s'enregistre como client. Quando a mas recente sessão se détache, o servidor permanece chaod dorante 10 minutos — um reinicialização se rattache — depois il é paradaé ao prochain inicialização de um bridge. Se o servidor compartilhado é inacessível, o proxy retorna a uma instance Serena stdio local a a sessão.

Désactivez ce comportement com `serena.mode: stdio` em `.agents/oma-config.yaml`.

**Exemplo :**
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Verifica a saída de um agent secondaire conforme os critères attendos.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**Argumentos de `verify agent` :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `agent-type` | Sim | Um de : `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Opções :**

| Opção | Descrição | Valor padrão |
|:--------|:-----------|:--------|
| `-w, --workspace <path>` | Espace de trabalho a verificar | Diretório atual |
| `--json` | Exibe ao formato JSON | |
| `--output <format>` | Formato de saída (`text` ou `json`) | |

**O que o comando faz :** executa o script de verificação do type de agente indiqué, em contrôlant a aprovadoe de a compilation, os resultados dos tests e o respect de a abrangência.

`verify triggers` mesmo a específicosion do detectaor de palavras-chave em um corpus de prompts annoté. Os seuils em porcentagem são dos proteções. O caminho registrado é `verify agent` ; a forma antiga ao nível raiz pode encore aparecer em o ajuda de compatibilité.

**Verificações comums (todos os types de agentes) :**
- **Verifica de abrangência** : lit os abrangências de tarefa em `.agents/results/plan-{sessionId}.json`. Compara os arquivos modificados por `git diff` aos motifs de abrangência défimis. Falha se dos arquivos fora de a abrangência attribuée a o agente são modificados.
- **Précontrole de charte** : verifica que `result-{agent}.md` contient um bloc `CHARTER_CHECK:` correctement rempli, sem espace reservado non renseigné.
- **Secrets codés em dor** : analyse os arquivos `.py`, `.ts`, `.tsx`, `.js`, `.dart` a a pesquisa de motifs como `password = "..."` e `api_key = "..."` (os arquivos de test e de exemplo são exclus).
- **Commentaires TODO/FIXME** : compte os comentários `TODO`, `FIXME`, `HACK` e `XXX` (avisa se o um de eux é trouvé).

**Verificações próprios a cada agent :**

| Tipo de agente | Verificações supplémentaires |
|:-----------|:-----------------|
| `backend` | Validação de syntaxe Python (`py_compile`), detecção de injection SQL (f-string + palavras-chave SQL), execução dos tests Python (`pytest`) |
| `frontend` | Compilation TipoScript (`tsc --noEmit`), detecção dos styles inline (`style={{`), usage do type `any` (falha ao-delà de 3), tests frontend (`vitest`) |
| `mobile` | Analisa Flutter/Dart (`flutter analyze` ou `dart analyze`), tests Flutter (`flutter test`) |
| `qa` | Vérification de autocontrole |
| `debug` | Executa os tests Python ou frontend conforme o type de projeto detectado |
| `pm` | Verifica que `.agents/results/plan-{sessionId}.json` existe e contient um JSON válido |

**Formato de saída :**
Cada controle informa `PASS`, `FAIL`, `WARN` ou `SKIP` com um message detalhelé. O resultado global é `ok: true` somente se nenhum controle não falha.

**Exemplos :**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook

Distribue um evento de hook fornecedor via o roteador centralizado dos hooks oma (design 019). C'é o ABI canônico chamada por o envelope `oma-hook.sh` gerada para cada fornecedor. A comando pode aosse servir a depurar ou testar isolément dos cadeias de gerenciadors.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Opções :**

| Opção | Obrigatório | Descrição |
|:-----|:-----------|:-----------|
| `--vendor <v>` | Sim | Identité do fornecedor. Um de : `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro` ou `qwen`. (O fornecedor `pi` não é **pas** válido aqui : il usa o bridge `installPiExtension` em processo em vez de `oma hook run`.) |
| `--event <e>` | Sim | Nom de o evento de hook nativo registrado em os parâmetros do fornecedor (por exemplo `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | Não | Nom de ferramenta ou matcher opcional transmis por o enregistrement do hook (por exemplo `Bash`) |

**Contrat stdin / stdout :**
- **stdin** : payload JSON nativo do fornecedor (o mesmo objeto que celui transmis aos processo de hook).
- **stdout** : JSON em o dialeto do fornecedor (ou texto brut para os prompts kiro) quando um gerenciador s'ativa ; vide dorantequ'nenhum gerenciador não produz de saída.
- **código de saída** : sempre `0` (tolérance aos pannes — os erros são escritos em stderr e o agente não é nunca bloqueado).

**Flux dos dados a a execução :**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Déboguer dos cadeias de gerenciadors isolément :**

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

Uma saída stdout vide signifie que a cadeia não tem rien fait para cet evento. Um objeto JSON em stdout é o dialeto do fornecedor que recevrait a sessão de agente.

**Notas de abrangência :**
- Os entradas `statusLine`/hud não passant pas por `oma hook run` (o affichage do caminho critique permanece em um caminho `bun` direto).
- O fornecedor pi usa son bridge em processo `installPiExtension`, e non `oma hook run`.

Consulte `cli/commands/hook/command.ts` para o implémentation do roteador (désignée em interno como « design 019 ») e `cli/commands/hook/probe/` para a matriz de compatibilité por fornecedor.

**Exemplos :**
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

Sonda a compatibilité dos hooks por fornecedor e exibe uma matriz de cobertura.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Opções :**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--vendor <list>` | Fornecedores a verificar, separados por dos vírgulas | Todos os fornecedores pris em carga |
| `--output <fmt>` | Formato de saída : `text`, `md` ou `json` | `text` |
| `--hooks-dir <dir>` | Substitui o diretório `.agents/hooks/core` | Détecté automaticamente |

**Este que a comando controle :** para cada fornecedor, verifica se os scripts de hook fundoamentaox (`keyword-detector`, `persistent-mode`, etc.) são presentes e se o JSON de variante mappe correctement os eventos para os cadeias de gerenciadors. O código de saída vaot `1` se um fornecedor informa o estado `failed`.

**Exemplos :**
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

### vaolt

Gerencia os chaves API e outros secrets em o trousseao do sistema (Trousseao macOS, Secret Service Linux ou Gestionnaire de identificadores Windows), com o appui de `@napi-rs/keyring`. Os valores não apparaissent nunca em o histórico shell ni em os arquivos de ambiente ; somente os nomes de chaves são suivis em `~/.config/oma/vault-index.json` afim que `oma vault list` depoisse os énumérer sem expõer os secrets.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Subcomandos :**

| Sob-comando | Descrição |
|:------------|:-----------|
| `store <name>` | Solaquita uma valor secrète (entrada masquée) e o escreve sob `name` em o trousseao sistema. `--value <value>` aceita uma valor inline para um usage non interativo (visible em o histórico shell ; préférez o prompt). |
| `get <name>` | Exibe a valor stockée em stdout sem décoration afim de pouveja o usar em os shells : `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Sort com o código `2` se a chave não existe pas. |
| `list` | Lista os nomes de chaves stockés com seu horodatage `createdAt`. Os valores não são nunca exibidos. |
| `rm <name>` | Remove o secret do trousseao e de o índice. |

**Règles dos nomes de chaves :** 1 a 64 caractères parmi `[A-Za-z0-9._-]`. Exemplos : `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Dépendance nativo :** o modole nativo `@napi-rs/keyring` é carregado a a pergunta ; se ele não pode pas être carregado (por exemplo em Linux sem interface gráfica com `libsecret` ou `gnome-keyring`), a comando exibe uma erro explícito com uma indicação de instalação em vez de um fallback silencioso.

**Exemplos :**
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

Nettoie os processo de agentes secondaires órfãos e os arquivos temporaires.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--dry-run` | Exibe ce que serait nettoyé sem modificar os arquivos |
| `-y, --yes` | Ignora os prompts de confirmação e nettoie tout |
| `--json` | Exibe ao formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Este que a comando nettoie :**
- Arquivos PID órfãos em o diretório temporaire sistema (`/tmp/subagent-*.pid`).
- Arquivos logs órfãos (`/tmp/subagent-*.log`).

- **Serveurs de linguagem Serena órfãos** — quando um client MCP (por exemplo Claode) se termina, son `serena start-mcp-server` é réadopté por init e ses processos filhos LSP (`tsserver`, `pyright`, …, dos centaines de Mo) continuent de tourner sem client. Ils são recuperados aqui. O cas *inativo mas encore attaché* é traité séparément por [`serena reap`](#serena).
- Diretórios Gemini Antigravity (brain, implaquit, knowledge) sob `.gemini/antigravity/`.

**Exemplos :**
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

Obtém a memória dos servidors de linguagem Serena próprios a cada projeto. Serena lance uma pilha LSP (`tsserver`, `pyright`, …, aproximadamente 300 Mo) para cada projeto aberto e a mantém ativa dorante qualquer a sessão ; vários projetos abertos font rápidament monter esta consumo. O reaper para os processos filhos LSP inativos ; Serena se se recupera e os reinicia ao prochain chamada de ferramenta, sem reinicialização.

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Subcomandos :**

| Comando | Descrição |
|:--------|:-----------|
| `serena reap` | Obtém maintenant os LSP inativos. Uma execução interativo agit sempre ; `--quiet` (caminho planifié) respecte o activation opcional `enabled`. |
| `serena reap --dry-run` | Visualiza os destinos e a memória que serait libérée — nenhum processo não é paradaé. |
| `serena reaper enable` | Instala uma tarefa em segundo plano que executa `serena reap --quiet` todas os 5 minutos (laonchd / minuteur systemd / Planificateur de tarefas Windows). |
| `serena reaper disable` | Remove a tarefa em segundo plano. |

**Politique :** `lru` (por padrão) mantém ativos os projetos os plus récemment utilisés, ao número de `keepWarm`, e recupera os outros ; `idle` recupera tout projeto inativo a partir de plus de `idleMinutes`. Uma fenêtre `graceSeconds` protège os chamadas de ferramentas em cours.

**Configuração** (`.agents/oma-config.yaml`, activation opcional — dosabilitada por padrão) :

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Os diagnostics (estado KEEP/REAP por projeto e origem do signal de activité) são affichés por [`oma doctor`](#doctor). Os LSP Serena órfãos (client mort) são recuperados por [`oma cleanup`](#cleanup) quel que seja ce parâmetro.

**Exemplos :**
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

`viz` é um alias intégré de `visualize`.

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe ao formato JSON |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**O que o comando faz :** analyse a estrutura do projeto e gera um grafo de dependências mostrando os relações entre skills, agents, workflows e recursos partagées.

**Exemplos :**
```bash
oma visualize
oma viz --json
```

### search

Primitivas mecânicas de pesquisa que cobrem busca, metadados, RSS, mídia, código e avaliação de confiança. Alias : `oma s`. Todos os subcomandos escrevem JSON em stdout (um objeto por linha, ou uma saída mise em forme com `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcomandos :**

| Sob-comando | Função |
|:-----------|:--------|
| `fetch <url>` | Obtém uma URL via um pipeline a escalade automático (api → probe → impersonate → browser → archive) |
| `api <url>` | Obtém via o gerenciador de API de plataforma correspondente (fase 0) |
| `api:search <query>` | Diffuse uma pesquisa por palavras-chave para os plataformas compatibles (`--platforms <list>`) |
| `meta <url>` | Extrai os métadados OGP / JSON-LD / Schema.org |
| `rss <url>` | Découvre e analyse um fluxo RSS / Atom |
| `rss:google <query>` | Construit uma URL RSS Google News para uma consulta |
| `media <url>` | Extrai os métadados multimédias via `yt-dlp` (1858 sites) |
| `archive <url>` | Obtém via o fallback AMP / archive.today / Wayback |
| `trust <domain>` | Resolve o nível ou score de confiança de um domainão |
| `code <query>` | Procura do código via `gh` (GitHub) ou `glab` (GitLab) |
| `doctor` | Verifica os dependências (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Opções comuns dos subcomandos de URL/consulta :**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Délai por stratégie | `15` (`30` para `media`) |
| `--locale <value>` | En-tête `Accept-Language` | `en-US,en;q=0.9` |
| `--pretty` | Atualiza em forme a saída JSON | `false` |

**Opções adicionais de `fetch` :**

| Opção | Descrição |
|:-----|:-----------|
| `--only <strategies>` | Stratégies a executar, separadas por dos vírgulas (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Stratégies a ignorer, separadas por dos vírgulas |
| `--include-archive` | Adaçãoa a stratégie de archive como último fallback |

**Opções adicionais de `media` :**

| Opção | Descrição |
|:-----|:-----------|
| `--subs` | Escreve os sob-titres |
| `--sub-lang <list>` | Langues dos sob-titres, separadas por dos vírgulas (por padrão : `en`) |
| `--format <spec>` | Spécification de formato yt-dlp |

**Opções adicionais de `code` :**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Hôte | `github` |
| `--language <lang>` | Filtre de linguagem | |
| `--repo <owner/repo>` | Limite a um repositório | |
| `--limit <n>` | Nombre maximal de resultados | `20` |

**Códigos de saída :** `0` OK, `1` erro, `2` bloqueado, `3` não encontrado, `4` entrada inválido, `5` autenticação obrigatórioe, `6` tempo limite excedido.

**Exemplos :**

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

O registro também expõe os seguintes aoxiliares explícitos de descoberta :

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

`search` emite do JSON mesmo sem `--json`. `--pretty` não modifica que a apresentação ; il não modifica pas o esquema do resultado. `search web` aceita `--provider`, `--limit`, `--timeout`, `--json` e `--pretty`. Se uma stratégie é bloqueadoe ou que uma dependência manque, use o tabela dos códigos de saída ci-dossus e reexecute `oma search doctor` antes de changer de stratégie.

### image

Gera imagens de IA com vários fornecedores e delegação paralela sensível a autenticação. Alias : `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcomandos :**

| Sob-comando | Função |
|:-----------|:--------|
| `generate <prompt...>` | Gera dos imagens via `pollinations` (fluxo/zimage, gratuito), `codex` (gpt-image-2 via OAuth ChatGPT) ou `antigravity` (nano-banana via o assinatura Gemini Code Assist, sem chave) |
| `doctor` | Verifica a autenticação e o estado de instalação para cada fornecedor |
| `vendor list` | Lista os fornecedores registrados e os modelos pris em carga |

**Opções de `image generate` :**

| Opção | Descrição | Valor padrão |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | Toute valor `WxH` cujo os bords são divisibles por 16, de 16 a 3840, e o relatório de aspect de 1:3 a 3:1 ; `auto` é aosse accepté. | Valor padrão do fornecedor |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | Valor padrão do fornecedor |
| `-n, --count <n>` | Nombre de imagens (1..5) | `1` |
| `--output-dir <path>` | Diretório de saída | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | Autoriza os caminhos de saída fora de `$PWD` | `false` |
| `--model <name>` | Surcarga de modelo próprio ao fornecedor ; ignorada por `antigravity`, cujo o modelo é opaco. | Valor padrão do fornecedor |
| `--timeout <duration>` | Délai por image | Valor padrão do fornecedor |
| `-r, --reference <path>` | Image(s) de referência ; repetível ou separada por dos vírgulas. Pris em carga por `codex` e `antigravity`, refusé por `pollinations`. Cada arquivo ≤5 Mo em PNG/JPEG/GIF/WebP (validação dos bytes magiques), 10 ao máximo. | |
| `-y, --yes` | Ignora a confirmação de custo | `false` |
| `--no-prompt-in-manifest` | Armazena o SHA256 do prompt ao lieu do texto brut | `false` |
| `--dry-run` | Exibe o plan e o estimation do custo ; não executa rien | `false` |
| `--output <format>` | Formato de saída CLI : `text` \| `json` | `text` |

Cada execução grava um `manifest.json` ao lado das imagens geradas ; ele registra o fornecedor, o modelo, o prompt (ou son hash), a tamanho, a qualidade e o custo.

**Exemplos :**

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

Planeja, escreve e produz vídeos curtos, explicativos e de demonstração. `generate` cria o brief, o script, a spécification de renderização e o manifesto de execução ; uma composition e um compositor função são neestessários antes de prodoire um véritable MP4.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` aceita `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor remotion|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` e `--capture-stop duration:<seconds>|selector:<css>`. Use `--source web --url <url>` para uma captura do navegador ; `--source file` é o valor padrão. `--output-dir` escolhe a raiz de execução, `--allow-external-output` autoriza um caminho fora de `$PWD`, `--max-usd` defimão um teto de custo, `--seed` estabiliza as entradas de planejamento e `--no-brief-in-manifest` armazena um hash do brief em vez do texto. `--dry-run` para após o planejamento. `--output text|json` controla o envelope da CLI.

`doctor` verifica a cadeia de ferramentas Remotion/MPT em cache e aceita `--install`, `--upgrade`, `--install-mpt` e `--install-strudel`. `provider list` informa a disponibilidade dos fornecedores e o estado das chaves. `compose` cria ou atualiza a composição da execução e exibe o contrato de autoria ; `render` verifica os types, produz o renderização e verifica a saída. A aosência do compositor, da composição ou de uma dependência da cadeia de ferramentas é um erro. O caminho reservado aos tests `OMA_VIDEO_MOCK=1` é o único mode de substituição ; uma execução normal não substitue nunca um MP4 texto ou minuscule.

Uma saída JSON bem-sucedida contém `runDir`, `manifestPath`, `scriptPath` e `renderSpecPath` ; o manifesto registra os fornecedores selecionados, os entradas e os recursos geradas. Depois `compose`, escreva a composição gerada conforme seu `AUTHORING.md`, e execute novamente `render`. Se uma chave de fornecedor estiver indisponível, execute `oma video doctor` ; se a captura falhar, verificaz o URL, o sélecteur, o appareil e o tempo limite ; se a renderização falhar, corrigez os diagnostics de composition antes de réessayer.

### star

Adaçãoa uma estrela a oh-my-agent em GitHub.

```
oma star
```

Nenhumão opção. O CLI `gh` deve être instalado e autenticado. A comando adiciona uma estrela ao repositório `first-fluke/oh-my-agent`.

**Exemplo :**
```bash
oma star
```

### doscribe

Descreve os comandos da CLI em JSON para introspecção em tempo de execução.

```
oma describe [command-path]
```

**Argumentos :**

| Argumento | Obrigatório | Descrição |
|:---------|:---------|:-----------|
| `command-path` | Não | Comando a descrever. Se omis, descreve o programme raiz. |

**O que o comando faz :** exibe um objetoo JSON contendo o nomee, a descrição, os argumentos, os opções e os sob-comandos de a comando. Agentes de IA usam-no para entender os recursos disponíveis da CLI.

**Exemplos :**
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

Estes famílias são utiles quando a saída é um artefato de pesquisa, uma apresentação ou um relatório. Elas permanecem intencionalmente curtas aqui ; os guias relacionados explicam o workflow e os escolha de recuperação.

### intel suggest

Propõe trabalho de prodoto a partir de sinais do mercado e do repositório :

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` fornece a configuração complète. Para uma execução pontual, `--topic`, `--target`, `--repos`, `--since` e `--last-commits` escolhem os entradas. `--output-dir` controle os relatórios locais e `--fixture` fornece um conjunto JSON local para uma revisão determinístico. `--create-issue` cria os candidatos acceptés em GitHub e exige uma destino configuradoe assim que uma confirmação ; associez `--base-repo <owner/name>` para seleçãoner o repositório e não use `--yes` que em um contexto de aotomatisation já approuvé. `--dry-run` e `--json` são dos caminhos de inspection seguros.

### market

A família market delega para o engine upstream `last30days` resolvido. Comece pelo gate e pelo resolvedor :

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` retorna o código 2 com uma reformulação para os temas problemáticos por os palavras-chave ou amplos demais ; `--force` contorna esta proteção somente se o usuário quer explaquitamente parasuivre. `market resolve` aceita `--refresh` e `--offline`, enquanto `market update` atualiza o cache do engine gerenciado. `market run` repassa ses argumentos restantes ao engine Python resolvido e adiciona `--save-dir` a partir de `market.save_dir` quando um tema é fourni. Leia [Procura de marché](../guide/market-research.md) antes de escolher os opções posterior ; sa saída `--help` pertence ao engine gerenciado e evolui com a versão.

### docs

Use a família docs para examinar o drift documental. Os comandos produzem relatórios ; `sync` lista candidatos para o agente host e não modifica arquivos.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` controle os referências locais e regenera `docs/generated/doc-refs.json` ; `--urls-sync` attend o passage URL opcional de `lychee`. `sync` usa por padrão os alterações indexées, depois `HEAD~1..HEAD`, e emite dos candidatos `{doc, changedFiles, matchedRefs}`. `i18n` informa a drift estruturalle entre o inglês e a tradução, enquanto `lint` informa os problemas de style dos documents traduzidos. Nenhumão de estes sob-comandos não modifica automaticamente a documentation.

### slide

`oma slide` trabalha em um diretório de fragmentos HTML de slidos em 1920×1080. O menor fluxo funcional é :

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

O gate de qualidade sinaliza os débordements, chevaochements e problemas de tamanho de police. Use `--slide <file>` para uma verificação em uma únicoe diapositive e `--report-file <path>` com a saída JSON. Exporta somente após validar :

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

A exportação PPTX é experimental e repose em dos trames rasterizadas. `slide import pptx <file>`, `slide asset fetch-video <url>` e `slide style list|preview|get <slug>` couvrent os recursos de entrada e a descoberta de styles. Use [oma-slide](../guide/content-and-research.md#slides-and-presentations) para os escolha de escrita e os contraintes de scènão fixa.

### scholar

Pesquisa artigos e metadados de trabalhos e valida sidecars antes do compartilhamento :

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` pode limiter os resultados OpenAlex com `--year-min` e forcer os fornecedores de fallback com `--always-fallback`. `get --section` aceita `statements`, `evidence`, `relations`, `artifacts` ou `citation`. `lint --lenient` transforme os referências croisées pendantes em avertissements ; `--fail-on-warning` fait falhar a CI em cas de avertissement. A CLI consulta primeiro o Knows, depois os fallbacks OpenAlex e Semantic Scholar ; ela não envia sidecars upstream.

### explain

`/explain` é o workflow de autoria. O CLI válido os artefatos já criados :

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Passez um arquivo ou `--input-dir`, nunca os dois. A validação cobre o contrato HTML autônomo e sinaliza falhas legíveis por máquina ; ela não avalia pas o exactitude de o explicação. Consulte [Explicateur de código](../guide/code-explainer.md).

### diagram

Resolva o engine antes que um workflow emita um diagrama estrutural :

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` aceita `--engine auto|archify|mermaid`, `--refresh` e `--offline`. `diagram update` atualiza a copie archify gerenciada. `diagram archify` repassa os argumentos restantes a o exécutable posterior resolvido e propage son código de saída. Mermaid continua sendo a fonte de verdade Markdown ; o HTML é um artefato derivado. Consulte [Motor de diagramas](../guide/diagram-engine.md).

## Inspection de o estado, dos modelos e de a memória

As famílias seguintes expõem o estado persistente dos workflows e os diagnósticos de modelos e fornecedores. Prefira `--dry-run` para os actions de type nettoyage e `--json` quando outro programa consumir o resultado.

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` registra um evento L1 com uma categoria e metadados explícitos da sessão. `state migrate` move sessões históricas para o perfil selecionado. `state repair` repara arquivos de estado malformados. `state decisions list` e `state inject-log list|get` inspecionant os décisions obrigatórios e os entradas de aodit dos injections. `state activate`, `state archive` e `state purge` são ações explícitas ; os antigos indicadores booléens são rejetés. Arquive ou faça limpeza somente após examinar um dry-run, pois esses comandos modificam o estado local.

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` compara o registro com as listas ao vivo dos fornecedores e pode sondar novos candidatos. `model probe` testa um slug na CLI do fornecedor. `model propose` produz um patch `models:` para `oma-config` ; use `--write` somente se vous voulez modificar a configuração. A disponibilidade do fornecedor e a quota podem fazer as sondagens falharem mesmo quando uma entrada do registro é válido.

### agent evidence commands

As execuções nativas de agentes seguem uma sequência apoiada por evidências :

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` carrega o contexto selecionado pelo grafo ; `begin` inicia uma execução e exibe um ID gerado e um caminho de claim ; `verify` recebe esse ID e executa as verificações fixadas (`--required`), ou as restringe com `--affected` ; `finish` recebe o ID e o caminho do arquivo de reivindicação. `agent resume --dry-run` informa os tarefas prontos e reutilizáveis, enquanto `agent resume --max-attempts <n>` só tenta novamente tarefas autorizadas pelo plano. Consulte [Resultados e reprise dos agents](../guide/agent-results-and-resume.md) para o formato do plano e do claim. Estes comandos appartennent ao contrato de execução OMA ; o trabalho usuário ordinaire pode usar `agent spawn`, `agent parallel` ou `agent review`.

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` configura credenciais de conexão Honcho ou embedding ; `--dry-run` visualiza os destinos sem ler nem gravar chaves. `memory setup` prepara um endpoint AgentMemory e pode opcionalmente instalá-lo ou inaquiá-lo com `--install` ou `--start`. `memory daemon` e `memory service` gèrent o intégration com um processo local ou um serviço sistema. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade` e `memory gc` são ações de manutenção ; inspecionão a saída JSON ou o dry-run antes de aplicá-las.

## Gerenciamento dos skills

### skills aodit

Verifica as skills instaladas em busca de descrições sobrepostas, de generalidados que capturam tudo e de degradação do roteamento ligada ao tamanho da biblioteca.

```
oma skill audit [--json] [--output <format>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--json` | Exibe do JSON para a CI/CD |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Verificações realizadas :**
- **Similaridade pareada das descrições** : similarité cosinus TF-IDF entre cada paire de skills instalados. Avertit a ≥ 60 %, falha a ≥ 75 %.
- **Detecção de generalidados abrangentes** : informa qualquer skill cujo a similarité moyennão com os outros é uma valor aberrante positive (≥ moyennão + 1,5 × écart-type), o que indica uma descrição trop générique que pode dosviar o roteamento.
- **Degradação ligada ao tamanho da biblioteca** : avisa quando plus de 60 skills são instalados (a precisão do roteamento diminui logaritmicamente a medida que a biblioteca cresce).
- **Verificação de escopo** : avisa quando uma skill foi tend em bundle — plus de 20 documents de referência (arquivos `.md` outros que `SKILL.md`, arbres vendos exclus) ou um corps de `SKILL.md` de plus de 25 000 caractères. Skills focadas são mas eficazes que bundles (SkillsBench, arXiv:2602.12670) ; a correção é dividir, não remover.

**Códigos de saída :** `0` se todos os resultados são em a zonão de avertissement ou se ele não y em a nenhum ; `1` se ao moins uma paire é em a zonão de falha.

**Exemplos :**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Detecta problemas de autoria específicos de uma skill em um único `SKILL.md`, ao contrário de `skills audit` que controle os relações *entre* skills. A verificação usa a taxonomeeia dos padrãos de skill de arXiv:2607.01456 (plus de 99 % dos arquivos SKILL.md observés em a nature présentent ao moins um padrão).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--skill <id>` | Verifica uma únicoe skill |
| `--json` | Exibe do JSON para a CI/CD |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Défaots génériques (todas os skills) :**

| Défaot | Gravité | Signification |
|:------|:---------|:--------|
| `missing-name` | fail | Nom `name` absent ou vide em o frontmatter |
| `missing-description` | fail | Descrição `description` absente ou vide em o frontmatter — o routage em dépend |
| `weak-description` | warn | Descrição de moins de 40 caractères — trop mince para router |
| `body-too-long` | warn | Corps de SKILL.md de plus de 500 linhas — déplacer o detalhe em `resources/` com divulgation progressive |
| `template-placeholder` | warn | Texte `{Placeholder}` résidoel fora dos spans de código |
| `broken-reference` | fail | Referência para um arquivo `resources/`, `config/`, `scripts/` ou `assets/` inexistant |

**Problemas SSL-lite** (a validação SSL-lite é obrigatória quando o nome declarado de uma skill ou o nome exposto do seu diretório/alias começa com `oma-`, mesmo sem `## Scheduling`; um alias sem prefixo não pode contornar um nome declarado com `oma-`. Skills comuns sem prefixo adotam o formato ao incluir `## Scheduling`):

| Défaot | Gravité | Signification |
|:------|:---------|:--------|
| `ssl-structure` | fail | Sections de primeiro nível différentes de `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | Il não existe pas exactement um `### Canonical command path` ou `### Canonical workflow path` |
| `missing-boundaries` | warn | Nenhum `### When NOT to use` — os skills sem limites détournent o routage |
| `empty-failure-recovery` | warn | `### Failure and recovery` absent ou vide (os puestes e linhas de tabela são aceitas) — encódigo os mécanismes de falha conforme SkillLens |

**Códigos de saída :** `0` em o absence de padrão de gravité fail ; `1` se ao moins um padrão fail é présent.

**Exemplos :**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Mede a utilidade de uma skill : carregá-la realmente melhora os resultados de tarefas mantidas ? C'é o dorante *utilidade* de `skills audit` (que mesmo o chevaochement dos limites de descrição). Enquanto `audit` pergunta « dois skills são redondantes ? », `eval` pergunta « esta skill ajuda ? ».

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Opções :**

| Opção | Descrição |
|:-----|:-----------|
| `--skill <id>` | Identificador de skill a avaliar (nomee simples, sem séparateurs de caminho). Por padrão : `_all`. |
| `--mock` | Reproduz os execuções registradoes a partir de `_rollouts/` (por padrão ; determinístico, sem delegação LLM). Sûr para a CI. |
| `--live` | Délégation de agente em direto — lance dois branchs (referência e traitement) por tarefa via `oma agent spawn --read-only`. Exibe um pré-visualização do custo e pergunta confirmação sem `--yes`. |
| `--record` | Escreve os execuções directes capturées (y compris os verdicts do juge) em `_rollouts/` para um futur conjunto `--mock`. Pertinent somente com `--live`. |
| `--yes` | Ignora a confirmação de o pré-visualização do custo. Pertinent somente com `--live`. |
| `--task-dir <path>` | Substitui o diretório dos fixtures de tarefas (il deve se trouver em a raiz do workspace). Por padrão : `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Plafonnão o número de tarefas avaliadoes (em a ordem de tri determinístico). |
| `--require-coverage` | Sort com um código non nul quando moins de 5 tarefas são encontradas (évite um sucesso silencioso em CI). |
| `--json` | Exibe do JSON para a CI/CD |
| `--output <format>` | Formato de saída (`text` ou `json`) |

**Fonctionnement :**

Para cada fixture de tarefa em `.agents/eval/<skill>/` :
1. **Branch de referência** — o prompt de tarefa é delegado sem cargar a skill.
2. **Branch de tratamento** — `SKILL.md` é adicionado ao início do prompt, depois celui-ci é delegado.
3. Cada branch é avaliada pelo seu verificador (juge por padrão ; assert ou regex para os activations determinísticos).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Décisions :**

| Décision | Condition |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (código de saída 1) |
| `insufficient` | Moins de 5 tarefas notables (código de saída 1 somente com `--require-coverage`) |

**Modo recomendado :** use `--live` com os verificadores juge para medir a utilidade real de uma skill. Use `--mock` para reproduzir offlinão veredictos de juiz registrados ou para executar dos controles de contrato determinísticos `assert`/`regex`.

**Variável de ambiente :** `OMA_SKILLEVAL_MOCK=1` força o modo simulado independentemente das flags.

**Códigos de saída :** `0` para pass ou warn ; `1` para fail ou insuficiente com `--require-coverage`.

**Exemplos :**
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

Consulte o [guia de avaliação de o utilidade dos skills](../guide/skill-eval.md) para o formato dos fixtures `.agents/eval/` e os types de verificadores.

---

### skills opt

Otimiza o `SKILL.md` de uma skill com uma evolução persistente no estilo WikiSkill. Um mantenedor consolida os elementos observáveis das execuções em uma conhecimento délimitadoe, um proponente emite modificações adicionadas/removidas/substituídas e os resultados rejeitados persistem entre as execuções. Os candidatos devem melhorar estritamente o particionamento de validação mantido ; `--apply` exige em plus uma melhoria stricte em o divisão fimal de test mantido por o runner. Base de pesquisa : WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Opções :**

| Opção | Valor padrão | Descrição |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Identificador de skill a optimiser (nomee simples, sem séparateurs de caminho). |
| `--dry-run` | **oui (por padrão)** | Propõe os alterações e exibe o diff sem modificar `SKILL.md` ; os éléments de évolution gerados são tout de mesmo registrados. |
| `--apply` | — | Aplica os alterações aceitas ; salvaguarda o original antes uma escrita atômica e não escreve que uma melhoria validadoe. |
| `--mock` | **oui (por padrão)** | Reproduz os alterações de optimiseur e verdicts de avaliação registrados (determinístico, fora linha). Sûr para a CI. |
| `--live` | — | Délégation de optimiseur LLM em direto — entraînão de vrais chamadas de modelo a cada époque. Exibe um pré-visualização do custo e pergunta confirmação sem `--yes`. |
| `--max-epochs <n>` | `8` | Nombre maximal de époques de optimisation. |
| `--edits-per-epoch <k>` | `4` | Nombre de alterações candidates proposées por époque. |
| `--lr <chars>` | `600` | Budget de taox de apprentissage textuel : variation nette maximale de caractères por modification. |
| `--yes` | — | Ignora a confirmação de o pré-visualização do custo (somente com `--live`). |
| `--json` | — | Exibe do JSON para a CI/CD. |
| `--output <format>` | `text` | Formato de saída (`text` ou `json`). |

**Dependência estrita :** exige pelo menos 5 fixtures de tarefas em `.agents/eval/<skill>/`. Exibe um message clair se ce número não é pas atinge. Consulte o [guia de avaliação de o utilidade dos skills](../guide/skill-eval.md) para os escrever.

**Particionamento de treino/validação/teste :** os fixtures são divididas de forma determinística a 60/20/20. O mantenedor e o proponente veem apenas os elementos TRAIN, a seleção dos candidatos usa os tarefas VALIDATION mantidos e o divisão TEST mantido por o runner permanece oculto até o fim da evolução. `--apply` grava somente se o ganho de validação e o gain do test fimal progressent strictement.

**Nota SSOT :** os skills cujo o identificador comonce por `oma-` são sobrescritas por `oma update`. Para estes skills, `--apply` é déconseillé — use o `--dry-run` por padrão e repassatez o diff proposé em posterior. Os skills escritos por o usuário s'appliquent librement.

**Códigos de saída :** `0` se o optimisation é concluída ; `1` se os fixtures são insuffisantes ou se o argumento é inválido.

**Exemplos :**
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

Consulte o [guia de optimisation dos skills](../guide/skill-opt.md) para o parcours complet e os proteção-fous SSOT / sobreapprentissage.

---

### harness eval

Compara um overlay `.agents/` candidato com o harness OMA atual em tarefas pareadas e isoladas de repositório. O agente-alvo e a rota do fornecedor permanecem fixos ; verificações determinísticas avaliam os arquivos e a saída produzidos por cada branch.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Opção | Descrição |
|:-----|:------------|
| `--suite <path>` | Suite YAML obrigatório. A suite e os workspaestes de fixtures devem se trouver em a raiz do projeto. |
| `--candidate <path>` | Racinão candidate contendo uma sobrecouche `.agents/` limitadoe. |
| `--mock` | Reproduz uma execução registradoe cujo o hash correspond (por padrão ; determinístico e fora linha). |
| `--live` | Executa os branchs de referência e candidate com o agente destino de a suite. |
| `--record` | Preserva uma execução direta para um futur conjunto simulé. Exige `--live`. |
| `--record-file <path>` | Substitui o caminho de enregistrement ; il deve permanecer em a raiz do projeto. |
| `--yes` | Ignora a confirmação do custo de a execução direta. |
| `--timeout-minutes <n>` | Délai por branch, idêntico para a referência e a candidate. Por padrão : `15`. |
| `--require-coverage` | Sort com um código non nul quando moins de cinq tarefas appariées são notables. |
| `--json` | Exibe o avaliação complète ao formato JSON. |
| `--output <format>` | Formato de saída (`text` ou `json`). |

**Gate de decisão :** pass exige pelo menos 5 tarefas appariées, um ganho de pelo menos 5 points de porcentagem e zéro régression. Uma regressão sempre falha. Uma cobertura inférieure ao minimum donnão `insufficient` e não sai com código diferente de zero qu'com `--require-coverage`.

**Isolamento :** os arquivos candidatos podem substituir somente o conteúdo de `.agents/agents`, `.agents/rules`, `.agents/skills` e `.agents/workflows` na branch candidata temporária. Hooks, configuração, estado, fixtures de avaliação, liens symboliques, variantes de fornecedores, alterações protégées do frontmatter de execução dos agents e arquivos do harness fornecedor appartenant aos fixtures são recusados. Uma branch falha se modificar definições protegidas dorante a execução. A descoberta de fornecedores baseada em HOME é recusada para o avaliação direta. A route de o agente principal é fixa ; o épinglage do modelo dos sob-agents imbriqués não é pas encore aplicado.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Consulte o [guia de avaliação do harness](../guide/harness-eval.md) para o esquema de suite, os controles pris em carga, o modelo de isolamento e os limites atuals.

---

### help

Exibe as informações de ajuda.

```
oma help
```

Exibe o texto completo de ajuda com todos os comandos disponíveis.

### versão

Exibe o número da versão.

```
oma version
```

Exibe a versão atual da CLI e sai.

---

## Variáveis de ambiente

| Variable | Descrição | Utilisée por |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Definida a `json` para forcer a saída JSON em todas os comandos que a prennent em carga | Toutes os comandos com a opção `--json` |
| `DASHBOARD_PORT` | Porta do tabela de bord web | `dashboard web` |
| `MEMORIES_DIR` | Substitui o caminho do diretório de memórias | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Definida a `1` para forcer o mode simulé em `oma skill eval` quels que sejam os indicadores | `skills eval` |

---

## Alias

| Alias | Comando complète |
|:------|:------------|
| `viz` | `visualize` |
