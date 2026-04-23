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
| `.agents/config/user-preferences.yaml` | Nadpisania użytkownika — mapowanie agent→CLI, aktywny profil, quota sesji | Tak |
| `.agents/config/models.yaml` | Slugi modeli dostarczone przez użytkownika (uzupełnienie wbudowanego rejestru) | Tak |
| `.agents/config/defaults.yaml` | Wbudowana linia bazowa Profile B (4 `runtime_profiles`, bezpieczne fallbacki) | Nie — SSOT |

> `defaults.yaml` jest częścią SSOT i nie modyfikuje się go bezpośrednio. Cała personalizacja idzie przez `user-preferences.yaml` i `models.yaml`.

---

## Dualny format `agent_cli_mapping`

`agent_cli_mapping` przyjmuje dwie formy wartości — to pozwala migrować stopniowo:

```yaml
# .agents/config/user-preferences.yaml
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
# .agents/config/user-preferences.yaml
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
# .agents/config/user-preferences.yaml
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
