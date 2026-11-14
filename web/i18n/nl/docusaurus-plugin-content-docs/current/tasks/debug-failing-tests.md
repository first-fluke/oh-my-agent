---
title: Een falende test debuggen
description: Reproduceer een testfout, isoleer de oorzaak, maak een afgebakende fix en verifieer een regressie met de bestaande testrunner van het project.
---

# Een falende test debuggen

Gebruik `oma-debug` wanneer je een falend commando, een stacktrace of een herhaalbaar onjuist resultaat hebt.

## De skill laden {#load-the-skill}

Vraag je coding-agent dit commando uit te voeren en de instructies en ondersteuningsmap te lezen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## De invoer aanleveren {#provide-the-input}

- Het exacte falende commando en de volledige relevante foutuitvoer.
- Verwacht gedrag, checkout/ref, runtimeversie en vereiste lokale services.
- De bestanden of recente wijziging die je vermoedt, plus de toegestane bewerkingsscope.

## De taak geven {#give-the-task}

Dit concrete voorbeeld gebruikt de regressiefixtures voor pluginbootstrap van deze repository. Gebruik voor een ander project je eigen falende commando.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Het resultaat controleren {#check-the-result}

Verwacht de gereproduceerde fout, het causale pad, de afgebakende patch en een regressietest die aan die fout is gekoppeld. Het rapport moet een onbeschikbare omgeving scheiden van een gediagnosticeerd codedefect.

Controleer dat de regressie faalt voor het oorspronkelijke gedrag en slaagt met de fix. Voer het genoemde commando opnieuw uit in dezelfde omgeving en bekijk daarna de resultaten van gerelateerde tests. Als reproductie geblokkeerd blijft, verwacht je de exacte blocker en het zwakkere beschikbare bewijs.

## Afhankelijkheden en volgende stap {#dependencies-and-next-step}

De agent gebruikt de testrunner van je project en de geconfigureerde tools voor bronnavigatie. Het voorbeeld vereist bestaande Bun en de ontwikkelafhankelijkheden van de repository. Deze pluginfixtures worden op Windows overgeslagen; gebruik een falende test die je platform ondersteunt. Het laden van de skill installeert geen afhankelijkheden en herstelt geen ontbrekende service.

Zie het [voorbeeld van pluginhook-reparatie](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/) voor de werkelijke bronwijziging en de fixturegrenzen. Kies voor beheerde uitvoering of projecthooks [een runtime-setup](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) die `oma-debug` bevat.
