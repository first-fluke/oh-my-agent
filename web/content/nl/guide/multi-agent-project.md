---
title: "Gids: Multi-Agent Projecten"
description: Volledige gids voor het coordineren van meerdere domeinagenten over frontend, backend, database, mobile en QA — van planning tot merge.
---

# Gids: Multi-Agent Projecten

## Wanneer Multi-Agent Coordinatie Gebruiken

Je functie beslaat meerdere domeinen — backend API + frontend UI + databaseschema + mobiele client + QA-review. Een enkele agent kan de volledige scope niet aan, en je hebt de domeinen nodig om parallel voortgang te maken zonder elkaars bestanden te raken.

Multi-agent coordinatie is de juiste keuze wanneer:
- De taak 2 of meer domeinen omvat
- Er API-contracten zijn tussen domeinen
- Je parallelle uitvoering wilt om de doorlooptijd te verkorten
- Je QA-review nodig hebt na implementatie over alle domeinen

---

## De Volledige Sequentie: /plan tot /review

### Stap 1: /plan — Requirements en Taakdecompositie

De `/plan`-workflow draait inline en produceert een gestructureerd plan: requirements verzamelen, technische haalbaarheid analyseren, API-contracten definieren, ontleden in taken, reviewen met gebruiker, plan opslaan in `.agents/plan.json`.

### Stap 2: /work of /orchestrate — Uitvoering

| Aspect | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interactie** | Interactief — gebruiker bevestigt bij elke fase | Geautomatiseerd — draait tot voltooiing |
| **PM planning** | Ingebouwd | Vereist plan.json van /plan |
| **Persistent mode** | Ja | Ja |
| **Geschikt voor** | Eerste gebruik, complex projecten met toezicht | Herhaalde runs, goed gedefinieerde taken |

### Stap 3: agent:spawn — CLI-Niveau Agentbeheer

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

### Stap 4: /review — QA Verificatie

Volledige QA-pipeline: geautomatiseerde beveiligingscontroles, OWASP Top 10, prestatieanalyse, toegankelijkheid (WCAG 2.1 AA), codekwaliteitsreview.

---

## Contract-First Regel

API-contracten zijn het synchronisatiemechanisme tussen agenten. Contracten worden gedefinieerd voor implementatie begint, elke agent ontvangt relevante contracten als context, en contractschendingen worden gevangen tijdens monitoring.

---

## Merge-Poorten: 4 Voorwaarden

1. **Build slaagt** — Alle code compileert zonder fouten
2. **Tests slagen** — Alle bestaande tests blijven slagen plus nieuwe tests
3. **Alleen geplande bestanden gewijzigd** — Agenten wijzigen geen bestanden buiten hun scope
4. **QA Review schoon** — Geen CRITICAL of HIGH bevindingen

---

## Anti-Patronen om te Vermijden

1. **Plan overslaan** — `/orchestrate` zonder plan.json weigert door te gaan
2. **Overlappende werkruimten** — Twee agenten in dezelfde directory creert conflicten
3. **Ontbrekende API-contracten** — Leidt tot incompatibele aannames
4. **QA-bevindingen negeren** — CRITICAL/HIGH bevindingen zijn echte bugs
5. **Handmatige bestandscoordinatie** — Laat de geautomatiseerde pipeline het doen
6. **Over-parallelisatie** — P1-taken draaien voor P0 klaar is
7. **Verificatie overslaan** — Bouw- en testfouten planten zich voort

---

## Cross-Domein Integratievalidatie

Na voltooiing van alle agenten: API-contractuitlijning, typeconsistentie, authenticatiestroom, foutafhandeling en databaseschema-uitlijning verifieren.

---

## Wanneer Het Klaar Is

Een multi-agent project is compleet wanneer: alle agenten succesvol voltooid, verificatiescripts slagen, QA nul CRITICAL/HIGH rapporteert, API-contractuitlijning bevestigd, build slaagt, tests slagen, en gebruiker eindgoedkeuring geeft.
