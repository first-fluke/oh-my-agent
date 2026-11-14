---
title: Plugin-Hooks und Projekt-Bootstrap reparieren
description: Wie Pfade von Marketplace-Hooks, die Bash-Bereitstellung und Ausführungsbelege des Projekt-Bootstraps mit Regressionsfixtures repariert wurden.
---

# Plugin-Hooks und Projekt-Bootstrap reparieren

Die Plugin-Reparatur in [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) betraf Hook-Dispatch und das Bootstrap-Verhalten. Ihr Parent, `82649cbd`, liefert den Zustand davor für diesen Vergleich.

## Fehlermechanismus

Das [alte Hook-Manifest](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) rief Dateien unter `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/` auf. Diese Pfade hängen von erzeugten Dateien ab; die Fixture mit einem frischen Plugin-Cache lässt sie aus dem Plugin-Verzeichnis heraus.

Der [alte Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) führte den heruntergeladenen Bash-Installer außerdem über `sh -c` aus. Seine Erfolgsmarkierung lag in gemeinsamen Plugin-Daten, und der schnelle Pfad prüfte nur diese Markierung, die CLI-Version und das Vorhandensein der Einstellungsdatei des Projekts. Ein zweites Projekt mit einer Einstellungsdatei konnte deshalb seine eigene Verdrahtung überspringen.

## Reparatur

Der [neue Dispatcher](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) ruft die installierte CLI auf. Wenn ein passender ausführbarer Projekt-Hook das Ereignis bereits besitzt, tritt der Marketplace-Hook zurück, damit das Ereignis nicht zweimal dispatcht wird.

Der [neue Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh):

- Führt den Bash-Installer über Bash aus und prüft Fehler bei der Bereitstellung.
- Erzwingt die Projektinstallation auch dann, wenn eine Einstellung für die globale Installation geerbt wird.
- Speichert den Ausführungsbeleg (Receipt) in `.agents/state/plugin-bootstrap.version` dieses Projekts.
- Prüft Konfiguration, Versionsmetadaten, den ausführbaren Wrapper und registrierte Ereignisse, bevor ein Ausführungsbeleg wiederverwendet wird.
- Behält Diagnosen fehlgeschlagener Installationen in `.agents/state/plugin-bootstrap.last-error.log`, ohne einen erfolgreichen Ausführungsbeleg aufzuzeichnen.

## Die Regressionsprüfungen reproduzieren

Verwenden Sie einen wegwerfbaren Checkout von `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c`, in dem Bun und die Entwicklungsabhängigkeiten des Repositorys bereits vorhanden sind. Vom Stamm aus:

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

Die Fixtures decken getrennte Grenzen ab:

| Fixture | Was ihre Assertions prüfen |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Bereitstellung nur über Bash, getrennte Projekt-Ausführungsbelege, reine CUE-Konfiguration, unvollständige Verdrahtung, Versionsfehler und behaltene Diagnosen. |
| [Hook-Dispatch](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Dispatch bei frischem Cache, Zeitbudgets der Handler, Erhalt der Payload, Besitz durch einen passenden Projekt-Hook und Fallback, wenn dieser Besitz fehlt oder ungültig ist. |
| [Installationsintegration](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Zwei Projektinstallationen, erhaltene Benutzereinstellungen, eine Prompt-/Stop-Zustellung über beide Registrierungen und ein erneuter Versuch nach fehlgeschlagener Verdrahtung. |

Diese Fixtures legen temporäre Verzeichnisse und vorgetäuschte CLI-Befehle an; die Integrationsfixture verwendet den tatsächlichen Hook-Composer. Sie prüfen Shell-Dispatch und aufgezeichnete Wirkungen ohne Marketplace-Installation und ohne Modellaufruf. Die Suiten werden unter Windows übersprungen.

## Was in einer echten Sitzung noch zu prüfen bleibt

Ein bestandener Fixture-Lauf belegt keine funktionierende Claude-Code-Sitzung. Prüfen Sie im tatsächlichen Zielprojekt den Ausführungsbeleg und die Konfiguration, führen Sie `oma doctor` aus, starten Sie die Sitzung neu und üben Sie das relevante Prompt- und Stop-Verhalten, während Sie die beobachteten Wirkungen prüfen. Verfügbarkeit der CLI, Zugangsdaten, Provider-Verhalten und die Hook-Richtlinie des Hosts brauchen eigene Belege.

Für denselben Weg aus Reproduktion, Korrektur und Prüfung bei einem anderen Fehler beginnen Sie mit [Einen fehlschlagenden Test debuggen](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). [Setup wählen](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/) erklärt, wann die Projektlaufzeit nötig ist.
