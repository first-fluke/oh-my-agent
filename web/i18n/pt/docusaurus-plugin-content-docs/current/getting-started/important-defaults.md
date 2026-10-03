---
title: Padrões importantes
description: Os padrões do oh-my-agent que influenciam roteamento, seleção de modelos, providers, atualizações, telemetria, MCP do navegador, transporte Serena e recuperação de workflows.
---

# Padrões importantes

Os padrões são escolhidos para tornar o primeiro projeto utilizável e manter estável a configuração pertencente ao usuário. Eles são resolvidos em runtime, portanto uma chave omitida pode se comportar de forma diferente de um valor vazio explícito. Comece aqui quando o harness funciona, mas se comporta de maneira inesperada.

## Padrões que influenciam a primeira execução

| Área | Padrão | Consequência | Substituição |
|---|---|---|---|
| Idioma das respostas | `en` | Respostas de agentes e workflows usam inglês, a menos que a configuração do projeto selecione outro idioma compatível. Uma instrução explícita de idioma do usuário ou da sessão ainda pode substituir o padrão onde o host/workflow oferecer suporte. | `language` em `.agents/oma-config.yaml` ou `.cue` |
| Roteamento de modelos | `auto` | Usa a configuração nativa de agente do runtime atual. Runtimes desconhecidos recorrem a `default_cli` quando definido. | `model_preset`, `default_cli` ou `agents.<id>` |
| Inteligência de código | `serena` | Uma instalação nova tenta instalar Serena e configura sua integração MCP. | `providers.code_intelligence: gortex` ou `serena` |
| Guard de busca de código | `block` | Enquanto um provider de inteligência de código estiver configurado, um hook PreToolUse nega `Grep`/`Glob` nativos e buscas recursivas no shell (`rg`, `grep -r`, `find -name`) e direciona o agente para as ferramentas do provider. Buscas restritas a exclusões confirmadas ou a caminhos fora do projeto são permitidas. O hook não divulga nenhuma forma de contornar a regra para o código-fonte do projeto. | `providers.code_intelligence_guard: off` |
| Memória semântica | `agentmemory` | Agent Memory é selecionado para memória semântica quando disponível. | `providers.semantic_memory: honcho` ou `none` |
| Busca web | `native` | A busca usa o canal web nativo do runtime, a menos que um provider seja selecionado. | `providers.web` |
| Provider de documentação | `context7` | A consulta de documentação usa Context7 quando uma skill solicita isso. | `providers.docs` |
| Telemetria | desabilitada | O OMA escreve configurações de opt-out do vendor durante o link. | `telemetry: true` |
| Atualização automática da CLI | habilitada | A CLI verifica atualizações, salvo se desabilitada. | `auto_update_cli: false` |
| Formato de data | `ISO` | Datas usam formato ISO quando o projeto não define formato. | `date_format: US` ou `EU` |
| Fuso horário | fuso do sistema | Horários agendados e informados seguem o host quando `timezone` é omitido. | `timezone: Australia/Sydney` (ou outro nome IANA) |
| Transporte Serena | `bridge` | Sessões compartilham um servidor Serena por projeto; uma bridge indisponível recorre a stdio local da sessão. | `serena.mode: stdio` |
| Atualização automática do Serena | habilitada | `oma update` atualiza a ferramenta Serena local quando possível. | `serena.auto_update: false` |
| MCP do Browser DevTools | não definido | Entradas existentes do navegador são preservadas; uma instalação interativa nova oferece `aside`. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]` ou `[]` |
| Serena Reaper | caminho agendado desabilitado | `serena_reaper.enabled: false` mantém a limpeza periódica inativa. `oma serena reap` interativo continua funcionando. | `serena_reaper.enabled: true` e `oma serena reaper enable` |

Os nomes e padrões dos providers vêm dos loaders de runtime e dos prompts do instalador. O arquivo de configuração gerado pelo instalador inclui comentários para as seções disponíveis; use esses comentários como guia do schema da versão.

## Precedência da configuração

O OMA sobe a partir do diretório de trabalho atual em busca do diretório `.agents/` mais próximo. Ele lê `oma-config.cue` quando presente e recorre a `oma-config.yaml` se a avaliação do CUE compartilhado falhar. Um overlay local de projeto, `oma-config.local.cue` ou `oma-config.local.yaml`, é mesclado por cima; mantenha somente um overlay local. `OMA_MODEL_PRESET` pode substituir `model_preset` para um processo. Uma configuração local inválida interrompe o carregamento, em vez de selecionar outro valor silenciosamente.

O roteamento de modelos tem dois casos especiais antes da ordem de presets fixos:

- Com `model_preset: auto`, usa-se a configuração nativa de agente/modelo do runtime atual. Substituições explícitas em `agents.<id>` continuam tendo precedência; um runtime desconhecido pode usar `default_cli`.
- Com `model_preset: free`, os spawns filhos usam o gateway local FreeLLMAPI. `free.model` seleciona o modelo do gateway e substitui pins de modelo por agente; quando omitido, usa-se `FREELLM_MODEL` ou o fallback `auto` do provider.

Para um preset fixo ou personalizado, a ordem efetiva é:

1. Substituição explícita em `agents.<id>`.
2. Entrada correspondente de `model_preset`, integrada ou em `custom_presets`.
3. Entrada `orchestrator` do preset quando um papel não tem entrada.
4. `default_cli` como fallback de vendor quando os níveis anteriores não resolvem um plano.

O preset `free` fornece padrões para as três configurações de provider: `base_url` é `http://127.0.0.1:31415/v1`, `api_key_env` é `FREELLM_API_KEY` (com `FREELLMAPI_API_KEY` aceito como alias de compatibilidade) e `model` é `auto`. Ainda é necessária uma chave utilizável na variável selecionada; não há fallback de vendor. Defina esses valores em `oma-config.local.yaml` quando devem ficar na máquina, ou use `FREELLM_BASE_URL` e `FREELLM_MODEL` para substituições no nível do processo.

## Padrões com consequências inesperadas

Uma chave `mcp.devtools_browsers` omitida significa “deixar as entradas atuais do navegador como estão”. Uma lista vazia explícita remove as entradas durante a reconciliação. Processos MCP de navegador rodam por sessão de agente; habilite-os somente quando a tarefa controlar um navegador.

O modo Serena padrão `bridge` reduz processos duplicados do servidor de linguagem quando vários agentes trabalham no mesmo projeto. `stdio` é a opção de recuperação quando uma bridge local não inicia ou quando o isolamento estrito de processos importa. Serena se recupera automaticamente no próximo tool call; o memory reaper é separado e não precisa ser habilitado no uso normal.

A configuração padrão de telemetria é opt-out. Definir `telemetry: true` remove as entradas de opt-out do OMA no próximo link/update, o que pode reativar recursos do vendor que dependem de telemetria. Essa configuração controla alterações da integração do vendor; não altera os arquivos de custo da sessão que o OMA grava para sua própria contabilidade.

## Caminhos de recuperação

| Sintoma | Verificar primeiro | Recuperação |
|---|---|---|
| Arquivos do vendor estão desatualizados | `oma doctor` e `oma link --dry-run` | Execute `oma link <vendor>` depois de editar `.agents/`; mantenha o SSOT como fonte. |
| Um modelo não é aceito | `oma doctor --profile` | Troque para `auto`, use um preset integrado ou defina um slug sob `models:`. |
| Ferramentas Serena expiram | `oma doctor` e a seção do provider | Tente `serena.mode: stdio`; se o problema for pressão de memória, faça preview com `oma serena reap --dry-run`. |
| Um workflow persistente não para | `.agents/state/*-state.json` | Diga `workflow done`; inspecione o arquivo de estado somente se o workflow não tiver feito a limpeza. |
| Um reaper agendado não faz nada | Seção Serena Reaper do `oma doctor` | Defina `serena_reaper.enabled: true` e execute `oma serena reaper enable`. |
| A configuração local quebra a inicialização | Caminho do erro exibido por `oma doctor` | Corrija ou remova o overlay local; não crie overlays `.cue` e `.yaml` juntos. |

Continue com [Instalação](./installation.md), [Modelos por agente](../guide/per-agent-models.md) ou [Semântica de configuração OMA](../guide/oma-config-semantics.md).
