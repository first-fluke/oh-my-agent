---
title: KI-Code vor dem Merge prüfen
description: Prüfen Sie von KI geschriebenen Code auf Fehler, fehlende Prüfungen und Regressionen anhand eines abgegrenzten Diffs und reproduzierbarer Befunde.
---

# KI-Code vor dem Merge prüfen

Verwenden Sie `oma-qa`, um eine Änderung gegen ihr beabsichtigtes Verhalten zu prüfen. Beginnen Sie mit dem Diff und den vorhandenen Prüfungen des Projekts.

## Den Skill laden

Bitten Sie Ihren Coding-Agenten, diesen Befehl auszuführen und danach die zurückgegebenen Anweisungen sowie das Support-Verzeichnis zu lesen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## Die Eingabe bereitstellen

- Die Änderung oder eine lokale Vergleichsreferenz, etwa `origin/main`.
- Das erwartete Verhalten, besonders Berechtigungen, Datenänderungen und Fehlerbehandlung.
- Vorhandene Lint- und Testbefehle sowie Grenzen der Umgebung.

## Die Aufgabe stellen

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Das Ergebnis prüfen

Erwarten Sie geordnete Befunde mit einer Reproduktion oder entscheidendem Codebeleg, einem Korrekturvorschlag und den tatsächlich ausgeführten Befehlen. Wenn kein Defekt bestätigt wird, soll der Bericht trotzdem den geprüften Umfang und die verbleibenden Lücken nennen.

Öffnen Sie jede zitierte Stelle und prüfen Sie, dass der Auslöser sie erreicht. Führen Sie die enge Prüfung erneut aus, die als Beleg diente. Ein fehlendes Werkzeug oder ein ungetesteter Pfad ist eine Verifikationslücke; eine Review-Zusammenfassung allein belegt nicht, dass die Änderung auslieferbar ist.

## Abhängigkeiten und nächster Schritt

Der Agent braucht Zugriff auf den Diff, den lokalen Quellcode und die vorhandenen Prüfwerkzeuge des Projekts. Prüfungen von Browser, Sicherheit und Leistung brauchen das jeweilige Ziel und die zugehörigen Werkzeuge. Das Laden des Skills stellt diese Abhängigkeiten nicht bereit.

Bei einem bestätigten Fehler fahren Sie mit [Einen fehlschlagenden Test debuggen](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/) fort. Wenn Sie Projekt-Hooks oder Team-Workflows wollen, [wählen Sie eine Laufzeiteinrichtung](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset), die `oma-qa` enthält.
