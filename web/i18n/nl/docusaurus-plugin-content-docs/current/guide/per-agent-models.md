---
title: "Gids: modelconfiguratie per agent"
description: Stel via oma-config.yaml en models.yaml per agent een andere CLI-provider, model en redeneerniveau in. Behandelt agent_cli_mapping, runtime-profielen, oma doctor --profile, models.yaml en sessiequota-limieten.
---

# Gids: modelconfiguratie per agent

## Overzicht

 introduceert **modelselectie per agent** via `agent_cli_mapping`. Elke agent (pm, backend, frontend, qa…) kan nu onafhankelijk een eigen provider, model en redeneerniveau krijgen — in plaats van één globale provider te delen.

Deze pagina behandelt:

1. De drieledige configuratiehiërarchie
2. Het duale formaat van `agent_cli_mapping`
3. Runtime-profiel-presets
4. Het commando `oma doctor --profile`
5. Zelf toegevoegde model-slugs in `models.yaml`
6. De sessiequota-limiet

---

## Hiërarchie van configuratiebestanden

 leest drie bestanden in volgorde van prioriteit (hoog naar laag):

| Bestand | Doel | Bewerkbaar? |
|:--------|:-----|:------------|
| `.agents/oma-config.yaml` | Gebruikersoverrides — agent→CLI-mapping, actief profiel, sessiequota | Ja |
| `.agents/config/models.yaml` | Door de gebruiker aangeleverde model-slugs (aanvulling op de ingebouwde registry) | Ja |
| `.agents/config/defaults.yaml` | Ingebouwde Profile B-baseline (4 `runtime_profiles`, veilige fallbacks) | Nee — SSOT |

> `defaults.yaml` hoort bij de SSOT en mag niet direct worden aangepast. Alle personalisatie gebeurt in `user-preferences.yaml` en `models.yaml`.

---

## Duaal formaat van `agent_cli_mapping`

`agent_cli_mapping` accepteert twee waardevormen voor geleidelijke migratie:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — alleen provider (default model)
  backend:                            # nieuw AgentSpec-object
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Legacy string-vorm**: `agent: "vendor"` — blijft werken en gebruikt het default model en de default effort van de provider.

**AgentSpec-objectvorm**: `agent: { model, effort }` — legt een exacte model-slug en redeneerniveau (`low`, `medium`, `high`) vast.

Je mag de vormen vrij combineren. Niet-vermelde agents vallen terug op het actieve `runtime_profile`.

---

## Runtime-profielen

`defaults.yaml` levert Profile B met vier kant-en-klare `runtime_profiles`. Kies er één in `user-preferences.yaml`:

```yaml
# .agents/oma-config.yaml
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
 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview              low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
docs          claude    claude-sonnet-4-6           low      defaults

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
# .agents/oma-config.yaml
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
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
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


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
