---
title: AI-code reviewen vóór de merge
description: Review door AI geschreven code op bugs, ontbrekende controles en regressies, met een afgebakende diff en reproduceerbare bevindingen.
---

# AI-code reviewen vóór de merge

Gebruik `oma-qa` om een wijziging te reviewen tegen het bedoelde gedrag. Begin met de diff en de bestaande controles van het project.

## De skill laden {#load-the-skill}

Vraag je coding-agent dit commando uit te voeren en daarna de teruggegeven instructies en ondersteuningsmap te lezen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## De invoer aanleveren {#provide-the-input}

- De wijziging of een lokale vergelijkingsref, zoals `origin/main`.
- Het verwachte gedrag, vooral rechten, datawijzigingen en foutafhandeling.
- Bestaande lint- en testcommando's en eventuele omgevingslimieten.

## De taak geven {#give-the-task}

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Het resultaat controleren {#check-the-result}

Verwacht geordende bevindingen met een reproductie of beslissend codebewijs, een voorgestelde fix en de commando's die werkelijk zijn uitgevoerd. Als geen defect is bevestigd, moet het rapport nog steeds de geïnspecteerde scope en de resterende gaten noemen.

Open elke aangehaalde locatie en controleer dat de trigger daar aankomt. Voer de smalle controle die als bewijs is gebruikt opnieuw uit. Een ontbrekende tool of een ongetest pad is een verificatiegat; een reviewsamenvatting alleen stelt niet vast dat de wijziging veilig is om uit te leveren.

## Afhankelijkheden en volgende stap {#dependencies-and-next-step}

De agent heeft toegang nodig tot de diff, de lokale bron en de bestaande controletools van het project. Browser-, security- en prestatiecontroles hebben het bijbehorende doel en de bijbehorende tooling nodig. Het laden van de skill voorziet die afhankelijkheden niet.

Ga bij een bevestigde fout verder met [een falende test debuggen](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). Wil je projecthooks of teamworkflows, kies dan [een runtime-setup](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset) die `oma-qa` bevat.
