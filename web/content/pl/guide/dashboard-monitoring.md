---
title: Monitorowanie panelem kontrolnym
description: Kompleksowy przewodnik po panelu kontrolnym obejmujący panele terminala i webowe, źródła danych, układ 3-terminalowy, rozwiązywanie problemów i szczegóły techniczne implementacji.
---

# Monitorowanie panelem kontrolnym

## Dwa polecenia panelu kontrolnego

| Polecenie | Interfejs | URL | Technologia |
|:--------|:---------|:----|:-----------|
| `oma dashboard` | Terminal (TUI) | N/A — renderuje w terminalu | chokidar file watcher, picocolors |
| `oma dashboard:web` | Przeglądarka | `http://localhost:9847` | Serwer HTTP, WebSocket, chokidar |

Oba panele obserwują to samo źródło danych: katalog `.serena/memories/`.

### Panel w terminalu
```bash
oma dashboard
```
Renderuje UI z rysowaniem ramek bezpośrednio w terminalu. Aktualizuje się automatycznie przy zmianach plików pamięci. `Ctrl+C` aby wyjść.

**Symbole statusu:** `●` (zielony) — running, `✓` (cyan) — completed, `✗` (czerwony) — failed, `○` (żółty) — blocked, `◌` (przyciemniony) — pending.

### Panel webowy
```bash
oma dashboard:web
# Lub z niestandardowym portem:
DASHBOARD_PORT=8080 oma dashboard:web
```

Ciemny motyw z: znacznikiem stanu połączenia, tabelą statusu agentów, kanałem aktywności i automatycznym odświeżaniem.

---

## Zalecany układ 3-terminalowy

```
┌────────────────────────────────┬────────────────────────────────┐
│   Terminal 1: Główny agent     │   Terminal 2: Panel kontrolny  │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
├────────────────────────────────┴────────────────────────────────┤
│   Terminal 3: Polecenia ad-hoc                                  │
│   $ oma agent:status session-id backend frontend                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Źródła danych w .serena/memories/

| Wzorzec pliku | Tworzony przez | Zawartość |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Krok 2 | ID sesji, czas startu, status, wersja workflow |
| `task-board.md` | Workflow orkiestracji | Tabela Markdown z przypisaniami agentów, statusami, zadaniami |
| `progress-{agent}.md` | Każdy uruchomiony agent | Bieżący numer tury, nad czym agent pracuje |
| `result-{agent}.md` | Każdy zakończony agent | Końcowy status, zmienione pliki, znalezione problemy |
| `experiment-ledger.md` | System Quality Score | Śledzenie eksperymentów: bazowe wyniki, delty, decyzje keep/discard |

---

## Rozwiązywanie problemów

### Sygnał 1: Agent "running" ale brak postępu tur
Sprawdź log: `cat /tmp/subagent-{session-id}-{agent-id}.log`. Sprawdź czy proces żyje: `oma agent:status`.

### Sygnał 2: Agent "crashed"
Sprawdź log po szczegóły, zweryfikuj CLI: `oma doctor`, sprawdź auth: `oma auth:status`. Uruchom ponownie.

### Sygnał 3: "No agents detected yet"
Workflow może być jeszcze w fazie planowania. Zweryfikuj katalog pamięci: `ls -la .serena/memories/`.

### Sygnał 4: Panel webowy "Disconnected"
Sprawdź czy proces panelu działa. Spróbuj innego portu. Panel automatycznie łączy się ponownie z wykładniczym backoffem (1s start, maks. 10s).

---

## Lista kontrolna monitoringu przed merge

- [ ] Wszystkie agenci pokazują "completed"
- [ ] Żaden agent nie pokazuje "failed"
- [ ] Agent QA zakończył przegląd
- [ ] Zero znalezisk CRITICAL/HIGH
- [ ] Status sesji to COMPLETED
- [ ] Kanał aktywności pokazuje raport końcowy

---

## Szczegóły techniczne

**Panel terminala:** chokidar z `awaitWriteFinish` (200ms), pełne przerysowanie na każdą zmianę pliku, `picocolors` dla kolorów ANSI.

**Panel webowy:** Serwer Node.js HTTP + biblioteka `ws` WebSocket. Debouncing 100ms. Automatyczne ponowne połączenie w przeglądarce z wykładniczym backoffem. Port domyślny 9847, konfigurowlny przez `DASHBOARD_PORT`.
