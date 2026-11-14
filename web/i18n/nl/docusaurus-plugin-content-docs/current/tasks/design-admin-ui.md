---
title: Een admin-UI ontwerpen rond de echte taken
description: Leg hiërarchie, tabeldichtheid, states en de designoverdracht van een adminscherm vast, en behoud de stack en het visuele contract van het project.
---

# Een admin-UI ontwerpen rond de echte taken

Gebruik `oma-design` om te bepalen hoe een adminscherm de gebruikers moet ondersteunen voordat je applicatiecode wijzigt.

## De skill laden {#load-the-skill}

Vraag je coding-agent dit commando uit te voeren en de teruggegeven instructies en ondersteuningsmap te lezen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## De invoer aanleveren {#provide-the-input}

- Een draaiend scherm, screenshots of de relevante componenten.
- Wie het scherm gebruikt en welke acties die persoon moet afronden.
- Bestaande `DESIGN.md`, tokens, componenten, talen en eisen voor responsive gedrag en toegankelijkheid.

## De taak geven {#give-the-task}

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Het resultaat controleren {#check-the-result}

Verwacht beslissingen over hiërarchie en dichtheid die bij het scherm horen, gedrag van states, mapping van semantische tokens en een implementatieoverdracht. Aanvaarde systeemwijzigingen horen in de canonieke `DESIGN.md` van het project.

Toets het voorstel aan de triagetak: kan een gebruiker het volgende ticket herkennen, filters wijzigen, details openen en van fouten herstellen? Inspecteer toetsenbordfocus, leesbare Koreaanse en Engelse tekst en gedrag op een smal scherm wanneer een gerenderd specimen beschikbaar is. Een overdracht die alleen uit een document bestaat, laat uitvoering in de browser en toegankelijkheid ongeverifieerd.

## Afhankelijkheden en volgende stap {#dependencies-and-next-step}

Voor nieuwe richting van een admin- of productinterface kiest het [routeringscontract](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) Interface Design. Kritiek, audit en polish van een bestaande UI kiezen Impeccable; overige web-artdirection gebruikt Taste. Voor de huidige bewerking wordt één leverancier geladen.

Die externe instructies kunnen eigen downloads of runtimetools nodig hebben. De bestaande stack, het merk, CJK-dekking, het WCAG-doel en de eisen voor reduced motion blijven beperkingen. Instructies laden rendert of verifieert de UI niet.

Gebruik de frontendspecialist van het project voor de implementatie. Kies voor projecthooks en workflows [een runtime-setup](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) die `oma-design` bevat.
