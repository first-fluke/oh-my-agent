---
title: Wybierz konfigurację
description: Załaduj jedną umiejętność OMA do zadania, wybierz preset domenowy albo zainstaluj wtyczkę Claude Code wraz z zależnościami runtime'u.
---

# Wybierz konfigurację {#choose-a-setup}

Wybierz punkt wejścia dla zadania, które chcesz wykonać.

| Potrzeba | Punkt wejścia | Co konfiguruje |
|---|---|---|
| Jedno ukierunkowane zadanie w bieżącym agencie | [Załaduj jedną umiejętność](#load-one-skill) | Instrukcje i pliki pomocnicze w katalogu tymczasowym |
| Hooki projektu, wyspecjalizowani agenci i workflowy | [Zainstaluj preset umiejętności](#install-a-skill-preset) | Integracja runtime'u OMA z wybranymi umiejętnościami |
| Instalacja z marketplace Claude Code | [Zainstaluj wtyczkę](#install-the-claude-code-plugin) | Wtyczka OMA i bootstrap projektu |
| Instalacja pakietu Copilot CLI, Kiro, Qwen Code, Hermes albo Codex | [Pakiet Agent Plugins](../guide/vendor-capabilities.md#agent-plugins-package) | Umiejętności i serwery MCP dla każdego hosta; Copilot dostaje też agentów, polecenia, reguły i hook bootstrapu |

## Załaduj jedną umiejętność {#load-one-skill}

Poproś agenta kodującego, aby uruchomił polecenie dla zadania i przeczytał zwrócone instrukcje. `skills use` wypisuje instrukcje oraz ścieżkę do ich katalogu pomocniczego. Nie uruchamia innego agenta ani instalatora OMA.

| Zadanie | Polecenie | Pierwsza prośba |
|---|---|---|
| Projekt interfejsu administracyjnego albo przegląd istniejącego UI | `bunx skills use first-fluke/oh-my-agent@oma-design` | Przejrzyj hierarchię, gęstość tabeli i stany puste naszej strony administracyjnej. |
| Powtarzalny błąd | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Odtwórz tę awarię, usuń jej przyczynę i uruchom właściwą kontrolę. |
| Decyzja architektoniczna | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Porównaj pozostawienie tego zadania w API z przeniesieniem go do workera. |

Wybrany katalog zawiera swoje współdzielone odwołania do instrukcji. Zależności spoza tego katalogu pozostają jawne: inna umiejętność domenowa, reguły projektu, operacje CLI, narzędzia przeglądarki albo zewnętrzny silnik mogą nadal być potrzebne. Przeczytaj zależności wybranej umiejętności dla żądanej operacji. Zainstaluj runtime, gdy zadanie wymaga jego hooków albo zarządzanego wykonania.

Przy pracy projektowej `oma-design` wybiera Interface Design dla kierunku interfejsu administracyjnego i produktowego, Taste dla innej dyrekcji artystycznej webu oraz Impeccable dla krytyki, audytu i dopracowania istniejącego UI. Stos projektu i `DESIGN.md` pozostają kontraktami implementacji i projektu.

## Zainstaluj preset umiejętności {#install-a-skill-preset}

Zainstaluj CLI raz, a następnie wybierz umiejętności projektu:

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

Istniejąca instalacja CLI może zacząć od drugiego polecenia. Użyj `oma install --help`, aby zobaczyć nazwy presetów i opcje dostawców. [Instalator początkowy](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install) przygotowuje też zależności runtime'u przed konfiguracją interaktywną.

| Preset | Pierwsze zadanie | Przykłady pasujących workflowów |
|---|---|---|
| `frontend` | Zaplanuj stronę ustawień, a następnie zaimplementuj jej formularz | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Zaplanuj uwierzytelniony endpoint API | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Znajdź artykuły i porównaj ich dowody | Poproś o wyszukiwanie literatury z cytowaniami |
| `all` | Skoordynuj funkcję obejmującą UI, API i dane | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

[Nazwane presety](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets) są przyjmowane przez `--preset`. Nieznana nazwa, pusta wartość albo `custom` są odrzucane przed instalacją. Aby wybrać pojedyncze umiejętności, uruchom `oma install` interaktywnie i wybierz Custom. Bez `--preset` nienadzorowana konfiguracja `--yes`/CI wybiera `all`.

Preset frontend wybiera osiem umiejętności. Presety wybierają treść umiejętności; instalator nadal konfiguruje pliki współdzielone, wszystkie definicje workflowów i agentów, hooki oraz dostawców. Niektóre workflowy potrzebują umiejętności spoza presetu domenowego. Sprawdź [zależności workflowów](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset) przed ich użyciem albo wybierz `all` dla każdego workflowu. Mniejszy preset na istniejącej instalacji nie usuwa innych umiejętności.

Wybór dostawców jest niezależny od presetów. Na przykład dodaj `--semantic-memory none`, gdy projekt nie potrzebuje usługi pamięci semantycznej. Zobacz [skutki instalacji](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default), aby poznać pozostałe pliki i integracje konfigurowane przez runtime.

Podsumowanie instalacji wymienia wybrane umiejętności i sprawdza obecne manifesty umiejętności, w tym umiejętności zachowane. Raportuje statyczne odwołania workflowów i agentów, łącznie z gałęziami warunkowymi, jako odwołane manifesty umiejętności. Uruchom `oma doctor`, aby naprawić brakujące albo nieczytelne wpisy potrzebne do zadania. Te kontrole nie weryfikują zawartości zasobów, narzędzi, dostawców, poświadczeń ani wykonania.

## Zainstaluj wtyczkę Claude Code {#install-the-claude-code-plugin}

Uruchom te polecenia wewnątrz Claude Code:

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

Wybierz `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent` albo `oma-research@oh-my-agent` dla wtyczki domenowej. Pełny wpis `oma` zachowuje kompletny wybór umiejętności. Wpisy domenowe bootstrappują pasujący preset.

Hook session-start wtyczki dostarcza CLI, gdy jest potrzebne, i uruchamia `oma install --yes` dla bieżącego projektu. Ta ścieżka wykonuje konfigurację runtime'u. Jej pokwitowanie sukcesu należy do tego projektu, a hooki zdarzeń wtyczki używają zainstalowanego CLI. Hooki wtyczki wymagają Bash, także w Windows. Bootstrap ma limit czasu 600 sekund; niepowodzenia raportują ręczne kroki konfiguracji i zachowują dziennik projektu w `.agents/state/plugin-bootstrap.last-error.log`. Pokwitowanie jest używane ponownie dopiero po przejściu kontroli wersji CLI, konfiguracji projektu i hooków. Uruchom sesję ponownie, gdy bootstrap zgłosi ukończenie.

Przy wyborach konfiguracji i zależności podczas instalacji użyj bezpośrednio `oma install`. Nienadzorowany bootstrap pełnej wtyczki używa presetu umiejętności `all`; każda wtyczka domenowa przekazuje swój wybrany preset. Mniejszy preset zachowuje inne umiejętności już zainstalowane w projekcie.

## Sprawdź wynik {#check-the-result}

Przy załadowanej umiejętności potwierdź, że agent przeczytał wybrane instrukcje, i zgłoś rzeczywiste kontrole zadania. Przy instalacji runtime'u uruchom `oma doctor` i wypróbuj pierwszą prośbę dla swojego presetu. Ostrzeżenia doctor o dostawcach mają znaczenie, gdy żądane zadanie używa tego dostawcy.
