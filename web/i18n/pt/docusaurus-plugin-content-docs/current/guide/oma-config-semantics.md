---
title: "Guia: Semântica de oma-config.yaml"
sidebar_label: Carregamento da configuração
description: "Como o OMA seleciona as camadas de configuração CUE e YAML, aplica overlays locais e resolve os poucos fallbacks ligados ao contexto de instalação. Consulte a referência de configuração para chaves e padrões suportados."
---

## Visão geral

A configuração é selecionada a partir do diretório `.agents/` mais próximo encontrado ao subir a partir do diretório de trabalho atual:

- **Compartilhada:** `.agents/oma-config.cue` ou `.agents/oma-config.yaml` quando o CUE está ausente ou não pode ser avaliado.
- **Local:** `.agents/oma-config.local.cue` ou `.agents/oma-config.local.yaml` (um arquivo, aplicado sobre o compartilhado; mantenha este arquivo privado).

O OMA não mescla um arquivo do projeto com `~/.agents/oma-config.*` nas consultas normais de runtime. Uma instalação global lê o arquivo do HOME porque sua raiz de instalação é o HOME; um comando de projeto lê a camada do projeto mais próxima. `auto_update_cli` é a exceção deliberada: sua verificação de atualização consulta a configuração do projeto, depois a configuração do HOME e, por fim, fica habilitado. Consulte a [Referência de configuração](/docs/guide/configuration-reference) para o modelo completo.

## Tabela de precedência

| Chave | Regra efetiva | Observações |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | Mais alta | Um valor de ambiente não vazio substitui `model_preset` nesse processo. |
| Arquivo local | Aplica sobre o compartilhado | Mapas comuns são mesclados recursivamente; arrays, escalares e `null` substituem o valor compartilhado. Os dois formatos de arquivo local não podem existir juntos. |
| CUE compartilhado | Preferido | Se o CUE estiver ausente ou falhar, o carregador tenta o arquivo YAML compartilhado. Um erro no CUE local é fatal. |
| YAML compartilhado | Fallback | Usado quando nenhum arquivo CUE compartilhado utilizável é selecionado. |
| `auto_update_cli` | Projeto, depois HOME, depois `true` | Esse fallback específico de atualização é implementado em `resolveAutoUpdateCli`; não é uma camada global geral. |

Para uma substituição local do projeto, coloque apenas as folhas alteradas no arquivo local. Por exemplo, uma escolha local de modelo pode ficar fora do arquivo compartilhado:

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

Execute o comando no projeto para que o diretório `.agents/` mais próximo seja selecionado. Um arquivo local malformado falha de modo explícito; corrija-o ou remova-o antes de tentar novamente.

## Valores padrão

| Chave | Padrão | Quando aplicado |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Os dois arquivos estão ausentes ou a chave não existe |
| `serena.mode` | `bridge` | Os dois arquivos estão ausentes ou a chave não existe |
| `serena.auto_update` | `true` | Os dois arquivos estão ausentes ou a chave não existe |
| `telemetry` | `false` | Os dois arquivos estão ausentes ou a chave não existe |
| `language` | `en` | Os dois arquivos estão ausentes ou a chave não existe |
| `model_preset` | Obrigatório | O template de projeto distribuído usa `auto`; o schema exige um valor não vazio. |
| `translation_voice` | `balanced` | Os dois arquivos estão ausentes ou a chave não existe |
| `timezone` | Fuso horário do sistema | Os dois arquivos estão ausentes ou a chave não existe |

## Justificativa da ordem de leitura

A regra da camada mais próxima mantém a configuração de um projeto autocontida. Se você quiser uma base para todo o usuário, instale globalmente e edite `~/.agents/oma-config.yaml`; as instalações de projeto ainda podem definir sua própria camada mais próxima.

## Observações

- `language` em `oma-config.yaml` controla o idioma das respostas do agente. Ele **não** é usado para determinar mensagens de aviso de instalação ou atualização; elas usam o locale do sistema (`$LANG`) porque `oma-config.yaml` ainda não foi carregado no momento da instalação.
- A precedência de `auto_update_cli` é implementada explicitamente no comando de atualização. Quando uma instalação de projeto e uma instalação global estão presentes, o valor do projeto é consultado primeiro e o valor do HOME depois.
- `telemetry` (padrão `false`) é mapeado para o opt-out próprio de cada vendor, escrito por `oma install`, `oma update` e `oma link`: Claude usa `DISABLE_TELEMETRY` + `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini/Qwen usam `privacy.usageStatisticsEnabled`, Codex usa `analytics.enabled` + `feedback.enabled`, Grok usa `[features] telemetry` e Antigravity (agy) usa `enableTelemetry` em `~/.gemini/antigravity-cli/settings.json`. Definir `telemetry: true` ativa novamente a telemetria ao remover o opt-out do oma para esse vendor.
- `diagram` (engine `auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`) é uma seção esparsa de substituição de skill, como `video` e `image`; consulte o [Diagram Engine](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` limita a frequência das verificações de versão mais recente para a toolchain HyperFrames por execução e heygen-com/hyperframes (`oma video compose`, `oma update`).
- `market` (`managed|channel|check_interval_min|path|python|save_dir`) configura o engine `last30days`, sempre atualizado, por trás de `oma market`; consulte o [Market Research](/docs/guide/market-research).
- O schema de runtime tipado cobre `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` e as seções esparsas de skills. Os templates distribuídos também contêm blocos pertencentes ao consumidor, como `scm`, `memory`, `serena_reaper` e `mcp`; os consumidores são responsáveis pelas chaves aninhadas. Não deduza uma chave a partir desta lista; use a [Referência de configuração](/docs/guide/configuration-reference) e o guia da feature desse bloco.
- Editar `oma-config.yaml` diretamente é seguro. `oma install` e `oma update` usam substituição de campos no nível de regex e preservam chaves editadas pelo usuário que não gerenciam (por exemplo, substituições personalizadas em `agents:` e `session.quota_cap`).
- `oma update` também acrescenta chaves de nível superior que o template distribuído define, mas que faltam no seu arquivo (com os padrões do template), sob um marcador `# Added by oma update`. Chaves que você já tem nunca são modificadas: o conteúdo existente permanece byte a byte idêntico. Chaves que você apagou deliberadamente reaparecem com o padrão do template; defina o valor explicitamente em vez de apagar a chave para optar por não usá-la.
