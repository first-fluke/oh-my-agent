---
title: "Gids: Bugfixing"
description: Grondige debugginggids met de gestructureerde 5-stappen debuglus, ernsttriage, escalatiesignalen en post-fix validatie.
---

# Gids: Bugfixing

## Wanneer de Debug Workflow Gebruiken

Gebruik `/debug` (of zeg "fix bug", "fix error", "debug" in natuurlijke taal) wanneer je een specifieke bug hebt om te diagnosticeren en te fixen. De workflow biedt een gestructureerde, reproduceerbare benadering van debugging die de veelvoorkomende valkuil vermijdt van symptomen fixen in plaats van oorzaken.

---

## Bugrapportsjabloon

### Vereiste Velden

| Veld | Beschrijving | Voorbeeld |
|:-----|:-----------|:--------|
| **Foutmelding** | De exacte fouttekst of stacktrace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Stappen om te reproduceren** | Geordende acties die de bug triggeren | 1. Log in als admin. 2. Navigeer naar /users. 3. Klik "Delete". |
| **Verwacht gedrag** | Wat er zou moeten gebeuren | Gebruiker wordt verwijderd uit de lijst. |
| **Werkelijk gedrag** | Wat er daadwerkelijk gebeurt | Pagina crasht met een wit scherm. |

### Optionele Velden (Sterk Aanbevolen)

| Veld | Beschrijving |
|:-----|:-----------|
| **Omgeving** | Browser, OS, Node-versie, apparaat |
| **Frequentie** | Altijd, soms, alleen eerste keer |
| **Recente wijzigingen** | Wat veranderd is voor de bug verscheen |
| **Gerelateerde code** | Bestanden of functies die je verdenkt |
| **Logs** | Serverlogs, console-uitvoer |

---

## Ernsttriage (P0-P3)

### P0 — Kritiek (Onmiddellijke Respons)
Productie is down, data gaat verloren, beveiligingsinbreuk is actief. Drop alles.

### P1 — Hoog (Dezelfde Sessie)
Kernfunctie is kapot voor een aanzienlijk aantal gebruikers. Fix binnen de huidige werksessie.

### P2 — Gemiddeld (Deze Sprint)
Functie werkt maar met verminderd gedrag. Inplannen voor huidige sprint.

### P3 — Laag (Backlog)
Cosmetisch probleem, edge case of klein ongemak. Toevoegen aan backlog.

---

## De 5-Stappen Debuglus in Detail

### Stap 1: Foutinformatie Verzamelen
Foutmelding, stacktrace, reproductiestappen, verwacht vs werkelijk gedrag.

### Stap 2: Bug Reproduceren
**Tools:** `search_for_pattern`, `find_symbol` om de exacte locatie in de codebase te vinden.

### Stap 3: Oorzaak Diagnosticeren
**Tools:** `find_referencing_symbols` om het uitvoeringspad terug te traceren. Veelvoorkomende patronen: null/undefined-toegang, race conditions, ontbrekende foutafhandeling, verkeerde datatypes, verouderde state, ontbrekende validatie.

De kernvraag: diagnoseer de **oorzaak**, niet het symptoom.

### Stap 4: Minimale Fix Voorstellen
Presenteert oorzaak, voorgestelde fix en uitleg. **Blokkeert tot gebruiker bevestigt.** Minimale fix principe: verander de minste regels mogelijk.

### Stap 5: Fix Toepassen en Regressietest Schrijven
1. Implementeer de goedgekeurde fix
2. Schrijf een regressietest die faalt zonder de fix en slaagt met de fix

### Stap 6: Scannen op Vergelijkbare Patronen
Scant de hele codebase op hetzelfde patroon. Spawnt een `debug-investigator` subagent wanneer: scope > 10 bestanden, meerdere domeinen, of diepgaande afhankelijkheidstracing nodig.

### Stap 7: Bug Documenteren
Schrijft geheugenbestand met symptoom, oorzaak, fix, gewijzigde bestanden, regressietestlocatie.

---

## Escalatiesignalen

1. **Dezelfde fix twee keer geprobeerd** — Activeer Exploratieslus met 2-3 hypotheses
2. **Multi-domein oorzaak** — Escaleer naar `/coordinate` of `/orchestrate`
3. **Ontbrekende reproductieomgeving** — Verzamel productielogs, voeg instrumentatie toe
4. **Testinfrastructuur kapot** — Fix testinfrastructuur eerst

---

## Post-Fix Validatiechecklist

- [ ] Regressietest faalt zonder de fix
- [ ] Regressietest slaagt met de fix
- [ ] Bestaande tests slagen nog steeds
- [ ] Build slaagt
- [ ] Vergelijkbare patronen gescand
- [ ] Fix is minimaal
- [ ] Oorzaak gedocumenteerd

---

## Klaaircriteria

1. Oorzaak geidentificeerd en gedocumenteerd
2. Minimale fix toegepast met gebruikersgoedkeuring
3. Regressietest bestaat
4. Codebase gescand op vergelijkbare patronen
5. Bugrapport vastgelegd in geheugen
6. Alle bestaande tests slagen nog
