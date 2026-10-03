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

## Qual arquivo vence

O carregador sobe a partir do diretório atual e para no diretório `.agents/` mais próximo que contenha uma configuração compartilhada ou local. Nesse diretório:

1. `oma-config.cue` é avaliado primeiro.
2. `oma-config.yaml` é usado quando o arquivo CUE compartilhado não existe ou não pode ser avaliado.
3. Um arquivo local (`oma-config.local.cue` ou `.local.yaml`) é mesclado sobre o arquivo compartilhado.
4. Quando definida, `OMA_MODEL_PRESET` substitui `model_preset` nesse processo.

Mapas são mesclados recursivamente. Arrays, escalares e `null` substituem o valor compartilhado. Manter os dois formatos locais é um erro. Um arquivo local malformado interrompe a execução para que uma substituição privada não seja ignorada silenciosamente.

Esta é uma regra de camada mais próxima, não uma mesclagem geral entre projeto e HOME. Uma instalação global lê `~/.agents/oma-config.*` porque HOME é sua raiz de instalação. Um comando no projeto lê a camada de projeto mais próxima. A verificação de atualização de `auto_update_cli` é a exceção: verifica primeiro o projeto, depois HOME e, por fim, usa o padrão habilitado.

## Chaves de nível superior

As chaves a seguir são lidas pelo schema atual do runtime ou por consumidores distribuídos com o OMA. Uma chave marcada como esparsa é intencionalmente parcial: omita um valor aninhado para manter o padrão do código.

| Chave | Tipo ou valores aceitos | Padrão quando ausente | Finalidade |
| --- | --- | --- | --- |
| `language` | string | `en` | Idioma das respostas usado por workflows e skills. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` no template distribuído | Seleção de voz para `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` no template distribuído; a omissão não define uma substituição explícita | Preferência de formatação de datas. |
| `timezone` | nome IANA | fuso horário do sistema | Datas usadas por agendamentos e relatórios. |
| `auto_update_cli` | boolean | `true` | Verificações de versão da CLI em segundo plano; desative com `false`. |
| `telemetry` | boolean | `false` | Ativação de telemetria do vendor usada pela instalação, atualização e reconciliação de links. |
| `model_preset` | string não vazia | `auto` nos novos templates | Preset de modelo integrado ou personalizado. `OMA_MODEL_PRESET` o substitui em um processo. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | Configurações do FreeLLMAPI quando o preset é `free`; `FREELLM_BASE_URL` e `FREELLM_MODEL` substituem os valores do arquivo, e o nome da chave nunca contém o segredo. Consulte [Configuração de modelos por agente](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Seleciona os providers de documentação, busca, inteligência de código e memória semântica. A inteligência de código aceita `serena` ou `gortex`; a memória semântica aceita `agentmemory`, `honcho` ou `none`. `code_intelligence_guard` (`block` ou `off`) controla o guard de busca do PreToolUse. Buscas nativas restritas a exclusões confirmadas do provider ou a caminhos fora do projeto são permitidas sem precisar contornar o guard. O guard lê as exclusões do Serena e as regras de gitignore habilitadas, ou a listagem de exclusões do Gortex; ele não infere dependências a partir de nomes de diretórios. O hook não cita `OMA_CI_ALLOW_NATIVE`. Uma busca no shell prefixada com `OMA_CI_ALLOW_NATIVE=1` contorna o guard apenas para recursos fora do projeto ou caminhos ignorados que o guard não reconheceu, não para o código-fonte do projeto. |
| `brave` | `api_key_env` ou `api_key_vault` | não definido | Referência da credencial de busca do Brave. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | Consulte [Detalhes do Honcho](#honcho-semantic-memory) | Configurações de conexão da memória semântica Honcho. |
| `agents` | ID do agente → `model`, `effort`, `thinking`, `memory` opcionais | resolução do preset | Substituições por agente aplicadas sobre o preset selecionado. `effort` é `none`, `low`, `medium`, `high` ou `xhigh`; `memory` é `user`, `project` ou `local`. |
| `models` | slug de modelo → mapeamento de CLI | não definido | Definições inline de modelos para CLIs de vendors compatíveis. |
| `custom_presets` | preset → descrição, `extends` e `agent_defaults` opcionais | não definido | Presets definidos pelo usuário; `extends` pode herdar um preset integrado. |
| `vendors` | YAML: `string[]` de IDs de vendors selecionados; template CUE: mapa de fallback opcional `vendors.pi` | todos os vendors vinculáveis para a lista YAML | Seleciona quais integrações de vendors `oma install` e `oma update` projetam no YAML. O mapa de capacidades de dispatch fica na configuração de orquestração gerenciada; consulte [Seleção de vendor e metadados de dispatch](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | string | fallback do consumidor | Fallback legado somente de vendor quando nenhum plano de modelo é resolvido. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | cada dimensão omitida fica sem limite | Limites rígidos de tokens e spawns verificados antes do próximo spawn de agente; consulte [Limites de cota da sessão](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Comportamento e exclusões de varredura de `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transporte MCP e comportamento de atualização do Serena. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` ou `[]` | não definido = manter a configuração existente | Seleção do MCP Browser DevTools durante a reconciliação. Uma lista vazia explícita remove as entradas de navegador selecionadas. |
| `video` | mapa esparso pertencente à skill | padrão da skill; consulte [Geração de vídeo](/docs/guide/video-generation) | Roteamento de vídeo, ordem dos providers, saída, custo, limites e configurações de atualização do HyperFrames. |
| `image` | mapa esparso pertencente à skill | padrão da skill; consulte [Geração de imagem](/docs/guide/image-generation) | Configurações de vendor, tamanho, qualidade, saída, comparação e custo de imagens. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Configurações de perfil, saída e duração do Voicebox. |
| `hwp` | `format`, `version.*`, `output.*` | padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#extract-hwp-family-documents) | Formato, canal de versão e local de saída do Kordoc. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#extract-pdf-content) | Configurações de extração de PDF, OCR, imagem e substituição. |
| `scholar` | `base_url` | padrão da skill; consulte [Workflows de conteúdo e pesquisa](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host do endpoint Knows; o formato do protocolo continua pertencendo à skill. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | padrão da skill; consulte [Diagram Engine](/docs/guide/diagram-engine) | Seleção do Mermaid/archify e configurações do engine gerenciado. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | padrão da skill; consulte [Pesquisa de mercado](/docs/guide/market-research) | Resolução do engine last30days gerenciado e local dos resultados. |

O template distribuído também contém blocos pertencentes aos consumidores. Suas chaves e padrões atuais são:

| Bloco | Chaves lidas pelo consumidor | Padrão | Efeito |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | mantém 100 sessões; remove artefatos Serena com mais de 50 dias; `0` desabilita a remoção por idade | Padrões de `oma memory gc`; as flags do comando os substituem. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Controla o caminho agendado de limpeza do LSP Serena. A execução interativa de `oma serena reap` continua explícita; execuções silenciosas agendadas exigem opt-in. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Ativa o guard de orçamento de linhas do stop-hook e define o orçamento de código por arquivo. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | o template distribuído habilita conventional commits e proteção de PR, com as listas de coautor e nomes de arquivo do template | Controla a skill SCM, o commit hook e o guard de padrões secretos. Substitua os valores de identidade do template pelos seus antes de habilitar trailers de coautor. |

Esses blocos são aceitos pelo passthrough de configuração e interpretados pelo recurso ou workflow correspondente. O parser de `serena_reaper` lê as chaves snake_case mostradas acima, mesmo que comentários antigos do template usassem nomes camelCase. Leia o guia do recurso correspondente antes de adicionar chaves aninhadas; esta página não inventa chaves fora dos consumidores listados aqui.

## Objetos aninhados exatos

### Memória semântica Honcho {#honcho-semantic-memory}

O mapa `honcho` é validado por `HonchoConfigSchema`. Os nomes das chaves e o comportamento efetivo em runtime são:

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

`session.quota_cap` é um mapa parcial. Todos os campos são opcionais; um campo omitido deixa a dimensão correspondente sem limite. Os valores devem ser inteiros não negativos, e `per_vendor` mapeia nomes de vendors para orçamentos de tokens:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

O carregador de limites verifica primeiro a camada CUE do usuário, depois a camada YAML do usuário e, por fim, o fallback de padrões distribuídos. Antes de um spawn, o OMA verifica `spawn_count`, o total de `tokens` e `per_vendor`, nessa ordem. Um limite é atingido quando o uso é maior ou igual a ele; o OMA bloqueia o próximo spawn e informa qual dimensão venceu. O uso é contabilização de tokens, não uma estimativa de cobrança.

### Seleção de vendor e metadados de dispatch {#vendor-selection-and-dispatch-metadata}

No `.agents/oma-config.yaml` pertencente ao usuário, `vendors` é uma lista de IDs de integrações selecionados:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Uma lista ausente ou vazia seleciona todos os IDs no registro de vendors vinculáveis do OMA. A lista controla as projeções de instalação/atualização; ela não é o mapa de capacidades de comando por vendor.

O schema `.agents/oma-config.cue` distribuído também permite um objeto `vendors.pi` com os campos `command`, `prompt_flag`, `model_flag`, `default_model` e `thinking_flag`. Esse bloco é uma forma de fallback tipada no template CUE; o caminho atual de dispatch de agentes resolve seus campos de capacidade a partir do registro de orquestração gerenciado abaixo, portanto não use `vendors.pi` como substituto da lista de seleção YAML.

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

## Alterações comuns

Escolha um preset fixo para um projeto mantendo uma substituição pessoal local:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
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

## Regras de atualização e propriedade

`.agents/oma-config.yaml` pertence ao usuário. `oma update` preserva o conteúdo existente e pode acrescentar novas chaves de nível superior distribuídas pelo template sob um marcador `# Added by oma update`. `oma update --force` pode substituir a configuração do usuário, a configuração MCP e os diretórios de stack; use-o somente quando a intenção for redefinir essas personalizações. Os arquivos de sobreposição local continuam sendo o local privado para valores específicos da máquina.

Não coloque chaves de API neste arquivo. Use os campos `api_key_env` ou `api_key_vault` e mantenha a credencial real no armazenamento de segredos ou no ambiente referenciado.

Para detalhes da resolução de modelos, consulte [Configuração de modelos por agente](/docs/guide/per-agent-models). Para semântica de camadas e comportamento de falhas, consulte [Semântica de oma-config](/docs/guide/oma-config-semantics).
