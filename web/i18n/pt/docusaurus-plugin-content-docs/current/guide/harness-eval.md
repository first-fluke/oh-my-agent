---
title: "Avaliação do harness"
sidebar_label: Avaliação do harness
description: Avalie uma sobreposição completa de harness do OMA com tarefas emparelhadas e isoladas de repositório e verificações determinísticas de artefatos.
---

# Avaliação do harness

`oma harness eval` mede se um harness candidato do OMA melhora um agente-alvo fixo sem mudar o modelo desse agente. O comando adapta o padrão de avaliação em tempo de teste de [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307): mantenha o modelo-alvo fixo, altere o harness e compare os resultados nas mesmas tarefas.

Este comando avalia uma unidade maior que `oma skill eval`:

| Comando | Tratamento | Alvo da pontuação |
|:--------|:----------|:-------------|
| `oma skill eval` | Um corpo de `SKILL.md` | Saída do agente |
| `oma harness eval` | Uma sobreposição delimitada de `.agents/` | Arquivos e saída produzidos em um workspace de repositório |

Use a avaliação de skill para responder “esta skill ajuda?”. Use a avaliação do harness para responder “esta combinação de skills, workflows, regras e instruções de agente faz o agente fixo concluir tarefas do repositório com mais confiabilidade?”.

## Modelo de avaliação

Uma execução live avalia cada tarefa como um experimento emparelhado:

1. OMA captura a fixture inicial da tarefa. Um instantâneo completo inicializa os dois braços com os mesmos arquivos, mesmo que a fixture de origem mude durante a execução.
2. OMA copia as definições atuais de `agents`, `config`, `rules`, `skills` e `workflows` para esse workspace e as projeta no formato do vendor selecionado.
3. OMA repete a configuração em um segundo workspace novo e aplica a sobreposição candidata nele.
4. O mesmo agente principal, rota de vendor, prompt, permissões de escrita e timeout são usados nos dois braços.
5. Verificações determinísticas inspecionam o workspace resultante e a saída opcional do agente. As verificações de comando confiáveis são executadas depois, em uma cópia nova dos artefatos da tarefa.

O projeto real nunca é usado como diretório de trabalho do braço. O OMA captura a saída bruta e os artefatos finais da tarefa antes das verificações e da limpeza do workspace temporário. O sandbox de processo próprio do vendor selecionado continua sendo a autoridade para acessos fora do diretório de trabalho.

## Estrutura do candidato

O caminho do candidato é um diretório que contém uma árvore `.agents/` parcial:

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

Somente arquivos abaixo de `.agents/agents`, `.agents/rules`, `.agents/skills` e `.agents/workflows` são aceitos. Hooks, fixtures do avaliador, estado, resultados, arquivos de configuração, symlinks e variantes de agentes do vendor são rejeitados. Campos protegidos do frontmatter do agente, como `model`, `tools`, `effort` e limites de execução, devem corresponder ao baseline. Um braço também falha se o agente em execução alterar definições protegidas de `.agents/` antes da pontuação.

## Formato da suíte

Uma suíte é um arquivo YAML e um diretório de fixture por tarefa:

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

A versão 2 exige tarefas `validation` e `final-test`. Cada tarefa deve declarar sua partição. A validação é o padrão; use `--partition final-test` para uma execução final separada depois da seleção do candidato. As duas partições não podem compartilhar nem aninhar diretórios de fixture. Mantenha os arquivos de registro fora dos diretórios de fixture, das sobreposições candidatas e das entradas do avaliador; esses locais são rejeitados para impedir que execuções posteriores vejam as verificações finais. As suítes da versão 1 ainda são executadas como `exploratory`; elas não podem ser selecionadas como final-test.

Os IDs das tarefas devem ser únicos. Os caminhos de fixtures e verificações devem permanecer dentro do projeto e do workspace da tarefa. Suítes e fixtures também devem ficar fora das definições de baseline copiadas para cada braço. Fixtures não podem conter symlinks nem superfícies de controle do harness do agente, como `.agents`, `.codex`, `.claude`, diretórios de skills de vendors ou arquivos de instruções do agente na raiz. Isso impede que os dados da tarefa ocultem o harness controlado de qualquer braço.

Diretórios de dependências gerados, como `node_modules` e `.venv`, não são copiados do harness de baseline. Faça commit da fonte de helpers determinísticos e dos manifestos de dependência na skill; disponibilize as dependências de runtime na fixture da tarefa quando uma verificação exigir isso.

### Tipos de verificador

| Tipo | Campos | Condição de aprovação |
|:-----|:-------|:---------------|
| `file_exists` | `path` | O caminho existe depois que o braço termina. |
| `file_not_exists` | `path` | O caminho não existe. |
| `file_contains` | `path`, `value` | O arquivo existe e contém o valor. |
| `file_not_contains` | `path`, `value` | O arquivo existe e não contém o valor. |
| `output_contains` | `value` | A saída capturada do agente contém o valor. |
| `output_not_contains` | `value` | A saída capturada do agente não contém o valor. |
| `output_judge` | `rubric` | Contrato graduado presente em incidentes; o avaliador mecânico o reporta como não avaliado (consulte [Casos de regressão de incidentes](./harness-incidents.md)). |
| `file_json_equals` | `path`, `value`, `pointer` opcional | O JSON analisado do arquivo é igual a `value`, opcionalmente em um JSON Pointer. |
| `output_json_equals` | `value`, `pointer` opcional | A saída capturada é um JSON válido e é igual a `value`, opcionalmente em um JSON Pointer. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | O subprocesso confiável termina dentro do timeout e retorna o código de saída especificado. |

As asserções JSON comparam valores analisados, inclusive os tipos; um texto que apenas declara sucesso não satisfaz uma asserção de estado JSON. `pointer` usa a sintaxe JSON Pointer, como `/result/count`, e o padrão é o valor inteiro.

As verificações de comando são escritas pelo responsável confiável da suíte:

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` é resolvido em relação ao arquivo da suíte. Ele deve ser um arquivo-fonte regular e independente, armazenado fora de todas as fixtures, da sobreposição candidata e das definições de `.agents` do baseline. `argv[0]` deve ser um executável de caminho absoluto fora do projeto; `{checker}` deve ser um argumento completo. O OMA passa os argumentos diretamente, sem interpolação de shell. Os timeouts devem ser inteiros positivos não maiores que 300.000 milissegundos. Os códigos de saída são inteiros de 0 a 255.

Antes do dispatch, o OMA captura um instantâneo dos bytes da fonte do verificador e calcula o hash das definições do avaliador e do executável. Depois do dispatch, ele copia os artefatos da tarefa para um workspace temporário separado, grava o verificador do instantâneo fora desses artefatos e o invoca ali. Cada comando recebe uma cópia nova; um verificador não pode alterar a entrada da verificação seguinte. As projeções geradas do harness são excluídas, e symlinks nos artefatos são rejeitados. Se a fonte do verificador mudar durante um braço, esse braço falha; a fonte modificada nunca substitui o instantâneo. O verificador deve usar asserções fixas sobre os artefatos ou o comportamento da aplicação e não deve delegar seu veredicto a testes ou scripts de pacote que o candidato possa editar.

As verificações e os caminhos dos verificadores não são adicionados ao prompt do agente nem à fixture. A entrada da tarefa selecionada é necessariamente visível durante a execução. Isso protege a integridade do avaliador e separa as partições; não impede que um processo do mesmo usuário leia outros arquivos do host.

## Executar e registrar

O modo live envia dois dispatches por tarefa selecionada, imprime uma prévia dos dispatches e exige confirmação:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

Use `--yes` para execução não interativa e `--timeout-minutes` para definir o mesmo limite de tempo de parede em cada braço. A execução live exige um vendor que descubra arquivos do harness relativos ao workspace do projeto. O OMA recusa descoberta baseada em HOME, pois o baseline poderia enxergar conteúdo candidato instalado globalmente.

`--record` grava um registro JSON imutável da versão 2. O local padrão é `_runs/`, ao lado da suíte, com os hashes de baseline e candidato no nome do arquivo. Use um novo `--record-file` para outra execução live; um destino já existente é rejeitado antes do dispatch. Os registros preservam:

- a identidade da suíte, a partição, a proveniência do prompt e das fixtures, os hashes de baseline e candidato e os hashes do avaliador, do verificador e do executável;
- a saída original e o respectivo hash, incluindo o stdout de diagnóstico disponível de dispatches com falha;
- os manifestos de artefatos inicial e final, com os bytes dos arquivos, os hashes por arquivo, os modos de arquivo e diretório e um digest do manifesto;
- as referências aos verificadores, os resultados dos braços, a identidade do incidente quando fornecida e o hash do registro de origem em uma repetição.

Os instantâneos de tarefa são limitados a 5 MiB por arquivo, 32 MiB no total e 2.000 entradas. Symlinks, arquivos especiais, caminhos que contêm segredos, arquivos ilegíveis e dados acima do limite de tamanho são registrados como omissões. Os controles de harness copiados são excluídos dos artefatos finais da tarefa. Instantâneos incompletos continuam sendo limitações explícitas de evidência; eles não podem sustentar uma repetição fixada nem satisfazer a repontuação de arquivos. A saída bruta ainda pode sustentar verificações somente de saída quando o dispatch original teve êxito.

Os registros têm seu próprio hash de integridade. Um hash de registro ou de artefato alterado é rejeitado. Esses hashes identificam evidências; eles não atestam o confinamento do processo nem tornam um resultado pronto para promoção.

### Condições de execução

Toda avaliação live ou de repetição resolve um manifesto de execução antes do primeiro dispatch e o armazena no registro como `manifest`. Ele nomeia as condições que um veredicto descreve, para que uma pontuação armazenada nunca seja confundida com evidência sobre outro modelo, outra CLI ou outro build do OMA:

| Campo | Significado |
|---|---|
| `vendor`, `dispatchMode`, `runtimeVendor`, `command` | Rota de dispatch resolvida e nome do executável da CLI. |
| `model`, `modelSource` | O modelo que o OMA resolveu a partir do plano do agente ou do padrão do vendor. `vendor-session` significa que a própria configuração de sessão do vendor seleciona o modelo e que o OMA não o fixou. |
| `effort`, `thinking` | Configurações de raciocínio tomadas do plano do agente, quando presentes. |
| `cliVersion`, `cliVersionStatus` | Primeira linha de `<command> --version` (`probed`) ou `unavailable` quando a sonda falhou. |
| `omaVersion`, `platform`, `arch`, `node` | Host e build do OMA. |
| `environmentPolicy` | Nomes das variáveis de ambiente que os braços receberam, as entradas forçadas e quantas foram descartadas. Os valores nunca são registrados. |
| `memory`, `confinement` | `memory: disabled` para todo braço; `confinement` declara o que o dispatch restringe e o que não restringe (workspace temporário, rede sem restrições, credenciais herdadas, ferramentas padrão do vendor). |
| `manifestHash` | Identidade das condições acima. |

O manifesto é uma descrição, não uma atestação: ele registra o que o OMA resolveu, e os campos de confinamento dizem explicitamente que o isolamento de rede e de credenciais não é imposto. `promotionReady` continua `false`.

### Política de ambiente

Os dois braços recebem o mesmo ambiente com lista de permissões. As variáveis básicas (`PATH`, `HOME` e as configurações de localidade, de diretório temporário, de proxy e de certificado), toda variável `OMA_*` e os prefixos de credencial e de detecção de runtime do vendor de destino passam; as entradas que o construtor do dispatch adiciona para a invocação são mantidas. Todo o resto é descartado para que um candidato não alcance, por acidente, um token de deploy nem a chave de outro provedor. `OMA_NO_AGENTMEMORY=1` é forçado para que a memória do vendor não carregue contexto entre os braços de baseline e candidato.

Defina `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2` para repassar variáveis adicionais de que uma tarefa realmente precisa. Os nomes aparecem no manifesto em `environmentPolicy.extra`. Para um vendor sem um conjunto de prefixos conhecido, o manifesto informa `vendorKnown: false` e somente as entradas básicas, `OMA_*` e as repassadas chegam ao processo.

## Reutilizar uma gravação

O comando separa quatro ações:

| Ação | Trabalho realizado | Chamadas de agente/modelo |
|:-------|:---------------|:------------------|
| `inspect` | Agrega os veredictos armazenados dos braços após a validação da proveniência. Nenhuma verificação é executada. | Nenhuma |
| `rescore` | Aplica as verificações atuais de saída e de arquivo à saída bruta original e aos bytes dos artefatos. | Nenhuma |
| `fixture-replay` | Casa uma transcrição fornecida de requisições de ferramentas, reproduz suas respostas de fixture e alterações de arquivo e depois aplica as verificações suportadas. | Nenhuma |
| `rerun` | Executa o agente configurado em workspaces novos inicializados a partir dos instantâneos iniciais registrados. | Duas por tarefa selecionada |

`--action inspect` é o padrão. `--mock` é um alias para a inspeção e não pode ser combinado com outra ação. Nem a inspeção nem a reprodução de fixtures repetem a execução de um agente.

### Inspecionar veredictos armazenados

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

A inspeção exige que os hashes originais da suíte, da partição, do avaliador, do baseline e do candidato correspondam. Ela exibe as pontuações registradas sem invocar verificadores nem reavaliar a saída. Os registros da versão 1 continuam disponíveis para inspeção quando a proveniência exigida corresponde. Registros mais antigos, sem proveniência de partição/avaliador, não passam na validação atual da CLI. Veredictos legados não podem ser reclassificados como nova evidência bruta: colete um novo registro live para repontuação, reprodução de fixtures ou uma repetição fixada.

### Repontuar a evidência original

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

A repontuação usa as verificações atuais e ignora os valores `passed` originais e os veredictos das verificações. A identidade da suíte, o ID e o prompt da tarefa, a identidade do incidente, o baseline, o candidato e a partição selecionada ainda precisam corresponder. As definições dos verificadores podem mudar; o novo resultado descreve como os bytes originais se saem em relação a essas verificações. Alterações nos arquivos de fixture atuais não substituem os artefatos finais registrados.

As verificações de comando são insuficientes para a repontuação offline porque o registro não fixa o runtime e o ambiente externos. As verificações que visam artefatos excluídos ou incompletos também são insuficientes. Um dispatch original com falha deixa saída de diagnóstico, que não pode se tornar uma medição válida por meio da repontuação. Use uma repetição live quando os critérios de aceitação atuais exigirem a execução de comandos.

### Reproduzir fixtures de ferramentas

Um arquivo de transcrição contém um objeto ou um array de objetos com IDs de tarefa únicos. Forneça uma transcrição por tarefa selecionada:

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

As requisições devem corresponder exatamente à sequência de etapas, por nome de ferramenta e valor da requisição. `writes` e `removes` são alterações opcionais de arquivos da tarefa, em caminhos relativos; elas não podem escapar do workspace nem modificar os controles do harness. Os nomes de ferramentas são dados, e nenhum comando da transcrição é executado. `output` é dado de fixture, exigido quando uma verificação de saída precisa dele.

Cada dependência declarada tem um `name`, um `repeatability` (`fixture`, `live` ou `unavailable`) e, opcionalmente, um `reason` e uma referência `fixture`. Uma dependência de fixture exige uma etapa correspondente com esse nome de ferramenta. Dependências live ou unavailable tornam a reprodução insuficiente. O campo opcional `fixture` é descritivo; a reprodução consome as etapas fornecidas em vez de carregar esse caminho. A reprodução da transcrição valida as dependências declaradas e não estabelece que toda dependência histórica foi capturada.

Os dois braços registrados devem ter o mesmo instantâneo inicial completo. O OMA aplica a mesma transcrição a cada braço e executa as verificações atuais de saída e de arquivo. As verificações de comando exigem uma repetição live. Esses resultados mostram que a sequência de fixtures fornecida pode ser reproduzida; eles não podem estabelecer melhoria comportamental do candidato nem reprodutibilidade do modelo.

### Repetir a execução do agente a partir de arquivos iniciais fixados

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

Uma repetição exige identidade de suíte/tarefa correspondente e instantâneos iniciais completos idênticos para os dois braços originais. Ela inicia chamadas reais de agente usando o baseline, o candidato, a rota de vendor/modelo configurada e as verificações atuais. Ela não usa os artefatos finais originais como estado inicial. Uma edição posterior na fixture de origem, portanto, não pode alterar silenciosamente o estado inicial registrado.

As repetições têm a mesma prévia de dispatch, a mesma confirmação e o mesmo comportamento de timeout das execuções live. Elas podem usar um candidato alterado; selecione explicitamente a origem original com `--record-file`. Adicione `--record` para salvar um novo arquivo no mesmo diretório, com nome terminado em `-rerun-<timestamp>.json`, vinculado ao hash do registro de origem. O registro original é preservado.

Arquivos fixados não reproduzem o estado de serviços externos, o comportamento do relógio nem a amostragem do modelo. Uma repetição é evidência comportamental nova sob as condições declaradas, não uma afirmação de que a trajetória original do agente foi reproduzida de forma determinística.

### Condições registradas na reprodução

`inspect`, `rescore` e `fixture-replay` reportam o manifesto armazenado no registro com `conditions: "recorded"` ou `conditions: "unavailable"` para um registro anterior aos manifestos. O OMA também resolve as condições atuais e lista toda diferença de vendor, modo de dispatch, modelo, effort, thinking, versão da CLI, versão do OMA ou host como limitação de reprodução e impedimento de promoção:

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

A versão da CLI só é sondada na reprodução quando o próprio registro traz uma versão sondada; um par não sondado é reportado como não comparável, e não como igual. Os veredictos registrados continuam visíveis sob as condições originais. Eles não são evidência a favor do candidato sob as condições atuais até que uma avaliação live ou de repetição produza um registro cujo manifesto corresponda.

### Uso

Cada braço armazena `usage` quando o vendor o reportou: tokens de entrada e de saída, custo em USD, tempo de parede e o modelo que produziu a maior parte da saída. A avaliação os soma como `usage`, com `status` igual a `actual`, `partial` (alguns braços não reportaram nada) ou `unknown`. Os envelopes de resultado do vendor são desempacotados antes de as verificações serem executadas e antes de a saída ser registrada, de modo que `output_contains` e `output_json_equals` veem a resposta do agente, e não os metadados em JSON que a envolvem; o uso dentro do envelope é o que alimenta este campo.

### Rótulos do relatório

Os relatórios incluem `executionMode`, `evidenceStatus` (`complete`, `insufficient` ou `legacy`), `replayLimitations` e, quando disponível, um `sourceRecordHash`. Os relatórios live e de repetição acrescentam `manifest`, `conditions: "current"` e `traceSession`. A completude da evidência descreve o que a ação atual pode inspecionar ou avaliar. As limitações herdadas do incidente continuam visíveis mesmo quando a captura atual de arquivos está completa. `promotionReady` continua `false` em todos os modos.

## Eventos de trace

Cada avaliação live ou de repetição grava eventos vinculados na sessão local `oma-harness-<suite-id>`:

| Evento | Payload |
|---|---|
| `harness.eval.started` | Ação, hashes de suíte/baseline/candidato/avaliador, partição, hash do manifesto, vendor resolvido, modelo, versão da CLI e quantidade de tarefas. |
| `harness.arm.completed` | Um por braço: tarefa, braço, estado de aprovação, duração, hash da saída, erro de dispatch, código de saída, indicador de timeout e o trace do braço. `parentEventId` aponta para o evento de início. |
| `harness.eval.completed` | Decisão, lift, status da evidência e, quando `--record` foi usado, o caminho e o hash do registro. |

Todos os eventos de uma avaliação compartilham um `causalityKey`. Quando um evento não pode ser gravado, o relatório lista `Trace event <kind> was not recorded` como limitação de reprodução, em vez de omiti-lo silenciosamente.

Cada execução de braço também armazena `diagnostics` e `trace` no registro:

- `diagnostics`: código de saída, sinal, indicador de timeout e os últimos 8 KiB de stderr, com `stderrStatus` (`captured`, `truncated` ou `unavailable`).
- `trace`: o que o harness pôde observar. `output` é `complete`, `partial` (um processo com falha ainda produziu stdout) ou `unavailable`; `artifacts` informa se o instantâneo final está completo; `changedPaths` lista os arquivos que o braço adicionou, modificou ou removeu em relação ao workspace inicial fixado (limitado a 200, com `changedPathsTruncated`); `toolCalls` é sempre `unsupported` porque as CLIs de vendor não expõem ao harness observações por ferramenta.

Um braço com falha, portanto, mantém sua saída parcial, o final do stderr, o status de saída e as alterações de arquivos, de modo que o último erro possa ser rastreado até o que o braço alterou. A observação ausente é registrada como um estado; ela nunca é lida como uma execução limpa.

## Métricas e gate de decisão

Cada tarefa passa somente quando todas as verificações passam. As pontuações são médias ponderadas entre as tarefas emparelhadas:

```text
lift = candidateScore - baselineScore
```

O OMA também informa:

- tarefas corrigidas: o baseline falhou e o candidato passou;
- tarefas regredidas: o baseline passou e o candidato falhou;
- cobertura: são necessárias pelo menos cinco tarefas emparelhadas e pontuáveis.

A decisão de pontuação é `pass` quando o lift é de pelo menos 5 pontos percentuais e não há regressões. Qualquer regressão reprova o candidato. Um lift não negativo abaixo de 5 pontos gera um aviso, e menos de cinco tarefas emparelhadas produz uma decisão `insufficient`. Adicione `--require-coverage` para fazer a cobertura insuficiente sair com código diferente de zero no CI. Uma pontuação não é evidência quando falta um braço, o hash do registro está obsoleto ou uma verificação determinística está incompleta. Erros de dispatch live e de integridade do avaliador forçam uma decisão de reprovação; eles não podem contar como lift bem-sucedido. A repontuação e a reprodução de fixtures omitem dos pares pontuáveis os braços com evidência insuficiente e reportam uma decisão `insufficient`, em vez de tratar a evidência ausente como uma regressão do candidato.

Uma pontuação aprovada não estabelece a elegibilidade para promoção. Os relatórios incluem a partição, o hash do avaliador, `promotionReady: false` e os impedimentos explícitos. Execuções legadas e de validação não têm evidência de teste final. As rotas de dispatch atuais não atestam o confinamento do acesso ao sistema de arquivos, de modo que nem mesmo uma execução final-test pode alegar avaliação final protegida nem autorizar a promoção. Este campo permanece falso até que um provedor de execução consiga estabelecer esse limite.

## Limite atual

As sobreposições candidatas são produzidas externamente; este comando não implementa um builder nem um loop automatizado `harness opt`. Captura de artefatos, repontuação offline, reprodução de fixtures de ferramentas, repetições com arquivos fixados, seleção de partição, avaliadores capturados em instantâneo, manifestos de execução, uma lista de permissões de ambiente e eventos de trace vinculados estão disponíveis, mas não estão estabelecidos o sigilo em nível de sistema operacional para dados held-out, o confinamento de rede ou de credenciais, tentativas estocásticas repetidas, a contabilização de tokens e a fixação forçada de modelos para chamadas aninhadas de subagentes. A lista de permissões de ambiente limita quais variáveis um processo de vendor herda; ela não impede que uma CLI de vendor leia seu próprio armazenamento de credenciais nem que acesse a rede. Até existir fixação de chamadas aninhadas, suítes destinadas a medir um único modelo fixo devem evitar workflows candidatos que criem outros papéis de agente configurados.
