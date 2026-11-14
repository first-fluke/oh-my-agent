---
title: Projekt interfejsu administracyjnego wokół rzeczywistych zadań
description: Określ hierarchię ekranu administracyjnego, gęstość tabeli, stany i przekazanie projektu, zachowując stos projektu i kontrakt wizualny.
---

# Projekt interfejsu administracyjnego wokół rzeczywistych zadań {#design-an-admin-ui-around-its-actual-tasks}

Użyj `oma-design`, aby zdecydować, jak ekran administracyjny ma wspierać użytkowników, zanim zmienisz kod aplikacji.

## Załaduj umiejętność {#load-the-skill}

Poproś agenta kodującego, aby uruchomił to polecenie i przeczytał zwrócone instrukcje oraz katalog pomocniczy:

```bash
bunx skills use first-fluke/oh-my-agent@oma-design
```

## Dostarcz dane wejściowe {#provide-the-input}

- Działający ekran, zrzuty albo właściwe komponenty.
- Kto używa ekranu i jakie działania musi dokończyć.
- Istniejące `DESIGN.md`, tokeny, komponenty, języki oraz wymagania responsywności i dostępności.

## Zadaj zadanie {#give-the-task}

```text
Use oma-design to define the direction for our customer-support admin.
Support agents triage a ticket table, filter by status and assignee, and open
ticket details in a drawer. Keep our React stack, existing component primitives,
brand palette, and Korean/English content. Cover loading, empty, error, keyboard
focus, and narrow-screen states. Return layout decisions and a semantic-token
handoff. Update DESIGN.md if the visual system changes. Do not edit application
code or install packages.
```

## Sprawdź wynik {#check-the-result}

Spodziewaj się decyzji o hierarchii i gęstości właściwych dla ekranu, zachowania stanów, mapowania tokenów semantycznych i przekazania do implementacji. Zaakceptowane zmiany systemu należą do kanonicznego `DESIGN.md` projektu.

Sprawdź propozycję względem zadania triażu: czy użytkownik potrafi wskazać następny ticket, zmienić filtry, otworzyć szczegóły i odzyskać się po błędach? Gdy dostępny jest wyrenderowany okaz, sprawdź fokus klawiatury, czytelny tekst koreański i angielski oraz zachowanie na wąskim ekranie. Przekazanie ograniczone do dokumentu pozostawia wykonanie w przeglądarce i dostępność niezweryfikowane.

## Zależności i następny krok {#dependencies-and-next-step}

Dla nowego kierunku interfejsu administracyjnego albo produktowego [kontrakt routingu](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/.agents/skills/oma-design/resources/external-design-skills.md) wybiera Interface Design. Krytyka, audyt i dopracowanie istniejącego UI wybierają Impeccable; inna dyrekcja artystyczna webu używa Taste. Na bieżącą operację ładowany jest jeden dostawca.

Te zewnętrzne instrukcje mogą wymagać własnych pobrań albo narzędzi runtime'u. Istniejący stos, marka, pokrycie CJK, cel WCAG i wymagania reduced-motion pozostają ograniczeniami. Załadowanie instrukcji nie renderuje ani nie weryfikuje UI.

Do implementacji użyj specjalisty frontendowego projektu. Przy hookach i workflowach projektu [wybierz konfigurację runtime'u](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset), która zawiera `oma-design`.
