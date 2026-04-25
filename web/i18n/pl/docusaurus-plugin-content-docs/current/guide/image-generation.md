---
title: "Przewodnik: Generowanie obrazów"
description: Kompletny przewodnik po generowaniu obrazów w oh-my-agent — wielowendorowe przekierowywanie przez Codex (gpt-image-2), Pollinations (flux/zimage, darmowe) i Gemini, z obrazami referencyjnymi, zabezpieczeniami kosztowymi, układem wyjścia, rozwiązywaniem problemów oraz wspólnymi wzorcami wywołań.
---

# Generowanie obrazów

`oma-image` to wielowendorowy router obrazów dla oh-my-agent. Generuje obrazy z promptów w języku naturalnym, kieruje je do dowolnego CLI dostawcy, do którego jesteś uwierzytelniony, oraz zapisuje deterministyczny manifest obok wyjścia, dzięki czemu każde uruchomienie jest odtwarzalne.

Umiejętność aktywuje się automatycznie na słowa kluczowe takie jak *image*, *illustration*, *visual asset*, *concept art* lub gdy inna umiejętność potrzebuje obrazu jako efektu ubocznego (hero shot, miniatura, zdjęcie produktu).

---

## Kiedy używać

- Generowanie obrazów, ilustracji, zdjęć produktów, concept artu, wizualizacji hero/landing
- Porównywanie tego samego promptu w wielu modelach obok siebie (`--vendor all`)
- Tworzenie zasobów wewnątrz przepływu pracy edytora (Claude Code, Codex, Gemini CLI)
- Pozwalanie innej umiejętności (design, marketing, dokumentacja) wywoływać pipeline generowania obrazów jako wspólnej infrastruktury

## Kiedy NIE używać

- Edycja lub retusz istniejącego obrazu — poza zakresem (użyj dedykowanego narzędzia)
- Generowanie wideo lub audio — poza zakresem
- Inline SVG / kompozycja wektorowa z danych strukturalnych — użyj umiejętności szablonowej
- Prosta zmiana rozmiaru / konwersja formatu — użyj biblioteki obrazów, a nie pipeline'u generacyjnego

---

## Vendorzy w skrócie

Umiejętność jest CLI-first: gdy natywny CLI vendora może zwrócić surowe bajty obrazu, ścieżka subprocesu jest preferowana ponad bezpośredni klucz API.

| Vendor | Strategia | Modele | Trigger | Koszt |
|---|---|---|---|---|
| `pollinations` | Bezpośredni HTTP | Darmowe: `flux`, `zimage`. Płatne kredytami: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | Ustawiony `POLLINATIONS_API_KEY` (darmowa rejestracja na https://enter.pollinations.ai) | Darmowy dla `flux` / `zimage` |
| `codex` | CLI-first — `codex exec` przez ChatGPT OAuth | `gpt-image-2` | `codex login` (klucz API niepotrzebny) | Naliczane do twojego planu ChatGPT |
| `gemini` | CLI-first → fallback do bezpośredniego API | `gemini-2.5-flash-image`, `gemini-3.1-flash-image-preview` | `gemini auth login` lub `GEMINI_API_KEY` + rozliczenia | Domyślnie wyłączony; wymaga rozliczeń |

`pollinations` jest domyślnym vendorem, ponieważ `flux` / `zimage` są darmowe, więc automatyczne wyzwalanie na słowach kluczowych jest bezpieczne.

---

## Szybki start

```bash
# Free, zero-config — uses pollinations/flux
oma image generate "minimalist sunrise over mountains"

# Compare every authenticated vendor in parallel
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Inspect authentication and install status per vendor
oma image doctor

# List registered vendors and the models each one supports
oma image list-vendors
```

`oma img` jest aliasem dla `oma image`.

---

## Polecenie slash (wewnątrz edytora)

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --out ./hero "minimalist dashboard hero illustration"
```

Polecenie slash jest przekazywane do tego samego pipeline'u `oma image generate` — każda flaga CLI również tutaj działa.

---

## Referencja CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|gemini|all]
  [-n 1..5]
  [--size 1024x1024|1024x1536|1536x1024|auto]
  [--quality low|medium|high|auto]
  [--out <dir>] [--allow-external-out]
  [-r <path>]...
  [--timeout 180] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--format text|json]

oma image doctor
oma image list-vendors
```

### Kluczowe flagi

| Flaga | Cel |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `gemini` lub `all`. Z `all` każdy żądany vendor musi być uwierzytelniony (tryb strict). |
| `-n, --count <n>` | Liczba obrazów na vendora, 1–5 (ograniczenie czasu rzeczywistego). |
| `--size <size>` | Proporcje: `1024x1024` (kwadrat), `1024x1536` (portret), `1536x1024` (krajobraz) lub `auto`. |
| `--quality <level>` | `low`, `medium`, `high` lub `auto` (domyślne dla vendora). |
| `--out <dir>` | Katalog wyjściowy. Domyślnie `.agents/results/images/{timestamp}/`. Ścieżki spoza `$PWD` wymagają `--allow-external-out`. |
| `-r, --reference <path>` | Do 10 obrazów referencyjnych (PNG/JPEG/GIF/WebP, ≤ 5 MB każdy). Powtarzalna lub rozdzielona przecinkami. Wspierana w `codex` i `gemini`; odrzucana w `pollinations`. |
| `-y, --yes` | Pomija prompt potwierdzenia kosztu dla uruchomień szacowanych na ≥ `$0.20`. Również przez `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Zapisuje SHA-256 promptu zamiast surowego tekstu w `manifest.json`. |
| `--dry-run` | Wypisuje plan i szacowany koszt bez wydawania pieniędzy. |
| `--format text\|json` | Format wyjścia CLI. JSON to powierzchnia integracji dla innych umiejętności. |
| `--strategy <list>` | Eskalacja tylko dla Gemini, np. `mcp,stream,api`. Nadpisuje `vendors.gemini.strategies`. |

---

## Obrazy referencyjne

Dołącz do 10 obrazów referencyjnych, aby kierować stylem, tożsamością tematu lub kompozycją.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor gemini
oma image generate -r a.png,b.png "blend these styles" --vendor gemini
```

| Vendor | Wsparcie referencji | Sposób |
|---|---|---|
| `codex` (gpt-image-2) | Tak | Przekazuje `-i <path>` do `codex exec` |
| `gemini` (2.5-flash-image) | Tak | Inline base64 `inlineData` w żądaniu |
| `pollinations` | Nie | Odrzucone z kodem wyjścia 4 (wymaga hostowania URL) |

### Gdzie znajdują się dołączone obrazy

- **Claude Code** — `~/.claude/image-cache/<session>/N.png`, eksponowane w wiadomościach systemowych jako `[Image: source: <path>]`. W zakresie sesji: skopiuj do trwałej lokalizacji, jeśli chcesz użyć ich później ponownie.
- **Antigravity** — katalog uploadu workspace'a (IDE pokazuje dokładną ścieżkę)
- **Codex CLI jako host** — musi być przekazany jawnie; załączniki w trakcie konwersacji nie są przekazywane dalej

Gdy użytkownik dołącza obraz i prosi o wygenerowanie lub edycję obrazu na jego podstawie, agent wywołujący **musi** przekazać go przez `--reference <path>` zamiast opisywać go w prozie. Jeśli lokalny CLI jest zbyt stary, aby wspierać `--reference`, uruchom `oma update` i spróbuj ponownie.

---

## Układ wyjścia

Każde uruchomienie zapisuje do `.agents/results/images/` w katalogu z sygnaturą czasową i sufiksem hash:

```
.agents/results/images/
├── 20260424-143052-ab12cd/                 # single-vendor run
│   ├── pollinations-flux.jpg
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # --vendor all run
    ├── codex-gpt-image-2.png
    ├── pollinations-flux.jpg
    └── manifest.json
```

`manifest.json` rejestruje vendora, model, prompt (lub jego SHA-256), rozmiar, jakość i koszt — każde uruchomienie jest odtwarzalne wyłącznie z manifestu.

---

## Koszt, bezpieczeństwo i anulowanie

1. **Zabezpieczenie kosztowe** — uruchomienia szacowane na ≥ `$0.20` proszą o potwierdzenie. Pomiń przez `-y` lub `OMA_IMAGE_YES=1`. Domyślny `pollinations` (flux/zimage) jest darmowy, więc prompt jest dla niego automatycznie pomijany.
2. **Bezpieczeństwo ścieżek** — ścieżki wyjścia spoza `$PWD` wymagają `--allow-external-out`, aby uniknąć niespodziewanych zapisów.
3. **Możliwość anulowania** — `Ctrl+C` (SIGINT/SIGTERM) przerywa każde wywołanie dostawcy w toku oraz orkiestrator razem.
4. **Deterministyczne wyjścia** — `manifest.json` jest zawsze zapisywany obok obrazów.
5. **Maksymalne `n` = 5** — ograniczenie czasu rzeczywistego, nie kwota.
6. **Kody wyjścia** — zgodne z `oma search fetch`: `0` ok, `1` ogólny, `2` bezpieczeństwo, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

---

## Protokół doprecyzowania

Przed wywołaniem `oma image generate` agent wywołujący przechodzi przez tę listę kontrolną. Jeśli czegoś brakuje i nie da się tego wywnioskować, najpierw pyta lub wzmacnia prompt i pokazuje rozszerzenie do zatwierdzenia.

**Wymagane:**
- **Temat** — co jest głównym elementem obrazu? (obiekt, osoba, scena)
- **Otoczenie / tło** — gdzie się to dzieje?

**Mocno zalecane (zapytaj, jeśli brak i nie da się wywnioskować):**
- **Styl** — fotorealistyczny, ilustracja, render 3D, obraz olejny, concept art, płaski wektor?
- **Nastrój / oświetlenie** — jasny vs ponury, ciepły vs chłodny, dramatyczny vs minimalny
- **Kontekst użycia** — hero image, ikona, miniatura, zdjęcie produktu, plakat?
- **Proporcje** — kwadrat, portret lub krajobraz

Dla krótkiego promptu typu *"a red apple"* agent **nie** zadaje pytań pomocniczych. Zamiast tego wzmacnia inline i pokazuje użytkownikowi:

> Użytkownik: "a red apple"
> Agent: "Wygeneruję to jako: *a single glossy red apple centered on a clean white background, soft studio lighting, photorealistic, shallow depth of field, 1024×1024*. Czy mam kontynuować, czy chciałbyś inny styl/kompozycję?"

Gdy użytkownik napisał kompletny brief twórczy (≥ 2 z: temat + styl + oświetlenie + kompozycja), jego prompt jest respektowany dosłownie — bez doprecyzowywania, bez wzmacniania.

**Język wyjściowy.** Prompty generacyjne są wysyłane do dostawcy w języku angielskim (modele obrazów są trenowane głównie na podpisach w języku angielskim). Jeśli użytkownik napisał w innym języku, agent tłumaczy i pokazuje tłumaczenie podczas wzmacniania, aby użytkownik mógł skorygować ewentualne błędy interpretacji.

---

## Wspólne wywołanie (z innych umiejętności)

Inne umiejętności wywołują generowanie obrazów jako wspólną infrastrukturę:

```bash
oma image generate "<prompt>" --format json
```

Manifest JSON zapisany na stdout zawiera ścieżki wyjściowe, vendora, model i koszt — łatwy do parsowania i łańcuchowania.

---

## Konfiguracja

- **Konfiguracja projektu:** `config/image-config.yaml`
- **Zmienne środowiskowe:**
  - `OMA_IMAGE_DEFAULT_VENDOR` — nadpisuje domyślnego vendora (w przeciwnym razie `pollinations`)
  - `OMA_IMAGE_DEFAULT_OUT` — nadpisuje domyślny katalog wyjściowy
  - `OMA_IMAGE_YES` — `1`, aby pominąć potwierdzenie kosztu
  - `POLLINATIONS_API_KEY` — wymagany dla vendora pollinations (darmowa rejestracja)
  - `GEMINI_API_KEY` — wymagany, gdy vendor gemini przechodzi do bezpośredniego API
  - `OMA_IMAGE_GEMINI_STRATEGIES` — kolejność eskalacji rozdzielona przecinkami dla gemini (`mcp,stream,api`)

---

## Rozwiązywanie problemów

| Symptom | Prawdopodobna przyczyna | Rozwiązanie |
|---|---|---|
| Kod wyjścia `5` (auth-required) | Wybrany vendor nie jest uwierzytelniony | Uruchom `oma image doctor`, aby zobaczyć, który vendor wymaga logowania. Następnie `codex login` / ustaw `POLLINATIONS_API_KEY` / `gemini auth login`. |
| Kod wyjścia `4` przy `--reference` | `pollinations` odrzuca referencje, lub plik za duży / zły format | Przełącz na `--vendor codex` lub `--vendor gemini`. Każda referencja musi być ≤ 5 MB i PNG/JPEG/GIF/WebP. |
| `--reference` nierozpoznawane | Lokalny CLI jest nieaktualny | Uruchom `oma update` i spróbuj ponownie. Nie wracaj do opisu prozą. |
| Potwierdzenie kosztu blokuje automatyzację | Uruchomienie szacowane na ≥ `$0.20` | Przekaż `-y` lub ustaw `OMA_IMAGE_YES=1`. Lepiej: przełącz na darmowy `pollinations`. |
| `--vendor all` natychmiast przerywa | Jeden z żądanych vendorów nie jest uwierzytelniony (tryb strict) | Uwierzytelnij brakującego vendora lub wybierz konkretnego `--vendor`. |
| Wyjście zapisane w nieoczekiwanym katalogu | Domyślnie jest `.agents/results/images/{timestamp}/` | Przekaż `--out <dir>`. Ścieżki spoza `$PWD` wymagają `--allow-external-out`. |
| Gemini nie zwraca bajtów obrazu | Pętla agentowa Gemini CLI nie emituje surowego `inlineData` na stdout (na 0.38) | Dostawca automatycznie przechodzi do bezpośredniego API. Ustaw `GEMINI_API_KEY` i upewnij się, że rozliczenia są aktywne. |

---

## Powiązane

- [Umiejętności](/docs/core-concepts/skills) — dwuwarstwowa architektura umiejętności, która zasila `oma-image`
- [Polecenia CLI](/docs/cli-interfaces/commands) — pełna referencja poleceń `oma image`
- [Opcje CLI](/docs/cli-interfaces/options) — globalna macierz opcji
