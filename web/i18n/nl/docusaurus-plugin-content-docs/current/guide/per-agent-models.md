---
title: "Gids: Modelconfiguratie per agent"
sidebar_label: Agentmodellen
description: Configureer via model_preset in oma-config.yaml welk AI-model elke agent gebruikt. Deze gids behandelt ingebouwde presets, overrides per agent, inline modeldefinities, aangepaste presets met extends, oma doctor --profile en de migratie vanaf het verouderde agent_cli_mapping.
---

# Gids: Modelconfiguratie per agent

## Overzicht

`model_preset: auto` is de standaard voor nieuwe installaties. Agents zonder configuratie gebruiken de native agentdefinities en modelinstellingen van de huidige vendor. Kies een vaste preset om modellen vast te zetten, of overschrijf afzonderlijke agents als je een ander model of een andere vendor nodig hebt. Bestaande expliciete presets blijven behouden bij een herinstallatie en update.

De gedeelde configuratie staat in `.agents/oma-config.cue` of `.agents/oma-config.yaml`. Een optioneel lokaal bestand dat door Git wordt genegeerd, overschrijft instellingen voor jouw machine.

Zie voor de volledige referentie van top-level-sleutels en voorrang de [configuratiereferentie](/docs/guide/configuration-reference).

Deze pagina behandelt:

1. De ingebouwde presets
2. Afzonderlijke agents overschrijven met de `agents:`-map
3. Aangepaste model-slugs inline definiëren met `models:`
4. Aangepaste presets definiëren met `custom_presets:` en `extends:`
5. De opgeloste configuratie bekijken met `oma doctor --profile`
6. Migreren vanaf het verouderde `agent_cli_mapping`

---

## Ingebouwde presets

Zet `model_preset` op een van de ingebouwde sleutels:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```


| Sleutel | Beschrijving | Geschikt voor |
|:----|:-----------|:---------|
| `auto` | Volgt de agent- en modelinstellingen van de huidige runtime zonder een model- of effort-flag toe te voegen | Standaard voor nieuwe installaties |
| `free` | Speciale gatewaymodus voor door OMA gestarte Codex-, Claude- of Qwen-processen; wordt los van het register met ingebouwde presets opgelost. | Lokale FreeLLMAPI-gateway |
| `antigravity` | Alle agents gebruiken de Antigravity CLI (`agy`): Gemini 3.1 Pro voor implementatie en architectuur en Gemini 3.6 Flash voor orkestratie, documentatie en verkenning. De modelkeuze wordt in `agy` door de configuratie bepaald; er worden geen `--model`- of `--thinking-budget`-flags doorgegeven. | Gebruikers van de Antigravity CLI |
| `claude` | Alle agents gebruiken Claude (Sonnet/Opus) | Houders van een Claude Max-abonnement |
| `codex` | Alle agents gebruiken OpenAI Codex (GPT-5.5 voor de meeste rollen, GPT-5.4-mini voor explore) met effortniveaus | ChatGPT Plus- en Pro-gebruikers |
| `qwen` | Alle agents gebruiken Qwen Code; overeenkomende Qwen-sessies kunnen gegenereerde native agents gebruiken en andere runtimes gebruiken CLI-dispatch | Lokale of self-hosted inference |
| `kiro` | Alle agents gebruiken de Kiro CLI; Sonnet doet implementatie en architectuur, Haiku orkestratie en explore | Kiro-gebruikers |
| `cursor` | Alle agents gebruiken Cursor `composer-2.5` (`composer-2.5-fast` voor orchestrator, qa, pm, docs en explore) | Cursor Pro- en Pro Student-gebruikers |
| `mixed` | Gemengd: implementatierollen gebruiken Codex, architectuur/qa/pm Claude en explore Gemini | Sterke punten van verschillende vendors combineren zonder per-agentconfiguratie te beheren |

Ingebouwde presets worden meegeleverd met het CLI-pakket en automatisch bijgewerkt als je `oh-my-agent` upgrade. `gemini` is een compatibiliteitsalias die naar `antigravity` verwijst; het is geen afzonderlijke actuele preset. Er is geen lokaal presetbestand nodig.

---

## Automatische dispatch

Met `auto` hebben expliciete modeloverrides in `agents.<id>` voorrang. Anders detecteert OMA de huidige runtime en gebruikt het beschikbare native subagentpad. Agents en runtimes van andere vendors, of runtimes zonder native dispatch, gebruiken `oma agent spawn`. Auto wordt niet uitgebreid tot een vaste vendorpreset.

Bij CLI-dispatch kiest `--vendor` expliciet het doel. Zonder die flag gebruikt OMA de gedetecteerde runtime en daarna `default_cli` wanneer detectie mislukt (`claude` als de waarde ontbreekt). Overgenomen plannen voegen geen OMA-model- of effort-flags toe; de eigen agent- en sessieconfiguratie van de vendor levert die waarden. Een extern CLI-proces gebruikt de opgeslagen standaardwaarden van die CLI. Die kunnen verschillen van een model dat alleen in de bovenliggende sessie is geselecteerd.

`oma doctor --profile` toont voor overgenomen agents `(vendor agent default)` en voor expliciete overrides het opgeloste model. Native agentbestanden behouden hun vendordefinities; overrides van dezelfde vendor in auto-modus worden toegepast wanneer install of update die bestanden genereert.

## Lokale configuratie

Maak naast de gedeelde configuratie precies **één** van `.agents/oma-config.local.cue` en `.agents/oma-config.local.yaml` aan. Install, link en update voegen beide paden toe aan `.gitignore`; update behoudt bestaande lokale bestanden, ook met `--force`.

OMA selecteert de dichtstbijzijnde projectconfiguratiemap. In die map heeft gedeelde CUE voorrang op gedeelde YAML en overschrijft het lokale bestand de gedeelde waarden. CUE-bestanden worden afzonderlijk geëvalueerd vóór het samenvoegen, zodat een gedeeld `model_preset: "auto"` lokaal kan worden vervangen door `"free"`. Objecten worden recursief samengevoegd; arrays, scalars en `null` vervangen de gedeelde waarde. Een ongeldig lokaal bestand, een ontbrekend CUE-programma voor lokale CUE of het tegelijk bestaan van beide lokale formaten is een fout en is geen reden om terug te vallen op gedeelde standaardwaarden.

Opdrachtopties en ondersteunde omgevingsoverschrijvingen hebben voorrang op de effectieve bestandsconfiguratie. `oma doctor --profile` toont welke bestanden zijn gebruikt. Lokale bestanden gaan niet mee met Git-clones of nieuwe worktrees. Free-modus subprocessen erven `OMA_MODEL_PRESET=free` en de opgeloste gatewayomgeving, zodat geneste OMA-spawns dezelfde route behouden; onafhankelijk gestarte sessies hebben hun eigen lokale configuratie of omgeving nodig. Instellingen die door install- en setupopdrachten worden opgeslagen, gaan nog steeds naar de gedeelde configuratie; een lokale override blijft tijdens runtime winnen.

## FreeLLMAPI-preset {#freellmapi-preset}

Laat `model_preset: auto` in het gedeelde bestand staan en schakel de preset lokaal in:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```


Het equivalente YAML-bestand is:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```


Start FreeLLMAPI afzonderlijk en exporteer de uniforme sleutel als `FREELLM_API_KEY`. OMA accepteert ook upstreams `FREELLMAPI_API_KEY` wanneer de standaard sleutelvariabele is geselecteerd; de canonieke variabele wint als beide zijn ingesteld. Een aangepaste `api_key_env` leest alleen die variabele. Zet de sleutel zelf nooit in de configuratie. `OMA_MODEL_PRESET` overschrijft de preset. `FREELLM_BASE_URL` en `FREELLM_MODEL` overschrijven de bijbehorende bestandsinstellingen. De waarden in het voorbeeld zijn de standaardwaarden, dus `model_preset: free` alleen is voldoende wanneer de server en sleutel klaarstaan.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```


Free-modus gebruikt `free.model` voor elke door OMA gedispatchte rol, ook voor rollen met bestaande `agents.*.model`-pinnen. Die pins worden niet opgelost via betaalde abonnementen. Kies `auto`, een gateway-model-ID of een benoemde gatewayketen zoals `auto:coding` (maak die keten eerst in FreeLLMAPI aan).

De transportkeuze volgt deze volgorde: `--vendor`, daarna `OMA_RUNTIME_VENDOR`, daarna een ondersteunde gedetecteerde runtime, vervolgens `default_cli` en ten slotte `codex`. Alleen Codex-, Claude- en Qwen-transporten worden ondersteund. Een expliciet gekozen niet-ondersteund transport geeft een fout.

| Transport | Gatewayendpoint | CLI-basis-URL |
|:--|:--|:--|
| Codex | `/v1/responses` | Bevat `/v1` |
| Claude | `/v1/messages` | Serverroot; OMA verwijdert het achtervoegsel `/v1` |
| Qwen | `/v1/chat/completions` | Bevat `/v1` |

Gebruik `oma agent spawn`, ook als de bovenliggende sessie dezelfde vendor gebruikt. OMA injecteert de gatewayverbinding en credentials alleen in dat subprocess; het wijzigen van de preset verandert het model van een al geopende hostsessie of native subagenttool van de host niet. Codex krijgt via de aanroepargumenten een aangepaste Responses-provider, terwijl de sleutel in de omgeving van het childproces blijft. Claude en Qwen krijgen hun compatibele endpointinstellingen. Tegenstrijdige Claude/Qwen-instellingen die de route of sleutel zouden overschrijven, worden vóór uitvoering gemeld; OMA herschrijft die bestanden niet.

Spawn en review controleren vóór het starten van de agent een geauthenticeerde `GET /v1/models`. Ontbrekende sleutels, verbindingsfouten en HTTP-authenticatiefouten stoppen de uitvoering. `oma doctor --profile` toont de effectieve URL en het model, omgevingsoverschrijvingen, of een sleutel aanwezig is en of de server klaar is, zonder de sleutel af te drukken. Gereedheid betekent niet dat een model genoeg quota heeft om een taak af te ronden.

FreeLLMAPI beheert failover op requestniveau tussen providers. OMA’s expliciete vendorfailover op basis van checkpoints blijft een apart mechanisme voor procesherstel; elke opvolger in Free-modus moet nog steeds een ondersteund FreeLLMAPI-transport gebruiken. Er wordt niet automatisch teruggekeerd naar een betaalde vendorconfiguratie.

De free-preset configureert agent-inference. De embeddingconfiguratie van bestaande memoryservices verandert niet. FreeLLMAPI biedt ook `/v1/embeddings`; leg bij een afzonderlijk geconfigureerde vectorstore een modelfamilie vast, zodat bestaande vectoren in een compatibele ruimte blijven.

Upstreamverwijzingen: [client setup](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [API- en embeddingfamilies](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Afzonderlijke agents overschrijven

Gebruik de map `agents:` om specifieke agents boven op de actieve preset te overschrijven. Alleen de agents die je opsomt worden beïnvloed; de rest volgt in auto-modus de vendorinstellingen of gebruikt de standaardwaarden van de gekozen vaste preset.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```


Elke entry is een `AgentSpec`-object:

| Veld | Type | Vereist | Beschrijving |
|:------|:-----|:---------|:-----------|
| `model` | string | Ja | Model-slug (ingebouwd of door de gebruiker gedefinieerd) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | Nee | Reasoning effort (genegeerd door modellen die het niet ondersteunen) |
| `thinking` | boolean | Nee | Uitgebreid thinking inschakelen (modelspecifiek) |
| `memory` | `user` \| `project` \| `local` | Nee | Memoryscope voor de agent |

Geldige agent-ID’s: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore`.

De merge is oppervlakkig: elk veld in je override vervangt de presetwaarde voor dat veld. Velden die je weglaat behouden hun presetwaarde.

---

## Model-slugs inline definiëren {#inlining-model-slugs}

Registreer model-slugs die nog niet in het ingebouwde register staan onder `models:`. Verwijs daarna vanuit `agents:` of `custom_presets:` naar de slug.

```yaml
# .agents/oma-config.yaml
models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false
```


Voor een geregistreerde slug waarnaar je vanuit `agents:` verwijst, gelden twee regels:

1. **De sleutel moet de vorm `owner/model` hebben.** `agents.<id>.model` wordt gevalideerd tegen een patroon met `owner/model`. Een kale sleutel zoals `my-fast-model` wordt afgewezen; gebruik een sleutel met slash, zoals `google/gemini-3-flash-fast` (of de eigen slug `provider/model` van de vendor).
2. **De spec moet volledig zijn.** `cli`, `cli_model`, `auth_hint` en alle booleans onder `supports` zijn tijdens het oplossen verplicht. Een onvolledige spec wordt door de configparser geaccepteerd, maar faalt bij modelregistervalidatie en valt stil terug op het core-register.

> Als een door de gebruiker gedefinieerde slug botst met een ingebouwde slug, wint de gebruikersdefinitie en wordt een waarschuwing gegeven.

---

## Aangepaste presets

Definieer extra presets onder `custom_presets:`. Gebruik `extends:` om alle agentstandaarden van een ingebouwde preset over te nemen en alleen de agents aan te passen die je nodig hebt.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```


Zonder `extends:` geef je standaardwaarden op voor de canonieke agentrollen die de preset gebruikt. Met `extends:` overschrijf je alleen de entries die je opgeeft; de overige entries worden overgenomen van de basispreset.

---

## `oma doctor --profile`

Voer `oma doctor --profile` uit om de volledig opgeloste modelmatrix te bekijken nadat presetstandaarden, `custom_presets` en overrides in `agents:` zijn samengevoegd.

```bash
oma doctor --profile
```


**Voorbeelduitvoer:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```


Elke rij toont de opgeloste model-slug en welke bron is toegepast (`(preset)` of `(override)`). Gebruik dit wanneer een subagent een onverwachte vendor kiest.

---

## Migreren vanaf het verouderde `agent_cli_mapping`

Migratie 008 draait automatisch bij `oma install` en `oma update`. Zij zet verouderde projecten ter plaatse om:

| Verouderde configuratie | Resultaat na migratie 008 |
|:-------------|:--------------------------|
| Alle entries gebruiken dezelfde vendor (bijv. alle `gemini`) | `model_preset: gemini`, zonder `agents:` |
| Vendors gemengd | Meest voorkomende vendor → `model_preset`; overige vendors → overrides in `agents:` |
| Waarden zijn `AgentSpec`-objecten | Ongewijzigd verplaatst naar `agents:` |
| Inhoud van `models.yaml` | Inline opgenomen in `oma-config.yaml.models` |
| Aangepaste `defaults.yaml` | Behouden als `custom_presets.user-customized` met een waarschuwing |

Voordat er iets wordt gewijzigd, worden originelen geback-upt naar `.agents/.backup-pre-008-{timestamp}/`. De migratie is idempotent. Als `model_preset` al aanwezig is, wordt deze overgeslagen.

<!-- oma-docs:ignore-start -->
Na de migratie worden `.agents/config/defaults.yaml`, `.agents/config/models.yaml` en de map `.agents/config/` verwijderd.
<!-- oma-docs:ignore-end -->

---

## Sessiequotum

`session.quota_cap` blijft ongewijzigd. Voeg deze toe aan `oma-config.yaml` om het onbeperkt starten van subagents te begrenzen:

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```


Wanneer een limiet wordt bereikt, weigert de orchestrator verdere spawns en meldt hij de status `QUOTA_EXCEEDED`.

---

## Volledig voorbeeld

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```


Voer `oma doctor --profile` uit om de oplossing te bevestigen en start daarna zoals gebruikelijk een workflow.

---

## Dispatch via pi (transport-runtime)

[pi](https://github.com/earendil-works/pi) (Earendil) is een multi-provider-proxy-runtime en geen modelhouder. Het kan modellen van elke echte provider (Anthropic, OpenAI, Google) onder één CLI uitvoeren. oma behandelt pi als een **transportoverlay**: je `model_preset` en overrides in `agents:` blijven precies zoals ze zijn en pi wordt de uitvoerende CLI voor een bepaalde agent.

Dispatch een agent via pi met de override `--vendor pi`:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```


Wat er gebeurt:

- Het per-agentmodel dat uit je preset en overrides is opgelost (bijvoorbeeld `openai/gpt-5.5`) wordt vertaald naar pi’s vorm `--model <provider/id>` en `effort` naar pi’s niveau van `--thinking`. **Modellen per subagent werken in pi precies zoals native**: verschillende agents kunnen verschillende modellen gebruiken.
- De persona van de agent (de systeemprompt) wordt geïnlined vanuit `.agents/agents/<id>.md`, omdat pi geen vendoreigen agentbestand heeft.
- Authenticatie komt uit de pi-configuratie (`~/.pi/agent/auth.json` of een provider-API-key in de omgeving). `oma doctor` rapporteert naast de andere CLIs ook de installatie- en authstatus van pi.

**Beperking:** pi voert alleen modellen van echte providers uit. CLI-eigen presets (`cursor`, `kiro`, `qwen`, `antigravity`) verwijzen naar modellen die alleen in hun eigen CLI bestaan. Dispatch via pi wordt voor die presets daarom afgewezen met een duidelijke fout. Gebruik een preset voor een echte provider (`claude`, `codex`, `gemini` of `mixed`) als je agents via pi routeert.

> De modelcatalogus van pi wordt door releases bijgehouden en door authenticatie beperkt. Als een opgeloste slug niet overeenkomt met wat je pi-installatie aanbiedt, controleer je `pi --list-models`. Pi vergelijkt `--model` fuzzy, dus de meeste provider-slugs worden zonder wijziging opgelost.

### Modellen buiten pi’s ingebouwde register (bijv. Z.ai GLM)

Pi lost `--model` op tegen het **ingebouwde modelregister** en gebruikt de instelling `defaultProvider` alleen wanneer helemaal geen model wordt meegegeven. Voor Z.ai levert pi slechts een subset van GLM-ID’s (`glm-4.7`, `glm-4.5-air`, `glm-5-turbo`, `glm-5.1`, `glm-5v-turbo` in pi 0.80.x); een preset met een andere GLM-ID kan niet worden opgelost.

Er zijn twee manieren:

1. **Register-ID’s:** beperk je preset tot model-ID’s uit het register. Gebruik de vorm `provider/id` (bijvoorbeeld `zai/glm-4.7`) om de provider expliciet vast te zetten; oma geeft die ongewijzigd door aan pi als waarde voor `--model`.
2. **Niet-geregistreerde ID’s:** registreer ze met een pi-extension. Het veld `api` moet een van pi’s **api-adapter-ID’s** noemen (`openai-completions`, `anthropic-messages` enzovoort), niet de providernaam. Providernamen zoals `"zai"` of afkortingen zoals `"openai"` zijn geen adapter-ID’s en veroorzaken bij dispatch de fout `No API provider registered for api: …`.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```


Controleer vóór je de ID’s in een preset opneemt met `pi --list-models`.

---

## Dispatch via OpenCode

[OpenCode](https://opencode.ai) is een vendor van het extensiontype. Net als pi is het geen modelhouder maar een CLI die modellen uit de eigen catalogus uitvoert: de gratis `opencode`-provider, het voordelige abonnementsplan `opencode-go` en de gateway `opencode-zen`. oma integreert dit als een **in-process plugin-vendor**: opencode laadt automatisch `.opencode/plugins/oma/` in plaats van hooks in een settingsbestand te registreren, en haalt de persona van elke agent uit gegenereerde bestanden in `.opencode/agents/<id>.md`.

### Expliciete dispatch

Routeer een agent via opencode met de override `--vendor opencode`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```


Dit voert `opencode run --agent pm --dir <workspace> "<prompt>"` uit. De prompt is een **positioneel argument aan het einde**; de `-p`-flag van opencode betekent `--password`, niet de prompt.

### OpenCode-modellen per agent

Routeer specifieke agents naar een opencode-model door het model onder `models:` te registreren en er vanuit `agents:` naar te verwijzen. Er gelden twee vereisten (zie [Model-slugs inline definiëren](#inlining-model-slugs)):

1. **De slug moet de vorm `owner/model` hebben.** Gebruik de slug `provider/model` van opencode als registersleutel; kale namen worden door het schema van `agents.<id>.model` afgewezen.
2. **De spec moet volledig zijn:** `cli`, `cli_model`, `auth_hint` en alle booleans onder `supports`. Een onvolledige spec faalt bij validatie en valt stil terug op het core-register, waardoor de agent niet naar opencode wordt gerouteerd.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```


Elke gerouteerde agent voert `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"` uit. Dit past goed bij lichte, snelle rollen (pm, qa, docs en explore), terwijl zwaardere implementatieagents op Codex, Claude enzovoort blijven.

### Een model-slug valideren

De catalogus van opencode is afhankelijk van abonnement en login, dus oma hardcodeert **geen** opencode-model-slugs. Valideer een slug tegen de catalogus die op jouw installatie beschikbaar is:

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```


`oma model probe` meldt `accepted` wanneer de slug door `opencode models` wordt vermeld, `rejected` wanneer dat niet zo is en `auth_required` wanneer de provider een login of abonnement nodig heeft.

### Authenticatie en gegenereerde bestanden

- **Auth:** `opencode auth login` slaat credentials op in `~/.local/share/opencode/auth.json`, één entry per provider. `oma auth status` / `oma doctor` melden opencode als geauthenticeerd wanneer *een willekeurige* provider een credential heeft. `oma doctor --profile` werkt daarentegen per provider: elke rij wordt gecontroleerd tegen de providerprefix van de geregistreerde `cli_model`. Een model met `cli_model: zai-coding-plan/glm-5.3` wordt dus gecontroleerd tegen de credential van `zai-coding-plan`. Heeft het model geen geregistreerde `provider/model`-`cli_model`, dan toont de rij `? unknown` in plaats van een zekere authfout.
- **Gegenereerde bestanden:** `oma link` (of `oma link opencode`) schrijft per agent één persona in `.opencode/agents/<id>.md` en daarnaast de bridge in `.opencode/plugins/oma/`. Deze bestanden worden uit de SSOT in `.agents/` gegenereerd; bewerk ze niet rechtstreeks, maar voer `oma link` opnieuw uit om ze te genereren.

> **Opmerking over persistente workflows:** de gebeurtenis `session.idle` van opencode (de dichtstbijzijnde tegenhanger van de Claude `Stop`-hook) geeft alleen een melding en kan niet verhinderen dat de sessie eindigt. Persistente workflows (orchestrate / work / ultrawork) draaien onder opencode daarom met **gedegradeerde Stop-semantiek**: de workflow wordt bij het volgende bericht opnieuw versterkt in plaats van de sessie open te houden.

---

## Dispatch via Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) leest **hooks** alleen uit een globale configuratie (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`). Daarom schrijft `oma install`/`oma link` de Kimi-hookketen en de bijbehorende skill-symlinks onder HOME na expliciete toestemming, net als bij Antigravity. Kimi scant bovendien rechtstreeks de SSOT `.agents/skills/` van oma, zodat skills hoe dan ook projectbreed worden opgelost. **MCP** heeft geen HOME-schrijving nodig en blijft projectspecifiek: de configuratie wordt modusbewust geschreven naar `<cwd>/.kimi-code/mcp.json` (project) of `~/.kimi-code/mcp.json` (globaal).

### Expliciete dispatch

Routeer een agent via Kimi met de override `--vendor kimi`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```


Dit voert `kimi -p "<prompt>"` uit. Kimi’s `-p` (niet-interactieve) modus keurt gewone toolaanroepen automatisch goed onder het `auto`-rechtenbeleid. Daarom voegt oma **geen** `--yolo`/`--auto` toe; die flags zijn niet te combineren met `-p`.

### Kimi-modellen per agent

Net als bij opencode hardcodeert oma **geen** Kimi-modelcatalogus; het aanbod hangt af van provider en abonnement. Routeer specifieke agents naar een Kimi-model door onder `models:` een complete spec met `cli: kimi` te registreren en er vanuit `agents:` naar te verwijzen.

De registersleutel moet de vorm `owner/model` hebben; kale namen worden door het schema van `agents.<id>.model` afgewezen. `cli_model` is de exacte alias die aan `kimi --model` wordt doorgegeven. De gedocumenteerde codingalias van Kimi is `kimi-code/kimi-for-coding`. Controleer vóór je de alias vastlegt welke alias jouw abonnement aanbiedt met `kimi --model <alias>`.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```


Elke gerouteerde agent voert `kimi --model kimi-code/kimi-for-coding -p "<prompt>"` uit.

> **Opmerking over persistente workflows:** Kimi’s gedocumenteerde Stop-blokkeerpad is exitcode 2 / stderr, maar de router van `oma hook run` sluit altijd af met code 0 en geeft een stdout-dialect uit. oma geeft daarom best-effort `permissionDecision: "deny"` (plus Claude-stijl `decision: "block"`) mee, zodat persistente workflows onder Kimi gecontroleerd blijven degraderen.
