---
title: "Otimização de skills"
sidebar_label: Otimização de skills
description: Como usar oma skill optimize para evoluir skills de forma persistente e orientada por evidências, com gates determinísticos de treino, validação e holdout pertencente ao runner.
---

# Otimização de skills

`oma skill optimize` evolui o `SKILL.md` de uma skill para maximizar seu `utilityLift` medido por `oma skill eval`. Ele separa evidências brutas de rollouts, conhecimento persistente delimitado e a skill executável. Um Wiki Maintainer consolida sucessos e falhas observáveis; um Proposer usa esse conhecimento para emitir edições limitadas de adição/remoção/substituição. Os candidatos precisam melhorar a utilidade de treino ou de validação sem regredir em nenhuma das divisões, com medições completas de tarefas e de transferência negativa. `--apply` também exige um teste final pertencente ao runner totalmente medido e sem regressão, além de isolamento live verificado. Em produção não há consulta extra a um wiki durante a inferência: a saída continua sendo um `SKILL.md`.

Base de pesquisa: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

A otimização pela CLI exige atualmente `--live` e gera chamadas de modelo. O caminho padrão/não live e `--mock` não conseguem gerar nem reproduzir propostas, porque não há implementação de um carregador de propostas registradas; eles param antes da avaliação. Use `oma skill eval --mock` para reprodução offline. As APIs injetadas de otimizador/pontuador continuam disponíveis para testes offline. Passar `--live` e `--mock` juntos é um erro.

---

## Dependência obrigatória: fixtures de tarefas de avaliação

`oma skill optimize` não executa sem fixtures de tarefas de avaliação. Ele exige pelo menos **5 fixtures de tarefa** (`MIN_TASKS = 5`) em `.agents/eval/<skill>/`. Se encontrar menos, o comando falha imediatamente:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

Consulte o [guia de avaliação da utilidade de skills](/docs/guide/skill-eval) para a convenção do diretório `.agents/eval/<skill>/`, o schema de fixtures, os tipos de verificador e como preparar rollouts para reprodução mock.

A promoção também exige um conjunto não vazio de tarefas vizinhas do mesmo domínio que pertencem a outras skills. Toda pontuação de validação do candidato e a pontuação final do candidato devem medir as tarefas vizinhas da respectiva divisão avaliada com o corpo exato do candidato. Tarefas vizinhas ausentes ou gravações emparelhadas incompletas não conseguem estabelecer a ausência de transferência negativa. A avaliação offline só pode reproduzir gravações de candidatos correspondentes; use a otimização live para gerar e avaliar novos candidatos.

A reprodução e o conhecimento com escopo de suíte estão vinculados ao contrato completo de tarefa/avaliador, incluindo a rubrica padrão efetiva do judge e a revisão do protocolo do pontuador. Gravações antigas e escopos de conhecimento anteriores exigem evidência nova após esta atualização de proveniência; rotular novamente as pontuações antigas com novos hashes não estabelece uma medição válida.

---

## Como funciona

As fixtures são ordenadas pelo ID da tarefa e divididas deterministicamente em conjuntos de **treino**, **validação reservada** e **teste final pertencente ao runner**. Com pelo menos cinco fixtures, as proporções-alvo são 60/20/20 e cada partição tem pelo menos uma tarefa. Por exemplo, oito fixtures produzem quatro tarefas de treino, uma de validação e três de teste final após o arredondamento. As fixtures que declaram o mesmo `group` são atribuídas juntas, de modo que uma fixture irmã reformulada não possa ficar no treino enquanto a original fica no teste final; com menos de três grupos, a divisão volta a usar os IDs das tarefas e emite um aviso. As tarefas do teste final vêm deste conjunto de fixtures local e ficam ocultas do Maintainer e do Proposer. IDs duplicados de tarefas do teste final e sobreposição com uma divisão de desenvolvimento são rejeitados.

Para cada época (até `--max-epochs`, padrão 8):

1. **Pontuar o melhor `SKILL.md` atual no conjunto TRAIN** — `oma skill eval` retorna prompts, saídas e lift observáveis por tarefa. Toda tarefa de uma divisão interna deve ter os dois braços pontuados; comparações com falha ou ausentes não podem reduzir o denominador.
2. **O Wiki Maintainer consolida as evidências** — até cinco falhas e três sucessos se tornam padrões ligados a evidências. As falhas são escolhidas pelo valor de aprendizado: primeiro as regressões, depois as falhas compartilhadas mais profundas; tarefas que os dois braços já aprovam ficam de fora porque nada dizem sobre a próxima edição. Os sucessos são ordenados por lift. Padrões delimitados e resultados de gates anteriores são recuperados do sistema de memória L1/L2/L3 do OMA.
3. **O Proposer emite K edições candidatas** (até `--edits-per-epoch`, padrão 4). Edições exatas que já aparecem no histórico persistente de rejeições são ignoradas.
4. **Para cada edição candidata:**
   - Aplique a edição a uma cópia do `SKILL.md` em memória.
   - Valide o candidato (os campos de frontmatter `name`/`description` devem sobreviver; o corpo deve ser analisável).
   - Aplique o orçamento textual de taxa de aprendizado: descarte edições cuja alteração líquida de caracteres exceda `--lr` (padrão 600 caracteres).
   - Pontue novamente todas as tarefas da **divisão de validação reservada** (com comparações emparelhadas de baseline/candidato nas tarefas vizinhas) e todas as tarefas da **divisão de treino held-in** (sem comparações com tarefas vizinhas).
5. **Aceite o melhor candidato válido** pela regra held-in/held-out: o candidato não perde nada em nenhuma das divisões (`Δval ≥ 0` e `Δtrain ≥ 0`) e ganha em pelo menos uma delas. Os candidatos são ordenados por `Δval + Δtrain`. Um ganho estrito na validação não é exigido, porque um corpo que já passa em todas as tarefas de validação ainda pode ser reparado a partir de uma falha de treino sem perder desempenho held-out; o teste final decide se esse reparo generaliza. A cobertura de tarefas deve ser completa, a amostra não vazia de transferência negativa deve ser totalmente medida e nenhuma tarefa vizinha pode mostrar uma regressão confirmada igual ou inferior a `NEG_TRANSFER_FAIL = -0.1`. Em execuções live, uma tarefa vizinha que regride na primeira comparação emparelhada é medida de novo uma vez; o delta registrado é a média das duas comparações, e somente uma regressão reproduzida (`confirmed: true`) rejeita o candidato. As reproduções mock não podem medir de novo, portanto uma regressão medida em uma única tentativa permanece válida. Relatórios live devem declarar `isolation: "enforced"`. Os resultados dos gates das propostas são registrados com `deltaLift` (validação), `deltaTrainLift` e os deltas das tarefas vizinhas por trás do veredicto.
6. **Pare antecipadamente** depois de 2 épocas consecutivas sem uma edição aceita (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Execute o teste final pertencente ao runner depois da evolução.** Tanto o corpo original quanto o vencedor da validação devem cobrir todas as tarefas do teste final. O candidato não pode perder lift no teste final (`candidateLift >= baselineLift`; o ganho pelo qual foi aceito já foi demonstrado nas divisões de desenvolvimento, e um ganho estrito em um teste pequeno e congelado tornaria a maioria dos reparos inelegível para promoção) e deve passar em outra verificação completa de transferência negativa específica do candidato. `finalTest.findings` lista o lift por tarefa do corpo original e do candidato, para que um teste reprovado possa ser lido como uma regressão real ou como uma única tarefa ruidosa. Testes finais ausentes, incompletos ou reprovados impedem a promoção. Falhas finais medidas permanecem como registros de auditoria e não se tornam conhecimento de rejeição para otimizações posteriores.

O otimizador trabalha em uma cópia candidata na memória durante o loop.

Candidatos não medidos são registrados como `inconclusive`, com motivos como `insufficient-coverage`, `negative-transfer-unmeasured` ou `unverified-isolation`. Eles são excluídos do histórico de rejeição aprendido e continuam elegíveis para uma nova tentativa depois que as condições de avaliação forem corrigidas. Uma regressão confirmada em tarefa vizinha, uma perda em qualquer divisão (`split-regression`) ou nenhum ganho em nenhuma das divisões (`no-validation-lift`) é uma rejeição. Diagnósticos que indicam avaliação incompleta ou manutenção degradada bloqueiam a promoção.

---

## Uso

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Opções

| Flag | Padrão | Descrição |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | ID da skill a otimizar (nome simples, sem separadores de caminho). |
| `--dry-run` | **sim (padrão)** | Propõe edições e imprime o diff sem alterar `SKILL.md`; as evidências e os eventos de evolução gerados continuam persistindo. |
| `--apply` | — | Grava o candidato validado depois que todos os gates de promoção passam, incluindo evidência completa de teste final e de transferência negativa; faz backup do original antes de uma escrita atômica. Uma skill pertencente ao OMA também exige `--yes`. |
| `--mock` | Padrão não live | A reprodução de propostas pela CLI não está implementada, portanto este caminho para antes da avaliação. Use `oma skill eval --mock` para a reprodução offline da avaliação. |
| `--live` | — | Obrigatório para a otimização atual pela CLI. Gera chamadas reais de modelo; imprime uma prévia de custo e pede confirmação, salvo com `--yes`. |
| `--max-epochs <n>` | `8` | Número máximo de épocas de otimização. |
| `--edits-per-epoch <k>` | `4` | Quantidade de edições candidatas propostas pelo LLM otimizador por época. |
| `--lr <chars>` | `600` | Orçamento textual de taxa de aprendizado: alteração líquida máxima de caracteres por edição aceita. |
| `--yes` | — | Ignora a confirmação da prévia de custo live e reconhece o comportamento de sobrescrita ao aplicar uma skill pertencente ao OMA. |
| `--json` | — | Emite JSON para CI/CD. |
| `--output <format>` | `text` | Formato de saída (`text` ou `json`). |

---

## Exemplo mínimo de ponta a ponta

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Saída ilustrativa para oito fixtures e um candidato que passa em todos os gates de promoção:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

O diff mostra o que o otimizador escreveria. `SKILL.md` permanece inalterado, enquanto as evidências de evolução geradas e os resultados de gates delimitados são persistidos para execuções futuras.

---

## Aplicar uma melhoria validada

Quando estiver satisfeito com o diff proposto, execute novamente com `--apply`:

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### O procedimento como artefato

Os prompts do otimizador e do maintainer são o procedimento de melhoria. Eles vêm como padrões integrados e podem ser substituídos por arquivos em `.agents/evolution/` (pertencentes ao usuário: nunca copiados pelo manifesto de instalação nem removidos por `oma update`, ao contrário de `.agents/eval/`):

| Arquivo | Função | Placeholders obrigatórios |
|---|---|---|
| `optimizer.md` | Propõe edições de SKILL.md a partir da evidência de treino e do conhecimento persistente | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (também `{{knowledge}}`) |
| `maintainer.md` | Consolida a evidência em padrões reutilizáveis | `{{evidence}}`, `{{priorFacts}}` (também `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Superfícies que o loop nunca deve gravar, quais partes do procedimento uma metaotimização pode alterar, `anchors` de ground truth padrão para execuções meta e um orçamento de dispatches | deve se listar em `immutable` |

`budget.max_dispatches_per_run` (padrão `null`, ilimitado) é aplicado em execuções live: toda chamada de modelo subjacente (braço de tarefa, braço de tarefa vizinha, judge, otimizador, maintainer) debita uma unidade, e a chamada que excederia o limite é recusada antes de ser feita. O loop então para com um diagnóstico `budget:exhausted`, o teste final é ignorado, a promoção é bloqueada e o resultado informa `budget: { limit, used }`. O uso é registrado no resumo da execução de qualquer forma, de modo que os procedimentos possam ser comparados em custo e também em ganho.

`oma skill procedure` imprime as fontes ativas e os hashes; `--export` grava os padrões para edição sem sobrescrever arquivos existentes. Um template que omite um placeholder obrigatório é recusado em vez de ser degradado silenciosamente. Toda execução registra `procedure` (um hash por parte mais um hash combinado) e `memory` em seu resultado, em seu resumo da execução e na linhagem de promoção, de modo que a evidência produzida sob um procedimento nunca seja confundida com a de outro.

A resposta do otimizador é lida com tolerância apenas quanto à formatação: os delimitadores de bloco de código e as linhas em branco são ignorados, mas qualquer linha de conteúdo que não seja uma linha `EDIT:` válida (ou um `NO_ACTION` isolado) é um `parse-error`, e o diagnóstico agora inclui a primeira linha problemática, para que a falha possa ser rastreada.

### Ablação de memória e estatísticas de longo prazo

`--memory none` inicia uma execução com o conhecimento vazio (sem padrões recuperados nem histórico de gates), mas ainda a registra. Comparar execuções com `--memory recall` (padrão) e `--memory none` com o mesmo orçamento é o teste para saber se o conhecimento persistente ajuda; afirmar que o loop aprende com a experiência exige essa comparação, e não a mera presença de uma memória.

`oma skill evolution-stats --skill <id>` agrega todas as execuções registradas de uma skill a partir de `.agents/results/skill-evolution/<id>/*.jsonl`: execuções por status, propostas por resultado de gate e a taxa de aceitação, melhorias verificadas (teste final aprovado e elegível para promoção), aplicações e reversões, lift final médio, chamadas de modelo nas execuções com consumo medido e chamadas por melhoria verificada (o custo do processo, e não o de uma execução), além dos mesmos números divididos por modo de memória e por hash de procedimento. O relatório de metaotimização mostra a média de chamadas por execução interna para o procedimento atual e para cada candidato, de modo que um procedimento que vence em ganho gastando mais fique visível como tal.

### Metaotimização: o procedimento como candidato

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` trata o prompt do otimizador (ou do maintainer) como o objeto em teste. Ele executa o loop interno (`oma skill optimize --dry-run`) em cada skill held-out indicada, `--repeats` vezes, sob o procedimento atual; pede a um proposer até `--candidates` pequenas edições do template; executa o loop interno novamente sob cada candidato, com o mesmo orçamento de `--max-epochs` e `--edits-per-epoch`; e compara cada candidato com o procedimento atual par a par, por (skill, repetição), pela soma dos ganhos de lift de treino e de lift de validação que o loop interno obteve.

Um candidato só é promovido quando o intervalo de 95% do bootstrap emparelhado da diferença de ganho fica acima de zero (com semente fixa, 1000 reamostragens), existem pelo menos três pares e nenhuma skill que melhorou sob o procedimento atual perde mais da metade desse ganho sob o candidato. Uma execução interna cuja avaliação foi bloqueada (cobertura insuficiente, isolamento não verificado, orçamento esgotado) é reportada como falha e excluída dos pares, de modo que uma indisponibilidade não possa contar como ganho zero para um dos braços. As skills held-out precisam ter margem de melhoria: uma skill em que o corpo atual já pontua perfeitamente pode não mostrar ganho sob nenhum procedimento. `--anchor` indica skills que nunca são usadas na seleção, mas são executadas uma vez sob o procedimento atual e o vencedor para mostrar a deriva; sem a flag, aplica-se a lista `anchors` da constitution, de modo que um conjunto de ground truth declarado uma única vez é verificado em toda execução meta. Com `--apply`, o template vencedor é gravado em `.agents/evolution/<target>.md`, com um backup com timestamp, um patch em unified diff e um registro em `.agents/results/skill-evolution/_procedure/promotions.jsonl` que traz os hashes do pai e do candidato, o hash da constitution e a evidência (skills, repetições, orçamento, pares, intervalo). Sem `--apply`, nada é gravado.

O que permanece congelado: a partição de teste final de cada skill nunca é lida para seleção (a métrica é o ganho de treino mais validação), o código do avaliador e da otimização é listado como imutável na constitution, a própria constitution não pode ser um alvo e um alvo deve aparecer em `meta_targets`. As execuções internas usam `--memory none` por padrão, de modo que um procedimento seja julgado pelas edições que produz, e não pelo conhecimento recuperado de execuções anteriores. As execuções internas de um mesmo braço se sobrepõem entre skills (`OMA_META_CONCURRENCY`, padrão de até 4), enquanto as repetições de uma skill permanecem seriais, porque a evidência de cada skill é gravada em seu próprio arquivo de artefato. Toda execução interna registra o hash combinado do procedimento sob o qual foi executada, de modo que `oma skill evolution-stats` possa atribuir resultados posteriores ao procedimento que os produziu.

Esta é a forma de nível 5 descrita no levantamento sobre sistemas que se autoaperfeiçoam (promoção held-in/held-out do Self-Harness, avaliação repetida com intervalos de bootstrap do ADAS, avaliadores congelados como no AlphaEvolve): o procedimento é revisado pelo próprio sistema, mas o julgamento externo permanece fora do alcance do loop. O custo escala como skills × repetições × (1 + candidatos) execuções internas; o comando imprime o limite superior e pede confirmação, salvo com `--yes`.

### Linhagem de promoção

Toda gravação de `--apply` acrescenta um registro a `.agents/results/skill-evolution/<skill>/promotions.jsonl` e grava um unified diff revisável em `promotions/<candidate-hash>.patch`, ao lado dele. O registro nomeia os hashes do corpo pai e do corpo candidato, o caminho instalado, o caminho do backup e a evidência por trás da gravação: lifts de validação e de teste final, a decisão de promoção, o hash da suíte de fixtures, a revisão do protocolo do avaliador e os runtimes de origem e de destino. `oma skill promotions --skill <id>` lista o log.

`oma skill rollback --skill <id>` restaura o corpo que a aplicação mais recente substituiu. Ele se recusa a agir quando o arquivo instalado não corresponde mais ao candidato daquela aplicação (uma edição manual posterior seria descartada), quando o backup não corresponde ao pai registrado ou quando aquela aplicação já foi revertida; uma reversão bem-sucedida é acrescentada ao mesmo log, com `reverses` apontando para a aplicação. Para uma skill pertencente ao OMA, o patch é o artefato a levar para o repositório de origem ou para uma sobreposição do usuário, porque `oma update` sobrescreve a cópia instalada; o registro marca `omaOwned: true` para que uma atualização posterior não seja confundida com uma regressão.

`--apply` exige pelo menos uma edição aceita sem perda na validação, `finalTest.passed: true` e `promotion.eligible: true`. Esses gates exigem cobertura interna completa das tarefas, uma amostra de transferência negativa específica do candidato, não vazia e totalmente medida, e isolamento live imposto. A ausência de teste final, medições incompletas ou diagnósticos degradados do compilador impedem a gravação. Um backup do `SKILL.md` original é criado antes da escrita atômica, e o diff é impresso para revisão.

A avaliação live pode satisfazer o gate de isolamento por meio do perfil protegido do Claude ou do perfil nativo do Codex. O Claude mantém as verificações de HOME/alvo. O Codex verifica que a thread efêmera do app-server não tem fontes de instrução nem ambientes de ferramentas antes de enviar o prompt. Os demais perfis de runtime continuam exploratórios.

### Ver o que evoluiu

O loop se anuncia em três lugares, todos lidos dos logs de linhagem append-only, e não de alguma alegação:

- `oma skill promotions --all` imprime uma frase por alteração, em todas as skills e no procedimento: o que foi editado (a âncora e a substituição da edição aceita), os lifts held-in e held-out antes e depois, se o teste final se sustentou e, no caso de uma promoção de procedimento, a diferença de ganho emparelhada, seu intervalo e as skills em que foi medida. `--skill <id>` restringe a uma skill. Os registros de aplicação gravados por esta versão carregam as edições aceitas e os lifts de treino; registros mais antigos recorrem aos hashes.
- `oma doctor` mostra uma nota **Evolution**: edições de skills aplicadas e revertidas, a alteração mais recente por skill, promoções de procedimento e o que está aguardando para entrar no ciclo de feedback (incidentes capturados sem fixture, execuções com falha ainda não capturadas), com o comando que os processaria.
- No início de uma sessão, os hooks de instantâneo de estado injetam um bloco `harness evolved since your last session` listando as promoções registradas desde a última sessão que exibiu um; cada alteração é anunciada uma única vez. O marcador fica em `.agents/state/evolution-notice.json`.

Habilite a [evolução do harness do projeto](./harness-evolution.md) para executar ciclos de feedback com orçamento em um agendamento:

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

Os ciclos automáticos aplicam as alterações aprovadas como sobreposições do projeto, retêm o trabalho incompleto para nova tentativa e compartilham uma única cota de dispatches em todo o ciclo. O agendamento padrão é diário, às 03:00 no horário local. Use `--mode propose` para avaliar sem aplicar e `oma harness evolution disable` para interromper o agendamento. A metaotimização do procedimento continua sendo um comando manual separado.

---

## Modo live

O modo live chama o Maintainer e o Proposer reais e executa novamente os braços de avaliação live a cada época. É caro: cada tarefa pontuada tem chamadas de baseline e tratamento, fixtures judge adicionam chamadas de avaliação e o teste final pontua os corpos original e candidato. A prévia informa um limite superior a partir da divisão real, incluindo o baseline de validação inicial, as chamadas de treino e do compilador, as chamadas de validação dos candidatos, duas pontuações de teste final e as verificações emparelhadas de tarefas vizinhas para cada candidato mais o candidato final. Cada chamada tem timeout de 120 segundos. Os braços protegidos de Claude e Codex desativam ferramentas, descoberta automática de instruções, MCP e memória de otimização.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

A prévia de custo lista o limite superior de chamadas de modelo subjacentes antes de qualquer chamada de LLM.

O Maintainer, o Proposer, os braços de avaliação e os judges compartilham um transporte de texto protegido, em diretórios temporários novos. O Claude usa seu perfil restrito de CLI. O Codex usa o `codex app-server` nativo com o login existente da CLI, o modelo/provedor selecionado e o esforço de raciocínio; ele não usa, em seu lugar, um cliente com chave de API nem recorre ao Claude. O perfil do Codex tem como alvo a CLI 0.154.x em macOS/Linux, com armazenamento nativo de credenciais em arquivo e um `auth.json` existente. Cada chamada prepara um `CODEX_HOME` temporário e privado que referencia os arquivos originais de configuração/autenticação sem copiar o conteúdo das credenciais. A renovação nativa de tokens ainda usa o arquivo de autenticação original. O estado de bootstrap compartilhado é excluído, e o estado temporário é limpo depois. Os armazenamentos de credenciais keyring, auto e ephemeral não são suportados atualmente. O contrato da thread é verificado antes de enviar a entrada ao modelo; versões e modos de armazenamento não suportados e falhas de protocolo encerram o dispatch. Ferramentas, descoberta de instruções na inicialização, acesso a MCP e persistência de sessão são desativados para que os processos do compilador não possam ler fixtures ocultas por meio de ferramentas do agente. Outros vendors de compilador falham explicitamente até terem um transporte verificado.

O otimizador reporta `proposed` para edições válidas e `no-action` somente para uma resposta `NO_ACTION` explícita. Falhas de processo/API se tornam `dispatch-error`; respostas malformadas sem edições válidas se tornam `parse-error`. Esses erros não podem se tornar listas de edições vazias. Se o Maintainer não conseguir fornecer padrões validados, ele reporta `degraded` com um motivo de dispatch ou de parsing; os padrões de fallback são excluídos do conhecimento persistente, e a execução não pode promover um candidato. As falhas de avaliação aparecem em `diagnostics` e nos registros de gate das propostas, e não no histórico de rejeição aprendido.

---

## Saída JSON

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` exige `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true` e `promotion.eligible === true`. `baselineTrainLift` e `finalTrainLift` informam a divisão held-in junto com os lifts de validação. A mesma condição controla `--apply`: uma edição aceita apenas por um reparo de treino só é gravada quando o teste final também passa. A ausência de um teste final ou de um objeto de promoção não pode produzir `ok: true`. As contagens de `_split` mostram a partição local de fixtures usada na execução.

Por exemplo, um candidato não medido pode produzir este trecho de relatório:

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Inspecione `diagnostics`, `promotion.reasons` e qualquer `finalTest.blocker` antes de tentar novamente. `rejectedCount` não aumenta para uma proposta inconclusiva. Uma falha medida no teste final pode aumentar a contagem de rejeições de auditoria da execução, mas continua excluída do conhecimento de rejeição persistente.

---

## Ressalva de SSOT para skills `oma-*`

Skills cujo ID começa com `oma-` pertencem ao oh-my-agent e são **substituídas por `oma update`**. Para essas skills, `--apply` é desaconselhado: use `--dry-run` (o padrão), revise o diff proposto e envie alterações ao registro se a melhoria for relevante. Para skills escritas pelo usuário, `--apply` é seguro.

O comando imprime um aviso quando a skill-alvo pertence ao OMA:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Proteção contra overfitting

O Maintainer e o Proposer recebem as evidências de rollout do TRAIN. A seleção de candidatos usa a divisão de **VALIDAÇÃO** reservada, e a divisão de **TESTE** separada pertence ao runner. A execução do compilador sem ferramentas impede o acesso do workspace a essas fixtures e a esses avaliadores ocultos.

Uma falha no teste final impede a aplicação. O resultado permanece disponível para auditoria, mas nem os resultados de gate do teste final nem as propostas inconclusivas alimentam o conhecimento persistente de otimização. Os caminhos do registrador, do recarregamento do histórico e da recuperação semântica também excluem resultados legados de teste final, de modo que uma execução posterior não possa usar um sucesso ou uma falha anterior do teste final como feedback de treino.

---

## Integração CI

Use a reprodução da avaliação para uma verificação offline no CI de gravações existentes específicas do candidato:

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

A otimização pela CLI em si exige `--live`; ainda não há um adaptador de reprodução de propostas registradas. A orientação anterior que descrevia `oma skill optimize --mock` como um otimizador offline completo estava incorreta. Mova os jobs de reprodução offline para `oma skill eval --mock` ou habilite explicitamente a otimização live e o seu custo de modelo. Em execuções de otimização, inspecione `ok` e `promotion.eligible` do JSON: o código de saída zero também cobre execuções concluídas que não encontraram nenhum candidato promovível.

Códigos de saída da otimização:
- `0` — otimização concluída (com ou sem melhoria)
- `1` — entrada inválida ou falha de execução, incluindo otimização não live pela CLI, flags `--live --mock` conflitantes, quantidade insuficiente de fixtures, vendor de compilador não suportado, falha de dispatch do otimizador ou saída malformada do otimizador

---

## Consulte também

- [Avaliação da utilidade de skills](/docs/guide/skill-eval) — autoria de fixtures de tarefas, tipos de verificador, modos mock/live e o diretório `_rollouts/`.
- [Comandos da CLI](/docs/cli-interfaces/commands) — referência de flags para todos os comandos de gerenciamento de skills.
