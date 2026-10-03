---
title: "Gids: Bugs oplossen"
sidebar_label: Bugs oplossen
description: Gestructureerde debugworkflow in zeven fasen met ernsttriage, escalatiesignalen, een diagnose op basis van broncode en validatie na de fix.
---

# Bugs oplossen

## Wanneer gebruik je de debugworkflow?

Gebruik `/debug` (of zeg in natuurlijke taal "fix bug", "fix error" of "debug") wanneer je een specifieke bug wilt diagnosticeren en oplossen. De workflow biedt een gestructureerde, reproduceerbare aanpak die de veelgemaakte fout voorkomt waarbij alleen symptomen worden opgelost in plaats van de hoofdoorzaak.

De debugworkflow ondersteunt alle geconfigureerde vendors. Fasen 1–5 draaien inline. Fase 6 (scannen op vergelijkbare patronen) kan een `debug-investigator`-subagent delegeren wanneer de scope breed is (10+ bestanden of fouten over meerdere domeinen), gevolgd door de geheugenregistratie in fase 7.

---

## Bugsjabloon

Geef bij het melden van een bug zo veel mogelijk van de volgende informatie. Elk veld helpt de debugworkflow de zoekactie sneller te beperken.

### Vereiste velden

| Veld | Beschrijving | Voorbeeld |
|:-----|:-------------|:---------|
| **Foutmelding** | De exacte fouttekst of stacktrace | `TypeError: Cannot read properties of undefined (reading 'id')` |
| **Stappen om te reproduceren** | Geordende acties die de bug activeren | 1. Log in als admin. 2. Ga naar /users. 3. Klik op "Delete" bij een gebruiker. |
| **Verwacht gedrag** | Wat er zou moeten gebeuren | De gebruiker wordt verwijderd en verdwijnt uit de lijst. |
| **Werkelijk gedrag** | Wat er daadwerkelijk gebeurt | De pagina crasht met een wit scherm. |

### Optionele velden (sterk aanbevolen)

<!-- oma-docs:ignore-start -->
| Veld | Beschrijving | Voorbeeld |
|:-----|:-------------|:---------|
| **Omgeving** | Browser, OS, Node-versie, apparaat | Chrome 124, macOS 15.3, Node 22.1 |
| **Frequentie** | Altijd, soms, alleen de eerste keer | Altijd reproduceerbaar |
| **Recente wijzigingen** | Wat er veranderde voordat de bug verscheen | PR #142 gemerged (functie voor gebruikers verwijderen) |
| **Gerelateerde code** | Bestanden of functies die je verdenkt | `src/api/users.ts`, `deleteUser()` |
| **Logs** | Serverlogs, console-uitvoer | `[ERROR] UserService.delete: user.organizationId is undefined` |
| **Screenshots/opnamen** | Visueel bewijs | Screenshot van het foutscherm |
<!-- oma-docs:ignore-end -->

Hoe meer context je vooraf geeft, hoe minder heen-en-weer de debugworkflow nodig heeft.

---

## Ernsttriage (P0–P3)

De ernst bepaalt hoe de bug wordt behandeld en hoe snel deze moet worden opgelost.

### P0: kritiek (onmiddellijke respons)

**Definitie:** De productieomgeving ligt plat, data gaat verloren of raakt beschadigd, of er is een actieve securitybreuk.

**Verwachting:** Laat alles vallen. Dit is de enige taak totdat het probleem is opgelost.

**Voorbeelden:**

- Het authenticatiesysteem wordt omzeild; alle gebruikers hebben toegang tot admin-endpoints.
- Een databasemigratie heeft de userstabel beschadigd; accounts zijn ontoegankelijk.
- Betalingen worden dubbel afgeschreven.
- Een API-endpoint geeft persoonsgegevens van andere gebruikers terug.

**Debugaanpak:** Sla het volledige sjabloon over. Geef de foutmelding en eventuele stacktrace. De workflow start onmiddellijk bij stap 2 (Reproduceren).

### P1: hoog (dezelfde sessie)

**Definitie:** Een kernfunctie werkt niet voor een aanzienlijk aantal gebruikers. Er kan een workaround bestaan, maar die is op lange termijn niet acceptabel.

**Verwachting:** Los het probleem binnen de huidige werksessie op. Start geen nieuwe features totdat het is opgelost.

**Voorbeelden:**

- Zoeken geeft geen resultaten voor query's met speciale tekens.
- Uploaden mislukt voor bestanden groter dan 5 MB (de limiet hoort 50 MB te zijn).
- De mobileapp crasht bij het opstarten op Android 14-apparaten.
- E-mails voor het opnieuw instellen van een wachtwoord worden niet verzonden (de integratie met de e-mailservice is defect).

**Debugaanpak:** Doorloop de volledige lus van zeven fasen. Een QA-review na de fix wordt aanbevolen.

### P2: gemiddeld (deze sprint)

**Definitie:** Een feature werkt, maar met verminderd gedrag. De bruikbaarheid is minder, zonder dat de functionaliteit ontbreekt.

**Verwachting:** Plan dit voor de huidige sprint. Los het op vóór de volgende release.

**Voorbeelden:**

- Tabelsortering is hoofdlettergevoelig ("apple" komt na "Zebra").
- Dark mode gebruikt onleesbare tekst in het instellingenpaneel.
- De responstijd van het `/users`-endpoint is 8 seconden (deze hoort minder dan 1 seconde te zijn).
- Paginering toont "Pagina 1 van 0" wanneer de lijst leeg is.

**Debugaanpak:** Doorloop de volledige lus van zeven fasen. Neem de bug op in de QA-regressiesuite.

### P3: laag (backlog)

**Definitie:** Een cosmetisch probleem, edge case of klein ongemak.

**Verwachting:** Zet het op de backlog. Los het op wanneer het uitkomt of bundel het met verwante wijzigingen.

**Voorbeelden:**

- De tooltip bevat een typefout: "Delet" in plaats van "Delete".
- Een consolewaarschuwing over een verouderde React-lifecyclemethode.
- De footer is 2 pixels verkeerd uitgelijnd bij viewportbreedtes tussen 768 en 800 px.
- De laadspinner blijft 200 ms zichtbaar nadat de content al zichtbaar is.

**Debugaanpak:** De volledige debuglus is mogelijk niet nodig. Een directe fix met regressietest volstaat.

---

## De debuglus in zeven fasen

De workflow `/debug` voert deze fasen in volgorde uit. Hij gebruikt de geconfigureerde code-intelligenceprovider. Native search is alleen bedoeld voor paden buiten het project of genegeerde paden wanneer die provider niet beschikbaar is of een timeout geeft.

### Stap 1: foutinformatie verzamelen

De workflow vraagt de gebruiker om de volgende informatie, of ontvangt die al:

- Foutmelding en stacktrace
- Stappen om te reproduceren
- Verwacht gedrag tegenover werkelijk gedrag
- Details over de omgeving

Als de prompt al een foutmelding bevat, gaat de workflow direct door naar stap 2.

### Stap 2: de bug reproduceren

**Gebruikte tools:** de geconfigureerde search- en symboltools, of native `rg` en scoped reads wanneer de geconfigureerde tools niet beschikbaar zijn.

Het doel is de fout in de codebase te lokaliseren: vind de exacte regel waar de exception wordt gegooid, de exacte functie die verkeerde output produceert of de exacte conditie die het onverwachte gedrag veroorzaakt.

Deze stap zet een door de gebruiker gemeld symptoom ("de pagina crasht") om in een locatie op codeniveau (`src/api/users.ts:47, deleteUser() throws TypeError`).

### Stap 3: de hoofdoorzaak diagnosticeren

**Gebruikte tools:** referentie- en symboolnavigatie wanneer beschikbaar, gevolgd door gerichte native reads wanneer dat niet zo is.

De workflow traceert vanaf de foutlocatie terug om de werkelijke oorzaak te vinden. Daarbij controleert de workflow deze veelvoorkomende patronen:

| Patroon | Waar je op let |
|:--------|:---------------|
| **Null/undefined-toegang** | Ontbrekende null-checks, benodigde optional chaining, niet-geïnitialiseerde variabelen |
| **Raceconditions** | Asynchrone bewerkingen die in de verkeerde volgorde klaar zijn, ontbrekende `await`, gedeelde mutable state |
| **Ontbrekende foutafhandeling** | Ontbrekende try/catch, niet afgehandelde promise rejection, ontbrekende error boundary |
| **Verkeerde datatypes** | String waar een getal wordt verwacht, ontbrekende typeconversie, incorrect schema |
| **Verouderde state** | React-state wordt niet bijgewerkt, gecachte waarden worden niet geïnvalideerd, closure legt oude waarde vast |
| **Ontbrekende validatie** | Gebruikersinvoer niet geschoond, requestbody niet gevalideerd, niet-gecontroleerde grenswaarden |

Diagnosticeer de hoofdoorzaak, niet het symptoom. Als `user.id` undefined is, vraag je waarom `user` op dit punt in het uitvoeringspad undefined is, niet alleen hoe je undefined kunt afvangen.

### Stap 4: een minimale fix voorstellen

De workflow presenteert:

1. De vastgestelde hoofdoorzaak (met bewijs uit de codetrace).
2. De voorgestelde fix (alleen wat nodig is aanpassen).
3. Een uitleg waarom dit de hoofdoorzaak oplost en niet alleen het symptoom.

De workflow presenteert het voorstel vóór het bewerken. Er wordt om bevestiging gevraagd wanneer de wijziging niet al door het verzoek of het uitvoeringsbeleid is geautoriseerd; bestaande autorisatie maakt een tweede prompt overbodig.

**Principe van de minimale fix:** Wijzig zo weinig mogelijk regels. Refactor niet, verbeter de codestijl niet en voeg geen ongerelateerde features toe. De fix moet in minder dan 2 minuten te reviewen zijn.

### Stap 5: de fix toepassen en een regressietest schrijven

In deze stap gebeuren twee dingen:

1. **De fix implementeren:** De goedgekeurde minimale wijziging wordt toegepast.
2. **Een regressietest schrijven:** Een test die:
   - De oorspronkelijke bug reproduceert (zonder de fix moet de test falen)
   - Controleert dat de fix werkt (met de fix moet de test slagen)
   - Voorkomt dat dezelfde bug in toekomstige wijzigingen terugkomt

De regressietest is het belangrijkste resultaat van de debugworkflow. Zonder test kan elke toekomstige wijziging dezelfde bug opnieuw introduceren.

### Stap 6: op vergelijkbare patronen scannen

Na de fix scant de workflow de hele codebase op hetzelfde patroon dat de bug veroorzaakte.

**Gebruikte tools:** de geconfigureerde pattern search of een scoped native search met het patroon dat als hoofdoorzaak is gevonden.

Als de bug bijvoorbeeld ontstond door toegang tot `user.organization.id` zonder te controleren of `organization` null is, zoekt de scan naar alle andere gevallen waarin `organization.id` zonder null-check wordt gebruikt.

**Criteria voor subagentdelegatie:** De workflow start een `debug-investigator`-subagent wanneer:

- De fout meerdere domeinen raakt (bijvoorbeeld frontend én backend).
- De scan op vergelijkbare patronen 10+ bestanden omvat.
- Diepe dependency-tracing nodig is voor een volledige diagnose.

Vendorspecifieke spawnmethoden:

| Vendor | Spawnmethode |
|:-------|:-------------|
| Claude Code | Agenttool met `.claude/agents/debug-investigator.md` |
| Codex CLI | Modelgestuurd subagentverzoek, resultaten als JSON |
| Gemini CLI | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |
| Antigravity / fallback | `oma agent spawn debug "scan prompt" {session_id} -w {workspace}` |

Alle kwetsbare locaties die overeenkomen worden gerapporteerd. Bevestigde gevallen worden in dezelfde sessie opgelost.

### Stap 7: de bug documenteren

De workflow schrijft een memorybestand met:

- Symptoom en hoofdoorzaak
- Toegepaste fix en gewijzigde bestanden
- Locatie van de regressietest
- Vergelijkbare patronen die in de codebase zijn gevonden

---

## Promptsjabloon voor /debug

Bij het starten van de debugworkflow kun je een gestructureerde prompt geven:

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

- **Error + stack trace** maakt het mogelijk stap 2 direct naar de code te laten springen (`search_for_pattern` met "deleteUser" vindt de functie; `find_symbol` wijst de exacte locatie aan).
- **Stappen om te reproduceren** met de specifieke triggerconditie ("user whose organization was deleted") wijzen op de hoofdoorzaak (null foreign key).
- **Omgeving** sluit versiegebonden dwaalsporen uit.

Voor eenvoudiger bugs werkt een kortere prompt:

```
/debug The login page shows "Invalid credentials" even with correct password
```

De workflow vraagt indien nodig om aanvullende details.

---

## Escalatiesignalen

Deze signalen wijzen erop dat de bug verder moet worden geëscaleerd dan de standaarddebuglus:

### Signaal 1: dezelfde fix twee keer geprobeerd

Als de workflow een fix voorstelt, toepast en dezelfde fout opnieuw optreedt, ligt het probleem dieper dan de eerste diagnose. Heroverweeg de oorzaak. Als alternatieven het testen waard zijn en het bestaande herstelbudget dat toelaat, gebruik je de **Exploration Loop** in de actieve workflow (ultrawork, orchestrate, work):

- Genereer 2–3 alternatieve hypothesen voor de hoofdoorzaak.
- Isoleer elk experiment en bewaar de baseline, de evidence en ongerelateerd werk.
- Kies een aanpak die voldoet aan het vereiste gedrag en aan vergelijkbare meetcriteria en verifieer daarna het geïntegreerde resultaat.

### Signaal 2: hoofdoorzaak over meerdere domeinen

De fout in de frontend wordt veroorzaakt door een backendwijziging die op zijn beurt door een databaseschemamigratie komt. Als de hoofdoorzaak domeingrenzen overschrijdt, escaleer je naar `/work` of `/orchestrate` om de relevante domeinagents in te schakelen.

**Voorbeeld:** De frontend toont "undefined" als gebruikersnaam. De backend geeft `null` terug voor `user.display_name`. De databasemigratie heeft de kolom toegevoegd, maar bestaande rijen hebben NULL-waarden. De fix vereist: databasebackfill, null-afhandeling in de backend en een fallbackweergave in de frontend.

### Signaal 3: ontbrekende reproductieomgeving

De bug treedt alleen in productie op en kan lokaal niet worden gereproduceerd. Signalen zijn:

- Omgevingsspecifieke configuratieverschillen.
- Raceconditions die alleen onder productielast zichtbaar worden.
- Ander gedrag van externe services tussen staging en productie.

**Actie:** Verzamel productielogs, vraag toegang tot productiemonitoring en overweeg instrumentation/logging toe te voegen voordat je een fix probeert.

### Signaal 4: testinfrastructuur faalt

De regressietest kan niet worden geschreven omdat de testinfrastructuur defect, ontbrekend of ontoereikend is.

**Actie:** Herstel eerst de testinfrastructuur (of gebruik `oma install` om deze te configureren) en keer daarna terug naar de debugworkflow. Als een uitvoerbare controle niet van toepassing is, leg je de reden vast in het result contract in plaats van een geslaagde controle te verzinnen.

---

## Checklist voor validatie na de fix

Controleer na de fix en de regressietest:

- [ ] **Regressietest faalt zonder de fix:** draai de fix tijdelijk terug en bevestig dat de test de bug vangt.
- [ ] **Regressietest slaagt met de fix:** pas de fix opnieuw toe en bevestig dat de test slaagt.
- [ ] **Relevante bestaande controles slagen:** voer de projectcontroles uit die het gewijzigde gedrag dekken. Voer alleen een build uit wanneer de taak daar expliciet om vraagt.
- [ ] **Op vergelijkbare patronen gescand:** stap 6 is voltooid en alle gevonden gevallen zijn opgelost of gedocumenteerd.
- [ ] **Fix is minimaal:** alleen noodzakelijke regels zijn gewijzigd. Er is geen ongerelateerde refactoring toegevoegd.
- [ ] **Hoofdoorzaak gedocumenteerd:** het memorybestand bevat symptoom, hoofdoorzaak, toegepaste fix, gewijzigde bestanden, locatie van de regressietest en gevonden vergelijkbare patronen.

---

## Gereedcriteria

De debugworkflow is voltooid wanneer:

1. De hoofdoorzaak is vastgesteld en gedocumenteerd (niet alleen het symptoom).
2. Onder de autorisatie van de taak is een minimale fix toegepast.
3. Er een regressietest bestaat die zonder de fix faalt en met de fix slaagt.
4. De codebase op vergelijkbare patronen is gescand en alle bevestigde gevallen zijn aangepakt.
5. Een bugrapport in memory is vastgelegd met symptoom, hoofdoorzaak, toegepaste fix, gewijzigde bestanden, locatie van de regressietest en gevonden vergelijkbare patronen.
6. Alle bestaande tests blijven slagen na de fix.
