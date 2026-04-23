---
title: "Anleitung: Automatische Updates"
description: Vollständige GitHub-Action-Dokumentation für oh-my-agent — Setup, alle Ein- und Ausgaben, detaillierte Beispiele und Funktionsweise im Detail.
---

# Anleitung: Automatische Updates

## Überblick

Die oh-my-agent GitHub Action (`first-fluke/oma-update-action@v1`) aktualisiert die Agenten-Skills Ihres Projekts automatisch, indem sie `oma update` in CI ausführt. Sie unterstützt zwei Modi: Erstellen eines Pull Requests zur Überprüfung oder direktes Committen in einen Branch.

---

## Schnelleinrichtung

Fügen Sie diese Datei Ihrem Projekt als `.github/workflows/update-oh-my-agent.yml` hinzu:

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # Jeden Montag um 9 Uhr UTC
  workflow_dispatch:        # Manuellen Trigger erlauben

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
```

Dies ist die Minimalkonfiguration. Sie erstellt einen PR mit Standardeinstellungen, wenn eine neue Version verfügbar ist.

---

## Alle Action-Eingaben

| Eingabe | Typ | Erforderlich | Standard | Beschreibung |
|:------|:-----|:---------|:--------|:-----------|
| `mode` | String | Nein | `"pr"` | Wie Änderungen angewendet werden. `"pr"` erstellt einen Pull Request. `"commit"` pusht direkt in den Basis-Branch. |
| `base-branch` | String | Nein | `"main"` | Basis-Branch für den PR (im `pr`-Modus) oder der Ziel-Branch für direkte Commits (im `commit`-Modus). |
| `force` | String | Nein | `"false"` | Übergibt `--force` an `oma update`. Bei `"true"` werden benutzerdefinierte Konfigurationsdateien (`oma-config.yaml`, `mcp.json`) und `stack/`-Verzeichnisse überschrieben. Normalerweise werden diese beibehalten. |
| `pr-title` | String | Nein | `"chore(deps): update oh-my-agent skills"` | Benutzerdefinierter Titel für den Pull Request. Nur im `pr`-Modus verwendet. |
| `pr-labels` | String | Nein | `"dependencies,automated"` | Kommagetrennte Labels für den PR. Nur im `pr`-Modus verwendet. |
| `commit-message` | String | Nein | `"chore(deps): update oh-my-agent skills"` | Benutzerdefinierte Commit-Nachricht. In beiden Modi verwendet — als PR-Commit-Nachricht oder direkte Commit-Nachricht. |
| `token` | String | Nein | `${{ github.token }}` | GitHub-Token für PR-Erstellung. Verwenden Sie ein Personal Access Token (PAT), wenn der PR andere Workflows auslösen soll (das Standard-`GITHUB_TOKEN` löst keine Workflow-Ausführungen bei selbst erstellten PRs aus). |

---

## Alle Action-Ausgaben

| Ausgabe | Typ | Beschreibung | Verfügbar |
|:-------|:-----|:-----------|:----------|
| `updated` | String | `"true"` wenn nach `oma update` Änderungen erkannt wurden. `"false"` wenn bereits aktuell. | Immer |
| `version` | String | Die oh-my-agent-Version nach dem Update. Gelesen aus `.agents/skills/_version.json`. | Wenn `updated` `"true"` ist |
| `pr-number` | String | Die Pull-Request-Nummer. | Nur im `pr`-Modus, wenn ein PR erstellt wurde |
| `pr-url` | String | Die vollständige URL des erstellten Pull Requests. | Nur im `pr`-Modus, wenn ein PR erstellt wurde |

---

## Detaillierte Beispiele

### Beispiel 1: Standard-PR-Modus

Die häufigste Konfiguration. Erstellt jeden Montag einen PR, wenn Updates verfügbar sind.

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
        id: update

      - name: Zusammenfassung
        if: steps.update.outputs.updated == 'true'
        run: |
          echo "Aktualisiert auf Version ${{ steps.update.outputs.version }}"
          echo "PR: ${{ steps.update.outputs.pr-url }}"
```

**Was passiert:**
- Checkt das Repository aus.
- Installiert Bun, dann oh-my-agent global.
- Führt `oma update --ci` aus.
- Prüft, ob `.agents/` oder `.claude/` Änderungen aufweisen.
- Bei Änderungen wird `peter-evans/create-pull-request@v8` verwendet, um einen PR auf dem Branch `chore/update-oh-my-agent` zu erstellen.
- Der PR wird mit `dependencies,automated` gelabelt und enthält die neue Versionsnummer im Body.

### Beispiel 2: Direkt-Commit-Modus mit PAT

Für Teams, die Updates sofort ohne PR-Review-Schritt angewendet haben möchten. Verwendet ein PAT, damit der Commit nachgelagerte Workflows auslösen kann.

```yaml
name: Update oh-my-agent (Direkt)

on:
  schedule:
    - cron: '0 6 * * *'  # Täglich um 6 Uhr UTC
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.OH_MY_AGENT_PAT }}

      - uses: first-fluke/oma-update-action@v1
        with:
          mode: commit
          token: ${{ secrets.OH_MY_AGENT_PAT }}
          commit-message: "chore: auto-update oh-my-agent skills"
          base-branch: develop
```

**Was passiert:**
- Checkt den `develop`-Branch mit einem PAT aus.
- Führt `oma update --ci` aus.
- Bei Änderungen wird Git als `github-actions[bot]` konfiguriert und direkt nach `develop` committet.
- Das PAT stellt sicher, dass der Commit alle Workflows auslöst, die auf Pushes nach `develop` lauschen.

**Wichtig:** Verwenden Sie `secrets.OH_MY_AGENT_PAT` (ein Fine-Grained PAT mit Contents: Write-Berechtigung) statt `github.token`. Das Standard-`GITHUB_TOKEN` erstellt Commits, die keine anderen Workflows auslösen, was CI-Pipelines unterbrechen kann, die Push-Events erwarten.

### Beispiel 3: Bedingte Benachrichtigung

Update mit Slack-Benachrichtigung, wenn eine neue Version verfügbar ist.

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
        id: update

      - name: Slack benachrichtigen
        if: steps.update.outputs.updated == 'true'
        uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "oh-my-agent auf v${{ steps.update.outputs.version }} aktualisiert. PR: ${{ steps.update.outputs.pr-url }}"
            }

      - name: Benachrichtigung überspringen
        if: steps.update.outputs.updated == 'false'
        run: echo "Bereits aktuell, keine Benachrichtigung nötig."
```

**Schlüsselmuster:** Verwenden Sie `steps.update.outputs.updated == 'true'`, um nachgelagerte Schritte nur bei tatsächlichem Update bedingt auszuführen. Dies verhindert Rauschen durch "keine Änderungen"-Läufe.

### Beispiel 4: Force-Modus mit benutzerdefinierten Labels

Für Projekte, die beim Update alle Konfigurationsdateien auf Standards zurücksetzen möchten.

```yaml
name: Update oh-my-agent (Force)

on:
  workflow_dispatch:  # Nur manueller Trigger für Force-Updates

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: first-fluke/oma-update-action@v1
        with:
          force: 'true'
          pr-title: "chore(deps): force-update oh-my-agent skills (Konfigurationen zurücksetzen)"
          pr-labels: "dependencies,automated,force-update"
          commit-message: "chore(deps): force-update oh-my-agent skills"
```

**Warnung:** Force-Modus überschreibt `oma-config.yaml`, `mcp.json` und `stack/`-Verzeichnisse. Verwenden Sie dies nur, wenn Sie alle Anpassungen auf Standards zurücksetzen möchten. Für reguläre Updates lassen Sie die `force`-Eingabe weg.

---

## Funktionsweise im Detail

Die Action ist eine [Composite Action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action), definiert in `action/action.yml`. Sie führt 4 Schritte aus:

### Schritt 1: Bun einrichten

```yaml
- uses: oven-sh/setup-bun@v2
```

Installiert die Bun-Laufzeitumgebung, die zum Ausführen der oh-my-agent-CLI erforderlich ist.

### Schritt 2: oh-my-agent installieren

```bash
bun install -g oh-my-agent
```

Installiert die CLI global aus der npm-Registry. Dies ermöglicht den Zugriff auf den `oma`-Befehl.

### Schritt 3: oma update ausführen

```bash
FLAGS="--ci"
if [ "${{ inputs.force }}" = "true" ]; then
  FLAGS="$FLAGS --force"
fi
oma update $FLAGS
```

Das `--ci`-Flag führt das Update im nicht-interaktiven Modus aus (überspringt alle Eingabeaufforderungen, gibt Klartext statt Spinner-Animationen aus). Das `--force`-Flag überschreibt bei Aktivierung benutzerdefinierte Konfigurationsdateien.

Was `oma update --ci` intern tut:

1. Ruft `prompt-manifest.json` vom Main-Branch ab, um die neueste Versionsnummer zu erhalten.
2. Vergleicht mit der lokalen Version in `.agents/skills/_version.json`.
3. Bei übereinstimmenden Versionen wird mit "Bereits aktuell" beendet.
4. Bei neuer Version wird das neueste Tarball heruntergeladen und entpackt.
5. Bewahrt benutzerdefinierte Dateien auf (außer bei `--force`): `oma-config.yaml`, `mcp.json`, `stack/`-Verzeichnisse.
6. Kopiert neue Dateien über das vorhandene `.agents/`-Verzeichnis.
7. Stellt aufbewahrte Dateien wieder her.
8. Aktualisiert Vendor-Anpassungen (Hooks, Einstellungen, Agenten-Definitionen) für alle Anbieter.
9. Erneuert CLI-Symlinks.

### Schritt 4: Auf Änderungen prüfen

```bash
if [ -n "$(git status --porcelain .agents/ .claude/ 2>/dev/null)" ]; then
  echo "updated=true" >> "$GITHUB_OUTPUT"
  VERSION=$(jq -r '.version' .agents/skills/_version.json)
  echo "version=$VERSION" >> "$GITHUB_OUTPUT"
else
  echo "updated=false" >> "$GITHUB_OUTPUT"
fi
```

Prüft, ob `oma update` tatsächlich Dateien in `.agents/` oder `.claude/` geändert hat. Setzt die Ausgaben `updated` und `version` entsprechend.

Danach, abhängig von der `mode`-Eingabe:

- **`pr`-Modus:** Verwendet `peter-evans/create-pull-request@v8`, um einen PR auf dem Branch `chore/update-oh-my-agent` zu erstellen. Der PR enthält die neue Versionsnummer, einen Link zum oh-my-agent-Repository und die konfigurierten Labels. Existiert der Branch bereits (von einem vorherigen nicht geschlossenen PR), wird der vorhandene PR aktualisiert.

- **`commit`-Modus:** Konfiguriert Git als `github-actions[bot]`, stagt `.agents/` und `.claude/`, committet mit der konfigurierten Nachricht und pusht in den Basis-Branch.

