---
title: "Guia: Solução de problemas"
sidebar_label: Solução de problemas
description: Diagnostique falhas de instalação, configuração, vendors, hooks, dashboard, agendamento, avaliação e resultados de agentes pelo sintoma ou pela mensagem de erro exata, com verificações e correções baseadas no código-fonte.
---

# Solução de problemas

Comece por um diagnóstico legível por máquina a partir da raiz do projeto ou da instalação:

```bash
oma doctor --json
```

O comando deve terminar com um JSON que identifique a instalação, o vendor, a configuração e as integrações encontradas. Adicione `--profile` quando o problema envolver a resolução de modelos ou agentes. Guarde o JSON ao relatar um problema; ele contém os caminhos e as verificações selecionados sem exigir uma suposição em prosa.

## Encontre seu sintoma {#find-your-symptom}

| Sintoma | Vá para |
|---------|-------|
| O OMA lê a configuração errada, ou uma atualização substituiu suas configurações | [A CLI ou a instalação está usando os arquivos errados](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` ou `oma update` não consegue baixar um release | [Uma instalação ou atualização não consegue baixar o release](#an-install-or-update-cannot-download-the-release) |
| A CLI ou o modelo de um vendor não inicia | [Um vendor não inicia](#a-vendor-does-not-start) |
| Os hooks estão instalados, mas nada acontece | [Os hooks estão instalados, mas não executam](#hooks-are-installed-but-do-not-run) |
| O dashboard está vazio, desconectado ou não inicia | [O dashboard está vazio ou desconectado](#the-dashboard-is-empty-or-disconnected) |
| Um job agendado está ausente ou falhou | [Um agendamento está ausente ou não foi executado](#a-schedule-is-missing-or-did-not-run) |
| A avaliação ou a otimização de skills não informa cobertura | [A avaliação ou a otimização não informa cobertura](#evaluation-or-optimization-reports-no-coverage) |
| Uma execução de agente não é verificada, não termina ou não é retomada | [Um resultado não pode ser finalizado ou retomado](#a-result-cannot-finish-or-resume) |
| A CLI exibiu uma mensagem de erro | [Encontre seu erro](#find-your-error) |

## Encontre seu erro {#find-your-error}

Cada mensagem abaixo é exibida pela CLI. Compare com o início da mensagem.

| Mensagem | Causa | Correção |
|---------|-------|-----|
| `Unknown plan task: <id>` | O ID da tarefa (de `--task-id` ou, por padrão, o ID do agente) não é um `id` de tarefa em `.agents/results/plan-<session>.json` | Passe `--task-id` com um ID de tarefa do plano |
| `Plan is immutable after dispatch; ...` | O plano da sessão mudou depois do primeiro dispatch | Restaure o plano ou salve o plano alterado com um novo ID de sessão (e um novo `lineage_id`, se você definiu um) |
| `Task acceptance contract changed before dispatch` ou `Plan changed before dispatch` | O plano foi editado enquanto uma execução estava iniciando | Tente novamente quando o plano estiver estável |
| `Attempt limit reached for workflow lineage and logical goal` | O `max_attempts` do plano (padrão 3, incluindo a primeira tentativa) se esgotou | Inspecione as tentativas que falharam antes de planejar outra |
| `Cannot verify a finished run; start a new run` | `oma agent verify` foi executado depois que a execução terminou | Inicie uma nova execução com `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` não recebeu nenhum modo de verificação, ou recebeu mais de um | Use exatamente um entre `--required`, `--affected PATH...` ou `-- <argv>` |
| `No complete test selection for affected paths: ...` | O grafo não tem uma seleção de testes completa para esses caminhos | Use `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` foi chamado em uma execução iniciada por `oma agent spawn` ou `parallel` | Grave o claim no caminho injetado; o pai finaliza a execução |
| `Resume requires a session plan with task contracts` | A sessão não tem arquivo de plano | A retomada só funciona em sessões baseadas em plano; crie a tarefa novamente com spawn |
| `A resume coordinator already owns this session` | Outro `oma agent resume` da sessão está em execução, ou seu lease veio de outro host | Aguarde a outra retomada terminar; um lease deixado por um processo morto no mesmo host é recuperado automaticamente |
| `No graph-backed context found for <agent>` | Não existe contexto de grafo para esse agente | Corrija a definição da tarefa ou continue com o caminho de busca nativo documentado do projeto |
| `Dashboard failed: port 9847 is already in use. ...` | Outro processo ocupa a porta do dashboard | `DASHBOARD_PORT=8080 oma dashboard web`, ou encerre o outro processo |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` não é um inteiro de 1 a 65535 | Defina uma porta válida ou remova a variável para usar 9847 |
| `Removed option <old>. Use <new>.` | O comando usou uma grafia de flag que foi removida | Use a flag indicada na mensagem |
| `Unknown command: ... Use oma --help.` | O caminho do comando foi removido ou renomeado | Execute `oma --help` ou `oma describe` para ver os caminhos atuais |
| `oma agent spawn` termina com código 3 | O vendor terminou com 0, mas a execução não terminou como `completed` | Leia `unresolved` no registro da execução; consulte [Resultados de agentes e retomada](./agent-results-and-resume.md) |

## A CLI ou a instalação está usando os arquivos errados {#the-cli-or-install-is-using-the-wrong-files}

Verifique o contexto explicitamente:

```bash
oma doctor --json
oma doctor --profile
```

| Sintoma | Causa | Correção |
|---------|-------|-----|
| Uma configuração é ignorada, ou um padrão global vence | Os comandos leem os padrões globais de `$OMA_HOME/.agents/` (padrão `~/.oma/.agents/`), depois a configuração compartilhada do projeto mais próximo e uma sobreposição local. Raízes de projeto ancestrais diferentes não são mescladas | Verifique quais caminhos de configuração o `oma doctor --json` selecionou e edite o arquivo que é realmente lido |
| O OMA para ao carregar a configuração | Existem um arquivo CUE local e um arquivo YAML local, ou um arquivo local está malformado. O OMA para em vez de ignorar a substituição silenciosamente | Remova um dos dois arquivos locais ou corrija o arquivo malformado |
| A configuração do usuário foi substituída após uma atualização | A atualização foi executada com `--force`. Atualizações normais preservam a configuração pertencente ao usuário; o modo force pode substituí-la | Atualize sem `--force` e depois inspecione a configuração e os caminhos gerados |
| As configurações de `oma-config.yaml` são ignoradas, e `language` ou `timezone` mostram valores do template | Um `oma update` antigo copiou o `oma-config.cue` distribuído para junto do seu YAML. CUE tem prioridade sobre YAML, então os valores do template venceram | O `oma update` remove essa cópia enquanto ela ainda for um template sem modificações e a guarda em `.agents/backup/stray-shared-config/`. Se você a editou, mantenha um único arquivo de configuração compartilhada e apague o outro |
| O `oma doctor` avisa sobre `timezone: Asia/Seoul` | Templates antigos distribuíam `Asia/Seoul` como fuso horário padrão, e o seu sistema usa outro | Apague a linha `timezone` para seguir o fuso horário do sistema. Para manter `Asia/Seoul`, defina-o na sua configuração local (`oma-config.local.yaml` ou `.local.cue`) |

Consulte a [Referência de configuração](/docs/guide/configuration-reference) para ver a ordem dos arquivos. Depois de uma atualização, inspecione a configuração e os caminhos gerados:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` mantém a execução não interativa.

## Uma instalação ou atualização não consegue baixar o release {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` e o reparo do `oma doctor` baixam o release que o `prompt-manifest.json` na `main` indica. Eles tentam primeiro o asset `agent-skills.tar.gz` do release `cli-v<version>` do GitHub, verificado com o arquivo `.sha256` correspondente, depois o arquivo compactado do código-fonte dessa tag e, por fim, um clone raso da tag. Uma divergência de checksum, ou um payload cujo `.agents/skills/_version.json` indique outra versão, interrompe a execução em vez de tentar outra origem.
<!-- oma-docs:ignore-end -->

| Sintoma | Causa | Correção |
|---------|-------|-----|
| O download falha logo depois de um release | O manifesto indica uma versão cujos assets ainda estão sendo publicados | Aguarde alguns minutos e tente novamente |
| Você precisa de conteúdo ainda não lançado da `main` | Releases instalam somente conteúdo com tag | Ative a opção apenas para uma execução com `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

A execução exibe um aviso: o conteúdo da branch main não é um release com tag nem tem o checksum verificado.

## Um vendor não inicia {#a-vendor-does-not-start}

Execute a verificação de autenticação do próprio vendor e depois inspecione o perfil resolvido pelo OMA:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Sintoma | Causa | Correção |
|---------|-------|-----|
| A CLI do vendor não está autenticada | A sessão do vendor expirou ou nunca foi configurada | Autentique novamente com o comando exato do vendor listado por `oma doctor` |
| Uma substituição de modelo é rejeitada | A substituição não está no formato `owner/model` aceito pelo schema, ou seu vendor não oferece suporte ao transporte de CLI selecionado | Use o formato `owner/model` com um vendor que ofereça suporte ao transporte |
| `model_preset: free` não alcança seu gateway | A URL do gateway ou o modelo resolvidos estão errados, ou a variável de ambiente de chave de API configurada está vazia | Verifique a URL do gateway e o modelo com `oma doctor --profile` e depois defina a chave na variável de ambiente |
| Um filho termina sem artefato de resultado | O filho não gravou seu claim no caminho injetado | Inspecione o diretório da execução e o status do pai (veja abaixo) |

Se você omitir o mapa `free`, os padrões são `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` e o modelo `auto`; nunca coloque a própria chave de API no YAML.

Um filho criado recebe a identidade da execução e as instruções de resultado, grava o claim no caminho injetado e informa seus artefatos; o pai finaliza o recibo gerenciado depois de capturar o código de saída. Filhos somente leitura retornam `OMA_RESULT_JSON: ...`; essa linha é registrada como inspeção e não satisfaz uma verificação executável.

## Os hooks estão instalados, mas não executam {#hooks-are-installed-but-do-not-run}

| Sintoma | Causa | Correção |
|---------|-------|-----|
| O Codex não executa os hooks do OMA | Os hooks ainda não são confiáveis: esta é a primeira instalação, ou uma atualização alterou a string de comando de um hook | Inspecione `.codex/hooks.json` e depois execute `/hooks` dentro do Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Os subprocessos Codex criados pelo OMA passam a flag de bypass para sua própria invocação gerenciada; isso não estabelece confiança em um hook de uma sessão do Codex que você iniciou por conta própria. Consulte [Confiança nos hooks do Codex](/docs/guide/codex-hook-trust).

## O dashboard está vazio ou desconectado {#the-dashboard-is-empty-or-disconnected}

Inicie o dashboard de terminal no projeto que contém os arquivos de sessão:

```bash
oma dashboard terminal
```

| Sintoma | Causa | Correção |
|---------|-------|-----|
| `No agents detected yet` | O workflow ainda não gravou arquivos de sessão, tarefa ou progresso no diretório de memória observado, ou o dashboard observa outro diretório | Aguarde o primeiro arquivo de progresso; execute a partir da raiz do projeto, passe `--project-root <path>` ou defina `MEMORIES_DIR` |
| Arquivos no diretório legado `.serena/memories/` não aparecem | O dashboard lê `.agents/state/memories/` e não procura no diretório legado | Defina `MEMORIES_DIR` como o diretório que contém os arquivos |
| `oma dashboard web` termina com `port 9847 is already in use` | Outro processo ocupa a porta | Use outro `DASHBOARD_PORT` |
| A página web continua Disconnected depois que você reiniciou o dashboard | Cada inicialização cria um novo token de acesso, e a aba aberta ainda guarda o antigo | Recarregue a página |

O dashboard web se vincula ao loopback e imprime sua URL. Abra-a; a página carrega o próprio token para a API web e o WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Mais sinais do dashboard estão em [Monitoramento do dashboard](./dashboard-monitoring.md#troubleshooting-runbook).

## Um agendamento está ausente ou não foi executado {#a-schedule-is-missing-or-did-not-run}

Inspecione o manifesto e o estado do agendador. Os dois primeiros comandos são somente leitura; os dois últimos alteram o estado:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Sintoma | Causa | Correção |
|---------|-------|-----|
| `schedule list` mostra `missing-in-os` ou `stale` | O registro no sistema operacional está ausente ou desatualizado | `oma schedule sync` |
| O log da execução mostra `Unknown command: schedule:run` | O registro é anterior à renomeação do comando | O `oma update` o ressincroniza automaticamente; `oma schedule sync` também o reescreve |
| `schedule list` mostra `orphan-in-os` | Um job do sistema operacional não tem entrada no manifesto | `oma schedule sync --prune`, somente quando os jobs órfãos devem ser removidos |
| Um agendamento criado nunca foi registrado | Ele foi criado com `--dry-run`, que apenas gera uma prévia | Crie-o novamente sem `--dry-run` |
| Um intervalo recorrente não foi registrado | O intervalo precisa de arredondamento | Revise a prévia e depois aceite o arredondamento com `--accept-rounded` |
| O job foi executado, mas falhou | O vendor terminou com código diferente de zero, ou o log informa `re-auth required` | Verifique o log da execução em `~/.oma/schedule/runs/<id>/` e autentique o vendor novamente |

## A avaliação ou a otimização não informa cobertura {#evaluation-or-optimization-reports-no-coverage}

| Sintoma | Causa | Correção |
|---------|-------|-----|
| A avaliação ou a otimização de skills não informa cobertura | Existem menos de cinco fixtures em `.agents/eval/<skill>/` | Adicione fixtures até haver pelo menos cinco |
| O modo mock rejeita rollouts registrados | A proveniência dos rollouts registrados não corresponde à skill atual e aos hashes das fixtures | Grave novamente no modo live; não copie um arquivo antigo `_rollouts` para um novo diretório de skill e o trate como evidência atual |
| `--apply` se recusa a gravar | `--apply` exige um resultado de validação estritamente positivo e uma divisão de testes do runner aprovada | Mantenha o padrão `--dry-run` enquanto revisa o diff proposto e corrija primeiro a validação que falha |

Uma skill pertencente ao OMA alterada por `--apply` pode ser sobrescrita por um `oma update` posterior.

## Um resultado não pode ser finalizado ou retomado {#a-result-cannot-finish-or-resume}

Inspecione os arquivos de execução e do plano:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Sintoma | Causa | Correção |
|---------|-------|-----|
| Um claim concluído é rejeitado ou rebaixado | Um recibo falho, entradas alteradas, artefatos ausentes, itens não resolvidos ou um contrato de tarefa alterado | Execute `oma agent verify RUN_ID --required` antes de finalizar e corrija o que o recibo informar |
| A retomada deixa uma tarefa como `blocked` | A retomada automática exige `retry_policy: "safe"`, um prompt reproduzível e tentativas restantes | Leia o motivo no relatório do dry-run. O plano fica congelado após o primeiro dispatch, portanto defina `retry_policy` no plano de uma nova sessão ou execute a tarefa novamente à mão |
| A retomada não tenta a tarefa novamente | Um processo ativo, ou uma tentativa nativa interrompida sem resultado parcial ou falha clara, permanece intacto para evitar trabalho duplicado | Aguarde o processo ativo ou finalize primeiro a tentativa nativa |

Consulte [Resultados de agentes e retomada](./agent-results-and-resume.md) para ver o ciclo de vida completo.

## Peça ajuda {#ask-for-help}

Ao pedir ajuda, inclua a saída relevante de `oma doctor --json`, o comando, o ID da sessão ou da execução e a mensagem não resolvida. Não inclua credenciais nem o conteúdo de arquivos que contenham segredos. Abra uma issue em [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## Veja também {#see-also}

- [Usando o OMA](./usage.md#troubleshooting): problemas de configuração, como skills e CLIs ausentes e conflitos de workspace
- [Monitoramento do dashboard](./dashboard-monitoring.md#troubleshooting-runbook): sinais de dashboard travado, com falha e desconectado
- [Resultados de agentes e retomada](./agent-results-and-resume.md): registros de execução, claims e recuperação
- [Glossário](../getting-started/glossary.md): termos como [registro de execução e claim](../getting-started/glossary.md#run-record-and-claim)
