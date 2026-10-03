---
title: "Evaluatie van skillnut"
sidebar_label: Skill-evaluatie
description: Schrijf evaluatietaakfixtures voor oma skill eval, gebruik de conventie voor de map .agents/eval/ en begrijp de checker-typen en mock/live-uitvoermodi.
---

# Evaluatie van skillnut {#skill-utility-eval}

`oma skill eval` meet of het laden van een skill de uitkomsten van agenttaken werkelijk verbetert. Het beantwoordt een andere vraag dan `oma skill audit` (dat vraagt of twee skills redundant zijn): het vraagt “helpt deze skill?”.

Het ontwerp volgt twee onderzoeksbevindingen: WikiSkill (arXiv:2608.27454) scheidt ruwe ervaring, persistente kennis en uitvoerbare skills en behoudt daarbij gates op niet-gebruikte data voor evolutie; SkillLens (arXiv:2605.23899) laat zien dat skillnut onafhankelijk is van de onderscheidendheid van de beschrijving — een onderscheidende skill kan nog steeds nutteloos zijn en een overlappende skill kan toch helpen.

---

## Hoe het werkt {#how-it-works}

Voor elke taakfixture voert het commando twee armen uit:

1. **Baseline-arm** — de taakprompt wordt naar een agent gestuurd zonder de skill.
2. **Behandelingsarm** — `SKILL.md` wordt vóór de prompt geplaatst en daarna wordt dezelfde taak uitgevoerd.

Elke arm krijgt een score (0 = mislukt, 1 = geslaagd) van de checker van de taak. De primaire metriek is:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Een skill slaagt wanneer `utilityLift ≥ 5%`. Onder die drempel krijgt de skill een waarschuwing (marginale lift) of faalt die (geen lift). Voor een beslissing zijn minstens 5 scorebare taken nodig.

---

## De conventie `.agents/eval/<skill>/` {#the-agentsevalskill-convention}

Plaats taakfixtures onder `.agents/eval/<skill>/`. Dit pad staat binnen `.agents/` maar buiten de skillmap zelf, zodat `oma update` de door de gebruiker gemaakte evaluaties niet overschrijft.

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

Bestanden die met `_` beginnen worden bij het laden van taakfixtures overgeslagen. De submap `_rollouts/` bevat vastgelegde outputs van eerdere runs met `--live --record`.

## Schema van een taakfixture {#task-fixture-schema}

Elke fixture is een YAML-bestand met de volgende velden:

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

| Veld | Vereist | Beschrijving |
|:------|:---------|:-----------|
| `id` | Ja | Unieke identifier voor deze taak (gebruikt in rolloutbestandsnamen en rapporten) |
| `skill` | Ja | Skill die wordt geëvalueerd (komt overeen met de naam van de bovenliggende map) |
| `domain` | Ja | Domeinlabel dat wordt gebruikt voor groepering en voor het selecteren van buurtaken voor negative transfer |
| `prompt` | Ja | De taakprompt die naar beide armen wordt gestuurd |
| `checker` | Nee | Hoe agentuitvoer wordt gescoord. Standaard `{ type: judge }` wanneer dit veld ontbreekt. |
| `weight` | Ja | Relatief gewicht voor de gewogen gemiddelde score (gebruik `1` tenzij taken verschillend belangrijk zijn) |
| `group` | Nee | Familielabel. `oma skill optimize` houdt fixtures die een groep delen in dezelfde train-/validatie-/final-test-partitie, zodat een bijna-duplicaat niet over de splitsing heen kan lekken. |

### Typen checkers {#checker-types}

#### judge (standaard) {#judge-default}

Een LLM beoordeelt de armuitvoer aan de hand van een rubric en retourneert PASS of FAIL. Dit is de standaard wanneer `checker` ontbreekt of wanneer `checker.type` niet is ingesteld.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

Het veld `rubric` is optioneel; zonder dit veld wordt de standaardrubric gebruikt: "Does the answer correctly and completely satisfy the task prompt?"

Je kunt de rubric voor beknoptheid ook op topniveau schrijven:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Belangrijk:** in `--mock`-modus vereisen judge-taken een eerder vastgelegd oordeel in `_rollouts/`. Als voor een taak geen vastgelegd oordeel bestaat, wordt die taak met een waarschuwing uit het rapport weggelaten. Gebruik `--live --record` om de rollouts eerst te vullen.

Hetzelfde geldt voor elk checkertype wanneer een arm volledig ontbreekt: de taak wordt uitgesloten en niet als 0 gescoord. Ontbrekende data is geen mislukt antwoord — beide armen op 0 zetten zou de lift als nul lezen als `decision: "fail"`. Uitsluitingen die het aantal gescoorde taken onder `MIN_TASKS` brengen, worden zichtbaar als `coverage: "insufficient"`.

#### assert (opt-in) {#assert-opt-in}

Deterministische controle op een substring. Gebruik dit voor contract-, formaat- of tool-callverificatie wanneer de verwachte uitvoer exact is.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

De controle slaagt wanneer elke string in `expect_contains` in de armuitvoer aanwezig is.

#### regex (opt-in) {#regex-opt-in}

Deterministische regex-match. Gebruik dit wanneer een patroon nodig is in plaats van een exacte string.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Patronen langer dan 200 tekens krijgen score 0 (ReDoS-stopmaatregel). De uitvoer wordt vóór het matchen afgekapt op 10.000 tekens.

---

## Uitvoermodi {#execution-modes}

### --mock (standaard) {#mock-default}

Speelt vastgelegde rollouts uit `_rollouts/` opnieuw af. Volledig deterministisch en offline — er wordt geen LLM aangeroepen.

- Bij checkers van het type `assert`/`regex` worden scores berekend uit de vastgelegde uitvoerstrings.
- Bij checkers van het type `judge` wordt het veld `score` afgespeeld dat door `--live --record` is vastgelegd.

Als een judge-taak geen vastgelegde score in `_rollouts/` heeft, wordt die uit het rapport weggelaten (met een waarschuwing op de console). Zo blijft mock-modus strikt offline.

Opnames worden ook op veroudering gecontroleerd voordat ze worden gebruikt. Gewijzigde skillbodies, prompts, taak-/checkercontracten, effectieve judge-rubrics en revisies van het evaluatorprotocol maken de betrokken invoeren ongeldig. Ontbrekende provenance wordt ook weggelaten, met een waarschuwing waarin de bestandsnaam en het aantal staan. Als daardoor minder dan `MIN_TASKS` scorebare taken overblijven, meldt de run `coverage: "insufficient"` in plaats van een beslissing.

:::note `oma skill optimize --mock`
De optimizer scoort kandidaat-SKILL.md-bodies. Omdat een opname alleen geldig is voor de body waarvoor die is gemaakt, hebben kandidaat-bodies geen overeenkomende rollouts en worden ze als niet gedekt gemeld. Gebruik `--live` om kandidaten te scoren.
:::

Veilig voor CI. Stel `OMA_SKILLEVAL_MOCK=1` in om deze modus af te dwingen.

```bash
oma skill eval --skill oma-scholar
```

### --live {#live}

Start echte agentarmen via `oma agent spawn --read-only`. Elke taakarm draait in een eigen tijdelijke workspace, zodat bestanden die door de ene arm worden geproduceerd, geen invloed hebben op een andere. Procesfouten, API-foutenveloppen en judge-fouten sluiten de volledige gepaarde vergelijking uit van scoring en vastlegging; gedeeltelijke uitvoer is diagnostische data.

Voor dispatchen print het commando een kostenpreview met het aantal taken, arm-dispatches, judge-dispatches en de opgeloste vendor. Bevestig met `y` of sla de bevestiging over met `--yes`.

De volgende controles zijn ook nuttig in CI en bij onderzoeken naar dekking:

| Optie | Effect |
| --- | --- |
| `--task-dir <path>` | Evalueer fixtures uit een andere map dan `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Beperk het aantal fixtures voor een begrensde live run. |
| `--trials <n>` | Herhaal elke arm `n` keer (1-10). De arm die als eerste start, wisselt per proef af, scores per taak worden gemiddeld en het rapport krijgt variantie binnen taken. Buurtaken van `--neg-transfer` draaien één keer. |
| `--neg-transfer` | Meet de kandidaat-skill op taken uit hetzelfde domein die bij andere skills horen; standaard uitgeschakeld. |
| `--routing` | Meet activering: vraag voor elke taak welke geïnstalleerde skill zou worden geladen, gegeven de `description` van elke skill. Live meet (één extra dispatch per taak); mock speelt een routingopname af die onder dezelfde catalogus is gemaakt. |
| `--require-coverage` | Eindig met een niet-nul exitcode wanneer minder dan vijf scorebare gepaarde taken overblijven of een gevraagde negative-transfercontrole onvolledig is. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Meting van negative transfer {#negative-transfer-measurement}

Met `--neg-transfer` draait elke geselecteerde buurtaak twee keer: eerst een verse baseline zonder de kandidaat, daarna een behandeling waarin precies de kandidaatbody is geïnjecteerd. Buren zijn de taken van andere skills binnen hetzelfde `domain`. Als geen enkele andere skill het domein deelt, wordt in plaats daarvan een begrensde steekproef over domeinen heen gebruikt (maximaal zes taken, verspreid over de andere skills) en meldt `negativeTransferCoverage.scope` `cross-domain`; interferentie door een geïnjecteerde body is niet beperkt tot het eigen domein en een uniek domein mag de controle niet onmogelijk maken. Beide armen gebruiken dezelfde evaluator en aparte lege workspaces. De delta is de behandelingsscore min de baselinescore; een negatieve waarde betekent dat de kandidaat die buurtaak heeft benadeeld. De preview van een live run bevat deze extra arm- en judge-dispatches. `--max-tasks` begrenst ook de buursteekproef, met een waarschuwing wanneer taken worden weggelaten.

Gebruik `--live --neg-transfer --record` om kandidaatspecifieke vergelijkingen op te slaan onder `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. Mock-replay vereist een overeenkomende kandidaatidentiteit, bodyhash, volledige taak-/checkerhash en een gedeelde vergelijkings-ID voor beide armen. De gewone evaluatieopnames van een buurtaak kunnen deze meting niet vervangen.

Elke `negativeTransfer`-invoer bevat `trials` (de gepaarde vergelijkingen achter `delta`). Optimalisatie meet een teruggevallen buurtaak één keer opnieuw voordat een kandidaat wordt afgewezen en voegt `confirmed` toe (`true` wanneer de herhaling ook terugviel, `false` wanneer dat niet zo was); `oma skill eval --neg-transfer` rapporteert de enkele vergelijking. Het rapport bevat `negativeTransferCoverage` met `status`, `expected` en `scored`. `status` is `not-requested` wanneer de vlag ontbreekt, `measured` wanneer elke geselecteerde buurtaak een geldig gepaard resultaat heeft en de steekproef niet leeg is, en `insufficient` bij nul buurtaken of een ontbrekende vergelijking. Een lege array `negativeTransfer` stelt dus niet vast dat er geen regressies zijn. De JSON-waarde `ok` is `false` wanneer de gevraagde negative-transferdekking onvoldoende is.

#### Skillisolatie (de baseline eerlijk houden) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` is alleen betekenisvol als de **baseline-arm zonder de doel-skill draait**. Het probleem: een gedispatchte agent laadt automatisch elke skill die in zijn runtime is geïnstalleerd. Een naïeve baseline zou daardoor toch de skill oppikken die juist zonder skill moet worden gemeten — de vergelijking wordt vervuild (baseline ≈ behandeling, lift ≈ 0).

Daarom draait `--live` **beide armen in aparte tijdelijke workspaces**. Beschermde Claude- en Codex-profielen schakelen automatische ontdekking van skills/instructies en agenttools uit. De behandeling ontvangt de doel-skill **alleen** via de geïnjecteerde `SKILL.md`. Exploratieve profielen gebruiken een gefilterde skillmap zonder de doel-skill, maar dat alleen bewijst de isolatie niet.

Een schone werkmap verbergt de ontdekking van projectlokale skills, maar de runtime-isolatie hangt ook af van het vendorprofiel. Het rapport verklaart het geverifieerde niveau via `isolation`:

| Status | Betekenis |
|---|---|
| `enforced` | Beschermde Claude met een geldige doel-ID en zonder HOME-kopie, of native Codex met onderdrukking van discovery en tools en runtime-threadcontroles. Een mislukt runtimecontract breekt de dispatch af. |
| `best-effort` | Een runtime zonder beschermd tekstprofiel, een ongeldige doel-ID of een HOME-kopie van Claude; de isolatie is niet geverifieerd. |
| `unavailable` | HOME-gebaseerde vendor (bijvoorbeeld **antigravity**, die `~/.gemini/antigravity-cli/skills` leest); een schone CWD kan die niet verbergen. Er wordt een waarschuwing geprint en het resultaat krijgt lage betrouwbaarheid. |
| n/a | mock-modus — geen live dispatch. |

Andere runtimeprofielen blijven beschikbaar voor exploratieve evaluatie, maar resultaten met `best-effort` en `unavailable` blokkeren promotie bij live optimalisatie. De eval-vendor volgt de modelconfiguratie van het project. Codex gebruikt zijn native CLI-login en het geconfigureerde model en de geconfigureerde provider via `app-server`; het schakelt niet stilzwijgend over op Claude of een API-key-client. Het beschermde Codex-contract richt zich op CLI 0.154.x op macOS/Linux met native bestandsopslag voor credentials en een bestaande `auth.json`. Een privé tijdelijke config-home verwijst naar de originele config- en auth-bestanden en sluit gedeelde bootstrapstatus uit; credentials worden niet gekopieerd en native verversing gebruikt het originele auth-bestand. Credentialopslag via keyring, auto en ephemeral wordt momenteel niet ondersteund. Niet-ondersteunde versies, opslagmodi en contractfouten worden dispatchfouten.

Judges draaien in verse tijdelijke mappen met uitgeschakeld optimalisatiegeheugen. Claude- en Codex-judges gebruiken hetzelfde beschermde teksttransport als de evaluatiearmen. De vendorconfiguratie van de judge ligt vast voor de duur van de run.

### --live --record {#live-record}

Voert live-armen uit en schrijft de vastgelegde uitvoer (waaronder judge-oordelen voor taken met een judge-checker) naar `_rollouts/<hash>.json`. De bestandsnaam is een deterministische SHA-256-hash van de verzameling taak-ID’s, geen datum of willekeurige waarde.

Gebruik dit om op je eigen machine `--mock`-runs te voeden, zodat herhaalde runs offline blijven.

Elke invoer bevat provenance, zodat een latere replay kan bepalen of die nog van toepassing is:

| Veld | Vastgelegd op | Vergeleken met |
|---|---|---|
| `skillBodyHash` | alleen `treatment` | de SKILL.md-body die wordt geëvalueerd |
| `promptHash` | beide armen | de huidige `prompt` van de fixture |
| `taskHash` | beide armen | volledige taak, effectieve checker/standaard-judge-rubric en `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | beide armen (`--trials` > 1) | koppelt de baseline en behandeling van één herhaling; afwezig bij één enkele proef |
| `judgeResponse` | judge-taken | de uitgepakte oordeeltekst van de judge (begrensd), bewaard zodat een opgeslagen `score` kan worden geauditeerd |

Armuitvoer wordt vastgelegd als antwoordtekst. Wanneer een vendor-CLI een JSON-resultaatenvelop teruggeeft, wordt het veld `result` opgeslagen en gescoord; de administratie van de envelop wordt nooit door `assert`-/`regex`-checkers gematcht of door de judge-parser gelezen.

De baseline-arm houdt de skill achter, dus het bewerken van alleen SKILL.md maakt de opname ervan niet ongeldig. Wijzigingen aan het taak- of evaluatorcontract maken beide armen ongeldig. Live opnemen voert beide armen opnieuw uit.

Opnames van vóór de volledige provenance van taak en evaluator moeten opnieuw worden gegenereerd met `--live --record` (en `--neg-transfer` voor vergelijkingen met buurtaken); het toevoegen van nieuwe hashes aan oude scores kan ze niet verifiëren. Hetzelfde contract maakt deel uit van de identiteit van de optimalisatiesuite, zodat eerdere suitegebonden kennis niet onder het bijgewerkte contract wordt hergebruikt. Onderhoud `SKILL_EVAL_PROTOCOL_REVISION` door de waarde te verhogen wanneer het scorergedrag, de judge-prompts/oordeelparsing of ander impliciet evaluatorgedrag verandert.

:::caution `_rollouts/` is alleen lokaal — commit dit niet
Een opname wordt alleen opnieuw afgespeeld voor exact de SKILL.md-body waarvoor die is gemaakt. Bewerk je een skill, dan worden de behandelingsopnames bij de volgende `--mock`-run weggegooid, zodat een gecommitte opname verouderd zou worden zodra iemand de skill wijzigt en voor iedereen waarschuwingen zou opleveren. De map is gegitignoreerd; neem lokaal op.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

Na een geslaagde live run bevat het rapport baseline- en behandelingsaantallen, `utilityLift`, `coverage: "ok"`, de isolatiestatus en een pass/warn/fail-beslissing. Een latere mock-run gebruikt alleen opnames opnieuw waarvan de taakprompts en de behandelings-SKILL.md-body nog overeenkomen.

---

### Gelijktijdigheid en time-outs van dispatches {#concurrency-and-dispatch-timeouts}

Live-armen, buurarmen, judge-aanroepen en routingprobes draaien via een begrensde pool van `OMA_SKILL_EVAL_CONCURRENCY` subprocessen (standaard 4, maximaal 16). De twee armen van een proef draaien altijd samen in aparte lege mappen, waarbij de arm die als eerste start per proef afwisselt, en de resultaten behouden de taakvolgorde, zodat opnames en scores gelijk zijn aan die van een seriële run. Stel de variabele in op 1 om te serialiseren.

Elke live-arm en judge-aanroep wordt afgebroken na `OMA_SKILL_EVAL_TIMEOUT_MS` (standaard 180000). Een dispatch met een time-out wordt één keer opnieuw geprobeerd voordat de taak uit het rapport wordt uitgesloten, omdat één trage reactie een transportfout is en geen antwoord; een tweede time-out sluit de taak uit (en laat bij optimalisatie de dekking van de splitsing falen). Verhoog de limiet voor fixtures die legitiem lange antwoorden nodig hebben.

## Routing: wordt de skill geselecteerd? {#routing-does-the-skill-get-selected}

Utility lift meet wat de body doet zodra die is geladen. Vendors beslissen op basis van de frontmatter-`description` of een skill wordt geladen, dus een betere body die nooit wordt geselecteerd, is geen verbetering. `--routing` stuurt elke taakprompt, samen met de naam en beschrijving van elke geïnstalleerde skill, naar hetzelfde beschermde model en vraagt om de ene skill die het zou laden (of `NONE`). Dat de doel-skill wordt gekozen, is een activering; een andere skill is een foutieve routering; `NONE` is een misser.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

Het JSON-rapport bevat `routing` met `status`, aantallen, `activationRate`, `misroutedTo` en `catalogSize`; elke bevinding bevat `routing: target | other | none | unparsed`. Met `--record` worden de keuzes opgeslagen in `_rollouts/<hash>.routing.json`, samen met een hash van de catalogus. Een latere `--mock --routing` speelt ze alleen opnieuw af zolang elke beschrijving en taak ongewijzigd is; anders is `status` gelijk aan `stale` en wordt niets meegeteld.

Dit meet de beschrijving ten opzichte van de catalogus via het beschermde transport. Het test niet het eigen discoverymechanisme van de vendor, dat het beschermde profiel bewust uitschakelt, en het meet niet of de procedure van de geladen skill wordt gevolgd; dat blijft de utility-meting.

## Een minimale fixtureset die werkt {#a-minimal-working-fixture-set}

Voor een beslissing zijn vijf fixtures nodig (`MIN_TASKS = 5`). Dit is een minimale set voor een denkbeeldige skill `oma-scholar`:

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

Herhaal dit voor minstens drie andere taken. Voer daarna uit:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Het rapport lezen {#reading-the-report}

**Tekstuitvoer:**

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

**JSON-uitvoer** (via `--json`):

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

`usage` telt op wat de vendor heeft gerapporteerd voor de gescoorde armen en, afzonderlijk, voor hun judge-aanroepen: aantal dispatches, invoer- en uitvoertokens (inclusief cachelezingen en cacheschrijfacties) en kosten in USD. `status` is `actual` wanneer elke dispatch verbruik heeft gerapporteerd, `partial` wanneer sommige dat niet deden en `unknown` wanneer geen enkele dat deed (een transport met alleen tekst, zoals de Codex-bridge, rapporteert niets). Vastgelegde rollouts bevatten per invoer `usage` en `judgeUsage`, zodat een mock-replay de kosten rapporteert van de opname die hij hergebruikt in plaats van nul.

`repeatability` scheidt variatie tussen taken van variatie tussen herhaalde runs. `liftCi95` is een gepaard 95%-t-interval over de lifts per taak (`null` bij minder dan twee gescoorde taken). Met `--trials` van twee of meer is `withinTaskStdDev` de gemiddelde standaarddeviatie per taak van de lift per proef en is `status` alleen `stable` wanneer het interval nul uitsluit aan de kant van de lift; anders is het `unstable` en wordt een `pass` verlaagd naar `warn`. Een run met één proef rapporteert `single-trial`: die kan lift tonen, maar niet aantonen dat de lift zich herhaalt.

`ok` is alleen `true` wanneer `coverage === "ok"`, `decision === "pass"` en een eventueel gevraagde negative-transfercontrole voldoende dekking heeft. Het veld `isolation` meldt of de baseline-arm werkelijk zonder de doel-skill draaide (zie [Skillisolatie](#skill-isolation-keeping-the-baseline-honest)); in `--mock`-modus is `isolation` `"n/a"`.

---

## CI-integratie {#ci-integration}

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Exitcodes:
- `0` — geslaagd of waarschuwing
- `1` — mislukt, of onvoldoende dekking van taken of negative transfer met `--require-coverage`

---

## Live of mock kiezen {#choosing-live-or-mock}

Gebruik `--live` met judge-checkers om werkelijk nut op open taken te meten. Gebruik `--mock` om eerder vastgelegde judge-oordelen offline opnieuw af te spelen of om deterministische contractcontroles van het type `assert`/`regex` uit te voeren.

Mock-determinisme blijft behouden doordat het binaire oordeel van de judge (PASS/FAIL) tijdens `--live --record` in de rolloutinvoer wordt vastgelegd en die score daarna in volgende `--mock`-runs wordt afgespeeld — de LLM wordt niet opnieuw aangeroepen.

**Data-uitstroom:** tijdens `--live` stuurt de judge uitvoer van de kandidaatarm naar de geconfigureerde vendor voor beoordeling. Aan het begin van elke live run wordt één keer een waarschuwing geprint.

Als een mock-run onvoldoende dekking meldt, inspecteer je de waarschuwing op weggegooide of ontbrekende `_rollouts`-invoeren en voer je een live recording-pass uit nadat je de fixture of skill hebt hersteld. Live promotie vereist een werkend beschermd Claude- of Codex-profiel met `isolation: "enforced"`; andere profielen blijven exploratief.

---

## Evaluatietaken met een skill meeleveren {#shipping-eval-tasks-with-a-skill}

Skills kunnen een evaluatietaakset bevatten door fixtures te plaatsen op `.agents/eval/<skill>/`. Dit zijn door de gebruiker geschreven bestanden buiten de skillmap, zodat ze een `oma update` overleven. Voeg bij het maken van een nieuwe skill met `oma-skill-creation` een bijpassende `eval/`-fixtureset toe, zodat toekomstige auteurs het effect van de skill kunnen controleren. Zie `.agents/skills/oma-skill-creation/SKILL.md` voor de workflow voor skill-auteurs.
