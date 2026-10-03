---
title: "Gids: Configuratiereferentie"
sidebar_label: Configuratiereferentie
description: Ondersteunde locaties van OMA-configuratie, voorrang, getypeerde sleutels, standaardwaarden en regels voor eigenaarschap tijdens updates.
---

# Configuratiereferentie {#configuration-reference}

OMA leest configuratie uit `.agents/oma-config.cue` of `.agents/oma-config.yaml`. Een lokale overlay, `.agents/oma-config.local.cue` of `.agents/oma-config.local.yaml`, is handig voor machinespecifieke instellingen die niet in het gedeelde bestand mogen komen.

Voer dit uit in het project waarvan je de configuratie wilt inspecteren:

```bash
oma doctor --profile
```

Het verwachte resultaat is een opgelost profiel met de geselecteerde preset en het modelplan per agent. Als het commando een parsefout meldt, herstel je de dichtstbijzijnde configuratielaag voordat je modelinstellingen wijzigt.

## Welk bestand heeft voorrang {#which-file-wins}

De loader loopt vanaf de huidige map omhoog en stopt bij de dichtstbijzijnde `.agents/`-map die een gedeelde of lokale configuratie bevat. In die map geldt:

1. `oma-config.cue` wordt eerst geëvalueerd.
2. `oma-config.yaml` wordt gebruikt wanneer het gedeelde CUE-bestand ontbreekt of niet kan worden geëvalueerd.
3. Eén lokaal bestand (`oma-config.local.cue` of `.local.yaml`) wordt over het gedeelde bestand samengevoegd.
4. `OMA_MODEL_PRESET` overschrijft, wanneer ingesteld, `model_preset` voor dat proces.

Maps worden recursief samengevoegd. Arrays, scalars en `null` vervangen de gedeelde waarde. Beide lokale formaten tegelijk aanhouden is een fout. Een ongeldig lokaal bestand is fataal, zodat een private override niet stilzwijgend kan worden genegeerd.

Dit is een regel voor de dichtstbijzijnde laag, geen algemene samenvoeging van project en HOME. Een globale installatie leest `~/.agents/oma-config.*` omdat HOME de installatieroot is. Een projectcommando leest de dichtstbijzijnde projectlaag. De updatecontrole voor `auto_update_cli` is de uitzondering: die controleert eerst het project, daarna HOME en valt vervolgens terug op ingeschakeld.

## Top-level-sleutels {#top-level-keys}

De huidige runtimeschema’s of meegeleverde OMA-consumers lezen de volgende sleutels. Een sleutel met de aanduiding sparse is bewust gedeeltelijk: laat een geneste waarde weg om de standaardwaarde van de code te behouden.

| Sleutel | Type of geaccepteerde waarden | Standaard bij afwezigheid | Doel |
| --- | --- | --- | --- |
| `language` | string | `en` | Antwoordtaal voor workflows en skills. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` in het meegeleverde template | Stemkeuze voor `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` in het meegeleverde template; afwezigheid laat geen expliciete override achter | Voorkeur voor datumnotatie. |
| `timezone` | IANA-naam | systeemtijdzone | Datums die door planningen en rapporten worden gebruikt. |
| `auto_update_cli` | boolean | `true` | Achtergrondcontroles op CLI-versies; opt-out met `false`. |
| `telemetry` | boolean | `false` | Opt-in voor vendor-telemetrie tijdens installatie, updates en linkreconciliatie. |
| `model_preset` | niet-lege string | `auto` in nieuwe templates | Ingebouwde of aangepaste modelpreset. `OMA_MODEL_PRESET` overschrijft deze voor één proces. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | FreeLLMAPI-instellingen wanneer de preset `free` is; `FREELLM_BASE_URL` en `FREELLM_MODEL` overschrijven bestandswaarden en de sleutelnaam bevat nooit het geheim. Zie [Modelconfiguratie per agent](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Selecteert providers voor documentatie, search, code-intelligence en semantisch geheugen. Code-intelligence accepteert `serena` of `gortex`; semantisch geheugen accepteert `agentmemory`, `honcho` of `none`. `code_intelligence_guard` (`block` of `off`) bepaalt de PreToolUse-zoekguard. Native zoekopdrachten die beperkt blijven tot bevestigde uitsluitingen van de provider of paden buiten het project zijn zonder bypass toegestaan. De guard leest Serena-uitsluitingen en ingeschakelde gitignore-regels, of de uitsluitlijst van Gortex; hij leidt geen dependencies af uit mapnamen. De hook noemt `OMA_CI_ALLOW_NATIVE` niet. Een shellzoekopdracht met prefix `OMA_CI_ALLOW_NATIVE=1` omzeilt de guard alleen voor resources buiten het project of genegeerde paden die de guard niet heeft herkend, niet voor de broncode van het project. |
| `brave` | `api_key_env` of `api_key_vault` | niet ingesteld | Verwijzing naar de Brave-searchcredential. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | Zie [Honcho-details](#honcho-semantic-memory) | Verbindingsinstellingen voor Honcho-semantisch geheugen. |
| `agents` | agent-ID → `model`, optioneel `effort`, `thinking`, `memory` | resolutie van de preset | Overrides per agent boven op de geselecteerde preset. Effort is `none`, `low`, `medium`, `high` of `xhigh`; memory is `user`, `project` of `local`. |
| `models` | modelslug → CLI-koppeling | niet ingesteld | Inline modeldefinities voor ondersteunde vendor-CLI’s. |
| `custom_presets` | preset → description, optioneel `extends`, `agent_defaults` | niet ingesteld | Door gebruikers gedefinieerde presets; `extends` kan erven van een ingebouwde preset. |
| `vendors` | YAML: `string[]` met geselecteerde vendor-ID’s; CUE-template: optionele fallbackmap `vendors.pi` | alle linkbare vendors voor de YAML-lijst | Selecteert welke vendorintegraties `oma install` en `oma update` in YAML projecteren. De capabilitymap voor dispatch staat in de beheerde orchestratieconfiguratie; zie [Vendorkeuze en dispatchmetadata](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | string | fallback van de consumer | Verouderde vendor-only fallback wanneer geen modelplan wordt opgelost. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | elke ontbrekende dimensie heeft geen limiet | Harde token- en spawnlimieten die vóór de volgende agent-spawn worden gecontroleerd; zie [Sessie-quota caps](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Gedrag en scanuitsluitingen van `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Serena-MCP-transport en updategedrag. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` of `[]` | niet ingesteld = bestaande setup behouden | Selectie van Browser DevTools MCP tijdens reconciliatie. Een expliciete lege lijst verwijdert geselecteerde browservermeldingen. |
| `video` | sparse skill-owned map | standaard van de skill; zie [Video Generation](/docs/guide/video-generation) | Videorouting, providervolgorde, uitvoer, kosten, limieten en HyperFrames-verversingsinstellingen. |
| `image` | sparse skill-owned map | standaard van de skill; zie [Image Generation](/docs/guide/image-generation) | Instellingen voor imagevendor, formaat, kwaliteit, uitvoer, vergelijking en kosten. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | standaard van de skill; zie [Content and Research Workflows](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Voicebox-profiel, uitvoer- en lengte-instellingen. |
| `hwp` | `format`, `version.*`, `output.*` | standaard van de skill; zie [Content and Research Workflows](/docs/guide/content-and-research#extract-hwp-family-documents) | Kordoc-formaat, versiekanaal en uitvoerlocatie. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | standaard van de skill; zie [Content and Research Workflows](/docs/guide/content-and-research#extract-pdf-content) | PDF-extractie, OCR-, image- en overschrijfinstellingen. |
| `scholar` | `base_url` | standaard van de skill; zie [Content and Research Workflows](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host van het Knows-endpoint; de protocolvorm blijft eigendom van de skill. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | standaard van de skill; zie [Diagram Engine](/docs/guide/diagram-engine) | Mermaid/archify-keuze en instellingen van de beheerde engine. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | standaard van de skill; zie [Market Research](/docs/guide/market-research) | Resolutie van de beheerde last30days-engine en locatie van resultaten. |

Het meegeleverde template bevat ook blokken waarvan de consumer eigenaar is. Hun huidige sleutels en standaardwaarden zijn:

| Blok | Door de consumer gelezen sleutels | Standaard | Effect |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | 100 sessies bewaren; Serena-artifacts ouder dan 50 dagen opruimen; `0` schakelt opruimen op leeftijd uit | Standaardwaarden voor `oma memory gc`; commandoflags overschrijven ze. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Regelt het geplande opruimpad voor Serena LSP. Interactief `oma serena reap` blijft expliciet; stille geplande runs zijn opt-in. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Schakelt de stop-hook voor het regellimiet in en stelt het codebudget per bestand in. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | het meegeleverde template schakelt conventional commits en PR-bescherming in, met de co-author- en bestandslijsten uit het template | Regelt de SCM-skill, commit-hook en guard voor geheime patronen. Vervang de identiteitswaarden uit het template door je eigen waarden voordat je co-author-trailers inschakelt. |

Deze blokken worden via de configuratiepassthrough geaccepteerd en door hun feature of workflow geïnterpreteerd. De parser voor `serena_reaper` leest de hierboven getoonde snake_case-sleutels, ook al gebruikten oudere templateopmerkingen camelCase-namen. Lees de bijbehorende featuregids voordat je geneste sleutels toevoegt; deze pagina verzint geen sleutels buiten de hierboven vermelde consumers.

## Exacte geneste objecten {#exact-nested-objects}

### Honcho-semantisch geheugen {#honcho-semantic-memory}

De map `honcho` wordt gevalideerd door `HonchoConfigSchema`. De sleutelnamen en het effectieve runtimegedrag zijn:

| Sleutel | Vorm | Effectieve standaard of beperking |
| --- | --- | --- |
| `base_url` | URL-string | `https://api.honcho.dev`; HTTPS is vereist behalve voor loopback-HTTP. Credentials, querystrings en fragments worden geweigerd. |
| `workspace_id` | 1–128 letters, cijfers, `_` of `-` | Vereist wanneer de provider start. De interactieve installer vult `oma` in als geen opgeslagen waarde bestaat. |
| `project_id` | getrimde string van 1–128 tekens | Weglaten betekent de huidige OMA-projectroot. |
| `api_key_env` | naam van omgevingsvariabele | `HONCHO_API_KEY`. Een niet-loopbackendpoint heeft deze variabele of `api_key_vault` nodig. |
| `api_key_vault` | naam van vaultsleutel (`A-Z`, `a-z`, cijfers, `.`, `_`, `-`; 1–64 tekens) | Weglaten betekent geen vaultlookup. Als beide credentialverwijzingen aanwezig zijn, wordt de omgevingswaarde eerst gebruikt. |
| `timeout_ms` | integer `100`–`30000` | `5000` milliseconden. Dezelfde deadline geldt voor een status- of geheugenaanvraag. |
| `max_results` | integer `1`–`50` | `8` recallresultaten. |
| `max_tokens` | integer `128`–`16000` | `2000` UTF-8-bytes voor teruggehaalde inhoud en afgeleide context. |
| `recall_mode` | `messages` of `hybrid` | De installer schrijft `messages` voor een nieuwe selectie. Een weggelaten waarde schakelt naast message-recall ook het representation request van de provider in. |

Een externe workspace kan bijvoorbeeld een geheimverwijzing gebruiken zonder het geheim in YAML te zetten:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

De installer gebruikt `http://127.0.0.1:8000` als eerste URL wanneer Honcho interactief of niet-interactief wordt ingesteld zonder opgeslagen URL. Die installer-seed staat los van de runtimefallback van de provider hierboven. Gebruik na het selecteren van de provider `oma memory status`; een ontbrekende workspace of credential wordt als niet beschikbaar gemeld in plaats van stilzwijgend naar een andere memoryprovider over te schakelen.

### Sessie-quota caps {#session-quota-caps}

`session.quota_cap` is een gedeeltelijke map. Elk veld is optioneel; een ontbrekend veld laat die dimensie zonder limiet. Waarden moeten niet-negatieve integers zijn en `per_vendor` koppelt vendornamen aan tokenbudgetten:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

De cap-loader controleert eerst de CUE-laag van de gebruiker, daarna de YAML-laag van de gebruiker en vervolgens de fallback met de meegeleverde standaardwaarden. Voor een spawn controleert OMA in die volgorde `spawn_count`, het totale aantal `tokens` en `per_vendor`. Een limiet is bereikt wanneer het gebruik groter dan of gelijk aan de limiet is; OMA blokkeert de volgende spawn en meldt welke dimensie de grens bepaalde. Het gebruik is tokenadministratie, geen schatting van de factuur.

### Vendorkeuze en dispatchmetadata {#vendor-selection-and-dispatch-metadata}

In het bestand `.agents/oma-config.yaml` van de gebruiker is `vendors` een lijst met geselecteerde integratie-ID’s:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Een ontbrekende of lege lijst selecteert alle ID’s in OMA’s register van linkbare vendors. De lijst bepaalt welke install- en updateprojecties worden gemaakt; het is niet de capabilitymap voor vendorcommando’s per vendor.

Het meegeleverde schema `.agents/oma-config.cue` staat ook een object `vendors.pi` toe met de velden `command`, `prompt_flag`, `model_flag`, `default_model` en `thinking_flag`. Dat blok is een getypeerde fallbackvorm in het CUE-template; het huidige agentdispatchpad haalt zijn capabilityvelden uit het beheerde orchestratieregister hieronder. Gebruik `vendors.pi` dus niet als vervanging voor de YAML-selectielijst.

Het beheerde `.agents/skills/oma-orchestration/config/cli-config.yaml` bevat die capabilitymap. Elke invoer `vendors.<id>` ondersteunt de volgende velden:

| Veld | Vorm | Gebruik |
| --- | --- | --- |
| `command` | uitvoerbare string | Binary dat wordt gestart. |
| `subcommand` | string | Subcommando dat vóór de opties wordt ingevoegd, zoals `codex exec`. |
| `prompt_flag` | string, of `none`/`null` om uit te schakelen | Flag die bij de prompt hoort; als die is uitgeschakeld, wordt een positionele prompt gebruikt. |
| `auto_approve_flag` | string | Vendorflag die de toestemming voor schrijfbare runs omzeilt. Onderdrukt in read-onlymodus. |
| `read_only_flag` | string | Vendorflag voor read-only. Als die ontbreekt, gebruikt de builder de vendorfallback of geeft een waarschuwing. |
| `output_format_flag` | string | Flag die machineleesbare uitvoer selecteert. |
| `output_format` | string | Waarde die bij `output_format_flag` hoort. |
| `model_flag` | string | Flag die bij `default_model` hoort. |
| `default_model` | string | Modelwaarde wanneer een opgelost plan geen model levert. |
| `isolation_env` | string in de vorm `NAME=value` | Optionele omgevingsopdracht; onveilige loader- of interpreter-sleutels worden geweigerd en `$$` wordt uitgebreid tot de proces-ID van het huidige proces. |
| `isolation_flags` | argumentstring in shellvorm | Extra isolatieargumenten die in argv-tokens worden gesplitst. |

Het beheerde capabilitybestand wordt door OMA-updates opnieuw gegenereerd. Bewerk voor modelselectie de door de gebruiker beheerde sleutels `agents`, `models` en `custom_presets`; gebruik deze capabilitymap alleen voor het onderhouden van de beheerde orchestratiegegevens of voor het debuggen van een vendoradapter. Het becommentarieerde object `vendors.pi` in oudere templates is fallbackmetadata en vervangt de lijst met geselecteerde vendors of het beheerde dispatchregister niet.

## Veelvoorkomende wijzigingen {#common-changes}

Kies een vaste preset voor een project en houd een persoonlijke override lokaal:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

Selecteer de providers voor code-intelligence en geheugen expliciet:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Houd de browserconfiguratie tijdens updates ongewijzigd of verwijder die bewust:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Regels voor updates en eigenaarschap {#update-and-ownership-rules}

`.agents/oma-config.yaml` is eigendom van de gebruiker. `oma update` behoudt bestaande inhoud en kan nieuw meegeleverde top-level-templatesleutels toevoegen onder een marker `# Added by oma update`. `oma update --force` kan gebruikersconfiguratie, MCP-configuratie en stackmappen vervangen; gebruik dit alleen als je die aanpassingen bewust wilt resetten. Lokale overlaybestanden blijven de privéplek voor machinespecifieke waarden.

Zet geen API-sleutels in dit bestand. Gebruik velden `api_key_env` of `api_key_vault` en bewaar de echte credential in de verwezen secretstore of omgeving.

Zie [Modelresolutie per agent](/docs/guide/per-agent-models) voor details over modelresolutie. Zie [Semantiek van oma-config](/docs/guide/oma-config-semantics) voor laagsemantiek en foutgedrag.
