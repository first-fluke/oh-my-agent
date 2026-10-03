---
title: "Guia: Solução de problemas"
sidebar_label: Solução de problemas
description: Diagnostique falhas de instalação, configuração, vendors, dashboard, agendamento, avaliação e resultados de agentes com verificações baseadas na origem.
---

# Solução de problemas

Comece por um diagnóstico legível por máquina a partir da raiz do projeto ou da instalação:

```bash
oma doctor --json
```

O comando deve terminar com um JSON que identifique a instalação, o vendor, a configuração e as integrações encontradas. Adicione `--profile` quando o problema envolver a resolução de modelos ou agentes. Guarde o JSON ao relatar um problema; ele contém os caminhos e as verificações selecionados sem exigir uma suposição em prosa.

## A CLI ou a instalação está usando os arquivos errados

Verifique o contexto explicitamente:

```bash
oma doctor --json
oma doctor --profile
```

Os comandos de projeto leem o `.agents/oma-config.cue` ou `.agents/oma-config.yaml` mais próximo e depois uma sobreposição local. Um comando global lê a raiz de instalação do HOME. Se existirem arquivos CUE e YAML locais, remova um deles. Se um arquivo local estiver malformado, o OMA para em vez de ignorar a substituição silenciosamente. Consulte [Referência de configuração](/docs/guide/configuration-reference).

Depois de uma atualização, inspecione a configuração e os caminhos gerados:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` mantém a execução não interativa. Se a configuração do usuário tiver sido substituída inesperadamente, verifique se `--force` foi usado; atualizações normais preservam a configuração pertencente ao usuário, enquanto o modo force pode substituí-la.

## Uma instalação ou atualização não consegue baixar o release

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` e o reparo do `oma doctor` baixam o release que o `prompt-manifest.json` na `main` indica. Eles tentam primeiro o asset `agent-skills.tar.gz` do release `cli-v<version>` do GitHub, verificado com o arquivo `.sha256` correspondente, depois o arquivo compactado do código-fonte dessa tag e, por fim, um clone raso da tag. Uma divergência de checksum, ou um payload cujo `.agents/skills/_version.json` indique outra versão, interrompe a execução em vez de tentar outra origem.
<!-- oma-docs:ignore-end -->

Logo depois que um release é criado, o manifesto pode indicar uma versão cujos assets ainda estão sendo publicados; aguarde alguns minutos e tente novamente. Para instalar de propósito conteúdo ainda não lançado da branch `main`, ative essa opção apenas para essa execução:

```bash
OMA_UPDATE_CHANNEL=main oma update
```

A execução exibe um aviso: o conteúdo da branch main não é um release com tag nem tem o checksum verificado.

## Um vendor não inicia

Execute primeiro a verificação de autenticação do próprio vendor e depois inspecione o perfil resolvido pelo OMA:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Use o comando exato do vendor listado por `oma doctor` para autenticar novamente. Uma substituição de modelo deve usar o formato `owner/model` aceito pelo schema, e o vendor precisa oferecer suporte ao transporte de CLI selecionado. Para `model_preset: free`, verifique a URL do gateway e o modelo resolvidos com `oma doctor --profile`, depois confirme que a variável de ambiente de chave de API configurada contém uma chave. Se você omitir o mapa `free`, os padrões são `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` e o modelo `auto`; nunca coloque a chave de API no YAML.

Se um processo filho terminar sem artefato de resultado, inspecione o diretório da execução e o status do pai. Um filho criado recebe a identidade da execução e as instruções de resultado, grava o claim no caminho injetado e informa seus artefatos; o pai finaliza o recibo gerenciado depois de capturar o código de saída. Filhos somente leitura retornam `OMA_RESULT_JSON: ...`; essa linha é registrada como inspeção e não satisfaz uma verificação executável.

## Os hooks estão instalados, mas não executam

No Codex, inspecione o arquivo gerado e siga o fluxo de confiança único:

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Execute `/hooks` depois da primeira instalação e depois de uma atualização que altere uma string de comando. Os subprocessos Codex criados pelo OMA passam a flag de bypass para sua própria invocação gerenciada; isso não estabelece confiança em um hook de uma sessão do Codex que você iniciou por conta própria. Consulte [Confiança nos hooks do Codex](/docs/guide/codex-hook-trust).

## O dashboard está vazio ou desconectado

Inicie o dashboard de terminal no projeto que contém os arquivos de sessão:

```bash
oma dashboard terminal
```

Por padrão, ele lê `.agents/state/memories/`. Defina `MEMORIES_DIR` quando o estado estiver em outro local. O dashboard web se vincula ao loopback e imprime uma URL com token:

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Abra a URL exata impressa pelo comando; a API web e o WebSocket exigem o token do dashboard. Se a porta estiver ocupada, use outro `DASHBOARD_PORT`. Se nenhum agente aparecer, verifique se o workflow gravou arquivos de sessão, tarefa e progresso no diretório de memória selecionado. O dashboard não procura automaticamente o diretório legado `.serena/memories/`.

## Um agendamento está ausente ou não foi executado

Inspecione o manifesto e o estado do agendador:

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` informa `synced`, `stale`, `missing-in-os` e `orphan-in-os`. `schedule sync` restaura jobs ausentes e reescreve registros desatualizados (uma linha `Unknown command: schedule:run` no log da execução significa que o registro é anterior à renomeação do comando; o `oma update` o ressincroniza automaticamente); adicione `--prune` somente quando os jobs órfãos do sistema operacional devem ser removidos. Uma prévia criada com `--dry-run` não registra um job. Para um intervalo recorrente, aceite o arredondamento do OMA com `--accept-rounded` depois de revisar a prévia. Verifique o log da execução em `~/.agents/schedule/runs/<id>/` para uma saída de vendor diferente de zero ou `re-auth required`.

## A avaliação ou a otimização não informa cobertura

A avaliação de skills e a otimização de skills exigem pelo menos cinco fixtures em `.agents/eval/<skill>/`. No modo mock, a proveniência dos rollouts registrados deve corresponder à skill atual e aos hashes das fixtures. Grave novamente no modo live quando a fixture ou a skill mudar; não copie um arquivo antigo `_rollouts` para um novo diretório de skill e o trate como evidência atual.

Para a otimização, mantenha o padrão `--dry-run` enquanto revisa o diff proposto. `--apply` exige um resultado de validação estritamente positivo e uma divisão de testes aprovada pelo runner; uma skill pertencente ao OMA pode ser substituída por uma atualização posterior de `oma update`.

## Um resultado não pode ser finalizado ou retomado

Inspecione os arquivos de execução e do plano:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Execute `oma agent verify RUN_ID --required` antes de finalizar. Um claim concluído com um recibo falho, entradas alteradas, artefatos ausentes, itens não resolvidos ou um contrato de tarefa alterado é rejeitado ou rebaixado. A retomada é automática somente para tarefas com `retry_policy: "safe"`, um prompt reproduzível e tentativas restantes. Um processo ativo ou uma tentativa nativa interrompida sem resultado parcial ou falha clara permanece intacta para evitar trabalho duplicado. Consulte [Resultados de agentes e retomada](/docs/guide/agent-results-and-resume).

Ao pedir ajuda, inclua a saída relevante de `oma doctor --json`, o comando, o ID da sessão ou da execução e a mensagem não resolvida. Não inclua credenciais nem o conteúdo de arquivos que contenham segredos.
