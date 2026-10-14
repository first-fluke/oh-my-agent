---
title: Por que escolher o oh-my-agent
description: "Escolha o oh-my-agent quando precisar de skills de agentes mantidas pelo repositório, workflows, dispatch entre vários vendors e verificação explícita."
---

# Por que escolher o oh-my-agent

O oh-my-agent adiciona uma camada mantida pelo repositório aos CLIs de agentes que sua equipe já usa. O diretório `.agents/` armazena [skills](./glossary.md#skill), [workflows](./glossary.md#workflow), [definições de agentes](./glossary.md#agent-definition), regras e configuração de modelos. Os arquivos nativos de cada vendor são gerados a partir dessa [fonte de verdade](./glossary.md#ssot), para que o comportamento possa ser revisado e alterado junto com o projeto.

## Escolha-o quando o repositório precisar da camada de coordenação

O OMA é adequado quando você precisa de uma ou mais destas capacidades:

- **Vários hosts ou vendors de agentes.** `model_preset: auto` usa a configuração nativa do runtime atual. Presets fixos e personalizados podem encaminhar papéis para outros vendors; `oma agent spawn` cuida do dispatch não nativo.
- **Um workflow de equipe repetível.** `/work` cuida de uma tarefa delimitada, `/orchestrate` coordena o trabalho delegado, `/ultrawork` executa trabalho paralelo com etapas de revisão e `/ralph` repete uma tarefa com uma fase explícita de avaliação.
- **Instruções mantidas pelo repositório.** Skills, workflows, regras e definições de agentes ficam ao lado do código. `oma link` projeta os arquivos selecionados nos formatos compatíveis com cada vendor.
- **Verificações mecânicas e resultados duráveis.** As execuções dos agentes podem gravar status estruturado e recibos de resultado, enquanto `oma verify agent <agent-type>` e `oma docs verify` fornecem verificações explícitas.

Se um projeto usa um único host e não precisa compartilhar skills, workflows ou roteamento entre vendors, os arquivos `.agents/` e os comandos da CLI podem não justificar a configuração. O OMA é uma camada de coordenação; ele não substitui o modelo, o editor ou os critérios de aceitação específicos do projeto.

## A verificação é um comando que você escolhe

Execute `oma verify agent <agent-type> --workspace <path>` quando quiser as verificações de um papel de backend, frontend, mobile, QA, depuração ou planejamento. O verificador combina inspeções estáticas com comandos configurados, como testes, verificações de tipos, verificações SQL ou `flutter analyze`; consulte [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). O relatório mostra o resultado de cada verificação. A aprovação dessas verificações não demonstra que uma funcionalidade atende aos requisitos de produto ou de domínio; os critérios de aceitação da tarefa ainda precisam ser revisados.

`/ralph` adiciona uma fase de [juiz](./glossary.md#judge) separada quando você escolhe esse workflow. Ele verifica novamente os critérios declarados entre iterações e registra os artefatos do workflow; não é um portão executado em todos os prompts comuns. O carregamento de skills também não inicia todos os workflows ou comandos de verificação.

## O dispatch continua visível {#dispatch-remains-visible}

`oma doctor --profile` mostra o vendor e o modelo resolvidos para cada papel de dispatch. `oma agent spawn <agent-id> <prompt> <session-id>` é o caminho explícito da CLI quando um papel não é tratada pelo host atual. As regras de resolução do modelo e o comportamento específico de cada provider estão documentados em [Padrões importantes](./important-defaults.md) e [Modelos por agente](../guide/per-agent-models.md).

Os hooks podem ativar um workflow somente quando a integração do host correspondente está habilitada. O host faz o roteamento nativo de skills, enquanto o roteamento de workflows segue o workflow ou hook selecionado; um prompt comum não garante que uma skill ou um portão específico seja executado.

Os controles de coordenação opcionais estão documentados no [limite de cota da sessão](../guide/configuration-reference.md#session-quota-caps), no [loop de retry e exploração de `/orchestrate`](../core-concepts/workflows.md#orchestrate) e na [atribuição de workspace](../core-concepts/parallel-execution.md#workspace-aware-pattern).

## O compromisso prático

O OMA dá à equipe um lugar compartilhado para definir roteamento, etapas de execução, verificações e arquivos de saída. Em troca, a equipe precisa manter essa configuração do repositório atualizada e decidir quais workflows ou comandos de verificação fazem parte do seu contrato de aceitação. Esse compromisso é útil quando a consistência entre colaboradores importa mais do que a instalação mínima.

Para a discussão de posicionamento original, consulte a [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Próximos passos

- [Início rápido](./quick-start.md): instale, verifique a configuração e execute uma tarefa delimitada
- [Padrões importantes](./important-defaults.md): o que o instalador ativa e como alterar isso
- [Instalação](./installation.md#presets): escolha um preset de skills que cubra os workflows que você pretende usar
- [Workflows](../core-concepts/workflows.md): quando usar `/work`, `/orchestrate`, `/ultrawork` e `/ralph`
- [Solução de problemas](../guide/troubleshooting.md): correções para problemas de instalação, vendors e hooks
