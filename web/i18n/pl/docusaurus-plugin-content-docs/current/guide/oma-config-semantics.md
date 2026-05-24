---
title: "Przewodnik: semantyka oma-config.yaml"
description: Reguły priorytetu per klucz dla oma-config.yaml, gdy obecne są jednocześnie instalacja projektowa i globalna. Obejmuje auto_update_cli (projekt wygrywa nad globalną), serena.mode, telemetry, language, model_preset, translation_voice, timezone oraz wskazuje, które pliki konfiguracyjne wczytują agy / claude / codex / gemini / qwen.
---

## Przegląd

`oma-config.yaml` może znajdować się w dwóch miejscach:

- **Projekt**: `<cwd>/.agents/oma-config.yaml`
- **Globalna**: `~/.agents/oma-config.yaml`

Gdy oba pliki istnieją, dla każdego klucza wygrywa plik projektowy. Jest to celowe: personalizacja per projekt to bardziej szczegółowy sygnał i nie powinna być nadpisywana przez ustawienie globalne.

## Tabela priorytetów

| Klucz | Projekt wygrywa? | Uwagi |
|-----|:---:|-------|
| `auto_update_cli` | Tak | Wartość projektowa nadpisuje globalną. Zaimplementowane w `resolveAutoUpdateCli` (`cli/commands/update/update.ts`). |
| `serena.mode` | Tak | Steruje trybem transportu Serena MCP (np. `stdio`, `sse`). |
| `telemetry` | Tak | Zgoda na telemetrię vendora (`true` / `false`). |
| `language` | Tak | Język odpowiedzi agentów (np. `en`, `ko`, `ja`). |
| `model_preset` | Tak | Preset wyboru modelu (np. `claude`, `mixed`, `codex`). |
| `translation_voice` | Tak | Ton tłumacza: `formal`, `balanced`, `interpreter`. |
| `timezone` | Tak | Identyfikator strefy czasowej (np. `Asia/Seoul`, `America/New_York`). |

"Projekt wygrywa" oznacza: jeśli klucz występuje w pliku projektowym, ta wartość jest stosowana niezależnie od tego, co podaje plik globalny. Jeśli klucza brakuje w pliku projektowym, używana jest wartość z pliku globalnego. Jeżeli brak go w obu, obowiązuje wartość domyślna.

## Wartości domyślne

| Klucz | Domyślnie | Kiedy stosowane |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Oba pliki nieobecne lub brak klucza |
| `serena.mode` | `stdio` | Oba pliki nieobecne lub brak klucza |
| `telemetry` | `false` | Oba pliki nieobecne lub brak klucza |
| `language` | `en` | Oba pliki nieobecne lub brak klucza |
| `model_preset` | `claude` | Oba pliki nieobecne lub brak klucza |
| `translation_voice` | `balanced` | Oba pliki nieobecne lub brak klucza |
| `timezone` | Strefa systemowa | Oba pliki nieobecne lub brak klucza |

## Uzasadnienie kolejności wczytywania

Konfiguracja projektowa wczytywana jest jako pierwsza, ponieważ reprezentuje bardziej szczegółowy kontekst — repozytorium, w którym deweloper właśnie pracuje. Zespół może wymagać `language: ko` lub `model_preset: mixed` dla swojego projektu, a tych decyzji nie powinno po cichu nadpisywać indywidualne `oma-config.yaml` z poziomu globalnego.

Plik globalny stanowi linię bazową dla całego konta użytkownika. Klucze, których projekt nie ustawia, przechodzą na wartość globalną, a ta z kolei przechodzi na zaszytą wartość domyślną.

## Uwagi

- `language` w `oma-config.yaml` steruje językiem odpowiedzi agentów. **Nie** wpływa na komunikaty ostrzegawcze instalacji/aktualizacji — te korzystają z lokalizacji systemowej (`$LANG`), ponieważ na etapie instalacji `oma-config.yaml` nie jest jeszcze wczytany.
- Priorytet `auto_update_cli` jest jawnie zaimplementowany w komendzie update. Gdy obecne są jednocześnie instalacja projektowa i globalna, najpierw sprawdzane jest projektowe `oma-config.yaml`.
- Bezpośrednia edycja `oma-config.yaml` jest bezpieczna. `oma install` oraz `oma update` korzystają z podmiany pól na poziomie regex i zachowują klucze edytowane przez użytkownika, którymi nie zarządzają (np. własne nadpisania `agents:`, `session.quota_cap`).
