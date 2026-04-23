---
title: "Guia: configuração de modelo por agente"
description: Configure diferentes fornecedores de CLI, modelos e níveis de raciocínio por agente com RARDO v2.1. Cobre agent_cli_mapping, perfis de runtime, oma doctor --profile, models.yaml e o limite de quota de sessão.
---

# Guia: configuração de modelo por agente

## Visão geral

O RARDO v2.1 introduz a **seleção de modelo por agente** através de `agent_cli_mapping`. Cada agente (pm, backend, frontend, qa…) pode agora apontar para o seu próprio fornecedor, modelo e nível de raciocínio — em vez de partilharem um único fornecedor global.

Esta página cobre:

1. A hierarquia de três ficheiros de configuração
2. O formato dual de `agent_cli_mapping`
3. Os presets de perfis de runtime
4. O comando `oma doctor --profile`
5. Slugs de modelo definidos pelo utilizador em `models.yaml`
6. O limite de quota de sessão

---

## Hierarquia dos ficheiros de configuração

O RARDO v2.1 lê três ficheiros por ordem de precedência (do mais alto para o mais baixo):

| Ficheiro | Objetivo | Editável? |
|:---------|:---------|:----------|
| `.agents/config/user-preferences.yaml` | Overrides do utilizador — mapping agente-CLI, perfil ativo, quota de sessão | Sim |
| `.agents/config/models.yaml` | Slugs de modelo fornecidos pelo utilizador (adições ao registry embutido) | Sim |
| `.agents/config/defaults.yaml` | Baseline Profile B embutido (4 `runtime_profiles`, fallbacks seguros) | Não — SSOT |

> `defaults.yaml` faz parte do SSOT e não deve ser modificado diretamente. Toda a personalização ocorre em `user-preferences.yaml` e `models.yaml`.

---

## Formato dual de `agent_cli_mapping`

`agent_cli_mapping` aceita duas formas de valor para permitir migração gradual:

```yaml
# .agents/config/user-preferences.yaml
agent_cli_mapping:
  pm: "claude"                        # legado — só fornecedor (usa modelo padrão)
  backend:                            # novo objeto AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**Forma string legada**: `agent: "vendor"` — continua a funcionar; usa o modelo e o effort padrão do fornecedor.

**Forma objeto AgentSpec**: `agent: { model, effort }` — fixa um slug de modelo exato e um nível de raciocínio (`low`, `medium`, `high`).

As duas formas podem ser misturadas livremente. Agentes não declarados recorrem ao `runtime_profile` ativo.

---

## Perfis de runtime

O `defaults.yaml` traz o Profile B com quatro `runtime_profiles` prontos a usar. Escolha um em `user-preferences.yaml`:

```yaml
# .agents/config/user-preferences.yaml
active_profile: claude-only   # ver opções abaixo
```

| Perfil | Todos os agentes roteados para | Quando usar |
|:-------|:--------------------------------|:------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic uniforme |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack puramente OpenAI |
| `gemini-only` | Gemini CLI | Workflows centrados no Google |
| `antigravity` | Misto: pm→claude, backend→codex, qa→gemini | Combinar forças entre fornecedores |
| `qwen-only` | Qwen CLI | Inferência local / auto-hospedada |

Os perfis são a forma rápida de reconfigurar toda a frota sem editar linha a linha.

---

## `oma doctor --profile`

A nova flag `--profile` imprime uma matriz com o fornecedor, modelo e effort resolvidos para cada agente **depois** de fundidos os três ficheiros de configuração.

```bash
oma doctor --profile
```

**Exemplo de saída:**

```
RARDO v2.1 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4.7           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3-pro                low      profile:antigravity
architecture  claude    claude-opus-4.7             high     defaults
docs          claude    claude-sonnet-4.7           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Se um subagente escolher um fornecedor inesperado, corra este comando primeiro: a coluna `Source` indica qual camada de configuração venceu.

---

## Adicionar slugs em `models.yaml`

`models.yaml` é opcional e serve para registar slugs de modelo que ainda não estão no registry embutido — útil para modelos recém-lançados.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — release candidate GPT-5.5 Spud"
```

Uma vez registado, o slug pode ser usado em `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Os slugs são identificadores — mantenha exatamente a grafia em inglês publicada pelo fornecedor.

---

## Limite de quota de sessão

Adicione `session.quota_cap` em `user-preferences.yaml` para limitar spawns descontrolados de subagentes:

```yaml
# .agents/config/user-preferences.yaml
session:
  quota_cap:
    tokens: 2_000_000        # teto total de tokens por sessão
    spawn_count: 40          # máx. subagentes paralelos + sequenciais
    per_vendor:              # sub-limites de tokens por fornecedor
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Quando um limite é atingido, o orquestrador recusa novos spawns e emite o estado `QUOTA_EXCEEDED`. Deixar um campo por definir (ou omitir `quota_cap` por inteiro) desativa essa dimensão.

---

## Juntando tudo

Um `user-preferences.yaml` realista:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Corra `oma doctor --profile` para confirmar a resolução e inicie o workflow como de costume.
