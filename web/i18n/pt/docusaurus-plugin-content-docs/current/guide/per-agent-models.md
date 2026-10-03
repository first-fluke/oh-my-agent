---
title: "Guia: Configuração de modelos por agente"
sidebar_label: Modelos dos agentes
description: "Configure qual modelo de IA cada agente usa por meio de model_preset em oma-config.yaml. Abrange presets integrados, substituições por agente, definições inline de modelos, presets personalizados com extends, oma doctor --profile e a migração de agent_cli_mapping legado."
---

# Guia: Configuração de modelos por agente

## Visão geral

`model_preset: auto` é o padrão de novas instalações. Agentes sem configuração usam as definições nativas de agente e as configurações de modelo do vendor do runtime atual. Escolha um preset fixo para fixar modelos ou substitua agentes individuais quando precisar de outro modelo ou vendor. Presets explícitos existentes são preservados durante reinstalações e atualizações.

A configuração compartilhada fica em `.agents/oma-config.cue` ou `.agents/oma-config.yaml`. Um arquivo local opcional, ignorado pelo Git, substitui as configurações para sua máquina.

Para consultar a referência completa de chaves de nível superior e precedência, veja a [Referência de configuração](/docs/guide/configuration-reference).

Esta página cobre:

1. Os presets integrados
2. A substituição de agentes individuais com o mapa `agents:`
3. A inclusão inline de slugs de modelos com `models:`
4. A definição de presets personalizados com `custom_presets:` e `extends:`
5. A inspeção da configuração resolvida com `oma doctor --profile`
6. A migração de `agent_cli_mapping` legado

---

## Presets integrados

Defina `model_preset` como uma das chaves integradas:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| Chave | Descrição | Mais indicado para |
|:-----|:-----------|:-------------------|
| `auto` | Segue as configurações de agente/modelo do runtime atual sem injetar uma flag de modelo ou esforço | Padrão para novas instalações |
| `free` | Modo especial de gateway para processos Codex, Claude ou Qwen iniciados pelo OMA; é resolvido separadamente do registro de presets integrados. | Gateway FreeLLMAPI local |
| `antigravity` | Todos os agentes usam a CLI Antigravity (`agy`): Gemini 3.1 Pro para implementação/arquitetura e Gemini 3.6 Flash para orquestração, documentação e exploração. A seleção de modelo é orientada pela configuração dentro de `agy`; não há flags `--model` ou `--thinking-budget` expostas. | Usuários da CLI Antigravity |
| `claude` | Todos os agentes usam Claude (Sonnet/Opus) | Usuários da assinatura Claude Max |
| `codex` | Todos os agentes usam OpenAI Codex (GPT-5.5 para a maioria dos papéis, GPT-5.4-mini para exploração), com níveis de esforço | Usuários do ChatGPT Plus/Pro |
| `qwen` | Todos os agentes usam o Qwen Code; sessões Qwen correspondentes podem usar agentes nativos gerados, e outros runtimes usam dispatch via CLI | Inferência local ou hospedada por você |
| `kiro` | Todos os agentes usam a CLI Kiro; Sonnet cuida da implementação/arquitetura e Haiku da orquestração/exploração | Usuários do Kiro |
| `cursor` | Todos os agentes usam o Cursor `composer-2.5` (`composer-2.5-fast` para orchestrator/qa/pm/docs/explore) | Usuários Cursor Pro ou Pro Student |
| `mixed` | Misto: papéis de implementação usam Codex, arquitetura/qa/pm usam Claude e exploração usa Gemini | Combinar pontos fortes de vendors sem gerenciar a configuração por agente |

Os presets integrados são distribuídos dentro do pacote da CLI e atualizados automaticamente quando você atualiza o `oh-my-agent`. `gemini` é um alias de compatibilidade que redireciona para `antigravity`; não é um preset atual separado. Nenhum arquivo de preset local é necessário.

---

## Dispatch automático

Com `auto`, substituições explícitas de modelo em `agents.<id>` têm prioridade. Caso contrário, o OMA detecta o runtime atual e usa o caminho de subagente nativo quando disponível. Agentes de outro vendor e runtimes sem dispatch nativo usam `oma agent spawn`. Auto não se expande para um preset de vendor fixo.

No dispatch pela CLI, `--vendor` seleciona explicitamente o alvo. Sem essa opção, o OMA usa o runtime detectado e depois `default_cli` quando a detecção falha (`claude` se omitido). Planos herdados não injetam flags de modelo ou esforço do OMA; a configuração de agente ou sessão do próprio vendor fornece essas opções. Um processo de CLI externo usa os padrões persistidos por essa CLI, que podem ser diferentes de um modelo selecionado apenas na sessão pai.

`oma doctor --profile` mostra `(vendor agent default)` para agentes herdados e o modelo resolvido para substituições explícitas. Arquivos nativos de agente mantêm as definições do vendor; substituições do mesmo vendor no modo auto são aplicadas quando esses arquivos são gerados por install/update.

## Configuração local

Crie **um** destes arquivos ao lado da configuração compartilhada: `.agents/oma-config.local.cue` ou `.agents/oma-config.local.yaml`. Install, link e update adicionam os dois caminhos ao `.gitignore`; update preserva arquivos locais existentes, inclusive com `--force`.

O OMA seleciona o diretório de configuração do projeto mais próximo. Dentro dele, o CUE compartilhado tem prioridade sobre o YAML compartilhado, e o arquivo local substitui os valores compartilhados. Arquivos CUE são avaliados de forma independente antes da mesclagem, portanto um `model_preset: "auto"` compartilhado pode ser substituído pelo local `"free"`. Objetos são mesclados recursivamente; arrays, escalares e `null` substituem o valor compartilhado. Um arquivo local malformado, um executável CUE ausente para CUE local ou a presença dos dois formatos locais é um erro, e não uma autorização para usar padrões compartilhados.

Opções do comando e substituições de ambiente suportadas têm precedência sobre a configuração efetiva dos arquivos. `oma doctor --profile` mostra quais arquivos foram usados. Arquivos locais não acompanham clones Git nem novos worktrees. Subprocessos do modo free herdam `OMA_MODEL_PRESET=free` e o ambiente do gateway resolvido, para que spawns aninhados do OMA preservem a rota; sessões iniciadas de forma independente precisam da própria configuração local ou do ambiente. Configurações salvas por comandos de instalação/setup ainda têm como alvo a configuração compartilhada; uma substituição local continua vencendo em runtime.

## Preset FreeLLMAPI {#freellmapi-preset}

Mantenha `model_preset: auto` no arquivo compartilhado e ative localmente:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

O arquivo YAML equivalente é:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

Inicie o FreeLLMAPI separadamente e exporte sua chave unificada como `FREELLM_API_KEY`. O OMA também aceita `FREELLMAPI_API_KEY` do upstream quando a variável de chave padrão é selecionada; a variável canônica vence quando ambas estão definidas. Um `api_key_env` personalizado lê somente essa variável. Nunca coloque a chave no arquivo de configuração. `OMA_MODEL_PRESET` substitui o preset. `FREELLM_BASE_URL` e `FREELLM_MODEL` substituem as respectivas configurações do arquivo. Os valores do exemplo são os padrões, portanto apenas `model_preset: free` basta quando o servidor e a chave estiverem prontos.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

O modo free usa `free.model` para todo papel encaminhado pelo OMA, inclusive papéis que já têm pins `agents.*.model`. Ele não resolve esses pins em assinaturas pagas. Escolha `auto`, um ID de modelo do gateway ou uma cadeia nomeada do gateway, como `auto:coding` (crie essa cadeia primeiro no FreeLLMAPI).

O transporte é escolhido nesta ordem: `--vendor`, depois `OMA_RUNTIME_VENDOR`, depois um runtime detectado compatível, depois `default_cli` e, por fim, `codex`. Somente os transportes Codex, Claude e Qwen são suportados. Selecionar explicitamente um transporte não suportado é um erro.

| Transporte | Endpoint do gateway | URL base da CLI |
|:--|:--|:--|
| Codex | `/v1/responses` | Inclui `/v1` |
| Claude | `/v1/messages` | Raiz do servidor; o OMA remove o sufixo `/v1` |
| Qwen | `/v1/chat/completions` | Inclui `/v1` |

Use `oma agent spawn` mesmo quando o pai usa o mesmo vendor. O OMA injeta a conexão e as credenciais do gateway somente nesse subprocesso; mudar o preset não muda o modelo de uma sessão host já aberta nem da ferramenta de subagente nativa do host. O Codex recebe um provider customizado de Responses pelos argumentos da invocação, enquanto a chave permanece no ambiente filho. Claude e Qwen recebem as configurações de endpoint compatíveis. Configurações conflitantes de Claude/Qwen que substituiriam a rota ou a chave são informadas antes da execução; o OMA não reescreve esses arquivos.

Spawn e review verificam o `GET /v1/models` autenticado antes de iniciar o agente. Chaves ausentes, falhas de conexão e erros HTTP de autenticação interrompem a execução. `oma doctor --profile` mostra a URL/modelo efetivos, substituições de ambiente, presença da chave e prontidão do servidor sem imprimir a chave. Prontidão não garante que um modelo tenha cota suficiente para concluir uma tarefa.

O FreeLLMAPI controla o failover de provider no nível da requisição. O failover explícito do OMA, baseado em checkpoints, continua sendo um mecanismo separado de recuperação de processo; cada sucessor no modo free ainda precisa usar um transporte FreeLLMAPI suportado. Não há retorno automático à configuração de um vendor pago.

O preset free configura a inferência dos agentes. Ele não altera a configuração de embeddings de serviços de memória existentes. O FreeLLMAPI também expõe `/v1/embeddings`; ao configurar separadamente um vector store, fixe uma família de modelos para que os vetores existentes mantenham um espaço compatível.

Referências upstream: [configuração do cliente](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [famílias de API e embeddings](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Substituição de agentes individuais

Use o mapa `agents:` para substituir agentes específicos sobre o preset ativo. Somente os agentes listados são afetados; os demais seguem as configurações do vendor no modo auto ou os padrões do preset fixo selecionado.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Cada entrada é um objeto `AgentSpec`:

| Campo | Tipo | Obrigatório | Descrição |
|:------|:-----|:------------|:-----------|
| `model` | string | Sim | Slug de modelo (integrado ou definido pelo usuário) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | Não | Esforço de raciocínio (ignorado em modelos que não o suportam) |
| `thinking` | boolean | Não | Ativa o extended thinking (específico do modelo) |
| `memory` | `user` \| `project` \| `local` | Não | Escopo de memória do agente |

IDs de agentes válidos: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore`.

A mesclagem é superficial: cada campo da sua substituição substitui o valor do preset para esse campo. Campos omitidos mantêm o valor do preset.

---

## Inclusão inline de slugs de modelos {#inlining-model-slugs}

Registre em `models:` os slugs de modelos que ainda não estão no registro integrado. Depois de registrados, referencie o slug em `agents:` ou `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false
```

Aplicam-se duas regras a um slug registrado que você referencia em `agents:`:

1. **A chave deve estar no formato `owner/model`.** `agents.<id>.model` é validado
   contra um padrão `owner/model`, portanto uma chave simples como `my-fast-model`
   é rejeitada; use uma chave com barra, como `google/gemini-3-flash-fast` (ou o
   slug `provider/model` do próprio vendor).
2. **A especificação deve estar completa.** `cli`, `cli_model`, `auth_hint` e todos
   os booleanos de `supports` são necessários no momento da resolução. Uma
   especificação incompleta é aceita pelo parser de configuração, mas falha na
   validação do registro de modelos e recorre silenciosamente ao registro principal.

> Se um slug definido pelo usuário colidir com um slug integrado, a definição do usuário vence e um aviso é emitido.

---

## Presets personalizados

Defina presets adicionais em `custom_presets:`. Use `extends:` para herdar todos os padrões de agentes de um preset integrado e substituir somente os agentes necessários.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

Sem `extends:`, forneça padrões para os papéis canônicos de agentes usados pelo preset. Com `extends:`, somente as entradas listadas são substituídas; o restante é herdado do preset base.

---

## `oma doctor --profile`

Execute `oma doctor --profile` para inspecionar a matriz de modelos totalmente resolvida depois que os padrões do preset, `custom_presets` e as substituições `agents:` forem mesclados.

```bash
oma doctor --profile
```

**Saída de exemplo:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Cada linha exibe o slug do modelo resolvido e qual origem o aplicou (`(preset)` ou `(override)`). Use isso sempre que um subagente escolher um vendor inesperado.

---

## Migração de `agent_cli_mapping` legado

A migração 008 é executada automaticamente em `oma install` e `oma update`. Ela converte projetos legados no próprio local:

| Configuração legada | Resultado após a migração 008 |
|:--------------------|:-------------------------------|
| Todas as entradas usam o mesmo vendor (por exemplo, todas `gemini`) | `model_preset: gemini`, sem `agents:` |
| Vendors mistos | Vendor mais frequente → `model_preset`; os demais → substituições em `agents:` |
| Valores de objeto `AgentSpec` | Movidos para `agents:` sem alterações |
| Conteúdo de `models.yaml` | Incluído em `oma-config.yaml.models` |
| `defaults.yaml` personalizado | Preservado como `custom_presets.user-customized`, com um aviso |

Os originais são copiados para `.agents/.backup-pre-008-{timestamp}/` antes de qualquer alteração. A migração é idempotente. Se `model_preset` já estiver presente, ela é ignorada.

<!-- oma-docs:ignore-start -->
Depois da migração, `.agents/config/defaults.yaml`, `.agents/config/models.yaml` e o diretório `.agents/config/` são removidos.
<!-- oma-docs:ignore-end -->

---

## Limite de cota da sessão

`session.quota_cap` não muda. Adicione-o a `oma-config.yaml` para limitar a criação desenfreada de subagentes:

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

Quando um limite é atingido, o orquestrador recusa novos spawns e expõe um status `QUOTA_EXCEEDED`.

---

## Exemplo completo

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Execute `oma doctor --profile` para confirmar a resolução e então inicie um workflow como de costume.

---

## Dispatch pelo pi (runtime de transporte)

[pi](https://github.com/earendil-works/pi) (Earendil) é um runtime proxy multi-provider,
não um proprietário de modelos: ele consegue executar qualquer modelo de provider real
(Anthropic, OpenAI ou Google) por uma única CLI. O oma trata pi como uma **camada de
transporte**: seu `model_preset` e as substituições em `agents:` permanecem exatamente
como estão, enquanto pi se torna a CLI executora de um agente específico.

Encaminhe qualquer agente pelo pi com a substituição `--vendor pi`:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

O que acontece:

- O modelo por agente resolvido a partir do seu preset/substituições (por exemplo,
  `openai/gpt-5.5`) é traduzido para o formato `--model <provider/id>` do pi, e `effort`
  é traduzido para o nível `--thinking` do pi. **Modelos por subagente funcionam no pi
  exatamente como nativamente**: agentes diferentes podem executar modelos diferentes.
- A persona do agente (prompt do sistema) é embutida a partir de `.agents/agents/<id>.md`,
  pois o pi não tem um arquivo de agente no vendor.
- A autenticação é a que o próprio pi estiver configurado para usar (`~/.pi/agent/auth.json`
  ou uma chave de API do provider no ambiente). `oma doctor` informa o status de
  instalação e autenticação do pi junto com as outras CLIs.

**Restrição:** o pi executa somente modelos de providers reais. Presets proprietários
de CLI (`cursor`, `kiro`, `qwen`, `antigravity`) nomeiam modelos que existem apenas
dentro das próprias CLIs, portanto encaminhá-los pelo pi é rejeitado com um erro claro.
Use um preset de provider real (`claude`, `codex`, `gemini` ou `mixed`) ao encaminhar
agentes pelo pi.

> O catálogo de modelos do pi é controlado por versão e exige autenticação. Se um slug resolvido
> não corresponder ao que sua instalação do pi expõe, confira `pi --list-models`; a correspondência
> de `--model` do pi é fuzzy, então a maioria dos slugs de providers funciona como está.

### Modelos fora do registro integrado do pi (por exemplo, Z.ai GLM)

O pi resolve `--model` no próprio **registro de modelos integrado**, e a configuração
`defaultProvider` só é consultada quando nenhum modelo é passado. Para Z.ai, o pi
distribui apenas um subconjunto de IDs GLM (`glm-4.7`, `glm-4.5-air`, `glm-5-turbo`,
`glm-5.1`, `glm-5v-turbo` na versão pi 0.80.x); um preset que nomeie qualquer outro
ID não conseguirá resolvê-lo.

Há duas formas de lidar com isso:

1. **IDs do registro:** restrinja o preset aos IDs do registro. Use o formato
   `provider/id` (por exemplo, `zai/glm-4.7`) para fixar o provider explicitamente;
   o oma o repassa ao pi como está em `--model`.
2. **IDs não registrados:** registre-os com uma extensão do pi. O campo `api` deve
   nomear um dos **IDs de adaptador de API** do pi (`openai-completions`,
   `anthropic-messages` etc.), e não o nome do provider. Nomes de providers como
   `"zai"` ou abreviações como `"openai"` não são IDs de adaptador e falham no
   dispatch com `No API provider registered for api: …`.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

Verifique com `pi --list-models` antes de ligar os IDs a um preset.

---

## Dispatch pelo OpenCode

[OpenCode](https://opencode.ai) é um vendor de classe extensão: como o pi, ele não é
proprietário de modelos, mas uma CLI que executa modelos de seu próprio catálogo —
o provider gratuito `opencode`, o plano de assinatura de baixo custo `opencode-go`
e o gateway `opencode-zen`. O oma integra-o como um **vendor plugin em processo**:
o opencode carrega automaticamente `.opencode/plugins/oma/` em vez de registrar
hooks em arquivos de configuração, e resolve a persona de cada agente a partir de
arquivos `.opencode/agents/<id>.md` gerados.

### Dispatch explícito

Encaminhe qualquer agente pelo opencode com a substituição `--vendor opencode`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

Isso executa `opencode run --agent pm --dir <workspace> "<prompt>"`. O prompt é um
**argumento posicional final**: a flag `-p` do opencode significa `--password`,
não prompt.

### Modelos OpenCode por agente

Para encaminhar agentes específicos a um modelo do opencode, registre o modelo em
`models:` e referencie-o em `agents:`. Aplicam-se dois requisitos (consulte
[Inclusão inline de slugs de modelos](#inlining-model-slugs)):

1. **O slug deve estar no formato `owner/model`.** Use o slug `provider/model` do opencode
   como chave do registro; nomes simples são rejeitados pelo schema de `agents.<id>.model`.
2. **A especificação deve estar completa:** `cli`, `cli_model`, `auth_hint` e todos os
   booleanos de `supports`. Uma especificação incompleta falha na validação e recorre
   silenciosamente ao registro principal (portanto o agente não será encaminhado ao opencode).

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

Cada agente encaminhado executa `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. Isso é adequado para papéis leves e
rápidos (pm, qa, docs, explore), enquanto agentes de implementação mais pesados
permanecem em Codex/Claude etc.

### Validar um slug de modelo

O catálogo do opencode depende de assinatura e login, portanto o oma **não** fixa
slugs de modelos do opencode no código. Valide um slug no catálogo instalado:

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` informa `accepted` quando o slug aparece em
`opencode models`, `rejected` quando não aparece e `auth_required` quando o
provider exige login ou assinatura.

### Autenticação e arquivos gerados

- **Autenticação:** `opencode auth login` armazena credenciais em
  `~/.local/share/opencode/auth.json`, uma entrada por provider. `oma auth status`
  / `oma doctor` informam o opencode como autenticado quando *qualquer* provider
  possui uma credencial. `oma doctor --profile` é
  orientado ao provider: cada linha é verificada contra o prefixo do provider no
  `cli_model` registrado; por exemplo, um modelo com `cli_model: zai-coding-plan/glm-5.3`
  é verificado contra a credencial `zai-coding-plan`. Uma linha cujo modelo não tenha um
  `cli_model` registrado no formato `provider/model` informa `? unknown`, em vez de
  uma falha de autenticação definitiva.
- **Arquivos gerados:** `oma link` (ou `oma link opencode`) grava uma persona
  `.opencode/agents/<id>.md` por agente e a ponte `.opencode/plugins/oma/`. Esses
  arquivos são gerados a partir do SSOT `.agents/`; não os edite diretamente,
  execute `oma link` novamente para regenerá-los.

> **Nota sobre workflows persistentes:** o evento `session.idle` do opencode (o análogo
> mais próximo do hook Claude `Stop`) serve somente para notificação e não pode
> impedir que a sessão termine. Por isso, workflows persistentes (orchestrate / work /
> ultrawork) executam com **semântica Stop degradada** sob opencode; o reforço do
> workflow acontece na próxima mensagem, em vez de manter a sessão
> aberta.

---

## Dispatch pela Kimi Code CLI

A [Kimi Code CLI](https://www.kimi.com/code) lê **hooks** somente de uma configuração
global (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`); por isso `oma install`/`oma link`
gravam a cadeia de hooks da Kimi e seus symlinks de skills no HOME mediante consentimento
explícito (como no Antigravity). A Kimi também verifica diretamente o SSOT
`.agents/skills/` do oma, portanto as skills são resolvidas em todo o projeto. **MCP**
não precisa gravar no HOME e é específico do projeto: é escrito com o modo correto em
`<cwd>/.kimi-code/mcp.json` (projeto) ou `~/.kimi-code/mcp.json` (global).

### Dispatch explícito

Encaminhe qualquer agente pela Kimi usando a substituição `--vendor kimi`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

Isso executa `kimi -p "<prompt>"`. O modo `-p` (não interativo) da Kimi aprova automaticamente
chamadas regulares de ferramentas sob a política de permissões `auto`; por isso o oma **não**
acrescenta `--yolo`/`--auto` (as opções são mutuamente exclusivas com `-p`).

### Modelos Kimi por agente

Como no opencode, o oma **não** fixa um catálogo de modelos da Kimi (a oferta da Kimi
depende do provider e da assinatura). Para encaminhar agentes a um modelo da Kimi,
registre uma especificação completa em `models:` com `cli: kimi` e referencie-a em
`agents:`:

A chave do registro deve estar no formato `owner/model` (nomes simples são rejeitados
pelo schema de `agents.<id>.model`), e `cli_model` é o alias exato passado para
`kimi --model`; o alias de coding documentado da Kimi é `kimi-code/kimi-for-coding`.
Confirme o alias exposto pela sua assinatura com `kimi --model <alias>` antes de
fazer commit dele.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

Cada agente encaminhado executa `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`.

> **Nota sobre workflows persistentes:** o caminho documentado de bloqueio de Stop da Kimi é o
> código de saída 2 / stderr, mas o roteador `oma hook run` sempre termina com 0 e emite um
> dialeto stdout. O oma emite um `permissionDecision: "deny"` de melhor esforço (além de
> `decision: "block"` no estilo Claude) para que workflows persistentes degradem de forma controlada na Kimi.
