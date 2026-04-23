---
title: "Przewodnik: konfiguracja modelu per agent"
description: Dzięki RARDO v2.1 skonfigurujesz różne dostawców CLI, modele i poziomy rozumowania dla każdego agenta. Obejmuje agent_cli_mapping, profile runtime, oma doctor --profile, models.yaml oraz limit quoty sesji.
---

# Przewodnik: konfiguracja modelu per agent

## Wprowadzenie

RARDO v2.1 wprowadza **wybór modelu per agent** przez `agent_cli_mapping`. Każdy agent (pm, backend, frontend, qa…) może teraz niezależnie wskazywać swojego dostawcę, model i poziom rozumowania — zamiast dzielić jednego globalnego dostawcę.

Na tej stronie:

1. Trójstopniowa hierarchia konfiguracji
2. Dualny format `agent_cli_mapping`
3. Presety profili runtime
4. Polecenie `oma doctor --profile`
5. Własne slugi modeli w `models.yaml`
6. Limit quoty sesji

---

## Hierarchia plików konfiguracyjnych

RARDO v2.1 czyta trzy pliki w kolejności priorytetu (od najwyższego):

| Plik | Rola | Edytowalny? |
|:-----|:-----|:------------|
| `.agents/oma-config.yaml` | Nadpisania użytkownika — mapowanie agent→CLI, aktywny profil, quota sesji | Tak |
| `.agents/config/models.yaml` | Slugi modeli dostarczone przez użytkownika (uzupełnienie wbudowanego rejestru) | Tak |
| `.agents/config/defaults.yaml` | Wbudowana linia bazowa Profile B (4 `runtime_profiles`, bezpieczne fallbacki) | Nie — SSOT |

> `defaults.yaml` jest częścią SSOT i nie modyfikuje się go bezpośrednio. Cała personalizacja idzie przez `user-preferences.yaml` i `models.yaml`.

---

## Dualny format `agent_cli_mapping`

`agent_cli_mapping` przyjmuje dwie formy wartości — to pozwala migrować stopniowo:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — sam dostawca (model domyślny)
  backend:                            # nowy obiekt AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**Legacy forma string**: `agent: "vendor"` — wciąż działa; używa domyślnego modelu i domyślnego effort dostawcy.

**Forma obiektu AgentSpec**: `agent: { model, effort }` — przyszpila konkretny slug modelu oraz poziom rozumowania (`low`, `medium`, `high`).

Obie formy można swobodnie mieszać. Agenty niezadeklarowane spadają na aktywny `runtime_profile`.

---

## Profile runtime

`defaults.yaml` dostarcza Profile B wraz z czterema gotowymi `runtime_profiles`. Wybierz jeden w `user-preferences.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # opcje poniżej
```

| Profil | Wszyscy agenci routowani do | Kiedy używać |
|:-------|:----------------------------|:--------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Jednolity stack Anthropic |
| `codex-only` | OpenAI Codex (GPT-5.x) | Czysty stack OpenAI |
| `gemini-only` | Gemini CLI | Workflowy zorientowane na Google |
| `antigravity` | Mieszany: pm→claude, backend→codex, qa→gemini | Łączenie mocnych stron dostawców |
| `qwen-only` | Qwen CLI | Inferencja lokalna / self-hosted |

Profile to szybki sposób na przemapowanie całej floty bez edycji każdej linii.

---

## `oma doctor --profile`

Nowa flaga `--profile` drukuje macierz z rozstrzygniętym dostawcą, modelem i effort dla każdego agenta **po** złączeniu wszystkich trzech plików konfiguracji.

```bash
oma doctor --profile
```

**Przykładowe wyjście:**

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

Gdy subagent wybierze niespodziewanego dostawcę, odpal to najpierw — kolumna `Source` powie, która warstwa konfiguracji wygrała.

---

## Dodawanie slugów w `models.yaml`

`models.yaml` jest opcjonalny; służy do rejestrowania slugów modeli, których jeszcze nie ma w wbudowanym rejestrze — przydatne przy świeżych releasach.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — release candidate GPT-5.5 Spud"
```

Po rejestracji slug da się użyć w `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugi to identyfikatory — zachowaj dokładny angielski zapis opublikowany przez dostawcę.

---

## Limit quoty sesji

Dodaj `session.quota_cap` w `user-preferences.yaml`, żeby ograniczyć niekontrolowane spawny subagentów:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # sufit tokenów na całą sesję
    spawn_count: 40          # maks. subagentów równoległych + sekwencyjnych
    per_vendor:              # sublimity tokenów per dostawca
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Po osiągnięciu limitu orchestrator odmawia kolejnych spawnów i zwraca status `QUOTA_EXCEEDED`. Zostawienie pola pustym (albo pominięcie całego `quota_cap`) wyłącza ten wymiar.

---

## W komplecie

Realistyczny `user-preferences.yaml`:

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

Uruchom `oma doctor --profile`, żeby potwierdzić rozwiązanie konfiguracji, i odpal workflow jak zwykle.


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

## Upgrading from a pre-RARDO-v2.1 install

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
