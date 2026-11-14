---
title: Reparar hooks de plugin e o bootstrap do projeto
description: Veja como caminhos de hooks do marketplace, o provisionamento de Bash e os recibos de bootstrap do projeto foram reparados com fixtures de regressão.
---

# Reparar hooks de plugin e o bootstrap do projeto

O reparo do plugin em [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) tratou do dispatch de hooks e do comportamento do bootstrap. O pai, `82649cbd`, fornece o estado anterior desta comparação.

## Mecanismo da falha

O [manifesto antigo de hooks](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) invocava arquivos em `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. Esses caminhos dependem de arquivos gerados; a fixture com um cache novo de plugin os deixa fora do diretório do plugin.

O [bootstrap antigo](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) também executava o instalador Bash baixado por meio de `sh -c`. O marcador de sucesso ficava em dados compartilhados do plugin, e o caminho rápido verificava apenas esse marcador, a versão da CLI e a presença do arquivo de settings do projeto. Um segundo projeto com um arquivo de settings podia, portanto, pular a própria wiring.

## Reparo

O [novo dispatcher](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) chama a CLI instalada. Quando um hook de projeto executável correspondente já é dono do evento, o hook do marketplace cede a vez para que o evento não seja despachado duas vezes.

O [novo bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh):

- Executa o instalador Bash por meio do Bash e verifica falhas de provisionamento.
- Força a instalação no projeto mesmo quando uma configuração de instalação global é herdada.
- Guarda o recibo em `.agents/state/plugin-bootstrap.version` desse projeto.
- Verifica a configuração, os metadados de versão, o wrapper executável e os eventos registrados antes de reutilizar um recibo.
- Preserva o diagnóstico de instalação com falha em `.agents/state/plugin-bootstrap.last-error.log` sem registrar um recibo de sucesso.

## Reproduzir as verificações de regressão

Use um checkout descartável de `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` com o Bun e as dependências de desenvolvimento do repositório já disponíveis. A partir da raiz:

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

As fixtures cobrem limites distintos:

| Fixture | O que as asserções verificam |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Provisionamento somente com Bash, recibos separados por projeto, configuração apenas CUE, wiring incompleta, falhas de versão e diagnósticos preservados. |
| [Dispatch de hooks](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Dispatch com cache novo, orçamentos de tempo dos handlers, preservação do payload, posse do hook de projeto correspondente e fallback quando essa posse está ausente ou é inválida. |
| [Integração da instalação](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Duas instalações de projeto, settings do usuário preservadas, uma entrega de prompt/Stop nas duas inscrições e nova tentativa depois de uma wiring com falha. |

Essas fixtures criam diretórios temporários e comandos de CLI falsos; a fixture de integração usa o compositor real de hooks. Elas verificam o dispatch do shell e os efeitos registrados sem instalação no marketplace nem chamada de modelo. As suítes são ignoradas no Windows.

## O que ainda verificar em uma sessão real

Uma execução de fixture aprovada não estabelece uma sessão funcional do Claude Code. No projeto alvo real, inspecione o recibo e a configuração, execute `oma doctor`, reinicie a sessão e exercite o comportamento relevante de prompt e de Stop enquanto confere os efeitos observados. A disponibilidade da CLI, as credenciais, o comportamento dos providers e a política de hooks do host precisam da própria evidência.

Para a mesma abordagem de reproduzir, corrigir e verificar em outra falha, comece por [depurar um teste que falha](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). [Escolher uma configuração](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/) explica quando o runtime do projeto é necessário.
