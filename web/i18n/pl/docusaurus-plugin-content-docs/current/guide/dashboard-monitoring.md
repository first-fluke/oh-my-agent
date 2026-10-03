---
title: "Przewodnik: monitorowanie dashboardu"
sidebar_label: Monitorowanie dashboardu
description: "Monitoruj sesje OMA z terminala albo przez webowy dashboard na loopbacku, wybieraj katalog stanu i odzyskuj działanie po typowych problemach z połączeniem i wykrywaniem."
---

# Przewodnik: monitorowanie dashboardu

## Dwie komendy dashboardu

oh-my-agent udostępnia dwa dashboardy czasu rzeczywistego do monitorowania aktywności agentów podczas workflowów wieloagentowych.

| Komenda | Interfejs | URL | Technologia |
|:--------|:---------|:----|:-----------|
| `oma dashboard terminal` | Terminal (TUI) | N/D (renderuje w terminalu) | watcher plików chokidar, renderowanie picocolors |
| `oma dashboard web` | Przeglądarka | `http://127.0.0.1:9847` (token wypisywany przy uruchomieniu) | serwer HTTP, WebSocket, watcher plików chokidar |

Oba dashboardy domyślnie obserwują `.agents/state/memories/`. Ustaw `MEMORIES_DIR`, gdy pliki koordynacji znajdują się gdzie indziej. Dashboard nie przełącza się automatycznie na `.serena/memories/`.

### Dashboard terminalowy

```bash
oma dashboard terminal
```

Renderuje bezpośrednio w terminalu interfejs z ramkami znakowymi. Aktualizuje się automatycznie po zmianie plików pamięci. Naciśnij `Ctrl+C`, aby wyjść.

```
╔════════════════════════════════════════════════════════╗
║  OMA Memory Dashboard                                 ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**Symbole statusu:**
- `●` (zielony): działanie
- `✓` (cyjan): ukończony
- `✗` (czerwony): nieudany
- `○` (żółty): zablokowany
- `◌` (przygaszony): oczekujący

### Dashboard webowy

```bash
oma dashboard web
```

Uruchamia wyłącznie loopbackowy serwer webowy na porcie 9847 (możesz go zmienić przez `DASHBOARD_PORT`). OMA wypisuje URL zawierający `127.0.0.1`; otwórz dokładny URL i zachowaj token. Strona używa tokenu dla `/api/state`, `/api/recap` i aktualizacji WebSocket. Żądania bez tokenu zwracają `401`.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# The process also serves the recap view at /recap; use the tokenized URL it prints.
```

Dashboard webowy pokazuje te same informacje co dashboard terminalowy, ale w stylizowanym interfejsie z ciemnym motywem, który zawiera:
- plakietkę stanu połączenia (Connected / Disconnected / Connecting z automatycznym ponownym łączeniem)
- pasek ID i statusu sesji
- tabelę statusów agentów z animowanymi kropkami statusu
- strumień najnowszej aktywności
- automatycznie aktualizowane znaczniki czasu

---

## Zalecany układ trzech terminali

W workflowach wieloagentowych zalecana konfiguracja używa trzech paneli terminala:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Main Agent       │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard terminal              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc commands                                   │
│                                                                 │
│   $ oma agent status session-20260324-143052 backend frontend   │
│   $ oma stats get                                                   │
│   $ oma verify agent backend -w ./api                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal 1** uruchamia główną sesję agenta (Gemini CLI, Claude Code, Codex itd.), w której pracujesz z workflowami takimi jak `/orchestrate` albo `/work`.

**Terminal 2** uruchamia dashboard do biernego monitorowania. Aktualizuje się automatycznie i nie wymaga interakcji.

**Terminal 3** służy do komend ad hoc: sprawdzania statusu agentów, uruchamiania weryfikacji, przeglądania statystyk i diagnozowania problemów.

---

## Źródła danych w .agents/state/memories/

Dashboardy odczytują katalog `.agents/state/memories/`. Agenci i workflowy wypełniają go plikami koordynacji podczas wykonania. Użyj `MEMORIES_DIR`, gdy stan projektu jest przechowywany w innym miejscu.

### Typy plików i ich zawartość

| Wzorzec pliku | Utworzony przez | Zawartość |
|:-------------|:---------------|:----------|
| `orchestrator-session.md` | Krok 2 `/orchestrate` | ID sesji, czas rozpoczęcia, status (RUNNING/COMPLETED/FAILED), wersja workflowu |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Metadane sesji, postęp fazy, podsumowanie żądania użytkownika |
| `task-board.md` | Workflowy orkiestracji | Tabela Markdown z przydziałami agentów, statusami i zadaniami |
| `progress-{agent}.md` | Każdy uruchomiony agent | Bieżąca tura, nad czym agent pracuje, wyniki pośrednie |
| `result-{agent}.md` | Każdy ukończony agent | Status końcowy (COMPLETED/FAILED), zmienione pliki, znalezione problemy, dostarczone rezultaty |
| `debug-{id}.md` | Workflow `/debug` | Diagnoza błędu, przyczyna źródłowa, zastosowana poprawka, lokalizacja testu regresji |
| `experiment-ledger-{sessionId}.md` | Rzeczywiste eksperymenty | Porównywalne dowody bazowe i kandydata, wymagane kontrole i decyzje |
| `lessons-{sessionId}.md` | Gdy przyczyna nadająca się do ponownego użycia jest poparta dowodami | Wnioski ograniczone do sesji; bez generowania wyzwalanego punktacją |

### Jak dashboard odczytuje pliki

Dashboard korzysta z kilku strategii wydobywania informacji:

1. **Wykrywanie sesji:** Najpierw szuka `orchestrator-session.md`, a następnie przechodzi do najnowszego zmodyfikowanego pliku `session-*.md`. Status rozpoznaje po słowach kluczowych: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.
2. **Parsowanie task boardu:** Odczytuje `task-board.md` jako tabelę Markdown. Wydobywa nazwę agenta, status i opis zadania z kolumn.
3. **Wykrywanie agentów:** Jeśli nie ma task boardu, wyszukuje agentów we wszystkich plikach `.md` na podstawie wzorców `**Agent**: {name}`, wierszy `Agent: {name}` albo nazw plików zawierających `_agent` lub `-agent`.
4. **Liczenie tur:** Dla każdego wykrytego agenta odczytuje pliki `progress-{agent}.md` i wydobywa numer tury ze wzorców `turn: N`.
5. **Strumień aktywności:** Wypisuje 5 ostatnio zmodyfikowanych plików `.md`, wydobywa ostatnią znaczącą linię (nagłówki, wiersze statusu, zadania) jako komunikat aktywności. Dashboard webowy udostępnia też widok podsumowania pod `/recap`.

---

## Co pokazuje każdy dashboard

### Status sesji

Górna sekcja pokazuje:
- **ID sesji:** Wydobyte z plików sesji (format `session-YYYYMMDD-HHMMSS`).
- **Status:** Oznaczony kolorami: zielony dla RUNNING, cyjanowy dla COMPLETED, czerwony dla FAILED, żółty dla UNKNOWN.

### Task board

Tabela agentów pokazuje każdego wykrytego agenta wraz z:
- **Nazwą agenta:** Identyfikator domeny (backend, frontend, mobile, qa, debug, pm).
- **Statusem:** Bieżący stan ze wskaźnikiem wizualnym (running/completed/failed/blocked/pending).
- **Turą:** Numer bieżącej tury agenta (liczba ukończonych przez niego iteracji). Wydobywany z plików postępu.
- **Zadaniem:** Krótki opis pracy agenta (skrócony, aby się zmieścił).

### Postęp agenta

Postęp jest śledzony przez pliki `progress-{agent}.md`. Każdy plik aktualizuje agent podczas pracy. Dashboard odpyta te pliki pod kątem:
- numeru tury (rośnie wraz z postępem agenta)
- bieżącego działania (co agent robi teraz)
- wyników pośrednich (częściowe ukończenia)

### Wyniki

Po ukończeniu agent zapisuje `result-{agent}.md` z:
- statusem końcowym (COMPLETED lub FAILED)
- listą zmienionych plików
- napotkanymi problemami
- dostarczonymi rezultatami

Dashboard wykrywa ukończenie po obecności tego pliku i odpowiednio aktualizuje status agenta.

---

## Runbook rozwiązywania problemów

### Sygnał 1: agent pokazuje „running”, ale numer tury się nie zmienia

**Objaw:** Dashboard pokazuje agenta jako działającego, ale numer tury od kilku minut pozostaje bez zmian.

**Możliwe przyczyny:**
- Agent utknął na długiej operacji (skan dużej bazy kodu, wolne wywołanie API).
- Agent uległ awarii, ale plik PID nadal istnieje.
- Agent czeka na dane od użytkownika (w trybie automatycznej akceptacji nie powinno się to zdarzyć).

**Działania:**
1. Sprawdź plik logu agenta: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Sprawdź, czy proces rzeczywiście działa: `oma agent status {session-id} {agent-id}`
3. Jeśli proces nie działa, ale status pokazuje „running”, agent uległ awarii. Uruchom ponownie z kontekstem błędu.

### Sygnał 2: agent pokazuje „crashed”

**Objaw:** `oma agent status` zwraca `crashed` dla agenta.

**Możliwe przyczyny:**
- Proces CLI dostawcy niespodziewanie się zakończył (brak pamięci, przekroczony limit API, timeout sieci).
- Katalog workspace został usunięty albo zmieniły się uprawnienia.
- CLI dostawcy nie jest zainstalowane albo nie jest uwierzytelnione.

**Działania:**
1. Sprawdź plik logu pod kątem szczegółów błędu: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Sprawdź instalację CLI: `oma doctor`
3. Sprawdź uwierzytelnienie: `oma auth status`
4. Uruchom agenta ponownie z tym samym zadaniem: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Sygnał 3: dashboard pokazuje „no agents detected yet”

**Objaw:** Dashboard działa, ale nie pokazuje agentów.

**Możliwe przyczyny:**
- Workflow nie doszedł jeszcze do etapu uruchamiania agentów.
- Katalog `.agents/state/memories/` jest pusty.
- Dashboard obserwuje niewłaściwy katalog.

**Działania:**
1. Sprawdź katalog pamięci: `ls -la .agents/state/memories/`
2. Sprawdź, czy workflow nadal jest w fazie planowania (agenci nie zostali jeszcze uruchomieni).
3. Upewnij się, że dashboard obserwuje właściwy katalog projektu: ścieżkę pamięci rozstrzyga na podstawie bieżącego katalogu.
4. Przy ścieżce niestandardowej: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### Sygnał 4: dashboard webowy pokazuje „disconnected”

**Objaw:** Plakietka połączenia dashboardu webowego pokazuje na czerwono „Disconnected”.

**Możliwe przyczyny:**
- Proces `oma dashboard web` został zakończony.
- Przeglądarka używa nieaktualnego URL-a albo brakuje tokenu uruchomienia.
- Port jest zajęty przez inny proces.

**Działania:**
1. Sprawdź, czy proces dashboardu działa: `ps aux | grep dashboard`
2. Otwórz ponownie dokładny URL z tokenem wypisany przez proces; nie usuwaj tokenu.
3. Spróbuj innego portu: `DASHBOARD_PORT=8080 oma dashboard web`
4. Sprawdź dostępność portu: `lsof -i :9847`
5. Dashboard webowy automatycznie łączy się ponownie z wykładniczym backoffem (start 1 s, mnożnik 1,5, maksimum 10 s), gdy połączenie WebSocket zostanie zerwane. Odczekaj kilka sekund na ponowne połączenie.

---

## Checklista monitorowania przed scaleniem

Przed uznaniem sesji wieloagentowej za ukończoną zweryfikuj przez dashboard:

- [ ] **Wszyscy agenci pokazują „completed”:** Żaden agent nie utknął w stanie „running” ani „blocked”.
- [ ] **Żaden agent nie pokazuje „failed”:** Jeśli któryś zawiódł, sprawdź logi i uruchom go ponownie.
- [ ] **Agent QA ukończył przegląd:** Poszukaj `result-qa-agent.md` albo `result-qa.md`.
- [ ] **Zero ustaleń CRITICAL/HIGH:** Sprawdź plik wyniku QA pod kątem liczników ważności.
- [ ] **Status sesji to COMPLETED:** Plik sesji powinien pokazywać końcowy status.
- [ ] **Strumień aktywności pokazuje raport końcowy:** Ostatnia aktywność powinna być raportem podsumowującym.

---

## Kryteria ukończenia

Monitorowanie dashboardu jest ukończone, gdy:
1. Wszyscy uruchomieni agenci osiągnęli stan końcowy (completed albo failed-and-handled).
2. Cykl przeglądu QA zakończył się bez problemów blokujących.
3. Status sesji odzwierciedla końcowy wynik.
4. Wyniki zapisano w pamięci na potrzeby przyszłych sesji.

---

## Szczegóły techniczne

### Dashboard terminalowy (oma dashboard terminal)

- **Obserwowanie plików:** Używa [chokidar](https://github.com/paulmillr/chokidar) z `awaitWriteFinish` (próg stabilności 200 ms, interwał odpytywania 50 ms), aby nie renderować częściowych zapisów plików.
- **Renderowanie:** Czyści i ponownie rysuje cały terminal przy każdym zdarzeniu zmiany pliku. Używa `picocolors` do kolorów ANSI i znaków Unicode do obramowania.
- **Katalog pamięci:** Rozstrzygany z `MEMORIES_DIR`, następnie z argumentu CLI dashboardu, a potem z `{cwd}/.agents/state/memories`.
- **Łagodne zamknięcie:** Przechwytuje `SIGINT` i `SIGTERM`, zamyka watcher chokidar i kończy się bez błędu.

### Dashboard webowy (oma dashboard web)

- **Serwer HTTP:** Node.js `createServer` udostępnia stronę HTML pod `/`, stronę podsumowania pod `/recap`, stan JSON pod `/api/state` oraz dane podsumowania pod `/api/recap`. Serwer wiąże się z `127.0.0.1`.
- **WebSocket:** Używa biblioteki `ws`. Połączenie z loopbacku musi zawierać token procesu w query stringu. Po połączeniu klient od razu otrzymuje pełny stan. Kolejne aktualizacje są wysyłane jako komunikaty `{ type: "update", event, file, data }`.
- **Obserwowanie plików:** Ta sama konfiguracja chokidar co w dashboardzie terminalowym. Zmiany plików wywołują funkcję `broadcast()`, która buduje bieżący stan i wysyła go do wszystkich połączonych klientów WebSocket.
- **Debouncing:** Aktualizacje są opóźniane o 100 ms, aby nie zalewać klientów podczas szybkich zapisów (np. gdy wielu agentów jednocześnie zapisuje postęp).
- **Automatyczne ponowne łączenie:** Klient przeglądarkowy łączy się ponownie z wykładniczym backoffem (początkowo 1 s, mnożnik 1,5, maks. 10 s), gdy połączenie WebSocket zostanie przerwane.
- **Port:** Domyślnie 9847, konfigurowalny przez zmienną środowiskową `DASHBOARD_PORT`. Żądania API przyjmują `X-OMA-Dashboard-Token` albo `?token=...`; brakujące albo nieprawidłowe tokeny zwracają `401`.
- **Budowanie stanu:** Funkcja `buildFullState()` agreguje informacje o sesji, task board, statusy agentów, liczniki tur i strumień aktywności w jeden obiekt JSON przy każdej aktualizacji.
