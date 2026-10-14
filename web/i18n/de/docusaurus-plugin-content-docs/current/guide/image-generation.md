---
title: "Anleitung: Bildgenerierung"
sidebar_label: Bildgenerierung
description: Vollständige Anleitung zur Bildgenerierung in oh-my-agent mit Multi-Vendor-Dispatch über Codex (gpt-image-2), Pollinations (flux/zimage, kostenlos) und Antigravity über Gemini Code Assist, Referenzbildern, Kosten-Guardrails, Output-Layout, Troubleshooting und gemeinsamen Aufrufmustern.
---

# Bildgenerierung

`oma-image` ist der Multi-Vendor-Bildrouter für oh-my-agent. Er erzeugt Bilder aus natürlichsprachlichen Prompts, leitet die Anfrage an die Vendor-CLI weiter, bei der Sie authentifiziert sind, und schreibt neben dem Output ein Manifest mit den Eingaben und Anbieterentscheidungen, die zur Prüfung oder Wiederholung eines Laufs erforderlich sind. Die Ausgabe eines Live-Anbieters kann dennoch variieren.

Der Skill aktiviert sich bei Formulierungen wie „generate an image“, „create an image“, „make a picture“, „draw me …“ oder „image of …“, bei einem Vendor-Namen (`gpt-image`, `nano-banana`, `pollinations`) oder wenn ein anderer Skill ein Bild als Nebeneffekt benötigt (Hero-Shot, Thumbnail, Produktfoto).

> **TL;DR** Sie benötigen eines davon: `POLLINATIONS_API_KEY` (kostenloses `flux` / `zimage`), `codex login` (gpt-image-2 über Ihren ChatGPT-Plan) oder ein angemeldetes `agy`. Führen Sie `oma image doctor` aus, dann `oma image generate "<prompt>" --vendor pollinations`. Bilder und `manifest.json` landen in `.agents/results/images/{timestamp}-{shortid}/`.

---

## Wann verwenden

- Generieren von Bildern, Illustrationen, Produktfotos, Concept Art, Hero-/Landing-Visuals
- Vergleich desselben Prompts über mehrere Modelle hinweg (`--vendor all`)
- Erzeugen von Assets aus jeder Laufzeitumgebung heraus, die oma-Skills lädt (Claude Code, Codex CLI, Antigravity, Cursor und andere)
- Ein anderer Skill (Design, Marketing, Docs) ruft die Bildpipeline als gemeinsame Infrastruktur auf

## Wann NICHT verwenden

- Bearbeiten oder Retuschieren eines vorhandenen Bildes (außerhalb des Geltungsbereichs; dediziertes Tool verwenden)
- Erzeugen von Videos oder Audio (außerhalb des Geltungsbereichs)
- Inline-SVG-/Vektor-Komposition aus strukturierten Daten (Templating-Skill verwenden)
- Einfaches Resize / Format-Konvertierung (eine Bildbibliothek verwenden, nicht eine Generierungspipeline)

---

## Vendoren im Überblick

Der Skill ist CLI-first: Wenn die native CLI eines Vendors rohe Bild-Bytes zurückgeben kann, wird der Subprozess-Pfad gegenüber einem direkten API-Key bevorzugt.

| Vendor | Strategie | Modelle | Trigger | Kosten |
|---|---|---|---|---|
| `pollinations` | Direktes HTTP | Kostenlos: `flux`, `zimage`. Credit-pflichtig: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` gesetzt (kostenlose Anmeldung unter [enter.pollinations.ai](https://enter.pollinations.ai)) | Kostenlos für `flux` / `zimage` |
| `codex` | CLI-first über `codex exec` (ChatGPT OAuth) | `gpt-image-2` | `codex login` (kein API-Key erforderlich) | Wird Ihrem ChatGPT-Plan in Rechnung gestellt |
| `antigravity` | `agy`-CLI über das Gemini-Code-Assist-Abonnement | Das Modell wird intern von `agy` ausgewählt | `agy` installiert und angemeldet | Keine Kosten pro Bild über Code Assist |

So wählt `--vendor` die Vendoren für einen Lauf aus:

| `--vendor` | Laufende Vendoren | Output-Ordner | Exit 5, wenn |
|---|---|---|---|
| `auto` (Standard) | jeder Vendor, dessen Gesundheitsprüfung besteht | `{timestamp}-{shortid}-compare/`, wenn zwei oder mehr laufen | kein Vendor gesund ist |
| `all` | jeder aktivierte Vendor | `{timestamp}-{shortid}-compare/`, wenn zwei oder mehr laufen | ein angeforderter Vendor nicht gesund ist |
| `codex`, `pollinations` oder `antigravity` | dieser Vendor | `{timestamp}-{shortid}/` | dieser Vendor nicht gesund ist |

Der integrierte Vendor-Modus ist `auto`: Er führt **jeden** Anbieter, der seine Gesundheitsprüfung besteht, parallel aus. Übergeben Sie `--vendor pollinations`, um auf dem kostenlosen Pfad zu bleiben. Die Pollinations-Modelle `flux` und `zimage` sind pro Bild kostenlos, benötigen aber weiterhin einen `POLLINATIONS_API_KEY`; Codex und Antigravity erfordern jeweils eine eigene Anmeldung. Kostenschätzungen für kostenpflichtige Läufe verwenden weiterhin das Kostenbestätigungs-Gate.

---

## Schnellstart

Prüfen Sie vor der ersten Generierung, welcher Anbieter bereit ist, und authentifizieren Sie einen der unterstützten Pfade:

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

Ein erfolgreicher Lauf im Textmodus gibt einen Fortschritt wie diesen aus (die Pfade sind beispielhaft):

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Als Skill verwenden

`oma-image` ist ein Skill, der sich automatisch aus natürlicher Sprache aktiviert und auch explizit aufgerufen werden kann. Es gibt drei Einstiegspunkte.

### 1. Natürliche Sprache (automatische Aktivierung)

Beschreiben Sie das Bild einfach in einer beliebigen Laufzeitumgebung, die oma-Skills lädt (Claude Code, Codex CLI, Antigravity, Cursor und andere). Formulierungen wie „generate an image“, „make a picture“, „draw me …“ oder „image of …“ aktivieren den Skill; Laufzeitumgebungen, die Skills anhand ihrer Beschreibung zuordnen, können ihn auch bei Anfragen wie „concept art“ oder „hero shot“ aufgreifen.

Sie müssen sich keine CLI-Flags merken. Formulieren Sie es in Alltagssprache, und der Skill bildet es auf die passenden Optionen ab:

| Sie sagen | Skill leitet ab |
|---|---|
| "mit codex" / "mit gpt-image-2" / "kostenloses flux" | `--vendor codex` / `--vendor pollinations` |
| "über Vendoren vergleichen" / "nebeneinander" | `--vendor all` |
| "Hochformat" / "Querformat" / "1024×1536" | `--size 1024x1536` / `--size 1536x1024` |
| "hohe Qualität" / "Entwurf" | `--quality high` / `--quality low` |
| "drei Varianten" / "gib mir 3" | `-n 3` |
| "in ./hero speichern" / "Output nach docs/assets" | `--output-dir <dir>` |
| Angehängtes Bild + "mach es nächtlich" | `-r <attached path>` |
| "nur Kosten schätzen" / "dry run" | `--dry-run` |

Beispiele:

> "Generiere einen minimalistischen Sonnenaufgang über Bergen für den Landing-Hero, Querformat, hohe Qualität."
> "Vergleiche ein Produktfoto einer Keramiktasse über alle Vendoren, jeweils drei Varianten."
> "Mach dieses Otterfoto mit codex dramatisch und nächtlich." (mit angehängter Referenz)

Der Agent [löst das Briefing auf](#clarification-protocol), füllt Lücken mit Standardwerten und ruft `oma image generate` mit den abgeleiteten Flags auf. Verwenden Sie den Slash-Befehl, wenn Sie die exakten Flag-Werte explizit kontrollieren möchten.

### 2. Expliziter Slash-Befehl

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Jedes CLI-Flag (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) funktioniert auch im Slash-Befehl und wird an dieselbe `oma image generate`-Pipeline weitergeleitet.

### 3. Aus einem anderen Skill (gemeinsame Infrastruktur)

Andere Skills (Design, Marketing, Docs) rufen die Pipeline als gemeinsame Infrastruktur mit JSON-Output auf:

```bash
oma image generate "<prompt>" --output json
```

Mit `--output json` ist stdout ein einzelnes JSON-Objekt `{exitCode, manifestPath, runs}`; jeder Eintrag in `runs` meldet Vendor, Status und Output-Dateien. Den vollständigen Datensatz finden Sie unter `manifestPath`. `--dry-run` gibt vor dem Plan die Textkopfzeile `[oma image] dry-run plan:` aus; überspringen Sie diese Zeile beim Parsen.

---

## CLI-Referenz

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### Wichtige Flags

| Flag | Zweck |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity` oder `all`. Bei `all` muss jeder angeforderte Vendor gesund sein (strict). |
| `-n, --count <n>` | Anzahl der Bilder pro Vendor, 1–5 (durch Wall-Time begrenzt). Standard 1. |
| `--size <size>` | `WxH`, wobei jede Kante ein Vielfaches von 16 zwischen 16 und 3840 ist und das Seitenverhältnis zwischen 1:3 und 3:1 liegt (zum Beispiel `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), oder `auto`. Standard `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high` oder `auto` (Standard). |
| `--output-dir <dir>` | Output-Verzeichnis; Dateien werden direkt darin abgelegt. Standard ist `.agents/results/images/{timestamp}-{shortid}/`. Pfade außerhalb von `$PWD` erfordern `--allow-external-output`. |
| `--allow-external-output` | Erlaubt ein Output-Verzeichnis außerhalb von `$PWD`. |
| `--model <name>` | Überschreibt das Modell für **jeden** Vendor des Laufs; kombinieren Sie es daher mit genau einem `--vendor` (zum Beispiel `--vendor pollinations --model zimage`). `antigravity` ignoriert dies, weil `agy` sein Modell auswählt. |
| `-r, --reference <path>` | Bis zu 10 Referenzbilder (PNG/JPEG/GIF/WebP, je ≤ 5 MB). Wiederholbar oder kommagetrennt. Unterstützt von `codex` und `antigravity`; bei `pollinations` abgelehnt. |
| `-y, --yes` | Überspringt die Kostenbestätigungsabfrage für Läufe mit geschätzten Kosten ≥ `$0.20`. Auch via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Speichert den SHA-256 des Prompts statt des Klartexts in `manifest.json`. |
| `--dry-run` | Gibt den Plan und die Kostenschätzung aus, ohne Geld auszugeben. |
| `--output text\|json` | Format des CLI-Outputs. JSON ist die Integrationsschnittstelle für andere Skills. |
| `--timeout <duration>` | Zeitüberschreitung pro Bild. Standard 180 Sekunden. |

---

## Referenzbilder

Hängen Sie bis zu 10 Referenzbilder an, um Stil, Subjektidentität oder Komposition zu steuern.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Vendor | Referenz-Unterstützung | Wie |
|---|---|---|
| `codex` (gpt-image-2) | Ja | Übergibt `-i <path>` an `codex exec` |
| `antigravity` | Ja | Kopiert Referenzen in ein laufbezogenes Verzeichnis und gewährt `agy` Zugriff darauf |
| `pollinations` | Nein | Abgelehnt mit Exit-Code 4 (erfordert URL-Hosting) |

### Wo angehängte Bilder liegen

- **Claude Code**: `~/.claude/image-cache/<session>/N.png`, in Systemnachrichten als `[Image: source: <path>]` angezeigt. Session-bezogen; an einen dauerhaften Speicherort kopieren, wenn Sie es später wiederverwenden möchten.
- **Antigravity**: Workspace-Upload-Verzeichnis (die IDE zeigt den genauen Pfad an)
- **Codex CLI als Host**: muss explizit übergeben werden; In-Conversation-Anhänge werden nicht weitergeleitet

Wenn der Benutzer ein Bild anhängt und darum bittet, ein Bild auf dieser Basis zu erzeugen oder zu bearbeiten, **muss** der aufrufende Agent es per `--reference <path>` weiterleiten, anstatt es in Prosa zu beschreiben. Falls die lokale CLI zu alt ist, um `--reference` zu unterstützen, `oma update` ausführen und erneut versuchen.

---

## Output-Layout

Standardmäßig schreibt jeder Lauf unter `.agents/results/images/` in einen Ordner mit Zeitstempel und Hash-Suffix; mit `--output-dir` werden die Dateien direkt in dieses Verzeichnis geschrieben:

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` erfasst Vendor, Modell, Prompt (oder dessen SHA-256), Größe, Qualität und Kosten, sodass die Anfrage geprüft und wiederholt werden kann. Bei einem Live-Anbieter erzwingt das nicht identische Pixel.

---

## Kosten, Sicherheit und Abbruch

1. **Kosten-Guardrail**: Läufe mit geschätzten Kosten ≥ `$0.20` fragen nach Bestätigung; ohne interaktives Terminal endet der Lauf mit Exit-Code 1 und einer Meldung, die `--yes` nennt. Umgehung mit `-y` oder `OMA_IMAGE_YES=1`. Nur `--vendor pollinations` mit `flux` / `zimage` ist garantiert kostenlos; `auto` kann auch ein angemeldetes Codex einschließen.
2. **Pfadsicherheit**: Output-Pfade außerhalb von `$PWD` erfordern `--allow-external-output`, um unerwartete Schreibvorgänge zu vermeiden.
3. **Abbrechbar**: `Ctrl+C` (SIGINT/SIGTERM) bricht jeden laufenden Provider-Aufruf und den Orchestrator gemeinsam ab.
4. **Stabiler Laufdatensatz**: `manifest.json` wird stets neben den Bildern geschrieben.
5. **Max `n` = 5**: eine Wall-Time-Grenze, kein Kontingent.
6. **Exit-Codes**: abgestimmt mit `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Wie der Agent ein Briefing auflöst {#clarification-protocol}

Der Agent verwendet, was Sie gesagt haben, und füllt Lücken mit sinnvollen kreativen Standardwerten für Setting, Stil, Beleuchtung und Seitenverhältnis. Er stellt nur dann eine Frage, wenn eine fehlende Entscheidung das Ergebnis wesentlich verändern würde, und wartet nicht auf die Freigabe eines erweiterten Prompts, sobald Sie die Generierung angefordert haben. Ausdrückliche Formulierungen, Text im Bild und die Absicht hinter Referenzen bleiben unverändert erhalten.

| Sie sagen | Was passiert |
|---|---|
| "a red apple" | Wird sofort generiert; der Agent ergänzt Setting, Stil, Beleuchtung und Größe |
| "a red apple as a flat vector icon, 512x512" | Ihr Stil und Ihre Größe werden unverändert verwendet |
| "something for the homepage" | Eine Frage zum Subjekt, weil es das Ergebnis verändert |

Was genau an den Anbieter gesendet wurde, sehen Sie im Feld `prompt` in `manifest.json` (mit `--no-prompt-in-manifest` als SHA-256 gespeichert).

---

## Konfiguration

- **Projektkonfiguration:** der Abschnitt `image:` in `.agents/oma-config.yaml`. Die veraltete `config/image-config.yaml` wird nicht mehr gelesen.
- **Umgebungsvariablen:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: überschreibt den konfigurierten Standard-Vendor (`auto`). Das Flag `--vendor` selbst ist standardmäßig `auto`; übergeben Sie `--vendor` daher pro Befehl, wenn Sie einen bestimmten Vendor benötigen.
  - `OMA_IMAGE_DEFAULT_OUT`: überschreibt das Standard-Output-Verzeichnis
  - `OMA_IMAGE_YES`: `1` zum Überspringen der Kostenbestätigung
  - `POLLINATIONS_API_KEY`: erforderlich für den pollinations-Vendor (kostenlose Anmeldung)

---

## Troubleshooting

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| Exit-Code `5` (auth-required) | Ausgewählter Vendor ist nicht authentifiziert | `oma image doctor` ausführen, um zu sehen, welcher Vendor sich anmelden muss. Anschließend `codex login`, bei `agy` anmelden oder `POLLINATIONS_API_KEY` setzen. |
| Exit-Code `4` bei `--reference` | `pollinations` lehnt Referenzen ab oder Datei zu groß / falsches Format | Auf `--vendor codex` oder `--vendor antigravity` wechseln. Jede Referenz muss ≤ 5 MB und im Format PNG/JPEG/GIF/WebP sein. |
| `--reference` wird nicht erkannt | Lokale CLI ist veraltet | `oma update` ausführen und erneut versuchen. Nicht auf eine Beschreibung in Prosa zurückfallen. |
| Kostenbestätigung blockiert Automatisierung | Lauf ist auf ≥ `$0.20` geschätzt | `-y` übergeben oder `OMA_IMAGE_YES=1` setzen. Besser: auf das kostenlose `pollinations` umsteigen. |
| `--vendor all` bricht sofort ab | Einer der angeforderten Vendoren ist nicht gesund (Strict-Modus) | Den fehlenden Vendor installieren/anmelden oder einen spezifischen `--vendor` wählen. |
| Output wird in unerwartetes Verzeichnis geschrieben | Standard ist `.agents/results/images/{timestamp}-{shortid}/` | `--output-dir <dir>` übergeben. Pfade außerhalb von `$PWD` benötigen `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (Exit 1) | `--output-dir` zeigt aus dem Projekt heraus | Mit `--allow-external-output` erneut ausführen (die Meldung nennt noch den alten Flag-Namen) oder ein Verzeichnis innerhalb des Projekts wählen. |
| Mehrere Vendoren liefen und der Ordner endet auf `-compare` | `--vendor auto` führt jeden gesunden Vendor aus | Genau einen `--vendor` übergeben, um nur einen Vendor auszuführen. |
| Antigravity schlägt trotz bestandener Gesundheitsprüfung fehl | `agy --version` bestätigt die Installation, nicht die Anmeldung | Bei Gemini Code Assist anmelden, dann mit `oma image doctor` und `--vendor antigravity` erneut versuchen. |

---

## Nächste Schritte

- [Videogenerierung](./video-generation.md): `oma-video` nutzt `oma-image` als visuellen Anbieter
- [Content- und Research-Workflows](./content-and-research.md): weitere Content-Fähigkeiten und ihre Voraussetzungen
- [Skills](../core-concepts/skills.md): die zweischichtige Skill-Architektur, die `oma-image` antreibt
- [CLI-Befehle: image](../cli-interfaces/commands.md#image): vollständige Referenz der `oma image`-Befehle
- [CLI-Optionen](../cli-interfaces/options.md): Matrix der globalen Optionen
