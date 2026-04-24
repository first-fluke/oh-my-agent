---
title: "Przewodnik: konfiguracja modelu per agent"
description: Skonfiguruj różnych dostawców CLI, modele i poziomy rozumowania osobno dla każdego agenta za pomocą oma-config.yaml i models.yaml. Obejmuje agent_cli_mapping, profile runtime, oma doctor --profile, models.yaml oraz limity quoty sesji.
---

# Przewodnik: konfiguracja modelu per agent

## Wprowadzenie

oh-my-agent obsługuje **wybór modelu per agent** za pomocą `agent_cli_mapping`. Każdy agent (pm, backend, frontend, qa…) może niezależnie wskazywać dostawcę, model i poziom rozumowania — zamiast współdzielić jednego globalnego dostawcę.

Na tej stronie:

1. Trójstopniowa hierarchia konfiguracji
2. Dualny format `agent_cli_mapping`
3. Presety profili runtime
4. Polecenie `oma doctor --profile`
5. Własne slugi modeli w `models.yaml`
6. Limity quoty sesji

---

## Hierarchia plików konfiguracyjnych

oh-my-agent czyta konfigurację z trzech plików w kolejności priorytetu (od najwyższego):

| Plik | Rola | Edytowalny? |
|:-----|:-----|:------------|
| `.agents/oma-config.yaml` | Nadpisania użytkownika — mapowanie agent→CLI, aktywny profil, quota sesji | Tak |
| `.agents/config/models.yaml` | Slugi modeli dostarczone przez użytkownika (uzupełnienie wbudowanego rejestru) | Tak |
| `.agents/config/defaults.yaml` | Wbudowana linia bazowa Profile B (5 `runtime_profiles`, bezpieczne fallbacki) | Nie — SSOT |

> `defaults.yaml` jest częścią SSOT i nie wolno go modyfikować bezpośrednio. Cała personalizacja odbywa się w `oma-config.yaml` i `models.yaml`.

---

## Dualny format `agent_cli_mapping`

`agent_cli_mapping` przyjmuje dwie formy wartości — dzięki temu można migrować stopniowo:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — sam dostawca (model domyślny)
  backend:                            # nowy obiekt AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Legacy forma string**: `agent: "vendor"` — nadal działa; używa domyślnego modelu dostawcy z domyślnym effort poprzez pasujący profil runtime.

**Forma obiektu AgentSpec**: `agent: { model, effort }` — przyszpila konkretny slug modelu oraz poziom rozumowania (`low`, `medium`, `high`).

Obie formy można swobodnie mieszać. Agenty niezadeklarowane spadają na aktywny `runtime_profile`, a następnie na `agent_defaults` najwyższego poziomu w `defaults.yaml`.

---

## Profile runtime

`defaults.yaml` dostarcza Profile B wraz z pięcioma gotowymi `runtime_profiles`. Wybierz jeden w `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # opcje poniżej
```

| Profil | Wszyscy agenci routowani do | Kiedy używać |
|:-------|:----------------------------|:-------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Jednolity stack Anthropic |
| `codex-only` | OpenAI Codex (GPT-5.x) | Czysty stack OpenAI |
| `gemini-only` | Gemini CLI | Workflowy zorientowane na Google |
| `antigravity` | Mieszany: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Łączenie mocnych stron dostawców |
| `qwen-only` | Qwen Code | Inferencja lokalna / self-hosted |

Profile to szybki sposób na przemapowanie całej floty bez edycji każdej linii agenta.

---

## `oma doctor --profile`

Flaga `--profile` drukuje macierz z rozstrzygniętym dostawcą, modelem i effort dla każdego agenta — po scaleniu `oma-config.yaml`, `models.yaml` i `defaults.yaml`.

```bash
oma doctor --profile
```

**Przykładowe wyjście:**

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

Gdy subagent wybierze niespodziewanego dostawcę, uruchom to polecenie — kolumna `Source` wskaże, która warstwa konfiguracji wygrała.

---

## Dodawanie slugów w `models.yaml`

`models.yaml` jest opcjonalny i pozwala rejestrować slugi modeli, których jeszcze nie ma w wbudowanym rejestrze — przydatne przy świeżo wydanych modelach.

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

Po rejestracji slug można użyć w `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugi to identyfikatory — zachowaj dokładny angielski zapis opublikowany przez dostawcę.

---

## Limit quoty sesji

Dodaj `session.quota_cap` w `oma-config.yaml`, żeby ograniczyć niekontrolowane spawny subagentów:

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

Realistyczny `oma-config.yaml`:

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

Uruchom `oma doctor --profile`, żeby potwierdzić rozwiązanie konfiguracji, i odpal workflow jak zwykle.


## Własność plików konfiguracyjnych

| Plik | Właściciel | Można edytować? |
|------|------------|-----------------|
| `.agents/config/defaults.yaml` | SSOT dostarczony z oh-my-agent | Nie — traktuj jako tylko do odczytu |
| `.agents/oma-config.yaml` | Ty | Tak — dostosowuj tutaj |
| `.agents/config/models.yaml` | Ty | Tak — dodawaj nowe slugi tutaj |

`defaults.yaml` zawiera pole `version:`, dzięki czemu nowe wydania oh-my-agent mogą dodawać runtime_profiles, nowe slugi Profile B lub korygować macierz effort. Bezpośrednia edycja tego pliku oznacza, że nie będziesz automatycznie otrzymywać tych aktualizacji.

## Aktualizacja defaults.yaml

Po pobraniu nowszego wydania oh-my-agent uruchom `oma install` — instalator porównuje lokalną wersję `defaults.yaml` z wersją w pakiecie:

- **Zgodność** → brak zmian, cisza.
- **Niezgodność** → ostrzeżenie:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Niezgodność + `--update-defaults`** → wersja z pakietu nadpisuje Twoją:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Pliki `oma-config.yaml` i `models.yaml` nigdy nie są modyfikowane przez instalator.

## Aktualizacja instalacji sprzed wersji 5.16.0

Jeśli projekt pochodzi sprzed wprowadzenia funkcji per-agent model/effort:

1. Uruchom `oma install` (lub `oma update`) z katalogu głównego projektu. Instalator umieszcza świeży `defaults.yaml` w `.agents/config/` i wykonuje migrację `003-oma-config`, która automatycznie przenosi ewentualny plik `.agents/config/user-preferences.yaml` do `.agents/oma-config.yaml`.
2. Uruchom `oma doctor --profile`. Istniejące wartości `agent_cli_mapping: { backend: "gemini" }` są rozwiązywane przez `runtime_profiles.gemini-only.agent_defaults.backend`, więc macierz automatycznie pokazuje właściwy slug i CLI.
3. (Opcjonalnie) Zaktualizuj legacy wpisy w formie string do nowej formy AgentSpec w `oma-config.yaml`, gdy chcesz mieć nadpisania `model`, `effort`, `thinking` lub `memory` per agent:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Jeśli wcześniej modyfikowałeś `defaults.yaml`, `oma install` ostrzeże o niezgodności wersji zamiast nadpisywać. Przenieś swoje dostosowania do `oma-config.yaml` / `models.yaml`, a następnie uruchom `oma install --update-defaults`, aby zaakceptować nowy SSOT.

Brak zmian łamiących w `agent:spawn` — legacy konfiguracje nadal działają dzięki łagodnemu fallbackowi, a migrację możesz przeprowadzać we własnym tempie.
