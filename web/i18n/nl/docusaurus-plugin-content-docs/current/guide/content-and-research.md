---
title: "Gids: Inhouds- en onderzoeksworkflows"
sidebar_label: Overzicht
description: Kies het juiste oh-my-agent-pad, met de bijbehorende vereisten, voor PDF- en HWP-extractie, spraak, wetenschappelijk en webonderzoek, dia's, afbeeldingen, video, code-uitleggers, diagrammen, marktonderzoek, recaps, vertaling en academisch schrijven.
---

# Inhouds- en onderzoeksworkflows {#content-and-research-workflows}

Koppel documenten, audio, onderzoek, media en presentaties aan de verantwoordelijke capability. Begin met het gewenste artifact en kies het kleinste commando of skill-entrypoint waarmee je een controleerbaar resultaat krijgt.

| Behoefte | Entry point | Vereisten | Eerste resultaat | Gids |
|---|---|---|---|---|
| Een PDF extraheren | Skill `oma-pdf` of de onderstaande commando's van `uvx opendataloader-pdf` | `uv` (voor `uvx`) | Markdown, tekst, JSON of een kort extractierapport | [hieronder](#extract-pdf-content) |
| HWP/HWPX/HWPML extraheren | Skill `oma-hwp` en `bunx kordoc@latest` | Bun | Markdown of gestructureerde JSON/chunks | [hieronder](#extract-hwp-family-documents) |
| Audio inspreken of transcriberen | `/oma-voice` | Voicebox-app op `127.0.0.1:17493` | Audio plus een manifest, of `transcript.md` plus een manifest | [hieronder](#generate-speech-or-transcribe-audio) |
| Papers vinden en valideren | `oma scholar` | geen; optioneel `S2_API_KEY`, `OPENALEX_EMAIL` | Zoekresultaten, een opgehaald sidecar-bestand of een lint-rapport | [hieronder](#search-and-validate-scholarly-material) |
| Het web doorzoeken of een pagina ophalen | Skill `oma-search`, `oma search` | optioneel Chrome, Python `curl_cffi`, `yt-dlp`, `gh` (controleer met `oma search doctor`) | JSON op stdout | [CLI-commando's: search](../cli-interfaces/commands.md#search) |
| Een presentatie bouwen | Skill `oma-slide` en `oma slide` | Chrome, of `OMA_CHROME_PATH` | Gevalideerde HTML-dia's en optionele exports | [hieronder](#slides-and-presentations) |
| Afbeeldingen genereren | Skill `oma-image`, `oma image generate` | een van `POLLINATIONS_API_KEY`, `codex login` of een aangemelde `agy` | Afbeeldingen plus `manifest.json` onder `.agents/results/images/` | [Afbeeldingen genereren](./image-generation.md) |
| Een korte video, uitlegvideo of demovideo maken | `/video`, `oma video` | Node.js 22+, FFmpeg, daarna `oma video doctor --install` | Een runmap onder `.agents/results/videos/`; een MP4 na `oma video render` | [Video genereren](./video-generation.md) |
| Een wijziging of onderwerp op één pagina uitleggen | `/explain`, `oma explain` | git voor de wijzigingsmodus; `gh` voor PR-refs | Zelfstandige HTML onder `.agents/results/explain/` | [Code-uitlegger](./code-explainer.md) |
| Interactief architectuurdiagram | `/architecture`, `oma diagram` | geen; archify wordt bij het eerste gebruik opgehaald | Mermaid-blok, plus `.archify.html` wanneer archify wordt gevonden | [Diagramengine](./diagram-engine.md) |
| Marktonderzoek in communities | Skill `oma-market`, `oma market` | Python 3.12+ | Een brief onder `.agents/results/market/` | [Marktonderzoek](./market-research.md) |
| Agentgesprekken samenvatten | `/recap`, `oma recap` | geen | Recap-JSON van de CLI; een gedateerde Markdown-recap van `/recap` | [hieronder](#recap-agent-conversations) |
| Gelokaliseerde tekst vertalen of reviewen | Skill `oma-translation` | geen | Tekst in de doeltaal of een review met onderbouwd bewijs | [hieronder](#translate-or-review-localized-content) |
| Academische tekst opstellen of auditen | Skill `oma-academic-writing` | geen | Concept, revisie of compliance-rapport met een Claim-Evidence Map | [hieronder](#draft-or-audit-academic-writing) |

De `oma`-commandonamen op deze pagina zijn geregistreerde publieke commando's. `uvx`, `bunx` en `bun` zijn externe conversietools die door hun eigen skills worden gedocumenteerd. De overige [skills](../getting-started/glossary.md#skill) zijn entrypoints in natuurlijke taal of slash-commando's; er is geen zelfstandig commando `oma pdf`, `oma hwp`, `oma voice`, `oma translation` of `oma academic-writing`.

## PDF-inhoud extraheren {#extract-pdf-content}

Gebruik de skill `oma-pdf` wanneer de invoer een PDF is en de uitvoer leesbare structuur nodig heeft voor een persoon, een LLM of een retrieval-pipeline. De skill onderzoekt eerst de tekstlaag en kiest daarna standaard-, getagde of hybride OCR-extractie.

Voer voor een snelle controle van de tekstlaag een klein paginabereik uit zonder een uitvoerbestand te maken:

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Gebruik voor Markdown-extractie en normalisatie:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

Kies voor grote documenten een paginabereik met `--pages`. Als de tekstlaag leesbaar is, blijf je bij standaardextractie. Als er getagde structuur aanwezig is maar de leesvolgorde slecht is, probeer je opnieuw met `--use-struct-tree`; probeer voor kapotte tabellen `--table-method cluster` of `--markdown-with-html` voordat je naar OCR overschakelt.

Start voor een gescande of op afbeeldingen gebaseerde PDF eerst de hybride server en voer daarna de hybride converter uit:

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

Definieer in een tweede terminal de uitvoermap en voer de converter uit:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

Het geslaagde artifact is het Markdown- of tekstbestand in de gekozen map, samen met het aantal pagina's en eventuele kwaliteitsnotities. Voor versleutelde PDF's heb je een ontgrendelde kopie of een wachtwoord nodig. Grote bestanden kunnen afzonderlijke paginabereiken en uitvoermappen vereisen, zodat herhaalde runs niet dezelfde basename overschrijven. Behandel OCR-gissingen niet als bronfeiten; rapporteer onzekere of ontbrekende tabellen.

## Documenten uit de HWP-familie extraheren {#extract-hwp-family-documents}

Gebruik `oma-hwp` voor `.hwp`, `.hwpx` en `.hwpml`. De skill voert `kordoc` via Bun uit en verwerkt daarna zo nodig Markdown-tabellen en glyphs uit het Private Use Area.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

Bij een verse clone kan de helper `Cannot find module "turndown"` melden; voer dan `bun install` uit in de map `resources/` van de skill `oma-hwp` en voer de helper opnieuw uit.

Gebruik voor een batch een expliciete uitvoermap:

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

De standaarduitvoer is Markdown. Gebruik voor een gestructureerde AST `bunx kordoc@latest "<input.hwp>" --format json`; gebruik voor retrievalgerichte chunks `--format chunks`. De conversieopties `--dedupe-headers`, `--keep-empty-cols` en `--inline-images` sturen veelvoorkomende problemen met tabellen, samengevoegde kolommen en afbeeldingen. Controleer koppen, geneste of samengevoegde tabellen, lijsten, afbeeldingen, voetnoten en links in het resultaat voordat je het aan een andere skill doorgeeft.

`bun` en `bunx` zijn vereisten. Lege uitvoer kan betekenen dat de inhoud alleen uit gescande afbeeldingen bestaat; stuur dat geval naar een OCR-workflow. Versleutelde of door DRM beperkte inhoud kan onvolledig blijven. PDF-, DOCX- en XLSX-invoer hoort bij de bijbehorende skills, ook al heeft `kordoc` andere commando's voor schrijven en parseren.

## Spraak genereren of audio transcriberen {#generate-speech-or-transcribe-audio}

`oma-voice` is MCP-native en gebruikt een lokale Voicebox-server. Roep de skill in een agent aan met een slash-commando:

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS accepteert per call maximaal 5.000 tekens en heeft een Voicebox-voiceprofiel nodig. Voor transcriptie is geen TTS-profiel nodig; audio mag maximaal 30 minuten duren. Bewaarde TTS- en STT-runs worden opgeslagen onder `.agents/results/voice/`; transcriptie produceert `transcript.md` en `manifest.json`. De notificatiemodus blijft normaal in Voicebox Captures en schrijft geen lokaal audiobestand.

Het lokale MCP-endpoint is `http://127.0.0.1:17493/mcp`. Bij het eerste gebruik registreert de agent Voicebox; de Voicebox-desktopapp levert voiceprofielen. De skill ontdekt de werkelijke MCP-toolnamen met `tools/list` en roept daarna `voicebox_speak`, `voicebox_transcribe` of `voicebox_list_profiles` aan. Als TTS geen profiel heeft, maak of selecteer je er een in Voicebox. Het opsplitsen van een te lang verzoek is een keuze van de gebruiker, omdat de skill verzoeken niet automatisch in delen opdeelt. Als de server niet beschikbaar is, controleer dan het lokale health-endpoint en start Voicebox opnieuw voordat je het probeert.

## Wetenschappelijke literatuur zoeken en valideren {#search-and-validate-scholarly-material}

Gebruik de CLI `oma scholar` voor Knows-sidecars en paper-metadata. Search en resolve zijn discovery-bewerkingen; `get` haalt een record of geselecteerde sectie op; `lint` is de gate voor delen.

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

Knows wordt eerst geprobeerd, met OpenAlex en Semantic Scholar als fallbacks. Met `--section` kun je `statements`, `evidence`, `relations`, `artifacts` of `citation` opvragen. Gebruik `--lenient` wanneer tijdens lokale samenstelling dangling cross-record-references worden verwacht; gebruik `--fail-on-warning` voor een strikte CI-gate. Een zoekresultaat of opgehaald sidecar is bewijs voor discovery, geen claim dat de paper elke conclusie ondersteunt. Genereer of herzie een sidecar in de agent en voer daarna `oma scholar lint` uit voordat je het deelt.

Als een remote service een time-out geeft, probeer dan een bredere query of laat de fallback van de CLI zijn werk doen; `--always-fallback` bevraagt OpenAlex en Semantic Scholar ook wanneer Knows resultaten heeft. Een 429 van Semantic Scholar kan een limiet van de anonieme pool zijn; probeer later opnieuw, of stel `S2_API_KEY` in. Stel `OPENALEX_EMAIL` (en optioneel `OPENALEX_API_KEY`) in om je OpenAlex-verzoeken te identificeren. Als een sidecar een fout in de provenance-enum heeft, gebruik je `tool`, `person` of `org`; als er waarschuwingen over relation density overblijven, voeg je alleen ondersteunde bewijsrelaties toe waar de bron die ondersteunt.

## Dia's en presentaties {#slides-and-presentations}

Gebruik `oma-slide` wanneer het resultaat een presentatie met een vaste afmeting is. De authoring-skill schrijft HTML-fragmenten op 1920×1080; de CLI valideert de geometrie, bundelt het deck en exporteert het.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

Exporteer pas na validatie:

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

Gebruik `--slide <file>` voor een controle van één dia en `--report-file <path>` met JSON-uitvoer wanneer een ander proces de bevindingen nodig heeft. `slide import pptx <file>` start een importworkflow; `slide asset fetch-video <url>` downloadt een video-asset; `slide style list|preview|get <slug>` inspecteert stijlen. PPTX-uitvoer is rastergebaseerd en levert dus geen bewerkbare tekst- of vormlagen. Validatie en export vereisen Chrome/puppeteer; stel `OMA_CHROME_PATH` in wanneer het uitvoerbare bestand niet wordt gevonden. Als validatie na drie automatische herstelrondes niet convergeert, gebruik je de gemelde geometriebevindingen om het betrokken fragment aan te passen.

## Agentgesprekken samenvatten {#recap-agent-conversations}

Gebruik `/recap` (of vraag de agent om een recap) voor evidence-based samenvattingen van werk; dat voert `oma recap` uit om de geschiedenis te verzamelen. Een kalenderdatum en een voortschrijdend venster zijn verschillende invoeren:

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

Deze commando's printen de verzamelde geschiedenis (standaard als terminaltekst, als JSON met `--json` of als Mermaid-ganttdiagram met `--mermaid`), en `--graph` opent in plaats daarvan een interactieve grafiek in de browser; de CLI zelf schrijft geen bestand. `/recap` slaat de Markdown-recap op onder `.agents/results/recap/`, normaal als `{date}.md` voor een dagelijkse recap of `{start-date}~{end-date}.md` voor een periode. De recap groepeert op werk, markeert gevraagd en lopend werk afzonderlijk van afgerond werk en registreert ontbrekende toolgeschiedenis. Gebruik `--top` of `--sort` wanneer het rapport een smallere scope nodig heeft. Als de CLI niet beschikbaar is, kan de skill de gedocumenteerde fallback voor de Claude-geschiedenis gebruiken, maar de beperktere brondekking moet worden vermeld.

Gebruik `oma retro` voor een gitgebaseerde engineering-retrospective. Die beantwoordt een andere vraag dan een conversation recap en kan aangrenzende perioden vergelijken met `--compare`.

## Gelokaliseerde inhoud vertalen of reviewen {#translate-or-review-localized-content}

Gebruik `oma-translation` voor UI-strings, documentatie, rapporten, marketingtekst of academische tekst. Roep de skill aan in natuurlijke taal of met het skill-entrypoint `/oma-translation`; er is geen publiek commando `oma translation`.

Geef de skill de bron, doellocale, het contenttype en aan of het om vertaling, review of synchronisatie met bronwijzigingen gaat. De skill laadt één passend taalprofiel uit de skillresources wanneer dat beschikbaar is, bewaart placeholders, links, Markdown-structuur en beschermde syntax en volgt de siblingvertalingen en glossary. Voor een lange pagina of review past de skill ook de vertaalrubric toe. Als er geen doelprofiel is, gebruikt de skill de gedeelde regels en meldt hij die beperking één keer.

Voor documentatie vertaal je de stabiele Engelse pagina nadat anchors en commandovoorbeelden zijn vastgesteld. Houd CLI-namen, vlaggen, paden, omgevingsvariabelen en codeblokken exact; vertaal de omliggende uitleg en controleer de structuur van de doelpagina met de Engelse versie. Een onduidelijke bronbetekenis moet je markeren, niet stilzwijgend raden.

## Academische tekst opstellen of auditen {#draft-or-audit-academic-writing}

Gebruik `oma-academic-writing` voor Engelse essays, rapporten, literatuuroverzichten, analyses, executive summaries, conclusies en revisies. Kies één modus en geef de rubric of bronbeperkingen mee:

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` levert proza, Writing Notes en een Claim-Evidence Map op. `revise` levert oorspronkelijke en herziene blokken plus concrete wijzigingen op. `review` retourneert PASS/FAIL-bevindingen over zinsstructuur, werkwoorden, hedging, specificiteit, anti-AI-patronen, alineaduidelijkheid, ritme en claim-evidence-alignment. De skill leest een bestaande draft volledig tijdens revise/review, verzwakt of verwijdert onbewezen claims en geeft niet-Engelse uitvoer na de Engelse stap door aan `oma-translation`.

Gebruik `oma scholar` voor bronontdekking en sidecar-bewijs voordat je schrijft. Als een citaat of rubric ontbreekt, markeer de claim als pending of vraag naar de ontbrekende beperking; vul het gat niet met een verzonnen bron. Het bruikbare eindartifact is de tekst plus evidence map of auditrapport, geen generiek "opgepoetste" alinea zonder traceerbaarheid.

## Herstelchecklist {#recovery-checklist}

| Situatie | Volgende actie |
|---|---|
| Uitvoer is leeg of structureel verminkt | Controleer het invoertype en kies voor PDF's de getagde, tabel- of OCR-modus; controleer bij HWP of Bun werkt en inspecteer de bron op pagina's die alleen uit afbeeldingen bestaan. |
| Een lokale skill kan geen verbinding maken | Controleer de lokale service of CLI van de eigenaar (`Voicebox`, `Chrome`, `uvx`, `bunx`) voordat je het contentverzoek wijzigt. |
| Een onderzoeksresultaat is mager | Maak de query breder, inspecteer de fallback-/bronstatus en bewaar de onzekerheid in het rapport. |
| Een slide-export faalt | Voer `oma slide validate --workspace <dir> --output json` uit, herstel geometrie- of fontbevindingen en exporteer daarna opnieuw. |
| Een recap overdrijft de voltooiing | Controleer receipts en artifacts opnieuw; een prompt of toolaanroep alleen is geen bewijs van voltooiing. |
| Een vertaling verandert codesyntax | Herstel beschermde namen en voer de structuurcontroles opnieuw uit voordat je de prozabetekenis reviewt. |
| Academische tekst bevat onbewezen claims | Verwijder of nuanceer de claim, voeg bewijs toe via het scholar-pad en voer de Claim-Evidence Map opnieuw uit. |

## Volgende stappen {#next-steps}

- [Afbeeldingen genereren](./image-generation.md), [Video genereren](./video-generation.md), [Code-uitlegger](./code-explainer.md), [Diagramengine](./diagram-engine.md) en [Marktonderzoek](./market-research.md) — de gidsen voor de capabilities in de tabel hierboven
- [CLI-commando's](../cli-interfaces/commands.md) en [CLI-opties](../cli-interfaces/options.md) — de volledige geregistreerde CLI-paden en option aliases
- [Configuratiereferentie](./configuration-reference.md) — de configuratiesecties `pdf`, `hwp`, `voice` en `scholar`
