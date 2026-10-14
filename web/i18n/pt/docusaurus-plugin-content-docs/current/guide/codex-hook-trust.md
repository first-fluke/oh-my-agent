---
title: "Guia: Confiança nos hooks do Codex"
sidebar_label: Confiança nos hooks do Codex
description: Por que os hooks do Codex só executam depois de uma primeira revisão, o que acontece nas atualizações e o que o oh-my-agent automatiza para subprocessos Codex criados.
---

# Guia: Confiança nos hooks do Codex

Quando o oh-my-agent é instalado em um projeto, ele grava configurações de hooks nativas do vendor, incluindo `.codex/hooks.json` para a CLI do Codex. Diferentemente do Claude Code, o Codex não executa esses hooks automaticamente. Ele coloca cada hook de comando não gerenciado atrás do Trust-On-First-Use (TOFU): um hook só executa depois que você o revisa e habilita uma vez.

Esse é um mecanismo de segurança do Codex, não uma limitação do oh-my-agent. Este guia explica a etapa única necessária, o que acontece quando o oh-my-agent é atualizado e o que ele faz automaticamente por você.

---

## Etapa única: revisar os hooks no Codex

Depois que `oma` (install), `oma link` ou `oma update` gravar `.codex/hooks.json` em um projeto que o Codex ainda não conhecia (em uma instalação global, `~/.codex/hooks.json`), os hooks **ainda não** executam. Abra o Codex e revise-os uma vez:

1. Abra o projeto na CLI do Codex.
2. Execute `/hooks` para abrir o navegador de hooks (TUI).
3. Revise os hooks listados e habilite-os.

Até que você faça isso, os hooks permanecem não confiáveis e são ignorados silenciosamente. Por isso o oh-my-agent exibe um aviso sempre que cria ou altera `.codex/hooks.json`:

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Verifique o arquivo gerado antes de abrir o Codex:

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

O resultado esperado é o aviso de instalação/atualização seguido pelos hooks no navegador `/hooks` do Codex. `oma link codex` reconcilia o arquivo gerado; ele não substitui a decisão única de confiança.

**Observação:** `--dangerously-bypass-hook-trust` não ajuda aqui. O aviso ("Enabled hooks may run without review") significa que ele só ignora a revisão de hooks que já foram habilitados; ele não executará um hook que nunca foi revisado. O navegador `/hooks` é a única forma de habilitar um hook pela primeira vez.

Internamente, o Codex armazena sua decisão em `~/.codex/config.toml`, em uma entrada `[hooks.state]` indexada pelo caminho do arquivo de hooks, pelo evento, pelo bloco e pelo hook, com uma flag `enabled` e um `trusted_hash` da string de comando.

---

## O que acontece nas atualizações

Depois que você confiar nos hooks, não precisa repetir a etapa a cada atualização:

- **Executar novamente `oma link` ou `oma update` mantém a confiança** enquanto as strings de comando dos hooks não mudarem. O Codex compara o hash armazenado com o comando atual; uma correspondência mantém o hook confiável.
- **Se uma versão futura do oh-my-agent alterar a string de comando de um hook**, os hashes deixam de corresponder e esse hook volta silenciosamente ao estado não confiável. Você verá o aviso do instalador novamente e precisará confiar nele outra vez usando `/hooks`.

Assim, a revisão só é necessária na primeira vez e depois de qualquer versão que realmente altere um comando de hook.

---

## O que o oh-my-agent automatiza para você

Quando o oh-my-agent cria um subprocesso Codex por conta própria, por exemplo, um agente de outro vendor enviado por `oma agent spawn`, ele passa `--dangerously-bypass-hook-trust` automaticamente. Assim, os próprios hooks verificados podem executar durante as atualizações sem pedir que você confie neles novamente.

Essa flag é aplicada **somente** aos processos Codex criados pelo oh-my-agent. Ela nunca é gravada em `~/.codex/config.toml` nem na configuração do projeto, portanto não afeta as sessões Codex que você inicia.

---

## Nenhuma flag `[features] hooks` é necessária

Versões antigas do oh-my-agent gravavam `[features] codex_hooks = true` na configuração do Codex. O Codex 0.124 renomeou essa flag para `hooks` e tornou os hooks um recurso estável e habilitado por padrão, então nenhuma flag é necessária. O oh-my-agent não grava nenhuma das duas chaves e remove as flags obsoletas `codex_hooks` e `child_agents_md` da tabela `[features]` quando as encontra.

---

## Resumo

| Situação | O que fazer |
|:----------|:------------|
| Primeira instalação / primeiro `.codex/hooks.json` em um projeto | Abra o Codex, execute `/hooks` e habilite os hooks uma vez |
| `oma update` com comandos de hook inalterados | Nada — a confiança é preservada |
| `oma update` que altera um comando de hook | Execute `/hooks` novamente para confiar outra vez (o instalador mostra um aviso) |
| Subprocesso Codex criado pelo oh-my-agent | Nada — o bypass é aplicado automaticamente |

## Veja também

- [Integração com projeto existente](./integration.md): o que o instalador grava para cada vendor
- [Instalação global](./global-install.md): instalações para todo o usuário que gravam em `~/.codex/`
