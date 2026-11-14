---
title: Einen fehlschlagenden Test debuggen
description: Reproduzieren Sie einen Testfehler, grenzen Sie die Ursache ein, nehmen Sie eine begrenzte Korrektur vor und prüfen Sie die Regression mit dem vorhandenen Test-Runner des Projekts.
---

# Einen fehlschlagenden Test debuggen

Verwenden Sie `oma-debug`, wenn Sie einen fehlschlagenden Befehl, einen Stacktrace oder ein wiederholbares falsches Ergebnis haben.

## Den Skill laden

Bitten Sie Ihren Coding-Agenten, diesen Befehl auszuführen und seine Anweisungen sowie das Support-Verzeichnis zu lesen:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Die Eingabe bereitstellen

- Den genauen fehlschlagenden Befehl und die vollständige relevante Fehlerausgabe.
- Erwartetes Verhalten, Checkout/Ref, Laufzeitversion und erforderliche lokale Dienste.
- Die Dateien oder die jüngste Änderung, die Sie vermuten, plus den erlaubten Bearbeitungsbereich.

## Die Aufgabe stellen

Dieses konkrete Beispiel verwendet die Plugin-Bootstrap-Regressionsfixtures dieses Repositorys. Verwenden Sie für ein anderes Projekt Ihren eigenen fehlschlagenden Befehl.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Das Ergebnis prüfen

Erwarten Sie den reproduzierten Fehler, seinen Ursachenpfad, den abgegrenzten Patch und einen Regressionstest, der an diesen Fehler gebunden ist. Der Bericht soll eine nicht verfügbare Umgebung von einem diagnostizierten Codefehler trennen.

Prüfen Sie, dass die Regression beim ursprünglichen Verhalten fehlschlägt und mit der Korrektur besteht. Führen Sie den angegebenen Befehl in derselben Umgebung erneut aus und prüfen Sie dann die Ergebnisse verwandter Tests. Wenn die Reproduktion blockiert bleibt, erwarten Sie den genauen Blocker und die schwächeren verfügbaren Belege.

## Abhängigkeiten und nächster Schritt

Der Agent verwendet den Test-Runner Ihres Projekts und die konfigurierten Werkzeuge zur Quellnavigation. Das Beispiel setzt vorhandene Bun- und Entwicklungsabhängigkeiten des Repositorys voraus. Diese Plugin-Fixtures werden unter Windows übersprungen; verwenden Sie einen fehlschlagenden Test, den Ihre Plattform unterstützt. Das Laden des Skills installiert keine Abhängigkeiten und repariert keinen fehlenden Dienst.

Siehe das [Beispiel zur Reparatur von Plugin-Hooks](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/) für die tatsächliche Quelländerung und die Fixture-Grenzen. Für verwaltete Ausführung oder Projekt-Hooks [wählen Sie eine Laufzeiteinrichtung](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset), die `oma-debug` enthält.
