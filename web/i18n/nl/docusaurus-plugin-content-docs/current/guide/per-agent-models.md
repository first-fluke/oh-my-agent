---
title: "Gids: Per-agent modelconfiguratie"
description: Configureer welk AI-model elke agent gebruikt via model_preset in oma-config.yaml. Behandelt ingebouwde presets, per-agent overrides, inline modeldefinities, custom presets met extends, oma doctor --profile en migratie vanaf het oudere agent_cli_mapping.
---

# Gids: Per-agent modelconfiguratie

## Overzicht

`model_preset` is het enkele concept dat bepaalt welk model elke agent gebruikt. Kies één van de ingebouwde presets en elke agent (pm, backend, frontend, qa, …) wordt gekoppeld aan een geschikt model voor die vendor stack. Overschrijf individuele agents waar nodig. Definieer extra presets wanneer je team een niet-standaard combinatie gebruikt.

Alle configuratie staat in één bestand: `.agents/oma-config.yaml`.

Deze pagina behandelt:

1. De ingebouwde presets
2. Het overschrijven van individuele agents met de `agents:`-map
3. Inline registratie van custom model slugs met `models:`
4. Definiëren van custom presets met `custom_presets:` en `extends:`
5. Inspectie van de opgeloste configuratie met `oma doctor --profile`
6. Migratie vanaf het oudere `agent_cli_mapping`

---

## Ingebouwde presets

Stel `model_preset` in op één van de ingebouwde sleutels:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity
```

| Sleutel | Beschrijving | Geschikt voor |
|:----|:-----------|:---------|
| `antigravity` | Alle agents gebruiken de Antigravity CLI (`agy`): Gemini 3.1 Pro voor implementatie/architectuur, Gemini 3.5 Flash voor orchestratie en ophalen. Modelselectie vindt plaats binnen `agy` — er worden geen `--model`- of `--thinking-budget`-vlaggen blootgesteld. | Antigravity CLI-gebruikers |
| `claude` | Alle agents gebruiken Claude (Sonnet/Opus) | Claude Max-abonnees |
| `codex` | Alle agents gebruiken OpenAI Codex (GPT-5.x) met effort levels | ChatGPT Plus/Pro-gebruikers |
| `gemini` | Alle agents gebruiken Gemini CLI, thinking ingeschakeld voor implementatierollen | Google AI Pro-gebruikers |
| `qwen` | Alle agents extern gerouteerd via Qwen Code; binaire thinking (geen effort levels) | Lokale / self-hosted inference |
| `cursor` | Alle agents gebruiken Cursor `composer-2.5` (`composer-2.5-fast` voor orchestrator/qa/pm/docs/explore) | Cursor Pro / Pro Student-abonnees |
| `mixed` | Gemengd: implementatierollen gebruiken Codex, architecture/qa/pm gebruiken Claude, explore gebruikt Gemini | Cross-vendor sterke punten zonder per-agent configuratie te beheren |

Ingebouwde presets worden meegeleverd binnen het CLI-pakket en updaten automatisch wanneer je `oh-my-agent` upgradet. Geen lokaal bestand om te onderhouden.

---

## Individuele agents overschrijven

Gebruik de `agents:`-map om specifieke agents te overschrijven bovenop de actieve preset. Alleen de agents die je opsomt worden beïnvloed; de rest blijft op de preset-defaults.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: antigravity

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Elke entry is een `AgentSpec`-object:

| Veld | Type | Verplicht | Beschrijving |
|:------|:-----|:---------|:-----------|
| `model` | string | Ja | Model slug (ingebouwd of door gebruiker gedefinieerd) |
| `effort` | `low` \| `medium` \| `high` | Nee | Reasoning effort (genegeerd bij modellen die dit niet ondersteunen) |
| `thinking` | boolean | Nee | Extended thinking inschakelen (modelspecifiek) |
| `memory` | `user` \| `project` \| `local` | Nee | Memory scope voor de agent |

Geldige agent-ID's: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `explore`.

De merge is shallow: elk veld in je override vervangt de preset-waarde voor dat veld. Velden die je weglaat behouden hun preset-waarde.

---

## Inline model slugs

Registreer model slugs die nog niet in het ingebouwde register staan onder `models:`. Eenmaal geregistreerd, kun je de slug overal gebruiken in `agents:` of `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> Wanneer een door gebruiker gedefinieerde slug botst met een ingebouwde slug, wint de gebruikersdefinitie en wordt er een waarschuwing afgegeven.

---

## Custom presets

Definieer extra presets in `custom_presets:`. Gebruik `extends:` om alle agent-defaults te erven van een ingebouwde preset en alleen de agents te overschrijven die je belangrijk vindt.

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

Zonder `extends:` moet je `agent_defaults` opgeven voor alle 11 agentrollen. Met `extends:` worden alleen de entries die je opsomt overschreven; de rest wordt geërfd van de base preset.

---

## `oma doctor --profile`

Draai `oma doctor --profile` om de volledig opgeloste modelmatrix te inspecteren — nadat preset-defaults, `custom_presets` en `agents:`-overrides zijn samengevoegd.

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

Elke rij toont de opgeloste model slug en welke bron deze heeft toegepast (`(preset)` of `(override)`). Gebruik dit telkens wanneer een subagent een onverwachte vendor kiest.

---

## Migratie vanaf het oudere `agent_cli_mapping`

Migratie 008 draait automatisch bij `oma install` en `oma update`. Deze converteert oudere projecten ter plaatse:

| Oudere config | Resultaat na migratie 008 |
|:-------------|:--------------------------|
| Alle entries dezelfde vendor (bijv. allemaal `gemini`) | `model_preset: gemini`, geen `agents:` |
| Gemengde vendors | Meest voorkomende vendor → `model_preset`; overige → `agents:`-overrides |
| `AgentSpec`-objectwaarden | Verplaatst naar `agents:` zoals ze zijn |
| Inhoud van `models.yaml` | Inline opgenomen in `oma-config.yaml.models` |
| Aangepaste `defaults.yaml` | Behouden als `custom_presets.user-customized` met een waarschuwing |

Originelen worden geback-upt naar `.agents/.backup-pre-008-{timestamp}/` voordat er wijzigingen plaatsvinden. De migratie is idempotent — wanneer `model_preset` al aanwezig is, wordt deze overgeslagen.

Na de migratie worden `.agents/config/defaults.yaml`, `.agents/config/models.yaml` en de `.agents/config/`-directory verwijderd.

---

## Session quota cap

`session.quota_cap` is ongewijzigd. Voeg het toe aan `oma-config.yaml` om losgeslagen subagent-spawning te begrenzen:

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

Wanneer een cap wordt bereikt, weigert de orchestrator verdere spawns en geeft een `QUOTA_EXCEEDED`-status terug.

---

## Volledig voorbeeld

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

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

Draai `oma doctor --profile` om de resolutie te bevestigen en start daarna een workflow zoals gebruikelijk.

---

## Dispatchen via OpenCode

[OpenCode](https://opencode.ai) is een vendor van de extensie-klasse: net als pi is het
geen modeleigenaar maar een CLI die modellen uit de eigen catalogus draait — de gratis
`opencode`-provider, het goedkope `opencode-go`-abonnementsplan en de
`opencode-zen`-gateway. oma integreert het als een **in-process plugin-vendor**:
opencode laadt `.opencode/plugins/oma/` automatisch in plaats van hooks via een
settings-bestand te registreren, en lost de persona van elke agent op uit gegenereerde
`.opencode/agents/<id>.md`-bestanden.

### Expliciete dispatch

Route elke agent via opencode met de `-m opencode`-override:

```bash
oma agent:spawn pm "Draft the rollout plan" <session> -m opencode
```

Dit draait `opencode run --agent pm --dir <workspace> "<prompt>"`. De prompt is een
**afsluitend positioneel argument** — de `-p`-vlag van opencode betekent `--password`, niet
de prompt.

### Per-agent OpenCode-modellen

Om specifieke agents naar een opencode-model te routeren, registreer je het model onder `models:`
en verwijs je ernaar vanuit `agents:`. Twee vereisten gelden (zie
[Inline model slugs](#inlining-model-slugs)):

1. **De slug moet de `owner/model`-vorm hebben.** Gebruik de opencode `provider/model`-slug
   als registersleutel — kale namen worden afgewezen door het `agents.<id>.model`-schema.
2. **De spec moet volledig zijn** — `cli`, `cli_model`, `auth_hint` en elke
   `supports`-boolean. Een onvolledige spec faalt bij validatie en valt stilzwijgend
   terug op het core-register (waardoor de agent niet naar opencode zou routeren).

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

Elke gerouteerde agent dispatcht `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. Dit past goed bij lichtgewicht,
snelle rollen (pm, qa, docs, explore), terwijl zwaardere implementatie-agents op
Codex/Claude/etc. blijven.

### Een model slug valideren

De catalogus van opencode is afgeschermd per abonnement en login, dus oma hardcodet
opencode-model slugs **niet**. Valideer er een tegen je geïnstalleerde catalogus:

```bash
oma model:probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model:probe` rapporteert `accepted` wanneer de slug wordt vermeld door
`opencode models`, `rejected` wanneer dat niet zo is, en `auth_required` wanneer de
provider login of een abonnement vereist.

### Auth en gegenereerde bestanden

- **Auth:** `opencode auth login` slaat credentials op in
  `~/.local/share/opencode/auth.json`. `oma auth:status` / `oma doctor` rapporteren
  opencode-auth naast de andere CLI's op vendorniveau (standaard provider-check:
  `opencode-go`). `oma doctor --profile` is wél provider-bewust: elke rij wordt
  gecontroleerd tegen het providerprefix van zijn geregistreerde `cli_model`,
  dus een model met `cli_model: zai-coding-plan/glm-5.3` wordt tegen de
  `zai-coding-plan`-credential gecontroleerd. Een rij waarvan het model geen
  geregistreerde `cli_model` in de vorm `provider/model` heeft, rapporteert
  `? unknown` in plaats van een definitieve authenticatiefout.
- **Gegenereerde bestanden:** `oma link` (of `oma link opencode`) schrijft één
  `.opencode/agents/<id>.md`-persona per agent plus de `.opencode/plugins/oma/`-bridge.
  Deze worden gegenereerd uit de `.agents/`-SSOT — bewerk ze niet
  rechtstreeks; draai `oma link` opnieuw om ze te regenereren.

> **Opmerking over persistente workflows:** het `session.idle`-event van opencode (de
> dichtstbijzijnde analoog van de Claude `Stop`-hook) is alleen voor notificatie en kan
> niet voorkomen dat de sessie eindigt. Persistente workflows (orchestrate / work / ultrawork)
> draaien onder opencode daarom met **gedegradeerde Stop-semantiek** — workflowversterking
> gebeurt bij het volgende bericht in plaats van door de sessie open te houden.
