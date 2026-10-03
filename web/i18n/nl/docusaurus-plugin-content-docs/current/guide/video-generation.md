---
title: "Gids: Video genereren"
sidebar_label: Video genereren
description: Complete gids voor oh-my-agent-videogeneratie — een router met drie tiers zonder verplichte keys die script, vertelling, visuals, captions en een beheerde HyperFrames-compositor samenstelt in reproduceerbare runmappen voor shorts-, explainer- en demomodi.
---

# Video genereren {#video-generation}

`oma-video` is de videorouter van oh-my-agent. Vanuit een briefing van één regel stelt hij een script, vertelling, visuals en captions samen en legt hij het plan vast in een runmap. Providerfasen hebben optioneel keys en kunnen lokale of deterministische fallbacks gebruiken; voor een echte MP4 zijn nog steeds een werkende compositor en een geldige compositie nodig.

De skill wordt automatisch actief bij trefwoorden als *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough* en *screencast*, of wanneer een andere skill een video als neveneffect nodig heeft.

---

## Wanneer gebruiken {#when-to-use}

- Een briefing, README, code of data omzetten in een korte clip.
- Een explainer met vertelling of een demo-/walkthrough-opname maken.
- Elke reproduceerbare pipeline van "briefing → `.mp4`" die je deterministisch opnieuw wilt uitvoeren.

## Wanneer NIET gebruiken {#when-not-to-use}

- Eén stilstaand beeld → gebruik [`oma-image`](/docs/guide/image-generation).
- Live schermuitzendingen of streaming → valt buiten de scope (capture staat onder toezicht en wordt niet gestreamd).
- Zelfstandig vertellingsaudio → gebruik `oma-voice`.

---

## Modi in één oogopslag {#modes-at-a-glance}

| Modus | Beeldverhouding | Wat wordt samengesteld |
|------|--------|------------------|
| `shorts` | 9:16 | Korte verticale clip (script → vertelling → visuals → captions). |
| `explainer` | 16:9 | Horizontale explainer op basis van een README, code of databriefing. |
| `demo` | afgeleid | Een walkthrough op basis van een menselijke opname die met `--capture` is aangeleverd; `--source web --url` levert context voor een supervised capture in een zichtbaar browservenster en automatiseert nooit een login. |

De modus kiest verstandige standaardwaarden; geef de relevante flags door wanneer je andere waarden nodig hebt.

---

## Snel starten {#quick-start}

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Elke run print de runmap. Een vaste `--seed` stabiliseert de deterministische planningsinvoer; live provideruitvoer en capturebeelden kunnen nog steeds variëren. Render een bestaande runmap opnieuw wanneer je de opgeslagen renderspecificatie en assets wilt hergebruiken.

Andere tools die `oma video generate --output json` als shell-opdracht aanroepen, parsen een JSON-envelope uit stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. Er is geen key `outputs` — lees de paden naar uitvoer en assets uit het manifest op `manifestPath`.

---

## CLI-referentie {#cli-reference}

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Belangrijke flags {#key-flags}

| Flag | Doel |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Taal-tag voor vertelling/captions. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (key-vrije uitlijning). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Stem voor vertelling, of `none` (de standaard; laat je deze weg, dan rendert de video zonder geluid met geschatte captiontiming). |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` of `none`. |
| `--compositor <c>` | `hyperframes` (standaard) \| `mpt`. |
| `--capture <path>` | Pad naar de invoeropname voor demomodus (`--source file`). |
| `--source <k>` | Capturebron voor demo's: `file` of `web` (standaard: `file`). |
| `--url <url>` | Doel-URL voor `--source web` (lokaal, staging of productie); deze vervangt `--capture` niet wanneer een opname vereist is. |
| `--device <name>` | Deviceframe voor webcapture; overschrijft de beeldverhoudingsgrootte. |
| `--ready-selector <css>` | CSS-selector waarop vóór webcapture wordt gewacht. |
| `--show-cursor` | Legt een zichtbare cursor over webcapture heen. |
| `--polish` | Legt de HyperFrames-compositie over opgenomen beeld heen. |
| `--capture-timeout <sec>` | Harde bovengrens voor live webcapture. |
| `--capture-stop <mode>` | Niet-interactieve stop voor CI: `duration:<sec>` of `selector:<css>`. |
| `--output-dir <path>` | Basismap voor uitvoer. Paden buiten `$PWD` vereisen `--allow-external-output`. |
| `--allow-external-output` | Staat uitvoerpaden buiten `$PWD` toe. |
| `--max-usd <n>` | Maximale geschatte kosten vóór bevestiging. |
| `--duration <sec>` | Gewenste lengte, of `auto`. |
| `--seed <n>` | Deterministische seed. |
| `--dry-run` | Geeft script / render-spec / manifest uit en slaat renderen over. |
| `--script <path>` | Door de agent geschreven `script.json` om in te voegen (overschrijft het skelet; stuurt vertelling, tekst op het scherm en visuele prompts per scène). |
| `-y, --yes` | Slaat de kostenbevestigingsprompt over. |
| `--output <f>` | CLI-uitvoer: `text` (standaard) of `json`. |
| `--no-brief-in-manifest` | Slaat een SHA-256 van de briefing op in plaats van de onbewerkte briefing. |

---

## Providers zonder verplichte keys {#key-optional-providers}

Providerfasen lossen op naar een **echte branch** en, waar de fase dat ondersteunt, een **deterministische fallback**. Ontbrekende keys kunnen een gepland run dus voorzien van geschatte timing of lokale assets. De compositor is een verplichte eindfase en heeft geen normale placeholder-fallback:

| Capability | Echte branch | Fallback |
|------------|-------------|----------|
| script | LLM wanneer een key aanwezig is | deterministische outline uit de briefing |
| voice | `oma-voice` (Voicebox, lokaal) | geschatte timing, geen audio |
| visual | `oma-image` / `oma-slide` / stock | placeholder-asset |
| caption | key-vrije forced alignment | geschatte timing per woord |
| capture | supervised browser-webcapture (`--source web`) of een aangeleverde opname (`--source file --capture`) | begeleid protocol "record it yourself" |
| compositor | HyperFrames (beheerd) of MoneyPrinterTurbo | geen compositor-fallback; de run faalt met diagnostics |

Er is geen credential-automatisering: tijdens capture voert een mens elke login op het scherm uit; URL's en querytokens worden gemaskeerd in logs en het manifest.

Captions worden weergegeven als **statische cues met vensters** — de ene captionregel die in het huidige frame actief is, met CSS-wrapping en zonder animatie per woord.

---

## Toolchain en `doctor` {#toolchain-and-doctor}

De zware toolchain (de `node_modules` van het beheerde HyperFrames-project, het ingebedde Pretendard-lettertype, de checkout van MoneyPrinterTurbo, capturebrowsers en Chrome Headless Shell) wordt **on demand** ingericht en nooit in het package meegeleverd. Een gewone `doctor` rapporteert alleen — hij installeert nooit iets:

```bash
oma video doctor
```

Hij rapporteert `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` en `cap`, en geeft voor ontbrekende onderdelen de installatietip. De basis vereist Node.js 22+, de HyperFrames-toolchain met bijbehorende Chrome-browser, FFmpeg/FFprobe en `oma-image`. Voor een echte MP4 is ook geschreven HTML nodig.

Gebruik de installflags om de toolchain in te richten:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` haalt ook het ingebedde Pretendard-lettertype (een gepinde release) op naar de gedeelde toolchain-cache — dit valt binnen de determinismegrens. Bij een netwerkfout geeft de tool een waarschuwing en valt de render terug op systeemlettertypen; browser- en OS-verschillen kunnen de geëncodeerde uitvoer nog steeds beïnvloeden.

---

## Uitvoermap {#output-layout}

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

De `render-spec.json` plus assets vormen de determinismegrens; live capture wordt in het manifest als `nondeterministic` vastgelegd.

---

## Probleemoplossing {#troubleshooting}

| Symptoom | Oorzaak / oplossing |
|---------|-------------|
| Er wordt geen MP4 geproduceerd | Een controle van compositor, compositie of toolchain is mislukt. Voer `oma video doctor` uit, daarna `oma video compose <runDir>`, herstel de gemelde compositie en voer opnieuw `oma video render <runDir>` uit. |
| De vertelling is stil (`source: estimated`) | Voicebox is onbereikbaar; start de `oma-voice`-server of accepteer geschatte timing. |
| `--source web` toont een begeleid protocol in plaats van op te nemen | Er is geen TTY of geen browsercapture-runtime beschikbaar → begeleide fallback. Gebruik een interactieve terminal met een ingerichte capture-runtime en `--capture-stop`, of geef een opgenomen bestand door met `--capture`. |
| De eerste render is traag | De HyperFrames-browser of MPT-checkout wordt eenmalig ingericht; volgende runs hergebruiken de cache. |

---

## Altijd de nieuwste HyperFrames — jij schrijft de compositie {#always-latest-hyperframes-you-author-the-composition}

oh-my-agent levert **geen HyperFrames-compositiecode** mee. Elke run krijgt een eigen project op `<runDir>/hyperframes/`, dat door `oma video compose` wordt gescaffold op de nieuwste npm-HyperFrames (toolchain-cache `~/.cache/oma-video/hyperframes/<version>/`, gedeeld via een `node_modules`-symlink), met [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) op HEAD (`~/.cache/oma-video/hyperframes-skills/`). De agent schrijft de bron van de gegenereerde compositie volgens `AUTHORING.md`, de skills en de modespecificatie in `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Controles op de nieuwste versie (npm + GitHub) worden gethrottled door `video.hyperframes.check_interval_min` (standaard 60; `0` = bij elke compose). `oma update` respecteert het interval; `oma video doctor --upgrade` forceert een controle; offline-runs gebruiken de gecachte toolchain en melden `stale`.
- Reproduceerbaarheid zit in de runmap: `render-spec.json`, de geschreven compositiebron en de toolchainversie in de gegenereerde HyperFrames-package metadata. Opnieuw renderen van dezelfde run hergebruikt dat rendercontract; een nieuwe run controleert de nieuwste HyperFrames.
- Een lint- of renderfout wordt **niet** verborgen achter een placeholder (die bestaat alleen voor `OMA_VIDEO_MOCK=1`): `oma video render` eindigt met exitcode 1 en diagnostics, en de agent herstelt de compositie met de nieuwste skills. Breuk op een nieuwe HyperFrames-release is een compositiefout en nooit een reden om te pinnen.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Gerelateerd {#related}

- [`/video`-workflow](/docs/core-concepts/workflows) — de briefing → script → assets → render-spec → HyperFrames-pipeline.
- [Afbeeldingen genereren](/docs/guide/image-generation) — de still-image-router die opnieuw wordt gebruikt als videovisualprovider.
