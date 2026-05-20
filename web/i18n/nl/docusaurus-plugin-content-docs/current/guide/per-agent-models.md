---
title: "Gids: Per-agent modelconfiguratie"
description: Configureer welk AI-model elke agent gebruikt via model_preset in oma-config.yaml. Behandelt ingebouwde presets, per-agent overrides, inline modeldefinities, custom presets met extends, oma doctor --profile en migratie vanaf het oudere agent_cli_mapping.
---

# Gids: Per-agent modelconfiguratie

## Overzicht

`model_preset` is het enkele concept dat bepaalt welk model elke agent gebruikt. Kies één van de zeven ingebouwde presets en elke agent (pm, backend, frontend, qa, …) wordt gekoppeld aan een geschikt model voor die vendor stack. Overschrijf individuele agents waar nodig. Definieer extra presets wanneer je team een niet-standaard combinatie gebruikt.

Alle configuratie staat in één bestand: `.agents/oma-config.yaml`.

Deze pagina behandelt:

1. De zeven ingebouwde presets
2. Het overschrijven van individuele agents met de `agents:`-map
3. Inline registratie van custom model slugs met `models:`
4. Definiëren van custom presets met `custom_presets:` en `extends:`
5. Inspectie van de opgeloste configuratie met `oma doctor --profile`
6. Migratie vanaf het oudere `agent_cli_mapping`

---

## Ingebouwde presets

Stel `model_preset` in op één van de zeven ingebouwde sleutels:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini
```

| Sleutel | Beschrijving | Geschikt voor |
|:----|:-----------|:---------|
| `antigravity` | Alle agents gebruiken de Antigravity CLI (`agy`): Gemini 3.1 Pro voor implementatie/architectuur, Gemini 3.5 Flash voor orchestratie en ophalen. Modelselectie vindt plaats binnen `agy` — er worden geen `--model`- of `--thinking-budget`-vlaggen blootgesteld. | Antigravity CLI-gebruikers |
| `claude` | Alle agents gebruiken Claude (Sonnet/Opus) | Claude Max-abonnees |
| `codex` | Alle agents gebruiken OpenAI Codex (GPT-5.x) met effort levels | ChatGPT Plus/Pro-gebruikers |
| `gemini` | Alle agents gebruiken Gemini CLI, thinking ingeschakeld voor implementatierollen | Google AI Pro-gebruikers |
| `qwen` | Alle agents extern gerouteerd via Qwen Code; binaire thinking (geen effort levels) | Lokale / self-hosted inference |
| `cursor` | Alle agents gebruiken Cursor `composer-2.5` (`composer-2.5-fast` voor orchestrator/qa/pm/docs/retrieval) | Cursor Pro / Pro Student-abonnees |
| `mixed` | Gemengd: implementatierollen gebruiken Codex, architecture/qa/pm gebruiken Claude, retrieval gebruikt Gemini | Cross-vendor sterke punten zonder per-agent configuratie te beheren |

Ingebouwde presets worden meegeleverd binnen het CLI-pakket en updaten automatisch wanneer je `oh-my-agent` upgradet. Geen lokaal bestand om te onderhouden.

---

## Individuele agents overschrijven

Gebruik de `agents:`-map om specifieke agents te overschrijven bovenop de actieve preset. Alleen de agents die je opsomt worden beïnvloed; de rest blijft op de preset-defaults.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini

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

Geldige agent-ID's: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

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
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
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
