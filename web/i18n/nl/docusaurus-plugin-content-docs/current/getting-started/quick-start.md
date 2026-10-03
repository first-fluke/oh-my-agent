---
title: Snel starten
description: Voer één afgebakende taak uit, van installatie tot verificatie, met verwachte uitvoer en herstel.
---

# Snel starten

Gebruik deze pagina om één kleine taak uit te voeren en een concreet resultaat vast te leggen. Je hebt een projectmap en minstens één ondersteunde AI-CLI of IDE nodig. De installer kan `bun`, `uv`, Serena en CUE op macOS, Linux of Windows instellen. De geselecteerde hostintegratie is nodig voor de eerste prompt; provider- en browserintegraties zijn optioneel.

## 1. Installeer

### Snelste route — skills in je agents

```bash
npx skills add first-fluke/oh-my-agent
```

Dit installeert het OMA-skillpakket in gedetecteerde agent-runtimes (Claude Code, Cursor, Codex en meer). Skills leren de agent hoe die moet werken. Installeer voor stop-hook-gates, artifactverificatie, onafhankelijke judges en de `oma`-CLI de volledige harness hieronder.

Installaties met alleen skills bieden de `oma`-CLI, hooks, workflows en judges niet. Gebruik voor de eerste taak hieronder een benoemde geïnstalleerde skill; gebruik de volledige harness wanneer je de CLI-controles nodig hebt.

### Volledige harness (gates, hooks, CLI)

Voer vanuit de projectmap de bootstrap-installer uit:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Voer in Windows PowerShell het volgende uit:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

De interactieve setup vraagt naar de antwoordtaal, CLI-leveranciers, capabilityproviders, modelpreset, skillpreset voor het project en eventuele stackvariant. Houd voor een eerste run de standaardwaarden aan, selecteer de leverancier die je al gebruikt en kies de projectpreset die het beste bij de repository past.

Als je `bun` al hebt, gebruik je de installer rechtstreeks:

```bash
bunx oh-my-agent@latest
```

De bootstrap-scripts installeren in het huidige project. Gebruik `oma install --global` als je op HOME-niveau wilt installeren; lees [Installatie](./installation.md) voordat je project- en globale installaties combineert.


## 2. Controleer het resultaat (alleen volledige harness)

Als je de volledige harness hebt geïnstalleerd, voer je vanuit dezelfde projectmap de healthcheck uit:

```bash
oma doctor
```

Het tekstcommando print een rapport met secties zoals `CLI Status` en `Skills Status` en geeft daarna de shellstatus terug. De exacte rijen hangen af van de hosts die in het project zijn geïnstalleerd:

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

Optionele MCP-, browser-, memory- of code-intelligence-integraties kunnen als waarschuwing verschijnen; je hebt ze alleen nodig voor taken die ze gebruiken. Voor een machineleesbare status geeft `oma doctor --json` een niet-nul status terug wanneer het rapport problemen bevat. Gebruik `oma doctor --profile` om het opgeloste model en de CLI voor elke canonieke agentrol te bekijken.

Als `oma` niet beschikbaar is maar Bun wel is geïnstalleerd, voer je dezelfde controle uit zonder het globale commando:

```bash
bunx oh-my-agent@latest doctor
```

Als het commando `oma` nog steeds ontbreekt, open je een nieuwe shell of voeg je de bin-map van de pakketbeheerder toe aan `PATH`. Als `oma doctor` een ongeldige configuratie meldt, herstel je het genoemde veld en voer je het commando opnieuw uit. Verwijder `.agents/oma-config.yaml` niet om te herstellen: dit is de configuratie van de gebruiker en die bewaart instellingen tijdens updates.

Als je alleen skills hebt geïnstalleerd, sla je deze CLI-controle over en ga je verder met de taak met een benoemde skill hieronder.

## 3. Voer één kleine taak uit

Open de repository in de geconfigureerde AI-tool en vraag om één benoemde skill en één zelfstandig resultaat:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

De host hoort de geselecteerde skill te identificeren, één doel te inspecteren en te rapporteren: ofwel een gerichte linkwijziging, ofwel dat de link al geldig is. Neem de commando-uitvoer en de exitstatus op voor elke controle die echt is uitgevoerd. Een installatie met alleen skills voegt geen `/debug`, `/ralph`, hooks of workflowgates toe; door om de benoemde skill te vragen blijft deze eerste taak binnen de geïnstalleerde mogelijkheden.

Wanneer de keyword-hook voor de geselecteerde host is ingeschakeld, kan die een overeenkomende workflow activeren. Skillrouting gebeurt door de host of de geselecteerde workflow. Een willekeurige hostprompt garandeert daarom geen hook, specifieke skill of `CHARTER_CHECK`. Het uitvoeringscontract moet nog steeds de repositoryconventies controleren, alleen de afgebakende wijziging uitvoeren en de verificatie rapporteren. De exacte bestanden en commando’s hangen van het project af.

Kies voor een taak die API- en UI-grenzen overschrijdt expliciet `/work` of `/orchestrate`. Ga voor één domein verder met [Eén skill uitvoeren](../guide/single-skill.md). De [Gebruiksgids](../guide/usage.md) bevat langere voorbeelden.

## 4. Ken de standaardwaarden voordat je opschaalt

OMA start met `model_preset: auto`, Serena voor code-intelligence, Agent Memory voor semantisch geheugen, native web search en uitgeschakelde telemetrie. Serena gebruikt de gedeelde `bridge`-transportlaag en wordt automatisch bijgewerkt tenzij je dat anders configureert. Browser DevTools MCP is opt-in; een nieuwe interactieve setup biedt eerst Aside aan. Zie [Belangrijke standaardinstellingen](./important-defaults.md) voor de gevolgen en de sleutels waarmee je dit overschrijft.

Als een beheerde taak vastloopt, begin je met `oma agent status <session-id> [agent-id]`. Bekijk daarna de receipt onder `.agents/state/agent-runs/` en het geïnjecteerde gestructureerde claimpad. Deze records tonen de run, taak, workspace, exitcode en verificatiestatus. Mensleesbare `result-*.md`- en `progress-*.md`-bestanden onder `.agents/state/memories/` geven extra context als ze aanwezig zijn. Voer alleen het kleinste mislukte commando opnieuw uit nadat je hebt gecontroleerd dat de run niet meer actief is. Een persistente workflow blijft actief tot die klaar is of je `workflow done` zegt; zie [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) voor herstel van het statebestand.

## Volgende stappen

- [Belangrijke standaardinstellingen](./important-defaults.md) voor voorrang, providers en herstelkeuzes
- [Installatie](./installation.md) voor presets, leverancierssetup, globale installaties en updates
- [Agents](../core-concepts/agents.md) voor de 33 skillpakketten en dispatchrollen
- [Workflows](../core-concepts/workflows.md) voor planning, parallelle uitvoering, QA en persistente modi
