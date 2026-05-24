---
title: "Gids: Multi-Agent Projecten"
description: Volledige gids voor het coördineren van meerdere domeinagenten over frontend, backend, database, mobile en QA — van planning tot merge.
---

# Gids: Multi-Agent Projecten

## Wanneer multi-agent coördinatie gebruiken

Je functie beslaat meerdere domeinen — backend API + frontend UI + databaseschema + mobiele client + QA-review. Een enkele agent kan de volledige scope niet aan, en je hebt de domeinen nodig om parallel voortgang te maken zonder elkaars bestanden te raken.

Multi-agent coördinatie is de juiste keuze wanneer:
- De taak 2 of meer domeinen omvat
- Er API-contracten zijn tussen domeinen
- Je parallelle uitvoering wilt om de doorlooptijd te verkorten
- Je QA-review nodig hebt na implementatie over alle domeinen

---

## De volledige sequentie: /plan tot /review

### Stap 1: /plan — requirements en taakdecompositie

De `/plan`-workflow draait inline en produceert een gestructureerd plan: requirements verzamelen, technische haalbaarheid analyseren, API-contracten definieren, ontleden in taken, reviewen met gebruiker, plan opslaan in `.agents/results/plan-{sessionId}.json`.

### Stap 2: /work of /orchestrate — uitvoering

| Aspect | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interactie** | Interactief — gebruiker bevestigt bij elke fase | Geautomatiseerd — draait tot voltooiing |
| **PM planning** | Ingebouwd | Vereist plan van /plan |
| **Persistent mode** | Ja | Ja |
| **Geschikt voor** | Eerste gebruik, complex projecten met toezicht | Herhaalde runs, goed gedefinieerde taken |

### Stap 3: agent:spawn — CLI-Niveau agentbeheer

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

### Stap 4: /review — QA verificatie

Volledige QA-pipeline: geautomatiseerde beveiligingscontroles, OWASP Top 10, prestatieanalyse, toegankelijkheid (WCAG 2.1 AA), codekwaliteitsreview.

---

## Contract-first regel

API-contracten zijn het synchronisatiemechanisme tussen agenten. Contracten worden gedefinieerd voor implementatie begint, elke agent ontvangt relevante contracten als context, en contractschendingen worden gevangen tijdens monitoring.

---

## Merge-poorten: 4 voorwaarden

1. **Build slaagt** — Alle code compileert zonder fouten
2. **Tests slagen** — Alle bestaande tests blijven slagen plus nieuwe tests
3. **Alleen geplande bestanden gewijzigd** — Agenten wijzigen geen bestanden buiten hun scope
4. **QA Review schoon** — Geen CRITICAL of HIGH bevindingen

---

## Anti-patronen om te vermijden

1. **Plan overslaan** — `/orchestrate` zonder plan file weigert door te gaan
2. **Overlappende werkruimten** — Twee agenten in dezelfde directory creert conflicten
3. **Ontbrekende API-contracten** — Leidt tot incompatibele aannames
4. **QA-bevindingen negeren** — CRITICAL/HIGH bevindingen zijn echte bugs
5. **Handmatige bestandscoördinatie** — Laat de geautomatiseerde pipeline het doen
6. **Over-parallelisatie** — P1-taken draaien voor P0 klaar is
7. **Verificatie overslaan** — Bouw- en testfouten planten zich voort

---

## Cross-domein integratievalidatie

Na voltooiing van alle agenten: API-contractuitlijning, typeconsistentie, authenticatiestroom, foutafhandeling en databaseschema-uitlijning verifieren.

---

## Wanneer het klaar is

Een multi-agent project is compleet wanneer: alle agenten succesvol voltooid, verificatiescripts slagen, QA nul CRITICAL/HIGH rapporteert, API-contractuitlijning bevestigd, build slaagt, tests slagen, en gebruiker eindgoedkeuring geeft.
