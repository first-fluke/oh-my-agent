---
title: "Avaliação da utilidade de skills"
sidebar_label: Avaliação de skills
description: Como escrever fixtures de tarefas de avaliação para oma skill eval, a convenção do diretório .agents/eval/, os tipos de verificador e os modos de execução mock/live.
---

# Avaliação da utilidade de skills

`oma skill eval` mede se carregar uma skill realmente melhora os resultados das tarefas do agente. Ele responde a uma pergunta diferente de `oma skill audit` (que pergunta “duas skills são redundantes?”): pergunta “esta skill ajuda?”.

O design segue duas descobertas de pesquisa: o WikiSkill (arXiv:2608.27454) separa experiência bruta, conhecimento persistente e skills executáveis, mantendo gates reservados para a evolução; o SkillLens (arXiv:2605.23899) mostra que a utilidade de uma skill é independente da distinção da descrição: uma skill distinta ainda pode ser inútil, e uma skill sobreposta ainda pode ajudar.

---

## Como funciona

Para cada fixture de tarefa, o comando executa dois braços:

1. **Braço de baseline** — o prompt da tarefa é enviado a um agente sem a skill.
2. **Braço de tratamento** — `SKILL.md` é colocado no início do prompt e a mesma tarefa é enviada.

Cada braço recebe uma pontuação (0 = falha, 1 = aprovação) pelo verificador da tarefa. A métrica principal é:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Uma skill passa quando `utilityLift ≥ 5%`. Abaixo desse limiar, ela recebe aviso (lift marginal) ou falha (sem lift). São necessárias pelo menos 5 tarefas pontuáveis para obter um veredicto.

---

## Convenção `.agents/eval/<skill>/`

Coloque as fixtures de tarefas em `.agents/eval/<skill>/`. Esse caminho fica dentro de `.agents/`, mas fora do próprio diretório da skill, portanto sobrevive a `oma update` sem substituir avaliações escritas pelo usuário.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

Arquivos que começam com `_` são ignorados ao carregar fixtures de tarefas. O subdiretório `_rollouts/` guarda saídas registradas de execuções anteriores com `--live --record`.

---

## Esquema de uma fixture de tarefa

Cada fixture é um arquivo YAML com os campos a seguir:

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| Campo | Obrigatório | Descrição |
|:------|:---------|:-----------|
| `id` | Sim | Identificador único desta tarefa (usado nos nomes de arquivo de rollouts e relatórios) |
| `skill` | Sim | Skill avaliada (corresponde ao nome do diretório pai) |
| `domain` | Sim | Rótulo de domínio usado para agrupamento e para selecionar tarefas vizinhas de transferência negativa |
| `prompt` | Sim | Prompt da tarefa enviado aos dois braços |
| `checker` | Não | Como pontuar a saída do braço. O padrão é `{ type: judge }` quando omitido. |
| `weight` | Sim | Peso relativo para a pontuação média ponderada (use `1`, salvo quando tarefas tiverem importâncias diferentes) |
| `group` | Não | Rótulo de família. `oma skill optimize` mantém as fixtures que compartilham um grupo na mesma partição de treino/validação/teste final, para que uma quase duplicata não vaze entre as divisões. |

### Tipos de verificador

#### judge (padrão)

Um LLM avalia a saída do braço contra uma rubrica e retorna PASS ou FAIL. Esse é o padrão quando `checker` é omitido ou quando `checker.type` não está presente.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

O campo `rubric` é opcional; quando omitido, usa-se a rubrica padrão: "Does the answer correctly and completely satisfy the task prompt?"

Também é possível escrever a rubrica no nível superior por brevidade:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Importante:** no modo `--mock`, tarefas judge exigem um veredicto previamente registrado em `_rollouts/`. Se não houver veredicto registrado para uma tarefa, ela será excluída do relatório com um aviso. Execute `--live --record` para preencher os rollouts primeiro.

O mesmo vale para qualquer tipo de verificador quando faltar completamente um braço: a tarefa é excluída em vez de receber 0. Dados ausentes não são uma resposta falha; pontuá-los faria os dois braços valerem 0 e um lift zero aparecer como `decision: "fail"`. Exclusões que reduzem a contagem pontuada abaixo de `MIN_TASKS` aparecem como `coverage: "insufficient"`.

#### assert (opcional)

Verificação determinística por substring. Use para verificar contratos, formatos ou chamadas de ferramenta quando a saída esperada for exata.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

Passa quando cada string em `expect_contains` está presente na saída do braço.

#### regex (opcional)

Correspondência determinística por regex. Use quando for necessário um padrão em vez de uma string exata.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Padrões com mais de 200 caracteres recebem 0 (barreira contra ReDoS). A saída é truncada para 10.000 caracteres antes da correspondência.

---

## Modos de execução

### --mock (padrão)

Reproduz rollouts registrados de `_rollouts/`. É totalmente determinístico e offline: nenhum LLM é chamado.

- Para verificadores `assert`/`regex`, as pontuações são calculadas a partir das strings de saída registradas.
- Para verificadores `judge`, reproduz o campo `score` registrado por `--live --record`.

Se uma tarefa judge não tiver uma pontuação registrada em `_rollouts/`, ela será excluída do relatório (com um aviso no console). Assim, o modo mock continua estritamente offline.

As gravações também são verificadas quanto à obsolescência antes do uso. Alterações no corpo da skill, nos prompts, nos contratos de tarefa/verificador, nas rubricas efetivas de judge e nas revisões do protocolo do avaliador invalidam as entradas afetadas. Entradas sem proveniência também são descartadas, com um aviso que informa o arquivo e a quantidade. Quando isso deixa menos que `MIN_TASKS` tarefas pontuáveis, a execução informa `coverage: "insufficient"` em vez de um veredicto.

:::note `oma skill optimize --mock`
O otimizador pontua corpos candidatos de SKILL.md. Como uma gravação só é válida para o corpo a partir do qual foi feita, corpos candidatos não têm rollouts correspondentes e aparecem sem cobertura. Use `--live` para pontuar candidatos.
:::

Seguro para CI. Defina `OMA_SKILLEVAL_MOCK=1` para forçar este modo.

```bash
oma skill eval --skill oma-scholar
```

### --live

Cria braços de agentes reais por meio de `oma agent spawn --read-only`. Cada braço de tarefa é executado em seu próprio workspace temporário, de modo que os arquivos produzidos por um braço não afetam outro. Falhas de processo, envelopes de erro de API e falhas do judge excluem toda a comparação emparelhada da pontuação e da gravação; a saída parcial é um dado de diagnóstico.

Antes do dispatch, o comando imprime uma prévia de custo com a quantidade de tarefas, dispatches de braços, dispatches de judge e vendor resolvido. Confirme com `y` ou ignore com `--yes`.

Os outros controles são úteis no CI e em investigações de cobertura:

| Opção | Efeito |
| --- | --- |
| `--task-dir <path>` | Avalia fixtures de um diretório diferente de `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Limita a quantidade de fixtures em uma execução live delimitada. |
| `--trials <n>` | Repete cada braço `n` vezes (1-10). O braço iniciado primeiro alterna entre as tentativas, as pontuações de cada tarefa são calculadas pela média e o relatório passa a incluir a variância dentro da tarefa. As tarefas vizinhas de `--neg-transfer` são executadas uma única vez. |
| `--neg-transfer` | Mede a skill candidata em tarefas do mesmo domínio que pertencem a outras skills; desativado por padrão. |
| `--routing` | Mede a ativação: para cada tarefa, pergunta qual skill instalada seria carregada, com base no `description` de cada skill. O modo live realiza a medição (um dispatch extra por tarefa); o mock reproduz uma gravação de roteamento feita sob o mesmo catálogo. |
| `--require-coverage` | Sai com código diferente de zero quando restarem menos de cinco tarefas emparelhadas pontuáveis ou quando uma verificação de transferência negativa solicitada estiver incompleta. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Medição de transferência negativa

Com `--neg-transfer`, cada tarefa vizinha selecionada é executada duas vezes: um baseline novo, sem o candidato, e depois um tratamento com o corpo candidato exato injetado. As vizinhas são as tarefas de outras skills no mesmo `domain`. Quando nenhuma outra skill compartilha o domínio, usa-se em seu lugar uma amostra delimitada entre domínios (até seis tarefas, distribuídas entre as outras skills) e `negativeTransferCoverage.scope` informa `cross-domain`; a interferência de um corpo injetado não se limita ao próprio domínio, e um domínio único não deve inviabilizar a verificação. Os dois braços usam o mesmo avaliador e workspaces vazios separados. O delta é a pontuação do tratamento menos a do baseline; um valor negativo significa que o candidato prejudicou aquela tarefa vizinha. A prévia live inclui esses dispatches extras de braço e de judge. `--max-tasks` também limita a amostra de vizinhas, com um aviso quando tarefas são omitidas.

Use `--live --neg-transfer --record` para salvar comparações específicas do candidato em `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. A reprodução mock exige correspondência da identidade do candidato, do hash do corpo e do hash completo de tarefa/verificador, além de um ID de comparação compartilhado pelos dois braços. As gravações de avaliação comuns de uma tarefa vizinha não podem substituir esta medição.

Cada entrada de `negativeTransfer` carrega `trials` (as comparações emparelhadas por trás de `delta`). A otimização mede de novo uma tarefa vizinha que regrediu, uma vez, antes de rejeitar um candidato, e adiciona `confirmed` (`true` quando a repetição também regrediu, `false` quando não regrediu); `oma skill eval --neg-transfer` reporta a comparação única. O relatório inclui `negativeTransferCoverage` com `status`, `expected` e `scored`. O status é `not-requested` quando a flag está ausente, `measured` quando toda tarefa vizinha selecionada tem um resultado emparelhado válido e a amostra não está vazia, e `insufficient` para zero vizinhas ou qualquer comparação ausente. Um array `negativeTransfer` vazio, portanto, não estabelece a ausência de regressões. O `ok` do JSON é falso quando a cobertura de transferência negativa solicitada é insuficiente.

#### Isolamento da skill (mantendo o baseline honesto) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` só é significativo se o **braço de baseline executar sem a skill-alvo**. O problema é que um agente enviado automaticamente carrega todas as skills instaladas em seu runtime; um baseline ingênuo ainda carregaria a skill que deveria ser medida *sem* ela, contaminando a comparação (baseline ≈ tratamento, lift ≈ 0).

Para evitar isso, `--live` executa **os dois braços em workspaces temporários separados**. Os perfis protegidos do Claude e do Codex desativam a descoberta automática de skills/instruções e as ferramentas do agente. O tratamento recebe a skill-alvo **somente** por meio do `SKILL.md` injetado. Perfis exploratórios usam um diretório de skills filtrado, sem a skill-alvo, mas isso, por si só, não comprova o isolamento.

Um diretório de trabalho limpo oculta a descoberta de skills locais do projeto, mas o isolamento em runtime também depende do perfil do vendor. O relatório declara o nível verificado por meio de `isolation`:

| Status | Significado |
|---|---|
| `enforced` | Claude protegido com um ID de skill-alvo válido e sem cópia em HOME, ou Codex nativo com supressão de descoberta/ferramentas e verificações de thread em runtime. Uma falha no contrato de runtime aborta o dispatch. |
| `best-effort` | Um runtime sem perfil de texto protegido, um ID de skill-alvo inválido ou uma cópia em HOME no Claude; o isolamento não é verificado. |
| `unavailable` | Vendor baseado em HOME (por exemplo, **antigravity**, que lê `~/.gemini/antigravity-cli/skills`); um cwd limpo não consegue ocultá-lo. Um aviso é impresso e o resultado é marcado com baixa confiança. |
| n/a | Modo mock: não há dispatch live. |

Outros perfis de runtime continuam disponíveis para avaliação exploratória, mas resultados `best-effort` e `unavailable` bloqueiam a promoção da otimização live. O vendor da avaliação segue a configuração de modelo do projeto. O Codex usa o login nativo da CLI e o modelo/provedor configurado por meio de `app-server`; ele não troca silenciosamente para o Claude nem para um cliente com chave de API. O contrato protegido do Codex tem como alvo a CLI 0.154.x em macOS/Linux, com armazenamento nativo de credenciais em arquivo e um `auth.json` existente. Um diretório home de configuração temporário e privado referencia os arquivos originais de configuração/autenticação e exclui o estado de bootstrap compartilhado; as credenciais não são copiadas, e a renovação nativa usa o arquivo de autenticação original. Os armazenamentos de credenciais keyring, auto e ephemeral não são suportados atualmente. Versões e modos de armazenamento não suportados e falhas de contrato se tornam erros de dispatch.

Os judges são executados em diretórios temporários novos, com a memória de otimização desativada. Os judges do Claude e do Codex usam o mesmo transporte de texto protegido dos braços de avaliação. A configuração de vendor do judge é fixa durante a execução.

### --live --record

Executa braços live e grava as saídas capturadas (incluindo veredictos de judge para tarefas com verificador judge) em `_rollouts/<hash>.json`. O nome do arquivo é um hash SHA-256 determinístico do conjunto de IDs de tarefas, não baseado em data nem aleatoriedade.

Use isso para preparar execuções `--mock` na sua máquina, para que repetições permaneçam offline.

Cada entrada carrega proveniência para que uma reprodução posterior possa verificar se ainda se aplica:

| Campo | Registrado em | Comparado com |
|---|---|---|
| `skillBodyHash` | `treatment` somente | o corpo SKILL.md avaliado |
| `promptHash` | os dois braços | o `prompt` atual da fixture |
| `taskHash` | os dois braços | a tarefa completa, o verificador efetivo ou a rubrica padrão do judge e `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | os dois braços (`--trials` > 1) | emparelha o baseline e o tratamento de uma mesma tentativa; ausente quando há uma única tentativa |
| `judgeResponse` | tarefas judge | o texto do veredicto do judge, desempacotado (com tamanho limitado), mantido para que um `score` armazenado possa ser auditado |

As saídas dos braços são registradas como o texto da resposta. Quando uma CLI de vendor retorna um envelope de resultado em JSON, o campo `result` é armazenado e pontuado; os metadados do envelope nunca são avaliados pelos verificadores `assert`/`regex` nem lidos pelo parser do judge.

O braço de baseline não recebe a skill, portanto editar apenas SKILL.md não invalida a respectiva gravação. Alterações no contrato da tarefa ou do avaliador invalidam os dois braços. A gravação live executa os dois braços novamente.

As gravações anteriores à proveniência completa de tarefa/avaliador precisam ser regeneradas com `--live --record` (e `--neg-transfer` para as comparações de tarefas vizinhas); acrescentar novos hashes a pontuações antigas não permite verificá-las. O mesmo contrato participa da identidade da suíte de otimização, portanto o conhecimento anterior com escopo de suíte não é reutilizado sob o contrato atualizado. Mantenha `SKILL_EVAL_PROTOCOL_REVISION` incrementando-o quando o comportamento do pontuador, os prompts e a análise de veredicto do judge ou outro comportamento implícito do avaliador mudar.

:::caution `_rollouts/` é somente local — não faça commit
Uma gravação só é reproduzida para o corpo exato de SKILL.md a partir do qual foi criada. Edite uma skill e suas gravações de tratamento serão descartadas na próxima execução `--mock`; um arquivo gravado em Git ficaria obsoleto na próxima alteração do SKILL.md e emitiria avisos para todas as pessoas que o baixassem. O diretório é ignorado pelo Git; grave localmente.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

Depois de uma execução live bem-sucedida, o relatório inclui as contagens de baseline e tratamento, `utilityLift`, `coverage: "ok"`, o estado de isolamento e uma decisão pass/warn/fail. Uma execução mock posterior reutiliza somente gravações cujos prompts de tarefa e corpo da skill de tratamento ainda correspondam.

---

### Concorrência e timeouts de dispatch

Braços live, braços de tarefas vizinhas, chamadas de judge e sondas de roteamento são executados por meio de um pool limitado de `OMA_SKILL_EVAL_CONCURRENCY` subprocessos (padrão 4, no máximo 16). Os dois braços de uma tentativa sempre são executados juntos, em diretórios vazios separados, com o braço iniciado primeiro alternando entre as tentativas, e os resultados mantêm a ordem das tarefas, de modo que as gravações e as pontuações são as mesmas de uma execução serial. Defina a variável como 1 para serializar.

Os braços live e as chamadas de judge são encerrados após `OMA_SKILL_EVAL_TIMEOUT_MS` (padrão 180000). Um dispatch que excede o tempo limite é tentado novamente uma vez antes de a tarefa ser excluída do relatório, porque uma resposta lenta é uma falha de transporte, não uma resposta; um segundo timeout exclui a tarefa (e, na otimização, faz a cobertura da divisão falhar). Aumente o limite para fixtures que legitimamente precisam de respostas longas.

## Roteamento: a skill é selecionada?

O lift de utilidade mede o que o corpo faz depois de carregado. Os vendors decidem se carregam uma skill com base no `description` do frontmatter dela, portanto um corpo melhor que nunca é selecionado não é uma melhoria. `--routing` envia o prompt de cada tarefa, junto com o nome e a descrição de cada skill instalada, ao mesmo modelo protegido e pede a única skill que ele carregaria (ou `NONE`). Quando a skill escolhida é a alvo, há uma ativação; quando é outra skill, um roteamento incorreto; `NONE` é uma falha de ativação.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

O relatório JSON traz `routing` com `status`, contagens, `activationRate`, `misroutedTo` e `catalogSize`; cada finding traz `routing: target | other | none | unparsed`. Com `--record`, as escolhas são salvas em `_rollouts/<hash>.routing.json`, junto com um hash do catálogo. Um `--mock --routing` posterior as reproduz somente enquanto todas as descrições e tarefas permanecerem inalteradas; caso contrário, `status` é `stale` e nada é contado.

Isso mede a descrição em relação ao catálogo por meio do transporte protegido. Não exercita o mecanismo próprio de descoberta do vendor, que o perfil protegido desativa deliberadamente, e não mede se o procedimento da skill carregada é seguido; isso continua sendo a medição de utilidade.

## Um conjunto mínimo de fixtures funcional

São necessárias cinco fixtures para um veredicto (`MIN_TASKS = 5`). Este é um conjunto mínimo para uma skill imaginária `oma-scholar`:

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

Repita para pelo menos mais três tarefas. Depois, execute:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Ler o relatório

**Saída de texto:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**Saída JSON** (com `--json`):

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` soma o que o vendor reportou para os braços pontuados e, separadamente, para as respectivas chamadas de judge: contagem de dispatches, tokens de entrada e de saída (incluindo leituras e gravações de cache) e custo em USD. `status` é `actual` quando todo dispatch reportou uso, `partial` quando alguns não reportaram e `unknown` quando nenhum reportou (um transporte somente de texto, como a bridge do Codex, não reporta nada). Os rollouts registrados carregam `usage` e `judgeUsage` por entrada, de modo que uma reprodução mock informa o custo da gravação que reutiliza, e não zero.

`repeatability` separa a variação entre tarefas da variação entre repetições. `liftCi95` é um intervalo t emparelhado de 95% sobre os lifts por tarefa (null com menos de duas tarefas pontuadas). Com `--trials` igual a dois ou mais, `withinTaskStdDev` é o desvio-padrão médio por tarefa do lift por tentativa, e `status` é `stable` somente quando o intervalo exclui o zero no mesmo lado do lift; caso contrário, é `unstable` e um `pass` é rebaixado para `warn`. Uma execução de tentativa única reporta `single-trial`: ela pode mostrar lift, mas não pode mostrar que o lift se repete.

`ok` é `true` somente quando `coverage === "ok"`, `decision === "pass"` e qualquer verificação de transferência negativa solicitada tem cobertura suficiente. O campo `isolation` informa se o braço de baseline realmente executou sem a skill-alvo (consulte [Isolamento da skill](#skill-isolation-keeping-the-baseline-honest)); `isolation` é `"n/a"` no modo `--mock`.

---

## Integração CI

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Códigos de saída:
- `0` — aprovação ou aviso
- `1` — falha ou cobertura insuficiente de tarefas/transferência negativa com `--require-coverage`

---

## Escolher o modo live ou mock

Use `--live` com verificadores judge para medir a utilidade real em tarefas abertas. Use `--mock` para reproduzir offline veredictos judge registrados anteriormente ou executar verificações determinísticas de contrato `assert`/`regex`.

O determinismo do mock é preservado gravando o veredicto binário do judge (PASS/FAIL) na entrada do rollout durante `--live --record` e reproduzindo essa pontuação registrada em execuções `--mock` posteriores: não há uma nova chamada ao LLM.

**Saída de dados:** durante `--live`, o dispatch do judge envia a saída do braço candidato ao vendor configurado para avaliação. Um aviso único é impresso no início de cada execução live.

Se uma execução mock informar cobertura insuficiente, inspecione o aviso em busca de entradas `_rollouts` descartadas ou ausentes e execute uma gravação live depois de corrigir a fixture ou a skill. A promoção live exige um perfil protegido de Claude ou Codex em funcionamento, com `isolation: "enforced"`; os demais perfis continuam exploratórios.

---

## Publicar tarefas de avaliação com uma skill

Skills podem incluir um conjunto de tarefas de avaliação colocando fixtures em `.agents/eval/<skill>/`. Esses são arquivos escritos pelo usuário fora do diretório da skill, portanto sobrevivem a `oma update`. Ao criar uma nova skill com `oma-skill-creation`, adicione um conjunto correspondente de fixtures em `eval/` para oferecer às futuras pessoas autoras uma forma de verificar o efeito da skill. Consulte `.agents/skills/oma-skill-creation/SKILL.md` para o fluxo de autoria de skills.
