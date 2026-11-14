---
title: Capacidades e pacotes dos vendors
description: Descoberta de skills, definições de agentes, hooks e formatos de pacote nos vendors do OMA.
---

# Capacidades e pacotes dos vendors

`cli/constants/vendor-capabilities.ts` registra a descoberta de skills, o diretório de agentes, a bridge de hooks e o manifesto de pacote de cada host compatível. As chaves de vendor coincidem com `ALL_CLI_VENDORS`; os caminhos de projeção de skills vêm de `CLI_SKILLS_DIR`, para que instalações de projeto e globais mantenham os destinos existentes.

| Host | Skills compartilhadas sem links de vendor | Diretório de agentes | Bridge de hooks | Manifesto do pacote |
| --- | --- | --- | --- | --- |
| Antigravity CLI | Não | — | Settings | `antigravity-plugin/plugin.json` |
| Claude Code | Não | `.claude/agents` | Settings | `.claude-plugin/plugin.json` |
| Codex | Não | `.codex/agents` | Settings | `plugin.json` |
| Command Code | Não | `.commandcode/agents` | Settings | `commandcode-mod/package.json` |
| Copilot CLI | Não | `.github/agents` | Settings | `plugin.json` (pacote Agent Plugins) |
| Cursor | Não | `.cursor/agents` | Settings | `.cursor-plugin/plugin.json` |
| Grok | — | `.grok/agents` | Settings | `.grok-plugin/plugin.json` |
| Hermes | Não | — | — | `plugin.json` (pacote Agent Plugins) |
| Kilo Code | Sim | `.kilo/agents` | Extension | `opencode-package/package.json` |
| Kimi | Não | — | Settings | `.kimi-plugin/plugin.json` |
| Kiro | Não | `.kiro/agents` | Settings | `plugin.json` (pacote Agent Plugins) |
| OpenCode | Não | `.opencode/agents` | Extension | `opencode-package/package.json` |
| Pi | Sim | — | Extension | `pi-package/package.json` |
| Qwen Code | Sim | `.qwen/agents` | Settings | `plugin.json` (pacote Agent Plugins) |
| ZCode | — | — | — | `.zcode-plugin/plugin.json` |

“Sem links de vendor” significa que o OMA pode usar a descoberta compartilhada nos dois modos de instalação. A varredura de projeto do Kimi, sozinha, não substitui a projeção global de skills já existente. Uma bridge de hooks ou um diretório de agentes não implica um adaptador de runtime de subprocesso. Gemini não é um vendor do OMA; a Antigravity CLI tem a própria integração.

## Pacote Agent Plugins

A raiz do repositório é um pacote [Agent Plugins 1.0](https://agent-plugins.org/), e `oma emit` o regenera a partir da SSOT `.agents/`:

```text
plugin.json              # $schema 1.0.0, name "oma", version, keywords, extensions
mcp.json                 # portable MCP servers (1.0.0 mcp schema)
skills/<name>/SKILL.md   # Agent Skills (+ bundled references/)
com.firstfluke.oma/      # agents, workflows, rules, oma-config.yaml (oma-aware hosts)
com.github.copilot/      # Copilot CLI components (see below)
```

Instalações por Git e por marketplace clonam o repositório sem dependências, então a raiz é o pacote. Uma instalação por caminho local ou `owner/repo:path` copia o diretório indicado, e a raiz do repositório também carrega a árvore-fonte, `node_modules` e o site. Para esses casos, use a cópia limpa que `oma emit --target agent-plugin` grava em `codex-plugin/` (neste repositório: `bun cli/cli.ts emit --target agent-plugin`), ou descompacte `oma-agent-plugin.tar.gz` de um [release do GitHub](https://github.com/first-fluke/oh-my-agent/releases). `codex-plugin/` é gerado e está no gitignore; não é commitado. Como cada host instala essa árvore inteira, as skills dela referenciam uma única cópia `skills/_shared/` dos guias compartilhados; somente a `skills/` da raiz os embute em cada skill, porque `bunx skills use first-fluke/oh-my-agent@<skill>` copia um único diretório de skill a partir dela.

As keywords do manifesto (`oma`, `oh-my-agent`, `multi-agent`, `orchestrator`, `orchestrate`, `workflow`, `workflows`, `skills`, `agents`) também são o vocabulário de ativação do Kiro. O manifesto não declara caminhos de componentes, o que a especificação proíbe; cada host lê os locais fixos. Nenhum host precisa de um manifesto nativo ao lado de `plugin.json`: o Copilot lê um manifesto Agent Plugins na raiz antes de `.claude-plugin/plugin.json`, e o Qwen Code carrega o pacote pelo adaptador Agent Plugins sem gerar `qwen-extension.json`.

| Host | Carrega | Instalação |
| --- | --- | --- |
| GitHub Copilot CLI | skills, servidores MCP e, de `com.github.copilot/`: 12 agentes personalizados, 20 comandos slash de workflow, 6 regras com escopo de arquivo, 4 hooks de ciclo de vida | `copilot plugin install first-fluke/oh-my-agent` (clona o pacote da raiz), `copilot plugin install /absolute/path/to/codex-plugin` na cópia emitida, ou `copilot plugin marketplace add first-fluke/oh-my-agent` e depois `copilot plugin install oma@oh-my-agent` |
| Kiro CLI (Powers) | skills e servidores MCP (os nomes dos servidores recebem namespace na instalação); ativa pelas keywords do manifesto | `kiro-cli powers install /absolute/path/to/codex-plugin` na cópia emitida (CLI 2.25+), ou **Add Custom Power → Import power from GitHub** com a URL do repositório |
| Qwen Code | skills e servidores MCP como a extensão `oma` | `qwen extensions install /absolute/path/to/codex-plugin --consent` ou `qwen extensions link /absolute/path/to/codex-plugin` na cópia emitida (origem Agent Plugins). A URL nua do repositório abre o seletor interativo de plugins do Qwen, porque a raiz também carrega o marketplace do Claude; `qwen extensions install https://github.com/first-fluke/oh-my-agent:oma` seleciona a entrada `oma` desse marketplace sem interação (pela documentação do Qwen, ela é então convertida a partir do manifesto do Claude). |
| Hermes Agent | skills como `oma:<skill>` e os servidores MCP stdio / Streamable HTTP | `hermes plugins install first-fluke/oh-my-agent --no-enable`, depois `hermes plugins enable oma` |
| Codex | skills e servidores MCP | `codex plugin marketplace add first-fluke/oh-my-agent` e depois `codex plugin add oma@oh-my-agent` |

### Componentes da Copilot CLI

O Copilot lê componentes não portáteis do namespace `com.github.copilot/` que `oma emit` preenche a partir da SSOT:

- `agents/<name>.agent.md`: os mesmos agentes personalizados do Copilot que uma instalação de projeto grava em `.github/agents/`.
- `commands/<workflow>.md`: um comando slash por workflow disponível; cada um lê o `.agents/workflows/<workflow>.md` do projeto.
- `rules/<rule>.instructions.md`: as regras com um glob de arquivo (`applyTo`) ou `alwaysApply: true`; regras sob demanda ficam com a instalação do projeto.
- `hooks/hooks.json` com `scripts/plugin-bootstrap.sh` e `scripts/plugin-hook.sh`: os mesmos scripts fail-open da entrada de marketplace do Claude Code, executados com `OMA_PLUGIN_VENDOR=copilot`. SessionStart provisiona a CLI e executa `oma install --yes` no projeto atual; UserPromptSubmit, PreToolUse (Bash) e Stop encaminham para `oma hook --vendor copilot` até a inscrição do próprio `.github/hooks/oma.json` do projeto assumir. Todo comando termina em `|| true`, então uma CLI ausente ou uma raiz de plugin não resolvida nunca bloqueia uma tool call.

Workflows, agentes e regras referenciam a árvore `.agents/` do projeto. Sem a CLI oma, o pacote ainda fornece skills e servidores MCP; o hook de bootstrap acrescenta o resto na primeira sessão.

### Registro de validação

Verificado em 2026-11-08 com o home de cada host apontando para um diretório temporário; nenhuma chamada de modelo, hook ou servidor MCP foi executada. `<path>/codex-plugin` é a árvore que `oma emit --target agent-plugin` grava:

- Copilot CLI 1.0.107: `copilot plugin install <path>/codex-plugin` reportou `Installed 33 skills`; `plugin list --json` mostra `oma` habilitado na versão do pacote; a cópia em cache em `installed-plugins/_direct/` contém `com.github.copilot/{agents,commands,rules,hooks,scripts}`. `copilot plugin marketplace add <repo>` seguido de `copilot plugin install oma@oh-my-agent` também instalou a entrada completa ao vivo a partir do checkout. O Copilot avisa que instalações diretas estão obsoletas em favor de `plugin@marketplace`.
- Kiro CLI 3.1.0: `kiro-cli powers install <path>/codex-plugin` (com `KIRO_HOME` e `KIRO_DATA_DIR` no diretório temporário) reportou `Installed power "oma"` e copiou o pacote para `powers/installed/oma/`. O Kiro ignora `USERPROFILE`; use `KIRO_HOME` para relocar o home.
- Qwen Code 0.26.9: `qwen extensions install <path>/codex-plugin --consent` reportou `installed successfully and enabled`; `qwen extensions list` mostra `Origin: AgentPlugins`, 33 skills e os servidores MCP `context7`, `serena` e `aside`.
- Hermes Agent: não instalado aqui. O manifesto, o frontmatter das skills e o `mcp.json` foram conferidos contra as regras de `hermes_cli/agent_plugins.py` do Hermes (sem campos desconhecidos, nomes válidos, comandos stdio como tokens únicos); o Hermes não exige um bloco `extensions["com.nousresearch.hermes"]`.

A CI emite o pacote a partir do checkout e o instala em releases fixadas da Copilot CLI e do Qwen Code em cada push (job `agent-plugin-hosts`, `scripts/agent-plugin-host-smoke.ts`).

## Pacotes Pi

O Pi descobre `.agents/skills` do projeto e `~/.agents/skills` global diretamente. Instalar o OMA em um projeto, portanto, não exige uma projeção `.pi/skills`.

Para distribuição fora de uma instalação do OMA, o pipeline de release emite o pacote de skills do Pi e o publica no npm como `oh-my-agent-pi`; ou emita você mesmo:

```bash
pi install npm:oh-my-agent-pi            # the published package
oma emit --target pi-package             # or emit it locally
pi install /absolute/path/to/pi-package
```

Neste repositório-fonte, execute a CLI local como `bun cli/cli.ts emit --target pi-package`. A saída padrão é `pi-package/` (gitignore; a árvore é gerada, não commitada); `--output-dir <base>` a grava em `<base>/pi-package/`.

O `package.json` gerado declara `pi.skills: ["./skills"]`, inclui a keyword `pi-package` e usa a versão do repositório. Os guias compartilhados que as skills referenciam são emitidos uma vez em `skills/_shared/` (o pi carrega o pacote inteiro), então nenhuma skill carrega a própria cópia. O pacote não tem dependências de workspace nem scripts de instalação. Ele distribui skills; a instalação de projeto do OMA fornece a extensão de hooks do Pi separadamente.

O Pi também aceita fontes Git e npm. O repositório já declara as skills-fonte no `package.json` da raiz, então `pi install git:github.com/first-fluke/oh-my-agent@<tag>` pode descobri-las. O Pi executa a instalação de dependências para pacotes Git que contêm `package.json`; o pacote emitido evita a árvore de dependências do workspace-fonte. O próprio `oma emit` não publica; o workflow de release publica o pacote emitido no npm.

Este formato foi conferido contra a documentação do pacote Pi 0.78.1 instalado e o resolvedor de pacotes em 2026-11-05. A resolução somente leitura do repositório-fonte e do pacote emitido carregou 33 skills com zero diagnósticos, sem instalar um pacote nem contactar um modelo.

## Pacote de plugin do OpenCode e do Kilo Code

`oma link` instala a bridge de hooks da família opencode por projeto: `.opencode/plugins/oma/oma.ts` (`.kilo/plugins/oma/` para o Kilo) mais as entradas de handler que ela inicia, registradas em `plugin` no `opencode.json` / `kilo.json`. A mesma bridge também é emitida como pacote de plugin npm, para que um projeto (ou uma configuração global) possa carregá-la sem uma instalação por projeto:

```bash
oma emit --target opencode-package
```

A saída padrão é `opencode-package/` (o único pacote emitido que permanece commitado, para que um clone possa carregá-lo como plugin de diretório); `--output-dir <base>` a grava em `<base>/opencode-package/`. O pacote (`oh-my-agent-opencode`) contém a bridge da SSOT sem alterações (`oma.ts`), uma entrada de pacote (`index.ts`, o `main`/`exports`), uma entrada de handler gerada por script de hook independente (cada uma executa `oma hook script --vendor opencode --script <name>`), `filter-test-output.sh` e um README. Ele não tem dependências; a CLI `oma` precisa estar no PATH e o `bun` precisa estar instalado, e todo hook falha aberto quando um dos dois falta.

Os dois hosts carregam plugins de pacote por contratos diferentes, e a entrada atende os dois a partir de um único export padrão: o OpenCode 2.x lê `{ id, setup(ctx) }` e `setup` registra `ctx.session.hook("prompt" | "context" | "experimental.idle")` e `ctx.tool.hook("execute.before")`, cada um adaptado para os handlers `chat.message`, `experimental.chat.system.transform`, `session.idle` e `tool.execute.before` da bridge; o Kilo Code e o OpenCode 1.18.29+ exigem um objeto com `server()`, que é a própria bridge. A lógica dos handlers não é duplicada.

Registre-o pelo nome do pacote em `.opencode/opencode.json` (projeto) ou `~/.config/opencode/opencode.json` (global); o OpenCode instala plugins npm no cache na inicialização:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["oh-my-agent-opencode"]
}
```

O Kilo Code lê a mesma chave de `.kilo/kilo.json` ou `~/.config/kilo/kilo.json`; `kilo plugin oh-my-agent-opencode` adiciona a entrada para você. Os dois hosts despacham com a identidade compartilhada `opencode`, que responde no dialeto JSON do Claude que a bridge lê. Um projeto em que `oma link` já registrou `./plugins/oma/oma.ts` não precisa do pacote; mantenha um ou o outro.

O OpenCode 2.x também aceita um plugin de diretório (`"plugin": ["../path/to/opencode-package"]`, relativo ao arquivo de configuração), que carrega o pacote emitido sem npm. O OpenCode 2.x exige que caminhos de plugin configurados sejam diretórios e rejeita uma entrada de arquivo único: o registro por projeto `./plugins/oma/oma.ts` que `oma link` grava é ignorado ali ("configured plugin path must be a directory"), então no OpenCode 2.x use este pacote; o Kilo Code ainda carrega o arquivo por projeto.

Verificado em 2026-11-08 contra o OpenCode 2.2.6 e a Kilo Code CLI 7.8.27: os dois resolveram `plugin: ["oh-my-agent-opencode"]` a partir da configuração do projeto (`opencode debug config`, `kilo debug config`), o OpenCode tentou a instalação npm (um 404 até o pacote ser publicado) e permaneceu fail-open, e, com o pacote colocado no cache de plugins de cada host (`<cache>/opencode/npm/<spec>/node_modules/`, `<cache>/kilo/packages/<spec>/node_modules/`), um `run "orchestrate: say hi"` headless contra um endpoint local compatível com OpenAI recebeu `[OMA WORKFLOW: ORCHESTRATE]` no system prompt dos dois hosts, seguido das reentradas do modo persistente até o teto de reforço. O workflow de release publica o pacote emitido no npm como `oh-my-agent-opencode` a cada release da CLI.

## Pacote de mod do Command Code

Os hooks do arquivo de settings do Command Code (`.commandcode/settings.json`, instalados por `oma link`) cobrem apenas `SessionStart`, `PostToolUse` e `Stop`. Um [mod](https://commandcode.ai/docs/mods) vê o ciclo de vida completo, então o OMA também emite um pacote de mod:

```bash
oma emit --target commandcode-mod
```

A saída padrão é `commandcode-mod/` (gitignore; a árvore é gerada, não commitada). O `package.json` carrega a keyword `cmd-mod` e um bloco `commandcode` (`mods: ["./mods/oma.ts"]`, `skills: ["./skills"]`), então uma instalação traz a bridge de hooks e todas as skills do OMA. `mods/oma.ts` mapeia os hooks da ModApi para os handlers do core por meio de `oma hook script --vendor commandcode --script <name>`: `transformInput` executa keyword-detector e skill-injector (o prompt passa inalterado), `appendSystemPrompt` injeta o contexto detectado, `onSessionStart` executa code-intelligence-primer e state-boundary, `beforeToolCall` executa scm-guard (um deny vira `{block: true}`) e test-filter em `shell_command`, e `onStop` transforma um bloqueio de modo persistente em `{continue: true, reason}`. O pacote não tem dependências e não precisa de build; todo hook falha aberto sem a CLI `oma`.

```bash
cmd mods add oh-my-agent-commandcode          # this project
cmd mods add -g oh-my-agent-commandcode       # your user
cmd mods add ./commandcode-mod                # a local checkout or `oma emit` output
cmd mods inspect ./commandcode-mod            # static report, never runs the mod
cmd --mod ./commandcode-mod/mods/oma.ts       # one session, without installing
```

Verificado em 2026-11-08 contra o Command Code 1.88.5: `cmd mods inspect` reportou os hooks registrados, `cmd mods add -g <local path>` instalou o pacote e `cmd mods list` mostrou `oma · user · from local:…`, e acionar os hooks do mod contra a CLI injetou `[OMA WORKFLOW: ORCHESTRATE]`, bloqueou `git add .env` e devolveu um continue de modo persistente. Um turno `cmd -p` com modelo não foi exercitado (não havia conta do Command Code na máquina de teste). O workflow de release publica o pacote emitido no npm como `oh-my-agent-commandcode` a cada release da CLI.

## Verificação do plugin do Cursor

O Cursor Agent `2026.10.22-27dcf5f` expõe:

```text
agent --plugin-dir <path>
agent plugin marketplace add <gitUrl> [--git-ref <ref>]
agent plugin marketplace list
agent plugin marketplace remove <nameOrUrl>
agent plugin marketplace update <nameOrUrl>
```

A CLI de plugins não tem um comando de instalação de plugin individual. O registro de marketplace é uma operação de conta que indexa um repositório Git; ele não oferece uma verificação isolada de instalação local. O OMA não registra um marketplace automaticamente durante a emissão.

Em 2026-11-05, os dois diretórios de skills, o diretório de agentes, o diretório de regras, o arquivo MCP e o logo do manifesto Cursor commitado resolveram dentro do repositório. A ajuda da CLI confirmou o suporte para carregar um diretório de plugin local. O registro de marketplace da conta e uma sessão de modelo ao vivo não foram exercitados.

## Hosts de plugin compatíveis com Claude

Antigravity CLI, Grok Build CLI, ZCode e Kimi Code leem manifestos de plugin cuja forma descende de `.claude-plugin/plugin.json` do Claude Code. `oma emit` gera um manifesto nativo por host a partir da fonte de verdade `.agents/`. Um clone git deste repositório é o pacote instalável para Grok, ZCode e Kimi; a árvore da Antigravity é gerada (`oma emit --target antigravity-plugin`, ou o asset de release `oma-antigravity-plugin.tar.gz`) porque o validador rejeita a raiz do repositório:

| Host | Alvo de emit | Artefato commitado | Skills | Agentes | MCP | Hooks |
| --- | --- | --- | --- | --- | --- | --- |
| Antigravity CLI | `antigravity-plugin` | nenhum; `antigravity-plugin/` emitido (autocontido, asset de release) | `skills/` | `agents/` (convertidos) | `mcp_config.json` | não distribuídos |
| Grok Build CLI | `grok-plugin` | `.grok-plugin/{plugin,marketplace}.json` | `skills/` da raiz | `.agents/agents/*.md` | `mcpServers` inline | não declarados |
| ZCode | `zcode-plugin` | `.zcode-plugin/{plugin,marketplace}.json` | `skills/` da raiz | `.agents/agents/*.md` | `mcpServers` inline | não declarados |
| Kimi Code | `kimi-plugin` | `.kimi-plugin/plugin.json` | `skills/` da raiz | `.agents/agents/*.md` | `mcpServers` inline | não declarados |

Nenhum desses pacotes distribui hooks. Os hooks do plugin do Claude resolvem o projeto a partir de `CLAUDE_PROJECT_DIR` e `${CLAUDE_PLUGIN_ROOT}`, que esses hosts não definem, e Antigravity e Kimi executam hooks de plugin com o diretório do plugin como diretório de trabalho. Workflows e hooks de projeto vêm, portanto, da CLI `oma` (`bun install -g oh-my-agent`, depois `oma install`), que provisiona a bridge de hooks nativa de cada host. Skills, agentes, regras e servidores MCP funcionam sem ela.

Neste repositório-fonte, execute a CLI local como `bun cli/cli.ts emit --target <target>`; `--output-dir <base>` grava cada artefato em `<base>` no mesmo caminho relativo. O portão de drift da CI (`bun run --cwd cli check:emit-drift`) falha quando um manifesto commitado difere de um emit novo, e o Release Please incrementa a versão de cada manifesto commitado junto com o release da CLI; as árvores de caminho local geradas tiram a versão da tag de release em que são emitidas.

### Antigravity CLI (`agy`)

O pacote segue [antigravity.google/docs/build-plugins](https://antigravity.google/docs/build-plugins): `plugin.json` validado contra `https://antigravity.google/schemas/v1/plugin.json`, `skills/<name>/SKILL.md`, `agents/<name>.md`, `rules/AGENTS.md` mais um `rules/<rule>.md` por regra do OMA (`trigger: always_on | glob | model_decision`, `globs` separados por vírgula), `mcp_config.json`, `assets/logo.png` e um README. Uma árvore autocontida é emitida porque `agy plugin validate --strict` rejeita a raiz do repositório (o `AGENTS.md` da raiz e o `hooks/hooks.json` do Claude são reportados como nunca carregados). Instale o diretório `antigravity-plugin/`, não a URL nem a raiz do repositório: apontado para a raiz, o agy carrega o `plugin.json` de Agent Plugins que está ali: 33 skills, sem agentes nem regras, e `mcp.json` somente enquanto a flag `enable-agent-plugins-spec` está ligada (`agy plugin validate --json .`, agy 1.5.3).

```bash
# From a release asset:
tar -xzf oma-antigravity-plugin.tar.gz        # unpacks antigravity-plugin/
# Or from a clone (the tree is generated, not committed):
git clone https://github.com/first-fluke/oh-my-agent
cd oh-my-agent && bun install && bun cli/cli.ts emit --target antigravity-plugin
agy plugin validate --strict ./antigravity-plugin
agy plugin install ./antigravity-plugin
agy plugin list
agy --agent pm-planner
```

As skills carregam como `/<skill-name>`; os servidores MCP recebem o namespace `oma_<server>`. `agy plugin import claude` também importa uma instalação existente do Claude Code. Em 2026-11-08, a árvore emitida passou em `agy plugin validate --strict` (agy 1.5.3) com 0 erros e 0 avisos: 33 skills, 12 agentes, 14 regras, 3 servidores MCP.

### Grok Build CLI

O Grok lê plugins e marketplaces do Claude Code sem configuração extra, então `.claude-plugin/` já funciona. O `plugin.json` nativo em `.grok-plugin/` acrescenta declarações explícitas de skill, agente e MCP, e `.grok-plugin/marketplace.json` lista a mesma entrada `oma` e as raízes de domínio `oma-frontend`, `oma-security` e `oma-research` do marketplace do Claude, com fontes locais (`{"type": "local", "path": ...}`), a forma que o validador de catálogo do Grok aceita sem um sha de commit fixado.

```bash
grok plugin marketplace add first-fluke/oh-my-agent
grok plugin install oma            # or oma-frontend, oma-security, oma-research
# Local clone instead of GitHub:
grok plugin validate ./oh-my-agent
grok --plugin-dir ./oh-my-agent
```

O Grok não estava instalado no host que emitiu; o manifesto e o catálogo são conferidos estruturalmente pelos testes da CLI contra o conjunto de campos documentado e as regras de catálogo de `xai-org/plugin-marketplace`.

### ZCode

O ZCode resolve `.zcode-plugin/plugin.json` primeiro e recorre a `.claude-plugin/plugin.json`, então a raiz do repositório resolve de forma nativa e cada raiz de domínio resolve pelo manifesto do Claude. A instalação é somente pela GUI:

1. Abra **Settings → Plugins**.
2. Clique em **Create → Add marketplace** (canto superior direito) e informe `first-fluke/oh-my-agent`, a URL Git ou o caminho de um clone local. O ZCode valida o marketplace antes de adicioná-lo.
3. No segmento **Personal**, clique em **Install** em `oma` (ou em uma entrada de domínio) e espere o status mudar para **Installed**. Os plugins vêm habilitados por padrão.
4. Depois, use **Manage installed → Check for updates**; o ZCode compara a versão da entrada do catálogo em `.zcode-plugin/marketplace.json` com o `plugin.json` instalado, então os dois acompanham o release da CLI.

O ZCode não estava instalado no host que emitiu; o padrão de nome do manifesto (`^[a-z0-9][a-z0-9._-]{0,127}$`), o conjunto de campos e a forma do marketplace são afirmados pelos testes da CLI.

### Kimi Code CLI

`.kimi-plugin/plugin.json` aponta `skills` para o diretório de varredura `skills/` da raiz, lista cada arquivo `.agents/agents/*.md` (já no formato de agente do Kimi: frontmatter `name` e `description`, corpo Markdown como system prompt), coloca `mcpServers` inline e carrega o bloco `interface` mostrado por `/plugins`.

```text
/plugins install /absolute/path/to/oh-my-agent
/plugins install https://github.com/first-fluke/oh-my-agent
/reload
```

O Kimi copia o plugin para `$KIMI_CODE_HOME/plugins/managed/oma/` e o aplica a todos os projetos; as skills são invocadas como `/skill:oma:<skill-name>`. O Kimi não estava instalado no host que emitiu; a superfície do manifesto (campos permitidos, regra de caminho `./`, conjunto de campos de hook) é afirmada pelos testes da CLI.

## Qwen Agent Board

A documentação experimental [Qwen Agent Board](https://qwenlm.github.io/qwen-code-docs/en/users/features/agent-board/) descreve `qwen board task`, `claim`, `done`, `ask` e `answer`. O board coordena arquivos locais; ele não inicia, não entra nem monitora processos de agente.

O OMA pode encaminhar operações explícitas do board quando a CLI Qwen instalada anuncia o comando `board`:

```bash
oma agent board show --board orders --json
oma agent board task "Check API" --board orders --actor api --owner web
oma agent board done TASK_ID --board orders --actor web --note "Checked"
```

O adaptador também aceita `claim`, `ask`, `answer` e `decline`. Ele verifica a ajuda da raiz antes de encaminhar uma operação. Ele complementa o estado de execução e os recibos do OMA; nunca marca o trabalho do OMA como concluído automaticamente.

O Qwen Code 0.20.1 instalado não expunha os comandos de CLI `board` nem `agents` em 2026-11-05. `qwen board --help` devolveu a ajuda da raiz, então esta instalação falha na verificação de capacidade. Uma operação nativa real de board permanece sem verificação; não há integração `agents join`.
