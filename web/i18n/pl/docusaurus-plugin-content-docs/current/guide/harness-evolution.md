---
title: "Ewolucja harnessu projektu"
sidebar_label: Ewolucja harnessu projektu
description: Włącz zaplanowane, objęte budżetem ulepszenia umiejętności na podstawie dowodów z uruchomień OMA, z trwałymi nakładkami projektu i możliwością wycofania zmian.
---

# Ewolucja harnessu projektu

OMA może zbierać dowody ze śledzonych uruchomień agentów i przetwarzać porażki w zaplanowanym cyklu sprzężenia zwrotnego. Automatyczne zmiany umiejętności są **wyłączone, dopóki nie włączysz ich dla projektu**. Każdy cykl ma skończony budżet wywołań modeli, a zastosowana zmiana musi przejść istniejące bramki ewaluacji umiejętności.

Zautomatyzowana ścieżka ulepsza dokumenty umiejętności. Zmiany procedury optymalizatora lub maintainera pozostają osobną, wywoływaną ręcznie [metaoptymalizacją](/docs/guide/skill-opt).

## Włączanie dla projektu

Uruchom z katalogu głównego projektu:

```bash
# Example allowance: at most 300 model dispatches per scheduled cycle
oma harness evolution enable --max-dispatches 300

# Evaluate proposals without applying them
oma harness evolution enable --max-dispatches 300 --mode propose

# Choose a schedule in the operating system's local time
oma harness evolution enable --max-dispatches 300 --cron "0 3 * * *"

oma harness evolution status --json
```

Domyślny harmonogram to codziennie o 03:00 czasu lokalnego, a domyślny tryb to `apply`. `--max-dispatches` jest wymagane przy włączaniu i musi być dodatnią liczbą całkowitą. Przykładowa wartość to przydział wywołań, a nie szacunek ceny ani obietnica, że cykl się zakończy. Większe zestawy fixture’ów i powtarzana ocena zużywają więcej wywołań.

<!-- oma-docs:ignore-start -->
Ustawienia są zapisywane w `.agents/evolution/harness-evolution.json`. Wygenerowane dowody, stan ponowień i blokada cyklu znajdują się w `.agents/state/harness-evolution/`.
<!-- oma-docs:ignore-end -->

Włączenie rejestruje wbudowane zadanie w istniejącym harmonogramie systemowym OMA. Zadanie wywołuje cykl sprzężenia zwrotnego bezpośrednio. Ponowne włączenie aktualizuje zadanie projektu zamiast tworzyć kolejne.

```bash
# Run one cycle now under the saved mode and budget
oma harness evolution run --json

# Stop future cycles; retain evidence and applied improvements
oma harness evolution disable
```

Wyłączony projekt nie wykonuje pracy modeli przez polecenie evolution, także w przypadku spóźnionego wywołania z harmonogramu. Wyłączenie nie wycofuje zmian już zastosowanych.

## Co dzieje się automatycznie

1. **Zapis dowodów ukończenia.** Uruchomienia śledzone przez OMA zostawiają lokalne odwołania do swojego wyniku i dowodów weryfikacji. Ten krok ukończenia nie wykonuje dodatkowych wywołań modeli. Wielokrotne ukończenie tego samego uruchomienia nie tworzy zduplikowanych dowodów.
2. **Zbieranie porażek według harmonogramu.** Cykl skanuje kwalifikujące się nieudane uruchomienia, wyprowadza oczekiwania z ich zapisanych kontraktów zadań i sprawdza, czy proponowany fixture regresji rzeczywiście odrzuca zachowany nieudany wynik.
3. **Optymalizacja objętych umiejętności.** Incydenty są grupowane według umiejętności. Każda umiejętność jest optymalizowana w ramach istniejących kontroli train, validation, final-test, izolacji i negative-transfer.
4. **Zastosowanie lub raport.** W trybie `apply` kandydat, który przejdzie bramki, staje się nakładką umiejętności projektu. W trybie `propose` cykl zapisuje wynik bez jego instalowania.
5. **Raportowanie zmian.** Użyj polecenia status i istniejącej historii promocji, aby sprawdzić wyniki. Zastosowane zmiany zasilają też powiadomienie o ewolucji w następnej sesji.

OMA nie obserwuje automatycznie każdej natywnej rozmowy ani każdej korekty użytkownika. Wejściem są dowody z uruchomień, które OMA faktycznie śledzi. Uruchomienie bez zachowanego wyniku albo kontraktu akceptacji może wymagać ręcznie napisanej [specyfikacji incydentu](/docs/guide/harness-incidents).

## Budżet i ponowienia

Cykl dzieli jeden przydział wywołań między przechwytywanie, pisanie rubryk, kierowanie, ocenianie, optymalizację umiejętności, zadania sąsiednie i ewaluację końcową. Wywołanie modelu obciąża przydział przed dispatch’em. Wywołania ponawiane przez warstwę wykonawczą również są wliczane. Surowszy limit z constitution danej umiejętności nadal obowiązuje.

Gdy przydział się wyczerpie, ewaluacja pozostaje niekompletna, a objęty nią kandydat nie może zostać zastosowany. Raport zapisuje zużycie i oczekującą pracę. Jednocześnie działa tylko jeden cykl projektu.

Utworzenie fixture’a nie oznacza, że optymalizacja incydentu została ukończona. Przerwana lub nieudana optymalizacja pozostaje oczekująca i może zostać wznowiona po upływie okresu backoff bez duplikowania fixture’a. W pełni oceniony wynik bez akceptowalnej zmiany jest zapisywany jako przetworzony, więc te same dowody nie wywołują nieograniczonej liczby powtórnych optymalizacji. Nowe dowody mogą wywołać kolejną próbę.

Przełączenie z trybu propose na tryb apply sprawia, że niezastosowane propozycje kwalifikują się do przetworzenia. Zastosowanie nadal wymaga bieżącej ewaluacji i niezmienionej zawartości źródłowej; stara propozycja nie jest bezwarunkowym poleceniem zapisu.

## Trwałe nakładki umiejętności

Automatyczne zmiany są przechowywane oddzielnie od zarządzanych definicji umiejętności, w należącym do użytkownika obszarze ewolucji projektu. Ewaluacja oraz projektowe dowiązania umiejętności dostawców używają efektywnego ciała wybranego z zarządzanej bazy i jej kwalifikującej się nakładki. Instalacje dostawców w zakresie HOME nie są przekierowywane na nakładkę projektu. Niezarządzaną kopię w projektowym katalogu dostawcy należy rozstrzygnąć przed automatycznym zastosowaniem. Zasoby umiejętności pozostają dostępne pod swoimi ścieżkami względnymi.

Nakładka zapisuje bazę, względem której została oceniona. Po `oma update`:

- Niezmieniona baza nadal używa swojej nakładki.
- Zmieniona baza pozostawia nakładkę zachowaną, ale oznacza ją jako konflikt i używa zaktualizowanej bazy. Stara ewaluacja nie dowodzi, że nakładka jest bezpieczna na nowej bazie.

Edycja wykonana w trakcie optymalizacji uniemożliwia kandydatowi nadpisanie zmienionej zawartości. Status zgłasza konflikty do przeglądu.

## Sprawdzanie i cofanie

```bash
oma harness evolution status --json
oma skill promotions --all
oma skill rollback --skill oma-docs
```

Rekordy promocji zachowują skróty kandydata i rodzica, dowody ewaluacji oraz patch do przeglądu. Wycofanie pierwszej nakładki przywraca użycie zarządzanej bazy; wycofanie późniejszej nakładki przywraca poprzednią nakładkę. Nieznane edycje są zachowywane: polecenie rollback odmawia odrzucenia treści, która nie pasuje już do zapisanego kandydata.

Istniejące ręczne polecenie `oma skill optimize --apply` nadal jest dostępne. Zaplanowana ewolucja jawnie wybiera ścieżkę zastosowania przez nakładkę.

## Zakres dowodów

Przechodzący test oprogramowania potwierdza poprawne połączenie komponentów oraz reguły ewaluacji. Nie dowodzi, że powtarzane automatyczne zmiany z czasem poprawiają rzeczywistą pracę projektu. Przed zwiększeniem przydziału lub rozszerzeniem automatyzacji sprawdź rzeczywiste promocje, koszty, regresje i historię wycofań. Promocja procedury L5 nie jest wywoływana przez tę zaplanowaną pętlę sprzężenia zwrotnego.
