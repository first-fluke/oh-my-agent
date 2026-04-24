---
title: "Guia: Configuração de Modelo por Agente"
description: Configure diferentes fornecedores de CLI, modelos e níveis de raciocínio por agente usando oma-config.yaml e models.yaml. Cobre agent_cli_mapping, perfis de runtime, oma doctor --profile, models.yaml e limites de cota de sessão.
---

# Guia: Configuração de Modelo por Agente

## Visão Geral

O oh-my-agent oferece suporte à **seleção de modelo por agente** por meio de `agent_cli_mapping`. Cada agente (pm, backend, frontend, qa, …) pode apontar para um fornecedor, modelo e nível de raciocínio específicos de forma independente, em vez de compartilhar um único fornecedor global.

Esta página cobre:

1. A hierarquia de três arquivos de configuração
2. O formato duplo de `agent_cli_mapping`
3. Os presets de perfis de runtime
4. O comando `oma doctor --profile`
5. Slugs de modelo definidos pelo usuário em `models.yaml`
6. Limites de cota de sessão

---

## Hierarquia de Arquivos de Configuração

O oh-my-agent lê a configuração de três arquivos, em ordem de precedência (mais alta primeiro):

| Arquivo | Finalidade | Editável? |
|:--------|:-----------|:----------|
| `.agents/oma-config.yaml` | Sobrescritas do usuário — mapeamento agente-CLI, perfil ativo, cota de sessão | Sim |
| `.agents/config/models.yaml` | Slugs de modelo fornecidos pelo usuário (adições ao registro embutido) | Sim |
| `.agents/config/defaults.yaml` | Baseline embutido do Profile B (5 `runtime_profiles`, fallbacks seguros) | Não — SSOT |

> `defaults.yaml` faz parte do SSOT e não deve ser modificado diretamente. Toda a personalização acontece em `oma-config.yaml` e `models.yaml`.

---

## Formato Duplo de `agent_cli_mapping`

`agent_cli_mapping` aceita duas formas de valor para que você possa migrar gradualmente:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legado — somente fornecedor (usa modelo padrão)
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

**Forma string legada**: `agent: "vendor"` — continua funcionando, usa o modelo padrão do fornecedor com o effort padrão via o perfil de runtime correspondente.

**Forma objeto AgentSpec**: `agent: { model, effort }` — fixa um slug de modelo exato e um nível de raciocínio (`low`, `medium`, `high`).

Misture e combine livremente. Agentes não especificados recorrem ao `runtime_profile` ativo e, em seguida, ao `agent_defaults` de nível superior em `defaults.yaml`.

---

## Perfis de Runtime

`defaults.yaml` traz o Profile B com cinco `runtime_profiles` prontos para uso. Selecione um em `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # veja as opções abaixo
```

| Perfil | Todos os agentes roteados para | Quando usar |
|:-------|:-------------------------------|:------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Stack Anthropic uniforme |
| `codex-only` | OpenAI Codex (GPT-5.x) | Stack puramente OpenAI |
| `gemini-only` | Gemini CLI | Workflows centrados no Google |
| `antigravity` | Misto: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Forças de múltiplos fornecedores |
| `qwen-only` | Qwen Code | Inferência local / auto-hospedada |

Os perfis são uma forma rápida de reconfigurar toda a frota sem editar cada linha de agente individualmente.

---

## `oma doctor --profile`

A flag `--profile` imprime uma visão em matriz mostrando o fornecedor, modelo e effort resolvidos para cada agente — após a mesclagem de `oma-config.yaml`, `models.yaml` e `defaults.yaml`.

```bash
oma doctor --profile
```

**Exemplo de saída:**

```
oh-my-agent — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   oma-config
backend       openai    gpt-5.3-codex               high     oma-config
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview      low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
retrieval     google    gemini-3.1-flash-lite       —        defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Use esse comando sempre que um subagent escolher um fornecedor inesperado — a coluna `Source` indica qual camada de configuração prevaleceu.

---

## Adicionando Slugs em `models.yaml`

`models.yaml` é opcional e permite registrar slugs de modelo que ainda não estão no registro embutido — útil para modelos recém-lançados.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

Uma vez registrado, o slug fica disponível para uso em `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugs são identificadores — mantenha-os exatamente em inglês, conforme publicado pelo fornecedor.

---

## Limite de Cota de Sessão

Adicione `session.quota_cap` em `oma-config.yaml` para limitar spawns descontrolados de subagents:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # teto total de tokens por sessão
    spawn_count: 40          # máx. subagents paralelos + sequenciais
    per_vendor:              # sub-limites de tokens por fornecedor
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Quando um limite é atingido, o orchestrator recusa novos spawns e emite o status `QUOTA_EXCEEDED`. Deixar um campo sem definição (ou omitir `quota_cap` inteiramente) desativa aquela dimensão.

---

## Juntando Tudo

Um `oma-config.yaml` realista:

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

Execute `oma doctor --profile` para confirmar a resolução e inicie um workflow normalmente.


## Propriedade dos Arquivos de Configuração

| Arquivo | Responsável | Seguro para editar? |
|---------|-------------|---------------------|
| `.agents/config/defaults.yaml` | SSOT distribuído com oh-my-agent | Não — trate como somente leitura |
| `.agents/oma-config.yaml` | Você | Sim — personalize aqui |
| `.agents/config/models.yaml` | Você | Sim — adicione novos slugs aqui |

`defaults.yaml` contém um campo `version:` para que novas versões do oh-my-agent possam adicionar runtime_profiles, novos slugs do Profile B ou ajustar a matriz de effort. Editá-lo diretamente significa que você não receberá essas atualizações automaticamente.

## Atualizando o defaults.yaml

Ao baixar uma nova versão do oh-my-agent, execute `oma install` — o instalador compara a versão local do seu `defaults.yaml` com a versão embutida:

- **Compatível** → nenhuma alteração, silencioso.
- **Incompatível** → aviso:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Incompatível + `--update-defaults`** → a versão embutida sobrescreve a sua:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Seu `oma-config.yaml` e `models.yaml` nunca são tocados pelo instalador.

## Atualizando a partir de uma instalação anterior à versão 5.16.0

Se o seu projeto é anterior ao recurso de modelo/effort por agente:

1. Execute `oma install` (ou `oma update`) na raiz do seu projeto. O instalador deposita um `defaults.yaml` atualizado em `.agents/config/` e executa a migração `003-oma-config`, que move qualquer `.agents/config/user-preferences.yaml` legado para `.agents/oma-config.yaml` automaticamente.
2. Execute `oma doctor --profile`. Seus valores existentes de `agent_cli_mapping: { backend: "gemini" }` são resolvidos por meio de `runtime_profiles.gemini-only.agent_defaults.backend`, de modo que a matriz exibe o slug e o CLI corretos automaticamente.
3. (Opcional) Atualize as entradas string legadas para o novo formato AgentSpec em `oma-config.yaml` quando quiser sobrescritas de `model`, `effort`, `thinking` ou `memory` por agente:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Se você já personalizou o `defaults.yaml`, `oma install` irá alertar sobre a incompatibilidade de versão em vez de sobrescrever. Mova suas personalizações para `oma-config.yaml` / `models.yaml` e então execute `oma install --update-defaults` para aceitar o novo SSOT.

Nenhuma mudança incompatível em `agent:spawn` — configurações legadas continuam funcionando por meio de fallback gracioso enquanto você migra no seu próprio ritmo.
