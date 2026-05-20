---
title: "Guia: Configuração de Modelo por Agente"
description: Configure qual modelo de IA cada agente usa via model_preset em oma-config.yaml. Cobre presets nativos, overrides por agente, definições inline de modelos, presets personalizados com extends, oma doctor --profile e migração a partir do legado agent_cli_mapping.
---

# Guia: Configuração de Modelo por Agente

## Visão Geral

`model_preset` é o conceito único que controla qual modelo cada agente usa. Escolha um dos sete presets nativos e cada agente (pm, backend, frontend, qa, …) é conectado a um modelo apropriado para aquela stack de fornecedor. Sobrescreva agentes individuais conforme necessário. Defina presets adicionais quando seu time tiver uma combinação fora do padrão.

Toda a configuração vive em um único arquivo: `.agents/oma-config.yaml`.

Esta página cobre:

1. Os sete presets nativos
2. Sobrescrita de agentes individuais com o mapa `agents:`
3. Definição inline de slugs de modelo personalizados com `models:`
4. Definição de presets personalizados com `custom_presets:` e `extends:`
5. Inspeção da configuração resolvida com `oma doctor --profile`
6. Migração a partir do legado `agent_cli_mapping`

---

## Presets Nativos

Defina `model_preset` como uma das sete chaves nativas:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini
```

| Chave | Descrição | Indicado para |
|:----|:-----------|:---------|
| `antigravity` | Todos os agentes usam o Antigravity CLI (`agy`): Gemini 3.1 Pro para implementação/arquitetura, Gemini 3.5 Flash para orquestração e recuperação. A seleção de modelo é configurada internamente pelo `agy` — nenhuma flag `--model` ou `--thinking-budget` é exposta. | Usuários do Antigravity CLI |
| `claude` | Todos os agentes usam Claude (Sonnet/Opus) | Assinantes do Claude Max |
| `codex` | Todos os agentes usam OpenAI Codex (GPT-5.x) com níveis de esforço | Usuários do ChatGPT Plus/Pro |
| `gemini` | Todos os agentes usam Gemini CLI, com thinking habilitado para papéis de implementação | Usuários do Google AI Pro |
| `qwen` | Todos os agentes roteados externamente via Qwen Code; thinking binário (sem níveis de esforço) | Inferência local / self-hosted |
| `cursor` | Todos os agentes usam Cursor `composer-2.5` (`composer-2.5-fast` para orchestrator/qa/pm/docs/retrieval) | Assinantes do Cursor Pro / Pro Student |
| `mixed` | Mista: papéis de implementação usam Codex, architecture/qa/pm usam Claude, retrieval usa Gemini | Pontos fortes cross-vendor sem gerenciar configuração por agente |

Os presets nativos são distribuídos dentro do pacote da CLI e atualizam automaticamente quando você atualiza o `oh-my-agent`. Nenhum arquivo local para manter.

---

## Sobrescrevendo Agentes Individuais

Use o mapa `agents:` para sobrescrever agentes específicos sobre o preset ativo. Apenas os agentes que você listar são afetados; o restante continua com os defaults do preset.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Cada entrada é um objeto `AgentSpec`:

| Campo | Tipo | Obrigatório | Descrição |
|:------|:-----|:---------|:-----------|
| `model` | string | Sim | Slug do modelo (nativo ou definido pelo usuário) |
| `effort` | `low` \| `medium` \| `high` | Não | Esforço de raciocínio (ignorado em modelos que não suportam) |
| `thinking` | boolean | Não | Habilita extended thinking (específico do modelo) |
| `memory` | `user` \| `project` \| `local` | Não | Escopo de memória do agente |

IDs de agente válidos: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

A mesclagem é rasa: cada campo do seu override substitui o valor do preset para aquele campo. Campos que você omitir mantêm o valor do preset.

---

## Definindo Slugs de Modelo Inline

Registre slugs de modelo que ainda não estão no registro nativo sob `models:`. Uma vez registrado, use o slug em qualquer lugar em `agents:` ou `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> Se um slug definido pelo usuário colidir com um slug nativo, a definição do usuário prevalece e um aviso é emitido.

---

## Presets Personalizados

Defina presets adicionais em `custom_presets:`. Use `extends:` para herdar todos os defaults de agente de um preset nativo e sobrescrever apenas os agentes que importam.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # preset base — mesclagem parcial
    description: "Time A — base sonnet, codex para implementação"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # todos os outros agentes herdados de claude
```

Sem `extends:`, você precisa fornecer `agent_defaults` para todos os 11 papéis de agente. Com `extends:`, apenas as entradas que você listar são sobrescritas; o restante é herdado do preset base.

---

## `oma doctor --profile`

Execute `oma doctor --profile` para inspecionar a matriz de modelos totalmente resolvida — depois que os defaults do preset, `custom_presets` e overrides de `agents:` foram mesclados.

```bash
oma doctor --profile
```

**Exemplo de saída:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Cada linha mostra o slug do modelo resolvido e qual fonte o aplicou (`(preset)` ou `(override)`). Use isso sempre que um subagente escolher um fornecedor inesperado.

---

## Migração a Partir do Legado `agent_cli_mapping`

A migração 008 roda automaticamente em `oma install` e `oma update`. Ela converte projetos legados in place:

| Configuração legada | Resultado após migração 008 |
|:-------------|:--------------------------|
| Todas as entradas com o mesmo fornecedor (ex.: todas `gemini`) | `model_preset: gemini`, sem `agents:` |
| Fornecedores mistos | Fornecedor mais frequente → `model_preset`; demais → overrides em `agents:` |
| Valores como objeto `AgentSpec` | Movidos para `agents:` como estão |
| Conteúdo de `models.yaml` | Inlined em `oma-config.yaml.models` |
| `defaults.yaml` customizado | Preservado como `custom_presets.user-customized` com um aviso |

Os originais são copiados para `.agents/.backup-pre-008-{timestamp}/` antes de qualquer alteração. A migração é idempotente — se `model_preset` já está presente, ela é pulada.

Após a migração, `.agents/config/defaults.yaml`, `.agents/config/models.yaml` e o diretório `.agents/config/` são removidos.

---

## Limite de Cota da Sessão

`session.quota_cap` permanece inalterado. Adicione-o ao `oma-config.yaml` para limitar spawn descontrolado de subagentes:

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Quando um limite é atingido, o orchestrator recusa novos spawns e expõe um status `QUOTA_EXCEEDED`.

---

## Exemplo Completo

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

custom_presets:
  my-team:
    extends: claude
    description: "Base Sonnet, Codex para backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Execute `oma doctor --profile` para confirmar a resolução, depois inicie um workflow normalmente.
