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

De loader leest globale standaardwaarden uit `$OMA_HOME/.agents/` (standaard
`~/.oma/.agents/`), loopt daarna vanaf de huidige map omhoog en stopt bij
de dichtstbijzijnde `.agents/`-map van een project. In elke geselecteerde map geldt:

1. `oma-config.yaml` levert de gedeelde waarden.
2. `oma-config.cue` overschrijft, wanneer aanwezig en geldig, elke sleutel die het instelt; YAML-sleutels die het niet instelt, blijven behouden. Als het CUE-bestand niet kan worden geëvalueerd, geeft OMA een waarschuwing en gebruikt het alleen het YAML-bestand.
3. Eén lokaal bestand (`oma-config.local.cue` of `.local.yaml`) wordt over het gedeelde resultaat samengevoegd.

Het gedeelde/lokale resultaat van het project overschrijft het globale gedeelde/lokale resultaat.
`OMA_MODEL_PRESET` overschrijft, wanneer ingesteld, `model_preset` na alle bestandslagen.
De volledige volgorde, een stroomdiagram en probleemoplossing staan in
[Configuratie laden](/docs/guide/oma-config-semantics#precedence-table).

Maps worden recursief samengevoegd. Arrays, scalars en `null` vervangen de gedeelde waarde. Beide lokale formaten tegelijk aanhouden is een fout. Een ongeldig lokaal bestand is fataal, zodat een private override niet stilzwijgend kan worden genegeerd.

Verschillende bovenliggende projectroots worden niet samengevoegd. Een lege dichtstbijzijnde
`.agents/`-map van een project legt die grens nog steeds vast. De buiten gebruik gestelde installatie in `~/.agents/`
is invoer voor de migratie en wordt niet als projectfallback gelezen. Globale standaardwaarden
wijzigen de identiteit of geheugenscope van het huidige project niet.

## Top-level-sleutels {#top-level-keys}

De huidige runtimeschema’s of meegeleverde OMA-consumers lezen de volgende sleutels. Een sleutel met de aanduiding sparse is bewust gedeeltelijk: laat een geneste waarde weg om de standaardwaarde van de code te behouden.

| Sleutel | Type of geaccepteerde waarden | Standaard bij afwezigheid | Doel |
| --- | --- | --- | --- |
| `language` | string | `en` | Antwoordtaal voor workflows en skills. De installatie behoudt een bestaande waarde of initialiseert die vanuit de systeemtaal zonder te vragen. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` in het meegeleverde template | Stemkeuze voor `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` in het meegeleverde template; afwezigheid laat geen expliciete override achter | Voorkeur voor datumnotatie. |
| `timezone` | IANA-naam | systeemtijdzone | Datums die door planningen en rapporten worden gebruikt. |
| `auto_update_cli` | boolean | `true` | Achtergrondcontroles op CLI-versies; opt-out met `false`. |
| `telemetry` | boolean | `false` | Opt-in voor vendor-telemetrie tijdens installatie, updates en linkreconciliatie. |
| `model_preset` | niet-lege string | `auto` in nieuwe templates | Ingebouwde of aangepaste modelpreset. `OMA_MODEL_PRESET` overschrijft deze voor één proces. |
| `free` | `base_url`, `api_key_env`, `model` | niet ingesteld | Verouderde spelling van `providers.free` (`model` is daar `default_model`); wordt nog gelezen, en `oma update` verplaatst de sleutel. |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory`; credentialsecties `brave`, `exa`, `honcho`; elke andere `<name>` → LLM-providerobject | `context7`, `native`, `serena`, `block`, `agentmemory`; geen credentials of LLM-providers | Selecteert providers voor documentatie, search, code-intelligence en semantisch geheugen, bewaart hun credentialverwijzingen en declareert LLM-endpoints waar agenten naartoe gerouteerd kunnen worden. Zie [Providers](#providers). |
| `brave`, `exa`, `honcho` | zoals onder `providers` | niet ingesteld | Verouderde top-level spellingen van `providers.brave`, `providers.exa` en `providers.honcho`; worden nog gelezen, en `oma update` verplaatst ze. |
| `agents` | agent-ID → `model`, optioneel `effort`, `thinking`, `memory`; `default` → `cli`, `effort`, `thinking`, `memory` | resolutie van de preset; `default.cli` valt terug op `claude` (`codex` voor een providerroute) | Overrides per agent boven op de geselecteerde preset. Effort is `none`, `low`, `medium`, `high` of `xhigh`; memory is `user`, `project` of `local`. `agents.default` vult die velden voor elke rol die er zelf geen instelt, en de `cli` daarvan (een van `claude`, `codex`, `cursor`, `antigravity`, `qwen`, `grok`, `kimi`, `kiro`, `opencode`, `pi`) is de vendor wanneer niets anders er een kiest: een niet-gedetecteerde runtime onder `auto`, of een providerroute na `--vendor`, `OMA_RUNTIME_VENDOR` en de gedetecteerde runtime. Een model in de vorm `<provider>/<model-id>` routeert de rol via die LLM-provider. |
| `models` | modelslug → CLI-koppeling | niet ingesteld | Inline modeldefinities voor ondersteunde vendor-CLI’s. |
| `custom_presets` | preset → description, optioneel `extends`, `agent_defaults` | niet ingesteld | Door gebruikers gedefinieerde presets; `extends` kan erven van een ingebouwde preset. |
| `vendors` | `string[]` met geselecteerde vendor-ID’s (YAML en CUE) | afwezig: `oma link` gebruikt elke linkbare vendor, `oma update` gebruikt vendors waarvan de projectmappen bestaan | Selecteert welke vendorintegraties `oma install` en `oma update` projecteren. De capabilitymap voor dispatch staat in de beheerde orchestratieconfiguratie; zie [Vendorkeuze en dispatchmetadata](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | vendor-ID | niet ingesteld | Verouderde spelling van `agents.default.cli`; wordt nog gelezen, en `oma update` verplaatst de sleutel. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | elke ontbrekende dimensie heeft geen limiet | Geregistreerd tokengebruik en spawnlimieten die vóór de volgende agent-spawn worden gecontroleerd; zie [Sessie-quota caps](#session-quota-caps). |
| `diagnostic_feedback` | `enabled`, `host_diagnostics`, `timeout_ms` | automatisch voor ondersteunde terminalhosts, `false`, `1400` | Vergelijkt Serena-diagnostiek vóór en na native bestandsbewerkingen; zie [Diagnostische feedback](#diagnostic-feedback). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Gedrag en scanuitsluitingen van `oma docs verify`. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Serena-MCP-transport en updategedrag. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` of `[]` | niet ingesteld = bestaande setup behouden | Selectie van Browser DevTools MCP tijdens reconciliatie. Een expliciete lege lijst verwijdert geselecteerde browservermeldingen. |
| `video` | sparse skill-owned map | standaard van de skill; zie [Video Generation](/docs/guide/video-generation) | Videorouting, providervolgorde, uitvoer, kosten, limieten en HyperFrames-verversingsinstellingen. |
| `image` | sparse skill-owned map | standaard van de skill; zie [Image Generation](/docs/guide/image-generation) | Instellingen voor imagevendor, formaat, kwaliteit, uitvoer, vergelijking en kosten. |
| `voice` | `backend`, `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | `backend: auto`; overige sleutels: standaard van de skill; zie [Inhouds- en onderzoeksworkflows](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Spraakbackend (`auto`, `voicebox`, `voicestudio`; ook gebruikt voor de vertelling van `oma video`), profiel-, uitvoer- en lengte-instellingen. |
| `hwp` | `format`, `version.*`, `output.*` | standaard van de skill; zie [Inhouds- en onderzoeksworkflows](/docs/guide/content-and-research#extract-hwp-family-documents) | Kordoc-formaat, versiekanaal en uitvoerlocatie. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | standaard van de skill; zie [Inhouds- en onderzoeksworkflows](/docs/guide/content-and-research#extract-pdf-content) | PDF-extractie, OCR-, image- en overschrijfinstellingen. |
| `scholar` | `base_url` | standaard van de skill; zie [Inhouds- en onderzoeksworkflows](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host van het Knows-endpoint; de protocolvorm blijft eigendom van de skill. |
| `diagram` | `engine`, `explain_sidecar`, `archify.path`, `archify.quality`, `archify.open` | standaard van de skill; zie [Diagram Engine](/docs/guide/diagram-engine) | Mermaid/archify-keuze en pin- en kwaliteitsinstellingen van archify. De buiten gebruik gestelde sleutels `archify.managed`, `archify.channel` en `archify.check_interval_min` worden met een melding genegeerd, en `oma update` verwijdert ze. |
| `market` | `path`, `python`, `save_dir` | standaard van de skill; zie [Market Research](/docs/guide/market-research) | Pin van de last30days-engine, interpreter en resultaatlocatie. De buiten gebruik gestelde sleutels `managed`, `channel` en `check_interval_min` worden met een melding genegeerd, en `oma update` verwijdert ze. |

Het meegeleverde template bevat ook blokken waarvan de consumer eigenaar is. Hun huidige sleutels en standaardwaarden zijn:

| Blok | Door de consumer gelezen sleutels | Standaard | Effect |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | 100 sessies bewaren; Serena-artefacten ouder dan 50 dagen opruimen; `0` schakelt opruimen op leeftijd uit | Standaardwaarden voor `oma memory gc`; commandovlaggen overschrijven ze. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Regelt het geplande opruimpad voor Serena LSP. Interactief `oma serena reap` blijft expliciet; stille geplande runs zijn opt-in. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Schakelt de stop-hook voor het regellimiet in en stelt het codebudget per bestand in. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | het meegeleverde template schakelt conventional commits en PR-bescherming in, met de co-author- en bestandslijsten uit het template | Regelt de SCM-skill, commit-hook en guard voor geheime patronen. Vervang de identiteitswaarden uit het template door je eigen waarden voordat je co-author-trailers inschakelt. |

Deze blokken worden via de configuratiepassthrough geaccepteerd en door hun feature of workflow geïnterpreteerd. De parser voor `serena_reaper` leest alleen de hierboven getoonde snake_case-sleutels en negeert camelCase. De meegeleverde templates tonen nog camelCase (`keepWarm`, `idleMinutes`, `graceSeconds`), en het meegeleverde CUE-schema weigert de snake_case-sleutels binnen zijn schemablok (`field not allowed`), dus stel ze in via `oma-config.yaml` of een lokale YAML-overlay. Lees de bijbehorende featuregids voordat je geneste sleutels toevoegt; deze pagina verzint geen sleutels buiten de hierboven vermelde consumers.

## Exacte geneste objecten {#exact-nested-objects}

### Providers {#providers}

`providers` selecteert één provider per capability:

| Sleutel | Geaccepteerde waarden | Standaard |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | ID van een searchprovider (kleine letters, cijfers, `_`, `-`), zoals `native` of `brave` | `native` |
| `code_intelligence` | `serena`, `gortex` | `serena` |
| `code_intelligence_guard` | `block`, `off` | `block` |
| `semantic_memory` | `agentmemory`, `honcho`, `none` | `agentmemory` |

Drie gereserveerde sleutels bevatten de credential- of verbindingssectie voor een selector: `providers.brave` en `providers.exa` (`api_key_env` of `api_key_vault`) voor `web`, en `providers.honcho` voor `semantic_memory` (zie [Honcho-semantisch geheugen](#honcho-semantic-memory)). Hun verouderde top-level spellingen worden nog gelezen.

Elke andere sleutel onder `providers` is een **LLM-provider**: een OpenAI- of Anthropic-compatibel endpoint waar `oma agent spawn` een child-CLI doorheen kan routeren in plaats van via het eigen account van die CLI. De waarde is een object:

| Veld | Geaccepteerde waarden | Vereist | Doel |
| --- | --- | --- | --- |
| `base_url` | absolute HTTP(S)-URL zonder credentials, query of fragment; `/v1` wordt toegevoegd wanneer die ontbreekt | ja | Het endpoint. |
| `api_key_env` | naam van een omgevingsvariabele | ja (behalve `free`, dat standaard `FREELLM_API_KEY` gebruikt) | Waar de sleutel vandaan wordt gelezen; het bestand bevat de sleutel nooit. `base_url` is eveneens alleen voor `free` optioneel (`http://127.0.0.1:31415/v1`). |
| `transport` | `chat_completions` (standaard), `responses`, `anthropic_messages`, `multi` | nee | Het wireprotocol dat het endpoint spreekt. Het selecteert de child-CLI: `chat_completions` → Codex of Qwen, `responses` → Codex, `anthropic_messages` → Claude, `multi` (een gateway die alle drie bedient) → Codex, Claude of Qwen. |
| `default_model` | model-ID | wanneer de provider als `model_preset` wordt gebruikt | Het model dat elke rol gebruikt onder `model_preset: <name>`. |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free` is de ingebouwde provider voor een lokale FreeLLMAPI-gateway: elk veld heeft een standaard, `FREELLM_BASE_URL` en `FREELLM_MODEL` overschrijven het bestand, en het verouderde top-level blok `free:` wordt nog gelezen (de `model` daarvan is hier `default_model`); zie [Aangepaste LLM-providers](/docs/guide/per-agent-models#custom-llm-providers).

`code_intelligence_guard` bepaalt de PreToolUse-zoekguard. Native zoekopdrachten die beperkt blijven tot bevestigde uitsluitingen van de provider of paden buiten het project zijn zonder bypass toegestaan. De guard leest Serena-uitsluitingen en ingeschakelde gitignore-regels, of de uitsluitlijst van Gortex; hij leidt geen dependencies af uit mapnamen.

De hook noemt `OMA_CI_ALLOW_NATIVE` niet. Een shellzoekopdracht met prefix `OMA_CI_ALLOW_NATIVE=1` omzeilt de guard alleen voor resources buiten het project of genegeerde paden die de guard niet heeft herkend, niet voor de broncode van het project.

### Honcho-semantisch geheugen {#honcho-semantic-memory}

De map `providers.honcho` (verouderde top-level `honcho`, nog gelezen) wordt gevalideerd door `HonchoConfigSchema`. De sleutelnamen en het effectieve runtimegedrag zijn:

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

`session.quota_cap` is een gedeeltelijke map. Elk veld is optioneel; een ontbrekend veld laat die dimensie zonder limiet. Waarden moeten niet-negatieve integers zijn zonder `_`-scheidingstekens (YAML leest `2_000_000` als een string, waardoor die dimensie zonder limiet blijft). `per_vendor` koppelt dispatch-vendor-ID’s zoals `claude`, `codex` of `antigravity` aan tokenbudgetten:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

De cap-loader controleert eerst de CUE-laag van de gebruiker, daarna de YAML-laag van de gebruiker en vervolgens de fallback met de meegeleverde standaardwaarden. Voor een spawn controleert OMA in die volgorde `spawn_count`, het totale aantal `tokens` en `per_vendor`. Een limiet is bereikt wanneer het gebruik groter dan of gelijk aan de limiet is; OMA blokkeert de volgende spawn en meldt welke dimensie de grens bepaalde.

OMA reserveert bij de start van een run een schatting van de inputtokens. Wanneer na de run een ondersteund native transcript beschikbaar is, vervangt het geregistreerde input-, cache- en outputgebruik die schatting zonder een extra spawn te tellen. Anders blijft het record expliciet geschat op basis van de promptlengte. Waargenomen gebruik van de rootsessie wordt als partial gemarkeerd wanneer native subagenten buiten de vastleggingscope vallen. Tokencaps hangen dus af van de beschikbare waarnemingen; ze onderbreken een al draaiend child-proces niet en garanderen geen factuurlimiet. `spawn_count` is de meest voorspelbare limiet.

### Uitvoeringsbudget van een sessie {#session-execution-budget}

Stel `session.execution` in om de verstreken tijd te begrenzen voor door OMA beheerde CLI-dispatch en verificatie. Gebruik ofwel een positieve `timeout_seconds`, ofwel een ISO 8601-`deadline` met tijdzone:

```yaml
session:
  execution:
    timeout_seconds: 1800
```

De commando's `oma agent spawn`, `parallel`, `review`, `resume`, `begin` en `verify` accepteren `--timeout-seconds` of `--deadline`. Voorbereiding, uitvoering, nieuwe pogingen en controles delen één absolute deadline. De vroegste geconfigureerde, geërfde of vastgelegde deadline wint; nieuwe pogingen en hervatten zetten de klok niet terug. Laat `session.execution` en beide vlaggen weg om deze dimensie zonder limiet te laten, tenzij de parent een deadline heeft meegegeven.

De uitvoeringsgeschiedenis blijft bewaard onder `.agents/state/executions/`. Annulering of een time-out blokkeert verdere uitvoering in die sessie en legt de stopreden vast. Deze controles gelden voor processen die via het beheerde CLI-pad zijn gestart. Native vendoragenten en willekeurige shelltaken hebben het annuleringsmechanisme van hun host nodig; limieten voor CPU, RAM en opslag vereisen ondersteuning van de provider.

Beheerde child-CLI's erven `OMA_EXECUTION_DEADLINE`, `OMA_EXECUTION_STATE` en `OMA_EXECUTION_ID`. Het statuspad en de uitvoerings-ID vormen samen een gebonden erfenisverwijzing; een vreemd, misvormd of niet-overeenkomend grootboek wordt geweigerd voordat er wordt geschreven. Geef de volledige geërfde omgeving door wanneer je een OMA-child inpakt. Het instellen van deze variabelen voegt geen deadlinehandhaving toe aan een programma dat er niets mee te maken heeft.

Bij annulering stopt OMA de toelating en probeert het begrensd de eigen berekening te beëindigen. Logs, resultaten, worktrees en geregistreerde resourcemetadata blijven behouden. Artefacten of externe resources verwijderen vereist een verzoek of een expliciet retentiebeleid. Een beëindiging die niet slaagt blijft zichtbaar en wordt niet als volledig opgeruimd gerapporteerd.

### Diagnostische feedback {#diagnostic-feedback}

Op ondersteunde terminalhosts vergelijkt OMA fouten en waarschuwingen vóór en na native bestandsbewerkingen en injecteert nieuw gemelde diagnostiek in de volgende toolfeedback. Het gebruikt een al draaiende, bij het project passende Serena-HTTP-daemon wanneer Serena de effectieve code-intelligenceprovider is (de standaard wanneer geen provider is opgegeven). Het start nooit een daemon en voert geen build uit. De eigen symbolische bewerkingen van Serena zijn uitgesloten, omdat die al diagnostiek leveren.

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

Stel `enabled: false` in om deze feedback uit te schakelen. Stel `host_diagnostics: true` in wanneer de host al bewerkingsdiagnostiek levert; Cursor en Antigravity worden automatisch overgeslagen. Projectlokale overrides volgen de normale configuratielagen. Omgevingsoverschrijvingen zijn `OMA_DIAGNOSTIC_FEEDBACK`, `OMA_HOST_DIAGNOSTICS` en `OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS`.

De time-out dekt elke volledige pre-edit- of post-edit-hook en is beperkt tot 100–10.000 milliseconden. Trage providers kunnen een grotere time-out gebruiken. Een mislukte of verlopen lookup slaat feedback over en start een korte cooldown; die telt niet als een schoon diagnostisch resultaat. Ontbrekende of verouderde pre-edit-baselines slaan feedback eveneens over. Elke hook controleert hoogstens drie bestanden en meldt hoogstens acht nieuwe fouten of waarschuwingen.

### Vendorkeuze en dispatchmetadata {#vendor-selection-and-dispatch-metadata}

In het bestand `.agents/oma-config.yaml` van de gebruiker is `vendors` een lijst met geselecteerde integratie-ID’s:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Een lijst selecteert precies die vendors, en `vendors: []` selecteert er geen. Zonder sleutel `vendors` richt `oma link` zich op elke vendor in OMA’s register van linkbare vendors, terwijl `oma update` zich alleen richt op vendors waarvan de projectmappen al bestaan. De lijst bepaalt welke install- en updateprojecties worden gemaakt; het is niet de capabilitymap voor vendorcommando’s per vendor.

Het meegeleverde schema `.agents/oma-config.cue` typeert `vendors` als dezelfde lijst (`[...string]`). Oudere CUE-templates typeerden het als een object `vendors.pi` (`#VendorsConfig`) dat niets leest: agentdispatch haalt zijn capabilityvelden uit het beheerde orchestratieregister hieronder. Declareert je `oma-config.cue` nog `vendors?: #VendorsConfig`, verander dat dan in `vendors?: [...string]` voordat je er een selectielijst in zet.

Het beheerde `.agents/skills/oma-orchestration/config/cli-config.yaml` bevat die capabilitymap. Elke invoer `vendors.<id>` ondersteunt de volgende velden:

| Veld | Vorm | Gebruik |
| --- | --- | --- |
| `command` | uitvoerbare string | Binary dat wordt gestart. |
| `subcommand` | string | Subcommando dat vóór de opties wordt ingevoegd, zoals `codex exec`. |
| `prompt_flag` | string, of `none`/`null` om uit te schakelen | Vlag die bij de prompt hoort; als die is uitgeschakeld, wordt een positionele prompt gebruikt. |
| `auto_approve_flag` | string | Vendorvlag die de toestemming voor schrijfbare runs omzeilt. Onderdrukt in read-onlymodus. |
| `read_only_flag` | string | Vendorvlag voor read-only. Als die ontbreekt, gebruikt de builder de vendorfallback of geeft een waarschuwing. |
| `output_format_flag` | string | Vlag die machineleesbare uitvoer selecteert. |
| `output_format` | string | Waarde die bij `output_format_flag` hoort. |
| `model_flag` | string | Vlag die bij `default_model` hoort. |
| `default_model` | string | Modelwaarde wanneer een opgelost plan geen model levert. |
| `isolation_env` | string in de vorm `NAME=value` | Optionele omgevingsopdracht; onveilige loader- of interpreter-sleutels worden geweigerd en `$$` wordt uitgebreid tot de proces-ID van het huidige proces. |
| `isolation_flags` | argumentstring in shellvorm | Extra isolatieargumenten die in argv-tokens worden gesplitst. |

Het beheerde capabilitybestand wordt door OMA-updates opnieuw gegenereerd. Bewerk voor modelselectie de door de gebruiker beheerde sleutels `agents`, `models` en `custom_presets`; gebruik deze capabilitymap alleen voor het onderhouden van de beheerde orchestratiegegevens of voor het debuggen van een vendoradapter. Het becommentarieerde object `vendors.pi` in oudere templates is fallbackmetadata en vervangt de lijst met geselecteerde vendors of het beheerde dispatchregister niet.

## Veelvoorkomende wijzigingen {#common-changes}

Kies een vaste preset voor een project en houd een persoonlijke override lokaal.

**Gedeeld bestand** (gecommit):

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**Lokale overlay** (genegeerd door Git):

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
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

Zet geen API-sleutels in dit bestand. Gebruik de velden `api_key_env` of `api_key_vault` en bewaar de eigenlijke credential in de genoemde geheime opslag of in de omgeving.

Zie voor de details van modelresolutie [Modelconfiguratie per agent](/docs/guide/per-agent-models). Zie voor de semantiek van de lagen en het gedrag bij fouten [Semantiek van oma-config](/docs/guide/oma-config-semantics).

Zet geen API-sleutels in dit bestand. Gebruik velden `api_key_env` of `api_key_vault` en bewaar de echte credential in de verwezen secretstore of omgeving.

Zie [Modelresolutie per agent](/docs/guide/per-agent-models) voor details over modelresolutie. Zie [Semantiek van oma-config](/docs/guide/oma-config-semantics) voor laagsemantiek en foutgedrag.
