---
title: Pluginhooks en projectbootstrap repareren
description: Zie hoe marketplace-hookpaden, Bash-provisioning en projectbootstrap-receipts zijn gerepareerd met regressiefixtures.
---

# Pluginhooks en projectbootstrap repareren

De pluginreparatie in [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) pakte hookdispatch en bootstrapgedrag aan. De parent, `82649cbd`, is de toestand ervoor voor deze vergelijking.

## Faalmechanisme {#failure-mechanism}

Het [oude hookmanifest](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) riep bestanden aan onder `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. Die paden hangen af van gegenereerde bestanden; de fixture met een verse plugincache laat ze buiten de pluginmap.

De [oude bootstrap](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) liet de gedownloade Bash-installer ook via `sh -c` lopen. De succesmarker stond in gedeelde plugindata, en het snelle pad controleerde alleen die marker, de CLI-versie en of het instellingenbestand van het project aanwezig was. Een tweede project met een instellingenbestand kon daardoor de eigen wiring overslaan.

## Reparatie {#repair}

De [nieuwe dispatcher](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) roept de geïnstalleerde CLI aan. Wanneer een passende uitvoerbare projecthook het event al bezit, geeft de marketplace-hook het door, zodat het event niet twee keer wordt gedispatcht.

De [nieuwe bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh):

- Laat de Bash-installer via Bash lopen en controleert provisioningfouten.
- Dwingt projectinstallatie af, ook wanneer een instelling voor globale installatie is geërfd.
- Slaat de receipt op in `.agents/state/plugin-bootstrap.version` van dat project.
- Controleert configuratie, versiemetadata, de uitvoerbare wrapper en geregistreerde events voordat een receipt wordt hergebruikt.
- Bewaart diagnostiek van een mislukte installatie in `.agents/state/plugin-bootstrap.last-error.log` zonder een geslaagde receipt vast te leggen.

## De regressiecontroles reproduceren {#reproduce-the-regression-checks}

Gebruik een wegwerpcheckout van `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` waarin Bun en de ontwikkelafhankelijkheden van de repository al beschikbaar zijn. Vanuit de root:

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

De fixtures dekken verschillende grenzen:

| Fixture | Wat de assertions controleren |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Provisioning alleen via Bash, aparte projectreceipts, configuratie met alleen CUE, onvolledige wiring, versiefouten en bewaarde diagnostiek. |
| [Hookdispatch](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Dispatch met een verse cache, tijdbudgetten voor handlers, behoud van de payload, eigenaarschap van een passende projecthook, en fallback wanneer dat eigenaarschap ontbreekt of ongeldig is. |
| [Installatie-integratie](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Twee projectinstallaties, behouden gebruikersinstellingen, één prompt-/Stop-aflevering over beide registraties, en een nieuwe poging na mislukte wiring. |

Deze fixtures maken tijdelijke mappen en nep-CLI-commando's; de integratiefixture gebruikt de echte hookcomposer. Ze controleren shelldispatch en vastgelegde effecten zonder marketplace-installatie of modelaanroep. De suites worden op Windows overgeslagen.

## Wat in een echte sessie nog gecontroleerd moet worden {#what-remains-to-check-in-a-real-session}

Een geslaagde fixturerun stelt geen werkende Claude Code-sessie vast. Inspecteer in het echte doelproject de receipt en configuratie, voer `oma doctor` uit, herstart de sessie en oefen het relevante prompt- en Stop-gedrag terwijl je de waargenomen effecten controleert. Beschikbaarheid van de CLI, credentials, providergedrag en het hookbeleid van de host hebben hun eigen evidence nodig.

Voor dezelfde aanpak van reproduceren, repareren en verifiëren bij een andere fout begin je met [een falende test debuggen](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). [Een setup kiezen](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/) legt uit wanneer de projectruntime nodig is.
