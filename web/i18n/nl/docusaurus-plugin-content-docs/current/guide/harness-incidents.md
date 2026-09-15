---
title: "Incidentregressiegevallen"
sidebar_label: Incidentregressiegevallen
description: Leg een waargenomen agentfout vast, behoud de evidence en evalueer een kandidaat-harness tegen een expliciet regressiecontract.
---

# Incidentregressiegevallen

`oma harness incident` verbindt een waargenomen fout met een regressiegeval en de evaluatie van de kandidaat die daarop volgt. Het legt waarnemingen apart van causale hypothesen vast. Dat een proces faalt, bewijst op zichzelf nog niet dat het model het incident heeft veroorzaakt.

## Kandidaten vinden

```bash
oma harness incident scan            # failed/blocked/partial runs with no captured incident
oma harness incident scan --json
oma harness incident scan --skeleton <run-id> > incidents/run-failure.json
```

De scan leest `.agents/state/agent-runs/`, houdt runs waarvan de status `failed`, `blocked` of `partial` is, en slaat elke run over waarnaar een vastgelegd incident al via `source.runId` verwijst. `--skeleton` print een specificatie voor één run waarin de id, de agent, de bronrun, de waargenomen fout, de exitcode en, wanneer de runner die heeft bewaard, de staart van de uitvoer van de agent zijn ingevuld; `expected_checks` blijft een `TODO`, omdat het juiste gedrag een beslissing is die de scan niet kan nemen. `oma agent spawn` en `oma agent parallel` bewaren de laatste 64 KiB van het logboek van elke run als `.agents/state/agent-runs/<run-id>.output.txt` en verwijzen vanuit het runrecord ernaar, zodat `capture --run` die uitvoer importeert als waarneming wanneer de specificatie er geen bevat en `incident promote` de afgeleide fixture eraan kan toetsen. Vul de specificatie in en leg daarna vast met `--run <run-id>`, zodat de identiteit en de workspacefingerprint van de run behouden blijven.

## Een mislukte run automatisch vastleggen

```bash
oma harness feedback --scan-runs            # capture, promote, report
oma harness feedback --scan-runs --live     # and optimize the affected skills
```

Een mislukte, geblokkeerde of gedeeltelijke run waarvan de taak een contract had, heeft geen handgeschreven specificatie nodig. Het verwachte gedrag zijn de acceptatiecriteria van het contract, bepaald vóór de run; de criteria die door een mislukte verificatiereceipt worden gedekt, vormen de niet-vervulde set, of elk criterium wanneer de run nooit heeft geverifieerd. De opt-agent herschrijft de niet-vervulde criteria tot een judge-rubric (`PASS only if …`), de judge beoordeelt de eigen bewaarde uitvoer van de run aan de hand daarvan, en het incident wordt alleen vastgelegd wanneer die uitvoer faalt: een rubric die de fout doorstaat, heeft de fout niet vastgelegd. De specificatie wordt onder `.agents/results/incidents/_specs/<id>.json` geschreven en vastgelegd met de identiteit van de run, met de rubric als een `output_judge`-acceptatiecontrole. Runs zonder bewaarde uitvoer, prompt of contract worden vermeld als niet vast te leggen, met de reden erbij.

`output_judge` is een beoordeeld contract. De mechanische harness-evaluator meldt het als niet geëvalueerd; het doel ervan is de skill-regressiefixture die `incident promote` ervan afleidt met dezelfde rubric.

## Een incident vastleggen

Sla een JSON-specificatie in het project op:

```json
{
  "schema_version": 1,
  "id": "incomplete-result",
  "summary": "The agent reported success while the result remained incomplete",
  "prompt": "Complete the task and update result.json",
  "agent": "backend",
  "observed": {
    "failure": "result.json still contained complete=false",
    "output": "success",
    "exit_code": 0
  },
  "initial_workspace": "initial",
  "expected_checks": [
    {
      "type": "file_json_equals",
      "path": "result.json",
      "pointer": "/complete",
      "value": true
    }
  ],
  "evidence_files": ["original-output.txt"],
  "dependencies": []
}
```

`initial_workspace`, `evidence_files` en de paden van afhankelijkheidsfixtures zijn relatief aan het specificatiebestand. Het pad van de `checker` van een commandocontrole is projectrelatief. De syntaxis van controles komt overeen met [Evaluatie van de harness](./harness-eval.md). De beginmap moet een meegeleverde taakfixture van vóór de run zijn zonder OMA- of vendor-instructiebestanden; de harness die wordt geëvalueerd, wordt apart geïnjecteerd.

```bash
oma harness incident capture --spec incidents/incomplete-result.json --json
oma harness incident show incomplete-result --json

# Import prompt and observable metadata from an existing local run
oma harness incident capture --spec incidents/run-failure.json --run <run-id> --json
```

`--run` verwijst naar een bestaand `.agents/state/agent-runs/<run-id>.json`. Het behoudt de identiteit van run en sessie, de vendor, de status en de oorspronkelijke workspacefingerprint. Een meegeleverde prompt heeft voorrang op de opgetekende prompt van de run. `source.trace_id` kan een gerapporteerd incident koppelen aan een externe trace zonder die op te halen of te uploaden.

Het vastgelegde manifest staat in `.agents/results/incidents/<id>/incident.json`. Het bevat de beginmomentopname wanneer die is meegeleverd, hashes van bron-evidence en checkerbestanden, acceptatiecontroles, beperkingen en een manifesthash. Bestaande ID’s kunnen niet worden overschreven. Gevoelige observatietekst wordt gemaskeerd; maskering wordt gerapporteerd als een limiet op exacte replay. Het verzamelen van momentopnames wijst niet-ondersteunde bestanden af en kent grenzen voor bestanden, aantallen en totale omvang. Evidenceverwijzingen behouden hashes en paden, geen kopieën van elk verwezen bronbestand.

Het optionele object `cause` bevat `category`, `hypothesis`, `confidence` en `evidence`. De categorieën zijn `model`, `tool`, `config`, `context`, `application`, `evaluator` en `unknown`. Als je het weglaat, blijft de oorzaak `unknown`.

## Promoveren naar een skillfixture

```bash
oma harness incident promote <id> [--skill <id>] [--draft] [--force] --json
```

Een vastgelegd incident wordt een regressiefixture voor de skill waar de falende agent gebruik van maakte, zodat `oma skill optimize` de skill aan de hand ervan kan repareren. De skill wordt gekozen door de incidentprompt langs de geïnstalleerde skillcatalogus te routen met dezelfde probe op beschrijvingsniveau die `oma skill eval --routing` gebruikt (één modelaanroep); wanneer de routing niets kiest, wordt het eerste item van `skills:` in de agentdefinitie onder `.agents/agents/<agent>.md` gebruikt, anders de geïnstalleerde skill met de naam `oma-<agent>`. `--skill` heeft voorrang, en de promotie registreert welke van de drie heeft beslist (`attribution`). De fixture wordt in `.agents/eval/<skill>/incident-<id>.yaml` geschreven met `group: incident-<id>`, zodat hij nooit over de train-/validatie-/testsplitsing heen ligt, en de promotie wordt naast het incident vastgelegd als `promotion.json`. Een incident wordt één keer gepromoot.

De checker komt uit de acceptatiecontroles. Wanneer elke controle `output_contains` is, is de fixture een deterministische `assert`. Anders kunnen de controles niet draaien in een skill-evaluatie (er zijn geen bestanden of commando’s), zodat `--draft` de opt-agent om een judge-rubric vraagt die begint met `PASS only if` en de waargenomen fout noemt. In beide gevallen wordt de fixture alleen toegelaten wanneer de opgenomen mislukte uitvoer erin faalt: een assert waaraan de waargenomen uitvoer al voldoet, of een opgestelde rubric die de judge op die uitvoer doorlaat, wordt geweigerd omdat het geen regressiegeval is. Een incident zonder waargenomen uitvoer kan niet worden gevalideerd en heeft `--force` nodig, wat als beperking wordt vastgelegd.

## De lus sluiten

```bash
oma harness feedback                 # promote every unpromoted incident, report what changed
oma harness feedback --live          # also run one optimization epoch per affected skill (dry-run)
oma harness feedback --apply --json  # write edits that pass every gate
```

`feedback` is de feedbacklus voor deployment in één commando: met `--scan-runs` wordt eerst elke niet-vastgelegde mislukte run met een contract vastgelegd (zie hierboven), daarna wordt elk vastgelegd incident zonder fixture gepromoot (met opgestelde rubrics wanneer nodig), worden de getroffen skills gegroepeerd en wordt elk ervan met `--live` één keer geoptimaliseerd tegen zijn uitgebreide suite onder de normale gates (acceptatie met held-in/held-out, bevestigde negative transfer, door de runner beheerde final test). Het rapport onder `.agents/results/feedback/feedback-<ts>.json` noemt de promoties, de overgeslagen incidenten met redenen en de uitkomst van elke skill met de diff, zodat de keten van een waargenomen fout tot een kandidaat-edit één controleerbaar record is. Voer het uit nadat mislukte agentruns zijn vastgelegd, vanuit een scheduler of een post-run-hook; `oma schedule create <agent> "Run \`oma harness feedback --scan-runs --apply --json\` and summarize the report" --cron "0 3 * * *"` is de nachtelijke vorm, en de momentopname van de staat van de volgende sessie meldt alles wat het heeft toegepast.

Wat een menselijke beslissing blijft: een run zonder taakcontract heeft geen vastgelegd verwacht gedrag, dus wordt ze door `incident scan` vermeld en alleen via een specificatie vastgelegd; `--skeleton` stelt er een op.

## Exporteren en evalueren

```bash
oma harness incident export incomplete-result --json
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --record-file incidents/comparison.json --yes --json
```

Het exporteren materialiseert de opgeslagen beginmomentopname en een verkennende suite met één geval. De manifesthash en de identiteit van bronrun en trace gaan met de taak mee naar de evaluatie en de vastlegging. Wijzigingen aan geëxporteerde bestanden, de prompt, de agent, de controles of de vastgezette bronnen van de checker maken hergebruik ongeldig. Maak een nieuw incident-ID om het acceptatiecontract te wijzigen.

`reproduce` start standaard een nieuwe livevergelijking tussen baseline en kandidaat en legt die vast. De normale bevestiging van de livekosten is van toepassing, tenzij `--yes` wordt meegegeven. Dit commando gebruikt de geconfigureerde agentvendor van de harness-taak, inclusief Codex; het legt het beschermde compilerprofiel van de skilloptimizer niet op aan de taakuitvoering.

Als er geen begintoestand is vastgelegd, werken `capture` en `show` nog, maar stoppen de uitvoerbare export en de reproductie van de uitvoering met een fout over ontbrekende evidence. De huidige werkboom kan de oorspronkelijke toestand van een historische run niet vaststellen. Zelfs een apart aangeleverde beginmomentopname bewijst geen equivalentie met die historische run; het rapport vermeldt deze beperking.

## De evidencebewerking kiezen

```bash
oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action inspect --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rescore --record-file incidents/comparison.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action fixture-replay --record-file incidents/comparison.json \
  --transcript incidents/tool-responses.json --json

oma harness incident reproduce incomplete-result --candidate candidates/fix \
  --action rerun --record-file incidents/comparison.json --record --yes --json
```

| Bewerking | Wat er gebeurt |
|---|---|
| `inspect` | Leest en aggregateert opgeslagen oordelen. Er draaien geen controles of agenten. |
| `rescore` | Past de huidige controles op uitvoer en bestanden toe op opgeslagen ruwe evidence. Oude velden voor geslaagd/mislukt worden genegeerd. |
| `fixture-replay` | Speelt aangeleverde data over toolreacties en bestandswijzigingen af tegen de vastgelegde begintoestand. Er draait geen model- of toolproces. |
| `rerun` | Start echte agentaanroepen voor baseline en kandidaat vanuit de vastgelegde begintoestand. Dit brengt normaal modelgebruik met zich mee. |

Gebruik voor een herzien acceptatiecontract een aparte harness-suite en voer `oma harness eval --action rescore` uit met dezelfde suite-/taak-/incident-identiteit en prompt. Een geëxporteerde incident-suite is zelf onveranderlijk. Zie [details over vastleggen en replay](./harness-eval.md) voor de vereisten voor ruwe evidence en het schema van de tooltranscript.

Declareer externe afhankelijkheden als `{ "name": "service", "repeatability": "fixture|live|unavailable", "reason": "...", "fixture": "response.json" }`. Een fixture-afhankelijkheid wijst naar een bestand dat het volledige harness-transcriptschema gebruikt, met het incident-ID als `taskId`. Offline incidentreplay verwerpt live- of niet-beschikbare afhankelijkheden, ontbrekende fixturebestanden, gewijzigde fixturehashes, ontbrekende genoemde reacties en verzoeken, reacties of bestandswijzigingen die afwijken van het vastgezette transcript. Het kan nog steeds niet bevestigen dat de auteur elke externe afhankelijkheid heeft gedeclareerd. Een live-herrun kan ook niet garanderen dat een externe dienst zich gedraagt zoals in het verleden.

Bij vastleggen, exporteren en evalueren worden lokale `harness.incident.*`-gebeurtenissen uitgezonden die het incident, de kandidaat-/baselinehashes, de uitvoeringsmodus en de gecorrigeerde of teruggevallen taak-ID’s met elkaar verbinden. Een incident met één geval is regressiebewijs, geen vervanging van validatie- en finaltestsuites. Huidige harnessprofielen melden `promotionReady: false`; deze bewerkingen vestigen geen beschermde final-testisolatie en promoveren een kandidaat niet automatisch.
