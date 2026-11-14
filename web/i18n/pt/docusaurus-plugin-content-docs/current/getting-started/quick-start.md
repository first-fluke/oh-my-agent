---
title: Início rápido
description: Escolha uma skill ou um preset de runtime e execute uma primeira tarefa de escopo definido com verificação observada.
---

# Início rápido

Use uma tarefa focada para conferir o resultado. Carregue uma skill no agente de código que você já usa ou instale o runtime quando precisar de hooks de projeto, agentes especialistas e workflows. [Escolha uma configuração](./choose-setup.md) explica os caminhos disponíveis e suas dependências.

## 1. Escolha a configuração {#1-install}

Para a tarefa Git somente leitura abaixo, peça ao agente para carregar a skill e ler suas instruções e o diretório de suporte:

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Continue com a tarefa na Etapa 3. As operações de CLI da skill, outras skills, regras do projeto e serviços externos continuam sendo dependências separadas. Carregar essa skill não executa o instalador do OMA.

### Instale o runtime quando necessário

O bootstrap do runtime pode preparar `bun`, `uv`, Serena, CUE e o comando global `oma`. Selecione a CLI ou IDE com IA que você já usa; as integrações de providers e de navegador dependem das tarefas que você pretende executar.

No diretório do projeto, execute o instalador de bootstrap:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

No Windows PowerShell, execute:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

A configuração preserva um idioma de resposta existente ou detecta o idioma do sistema automaticamente. A configuração interativa pergunta os vendors de CLI, [providers de capacidade](./glossary.md#capability-provider), [preset de modelo](./glossary.md#model-preset), [preset de skills](./glossary.md#skill-preset) do projeto e qualquer variante de stack. Na primeira execução, mantenha os padrões, selecione o vendor que você já usa e escolha o preset de projeto mais próximo do repositório. Consulte [Presets](./installation.md#presets) para as skills de cada preset e para os [workflows que precisam de skills fora de um preset](./installation.md#workflows-that-need-skills-outside-a-preset).

Se você já tem `bun`, use o instalador diretamente:

```bash
bunx oh-my-agent@latest
```

Os scripts de bootstrap instalam no projeto atual. Use `oma install --global` quando quiser uma instalação no HOME; leia [Instalação global](../guide/global-install.md) antes de misturar instalações de projeto e globais.

## 2. Verificar o resultado

Para o carregamento temporário de skill, confirme que o agente leu as instruções selecionadas e verifique a própria tarefa. Para uma instalação do runtime, execute a verificação de saúde no mesmo diretório do projeto:

```bash
oma doctor
```

O comando de texto imprime um relatório com seções como `CLI Status` e `Skills Status` e, em seguida, devolve o status de saída ao shell. As linhas exatas dependem dos hosts instalados no projeto:

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor` pode informar problemas de integrações opcionais como avisos. A preparação padrão do AgentMemory é verificada durante `oma install` e `oma update`; falhas de instalação, inicialização ou saúde interrompem esses comandos. Selecionar `providers.semantic_memory: none` ou `honcho`, ou definir `OMA_NO_AGENTMEMORY=1`, pula essa preparação.

Para um status legível por máquina, `oma doctor --json` retorna um status diferente de zero quando o relatório contém problemas. Use `oma doctor --profile` para inspecionar o modelo e a CLI resolvidos para cada papel canônico de agente.

Se `oma` não estiver disponível, mas o Bun estiver instalado, execute a mesma verificação sem o comando global:

```bash
bunx oh-my-agent@latest doctor
```

Se o comando simples ainda estiver ausente, abra um novo shell ou adicione o diretório bin do gerenciador de pacotes ao `PATH`; [Instalação](./installation.md#method-3-global-install) mostra como instalar o comando `oma`. Se `oma doctor` informar uma configuração inválida, corrija o campo indicado e execute novamente. Não apague `.agents/oma-config.yaml` para recuperar: essa é a configuração pertencente ao usuário, que preserva as definições entre atualizações.

## 3. Executar uma tarefa pequena

Abra um repositório Git existente na sua ferramenta de IA. Use a skill `oma-scm` carregada ou a cópia instalada por um preset nomeado de runtime. Se você usou seleção personalizada, inclua `oma-scm` para este exemplo:

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

Compare a ramificação e as alterações informadas com a saída real do Git. O agente deve informar quais comandos foram executados e seus status de saída. Esta tarefa somente leitura não precisa de teste nem build de código.

Um prompt em linguagem natural não inicia nenhum workflow; onde o hook de prompt está habilitado, ele acrescenta uma dica informativa de skill. O roteamento de skills é feito pelo host ou pelo workflow selecionado, portanto um prompt arbitrário do host não garante um hook nem uma skill específica. O contrato de execução ainda deve inspecionar as convenções do repositório, respeitar o escopo somente leitura solicitado e informar as verificações observadas. Os arquivos e o comando exatos dependem do projeto.

Para uma tarefa que atravesse limites de API e UI, selecione `/work` ou `/orchestrate` explicitamente. Para um único domínio, continue com [Execução de uma única skill](../guide/single-skill.md). O [Guia de uso](../guide/usage.md) contém exemplos mais longos.

## 4. Conhecer os padrões do runtime antes de escalar

O carregamento temporário de skills não configura esses padrões do runtime. Para hooks de projeto, configuração de providers ou workflows em equipe, use o caminho de runtime em [Escolha uma configuração](./choose-setup.md).

O OMA começa com `model_preset: auto`, Serena para inteligência de código, Agent Memory para memória semântica, busca web nativa e telemetria desabilitada. Serena usa o transporte compartilhado `bridge` e se atualiza automaticamente, salvo configuração diferente. O MCP do Browser DevTools é opt-in; uma configuração interativa nova oferece Aside primeiro. Consulte [Padrões importantes](./important-defaults.md) para as consequências e as chaves de substituição.

Se uma tarefa gerenciada parar, comece com `oma agent status <session-id> [agent-id]`, depois inspecione o recibo em `.agents/state/agent-runs/` e o caminho do claim estruturado injetado. Esses registros mostram a execução, a tarefa, o workspace, o código de saída e o status da verificação. Arquivos legíveis `result-*.md` e `progress-*.md` em `.agents/state/memories/` acrescentam contexto quando presentes. Execute novamente somente o menor comando que falhou depois de confirmar que a execução não está mais ativa. Um [workflow persistente](./glossary.md#persistent-workflow) continua ativo até concluir ou você dizer `workflow done`; consulte [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) para a recuperação do arquivo de estado.

## Próximos passos

- [Escolha uma configuração](./choose-setup.md) para uma skill, um preset de runtime ou o plugin do Claude Code
- [Padrões importantes](./important-defaults.md) para precedência, providers e escolhas de recuperação
- [Instalação](./installation.md) para presets, configuração de vendors, instalações globais e atualizações
- [Agentes](../core-concepts/agents.md) para os 33 pacotes de skills e papéis de dispatch
- [Workflows](../core-concepts/workflows.md) para planejamento, execução paralela, QA e modos persistentes
- [Solução de problemas](../guide/troubleshooting.md) quando a instalação, um vendor ou um hook não se comporta como esperado
