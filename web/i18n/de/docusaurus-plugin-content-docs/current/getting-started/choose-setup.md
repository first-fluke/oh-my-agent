---
title: Setup wählen
description: Laden Sie einen OMA-Skill für eine Aufgabe, wählen Sie ein Domänen-Preset oder installieren Sie das Claude-Code-Plugin mit seinen Laufzeitabhängigkeiten.
---

# Setup wählen

Wählen Sie den Einstieg für die Aufgabe, die Sie erledigen wollen.

| Bedarf | Einstieg | Was eingerichtet wird |
|---|---|---|
| Eine fokussierte Aufgabe im aktuellen Agenten | [Einen Skill laden](#load-one-skill) | Anweisungen und unterstützende Dateien in einem temporären Verzeichnis |
| Projekt-Hooks, spezialisierte Agenten und Workflows | [Ein Skill-Preset installieren](#install-a-skill-preset) | OMA-Laufzeitintegration mit den ausgewählten Skills |
| Installation über den Claude-Code-Marketplace | [Das Plugin installieren](#install-the-claude-code-plugin) | Das OMA-Plugin und der Projekt-Bootstrap |
| Paketinstallation für Copilot CLI, Kiro, Qwen Code, Hermes oder Codex | [Agent-Plugins-Paket](../guide/vendor-capabilities.md#agent-plugins-package) | Skills und MCP-Server für jeden Host; Copilot erhält zusätzlich Agenten, Befehle, Regeln und den Bootstrap-Hook |

## Einen Skill laden {#load-one-skill}

Bitten Sie Ihren Coding-Agenten, den Befehl für Ihre Aufgabe auszuführen und die zurückgegebenen Anweisungen zu lesen. `skills use` gibt die Anweisungen und den Pfad zu ihrem Support-Verzeichnis aus. Es startet keinen weiteren Agenten und führt den OMA-Installer nicht aus.

| Aufgabe | Befehl | Erste Anfrage |
|---|---|---|
| Admin-UI-Design oder Prüfung einer bestehenden UI | `bunx skills use first-fluke/oh-my-agent@oma-design` | Prüfen Sie Hierarchie, Tabellendichte und Leerzustände unserer Admin-Seite. |
| Ein reproduzierbarer Fehler | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduzieren Sie diesen Fehler, beheben Sie die Ursache und führen Sie die passende Prüfung aus. |
| Eine Architekturentscheidung | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Vergleichen Sie, diesen Job in der API zu behalten, mit dem Verschieben in einen Worker. |

Der ausgewählte Ordner enthält seine gemeinsamen Anweisungsreferenzen. Abhängigkeiten außerhalb dieses Ordners bleiben ausdrücklich: ein weiterer Domänen-Skill, Projektregeln, CLI-Operationen, Browser-Tools oder eine externe Engine können weiterhin nötig sein. Lesen Sie die Abhängigkeiten des ausgewählten Skills für die angeforderte Operation. Installieren Sie die Laufzeit, wenn die Aufgabe ihre Hooks oder die verwaltete Ausführung braucht.

Für Designarbeit wählt `oma-design` Interface Design für die Richtung von Admin- und Produktoberflächen, Taste für andere Web-Art-Direction und Impeccable für Kritik, Audit und Feinschliff einer bestehenden UI. Der Stack des Projekts und `DESIGN.md` bleiben die Verträge für Implementierung und Design.

## Ein Skill-Preset installieren {#install-a-skill-preset}

Installieren Sie die CLI einmal und wählen Sie dann die Skills des Projekts:

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

Eine vorhandene CLI-Installation kann beim zweiten Befehl beginnen. Verwenden Sie `oma install --help` für Preset-Namen und Provider-Optionen. Der [Bootstrap-Installer](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install) bereitet außerdem die Laufzeitabhängigkeiten vor der interaktiven Einrichtung vor.

| Preset | Erste Aufgabe | Passende Workflow-Beispiele |
|---|---|---|
| `frontend` | Eine Einstellungsseite planen und dann ihr Formular implementieren | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Einen authentifizierten API-Endpunkt planen | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Arbeiten finden und ihre Belege vergleichen | Bitten Sie um eine Literaturrecherche mit Quellenangaben |
| `all` | Ein Feature über UI, API und Daten koordinieren | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

`--preset` akzeptiert die [benannten Presets](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets). Ein unbekannter Name, ein leerer Wert oder `custom` wird vor der Installation abgelehnt. Um einzelne Skills auszuwählen, führen Sie `oma install` interaktiv aus und wählen Sie Custom. Ohne `--preset` wählt die unbeaufsichtigte Einrichtung mit `--yes` oder in CI `all`.

Das Frontend-Preset wählt acht Skills. Presets wählen Skill-Inhalt; der Installer richtet weiterhin gemeinsame Dateien, alle Workflow- und Agentendefinitionen, Hooks und Provider ein. Manche Workflows brauchen Skills außerhalb eines Domänen-Presets. Prüfen Sie die [Workflow-Abhängigkeiten](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset), bevor Sie sie verwenden, oder wählen Sie `all` für jeden Workflow. Ein kleineres Preset auf einer bestehenden Installation entfernt andere Skills nicht.

Die Provider-Auswahl ist unabhängig von Presets. Fügen Sie zum Beispiel `--semantic-memory none` hinzu, wenn das Projekt keinen Dienst für semantisches Memory braucht. Siehe [Auswirkungen der Installation](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default) für die weiteren Dateien und Integrationen, die die Laufzeit konfiguriert.

Die Installationszusammenfassung listet die ausgewählten Skills und prüft die vorhandenen Skill-Manifeste, einschließlich behaltener Skills. Sie meldet statische Workflow- und Agentenreferenzen, einschließlich bedingter Zweige, als referenzierte Skill-Manifeste. Führen Sie `oma doctor` aus, um fehlende oder unlesbare Einträge zu reparieren, die Ihre Aufgabe braucht. Diese Prüfungen verifizieren weder Ressourceninhalte noch Tools, Provider, Zugangsdaten oder die Ausführung.

## Das Claude-Code-Plugin installieren {#install-the-claude-code-plugin}

Führen Sie diese Befehle in Claude Code aus:

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

Wählen Sie `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent` oder `oma-research@oh-my-agent` für ein Domänen-Plugin. Der vollständige Eintrag `oma` behält die komplette Skill-Auswahl. Domänen-Einträge bootstrappen ihr passendes Preset.

Der Sitzungs-Start-Hook des Plugins stellt die CLI bei Bedarf bereit und führt `oma install --yes` für das aktuelle Projekt aus. Dieser Weg führt die Laufzeiteinrichtung aus. Sein Erfolgs-Ausführungsbeleg (Receipt) gehört zu diesem Projekt, und die Event-Hooks des Plugins verwenden die installierte CLI. Plugin-Hooks benötigen Bash, auch unter Windows. Der Bootstrap hat ein Timeout von 600 Sekunden; Fehler melden die Schritte der manuellen Einrichtung und behalten das Projektprotokoll unter `.agents/state/plugin-bootstrap.last-error.log`. Ein Ausführungsbeleg wird nur wiederverwendet, nachdem die Prüfungen von CLI-Version, Projektkonfiguration und Hooks bestanden haben. Starten Sie die Sitzung neu, nachdem der Bootstrap den Abschluss gemeldet hat.

Für die Konfigurations- und Abhängigkeitsentscheidungen während der Einrichtung verwenden Sie `oma install` direkt. Der unbeaufsichtigte Bootstrap des vollständigen Plugins verwendet das Skill-Preset `all`; jedes Domänen-Plugin übergibt sein ausgewähltes Preset. Ein kleineres Preset behält andere Skills, die im Projekt bereits installiert sind.

## Ergebnis prüfen {#check-the-result}

Bei einem geladenen Skill prüfen Sie, dass der Agent die ausgewählten Anweisungen gelesen hat, und berichten Sie die tatsächlichen Prüfungen der Aufgabe. Bei einer Laufzeitinstallation führen Sie `oma doctor` aus und probieren die erste Anfrage für Ihr Preset. Die Provider-Warnungen von Doctor sind relevant, wenn die angeforderte Aufgabe diesen Provider verwendet.
