---
title: "Anleitung: Diagramm-Engine (archify)"
sidebar_label: Diagramme
description: So wählt oh-my-agent zwischen Mermaid und dem optionalen Agenten-Skill tt-a1i/archify für Architektur-, Sequenz- und Datenflussdiagramme — der Diagramm-Konfigurationsabschnitt, oma diagram resolve / oma diagram archify, die Nutzung durch /architecture und /explain, die begrenzte Schleife aus Validieren, Reparieren und Ausliefern sowie die Stack-Route über den Upstream-Skill Caru-ini/stack-diagram für Tech-Stack-Poster mit Vendor-Logos.
---

# Diagramm-Engine

`/architecture` (ADRs, Empfehlungen, Reviews) und `/explain` (Erklärungen zu Codeänderungen) erzeugen beide Strukturdiagramme. Bei `/architecture` sind das immer **Mermaid**-Blöcke im Markdown-Artefakt (`/explain` zeichnet eigene Inline-SVG-Diagramme), und zusätzlich — sobald [archify](https://github.com/tt-a1i/archify) aufgelöst werden kann — ein **interaktives, validiertes HTML-Diagramm** neben dem Artefakt: mit dunklem/hellem Theme, Pan-Zoom, Suche, Nachverfolgung von Beziehungen und PNG-/SVG-/WebM-Export, aus einer typisierten JSON-Spezifikation gerendert.

Mermaid bleibt erhalten: Es ist die Text-SSOT im Markdown und in Git-Diffs. archify ist ein abgeleitetes Artefakt.

---

<a id="always-the-latest-archify--nothing-to-install"></a>
## archify installieren {#install-archify}

archify ist ein MIT-lizenzierter Agenten-Skill (Node ≥ 18, keine Laufzeitabhängigkeiten). oh-my-agent verwendet die über die [skills CLI](https://github.com/vercel-labs/skills) installierte Kopie und hält keine eigene Kopie vor:

- `oma diagram update` installiert archify, wenn es fehlt (`bunx skills add tt-a1i/archify --skill archify -g -y`), und aktualisiert es andernfalls (`bunx skills update archify -g -y`).
- `oma diagram resolve` liest nur installierte Skill-Verzeichnisse und greift nie auf das Netzwerk zu. Ohne Installation fällt `auto` auf Mermaid zurück und nennt den Installationsbefehl.
- `oma update` installiert archify nicht.

```bash
# Illustrative output; the version, install path, and quality can vary.
oma diagram update
oma diagram resolve
# engine:   archify  (requested: auto)
# reason:   archify 2.15.0 via home:~/.agents/skills
# root:     /Users/you/.agents/skills/archify
# bin:      /Users/you/.agents/skills/archify/bin/archify.mjs
# version:  2.15.0
# quality:  showcase
# sidecar:  off (explain)
```

Auflösungsreihenfolge (der erste Treffer gewinnt und ist für jede Vendor-Laufzeit gleich):

1. `diagram.archify.path` in `oma-config.yaml` — expliziter Pin
2. Umgebungsvariable `ARCHIFY_HOME` — expliziter Pin
3. Installierte Skill-Verzeichnisse: Projekt `.agents` / `.claude` / `.codex` / `.cursor` / `.qwen` / `.kiro` / `.gemini` / `.copilot` `/skills/archify`, danach dieselben Verzeichnisse unter `~`, danach `~/.config/agents/skills/archify` und `~/.raven/workspace/skills/archify`

<!-- oma-docs:ignore-start -->
Ein Treffer erfordert, dass das installierte oder angeheftete archify-Verzeichnis `bin/archify.mjs` enthält.
<!-- oma-docs:ignore-end -->

Frühere Releases hielten eine eigene Kopie unter `~/.cache/oma-diagram/` vor. Sie wird nicht mehr gelesen; Sie können sie löschen.

---

## Konfiguration {#configuration}

Der sparsame Konfigurationsabschnitt in `.agents/oma-config.yaml` (fehlende Schlüssel verwenden die angegebenen Standardwerte):

```yaml
diagram:
  engine: auto                # auto | archify | mermaid
  explain_sidecar: false      # /explain also writes an archify sidecar
  archify:
    path: null                # explicit install dir (pin)
    quality: showcase         # showcase | standard  → --quality
    open: false               # pass --open to deliver
```

`archify.managed`, `archify.channel` und `archify.check_interval_min` sind veraltet: Sie werden weiterhin validiert, aber ignoriert, und `resolve` gibt eine Warnung aus, solange sie gesetzt sind.

### Welche Engine läuft {#which-engine-runs}

Eine einzige Entscheidung deckt den Konfigurationswert ab, ob archify aufgelöst wird und was der Workflow ausliefert. „Aufgelöst“ bedeutet, dass ein beliebiger Schritt der [Auflösungsreihenfolge](#always-the-latest-archify--nothing-to-install) eine Installation findet: einen Pin oder ein installiertes Skill-Verzeichnis.

| `diagram.engine` | archify aufgelöst? | `oma diagram resolve --json` | Ergebnis von `/architecture` |
|---|---|---|---|
| `auto` (Standard) | ja | `engine: archify`, `ok: true` | Mermaid-Block + verlinktes `.archify.html` |
| `auto` | nein (archify nicht installiert) | `engine: mermaid`, `ok: true` | Nur Mermaid; der Bericht nennt `oma diagram update` |
| `archify` | ja | `engine: archify`, `ok: true` | Mermaid-Block + verlinktes `.archify.html` |
| `archify` | nein | `engine: mermaid`, `ok: false`, Exit-Code 1 | Der Workflow stoppt mit dem Hinweis auf `oma diagram update`, statt still herunterzustufen |
| `mermaid` | nicht geprüft | `engine: mermaid`, `ok: true` | Nur Mermaid; archify wird nie aufgerufen |

`oma diagram resolve --engine <auto|archify|mermaid>` überschreibt die Konfiguration für einen Aufruf, und ein Prompt kann dasselbe für einen Lauf tun (`/explain 640 with archify`).

---

## CLI {#cli}

```bash
oma diagram resolve [--engine auto|archify|mermaid] [--json]
oma diagram update  [--json]
oma diagram archify <archify args…>
```

`oma diagram update` erzwingt eine Aktualisierung und beendet sich mit Exit-Code 1, wenn keine archify-Installation aufgelöst werden kann.

`oma diagram archify` führt die aufgelöste archify-Binärdatei mit `ARCHIFY_UPDATE_CHECK_DISABLED=1` (kein Netzwerk) aus und reicht den Exit-Code weiter. Daher verhalten sich `validate` / `deliver` / `visual-check` genau so, wie es die archify-Dokumentation beschreibt:

```bash
oma diagram archify guide "show the auth request lifecycle" --json
oma diagram archify validate architecture adr-auth.archify.json --quality showcase --json
oma diagram archify deliver  architecture adr-auth.archify.json adr-auth.archify.html --quality showcase --json
oma diagram archify visual-check adr-auth.archify.html --json   # exit 2 = no Chrome (skipped), or archify itself could not be resolved
```

`--json` bei `resolve` gibt `{ ok, requested, engine, quality, open, explainSidecar, archify?: { root, bin, version, source }, reason, probed, warnings }` zurück — `source` ist `config:…`, `env:…` oder eine Skill-Verzeichnis-Bezeichnung wie `home:~/.agents/skills`; `warnings` listet ignorierte veraltete Schlüssel auf. `--refresh` und `--offline` werden als veraltete No-ops akzeptiert.

---

## Nutzung durch die Workflows {#how-the-workflows-use-it}

Das gemeinsame Protokoll liegt in `.agents/skills/_shared/conditional/diagram-engine.md`. `/architecture` folgt dieser Reihenfolge:

1. `oma diagram resolve --json`
2. Zuerst den Mermaid-Block schreiben (immer).
3. Bei `engine: archify` die Mermaid-Topologie in das JSON-IR von archify (`architecture` / `sequence` / `dataflow` / `lifecycle` / `workflow`) übersetzen und dabei nur das passende Schema und ein Beispiel aus der Installation lesen.
4. `validate` → reparieren → `deliver`, begrenzt: Stoppen, wenn die Spezifikation besteht, wenn archifys Konvergenzregel greift, nach 3 Reparaturversuchen, nach insgesamt 10 Minuten oder wenn sich dieselbe Diagnose wiederholt. Semantische Labels werden nie nur zum Bestehen gelöscht.
5. Das HTML verlinken — niemals einbetten.

```mermaid
flowchart TD
  resolve["oma diagram resolve --json"] -->|"ok: false"| stop["Stop: run oma diagram update once online"]
  resolve -->|"ok: true"| author["Author the Mermaid block"]
  author --> engine{"engine?"}
  engine -->|mermaid| mermaidOnly["Deliver the Mermaid block"]
  engine -->|archify| spec["Translate the topology into .archify.json"]
  spec --> loop["validate and repair (bounded)"]
  loop -->|passes| deliver["deliver .archify.html"]
  loop -->|"bound or convergence reached"| keep["Keep Mermaid, leave .archify.json, report diagnostics"]
  deliver --> link["Link the HTML from the Markdown"]
```

### `/architecture` {#architecture}

Nur für strukturelle Entscheidungen (Grenzen, Abhängigkeiten, Datenfluss). Ausgabe neben dem Markdown-Artefakt unter `.agents/results/architecture/`:

```text
adr-notification-service.md            # Mermaid block + "Interactive:" link
adr-notification-service.archify.json  # frozen spec (kept even on failure)
adr-notification-service.archify.html  # delivered viewer
```

### `/explain` {#explain}

Opt-in, weil der eigene Vertrag des Explainers (eine eigenständige Datei mit CSS-Variablen-Theming) das Einbetten eines zweiten vollständigen HTML-Dokuments nicht zulässt. Aktivieren Sie es mit `diagram.explain_sidecar: true`, übergeben Sie `oma explain render --archify` oder fragen Sie im Prompt danach („with archify“). Es gibt keinen Mermaid-Block und kein handgeschriebenes JSON: Der Renderer leitet die archify-Spezifikation aus einem `flow`- oder `sequence`-Block des Entwurfs ab (dem mit `{archify}` markierten Panel), führt `deliver` aus (mit einmaligem Fallback von der Qualität `showcase` auf `standard`) und verlinkt `{date}-{slug}.archify.html` mit einem einfachen `<a href>`. Der Befehl meldet `linked`, `skipped` (mit dem Grund) oder `failed` (erste Diagnose). Der Workflow wiederholt ein fehlgeschlagenes Sidecar nicht, und ein Fehler des Sidecars blockiert den Explainer nie.

---

## Stack-Poster (stack-diagram) {#stack-posters-stack-diagram}

Wenn das Diagramm eine Tech-Stack- oder Infrastrukturtopologie ist, deren Knoten Vendor-Produkte sind (AWS, Vercel, Postgres, …), und Sie nach Logos fragen, nimmt `/architecture` statt archify die **Stack-Route**. Sie führt den Upstream-Agenten-Skill [Caru-ini/stack-diagram](https://github.com/Caru-ini/stack-diagram) (MIT; Python 3.9+, Netzwerkzugriff für Logos) genauso aus, wie `oma-slide` ppt-master ausführt: Es gibt keinen oma-Befehl und keinen Konfigurationsschlüssel. Die Routentabelle liegt in `.agents/skills/_shared/conditional/diagram-engine.md`.

- Auflösung: zuerst der Skill-Katalog der Laufzeit, andernfalls `bunx skills use caru-ini/stack-diagram@stack-diagram`. Lässt er sich nicht auflösen, fällt der Workflow auf die obige Entscheidung archify ↔ Mermaid zurück und meldet das.
- Ausgabe: `<artifact-stem>.stack.html` neben dem Markdown-Artefakt, im Diagramm-Abschnitt als `Stack: …` verlinkt. Der Mermaid-Block bleibt die SSOT.
- Nur HTML. Der PNG-Export und die Screenshot-Prüfung des Upstreams benötigen Playwright + Chromium; oma installiert oder startet sie nie.
- Der Galerie-Upload des Upstreams (`share.py`) wird übersprungen, sofern Sie nicht ausdrücklich um eine Veröffentlichung bitten.
- Grenzen: 2 Build-Versuche, insgesamt 5 Minuten; ein sauberer `build.py`-Lauf gilt als Abnahme.
- `/explain` nimmt diese Route nie; sein Sidecar wird im Code aus dem Entwurf abgeleitet.

Schreiben Sie „archify“ in den Prompt, um die strukturelle Route zu erzwingen, oder „stack-diagram“ / „with logos“, um die Stack-Route zu erzwingen.

---

## Fehlerfälle {#failure-modes}

Ein nicht auflösbares archify behandelt die [Entscheidungstabelle der Engine](#which-engine-runs). Die übrigen Fälle:

| Situation | Ergebnis |
|---|---|
| `oma diagram update` schlägt fehl (offline, `bunx` fehlt) | Der Fehler der skills CLI wird angezeigt; eine vorhandene Installation funktioniert weiterhin |
| `validate` konvergiert nie | Mermaid bleibt das ausgelieferte Diagramm; die letzte `.archify.json` bleibt für eine manuelle Prüfung liegen und Diagnosen werden wörtlich gemeldet |
| Chrome fehlt für `visual-check` | Als `skipped` gemeldet, niemals als bestanden |
| `oma diagram archify …` endet mit Exit-Code 2 | Entweder fehlt Chrome (`visual-check`) oder archify konnte nicht aufgelöst werden; prüfen Sie zuerst `oma diagram resolve --json` |

---

## Nächste Schritte {#next-steps}

- [Code-Erklärer](./code-explainer.md) — der `/explain`-Workflow und sein optionales archify-Sidecar
- [`/architecture`-Workflow](../core-concepts/workflows.md#architecture) — ADRs und Reviews, die den Mermaid-Block enthalten
- [Semantik von oma-config.yaml](./oma-config-semantics.md) — wie der Abschnitt `diagram:` zusammengeführt wird
- [CLI-Befehle: diagram](../cli-interfaces/commands.md#diagram) — vollständige Optionsliste
- [Marktforschung](./market-research.md) — dasselbe Installationsmuster über die skills CLI für die last30days-Engine
- archify upstream: [tt-a1i/archify](https://github.com/tt-a1i/archify)
- stack-diagram upstream: [Caru-ini/stack-diagram](https://github.com/Caru-ini/stack-diagram)
