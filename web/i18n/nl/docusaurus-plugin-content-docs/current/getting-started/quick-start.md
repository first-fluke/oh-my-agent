---
title: Snel starten
description: Kies één skill of een runtimepreset en voer vervolgens een afgebakende eerste taak uit met waargenomen verificatie.
---

# Snel starten

Gebruik één gerichte taak om het resultaat te controleren. Laad een skill in de coding-agent die je al gebruikt, of installeer de runtime wanneer je projecthooks, specialistische agenten en workflows nodig hebt. [Een setup kiezen](./choose-setup.md) legt de beschikbare paden en hun afhankelijkheden uit.

## 1. Kies de setup {#1-install}

Vraag je agent voor de alleen-lezen Git-taak hieronder om de skill te laden en de instructies en ondersteuningsmap te lezen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Ga verder met de taak in Stap 3. De CLI-bewerkingen van de skill, andere skills, projectregels en externe services blijven aparte afhankelijkheden. Het laden van deze skill voert de OMA-installer niet uit.

### Installeer de runtime wanneer nodig

De runtime-bootstrap kan `bun`, `uv`, Serena, CUE en het globale `oma`-commando voorbereiden. Selecteer de AI-CLI of IDE die je al gebruikt; provider- en browserintegraties hangen af van de taken die je wilt uitvoeren.

Voer vanuit de projectmap de bootstrap-installer uit:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Voer in Windows PowerShell het volgende uit:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Setup behoudt een bestaande antwoordtaal of detecteert de systeemtaal automatisch. De interactieve setup vraagt naar CLI-vendors, [capabilityproviders](./glossary.md#capability-provider), [modelpreset](./glossary.md#model-preset), [skillpreset](./glossary.md#skill-preset) voor het project en eventuele stackvariant. Houd voor een eerste run de standaardwaarden aan, selecteer de vendor die je al gebruikt en kies de projectpreset die het beste bij de repository past. Zie [Presets](./installation.md#presets) voor de skills van elke preset en voor [workflows die skills buiten een preset nodig hebben](./installation.md#workflows-that-need-skills-outside-a-preset).

Als je `bun` al hebt, gebruik je de installer rechtstreeks:

```bash
bunx oh-my-agent@latest
```

De bootstrap-scripts installeren in het huidige project. Gebruik `oma install --global` als je op HOME-niveau wilt installeren; lees [Globale installatie](../guide/global-install.md) voordat je project- en globale installaties combineert.

## 2. Controleer het resultaat

Controleer bij tijdelijk laden van een skill of de agent de gekozen instructies heeft gelezen en verifieer de taak zelf. Voer bij een runtime-installatie vanuit dezelfde projectmap de healthcheck uit:

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

`oma doctor` kan problemen met optionele integraties als waarschuwing melden. De standaardvoorbereiding van AgentMemory wordt gecontroleerd tijdens `oma install` en `oma update`; installatie-, opstart- of statusfouten stoppen die commando's. Als je `providers.semantic_memory: none` of `honcho` kiest, of `OMA_NO_AGENTMEMORY=1` instelt, wordt die voorbereiding overgeslagen.

Voor een machineleesbare status geeft `oma doctor --json` een niet-nul status terug wanneer het rapport problemen bevat. Gebruik `oma doctor --profile` om het opgeloste model en de CLI voor elke canonieke agentrol te bekijken.

Als `oma` niet beschikbaar is maar Bun wel is geïnstalleerd, voer je dezelfde controle uit zonder het globale commando:

```bash
bunx oh-my-agent@latest doctor
```

Als het commando `oma` nog steeds ontbreekt, open je een nieuwe shell of voeg je de bin-map van de pakketbeheerder toe aan `PATH`; [Installatie](./installation.md#method-3-global-install) laat zien hoe je het commando `oma` installeert. Als `oma doctor` een ongeldige configuratie meldt, herstel je het genoemde veld en voer je het commando opnieuw uit. Verwijder `.agents/oma-config.yaml` niet om te herstellen: dit is de configuratie van de gebruiker en die bewaart instellingen tijdens updates.

## 3. Voer één kleine taak uit

Open een bestaande Git-repository in je AI-tool. Gebruik de geladen `oma-scm`-skill of de kopie die door een benoemde runtimepreset is geïnstalleerd. Als je Aangepaste selectie hebt gebruikt, neem dan `oma-scm` op voor dit voorbeeld:

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

Vergelijk de gerapporteerde branch en wijzigingen met de werkelijke Git-uitvoer. De agent moet rapporteren welke commando's zijn uitgevoerd en wat hun exitstatussen waren. Deze alleen-lezen taak vereist geen codetest of build.

Een gewone prompt start geen workflow; waar de prompthook is ingeschakeld voegt die een adviserende skillhint toe. Skillrouting gebeurt door de host of de geselecteerde workflow, dus een willekeurige hostprompt garandeert geen hook of een specifieke skill. Het uitvoeringscontract moet nog steeds de repositoryconventies controleren, het gevraagde alleen-lezen bereik respecteren en de waargenomen controles rapporteren. De exacte bestanden en commando's hangen van het project af.

Kies voor een taak die API- en UI-grenzen overschrijdt expliciet `/work` of `/orchestrate`. Ga voor één domein verder met [Eén skill uitvoeren](../guide/single-skill.md). De [Gebruiksgids](../guide/usage.md) bevat langere voorbeelden.

## 4. Ken de standaardwaarden voordat je opschaalt

Tijdelijk laden van een skill configureert deze runtimestandaarden niet. Gebruik voor projecthooks, providerconfiguratie of teamworkflows het runtimepad in [Een setup kiezen](./choose-setup.md).

OMA start met `model_preset: auto`, Serena voor code-intelligence, Agent Memory voor semantisch geheugen, native web search en uitgeschakelde telemetrie. Serena gebruikt de gedeelde `bridge`-transportlaag en wordt automatisch bijgewerkt tenzij je dat anders configureert. Browser DevTools MCP is opt-in; een nieuwe interactieve setup biedt eerst Aside aan. Zie [Belangrijke standaardinstellingen](./important-defaults.md) voor de gevolgen en de sleutels waarmee je dit overschrijft.

Als een beheerde taak vastloopt, begin je met `oma agent status <session-id> [agent-id]`. Bekijk daarna de receipt onder `.agents/state/agent-runs/` en het geïnjecteerde gestructureerde claimpad. Deze records tonen de run, taak, workspace, exitcode en verificatiestatus. Mensleesbare `result-*.md`- en `progress-*.md`-bestanden onder `.agents/state/memories/` geven extra context als ze aanwezig zijn. Voer alleen het kleinste mislukte commando opnieuw uit nadat je hebt gecontroleerd dat de run niet meer actief is. Een [persistente workflow](./glossary.md#persistent-workflow) blijft actief tot die klaar is of je `workflow done` zegt; zie [Workflows](../core-concepts/workflows.md#persistent-mode-mechanics) voor herstel van het statusbestand.

## Volgende stappen

- [Een setup kiezen](./choose-setup.md) voor één skill, een runtimepreset of de Claude Code-plugin
- [Belangrijke standaardinstellingen](./important-defaults.md) voor voorrang, providers en herstelkeuzes
- [Installatie](./installation.md) voor presets, vendorsetup, globale installaties en updates
- [Agenten](../core-concepts/agents.md) voor de 33 skillpakketten en dispatchrollen
- [Workflows](../core-concepts/workflows.md) voor planning, parallelle uitvoering, QA en persistente modi
- [Probleemoplossing](../guide/troubleshooting.md) wanneer de installatie, een vendor of een hook zich niet gedraagt zoals verwacht
