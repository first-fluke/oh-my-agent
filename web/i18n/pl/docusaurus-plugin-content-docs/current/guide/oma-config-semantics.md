---
title: "Przewodnik: semantyka oma-config.yaml"
sidebar_label: Ładowanie konfiguracji
description: Wyjaśnia, jak OMA wybiera warstwy konfiguracji CUE i YAML, stosuje lokalne nakładki oraz rozstrzyga kilka awaryjnych ustawień zależnych od kontekstu instalacji. Obsługiwane klucze i wartości domyślne opisano w konfiguracji referencyjnej.
---

## Przegląd

Konfiguracja jest wybierana z najbliższego katalogu `.agents/` znalezionego podczas przechodzenia w górę od bieżącego katalogu roboczego:

- **Współdzielona**: `.agents/oma-config.cue` albo `.agents/oma-config.yaml`, gdy CUE nie istnieje lub nie można go ocenić.
- **Lokalna**: `.agents/oma-config.local.cue` albo `.agents/oma-config.local.yaml` (jeden plik nakładany na plik współdzielony; zachowaj ten plik prywatnie).

OMA nie scala pliku projektowego z `~/.agents/oma-config.*` przy zwykłym odczycie w czasie działania. Instalacja globalna odczytuje plik z katalogu domowego, ponieważ jej katalogiem głównym instalacji jest HOME; polecenie projektowe odczytuje najbliższą warstwę projektu. `auto_update_cli` jest celowym wyjątkiem: jego kontrola aktualizacji sprawdza konfigurację projektu, potem konfigurację domową, a na końcu przyjmuje wartość domyślną włączoną. Pełny model opisano w [konfiguracji referencyjnej](/docs/guide/configuration-reference).

## Tabela priorytetu

| Klucz | Zasada efektywna | Uwagi |
|-----|:---:|-------|
| `OMA_MODEL_PRESET` | Najwyższy | Niepusta wartość środowiskowa zastępuje `model_preset` dla tego procesu. |
| Plik lokalny | Nakładany na współdzielony | Zwykłe mapy są scalane rekurencyjnie; tablice, skalary i `null` zastępują wartość współdzieloną. Oba lokalne formaty nie mogą istnieć jednocześnie. |
| Współdzielony CUE | Preferowany | Gdy CUE nie istnieje lub jego ocena się nie powiedzie, loader próbuje użyć współdzielonego pliku YAML. Błąd lokalnego CUE jest krytyczny. |
| Współdzielony YAML | Awaryjny | Używany, gdy nie wybrano użytecznego współdzielonego pliku CUE. |
| `auto_update_cli` | Projekt, potem HOME, potem `true` | To awaryjne rozstrzygnięcie dotyczy tylko aktualizacji i jest zaimplementowane w `resolveAutoUpdateCli`; nie jest ogólną warstwą globalną. |

Aby ustawić lokalne nadpisanie projektu, umieść w lokalnym pliku tylko zmienione liście. Na przykład lokalny wybór modelu może pozostać poza plikiem współdzielonym:

```yaml
# .agents/oma-config.local.yaml
model_preset: claude
agents:
  backend:
    model: anthropic/claude-sonnet-4-6
```

Uruchom polecenie z projektu, aby wybrany został najbliższy katalog `.agents/`. Niepoprawny plik lokalny kończy się wyraźnym błędem; napraw go albo usuń przed ponowieniem próby.

## Wartości domyślne

| Klucz | Domyślna wartość | Kiedy stosowana |
|-----|---------|--------------|
| `auto_update_cli` | `true` | Oba pliki nie istnieją albo brakuje klucza |
| `serena.mode` | `bridge` | Oba pliki nie istnieją albo brakuje klucza |
| `serena.auto_update` | `true` | Oba pliki nie istnieją albo brakuje klucza |
| `telemetry` | `false` | Oba pliki nie istnieją albo brakuje klucza |
| `language` | `en` | Oba pliki nie istnieją albo brakuje klucza |
| `model_preset` | Wymagane | Dostarczony szablon projektu używa `auto`; schemat wymaga niepustej wartości. |
| `translation_voice` | `balanced` | Oba pliki nie istnieją albo brakuje klucza |
| `timezone` | Strefa systemowa | Oba pliki nie istnieją albo brakuje klucza |

## Uzasadnienie kolejności odczytu

Reguła najbliższej warstwy utrzymuje konfigurację projektu jako samowystarczalną. Jeśli potrzebujesz bazowych ustawień dla użytkownika, zainstaluj narzędzie globalnie i edytuj `~/.agents/oma-config.yaml`; instalacje projektowe nadal mogą definiować własną najbliższą warstwę.

## Uwagi

- `language` w `oma-config.yaml` steruje językiem odpowiedzi agenta. **Nie** służy do określania języka komunikatów ostrzegawczych instalacji/aktualizacji — te używają lokalizacji systemu (`$LANG`), ponieważ `oma-config.yaml` nie jest jeszcze wczytany w czasie instalacji.
- Priorytet `auto_update_cli` jest jawnie zaimplementowany w poleceniu aktualizacji. Gdy istnieją zarówno instalacja projektowa, jak i globalna, najpierw sprawdzana jest wartość projektu, a potem wartość z HOME.
- `telemetry` (domyślnie `false`) mapuje się na wyłączenie telemetrii właściwe dla każdego vendora, zapisywane przez `oma install` / `oma update` / `oma link`: Claude `DISABLE_TELEMETRY` + `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, Gemini/Qwen `privacy.usageStatisticsEnabled`, Codex `analytics.enabled` + `feedback.enabled`, Grok `[features] telemetry` oraz Antigravity (agy) `enableTelemetry` w `~/.gemini/antigravity-cli/settings.json`. Ustawienie `telemetry: true` ponownie włącza telemetrię, usuwając wyłączenie oma dla danego vendora.
- `diagram` (silnik `auto` / `archify` / `mermaid`, `explain_sidecar`, `archify.managed|channel|check_interval_min|path|quality|open`) to rzadka sekcja nadpisania umiejętności, podobna do `video` / `image`; zobacz [Silnik diagramów](/docs/guide/diagram-engine).
- `video.hyperframes.check_interval_min` ogranicza częstotliwość kontroli najnowszych wersji dla uruchamianego per run toolchainu HyperFrames i heygen-com/hyperframes (`oma video compose`, `oma update`).
- `market` (`managed|channel|check_interval_min|path|python|save_dir`) konfiguruje zawsze aktualny silnik `last30days` za `oma market`; zobacz [Badanie rynku](/docs/guide/market-research).
- Typowany schemat runtime obejmuje `providers`, `free`, `agents`, `models`, `custom_presets`, `vendors`, `session`, `docs` oraz rzadkie sekcje umiejętności. Dostarczone szablony zawierają też bloki należące do konsumentów, takie jak `scm`, `memory`, `serena_reaper` i `mcp`; ich konsumenci są właścicielami zagnieżdżonych kluczy. Nie wnioskuj o kluczu na podstawie tej listy — użyj [konfiguracji referencyjnej](/docs/guide/configuration-reference) i przewodnika funkcji dla danego bloku.
- Bezpośrednia edycja `oma-config.yaml` jest bezpieczna. `oma install` i `oma update` używają zamiany pól na poziomie wyrażeń regularnych i zachowują edytowane przez użytkownika klucze, którymi nie zarządzają (np. własne nadpisania `agents:` i `session.quota_cap`).
- `oma update` dodatkowo dopisuje klucze najwyższego poziomu zdefiniowane w dostarczonym szablonie, których brakuje w pliku (z wartościami domyślnymi szablonu), pod znacznikiem `# Added by oma update`. Posiadane już klucze nigdy nie są modyfikowane — ich istniejąca zawartość pozostaje identyczna bajtowo. Klucze celowo usunięte pojawią się ponownie z wartością domyślną szablonu; aby zrezygnować, ustaw wartość jawnie zamiast usuwać klucz.
