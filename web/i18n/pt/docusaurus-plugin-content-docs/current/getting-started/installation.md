---
title: Instalação
description: "Guia completo de instalação do oh-my-agent — três métodos de instalação, todos os seis presets com suas listas de habilidades, requisitos de ferramentas CLI para os quatro fornecedores, configuração pós-instalação, campos do oma-config.yaml e verificação com oma doctor."
---

# Instalação

## Pré-requisitos

- **Uma IDE ou CLI com IA** — pelo menos um dos seguintes: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor ou OpenCode
- **bun** — Runtime JavaScript e gerenciador de pacotes (instalado automaticamente pelo script de instalação se ausente)
- **uv** — Gerenciador de pacotes Python para Serena MCP (instalado automaticamente se ausente)

---

## Método 1: Instalação em uma Linha (Recomendado)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Este script:
1. Detecta sua plataforma (macOS, Linux)
2. Verifica a existência de bun e uv, instalando-os se ausentes
3. Executa o instalador interativo com seleção de preset
4. Cria `.agents/` com as habilidades selecionadas
5. Configura a camada de integração `.claude/` (hooks, symlinks, settings)
6. Configura o Serena MCP se detectado

Tempo típico de instalação: menos de 60 segundos.

---

## Método 2: Instalação Manual via bunx

```bash
bunx oh-my-agent@latest
```

Isso lança o instalador interativo sem o bootstrap de dependências. Você precisa ter o bun já instalado.

O instalador solicita que você selecione um preset, que determina quais habilidades são instaladas:

### Presets

| Preset | Habilidades Incluídas |
|--------|-------------------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-scm, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-scm |

Todos os presets incluem oma-pm (planejamento), oma-qa (revisão), oma-debug (correção de bugs), oma-brainstorm (ideação) e oma-scm (git) como agentes base. Presets específicos de domínio adicionam os agentes de implementação relevantes.

Os recursos compartilhados (`_shared/`) são sempre instalados independentemente do preset. Isso inclui roteamento principal, carregamento de contexto, estrutura de prompts, detecção de fornecedor, protocolos de execução e protocolo de memória.

### O que é Criado

Após a instalação, seu projeto conterá:

```
.agents/
├── config/
│   └── oma-config.yaml      # Suas preferências
├── skills/
│   ├── _shared/                    # Recursos compartilhados (sempre instalados)
│   │   ├── core/                   # skill-routing, context-loading, etc.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/               # Por preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Outras habilidades selecionadas
├── workflows/                      # Todas as 16 definições de workflows
├── agents/                         # Definições de subagentes
├── mcp.json                        # Configuração do servidor MCP
├── results/plan-{sessionId}.json                       # Vazio (populado pelo /plan)
├── state/                          # Vazio (usado por workflows persistentes)
└── results/                        # Vazio (populado por execuções de agentes)

.claude/
├── settings.json                   # Hooks e permissões
├── hooks/
│   ├── triggers.json               # Mapeamento palavra-chave para workflow (11 idiomas)
│   ├── keyword-detector.ts         # Lógica de auto-detecção
│   ├── persistent-mode.ts          # Aplicação de workflow persistente
│   └── hud.ts                      # Indicador de statusline [OMA]
├── skills/                         # Symlinks → .agents/skills/
└── agents/                         # Definições de subagentes para IDE

.serena/
└── memories/                       # Estado em tempo de execução (populado durante sessões)
```

---

## Método 3: Instalação Global

Para uso em nível de CLI (dashboards, execução de agentes, diagnósticos), instale oh-my-agent globalmente:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# ou
npm install --global oh-my-agent
```

Isso instala o comando `oma` globalmente, dando acesso a todos os comandos CLI de qualquer diretório:

```bash
oma doctor              # Verificação de saúde
oma dashboard           # Monitoramento no terminal
oma dashboard:web       # Dashboard web em http://localhost:9847
oma agent:spawn         # Executar agentes pelo terminal
oma agent:parallel      # Execução paralela de agentes
oma agent:status        # Verificar status do agente
oma stats               # Estatísticas de sessão
oma retro               # Análise retrospectiva
oma cleanup             # Limpar artefatos de sessão
oma update              # Atualizar oh-my-agent
oma verify              # Verificar saída de agente
oma visualize           # Visualização de dependências
oma describe            # Descrever estrutura do projeto
oma bridge              # Bridge SSE-para-stdio para Antigravity
oma memory:init         # Inicializar provedor de memória
oma auth:status         # Verificar status de autenticação CLI
oma star                # Dar estrela no repositório
```

`oma` é a forma abreviada de `oh-my-agent`. Ambos funcionam como comandos CLI.

---

## Instalação de Ferramentas CLI de IA

Você precisa de pelo menos uma ferramenta CLI de IA instalada. oh-my-agent suporta quatro fornecedores, e você pode misturá-los — usando diferentes CLIs para diferentes agentes via mapeamento agente-CLI.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# ou
npm install --global @google/gemini-cli
```

A autenticação é automática na primeira execução. Gemini CLI lê habilidades de `.agents/skills/` por padrão.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# ou
npm install --global @anthropic-ai/claude-code
```

A autenticação é automática na primeira execução. Claude Code usa `.claude/` para hooks e configurações, com habilidades via symlinks de `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# ou
npm install --global @openai/codex
```

Após a instalação, execute `codex login` para autenticar.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Após a instalação, execute `/auth` dentro do CLI para autenticar.

---

## oma-config.yaml

O comando `oma install` cria `.agents/oma-config.yaml`. Este é o arquivo de configuração central para todo o comportamento do oh-my-agent:

```yaml
# Idioma de resposta para todos os agentes e workflows
language: en

# Formato de data usado em relatórios e arquivos de memória
date_format: "YYYY-MM-DD"

# Fuso horário para timestamps
timezone: "UTC"

# Ferramenta CLI padrão para execução de agentes
# Opções: gemini, claude, codex, qwen
default_cli: gemini

# Mapeamento CLI por agente (sobrescreve default_cli)
agent_cli_mapping:
  frontend: claude       # Raciocínio complexo de UI
  backend: gemini        # Geração rápida de API
  mobile: gemini
  db: gemini
  pm: gemini             # Decomposição rápida
  qa: claude             # Revisão de segurança minuciosa
  debug: claude          # Análise profunda de causa raiz
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Referência de Campos

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|----------|
| `language` | string | `en` | Código do idioma de resposta. Toda saída de agentes, mensagens de workflow e relatórios usam este idioma. Suporta 11 idiomas (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Formato de data para timestamps em planos, arquivos de memória e relatórios. |
| `timezone` | string | `UTC` | Fuso horário para todos os timestamps. Usa identificadores de fuso horário padrão (ex: `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | CLI de fallback quando não existe mapeamento específico de agente. Usado como nível 3 na prioridade de resolução de fornecedor. |
| `agent_cli_mapping` | map | (vazio) | Mapeia IDs de agentes para fornecedores CLI específicos. Tem precedência sobre `default_cli`. |

### Prioridade de Resolução de Fornecedor

Ao executar um agente, o fornecedor CLI é determinado por esta ordem de prioridade (maior primeiro):

1. Flag `--model` passada para `oma agent:spawn`
2. Entrada `agent_cli_mapping` para aquele agente específico em `oma-config.yaml`
3. Configuração `default_cli` em `oma-config.yaml`
4. `active_vendor` em `cli-config.yaml` (fallback legado)
5. `gemini` (fallback codificado final)

---

## Verificação: `oma doctor`

Após instalação e configuração, verifique se tudo está funcionando:

```bash
oma doctor
```

Este comando verifica:
- Todas as ferramentas CLI necessárias estão instaladas e acessíveis
- Configuração do servidor MCP é válida
- Arquivos de habilidades existem com frontmatter SKILL.md válido
- Symlinks em `.claude/skills/` apontam para alvos válidos
- Hooks estão corretamente configurados em `.claude/settings.json`
- Provedor de memória é alcançável (Serena MCP)
- `oma-config.yaml` é YAML válido com campos obrigatórios

Se algo estiver errado, `oma doctor` informa exatamente o que corrigir, com comandos para copiar e colar.

---

## Atualização

### Atualização do CLI

```bash
oma update
```

Isso atualiza o CLI global do oh-my-agent para a versão mais recente.

### Atualização de Habilidades do Projeto

Habilidades e workflows dentro de um projeto podem ser atualizados via GitHub Action (`action/`) para atualizações automatizadas, ou manualmente reexecutando o instalador:

```bash
bunx oh-my-agent@latest
```

O instalador detecta instalações existentes e oferece atualizar preservando seu `oma-config.yaml` e qualquer configuração personalizada.

---

## Próximos Passos

Abra seu projeto na sua IDE de IA e comece a usar oh-my-agent. As habilidades são detectadas automaticamente. Experimente:

```
"Construa um formulário de login com validação de email usando Tailwind CSS"
```

Ou use um comando de workflow:

```
/plan funcionalidade de autenticação com JWT e refresh tokens
```

Veja o [Guia de Uso](/docs/guide/usage) para exemplos detalhados, ou aprenda sobre [Agentes](/docs/core-concepts/agents) para entender o que cada especialista faz.
