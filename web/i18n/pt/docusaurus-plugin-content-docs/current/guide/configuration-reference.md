---
title: "Guia: Referência de configuração"
sidebar_label: Referência de configuração
description: Locais de configuração do OMA, precedência, chaves tipadas, padrões e regras de propriedade durante atualizações.
---

# Referência de configuração

O OMA lê a configuração de `.agents/oma-config.cue` ou `.agents/oma-config.yaml`. Uma sobreposição local, `.agents/oma-config.local.cue` ou `.agents/oma-config.local.yaml`, é útil para configurações específicas da máquina que não devem entrar no arquivo compartilhado.

Execute isto no projeto cuja configuração você quer inspecionar:

```bash
oma doctor --profile
```

O resultado esperado é um perfil resolvido que mostra o preset selecionado e o plano de modelos por agente. Se o comando informar um erro de análise, corrija a camada de configuração mais próxima antes de alterar as configurações de modelo.

## Qual arquivo vence {#which-file-wins}

O carregador lê os padrões globais de `$OMA_HOME/.agents/` (padrão
`~/.oma/.agents/`), depois sobe a partir do diretório atual e para no
diretório `.agents/` de projeto mais próximo. Em cada diretório selecionado:

1. `oma-config.yaml` fornece os valores compartilhados.
2. `oma-config.cue`, quando presente e válido, substitui todas as chaves que define; as chaves YAML que ele não define permanecem. Se o arquivo CUE não puder ser avaliado, o OMA emite um aviso e usa apenas o arquivo YAML.
3. Um arquivo local (`oma-config.local.cue` ou `.local.yaml`) é mesclado sobre o resultado compartilhado.

O resultado compartilhado/local do projeto substitui o resultado compartilhado/local global.
Quando definida, `OMA_MODEL_PRESET` substitui `model_preset` depois de todas as camadas de arquivo.
A ordem completa, um diagrama de fluxo e a solução de problemas estão em
[Carregamento da configuração](/docs/guide/oma-config-semantics#precedence-table).

Mapas são mesclados recursivamente. Arrays, escalares e `null` substituem o valor compartilhado. Manter os dois formatos locais é um erro. Um arquivo local malformado interrompe a execução para que uma substituição privada não seja ignorada silenciosamente.

Raízes de projeto ancestrais diferentes não são mescladas. Um `.agents/` de projeto mais próximo,
mesmo vazio, ainda estabelece esse limite. A instalação antiga em `~/.agents/`
é entrada de migração e não é lida como fallback de projeto. Os padrões globais não
alteram a identidade nem o escopo de memória do projeto atual.

## Chaves de nível superior {#top-level-keys}

As chaves a seguir são lidas pelo schema atual do runtime ou por consumidores distribuídos com o OMA. Uma chave marcada como esparsa é intencionalmente parcial: omita um valor aninhado para manter o padrão do código.

| Chave | Tipo ou valores aceitos | Padrão quando ausente | Finalidade |
| --- | --- | --- | --- |
| `language` | string | `en` | Idioma das respostas usado por workflows e skills. A instalação preserva um valor existente ou o inicializa a partir do idioma do sistema, sem perguntar. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` no template distribuído | Seleção de voz para `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` no template distribuído; a omissão não define uma substituição explícita | Preferência de formatação de datas. |
| `timezone` | nome IANA | fuso horário do sistema | Datas usadas por agendamentos e relatórios. |
| `auto_update_cli` | boolean | `true` | Verificações de versão da CLI em segundo plano; desative com `false`. |
| `telemetry` | boolean | `false` | Ativação de telemetria do vendor usada pela instalação, atualização e reconciliação de links. |
| `model_preset` | string não vazia | `auto` nos novos templates | Preset de modelo integrado ou personalizado. `OMA_MODEL_PRESET` o substitui em um processo. |
| `free` | `base_url`, `api_key_env`, `model` | não definido | Grafia legada de `providers.free` (ali, `model` é `default_model`); ainda é lida, e `oma update` a move. |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory`; seções de credenciais `brave`, `exa`, `honcho`; qualquer outro `<name>` → objeto de provider de LLM | `context7`, `native`, `serena`, `block`, `agentmemory`; sem credenciais nem providers de LLM | Seleciona os providers de documentação, busca, inteligência de código e memória semântica, guarda as referências de credenciais e declara endpoints de LLM pelos quais os agentes podem ser encaminhados. Consulte [Providers](#providers). |
| `brave`, `exa`, `honcho` | como em `providers` | não definido | Grafias legadas de nível superior de `providers.brave`, `providers.exa` e `providers.honcho`; ainda são lidas, e `oma update` as move. |
| `agents` | ID do agente → `model`, `effort`, `thinking`, `memory` opcionais; `default` → `cli`, `effort`, `thinking`, `memory` | resolução do preset; `default.cli` recorre a `claude` (`codex` para uma rota de provider) | Substituições por agente aplicadas sobre o preset selecionado. `effort` é `none`, `low`, `medium`, `high` ou `xhigh`; `memory` é `user`, `project` ou `local`. `agents.default` preenche esses campos para todo papel que não os define, e o `cli` dele (um de `claude`, `codex`, `cursor`, `antigravity`, `qwen`, `grok`, `kimi`, `kiro`, `opencode`, `pi`) é o vendor usado quando nada mais seleciona um: um runtime não detectado em `auto`, ou uma rota de provider depois de `--vendor`, `OMA_RUNTIME_VENDOR` e do runtime detectado. Um modelo `<provider>/<model-id>` encaminha o papel por esse provider de LLM. |
| `models` | slug de modelo → mapeamento de CLI | não definido | Definições inline de modelos para CLIs de vendors compatíveis. |
| `custom_presets` | preset → descrição, `extends` e `agent_defaults` opcionais | não definido | Presets definidos pelo usuário; `extends` pode herdar um preset integrado. |
| `vendors` | `string[]` de IDs de vendors selecionados (YAML e CUE) | ausente: `oma link` usa todos os vendors vinculáveis, `oma update` usa os vendors cujos diretórios de projeto existem | Seleciona quais integrações de vendors `oma install` e `oma update` projetam. O mapa de capacidades de dispatch fica na configuração de orquestração gerenciada; consulte [Seleção de vendor e metadados de dispatch](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | ID de vendor | não definido | Grafia legada de `agents.default.cli`; ainda é lida, e `oma update` a move. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | cada dimensão omitida fica sem limite | Uso de tokens registrado e limites de spawn verificados antes do próximo spawn de agente; consulte [Limites de cota da sessão](#session-quota-caps). |
| `diagnostic_feedback` | `enabled`, `host_diagnostics`, `timeout_ms` | automático para hosts de terminal compatíveis, `false`, `1400` | Compara os diagnósticos do Serena antes e depois de edições nativas de arquivo; consulte [Feedback de diagnóstico](#diagnostic-feedback). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Comportamento e exclusões de varredura de `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transporte MCP e comportamento de atualização do Serena. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` ou `[]` | não definido = manter a configuração existente | Seleção do MCP Browser DevTools durante a reconciliação. Uma lista vazia explícita remove as entradas de navegador selecionadas. |
| `video` | mapa esparso pertencente à skill | padrão da skill; consulte [Geração de vídeo](/docs/guide/video-generation) | Roteamento de vídeo, ordem dos providers, saída, custo, limites e configurações de atualização do HyperFrames. |
| `image` | mapa esparso pertencente à skill | padrão da skill; consulte [Geração de imagem](/docs/guide/image-generation) | Configurações de vendor, tamanho, qualidade, saída, comparação e custo de imagens. |
| `voice` | `backend`, `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | `backend: auto`; demais chaves: padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Backend de voz (`auto`, `voicebox`, `voicestudio`; também usado pela narração do `oma video`) e configurações de perfil, saída e duração. |
| `hwp` | `format`, `version.*`, `output.*` | padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#extract-hwp-family-documents) | Formato, canal de versão e local de saída do Kordoc. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#extract-pdf-content) | Configurações de extração de PDF, OCR, imagem e substituição. |
| `scholar` | `base_url` | padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host do endpoint Knows; o formato do protocolo continua pertencendo à skill. |
| `diagram` | `engine`, `explain_sidecar`, `archify.path`, `archify.quality`, `archify.open` | padrão da skill; consulte [Diagram Engine](/docs/guide/diagram-engine) | Seleção do Mermaid/archify e configurações de pin/qualidade do archify. Os valores aposentados `archify.managed`, `archify.channel` e `archify.check_interval_min` são ignorados com um aviso, e `oma update` os remove. |
| `market` | `path`, `python`, `save_dir` | padrão da skill; consulte [Pesquisa de mercado](/docs/guide/market-research) | Pin do engine last30days, interpretador e local dos resultados. Os valores aposentados `managed`, `channel` e `check_interval_min` são ignorados com um aviso, e `oma update` os remove. |

O template distribuído também contém blocos pertencentes aos consumidores. Suas chaves e padrões atuais são:

| Bloco | Chaves lidas pelo consumidor | Padrão | Efeito |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | mantém 100 sessões; remove artefatos Serena com mais de 50 dias; `0` desabilita a remoção por idade | Padrões de `oma memory gc`; as flags do comando os substituem. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Controla o caminho agendado de limpeza do LSP Serena. A execução interativa de `oma serena reap` continua explícita; execuções silenciosas agendadas exigem opt-in. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Ativa o guard de orçamento de linhas do stop-hook e define o orçamento de código por arquivo. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | o template distribuído habilita conventional commits e proteção de PR, com as listas de coautor e nomes de arquivo do template | Controla a skill SCM, o commit hook e o guard de padrões secretos. Substitua os valores de identidade do template pelos seus antes de habilitar trailers de coautor. |

Esses blocos são aceitos pelo passthrough de configuração e interpretados pelo recurso ou workflow correspondente. O parser de `serena_reaper` lê apenas as chaves snake_case mostradas acima e ignora camelCase. Os templates distribuídos ainda mostram camelCase (`keepWarm`, `idleMinutes`, `graceSeconds`), e o schema CUE distribuído rejeita as chaves snake_case dentro do seu bloco de schema (`field not allowed`), portanto defina-as em `oma-config.yaml` ou em uma sobreposição YAML local. Leia o guia do recurso correspondente antes de adicionar chaves aninhadas; esta página não inventa chaves fora dos consumidores listados aqui.

## Objetos aninhados exatos {#exact-nested-objects}

### Providers {#providers}

`providers` seleciona um provider por capacidade:

| Chave | Valores aceitos | Padrão |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | ID do provider de busca (letras minúsculas, dígitos, `_`, `-`), como `native` ou `brave` | `native` |
| `code_intelligence` | `serena`, `gortex` | `serena` |
| `code_intelligence_guard` | `block`, `off` | `block` |
| `semantic_memory` | `agentmemory`, `honcho`, `none` | `agentmemory` |

Três chaves reservadas guardam a seção de credencial ou conexão de um seletor: `providers.brave` e `providers.exa` (`api_key_env` ou `api_key_vault`) para `web`, e `providers.honcho` para `semantic_memory` (consulte [Memória semântica Honcho](#honcho-semantic-memory)). As grafias legadas de nível superior ainda são lidas.

Qualquer outra chave em `providers` é um **provider de LLM**: um endpoint compatível com OpenAI ou Anthropic pelo qual `oma agent spawn` pode encaminhar uma CLI filha, em vez da conta da própria CLI. O valor é um objeto:

| Campo | Valores aceitos | Obrigatório | Finalidade |
| --- | --- | --- | --- |
| `base_url` | URL HTTP(S) absoluta, sem credenciais, query ou fragmento; `/v1` é acrescentado quando falta | sim | O endpoint. |
| `api_key_env` | nome da variável de ambiente | sim (exceto `free`, cujo padrão é `FREELLM_API_KEY`) | De onde a chave é lida; o arquivo nunca guarda a chave. `base_url` também é opcional somente para `free` (`http://127.0.0.1:31415/v1`). |
| `transport` | `chat_completions` (padrão), `responses`, `anthropic_messages`, `multi` | não | O protocolo que o endpoint fala. Ele seleciona a CLI filha: `chat_completions` → Codex ou Qwen, `responses` → Codex, `anthropic_messages` → Claude, `multi` (um gateway que atende os três) → Codex, Claude ou Qwen. |
| `default_model` | ID do modelo | quando o provider é usado como `model_preset` | O modelo que todo papel usa com `model_preset: <name>`. |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free` é o provider integrado de um gateway FreeLLMAPI local: todos os campos têm padrão, `FREELLM_BASE_URL` e `FREELLM_MODEL` substituem o arquivo, e o bloco legado de nível superior `free:` ainda é lido (o `model` dele é `default_model` aqui); consulte [Providers de LLM personalizados](/docs/guide/per-agent-models#custom-llm-providers).

`code_intelligence_guard` controla o guard de busca do PreToolUse. Buscas nativas restritas a exclusões confirmadas do provider ou a caminhos fora do projeto são permitidas sem precisar contornar o guard. O guard lê as exclusões do Serena e as regras de gitignore habilitadas, ou a listagem de exclusões do Gortex; ele não infere dependências a partir de nomes de diretórios.

O hook não cita `OMA_CI_ALLOW_NATIVE`. Uma busca no shell prefixada com `OMA_CI_ALLOW_NATIVE=1` contorna o guard apenas para recursos fora do projeto ou caminhos ignorados que o guard não reconheceu, não para o código-fonte do projeto.

### Memória semântica Honcho {#honcho-semantic-memory}

O mapa `providers.honcho` (a grafia legada de nível superior `honcho` ainda é lida) é validado por `HonchoConfigSchema`. Os nomes das chaves e o comportamento efetivo em runtime são:

| Chave | Formato | Padrão ou restrição efetiva |
| --- | --- | --- |
| `base_url` | string de URL | `https://api.honcho.dev`; HTTPS é obrigatório, exceto para HTTP em loopback. Credenciais, query strings e fragmentos são rejeitados. |
| `workspace_id` | 1–128 letras, dígitos, `_` ou `-` | Obrigatório quando o provider inicia. O instalador interativo preenche `oma` quando não há um valor salvo. |
| `project_id` | string aparada, 1–128 caracteres | Omitido significa a raiz do projeto OMA atual. |
| `api_key_env` | nome de variável de ambiente | `HONCHO_API_KEY`. Um endpoint que não seja loopback precisa dessa variável ou de `api_key_vault`. |
| `api_key_vault` | nome da chave do vault (`A-Z`, `a-z`, dígitos, `.`, `_`, `-`; 1–64 caracteres) | Omitido significa que não há consulta ao vault. Se as duas referências de credencial estiverem presentes, o valor do ambiente é usado primeiro. |
| `timeout_ms` | inteiro `100`–`30000` | `5000` milissegundos. O mesmo prazo cobre uma solicitação de status ou memória. |
| `max_results` | inteiro `1`–`50` | `8` resultados de recuperação. |
| `max_tokens` | inteiro `128`–`16000` | `2000` bytes UTF-8 para conteúdo recuperado e contexto inferido. |
| `recall_mode` | `messages` ou `hybrid` | O instalador grava `messages` para uma nova seleção. Um valor omitido habilita a solicitação de representação do provider além da recuperação de mensagens. |

Por exemplo, um workspace remoto pode usar uma referência de segredo sem colocar o segredo no YAML:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

O instalador usa `http://127.0.0.1:8000` como URL inicial ao configurar o Honcho de forma interativa ou não interativa sem uma URL salva. Essa semente do instalador é separada do fallback de runtime do provider acima. Use `oma memory status` depois de selecionar o provider; um workspace ou credencial ausente é informado como indisponível, em vez de trocar silenciosamente para outro provider de memória.

### Limites de cota da sessão {#session-quota-caps}

`session.quota_cap` é um mapa parcial. Todos os campos são opcionais; um campo omitido deixa a dimensão correspondente sem limite. Os valores devem ser inteiros não negativos escritos sem separadores `_` (o YAML lê `2_000_000` como string, o que deixa essa dimensão sem limite). `per_vendor` mapeia IDs de vendor de dispatch, como `claude`, `codex` ou `antigravity`, para orçamentos de tokens:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

O carregador de limites verifica primeiro a camada CUE do usuário, depois a camada YAML do usuário e, por fim, o fallback de padrões distribuídos. Antes de um spawn, o OMA verifica `spawn_count`, o total de `tokens` e `per_vendor`, nessa ordem. Um limite é atingido quando o uso é maior ou igual a ele; o OMA bloqueia o próximo spawn e informa qual dimensão venceu.

O OMA reserva uma estimativa de tokens de entrada quando uma execução começa. Quando uma transcrição nativa suportada fica disponível depois da execução, o uso registrado de entrada, cache e saída substitui essa estimativa sem contar outro spawn. Caso contrário, o registro permanece explicitamente estimado a partir do tamanho do prompt. O uso observado da sessão raiz é marcado como parcial quando subagentes nativos ficam fora do escopo de captura. Os limites de tokens dependem, portanto, das observações disponíveis; eles não interrompem um filho que já está em execução nem garantem um teto de cobrança. `spawn_count` é o limite mais previsível.

### Orçamento de execução da sessão {#session-execution-budget}

Defina `session.execution` para limitar o tempo decorrido do dispatch e da verificação de CLI gerenciados pelo OMA. Use um `timeout_seconds` positivo ou um `deadline` ISO 8601 com fuso horário:

```yaml
session:
  execution:
    timeout_seconds: 1800
```

Os comandos `oma agent spawn`, `parallel`, `review`, `resume`, `begin` e `verify` aceitam `--timeout-seconds` ou `--deadline`. Preparação, execução, novas tentativas e verificações compartilham um único deadline absoluto. O deadline mais cedo, entre o configurado, o herdado e o persistido, vence; novas tentativas e retomadas não reiniciam o relógio. Omita `session.execution` e as duas flags para deixar essa dimensão sem limite, salvo se o pai tiver fornecido um deadline.

O histórico de execução fica em `.agents/state/executions/`. Cancelamento ou timeout bloqueia a execução seguinte nessa sessão e registra o motivo da parada. Esses controles cobrem processos iniciados pelo caminho da CLI gerenciada. Agentes nativos do vendor e jobs arbitrários de shell precisam do mecanismo de cancelamento do próprio host; limites de CPU, RAM e armazenamento exigem suporte do provider.

CLIs filhas gerenciadas herdam `OMA_EXECUTION_DEADLINE`, `OMA_EXECUTION_STATE` e `OMA_EXECUTION_ID`. O caminho do estado e o ID de execução formam uma referência de herança vinculada; um ledger estranho, malformado ou incompatível é rejeitado antes da escrita. Encaminhe o ambiente herdado completo ao encapsular um filho do OMA. Definir essas variáveis não acrescenta a aplicação do deadline a um programa não relacionado.

No cancelamento, o OMA interrompe a admissão e tenta o encerramento delimitado da computação de que é dono. Ele preserva logs, resultados, worktrees e metadados de recursos registrados. Apagar artefatos ou recursos externos exige um pedido ou uma política explícita de retenção. Um encerramento sem sucesso permanece visível, em vez de ser reportado como limpeza completa.

### Feedback de diagnóstico {#diagnostic-feedback}

Em hosts de terminal compatíveis, o OMA compara erros e avisos antes e depois de edições nativas de arquivo e injeta os diagnósticos recém-reportados no feedback seguinte da ferramenta. Ele usa um daemon HTTP do Serena já em execução e correspondente ao projeto quando Serena é o provider efetivo de inteligência de código (o padrão quando nenhum provider é especificado). Ele nunca inicia um daemon nem executa um build. As edições simbólicas do próprio Serena ficam de fora, porque já fornecem diagnósticos.

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

Defina `enabled: false` para desativar este feedback. Defina `host_diagnostics: true` quando o host já fornece diagnósticos de edição; Cursor e Antigravity são ignorados automaticamente. As substituições locais do projeto seguem as camadas normais de configuração. As substituições de ambiente são `OMA_DIAGNOSTIC_FEEDBACK`, `OMA_HOST_DIAGNOSTICS` e `OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS`.

O timeout cobre cada hook completo de pré-edição ou pós-edição e fica limitado a 100–10.000 milissegundos. Providers lentos podem usar um timeout maior. Uma consulta com falha ou timeout pula o feedback e inicia um cooldown curto; ela não conta como um resultado de diagnóstico limpo. Baselines de pré-edição ausentes ou desatualizadas também pulam o feedback. Cada hook verifica no máximo três arquivos e reporta no máximo oito erros ou avisos novos.

### Seleção de vendor e metadados de dispatch {#vendor-selection-and-dispatch-metadata}

No `.agents/oma-config.yaml` pertencente ao usuário, `vendors` é uma lista de IDs de integrações selecionados:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Uma lista seleciona exatamente esses vendors, e `vendors: []` não seleciona nenhum. Sem a chave `vendors`, `oma link` aponta para todos os vendors do registro de vendors vinculáveis do OMA, enquanto `oma update` aponta apenas para os vendors cujos diretórios de projeto já existem. A lista controla as projeções de instalação/atualização; ela não é o mapa de capacidades de comando por vendor.

O schema `.agents/oma-config.cue` distribuído tipa `vendors` como a mesma lista (`[...string]`). Templates CUE antigos o tipavam como um objeto `vendors.pi` (`#VendorsConfig`) que nada lê: o dispatch de agentes resolve seus campos de capacidade a partir do registro de orquestração gerenciado abaixo. Se o seu `oma-config.cue` ainda declara `vendors?: #VendorsConfig`, altere para `vendors?: [...string]` antes de colocar ali uma lista de seleção.

O arquivo gerenciado `.agents/skills/oma-orchestration/config/cli-config.yaml` contém esse mapa de capacidades. Cada entrada `vendors.<id>` aceita os seguintes campos:

| Campo | Formato | Uso |
| --- | --- | --- |
| `command` | string executável | Binário a executar. |
| `subcommand` | string | Subcomando inserido antes das opções, como `codex exec`. |
| `prompt_flag` | string, ou `none`/`null` para desabilitar | Flag pareada com o prompt; usa-se um prompt posicional quando desabilitada. |
| `auto_approve_flag` | string | Flag do vendor que ignora permissões em execuções graváveis. Suprimida no modo somente leitura. |
| `read_only_flag` | string | Flag de somente leitura do vendor. Se ausente, o builder usa o fallback específico do vendor ou avisa. |
| `output_format_flag` | string | Flag que seleciona uma saída legível por máquina. |
| `output_format` | string | Valor pareado com `output_format_flag`. |
| `model_flag` | string | Flag pareada com `default_model`. |
| `default_model` | string | Valor do modelo usado quando um plano resolvido não fornece um. |
| `isolation_env` | string `NAME=value` | Atribuição de ambiente opcional; chaves inseguras de loader/intérprete são rejeitadas e `$$` é expandido para o ID do processo atual. |
| `isolation_flags` | string de argumentos no estilo shell | Argumentos extras de isolamento divididos em tokens de argv. |

O arquivo gerenciado de capacidades é regenerado pelas atualizações do OMA. Edite as chaves pertencentes ao usuário `agents`, `models` e `custom_presets` para selecionar modelos; use este mapa de capacidades apenas ao manter os dados de orquestração gerenciados ou depurar um adaptador de vendor. O objeto `vendors.pi` comentado em templates antigos é metadado de fallback e não substitui a lista de vendors selecionados nem o registro de dispatch gerenciado.

## Alterações comuns {#common-changes}

Escolha um preset fixo para um projeto mantendo uma substituição pessoal local.

**Arquivo compartilhado** (versionado):

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**Sobreposição local** (ignorada pelo Git):

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
    effort: high
```

Selecione explicitamente os providers de inteligência de código e de memória:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Mantenha a configuração de navegador inalterada durante atualizações ou remova-a deliberadamente:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Regras de atualização e propriedade {#update-and-ownership-rules}

`.agents/oma-config.yaml` pertence ao usuário. `oma update` preserva o conteúdo existente e pode acrescentar novas chaves de nível superior distribuídas pelo template sob um marcador `# Added by oma update`. `oma update --force` pode substituir a configuração do usuário, a configuração MCP e os diretórios de stack; use-o somente quando a intenção for redefinir essas personalizações. Os arquivos de sobreposição local continuam sendo o local privado para valores específicos da máquina.

Não coloque chaves de API neste arquivo. Use os campos `api_key_env` ou `api_key_vault` e mantenha a credencial real no armazenamento de segredos ou no ambiente referenciado.

Para detalhes da resolução de modelos, consulte [Configuração de modelos por agente](/docs/guide/per-agent-models). Para semântica de camadas e comportamento de falhas, consulte [Semântica de oma-config](/docs/guide/oma-config-semantics).
