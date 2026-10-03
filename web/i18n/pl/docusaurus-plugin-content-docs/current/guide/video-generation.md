---
title: "Przewodnik: generowanie wideo"
sidebar_label: Generowanie wideo
description: Pełny przewodnik po generowaniu wideo oh-my-agent — routerze z trzema poziomami, opcjonalnym kluczem, który składa skrypt, narrację, wizualizacje, napisy i zarządzany kompozytor HyperFrames w odtwarzalne katalogi uruchomień dla trybów shorts, explainer i demo.
---

# Generowanie wideo

`oma-video` jest routerem wideo oh-my-agent. Z jednego krótkiego opisu składa skrypt, narrację, wizualizacje i napisy, a następnie zapisuje plan w katalogu uruchomienia. Etapy dostawców mogą działać bez kluczy i korzystać z lokalnych albo deterministycznych fallbacków; prawdziwy MP4 nadal wymaga działającego kompozytora i poprawnej kompozycji.

Umiejętność aktywuje się automatycznie przy słowach kluczowych takich jak *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough*, *screencast* albo gdy inna umiejętność potrzebuje wideo jako efektu ubocznego.

---

## Kiedy używać

- Zamiana krótkiego opisu, README, kodu albo danych w krótki klip.
- Tworzenie narracyjnego objaśnienia albo nagrania demo/walkthrough.
- Dowolny odtwarzalny potok „brief → `.mp4`”, który chcesz deterministycznie uruchamiać ponownie.

## Kiedy NIE używać

- Pojedyncze obrazy nieruchome → użyj [`oma-image`](/docs/guide/image-generation).
- Transmisja na żywo / streaming ekranu → poza zakresem (przechwytywanie jest nadzorowane, a nie strumieniowane).
- Samodzielny dźwięk narracji → użyj `oma-voice`.

---

## Tryby w skrócie

| Tryb | Proporcje | Co składa |
|------|--------|------------------|
| `shorts` | 9:16 | Pionowy klip krótkiej formy (skrypt → narracja → wizualizacje → napisy). |
| `explainer` | 16:9 | Poziome objaśnienie na podstawie README, kodu albo opisu danych. |
| `demo` | wyliczane | Walkthrough zbudowany z nagrania człowieka przekazanego przez `--capture`; `--source web --url` dostarcza kontekst dla nadzorowanego przechwytywania z widoczną przeglądarką i nigdy nie automatyzuje logowania. |

Tryb wybiera rozsądne wartości domyślne; gdy potrzebujesz innych, przekaż odpowiednie flagi.

---

## Szybki start

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Każde uruchomienie wypisuje swój katalog. Stały `--seed` stabilizuje deterministyczne dane wejściowe planowania; wynik dostawcy live i nagranie mogą nadal się różnić. Ponownie renderuj istniejący katalog uruchomienia, gdy chcesz użyć zapisanej specyfikacji renderowania i zasobów.

Inne narzędzia, które wywołują `oma video generate --output json`, parsują z stdout kopertę JSON: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. Nie ma klucza `outputs` — ścieżki wyników i zasobów odczytuj z manifestu pod `manifestPath`.

---

## Referencja CLI

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Główne flagi

| Flaga | Przeznaczenie |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Znacznik języka narracji i napisów. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (wyrównanie bez klucza). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Głos narracji albo `none` (domyślnie; pomiń, a wideo wyrenderuje się bez dźwięku z szacowanym czasem napisów). |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` albo `none`. |
| `--compositor <c>` | `hyperframes` (domyślnie) \| `mpt`. |
| `--capture <path>` | Ścieżka nagrania wejściowego dla trybu demo (`--source file`). |
| `--source <k>` | Źródło przechwytywania demo: `file` albo `web` (domyślnie: `file`). |
| `--url <url>` | Docelowy URL dla `--source web` (lokalny, staging albo produkcyjny); nie zastępuje `--capture`, gdy wymagane jest nagranie. |
| `--device <name>` | Ramka urządzenia dla przechwytywania web; nadpisuje rozmiar proporcji. |
| `--ready-selector <css>` | Selektor CSS, na który trzeba czekać przed przechwyceniem web. |
| `--show-cursor` | Nałóż widoczny kursor na przechwycenie web. |
| `--polish` | Nałóż kompozycję HyperFrames na przechwycone nagranie. |
| `--capture-timeout <sec>` | Twardy limit czasu przechwytywania web live. |
| `--capture-stop <mode>` | Nieinteraktywne zatrzymanie dla CI: `duration:<sec>` albo `selector:<css>`. |
| `--output-dir <path>` | Bazowy katalog wyjściowy. Ścieżki poza `$PWD` wymagają `--allow-external-output`. |
| `--allow-external-output` | Zezwól na ścieżki wyjściowe poza `$PWD`. |
| `--max-usd <n>` | Maksymalny szacowany koszt przed potwierdzeniem. |
| `--duration <sec>` | Docelowa długość albo `auto`. |
| `--seed <n>` | Deterministyczny seed. |
| `--dry-run` | Wygeneruj skrypt / render-spec / manifest, pomiń renderowanie. |
| `--script <path>` | Napisany przez agenta `script.json` do wstrzyknięcia (zastępuje szkielet; steruje narracją, tekstem na ekranie i promptami wizualnymi per scena). |
| `-y, --yes` | Pomiń prompt potwierdzenia kosztu. |
| `--timeout <duration>` | Limit czasu każdego wywołania dostawcy materiałów wizualnych lub muzyki, np. `90s` albo `2m`; liczba bez jednostki oznacza sekundy. |
| `--output <f>` | Wynik CLI: `text` (domyślnie) albo `json`. |
| `--no-brief-in-manifest` | Zapisz SHA-256 krótkiego opisu zamiast jego surowej treści. |

---

## Dostawcy opcjonalni względem klucza

Etapy dostawców rozstrzygają się do **rzeczywistej gałęzi** oraz, gdy etap ją obsługuje, do **deterministycznego fallbacku**. Brakujące klucze mogą więc pozostawić zaplanowane uruchomienie z szacowanym czasem albo lokalnymi zasobami. Kompozytor jest wymaganym etapem końcowym i nie ma zwykłego placeholdera:

| Możliwość | Rzeczywista gałąź | Fallback |
|------------|-------------|----------|
| script | LLM, gdy istnieje klucz | deterministyczny zarys z krótkiego opisu |
| voice | `oma-voice` (Voicebox, lokalnie) | szacowany czas, bez dźwięku |
| visual | `oma-image` / `oma-slide` / stock | zasób placeholdera |
| caption | wyrównanie wymuszone bez klucza | szacowany czas słów |
| capture | nadzorowane przechwytywanie web w przeglądarce (`--source web`) albo dostarczone nagranie (`--source file --capture`) | prowadzony protokół „nagraj samodzielnie” |
| compositor | HyperFrames (zarządzany) albo MoneyPrinterTurbo | brak fallbacku kompozytora; uruchomienie kończy się diagnostyką |

Brak automatyzacji poświadczeń: człowiek wykonuje każde logowanie na ekranie podczas przechwytywania; URL-e i tokeny zapytań są maskowane w logach i manifeście.

Napisy renderują się jako **statyczne okna cue** — pojedyncza linia napisów aktywna dla bieżącej klatki, zawijana przez CSS, bez animacji per słowo.

---

## Toolchain i `doctor`

Ciężki toolchain (zarządzany projekt HyperFrames z `node_modules`, osadzony font Pretendard, checkout MoneyPrinterTurbo, przeglądarki przechwytywania i Chrome Headless Shell) jest **dostarczany na żądanie**, a nie wysyłany w pakiecie. Zwykłe `doctor` działa tylko raportowo — niczego nie instaluje:

```bash
oma video doctor
```

Raportuje `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` i `cap`, a także podaje wskazówkę instalacji dla brakujących elementów. Wariant bazowy wymaga Node.js 22+, toolchainu HyperFrames wraz z jego przeglądarką Chrome, FFmpeg/FFprobe oraz `oma-image`. Prawdziwy MP4 wymaga też napisanego HTML.

Użyj flag instalacji, aby dostarczyć toolchain:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` pobiera także osadzony font Pretendard (przypięte wydanie) do współdzielonego cache toolchainu — należy to do granicy deterministyczności. Przy błędzie sieci ostrzega, a render przechodzi na fonty systemowe; różnice przeglądarki i systemu operacyjnego nadal mogą wpływać na zakodowany wynik.

---

## Układ wyniku

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

`render-spec.json` wraz z zasobami wyznacza granicę deterministyczności; przechwytywanie live jest zapisywane w manifeście jako `nondeterministic`.

---

## Rozwiązywanie problemów

| Objaw | Przyczyna / poprawka |
|---------|-------------|
| Nie powstaje MP4 | Kontrola kompozytora, kompozycji albo toolchainu nie powiodła się. Uruchom `oma video doctor`, następnie `oma video compose <runDir>` i popraw zgłoszoną kompozycję przed ponownym `oma video render <runDir>`. |
| Narracja jest cicha (`source: estimated`) | Voicebox jest niedostępny; uruchom serwer `oma-voice` albo zaakceptuj szacowany czas. |
| `--source web` wypisuje prowadzony protokół zamiast nagrania | Brak TTY albo niedostępny runtime przechwytywania przeglądarki → prowadzony fallback. Użyj interaktywnego terminala z dostarczonym runtime’em przechwytywania i `--capture-stop` albo przekaż nagrany plik przez `--capture`. |
| Render jest wolny przy pierwszym uruchomieniu | Przeglądarka HyperFrames / checkout MPT są dostarczane raz; kolejne uruchomienia ponownie używają cache. |

---

## Zawsze najnowszy HyperFrames — kompozycję piszesz Ty

oh-my-agent nie dostarcza **żadnego kodu kompozycji HyperFrames**. Każde uruchomienie dostaje własny projekt w `<runDir>/hyperframes/`, przygotowany przez `oma video compose` na najnowszym HyperFrames z npm (cache toolchainu `~/.cache/oma-video/hyperframes/<version>/`, współdzielony przez dowiązanie `node_modules`) z [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) pod HEAD (`~/.cache/oma-video/hyperframes-skills/`). Agent pisze źródło wygenerowanej kompozycji zgodnie z `AUTHORING.md` szkieletu, umiejętnościami i specyfikacją trybu w `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Kontrole najnowszej wersji (npm + GitHub) są ograniczane przez `video.hyperframes.check_interval_min` (domyślnie 60; `0` = przy każdym compose). `oma update` respektuje ten interwał; `oma video doctor --upgrade` wymusza kontrolę; uruchomienia offline używają cache toolchainu i zgłaszają `stale`.
- Odtwarzalność znajduje się w katalogu uruchomienia: `render-spec.json`, źródło napisanej kompozycji i wersja toolchainu zapisana w metadanych wygenerowanego pakietu HyperFrames. Ponowny render tego samego uruchomienia używa tego kontraktu renderowania; nowe uruchomienie sprawdza najnowszy HyperFrames.
- Błąd lintu albo renderowania **nie** jest ukrywany za placeholderem (istnieje on wyłącznie dla `OMA_VIDEO_MOCK=1`): `oma video render` kończy się kodem 1 i diagnostyką, a agent poprawia kompozycję przy użyciu najnowszych umiejętności. Uszkodzenie po nowym wydaniu HyperFrames jest błędem kompozycji, nigdy powodem do przypięcia wersji.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Powiązane

- [Workflow `/video`](/docs/core-concepts/workflows) — potok brief → skrypt → zasoby → render-spec → HyperFrames.
- [Generowanie obrazów](/docs/guide/image-generation) — router obrazów nieruchomych używany ponownie jako dostawca wizualizacji wideo.
