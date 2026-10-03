---
title: "Optymalizacja umiejętności"
sidebar_label: Optymalizacja umiejętności
description: Jak używać oma skill optimize do trwałego rozwoju umiejętności opartego na dowodach, z deterministycznymi bramkami zbiorów train, validation i holdout należących do runnera.
---

# Optymalizacja umiejętności

`oma skill optimize` rozwija `SKILL.md`, aby zmaksymalizować zmierzone `utilityLift` uzyskane przez `oma skill eval`. Rozdziela surowe dowody rolloutów, trwałą wiedzę o ograniczonym zakresie i wykonywalną umiejętność. Wiki Maintainer konsoliduje obserwowalne sukcesy i porażki, a Proposer wykorzystuje tę wiedzę do tworzenia ograniczonych edycji typu add/delete/replace. Kandydaci muszą poprawić użyteczność na partycji train lub validation bez regresji w żadnej z nich, przy kompletnych pomiarach zadań i negative transfer. `--apply` wymaga też w pełni zmierzonego finalnego testu należącego do runnera, bez regresji, oraz zweryfikowanej izolacji live. W czasie wdrożenia nie ma dodatkowego wyszukiwania w wiki podczas inferencji: wynikiem pozostaje `SKILL.md`.

Podstawa badawcza: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

Optymalizacja z poziomu CLI wymaga obecnie `--live` i powoduje wywołania modeli. Ścieżka domyślna/nie-live oraz `--mock` nie mogą generować ani odtwarzać propozycji, ponieważ loader zapisanych propozycji nie jest zaimplementowany; zatrzymują się przed ewaluacją. Do odtwarzania offline użyj `oma skill eval --mock`. Wstrzykiwane API optymalizatora/scorera pozostają dostępne dla testów offline. Podanie jednocześnie `--live` i `--mock` jest błędem.

---

## Twarda zależność: fixture’y zadań ewaluacyjnych

`oma skill optimize` nie może działać bez fixture’ów zadań ewaluacyjnych. Wymaga co najmniej **5 fixture’ów zadań** (`MIN_TASKS = 5`) w `.agents/eval/<skill>/`. Gdy znajdzie ich mniej, polecenie natychmiast zgłasza błąd:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

Zobacz [przewodnik po ewaluacji użyteczności umiejętności](/docs/guide/skill-eval), aby poznać konwencję katalogu `.agents/eval/<skill>/`, schemat fixture’a, typy checkerów i sposób przygotowania rolloutów do odtwarzania mock.

Promocja wymaga też niepustego zbioru zadań sąsiednich z tej samej domeny, należących do innych umiejętności. Każdy wynik walidacyjny kandydata i końcowy wynik kandydata muszą mierzyć sąsiadów ocenianej partycji z użyciem dokładnego ciała kandydata. Brakujący sąsiedzi lub niekompletne sparowane nagrania nie mogą wykazać braku negative transfer. Ewaluacja offline może odtworzyć tylko pasujące nagrania kandydata; do wygenerowania i oceny nowych kandydatów użyj optymalizacji live.

Odtwarzanie i wiedza o zakresie zestawu są powiązane z pełnym kontraktem zadania/ewaluatora, w tym z efektywną domyślną rubryką sędziego i rewizją protokołu scorera. Starsze nagrania i wcześniejsze zakresy wiedzy wymagają świeżych dowodów po tej aktualizacji pochodzenia; przypisanie starym wynikom nowych skrótów nie daje prawidłowego pomiaru.

---

## Jak to działa

Fixture’y są sortowane po ID zadania i deterministycznie dzielone na zbiory **train**, **held-out validation** oraz **runner-owned final-test**. Przy co najmniej pięciu fixture’ach docelowe proporcje to 60/20/20, a każda partycja ma co najmniej jedno zadanie. Na przykład osiem fixture’ów daje po zaokrągleniu cztery zadania train, jedno validation i trzy final-test. Fixture’y deklarujące tę samą `group` są przypisywane razem, więc przeformułowane bliźniacze zadanie nie może trafić do train, podczas gdy oryginał trafia do finalnego testu; przy mniej niż trzech grupach podział wraca do ID zadań i zgłasza ostrzeżenie. Zadania final-test pochodzą z lokalnego zestawu fixture’ów i są ukryte przed Maintainerem i Proposerem. Zduplikowane ID zadań final-test oraz nakładanie się na podział rozwojowy są odrzucane.

Dla każdej epoki (do `--max-epochs`, domyślnie 8):

1. **Oceń bieżące najlepsze `SKILL.md` na partycji TRAIN** — `oma skill eval` zwraca obserwowalne prompty, wyniki i przyrosty per zadanie. Każde zadanie w wewnętrznym podziale musi mieć oba ocenione ramiona; nieudane lub brakujące porównania nie mogą zmniejszyć mianownika.
2. **Wiki Maintainer konsoliduje dowody** — do pięciu porażek i trzech sukcesów staje się wzorcami powiązanymi z dowodami. Porażki są wybierane według wartości uczącej: najpierw regresje, potem najgłębsze wspólne porażki; zadania, które oba ramiona już zaliczają, są pomijane, ponieważ nic nie mówią o następnej edycji. Sukcesy są szeregowane według przyrostu. Wzorce ograniczone zakresem i wcześniejsze wyniki bramek są przywoływane z systemu pamięci OMA L1/L2/L3.
3. **Proposer emituje K edycji kandydata** (do `--edits-per-epoch`, domyślnie 4). Dokładne edycje obecne już w trwałej historii odrzuceń są pomijane.
4. **Dla każdej edycji kandydata:**
   - Zastosuj edycję do kopii `SKILL.md` przechowywanej w pamięci.
   - Zweryfikuj kandydata (frontmatter `name`/`description` musi przetrwać; body musi dać się sparsować).
   - Wymuś tekstowy budżet learning rate: odrzuć edycje, których łączna zmiana liczby znaków przekracza `--lr` (domyślnie 600 znaków).
   - Ponownie oceń każde zadanie w **wydzielonej partycji validation** (ze sparowanymi porównaniami wariantu bazowego i kandydata na zadaniach sąsiednich) oraz każde zadanie w **partycji treningowej held-in** (bez porównań na zadaniach sąsiednich).
5. **Zaakceptuj najlepszego prawidłowego kandydata** według reguły held-in/held-out: kandydat nie traci niczego w żadnej z partycji (`Δval ≥ 0` i `Δtrain ≥ 0`) i zyskuje w co najmniej jednej z nich. Kandydaci są szeregowani według `Δval + Δtrain`. Ścisły zysk walidacyjny nie jest wymagany, ponieważ ciało, które już zalicza każde zadanie walidacyjne, nadal może zostać naprawione na porażce treningowej bez utraty wyników na zbiorze held-out; to finalny test rozstrzyga, czy ta naprawa się uogólnia. Pokrycie zadań musi być kompletne, niepusta próbka negative-transfer musi być w pełni zmierzona, a żaden sąsiad nie może wykazywać potwierdzonej regresji na poziomie `NEG_TRANSFER_FAIL = -0.1` lub niższym. W uruchomieniach live sąsiad, który wykaże regresję w pierwszym sparowanym porównaniu, jest mierzony ponownie raz; zapisana delta jest średnią z obu porównań, a kandydata odrzuca tylko odtworzona regresja (`confirmed: true`). Odtworzenia mock nie mogą mierzyć ponownie, więc regresja z pojedynczej próby pozostaje w mocy. Raporty live muszą deklarować `isolation: "enforced"`. Wyniki bramek propozycji są zapisywane z `deltaLift` (validation), `deltaTrainLift` i deltami sąsiadów stojącymi za werdyktem.
6. **Zatrzymaj się wcześniej** po 2 kolejnych epokach bez zaakceptowanej edycji (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Po ewolucji uruchom finalny test należący do runnera.** Zarówno oryginalne ciało, jak i zwycięzca walidacji muszą obejmować każde zadanie final-test. Kandydat nie może stracić przyrostu w finalnym teście (`candidateLift >= baselineLift`; zysk, za który został zaakceptowany, został już wykazany na podziałach rozwojowych, a ścisły zysk na małym zamrożonym teście uniemożliwiłby wypromowanie większości napraw) i musi przejść kolejną, kompletną kontrolę negative-transfer specyficzną dla kandydata. `finalTest.findings` wylicza przyrost per zadanie dla oryginalnego ciała i kandydata, aby nieudany test można było odczytać jako rzeczywistą regresję albo pojedyncze zaszumione zadanie. Brakujące, niekompletne lub nieudane finalne testy uniemożliwiają promocję. Zmierzone porażki finalne pozostają zapisami audytowymi i nie stają się wiedzą o odrzuceniach dla późniejszej optymalizacji.

Podczas pętli optymalizator pracuje na kopii kandydata przechowywanej w pamięci.

Niezmierzeni kandydaci są zapisywani jako `inconclusive`, z powodami takimi jak `insufficient-coverage`, `negative-transfer-unmeasured` lub `unverified-isolation`. Są wyłączeni z wyuczonej historii odrzuceń i pozostają kwalifikowalni do ponowienia po naprawie warunków ewaluacji. Potwierdzona regresja sąsiada, strata w którejkolwiek z partycji (`split-regression`) albo brak zysku w żadnej z partycji (`no-validation-lift`) jest odrzuceniem. Diagnostyki wskazujące na niekompletną ewaluację lub zdegradowaną pracę Maintainera blokują promocję.

---

## Użycie

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Flagi

| Flaga | Wartość domyślna | Opis |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | ID umiejętności do optymalizacji (prosta nazwa, bez separatorów ścieżki). |
| `--dry-run` | **tak (domyślnie)** | Zaproponuj edycje i wypisz diff bez zmiany `SKILL.md`; wygenerowane dowody i zdarzenia ewolucji są nadal zapisywane. |
| `--apply` | — | Zapisz zwalidowanego kandydata po przejściu wszystkich bramek promocji, w tym kompletnych dowodów finalnego testu i negative transfer; przed atomowym zapisem utwórz kopię oryginału. Umiejętność należąca do OMA wymaga również `--yes`. |
| `--mock` | Domyślnie nie-live | Odtwarzanie propozycji w CLI nie jest zaimplementowane, więc ta ścieżka zatrzymuje się przed ewaluacją. Do odtwarzania ewaluacji offline użyj `oma skill eval --mock`. |
| `--live` | — | Wymagane przy obecnej optymalizacji z poziomu CLI. Powoduje rzeczywiste wywołania modeli; wypisuje podgląd kosztu i pyta o potwierdzenie, chyba że podano `--yes`. |
| `--max-epochs <n>` | `8` | Maksymalna liczba epok optymalizacji. |
| `--edits-per-epoch <k>` | `4` | Liczba edycji kandydata proponowanych przez LLM optymalizatora w każdej epoce. |
| `--lr <chars>` | `600` | Tekstowy budżet learning rate: maksymalna łączna zmiana znaków dla jednej zaakceptowanej edycji. |
| `--yes` | — | Pomiń potwierdzenie podglądu kosztu live i potwierdź zachowanie dotyczące nadpisywania przy stosowaniu do umiejętności należącej do OMA. |
| `--json` | — | Wypisz wynik jako JSON dla CI/CD. |
| `--output <format>` | `text` | Format wyniku (`text` albo `json`). |

---

## Minimalny przykład od początku do końca

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Ilustracyjny wynik dla ośmiu fixture’ów i kandydata, który przechodzi wszystkie bramki promocji:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

Diff pokazuje, co optymalizator zapisałby do pliku. `SKILL.md` pozostaje bez zmian, a wygenerowane dowody ewolucji i wyniki bramek ograniczone zakresem są przechowywane do przyszłych uruchomień.

---

## Zastosowanie zweryfikowanej poprawy

Gdy proponowany diff jest gotowy, uruchom ponownie polecenie z `--apply`:

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### Procedura jako artefakt

Prompty optymalizatora i maintainera są procedurą ulepszania. Są dostarczane jako wbudowane ustawienia domyślne i można je nadpisać plikami w `.agents/evolution/` (należą do użytkownika: nigdy nie są kopiowane przez manifest instalacji ani usuwane przez `oma update`, w przeciwieństwie do `.agents/eval/`):

| Plik | Rola | Wymagane placeholdery |
|---|---|---|
| `optimizer.md` | Proponuje edycje SKILL.md na podstawie dowodów treningowych i trwałej wiedzy | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (także `{{knowledge}}`) |
| `maintainer.md` | Konsoliduje dowody we wzorce wielokrotnego użytku | `{{evidence}}`, `{{priorFacts}}` (także `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Obszary, których pętla nigdy nie może zapisywać, części procedury, które może zmieniać metaoptymalizacja, domyślne wzorcowe (ground-truth) `anchors` dla uruchomień meta oraz budżet dispatchów | musi wymieniać samego siebie w `immutable` |

`budget.max_dispatches_per_run` (domyślnie `null`, bez limitu) jest egzekwowane w uruchomieniach live: każde wewnętrzne wywołanie modelu (ramię zadania, ramię sąsiada, sędzia, optymalizator, maintainer) zużywa jedną jednostkę, a wywołanie, które przekroczyłoby limit, jest odrzucane, zanim zostanie wykonane. Pętla zatrzymuje się wtedy z diagnostyką `budget:exhausted`, finalny test jest pomijany, promocja jest blokowana, a wynik raportuje `budget: { limit, used }`. Zużycie jest zapisywane w podsumowaniu uruchomienia w obu przypadkach, dzięki czemu procedury można porównywać pod względem kosztu, a nie tylko zysku.

`oma skill procedure` wypisuje aktywne źródła i skróty; `--export` zapisuje ustawienia domyślne do edycji bez nadpisywania istniejących plików. Szablon, który pomija wymagany placeholder, jest odrzucany, zamiast po cichu ulegać degradacji. Każde uruchomienie zapisuje `procedure` (skrót dla każdej części oraz skrót łączny) i `memory` w swoim wyniku, podsumowaniu uruchomienia i linii pochodzenia promocji, dzięki czemu dowody wytworzone w ramach jednej procedury nigdy nie są mylone z dowodami innej.

Odpowiedź optymalizatora jest czytana łagodnie wyłącznie pod względem formatowania: znaczniki bloków kodu i puste wiersze są ignorowane, ale każdy wiersz treści, który nie jest prawidłowym wierszem `EDIT:` (ani samotnym `NO_ACTION`), jest `parse-error`, a diagnostyka zawiera teraz pierwszy błędny wiersz, aby można było prześledzić porażkę.

### Ablacja pamięci i statystyki długich przebiegów

`--memory none` rozpoczyna uruchomienie od pustej wiedzy (bez przywołanych wzorców i historii bramek), nadal je zapisując. Porównanie uruchomień z `--memory recall` (domyślnie) i `--memory none` przy tym samym budżecie jest testem, czy trwała wiedza pomaga; twierdzenie, że pętla uczy się z doświadczenia, wymaga takiego porównania, a nie samej obecności pamięci.

`oma skill evolution-stats --skill <id>` agreguje każde zapisane uruchomienie umiejętności z `.agents/results/skill-evolution/<id>/*.jsonl`: uruchomienia według statusu, propozycje według wyniku bramki i wskaźnik akceptacji, zweryfikowane poprawy (finalny test zaliczony, a uruchomienie kwalifikuje się do promocji), zastosowania i wycofania, średni końcowy przyrost, wywołania modeli w uruchomieniach z mierzonym zużyciem oraz wywołania na zweryfikowaną poprawę (koszt procesu, a nie pojedynczego uruchomienia), a także te same wartości w podziale na tryb pamięci i skrót procedury. Raport metaoptymalizacji pokazuje średnią liczbę wywołań na wewnętrzne uruchomienie dla bieżącej procedury i każdego kandydata, dzięki czemu procedura, która wygrywa pod względem zysku, wydając więcej, jest widoczna jako taka.

### Metaoptymalizacja: procedura jako kandydat

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` traktuje prompt optymalizatora (lub maintainera) jako przedmiot testu. Uruchamia wewnętrzną pętlę (`oma skill optimize --dry-run`) na każdej wskazanej umiejętności held-out, `--repeats` razy, według bieżącej procedury; prosi proposera o co najwyżej `--candidates` małych edycji szablonu; ponownie uruchamia wewnętrzną pętlę dla każdego kandydata z tym samym budżetem `--max-epochs` i `--edits-per-epoch`; a następnie porównuje każdego kandydata z bieżącą procedurą parami według (umiejętność, powtórzenie) pod względem sumy przyrostów treningowych i walidacyjnych osiągniętych przez wewnętrzną pętlę.

Kandydat jest promowany tylko wtedy, gdy sparowany 95% przedział bootstrap różnicy jego zysku leży powyżej zera (z ustalonym ziarnem, 1000 ponownych losowań), istnieją co najmniej trzy pary, a żadna umiejętność, która poprawiła się przy bieżącej procedurze, nie traci przy kandydacie więcej niż połowy tego zysku. Wewnętrzne uruchomienie, którego ewaluacja została zablokowana (niewystarczające pokrycie, niezweryfikowana izolacja, wyczerpany budżet), jest raportowane jako nieudane i wyłączane z par, aby awaria nie mogła liczyć się jako zerowy zysk dla jednego ramienia. Umiejętności held-out muszą mieć zapas do poprawy: umiejętność, którą bieżące ciało już ocenia idealnie, nie może wykazać zysku przy żadnej procedurze. `--anchor` wskazuje umiejętności, które nigdy nie służą do selekcji, ale są uruchamiane raz przy bieżącej i zwycięskiej procedurze, aby pokazać dryf; bez tej flagi obowiązuje lista `anchors` z constitution, więc zbiór ground-truth zadeklarowany raz jest sprawdzany przy każdym uruchomieniu meta. Z `--apply` zwycięski szablon jest zapisywany w `.agents/evolution/<target>.md` wraz z kopią zapasową ze znacznikiem czasu, patchem unified-diff i rekordem w `.agents/results/skill-evolution/_procedure/promotions.jsonl`, zawierającym skróty rodzica i kandydata, skrót constitution oraz dowody (umiejętności, powtórzenia, budżet, pary, przedział). Bez `--apply` nic nie jest zapisywane.

Co pozostaje zamrożone: partycja final-test każdej umiejętności nigdy nie jest odczytywana do selekcji (metryką jest zysk treningowy plus walidacyjny), ewaluator i kod optymalizacji są wymienione w constitution jako niezmienne (immutable), sama constitution nie może być celem, a cel musi występować w `meta_targets`. Wewnętrzne uruchomienia domyślnie używają `--memory none`, aby procedura była oceniana na podstawie edycji, które wytwarza, a nie wiedzy przywołanej z wcześniejszych uruchomień. Wewnętrzne uruchomienia jednego ramienia nakładają się na siebie między umiejętnościami (`OMA_META_CONCURRENCY`, domyślnie do 4), podczas gdy powtórzenia danej umiejętności pozostają szeregowe, ponieważ dowody każdej umiejętności trafiają do jej własnego pliku artefaktu. Każde wewnętrzne uruchomienie zapisuje łączny skrót procedury, z którą zostało wykonane, dzięki czemu `oma skill evolution-stats` może przypisać późniejsze wyniki procedurze, która je wytworzyła.

To jest kształt poziomu 5 opisany w przeglądzie systemów samodoskonalących się (promocja held-in/held-out w Self-Harness, powtarzana ewaluacja z przedziałami bootstrap w ADAS, zamrożone ewaluatory jak w AlphaEvolve): procedura jest poprawiana przez sam system, ale zewnętrzna ocena pozostaje poza zasięgiem pętli. Koszt rośnie jak umiejętności × powtórzenia × (1 + kandydaci) wewnętrznych uruchomień; polecenie wypisuje górną granicę i pyta o potwierdzenie, chyba że podano `--yes`.

### Linia pochodzenia promocji

Każdy zapis przez `--apply` dopisuje rekord do `.agents/results/skill-evolution/<skill>/promotions.jsonl` i zapisuje obok niego unified diff do przeglądu w `promotions/<candidate-hash>.patch`. Rekord wskazuje skróty ciała rodzica i kandydata, zainstalowaną ścieżkę, ścieżkę kopii zapasowej oraz dowody stojące za zapisem: przyrosty walidacyjne i finalnego testu, decyzję o promocji, skrót zestawu fixture’ów, rewizję protokołu ewaluatora oraz runtime’y źródłowy i docelowy. `oma skill promotions --skill <id>` wypisuje ten log.

`oma skill rollback --skill <id>` przywraca ciało, które zostało zastąpione przez ostatnie zastosowanie. Odmawia, gdy zainstalowany plik nie pasuje już do kandydata tego zastosowania (późniejsza ręczna edycja zostałaby utracona), gdy kopia zapasowa nie pasuje do zapisanego rodzica albo gdy to zastosowanie zostało już wycofane; udane wycofanie jest dopisywane do tego samego logu z `reverses` wskazującym zastosowanie. Dla umiejętności należącej do OMA patch jest artefaktem do przeniesienia do repozytorium źródłowego lub nakładki użytkownika, ponieważ `oma update` nadpisuje zainstalowaną kopię; rekord oznacza `omaOwned: true`, aby późniejsza aktualizacja nie została wzięta za regresję.

`--apply` wymaga co najmniej jednej zaakceptowanej edycji bez straty walidacyjnej, `finalTest.passed: true` oraz `promotion.eligible: true`. Te bramki wymagają kompletnego wewnętrznego pokrycia zadań, niepustej i w pełni zmierzonej próbki negative-transfer specyficznej dla kandydata oraz wymuszonej izolacji live. Brak finalnego testu, niekompletne pomiary lub zdegradowana diagnostyka kompilatora uniemożliwiają zapis. Przed atomowym zapisem tworzona jest kopia zapasowa oryginalnego `SKILL.md`, a diff jest wypisywany do przeglądu.

Ewaluacja live może spełnić bramkę izolacji przez chroniony profil Claude lub natywny profil Codex. Claude zachowuje kontrole HOME i celu. Codex weryfikuje, że efemeryczny wątek app-server nie ma źródeł instrukcji ani środowisk narzędzi, zanim prześle prompt. Pozostałe profile runtime pozostają eksploracyjne.

### Sprawdzanie, co ewoluowało

Pętla zgłasza się w trzech miejscach, wszystkie odczytywane z logów pochodzenia typu append-only, a nie z jakichkolwiek deklaracji:

- `oma skill promotions --all` wypisuje jedno zdanie na każdą zmianę we wszystkich umiejętnościach i procedurze: co zostało zmienione (kotwica i zamiennik zaakceptowanej edycji), przyrosty held-in i held-out przed i po, czy finalny test się utrzymał, a dla promocji procedury sparowaną różnicę zysku, jej przedział i umiejętności, na których ją zmierzono. `--skill <id>` zawęża wynik do jednej umiejętności. Rekordy zastosowania zapisane przez tę wersję zawierają zaakceptowane edycje i przyrosty treningowe; starsze rekordy wracają do skrótów.
- `oma doctor` pokazuje notatkę **Evolution**: zastosowane i wycofane edycje umiejętności, ostatnią zmianę dla każdej umiejętności, promocje procedury oraz to, co czeka na przetworzenie w pętli sprzężenia zwrotnego (zapisane incydenty bez fixture’a, nieudane uruchomienia, które jeszcze nie zostały zapisane), wraz z poleceniem, które by je przetworzyło.
- Na początku sesji hooki migawki stanu wstrzykują blok `harness evolved since your last session`, wymieniający promocje zapisane od ostatniej sesji, która go pokazała; każda zmiana jest ogłaszana raz. Znacznik znajduje się w `.agents/state/evolution-notice.json`.

Włącz [ewolucję harnessu projektu](./harness-evolution.md), aby uruchamiać cykle sprzężenia zwrotnego z budżetem według harmonogramu:

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

Automatyczne cykle stosują przechodzące zmiany jako nakładki projektu, zachowują niedokończoną pracę do ponowienia i dzielą jeden przydział dispatchów na cały cykl. Domyślny harmonogram to codziennie o 03:00 czasu lokalnego. Użyj `--mode propose` do ewaluacji bez zastosowania, a `oma harness evolution disable`, aby zatrzymać harmonogram. Metaoptymalizacja procedury pozostaje osobnym poleceniem ręcznym.

---

## Tryb live

Tryb live wywołuje rzeczywistych Maintainerów i Proposerów oraz ponownie uruchamia ramiona ewaluacji live w każdej epoce. Jest kosztowny: każde oceniane zadanie wykonuje wywołanie bazowe i wariantu badanego, fixture’y judge dodają wywołania oceniające, a finalny test ocenia oryginalne i kandydackie treści. Podgląd podaje górną granicę wynikającą z rzeczywistego podziału, obejmującą początkowy wynik bazowy na walidacji, wywołania treningowe i kompilatora, wywołania walidacyjne kandydatów, dwie oceny finalnego testu oraz sparowane kontrole sąsiadów dla każdego kandydata i kandydata końcowego. Każde wywołanie ma limit 120 sekund. Chronione ramiona Claude i Codex wyłączają narzędzia, automatyczne wykrywanie instrukcji, MCP i pamięć optymalizacji.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

Podgląd kosztu wyświetla górną granicę wewnętrznych wywołań modeli, zanim zostanie wykonane jakiekolwiek wywołanie LLM.

Maintainer, Proposer, ramiona ewaluacji i sędziowie współdzielą chroniony transport tekstowy w świeżych katalogach tymczasowych. Claude używa swojego ograniczonego profilu CLI. Codex używa natywnego `codex app-server` z istniejącym logowaniem CLI, wybranym modelem/dostawcą i poziomem rozumowania (reasoning effort); nie podstawia klienta z kluczem API ani nie przełącza się awaryjnie na Claude. Profil Codex dotyczy CLI 0.154.x na macOS/Linux z natywnym plikowym magazynem poświadczeń i istniejącym `auth.json`. Każde wywołanie przygotowuje prywatny tymczasowy `CODEX_HOME`, który odwołuje się do oryginalnych plików config/auth bez kopiowania zawartości poświadczeń. Natywne odświeżanie tokenu nadal korzysta z oryginalnego pliku auth. Współdzielony stan bootstrap jest wyłączony, a stan tymczasowy jest po zakończeniu sprzątany. Magazyny poświadczeń keyring, auto i ephemeral nie są obecnie obsługiwane. Kontrakt wątku jest sprawdzany przed wysłaniem danych wejściowych modelu; nieobsługiwane wersje, tryby magazynu i błędy protokołu przerywają dispatch. Narzędzia, wykrywanie instrukcji przy starcie, dostęp do MCP i trwałość sesji są wyłączone, aby procesy kompilatora nie mogły odczytać ukrytych fixture’ów przez narzędzia agenta. Inni dostawcy kompilatora kończą się jawnym błędem, dopóki nie mają zweryfikowanego transportu.

Optymalizator zgłasza `proposed` dla prawidłowych edycji i `no-action` wyłącznie dla jawnej odpowiedzi `NO_ACTION`. Awarie procesu/API stają się `dispatch-error`; źle sformułowane odpowiedzi bez prawidłowych edycji stają się `parse-error`. Te błędy nie mogą zamienić się w puste listy edycji. Jeśli Maintainer nie może dostarczyć zwalidowanych wzorców, zgłasza `degraded` z powodem dispatchu lub parsowania; wzorce zastępcze są wyłączone z trwałej wiedzy, a uruchomienie nie może wypromować kandydata. Porażki ewaluacji pojawiają się w `diagnostics` i rekordach bramek propozycji, a nie w wyuczonej historii odrzuceń.

---

## Wynik JSON

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` wymaga `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true` oraz `promotion.eligible === true`. `baselineTrainLift` i `finalTrainLift` raportują partycję held-in obok przyrostów walidacyjnych. Ten sam warunek bramkuje `--apply`: edycja zaakceptowana wyłącznie dla naprawy treningowej jest zapisywana tylko wtedy, gdy finalny test również przechodzi. Brak finalnego testu lub obiektu promocji nie może dać `ok: true`. Liczniki `_split` pokazują rzeczywisty podział lokalnych fixture’ów użyty podczas uruchomienia.

Na przykład niezmierzony kandydat może dać taki fragment raportu:

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Przed ponowieniem sprawdź `diagnostics`, `promotion.reasons` i ewentualne `finalTest.blocker`. `rejectedCount` nie rośnie dla propozycji typu inconclusive. Zmierzona porażka finalnego testu może zwiększyć audytowy licznik odrzuceń uruchomienia, pozostając wyłączona z trwałej wiedzy o odrzuceniach.

---

## Zastrzeżenie SSOT dla umiejętności `oma-*`

Umiejętności, których ID zaczyna się od `oma-`, należą do oh-my-agent i są **nadpisywane przez `oma update`**. Dla tych umiejętności odradza się `--apply` — użyj `--dry-run` (wartość domyślna), przejrzyj proponowany diff i wprowadź zmianę do rejestru upstream, jeśli poprawa ma znaczenie. Dla umiejętności napisanych przez użytkownika `--apply` jest bezpieczne.

Gdy docelowa umiejętność należy do OMA, polecenie wypisuje ostrzeżenie:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Guard przed przeuczeniem

Maintainer i Proposer otrzymują dowody rolloutów TRAIN. Wybór kandydata korzysta z wydzielonej partycji VALIDATION, a osobna partycja TEST należy do runnera. Uruchamianie kompilatora bez narzędzi uniemożliwia dostęp do tych ukrytych fixture’ów i ewaluatorów z poziomu workspace’u.

Porażka finalnego testu uniemożliwia zastosowanie. Jej wynik pozostaje dostępny do audytu, ale ani wyniki bramki finalnego testu, ani propozycje typu inconclusive nie zasilają trwałej wiedzy optymalizacji. Rejestrator, ponowne ładowanie historii i ścieżki semantycznego przywoływania również wykluczają starsze (legacy) wyniki finalnego testu, więc późniejsze uruchomienie nie może użyć wcześniejszego sukcesu ani porażki finalnego testu jako sprzężenia zwrotnego w treningu.

---

## Integracja z CI

Użyj odtwarzania ewaluacji do sprawdzenia w CI offline istniejących nagrań specyficznych dla kandydata:

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

Sama optymalizacja z poziomu CLI wymaga `--live`; nie ma jeszcze adaptera odtwarzania zapisanych propozycji. Wcześniejsze wskazówki opisujące `oma skill optimize --mock` jako kompletny optymalizator offline były błędne. Przenieś zadania odtwarzania offline na `oma skill eval --mock` albo jawnie włącz optymalizację live wraz z jej kosztem modeli. Dla uruchomień optymalizacji sprawdzaj JSON `ok` i `promotion.eligible`: kod wyjścia zero obejmuje też zakończone uruchomienia, które nie znalazły kandydata możliwego do wypromowania.

Kody wyjścia optymalizacji:
- `0` — optymalizacja zakończona (z poprawą albo bez niej)
- `1` — nieprawidłowe dane wejściowe lub błąd wykonania, w tym optymalizacja CLI bez `--live`, sprzeczne flagi `--live --mock`, niewystarczająca liczba fixture’ów, nieobsługiwany dostawca kompilatora, awaria dispatchu optymalizatora lub nieprawidłowo sformułowany wynik optymalizatora

---

## Zobacz także

- [Ewaluacja użyteczności umiejętności](/docs/guide/skill-eval) — tworzenie fixture’ów zadań, typy checkerów, tryby mock/live i katalog `_rollouts/`.
- [Polecenia CLI](/docs/cli-interfaces/commands) — odniesienie do flag wszystkich poleceń zarządzania umiejętnościami.
