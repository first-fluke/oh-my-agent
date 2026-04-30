# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

Chcialbys, zeby Twoj asystent AI mial wspolpracownikow? Wlasnie to robi oh-my-agent.

Zamiast jednego AI, ktory robi wszystko (i gubi sie w polowie), oh-my-agent rozdziela prace miedzy **wyspecjalizowanych agentow** — frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design i innych. Kazdy doskonale zna swoja dziedzine, ma wlasne narzedzia i checklisty, i nie wychodzi poza swoj zakres.

Dziala ze wszystkimi glownymi AI IDE: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode i innymi.

Natywne subagenty dostawcy sa generowane z `.agents/agents/`:
- Claude Code uzywa `.claude/agents/*.md`
- Codex CLI uzywa `.codex/agents/*.toml`
- Gemini CLI uzywa `.gemini/agents/*.md`

Gdy workflow rozwiazuje agenta do tego samego dostawcy co biezacy runtime, powinien najpierw uzyc natywnej sciezki subagenta tego dostawcy. Zadania miedzy dostawcami wracaja do `oma agent:spawn`.

## Szybki start

```bash
# macOS / Linux — automatycznie zainstaluje bun & uv, jesli brakuje
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — automatycznie zainstaluje bun & uv, jesli brakuje
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# Lub recznie (dowolny system, wymaga bun + uv)
bunx oh-my-agent@latest
```

### Instalacja przez Agent Package Manager

<details>
<summary><a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) od Microsoftu — dystrybucja tylko ze skillami. Kliknij, zeby rozwinac.</summary>

> Nie myl tego z APM (Application Performance Monitoring) z `oma-observability`.

```bash
# 22 skille, wdrazane do kazdego wykrytego runtime
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Pojedynczy skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM czyta wskaznik `skills: .agents/skills/` z `.claude-plugin/plugin.json`, wiec SSOT z `.agents/` jest jedynym zrodlem — bez kroku build i bez mirrora.

APM dostarcza tylko 22 skille. Do workflowow, regul, `oma-config.yaml`, hookow detekcji slow kluczowych i CLI `oma agent:spawn` uzyj `bunx oh-my-agent@latest`. W jednym projekcie trzymaj sie jednej dystrybucji, zeby nic sie nie rozjechalo.

</details>

Wybierz preset i gotowe:

| Preset | Co dostajesz |
|--------|-------------|
| ✨ All | Wszyscy agenci i umiejetnosci |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Twoj zespol agentow

| Agent | Co robi |
|-------|-------------|
| **oma-architecture** | Kompromisy architektoniczne, granice, analiza w duchu ADR/ATAM/CBAM |
| **oma-backend** | API w Python, Node.js lub Rust |
| **oma-brainstorm** | Eksploruje pomysly, zanim zaczniesz budowac |
| **oma-db** | Projektowanie schematow, migracje, indeksowanie, vector DB |
| **oma-debug** | Analiza przyczyn, poprawki, testy regresji |
| **oma-design** | Design systemy, tokeny, dostepnosc, responsywnosc |
| **oma-dev-workflow** | CI/CD, releasy, automatyzacja monorepo |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-hwp** | Konwersja HWP/HWPX/HWPML do Markdown |
| **oma-image** | Wielodostawcze generowanie obrazów AI |
| **oma-mobile** | Wieloplatformowe aplikacje we Flutter |
| **oma-observability** | Router obserwowalności — APM/RUM, metryki/logi/trace/profile, SLO, analiza incydentów, dostrajanie transportu |
| **oma-orchestrator** | Rownolegle uruchamianie agentow przez CLI |
| **oma-pdf** | Konwersja PDF do Markdown |
| **oma-pm** | Planuje zadania, rozbija wymagania, definiuje kontrakty API |
| **oma-qa** | Bezpieczenstwo OWASP, wydajnosc, przeglad dostepnosci |
| **oma-recap** | Analiza historii rozmow i tematyczne podsumowania pracy |
| **oma-scholar** | Towarzysz badań akademickich — sidecar Knows (.knows.yaml), wyszukiwanie literatury, recenzja naukowa |
| **oma-scm** | SCM (zarządzanie konfiguracją oprogramowania): branchowanie, merge, worktree, baseline; Conventional Commits |
| **oma-search** | Router wyszukiwania oparty na intencji + ocena zaufania — dokumentacja, web, kod, lokalnie |
| **oma-tf-infra** | Wielochmurowy IaC z Terraform (Infrastructure as Code) |
| **oma-translator** | Naturalne tlumaczenie wielojezyczne |

## Jak to dziala

Po prostu pisz. Opisz, czego potrzebujesz, a oh-my-agent sam ustali, ktorych agentow uzyc.

```
Ty: "Zbuduj aplikacje TODO z uwierzytelnianiem uzytkownikow"
→ PM planuje prace
→ Backend buduje API uwierzytelniania
→ Frontend buduje UI w React
→ DB projektuje schemat
→ QA przeglada wszystko
→ Gotowe: skoordynowany, sprawdzony kod
```

Lub uzyj slash commands do ustrukturyzowanych workflow:

| Krok | Komenda | Co robi |
|------|---------|-------------|
| 1 | `/brainstorm` | Swobodna burza mozgow |
| 2 | `/architecture` | Przeglad architektury, trade-offy, analiza w stylu ADR/ATAM/CBAM |
| 2 | `/design` | 7-fazowy workflow design systemu |
| 2 | `/plan` | PM rozbija Twoja funkcjonalnosc na zadania |
| 3 | `/work` | Krokowe wykonanie wieloagentowe |
| 3 | `/orchestrate` | Automatyczne rownolegle uruchamianie agentow |
| 3 | `/ultrawork` | 5-fazowy workflow jakosci z 11 bramkami rewizji |
| 4 | `/review` | Audyt bezpieczenstwa + wydajnosci + dostepnosci |
| 5 | `/debug` | Ustrukturyzowane debugowanie z analiza przyczyn |
| 6 | `/scm` | Workflow SCM i Git oraz wsparcie Conventional Commits |

**Autodetekcja**: Nie musisz nawet uzywac slash commands — slowa takie jak "architektura", "plan", "review" i "debug" w Twojej wiadomosci (w 11 jezykach!) automatycznie uruchamiaja odpowiedni workflow.

## CLI

```bash
# Zainstaluj globalnie
bun install --global oh-my-agent   # lub: brew install oh-my-agent

# Uzywaj gdziekolwiek
oma doctor                  # Sprawdzenie stanu
oma dashboard               # Monitoring w czasie rzeczywistym
oma link                    # Regeneruj .claude/.codex/.gemini/itd. z .agents/
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

Wybor modelu przebiega w dwoch warstwach:
- Natywny dispatch tego samego dostawcy uzywa wygenerowanej definicji agenta dostawcy w `.claude/agents/`, `.codex/agents/` lub `.gemini/agents/`.
- Dispatch miedzy dostawcami lub awaryjny CLI uzywa domyslnych wartosci dostawcy w `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

**modele per agent**: kazdy agent moze miec wlasny model i `effort` zdefiniowany w `.agents/oma-config.yaml`. Dostepnych jest piec gotowych runtime profiles: `claude-only`, `codex-only`, `gemini-only`, `antigravity`, `qwen-only`. Sprawdz rozwiazana macierz auth komenda `oma doctor --profile`. Pelny przewodnik: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

## Dlaczego oh-my-agent?

> [Czytaj więcej →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Przenosny** — `.agents/` wedruje z Twoim projektem, nie jest uwieziony w jednym IDE
- **Oparty na rolach** — Agenci zamodelowani jak prawdziwy zespol inzynierski, nie sterta promptow
- **Oszczedny z tokenami** — Dwuwarstwowy design umiejetnosci oszczedza ~75% tokenow
- **Jakosc przede wszystkim** — Charter preflight, quality gates i workflow rewizji wbudowane
- **Multi-vendor** — Mieszaj Gemini, Claude, Codex i Qwen dla roznych typow agentow
- **Obserwowalny** — Dashboardy w terminalu i w przegladarce do monitoringu w czasie rzeczywistym

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
        ORC[oma-orchestrator]
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

## Dowiedz sie wiecej

- **[Szczegolowa dokumentacja](./AGENTS_SPEC.md)** — Pelna specyfikacja techniczna i architektura
- **[Wspierani agenci](./SUPPORTED_AGENTS.md)** — Macierz wsparcia agentow w roznych IDE
- **[Dokumentacja webowa](https://first-fluke.github.io/oh-my-agent/)** — Poradniki, tutoriale i referencja CLI

## Sponsorzy

Ten projekt jest utrzymywany dzieki naszym hojnym sponsorom.

> **Podoba Ci sie projekt?** Daj gwiazdke!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Wyprobuj nasz zoptymalizowany szablon startowy: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[Zostan sponsorem →](https://github.com/sponsors/first-fluke)

Zobacz [SPONSORS.md](../SPONSORS.md), aby zobaczyc pelna liste wspierajacych.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Bibliografia

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026


## Licencja

MIT
