---
title: "Gids: Probleemoplossing"
sidebar_label: Probleemoplossing
description: Diagnoseer problemen met installatie, configuratie, leveranciers, dashboard, planning, evaluaties en agentresultaten met controles die door de bron worden onderbouwd.
---

# Probleemoplossing {#troubleshooting}

Start vanuit de project- of installatieroot met een machineleesbare diagnose:

```bash
oma doctor --json
```

Het commando hoort JSON op te leveren met bevindingen over de installatie, leverancier, configuratie en integraties. Voeg `--profile` toe wanneer het probleem met model- of agentresolutie te maken heeft. Bewaar de JSON wanneer je een probleem meldt; die bevat de geselecteerde paden en controles, zonder dat je in proza hoeft te gissen.

## De CLI of installatie gebruikt de verkeerde bestanden {#the-cli-or-install-is-using-the-wrong-files}

Controleer de context expliciet:

```bash
oma doctor --json
oma doctor --profile
```

Projectcommando’s lezen de dichtstbijzijnde `.agents/oma-config.cue` of `.agents/oma-config.yaml` en daarna één lokale overlay. Een globaal commando leest de HOME-installatieroot. Als zowel een lokale CUE- als YAML-file bestaat, verwijder je één van beide. Als een lokaal bestand ongeldig is, stopt OMA in plaats van de override stilzwijgend te negeren. Zie de [Configuratiereferentie](/docs/guide/configuration-reference).

Controleer na een update de configuratie en gegenereerde paden:

```bash
oma update --ci
oma doctor --json
```

Met `oma update --ci` blijft de run niet-interactief. Als de configuratie van de gebruiker onverwacht is vervangen, controleer je of `--force` is gebruikt; gewone updates behouden de configuratie van de gebruiker, terwijl force-modus die kan vervangen.

## Een installatie of update kan de release niet downloaden {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` en de reparatie van `oma doctor` downloaden de release die `prompt-manifest.json` op `main` noemt. Ze proberen eerst het asset `agent-skills.tar.gz` van de GitHub-release `cli-v<version>`, gecontroleerd tegen het bijbehorende `.sha256`-bestand, daarna het bronarchief van die tag en vervolgens een shallow clone van de tag. Een niet-overeenkomende checksum, of een payload waarvan `.agents/skills/_version.json` een andere versie noemt, stopt de run in plaats van een andere bron te proberen.
<!-- oma-docs:ignore-end -->

Vlak nadat een release is gemaakt, kan het manifest een versie noemen waarvan de assets nog worden gepubliceerd; wacht een paar minuten en probeer het opnieuw. Om bewust nog niet uitgebrachte inhoud van de branch `main` te installeren, schakel je dat voor die run expliciet in:

```bash
OMA_UPDATE_CHANNEL=main oma update
```

De run toont een waarschuwing: inhoud van de main-branch is geen getagde release en is niet met een checksum geverifieerd.

## Een leverancier start niet {#a-vendor-does-not-start}

Voer eerst de eigen authenticatiecontrole van de leverancier uit en bekijk daarna het opgeloste OMA-profiel:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Gebruik exact het vendorcommando dat `oma doctor` vermeldt om opnieuw te authenticeren. Een modeloverride moet de door het schema geaccepteerde vorm `owner/model` gebruiken en de leverancier ervan moet het geselecteerde CLI-transport ondersteunen. Controleer voor `model_preset: free` met `oma doctor --profile` de opgeloste gateway-URL en het model en verifieer daarna dat de geconfigureerde omgevingsvariabele voor de API-sleutel een sleutel bevat. Als je de `free`-map weglaat, zijn de standaardwaarden `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` en model `auto`; zet de API-sleutel zelf nooit in YAML.

Als een child zonder result-artifact afsluit, bekijk je de rundirectory en de status van de parent. Een gespawnde child krijgt de runidentiteit en resultinstructies, schrijft de claim op het geïnjecteerde pad en meldt zijn artifacts; de parent finaliseert de beheerde receipt nadat de exitcode is vastgelegd. Read-only children retourneren `OMA_RESULT_JSON: ...`; die regel wordt als inspectie geregistreerd en voldoet niet aan uitvoerbare verificatie.

## Hooks zijn geïnstalleerd maar voeren niet uit {#hooks-are-installed-but-do-not-run}

Controleer voor Codex het gegenereerde bestand en volg de eenmalige trustflow:

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Voer `/hooks` uit na de eerste installatie en nadat een update een commandostring heeft gewijzigd. OMA’s gespawnde Codex-subprocessen geven de bypassflag mee voor hun eigen beheerde aanroep; daarmee wordt een hook in een Codex-sessie die je zelf start niet vertrouwd. Zie [Codex Hook Trust](/docs/guide/codex-hook-trust).

## Het dashboard is leeg of verbindt niet {#the-dashboard-is-empty-or-disconnected}

Start het terminaldashboard vanuit het project met de sessiebestanden:

```bash
oma dashboard terminal
```

Standaard leest het `.agents/state/memories/`. Stel `MEMORIES_DIR` in als de state elders staat. Het webdashboard bindt aan loopback en print een URL met token:

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Open exact de URL die het commando print; de web-API en WebSocket vereisen het dashboardtoken. Als de poort bezet is, gebruik je een andere `DASHBOARD_PORT`. Als er geen agents verschijnen, controleer je of de workflow sessie-, taak- en voortgangsbestanden in de geselecteerde memorymap heeft geschreven. Het dashboard zoekt niet automatisch in de oude map `.serena/memories/`.

## Een planning ontbreekt of is niet uitgevoerd {#a-schedule-is-missing-or-did-not-run}

Inspecteer het manifest en de schedulerstatus:

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` meldt `synced`, `stale`, `missing-in-os` en `orphan-in-os`. Met `schedule sync` herstel je ontbrekende jobs en herschrijf je verouderde registraties (een regel `Unknown command: schedule:run` in het runlog betekent dat de registratie dateert van vóór de hernoeming van het commando; `oma update` synchroniseert die automatisch opnieuw); voeg `--prune` alleen toe wanneer verweesde OS-jobs verwijderd moeten worden. Een preview die met `--dry-run` is gemaakt, registreert geen job. Accepteer voor een terugkerend interval OMA’s afronding met `--accept-rounded` nadat je de preview hebt bekeken. Controleer het runlog onder `~/.agents/schedule/runs/<id>/` op een niet-nul vendor-exitcode of `re-auth required`.

## Evaluatie- of optimalisatierapporten geen dekking {#evaluation-or-optimization-reports-no-coverage}

Zowel skill-evaluatie als skill-optimalisatie vereist minstens vijf fixtures onder `.agents/eval/<skill>/`. In mockmodus moet de vastgelegde rollout-provenance overeenkomen met de huidige skill en fixture-hashes. Neem opnieuw op in livemodus wanneer de fixture of skill is gewijzigd; kopieer geen oud `_rollouts`-bestand naar een nieuwe skillmap om het als actueel bewijs te behandelen.

Houd voor optimalisatie de standaardmodus `--dry-run` aan tijdens het beoordelen van het voorgestelde diff. `--apply` vereist een strikt positief validatieresultaat en een geslaagde door de runner beheerde testverdeling; een door OMA beheerde skill kan door een latere `oma update` worden overschreven.

## Een resultaat kan niet worden afgerond of hervat {#a-result-cannot-finish-or-resume}

Inspecteer de run- en planbestanden:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Voer vóór het afronden `oma agent verify RUN_ID --required` uit. Een voltooide claim met een mislukte receipt, gewijzigde inputs, ontbrekende artifacts, onopgeloste punten of een gewijzigd taakcontract wordt afgewezen of gedegradeerd. Hervatten gebeurt alleen automatisch voor taken met `retry_policy: "safe"`, een opnieuw uitvoerbare prompt en resterende pogingen. Een live proces of een onderbroken native poging zonder duidelijke partial/failed-resultaatstatus blijft staan om dubbele uitvoering te voorkomen. Zie [Agentresultaten en hervatten](/docs/guide/agent-results-and-resume).

Neem bij het vragen om hulp de relevante uitvoer van `oma doctor --json`, het commando, session/run-ID en het onopgeloste bericht op. Neem geen credentials of de inhoud van bestanden met geheimen op.
