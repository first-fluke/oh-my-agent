---
title: "Anleitung: Codex-Hook-Vertrauen"
sidebar_label: Codex-Hook-Vertrauen
description: Warum Codex-Hooks erst nach einer einmaligen Prüfung laufen, was bei Updates geschieht und was oh-my-agent für gestartete Codex-Subprozesse automatisiert.
---

# Anleitung: Codex-Hook-Vertrauen

Wenn oh-my-agent in einem Projekt installiert wird, schreibt es native Hook-Konfigurationen für die Anbieter, darunter `.codex/hooks.json` für die Codex-CLI. Anders als Claude Code führt Codex diese Hooks nicht automatisch aus. Es schützt jeden nicht verwalteten Command-Hook mit Trust-On-First-Use (TOFU): Ein Hook läuft erst, nachdem Sie ihn einmal geprüft und aktiviert haben.

Das ist eine Sicherheitsfunktion von Codex und keine Einschränkung von oh-my-agent. Diese Anleitung erklärt den einmaligen Schritt, die Auswirkungen späterer Updates und was oh-my-agent automatisch für Sie erledigt.

---

## Der einmalige Schritt: Hooks in Codex prüfen

Nachdem `oma` (Installation), `oma link` oder `oma update` in einem Projekt, das Codex noch nicht gesehen hat, `.codex/hooks.json` geschrieben hat (bei einer globalen Installation `~/.codex/hooks.json`), laufen die Hooks **noch nicht**. Öffnen Sie Codex und prüfen Sie sie einmal:

1. Öffnen Sie das Projekt in der Codex-CLI.
2. Führen Sie `/hooks` aus, um den Hook-Browser (TUI) zu öffnen.
3. Prüfen Sie die aufgelisteten Hooks und aktivieren Sie sie.

Bis dahin bleiben die Hooks nicht vertrauenswürdig und werden still übersprungen. Deshalb gibt oh-my-agent jedes Mal einen Hinweis aus, wenn es `.codex/hooks.json` anlegt oder ändert:

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Prüfen Sie die erzeugte Datei, bevor Sie Codex öffnen:

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

Das erwartete Ergebnis ist der Installations-/Update-Hinweis, gefolgt von den Hooks im `/hooks`-Browser von Codex. `oma link codex` gleicht die erzeugte Datei ab; die einmalige Vertrauensentscheidung ersetzt es nicht.

**Hinweis:** `--dangerously-bypass-hook-trust` hilft hier nicht. Die Warnung („Enabled hooks may run without review“) bedeutet nur, dass die Prüfung für bereits aktivierte Hooks umgangen wird. Ein noch nie geprüfter Hook läuft damit nicht. Der `/hooks`-Browser ist der einzige Weg, einen Hook beim ersten Mal zu aktivieren.

Intern speichert Codex Ihre Entscheidung in `~/.codex/config.toml` unter einem Eintrag `[hooks.state]`, dessen Schlüssel aus dem Pfad der Hook-Datei, dem Event, dem Block und dem Hook besteht und der ein `enabled`-Flag sowie einen `trusted_hash` der Befehlszeichenfolge enthält.

---

## Was bei Updates geschieht

Sobald Sie den Hooks vertraut haben, müssen Sie den Schritt nicht bei jedem Update wiederholen:

- **Erneutes Ausführen von `oma link` oder `oma update` behält das Vertrauen bei**, solange die Hook-Befehlszeichenfolgen unverändert sind. Codex vergleicht den gespeicherten Hash mit dem aktuellen Befehl; bei Übereinstimmung bleibt der Hook vertrauenswürdig.
- **Wenn eine spätere oh-my-agent-Version eine Hook-Befehlszeichenfolge ändert**, stimmt der Hash nicht mehr überein und der Hook wird still wieder als nicht vertrauenswürdig eingestuft. Sie sehen den Installer-Hinweis erneut und müssen über `/hooks` wieder vertrauen.

Die Prüfung ist also nur beim ersten Mal und erneut nach einer Version erforderlich, die tatsächlich einen Hook-Befehl ändert.

---

## Was oh-my-agent für Sie automatisiert

Wenn oh-my-agent selbst einen Codex-Subprozess startet, etwa einen über `oma agent spawn` versendeten Cross-Vendor-Agenten, übergibt es automatisch `--dangerously-bypass-hook-trust`. Dadurch können die eigenen geprüften Hooks über Updates hinweg laufen, ohne dass Sie sie manuell erneut freigeben müssen.

Dieses Flag wird **nur** an Codex-Prozesse übergeben, die oh-my-agent startet. Es wird niemals in Ihre `~/.codex/config.toml` oder die Projektkonfiguration geschrieben und beeinflusst daher keine Codex-Sitzungen, die Sie selbst starten.

---

## Kein `[features] hooks`-Flag erforderlich

Ältere oh-my-agent-Versionen schrieben `[features] codex_hooks = true` in die Codex-Konfiguration. Codex 0.124 hat dieses Flag in `hooks` umbenannt und Hooks zu einer stabilen, standardmäßig aktivierten Funktion gemacht, sodass kein Flag mehr nötig ist. oh-my-agent schreibt keinen der beiden Schlüssel und entfernt die veralteten Flags `codex_hooks` und `child_agents_md` aus der Tabelle `[features]`, wenn es sie findet.

---

## Zusammenfassung

| Situation | Ihre Aktion |
|:----------|:------------|
| Erste Installation / erstes `.codex/hooks.json` in einem Projekt | Codex öffnen, `/hooks` ausführen und die Hooks einmal aktivieren |
| `oma update` mit unveränderten Hook-Befehlen | Nichts — das Vertrauen bleibt erhalten |
| `oma update`, das einen Hook-Befehl ändert | `/hooks` erneut ausführen, um wieder zu vertrauen (der Installer gibt einen Hinweis aus) |
| Von oh-my-agent gestarteter Codex-Subprozess | Nichts — der Bypass wird automatisch angewendet |

## Siehe auch

- [Integration in bestehende Projekte](./integration.md): was der Installer für jeden Vendor schreibt
- [Globale Installation](./global-install.md): benutzerweite Installationen, die nach `~/.codex/` schreiben
