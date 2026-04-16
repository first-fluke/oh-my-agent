---
title: "Anleitung: Zentrales Register"
description: Detaillierte Dokumentation des zentralen Registers — Release-Please-Workflow, konventionelle Commits, Consumer-Templates, .agent-registry.yml-Format und Vergleich mit dem GitHub-Action-Ansatz.
---

# Anleitung: Zentrales Register

## Überblick

Das zentrale Register-Modell behandelt das oh-my-agent GitHub-Repository (`first-fluke/oh-my-agent`) als versionierte Artefaktquelle. Consumer-Projekte beziehen bestimmte Versionen von Skills und Workflows aus diesem Register, um Konsistenz über Teams und Projekte hinweg sicherzustellen.

Dies ist der Enterprise-Ansatz für Organisationen, die Folgendes benötigen:
- Versions-Pinning über mehrere Projekte hinweg.
- Prüfbare Update-Nachweise über Pull Requests.
- Prüfsummenverifikation für heruntergeladene Artefakte.
- Automatisierte wöchentliche Update-Prüfungen.
- Manuelle Überprüfung, bevor ein Update angewendet wird.

---

## Architektur

```
┌──────────────────────────────────────────────────────────┐
│                  Zentrales Register                        │
│              (first-fluke/oh-my-agent)                    │
│                                                          │
│  ┌──────────────┐   ┌────────────────┐   ┌───────────┐  │
│  │ release-      │   │ CHANGELOG.md    │   │ Releases  │  │
│  │ please        │──►│ .release-       │──►│  - tarball│  │
│  │ workflow      │   │  please-        │   │  - sha256 │  │
│  │              │   │  manifest.json  │   │  - manifest│  │
│  └──────────────┘   └────────────────┘   └─────┬─────┘  │
│                                                 │        │
└─────────────────────────────────────────────────┼────────┘
                                                  │
                    ┌─────────────────────────────┼──────────────┐
                    │                             │              │
              ┌─────▼─────┐              ┌───────▼──────┐ ┌─────▼──────┐
              │ Projekt A  │              │ Projekt B    │ │ Projekt C  │
              │            │              │              │ │            │
              │ .agent-    │              │ .agent-      │ │ .agent-    │
              │ registry   │              │ registry     │ │ registry   │
              │ .yml       │              │ .yml         │ │ .yml       │
              └────────────┘              └──────────────┘ └────────────┘
```

---

## Für Maintainer: Neue Versionen veröffentlichen

### Release-Please-Workflow

oh-my-agent verwendet [release-please](https://github.com/googleapis/release-please) zur Automatisierung von Releases. Der Ablauf ist:

1. **Konventionelle Commits** landen auf `main`. Jeder Commit muss dem [Conventional Commits](https://www.conventionalcommits.org/)-Format folgen:

   | Präfix | Bedeutung | Versionsbump |
   |:-------|:--------|:-------------|
   | `feat:` | Neues Feature | Minor (1.x.0) |
   | `fix:` | Fehlerbehebung | Patch (1.0.x) |
   | `feat!:` oder `BREAKING CHANGE:` | Breaking Change | Major (x.0.0) |
   | `chore:` | Wartung | Kein Bump (sofern nicht konfiguriert) |
   | `docs:` | Dokumentation | Kein Bump |
   | `refactor:` | Code-Umstrukturierung | Kein Bump |
   | `perf:` | Performance-Verbesserung | Patch |
   | `test:` | Teständerungen | Kein Bump |
   | `build:` | Build-System | Kein Bump |
   | `ci:` | CI-Konfiguration | Kein Bump |
   | `style:` | Code-Stil | Kein Bump |
   | `revert:` | Vorherigen Commit rückgängig machen | Hängt vom rückgängig gemachten Commit ab |

2. **Release-please erstellt einen Release-PR**, der:
   - Die Version in `package.json` und verwandten Dateien aktualisiert.
   - `CHANGELOG.md` mit allen Commits seit dem letzten Release aktualisiert.
   - `.release-please-manifest.json` mit der neuen Version aktualisiert.

3. **Wenn der Release-PR gemergt wird**, erstellt release-please:
   - Einen Git-Tag (z. B. `cli-v4.7.0`).
   - Ein GitHub Release mit dem Changelog.

4. **Ein CI-Workflow** erstellt dann:
   - Das `agent-skills.tar.gz`-Tarball mit dem `.agents/`-Verzeichnis.
   - Eine SHA256-Prüfsummendatei (`agent-skills.tar.gz.sha256`).
   - `prompt-manifest.json` mit Version und Dateimetadaten.
   - Hängt alle drei Artefakte an das GitHub Release an.
   - Synchronisiert `prompt-manifest.json` zum `main`-Branch für den CLI-Update-Mechanismus.

### Release-Artefakte

Jedes Release erzeugt drei Artefakte am GitHub Release:

| Artefakt | Beschreibung | Zweck |
|:---------|:-----------|:--------|
| `agent-skills.tar.gz` | Komprimiertes Tarball des `.agents/`-Verzeichnisses | Enthält alle Skills, Workflows, Konfigurationen, Agenten |
| `agent-skills.tar.gz.sha256` | SHA256-Prüfsumme des Tarballs | Integritätsverifikation vor dem Entpacken |
| `prompt-manifest.json` | JSON mit Version, Dateianzahl und Metadaten | Wird von `oma update` zur Prüfung neuer Versionen verwendet |

### Beispiele für konventionelle Commits

```bash
# Feature-Ergänzung (Minor-Bump)
git commit -m "feat: add Rust backend language variant"

# Fehlerbehebung (Patch-Bump)
git commit -m "fix: resolve workspace detection for Nx monorepos"

# Breaking Change (Major-Bump)
git commit -m "feat!: rename .agent/ to .agents/ directory"

# Scope-bezogener Commit
git commit -m "feat(backend): add SQLAlchemy async session support"

# Kein Versionsbump
git commit -m "chore: update test fixtures"
git commit -m "docs: add central registry guide"
git commit -m "ci: sync prompt-manifest.json [skip ci]"
```

---

## Für Consumer: Projekt einrichten

### Template-Dateien

oh-my-agent stellt zwei Template-Dateien in `docs/consumer-templates/` bereit, die Sie in Ihr Projekt kopieren:

1. **`.agent-registry.yml`** — Konfigurationsdatei im Projektstamm.
2. **`check-registry-updates.yml`** — GitHub-Actions-Workflow unter `.github/workflows/`.
3. **`sync-agent-registry.yml`** — GitHub-Actions-Workflow unter `.github/workflows/`.

### .agent-registry.yml-Format

Diese Datei befindet sich in Ihrem Projektstamm und steuert die Interaktion Ihres Projekts mit dem zentralen Register.

```yaml
# Zentrales Register-Repository
registry:
  repo: first-fluke/oh-my-agent

# Versions-Pinning
# Optionen:
#   - Bestimmte Version: "1.2.0"
#   - Neueste: "latest" (nicht empfohlen für Produktion)
version: "4.7.0"

# Auto-Update-Einstellungen
auto_update:
  # Wöchentliche Update-Prüf-PRs aktivieren
  enabled: true

  # Zeitplan (Cron-Format) - Standard: jeden Montag um 9 Uhr UTC
  schedule: "0 9 * * 1"

  # PR-Einstellungen
  pr:
    # Auto-Merge ist bewusst deaktiviert (manuelle Überprüfung erforderlich)
    auto_merge: false

    # PR-Labels
    labels:
      - "dependencies"
      - "agent-registry"

# Synchronisierungseinstellungen
sync:
  # Zielverzeichnis für .agents/-Dateien
  target_dir: "."

  # Vorhandenes .agents/ vor Synchronisierung sichern
  backup_existing: true

  # Dateien/Verzeichnisse, die bei Synchronisierung beibehalten werden (Glob-Muster)
  preserve:
    - ".agent/oma-config.yaml"
    - ".agent/config/local-*"
```

**Wichtige Felder erklärt:**

- **`version`** — Für Reproduzierbarkeit auf eine bestimmte Version pinnen. `"latest"` nur für experimentelle Projekte verwenden.
- **`auto_update.enabled`** — Bei true läuft der Prüf-Workflow nach Zeitplan.
- **`auto_update.schedule`** — Cron-Ausdruck für die Prüfhäufigkeit. Standard ist wöchentlich Montag um 9 Uhr UTC.
- **`auto_update.pr.auto_merge`** — Bewusst immer `false`. Updates erfordern manuelle Überprüfung.
- **`sync.preserve`** — Glob-Muster für Dateien, die bei Synchronisierung nicht überschrieben werden sollen. Typischerweise die `oma-config.yaml` und lokale Konfigurationsüberschreibungen.

### Workflow-Rollen

#### check-registry-updates.yml

**Zweck:** Prüft auf neue Versionen und erstellt einen PR, wenn ein Update verfügbar ist.

**Trigger:** Cron-Zeitplan (Standard: wöchentlich) oder manueller Auslöser.

**Ablauf:**
1. Liest die aktuelle Version aus `.agent-registry.yml`.
2. Ruft den neuesten Release-Tag aus dem Register-Repository über die GitHub-API ab.
3. Vergleicht Versionen — beendet sich, wenn bereits aktuell.
4. Bei verfügbarem Update:
   - Prüft, ob ein PR für diese Version bereits existiert (verhindert Duplikate).
   - Erstellt einen neuen Branch (`agent-registry-update-{version}`).
   - Aktualisiert die Version in `.agent-registry.yml`.
   - Committet und pusht.
   - Erstellt einen PR mit Changelog-Informationen und Review-Anweisungen.

**Angewendete Labels:** `dependencies`, `agent-registry`.

**Erforderliche Berechtigungen:** `contents: write`, `pull-requests: write`.

#### sync-agent-registry.yml

**Zweck:** Lädt die Register-Dateien herunter und wendet sie an, wenn sich die Version ändert.

**Trigger:** Push nach `main`, der `.agent-registry.yml` modifiziert, oder manueller Auslöser.

**Ablauf:**
1. Liest die Version aus `.agent-registry.yml` (oder aus manueller Eingabe).
2. Lädt Release-Artefakte herunter: `agent-skills.tar.gz`, Prüfsumme und Manifest.
3. Verifiziert die SHA256-Prüfsumme.
4. Sichert das vorhandene `.agents/`-Verzeichnis (mit Zeitstempel).
5. Entpackt das Tarball.
6. Stellt bewahrte Dateien aus der Sicherung wieder her (nach `sync.preserve`-Mustern).
7. Committet die synchronisierten Dateien.
8. Bereinigt Sicherungsverzeichnisse, die älter als 7 Tage sind.

**Erforderliche Berechtigungen:** `contents: write`.

---

## Vergleich: Zentrales Register vs. GitHub Action

| Aspekt | Zentrales Register | GitHub Action |
|:-------|:----------------|:-------------|
| **Einrichtungsaufwand** | Höher — 3 Dateien zu konfigurieren | Geringer — 1 Workflow-Datei |
| **Versionskontrolle** | Explizites Pinning in `.agent-registry.yml` | Aktualisiert immer auf neueste |
| **Update-Mechanismus** | Zweistufig: Prüf-PR dann Sync-Workflow | Einstufig: oma update in CI |
| **Prüfsummenverifikation** | Ja — SHA256 vor dem Entpacken verifiziert | Nein — verlässt sich auf npm-Registry |
| **Rollback** | Version in `.agent-registry.yml` ändern | Update-Commit rückgängig machen |
| **Audit-Trail** | Versionsgepinnte PRs mit Labels | Commit-Verlauf |
| **Bewahrte Dateien** | Konfigurierbare Glob-Muster in `.agent-registry.yml` | Eingebaut: `oma-config.yaml`, `mcp.json`, `stack/` |
| **Update-Quelle** | GitHub-Release-Artefakte (Tarball) | npm-Registry (oh-my-agent-Paket) |
| **Genehmigungsfluss** | PR-Review erforderlich (Auto-Merge deaktiviert) | Konfigurierbar (PR-Modus oder direkter Commit) |
| **Mehrere Projekte** | Jedes Projekt hat seine eigene gepinnte Version | Jedes Projekt läuft unabhängig |
| **Offline/Air-Gapped** | Möglich — Tarball manuell herunterladen | Erfordert npm-Zugang |

---

## Wann welchen Ansatz verwenden

### Zentrales Register verwenden, wenn:

- Sie mehrere Projekte verwalten, die auf derselben Version bleiben müssen.
- Sie prüfbare, reviewbare Update-PRs mit Prüfsummenverifikation benötigen.
- Ihre Sicherheitsrichtlinie eine explizite Genehmigung für Abhängigkeitsaktualisierungen erfordert.
- Sie bestimmte Versionen pinnen und Projekte nach unterschiedlichen Zeitplänen aktualisieren möchten.
- Sie die Möglichkeit benötigen, Artefakte für Air-Gapped-Umgebungen herunterzuladen.

### GitHub Action verwenden, wenn:

- Sie ein einzelnes Projekt oder wenige unabhängige Projekte haben.
- Sie die einfachstmögliche Einrichtung wünschen (eine Workflow-Datei).
- Sie mit automatischen Aktualisierungen auf die neueste Version einverstanden sind.
- Sie eingebaute Konfigurationsdateibewahrung ohne manuelle Konfiguration möchten.
- Sie den direkten `oma update`-Mechanismus dem Tarball-Entpacken vorziehen.

### Beide verwenden, wenn:

- Das zentrale Register Versions-Pinning und geplante Prüfungen verwaltet.
- Die GitHub Action den eigentlichen `oma update`-Aufruf übernimmt, wenn ein Versionssprung genehmigt wird.

Dies ist gültig, erhöht aber die Komplexität. Die meisten Teams wählen einen Ansatz.
