---
title: "Guia: Semântica do oma-config.yaml"
description: Regras de precedência por chave para o oma-config.yaml quando coexistem instalações de projeto e global. Cobre auto_update_cli (projeto vence global), serena.mode, telemetry, language, model_preset, translation_voice, timezone e quais dotfiles agy / claude / codex / gemini / qwen leem.
---

## Visão geral

`oma-config.yaml` pode viver em dois lugares:

- **Projeto**: `<cwd>/.agents/oma-config.yaml`
- **Global**: `~/.agents/oma-config.yaml`

Quando os dois arquivos existem, o arquivo de projeto vence para toda chave. Isso é intencional: a customização por projeto é o sinal mais específico e não deve ser sobrescrita por um default em nível de usuário.

## Tabela de precedência

| Chave | Projeto vence? | Notas |
|-----|:---:|-------|
| `auto_update_cli` | Sim | O valor do projeto sobrescreve o global. Implementado em `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Sim | Controla o modo de transporte do MCP do Serena (ex.: `stdio`, `sse`). |
| `telemetry` | Sim | Opt-in de telemetria do fornecedor (`true` / `false`). |
| `language` | Sim | Idioma de resposta para saídas do agente (ex.: `en`, `ko`, `ja`). |
| `model_preset` | Sim | Preset de seleção de modelo (ex.: `claude`, `mixed`, `codex`). |
| `translation_voice` | Sim | Tom do tradutor: `formal`, `balanced`, `interpreter`. |
| `timezone` | Sim | Identificador de fuso horário (ex.: `Asia/Seoul`, `America/New_York`). |

"Projeto vence" significa: se a chave estiver presente no arquivo de projeto, esse valor é usado independentemente do que o arquivo global diga. Se a chave estiver ausente no arquivo de projeto, o valor do arquivo global é usado. Se estiver ausente em ambos, o default se aplica.

## Valores default

| Chave | Default | Quando se aplica |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Ambos arquivos ausentes ou chave faltando |
| `serena.mode` | `stdio` | Ambos arquivos ausentes ou chave faltando |
| `telemetry` | `false` | Ambos arquivos ausentes ou chave faltando |
| `language` | `en` | Ambos arquivos ausentes ou chave faltando |
| `model_preset` | `claude` | Ambos arquivos ausentes ou chave faltando |
| `translation_voice` | `balanced` | Ambos arquivos ausentes ou chave faltando |
| `timezone` | Fuso horário do sistema | Ambos arquivos ausentes ou chave faltando |

## Racional da ordem de leitura

O config de projeto é lido primeiro porque representa o contexto mais específico — o repositório em que o desenvolvedor está trabalhando ativamente. Um time pode impor `language: ko` ou `model_preset: mixed` para seu projeto, e essas escolhas não devem ser sobrescritas silenciosamente pelo `oma-config.yaml` global de um indivíduo.

O arquivo global fornece uma baseline em nível de usuário. Chaves que o projeto não define caem para o valor global, que por sua vez cai para o default hardcoded.

## Notas

- `language` no `oma-config.yaml` controla o idioma de resposta do agente. **Não** é usado para determinar mensagens de aviso de install/update — essas usam o locale do sistema (`$LANG`) porque o `oma-config.yaml` ainda não foi carregado no momento do install.
- A precedência de `auto_update_cli` está explicitamente implementada no comando de update. Quando coexistem uma instalação de projeto e uma global, o `oma-config.yaml` do projeto é consultado primeiro.
- Editar `oma-config.yaml` diretamente é seguro. `oma install` e `oma update` usam substituição de campos em nível de regex e preservam chaves editadas pelo usuário que eles não gerenciam (ex.: overrides customizados de `agents:`, `session.quota_cap`).
