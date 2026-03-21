---
title: "Gebruiksscenario: Bugfixing"
description: Gestructureerde reproduceren-diagnosticeren-fixen-regressielus met escalatie op basis van ernst.
---

# Gebruiksscenario: Bugfixing

## Intakeformaat

Begin met een reproduceerbaar rapport:

```text
Symptom:
Environment:
Steps to reproduce:
Expected vs actual:
Logs/trace:
Regression window (if known):
```

## Ernsttriage

Classificeer vroegtijdig om de reactiesnelheid te bepalen:

- `P0`: dataverlies, authenticatieomzeiling, productie-uitval
- `P1`: belangrijke gebruikersstroom onderbroken
- `P2`: verslechterd gedrag met omweg
- `P3`: klein/niet-blokkerend

`P0/P1` vereisen altijd QA-/beveiligingsreview.

## Uitvoeringslus

1. Reproduceer exact in een minimale omgeving.
2. Isoleer de hoofdoorzaak (niet alleen symptoombestrijding).
3. Implementeer de kleinste veilige fix.
4. Voeg regressietests toe voor het falende pad.
5. Controleer aangrenzende paden die waarschijnlijk dezelfde foutmodus delen.

## Promptsjabloon voor oma-debug

```text
Bug: <error/symptom>
Repro steps: <steps>
Scope: <files/modules>
Expected behavior: <expected>
Need:
1) root cause
2) minimal fix
3) regression tests
4) adjacent-risk scan
```

## Veelvoorkomende escalatiesignalen

Escaleer naar QA of beveiliging wanneer de bug raakt aan:

- authenticatie/sessie/tokenvernieuwing
- permissiegrenzen
- betaling/transactieconsistentie
- prestatieregressies onder belasting

## Validatie na de fix

- Oorspronkelijke reproductie faalt niet meer
- Geen nieuwe fouten in gerelateerde stromen
- Tests falen voor de fix en slagen na de fix
- Terugdraaipad is duidelijk als een hotfix nodig is

## Gereedcriteria

Bugfixing is gereed wanneer:

- de hoofdoorzaak is geïdentificeerd en gedocumenteerd
- de fix is geverifieerd door reproduceerbare controles
- regressiedekking aanwezig is
