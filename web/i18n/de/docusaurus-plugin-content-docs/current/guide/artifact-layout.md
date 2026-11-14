---
title: Artefakt-Layout
sidebar_label: Artefakt-Layout
description: Wo OMA gepflegte Dokumente, Ausführungsberichte und Laufzeitzustand speichert und wie Legacy-Orte migriert werden.
---

# Artefakt-Layout

OMA verwendet drei Orte: `docs/` für gepflegte Projektdokumente, `.agents/results/` für menschenlesbare Ausführungsberichte und `.agents/state/` für Koordination und Ausführungsbelege. Die Pfade unten sind relativ zum Projektstamm.

## Gepflegte Dokumente

| Ort | Inhalt |
|----------|---------|
| `docs/decisions/` | Vorschläge für Vorgehen, Abwägungen und Architecture Decision Records (ADRs) |
| `docs/plans/work/` | Arbeitspläne, Fortschritt, Entscheidungsprotokolle und der Tracker für technische Schulden |
| `docs/plans/contracts/` | Übernommene API-Verträge |
| `DESIGN.md` | UI-Designsystem: Typografie, Farbe, Abstände, Bewegung und Komponenten |

Verwenden Sie in Entscheidungsdokumenten ein Feld `Status`, um `draft`, `accepted` oder `superseded` festzuhalten. Bewahren Sie eine abgelöste Entscheidung auf und verlinken Sie den Ersatz, damit ihre Begründung verfügbar bleibt. `design` bezeichnet in OMA das UI-Design; technische Vorschläge und ADRs teilen sich `docs/decisions/`.

Verwenden Sie einen Projekt-Dokumentindex, etwa `docs/README.md`, um auf die gepflegten Dokumente zu verlinken. Die Artefakt-Migration verschiebt vorhandene Dateien; sie legt keinen Index an und ändert den Status eines Dokuments nicht.

## Ausführungsberichte und Laufzeitzustand

| Ort | Inhalt |
|----------|---------|
| `.agents/results/result-*.md` | Menschenlesbare Ergebnisberichte von Agenten und Workflows |
| `.agents/results/architecture/` | Architekturanalyse und Empfehlungen |
| `.agents/results/bugs/` | Fehlerberichte |
| `.agents/results/refactor/` | Refactoring-Pläne und Berichte |
| `.agents/results/security/` | Berichte von Sicherheitsprüfungen |
| `.agents/results/market/` | Marktforschungs-Briefings |
| `.agents/results/recap/` | Arbeitszusammenfassungen |
| `.agents/results/explain/` | HTML-Erklärungen |
| `.agents/results/api-contracts/` | Entwürfe von API-Verträgen |
| `.agents/results/plan-{sessionId}.json` | Aktueller Aufgabenplan |
| `.agents/state/memories/` | Sitzungszusammenfassungen, Task-Boards, Fortschritt, Lessons und Experimentaufzeichnungen |
| Laufzeit `agent-runs/` | Strukturierte Belege (Receipts), Ergebnisdeklarationen (Claims) und Verifikationsbelege |
| Laufzeit `agent-plans/` | Eingefrorene Ausführungspläne |

Berichtsunterverzeichnisse bleiben nach Domäne getrennt. Menschenlesbare Berichte ergänzen die strukturierten Belege; sie belegen eine verifizierte Fertigstellung nicht allein. Siehe [Agentenergebnisse und Fortsetzen](../agent-results-and-resume/).

Aktuelle Belege (Receipts) und eingefrorene Pläne liegen im Projektzustandsverzeichnis des aktiven Profils. Ältere Projekte können sie unter `.agents/state/` behalten. Diese Migration ändert ihre Speicher- und Verifikationsbindung nicht.

## Ein gepflegtes Dokument hochstufen

Wenn ein Ausführungsartefakt zur Projektreferenz wird, verschieben Sie es an den passenden gepflegten Ort. Verschieben Sie zum Beispiel einen übernommenen Vertrag von `.agents/results/api-contracts/` nach `docs/plans/contracts/`, oder machen Sie eine Architekturempfehlung zu einem Entscheidungsdatensatz in `docs/decisions/`. Lassen Sie am alten Ort einen Link und aktualisieren Sie den Dokumentindex.

Wenn strukturierte Ausführungsbelege die ursprüngliche Datei oder ihren Hash festhalten, lassen Sie diese Datei unangetastet und legen Sie stattdessen eine gepflegte Fassung an. Verlinken Sie das gepflegte Dokument aus dem Projektindex.

Install, Update und Link ignorieren `.agents/results/`, `.agents/state/` und `docs/plans/` in Git standardmäßig. `docs/decisions/` liegt außerhalb dieser Standard-Ignorierung. Prüfen Sie die `.gitignore` des Projekts, wenn Sie einen Vertrag oder Arbeitsplan übernehmen, den das Team versionieren soll.

## Ein bestehendes Projekt migrieren

Sehen Sie sich die Migration zuerst in der Vorschau an:

```bash
oma docs migrate --dry-run
```

Für strukturierte Ausgabe fügen Sie `--json` hinzu. Wenden Sie dieselbe Migration ausdrücklich an, wenn Sie soweit sind:

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` und `oma update` führen diese Migration ebenfalls aus. Sie führt diese Legacy-Orte zusammen:

<!-- oma-docs:ignore-start -->
| Legacy-Ort | Ziel |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` und ihre verfassten Diagramm-Sidecars | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Entscheidungsdokumente behalten ihre Unterverzeichnisstruktur. Legacy-Architektur-ADRs ziehen mit ihren verfassten Sidecars `.archify.json` und `.archify.html` um. Laufspezifische Reviews, Empfehlungen und Validierungsprotokolle bleiben im Ergebnisverzeichnis. Die Ergebnis-Migration erfasst `result-*.md`-Dateien auf der obersten Ebene der beiden Memory-Verzeichnisse; andere Memory-Dateien bleiben an ihrem Ort.

Die Migration erhält vorhandene Zieldateien. Wenn eine andere Datei denselben Namen hat, hängt sie ein Quellsuffix an, etwa `001-cache--from-plan-designs.md`, und meldet den gewählten Pfad. Ist dieser Name belegt, hängt sie einen stabilen Inhaltshash an. Ein erneuter Lauf der Migration erzeugt keine doppelten Kopien und benennt bereits migrierte Dateien nicht um.

Sie aktualisiert unterstützte Markdown-Links und Pfadverweise in verschobenen Dokumenten, in Markdown-Koordinationsnotizen, in `docs/**/*.md` sowie in `README*.md` und `AGENTS.md` im Stamm. Prüfen Sie diese Änderungen mit dem Migrationsbericht und dem Git-Diff. Strukturierte Laufzeitbelege und UI-Dateien `DESIGN.md` sind vom Umschreiben der Verweise ausgenommen. Vorhandene Blöcke `oma-docs:ignore-start` / `oma-docs:ignore-end` bewahren Beispiele von Legacy-Pfaden.

Prüfen Sie den Bericht auf zurückgestellte Dateien. Ein Ergebnisbericht, auf den strukturierte Ausführungsbelege verweisen, bleibt an seinem ursprünglichen Pfad, damit der aufgezeichnete Beleg (Receipt) und der Hash gültig bleiben. Belege (Receipts), Ergebnisdeklarationen (Claims), eingefrorene Ausführungspläne und andere Laufzeitbelege bleiben an ihrem Ort. Die Migration stuft Vertragsentwürfe nicht hoch, nimmt Entscheidungen nicht an und ändert das UI-Designsystem nicht.
