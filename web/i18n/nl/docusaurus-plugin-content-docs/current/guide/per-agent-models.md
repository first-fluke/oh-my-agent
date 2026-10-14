---
title: "Gids: Modelconfiguratie per agent"
sidebar_label: Agentmodellen
description: Configureer via model_preset in oma-config.yaml welk AI-model elke agent gebruikt. Deze gids behandelt ingebouwde presets en hun modellen per rol, de resolutietabel voor model en CLI, overrides per agent, inline modeldefinities, aangepaste presets met extends, oma doctor --profile, quotumlimieten en de transports pi, OpenCode en Kimi.
---

# Gids: Modelconfiguratie per agent

## Overzicht

`model_preset: auto` is de standaard voor nieuwe installaties. Agenten zonder configuratie gebruiken de native agentdefinities en modelinstellingen van de huidige vendor. Kies een vaste preset om modellen vast te zetten, of overschrijf afzonderlijke agenten als je een ander model of een andere vendor nodig hebt. Bestaande expliciete presets blijven behouden bij een herinstallatie en update.

De gedeelde configuratie staat in `.agents/oma-config.yaml` en, indien aanwezig, `.agents/oma-config.cue`, waarvan de sleutels dezelfde YAML-sleutels overschrijven. Een optioneel lokaal bestand dat door Git wordt genegeerd, overschrijft instellingen voor jouw machine.

Zie voor de volledige referentie van top-level-sleutels en voorrang de [configuratiereferentie](/docs/guide/configuration-reference).

Deze pagina behandelt:

1. De ingebouwde presets en de modellen die elke rol krijgt
2. Hoe OMA het model en de CLI voor een agent oplost
3. Lokale configuratie en de FreeLLMAPI-preset (`free`)
4. Afzonderlijke agenten overschrijven met de `agents:`-map
5. Aangepaste model-slugs inline definiëren met `models:`
6. Aangepaste presets definiëren met `custom_presets:` en `extends:`
7. De opgeloste configuratie bekijken met `oma doctor --profile`
8. Migreren vanaf het verouderde `agent_cli_mapping`, en sessiequotumlimieten
9. Dispatch via pi, OpenCode en Kimi Code CLI

---

## Ingebouwde presets {#built-in-presets}

Zet `model_preset` op een van de ingebouwde sleutels:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```


| Sleutel | Beschrijving | Geschikt voor |
|:----|:-----------|:---------|
| `auto` | Volgt de agent- en modelinstellingen van de huidige runtime zonder een model- of effort-vlag toe te voegen | Standaard voor nieuwe installaties |
| `free` | Speciale gatewaymodus voor door OMA gestarte Codex-, Claude- of Qwen-processen; wordt los van het register met ingebouwde presets opgelost. | Lokale FreeLLMAPI-gateway |
| `antigravity` | Alle agenten gebruiken de Antigravity CLI (`agy`): Gemini 3.1 Pro voor implementatie, architectuur en QA; Gemini 3.6 Flash voor orchestratie, PM, documentatie en explore. Op agy 1.1+ geeft OMA de weergave-ID uit `agy models` door (bijvoorbeeld `--model "Gemini 3.1 Pro (High)"`) en zet het `effort` om naar een niveau dat het model publiceert. agy 1.0 heeft geen `--model`, dus daar beslist de eigen configuratie van agy. agy heeft geen `--thinking-budget`. | Gebruikers van de Antigravity CLI |
| `claude` | Alle agenten gebruiken Claude: Opus voor architectuur, Haiku voor explore en Sonnet voor elke andere rol | Houders van een Claude Max-abonnement |
| `codex` | Alle agenten gebruiken OpenAI Codex (GPT-5.5 voor de meeste rollen, GPT-5.4-mini voor explore) met effortniveaus | ChatGPT Plus- en Pro-gebruikers |
| `qwen` | Alle agenten gebruiken Qwen Code; overeenkomende Qwen-sessies kunnen gegenereerde native agenten gebruiken en andere runtimes gebruiken CLI-dispatch | Lokale of self-hosted inference |
| `kiro` | Alle agenten gebruiken de Kiro CLI; Sonnet doet implementatie en architectuur, Haiku orchestratie en explore | Kiro-gebruikers |
| `cursor` | Alle agenten gebruiken Cursor `composer-2.5` (`composer-2.5-fast` voor orchestrator, qa, pm, docs en explore) | Cursor Pro- en Pro Student-gebruikers |
| `mixed` | Claude voor orchestrator, architectuur (Opus), qa, pm en docs; Codex GPT-5.5 voor implementatierollen en GPT-5.4-mini voor explore | Sterke punten van verschillende vendors combineren zonder per-agentconfiguratie te beheren |

Ingebouwde presets worden meegeleverd met het CLI-pakket en automatisch bijgewerkt als je `oh-my-agent` upgrade. `gemini` is een compatibiliteitsalias die naar `antigravity` verwijst; het is geen afzonderlijke actuele preset. Er is geen lokaal presetbestand nodig.

### Modellen per rol {#models-per-role}

De vaste presets wijzen deze registerslugs toe. Ownerprefixen zijn weggelaten: `antigravity/`, `anthropic/`, `openai/`, `qwen/`, `kiro/` en `cursor/` voor de eerste zes kolommen, en `anthropic/` voor Claude-modellen of `openai/` voor GPT-modellen in `mixed`. De bron van waarheid is `cli/platform/built-in-presets.ts`.

| Rol | `antigravity` | `claude` | `codex` | `qwen` | `kiro` | `cursor` | `mixed` |
|:-----|:--------------|:---------|:--------|:-------|:-------|:---------|:--------|
| orchestrator, pm, docs | gemini-3.6-flash | claude-sonnet-4-6 | gpt-5.5 (medium) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | claude-sonnet-4-6 |
| architecture | gemini-3.1-pro | claude-opus-4-7 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | claude-opus-4-7 |
| qa | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5-fast | claude-sonnet-4-6 |
| backend, frontend, mobile, db, debug, refactor, tf-infra | gemini-3.1-pro | claude-sonnet-4-6 | gpt-5.5 (high) | qwen3.6-plus (thinking) | claude-sonnet-4-5 | composer-2.5 | gpt-5.5 (high) |
| explore | gemini-3.6-flash | claude-haiku-4-5 | gpt-5.4-mini (low) | qwen3-coder-next | claude-haiku-3-5 | composer-2.5-fast | gpt-5.4-mini (low) |

Waarden tussen haakjes zijn de `effort` van de preset (Codex) of `thinking: true` (Qwen). Een rol die een preset niet opsomt, zoals `eval`, gebruikt de `orchestrator`-entry van die preset.

---

## Hoe OMA het model en de CLI van een agent oplost {#how-oma-resolves-an-agents-model-and-cli}

Als `OMA_MODEL_PRESET` is ingesteld, vervangt die eerst `model_preset` (zie [Configuratie laden](/docs/guide/oma-config-semantics#precedence-table)). Daarna kiest de resolver één rij:

| `model_preset` | `agents.<id>` ingesteld? | Model dat naar de CLI wordt gestuurd | CLI die de agent uitvoert |
|:---------------|:-------------------|:----------------------|:------------------------|
| `free` | Genegeerd | `FREELLM_MODEL`, anders `free.model`, anders `auto` (elke rol) | `--vendor`, anders `OMA_RUNTIME_VENDOR`, anders de gedetecteerde runtime als dat Codex, Claude of Qwen is, anders `default_cli`, anders `codex`. Alleen `codex`, `claude` en `qwen` worden geaccepteerd. |
| `auto` | Nee | Geen. De eigen agent- en sessie-instellingen van de vendor gelden. | `--vendor`, anders een ondersteunde `OMA_RUNTIME_VENDOR`, anders de gedetecteerde runtime, anders `default_cli`, anders `claude`. Een niet-ondersteunde waarde is een fout. |
| `auto` | Ja | Het `model` van de override | De `cli` van dat model, daarna de onderstaande vendor-overrideregel |
| Ingebouwd, alias of aangepast | Nee | De entry van de preset voor de rol, anders de `orchestrator`-entry van de preset | De `cli` van dat model, daarna de onderstaande vendor-overrideregel |
| Ingebouwd, alias of aangepast | Ja | De presetentry, oppervlakkig samengevoegd met de override (velden van de override winnen) | De `cli` van dat model, daarna de onderstaande vendor-overrideregel |

Zo passen de overige onderdelen erin:

- **Preset opzoeken.** OMA controleert eerst ingebouwde namen, daarna aliassen (`gemini` verwijst met een waarschuwing naar `antigravity`) en vervolgens `custom_presets`. Een aangepaste preset met een ingebouwde naam wordt genegeerd. Een onbekende naam stopt met `Unknown model_preset "..."`, met daarin de geldige namen.
- **Model opzoeken.** Een slug wordt eerst in `models:` opgezocht en daarna in het ingebouwde register. Een onbekende slug, of een spec met `api_only: true`, stopt de dispatch.
- **Vendor-overrideregel.** Wanneer `--vendor` of `OMA_RUNTIME_VENDOR` een vendor noemt voor een rij met een model, neemt `pi` het altijd over (alleen modellen van echte providers; zie [Dispatch via pi](#dispatching-through-pi-transport-runtime)). Elke andere vendor neemt het alleen over als die in `supports.native_dispatch_from` van het model staat. Anders geeft OMA een waarschuwing en behoudt het de eigen `cli` van het model.
- **Effort.** `effort` wordt met een waarschuwing weggelaten voor modellen waarvan de CLI geen effort-vlag heeft (Claude Code). Voor pi blijft het behouden; pi zet het om naar `--thinking`.

## Automatische dispatch {#auto-dispatch}

Met `auto` gebruikt OMA het native subagentpad van de huidige runtime wanneer dat beschikbaar is. Agenten en runtimes van andere vendors, of runtimes zonder native dispatch, gebruiken `oma agent spawn`. Auto wordt niet uitgebreid tot een vaste vendorpreset. Overgenomen plannen voegen geen OMA-model- of effort-vlaggen toe. Een extern CLI-proces gebruikt de opgeslagen standaardwaarden van die CLI. Die kunnen verschillen van een model dat alleen in de bovenliggende sessie is geselecteerd.

`oma doctor --profile` toont voor overgenomen agenten `(vendor agent default)` en voor expliciete overrides het opgeloste model. Native agentbestanden behouden hun vendordefinities; overrides van dezelfde vendor in auto-modus worden toegepast wanneer install of update die bestanden genereert.

## Lokale configuratie {#local-configuration}

Maak naast de gedeelde configuratie precies **één** van `.agents/oma-config.local.cue` en `.agents/oma-config.local.yaml` aan. Install, link en update voegen beide paden toe aan `.gitignore`; update behoudt bestaande lokale bestanden, ook met `--force`.

OMA selecteert de dichtstbijzijnde projectconfiguratiemap. In die map overschrijven sleutels die in gedeelde CUE zijn ingesteld dezelfde sleutels in gedeelde YAML, en overschrijft het lokale bestand de gedeelde waarden. De volledige volgorde staat in de [voorrangstabel](/docs/guide/oma-config-semantics#precedence-table). CUE-bestanden worden afzonderlijk geëvalueerd vóór het samenvoegen, zodat een gedeeld `model_preset: "auto"` lokaal kan worden vervangen door `"free"`. Objecten worden recursief samengevoegd; arrays, scalars en `null` vervangen de gedeelde waarde. Een ongeldig lokaal bestand, een ontbrekend CUE-programma voor lokale CUE of het tegelijk bestaan van beide lokale formaten is een fout en is geen reden om terug te vallen op gedeelde standaardwaarden.

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

De transportkeuze volgt de rij `free` in [Hoe OMA het model en de CLI van een agent oplost](#how-oma-resolves-an-agents-model-and-cli). Alleen Codex-, Claude- en Qwen-transporten worden ondersteund. Een expliciet gekozen niet-ondersteund transport geeft een fout.

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

## Afzonderlijke agenten overschrijven {#overriding-individual-agents}

Gebruik de map `agents:` om specifieke agenten boven op de actieve preset te overschrijven. Alleen de agenten die je opsomt worden beïnvloed; de rest volgt in auto-modus de vendorinstellingen of gebruikt de standaardwaarden van de gekozen vaste preset.

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

Geldige agent-ID’s: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` en `eval`. Ingebouwde presets definiëren `eval` niet, dus deze rol gebruikt de `orchestrator`-entry van de preset, tenzij je hem overschrijft.

De merge is oppervlakkig: elk veld in je override vervangt de presetwaarde voor dat veld. Velden die je weglaat behouden hun presetwaarde.

---

## Model-slugs inline definiëren {#inlining-model-slugs}

Registreer model-slugs die nog niet in het ingebouwde register staan onder `models:`. Verwijs daarna vanuit `agents:` of `custom_presets:` naar de slug.

```yaml
# .agents/oma-config.yaml
models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
      api_only: false
```


Voor een geregistreerde slug waarnaar je vanuit `agents:` verwijst, gelden twee regels:

1. **De sleutel moet de vorm `owner/model` hebben.** `agents.<id>.model` wordt gevalideerd tegen een patroon met `owner/model`. Een kale sleutel zoals `my-fast-model` wordt afgewezen; gebruik een sleutel met slash, zoals `antigravity/gemini-3.1-pro-low` (of de eigen slug `provider/model` van de vendor).
2. **De spec moet volledig en geldig zijn.** `cli`, `cli_model`, `auth_hint` en elk veld onder `supports` zijn tijdens het oplossen verplicht. `cli` moet een van `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro`, `qwen` of `opencode` zijn; entries in `native_dispatch_from` moeten `antigravity`, `claude`, `codex`, `cursor`, `kimi`, `kiro`, `opencode` of `qwen` zijn. `gemini` is voor geen van beide een geldige waarde. Een ongeldige spec logt `[model-registry] User inline model "<slug>" failed validation — falling back to core registry`; als het core-register zo’n slug niet heeft, stopt de dispatch met een fout over een onbekende slug.

> Als een door de gebruiker gedefinieerde slug botst met een ingebouwde slug, wint de gebruikersdefinitie en wordt een waarschuwing gegeven.

---

## Aangepaste presets {#custom-presets}

Definieer extra presets onder `custom_presets:`. Gebruik `extends:` om alle agentstandaarden van een ingebouwde preset over te nemen en alleen de agenten aan te passen die je nodig hebt.

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


Zonder `extends:` definieer je minstens `orchestrator`: elke rol die de preset weglaat, gebruikt de `orchestrator`-entry. Met `extends:` overschrijf je alleen de entries die je opgeeft; de overige entries worden overgenomen van de basispreset. `extends` mag een ingebouwde preset of een andere aangepaste preset noemen; een circulaire keten is een fout. Een aangepaste preset met de naam van een ingebouwde preset (bijvoorbeeld `claude`) wordt genegeerd; de ingebouwde preset wint.

---

## `oma doctor --profile`

Voer `oma doctor --profile` uit om de volledig opgeloste modelmatrix te bekijken nadat presetstandaarden, `custom_presets` en overrides in `agents:` zijn samengevoegd.

```bash
oma doctor --profile
```


**Voorbeelduitvoer** (ingekort: `model_preset: mixed` met een override voor `backend`; in een echte run worden alle 13 rollen vermeld en tekent de terminal elke sectie binnen een kader):

```text
 Profile Health (mixed)

 Configuration sources
   shared: <project>/.agents/oma-config.yaml

 Auth Status Matrix
┌──────────────┬────────────────────────────────────┬──────────────┬────────────────┐
│ Role         │ Model                              │ CLI          │ Auth Status    │
├──────────────┼────────────────────────────────────┼──────────────┼────────────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ architecture │ anthropic/claude-opus-4-7          │ claude       │ ✓ logged in    │
│ qa (preset)  │ anthropic/claude-sonnet-4-6        │ claude       │ ✓ logged in    │
│ backend (over│ openai/gpt-5.5                     │ codex        │ ✓ logged in    │
│ explore (pres│ openai/gpt-5.4-mini                │ codex        │ ✓ logged in    │
└──────────────┴────────────────────────────────────┴──────────────┴────────────────┘

 Profile health check complete (mixed)
```


Elke rij toont de rol, de opgeloste model-slug, de CLI die het model uitvoert en de authstatus. De rolcel bevat een brontag: `(preset)`, `(override)` of `(vendor)` voor agenten die onder `auto` de vendorinstellingen overnemen. De kolom Role is 14 tekens breed, dus lange tags worden afgekapt, zoals hierboven. Gebruik dit wanneer een subagent een onverwachte vendor kiest.

---

## Migreren vanaf het verouderde `agent_cli_mapping` {#migration-from-legacy-agent_cli_mapping}

Migratie 008 draait automatisch bij `oma install` en `oma update`. Zij zet verouderde projecten ter plaatse om:

| Verouderde configuratie | Resultaat na migratie 008 |
|:-------------|:--------------------------|
| Alle entries gebruiken dezelfde vendor (bijv. alle `claude`) | `model_preset` ingesteld op de preset van die vendor (verouderd `gemini` wordt `antigravity`), zonder `agents:` |
| Vendors gemengd | Meest voorkomende vendor → `model_preset`; overige vendors → overrides in `agents:` |
| Waarden zijn `AgentSpec`-objecten | Ongewijzigd verplaatst naar `agents:` |
| Inhoud van `models.yaml` | Inline opgenomen in `oma-config.yaml.models` |
| Aangepaste `defaults.yaml` | Behouden als `custom_presets.user-customized` met een waarschuwing |

Voordat er iets wordt gewijzigd, worden originelen geback-upt naar `.agents/backup/008-model-preset/<timestamp>-<pid>/` (`~/.oma/backup/008-model-preset/...` voor de globale installatie). De migratie is idempotent. Als `model_preset` al aanwezig is, wordt deze overgeslagen.

<!-- oma-docs:ignore-start -->
Na de migratie worden `.agents/config/defaults.yaml`, `.agents/config/models.yaml` en de map `.agents/config/` verwijderd.
<!-- oma-docs:ignore-end -->

---

## Sessiequotum {#session-quota-cap}

Voeg `session.quota_cap` toe aan `oma-config.yaml` om het onbeperkt starten van subagents te begrenzen:

```yaml
session:
  quota_cap:
    tokens: 2000000      # plain digits: YAML reads 2_000_000 as a string, which disables the cap
    spawn_count: 40
    per_vendor:          # dispatch vendor IDs (claude, codex, antigravity, ...), not model owners
      claude: 1200000
      codex: 600000
      antigravity: 200000
```


Wanneer een limiet wordt bereikt, weigert `oma agent spawn` de volgende spawn en faalt met `[session-cost] Quota cap exceeded for session <id>: <dimension> (current: N, limit: M)`. Tokengebruik wordt geschat op basis van de promptlengte, dus `spawn_count` is de meest voorspelbare limiet. Veldregels: [Sessiequotumlimieten](/docs/guide/configuration-reference#session-quota-caps).

---

## Volledig voorbeeld {#full-example}

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  antigravity/gemini-3.1-pro-low:
    cli: antigravity
    cli_model: "Gemini 3.1 Pro (Low)"   # exact display ID from `agy models`
    auth_hint: "Requires Antigravity CLI sign-in (Google AI Pro tier)"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: true
      computer_use: false
      native_dispatch_from: [antigravity]
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
    tokens: 2000000
    spawn_count: 40
```


Voer `oma doctor --profile` uit om de oplossing te bevestigen en start daarna zoals gebruikelijk een workflow.

---

## Dispatch via pi (transport-runtime) {#dispatching-through-pi-transport-runtime}

[pi](https://github.com/earendil-works/pi) (Earendil) is een multi-provider-proxy-runtime en geen modelhouder. Het kan modellen van elke echte provider (Anthropic, OpenAI, Google) onder één CLI uitvoeren. oma behandelt pi als een **transportoverlay**: je `model_preset` en overrides in `agents:` blijven precies zoals ze zijn en pi wordt de uitvoerende CLI voor een bepaalde agent.

Dispatch een agent via pi met de override `--vendor pi`:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```


Wat er gebeurt:

- Het per-agentmodel dat uit je preset en overrides is opgelost (bijvoorbeeld `openai/gpt-5.5`) wordt vertaald naar pi’s vorm `--model <provider/id>` en `effort` naar pi’s niveau van `--thinking`. **Modellen per subagent werken in pi precies zoals native**: verschillende agenten kunnen verschillende modellen gebruiken.
- De persona van de agent (de systeemprompt) wordt geïnlined vanuit `.agents/agents/<id>.md`, omdat pi geen vendoreigen agentbestand heeft.
- Authenticatie komt uit de pi-configuratie (`~/.pi/agent/auth.json` of een provider-API-key in de omgeving). `oma doctor` rapporteert naast de andere CLIs ook de installatie- en authstatus van pi.

**Beperking:** pi voert alleen modellen van echte providers uit. CLI-eigen presets (`cursor`, `kiro`, `qwen`, `antigravity`) verwijzen naar modellen die alleen in hun eigen CLI bestaan. Dispatch via pi wordt voor die presets daarom afgewezen met een duidelijke fout. Gebruik `claude`, `codex` of `mixed`, of overrides in `agents.<id>` waarvan de modellen `anthropic/`-, `openai/`- of `google/`-slugs zijn, als je agenten via pi routeert. `gemini` is een alias van `antigravity`, dus pi weigert die.

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


Dit voert `opencode run --agent pm --dir <workspace> "<prompt>"` uit. De prompt is een **positioneel argument aan het einde**; de `-p`-vlag van opencode betekent `--password`, niet de prompt.

### OpenCode-modellen per agent

Routeer specifieke agenten naar een opencode-model door het model onder `models:` te registreren en er vanuit `agents:` naar te verwijzen. Er gelden twee vereisten (zie [Model-slugs inline definiëren](#inlining-model-slugs)):

1. **De slug moet de vorm `owner/model` hebben.** Gebruik de slug `provider/model` van opencode als registersleutel; kale namen worden door het schema van `agents.<id>.model` afgewezen.
2. **De spec moet volledig zijn:** `cli`, `cli_model`, `auth_hint` en elk veld onder `supports`. Een onvolledige spec faalt bij validatie; OMA logt een waarschuwing en valt terug op het core-register, waardoor de agent niet naar opencode wordt gerouteerd.

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


Dit voert `kimi -p "<prompt>"` uit. Kimi’s `-p` (niet-interactieve) modus keurt gewone toolaanroepen automatisch goed onder het `auto`-rechtenbeleid. Daarom voegt oma **geen** `--yolo`/`--auto` toe; die vlaggen zijn niet te combineren met `-p`.

### Kimi-modellen per agent

Net als bij opencode hardcodeert oma **geen** Kimi-modelcatalogus; het aanbod hangt af van provider en abonnement. Routeer specifieke agenten naar een Kimi-model door onder `models:` een complete spec met `cli: kimi` te registreren en er vanuit `agents:` naar te verwijzen.

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
