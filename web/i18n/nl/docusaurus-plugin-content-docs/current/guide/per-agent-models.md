---
title: "Gids: modelconfiguratie per agent"
description: Stel via oma-config.yaml en models.yaml per agent een andere CLI-provider, model en redeneerniveau in. Behandelt agent_cli_mapping, runtime-profielen, oma doctor --profile, models.yaml en sessiequota-limieten.
---

# Gids: modelconfiguratie per agent

## Overzicht

oh-my-agent ondersteunt **modelselectie per agent** via `agent_cli_mapping`. Elke agent (pm, backend, frontend, qa, …) kan onafhankelijk een eigen provider, model en redeneerniveau krijgen — in plaats van één globale provider te delen.

Deze pagina behandelt:

1. De drieledige configuratiehiërarchie
2. Het duale formaat van `agent_cli_mapping`
3. Runtime-profiel-presets
4. Het commando `oma doctor --profile`
5. Zelf toegevoegde model-slugs in `models.yaml`
6. Sessiequota-limieten

---

## Hiërarchie van configuratiebestanden

oh-my-agent leest drie bestanden in volgorde van prioriteit (hoog naar laag):

| Bestand | Doel | Bewerkbaar? |
|:--------|:-----|:------------|
| `.agents/oma-config.yaml` | Gebruikersoverrides — agent→CLI-mapping, actief profiel, sessiequota | Ja |
| `.agents/config/models.yaml` | Door de gebruiker aangeleverde model-slugs (aanvulling op de ingebouwde registry) | Ja |
| `.agents/config/defaults.yaml` | Ingebouwde Profile B-baseline (5 `runtime_profiles`, veilige fallbacks) | Nee — SSOT |

> `defaults.yaml` maakt deel uit van de SSOT en mag niet direct worden aangepast. Alle aanpassing gebeurt in `oma-config.yaml` en `models.yaml`.

---

## Duaal formaat van `agent_cli_mapping`

`agent_cli_mapping` accepteert twee waardevormen zodat je geleidelijk kunt migreren:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — vendor only (uses default model)
  backend:                            # new AgentSpec object
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Legacy string-vorm**: `agent: "vendor"` — blijft werken en gebruikt het standaardmodel van de provider met de standaard effort via het bijbehorende runtime-profiel.

**AgentSpec-objectvorm**: `agent: { model, effort }` — legt een exacte model-slug en redeneerniveau (`low`, `medium`, `high`) vast.

Combineer de vormen naar wens. Niet-vermelde agents vallen terug op het actieve `runtime_profile`, en daarna op de `agent_defaults` op het hoogste niveau in `defaults.yaml`.

---

## Runtime-profielen

`defaults.yaml` levert Profile B met vijf kant-en-klare `runtime_profiles`. Kies er één in `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # see options below
```

| Profiel | Alle agents routen naar | Wanneer gebruiken |
|:--------|:------------------------|:------------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Uniforme Anthropic-stack |
| `codex-only` | OpenAI Codex (GPT-5.x) | Pure OpenAI-stack |
| `gemini-only` | Gemini CLI | Google-gerichte workflows |
| `antigravity` | Gemengd: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Sterke punten per provider combineren |
| `qwen-only` | Qwen Code | Lokale / self-hosted inferentie |

Profielen zijn de snelle manier om de hele vloot te herconfigureren zonder elke agentinstelling afzonderlijk te bewerken.

---

## `oma doctor --profile`

De vlag `--profile` toont een matrixweergave met de opgeloste provider, model en effort per agent — nadat `oma-config.yaml`, `models.yaml` en `defaults.yaml` zijn samengevoegd.

```bash
oma doctor --profile
```

**Voorbeelduitvoer:**

```
oh-my-agent — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   oma-config
backend       openai    gpt-5.3-codex               high     oma-config
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview      low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
retrieval     google    gemini-3.1-flash-lite       —        defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Gebruik dit commando wanneer een subagent een onverwachte provider kiest — de kolom `Source` laat zien welke configuratielaag heeft gewonnen.

---

## Slugs toevoegen in `models.yaml`

`models.yaml` is optioneel en dient om model-slugs te registreren die nog niet in de ingebouwde registry staan — handig voor pas uitgebrachte modellen.

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

Voeg `session.quota_cap` toe in `oma-config.yaml` om ongebreideld spawnen van subagents te begrenzen:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # total session token ceiling
    spawn_count: 40          # max parallel + sequential subagents
    per_vendor:              # per-vendor token sub-caps
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Wanneer een limiet wordt bereikt, weigert de orchestrator nieuwe spawns en geeft de status `QUOTA_EXCEEDED` terug. Laat een veld leeg (of verwijder `quota_cap` helemaal) om die dimensie uit te schakelen.

---

## Alles samen

Een realistische `oma-config.yaml`:

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


## Eigenaarschap van configuratiebestanden

| Bestand | Eigenaar | Veilig te bewerken? |
|---------|----------|---------------------|
| `.agents/config/defaults.yaml` | SSOT meegeleverd met oh-my-agent | Nee — behandel als alleen-lezen |
| `.agents/oma-config.yaml` | Jij | Ja — pas hier aan |
| `.agents/config/models.yaml` | Jij | Ja — voeg hier nieuwe slugs toe |

`defaults.yaml` bevat een `version:`-veld zodat nieuwe oh-my-agent-releases runtime_profiles, nieuwe Profile B-slugs of de effort-matrix kunnen uitbreiden. Wie het bestand direct aanpast, ontvangt die updates niet automatisch meer.

## Upgrading defaults.yaml

Wanneer je een nieuwere oh-my-agent-release binnentrekkt, run je `oma install` — het installatieprogramma vergelijkt de versie van je lokale `defaults.yaml` met de meegeleverde versie:

- **Overeenkomst** → geen wijziging, stil.
- **Verschil** → waarschuwing:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Verschil + `--update-defaults`** → de meegeleverde versie overschrijft de jouwe:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Je `oma-config.yaml` en `models.yaml` worden nooit door het installatieprogramma aangeraakt.

## Upgrading from a pre-5.16.0 install

Als je project dateert van vóór de per-agent model/effort-functie:

1. Run `oma install` (of `oma update`) vanuit de projectroot. Het installatieprogramma plaatst een nieuw `defaults.yaml` in `.agents/config/` en voert migratie `003-oma-config` uit, die een eventueel bestaand `.agents/config/user-preferences.yaml` automatisch verplaatst naar `.agents/oma-config.yaml`.
2. Run `oma doctor --profile`. Je bestaande `agent_cli_mapping: { backend: "gemini" }`-waarden worden opgelost via `runtime_profiles.gemini-only.agent_defaults.backend`, zodat de matrix automatisch de juiste slug en CLI toont.
3. (Optioneel) Upgrade legacy string-vermeldingen naar de nieuwe AgentSpec-vorm in `oma-config.yaml` wanneer je per-agent `model`-, `effort`-, `thinking`- of `memory`-overrides wilt:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Als je `defaults.yaml` ooit zelf hebt aangepast, geeft `oma install` een waarschuwing over de versieverschil in plaats van te overschrijven. Verplaats je aanpassingen naar `oma-config.yaml` / `models.yaml` en run daarna `oma install --update-defaults` om de nieuwe SSOT te accepteren.

Er zijn geen breaking changes voor `agent:spawn` — legacy-configuraties blijven werken via graceful fallback terwijl je in eigen tempo migreert.
