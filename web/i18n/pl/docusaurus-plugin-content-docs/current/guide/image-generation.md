---
title: "Przewodnik: generowanie obrazów"
sidebar_label: Generowanie obrazów
description: Kompletny przewodnik po generowaniu obrazów w oh-my-agent, obejmujący wielowendorowe przekierowywanie przez Codex (gpt-image-2), Pollinations (flux/zimage, bezpłatne) i Antigravity przez Gemini Code Assist, a także obrazy referencyjne, zabezpieczenia kosztów, układ wyników, rozwiązywanie problemów i wspólne wzorce wywołań.
---

# Generowanie obrazów

`oma-image` to wielowendorowy router obrazów dla oh-my-agent. Generuje obrazy z promptów w języku naturalnym, przekazuje je do CLI dowolnego vendora, w którym masz uwierzytelnienie, oraz zapisuje obok wyniku manifest zawierający dane wejściowe i decyzje dostawcy potrzebne do audytu lub powtórzenia uruchomienia. Wynik dostawcy działającego na żywo może nadal się różnić.

Umiejętność aktywuje się przy frazach takich jak „generate an image”, „create an image”, „make a picture”, „draw me …” czy „image of …”, przy nazwie vendora (`gpt-image`, `nano-banana`, `pollinations`) albo wtedy, gdy inna umiejętność potrzebuje obrazu jako efektu ubocznego (hero shot, miniatura, zdjęcie produktu).

> **TL;DR** Potrzebujesz jednego z poniższych: `POLLINATIONS_API_KEY` (bezpłatne `flux` / `zimage`), `codex login` (gpt-image-2 w ramach planu ChatGPT) albo zalogowanego `agy`. Uruchom `oma image doctor`, a następnie `oma image generate "<prompt>" --vendor pollinations`. Obrazy i `manifest.json` trafiają do `.agents/results/images/{timestamp}-{shortid}/`.

---

## Kiedy używać

- Generowanie obrazów, ilustracji, zdjęć produktów, concept artu oraz materiałów hero/landing
- Porównywanie tego samego promptu w wielu modelach obok siebie (`--vendor all`)
- Tworzenie zasobów w dowolnym runtime, który ładuje umiejętności oma (Claude Code, Codex CLI, Antigravity, Cursor i inne)
- Pozwalanie innej umiejętności (design, marketing, docs) wywoływać pipeline obrazów jako współdzieloną infrastrukturę

## Kiedy NIE używać

- Edycja lub retusz istniejącego obrazu (poza zakresem; użyj dedykowanego narzędzia)
- Generowanie wideo lub audio (poza zakresem)
- Kompozycja inline SVG / wektorów z danych strukturalnych (użyj umiejętności szablonowej)
- Prosta zmiana rozmiaru / konwersja formatu (użyj biblioteki obrazów, a nie pipeline’u generatywnego)

---

## Vendory w skrócie

Umiejętność działa w modelu CLI-first: gdy natywne CLI vendora może zwrócić surowe bajty obrazu, ścieżka subprocesu ma pierwszeństwo przed bezpośrednim kluczem API.

| Vendor | Strategia | Modele | Wyzwalacz | Koszt |
|---|---|---|---|---|
| `pollinations` | Bezpośredni HTTP | Bezpłatne: `flux`, `zimage`. Wymagające kredytów: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | Ustawione `POLLINATIONS_API_KEY` (bezpłatna rejestracja pod https://enter.pollinations.ai) | Bezpłatne dla `flux` / `zimage` |
| `codex` | CLI-first przez `codex exec` (ChatGPT OAuth) | `gpt-image-2` | `codex login` (klucz API nie jest potrzebny) | Obciążają twój plan ChatGPT |
| `antigravity` | CLI `agy` przez subskrypcję Gemini Code Assist | Model wybiera wewnętrznie `agy` | Zainstalowane i zalogowane `agy` | Brak opłaty za obraz przez Code Assist |

Jak `--vendor` wybiera vendorów dla uruchomienia:

| `--vendor` | Uruchamiani vendorzy | Katalog wyjściowy | Kod wyjścia 5, gdy |
|---|---|---|---|
| `auto` (domyślnie) | każdy vendor, którego kontrola stanu przechodzi | `{timestamp}-{shortid}-compare/`, gdy uruchomi się co najmniej dwóch | żaden vendor nie jest sprawny |
| `all` | każdy włączony vendor | `{timestamp}-{shortid}-compare/`, gdy uruchomi się co najmniej dwóch | którykolwiek żądany vendor nie jest sprawny |
| `codex`, `pollinations` albo `antigravity` | ten vendor | `{timestamp}-{shortid}/` | ten vendor nie jest sprawny |

Wbudowany tryb vendora to `auto`: uruchamia równolegle **każdego** dostawcę, który przejdzie kontrolę stanu. Przekaż `--vendor pollinations`, aby pozostać na bezpłatnej ścieżce. Modele Pollinations `flux` i `zimage` są bezpłatne za obraz, ale nadal wymagają `POLLINATIONS_API_KEY`; Codex i Antigravity wymagają własnego logowania. Płatne szacunki nadal podlegają zabezpieczeniu wymagającemu potwierdzenia kosztu.

---

## Szybki start

Przed pierwszym generowaniem sprawdź, który dostawca jest gotowy, i uwierzytelnij jedną z obsługiwanych ścieżek:

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

Udane uruchomienie w trybie tekstowym wypisuje postęp w ten sposób (ścieżki są przykładowe):

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Użycie jako umiejętności

`oma-image` to umiejętność, która aktywuje się automatycznie z języka naturalnego i może być też wywołana jawnie. Istnieją trzy punkty wejścia.

### 1. Język naturalny (automatyczna aktywacja)

W dowolnym runtime, który ładuje umiejętności oma (Claude Code, Codex CLI, Antigravity, Cursor i inne), po prostu opisz obraz. Frazy takie jak „generate an image”, „make a picture”, „draw me …” czy „image of …” aktywują umiejętność; runtime'y dopasowujące umiejętności po opisie mogą też wybrać ją przy żądaniach w rodzaju „concept art” czy „hero shot”.

Nie musisz pamiętać flag CLI. Opisz potrzebę zwykłym językiem, a umiejętność przełoży ją na właściwe opcje:

| Mówisz | Umiejętność wnioskuje |
|---|---|
| "use codex" / "with gpt-image-2" / "free flux" | `--vendor codex` / `--vendor pollinations` |
| "compare across vendors" / "side by side" | `--vendor all` |
| "portrait" / "landscape" / "1024×1536" | `--size 1024x1536` / `--size 1536x1024` |
| "high quality" / "draft" | `--quality high` / `--quality low` |
| "three variations" / "give me 3" | `-n 3` |
| "save to ./hero" / "output to docs/assets" | `--output-dir <dir>` |
| Attached image + "make it nighttime" | `-r <attached path>` |
| "just estimate the cost" / "dry run" | `--dry-run` |

Przykłady:

> „Wygeneruj minimalistyczny wschód słońca nad górami jako hero strony lądowania, w orientacji poziomej i wysokiej jakości.”
> „Porównaj zdjęcie produktowe ceramicznego kubka u wszystkich vendorów, po trzy warianty z każdego.”
> „Użyj codex, aby nadać temu zdjęciu wydry dramatyczny i nocny charakter.” (z dołączoną referencją)

Agent [rozstrzyga brief](#clarification-protocol), uzupełnia luki wartościami domyślnymi i wywołuje `oma image generate` z wywnioskowanymi flagami. Użyj polecenia slash, jeśli chcesz jawnie kontrolować dokładne wartości flag.

### 2. Jawne polecenie slash

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Każda flaga CLI (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) działa w poleceniu slash i jest przekazywana do tego samego pipeline’u `oma image generate`.

### 3. Z innej umiejętności (współdzielona infrastruktura)

Inne umiejętności (design, marketing, docs) wywołują pipeline jako współdzieloną infrastrukturę z wyjściem JSON:

```bash
oma image generate "<prompt>" --output json
```

Przy `--output json` stdout zawiera jeden obiekt JSON `{exitCode, manifestPath, runs}`; każdy wpis w `runs` podaje swojego vendora, status i pliki wyjściowe. Pełny zapis znajdziesz w `manifestPath`. `--dry-run` wypisuje przed planem nagłówek tekstowy `[oma image] dry-run plan:`, więc pomiń tę linię podczas parsowania.

---

## Referencja CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### Najważniejsze flagi

| Flaga | Przeznaczenie |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity` albo `all`. Przy `all` każdy żądany vendor musi być sprawny (tryb ścisły). |
| `-n, --count <n>` | Liczba obrazów na vendora, 1–5 (ograniczenie czasu rzeczywistego). Domyślnie 1. |
| `--size <size>` | `WxH`, gdzie każda krawędź jest wielokrotnością 16 z zakresu od 16 do 3840, a proporcje mieszczą się między 1:3 a 3:1 (na przykład `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), albo `auto`. Domyślnie `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high` albo `auto` (domyślnie). |
| `--output-dir <dir>` | Katalog wyjściowy; pliki trafiają bezpośrednio do niego. Domyślnie `.agents/results/images/{timestamp}-{shortid}/`. Ścieżki poza `$PWD` wymagają `--allow-external-output`. |
| `--allow-external-output` | Zezwala na katalog wyjściowy poza `$PWD`. |
| `--model <name>` | Nadpisuje model dla **każdego** vendora w uruchomieniu, więc łącz ją z jednym `--vendor` (na przykład `--vendor pollinations --model zimage`). `antigravity` ignoruje tę opcję, ponieważ model wybiera `agy`. |
| `-r, --reference <path>` | Do 10 obrazów referencyjnych (PNG/JPEG/GIF/WebP, ≤ 5 MB każdy). Powtarzalne lub rozdzielone przecinkami. Obsługiwane przez `codex` i `antigravity`; odrzucane przez `pollinations`. |
| `-y, --yes` | Pomija pytanie o potwierdzenie kosztu dla uruchomień szacowanych na co najmniej `$0.20`. Dostępne także przez `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Zapisuje w `manifest.json` SHA-256 promptu zamiast jego surowego tekstu. |
| `--dry-run` | Wyświetla plan i szacowany koszt bez wydawania pieniędzy. |
| `--output text\|json` | Format wyjścia CLI. JSON jest powierzchnią integracji dla innych umiejętności. |
| `--timeout <duration>` | Limit czasu dla pojedynczego obrazu. Domyślnie 180 sekund. |

---

## Obrazy referencyjne

Dołącz maksymalnie 10 obrazów referencyjnych, aby pokierować stylem, tożsamością tematu albo kompozycją.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Vendor | Obsługa referencji | Sposób |
|---|---|---|
| `codex` (gpt-image-2) | Tak | Przekazuje `-i <path>` do `codex exec` |
| `antigravity` | Tak | Kopiuje referencje do katalogu przypisanego do uruchomienia i udostępnia je `agy` |
| `pollinations` | Nie | Odrzucane kodem wyjścia 4 (wymaga hostowania URL) |

### Gdzie znajdują się dołączone obrazy

- **Claude Code**: `~/.claude/image-cache/<session>/N.png`, wyświetlane w komunikatach systemowych jako `[Image: source: <path>]`. Są przypisane do sesji; skopiuj je do trwałej lokalizacji, jeśli chcesz wykorzystać je ponownie.
- **Antigravity**: katalog uploadu workspace (IDE pokazuje dokładną ścieżkę)
- **Codex CLI jako host**: muszą zostać przekazane jawnie; załączniki z rozmowy nie są przekazywane dalej

Gdy użytkownik dołącza obraz i prosi o wygenerowanie lub edycję obrazu na jego podstawie, wywołujący agent **musi** przekazać go przez `--reference <path>`, zamiast opisywać go w prozie. Jeśli lokalne CLI jest zbyt stare, aby obsługiwać `--reference`, uruchom `oma update` i spróbuj ponownie.

---

## Układ wyników

Domyślnie każde uruchomienie zapisuje wynik w `.agents/results/images/`, w katalogu z sygnaturą czasową i sufiksem hasha; przy `--output-dir` pliki trafiają bezpośrednio do wskazanego katalogu:

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` rejestruje vendora, model, prompt (albo jego SHA-256), rozmiar, jakość i koszt, dzięki czemu żądanie można prześledzić i powtórzyć. Nie wymusza identycznych pikseli u dostawcy działającego na żywo.

---

## Koszt, bezpieczeństwo i anulowanie

1. **Zabezpieczenie kosztowe**: uruchomienia szacowane na co najmniej `$0.20` proszą o potwierdzenie; bez interaktywnego terminala uruchomienie kończy się kodem 1 z komunikatem wskazującym `--yes`. Pomiń je przez `-y` lub `OMA_IMAGE_YES=1`. Bezpłatność gwarantuje tylko `--vendor pollinations` z `flux` / `zimage`; `auto` może objąć także zalogowany Codex.
2. **Bezpieczeństwo ścieżek**: ścieżki wyjściowe poza `$PWD` wymagają `--allow-external-output`, aby uniknąć nieoczekiwanych zapisów.
3. **Możliwość anulowania**: `Ctrl+C` (SIGINT/SIGTERM) przerywa każde wywołanie dostawcy będące w toku oraz cały orkiestrator.
4. **Stabilny zapis uruchomienia**: `manifest.json` jest zawsze zapisywany obok obrazów.
5. **Maksymalne `n` = 5**: to ograniczenie czasu rzeczywistego, a nie limit kwoty.
6. **Kody wyjścia**: zgodne z `oma search fetch`: `0` ok, `1` ogólny, `2` bezpieczeństwo, `3` nie znaleziono, `4` nieprawidłowe dane wejściowe, `5` wymagane uwierzytelnienie, `6` przekroczony czas.

---

## Jak agent rozstrzyga brief {#clarification-protocol}

Agent korzysta z tego, co powiedziałeś, a luki uzupełnia rozsądnymi kreatywnymi wartościami domyślnymi dla otoczenia, stylu, oświetlenia i proporcji. Pytanie zadaje tylko wtedy, gdy brakujący wybór istotnie zmieniłby wynik, i nie czeka na zatwierdzenie rozszerzonego promptu, gdy już poprosiłeś o generowanie. Jawne sformułowania, tekst na obrazie i intencja referencji pozostają bez zmian.

| Mówisz | Co się dzieje |
|---|---|
| „a red apple” | Obraz powstaje od razu; agent uzupełnia otoczenie, styl, oświetlenie i rozmiar |
| „a red apple as a flat vector icon, 512x512” | Twój styl i rozmiar są używane bez zmian |
| „something for the homepage” | Jedno pytanie o temat, ponieważ zmienia on wynik |

Aby zobaczyć dokładnie, co zostało wysłane do dostawcy, sprawdź pole `prompt` w `manifest.json` (przy `--no-prompt-in-manifest` zapisywane jako SHA-256).

---

## Konfiguracja

- **Konfiguracja projektu:** sekcja `image:` w `.agents/oma-config.yaml`. Starszy `config/image-config.yaml` nie jest już odczytywany.
- **Zmienne środowiskowe:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: nadpisuje skonfigurowanego domyślnego vendora (`auto`). Sama flaga `--vendor` domyślnie przyjmuje `auto`, więc gdy potrzebujesz konkretnego vendora, przekazuj `--vendor` w każdej komendzie.
  - `OMA_IMAGE_DEFAULT_OUT`: nadpisuje domyślny katalog wyjściowy
  - `OMA_IMAGE_YES`: `1`, aby pominąć potwierdzenie kosztu
  - `POLLINATIONS_API_KEY`: wymagane dla vendora pollinations (bezpłatna rejestracja)

---

## Rozwiązywanie problemów

| Objaw | Prawdopodobna przyczyna | Rozwiązanie |
|---|---|---|
| Kod wyjścia `5` (wymagane uwierzytelnienie) | Wybrany vendor nie jest uwierzytelniony | Uruchom `oma image doctor`, aby sprawdzić, który vendor wymaga logowania. Następnie wykonaj `codex login`, zaloguj się do `agy` albo ustaw `POLLINATIONS_API_KEY`. |
| Kod wyjścia `4` przy `--reference` | `pollinations` odrzuca referencje albo plik jest za duży / ma zły format | Przełącz na `--vendor codex` albo `--vendor antigravity`. Każda referencja musi mieć najwyżej 5 MB i format PNG/JPEG/GIF/WebP. |
| Nie rozpoznano `--reference` | Lokalne CLI jest nieaktualne | Uruchom `oma update` i spróbuj ponownie. Nie wracaj do opisu prozą. |
| Potwierdzenie kosztu blokuje automatyzację | Uruchomienie jest szacowane na co najmniej `$0.20` | Przekaż `-y` albo ustaw `OMA_IMAGE_YES=1`. Lepszym rozwiązaniem jest przełączenie na bezpłatny `pollinations`. |
| `--vendor all` natychmiast się zatrzymuje | Jeden z żądanych vendorów nie jest sprawny (tryb ścisły) | Zainstaluj brakującego vendora i zaloguj się do niego albo wybierz konkretny `--vendor`. |
| Wynik zapisano w nieoczekiwanym katalogu | Domyślnie jest to `.agents/results/images/{timestamp}-{shortid}/` | Przekaż `--output-dir <dir>`. Ścieżki poza `$PWD` wymagają `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (kod wyjścia 1) | `--output-dir` wskazuje miejsce poza projektem | Uruchom ponownie z `--allow-external-output` (komunikat nadal podaje starą nazwę flagi) albo wybierz katalog wewnątrz projektu. |
| Uruchomiło się kilku vendorów, a nazwa katalogu kończy się na `-compare` | `--vendor auto` uruchamia każdego sprawnego vendora | Przekaż jeden `--vendor`, aby uruchomić jednego vendora. |
| Antigravity kończy się błędem po przejściu kontroli stanu | `agy --version` potwierdza instalację, ale nie logowanie | Zaloguj się do Gemini Code Assist, a następnie spróbuj ponownie przez `oma image doctor` i `--vendor antigravity`. |

---

## Dalsze kroki

- [Generowanie wideo](./video-generation.md): `oma-video` używa `oma-image` jako dostawcy warstwy wizualnej
- [Workflowy treści i badań](./content-and-research.md): inne możliwości związane z treścią i ich wymagania wstępne
- [Umiejętności](../core-concepts/skills.md): dwuwarstwowa architektura umiejętności napędzająca `oma-image`
- [Polecenia CLI: image](../cli-interfaces/commands.md#image): pełna dokumentacja polecenia `oma image`
- [Opcje CLI](../cli-interfaces/options.md): globalna macierz opcji
