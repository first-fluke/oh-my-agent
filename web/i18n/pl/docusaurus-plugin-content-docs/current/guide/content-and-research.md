---
title: "Przewodnik: workflowy treści i badań"
sidebar_label: Przegląd
description: Wybierz właściwą ścieżkę oh-my-agent wraz z jej wymaganiami wstępnymi do ekstrakcji PDF i HWP, głosu, badań naukowych i internetowych, slajdów, obrazów, wideo, objaśnień kodu, diagramów, badań rynku, recapów, tłumaczeń i pisania akademickiego.
---

# Workflowy treści i badań

Ten przewodnik kieruje pracę nad dokumentami, dźwiękiem, badaniami, multimediami i prezentacjami do właściwej możliwości. Zacznij od artefaktu, którego potrzebujesz, a następnie użyj najmniejszego polecenia albo punktu wejścia umiejętności, który tworzy wynik możliwy do przejrzenia. Możliwości z własnym przewodnikiem linkują do niego w ostatniej kolumnie; pozostałe opisano na tej stronie.

| Potrzeba | Punkt wejścia | Wymagania wstępne | Pierwszy wynik | Przewodnik |
|---|---|---|---|---|
| Wyodrębnij PDF | umiejętność `oma-pdf` albo pokazane niżej polecenia `uvx opendataloader-pdf` | `uv` (dla `uvx`) | Markdown, tekst, JSON albo krótki raport ekstrakcji | [niżej](#extract-pdf-content) |
| Wyodrębnij HWP/HWPX/HWPML | umiejętność `oma-hwp` i `bunx kordoc@latest` | Bun | Markdown albo ustrukturyzowany JSON/chunki | [niżej](#extract-hwp-family-documents) |
| Mów albo transkrybuj dźwięk | `/oma-voice` | Aplikacja Voicebox na `127.0.0.1:17493` lub VoiceStudio na `127.0.0.1:3900` | Dźwięk z manifestem albo `transcript.md` z manifestem | [niżej](#generate-speech-or-transcribe-audio) |
| Znajdź i zweryfikuj artykuły | `oma scholar` | brak; opcjonalnie `S2_API_KEY`, `OPENALEX_EMAIL` | Wyniki wyszukiwania, pobrany sidecar albo raport lint | [niżej](#search-and-validate-scholarly-material) |
| Przeszukaj sieć albo pobierz stronę | umiejętność `oma-search`, `oma search` | opcjonalnie Chrome, Python `curl_cffi`, `yt-dlp`, `gh` (sprawdź przez `oma search doctor`) | JSON na stdout | [Polecenia CLI: search](../cli-interfaces/commands.md#search) |
| Zbuduj prezentację | umiejętność `oma-slide` i `oma slide` | Chrome albo `OMA_CHROME_PATH` | Zweryfikowane slajdy HTML i opcjonalne eksporty | [niżej](#slides-and-presentations) |
| Wygeneruj obrazy | umiejętność `oma-image`, `oma image generate` | jedno z: `POLLINATIONS_API_KEY`, `codex login` albo zalogowany `agy` | Obrazy z `manifest.json` w `.agents/results/images/` | [Generowanie obrazów](./image-generation.md) |
| Zrób krótkie wideo, wideo objaśniające albo demo | `/video`, `oma video` | Node.js 22+, FFmpeg, a następnie `oma video doctor --install` | Katalog uruchomienia w `.agents/results/videos/`; plik MP4 po `oma video render` | [Generowanie wideo](./video-generation.md) |
| Objaśnij zmianę albo temat na jednej stronie | `/explain`, `oma explain` | git w trybie zmian; `gh` dla odwołań do PR | Samodzielny HTML w `.agents/results/explain/` | [Objaśnianie kodu](./code-explainer.md) |
| Interaktywny diagram architektury | `/architecture`, `oma diagram` | brak; archify jest pobierany przy pierwszym użyciu | Blok Mermaid oraz `.archify.html`, gdy archify zostanie rozstrzygnięty | [Silnik diagramów](./diagram-engine.md) |
| Badanie rynku w społecznościach | umiejętność `oma-market`, `oma market` | Python 3.12+ | Raport w `.agents/results/market/` | [Badania rynku](./market-research.md) |
| Podsumuj rozmowy agentów | `/recap`, `oma recap` | brak | JSON recapu z CLI; datowany recap Markdown z `/recap` | [niżej](#recap-agent-conversations) |
| Przetłumacz albo przejrzyj lokalizowaną prozę | umiejętność `oma-translation` | brak | Tekst w języku docelowym albo przegląd oparty na dowodach | [niżej](#translate-or-review-localized-content) |
| Napisz albo skontroluj prozę akademicką | umiejętność `oma-academic-writing` | brak | Draft, poprawiona wersja albo raport zgodności z Claim-Evidence Map | [niżej](#draft-or-audit-academic-writing) |

Nazwy poleceń `oma` na tej stronie są zarejestrowanymi poleceniami publicznymi. `uvx`, `bunx` i `bun` to zewnętrzne narzędzia konwersji opisane przez ich właścicielskie umiejętności. Pozostałe [umiejętności](../getting-started/glossary.md#skill) są punktami wejścia w języku naturalnym albo poleceniami slash; nie ma samodzielnych poleceń `oma pdf`, `oma hwp`, `oma voice`, `oma translation` ani `oma academic-writing`.

## Wyodrębnij treść PDF {#extract-pdf-content}

Użyj umiejętności `oma-pdf`, gdy wejściem jest PDF, a wynik ma mieć czytelną strukturę dla człowieka, LLM-a albo potoku retrieval. Umiejętność sprawdza warstwę tekstową przed wyborem standardowej, tagowanej albo hybrydowej ekstrakcji OCR.

Aby szybko sprawdzić warstwę tekstową, wypisz niewielki zakres stron bez tworzenia pliku wynikowego:

```bash
uvx opendataloader-pdf "<input.pdf>" -f text --pages 1-3 --to-stdout -q
```

Aby wyodrębnić i znormalizować Markdown:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf "<input.pdf>" --format markdown --output-dir "$OUT"
uvx mdformat "$OUT/<document>.md"
```

Dla dużych dokumentów wybierz zakres stron przez `--pages`. Jeśli warstwa tekstowa jest czytelna, pozostań przy ekstrakcji standardowej. Jeśli istnieje struktura tagowana, ale kolejność czytania jest zła, ponów próbę z `--use-struct-tree`; przy uszkodzonych tabelach wypróbuj `--table-method cluster` albo `--markdown-with-html` przed przejściem do OCR.

W przypadku zeskanowanego albo opartego na obrazach PDF najpierw uruchom serwer hybrydowy, a następnie konwerter hybrydowy:

```bash
# Terminal 1: leave this local server running while the conversion runs.
uvx --from "opendataloader-pdf[hybrid]" opendataloader-pdf-hybrid \
  --port 5002 --force-ocr --ocr-lang "ko,en"
```

W drugim terminalu zdefiniuj katalog wyniku i uruchom konwerter:

```bash
OUT=".agents/results/pdf/<document>"
uvx opendataloader-pdf --hybrid docling-fast --hybrid-mode full \
  "<input.pdf>" --format markdown --output-dir "$OUT"
```

Udanym artefaktem jest plik Markdown albo tekstowy w wybranym katalogu wyniku, wraz z liczbą stron i ewentualnymi uwagami jakościowymi. Zaszyfrowane PDF-y wymagają odblokowanej kopii albo hasła. Duże pliki mogą wymagać osobnych zakresów stron i katalogów wyników, aby kolejne uruchomienia nie nadpisywały tej samej nazwy bazowej. Nie traktuj zgadywania OCR jako faktów źródłowych; zgłaszaj niepewne albo brakujące tabele.

## Wyodrębnij dokumenty z rodziny HWP {#extract-hwp-family-documents}

Użyj `oma-hwp` dla plików `.hwp`, `.hwpx` i `.hwpml`. Uruchamia `kordoc` przez Bun, a następnie w razie potrzeby przetwarza tabele Markdown i glify z obszaru Private Use Area.

```bash
OUT=".agents/results/hwp/<document>.md"
bunx kordoc@latest "<input.hwp>" -o "$OUT"

# The skill's cleanup helper; set this to the project or global oma-hwp skill directory.
HWP_SKILL_DIR=".agents/skills/oma-hwp"
bun "$HWP_SKILL_DIR/resources/flatten-tables.ts" "$OUT"
```

W świeżym klonie helper może zgłosić `Cannot find module "turndown"`; uruchom `bun install` w katalogu umiejętności `oma-hwp`, w jego `resources/`, a następnie uruchom helper ponownie.

Dla partii użyj jawnego katalogu wynikowego:

```bash
bunx kordoc@latest "./incoming/*.hwpx" -d ".agents/results/hwp"
```

Domyślny wynik to Markdown. Dla ustrukturyzowanego AST użyj `bunx kordoc@latest "<input.hwp>" --format json`; dla fragmentów do retrieval użyj `--format chunks`. Opcje konwersji `--dedupe-headers`, `--keep-empty-cols` i `--inline-images` obsługują typowe przypadki tabel i obrazów. Przed przekazaniem wyniku innej umiejętności sprawdź nagłówki, tabele zagnieżdżone i scalone, listy, obrazy, przypisy i linki.

`bun` i `bunx` są wymaganiami wstępnymi. Pusty wynik może oznaczać treść zeskanowaną jako obraz; skieruj ten przypadek do workflowu obsługującego OCR. Materiał zaszyfrowany albo ograniczony DRM może pozostać niekompletny. Wejścia PDF, DOCX i XLSX należą do odpowiadających im umiejętności, choć `kordoc` ma też inne podpolecenia do tworzenia i parsowania.

## Generuj mowę lub transkrybuj audio {#generate-speech-or-transcribe-audio}

`oma-voice` jest natywne dla MCP i używa lokalnego serwera Voicebox. Wywołaj je w agencie poleceniem slash:

```text
/oma-voice "The build is ready for review."
/oma-voice --profile prof_warm_korean "다음 단계 진행 준비됐어요"
/oma-voice transcribe ~/Downloads/standup.m4a
```

TTS przyjmuje do 5 000 znaków na wywołanie i wymaga profilu głosu Voicebox. Transkrypcja nie wymaga profilu TTS i przyjmuje dźwięk do 30 minut. Trwałe zadania TTS i STT zapisują się pod `.agents/results/voice/`; transkrypcja tworzy `transcript.md` i `manifest.json`. Tryb powiadomień zwykle pozostaje w Voicebox Captures i nie zapisuje lokalnego pliku audio.

Lokalny endpoint MCP to `http://127.0.0.1:17493/mcp`. Konfiguracja pierwszego użycia rejestruje Voicebox w agencie, a aplikacja desktopowa Voicebox dostarcza profile głosu. Umiejętność odkrywa rzeczywiste nazwy narzędzi MCP za pomocą `tools/list`, a następnie wywołuje `voicebox_speak`, `voicebox_transcribe` albo `voicebox_list_profiles`. Jeśli TTS nie ma profilu, utwórz albo wybierz go w Voicebox; podział zbyt długiego żądania jest decyzją użytkownika, ponieważ umiejętność nie dzieli go automatycznie na fragmenty. Jeśli serwer jest niedostępny, sprawdź lokalny endpoint zdrowia i uruchom ponownie Voicebox przed ponowieniem próby.

Aby zamiast tego używać [VoiceStudio](https://github.com/debpalash/VoiceStudio), ustaw `voice.backend` w `.agents/oma-config.yaml` na `voicestudio` albo pozostaw `auto`, aby VoiceStudio był używany zawsze, gdy Voicebox nie działa. Umiejętność ładuje nadrzędną umiejętność `voicestudio`, używa identyfikatorów profili VoiceStudio i pyta przed sklonowaniem lub zaprojektowaniem głosu albo pobraniem modelu. Narracja `oma video` korzysta z tego samego ustawienia.

## Wyszukuj i waliduj materiały naukowe {#search-and-validate-scholarly-material}

Użyj CLI `oma scholar` do sidecarów Knows i metadanych artykułów. Search i resolve służą do odkrywania; `get` pobiera rekord albo wybraną sekcję; `lint` jest bramką udostępnienia.

```bash
oma scholar search "vision language action" --limit 10
oma scholar search --year-min 2024 "vision language action"
oma scholar resolve "Attention Is All You Need"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar lint paper.knows.yaml
oma scholar lint --lenient paper.knows.yaml
oma scholar lint --fail-on-warning paper.knows.yaml
```

Najpierw próbowany jest Knows, z zapasowymi OpenAlex i Semantic Scholar. `--section` może żądać `statements`, `evidence`, `relations`, `artifacts` albo `citation`. Użyj `--lenient`, gdy podczas lokalnego składania oczekiwane są wiszące odwołania między rekordami; użyj `--fail-on-warning` dla ścisłej bramki CI. Wynik wyszukiwania albo pobrany sidecar jest dowodem odkrycia, a nie twierdzeniem, że artykuł wspiera każdy wniosek. Wygeneruj albo popraw sidecar w agencie, a następnie przed udostępnieniem uruchom `oma scholar lint`.

Jeśli zdalna usługa przekroczy limit czasu, ponów szersze zapytanie albo pozwól CLI użyć zapasowej ścieżki; `--always-fallback` odpytuje OpenAlex i Semantic Scholar nawet wtedy, gdy Knows zwraca trafienia. Kod 429 z Semantic Scholar może oznaczać limit anonimowej puli; spróbuj później albo ustaw `S2_API_KEY`. Ustaw `OPENALEX_EMAIL` (i opcjonalnie `OPENALEX_API_KEY`), aby identyfikować swoje żądania do OpenAlex. Jeśli sidecar ma błąd enumu pochodzenia, użyj `tool`, `person` albo `org`; jeśli pozostają ostrzeżenia o gęstości relacji, dodaj wspierane relacje dowodowe tylko tam, gdzie pozwala na to źródło.

## Slajdy i prezentacje {#slides-and-presentations}

Użyj `oma-slide`, gdy wynikiem ma być prezentacja na stałym obszarze. Umiejętność autorska zapisuje fragmenty HTML w rozdzielczości 1920×1080; CLI sprawdza geometrię, scala deck i eksportuje go.

```bash
DECK_DIR=".agents/results/slides/<session-id>"
oma slide create --output-dir "$DECK_DIR"
# author slide-01.html and meta.json in "$DECK_DIR"
oma slide validate --workspace "$DECK_DIR" --output json
oma slide preview --workspace "$DECK_DIR"
oma slide bundle --workspace "$DECK_DIR"
```

Eksportuj dopiero po walidacji:

```bash
oma slide export pdf --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pdf" --mode capture
oma slide export png --workspace "$DECK_DIR" --output-dir "$DECK_DIR/out/png" --resolution 1080p
oma slide export pptx --workspace "$DECK_DIR" --output-file "$DECK_DIR/out/deck.pptx"
```

Użyj `--slide <file>` do kontroli pojedynczego slajdu i `--report-file <path>` z wynikiem JSON, gdy inny proces potrzebuje ustaleń. `slide import pptx <file>` rozpoczyna workflow importu; `slide asset fetch-video <url>` pobiera zasób wideo; `slide style list|preview|get <slug>` sprawdza style. Wynik PPTX jest oparty na rastrze, więc nie dostarcza edytowalnego tekstu ani warstw kształtów. Walidacja i eksport wymagają Chrome/puppeteer; ustaw `OMA_CHROME_PATH`, gdy plik wykonywalny nie jest znajdowany. Jeśli po trzech iteracjach automatycznych napraw walidacja nie osiągnie zbieżności, użyj zgłoszonych ustaleń geometrii do edycji właściwego fragmentu.

## Odtwarzaj rozmowy agentów {#recap-agent-conversations}

Użyj `/recap` (albo poproś agenta o recap) do podsumowań pracy opartych na dowodach; uruchamia on `oma recap`, aby zebrać historię. Data kalendarzowa i okno kroczące są różnymi wejściami:

```bash
# A calendar day
oma recap --date "$(date +%F)" --json

# A rolling 24-hour window ending now
oma recap --json

# A rolling multi-day window, capped at 30 days
oma recap --window 7d --tool claude,codex --json
```

Te polecenia wypisują zebraną historię (domyślnie jako tekst w terminalu, jako JSON z `--json` albo jako wykres Gantta Mermaid z `--mermaid`), a `--graph` zamiast tego otwiera interaktywny graf w przeglądarce; samo CLI nie zapisuje żadnego pliku. `/recap` zapisuje recap Markdown w `.agents/results/recap/`, zwykle jako `{date}.md` dla dziennego recap albo `{start-date}~{end-date}.md` dla zakresu. Recap grupuje wpisy według treści pracy, osobno oznacza pracę żądaną i w toku względem ukończonej oraz zapisuje brakującą historię narzędzi. Użyj `--top` albo `--sort`, gdy raport potrzebuje węższego widoku. Jeśli CLI jest niedostępne, umiejętność może użyć udokumentowanej ścieżki awaryjnej historii Claude, ale trzeba podać ograniczone pokrycie źródła.

Użyj `oma retro` do retrospektywy inżynieryjnej opartej na Git. Odpowiada na inne pytanie niż recap rozmów i może porównywać sąsiednie okna przez `--compare`.

## Tłumacz albo przeglądaj lokalizowaną treść {#translate-or-review-localized-content}

Użyj `oma-translation` dla stringów UI, dokumentacji, raportów, copy marketingowego albo prozy akademickiej. Wywołaj ją w języku naturalnym albo przez punkt wejścia `/oma-translation`; nie ma publicznego polecenia `oma translation`.

Przekaż umiejętności źródło, locale docelowe, typ treści oraz informację, czy zadanie jest tłumaczeniem, przeglądem czy synchronizacją diffu ze źródłem. Gdy istnieje pasujący profil językowy w zasobach umiejętności, zostanie załadowany; umiejętność zachowuje placeholdery, linki, strukturę Markdown i chronioną składnię oraz korzysta z tłumaczeń rodzeństwa projektu i glosariusza. Dla długiego dokumentu albo przeglądu stosuje też rubrykę tłumaczeniową. Gdy brakuje profilu docelowego, używa wspólnych reguł i raz zgłasza to ograniczenie.

W dokumentacji tłumacz stabilną stronę angielską po ustaleniu jej kotwic i przykładów poleceń. Zachowaj nazwy CLI, flagi, ścieżki, zmienne środowiskowe i bloki kodu dokładnie; przetłumacz otaczające wyjaśnienia i porównaj strukturę strony docelowej z angielską. Niejednoznaczne znaczenie źródła należy zgłosić, zamiast po cichu zgadywać.

## Pisz albo kontroluj tekst akademicki {#draft-or-audit-academic-writing}

Użyj `oma-academic-writing` do angielskich esejów, raportów, przeglądów literatury, analiz, podsumowań kierowniczych, zakończeń i rewizji. Wybierz jeden tryb i podaj rubrykę albo ograniczenia źródła:

```text
Draft a literature review in draft mode from these sources. Include a Claim-Evidence Map.
Revise this section in revise mode against the quoted rubric below.
Review this draft in review mode and return the compliance report with recommended fixes.
```

`draft` zwraca prozę, Writing Notes i Claim-Evidence Map. `revise` zwraca oryginalne i poprawione fragmenty wraz z konkretnymi zmianami. `review` zwraca ustalenia PASS/FAIL dotyczące struktury zdań, czasowników, hedgingu, szczegółowości, wzorców anti-AI, jasności akapitów, rytmu i zgodności twierdzeń z dowodami. Umiejętność czyta istniejący draft w całości w trybie revise/review, osłabia albo usuwa twierdzenia bez poparcia, a nieangielski wynik przekazuje do `oma-translation` po przejściu angielskiej wersji.

Użyj `oma scholar` do odkrywania źródeł i dowodów sidecara przed pisaniem. Jeśli brakuje cytowania albo rubryki, oznacz twierdzenie jako oczekujące albo poproś o brakujące ograniczenie; nie uzupełniaj luki wymyślonym źródłem. Wartościowym artefaktem ukończenia jest proza wraz z mapą dowodów albo raportem audytu, a nie ogólnie „wygładzony” akapit bez śledzalnego poparcia.

## Lista kontrolna odzyskiwania {#recovery-checklist}

| Objaw | Następne działanie |
|---|---|
| Wynik jest pusty albo strukturalnie uszkodzony | Sprawdź typ wejścia, a następnie wybierz tryb tagowany, tabelaryczny albo OCR dla PDF; w HWP sprawdź Bun i zobacz, czy źródło nie zawiera wyłącznie stron obrazowych. |
| Lokalna umiejętność nie może się połączyć | Sprawdź lokalną usługę albo CLI właściciela (`Voicebox`, `Chrome`, `uvx`, `bunx`) przed zmianą żądania treści. |
| Wynik badania jest ubogi | Poszerz zapytanie, sprawdź status zapasowego źródła i zachowaj niepewność w raporcie. |
| Eksport slajdu nie działa | Uruchom `oma slide validate --workspace <dir> --output json`, popraw ustalenia geometrii albo fontu, a następnie eksportuj ponownie. |
| Recap zawyża stopień ukończenia | Ponownie sprawdź pokwitowania i artefakty; sam prompt albo wywołanie narzędzia nie jest dowodem ukończenia. |
| Tłumaczenie zmienia składnię kodu | Przywróć chronione nazwy i ponownie uruchom kontrole struktury przed oceną jakości prozy. |
| Proza akademicka zawiera twierdzenia bez poparcia | Usuń albo osłab twierdzenie, dodaj dowody przez ścieżkę scholar i ponownie uruchom Claim-Evidence Map. |

## Następne kroki

- [Generowanie obrazów](./image-generation.md), [Generowanie wideo](./video-generation.md), [Objaśnianie kodu](./code-explainer.md), [Silnik diagramów](./diagram-engine.md) i [Badania rynku](./market-research.md) — przewodniki po możliwościach z powyższej tabeli
- [Polecenia CLI](../cli-interfaces/commands.md) i [Opcje CLI](../cli-interfaces/options.md) — pełne zarejestrowane ścieżki CLI i aliasy opcji
- [Konfiguracja referencyjna](./configuration-reference.md) — sekcje konfiguracji `pdf`, `hwp`, `voice` i `scholar`
