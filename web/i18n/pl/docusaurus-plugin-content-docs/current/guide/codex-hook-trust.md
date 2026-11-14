---
title: "Przewodnik: zaufanie hookom Codex"
sidebar_label: Zaufanie hookom Codex
description: Jak Codex bramkuje hooki zaufaniem, co oh-my-agent zapisuje, aby jego hooki działały, i kiedy nadal trzeba przejrzeć hooki samodzielnie.
---

# Przewodnik: zaufanie hookom Codex

Gdy oh-my-agent instaluje się w projekcie, zapisuje natywne dla dostawców konfiguracje hooków, w tym `.codex/hooks.json` dla CLI Codex. Codex nie uruchamia hooka tylko dlatego, że jest skonfigurowany. Bramkują go dwie zgody, obie w konfiguracji użytkownika (`$CODEX_HOME/config.toml`, domyślnie `~/.codex/config.toml`). Projekt nie może zatwierdzić własnych hooków:

1. **Zaufanie do projektu.** Katalog `.codex/` projektu (jego `config.toml` i `hooks.json`) ładuje się tylko dla zaufanego projektu: `[projects."<path>"] trust_level = "trusted"`.
2. **Zaufanie per hook.** Każdy niezarządzany hook, w zakresie projektu albo użytkownika, potrzebuje wpisu `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]`, którego `trusted_hash` zgadza się z bieżącą deklaracją hooka (polecenie, timeout, matcher, flaga async, komunikat statusu).

Nowy albo zmieniony hook pokazuje w TUI Codex „Hooks need review”. `codex exec` po cichu go pomija.

---

## Co oh-my-agent zapisuje

`oma install`, `oma update` i `oma link` zapisują obie zgody dla **własnych hooków oh-my-agent**. To handlery o nazwach `oma-hook-*` albo uruchamiane przez wrapper `oma-hook.sh`. Skrót jest tym samym, który Codex oblicza po wyborze „Trust all and continue”, więc hooki działają w pierwszej sesji Codex bez kroku `/hooks`. Późniejsze wydanie oh-my-agent, które zmienia polecenie hooka, zapisuje nowy skrót podczas `oma update`, więc hooki pozostają włączone.

oh-my-agent edytuje w `config.toml` tylko objęte tabele. Ponownie odczytuje wynik i pozostawia plik nietknięty, gdy cokolwiek innego miałoby się zmienić. Nigdy:

- nie zatwierdza hooka dodanego samodzielnie do tego samego `hooks.json`,
- nie ufa projektowi oznaczonemu `trust_level = "untrusted"`,
- nie włącza ponownie hooka wyłączonego (`enabled = false`),
- nie dotyka Codex, zanim Codex utworzy swój katalog domowy.

Instalacja globalna (`~/.codex/hooks.json`) dostaje wyłącznie wpisy per hook, bo nie ma projektu, któremu można zaufać.

---

## Kiedy nadal przeglądasz hooki samodzielnie

Jeśli oh-my-agent nie mógł zapisać zaufania, wypisuje powód wraz z komunikatem:

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Typowe przypadki to `config.toml`, którego nie da się sparsować, projekt oznaczony jako niezaufany albo Codex, który jeszcze nie był uruchomiony. Wtedy otwórz projekt w Codex, uruchom `/hooks` i włącz hooki raz. Następnie uruchom `oma link codex`, aby późniejsze aktualizacje utrzymywały ich zaufanie.

---

## Procesy Codex uruchamiane przez oh-my-agent

Gdy oh-my-agent sam uruchamia podproces Codex (na przykład `oma agent spawn`), przekazuje też `--dangerously-bypass-hook-trust`. Ta flaga uruchamia włączone hooki bez sprawdzania skrótu. Nie znosi zaufania do projektu. Flaga dotyczy wyłącznie procesów uruchamianych przez oh-my-agent i nigdy nie jest zapisywana w konfiguracji.

---

## Flaga `[features] hooks` nie jest potrzebna

Starsze wydania oh-my-agent zapisywały `[features] codex_hooks = true` w konfiguracji Codex. Codex 0.124 zmienił nazwę tej flagi na `hooks` i uczynił hooki stabilną, domyślnie włączoną funkcją, więc żadna flaga nie jest potrzebna. oh-my-agent nie zapisuje żadnego z tych kluczy i usuwa przestarzałe flagi `codex_hooks` oraz `child_agents_md` z tabeli `[features]`, gdy je znajdzie.

---

## Podsumowanie

| Sytuacja | Co robisz |
|:----------|:------------|
| Pierwsza instalacja w projekcie | Nic: zaufanie zapisuje instalator |
| `oma update`, które zmienia polecenie hooka | Nic: nowy skrót zostaje zapisany |
| Instalator wypisuje „not trusted (…)” | Napraw powód albo raz uruchom `/hooks` w Codex |
| Hook dodany do `.codex/hooks.json` | Przejrzyj go samodzielnie w `/hooks` |

## Zobacz także

- [Integracja z istniejącym projektem](./integration.md): co instalator zapisuje dla każdego dostawcy
- [Instalacja globalna](./global-install.md): instalacje dla całego użytkownika, które zapisują `~/.codex/`
