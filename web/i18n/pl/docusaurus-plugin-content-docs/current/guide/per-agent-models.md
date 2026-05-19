---
title: "Przewodnik: konfiguracja modeli per-agent"
description: Skonfiguruj model AI używany przez każdego agenta poprzez model_preset w oma-config.yaml. Obejmuje wbudowane presety, nadpisania per-agent, definicje modeli inline, presety niestandardowe z extends, oma doctor --profile oraz migrację z dawnego agent_cli_mapping.
---

# Przewodnik: konfiguracja modeli per-agent

## Przegląd

`model_preset` to jedyne pojęcie sterujące tym, jaki model wykorzystuje każdy z agentów. Wybierz jeden z pięciu wbudowanych presetów, a każdy agent (pm, backend, frontend, qa, …) zostanie podłączony do modelu odpowiedniego dla danego stosu dostawcy. W razie potrzeby nadpisz pojedynczych agentów. Zdefiniuj dodatkowe presety, gdy zespół używa niestandardowego zestawu modeli.

Cała konfiguracja znajduje się w jednym pliku: `.agents/oma-config.yaml`.

Ta strona obejmuje:

1. Pięć wbudowanych presetów
2. Nadpisywanie pojedynczych agentów za pomocą mapy `agents:`
3. Inline'owe deklarowanie niestandardowych slugów modeli za pomocą `models:`
4. Definiowanie niestandardowych presetów przez `custom_presets:` i `extends:`
5. Inspekcję rozwiązanej konfiguracji za pomocą `oma doctor --profile`
6. Migrację z dawnego `agent_cli_mapping`

---

## Wbudowane presety

Ustaw `model_preset` na jeden z pięciu wbudowanych kluczy:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini
```

| Klucz | Opis | Najlepszy dla |
|:------|:-----|:--------------|
| `claude` | Wszyscy agenci korzystają z Claude (Sonnet/Opus) | Posiadaczy subskrypcji Claude Max |
| `codex` | Wszyscy agenci korzystają z OpenAI Codex (GPT-5.x) z poziomami effort | Użytkowników ChatGPT Plus/Pro |
| `gemini` | Wszyscy agenci korzystają z Gemini CLI, thinking włączone dla ról implementacyjnych | Użytkowników Google AI Pro |
| `qwen` | Wszyscy agenci kierowani zewnętrznie przez Qwen Code; binarne thinking (bez poziomów effort) | Lokalnej / własnej infrastruktury inferencji |
| `cursor` | Wszyscy agenci używają Cursor `composer-2.5` (`composer-2.5-fast` dla orchestrator/qa/pm/docs/retrieval) | Subskrybentów Cursor Pro / Pro Student |
| `mixed` | Mieszany: role implementacyjne korzystają z Codex, architecture/qa/pm z Claude, retrieval z Gemini | Wykorzystania mocnych stron różnych dostawców bez zarządzania konfiguracją per-agent |

Wbudowane presety są dostarczane wraz z pakietem CLI i aktualizują się automatycznie przy aktualizacji `oh-my-agent`. Brak lokalnego pliku do utrzymywania.

---

## Nadpisywanie pojedynczych agentów

Mapa `agents:` służy do nadpisywania konkretnych agentów na bazie aktywnego presetu. Wpływ ma tylko na agentów, których wymienisz; pozostali zachowują wartości domyślne presetu.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Każdy wpis to obiekt `AgentSpec`:

| Pole | Typ | Wymagane | Opis |
|:-----|:----|:---------|:-----|
| `model` | string | Tak | Slug modelu (wbudowany lub zdefiniowany przez użytkownika) |
| `effort` | `low` \| `medium` \| `high` | Nie | Poziom effort dla rozumowania (ignorowany przez modele, które go nie obsługują) |
| `thinking` | boolean | Nie | Włącza extended thinking (zależnie od modelu) |
| `memory` | `user` \| `project` \| `local` | Nie | Zakres pamięci agenta |

Prawidłowe identyfikatory agentów: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

Scalanie jest płytkie: każde pole w nadpisaniu zastępuje wartość presetu dla tego pola. Pola pominięte zachowują wartość presetu.

---

## Inline'owe deklarowanie slugów modeli

W sekcji `models:` zarejestruj slugi modeli, których jeszcze nie ma we wbudowanym rejestrze. Po rejestracji slugu można go używać w dowolnym miejscu w `agents:` lub `custom_presets:`.

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

> Jeśli slug zdefiniowany przez użytkownika koliduje ze slugiem wbudowanym, definicja użytkownika ma pierwszeństwo, a CLI emituje ostrzeżenie.

---

## Niestandardowe presety

Dodatkowe presety zdefiniujesz w `custom_presets:`. Użyj `extends:`, aby odziedziczyć wszystkie wartości domyślne agentów z presetu wbudowanego i nadpisać tylko tych, na których ci zależy.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # preset bazowy — częściowe scalanie
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # wszyscy pozostali agenci dziedziczeni z claude
```

Bez `extends:` musisz podać `agent_defaults` dla wszystkich 11 ról agentów. Z `extends:` nadpisywane są tylko wymienione wpisy; pozostałe są dziedziczone z presetu bazowego.

---

## `oma doctor --profile`

Uruchom `oma doctor --profile`, aby sprawdzić w pełni rozwiązaną macierz modeli — po scaleniu wartości domyślnych presetu, `custom_presets` oraz nadpisań z `agents:`.

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
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Każdy wiersz pokazuje rozwiązany slug modelu i źródło, z którego pochodzi (`(preset)` lub `(override)`). Korzystaj z tej komendy zawsze, gdy subagent wybiera nieoczekiwanego dostawcę.

---

## Migracja z dawnego `agent_cli_mapping`

Migracja 008 uruchamia się automatycznie podczas `oma install` oraz `oma update`. Konwertuje stare projekty w miejscu:

| Dawna konfiguracja | Wynik po migracji 008 |
|:-------------------|:----------------------|
| Wszystkie wpisy tego samego dostawcy (np. wszystkie `gemini`) | `model_preset: gemini`, brak `agents:` |
| Mieszani dostawcy | Najczęściej występujący dostawca → `model_preset`; pozostali → nadpisania w `agents:` |
| Wartości typu obiekt `AgentSpec` | Przeniesione do `agents:` bez zmian |
| Zawartość `models.yaml` | Wstawiona inline do `oma-config.yaml.models` |
| Zmodyfikowany `defaults.yaml` | Zachowany jako `custom_presets.user-customized` z ostrzeżeniem |

Oryginały są kopiowane do `.agents/.backup-pre-008-{timestamp}/` przed jakimikolwiek zmianami. Migracja jest idempotentna — jeżeli `model_preset` jest już obecny, krok zostaje pominięty.

Po migracji `.agents/config/defaults.yaml`, `.agents/config/models.yaml` oraz katalog `.agents/config/` zostają usunięte.

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

Gdy limit zostanie osiągnięty, orchestrator odmawia dalszego uruchamiania i zgłasza status `QUOTA_EXCEEDED`.

---

## Pełny przykład

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

Uruchom `oma doctor --profile`, aby potwierdzić rozwiązanie konfiguracji, a następnie wystartuj workflow jak zwykle.
