---
title: "Przewodnik: agenci zaplanowani"
sidebar_label: Agenci zaplanowani
description: Uruchamiaj dowolnego agenta cyklicznie albo jednorazowo za pomocą harmonogramu systemu operacyjnego (macOS launchd, Linux systemd, Windows Task Scheduler), bez konieczności utrzymywania otwartego runtime’u dostawcy.
---

# Agenci zaplanowani

`oma schedule` pozwala uruchomić dowolnego agenta według harmonogramu czasowego, niezależnie od tego, który runtime dostawcy AI (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode albo pi) jest obecnie otwarty. Harmonogram systemu operacyjnego uruchamia zadanie, a zadanie bez interfejsu wywołuje `oma agent spawn`, używając poświadczeń dostawcy zapisanych już na dysku.

---

## Jak to działa

Po uruchomieniu `oma schedule create` oma:

1. Zapisuje rekord zadania w globalnym manifeście `~/.agents/schedule/schedules.json`.
2. Rejestruje zadanie w harmonogramie systemu operacyjnego (macOS launchd, Linux systemd --user albo Windows Task Scheduler). Zadanie systemowe wywołuje `oma schedule run <id>` w skonfigurowanym interwale cron.
3. W chwili uruchomienia `oma schedule run` wyszukuje zadanie, wstrzykuje przechwycone zmienne środowiskowe, wywołuje `oma agent spawn` i zapisuje log uruchomienia w `~/.agents/schedule/runs/<id>/<timestamp>.md`.

Manifest jest jedynym źródłem prawdy (SSOT). Harmonogram systemu operacyjnego jest tylko wykonawcą. Cały stan — definicje zadań, logi uruchomień i znaczniki ostatniego uruchomienia — znajduje się w `~/.agents/schedule/`.

### Tylko globalnie z założenia

`oma schedule` jest celowo globalne dla użytkownika, a nie przypisane do projektu. Ponieważ harmonogram systemowy wykonuje zadania niezależnie od bieżącego katalogu roboczego, jeden centralny rejestr jest jedynym praktycznym SSOT. Każde zadanie zapisuje projekt, do którego należy, przez `workspace` i `projectLabel`, dzięki czemu `schedule list` może grupować zadania według projektu, mimo że rejestr jest współdzielony.

Nie ma flagi `--global`; polecenia harmonogramu zawsze odczytują i zapisują `~/.agents/schedule/`.

### Backendy systemu operacyjnego

| Platforma | Główny backend | Zapasowy |
|---|---|---|
| macOS | launchd (plist + `launchctl`) | użytkownikowy `crontab` |
| Linux | timer systemd --user | użytkownikowy `crontab` |
| Windows | Task Scheduler (`schtasks`) | — |

oma automatycznie wybiera dostępny backend. Nie konfigurujesz tego ręcznie.

---

## Porównanie: schedule, ralph i Claude /loop

Te trzy funkcje bywają mylone, ponieważ wszystkie oznaczają „uruchomienie ponownie później”. Są to różne pojęcia.

| Funkcja | Wyzwalacz | Zakres | Czy przetrwa restart dostawcy? |
|---|---|---|---|
| `oma schedule` | Czasowy (cron) | Między dostawcami, poziom systemu operacyjnego | Tak — harmonogram systemowy uruchamia zadanie, nawet gdy żaden runtime dostawcy nie jest otwarty |
| `ralph` | Oparty na ukończeniu (pętla hooka Stop) | Między dostawcami | Tylko podczas aktywnej sesji; ralph to pętla „działaj do ukończenia”, a nie timer |
| Claude Code `/loop` | Czasowy (cron w procesie) | Tylko runtime Claude | Nie — działa tylko, gdy uruchomiony jest Claude Code |

Użyj `schedule`, gdy chcesz uruchamiać zadanie o 9:00 w każdy dzień roboczy. Użyj `ralph`, gdy agent ma iterować do spełnienia progu jakości. Używaj `/loop` tylko wtedy, gdy jesteś już w Claude Code i nie potrzebujesz przenośności między dostawcami.

---

## Szybki start

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## Polecenia

### schedule create

Zarejestruj zaplanowane zadanie agenta.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Argumenty:**

| Argument | Wymagany | Opis |
|---|---|---|
| `agent-id` | Tak | Typ agenta do uruchomienia: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Tak | Opis zadania przekazywany agentowi w chwili uruchomienia |

**Opcje:**

| Flaga | Opis |
|---|---|
| `--cron "<expr>"` | Pięciopolowe wyrażenie cron (np. `"0 9 * * *"` dla codziennej 9:00). Wzajemnie wyklucza się z `--every`. |
| `--every "<phrase>"` | Interwał w języku naturalnym (zobacz tabelę poniżej). Wzajemnie wyklucza się z `--cron`. |
| `--vendor <vendor>` | Nadpisanie dostawcy CLI przekazane do `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Domyślnie automatyczne wykrycie z `oma-config.yaml`. |
| `-w, --workspace <path>` | Katalog roboczy agenta w chwili uruchomienia. Domyślnie bieżący katalog roboczy w chwili rejestracji. |
| `--once` | Tryb jednorazowy: zadanie uruchamia się raz i samo usuwa. Domyślnie jest cykliczne. |
| `--expires-after <duration>` | Automatycznie wygasa cykliczne zadanie po czasie, takim jak 30d. `0` oznacza czas nieokreślony (domyślnie). |
| `--env <KEY1,KEY2>` | Przechwyć nazwane zmienne środowiskowe (tylko wymienione) do `~/.agents/schedule/env/<id>` (uprawnienia 0600), aby wstrzyknąć je w czasie uruchomienia. Sekrety nigdy nie są zapisywane w samym manifeście. |
| `--dry-run` | Wypisz rozstrzygnięty cron i ewentualną informację o zaokrągleniu, nie zapisując zadania harmonogramu, wpisu manifestu ani pliku środowiska. |
| `--accept-rounded` | Wymagane do rejestracji interwału w języku naturalnym po zaokrągleniu go przez OMA do kroku wyrażalnego w cron. Najpierw wyświetl podgląd za pomocą `--dry-run`. |

Wymagane jest dokładnie jedno z `--cron` albo `--every`.

#### --every: interwały w języku naturalnym

`--every` akceptuje następujące formy. oma parsuje je do pięciopolowego wyrażenia cron i wypisuje informację, gdy żądany interwał zostanie zaokrąglony do najbliższego kroku wyrażalnego w cron.

| Forma | Przykład | Uwagi |
|---|---|---|
| Jednostka skrócona | `5m`, `2h`, `1d` | Minuta, godzina, dzień |
| Every + skrót | `every 20m`, `every 2h` | |
| Every + słowo | `every 5 minutes`, `every 2 hours` | Akceptowane są słowa jednostek w liczbie mnogiej |
| Sekundy | `30s` | Zaokrąglane w górę do minimum 1 minuty; cron nie wyraża interwałów krótszych niż minuta |

Interwały niedzielące dokładnie są zaokrąglane do najbliższego równego kroku i pojawia się informacja. Na przykład `--every 7m` zostaje zaokrąglone do `6m` (`*/6`), ponieważ 7 nie dzieli 60.

Przed zarejestrowaniem wyświetl podgląd zaokrąglonego interwału:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Jeśli pominiesz podgląd, polecenie odmówi rejestracji zaokrąglonego interwału. Harmonogramy korzystają z lokalnych reguł czasu wybranego harmonogramu systemowego.

**Przykłady:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

Wyświetl wszystkie zaplanowane zadania ze wszystkich projektów, pogrupowane według projektu, wraz ze stanem rozbieżności systemu operacyjnego.

```
oma schedule list [--json]
```

**Opcje:**

| Flaga | Opis |
|---|---|
| `--json` | Wynik w JSON czytelnym maszynowo |

**Stany rozbieżności:**

| Stan | Znaczenie |
|---|---|
| `synced` | Zadanie istnieje zarówno w manifeście, jak i w harmonogramie systemu |
| `stale` | Zadanie jest zarejestrowane, ale rejestracja w systemie wywołuje polecenie, którego bieżące CLI już nie akceptuje (na przykład `schedule:run <id>` zapisane przed standaryzacją ścieżek poleceń). Uruchom `schedule sync`, aby je przepisać; `oma update` robi to automatycznie. |
| `missing-in-os` | Zadanie jest w manifeście, ale brakuje go w harmonogramie systemu. Uruchom `schedule sync`, aby naprawić. |
| `orphan-in-os` | Zadanie istnieje w harmonogramie systemu, ale nie w manifeście. Uruchom `schedule sync --prune`, aby je usunąć. |

**Wynik (tekst):**

Zadania są grupowane według etykiety projektu. Każdy wiersz pokazuje: ID, wyrażenie cron, agenta, dostawcę, backend systemu operacyjnego, informację o cykliczności i stan rozbieżności.

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**Przykłady:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Usuń zaplanowane zadanie zarówno z manifestu, jak i z harmonogramu systemu operacyjnego.

```
oma schedule delete <id>
```

**Argumenty:**

| Argument | Wymagany | Opis |
|---|---|---|
| `id` | Tak | ID zadania z `schedule list` (format: `sch_<base32-12>`) |

Jeśli usunięcie z harmonogramu systemu operacyjnego nie powiedzie się (np. backend jest chwilowo niedostępny), pojawi się ostrzeżenie, ale wpis manifestu zostanie usunięty.

**Przykład:**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run

Wykonaj zaplanowane zadanie według ID. Jest to wywoływane przez harmonogram systemowy w chwili uruchomienia i zwykle nie wywołuje się tego ręcznie.

```
oma schedule run <id>
```

Wrapper:
1. Wyszukuje ID zadania w manifeście. Kończy się niezerowym kodem, gdy go nie znajdzie.
2. Ładuje przechwycone zmienne środowiskowe z `~/.agents/schedule/env/<id>` (jeśli istnieją) i wstrzykuje je do uruchamianego procesu.
3. Wywołuje `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Zapisuje wynik uruchomienia w `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Aktualizuje `lastFiredAt` w manifeście.
6. Jeśli ustawiono `--once`, usuwa zadanie (manifest + harmonogram systemowy).

**Błędy uwierzytelnienia są jawne:** gdy poświadczenia dostawcy wygasły, zadanie kończy się niezerowym kodem i wypisuje `re-auth required: <vendor>` na stderr. Nie kończy się po cichu sukcesem. Można skonfigurować opcjonalne powiadomienie `oma-voice`.

Możesz ręcznie wywołać `schedule run` do debugowania:

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync

Ponownie zsynchronizuj manifest z harmonogramem systemu operacyjnego. Użyj po migracjach systemu, resetach harmonogramu systemowego albo do naprawy rozbieżności.

```
oma schedule sync [--prune]
```

**Opcje:**

| Flaga | Opis |
|---|---|
| `--prune` | Usuń też zadania systemowe obecne w harmonogramie, ale nie w manifeście (stan orphan-in-os). Bez `--prune` osierocone zadania są zgłaszane, ale nieusuwane. |

**Przykłady:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` uruchamia to samo uzgadnianie (bez `--prune`) po każdej aktualizacji, więc wydanie CLI zmieniające zapis polecenia `oma schedule run` nie może pozostawić istniejących rejestracji w systemie wskazujących polecenie, które nowy plik binarny odrzuca. Rejestracje zapisane przez starsze wersje z `oma schedule:run <id>` także nadal działają: ten starszy zapis pozostaje akceptowany dla zadań wywoływanych przez system.

---

## Układ przechowywania

Cały stan harmonogramu znajduje się w `~/.agents/schedule/`:

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

Uprawnienia:
- katalog `~/.agents/schedule/`: `0700`
- pliki `schedules.json` i `env/<id>`: `0600`

**Sekrety nigdy nie są zapisywane w `schedules.json`.** Flaga `--env` zapisuje tylko nazwane klucze w osobnym pliku `0600` w `env/`. Przechwytywane są wyłącznie jawnie wymienione klucze; pełny zrzut środowiska nigdy nie jest przechowywany.

---

## Uwagi dotyczące bezpieczeństwa

- `schedule create` to operacja zaufanej ścieżki: zadania może rejestrować tylko uwierzytelniony użytkownik. Nie udostępniaj `schedule create` zewnętrznym ani niezaufanym danym wejściowym. Zaplanowany prompt jest dowolnym kodem uruchamianym w przyszłości.
- `schedule run` wykonuje tylko zadania, których ID istnieje w manifeście. Wstrzyknięcie dowolnych argv nie jest możliwe.
- Poświadczenia dostawców na dysku (np. `~/.codex/auth.json`, `~/.grok/auth.json`) są używane bez zmian do dispatchu bez interfejsu. Nie jest stosowana dodatkowa bramka uwierzytelnienia. Po wygaśnięciu poświadczeń zadanie kończy się głośnym błędem.

---

## Wskazówki i rozwiązywanie problemów

**Sprawdzanie logów uruchomień:**

```bash
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**Po restarcie systemu zadanie ma stan `missing-in-os`:**

Uruchom `oma schedule sync`, aby ponownie zarejestrować wszystkie zadania manifestu w harmonogramie systemu.

**Zadanie uruchomiło się, ale poświadczenia dostawcy wygasły:**

Sprawdź log uruchomienia pod kątem `re-auth required: <vendor>`. Uwierzytelnij się ponownie przez CLI dostawcy (np. `claude login`, `codex login`) i ręcznie uruchom `oma schedule run <id>`, aby sprawdzić wynik przed następnym zaplanowanym uruchomieniem.

**`--every` zaokrągliło mój interwał:**

Gdy oma zaokrągla interwał, wypisuje informację wyjaśniającą zmianę. Jeśli potrzebujesz dokładnego interwału, który nie dzieli równo 60 minut ani 24 godzin, użyj `--cron` z jawnym wyrażeniem pięciopolowym.

**Usuwanie wszystkich zadań projektu:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Obsługa Windows:**

W Windows oma używa `schtasks` do rejestracji zadań. Wykrywanie rozbieżności przez `schedule list` i polecenia `schedule sync` działają tak samo na wszystkich platformach.

Pamiętaj, że `schtasks` nie może wyrazić każdego kształtu cron. Obsługiwane kształty to: `*/N * * * *` (co N minut), `M * * * *` (co godzinę o :M), `M H * * *` (codziennie), `M H * * D` (co tydzień; `D` może być pojedynczym dniem, zakresem takim jak `1-5` albo listą rozdzielaną przecinkami, taką jak `1,3,5`) oraz `M H D * *` (co miesiąc). Inne wyrażenia (np. lista rozdzielana przecinkami w polu minut) są odrzucane podczas `schedule create` w Windows.
