---
title: Instalação
description: "Instale o oh-my-agent, escolha habilidades e provedores, entenda os arquivos de projeto gerados, configure os padrões de modelo e runtime e verifique a instalação com oma doctor."
---

# Instalação

## Pré-requisitos

- **Uma IDE ou CLI com IA**: pelo menos um host compatível, como Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot ou Hermes
- **bun**: runtime JavaScript e gerenciador de pacotes (instalado automaticamente pelo script de instalação se estiver ausente)
- **uv**: gerenciador de pacotes Python (o script de bootstrap oferece a instalação quando estiver ausente)
- **Provedor de inteligência de código**: Serena é o provedor padrão. Gortex também é compatível quando selecionado na configuração de provedores. O instalador pode inicializar o Serena com `uv tool install`; quando uma dependência opcional não está disponível, ele continua e exibe um aviso. Com o Gortex selecionado, `oma install` e `oma update` em modo de projeto registram o projeto no daemon do Gortex (`gortex track`) quando ele ainda não está rastreado e adicionam os diretórios gerados pelo OMA à lista de exclusão desse projeto por meio da CLI do Gortex; nada é gravado na árvore do projeto. O próprio Gortex precisa ser instalado separadamente.

O instalador agrupa as integrações por capacidade. Os fornecedores de hooks incluem Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro e Qwen; OpenCode e pi usam bridges de extensão; GitHub Copilot e Hermes recebem links para habilidades; e ZCode recebe comandos de workflow. Você pode selecionar mais de um fornecedor, mas a primeira tarefa precisa apenas do host que pretende usar.

---

## Método 0: skills CLI (o mais rápido para instalar só habilidades)

Instale o pacote de habilidades do OMA nos runtimes de agentes detectados:

```bash
npx skills add first-fluke/oh-my-agent
```

Esta é a porta de entrada mais leve quando você quer só as habilidades, sem o harness completo. Para workflows, regras, hooks, gates e `oma agent spawn`, use o Método 1 ou 2 abaixo.

## Método 1: instalação em uma linha (harness completo)

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
3. Executam o instalador interativo com seleção de preset e provedor
4. Criam `.agents/` com as habilidades e a configuração selecionadas
5. Configuram as camadas de integração do runtime (hooks, symlinks e configurações dos fornecedores detectados)
6. Configuram os servidores MCP de inteligência de código e memória

O bootstrap continua depois de falhas em dependências opcionais e informa os comandos de acompanhamento. Execute `oma doctor` depois que o instalador terminar.

---

## Método 2: instalação manual via bunx

```bash
bunx oh-my-agent@latest
```

Isso inicia o instalador interativo sem o bootstrap de dependências. Você precisa ter o bun instalado.

O instalador pede que você escolha um preset de habilidades. Os presets atuais estão definidos em `cli/constants/skill-data.ts`:

### Presets

| Preset | Habilidades incluídas |
|--------|-----------------------|
| **all** | Todos os 33 pacotes de habilidades atuais |
| **fullstack** | Arquitetura, brainstorming, design, frontend, backend, mobile, banco de dados, PM, QA, depuração, SCM, Terraform e workflow de desenvolvimento |
| **fullstack-web** | Implementação web fullstack, arquitetura, design, PM, QA, depuração, SCM e workflow de desenvolvimento |
| **fullstack-mobile** | Implementação fullstack com foco em mobile, arquitetura, design, PM, QA, depuração, SCM e workflow de desenvolvimento |
| **frontend** | Arquitetura, brainstorming, design, frontend, PM, QA, depuração e SCM |
| **backend** | Arquitetura, brainstorming, backend, banco de dados, PM, QA, depuração, SCM e workflow de desenvolvimento |
| **mobile** | Arquitetura, brainstorming, mobile, PM, QA, depuração e SCM |
| **devops** | Arquitetura, brainstorming, Terraform, workflow de desenvolvimento, observabilidade, PM, QA, depuração e SCM |
| **research** | Scholar, market, PDF, HWP, escrita acadêmica, pesquisa, tradução e SCM |
| **content** | Design, imagem, voz, escrita acadêmica, tradução e SCM |

Presets são conjuntos de habilidades; eles não criam uma definição de subagente para cada habilidade. O preset `all` é expandido a partir do registro ativo de habilidades, então a lista pode crescer com o repositório. Presets de domínio incluem apenas as habilidades necessárias para aquele foco.

Os recursos compartilhados (`_shared/`) são sempre instalados, independentemente do preset. Isso inclui roteamento central, carregamento de contexto, estrutura de prompt, detecção de fornecedor, protocolos de execução e protocolo de memória.

### O que é criado

Após a instalação, seu projeto conterá:

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

O instalador cria diretórios de fornecedores apenas para os hosts que você selecionar. A fonte dos hooks permanece em `.agents/hooks/core/`; os arquivos de fornecedores gerados são saídas de integração. Em projetos antigos, o Serena também pode usar um diretório legado `.serena/memories/`.

---

## Método 3: instalação global

Para usar a CLI (dashboards, criação de agentes e diagnósticos), instale o oh-my-agent globalmente:

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
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` é a abreviação de `oh-my-agent`. Os dois funcionam como comandos da CLI.

---

## Instalação de ferramentas de CLI de IA

Você precisa ter pelo menos uma ferramenta de CLI de IA instalada. O oh-my-agent é compatível com vários fornecedores, e você pode misturá-los usando CLIs diferentes para agentes diferentes por meio do mapeamento entre agentes e CLIs.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

A autenticação é automática na primeira execução. O Claude Code usa `.claude/` para hooks e configurações, com habilidades vinculadas por symlink a partir de `.agents/skills/`.

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
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Referência dos campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `language` | string | Sim | Código do idioma de resposta. Dá suporte a en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Sim | Chave do preset ativo. `auto` segue o runtime atual; as chaves fixas incluem `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` e `mixed`. Chaves de presets personalizados também são válidas. Consulte [Modelos por agente](../guide/per-agent-models.md). |
| `default_cli` | string | Não | CLI de fallback para `oma agent spawn` quando as configurações explícitas do agente e o preset selecionado não resolvem um fornecedor. |
| `free` | map | Não | Configurações do gateway FreeLLMAPI usadas quando `model_preset: free` está ativo; mantenha as chaves de API em variáveis de ambiente. |
| `providers` | map | Não | Provedores de capacidade: `code_intelligence` (`serena` ou `gortex`), `code_intelligence_guard` (`block` ou `off`), `docs` (`context7`), `web` (`native` ou `brave`) e `semantic_memory` (`agentmemory`, `honcho` ou `none`). |
| `date_format` | string | Não | Formato do timestamp (`ISO`, `US`, `EU`). Padrão: `ISO`. |
| `timezone` | string | Não | Identificador de fuso horário (por exemplo, `Asia/Seoul`). Valores omitidos usam o fuso horário do sistema host. |
| `auto_update_cli` | boolean | Não | Define se verificações rotineiras da CLI podem atualizar em segundo plano. Padrão: `true` (desative com `false`). |
| `telemetry` | boolean | Não | Ativação opcional da telemetria do fornecedor. Padrão: `false`. |
| `agents` | map | Não | Overrides parciais por agente (o `AgentSpec` deve ser somente um objeto). Mesclados superficialmente sobre os padrões do preset. |
| `models` | map | Não | Slugs de modelo definidos pelo usuário, anteriormente em `models.yaml`. |
| `custom_presets` | map | Não | Presets definidos pelo usuário. Aceitam `extends:` para herança parcial de um preset integrado. |
| `mcp.devtools_browsers` | list | Não | Navegadores para o MCP do DevTools: `aside`, `chrome` ou `firefox`. Omitir preserva a configuração existente; `[]` desativa explicitamente o servidor de navegador. |
| `serena.mode` | string | Não | `bridge` compartilha um servidor Serena do projeto e é o padrão; `stdio` opta por um processo por sessão. |
| `serena.auto_update` | boolean | Não | Define se `oma update` atualiza o Serena. Padrão: `true`. |

> **Formato da configuração:** um `.agents/oma-config.cue` válido é avaliado como a configuração compartilhada. Se a avaliação do CUE compartilhado falhar, o carregador pode recorrer a `.agents/oma-config.yaml`; um overlay local (`oma-config.local.cue` ou `.yaml`) é opcional, e uma intenção local inválida é fatal. `OMA_MODEL_PRESET` substitui o valor do arquivo no processo atual.

### Resolução do fornecedor

Ao iniciar um agente, a CLI resolve as configurações nesta ordem: `agents.<id>`, o `model_preset` selecionado, o fallback do orquestrador do preset e, por fim, `default_cli`. Com `model_preset: auto`, a configuração nativa do runtime atual fornece o modelo; um runtime desconhecido recorre a `default_cli`. Consulte [Modelos por agente](../guide/per-agent-models.md) para a matriz completa.

---

## Verificação: `oma doctor`

Depois da instalação e da configuração, verifique se tudo está funcionando:

```bash
oma doctor
```

Este comando verifica:
- A CLI do host selecionado está instalada e acessível; as ferramentas opcionais são informadas separadamente
- As entradas configuradas de servidores MCP são válidas (por exemplo, Serena, Gortex, Context7 ou DevTools)
- Os arquivos de habilidades existem com frontmatter válido em SKILL.md
- Os symlinks e scripts de hook apontam para destinos válidos
- Os hooks estão configurados corretamente nos arquivos de configuração do fornecedor
- Os provedores selecionados de inteligência de código e memória estão acessíveis (com o Gortex, também se o projeto atual está no conjunto rastreado pelo daemon)
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

### Atualização das habilidades do projeto

As habilidades e os workflows de um projeto podem ser atualizados pela GitHub Action (`action/`), para atualizações automatizadas, ou manualmente, executando o instalador novamente:

```bash
bunx oh-my-agent@latest
```

O instalador detecta instalações existentes e oferece uma atualização, preservando `oma-config.yaml` e qualquer configuração personalizada.

---

## Próximos passos

Abra o projeto na IDE ou CLI com IA selecionada e comece a usar o oh-my-agent. O roteamento de habilidades depende do host; os hooks habilitados podem detectar workflows. Experimente:

```
"Build a login form with email validation using Tailwind CSS"
```

Ou use um comando de workflow:

```
/plan authentication feature with JWT and refresh tokens
```

Consulte o [Guia de uso](/docs/guide/usage) para exemplos detalhados ou leia sobre [Agentes](/docs/core-concepts/agents) para entender a função de cada especialista.
