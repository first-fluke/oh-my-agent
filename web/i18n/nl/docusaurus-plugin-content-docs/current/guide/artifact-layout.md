---
title: Artefactindeling
sidebar_label: Artefactindeling
description: Waar OMA onderhouden documenten, uitvoeringsrapporten en runtimestatus bewaart, en hoe je verouderde locaties migreert.
---

# Artefactindeling

OMA gebruikt drie locaties: `docs/` voor onderhouden projectdocumenten, `.agents/results/` voor mensleesbare uitvoeringsrapporten en `.agents/state/` voor coördinatie en uitvoeringsbewijs. De paden hieronder zijn relatief ten opzichte van de projectroot.

## Onderhouden documenten {#maintained-documents}

| Locatie | Inhoud |
|----------|---------|
| `docs/decisions/` | Voorstellen van benaderingen, afwegingen en architectuurbeslisrecords (ADR's) |
| `docs/plans/work/` | Werkplannen, voortgang, beslissingslogboeken en de tracker voor technische schuld |
| `docs/plans/contracts/` | Aangenomen API-contracten |
| `DESIGN.md` | UI-designsysteem: typografie, kleur, spacing, motion en componenten |

Gebruik een veld `Status` in beslissingsdocumenten om `draft`, `accepted` of `superseded` vast te leggen. Bewaar een vervangen beslissing en link naar de vervanging, zodat de redenering beschikbaar blijft. `design` verwijst in OMA naar UI-design; technische voorstellen en ADR's delen `docs/decisions/`.

Gebruik een documentindex van het project, zoals `docs/README.md`, om naar de onderhouden documenten te linken. De artefactmigratie verplaatst bestaande bestanden; ze maakt geen index en wijzigt de status van een document niet.

## Uitvoeringsrapporten en runtimestatus {#execution-reports-and-runtime-state}

| Locatie | Inhoud |
|----------|---------|
| `.agents/results/result-*.md` | Mensleesbare resultaatrapporten van agenten en workflows |
| `.agents/results/architecture/` | Architectuuranalyse en aanbevelingen |
| `.agents/results/bugs/` | Bugrapporten |
| `.agents/results/refactor/` | Refactorplannen en -rapporten |
| `.agents/results/security/` | Securityscanrapporten |
| `.agents/results/market/` | Briefings van marktonderzoek |
| `.agents/results/recap/` | Werkrecaps |
| `.agents/results/explain/` | HTML-uitleg |
| `.agents/results/api-contracts/` | Concepten van API-contracten |
| `.agents/results/plan-{sessionId}.json` | Huidig taakplan |
| `.agents/state/memories/` | Sessiesamenvattingen, taakborden, voortgang, lessen en experimentrecords |
| Runtime `agent-runs/` | Gestructureerde receipts, claims en verificatie-evidence |
| Runtime `agent-plans/` | Bevroren uitvoeringsplannen |

Submappen voor rapporten blijven per domein gescheiden. Mensleesbare rapporten vullen het gestructureerde bewijs aan; ze stellen op zichzelf geen geverifieerde voltooiing vast. Zie [Agentresultaten en hervatten](../agent-results-and-resume/).

Huidige receipts en bevroren plannen staan in de projectstatusmap van het actieve profiel. Oudere projecten kunnen ze onder `.agents/state/` bewaren. Hun opslag en verificatiekoppelingen veranderen door deze migratie niet.

## Een onderhouden document promoveren {#promote-a-maintained-document}

Wanneer een uitvoeringsartefact een projectreferentie wordt, verplaats je het naar de bijpassende onderhouden locatie. Verplaats bijvoorbeeld een aangenomen contract van `.agents/results/api-contracts/` naar `docs/plans/contracts/`, of maak van een architectuuraanbeveling een beslissingsrecord in `docs/decisions/`. Laat op de oude locatie een link achter en werk de documentindex bij.

Als gestructureerd uitvoeringsbewijs het oorspronkelijke bestand of de hash ervan vastlegt, laat je dat bestand intact en maak je in plaats daarvan een onderhouden versie. Link vanuit de projectindex naar het onderhouden document.

Install, update en link negeren `.agents/results/`, `.agents/state/` en `docs/plans/` standaard in Git. `docs/decisions/` valt buiten die standaard-ignore. Bekijk de `.gitignore` van het project wanneer je een contract of werkplan aanneemt dat het team moet versiebeheren.

## Een bestaand project migreren {#migrate-an-existing-project}

Bekijk de migratie eerst:

```bash
oma docs migrate --dry-run
```

Voeg voor gestructureerde uitvoer `--json` toe. Pas dezelfde migratie expliciet toe wanneer je klaar bent:

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` en `oma update` voeren deze migratie ook uit. Ze voegt deze verouderde locaties samen:

<!-- oma-docs:ignore-start -->
| Verouderde locatie | Bestemming |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` en hun geschreven diagramsidecars | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Beslissingsdocumenten behouden hun submapstructuur. Verouderde architectuur-ADR's verhuizen met hun geschreven sidecars `.archify.json` en `.archify.html`. Reviews, aanbevelingen en validatielogs die bij een run horen, blijven in de results-map. De resultaatmigratie dekt `result-*.md`-bestanden op het hoogste niveau in de twee memorymappen; andere memorybestanden blijven op hun plaats.

De migratie behoudt bestaande doelbestanden. Als een ander bestand dezelfde naam heeft, voegt ze een bronachtervoegsel toe, zoals `001-cache--from-plan-designs.md`, en meldt het gekozen pad. Als die naam bezet is, voegt ze een stabiele contenthash toe. De migratie opnieuw uitvoeren maakt geen dubbele kopieën en hernoemt geen bestanden die al zijn gemigreerd.

Ze werkt ondersteunde Markdown-links en padverwijzingen bij in verplaatste documenten, Markdown-coördinatienotities, `docs/**/*.md` en `README*.md`- en `AGENTS.md`-bestanden in de root. Bekijk die wijzigingen met het migratierapport en de Git-diff. Gestructureerd runtimebewijs en UI-bestanden `DESIGN.md` zijn uitgesloten van het herschrijven van verwijzingen. Bestaande blokken `oma-docs:ignore-start` / `oma-docs:ignore-end` bewaren voorbeelden van verouderde paden.

Bekijk het rapport op uitgestelde bestanden. Een resultaatrapport waarnaar gestructureerd uitvoeringsbewijs verwijst, blijft op het oorspronkelijke pad, zodat de vastgelegde receipt en hash geldig blijven. Receipts, claims, bevroren uitvoeringsplannen en ander runtimebewijs blijven op hun plaats. Migratie promoveert geen conceptcontracten, neemt geen beslissingen aan en wijzigt het UI-designsysteem niet.
