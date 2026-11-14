---
title: "Anleitung: Codex-Hook-Vertrauen"
sidebar_label: Codex-Hook-Vertrauen
description: Wie Codex Hooks an Vertrauen bindet, was oh-my-agent aufzeichnet, damit seine Hooks laufen, und wann Sie Hooks weiterhin selbst prüfen.
---

# Anleitung: Codex-Hook-Vertrauen

Wenn oh-my-agent in einem Projekt installiert wird, schreibt es anbieterspezifische Hook-Konfigurationen, darunter `.codex/hooks.json` für die Codex-CLI. Codex führt einen Hook nicht allein deshalb aus, weil er konfiguriert ist. Zwei Freigaben sind dafür nötig, und beide liegen in Ihrer Benutzerkonfiguration (`$CODEX_HOME/config.toml`, Standard `~/.codex/config.toml`). Ein Projekt kann seine eigenen Hooks nicht selbst freigeben:

1. **Projektvertrauen.** Der Ordner `.codex/` eines Projekts (seine `config.toml` und seine `hooks.json`) wird nur für ein vertrauenswürdiges Projekt geladen: `[projects."<path>"] trust_level = "trusted"`.
2. **Vertrauen pro Hook.** Jeder nicht verwaltete Hook, im Projekt- oder Benutzerbereich, braucht einen Eintrag `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]`, dessen `trusted_hash` zur aktuellen Hook-Deklaration passt (Befehl, Timeout, Matcher, Async-Flag, Statusmeldung).

Ein neuer oder geänderter Hook zeigt in der Codex-TUI „Hooks need review“. `codex exec` lässt ihn still aus.

---

## Was oh-my-agent für Sie aufzeichnet

`oma install`, `oma update` und `oma link` schreiben beide Freigaben für **die eigenen Hooks von oh-my-agent**. Das sind die Handler mit dem Namen `oma-hook-*` oder die über den Wrapper `oma-hook.sh` laufen. Der Hash ist derselbe, den Codex berechnet, wenn Sie „Trust all and continue“ wählen. Die Hooks laufen daher schon in der ersten Codex-Sitzung, ohne Schritt `/hooks`. Eine spätere oh-my-agent-Version, die einen Hook-Befehl ändert, zeichnet den neuen Hash während `oma update` auf, sodass die Hooks aktiv bleiben.

oh-my-agent bearbeitet in `config.toml` nur die betroffenen Tabellen. Es liest das Ergebnis erneut und lässt die Datei unberührt, wenn sich etwas anderes ändern würde. Es tut nie Folgendes:

- einen Hook freigeben, den Sie selbst in dieselbe `hooks.json` eingetragen haben,
- einem Projekt vertrauen, das Sie mit `trust_level = "untrusted"` markiert haben,
- einen Hook wieder aktivieren, den Sie ausgeschaltet haben (`enabled = false`),
- Codex berühren, bevor Codex sein Home-Verzeichnis angelegt hat.

Eine globale Installation (`~/.codex/hooks.json`) erhält nur die Einträge pro Hook, weil es kein Projekt gibt, dem vertraut werden kann.

---

## Wann Sie Hooks weiterhin selbst prüfen

Wenn oh-my-agent das Vertrauen nicht aufzeichnen konnte, gibt es den Grund zusammen mit dem Hinweis aus:

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Die üblichen Fälle sind eine `config.toml`, die es nicht parsen kann, ein Projekt, das Sie als nicht vertrauenswürdig markiert haben, oder dass Codex noch nicht ausgeführt wurde. Öffnen Sie in diesem Fall das Projekt in Codex, führen Sie `/hooks` aus und aktivieren Sie die Hooks einmal. Führen Sie danach `oma link codex` aus, damit spätere Updates sie vertrauenswürdig halten.

---

## Codex-Prozesse, die oh-my-agent startet

Wenn oh-my-agent selbst einen Codex-Subprozess startet (zum Beispiel `oma agent spawn`), übergibt es außerdem `--dangerously-bypass-hook-trust`. Dieses Flag führt aktivierte Hooks ohne die Hash-Prüfung aus. Es hebt das Projektvertrauen nicht auf. Das Flag gilt nur für Prozesse, die oh-my-agent startet, und wird nie in Ihre Konfiguration geschrieben.

---

## Kein `[features] hooks`-Flag erforderlich

Ältere oh-my-agent-Versionen schrieben `[features] codex_hooks = true` in die Codex-Konfiguration. Codex 0.124 hat dieses Flag in `hooks` umbenannt und Hooks zu einer stabilen, standardmäßig aktivierten Funktion gemacht, sodass kein Flag mehr nötig ist. oh-my-agent schreibt keinen der beiden Schlüssel und entfernt die veralteten Flags `codex_hooks` und `child_agents_md` aus der Tabelle `[features]`, wenn es sie findet.

---

## Zusammenfassung

| Situation | Was Sie tun |
|:----------|:------------|
| Erste Installation in einem Projekt | Nichts: der Installer zeichnet das Vertrauen auf |
| `oma update`, das einen Hook-Befehl ändert | Nichts: der neue Hash wird aufgezeichnet |
| Der Installer gibt „not trusted (…)" aus | Beheben Sie den Grund oder führen Sie `/hooks` einmal in Codex aus |
| Ein Hook, den Sie zu `.codex/hooks.json` hinzugefügt haben | Prüfen Sie ihn selbst in `/hooks` |

## Siehe auch

- [Integration in bestehende Projekte](./integration.md): was der Installer für jeden Vendor schreibt
- [Globale Installation](./global-install.md): benutzerweite Installationen, die nach `~/.codex/` schreiben
