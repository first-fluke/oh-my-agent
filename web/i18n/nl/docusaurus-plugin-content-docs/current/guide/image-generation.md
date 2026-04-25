---
title: "Gids: Beeldgeneratie"
description: Volledige gids voor oh-my-agent beeldgeneratie — multi-vendor dispatch via Codex (gpt-image-2), Pollinations (flux/zimage, gratis) en Gemini, met referentiebeelden, kostenbeperkingen, uitvoerstructuur, troubleshooting en gedeelde aanroeppatronen.
---

# Beeldgeneratie

`oma-image` is de multi-vendor beeldrouter voor oh-my-agent. Het genereert beelden vanuit prompts in natuurlijke taal, dispatcht naar de vendor-CLI waarbij je geauthenticeerd bent en schrijft een deterministisch manifest naast de uitvoer, zodat elke run reproduceerbaar is.

De skill activeert automatisch op trefwoorden zoals *image*, *illustration*, *visual asset*, *concept art*, of wanneer een andere skill een beeld als bijproduct nodig heeft (hero shot, thumbnail, productfoto).

---

## Wanneer Gebruiken

- Genereren van beelden, illustraties, productfoto's, concept art, hero/landing visuals
- Dezelfde prompt naast elkaar vergelijken tussen meerdere modellen (`--vendor all`)
- Assets produceren vanuit een editor-workflow (Claude Code, Codex, Gemini CLI)
- Een andere skill (design, marketing, docs) de beeldpipeline laten aanroepen als gedeelde infrastructuur

## Wanneer NIET Gebruiken

- Een bestaand beeld bewerken of retoucheren — buiten scope (gebruik een speciaal tool)
- Genereren van video of audio — buiten scope
- Inline SVG / vectorcompositie vanuit gestructureerde data — gebruik een templating-skill
- Eenvoudige resize / formaatconversie — gebruik een beeldbibliotheek, geen generatiepipeline

---

## Vendors in een Oogopslag

De skill is CLI-first: wanneer de native CLI van een vendor ruwe beeldbytes kan teruggeven, krijgt het subprocess-pad voorrang boven een directe API-key.

| Vendor | Strategie | Modellen | Trigger | Kosten |
|---|---|---|---|---|
| `pollinations` | Directe HTTP | Gratis: `flux`, `zimage`. Credit-gated: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | `POLLINATIONS_API_KEY` ingesteld (gratis aanmelden op https://enter.pollinations.ai) | Gratis voor `flux` / `zimage` |
| `codex` | CLI-first — `codex exec` via ChatGPT OAuth | `gpt-image-2` | `codex login` (geen API-key nodig) | In rekening gebracht op je ChatGPT-plan |
| `gemini` | CLI-first → directe API als fallback | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` of `GEMINI_API_KEY` + billing | Standaard uitgeschakeld; vereist billing |

`pollinations` is de standaard vendor omdat `flux` / `zimage` gratis zijn, dus auto-triggeren op trefwoorden is veilig.

---

## Snelle Start

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

`oma img` is een alias voor `oma image`.

---

## Slash Command (Binnen een Editor)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

Het slash command wordt doorgestuurd naar dezelfde `oma image generate` pipeline — elke CLI-flag werkt hier ook.

---

## CLI-Referentie

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

### Belangrijke Flags

| Flag | Doel |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini` of `all`. Met `all` moet elke gevraagde vendor geauthenticeerd zijn (strikt). |
| `-n, --count <n>` | Aantal beelden per vendor, 1–5 (wall-time gebonden). |
| `--size <size>` | Verhouding: `1024x1024` (vierkant), `1024x1536` (portret), `1536x1024` (landschap) of `auto`. |
| `--quality <level>` | `low`, `medium`, `high` of `auto` (vendor-default). |
| `--out <dir>` | Uitvoermap. Standaard `.agents/results/images/{timestamp}/`. Paden buiten `$PWD` vereisen `--allow-external-out`. |
| `-r, --reference <path>` | Tot 10 referentiebeelden (PNG/JPEG/GIF/WebP, ≤ 5 MB elk). Herhaalbaar of komma-gescheiden. Ondersteund op `codex` en `gemini`; afgewezen op `pollinations`. |
| `-y, --yes` | Sla de kostenbevestigingsprompt over voor runs geschat op ≥ `$0.20`. Ook via `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Sla de SHA-256 van de prompt op in plaats van de ruwe tekst in `manifest.json`. |
| `--dry-run` | Print het plan en de kostenraming zonder uit te geven. |
| `--format text\|json` | CLI-uitvoerformaat. JSON is de integratie-interface voor andere skills. |
| `--strategy <list>` | Alleen voor Gemini-escalatie, bijv. `mcp,stream,api`. Overschrijft `vendors.gemini.strategies`. |

---

## Referentiebeelden

Voeg tot 10 referentiebeelden toe om stijl, onderwerp-identiteit of compositie te sturen.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Vendor | Referentie-ondersteuning | Hoe |
|---|---|---|
| `codex` (gpt-image-2) | Ja | Geeft `-i <path>` door aan `codex exec` |
| `gemini` (2.5-flash-image) | Ja | Inlinet base64 `inlineData` in het verzoek |
| `pollinations` | Nee | Afgewezen met exit code 4 (vereist URL-hosting) |

### Waar Bijgevoegde Beelden Staan

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, getoond in systeemberichten als `[Image: source: <path>]`. Sessie-gebonden: kopieer naar een duurzame locatie als je het later opnieuw wilt gebruiken.
- **Antigravity** — workspace upload directory (de IDE toont het exacte pad)
- **Codex CLI als host** — moet expliciet worden meegegeven; bijlagen in het gesprek worden niet doorgestuurd

Wanneer de gebruiker een beeld bijvoegt en vraagt er een te genereren of bewerken op basis daarvan, **moet** de aanroepende agent het doorsturen via `--reference <path>` in plaats van het in proza te beschrijven. Als de lokale CLI te oud is om `--reference` te ondersteunen, voer dan `oma update` uit en probeer opnieuw.

---

## Uitvoerstructuur

Elke run schrijft naar `.agents/results/images/` met een directory voorzien van timestamp en hash-suffix:

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

`manifest.json` registreert de vendor, het model, de prompt (of de SHA-256 ervan), grootte, kwaliteit en kosten — elke run is reproduceerbaar uit het manifest alleen.

---

## Kosten, Veiligheid en Annulering

1. **Kostenbeperking** — runs geschat op ≥ `$0.20` vragen om bevestiging. Omzeil dit met `-y` of `OMA_IMAGE_YES=1`. Standaard `pollinations` (flux/zimage) is gratis, dus de prompt wordt daarvoor automatisch overgeslagen.
2. **Padveiligheid** — uitvoerpaden buiten `$PWD` vereisen `--allow-external-out` om verrassende schrijfacties te voorkomen.
3. **Annuleerbaar** — `Ctrl+C` (SIGINT/SIGTERM) breekt elke lopende provider-aanroep en de orchestrator samen af.
4. **Deterministische uitvoer** — `manifest.json` wordt altijd naast de beelden geschreven.
5. **Max `n` = 5** — een wall-time grens, geen quotum.
6. **Exit codes** — afgestemd op `oma search fetch`: `0` ok, `1` algemeen, `2` veiligheid, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Verduidelijkingsprotocol

Voordat de aanroepende agent `oma image generate` uitvoert, doorloopt deze deze checklist. Als er iets ontbreekt en niet af te leiden is, vraagt de agent eerst of versterkt de prompt en toont de uitbreiding ter goedkeuring.

**Vereist:**
- **Onderwerp** — wat is het primaire ding in het beeld? (object, persoon, scene)
- **Setting / achtergrond** — waar bevindt het zich?

**Sterk aanbevolen (vraag indien afwezig en niet af te leiden):**
- **Stijl** — fotorealistisch, illustratie, 3D-render, olieverfschilderij, concept art, flat vector?
- **Sfeer / belichting** — helder vs. somber, warm vs. koel, dramatisch vs. minimaal
- **Gebruikscontext** — hero image, icoon, thumbnail, productshot, poster?
- **Beeldverhouding** — vierkant, portret of landschap

Voor een korte prompt zoals *"a red apple"* stelt de agent **geen** vervolgvragen. In plaats daarvan versterkt deze inline en toont de gebruiker:

> Gebruiker: "a red apple"
> Agent: "Ik genereer dit als: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Zal ik doorgaan, of wil je een andere stijl/compositie?"

Wanneer de gebruiker een volledige creatieve briefing heeft geschreven (≥ 2 van: onderwerp + stijl + belichting + compositie), wordt hun prompt letterlijk gerespecteerd — geen verduidelijking, geen versterking.

**Uitvoertaal.** Generatieprompts worden in het Engels naar de provider gestuurd (beeldmodellen zijn voornamelijk getraind op Engelse captions). Als de gebruiker in een andere taal heeft geschreven, vertaalt de agent en toont de vertaling tijdens de versterking, zodat de gebruiker eventuele misinterpretaties kan corrigeren.

---

## Gedeelde Aanroep (Vanuit Andere Skills)

Andere skills roepen beeldgeneratie aan als gedeelde infrastructuur:

```bash
oma image generate "<prompt>" --format json
```

Het JSON-manifest dat naar stdout wordt geschreven bevat de uitvoerpaden, vendor, model en kosten — eenvoudig te parsen en te ketenen.

---

## Configuratie

- **Projectconfig:** `config/image-config.yaml`
- **Omgevingsvariabelen:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — overschrijft de standaard vendor (anders `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — overschrijft de standaard uitvoermap
  - `OMA_IMAGE_YES` — `1` om kostenbevestiging te omzeilen
  - `POLLINATIONS_API_KEY` — vereist voor de pollinations-vendor (gratis aanmelden)
  - `GEMINI_API_KEY` — vereist wanneer de gemini-vendor terugvalt op de directe API
  - `OMA_IMAGE_GEMINI_STRATEGIES` — komma-gescheiden escalatievolgorde voor gemini (`mcp,stream,api`)

---

## Troubleshooting

| Symptoom | Waarschijnlijke oorzaak | Oplossing |
|---|---|---|
| Exit code `5` (auth-required) | Geselecteerde vendor is niet geauthenticeerd | Voer `oma image doctor` uit om te zien welke vendor moet inloggen. Daarna `codex login` / `POLLINATIONS_API_KEY` instellen / `gemini auth login`. |
| Exit code `4` op `--reference` | `pollinations` weigert referenties, of bestand te groot / verkeerd formaat | Schakel over naar `--vendor codex` of `--vendor gemini`. Elke referentie moet ≤ 5 MB en PNG/JPEG/GIF/WebP zijn. |
| `--reference` niet herkend | Lokale CLI is verouderd | Voer `oma update` uit en probeer opnieuw. Val niet terug op een prozabeschrijving. |
| Kostenbevestiging blokkeert automatisering | Run is geschat op ≥ `$0.20` | Geef `-y` mee of stel `OMA_IMAGE_YES=1` in. Beter: schakel over naar gratis `pollinations`. |
| `--vendor all` breekt direct af | Een van de gevraagde vendors is niet geauthenticeerd (strict mode) | Authenticeer de ontbrekende vendor, of kies een specifieke `--vendor`. |
| Uitvoer geschreven naar onverwachte map | Standaard is `.agents/results/images/{timestamp}/` | Geef `--out <dir>` mee. Paden buiten `$PWD` hebben `--allow-external-out` nodig. |
| Gemini geeft geen beeldbytes terug | De agentic loop van Gemini CLI emitteert geen ruwe `inlineData` op stdout (vanaf 0.38) | Provider valt automatisch terug op de directe API. Stel `GEMINI_API_KEY` in en zorg voor billing. |

---

## Gerelateerd

- [Skills](/docs/core-concepts/skills) — de tweelagen-skill-architectuur die `oma-image` aandrijft
- [CLI Commands](/docs/cli-interfaces/commands) — volledige `oma image` commando-referentie
- [CLI Options](/docs/cli-interfaces/options) — globale optiematrix
