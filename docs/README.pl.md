# oh-my-agent: Wieloagentowa uprząż, która sprawdza wykonaną pracę

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

**Agenci opowiadają o sukcesie. oh-my-agent sprawdza artefakty.**

Uruchomienie równoległych agentów to łatwa część. Trudne jest ustalenie, czy naprawdę wykonali pracę. „Testy przechodzą, wszystkie kryteria spełnione” nic agenta nie kosztuje, a w obrębie tej samej sesji nic nie może temu zaprzeczyć.

oh-my-agent czyni tę deklarację falsyfikowalną. Hook Stop odmawia zakończenia sesji, dopóki projektowy skrypt `typecheck` / `test` / `lint` nie zakończy się kodem 0. Komenda bramkująca rozstrzyga, czy workflow faktycznie się wykonał, szukając artefaktów, które musiał po sobie zostawić — i to jej werdykt w JSON jest wynikiem, a nie podsumowanie agenta. Niezależny sędzia ze świeżym kontekstem w każdej rundzie weryfikuje od nowa każde kryterium, także te już zaliczone. Każda decyzja bramki trafia do dziennika zdarzeń tylko do dopisywania, który możesz przeczytać po fakcie. A ta sama dyscyplina działa w kilkunastu środowiskach agentowych z jednego przenośnego katalogu `.agents/`.

Zacznij od istniejącego [Szybkiego startu](../web/docs/getting-started/quick-start.md), aby wybrać ścieżkę instalacji, poprosić nazwany skill o jedną zmianę o ograniczonym zakresie oraz zapisać plik, polecenie kontrolne i kod wyjścia. Ścieżka pełnego harnessu obejmuje `oma doctor`.

![oh-my-agent explainer](./assets/video/oh-my-agent-explainer.gif)

[Watch the full video (35s)](./assets/video/oh-my-agent-explainer.mp4)

## Szybki start

**Najszybsza ścieżka — skille do agentów (Claude Code, Cursor, Codex i inne):**

```bash
npx skills add first-fluke/oh-my-agent
```

To wgrywa pakiet skilli OMA do wykrytych runtime'ów agentów. Skille uczą agenta *jak* pracować; pełny harness (poniżej) sprawdza, czy praca *naprawdę* się wydarzyła — bramki stop-hook, weryfikacja artefaktów, niezależni sędziowie i append-only event log.

### Pełny harness (bramki, hooki, CLI)

Użyj tego, gdy potrzebujesz workflowów, reguł, `oma-config.yaml`, hooków detekcji słów kluczowych i `oma agent spawn` — nie tylko skilli.

Skrypty instalacyjne same doinstalują bun, uv i serena, jeśli ich brakuje.

```bash
# macOS / Linux — doinstaluje bun, uv i serena gdy brakuje
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — doinstaluje bun, uv i serena gdy brakuje
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# Lub ręcznie (każdy OS, wymaga bun + uv + serena)
bunx oh-my-agent@latest
```

<details>
<summary>Albo zainstaluj skille przez <a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) Microsoftu. Rozwiń.</summary>

> Nie mylić z APM (Application Performance Monitoring) z `oma-observability`.

```bash
# Wszystkie skille, do każdego wykrytego runtime
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Pojedynczy skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM dostarcza tylko skille. Do pełnego harnessu użyj `bunx oh-my-agent@latest` (lub skryptów powyżej). Jedna dystrybucja na projekt — jeśli już użyłeś `npx skills add`, trzymaj się skills-only, dopóki nie potrzebujesz bramek/hooków/CLI.

</details>

Wybierz preset i ruszaj:

| Preset | Co dostajesz |
|--------|-------------|
| **All** | **Wszyscy agenci i umiejętności** |
| Backend | architecture + backend + brainstorm + db + debug + dev-workflow + pm + qa + scm |
| Content | academic-writer + design + image + scm + translator + voice |
| DevOps | architecture + brainstorm + debug + dev-workflow + observability + pm + qa + scm + tf-infra |
| Frontend | architecture + brainstorm + debug + design + frontend + pm + qa + scm |
| Fullstack | architecture + backend + brainstorm + db + debug + design + dev-workflow + frontend + mobile + pm + qa + scm + tf-infra |
| Fullstack Mobile | architecture + backend + brainstorm + db + debug + design + dev-workflow + mobile + pm + qa + scm |
| Fullstack Web | architecture + backend + brainstorm + db + debug + design + dev-workflow + frontend + pm + qa + scm |
| Mobile | architecture + brainstorm + debug + mobile + pm + qa + scm |
| Research | academic-writer + hwp + market + pdf + scholar + scm + search + translator |

## Integracje agentów

`oh-my-agent` używa `.agents/` jako wspólnego źródła skills, workflows, reguł i bramek weryfikacji dla agentów.

<table>
<colgroup>
<col span="6" style="width:16.67%" />
</colgroup>
<tr>
<td align="center">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>natywne + adapter</sub>
</td>
<td align="center">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>natywne + adapter</sub>
</td>
<td align="center">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>natywny SSOT</sub>
</td>
<td align="center">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>natywne + adapter</sub>
</td>
<td align="center">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>natywny dispatch</sub>
</td>
<td align="center">
<a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://github.com/deepseek-ai.png?size=120" alt="DeepSeek Harness" width="48" height="48" /></a><br/>
<strong>DeepSeek Harness</strong><br/>
<sub>Cordis plugin</sub>
</td>
</tr>
<tr>
<td align="center">
<a href="https://pi.dev/"><img src="./assets/agents/pi.svg" alt="Pi" width="48" height="48" /></a><br/>
<strong>Pi</strong><br/>
<sub>natywnie zgodne</sub>
</td>
<td align="center">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>natywnie zgodne</sub>
</td>
<td align="center">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>natywnie zgodne</sub>
</td>
<td align="center">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>skills przez symlink</sub>
</td>
<td align="center">
<a href="https://grok.x.ai"><img src="./assets/agents/grok.png" alt="Grok Build" width="48" height="48" /></a><br/>
<strong>Grok Build</strong><br/>
<sub>natywne hooki</sub>
</td>
<td align="center">
<a href="https://kiro.dev"><img src="./assets/agents/kiro.png" alt="Kiro CLI" width="48" height="48" /></a><br/>
<strong>Kiro CLI</strong><br/>
<sub>natywne hooki + agenci</sub>
</td>
</tr>
</table>

<p align="center"><sub><a href="./SUPPORTED_AGENTS.md">& więcej</a></sub></p>

## Twój zespół inżynierski

Zamiast jednego AI, które robi wszystko (i gubi się w połowie), oh-my-agent rozdziela pracę między wyspecjalizowanych agentów. Każdy doskonale zna swoją dziedzinę, ma własne narzędzia i checklisty, i nie wychodzi poza swój zakres.

| Agent | Co robi |
|-------|-------------|
| **oma-architecture** | Waży kompromisy architektoniczne i wyznacza granice modułów z analizą ADR/ATAM/CBAM |
| **oma-backend** | Buduje i zabezpiecza Twoje API w Python, Node.js lub Rust |
| **oma-brainstorm** | Eksploruje pomysły razem z Tobą, zanim cokolwiek zaczniesz budować |
| **oma-db** | Projektuje schematy, migracje, indeksy i vector stores |
| **oma-debug** | Znajduje przyczynę błędu, naprawia go i pisze test regresji |
| **oma-deepsec** | Skanuje kod w poszukiwaniu luk bezpieczeństwa i blokuje ryzykowne pull requesty |
| **oma-design** | Buduje design systemy z tokenami, dostępnością i responsywnymi layoutami |
| **oma-dev-workflow** | Automatyzuje CI/CD, releasy i zadania w monorepo |
| **oma-docs** | Sprawdza dokumentację pod kątem zepsutych referencji i wskazuje miejsca dotknięte zmianami w kodzie |
| **oma-explanation** | Zamienia diff, PR lub gałąź w samodzielny interaktywny objaśniacz HTML z quizem |
| **oma-frontend** | Buduje interfejs użytkownika z React/Next.js, TypeScript, Tailwind CSS v4 i shadcn/ui |
| **oma-mobile** | Buduje wieloplatformowe aplikacje mobilne we Flutter |
| **oma-observability** | Kieruje pracę obserwabilności przez metryki, logi, traces, SLO i analizę incydentów |
| **oma-orchestration** | Uruchamia wiele agentów równolegle z poziomu CLI |
| **oma-pm** | Planuje zadania, rozbija wymagania i definiuje kontrakty API |
| **oma-qa** | Przegląda kod pod kątem bezpieczeństwa OWASP, wydajności i dostępności |
| **oma-refactor** | Refaktoryzuje kod bez zmiany zachowania, wykorzystując hotspoty, testy charakteryzujące i commity zawierające wyłącznie refactor |
| **oma-scm** | Zarządza branchami, mergami, worktrees i Conventional Commits |
| **oma-search** | Kieruje każde zapytanie do najlepszego źródła i ocenia wiarygodność wyniku |
| **oma-tf-infra** | Provisionuje wielochmurową infrastrukturę za pomocą Terraform |

<details>
<summary>Narzędzia wewnętrzne i meta</summary>

| Agent | Co robi |
|-------|-------------|
| **oma-coordination** | Prowadzi krok po kroku ręczną koordynację agentów PM, frontend, backend, mobile i QA |
| **oma-skill-creation** | Pisze i audytuje nowe skille OMA w formacie SSL-lite |

</details>

## Poza kodem: pipeline'y contentowe i badawcze

Niezależnie od zespołu inżynierskiego oma dostarcza pipeline'y contentowe i badawcze zbudowane według tej samej dyscypliny inżynierskiej: deterministyczne odtwarzanie z fixture'ów, manifesty zapewniające powtarzalność i uczciwe raportowanie ograniczeń, gdy źródło albo klucz dostawcy jest niedostępny — zamiast po cichu uboższego wyniku.

| Agent | Co robi |
|-------|-------------|
| **oma-academic-writing** | Pisze, redaguje i audytuje akademicką prozę do jakości publikacyjnej |
| **oma-hwp** | Konwertuje pliki HWP, HWPX i HWPML do Markdown |
| **oma-image** | Generuje obrazy równolegle przez kilku dostawców AI |
| **oma-market** | Bada rynek na podstawie sygnałów społecznościowych i opisuje wyniki przez SWOT, Porter's 5F i PESTEL |
| **oma-pdf** | Konwertuje pliki PDF do Markdown |
| **oma-recap** | Podsumowuje historię rozmów w tematyczne raporty z pracy |
| **oma-scholar** | Przeszukuje literaturę akademicką i pomaga przeprowadzić recenzję naukową |
| **oma-slide** | Generuje charakterystyczne, bogate w animacje decki prezentacji HTML i eksportuje do PDF/PNG/PPTX |
| **oma-translation** | Tłumaczy między językami tak, jakby tekst napisał native speaker |
| **oma-video** | Generuje krótkie filmy, materiały objaśniające i dema przez pipeline HyperFrames działający także bez kluczy |
| **oma-voice** | Generuje voiceover i transkrybuje audio lokalnie — bez chmury |

### Orca IDE

[OMA for Orca](../integrations/orca/README.md) dodaje panel boczny i akcje palety poleceń
do konfiguracji projektu, przeglądu, debugowania, weryfikacji i lokalnych wyników.
Korzysta z Twojego istniejącego terminala agenta Orca oraz projektowej instalacji OMA.
Wymaga Orca 1.4.197+ z włączonymi wtyczkami eksperymentalnymi.

## Jak to działa

Po prostu pisz. Opisz, czego potrzebujesz, a oh-my-agent sam ustali, których agentów użyć.

```
Ty: "Zbuduj aplikację TODO z uwierzytelnianiem użytkowników"
→ PM planuje pracę
→ Backend buduje API uwierzytelniania
→ Frontend buduje UI w React
→ DB projektuje schemat
→ QA przegląda wszystko
→ Gotowe: skoordynowany, sprawdzony kod
```

Lub użyj slash commands do ustrukturyzowanych workflow:

| Krok | Komenda | Co robi |
|------|---------|-------------|
| 0 | `/deepinit` | Mapuje Twoją istniejącą bazę kodu do AGENTS.md, ARCHITECTURE.md i docs |
| 1 | `/brainstorm` | Przegląda z Tobą pomysły, zanim zabierzesz się za budowanie |
| 2 | `/architecture` | Waży trade-offy Twojego projektu i wyznacza czyste granice modułów |
| 2 | `/design` | Buduje Twój design system z tokenami, dostępnością i responsywnymi układami |
| 2 | `/plan` | Rozbija Twoją funkcjonalność na zadania z priorytetami |
| 3 | `/work` | Buduje Twoją funkcjonalność krok po kroku, korzystając z wielu agentów |
| 3 | `/orchestrate` | Uruchamia wielu agentów równolegle, by szybciej zbudować Twoją funkcjonalność |
| 3 | `/ultrawork` | Buduje Twoją funkcjonalność przez pięć bramkowanych faz jakości; każda rewizja działa w świeżej, izolowanej sesji recenzenta (cross-context review) |
| 3 | `/ralph` | Powtarza `/ultrawork`, aż niezależny weryfikator zaliczy wszystkie kryteria |
| 4 | `/review` | Przegląda Twój kod pod kątem bezpieczeństwa, wydajności i dostępności |
| 4 | `/deepsec` | Wykonuje głęboki skan bezpieczeństwa i blokuje ryzykowne pull requesty |
| 5 | `/debug` | Znajduje przyczynę, naprawia błąd i pisze test regresji |
| 5 | `/docs` | Sprawdza Twoją dokumentację pod kątem zepsutych odwołań i łata te, których dotykają zmiany w kodzie |
| 6 | `/scm` | Zarządza Twoimi gałęziami, scaleniami i Conventional Commits |
| - | `/schedule` | Planuje zadanie agenta do cyklicznego uruchamiania w zadanym interwale |

**Autodetekcja**: Nie musisz nawet używać slash commands. Słowa takie jak "architektura", "plan", "review" i "debug" w Twojej wiadomości (w 11 językach!) automatycznie uruchamiają odpowiedni workflow. Trafność detekcji jest mierzona, a nie zakładana: `oma verify triggers` ocenia detektor na oznaczonym korpusie 171 promptów (obecnie **0% missed-fire**, poniżej 10% false-fire) i na tej podstawie blokuje CI.

### Modele per agent

Ustaw `model_preset` w `.agents/oma-config.yaml`, aby wybrać, których modeli AI używa każdy agent:

```yaml
language: en
model_preset: mixed   # antigravity | claude | codex | cursor | kiro | mixed | qwen

# Optional per-agent overrides
agents:
  backend: { model: openai/gpt-5.5, effort: high }
```

- `oma doctor --profile` — wypisuje rozwiązaną macierz modeli dla każdej roli
- Pełny przewodnik: [`web/docs/guide/per-agent-models.md`](../web/docs/guide/per-agent-models.md)

## Weryfikacja zamiast narracji

Każdy z poniższych mechanizmów jest mechaniczny: komenda kończy się kodem 0 albo nie, plik jest na dysku albo go nie ma. Żaden LLM nie jest pytany, czy praca „wygląda poprawnie”.

| Mechanizm | Co jest sprawdzane mechanicznie | Gdzie się znajduje |
|-----------|----------------------------------|--------------------|
| **Bramka hooka Stop** | Blokuje zakończenie sesji, dopóki trwa persystentny workflow, i przed zezwoleniem na stop uruchamia skonfigurowany skrypt bramki. Wykonywalne są wyłącznie `typecheck`, `test` i `lint` — jeśli agent wpisze do pliku stanu cokolwiek innego, zostanie to zignorowane i nigdy nie uruchomione. Limit 5 wzmocnień sprawia, że trwale czerwona bramka Cię nie zablokuje. | [`.agents/hooks/core/persistent-mode.ts`](../.agents/hooks/core/persistent-mode.ts) |
| **Anti-Circumvention Gate** | `oma ralph verify --json` sprawdza cztery artefakty, których nie da się podrobić skrótem: zapisy faz ultrawork, JSON planu, plik wyniku **osobnego agenta QA** oraz plik wyniku **osobnego agenta refactor**. Brak artefaktów oznacza, że faza się nie wykonała — cokolwiek twierdzi narracja. | [`.agents/workflows/ralph.md`](../.agents/workflows/ralph.md) |
| **Niezależny sędzia** | Uruchamiany jako osobny agent ze świeżym kontekstem, poinstruowany wyłącznie o kryteriach — nigdy o tym, co implementujący rzekomo naprawił. W każdej iteracji weryfikuje od nowa **każde** kryterium, także wcześniejsze PASS-y, bo naprawa C2 to typowa droga do cichej regresji C1. | [`judge-protocol.md`](../.agents/workflows/ralph/resources/judge-protocol.md) |
| **Stan oparty na zdarzeniach** | Każde zaliczenie bramki, każde jej niepowodzenie i każda decyzja dopisuje jedną linię JSON do `~/.oma/u/0/sessions/{sid}/events.jsonl`, ostemplowaną vendorem i identyfikatorem sesji runtime'u. Tylko do dopisywania, ponad vendorami, audytowalne po zakończeniu biegu. | [`event-spec.md`](../.agents/skills/_shared/runtime/event-spec.md) |
| **Bateria sprawdzeń per agent** | `oma verify <agent>` uruchamia wspólny rdzeń (scope violation, charter alignment, twardo zakodowane sekrety, skan TODO, declared outputs) plus sprawdzenia specyficzne dla typu (TypeScript strict, testy, raw SQL, Flutter analyze, inline styles). | `oma verify <agent>` |
| **Harness ewaluacji skilli** | `oma skill eval` mierzy przyrost użyteczności na zadaniach odłożonych — wariant testowany kontra baseline — zamiast zakładać, że skill pomaga. `oma skill optimize` zachowuje tylko te zmiany, które poprawiają zmierzony przyrost. | [przewodnik skill-eval](../web/docs/guide/skill-eval.md) |

Budżety są egzekwowane tak samo. `session.quota_cap` ogranicza tokeny, liczbę spawnów i wydatki per vendor; orkiestrator odmawia kolejnego spawnu, gdy któryś z wymiarów zostanie przekroczony. Gdy skończy się budżet czasu, hook Stop zatrzymuje się uczciwie i zapisuje status częściowy w dzienniku zdarzeń, zamiast udawać ukończenie.

### Granica kontroli

oh-my-agent pozostawia otwarte planowanie i wybór kolejnej akcji hostowi LLM. Nie zastępuje tej oceny uniwersalnym grafem workflowów ani silnikiem polityk. Zamiast tego uzewnętrznia niezmienniki, które muszą być spełnione niezależnie od modelu: zabezpieczenia narzędzi, uprawnienia, budżety, limity ponowień i zatrzymania, trwałe zdarzenia oraz mechanicznie zweryfikowane ukończenie. Ustrukturyzowane zdarzenia rejestrują decyzje i wyniki bramek; nie pełnią roli drugiego planisty.

Deterministyczne wykonywanie przez SLM jest więc odrębnym, opcjonalnym kierunkiem produktu, a nie brakującą infrastrukturą w obecnym harnessie.

## Dlaczego oh-my-agent?

- **Oparty na rolach**: agenci zamodelowani jak prawdziwy zespół inżynierski, nie sterta promptów
- **Kontekst warunkowy**: dispatch ładuje skill będący właścicielem zadania i odracza referencje pomocnicze, dopóki zadanie ich nie potrzebuje. Scenariusze rozmiaru plików i ładowanie w runtime są raportowane osobno ([wskazówki dotyczące pomiaru](../web/docs/core-concepts/skills.md#token-savings-math))
- **Odporny na zapętlenie**: po 2 nieudanych próbach `orchestrate` uruchamia równolegle warianty hipotez i zachowuje wynik o najwyższej punktacji, zamiast w nieskończoność powtarzać błędne podejście
- **Świadomy monorepo**: `detectWorkspace` czyta pnpm / nx / turbo / lerna i kieruje każdego agenta do jego workspace
- **Multi-vendor**: mieszaj Antigravity, Claude, Codex, Cursor, Kiro i Qwen dla różnych typów agentów
- **Obserwowalny**: dashboardy w terminalu i w przeglądarce do monitoringu w czasie rzeczywistym

## Architektura

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestration]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> SCM([oma-scm])
```

## Dowiedz się więcej

- **[Szczegółowa dokumentacja](./AGENTS_SPEC.md)**: pełna specyfikacja techniczna i architektura
- **[Wspierani agenci](./SUPPORTED_AGENTS.md)**: macierz wsparcia agentów w różnych IDE
- **[Dostawcy możliwości](./capability-providers.md)**: eksperymentalna konfiguracja Gortex i Honcho, routing i ograniczenia
- **[Raport benchmarkowy](../benchmarks/README.md)**: metoda, wyniki, zrzuty ekranu i zastrzeżenia
- **[Dokumentacja webowa](https://first-fluke.github.io/oh-my-agent/)**: poradniki, tutoriale i referencja CLI

## Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://star-history.dera.page/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Bibliografia

- Li, X., Liu, Y., Chen, W., You, B., Di, Z., He, Y., Zheng, S., Choe, K. W., Sun, J., Wang, S., Tao, C., Li, B., Zhao, X., Geng, H., Wu, X., Zhou, J., Chen, X., Xing, H., Li, Y., … Song, D. (2026). *SkillsBench: Benchmarking how well agent skills work across diverse tasks* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2602.12670
- Yu, G., & Wang, X. (2026). *Knows: Agent-native structured research representations* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.17309
- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508
- Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454
- Huang, Z., Xu, J., Yang, Y., Gong, Z., Yang, Q., Tian, M., Wang, X., Lv, C., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, X., Chen, D., Zheng, X., & Luo, C. (2026). *From raw experience to skill consumption: A systematic study of model-generated agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23899
- Hong, D. B., Imani, A., & Ahmed, I. (2026). *From anatomy to smells: An empirical study of SKILL.md in agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2607.01456


## Licencja

MIT
