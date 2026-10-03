---
title: Início rápido
description: Execute uma tarefa de escopo definido, da instalação à verificação, com a saída esperada e a recuperação.
---

# Início rápido

Use esta página para executar uma pequena tarefa e registrar um resultado concreto. Você precisa de um diretório de projeto e de pelo menos uma CLI ou IDE de IA compatível. O instalador pode preparar `bun`, `uv`, Serena e CUE no macOS, Linux ou Windows; a integração do host selecionado é necessária para o primeiro prompt, enquanto providers e integrações de navegador são opcionais.

## 1. Instalar

### Caminho mais rápido — skills nos seus agentes

```bash
npx skills add first-fluke/oh-my-agent
```

Isso instala o pacote de skills do OMA nos runtimes de agentes detectados (Claude Code, Cursor, Codex e outros). As skills ensinam o agente a trabalhar. Para gates de stop-hook, verificação de artefatos, juízes independentes e a CLI `oma`, instale o harness completo abaixo.

Instalações apenas de skills não fornecem a CLI `oma`, hooks, workflows nem juízes. Use uma skill instalada e nomeada na primeira tarefa abaixo; use o harness completo quando precisar das verificações da CLI.

### Harness completo (gates, hooks, CLI)

No diretório do projeto, execute o instalador de bootstrap:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

No Windows PowerShell, execute:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

A configuração interativa pergunta o idioma das respostas, vendors de CLI, providers de capacidade, preset de modelo, preset de skills do projeto e qualquer variante de stack. Na primeira execução, mantenha os padrões, selecione o vendor que você já usa e escolha o preset de projeto mais próximo do repositório.

Se você já tem `bun`, use o instalador diretamente:

```bash
bunx oh-my-agent@latest
```

Os scripts de bootstrap instalam no projeto atual. Use `oma install --global` quando quiser uma instalação no HOME; leia [Instalação](./installation.md) antes de misturar instalações de projeto e globais.

## 2. Verificar o resultado (somente harness completo)

Se você instalou o harness completo, execute a verificação de saúde no mesmo diretório do projeto:

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

Integrações opcionais de MCP, navegador, memória ou inteligência de código podem aparecer como avisos; elas são necessárias somente para tarefas que as utilizam. Para um status legível por máquina, `oma doctor --json` retorna um status diferente de zero quando o relatório contém problemas. Use `oma doctor --profile` para inspecionar o modelo e a CLI resolvidos para cada papel canônico de agente.

Se `oma` não estiver disponível, mas o Bun estiver instalado, execute a mesma verificação sem o comando global:

```bash
bunx oh-my-agent@latest doctor
```

Se o comando simples ainda estiver ausente, abra um novo shell ou adicione o diretório bin do gerenciador de pacotes ao `PATH`. Se `oma doctor` informar uma configuração inválida, corrija o campo indicado e execute novamente. Não apague `.agents/oma-config.yaml` para recuperar: essa é a configuração pertencente ao usuário, que preserva as definições entre atualizações.

Se você instalou apenas as skills, pule esta verificação da CLI e continue com a tarefa da skill nomeada abaixo.

## 3. Executar uma tarefa pequena

Abra o repositório na ferramenta de IA configurada e peça uma skill nomeada e um resultado autocontido:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

O host deve identificar a skill selecionada, inspecionar um alvo e informar uma edição pontual do link ou que o link já é válido. Inclua a saída do comando e o status de saída de qualquer verificação que tenha realmente sido executada. Uma instalação apenas de skills não adiciona `/debug`, `/ralph`, hooks nem gates de workflow; pedir a skill nomeada mantém esta primeira tarefa dentro dos recursos instalados.

Quando o hook de palavras-chave está habilitado para o host selecionado, ele pode ativar um workflow correspondente. O roteamento de skills é feito pelo host ou pelo workflow selecionado, portanto um prompt arbitrário do host não garante um hook, uma skill específica ou um `CHARTER_CHECK`. O contrato de execução ainda deve inspecionar as convenções do repositório, fazer somente a alteração no escopo e informar a verificação. Os arquivos e comandos exatos dependem do projeto.

Para uma tarefa que atravesse limites de API e UI, selecione `/work` ou `/orchestrate` explicitamente. Para um único domínio, continue com [Execução de uma única skill](../guide/single-skill.md). O [Guia de uso](../guide/usage.md) contém exemplos mais longos.

## 4. Conhecer os padrões antes de escalar

O OMA começa com `model_preset: auto`, Serena para inteligência de código, Agent Memory para memória semântica, busca web nativa e telemetria desabilitada. Serena usa o transporte compartilhado `bridge` e se atualiza automaticamente, salvo configuração diferente. O MCP do Browser DevTools é opt-in; uma configuração interativa nova oferece Aside primeiro. Consulte [Padrões importantes](./important-defaults.md) para as consequências e as chaves de substituição.

Se uma tarefa gerenciada parar, comece com `oma agent status <session-id> [agent-id]`, depois inspecione o receipt em `.agents/state/agent-runs/` e o caminho do claim estruturado injetado. Esses registros mostram a execução, a tarefa, o workspace, o código de saída e o status da verificação. Arquivos legíveis `result-*.md` e `progress-*.md` em `.agents/state/memories/` acrescentam contexto quando presentes. Execute novamente somente o menor comando que falhou depois de confirmar que a execução não está mais ativa. Um workflow persistente continua ativo até concluir ou você dizer `workflow done`; consulte [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) para a recuperação do arquivo de estado.

## Próximos passos

- [Padrões importantes](./important-defaults.md) para precedência, providers e escolhas de recuperação
- [Instalação](./installation.md) para presets, configuração de vendors, instalações globais e atualizações
- [Agentes](../core-concepts/agents.md) para os 33 pacotes de skills e papéis de dispatch
- [Workflows](../core-concepts/workflows.md) para planejamento, execução paralela, QA e modos persistentes
