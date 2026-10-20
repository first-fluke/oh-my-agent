---
title: "Gids: Probleemoplossing"
sidebar_label: Probleemoplossing
description: Diagnoseer fouten bij installatie, configuratie, vendors, hooks, dashboard, planning, evaluatie en agentresultaten op symptoom of exacte foutmelding, met controles en oplossingen die door de bron worden onderbouwd.
---

# Probleemoplossing {#troubleshooting}

Start vanuit de project- of installatieroot met een machineleesbare diagnose:

```bash
oma doctor --json
```

Het commando hoort JSON op te leveren met bevindingen over de installatie, vendor, configuratie en integraties. Voeg `--profile` toe wanneer het probleem met model- of agentresolutie te maken heeft. Voeg de JSON toe aan een bugmelding; die bevat de geselecteerde paden en controles.

## Vind je symptoom {#find-your-symptom}

| Symptoom | Ga naar |
|---------|-------|
| OMA leest de verkeerde configuratie, of een update heeft je instellingen vervangen | [De CLI of installatie gebruikt de verkeerde bestanden](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` of `oma update` kan een release niet downloaden | [Een installatie of update kan de release niet downloaden](#an-install-or-update-cannot-download-the-release) |
| Een vendor-CLI of model start niet | [Een vendor start niet](#a-vendor-does-not-start) |
| Hooks zijn geïnstalleerd, maar er gebeurt niets | [Hooks zijn geïnstalleerd maar voeren niet uit](#hooks-are-installed-but-do-not-run) |
| Het dashboard is leeg, heeft geen verbinding of start niet | [Het dashboard is leeg of verbindt niet](#the-dashboard-is-empty-or-disconnected) |
| Een geplande job ontbreekt of is mislukt | [Een planning ontbreekt of is niet uitgevoerd](#a-schedule-is-missing-or-did-not-run) |
| Skill-evaluatie of -optimalisatie meldt geen dekking | [Evaluatie- of optimalisatierapporten geen dekking](#evaluation-or-optimization-reports-no-coverage) |
| Een agentrun wil niet verifiëren, afronden of hervatten | [Een resultaat kan niet worden afgerond of hervat](#a-result-cannot-finish-or-resume) |
| De CLI heeft een foutmelding geprint | [Vind je foutmelding](#find-your-error) |

## Vind je foutmelding {#find-your-error}

Elke onderstaande melding wordt door de CLI geprint. Zoek op het begin van de melding.

| Melding | Oorzaak | Oplossing |
|---------|-------|-----|
| `Unknown plan task: <id>` | De taak-ID (uit `--task-id`, of standaard de agent-ID) is geen taak-`id` in `.agents/results/plan-<session>.json` | Geef `--task-id` mee met een taak-ID uit het plan |
| `Plan is immutable after dispatch; ...` | Het sessieplan is gewijzigd na de eerste dispatch | Zet het plan terug, of sla het gewijzigde plan op onder een nieuwe sessie-ID (en een nieuwe `lineage_id` als je die instelt) |
| `Task acceptance contract changed before dispatch` of `Plan changed before dispatch` | Het plan werd bewerkt terwijl een run startte | Probeer het opnieuw zodra het plan stabiel is |
| `Attempt limit reached for workflow lineage and logical goal` | De `max_attempts` van het plan (standaard 3, inclusief de eerste poging) is opgebruikt | Bekijk de mislukte pogingen voordat je een nieuwe plant |
| `Cannot verify a finished run; start a new run` | `oma agent verify` werd uitgevoerd nadat de run was afgerond | Start een nieuwe run met `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` kreeg geen verificatiemodus, of meer dan één | Gebruik precies één van `--required`, `--affected PATH...` of `-- <argv>` |
| `No complete test selection for affected paths: ...` | De graph heeft geen volledige testselectie voor die paden | Gebruik `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` werd aangeroepen voor een run die door `oma agent spawn` of `parallel` is gestart | Schrijf de claim op het geïnjecteerde pad; de parent finaliseert de run |
| `Resume requires a session plan with task contracts` | De sessie heeft geen planbestand | Hervatten werkt alleen voor sessies met een plan; spawn de taak in plaats daarvan opnieuw |
| `A resume coordinator already owns this session` | Er draait al een andere `oma agent resume` voor de sessie, of de lease komt van een andere host | Wacht tot de andere hervatting klaar is; een lease die een beëindigd proces op dezelfde host achterlaat, wordt automatisch teruggenomen |
| `No graph-backed context found for <agent>` | Er bestaat geen graph-context voor die agent | Corrigeer de taakdefinitie, of ga verder met het gedocumenteerde native zoekpad van het project |
| `Dashboard failed: port 9847 is already in use. ...` | Een ander proces bezet de dashboardpoort | `DASHBOARD_PORT=8080 oma dashboard web`, of stop het andere proces |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` is geen geheel getal van 1 tot en met 65535 | Stel een geldige poort in, of verwijder de variabele om 9847 te gebruiken |
| `Removed option <old>. Use <new>.` | Het commando gebruikte een flagspelling die is verwijderd | Gebruik de vlag die in de melding wordt genoemd |
| `Unknown command: ... Use oma --help.` | Het commandopad is verwijderd of hernoemd | Voer `oma --help` of `oma describe` uit voor de huidige paden |
| `oma agent spawn` sluit af met code 3 | De vendor sloot af met 0, maar de run eindigde niet als `completed` | Lees `unresolved` in het runrecord; zie [Agentresultaten en hervatten](./agent-results-and-resume.md) |

## De CLI of installatie gebruikt de verkeerde bestanden {#the-cli-or-install-is-using-the-wrong-files}

Controleer de context expliciet:

```bash
oma doctor --json
oma doctor --profile
```

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| Een instelling wordt genegeerd, of een globale standaard wint | Commando’s lezen globale standaarden uit `$OMA_HOME/.agents/` (standaard `~/.oma/.agents/`), daarna de dichtstbijzijnde gedeelde projectconfiguratie en één lokale overlay. Verschillende bovenliggende projectroots worden niet samengevoegd | Controleer welke configuratiepaden `oma doctor --json` heeft geselecteerd en bewerk het bestand dat daadwerkelijk wordt gelezen |
| OMA stopt tijdens het laden van de configuratie | Er bestaan zowel een lokaal CUE- als een lokaal YAML-bestand, of een lokaal bestand is ongeldig. OMA stopt in plaats van de override stilzwijgend te negeren | Verwijder één van beide lokale bestanden, of herstel het ongeldige bestand |
| De gebruikersconfiguratie is na een update vervangen | De update draaide met `--force`. Gewone updates behouden de configuratie van de gebruiker; force-modus kan die vervangen | Update zonder `--force` en controleer daarna de configuratie en gegenereerde paden |
| Instellingen in `oma-config.yaml` worden genegeerd, en `language` of `timezone` tonen templatewaarden | Een oudere `oma update` kopieerde de meegeleverde `oma-config.cue` naast je YAML. CUE gaat voor YAML, dus de templatewaarden wonnen | `oma update` verwijdert die kopie zolang het een ongewijzigde template is en bewaart hem onder `.agents/backup/stray-shared-config/`. Heb je hem bewerkt, houd dan één gedeeld configbestand en verwijder het andere |
| `oma doctor` waarschuwt voor `timezone: Asia/Seoul` | Oudere templates leverden `Asia/Seoul` als standaardtijdzone, en je systeem gebruikt een andere | Verwijder de regel `timezone` om de systeemtijdzone te volgen. Wil je `Asia/Seoul` houden, stel het dan in je lokale config in (`oma-config.local.yaml` of `.local.cue`) |

Zie de [Configuratiereferentie](/docs/guide/configuration-reference) voor de bestandsvolgorde. Controleer na een update de configuratie en gegenereerde paden:

```bash
oma update --ci
oma doctor --json
```

Met `oma update --ci` blijft de run niet-interactief.

## Een installatie of update kan de release niet downloaden {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` en de reparatie van `oma doctor` downloaden de release die `prompt-manifest.json` op `main` noemt. Ze proberen eerst het asset `agent-skills.tar.gz` van de GitHub-release `cli-v<version>`, gecontroleerd tegen het bijbehorende `.sha256`-bestand, daarna het bronarchief van die tag en vervolgens een shallow clone van de tag. Een niet-overeenkomende checksum, of een payload waarvan `.agents/skills/_version.json` een andere versie noemt, stopt de run in plaats van een andere bron te proberen.
<!-- oma-docs:ignore-end -->

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| De download mislukt vlak na een release | Het manifest noemt een versie waarvan de assets nog worden gepubliceerd | Wacht een paar minuten en probeer het opnieuw |
| Je hebt nog niet uitgebrachte inhoud van `main` nodig | Releases installeren alleen getagde inhoud | Schakel het voor één run expliciet in met `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

De run toont een waarschuwing: inhoud van de main-branch is geen getagde release en is niet met een checksum geverifieerd.

## Een vendor start niet {#a-vendor-does-not-start}

Voer eerst de eigen authenticatiecontrole van de vendor uit en bekijk daarna het opgeloste OMA-profiel:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| De vendor-CLI is niet geauthenticeerd | De vendorsessie is verlopen of nooit ingesteld | Authenticeer opnieuw met exact het vendorcommando dat `oma doctor` vermeldt |
| Een modeloverride wordt geweigerd | De override gebruikt niet de door het schema geaccepteerde vorm `owner/model`, of de vendor ervan ondersteunt het geselecteerde CLI-transport niet | Gebruik de vorm `owner/model` met een vendor die het transport ondersteunt |
| `model_preset: free` bereikt zijn gateway niet | De opgeloste gateway-URL of het model klopt niet, of de geconfigureerde omgevingsvariabele voor de API-sleutel is leeg | Controleer de gateway-URL en het model met `oma doctor --profile` en zet daarna de sleutel in de omgevingsvariabele |
| Een child sluit af zonder result-artifact | De child heeft zijn claim niet op het geïnjecteerde pad geschreven | Bekijk de rundirectory en de status van de parent (zie hieronder) |

Als je de `free`-map weglaat, zijn de standaardwaarden `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` en model `auto`; zet de API-sleutel zelf nooit in YAML.

Een gespawnde child krijgt de runidentiteit en resultinstructies, schrijft de claim op het geïnjecteerde pad en meldt zijn artifacts; de parent finaliseert de beheerde receipt nadat de exitcode is vastgelegd. Read-only children retourneren `OMA_RESULT_JSON: ...`; die regel wordt als inspectie geregistreerd en voldoet niet aan uitvoerbare verificatie.

## Hooks zijn geïnstalleerd maar voeren niet uit {#hooks-are-installed-but-do-not-run}

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| Codex voert de OMA-hooks niet uit | De hooks worden nog niet vertrouwd: dit is de eerste installatie, of een update heeft een hook-commandostring gewijzigd | Controleer `.codex/hooks.json` en voer daarna `/hooks` uit in Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

OMA’s gespawnde Codex-subprocessen geven de bypassvlag mee voor hun eigen beheerde aanroep; daarmee wordt een hook in een Codex-sessie die je zelf start niet vertrouwd. Zie [Codex Hook Trust](/docs/guide/codex-hook-trust).

## Het dashboard is leeg of verbindt niet {#the-dashboard-is-empty-or-disconnected}

Start het terminaldashboard vanuit het project met de sessiebestanden:

```bash
oma dashboard terminal
```

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| `No agents detected yet` | De workflow heeft nog geen sessie-, taak- of voortgangsbestanden in de bewaakte memorymap geschreven, of het dashboard bewaakt een andere map | Wacht op het eerste voortgangsbestand; voer het uit vanuit de projectroot, geef `--project-root <path>` mee of stel `MEMORIES_DIR` in |
| Bestanden in de oude map `.serena/memories/` verschijnen niet | Het dashboard leest `.agents/state/memories/` en zoekt niet in de oude map | Stel `MEMORIES_DIR` in op de map met de bestanden |
| `oma dashboard web` sluit af met `port 9847 is already in use` | Een ander proces bezet de poort | Gebruik een andere `DASHBOARD_PORT` |
| De webpagina blijft op Disconnected staan nadat je het dashboard opnieuw hebt gestart | Elke start maakt een nieuw toegangstoken aan, en het geopende tabblad heeft nog het oude | Herlaad de pagina |

Het webdashboard bindt aan loopback en print zijn URL. Open die; de pagina bevat zelf het token voor de web-API en WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Meer dashboardsignalen staan in [Dashboardmonitoring](./dashboard-monitoring.md#troubleshooting-runbook).

## Een planning ontbreekt of is niet uitgevoerd {#a-schedule-is-missing-or-did-not-run}

Inspecteer het manifest en de schedulerstatus. De eerste twee commando’s zijn read-only; de laatste twee wijzigen de status:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| `schedule list` toont `missing-in-os` of `stale` | De OS-registratie ontbreekt of is verouderd | `oma schedule sync` |
| Het runlog toont `Unknown command: schedule:run` | De registratie dateert van vóór de hernoeming van het commando | `oma update` synchroniseert die automatisch opnieuw; `oma schedule sync` herschrijft haar ook |
| `schedule list` toont `orphan-in-os` | Een OS-job heeft geen manifestvermelding | `oma schedule sync --prune`, alleen wanneer de verweesde jobs verwijderd moeten worden |
| Een aangemaakte planning is nooit geregistreerd | Ze is aangemaakt met `--dry-run`, wat alleen een preview toont | Maak haar opnieuw aan zonder `--dry-run` |
| Een terugkerend interval is niet geregistreerd | Het interval moet worden afgerond | Bekijk de preview en accepteer daarna de afronding met `--accept-rounded` |
| De job is uitgevoerd maar mislukt | De vendor sloot af met een niet-nul exitcode, of het log meldt `re-auth required` | Controleer het runlog onder `~/.oma/schedule/runs/<id>/` en authenticeer de vendor opnieuw |

## Evaluatie- of optimalisatierapporten geen dekking {#evaluation-or-optimization-reports-no-coverage}

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| Skill-evaluatie of -optimalisatie meldt geen dekking | Er staan minder dan vijf fixtures onder `.agents/eval/<skill>/` | Voeg fixtures toe tot het er minstens vijf zijn |
| Mockmodus weigert vastgelegde rollouts | De provenance van de vastgelegde rollout komt niet overeen met de huidige skill- en fixture-hashes | Neem opnieuw op in livemodus; kopieer geen oud `_rollouts`-bestand naar een nieuwe skillmap om het als actueel bewijs te behandelen |
| `--apply` weigert te schrijven | `--apply` vereist een strikt positief validatieresultaat en een geslaagde door de runner beheerde testverdeling | Houd de standaardmodus `--dry-run` aan terwijl je het voorgestelde diff beoordeelt, en los eerst de falende validatie op |

Een door OMA beheerde skill die door `--apply` is gewijzigd, kan door een latere `oma update` worden overschreven.

## Een resultaat kan niet worden afgerond of hervat {#a-result-cannot-finish-or-resume}

Inspecteer de run- en planbestanden:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Symptoom | Oorzaak | Oplossing |
|---------|-------|-----|
| Een voltooide claim wordt afgewezen of gedegradeerd | Een mislukte receipt, gewijzigde inputs, ontbrekende artifacts, onopgeloste punten of een gewijzigd taakcontract | Voer vóór het afronden `oma agent verify RUN_ID --required` uit en los op wat de receipt meldt |
| Hervatten laat een taak op `blocked` staan | Automatisch hervatten vereist `retry_policy: "safe"`, een opnieuw uitvoerbare prompt en resterende pogingen | Lees de reden in het dry-run-rapport. Het plan wordt na de eerste dispatch bevroren, dus stel `retry_policy` in het plan van een nieuwe sessie in, of voer de taak handmatig opnieuw uit |
| Hervatten probeert een taak niet opnieuw | Een live proces, of een onderbroken native poging zonder duidelijk partial- of failed-resultaat, blijft ongemoeid om dubbel werk te voorkomen | Wacht op het live proces, of finaliseer eerst de native poging |

Zie [Agentresultaten en hervatten](./agent-results-and-resume.md) voor de volledige levenscyclus.

## Hulp vragen {#ask-for-help}

Neem bij het vragen om hulp de relevante uitvoer van `oma doctor --json`, het commando, session/run-ID en het onopgeloste bericht op. Neem geen credentials of de inhoud van bestanden met geheimen op. Open een issue op [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## Zie ook {#see-also}

- [OMA gebruiken](./usage.md#troubleshooting): installatieproblemen zoals ontbrekende skills, CLI’s en workspaceconflicten
- [Dashboardmonitoring](./dashboard-monitoring.md#troubleshooting-runbook): signalen van een vastgelopen, gecrasht of niet-verbonden dashboard
- [Agentresultaten en hervatten](./agent-results-and-resume.md): runrecords, claims en herstel
- [Woordenlijst](../getting-started/glossary.md): termen zoals [runrecord en claim](../getting-started/glossary.md#run-record-and-claim)
