---
title: "Gids: modelconfiguratie per agent"
description: Stel met RARDO v2.1 per agent een andere CLI-provider, model en redeneerniveau in. Behandelt agent_cli_mapping, runtime-profielen, oma doctor --profile, models.yaml en sessiequota-limieten.
---

# Gids: modelconfiguratie per agent

## Overzicht

RARDO v2.1 introduceert **modelselectie per agent** via `agent_cli_mapping`. Elke agent (pm, backend, frontend, qa…) kan nu onafhankelijk een eigen provider, model en redeneerniveau krijgen — in plaats van één globale provider te delen.

Deze pagina behandelt:

1. De drieledige configuratiehiërarchie
2. Het duale formaat van `agent_cli_mapping`
3. Runtime-profiel-presets
4. Het commando `oma doctor --profile`
5. Zelf toegevoegde model-slugs in `models.yaml`
6. De sessiequota-limiet

---

## Hiërarchie van configuratiebestanden

RARDO v2.1 leest drie bestanden in volgorde van prioriteit (hoog naar laag):

| Bestand | Doel | Bewerkbaar? |
|:--------|:-----|:------------|
| `.agents/config/user-preferences.yaml` | Gebruikersoverrides — agent→CLI-mapping, actief profiel, sessiequota | Ja |
| `.agents/config/models.yaml` | Door de gebruiker aangeleverde model-slugs (aanvulling op de ingebouwde registry) | Ja |
| `.agents/config/defaults.yaml` | Ingebouwde Profile B-baseline (4 `runtime_profiles`, veilige fallbacks) | Nee — SSOT |

> `defaults.yaml` hoort bij de SSOT en mag niet direct worden aangepast. Alle personalisatie gebeurt in `user-preferences.yaml` en `models.yaml`.

---

## Duaal formaat van `agent_cli_mapping`

`agent_cli_mapping` accepteert twee waardevormen voor geleidelijke migratie:

```yaml
# .agents/config/user-preferences.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — alleen provider (default model)
  backend:                            # nieuw AgentSpec-object
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**Legacy string-vorm**: `agent: "vendor"` — blijft werken en gebruikt het default model en de default effort van de provider.

**AgentSpec-objectvorm**: `agent: { model, effort }` — legt een exacte model-slug en redeneerniveau (`low`, `medium`, `high`) vast.

Je mag de vormen vrij combineren. Niet-vermelde agents vallen terug op het actieve `runtime_profile`.

---

## Runtime-profielen

`defaults.yaml` levert Profile B met vier kant-en-klare `runtime_profiles`. Kies er één in `user-preferences.yaml`:

```yaml
# .agents/config/user-preferences.yaml
active_profile: claude-only   # opties hieronder
```

| Profiel | Alle agents routen naar | Wanneer gebruiken |
|:--------|:------------------------|:------------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Uniforme Anthropic-stack |
| `codex-only` | OpenAI Codex (GPT-5.x) | Pure OpenAI-stack |
| `gemini-only` | Gemini CLI | Google-gerichte workflows |
| `antigravity` | Gemengd: pm→claude, backend→codex, qa→gemini | Sterke punten combineren |
| `qwen-only` | Qwen CLI | Lokale / self-hosted inferentie |

Profielen zijn de snelle manier om de hele vloot te herconfigureren zonder elke regel te bewerken.

---

## `oma doctor --profile`

De nieuwe `--profile`-flag toont een matrix met de opgeloste provider, model en effort per agent **na** het samenvoegen van alle drie configuratiebestanden.

```bash
oma doctor --profile
```

**Voorbeelduitvoer:**

```
RARDO v2.1 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4.7           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3-pro                low      profile:antigravity
architecture  claude    claude-opus-4.7             high     defaults
docs          claude    claude-sonnet-4.7           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Kiest een subagent een onverwachte provider? Run eerst dit commando — de kolom `Source` laat zien welke configuratielaag gewonnen heeft.

---

## Slugs toevoegen in `models.yaml`

`models.yaml` is optioneel en dient om model-slugs te registreren die nog niet in de ingebouwde registry staan — handig voor net uitgebrachte modellen.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

Eenmaal geregistreerd is de slug bruikbaar in `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugs zijn identifiers — behoud exact de Engelse schrijfwijze zoals de provider die publiceert.

---

## Sessiequota-limiet

Voeg `session.quota_cap` toe in `user-preferences.yaml` om doorgeslagen subagent-spawns te begrenzen:

```yaml
# .agents/config/user-preferences.yaml
session:
  quota_cap:
    tokens: 2_000_000        # totaal tokenplafond per sessie
    spawn_count: 40          # max. parallelle + sequentiële subagents
    per_vendor:              # sublimieten per provider
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Bij het bereiken van een limiet weigert de orchestrator nieuwe spawns en geeft de status `QUOTA_EXCEEDED` terug. Laat een veld leeg (of verwijder `quota_cap` helemaal) om die dimensie uit te schakelen.

---

## Alles samen

Een realistische `user-preferences.yaml`:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Run `oma doctor --profile` om de resolutie te controleren en start daarna de workflow zoals gewoonlijk.
