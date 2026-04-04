# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ไทย](./README.th.md)

Chcialbys, zeby Twoj asystent AI mial wspolpracownikow? Wlasnie to robi oh-my-agent.

Zamiast jednego AI, ktory robi wszystko (i gubi sie w polowie), oh-my-agent rozdziela prace miedzy **wyspecjalizowanych agentow** — frontend, backend, QA, PM, DB, mobile, infra, debug, design i innych. Kazdy doskonale zna swoja dziedzine, ma wlasne narzedzia i checklisty, i nie wychodzi poza swoj zakres.

Dziala ze wszystkimi glownymi AI IDE: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode i innymi.

## Szybki start

```bash
# Jedna komenda (automatycznie zainstaluje bun & uv, jesli brakuje)
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# Lub recznie
bunx oh-my-agent@latest
```

Wybierz preset i gotowe:

| Preset | Co dostajesz |
|--------|-------------|
| ✨ All | Wszyscy agenci i umiejetnosci |
| 🌐 Fullstack | frontend + backend + db + pm + qa + debug + brainstorm + commit |
| 🎨 Frontend | frontend + pm + qa + debug + brainstorm + commit |
| ⚙️ Backend | backend + db + pm + qa + debug + brainstorm + commit |
| 📱 Mobile | mobile + pm + qa + debug + brainstorm + commit |
| 🚀 DevOps | tf-infra + dev-workflow + pm + qa + debug + brainstorm + commit |

## Twoj zespol agentow

| Agent | Co robi |
|-------|-------------|
| **oma-brainstorm** | Eksploruje pomysly, zanim zaczniesz budowac |
| **oma-pm** | Planuje zadania, rozbija wymagania, definiuje kontrakty API |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-backend** | API w Python, Node.js lub Rust |
| **oma-db** | Projektowanie schematow, migracje, indeksowanie, vector DB |
| **oma-mobile** | Wieloplatformowe aplikacje we Flutter |
| **oma-design** | Design systemy, tokeny, dostepnosc, responsywnosc |
| **oma-qa** | Bezpieczenstwo OWASP, wydajnosc, przeglad dostepnosci |
| **oma-debug** | Analiza przyczyn, poprawki, testy regresji |
| **oma-tf-infra** | Wielochmurowy IaC z Terraform |
| **oma-dev-workflow** | CI/CD, releasy, automatyzacja monorepo |
| **oma-translator** | Naturalne tlumaczenie wielojezyczne |
| **oma-orchestrator** | Rownolegle uruchamianie agentow przez CLI |
| **oma-commit** | Czyste conventional commits |

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

| Komenda | Co robi |
|---------|-------------|
| `/plan` | PM rozbija Twoja funkcjonalnosc na zadania |
| `/coordinate` | Krokowe wykonanie wieloagentowe |
| `/orchestrate` | Automatyczne rownolegle uruchamianie agentow |
| `/ultrawork` | 5-fazowy workflow jakosci z 11 bramkami rewizji |
| `/review` | Audyt bezpieczenstwa + wydajnosci + dostepnosci |
| `/debug` | Ustrukturyzowane debugowanie z analiza przyczyn |
| `/design` | 7-fazowy workflow design systemu |
| `/brainstorm` | Swobodna burza mozgow |
| `/commit` | Conventional commit z analiza type/scope |

**Autodetekcja**: Nie musisz nawet uzywac slash commands — slowa takie jak "plan", "review", "debug" w Twojej wiadomosci (w 11 jezykach!) automatycznie uruchamiaja odpowiedni workflow.

## CLI

```bash
# Zainstaluj globalnie
bun install --global oh-my-agent   # lub: brew install oh-my-agent

# Uzywaj gdziekolwiek
oma doctor                  # Sprawdzenie stanu
oma dashboard               # Monitoring w czasie rzeczywistym
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

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
        W1["/coordinate"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
        W6["/deepinit"]
        W7["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
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
    Quality --> CMT([oma-commit])
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


## Licencja

MIT
