---
title: "Anleitung: Bildgenerierung"
description: Vollständige Anleitung zur Bildgenerierung in oh-my-agent — Multi-Vendor-Dispatch über Codex (gpt-image-2), Pollinations (flux/zimage, kostenlos) und Gemini, mit Referenzbildern, Kosten-Guardrails, Output-Layout, Troubleshooting und gemeinsamen Aufrufmustern.
---

# Bildgenerierung

`oma-image` ist der Multi-Vendor-Bildrouter für oh-my-agent. Er erzeugt Bilder aus natürlichsprachlichen Prompts, leitet die Anfrage an die Vendor-CLI weiter, bei der Sie authentifiziert sind, und schreibt neben dem Output ein deterministisches Manifest, sodass jeder Lauf reproduzierbar ist.

Der Skill aktiviert sich automatisch bei Keywords wie *image*, *illustration*, *visual asset*, *concept art* oder wenn ein anderer Skill ein Bild als Nebeneffekt benötigt (Hero-Shot, Thumbnail, Produktfoto).

---

## Wann verwenden

- Generieren von Bildern, Illustrationen, Produktfotos, Concept Art, Hero-/Landing-Visuals
- Vergleich desselben Prompts über mehrere Modelle hinweg (`--vendor all`)
- Erzeugen von Assets aus einem Editor-Workflow heraus (Claude Code, Codex, Gemini CLI)
- Ein anderer Skill (Design, Marketing, Docs) ruft die Bildpipeline als gemeinsame Infrastruktur auf

## Wann NICHT verwenden

- Bearbeiten oder Retuschieren eines vorhandenen Bildes — außerhalb des Geltungsbereichs (dediziertes Tool verwenden)
- Erzeugen von Videos oder Audio — außerhalb des Geltungsbereichs
- Inline-SVG-/Vektor-Komposition aus strukturierten Daten — Templating-Skill verwenden
- Einfaches Resize / Format-Konvertierung — eine Bildbibliothek verwenden, nicht eine Generierungspipeline

---

## Vendoren im Überblick

Der Skill ist CLI-first: Wenn die native CLI eines Vendors rohe Bild-Bytes zurückgeben kann, wird der Subprozess-Pfad gegenüber einem direkten API-Key bevorzugt.

| Vendor | Strategie | Modelle | Trigger | Kosten |
|---|---|---|---|---|
| `pollinations` | Direktes HTTP | Kostenlos: `flux`, `zimage`. Credit-pflichtig: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` gesetzt (kostenlose Anmeldung unter https://enter.pollinations.ai) | Kostenlos für `flux` / `zimage` |
| `codex` | CLI-first — `codex exec` über ChatGPT OAuth | `gpt-image-2` | `codex login` (kein API-Key erforderlich) | Wird Ihrem ChatGPT-Plan in Rechnung gestellt |
| `gemini` | CLI-first → Fallback auf direkte API | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` oder `GEMINI_API_KEY` + Billing | Standardmäßig deaktiviert; erfordert Billing |

`pollinations` ist der Standard-Vendor, weil `flux` / `zimage` kostenlos sind, sodass das automatische Triggern bei Keywords unbedenklich ist.

---

## Schnellstart

```bash
# Free, zero-config — uses pollinations/flux
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img` ist ein Alias für `oma image`.

---

## Slash-Befehl (innerhalb eines Editors)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

Der Slash-Befehl wird an dieselbe `oma image generate`-Pipeline weitergeleitet — jeder CLI-Flag funktioniert auch hier.

---

## CLI-Referenz

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### Wichtige Flags

| Flag | Zweck |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini` oder `all`. Bei `all` muss jeder angeforderte Vendor authentifiziert sein (strict). |
| `-n, --count <n>` | Anzahl der Bilder pro Vendor, 1–5 (durch Wall-Time begrenzt). |
| `--size <size>` | Seitenverhältnis: `1024x1024` (quadratisch), `1024x1536` (Hochformat), `1536x1024` (Querformat) oder `auto`. |
| `--quality <level>` | `low`, `medium`, `high` oder `auto` (Vendor-Standard). |
| `--out <dir>` | Output-Verzeichnis. Standard ist `.agents/results/images/{timestamp}/`. Pfade außerhalb von `$PWD` erfordern `--allow-external-out`. |
| `-r, --reference <path>` | Bis zu 10 Referenzbilder (PNG/JPEG/GIF/WebP, je ≤ 5 MB). Wiederholbar oder kommagetrennt. Unterstützt von `codex` und `gemini`; bei `pollinations` abgelehnt. |
| `-y, --yes` | Überspringt die Kostenbestätigungsabfrage für Läufe mit geschätzten Kosten ≥ `$0.20`. Auch via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Speichert den SHA-256 des Prompts statt des Klartexts in `manifest.json`. |
| `--dry-run` | Gibt den Plan und die Kostenschätzung aus, ohne Geld auszugeben. |
| `--format text\|json` | Format des CLI-Outputs. JSON ist die Integrationsschnittstelle für andere Skills. |
| `--strategy <list>` | Nur für Gemini: Eskalationsreihenfolge, z. B. `mcp,stream,api`. Überschreibt `vendors.gemini.strategies`. |

---

## Referenzbilder

Hängen Sie bis zu 10 Referenzbilder an, um Stil, Subjektidentität oder Komposition zu steuern.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Vendor | Referenz-Unterstützung | Wie |
|---|---|---|
| `codex` (gpt-image-2) | Ja | Übergibt `-i <path>` an `codex exec` |
| `gemini` (2.5-flash-image) | Ja | Bettet base64 `inlineData` inline in den Request ein |
| `pollinations` | Nein | Abgelehnt mit Exit-Code 4 (erfordert URL-Hosting) |

### Wo angehängte Bilder liegen

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, in Systemnachrichten als `[Image: source: <path>]` angezeigt. Session-bezogen: An einen dauerhaften Speicherort kopieren, wenn Sie es später wiederverwenden möchten.
- **Antigravity** — Workspace-Upload-Verzeichnis (die IDE zeigt den genauen Pfad an)
- **Codex CLI als Host** — muss explizit übergeben werden; In-Conversation-Anhänge werden nicht weitergeleitet

Wenn der Benutzer ein Bild anhängt und darum bittet, ein Bild auf dieser Basis zu erzeugen oder zu bearbeiten, **muss** der aufrufende Agent es per `--reference <path>` weiterleiten, anstatt es in Prosa zu beschreiben. Falls die lokale CLI zu alt ist, um `--reference` zu unterstützen, `oma update` ausführen und erneut versuchen.

---

## Output-Layout

Jeder Lauf schreibt nach `.agents/results/images/` in ein Verzeichnis mit Zeitstempel und Hash-Suffix:

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json` erfasst Vendor, Modell, Prompt (oder dessen SHA-256), Größe, Qualität und Kosten — jeder Lauf ist allein aus dem Manifest reproduzierbar.

---

## Kosten, Sicherheit und Abbruch

1. **Kosten-Guardrail** — Läufe mit geschätzten Kosten ≥ `$0.20` fragen nach Bestätigung. Umgehung mit `-y` oder `OMA_IMAGE_YES=1`. Der Standard `pollinations` (flux/zimage) ist kostenlos, sodass die Abfrage dort automatisch übersprungen wird.
2. **Pfadsicherheit** — Output-Pfade außerhalb von `$PWD` erfordern `--allow-external-out`, um unerwartete Schreibvorgänge zu vermeiden.
3. **Abbrechbar** — `Ctrl+C` (SIGINT/SIGTERM) bricht jeden laufenden Provider-Aufruf und den Orchestrator gemeinsam ab.
4. **Deterministische Outputs** — `manifest.json` wird stets neben den Bildern geschrieben.
5. **Max `n` = 5** — eine Wall-Time-Grenze, kein Kontingent.
6. **Exit-Codes** — abgestimmt mit `oma search fetch`: `0` ok, `1` general, `2` safety, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Klärungsprotokoll

Vor dem Aufruf von `oma image generate` arbeitet der aufrufende Agent diese Checkliste ab. Falls etwas fehlt und nicht erschlossen werden kann, fragt er zuerst nach oder erweitert den Prompt und legt die Erweiterung zur Genehmigung vor.

**Erforderlich:**
- **Subjekt** — was ist das primäre Element im Bild? (Objekt, Person, Szene)
- **Setting / Hintergrund** — wo befindet es sich?

**Dringend empfohlen (nachfragen, falls fehlend und nicht ableitbar):**
- **Stil** — fotorealistisch, Illustration, 3D-Render, Ölgemälde, Concept Art, flacher Vektor?
- **Stimmung / Beleuchtung** — hell vs. düster, warm vs. kühl, dramatisch vs. minimalistisch
- **Verwendungskontext** — Hero-Bild, Icon, Thumbnail, Produktshot, Poster?
- **Seitenverhältnis** — quadratisch, Hoch- oder Querformat

Bei einem kurzen Prompt wie *"a red apple"* stellt der Agent **keine** Rückfragen. Stattdessen erweitert er inline und zeigt dem Benutzer:

> Benutzer: "a red apple"
> Agent: "Ich werde dies wie folgt generieren: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Soll ich fortfahren oder möchten Sie einen anderen Stil bzw. eine andere Komposition?"

Wenn der Benutzer ein vollständiges kreatives Briefing verfasst hat (≥ 2 von: Subjekt + Stil + Beleuchtung + Komposition), wird sein Prompt wortgetreu respektiert — keine Klärung, keine Erweiterung.

**Output-Sprache.** Generierungs-Prompts werden auf Englisch an den Provider gesendet (Bildmodelle werden überwiegend auf englischen Bildunterschriften trainiert). Hat der Benutzer in einer anderen Sprache geschrieben, übersetzt der Agent und zeigt die Übersetzung während der Erweiterung, damit der Benutzer Fehlinterpretationen korrigieren kann.

---

## Gemeinsamer Aufruf (von anderen Skills)

Andere Skills rufen die Bildgenerierung als gemeinsame Infrastruktur auf:

```bash
oma image generate "<prompt>" --format json
```

Das nach stdout geschriebene JSON-Manifest enthält Output-Pfade, Vendor, Modell und Kosten — leicht zu parsen und zu verketten.

---

## Konfiguration

- **Projektkonfiguration:** `config/image-config.yaml`
- **Umgebungsvariablen:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — überschreibt den Standard-Vendor (sonst `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — überschreibt das Standard-Output-Verzeichnis
  - `OMA_IMAGE_YES` — `1` zum Überspringen der Kostenbestätigung
  - `POLLINATIONS_API_KEY` — erforderlich für den pollinations-Vendor (kostenlose Anmeldung)
  - `GEMINI_API_KEY` — erforderlich, wenn der gemini-Vendor auf die direkte API zurückfällt
  - `OMA_IMAGE_GEMINI_STRATEGIES` — kommagetrennte Eskalationsreihenfolge für gemini (`mcp,stream,api`)

---

## Troubleshooting

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| Exit-Code `5` (auth-required) | Ausgewählter Vendor ist nicht authentifiziert | `oma image doctor` ausführen, um zu sehen, welcher Vendor sich anmelden muss. Anschließend `codex login` / `POLLINATIONS_API_KEY` setzen / `gemini auth login`. |
| Exit-Code `4` bei `--reference` | `pollinations` lehnt Referenzen ab oder Datei zu groß / falsches Format | Auf `--vendor codex` oder `--vendor gemini` wechseln. Jede Referenz muss ≤ 5 MB und im Format PNG/JPEG/GIF/WebP sein. |
| `--reference` wird nicht erkannt | Lokale CLI ist veraltet | `oma update` ausführen und erneut versuchen. Nicht auf eine Beschreibung in Prosa zurückfallen. |
| Kostenbestätigung blockiert Automatisierung | Lauf ist auf ≥ `$0.20` geschätzt | `-y` übergeben oder `OMA_IMAGE_YES=1` setzen. Besser: auf das kostenlose `pollinations` umsteigen. |
| `--vendor all` bricht sofort ab | Einer der angeforderten Vendoren ist nicht authentifiziert (Strict-Modus) | Den fehlenden Vendor authentifizieren oder einen spezifischen `--vendor` wählen. |
| Output wird in unerwartetes Verzeichnis geschrieben | Standard ist `.agents/results/images/{timestamp}/` | `--out <dir>` übergeben. Pfade außerhalb von `$PWD` benötigen `--allow-external-out`. |
| Gemini liefert keine Bild-Bytes zurück | Die Agent-Schleife der Gemini-CLI gibt rohe `inlineData` nicht auf stdout aus (Stand 0.38) | Der Provider fällt automatisch auf die direkte API zurück. `GEMINI_API_KEY` setzen und Billing sicherstellen. |

---

## Verwandt

- [Skills](/docs/core-concepts/skills) — die zweischichtige Skill-Architektur, die `oma-image` antreibt
- [CLI-Befehle](/docs/cli-interfaces/commands) — vollständige Referenz der `oma image`-Befehle
- [CLI-Optionen](/docs/cli-interfaces/options) — Matrix der globalen Optionen
