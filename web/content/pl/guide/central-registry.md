---
title: Centralny rejestr
description: Szczegółowa dokumentacja centralnego rejestru — workflow release-please, konwencjonalne commity, szablony konsumentów, format .agent-registry.yml i porównanie z podejściem GitHub Action.
---

# Centralny rejestr

## Przegląd

Model centralnego rejestru traktuje repozytorium GitHub oh-my-agent (`first-fluke/oh-my-agent`) jako wersjonowane źródło artefaktów. Projekty konsumenckie pobierają konkretne wersje umiejętności i workflow z tego rejestru, zapewniając spójność między zespołami i projektami.

To podejście klasy enterprise dla organizacji potrzebujących: przypinania wersji, audytowalnych śladów aktualizacji, weryfikacji sum kontrolnych, automatycznych cotygodniowych sprawdzeń i ręcznego przeglądu przed każdą aktualizacją.

---

## Architektura

Centralny rejestr (first-fluke/oh-my-agent) produkuje wydania z tarballem, sumą SHA256 i manifestem. Każdy projekt konsumencki posiada `.agent-registry.yml` z przypiętą wersją, workflow `check-registry-updates.yml` do sprawdzania nowych wersji i `sync-agent-registry.yml` do stosowania aktualizacji.

---

## Dla maintainerów: Wydawanie nowych wersji

oh-my-agent używa [release-please](https://github.com/googleapis/release-please) do automatyzacji wydań. Konwencjonalne commity na `main` wyzwalają:

| Prefiks | Znaczenie | Podbicie wersji |
|:-------|:--------|:-------------|
| `feat:` | Nowa funkcjonalność | Minor (1.x.0) |
| `fix:` | Naprawa błędu | Patch (1.0.x) |
| `feat!:` | Zmiana łamiąca | Major (x.0.0) |
| `chore:`, `docs:`, `refactor:` | Utrzymanie/dokumentacja | Brak podbicia |

Artefakty wydania: `agent-skills.tar.gz`, `agent-skills.tar.gz.sha256`, `prompt-manifest.json`.

---

## Dla konsumentów: Konfiguracja projektu

### Format .agent-registry.yml

```yaml
registry:
  repo: first-fluke/oh-my-ag

version: "4.7.0"

auto_update:
  enabled: true
  schedule: "0 9 * * 1"  # Każdy poniedziałek o 9:00 UTC
  pr:
    auto_merge: false     # Z założenia wymagany ręczny przegląd
    labels: ["dependencies", "agent-registry"]

sync:
  target_dir: "."
  backup_existing: true
  preserve:
    - ".agent/config/user-preferences.yaml"
    - ".agent/config/local-*"
```

### Role workflow

**check-registry-updates.yml** — Sprawdza nowe wersje, tworzy PR z aktualizacją jeśli dostępna.

**sync-agent-registry.yml** — Pobiera i stosuje pliki rejestru po zmianie wersji. Weryfikuje sumę SHA256, tworzy backup, wyodrębnia, przywraca zachowane pliki.

---

## Porównanie: Centralny rejestr vs GitHub Action

| Aspekt | Centralny rejestr | GitHub Action |
|:-------|:----------------|:-------------|
| **Złożoność konfiguracji** | Wyższa — 3 pliki | Niższa — 1 plik workflow |
| **Kontrola wersji** | Jawne przypinanie | Zawsze najnowsza |
| **Weryfikacja sum kontrolnych** | Tak — SHA256 | Nie |
| **Wycofanie** | Zmiana wersji w pliku | Revert commita |
| **Zatwierdzanie** | Wymagany przegląd PR | Konfigurowalne |
| **Najlepsze dla** | Wiele projektów, zgodność | Proste projekty |

---

## Kiedy którego używać

**Centralny rejestr** — wiele projektów na tej samej wersji, audytowalne PR z sumami kontrolnymi, polityka bezpieczeństwa wymagająca jawnego zatwierdzenia, środowiska air-gapped.

**GitHub Action** — pojedynczy projekt, najprostsza konfiguracja, automatyczne aktualizacje, wbudowane zachowanie plików konfiguracyjnych.
