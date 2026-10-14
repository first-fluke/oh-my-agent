---
title: "Przewodnik: silnik diagramów (archify)"
sidebar_label: Diagramy
description: Jak oh-my-agent wybiera między Mermaid a opcjonalną umiejętnością agenta tt-a1i/archify dla diagramów architektury, sekwencji i przepływu danych — sekcja konfiguracji diagramów, oma diagram resolve / oma diagram archify, użycie przez /architecture i /explain oraz ograniczona pętla validate-repair-deliver.
---

# Silnik diagramów

`/architecture` (ADR-y, rekomendacje, przeglądy) i `/explain` (objaśnienia zmian kodu) emitują diagramy strukturalne. W przypadku `/architecture` są to zawsze bloki **Mermaid** wewnątrz artefaktu Markdown (`/explain` rysuje własne diagramy inline SVG), a — gdy można rozstrzygnąć [archify](https://github.com/tt-a1i/archify), co jest normalnym przypadkiem — dodatkowo **interaktywny, zwalidowany diagram HTML** obok artefaktu: z motywem ciemnym/jasnym, przesuwaniem i powiększaniem, wyszukiwaniem, śledzeniem relacji, eksportem PNG/SVG/WebM oraz renderowaniem z typowanej specyfikacji JSON.

Mermaid nigdy nie znika: to tekstowy SSOT obecny w Markdownie i diffach Git. archify jest artefaktem pochodnym.

---

## Zawsze najnowszy archify — niczego nie instalujesz {#always-the-latest-archify--nothing-to-install}

archify to umiejętność agenta na licencji MIT (Node ≥ 18, zero zależności runtime’u). oh-my-agent nie polega na kopii zainstalowanej raz przez Ciebie; utrzymuje **własną zarządzaną kopię** i śledzi najnowsze wydanie:

- Cache: `~/.cache/oma-diagram/archify/<tag>/` oraz wskaźnik `state.json`.
- Przed każdym użyciem `oma diagram resolve` pyta GitHub o najnowszy tag wydania (maksymalnie raz na `check_interval_min`, domyślnie co 60 min), pobiera archiwum źródłowe, gdy istnieje nowszy tag (atomowy katalog per tag; starsze tagi są usuwane), a w przeciwnym razie używa kopii z cache.
- Błędy sieci nigdy nie są krytyczne: używana jest kopia z cache i raportowany stan `stale` wraz z przyczyną. Tylko pierwsze uruchomienie bez sieci i bez cache przechodzi do kopii umiejętności zainstalowanej przez użytkownika, a następnie do Mermaid.

```bash
# Illustrative output; the release tag, cache path, and quality can vary.
oma diagram update          # force a check / download now
oma diagram resolve
# engine:   archify  (requested: auto)
# reason:   archify 2.15.0 via managed:v2.15.0 (current)
# root:     /Users/you/.cache/oma-diagram/archify/v2.15.0
# bin:      /Users/you/.cache/oma-diagram/archify/v2.15.0/bin/archify.mjs
# version:  2.15.0
# quality:  showcase
# sidecar:  off (explain)
oma diagram resolve --offline   # never touch the network
```

Kolejność rozstrzygania (wygrywa pierwsze trafienie, identyczna w każdym runtime’ie dostawcy):

1. `diagram.archify.path` w `oma-config.yaml` — jawne przypięcie, które wyłącza automatyczne najnowsze wydanie
2. Zmienna środowiskowa `ARCHIFY_HOME` — jawne przypięcie
3. **Zarządzane najnowsze wydanie** (`~/.cache/oma-diagram/archify`)
4. Katalogi umiejętności użytkownika: projektowe `.agents` / `.claude` / `.codex` / `.cursor` / `.qwen` / `.kiro` `/skills/archify`, następnie te same ścieżki pod `~`, a także `~/.raven/workspace/skills/archify`

<!-- oma-docs:ignore-start -->
Trafienie wymaga, aby zarządzana albo przypięta instalacja archify zawierała `bin/archify.mjs`.
<!-- oma-docs:ignore-end -->

---

## Konfiguracja

Częściowa sekcja w `.agents/oma-config.yaml` (brakujące klucze używają pokazanych wartości domyślnych):

```yaml
diagram:
  engine: auto                # auto | archify | mermaid
  explain_sidecar: false      # /explain also writes an archify sidecar
  archify:
    managed: true             # false = never download; use pins / skill dirs only
    channel: stable           # stable (latest GitHub Release) | main (HEAD of main)
    check_interval_min: 60    # minutes between remote checks; 0 = every call
    path: null                # explicit install dir (pin)
    quality: showcase         # showcase | standard  → --quality
    open: false               # pass --open to deliver
```

### Który silnik jest używany {#which-engine-runs}

Jedna decyzja obejmuje wartość konfiguracji, to, czy archify zostaje rozstrzygnięty, oraz to, co dostarcza workflow. „Rozstrzygnięty” oznacza, że dowolny krok [kolejności rozstrzygania](#always-the-latest-archify--nothing-to-install) znajduje instalację: przypięcie, zarządzaną najnowszą kopię albo katalog umiejętności zainstalowanej przez użytkownika.

| `diagram.engine` | Czy archify zostaje rozstrzygnięty? | `oma diagram resolve --json` | Wynik `/architecture` |
|---|---|---|---|
| `auto` (domyślnie) | tak | `engine: archify`, `ok: true` | Blok Mermaid + połączony `.archify.html` |
| `auto` | nie (na przykład pierwsze uruchomienie offline albo `managed: false` bez katalogu umiejętności) | `engine: mermaid`, `ok: true` | Tylko Mermaid; raport mówi, aby raz online uruchomić `oma diagram update` |
| `archify` | tak | `engine: archify`, `ok: true` | Blok Mermaid + połączony `.archify.html` |
| `archify` | nie | `engine: mermaid`, `ok: false`, kod wyjścia 1 | Workflow zatrzymuje się ze wskazówką `oma diagram update` zamiast po cichu obniżać możliwości |
| `mermaid` | niesprawdzane | `engine: mermaid`, `ok: true` | Tylko Mermaid; archify nigdy nie jest wywoływany |

`oma diagram resolve --engine <auto|archify|mermaid>` nadpisuje konfigurację dla jednego wywołania, a prompt może zrobić to samo dla jednego uruchomienia (`/explain 640 with archify`).

---

## CLI

```bash
oma diagram resolve [--engine auto|archify|mermaid] [--refresh] [--offline] [--json]
oma diagram update  [--json]
oma diagram archify <archify args…>
```

`oma diagram update` wymusza odświeżenie i kończy się kodem 1, gdy nie można rozstrzygnąć żadnej instalacji archify.

`oma diagram archify` uruchamia rozstrzygnięty plik wykonywalny archify z `ARCHIFY_UPDATE_CHECK_DISABLED=1` (bez sieci) i przekazuje kod wyjścia, więc `validate` / `deliver` / `visual-check` zachowują się dokładnie tak, jak opisuje archify:

```bash
oma diagram archify guide "show the auth request lifecycle" --json
oma diagram archify validate architecture adr-auth.archify.json --quality showcase --json
oma diagram archify deliver  architecture adr-auth.archify.json adr-auth.archify.html --quality showcase --json
oma diagram archify visual-check adr-auth.archify.html --json   # exit 2 = no Chrome (skipped), or archify itself could not be resolved
```

`--json` przy `resolve` zwraca `{ ok, requested, engine, quality, open, explainSidecar, archify?: { root, bin, version, source, status?, note? }, reason, probed }` — `source` to `managed:<tag>`, `config:…`, `env:…` albo etykieta katalogu umiejętności; `status` (`fresh` / `current` / `stale`) i `note` są ustawiane dla kopii zarządzanych.

---

## Jak workflowy tego używają

Wspólny protokół znajduje się w `.agents/skills/_shared/conditional/diagram-engine.md`. `/architecture` wykonuje tę sekwencję:

1. `oma diagram resolve --json`
2. Najpierw zawsze napisz blok Mermaid.
3. Gdy `engine: archify`: przetłumacz topologię Mermaid na JSON IR archify (`architecture` / `sequence` / `dataflow` / `lifecycle` / `workflow`), odczytując z instalacji tylko pasujący schemat i jeden przykład.
4. `validate` → naprawa → `deliver` z ograniczeniem: zatrzymaj się, gdy specyfikacja przejdzie, gdy zadziała reguła zbieżności archify, po 3 próbach naprawy, po łącznie 10 minutach albo gdy powtórzy się ta sama diagnostyka. Etykiety semantyczne nigdy nie są usuwane tylko po to, aby przejść kontrolę.
5. Połącz HTML — nigdy go nie osadzaj.

```mermaid
flowchart TD
  resolve["oma diagram resolve --json"] -->|"ok: false"| stop["Stop: run oma diagram update once online"]
  resolve -->|"ok: true"| author["Author the Mermaid block"]
  author --> engine{"engine?"}
  engine -->|mermaid| mermaidOnly["Deliver the Mermaid block"]
  engine -->|archify| spec["Translate the topology into .archify.json"]
  spec --> loop["validate and repair (bounded)"]
  loop -->|passes| deliver["deliver .archify.html"]
  loop -->|"bound or convergence reached"| keep["Keep Mermaid, leave .archify.json, report diagnostics"]
  deliver --> link["Link the HTML from the Markdown"]
```

### `/architecture` {#architecture}

Tylko dla decyzji strukturalnych (granice, zależności, przepływ danych). Wynik obok artefaktu Markdown w `.agents/results/architecture/`:

```text
adr-notification-service.md            # Mermaid block + "Interactive:" link
adr-notification-service.archify.json  # frozen spec (kept even on failure)
adr-notification-service.archify.html  # delivered viewer
```

### `/explain` {#explain}

Opcjonalne, ponieważ własny kontrakt objaśnienia (pojedynczy samodzielny plik, motywowanie zmiennymi CSS) nie pozwala osadzić drugiego pełnego dokumentu HTML. Włącz przez `diagram.explain_sidecar: true`, przekaż `oma explain render --archify` albo poproś w prompcie („with archify”). Nie ma bloku Mermaid ani ręcznie pisanego JSON-a: renderer wyprowadza specyfikację archify z bloku `flow` albo `sequence` w szkicu (panelu oznaczonego `{archify}`), uruchamia `deliver` (jednokrotnie przechodząc z jakości `showcase` na `standard` w razie niepowodzenia) i łączy `{date}-{slug}.archify.html` zwykłym `<a href>`. Polecenie raportuje `linked`, `skipped` (z przyczyną) albo `failed` (pierwsza diagnostyka). Workflow nie zapętla się na nieudanym sidecarze, a błąd sidecara nigdy nie blokuje objaśnienia.

---

## Tryby awarii

Nierozstrzygalny archify opisuje [tabela decyzji o silniku](#which-engine-runs). Pozostałe przypadki:

| Sytuacja | Wynik |
|---|---|
| Nieudane sprawdzenie aktualizacji (offline, ograniczenie częstotliwości) | Kopia z cache jest używana i raportowana jako `stale` wraz z przyczyną |
| `validate` nigdy nie osiąga zbieżności | Dostarczony pozostaje Mermaid; ostatni `.archify.json` zostaje dla człowieka, a diagnostyka jest raportowana dosłownie |
| Brak Chrome dla `visual-check` | Raportowane jako `skipped`, nigdy jako przejście |
| `oma diagram archify …` kończy się kodem 2 | Brakuje Chrome (`visual-check`) albo nie można rozstrzygnąć archify; najpierw sprawdź `oma diagram resolve --json` |

---

## Następne kroki

- [Objaśnianie kodu](./code-explainer.md) — workflow `/explain` i jego opcjonalny sidecar archify
- [Workflow `/architecture`](../core-concepts/workflows.md#architecture) — ADR-y i przeglądy zawierające blok Mermaid
- [Semantyka oma-config.yaml](./oma-config-semantics.md) — jak scalana jest sekcja `diagram:`
- [Polecenia CLI: diagram](../cli-interfaces/commands.md#diagram) — pełna lista opcji
- [Badanie rynku](./market-research.md) — ten sam wzorzec zarządzanego najnowszego wydania dla silnika last30days
- Upstream archify: [tt-a1i/archify](https://github.com/tt-a1i/archify)
