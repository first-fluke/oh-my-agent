---
title: "Guia: Confiança nos hooks do Codex"
sidebar_label: Confiança nos hooks do Codex
description: Como o Codex condiciona os hooks à confiança, o que o oh-my-agent registra para que seus hooks executem e quando você ainda precisa revisá-los.
---

# Guia: Confiança nos hooks do Codex

Quando o oh-my-agent é instalado em um projeto, ele grava configurações de hooks nativas do vendor, incluindo `.codex/hooks.json` para a CLI do Codex. O Codex não executa um hook só porque ele está configurado. Duas aprovações o condicionam, e ambas ficam na configuração do usuário (`$CODEX_HOME/config.toml`, padrão `~/.codex/config.toml`). Um projeto não pode aprovar os próprios hooks:

1. **Confiança do projeto.** A pasta `.codex/` de um projeto (seu `config.toml` e `hooks.json`) só é carregada para um projeto confiável: `[projects."<path>"] trust_level = "trusted"`.
2. **Confiança por hook.** Todo hook não gerenciado, no escopo do projeto ou do usuário, precisa de uma entrada `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` cujo `trusted_hash` corresponda à declaração atual do hook (comando, timeout, matcher, flag async, mensagem de status).

Um hook novo ou alterado mostra "Hooks need review" na TUI do Codex. `codex exec` o deixa de fora silenciosamente.

---

## O que o oh-my-agent registra para você

`oma install`, `oma update` e `oma link` gravam as duas aprovações para **os próprios hooks do oh-my-agent**. São os handlers chamados `oma-hook-*` ou executados pelo wrapper `oma-hook.sh`. O hash é o mesmo que o Codex calcula quando você escolhe "Trust all and continue", então os hooks executam na primeira sessão do Codex sem a etapa `/hooks`. Uma versão posterior do oh-my-agent que altere o comando de um hook registra o novo hash durante `oma update`, e os hooks continuam ativos.

O oh-my-agent edita somente as tabelas afetadas em `config.toml`. Ele relê o resultado e deixa o arquivo intacto se qualquer outra coisa fosse mudar. Ele nunca:

- aprova um hook que você mesmo adicionou ao mesmo `hooks.json`,
- confia em um projeto que você marcou com `trust_level = "untrusted"`,
- reativa um hook que você desligou (`enabled = false`),
- mexe no Codex antes de o Codex ter criado o diretório home.

Uma instalação global (`~/.codex/hooks.json`) recebe somente as entradas por hook, porque não há projeto para confiar.

---

## Quando você ainda revisa os hooks

Se o oh-my-agent não conseguiu registrar a confiança, ele imprime o motivo com o aviso:

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Os casos comuns são um `config.toml` que ele não consegue analisar, um projeto que você marcou como não confiável ou o Codex ainda não ter sido executado. Nesse caso, abra o projeto no Codex, execute `/hooks` e habilite os hooks uma vez. Depois execute `oma link codex` para que atualizações posteriores os mantenham confiáveis.

---

## Processos Codex que o oh-my-agent cria

Quando o oh-my-agent cria um subprocesso Codex (por exemplo, `oma agent spawn`), ele também passa `--dangerously-bypass-hook-trust`. Essa flag executa hooks habilitados sem a verificação de hash. Ela não remove a confiança do projeto. A flag vale somente para processos que o oh-my-agent inicia e nunca é gravada na sua configuração.

---

## Nenhuma flag `[features] hooks` é necessária

Versões antigas do oh-my-agent gravavam `[features] codex_hooks = true` na configuração do Codex. O Codex 0.124 renomeou essa flag para `hooks` e tornou os hooks um recurso estável e habilitado por padrão, então nenhuma flag é necessária. O oh-my-agent não grava nenhuma das duas chaves e remove as flags obsoletas `codex_hooks` e `child_agents_md` da tabela `[features]` quando as encontra.

---

## Resumo

| Situação | O que fazer |
|:----------|:------------|
| Primeira instalação em um projeto | Nada: a confiança é registrada pelo instalador |
| `oma update` que altera o comando de um hook | Nada: o novo hash é registrado |
| O instalador imprime "not trusted (…)" | Corrija o motivo ou execute `/hooks` uma vez no Codex |
| Um hook que você adicionou a `.codex/hooks.json` | Revise-o em `/hooks` |

## Veja também

- [Integração com projeto existente](./integration.md): o que o instalador grava para cada vendor
- [Instalação global](./global-install.md): instalações para todo o usuário que gravam em `~/.codex/`
