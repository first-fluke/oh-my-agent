---
title: "Gids: Bugfixing"
description: Grondige debugginggids met de gestructureerde 5-stappen debuglus, ernsttriage, escalatiesignalen en post-fix validatie.
---

# Gids: Bugfixing

## Wanneer de Debug Workflow Gebruiken

Gebruik `/debug` (of zeg "fix bug", "fix error", "debug" in natuurlijke taal) wanneer je een specifieke bug hebt om te diagnosticeren en te fixen. De workflow biedt een gestructureerde, reproduceerbare benadering van debugging die de veelvoorkomende valkuil vermijdt van symptomen fixen in plaats van oorzaken.

De debug-workflow ondersteunt alle leveranciers (Gemini, Claude, Codex, Qwen). Stappen 1-5 draaien inline. Stap 6 (vergelijkbare patronenscanning) kan delegeren aan een `debug-investigator` subagent wanneer de scanscope breed is (10+ bestanden of multi-domein fouten).

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
| **Screenshots/opnames** | Visueel bewijs |

Hoe meer context je vooraf geeft, hoe minder heen-en-weer vragen de debug-workflow nodig heeft.

---

## Ernsttriage (P0-P3)

### P0 — Kritiek (Onmiddellijke Respons)

**Definitie:** Productie is down, data gaat verloren of raakt beschadigd, beveiligingsinbreuk is actief.

**Verwachte respons:** Drop alles. Dit is de enige taak totdat het is opgelost.

**Voorbeelden:**
- Authenticatiesysteem is omzeild — alle gebruikers hebben toegang tot admin-endpoints.
- Databasemigratie heeft de gebruikerstabel beschadigd — accounts zijn onbereikbaar.
- Betalingsverwerking rekent klanten dubbel af.

**Debugbenadering:** Sla het volledige sjabloon over. Geef de foutmelding en eventuele stacktrace. De workflow start direct bij Stap 2 (Reproduceren).

### P1 — Hoog (Dezelfde Sessie)

**Definitie:** Een kernfunctie is kapot voor een aanzienlijk aantal gebruikers. Workaround kan bestaan maar is niet acceptabel op lange termijn.

**Verwachte respons:** Fix binnen de huidige werksessie. Begin niet aan nieuwe functies tot het is opgelost.

**Debugbenadering:** Volledige 5-stappenlus. QA-review aanbevolen na de fix.

### P2 — Gemiddeld (Deze Sprint)

**Definitie:** Een functie werkt maar met verminderd gedrag. Beinvloedt bruikbaarheid maar niet functionaliteit.

**Verwachte respons:** Inplannen voor de huidige sprint. Fixen voor de volgende release.

**Debugbenadering:** Volledige 5-stappenlus. Opnemen in QA-regressiesuite.

### P3 — Laag (Backlog)

**Definitie:** Cosmetisch probleem, edge case of klein ongemak.

**Verwachte respons:** Toevoegen aan backlog. Fixen wanneer het uitkomt, of bundelen met gerelateerde wijzigingen.

**Debugbenadering:** Heeft mogelijk niet de volledige debuglus nodig. Directe fix met regressietest volstaat.

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

## Promptsjabloon voor /debug

Bij het starten van de debug-workflow kun je een gestructureerde prompt geven:

```
/debug

Error: TypeError: Cannot read properties of undefined (reading 'id')
Stack trace:
  at deleteUser (src/api/users.ts:47:23)
  at handleDelete (src/routes/users.ts:112:5)

Steps to reproduce:
1. Log in as admin
2. Navigate to /users
3. Click "Delete" on a user whose organization was deleted

Expected: User is deleted
Actual: 500 Internal Server Error

Environment: Node 22.1, PostgreSQL 16
```

**Waarom deze structuur werkt:**

- **Foutmelding + stacktrace** stelt Stap 2 in staat om de code direct te lokaliseren (`search_for_pattern` met "deleteUser" vindt de functie; `find_symbol` wijst de exacte locatie aan).
- **Reproductiestappen** met de specifieke triggerconditie ("gebruiker wiens organisatie is verwijderd") geven een hint over de oorzaak (null foreign key).
- **Omgeving** sluit versiespecifieke afleidingsmanoeuvres uit.

Voor eenvoudigere bugs werkt een kortere prompt ook:

```
/debug The login page shows "Invalid credentials" even with correct password
```

De workflow vraagt indien nodig om aanvullende details.

---

## Escalatiesignalen

### Signaal 1: Dezelfde Fix Twee Keer Geprobeerd

Als de workflow een fix voorstelt, toepast en dezelfde fout opnieuw optreedt, is het probleem dieper dan de eerste diagnose. Dit activeert de **Exploratieslus** in workflows die dit ondersteunen (ultrawork, orchestrate, coordinate):

- Genereer 2-3 alternatieve hypothesen voor de oorzaak.
- Test elke hypothese in een aparte werkruimte (git stash per poging).
- Scoor resultaten en neem de beste benadering over.

### Signaal 2: Multi-Domein Oorzaak

De fout in de frontend wordt veroorzaakt door een backend-wijziging die wordt veroorzaakt door een databaseschemamigratie. Wanneer de oorzaak domeingrenzen overschrijdt, escaleer naar `/coordinate` of `/orchestrate` om de relevante domeinagenten te betrekken.

**Voorbeeld:** Frontend toont "undefined" voor gebruikersnaam. Backend retourneert null voor `user.display_name`. Databasemigratie heeft de kolom toegevoegd, maar bestaande rijen hebben NULL-waarden. Fix vereist: databasemigratie (backfill), backend null-afhandeling en frontend fallback-weergave.

### Signaal 3: Ontbrekende Reproductieomgeving

De bug treedt alleen op in productie en is lokaal niet te reproduceren. Signalen zijn onder andere:
- Omgevingsspecifieke configuratieverschillen.
- Race conditions die alleen onder productiebelasting optreden.
- Afwijkend gedrag van externe services tussen staging en productie.

**Actie:** Verzamel productielogs, vraag toegang tot productiemonitoring en overweeg instrumentatie/logging toe te voegen voordat je een fix probeert.

### Signaal 4: Testinfrastructuur Kapot

De regressietest kan niet worden geschreven omdat de testinfrastructuur kapot, afwezig of ontoereikend is.

**Actie:** Fix eerst de testinfrastructuur (of gebruik `/setup` om deze te configureren) en keer daarna terug naar de debug-workflow.

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

## Gereedcriteria

1. Oorzaak geïdentificeerd en gedocumenteerd
2. Minimale fix toegepast met gebruikersgoedkeuring
3. Regressietest bestaat
4. Codebase gescand op vergelijkbare patronen
5. Bugrapport vastgelegd in geheugen
6. Alle bestaande tests slagen nog
