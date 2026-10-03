---
title: "Przewodnik: konfiguracja modeli per agent"
sidebar_label: Modele agentów
description: Skonfiguruj model AI używany przez każdego agenta za pomocą model_preset w oma-config.yaml. Obejmuje wbudowane presety, nadpisania per agent, definicje modeli inline, własne presety z extends, oma doctor --profile oraz migrację ze starszego agent_cli_mapping.
---

# Przewodnik: konfiguracja modeli per agent

## Przegląd

`model_preset: auto` jest domyślną wartością dla nowych instalacji. Nieskonfigurowane agenty używają natywnych definicji agentów i ustawień modeli bieżącego vendora. Wybierz stały preset, aby przypiąć modele, albo nadpisz pojedyncze agenty, gdy potrzebujesz innego modelu lub vendora. Istniejące jawne presety są zachowywane przy ponownej instalacji i aktualizacji.

Współdzielona konfiguracja znajduje się w `.agents/oma-config.cue` albo `.agents/oma-config.yaml`. Opcjonalny plik lokalny ignorowany przez Git nadpisuje ustawienia na Twoim komputerze.

Pełny wykaz kluczy najwyższego poziomu i zasad priorytetu znajdziesz w [konfiguracji referencyjnej](/docs/guide/configuration-reference).

Ta strona obejmuje:

1. Wbudowane presety
2. Nadpisywanie pojedynczych agentów za pomocą mapy `agents:`
3. Wstawianie własnych identyfikatorów modeli za pomocą `models:`
4. Definiowanie własnych presetów przez `custom_presets:` i `extends:`
5. Sprawdzanie rozstrzygniętej konfiguracji przez `oma doctor --profile`
6. Migrację ze starszego `agent_cli_mapping`

---

## Wbudowane presety

Ustaw `model_preset` na jeden z wbudowanych kluczy:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| Klucz | Opis | Najlepsze zastosowanie |
|:----|:-----------|:---------|
| `auto` | Podąża za ustawieniami agenta/modelu bieżącego runtime’u bez wstrzykiwania flagi modelu ani effort | Domyślne dla nowych instalacji |
| `free` | Specjalny tryb bramy dla procesów Codex, Claude lub Qwen uruchamianych przez OMA; jest rozstrzygany osobno od wbudowanego rejestru presetów. | Lokalna brama FreeLLMAPI |
| `antigravity` | Wszystkie agenty używają Antigravity CLI (`agy`): Gemini 3.1 Pro do implementacji/architektury i Gemini 3.6 Flash do orkiestracji, dokumentacji i eksploracji. Wybór modelu odbywa się w konfiguracji `agy` — nie są udostępniane flagi `--model` ani `--thinking-budget`. | Użytkownicy Antigravity CLI |
| `claude` | Wszystkie agenty używają Claude (Sonnet/Opus) | Posiadacze subskrypcji Claude Max |
| `codex` | Wszystkie agenty używają OpenAI Codex (GPT-5.5 dla większości ról, GPT-5.4-mini dla eksploracji) z poziomami effort | Użytkownicy ChatGPT Plus/Pro |
| `qwen` | Wszystkie agenty używają Qwen Code; pasujące sesje Qwen mogą korzystać z wygenerowanych agentów natywnych, a pozostałe runtime’y używają dispatchu CLI | Lokalne / samodzielnie hostowane wnioskowanie |
| `kiro` | Wszystkie agenty używają Kiro CLI; Sonnet obsługuje implementację/architekturę, a Haiku orkiestrację/eksplorację | Użytkownicy Kiro |
| `cursor` | Wszystkie agenty używają Cursor `composer-2.5` (`composer-2.5-fast` dla orkiestratora/qa/pm/docs/explore) | Użytkownicy Cursor Pro / Pro Student |
| `mixed` | Mieszany: role implementacyjne używają Codex, architektura/qa/pm Claude, a eksploracja Gemini | Siła wielu vendorów bez ręcznego zarządzania konfiguracją per agent |

Wbudowane presety są dostarczane w pakiecie CLI i aktualizują się automatycznie po uaktualnieniu `oh-my-agent`. `gemini` jest aliasem zgodności przekierowującym do `antigravity`; nie jest osobnym bieżącym presetem. Nie jest potrzebny lokalny plik presetu.

---

## Automatyczny dispatch

Przy `auto` jawne nadpisania modelu `agents.<id>` mają pierwszeństwo. W pozostałych przypadkach OMA wykrywa bieżący runtime i, jeśli to możliwe, używa jego natywnej ścieżki subagentów. Agenci i runtime’y innych vendorów bez natywnego dispatchu używają `oma agent spawn`. Auto nie rozwija się do stałego presetu vendora.

Dla dispatchu CLI `--vendor` jawnie wybiera cel. Bez tej flagi OMA używa wykrytego runtime’u, a przy braku wykrycia `default_cli` (`claude`, jeśli nie ustawiono). Odziedziczone plany nie wstrzykują flag modelu ani effort OMA; dostarcza je własna konfiguracja agenta/sesji vendora. Zewnętrzny proces CLI używa zapisanych domyślnych ustawień tego CLI, które mogą różnić się od modelu wybranego wyłącznie w sesji nadrzędnej.

`oma doctor --profile` wyświetla `(vendor agent default)` dla agentów dziedziczonych oraz rozstrzygnięty model dla jawnych nadpisań. Natywne pliki agentów zachowują definicje vendora; nadpisania tego samego vendora w trybie auto są stosowane, gdy pliki te są generowane przez install/update.

## Konfiguracja lokalna

Utwórz **jeden** z plików `.agents/oma-config.local.cue` albo `.agents/oma-config.local.yaml` obok konfiguracji współdzielonej. Install, link i update dodają obie ścieżki do `.gitignore`; update zachowuje istniejące pliki lokalne, także z `--force`.

OMA wybiera najbliższy katalog konfiguracji projektu. W tym katalogu współdzielony CUE ma pierwszeństwo przed współdzielonym YAML, a plik lokalny nadpisuje wartości współdzielone. Pliki CUE są oceniane niezależnie przed scaleniem, więc współdzielone `model_preset: "auto"` może zostać zastąpione lokalnym `"free"`. Obiekty są scalane rekurencyjnie; tablice, skalary i `null` zastępują wartość współdzieloną. Niepoprawny plik lokalny, brak wykonywalnego CUE dla lokalnego CUE albo obecność obu lokalnych formatów to błąd, a nie zgoda na użycie domyślnych wartości współdzielonych.

Opcje poleceń i obsługiwane nadpisania środowiskowe mają pierwszeństwo przed efektywną konfiguracją plikową. `oma doctor --profile` pokazuje, które pliki zostały użyte. Pliki lokalne nie są przenoszone wraz z klonami Git ani nowymi worktree. Podprocesy trybu free dziedziczą `OMA_MODEL_PRESET=free` i rozstrzygnięte środowisko bramy, aby zagnieżdżone uruchomienia OMA zachowały trasę; niezależnie uruchomione sesje potrzebują własnej konfiguracji lokalnej albo środowiska. Ustawienia zapisane przez polecenia install/setup nadal trafiają do konfiguracji współdzielonej; lokalne nadpisanie nadal wygrywa w czasie działania.

## Preset FreeLLMAPI {#freellmapi-preset}

Pozostaw `model_preset: auto` w pliku współdzielonym i włącz tryb lokalnie:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

Równoważny plik YAML:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

Uruchom FreeLLMAPI osobno i wyeksportuj jego ujednolicony klucz jako `FREELLM_API_KEY`. OMA akceptuje także upstreamowy `FREELLMAPI_API_KEY`, gdy wybrano domyślną zmienną klucza; zmienna kanoniczna wygrywa, gdy ustawiono obie. Własne `api_key_env` odczytuje tylko wskazaną zmienną. Nigdy nie umieszczaj samego klucza w konfiguracji. `OMA_MODEL_PRESET` nadpisuje preset. `FREELLM_BASE_URL` i `FREELLM_MODEL` nadpisują odpowiednie ustawienia pliku. Wartości w przykładzie są domyślne, więc samo `model_preset: free` wystarcza, gdy serwer i klucz są gotowe.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Tryb free używa `free.model` dla każdej roli kierowanej przez OMA, także dla ról z istniejącymi przypięciami `agents.*.model`. Nie rozstrzyga tych przypięć na płatne subskrypcje. Wybierz `auto`, identyfikator modelu bramy albo nazwany łańcuch bramy, taki jak `auto:coding` (najpierw utwórz ten łańcuch w FreeLLMAPI).

Transport jest wybierany w kolejności: `--vendor`, potem `OMA_RUNTIME_VENDOR`, potem wykryty obsługiwany runtime, następnie `default_cli`, a na końcu `codex`. Obsługiwane są tylko transporty Codex, Claude i Qwen. Jawnie wybrany nieobsługiwany transport jest błędem.

| Transport | Endpoint bramy | Bazowy URL CLI |
|:--|:--|:--|
| Codex | `/v1/responses` | Zawiera `/v1` |
| Claude | `/v1/messages` | Główny katalog serwera; OMA usuwa przyrostek `/v1` |
| Qwen | `/v1/chat/completions` | Zawiera `/v1` |

Używaj `oma agent spawn` nawet wtedy, gdy rodzic używa tego samego vendora. OMA wstrzykuje połączenie z bramą i dane uwierzytelniające tylko do tego podprocesu; zmiana presetu nie zmienia modelu już otwartej sesji hosta ani natywnego narzędzia subagenta hosta. Codex otrzymuje własnego dostawcę Responses przez argumenty wywołania, a klucz pozostaje w środowisku dziecka. Claude i Qwen otrzymują ustawienia zgodnych endpointów. Sprzeczne ustawienia Claude/Qwen, które zastąpiłyby trasę lub klucz, są zgłaszane przed wykonaniem; OMA nie przepisuje tych plików.

Spawn i review sprawdzają uwierzytelnione `GET /v1/models` przed uruchomieniem agenta. Brak kluczy, błędy połączenia i błędy uwierzytelniania HTTP zatrzymują wykonanie. `oma doctor --profile` pokazuje efektywny URL/model, nadpisania środowiskowe, obecność klucza i gotowość serwera bez wypisywania klucza. Gotowość nie gwarantuje, że model ma wystarczający limit, aby ukończyć zadanie.

FreeLLMAPI odpowiada za przełączanie dostawcy na poziomie żądania. Jawne przełączanie vendora OMA oparte na punktach kontrolnych pozostaje osobnym mechanizmem odzyskiwania procesu; każdy następca w trybie free nadal musi używać obsługiwanego transportu FreeLLMAPI. Nie następuje automatyczny powrót do konfiguracji płatnego vendora.

Preset free konfiguruje wnioskowanie agentów. Nie zmienia konfiguracji embeddingów istniejących usług pamięci. FreeLLMAPI udostępnia też `/v1/embeddings`; przy osobnej konfiguracji magazynu wektorowego przypnij rodzinę modeli, aby istniejące wektory zachowały zgodną przestrzeń.

Materiały upstream: [konfiguracja klienta](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [rodziny API i embeddingów](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

## Nadpisywanie pojedynczych agentów

Użyj mapy `agents:`, aby nadpisać konkretnych agentów na aktywnym presecie. Wpływa to tylko na wymienionych agentów; reszta podąża za ustawieniami vendora w trybie auto albo za domyślnymi wartościami wybranego stałego presetu.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Każdy wpis jest obiektem `AgentSpec`:

| Pole | Typ | Wymagane | Opis |
|:------|:-----|:---------|:-----------|
| `model` | string | Tak | Identyfikator modelu (wbudowany albo zdefiniowany przez użytkownika) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | Nie | Wysiłek rozumowania (ignorowany przez modele, które go nie obsługują) |
| `thinking` | boolean | Nie | Włącza rozszerzone myślenie (zależne od modelu) |
| `memory` | `user` \| `project` \| `local` | Nie | Zakres pamięci agenta |

Prawidłowe identyfikatory agentów: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore`.

Scalanie jest płytkie: każde pole nadpisania zastępuje wartość presetu dla tego pola. Pominięte pola zachowują wartość presetu.

---

## Wstawianie identyfikatorów modeli {#inlining-model-slugs}

Zarejestruj identyfikatory modeli, których nie ma jeszcze we wbudowanym rejestrze, w `models:`. Po rejestracji odwołuj się do identyfikatora z `agents:` albo `custom_presets:`.

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

Do zarejestrowanego identyfikatora używanego w `agents:` stosują się dwie reguły:

1. **Klucz musi mieć postać `owner/model`.** `agents.<id>.model` sprawdza wzorzec `owner/model`, więc zwykły klucz taki jak `my-fast-model` jest odrzucany — użyj klucza z ukośnikiem, takiego jak `google/gemini-3-flash-fast` (albo identyfikatora `provider/model` właściwego dla vendora).
2. **Specyfikacja musi być kompletna.** W czasie rozstrzygania wymagane są `cli`, `cli_model`, `auth_hint` i każda wartość logiczna `supports`. Niekompletna specyfikacja przechodzi parser konfiguracji, ale nie przechodzi walidacji rejestru modeli i po cichu wraca do głównego rejestru.

> Jeśli identyfikator zdefiniowany przez użytkownika koliduje z wbudowanym identyfikatorem, wygrywa definicja użytkownika i pojawia się ostrzeżenie.

---

## Presety niestandardowe

Zdefiniuj dodatkowe presety w `custom_presets:`. Użyj `extends:`, aby odziedziczyć wszystkie domyślne ustawienia agentów z wbudowanego presetu i nadpisać tylko agentów, których potrzebujesz.

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

Bez `extends:` podaj wartości domyślne dla kanonicznych ról agentów używanych przez preset. Z `extends:` nadpisywane są tylko wymienione wpisy; reszta jest dziedziczona z bazowego presetu.

---

## `oma doctor --profile`

Uruchom `oma doctor --profile`, aby sprawdzić w pełni rozstrzygniętą macierz modeli po scaleniu domyślnych wartości presetu, `custom_presets` i nadpisań `agents:`.

```bash
oma doctor --profile
```

**Przykładowe wyjście:**

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

Każdy wiersz pokazuje rozstrzygnięty identyfikator modelu i źródło, które go zastosowało (`(preset)` albo `(override)`). Użyj tego polecenia, gdy subagent wybierze nieoczekiwanego vendora.

---

## Migracja ze starszego `agent_cli_mapping`

Migracja 008 uruchamia się automatycznie podczas `oma install` i `oma update`. Konwertuje starsze projekty w miejscu:

| Starsza konfiguracja | Wynik po migracji 008 |
|:-------------|:--------------------------|
| Wszystkie wpisy z tym samym vendorem (np. wszystkie `gemini`) | `model_preset: gemini`, bez `agents:` |
| Mieszane vendory | Najczęstszy vendor → `model_preset`; pozostałe → nadpisania w `agents:` |
| Wartości będące obiektami `AgentSpec` | Przeniesione bez zmian do `agents:` |
| Zawartość `models.yaml` | Wstawiona do `oma-config.yaml.models` |
| Dostosowane `defaults.yaml` | Zachowane jako `custom_presets.user-customized` z ostrzeżeniem |

Oryginały są kopiowane do `.agents/.backup-pre-008-{timestamp}/` przed rozpoczęciem zmian. Migracja jest idempotentna. Jeśli `model_preset` już istnieje, zostaje pominięta.

<!-- oma-docs:ignore-start -->
Po migracji `.agents/config/defaults.yaml`, `.agents/config/models.yaml` i katalog `.agents/config/` są usuwane.
<!-- oma-docs:ignore-end -->

---

## Limit kwoty sesji

`session.quota_cap` pozostaje bez zmian. Dodaj go do `oma-config.yaml`, aby ograniczyć niekontrolowane uruchamianie subagentów:

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

Po osiągnięciu limitu orkiestrator odmawia kolejnych uruchomień i zgłasza status `QUOTA_EXCEEDED`.

---

## Pełny przykład

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

Uruchom `oma doctor --profile`, aby potwierdzić rozstrzygnięcie, a potem rozpocznij workflow jak zwykle.

---

## Dispatch przez pi (runtime transportu)

[pi](https://github.com/earendil-works/pi) (Earendil) to runtime proxy dla wielu dostawców, a nie właściciel modeli — może uruchamiać dowolny model rzeczywistego dostawcy (Anthropic, OpenAI, Google) przez jedno CLI. OMA traktuje pi jako **warstwę transportu**: `model_preset` i nadpisania `agents:` pozostają dokładnie takie same, a pi staje się CLI wykonującym zadanie danego agenta.

Przekieruj dowolnego agenta przez pi za pomocą nadpisania `--vendor pi`:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

Co się dzieje:

- Model per agent rozstrzygnięty z presetu/nadpisań (np. `openai/gpt-5.5`) jest tłumaczony do postaci `--model <provider/id>` pi, a `effort` do poziomu `--thinking` pi. **Modele per subagent działają w pi dokładnie tak jak natywnie** — różni agenci mogą uruchamiać różne modele.
- Persona agenta (prompt systemowy) jest wstawiana z `.agents/agents/<id>.md`, ponieważ pi nie ma pliku agenta po stronie vendora.
- Uwierzytelnianie pochodzi z konfiguracji samego pi (`~/.pi/agent/auth.json` albo klucz API dostawcy w środowisku). `oma doctor` zgłasza instalację i uwierzytelnienie pi obok innych CLI.

**Ograniczenie:** pi uruchamia wyłącznie modele rzeczywistych dostawców. Presety własne dla CLI (`cursor`, `kiro`, `qwen`, `antigravity`) wskazują modele istniejące tylko we własnych CLI, więc przekierowanie ich przez pi jest odrzucane wyraźnym błędem. Przy kierowaniu agentów przez pi użyj presetu rzeczywistego dostawcy (`claude`, `codex`, `gemini` albo `mixed`).

> Katalog modeli pi jest śledzony według wydań i wymaga uwierzytelnienia. Jeśli rozstrzygnięty identyfikator nie pasuje do tego, co udostępnia Twoja instalacja pi, sprawdź `pi --list-models` — dopasowanie `--model` w pi jest rozmyte, więc większość identyfikatorów dostawców działa bez zmian.

### Modele spoza wbudowanego rejestru pi (np. Z.ai GLM)

pi rozstrzyga `--model` względem **wbudowanego rejestru modeli**, a ustawienie `defaultProvider` jest brane pod uwagę tylko wtedy, gdy w ogóle nie przekazano modelu. W przypadku Z.ai pi dostarcza tylko podzbiór identyfikatorów GLM (`glm-4.7`, `glm-4.5-air`, `glm-5-turbo`, `glm-5.1`, `glm-5v-turbo` w pi 0.80.x) — preset wskazujący dowolny inny identyfikator GLM nie zostanie rozstrzygnięty.

Możliwe są dwa rozwiązania:

1. **Identyfikatory rejestru** — ogranicz preset do identyfikatorów z rejestru. Użyj postaci `provider/id` (np. `zai/glm-4.7`), aby jawnie przypiąć dostawcę; oma przekazuje ją do `--model` pi bez zmian.
2. **Identyfikatory niezarejestrowane** — zarejestruj je rozszerzeniem pi. Pole `api` musi nazywać jeden z identyfikatorów adapterów **api** pi (`openai-completions`, `anthropic-messages`, …), a nie nazwę dostawcy. Nazwy dostawców, takie jak `"zai"`, ani skróty, takie jak `"openai"`, nie są identyfikatorami adapterów i powodują błąd `No API provider registered for api: …` podczas dispatchu.

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

Przed wpisaniem identyfikatorów do presetu sprawdź je przez `pi --list-models`.

---

## Dispatch przez OpenCode

[OpenCode](https://opencode.ai) jest vendorem klasy rozszerzeń: podobnie jak pi nie jest właścicielem modeli, lecz CLI uruchamiającym modele z własnego katalogu — bezpłatnego dostawcy `opencode`, niskokosztowego planu subskrypcyjnego `opencode-go` i bramy `opencode-zen`. OMA integruje go jako **wtyczkę vendora w procesie**: opencode automatycznie ładuje `.opencode/plugins/oma/` zamiast rejestrować hooki w pliku ustawień, a personę każdego agenta rozstrzyga z wygenerowanych plików `.opencode/agents/<id>.md`.

### Jawny dispatch

Przekieruj dowolnego agenta przez opencode za pomocą nadpisania `--vendor opencode`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

Uruchamia to `opencode run --agent pm --dir <workspace> "<prompt>"`. Prompt jest **końcowym argumentem pozycyjnym** — flaga `-p` opencode oznacza `--password`, a nie prompt.

### Modele OpenCode per agent

Aby skierować konkretne agenty do modelu opencode, zarejestruj model pod `models:` i odwołaj się do niego z `agents:`. Obowiązują dwa wymagania (zobacz [Wstawianie identyfikatorów modeli](#inlining-model-slugs)):

1. **Identyfikator musi mieć postać `owner/model`.** Użyj identyfikatora `provider/model` opencode jako klucza rejestru — zwykłe nazwy są odrzucane przez schemat `agents.<id>.model`.
2. **Specyfikacja musi być kompletna** — wymagane są `cli`, `cli_model`, `auth_hint` i każda wartość logiczna `supports`. Niekompletna specyfikacja nie przechodzi walidacji i po cichu wraca do głównego rejestru (agent nie zostanie więc skierowany do opencode).

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

Każdy skierowany agent wykonuje `opencode run -m opencode-go/deepseek-v4-flash
--agent <id> --dir <workspace> "<prompt>"`. To dobre rozwiązanie dla lekkich, szybkich ról (pm, qa, docs, explore), podczas gdy ciężsi agenci implementacyjni pozostają przy Codex/Claude itd.

### Sprawdzanie identyfikatora modelu

Katalog opencode zależy od subskrypcji i logowania, dlatego oma **nie** wpisuje identyfikatorów modeli opencode na stałe. Sprawdź identyfikator w katalogu swojej instalacji:

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` zgłasza `accepted`, gdy identyfikator znajduje się na liście `opencode models`, `rejected`, gdy go tam nie ma, oraz `auth_required`, gdy dostawca wymaga logowania lub subskrypcji.

### Uwierzytelnianie i generowane pliki

- **Uwierzytelnianie:** `opencode auth login` zapisuje dane uwierzytelniające w `~/.local/share/opencode/auth.json`, po jednym wpisie na dostawcę. `oma auth status` / `oma doctor` zgłaszają opencode jako uwierzytelniony, gdy *dowolny* dostawca ma poświadczenie. `oma doctor --profile` natomiast rozróżnia dostawców: każdy wiersz jest sprawdzany względem prefiksu dostawcy zarejestrowanego `cli_model`, więc model z `cli_model: zai-coding-plan/glm-5.3` jest sprawdzany względem poświadczenia `zai-coding-plan`. Wiersz, którego model nie ma zarejestrowanego identyfikatora w postaci `provider/model` w polu `cli_model`, zgłasza `? unknown`, a nie pewny błąd uwierzytelniania.
- **Generowane pliki:** `oma link` (albo `oma link opencode`) zapisuje jedną personę `.opencode/agents/<id>.md` na agenta oraz most `.opencode/plugins/oma/`. Są generowane z SSOT `.agents/` — nie edytuj ich bezpośrednio; uruchom ponownie `oma link`, aby je wygenerować.

> **Uwaga dotycząca trwałych workflowów:** zdarzenie `session.idle` opencode (jego najbliższy odpowiednik hooka Claude `Stop`) służy tylko do powiadomień i nie może blokować zakończenia sesji. Trwałe workflowy (orchestrate / work / ultrawork) działają więc w opencode z **osłabioną semantyką Stop** — wzmocnienie workflowu następuje przy następnej wiadomości, zamiast utrzymywania otwartej sesji.

---

## Dispatch przez Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) odczytuje **hooki** tylko z konfiguracji globalnej (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`), dlatego `oma install`/`oma link` zapisują łańcuch hooków Kimi i dowiązania umiejętności w HOME za jawną zgodą (podobnie jak Antigravity). Kimi skanuje też bezpośrednio SSOT OMA `.agents/skills/`, więc umiejętności są rozstrzygane w całym projekcie niezależnie od tego. **MCP** nie wymaga zapisu w HOME i działa w zakresie projektu — jest zapisywany z uwzględnieniem trybu w `<cwd>/.kimi-code/mcp.json` (projekt) albo `~/.kimi-code/mcp.json` (globalnie).

### Jawny dispatch

Przekieruj dowolnego agenta przez Kimi za pomocą nadpisania `--vendor kimi`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

Uruchamia to `kimi -p "<prompt>"`. Tryb `-p` Kimi (nieinteraktywny) automatycznie zatwierdza zwykłe wywołania narzędzi zgodnie z polityką uprawnień `auto`, dlatego oma **nie** dodaje `--yolo`/`--auto` (są wzajemnie wykluczające się z `-p`).

### Modele Kimi per agent

Podobnie jak w przypadku opencode oma **nie** wpisuje katalogu modeli Kimi na stałe (oferta Kimi zależy od dostawcy i subskrypcji). Aby skierować konkretne agenty do modelu Kimi, zarejestruj pełną specyfikację pod `models:` z `cli: kimi` i odwołaj się do niej z `agents:`:

Klucz rejestru musi mieć postać `owner/model` (zwykłe nazwy są odrzucane przez schemat `agents.<id>.model`), a `cli_model` jest dokładnym aliasem przekazywanym do `kimi --model` — udokumentowany alias programistyczny Kimi to `kimi-code/kimi-for-coding`. Przed zatwierdzeniem sprawdź alias udostępniany przez subskrypcję za pomocą `kimi --model <alias>`.

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

Każdy skierowany agent wykonuje `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`.

> **Uwaga dotycząca trwałych workflowów:** udokumentowana ścieżka blokowania Stop w Kimi to kod wyjścia 2 / stderr, ale router `oma hook run` zawsze kończy się kodem 0 i emituje dialekt stdout. oma wysyła najlepszą dostępną próbę `permissionDecision: "deny"` (oraz zgodne z Claude `decision: "block"`), aby trwałe workflowy mogły łagodnie działać w trybie zdegradowanym w Kimi.
