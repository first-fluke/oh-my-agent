---
title: "Gids: Afbeeldingen genereren"
sidebar_label: Afbeeldingen genereren
description: Complete gids voor het genereren van afbeeldingen met oh-my-agent, met multi-vendor-dispatch via Codex (gpt-image-2), Pollinations (flux/zimage, gratis) en Antigravity via Gemini Code Assist, plus referentiebeelden, kostenbeveiliging, uitvoerindeling, probleemoplossing en gedeelde aanroeppatronen.
---

# Afbeeldingen genereren

`oma-image` is de multi-vendor afbeeldingsrouter voor oh-my-agent. De skill genereert afbeeldingen vanuit prompts in natuurlijke taal, stuurt de opdracht naar de vendor-CLI waarvoor je geauthenticeerd bent en schrijft naast de uitvoer een manifest met de invoer en providerkeuzes die nodig zijn om een run te auditen of te herhalen. Live provideruitvoer kan nog steeds variëren.

De skill activeert bij zinnen zoals "generate an image", "create an image", "make a picture", "draw me …" of "image of …", bij een vendornaam (`gpt-image`, `nano-banana`, `pollinations`), of wanneer een andere skill een afbeelding als bijeffect nodig heeft (hero-afbeelding, thumbnail, productfoto).

> **TL;DR** Je hebt een van deze nodig: `POLLINATIONS_API_KEY` (gratis `flux` / `zimage`), `codex login` (gpt-image-2 via je ChatGPT-plan) of een aangemelde `agy`. Voer `oma image doctor` uit en daarna `oma image generate "<prompt>" --vendor pollinations`. Afbeeldingen en `manifest.json` komen terecht in `.agents/results/images/{timestamp}-{shortid}/`.

---

## Wanneer gebruiken

- Afbeeldingen, illustraties, productfoto's, concept art en hero-/landingvisuals genereren
- Dezelfde prompt naast elkaar met meerdere modellen vergelijken (`--vendor all`)
- Assets produceren vanuit elke runtime die oma-skills laadt (Claude Code, Codex CLI, Antigravity, Cursor en andere)
- Een andere skill (design, marketing, docs) de imagepipeline als gedeelde infrastructuur laten aanroepen

## Wanneer NIET gebruiken

- Een bestaande afbeelding bewerken of retoucheren (buiten scope; gebruik een dedicated tool)
- Video's of audio genereren (buiten scope)
- Inline SVG/vectorcompositie vanuit gestructureerde data (gebruik een templatingskill)
- Eenvoudig formaat wijzigen of converteren (gebruik een imagelibrary, geen generatiepipeline)

---

## Vendors in één oogopslag

De skill is CLI-first: wanneer de native CLI van een vendor ruwe afbeeldingsbytes kan teruggeven, heeft het subprocesspad de voorkeur boven een directe API-key.

| Vendor | Strategie | Modellen | Trigger | Kosten |
|---|---|---|---|---|
| `pollinations` | Direct HTTP | Gratis: `flux`, `zimage`. Credit-gated: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` ingesteld (gratis registratie via https://enter.pollinations.ai) | Gratis voor `flux` / `zimage` |
| `codex` | CLI-first via `codex exec` (ChatGPT OAuth) | `gpt-image-2` | `codex login` (geen API-key nodig) | Wordt in rekening gebracht via je ChatGPT-plan |
| `antigravity` | `agy`-CLI via het Gemini Code Assist-abonnement | Model wordt intern door `agy` geselecteerd | `agy` geïnstalleerd en aangemeld | Geen kosten per afbeelding via Code Assist |

Zo kiest `--vendor` de vendors voor een run:

| `--vendor` | Vendors die draaien | Uitvoermap | Exit 5 wanneer |
|---|---|---|---|
| `auto` (standaard) | elke vendor waarvan de health check slaagt | `{timestamp}-{shortid}-compare/` wanneer er twee of meer draaien | geen enkele vendor gezond is |
| `all` | elke ingeschakelde vendor | `{timestamp}-{shortid}-compare/` wanneer er twee of meer draaien | een aangevraagde vendor niet gezond is |
| `codex`, `pollinations` of `antigravity` | die vendor | `{timestamp}-{shortid}/` | die vendor niet gezond is |

De ingebouwde vendormodus is `auto`: die voert **elke** provider uit die zijn health check doorstaat, parallel. Geef `--vendor pollinations` mee om op het gratis pad te blijven. De modellen `flux` en `zimage` van Pollinations zijn gratis per afbeelding, maar vereisen nog steeds een `POLLINATIONS_API_KEY`; Codex en Antigravity vereisen elk hun eigen aanmelding. Betaalde schattingen gebruiken nog steeds de kostenbevestigingsbeveiliging.

---

## Snelle start

Controleer vóór de eerste generatie welke provider klaarstaat en authenticeer een van de ondersteunde paden:

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

Een geslaagde run in tekstmodus toont voortgang zoals deze (de paden zijn illustratief):

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Als skill gebruiken

`oma-image` is een skill die automatisch activeert vanuit natuurlijke taal en ook expliciet kan worden aangeroepen. Er zijn drie ingangspunten.

### 1. Natuurlijke taal (auto-activatie)

Beschrijf in elke runtime die oma-skills laadt (Claude Code, Codex CLI, Antigravity, Cursor en andere) gewoon de gewenste afbeelding. Zinnen zoals "generate an image", "make a picture", "draw me …" of "image of …" activeren de skill; runtimes die skills op hun beschrijving matchen, kunnen hem ook oppikken voor verzoeken als "concept art" of "hero shot".

Je hoeft CLI-vlaggen niet te onthouden. Beschrijf het in gewone taal; de skill vertaalt dit naar de juiste opties:

| Wat je zegt | Wat de skill afleidt |
|---|---|
| "gebruik codex" / "met gpt-image-2" / "gratis flux" | `--vendor codex` / `--vendor pollinations` |
| "vergelijk vendors" / "naast elkaar" | `--vendor all` |
| "portret" / "landschap" / "1024×1536" | `--size 1024x1536` / `--size 1536x1024` |
| "hoge kwaliteit" / "kladversie" | `--quality high` / `--quality low` |
| "drie varianten" / "geef me 3" | `-n 3` |
| "opslaan naar ./hero" / "uitvoer naar docs/assets" | `--output-dir <dir>` |
| Bijgevoegde afbeelding + "maak het nachtelijk" | `-r <attached path>` |
| "schat alleen de kosten" / "dry run" | `--dry-run` |

Voorbeelden:

> "Genereer een minimalistische zonsopgang boven bergen voor de hero van de landingspagina, liggend formaat, hoge kwaliteit."
> "Vergelijk een productfoto van een keramische mok bij alle vendors, met drie varianten per vendor."
> "Gebruik codex om deze otterfoto dramatischer en nachtelijk te maken." (met een bijgevoegde referentie)

De agent [werkt de briefing uit](#clarification-protocol), vult ontbrekende onderdelen aan met standaardwaarden en roept `oma image generate` aan met de afgeleide vlaggen. Gebruik het slashcommando wanneer je expliciete controle over de exacte flagwaarden wilt.

### 2. Expliciet slashcommando

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Elke CLI-vlag (`--vendor`, `-n`, `--size`, `-r`, `--dry-run` enzovoort) werkt in het slashcommando en wordt doorgestuurd naar dezelfde pipeline als `oma image generate`.

### 3. Vanuit een andere skill (gedeelde infrastructuur)

Andere skills (design, marketing, docs) roepen de pipeline als gedeelde infrastructuur aan met JSON-uitvoer:

```bash
oma image generate "<prompt>" --output json
```

Met `--output json` is stdout één JSON-object `{exitCode, manifestPath, runs}`; elk item in `runs` meldt de vendor, de status en de uitvoerbestanden. Lees `manifestPath` voor het volledige record. `--dry-run` drukt vóór het plan de tekstheader `[oma image] dry-run plan:` af, dus sla die regel over wanneer je de uitvoer parset.

---

## CLI-referentie

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

### Belangrijke vlaggen

| Vlag | Doel |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity` of `all`. Met `all` moet elke aangevraagde vendor gezond zijn (strikt). |
| `-n, --count <n>` | Aantal afbeeldingen per vendor, 1–5 (begrensde wandeltijd). Standaard 1. |
| `--size <size>` | `WxH` waarbij elke zijde een veelvoud van 16 tussen 16 en 3840 is en de beeldverhouding tussen 1:3 en 3:1 ligt (bijvoorbeeld `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), of `auto`. Standaard `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high` of `auto` (standaard). |
| `--output-dir <dir>` | Uitvoermap; bestanden komen er rechtstreeks in. Standaard `.agents/results/images/{timestamp}-{shortid}/`. Paden buiten `$PWD` vereisen `--allow-external-output`. |
| `--allow-external-output` | Staat een uitvoermap buiten `$PWD` toe. |
| `--model <name>` | Modeloverride voor **elke** vendor in de run, dus combineer het met één `--vendor` (bijvoorbeeld `--vendor pollinations --model zimage`). `antigravity` negeert dit omdat `agy` zijn model kiest. |
| `-r, --reference <path>` | Maximaal 10 referentieafbeeldingen (PNG/JPEG/GIF/WebP, elk ≤ 5 MB). Herhaalbaar of kommagescheiden. Ondersteund door `codex` en `antigravity`; afgewezen door `pollinations`. |
| `-y, --yes` | Slaat de kostenbevestiging over voor runs met een schatting van ≥ `$0.20`. Ook via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Slaat de SHA-256 van de prompt op in plaats van de ruwe tekst in `manifest.json`. |
| `--dry-run` | Toont het plan en de kostenraming zonder uitgaven. |
| `--output text\|json` | Uitvoerformaat van de CLI. JSON is de integratie-interface voor andere skills. |
| `--timeout <duration>` | Timeout per afbeelding. Standaard 180 seconden. |

---

## Referentiebeelden

Voeg maximaal 10 referentieafbeeldingen toe om stijl, identiteit van het onderwerp of compositie te sturen.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Vendor | Ondersteuning voor referenties | Hoe |
|---|---|---|
| `codex` (gpt-image-2) | Ja | Geeft `-i <path>` door aan `codex exec` |
| `antigravity` | Ja | Kopieert referenties naar een directory per run en geeft `agy` er toegang toe |
| `pollinations` | Nee | Afgewezen met exitcode 4 (vereist hosting via een URL) |

### Waar bijgevoegde afbeeldingen staan

- **Claude Code:** `~/.claude/image-cache/<session>/N.png`, in systeemberichten getoond als `[Image: source: <path>]`. Sessiespecifiek; kopieer het bestand naar een duurzame locatie als je het opnieuw wilt gebruiken.
- **Antigravity:** uploadmap van de workspace (de IDE toont het exacte pad).
- **Codex CLI als host:** moet expliciet worden doorgegeven; bijlagen uit het gesprek worden niet doorgestuurd.

Wanneer de gebruiker een afbeelding bijvoegt en vraagt om die als basis voor generatie of bewerking te gebruiken, **moet** de aanroepende agent deze doorgeven met `--reference <path>` in plaats van de afbeelding in proza te beschrijven. Als de lokale CLI `--reference` nog niet ondersteunt, voer je `oma update` uit en probeer je opnieuw.

---

## Uitvoerindeling

Standaard schrijft elke run naar een map met timestamp en hash-suffix onder `.agents/results/images/`; met `--output-dir` komen de bestanden rechtstreeks in die directory:

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

`manifest.json` registreert vendor, model, prompt (of de SHA-256 ervan), formaat, kwaliteit en kosten, zodat het verzoek kan worden geaudit en herhaald. Het dwingt geen identieke pixels af bij een live provider.

---

## Kosten, veiligheid en annuleren

1. **Kostenbeveiliging:** runs met een schatting van ≥ `$0.20` vragen om bevestiging; zonder interactieve terminal stopt de run met exitcode 1 en een melding die `--yes` noemt. Omzeil dit met `-y` of `OMA_IMAGE_YES=1`. Alleen `--vendor pollinations` met `flux` / `zimage` is gegarandeerd gratis; `auto` kan ook een aangemelde Codex meenemen.
2. **Padveiligheid:** uitvoerpaden buiten `$PWD` vereisen `--allow-external-output` om onverwachte schrijfacties te voorkomen.
3. **Annuleerbaar:** `Ctrl+C` (SIGINT/SIGTERM) breekt elke lopende provideraanroep en de orchestrator samen af.
4. **Stabiele runregistratie:** `manifest.json` wordt altijd naast de afbeeldingen geschreven.
5. **Maximaal `n` = 5:** een begrenzing van de wandeltijd, geen quotum.
6. **Exitcodes:** gelijk aan `oma search fetch`: `0` ok, `1` algemeen, `2` safety, `3` niet gevonden, `4` ongeldige invoer, `5` auth vereist, `6` timeout.

---

## Hoe de agent een briefing uitwerkt {#clarification-protocol}

De agent gebruikt wat je zei en vult ontbrekende onderdelen aan met redelijke creatieve standaardwaarden voor setting, stijl, belichting en beeldverhouding. Hij stelt alleen een vraag wanneer een ontbrekende keuze het resultaat wezenlijk zou veranderen, en wacht niet op goedkeuring van een uitgebreide prompt zodra je om generatie hebt gevraagd. Expliciete formuleringen, tekst op de afbeelding en de bedoeling van referenties blijven zoals opgegeven.

| Wat je zegt | Wat er gebeurt |
|---|---|
| "een rode appel" | Wordt direct gegenereerd; de agent vult setting, stijl, belichting en formaat aan |
| "een rode appel als flat vector-icoon, 512x512" | Je stijl en formaat worden gebruikt zoals opgegeven |
| "iets voor de homepage" | Eén vraag over het onderwerp, omdat dat het resultaat verandert |

Wil je precies zien wat naar de provider is gestuurd, controleer dan het veld `prompt` in `manifest.json` (opgeslagen als SHA-256 met `--no-prompt-in-manifest`).

---

## Configuratie

- **Projectconfiguratie:** de sectie `image:` van `.agents/oma-config.yaml`. De verouderde `config/image-config.yaml` wordt niet meer gelezen.
- **Omgevingsvariabelen:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: overschrijft de geconfigureerde standaardvendor (`auto`). De vlag `--vendor` zelf staat standaard op `auto`, dus geef `--vendor` per commando mee wanneer je een specifieke vendor nodig hebt.
  - `OMA_IMAGE_DEFAULT_OUT`: overschrijft de standaarduitvoermap
  - `OMA_IMAGE_YES`: `1` om kostenbevestiging over te slaan
  - `POLLINATIONS_API_KEY`: vereist voor de Pollinations-vendor (gratis registratie)

---

## Probleemoplossing

| Symptoom | Waarschijnlijke oorzaak | Oplossing |
|---|---|---|
| Exitcode `5` (auth vereist) | De geselecteerde vendor is niet geauthenticeerd | Voer `oma image doctor` uit om te zien welke vendor login nodig heeft. Voer daarna `codex login` uit, meld je aan bij `agy` of stel `POLLINATIONS_API_KEY` in. |
| Exitcode `4` op `--reference` | `pollinations` weigert referenties, of bestand is te groot/verkeerd formaat | Schakel over naar `--vendor codex` of `--vendor antigravity`. Elke referentie moet ≤ 5 MB zijn en PNG/JPEG/GIF/WebP. |
| `--reference` wordt niet herkend | Lokale CLI is verouderd | Voer `oma update` uit en probeer opnieuw. Val niet terug op een beschrijving in proza. |
| Kostenbevestiging blokkeert automatisering | Run wordt geschat op ≥ `$0.20` | Geef `-y` door of stel `OMA_IMAGE_YES=1` in. Beter: schakel over naar de gratis `pollinations`. |
| `--vendor all` breekt direct af | Een van de aangevraagde vendors is niet gezond (strikte modus) | Installeer of meld je aan bij de ontbrekende vendor, of kies een specifieke `--vendor`. |
| Uitvoer staat in een onverwachte directory | Standaard is `.agents/results/images/{timestamp}-{shortid}/` | Geef `--output-dir <dir>` door. Paden buiten `$PWD` vereisen `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (exit 1) | `--output-dir` wijst naar een locatie buiten het project | Voer opnieuw uit met `--allow-external-output` (de melding toont nog de oude flagnaam), of kies een directory binnen het project. |
| Er draaiden meerdere vendors en de map eindigt op `-compare` | `--vendor auto` voert elke gezonde vendor uit | Geef één `--vendor` mee om één vendor te draaien. |
| Antigravity mislukt nadat de health check slaagde | `agy --version` bewijst installatie, geen aanmelding | Meld je aan bij Gemini Code Assist en probeer opnieuw met `oma image doctor` en `--vendor antigravity`. |

---

## Volgende stappen

- [Video genereren](./video-generation.md): `oma-video` hergebruikt `oma-image` als visuele provider
- [Inhouds- en onderzoeksworkflows](./content-and-research.md): andere contentmogelijkheden en hun vereisten
- [Skills](../core-concepts/skills.md): de two-layer skillarchitectuur achter `oma-image`
- [CLI-commando's: image](../cli-interfaces/commands.md#image): volledige referentie voor het commando `oma image`
- [CLI Options](../cli-interfaces/options.md): matrix met globale opties
