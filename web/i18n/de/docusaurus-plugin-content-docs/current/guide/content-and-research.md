---
title: "Anleitung: Content- und Research-Workflows"
sidebar_label: Übersicht
description: Den passenden oh-my-agent-Weg samt Voraussetzungen für PDF- und HWP-Extraktion, Sprachausgabe, wissenschaftliche und Web-Recherche, Folien, Bilder, Video, Code-Erklärungen, Diagramme, Marktforschung, Recaps, Übersetzung und akademisches Schreiben auswählen.
---

# Content- und Research-Workflows

Wählen Sie den benötigten Artefakttyp und verwenden Sie den kleinsten Befehls- oder Skill-Einstiegspunkt, der ein prüfbares Ergebnis liefert.

| Bedarf | Einstiegspunkt | Voraussetzungen | Erstes Ergebnis | Anleitung |
|---|---|---|---|---|
| PDF extrahieren | Skill `oma-pdf` oder die folgenden `uvx opendataloader-pdf`-Befehle | `uv` (für `uvx`) | Markdown, Text, JSON oder ein kurzer Extraktionsbericht | [unten](#extract-pdf-content) |
| HWP/HWPX/HWPML extrahieren | Skill `oma-hwp` und `bunx kordoc@latest` | Bun | Markdown oder strukturiertes JSON/Chunks | [unten](#extract-hwp-family-documents) |
| Sprachausgabe erzeugen oder Audio transkribieren | `/oma-voice` | Voicebox-App auf `127.0.0.1:17493` oder VoiceStudio auf `127.0.0.1:3900` | Audio mit Manifest oder `transcript.md` mit Manifest | [unten](#generate-speech-or-transcribe-audio) |
| Paper finden und validieren | `oma scholar` | keine; optional `S2_API_KEY`, `OPENALEX_EMAIL` | Suchergebnisse, ein abgerufenes Sidecar oder ein Lint-Bericht | [unten](#search-and-validate-scholarly-material) |
| Im Web suchen oder eine Seite abrufen | Skill `oma-search`, `oma search` | optional Chrome, Python `curl_cffi`, `yt-dlp`, `gh` (mit `oma search doctor` prüfen) | JSON auf stdout | [CLI-Befehle: search](../cli-interfaces/commands.md#search) |
| Präsentation erstellen | Skill `oma-slide` und `oma slide` | Chrome oder `OMA_CHROME_PATH` | Validierte HTML-Folien und optionale Exporte | [unten](#slides-and-presentations) |
| Bilder generieren | Skill `oma-image`, `oma image generate` | eines von `POLLINATIONS_API_KEY`, `codex login` oder ein angemeldetes `agy` | Bilder mit `manifest.json` unter `.agents/results/images/` | [Bildgenerierung](./image-generation.md) |
| Ein Short-, Erklär- oder Demovideo erstellen | `/video`, `oma video` | Node.js 22+, FFmpeg, danach `oma video doctor --install` | Ein Laufverzeichnis unter `.agents/results/videos/`; ein MP4 nach `oma video render` | [Videogenerierung](./video-generation.md) |
| Eine Änderung oder ein Thema auf einer Seite erklären | `/explain`, `oma explain` | git für den Änderungsmodus; `gh` für PR-Referenzen | Eigenständiges HTML unter `.agents/results/explain/` | [Code-Erklärer](./code-explainer.md) |
| Interaktives Architekturdiagramm | `/architecture`, `oma diagram` | keine; archify wird bei der ersten Nutzung abgerufen | Mermaid-Block, plus `.archify.html`, wenn archify aufgelöst wird | [Diagramm-Engine](./diagram-engine.md) |
| Marktforschung in Communitys | Skill `oma-market`, `oma market` | Python 3.12+ | Ein Briefing unter `.agents/results/market/` | [Marktforschung](./market-research.md) |
| Agentengespräche zusammenfassen | `/recap`, `oma recap` | keine | Recap-JSON aus der CLI; ein datierter Markdown-Recap aus `/recap` | [unten](#recap-agent-conversations) |
| Lokalisierte Prosa übersetzen oder prüfen | Skill `oma-translation` | keine | Zielsprachentext oder evidenzbasierte Prüfung | [unten](#translate-or-review-localized-content) |
| Akademische Prosa entwerfen oder prüfen | Skill `oma-academic-writing` | keine | Entwurf, Überarbeitung oder Compliance-Bericht mit Claim-Evidence-Map | [unten](#draft-or-audit-academic-writing) |

Die in dieser Seite genannten `oma`-Befehle sind registrierte öffentliche Befehle. `uvx`, `bunx` und `bun` sind externe Konvertierungswerkzeuge, die von ihren zuständigen Skills dokumentiert werden. Die übrigen [Skills](../getting-started/glossary.md#skill) sind Einstiege über natürliche Sprache oder Slash-Befehle; es gibt keinen eigenständigen Befehl `oma pdf`, `oma hwp`, `oma voice`, `oma translation` oder `oma academic-writing`.

## PDF-Inhalte extrahieren {#extract-pdf-content}

Verwenden Sie den Skill `oma-pdf`, wenn die Eingabe ein PDF ist und die Ausgabe für Menschen, ein LLM oder eine Retrieval-Pipeline lesbare Struktur benötigt. Der Skill prüft zunächst die Textebene, bevor er Standard-, Tagged- oder Hybrid-OCR-Extraktion auswählt.

Für eine schnelle Prüfung der Textebene geben Sie einen kleinen Seitenbereich aus, ohne eine Ausgabedatei zu erzeugen:

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Für Markdown-Extraktion und Normalisierung:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

Wählen Sie für große Dokumente mit `--pages` einen Seitenbereich. Wenn die Textebene lesbar ist, bleiben Sie bei der Standardextraktion. Ist eine Tagged-Struktur vorhanden, aber die Lesereihenfolge schlecht, versuchen Sie es erneut mit `--use-struct-tree`; bei fehlerhaften Tabellen probieren Sie `--table-method cluster` oder `--markdown-with-html`, bevor Sie auf OCR wechseln.

Bei einem gescannten oder bildbasierten PDF starten Sie den Hybrid-Server und anschließend den Hybrid-Konverter:

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

Definieren Sie in einem zweiten Terminal das Ausgabeverzeichnis und führen Sie den Konverter aus:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

Das erfolgreiche Artefakt ist die Markdown- oder Textdatei im ausgewählten Ausgabeverzeichnis, zusammen mit der Seitenanzahl und etwaigen Qualitätshinweisen. Verschlüsselte PDFs benötigen eine entsperrte Kopie oder ein Passwort. Bei großen Dateien können getrennte Seitenbereiche und Ausgabeverzeichnisse nötig sein, damit wiederholte Läufe denselben Basisnamen nicht überschreiben. Behandeln Sie OCR-Vermutungen nicht als Quellenfakten und melden Sie unsichere oder fehlende Tabellen.

## Dokumente der HWP-Familie extrahieren {#extract-hwp-family-documents}

Verwenden Sie `oma-hwp` für Dateien mit den Endungen `.hwp`, `.hwpx` und `.hwpml`. Der Skill führt `kordoc` über Bun aus und verarbeitet danach Markdown-Tabellen und Glyphen aus dem Private Use Area, wenn nötig.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

Bei einem frischen Clone kann der Helfer `Cannot find module "turndown"` melden. Führen Sie dann `bun install` im Verzeichnis `resources/` des `oma-hwp`-Skills aus und starten Sie den Helfer erneut.

Verwenden Sie für einen Batch ein ausdrückliches Ausgabeverzeichnis:

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

Die Standardausgabe ist Markdown. Für einen strukturierten AST verwenden Sie `bunx kordoc@latest "<input.hwp>" --format json`; für auf Retrieval ausgerichtete Chunks verwenden Sie `--format chunks`. Die Konvertierungsoptionen `--dedupe-headers`, `--keep-empty-cols` und `--inline-images` steuern häufige Tabellen- und Bildfälle. Prüfen Sie Überschriften, verschachtelte oder zusammengeführte Tabellen, Listen, Bilder, Fußnoten und Links im Ergebnis, bevor Sie es an einen anderen Skill übergeben.

`bun` und `bunx` sind Voraussetzungen. Eine leere Ausgabe kann auf gescannte Bildinhalte hinweisen; leiten Sie diesen Fall an einen OCR-fähigen Workflow weiter. Verschlüsselte oder DRM-beschränkte Inhalte können unvollständig bleiben. PDF-, DOCX- und XLSX-Eingaben gehören zu den passenden Skills, auch wenn `kordoc` weitere Erstellungs- und Parsing-Unterbefehle besitzt.

## Sprachausgabe erzeugen oder Audio transkribieren {#generate-speech-or-transcribe-audio}

`oma-voice` ist MCP-nativ und verwendet einen lokalen Voicebox-Server. Rufen Sie es in einem Agenten mit einem Slash-Befehl auf:

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS akzeptiert pro Aufruf bis zu 5.000 Zeichen und benötigt ein Voicebox-Stimmprofil. Für die Transkription ist kein TTS-Profil erforderlich; sie akzeptiert Audio bis zu 30 Minuten. Persistierte TTS- und STT-Ergebnisse werden unter `.agents/results/voice/` abgelegt; eine Transkription erzeugt `transcript.md` und `manifest.json`. Der Benachrichtigungsmodus bleibt normalerweise in Voicebox Captures und schreibt keine lokale Audiodatei.

Der lokale MCP-Endpunkt ist `http://127.0.0.1:17493/mcp`. Bei der ersten Verwendung wird Voicebox beim Agenten registriert; die Voicebox-Desktop-App stellt Stimmprofile bereit. Der Skill ermittelt die tatsächlichen MCP-Toolnamen mit `tools/list` und ruft danach `voicebox_speak`, `voicebox_transcribe` oder `voicebox_list_profiles` auf. Wenn für TTS kein Profil vorhanden ist, erstellen oder wählen Sie eines in Voicebox. Das Aufteilen einer zu langen Anfrage ist eine Benutzerentscheidung, da der Skill sie nicht automatisch in Teile zerlegt. Wenn der Server nicht verfügbar ist, prüfen Sie den lokalen Health-Endpunkt und starten Sie Voicebox vor dem nächsten Versuch neu.

Um stattdessen [VoiceStudio](https://github.com/debpalash/VoiceStudio) zu verwenden, setzen Sie `voice.backend` in `.agents/oma-config.yaml` auf `voicestudio`, oder belassen Sie es bei `auto`, damit VoiceStudio immer dann verwendet wird, wenn Voicebox nicht läuft. Der Skill lädt den Upstream-Skill `voicestudio`, verwendet VoiceStudio-Profil-IDs und fragt nach, bevor er eine Stimme klont oder entwirft oder ein Modell herunterlädt. Die Sprecherstimme von `oma video` folgt derselben Einstellung.

## Wissenschaftliches Material suchen und validieren {#search-and-validate-scholarly-material}

Verwenden Sie die `oma scholar`-CLI für Knows-Sidecars und Paper-Metadaten. Suchen und Auflösen dienen der Entdeckung; `get` ruft einen Datensatz oder einen ausgewählten Abschnitt ab; `lint` ist das Gate zum Teilen.

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Knows wird zuerst verwendet; OpenAlex und Semantic Scholar dienen als Fallback. Mit `--section` können `statements`, `evidence`, `relations`, `artifacts` oder `citation` angefordert werden. Verwenden Sie `--lenient`, wenn bei der lokalen Zusammenstellung verwaiste Querverweise auf Datensätze zu erwarten sind; verwenden Sie `--fail-on-warning` als striktes CI-Gate. Ein Suchergebnis oder ein abgerufenes Sidecar ist Evidenz für die Entdeckung, nicht die Behauptung, dass das Paper jede Schlussfolgerung unterstützt. Erzeugen oder überarbeiten Sie ein Sidecar im Agenten und führen Sie vor dem Teilen `oma scholar lint` aus.

Bei einem Timeout eines Remote-Service versuchen Sie eine allgemeinere Abfrage oder lassen Sie den Fallback der CLI zu; `--always-fallback` fragt OpenAlex und Semantic Scholar auch dann ab, wenn Knows Treffer liefert. Ein 429 von Semantic Scholar kann eine Begrenzung des anonymen Pools sein; versuchen Sie es später erneut oder setzen Sie `S2_API_KEY`. Setzen Sie `OPENALEX_EMAIL` (und optional `OPENALEX_API_KEY`), um Ihre OpenAlex-Anfragen zu identifizieren. Wenn ein Sidecar einen Provenance-Enum-Fehler enthält, verwenden Sie `tool`, `person` oder `org`. Bleiben Warnungen zur Beziehungsdichte bestehen, fügen Sie unterstützte Evidenzbeziehungen nur dort hinzu, wo die Quelle sie belegt.

## Folien und Präsentationen {#slides-and-presentations}

Verwenden Sie `oma-slide`, wenn das Ergebnis eine Präsentation mit fester Bühne ist. Der Authoring-Skill schreibt HTML-Fragmente mit 1920×1080; die CLI validiert die Geometrie, bündelt das Deck und exportiert es.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

Exportieren Sie erst nach der Validierung:

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

Verwenden Sie `--slide <file>` für eine Prüfung einer einzelnen Folie und `--report-file <path>` mit JSON-Ausgabe, wenn ein anderer Prozess die Befunde benötigt. `slide import pptx <file>` startet einen Import-Workflow; `slide asset fetch-video <url>` lädt ein Video-Asset; `slide style list|preview|get <slug>` untersucht Styles. Die PPTX-Ausgabe basiert auf Rasterbildern und bietet daher keine editierbaren Text- oder Shape-Ebenen. Validierung und Export benötigen Chrome/Puppeteer; setzen Sie `OMA_CHROME_PATH`, wenn die ausführbare Datei nicht gefunden wird. Wenn die Validierung nach drei automatischen Korrekturschleifen nicht konvergiert, bearbeiten Sie die betroffenen Fragmente anhand der gemeldeten Geometriebefunde.

## Agentengespräche zusammenfassen {#recap-agent-conversations}

Verwenden Sie `/recap` (oder bitten Sie den Agenten um einen Recap) für evidenzbasierte Arbeitszusammenfassungen; der Befehl führt `oma recap` aus, um die Historie zu sammeln. Ein Kalenderdatum und ein gleitendes Fenster sind unterschiedliche Eingaben:

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

Diese Befehle geben die gesammelte Historie aus (standardmäßig als Terminaltext, mit `--json` als JSON oder mit `--mermaid` als Mermaid-Gantt-Diagramm); `--graph` öffnet stattdessen einen interaktiven Graphen im Browser. Die CLI selbst schreibt keine Datei. `/recap` speichert den Markdown-Recap unter `.agents/results/recap/`, normalerweise als `{date}.md` für einen Tages-Recap oder `{start-date}~{end-date}.md` für einen Zeitraum. Der Recap gruppiert nach Arbeitsinhalt, kennzeichnet angeforderte und laufende Arbeiten getrennt von abgeschlossenen und zeichnet fehlende Tool-Historie auf. Verwenden Sie `--top` oder `--sort`, wenn der Bericht enger gefasst sein soll. Wenn die CLI nicht verfügbar ist, kann der Skill den dokumentierten Claude-History-Fallback nutzen; die reduzierte Quellenabdeckung muss angegeben werden.

Verwenden Sie `oma retro` für eine Git-basierte technische Retrospektive. Der Befehl beantwortet eine andere Frage als ein Gesprächs-Recap und kann benachbarte Zeitfenster mit `--compare` vergleichen.

## Lokalisierte Inhalte übersetzen oder prüfen {#translate-or-review-localized-content}

Verwenden Sie `oma-translation` für UI-Strings, Dokumentation, Berichte, Marketingtexte oder akademische Prosa. Rufen Sie den Skill in natürlicher Sprache oder über den Einstiegspunkt `/oma-translation` auf; es gibt keinen öffentlichen Befehl `oma translation`.

Geben Sie Quelle, Ziellocale, Inhaltstyp und an, ob es sich um Übersetzung, Review oder Quell-Diff-Synchronisierung handelt. Der Skill lädt, sofern vorhanden, ein passendes Sprachprofil, bewahrt Platzhalter, Links, Markdown-Struktur und geschützte Syntax und folgt den Übersetzungen und dem Glossar der Geschwisterdateien. Bei langen Dokumenten oder Reviews wendet er zusätzlich die Übersetzungsrubrik an. Wenn kein Zielprofil existiert, verwendet er die gemeinsamen Regeln und meldet diese Einschränkung einmal.

Bei Dokumentation übersetzen Sie die stabile englische Seite, sobald Anker und Befehlsbeispiele feststehen. Behalten Sie CLI-Namen, Flags, Pfade, Umgebungsvariablen und Codeblöcke exakt bei; übersetzen Sie die umgebende Erklärung und prüfen Sie die Struktur der Zielseite gegen Englisch. Eine mehrdeutige Bedeutung sollte markiert statt stillschweigend geraten werden.

## Akademische Prosa entwerfen oder prüfen {#draft-or-audit-academic-writing}

Verwenden Sie `oma-academic-writing` für englische Essays, Berichte, Literaturübersichten, Analysen, Executive Summaries, Schlussfolgerungen und Überarbeitungen. Wählen Sie einen Modus und geben Sie Rubrik oder Quellenbedingungen an:

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` gibt Prosa, Writing Notes und eine Claim-Evidence-Map zurück. `revise` gibt Original- und überarbeitete Blöcke mit konkreten Änderungen zurück. `review` gibt PASS/FAIL-Befunde zu Satzstruktur, Verben, Hedging, Spezifität, Anti-AI-Mustern, Absatzklarheit, Rhythmus und Claim-Evidence-Ausrichtung zurück. Der Skill liest für revise/review den bestehenden Entwurf vollständig, schwächt unbelegte Behauptungen ab oder entfernt sie und übergibt nicht englische Ausgaben nach dem englischen Durchgang an `oma-translation`.

Verwenden Sie `oma scholar` zur Quellenentdeckung und Sidecar-Evidenz vor dem Entwurf. Fehlt ein Zitat oder eine Rubrik, markieren Sie die Behauptung als ausstehend oder fragen Sie nach der fehlenden Bedingung; füllen Sie die Lücke nicht mit einer erfundenen Quelle. Als fertiges Artefakt dient die Prosa mit Evidenzkarte oder Audit-Bericht; ein allgemeiner „polierter“ Absatz ohne nachvollziehbare Grundlage genügt nicht.

## Checkliste zur Fehlerbehebung

| Symptom | Nächste Aktion |
|---|---|
| Ausgabe ist leer oder strukturell beschädigt | Eingabetyp prüfen, dann für PDFs Tagged-, Tabellen- oder OCR-Modus wählen; bei HWP Bun prüfen und nach bildbasierten Seiten suchen. |
| Ein lokaler Skill kann keine Verbindung herstellen | Den zuständigen lokalen Dienst oder die CLI (`Voicebox`, `Chrome`, `uvx`, `bunx`) prüfen, bevor die Inhaltsanforderung geändert wird. |
| Ein Rechercheergebnis ist dünn | Abfrage erweitern, Fallback-/Quellenstatus prüfen und die Unsicherheit im Bericht bewahren. |
| Ein Folienexport schlägt fehl | `oma slide validate --workspace <dir> --output json` ausführen, Geometrie- oder Schriftbefunde korrigieren und danach exportieren. |
| Ein Recap überzeichnet die Fertigstellung | Receipts und Artifacts erneut prüfen; ein Prompt oder Tool-Aufruf allein ist kein Fertigstellungsbeleg. |
| Eine Übersetzung ändert Codesyntax | Geschützte Namen wiederherstellen und Strukturprüfungen erneut ausführen, bevor die Prosa geprüft wird. |
| Akademische Prosa enthält unbelegte Behauptungen | Behauptung entfernen oder abschwächen, Evidenz über den Scholar-Pfad ergänzen und die Claim-Evidence-Map erneut ausführen. |

## Nächste Schritte

- [Bildgenerierung](./image-generation.md), [Videogenerierung](./video-generation.md), [Code-Erklärer](./code-explainer.md), [Diagramm-Engine](./diagram-engine.md) und [Marktforschung](./market-research.md) — die Anleitungen zu den Fähigkeiten in der Tabelle oben
- [CLI-Befehle](../cli-interfaces/commands.md) und [CLI-Optionen](../cli-interfaces/options.md) — die vollständigen registrierten CLI-Pfade und Options-Aliase
- [Konfigurationsreferenz](./configuration-reference.md) — die Konfigurationsabschnitte `pdf`, `hwp`, `voice` und `scholar`
