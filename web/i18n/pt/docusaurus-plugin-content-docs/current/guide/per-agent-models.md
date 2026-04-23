---
title: "Guia: configuração de modelo por agente"
description: Configure diferentes fornecedores de CLI, modelos e níveis de raciocínio por agente com . Cobre agent_cli_mapping, perfis de runtime, oma doctor --profile, models.yaml e o limite de quota de sessão.
---

# Guia: configuração de modelo por agente

## Visão geral

O  introduz a **seleção de modelo por agente** através de `agent_cli_mapping`. Cada agente (pm, backend, frontend, qa…) pode agora apontar para o seu próprio fornecedor, modelo e nível de raciocínio — em vez de partilharem um único fornecedor global.

Esta página cobre:

1. A hierarquia de três ficheiros de configuração
2. O formato dual de `agent_cli_mapping`
3. Os presets de perfis de runtime
4. O comando `oma doctor --profile`
5. Slugs de modelo definidos pelo utilizador em `models.yaml`
6. O limite de quota de sessão

---

## Hierarquia dos ficheiros de configuração

O  lê três ficheiros por ordem de precedência (do mais alto para o mais baixo):

| Ficheiro | Objetivo | Editável? |
|:---------|:---------|:----------|
| `.agents/oma-config.yaml` | Overrides do utilizador — mapping agente-CLI, perfil ativo, quota de sessão | Sim |
| `.agents/config/models.yaml` | Slugs de modelo fornecidos pelo utilizador (adições ao registry embutido) | Sim |
| `.agents/config/defaults.yaml` | Baseline Profile B embutido (4 `runtime_profiles`, fallbacks seguros) | Não — SSOT |

> `defaults.yaml` faz parte do SSOT e não deve ser modificado diretamente. Toda a personalização ocorre em `user-preferences.yaml` e `models.yaml`.

---

## Formato dual de `agent_cli_mapping`

`agent_cli_mapping` aceita duas formas de valor para permitir migração gradual:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legado — só fornecedor (usa modelo padrão)
  backend:                            # novo objeto AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Forma string legada**: `agent: "vendor"` — continua a funcionar; usa o modelo e o effort padrão do fornecedor.

**Forma objeto AgentSpec**: `agent: { model, effort }` — fixa um slug de modelo exato e um nível de raciocínio (`low`, `medium`, `high`).

As duas formas podem ser misturadas livremente. Agentes não declarados recorrem ao `runtime_profile` ativo.

---

## Perfis de runtime

O `defaults.yaml` traz o Profile B com quatro `runtime_profiles` prontos a usar. Escolha um em `user-preferences.yaml`:

```yaml
# .agents/oma-config.yaml
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
 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview              low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
docs          claude    claude-sonnet-4-6           low      defaults

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
# .agents/oma-config.yaml
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
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
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


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
