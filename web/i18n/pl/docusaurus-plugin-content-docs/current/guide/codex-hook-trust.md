---
title: "Przewodnik: zaufanie hookom Codex"
sidebar_label: Zaufanie hookom Codex
description: Dlaczego hooki Codex nie działają, dopóki raz ich nie przejrzysz, co dzieje się podczas aktualizacji i co oh-my-agent automatyzuje dla uruchamianych podprocesów Codex.
---

# Przewodnik: zaufanie hookom Codex

Gdy oh-my-agent instaluje się w projekcie, zapisuje natywne dla dostawców konfiguracje hooków, w tym `.codex/hooks.json` dla CLI Codex. W przeciwieństwie do Claude Code Codex nie uruchamia tych hooków automatycznie. Każdy niezarządzany hook polecenia jest chroniony przez Trust-On-First-Use (TOFU): hook działa dopiero po jednorazowym przejrzeniu i włączeniu.

To mechanizm bezpieczeństwa po stronie Codex. Hooki wymagają jednorazowego przejrzenia, a ponownie po aktualizacji tylko wtedy, gdy zmieni się polecenie.

---

## Jednorazowy krok: przejrzyj hooki w Codex

Po tym, jak `oma` (install), `oma link` albo `oma update` zapisze `.codex/hooks.json` w projekcie, którego Codex wcześniej nie widział (przy instalacji globalnej `~/.codex/hooks.json`), hooki **jeszcze nie działają**. Otwórz Codex i przejrzyj je raz:

1. Otwórz projekt w CLI Codex.
2. Uruchom `/hooks`, aby otworzyć przeglądarkę hooków (TUI).
3. Przejrzyj wymienione hooki i włącz je.

Do tego czasu hooki pozostają niezaufane i są po cichu pomijane. Dlatego oh-my-agent wypisuje komunikat za każdym razem, gdy tworzy albo zmienia `.codex/hooks.json`:

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Przed otwarciem Codex sprawdź wygenerowany plik:

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

Oczekiwany wynik to komunikat instalacji/aktualizacji, a następnie hooki w przeglądarce `/hooks` Codex. `oma link codex` uzgadnia wygenerowany plik; nie zastępuje jednorazowej decyzji o zaufaniu.

**Uwaga:** `--dangerously-bypass-hook-trust` tutaj nie pomaga. Jego ostrzeżenie („Enabled hooks may run without review”) oznacza tylko obejście przeglądu hooków już włączonych — nie uruchomi hooka, którego nigdy nie przejrzano. Przeglądarka `/hooks` jest jedynym sposobem pierwszego włączenia hooka.

W tle Codex zapisuje decyzję w `~/.codex/config.toml`, w wpisie `[hooks.state]` kluczowanym ścieżką pliku hooków, zdarzeniem, blokiem i hookiem, wraz z flagą `enabled` oraz wartością `trusted_hash` dla ciągu polecenia.

---

## Co dzieje się podczas aktualizacji

Po zaufaniu hookom nie trzeba powtarzać tego kroku przy każdej aktualizacji:

- **Ponowne uruchomienie `oma link` albo `oma update` zachowuje zaufanie**, dopóki ciągi poleceń hooków się nie zmienią. Codex porównuje zapisany skrót z bieżącym poleceniem; zgodność pozostawia hook zaufany.
- **Jeśli przyszła wersja oh-my-agent zmieni ciąg polecenia hooka**, skróty przestaną się zgadzać i ten hook po cichu znów stanie się niezaufany. Ponownie zobaczysz komunikat instalatora i trzeba będzie jeszcze raz zaufać hookowi przez `/hooks`.

Krok przeglądu jest więc wymagany tylko pierwszy raz, a później po wydaniu, które rzeczywiście zmieni polecenie hooka.

---

## Co oh-my-agent automatyzuje

Gdy oh-my-agent sam uruchamia podproces Codex — na przykład agenta innego dostawcy zleconego przez `oma agent spawn` — automatycznie przekazuje `--dangerously-bypass-hook-trust`. Dzięki temu jego własne, sprawdzone hooki mogą działać po aktualizacjach bez ręcznego ponownego zaufania.

Ta flaga jest stosowana **wyłącznie** do procesów Codex uruchamianych przez oh-my-agent. Nigdy nie jest zapisywana w `~/.codex/config.toml` ani w konfiguracji projektu, więc nie wpływa na sesje Codex uruchamiane samodzielnie.

---

## Flaga `[features] hooks` nie jest potrzebna

Starsze wydania oh-my-agent zapisywały `[features] codex_hooks = true` w konfiguracji Codex. Codex 0.124 zmienił nazwę tej flagi na `hooks` i uczynił hooki stabilną, domyślnie włączoną funkcją, więc żadna flaga nie jest potrzebna. oh-my-agent nie zapisuje żadnego z tych kluczy i usuwa przestarzałe flagi `codex_hooks` oraz `child_agents_md` z tabeli `[features]`, gdy je znajdzie.

---

## Podsumowanie

| Sytuacja | Co robisz |
|:----------|:------------|
| Pierwsza instalacja / pierwszy `.codex/hooks.json` w projekcie | Otwórz Codex, uruchom `/hooks` i raz włącz hooki |
| `oma update` bez zmian w poleceniach hooków | Nic — zaufanie zostaje zachowane |
| `oma update`, które zmienia polecenie hooka | Ponownie uruchom `/hooks`, aby zaufać hookowi (instalator wypisze komunikat) |
| Podproces Codex uruchomiony przez oh-my-agent | Nic — obejście jest stosowane automatycznie |

## Zobacz także

- [Integracja z istniejącym projektem](./integration.md): co instalator zapisuje dla każdego dostawcy
- [Instalacja globalna](./global-install.md): instalacje dla całego użytkownika, które zapisują `~/.codex/`
