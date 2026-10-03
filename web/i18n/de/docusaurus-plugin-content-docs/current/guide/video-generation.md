---
title: "Anleitung: Videoerzeugung"
sidebar_label: Videoerzeugung
description: Vollständige Anleitung zur Videoerzeugung mit oh-my-agent — ein Router mit optionalen Schlüsseln, der Skript, Sprechertext, Bildmaterial, Captions und einen verwalteten HyperFrames-Kompositor in reproduzierbaren Laufverzeichnissen für Shorts-, Explainer- und Demo-Modi kombiniert.
---

# Videoerzeugung

`oma-video` ist der Video-Router für oh-my-agent. Aus einem einzeiligen Briefing erstellt er Skript, Sprechertext, Bildmaterial und Captions und hält den Plan anschließend in einem Laufverzeichnis fest. Für die Provider-Stufen sind Schlüssel optional; sie können lokale oder deterministische Fallbacks verwenden. Ein echtes MP4 erfordert jedoch weiterhin einen funktionierenden Kompositor und eine gültige Komposition.

Der Skill aktiviert sich automatisch bei Schlüsselwörtern wie *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough* oder *screencast* sowie wenn ein anderer Skill nebenbei ein Video benötigt.

---

## Wann verwenden

- Ein Briefing, eine README, Code oder Daten in einen kurzen Clip umwandeln.
- Einen vertonten Explainer oder eine Demo-/Walkthrough-Aufzeichnung erstellen.
- Eine reproduzierbare Pipeline „Briefing → `.mp4`“ aufsetzen, die sich deterministisch erneut ausführen lässt.

## Wann nicht verwenden

- Einzelne Standbilder → verwenden Sie [`oma-image`](/docs/guide/image-generation).
- Live-Bildschirmübertragung oder Streaming → außerhalb des Umfangs (die Aufnahme wird beaufsichtigt, nicht gestreamt).
- Eigenständiges Sprecher-Audio → verwenden Sie `oma-voice`.

---

## Modi im Überblick

| Modus | Seitenverhältnis | Zusammensetzung |
|------|--------|------------------|
| `shorts` | 9:16 | Vertikaler Kurzclip (Skript → Sprechertext → Bildmaterial → Captions). |
| `explainer` | 16:9 | Horizontaler Explainer aus einer README, Code- oder Datenbeschreibung. |
| `demo` | abgeleitet | Walkthrough aus einer mit `--capture` bereitgestellten menschlichen Aufnahme; `--source web --url` liefert Kontext für eine überwachte Aufnahme im sichtbaren Browser und automatisiert niemals den Login. |

Der Modus wählt sinnvolle Standardwerte. Übergeben Sie die relevanten Flags, wenn andere Werte nötig sind.

---

## Schnellstart

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Jeder Lauf gibt den Pfad zu seinem Laufverzeichnis aus. Ein festes `--seed` stabilisiert die deterministischen Eingaben der Planung; Live-Provider-Ausgabe und Aufnahmematerial können dennoch variieren. Rendern Sie ein bestehendes Laufverzeichnis erneut, wenn Sie dessen gespeicherte Render-Spezifikation und Assets wiederverwenden möchten.

Andere Tools, die `oma video generate --output json` als Shell-Aufruf verwenden, lesen ein JSON-Envelope aus stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. Es gibt keinen Schlüssel `outputs`; lesen Sie Ausgabe- und Asset-Pfade aus dem Manifest unter `manifestPath`.

---

## CLI-Referenz

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Wichtige Flags

| Flag | Zweck |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Sprach-Tag für Sprechertext und Captions. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (Ausrichtung ohne Schlüssel). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Sprecherstimme oder `none` (Standard); ohne Angabe wird das Video still gerendert und die Caption-Zeit geschätzt. |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` oder `none`. |
| `--compositor <c>` | `hyperframes` (Standard) \| `mpt`. |
| `--capture <path>` | Pfad zur Eingabeaufnahme für den Demo-Modus (`--source file`). |
| `--source <k>` | Quelle der Demo-Aufnahme: `file` oder `web` (Standard: `file`). |
| `--url <url>` | Ziel-URL für `--source web` (lokal, Staging oder Produktion); ersetzt `--capture` nicht, wenn eine Aufnahme benötigt wird. |
| `--device <name>` | Geräterahmen für Web-Aufnahmen; überschreibt die Größenbestimmung des Seitenverhältnisses. |
| `--ready-selector <css>` | CSS-Selektor, auf den vor der Web-Aufnahme gewartet wird. |
| `--show-cursor` | Einen sichtbaren Cursor in der Web-Aufnahme einblenden. |
| `--polish` | HyperFrames-Komposition über dem aufgenommenen Material einblenden. |
| `--capture-timeout <sec>` | Harte Obergrenze für eine Live-Web-Aufnahme. |
| `--capture-stop <mode>` | Nicht interaktives Ende für CI: `duration:<sec>` oder `selector:<css>`. |
| `--output-dir <path>` | Basisverzeichnis für die Ausgabe. Pfade außerhalb von `$PWD` benötigen `--allow-external-output`. |
| `--allow-external-output` | Ausgabepfade außerhalb von `$PWD` zulassen. |
| `--max-usd <n>` | Maximale geschätzte Kosten vor der Bestätigung. |
| `--duration <sec>` | Ziel-Länge oder `auto`. |
| `--seed <n>` | Deterministischer Seed. |
| `--dry-run` | Skript, Render-Spezifikation und Manifest ausgeben, Rendering überspringen. |
| `--script <path>` | Vom Agenten erstelltes `script.json` zum Injizieren (überschreibt das Gerüst; steuert Sprechertext, On-Screen-Text und visuelle Prompts pro Szene). |
| `-y, --yes` | Kostenbestätigungs-Prompt überspringen. |
| `--timeout <duration>` | Zeitlimit für jeden Aufruf eines Visual- oder Musik-Providers, etwa `90s` oder `2m`; eine Zahl ohne Einheit gilt als Sekunden. |
| `--output <f>` | CLI-Ausgabe: `text` (Standard) oder `json`. |
| `--no-brief-in-manifest` | Einen SHA-256-Hash des Briefings statt des Rohtexts im Manifest speichern. |

---

## Provider mit optionalen Schlüsseln

Provider-Stufen haben einen **echten Pfad** und, sofern die Stufe dies unterstützt, einen **deterministischen Fallback**. Fehlende Schlüssel können deshalb einen geplanten Lauf mit geschätztem Timing oder lokalen Assets hinterlassen. Der Kompositor ist eine erforderliche letzte Stufe und besitzt keinen normalen Platzhalter-Fallback:

| Fähigkeit | Echter Pfad | Fallback |
|------------|-------------|----------|
| script | LLM, wenn ein Schlüssel vorhanden ist | Deterministische Gliederung aus dem Briefing |
| voice | `oma-voice` (Voicebox, lokal) | Geschätztes Timing, kein Audio |
| visual | `oma-image` / `oma-slide` / Stock | Platzhalter-Asset |
| caption | Forced Alignment ohne Schlüssel | Geschätztes Wort-Timing |
| capture | Überwachte Browseraufnahme (`--source web`) oder bereitgestellte Aufnahme (`--source file --capture`) | Geführtes Protokoll „Nehmen Sie selbst auf“ |
| compositor | HyperFrames (verwaltet) oder MoneyPrinterTurbo | Kein Kompositor-Fallback; der Lauf schlägt mit Diagnosen fehl |

Anmeldedaten werden nicht automatisiert eingegeben: Während einer Aufnahme führt ein Mensch jeden Login auf dem Bildschirm aus; URLs und Query-Tokens werden in Logs und Manifest maskiert.

Captions werden als **statische, fensterbasierte Cues** gerendert — eine einzelne Caption-Zeile ist im aktuellen Frame aktiv und wird per CSS umgebrochen; eine Animation pro Wort gibt es nicht.

---

## Toolchain und `doctor`

Die umfangreiche Toolchain (das `node_modules`-Verzeichnis des verwalteten HyperFrames-Projekts, die eingebettete Pretendard-Schrift, der MoneyPrinterTurbo-Checkout, Aufnahme-Browser und Chrome Headless Shell) wird **bei Bedarf bereitgestellt** und niemals im Paket ausgeliefert. Der einfache `doctor`-Aufruf erstellt nur einen Bericht und installiert nichts:

```bash
oma video doctor
```

Er meldet `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` und `cap` und gibt für Fehlendes einen Installationshinweis aus. Die Grundausstattung erfordert Node.js 22+, die HyperFrames-Toolchain mit ihrem Chrome-Browser, FFmpeg/FFprobe und `oma-image`. Für ein echtes MP4 ist außerdem verfasstes HTML erforderlich.

Verwenden Sie die Installationsflags, um die Toolchain bereitzustellen:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` lädt außerdem die eingebettete Pretendard-Schrift (gepinntes Release) in den gemeinsamen Toolchain-Cache. Das gehört zur Determinismusgrenze. Bei einem Netzwerkfehler wird gewarnt und das Rendering fällt auf Systemschriften zurück; Unterschiede bei Browser und Betriebssystem können die kodierte Ausgabe dennoch beeinflussen.

---

## Ausgabelayout

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

`render-spec.json` und Assets bilden die Determinismusgrenze; Live-Aufnahmen werden im Manifest als `nondeterministic` aufgezeichnet.

---

## Fehlerbehebung

| Symptom | Ursache / Behebung |
|---------|-------------|
| Kein MP4 wird erzeugt | Eine Prüfung von Kompositor, Komposition oder Toolchain ist fehlgeschlagen. Führen Sie `oma video doctor` und danach `oma video compose <runDir>` aus, beheben Sie die gemeldete Komposition und starten Sie dann `oma video render <runDir>` erneut. |
| Sprechertext ist stumm (`source: estimated`) | Voicebox ist nicht erreichbar; starten Sie den `oma-voice`-Server oder akzeptieren Sie das geschätzte Timing. |
| `--source web` gibt ein geführtes Protokoll statt einer Aufnahme aus | Keine TTY oder keine Laufzeit für Browser-Aufnahmen verfügbar → geführter Fallback. Verwenden Sie ein interaktives Terminal mit bereitgestellter Aufnahme-Laufzeit und `--capture-stop` oder übergeben Sie mit `--capture` eine aufgezeichnete Datei. |
| Der erste Lauf rendert langsam | HyperFrames-Browser bzw. MPT-Checkout werden einmal bereitgestellt; spätere Läufe verwenden den Cache erneut. |

---

## HyperFrames immer aktuell — Sie erstellen die Komposition

oh-my-agent liefert **keinen HyperFrames-Kompositionscode** mit. Jeder Lauf erhält unter `<runDir>/hyperframes/` ein eigenes Projekt, das `oma video compose` mit dem neuesten npm-HyperFrames aufbaut (Toolchain-Cache `~/.cache/oma-video/hyperframes/<version>/`, gemeinsam verwendet über einen `node_modules`-Symlink) und [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) auf HEAD (`~/.cache/oma-video/hyperframes-skills/`) nutzt. Der Agent erstellt den Quelltext der Komposition anhand von `AUTHORING.md` des Gerüsts, den Skills und der Modusspezifikation unter `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Prüfungen auf die neueste Version (npm und GitHub) werden durch `video.hyperframes.check_interval_min` gedrosselt (Standard 60; `0` = jedes Compose). `oma update` beachtet das Intervall; `oma video doctor --upgrade` erzwingt eine Prüfung; Offline-Läufe verwenden die gecachte Toolchain und melden `stale`.
- Die Reproduzierbarkeit liegt im Laufverzeichnis: `render-spec.json`, der Quelltext der erstellten Komposition und die in den generierten HyperFrames-Paketmetadaten aufgezeichnete Toolchain-Version. Ein erneutes Rendern desselben Laufs verwendet denselben Rendervertrag; ein neuer Lauf prüft das neueste HyperFrames.
- Ein Lint- oder Rendering-Fehler wird **nicht** hinter einem Platzhalter verborgen (dieser existiert nur für `OMA_VIDEO_MOCK=1`): `oma video render` beendet sich mit 1 und Diagnosen, und der Agent repariert die Komposition anhand der neuesten Skills. Ein Fehler nach einem neuen HyperFrames-Release ist ein Kompositionsfehler und kein Grund zum Pinnen.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Verwandte Seiten

- [`/video`-Workflow](/docs/core-concepts/workflows) — die Pipeline Briefing → Skript → Assets → Render-Spezifikation → HyperFrames.
- [Bilderzeugung](/docs/guide/image-generation) — der als Video-Bildprovider wiederverwendete Standbild-Router.
