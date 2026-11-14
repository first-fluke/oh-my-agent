---
title: Instalação
description: "Instale o oh-my-agent, escolha skills e providers, entenda os arquivos de projeto gerados, configure os padrões de modelo e runtime e verifique a instalação com oma doctor."
---

# Instalação

Para uma única tarefa, comece com [uma única skill](./choose-setup.md#load-one-skill). Para hooks de projeto e workflows em equipe, use a instalação do runtime abaixo. O [guia de configuração](./choose-setup.md) separa o carregamento de instruções, os presets de skills e a instalação do marketplace do Claude Code.

Para o Grok Bot, use a [página de instalação do Grok Bot](/grok-bot/). O link nativo **Add to Grok Bot** exige uma listagem aprovada no Cursor Marketplace e não fica disponível enquanto o registro está pendente. O [guia de instalação manual](https://github.com/first-fluke/oh-my-agent/blob/main/integrations/grok-bot/README.md) separado explica `oma install --target grok-bot` para o computador do Bot. A integração de runtime do Grok Build abaixo é outro alvo de instalação.

## Instalar com um agente de IA

Cole isto no seu agente de código:

```text
Install and configure oh-my-agent in this project by following this guide:
https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/docs/agent-install.md
```

O [guia de instalação por agente](https://github.com/first-fluke/oh-my-agent/blob/main/docs/agent-install.md) aborda a preparação da CLI, a configuração não interativa do projeto e a verificação com `oma doctor`.

## Pré-requisitos

- **Uma IDE ou CLI com IA**: pelo menos um host compatível, como Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot ou Hermes
- **bun**: runtime JavaScript e gerenciador de pacotes (instalado automaticamente pelo script de instalação se estiver ausente)
- **uv**: gerenciador de pacotes Python (o script de bootstrap oferece a instalação quando estiver ausente)
- **Provider de inteligência de código**: Serena é o provider padrão. Gortex também é compatível quando selecionado na configuração de providers. O instalador pode inicializar o Serena com `uv tool install`; quando uma dependência opcional não está disponível, ele continua e exibe um aviso. Com o Gortex selecionado, `oma install` e `oma update` em modo de projeto registram o projeto no daemon do Gortex (`gortex track`) quando ele ainda não está rastreado e adicionam os diretórios gerados pelo OMA à lista de exclusão desse projeto por meio da CLI do Gortex; nada é gravado na árvore do projeto. O próprio Gortex precisa ser instalado separadamente.

O instalador agrupa as integrações por capacidade. Os vendors de hooks incluem Antigravity, Claude, Codex, CommandCode, Copilot, Cursor, Grok, Kimi, Kiro e Qwen; OpenCode e pi usam bridges de extensão; Hermes recebe links para skills; e ZCode recebe comandos de workflow. Você pode selecionar mais de um vendor, mas a primeira tarefa precisa apenas do host que pretende usar.

---

## Método 1: instalação em uma linha {#method-1-one-liner-install}

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Os dois scripts de bootstrap funcionam da mesma forma:
1. Detectam sua plataforma (macOS, Linux ou Windows)
2. Verificam bun e uv (e serena, se escolhida), instalando-os quando estiverem ausentes
3. Instalam o comando `oma` globalmente com `bun install --global oh-my-agent`, a menos que `oma` já esteja no seu PATH (hooks e workflows o chamam)
4. Executam o instalador interativo com seleção de preset e provider
5. Criam `.agents/` com as skills e a configuração selecionadas
6. Configuram as camadas de integração do runtime (hooks, symlinks e configurações dos vendors detectados)
7. Configuram os servidores MCP de inteligência de código e memória

O bootstrap continua depois de falhas em dependências opcionais e informa os comandos de acompanhamento. AgentMemory é o provider de memória semântica padrão: `oma install` e `oma update` falham se a instalação, a inicialização ou a verificação de integridade dele falhar. Selecionar `providers.semantic_memory: none` ou `honcho`, ou definir `OMA_NO_AGENTMEMORY=1`, ignora a preparação automática do AgentMemory. Execute `oma doctor` depois que o instalador terminar.

### O que o instalador também faz por padrão {#what-the-installer-also-does-by-default}

- **Browser MCP Aside**: pré-selecionado na configuração interativa e, se estiver ausente, instalado com `curl -fsSL https://releases.aside.com/install.sh | bash`, apenas se você o mantiver selecionado. Desmarque-o na etapa de browser MCP ou depois com `oma update mcp`.
- **Serviço AgentMemory**: `bun install -g @agentmemory/agentmemory`, registrado como serviço de login (launchd, unidade de usuário do systemd ou tarefa agendada do Windows).
- **CUE**: instalado pelo script de bootstrap com `brew install cue` (macOS/Linux) ou `winget` (Windows), e de novo pelo `oma install` quando o Serena é o provider de code intelligence.
- **Gravações fora do projeto**: `~/.claude.json` (marca o projeto como workspace confiável do Claude Code), `~/.serena/` (contexto do OMA, tamanho mínimo de resposta, registro do projeto), `~/.cursor/cli-config.json` (desativa a atribuição de commits do Cursor), `~/.grok/config.toml` (telemetria) e `~/.gemini/antigravity-cli/` (HUD), cada um só para um vendor selecionado. Vincular skills às pastas de vendors no diretório home (Antigravity, Hermes, Kimi) pede confirmação antes.
- **Opt-outs de telemetria**: Claude `DISABLE_TELEMETRY=1` (isso também desativa o Claude Code Remote Control) e as estatísticas de uso de Gemini, Qwen, Codex e Grok. Defina `telemetry: true` para manter os padrões dos vendors.
- **Configurações do Claude Code**: as chaves não definidas em `.claude/settings.json` são preenchidas, incluindo `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180` e flags de env que desativam auto memory, adaptive thinking, relatório de erros e as instruções de git embutidas. Os valores que você já definiu são mantidos.
- **Trailer de coautoria**: a atribuição de commits do Claude Code passa a ser `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`, e os PRs recebem uma linha "Generated with oh-my-agent". Defina `scm.co_author.enabled: false` para desativar.
- **Guarda de commit-msg**: `.githooks/commit-msg` rejeita endereços `Co-authored-by` que não estão em `.githooks/co-authors.allow` nem em `scm.co_author.email`. `git config --local core.hooksPath .githooks` só é definido quando nenhum outro hook está ativo; caso contrário, o oma mostra como encadear a guarda. Defina `scm.co_author.enforce_hook: false` para desativar.
- **Atualizações em segundo plano**: `oma update` atualiza a CLI `oma` em segundo plano (`auto_update_cli: false` ou `OMA_SKIP_VERSION_CHECK=1` para interromper) e executa `uv tool upgrade serena-agent --prerelease=allow` (`serena.auto_update: false` para interromper).
- **Timer de limpeza do Serena**: com o Serena no modo `bridge` padrão, a primeira sessão de agente que inicia um servidor Serena compartilhado registra um timer que para os servidores Serena compartilhados ociosos a cada 5 minutos (launchd `dev.oma.serena-daemon-gc`, timer de usuário do systemd `oma-serena-daemon-gc.timer` ou tarefa agendada do Windows `OMA Serena Daemon GC`). Defina `serena.mode: stdio` para dispensar o servidor compartilhado e o timer. `oma uninstall` não remove o timer.
- **Execuções não interativas** (`-y`, `OMA_YES=1`, `CI=true`) usam o preset de skills `All`, salvo se `--preset` selecionar outro, além de `model_preset: auto` e Python como linguagem de backend. Elas não selecionam nenhum browser MCP (e pulam o script de instalação do Aside), a menos que `mcp.devtools_browsers` já liste um.

---

## Método 2: instalação manual via bunx

```bash
bunx oh-my-agent@latest
```

Isso inicia o instalador interativo sem o bootstrap de dependências. Você precisa ter o bun instalado.

O instalador pede que você escolha um [preset de skills](./glossary.md#skill-preset). Os presets atuais estão definidos em `PRESETS` em `cli/constants/skill-data.ts`:

### Presets {#presets}

Escolha o preset que corresponde ao trabalho de que o repositório precisa. Os nomes de skills abaixo omitem o prefixo `oma-`.

| Preset | Escolha-o quando o projeto for | Skills incluídas | Quantidade |
|--------|-------------------------------|-----------------|-------|
| **all** | Qualquer projeto, ou quando você quer que todo workflow funcione imediatamente | Todas as skills do registro | 33 |
| **fullstack** | Clientes web e mobile com backend e infraestrutura Terraform | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | Um frontend web com backend e banco de dados | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | Um app mobile com backend e banco de dados | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | Somente uma UI web | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | Uma API ou serviço com banco de dados | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | Somente um app mobile | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | Trabalho de infraestrutura, CI/CD e observabilidade | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **security** | Varredura de segurança, revisão de código e remediação | security, architecture, qa, debug, refactor, scm | 6 |
| **research** | Artigos científicos, pesquisa de mercado e conversão de PDF/HWP | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | Ativos de design, imagens, voz e conteúdo escrito | design, image, voice, academic-writing, translation, scm | 6 |

Presets são conjuntos de skills; eles não criam uma definição de subagente para cada skill. O preset `all` é expandido a partir do registro ativo de skills, então a lista pode crescer com o repositório. Presets de domínio incluem apenas as skills daquele foco.

Escolha um preset pela linha de comando:

```bash
oma install --preset frontend --yes
```

`--preset` usa os nomes da tabela e tem prioridade sobre o prompt interativo de skills e sobre o padrão `all` no modo não interativo. Nomes desconhecidos são rejeitados antes do início da instalação. Omitir essa opção mantém o fluxo de seleção existente. A opção seleciona apenas skills; arquivos compartilhados, agentes, workflows, hooks e configuração de providers continuam seguindo o instalador do runtime. Reinstalar com um preset menor mantém as skills já instaladas. A seleção personalizada fica disponível apenas no menu interativo; `custom` e valores vazios não são aceitos em `--preset`.

Depois da instalação, confira a lista de skills selecionadas e o relatório de disponibilidade de workflows. Um workflow só fica exposto quando os manifestos das skills obrigatórias têm nomes e descrições válidos. Skills já mantidas no projeto podem atender a esses requisitos. Referências condicionais são informadas separadamente e não ampliam o preset selecionado. Essa verificação cobre apenas os manifestos; ferramentas, providers, credenciais e execução ainda exigem verificações próprias.

### Workflows que precisam de skills fora de um preset {#workflows-that-need-skills-outside-a-preset}

Todo preset copia as definições de workflows e agentes. Comandos e prompts só ficam expostos para workflows cujas skills obrigatórias estão disponíveis. Por exemplo, uma instalação limpa do preset `frontend` deixa `/work` indisponível porque falta `oma-coordination`; as skills de PM e QA já incluídas atendem aos demais requisitos de entrada. O instalador informa essa skill ausente sem trocar para `all`.

| Workflow | Skills de entrada obrigatórias | Presets que as incluem |
|----------|--------------------------------|-------------------------|
| `/work`, `/ultrawork`, `/ralph` | oma-coordination, oma-pm, oma-qa | all |
| `/orchestrate` | oma-coordination, oma-orchestration, oma-qa | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all, security |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture` | oma-architecture | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/plan` | oma-pm | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/review` | oma-qa | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/scm` | oma-scm | todos os presets |

Referências específicas de ramificação permanecem apenas informativas. Por exemplo, `/convert` escolhe ferramentas de PDF, HWP ou vídeo depois de inspecionar a entrada; `/ralph` e `/ultrawork` podem precisar de `oma-refactor` em um fluxo de refatoração. Essas referências não são requisitos incondicionais de entrada.

Execute `oma doctor` para diagnosticar manifestos ausentes ou inválidos. Para adicionar uma skill ausente, execute `oma install` e escolha **Select individually**. Depois de corrigir um manifesto, execute `oma link` para atualizar a exposição dos workflows; reinstalar também atualiza a lista. Use o escopo `--global` correspondente em instalações globais do OMA. Comandos próprios do usuário são mantidos quando comandos indisponíveis do OMA são removidos.

### Plugins de domínio

Usuários do marketplace do Claude Code podem escolher uma entrada de domínio depois de adicionar o marketplace `oh-my-agent`:

```bash
claude plugin install oma-frontend@oh-my-agent
# Alternatives: oma-security@oh-my-agent, oma-research@oh-my-agent
```

As entradas de domínio contêm 8 skills de frontend, 6 de security ou 8 de research e uma seleção equivalente de agentes nativos. O bootstrap da sessão repassa esse preset para o instalador do runtime. A configuração compartilhada do runtime e as skills já instaladas seguem o comportamento do instalador descrito acima. A entrada `oma` mantém o plugin completo. As mesmas raízes de domínio estão declaradas no catálogo gerado do Codex Marketplace e nos catálogos do Grok Build e do ZCode. A Antigravity CLI (`agy plugin install ./antigravity-plugin` na árvore gerada ou no artefato de release `oma-antigravity-plugin.tar.gz`), a Grok Build CLI, o ZCode e o Kimi Code (`/plugins install`) leem cada um seu próprio manifesto gerado; consulte [Hosts de plugins compatíveis com o Claude](../guide/vendor-capabilities.md#claude-compatible-plugin-hosts) para os passos exatos por host.

Os jobs de CI fixados por host registram o marketplace local em runners limpos, instalam as entradas de domínio e inspecionam o inventário resultante. Essas verificações são executadas sem chamadas de modelo. Credenciais de runtime, providers externos e uma primeira tarefa bem-sucedida ainda precisam de verificação própria. As verificações de release também exigem que os dois manifestos em cada raiz de domínio correspondam à versão da CLI e tenham um atualizador de versão do Release Please.

Os recursos compartilhados (`_shared/`) são sempre instalados, independentemente do preset. Isso inclui roteamento central, carregamento de contexto, estrutura de prompt, detecção de vendor, protocolos de execução e protocolo de memória.

### O que é criado

Após a instalação, seu projeto conterá:

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 20, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

O instalador cria diretórios de vendors apenas para os hosts que você selecionar. A fonte dos hooks permanece em `.agents/hooks/core/`; os arquivos de vendors gerados são saídas de integração. Em projetos antigos, o Serena também pode usar um diretório legado `.serena/memories/`.

---

## Método 3: instalação global {#method-3-global-install}

Para usar a CLI (dashboards, criação de agentes e diagnósticos), instale o oh-my-agent globalmente:

:::note
Esta seção instala o comando `oma`. Isso não é o mesmo que `oma install --global`, que instala skills, workflows e regras no home global do OMA (`~/.oma/.agents/`) para todos os projetos. Consulte [Instalação global](../guide/global-install.md).
:::

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

Isso instala o comando `oma` globalmente e permite acessar todos os comandos da CLI em qualquer diretório:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
```

`oma` é a abreviação de `oh-my-agent`. Os dois funcionam como comandos da CLI.

---

## Instalação de ferramentas de CLI de IA

Você precisa ter pelo menos uma ferramenta de CLI de IA instalada. O oh-my-agent é compatível com vários vendors, e você pode misturá-los usando CLIs diferentes para agentes diferentes por meio do mapeamento entre agentes e CLIs.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

A autenticação é automática na primeira execução. O Claude Code usa `.claude/` para hooks e configurações, com skills vinculadas por symlink a partir de `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Depois da instalação, execute `codex login` para autenticar.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Depois da instalação, execute `/auth` dentro da CLI para autenticar.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

A autenticação é tratada por `agy` na primeira execução. O binário é `agy`. Em ambientes headless, defina a variável de ambiente `ANTIGRAVITY_API_KEY`. O `oma doctor` informa o estado da autenticação por meio de `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

O comando `oma install` cria `.agents/oma-config.yaml`. Este é o arquivo de configuração central de todo o comportamento do oh-my-agent:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.8 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-6.1-terra, effort: high }
```

### Referência dos campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `language` | string | Sim | Código do idioma de resposta. Dá suporte a en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Sim | Chave do [preset de modelo](./glossary.md#model-preset) ativo. `auto` segue o runtime atual; as chaves fixas incluem `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` e `mixed`. Chaves de presets personalizados também são válidas. Consulte [Modelos por agente](../guide/per-agent-models.md). |
| `agents` | map | Não | Overrides de modelo por papel; `agents.default` define `cli` (a CLI de fallback para `oma agent spawn` quando as configurações explícitas do agente e o preset selecionado não resolvem um vendor), além de `effort`, `thinking` e `memory` padrão. |
| `providers` | map | Não | Providers de capacidade: `code_intelligence` (`serena` ou `gortex`), `code_intelligence_guard` (`block` ou `off`), `docs` (`context7`), `web` (`native` ou `brave`) e `semantic_memory` (`agentmemory`, `honcho` ou `none`); suas seções de credenciais (`brave`, `exa`, `honcho`); e providers de LLM nomeados como `free` (o gateway FreeLLMAPI usado por `model_preset: free`). Mantenha as chaves de API em variáveis de ambiente. |
| `date_format` | string | Não | Formato do timestamp (`ISO`, `US`, `EU`). Padrão: `ISO`. |
| `timezone` | string | Não | Identificador de fuso horário (por exemplo, `Asia/Seoul`). Valores omitidos usam o fuso horário do sistema host. |
| `auto_update_cli` | boolean | Não | Define se verificações rotineiras da CLI podem atualizar em segundo plano. Padrão: `true` (desative com `false`). |
| `telemetry` | boolean | Não | Ativação opcional da telemetria do vendor. Padrão: `false`. |
| `agents` | map | Não | Overrides parciais por agente (o `AgentSpec` deve ser somente um objeto). Mesclados superficialmente sobre os padrões do preset. |
| `models` | map | Não | Slugs de modelo definidos pelo usuário, anteriormente em `models.yaml`. |
| `custom_presets` | map | Não | Presets definidos pelo usuário. Aceitam `extends:` para herança parcial de um preset integrado. |
| `mcp.devtools_browsers` | list | Não | Navegadores para o MCP do DevTools: `aside`, `chrome` ou `firefox`. Omitir preserva a configuração existente; `[]` desativa explicitamente o servidor de navegador. |
| `serena.mode` | string | Não | `bridge` compartilha um servidor Serena do projeto e é o padrão; `stdio` opta por um processo por sessão. |
| `serena.auto_update` | boolean | Não | Define se `oma update` atualiza o Serena. Padrão: `true`. |

> **Formato da configuração:** um `.agents/oma-config.cue` válido é avaliado como a configuração compartilhada. Se a avaliação do CUE compartilhado falhar, o carregador pode recorrer a `.agents/oma-config.yaml`; um overlay local (`oma-config.local.cue` ou `.yaml`) é opcional, e uma intenção local inválida é fatal. `OMA_MODEL_PRESET` substitui o valor do arquivo no processo atual.

### Resolução do vendor {#vendor-resolution}

Ao iniciar um agente, a CLI resolve as configurações nesta ordem: `agents.<id>`, o `model_preset` selecionado, o fallback do orquestrador do preset e, por fim, `agents.default.cli`. Com `model_preset: auto`, a configuração nativa do runtime atual fornece o modelo; um runtime desconhecido recorre a `agents.default.cli`. Consulte [Modelos por agente](../guide/per-agent-models.md) para a matriz completa.

---

## Verificação: `oma doctor`

Depois da instalação e da configuração, verifique se tudo está funcionando:

```bash
oma doctor
```

Este comando verifica:
- A CLI do host selecionado está instalada e acessível; as ferramentas opcionais são informadas separadamente
- As entradas configuradas de servidores MCP são válidas (por exemplo, Serena, Gortex, Context7 ou DevTools)
- Os arquivos de skills existem com frontmatter válido em SKILL.md
- Os symlinks e scripts de hook apontam para destinos válidos
- Os hooks estão configurados corretamente nos arquivos de configuração do vendor
- Os providers selecionados de inteligência de código e memória estão acessíveis (com o Gortex, também se o projeto atual está no conjunto rastreado pelo daemon)
- `oma-config.cue` / `oma-config.yaml` é válido e contém os campos obrigatórios

Se algo estiver errado, `oma doctor` identifica o item ausente ou inválido e separa os bloqueadores da primeira tarefa dos avisos de integrações opcionais.

Para inspecionar o modelo e a CLI resolvidos para cada agente, execute:

```bash
oma doctor --profile
```

Consulte [Modelos por agente](../guide/per-agent-models.md) para a matriz completa e os detalhes de migração.

---

## Atualização

### Atualização da CLI

```bash
oma update
```

Isso atualiza a CLI global do oh-my-agent para a versão mais recente.

### Atualização das skills do projeto {#project-skills-update}

As skills e os workflows de um projeto podem ser atualizados pela GitHub Action (`action/`), para atualizações automatizadas, ou manualmente, executando o instalador novamente:

```bash
bunx oh-my-agent@latest
```

O instalador detecta instalações existentes e oferece uma atualização, preservando `oma-config.yaml` e qualquer configuração personalizada.

---

## Próximos passos

Abra o projeto na IDE ou CLI com IA selecionada e comece a usar o oh-my-agent. O roteamento de skills depende do host; os hooks habilitados podem detectar workflows. Experimente:

```text
"Build a login form with email validation using Tailwind CSS"
```

Ou use um comando de workflow:

```text
/plan authentication feature with JWT and refresh tokens
```

Consulte o [Guia de uso](/docs/guide/usage) para exemplos detalhados ou leia sobre [Agentes](/docs/core-concepts/agents) para entender a função de cada especialista. Se a instalação ou um hook não se comportar como esperado, consulte [Solução de problemas](../guide/troubleshooting.md).
