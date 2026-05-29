# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

Ooit gewenst dat je AI-assistent collega's had? Dat is precies wat oh-my-agent doet.

In plaats van een enkele AI die alles doet (en halverwege de draad kwijtraakt), verdeelt oh-my-agent het werk over **gespecialiseerde agents**: frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design en meer. Elk van hen kent zijn domein door en door, heeft eigen tools en checklists, en blijft in zijn eigen baan.

Werkt met alle grote AI IDE's: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode en meer.

## Snel starten

```bash
# macOS / Linux — installeert bun, uv & serena automatisch als ze ontbreken
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — installeert bun, uv & serena automatisch als ze ontbreken
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# Of handmatig (elk OS, vereist bun + uv + serena)
bunx oh-my-agent@latest
```

### Installatie via Agent Package Manager

<details>
<summary>Microsofts <a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM): alleen skills. Klik om uit te klappen.</summary>

> Niet te verwarren met de APM (Application Performance Monitoring) van `oma-observability`.

```bash
# Alle skills, uitgerold naar elke gedetecteerde runtime
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Eén skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM levert alleen de skills. Voor workflows, regels, `oma-config.yaml`, keyword-detection-hooks en de `oma agent:spawn`-CLI gebruik je `bunx oh-my-agent@latest`. Kies per project één distributie, anders loopt het uit elkaar.

</details>

Kies een preset en je bent klaar:

| Preset | Wat je krijgt |
|--------|-------------|
| ✨ All | Alle agents en skills |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Werkt met elke Agent

`oh-my-agent` houdt `.agents/` als enige bron van waarheid (SSOT) en projecteert het op de native layout van elke runtime. Zo delen alle ondersteunde tools dezelfde skills, workflows en regels.

<table>
<tr>
<td align="center" width="20%">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>native + adapter</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>native + adapter</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/google-gemini/gemini-cli"><img src="https://github.com/google-gemini.png?size=120" alt="Gemini CLI" width="48" height="48" /></a><br/>
<strong>Gemini CLI</strong><br/>
<sub>native + adapter</sub>
</td>
<td align="center" width="20%">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>native + adapter</sub>
</td>
<td align="center" width="16%">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>native dispatch</sub>
</td>
<td align="center" width="16%">
<a href="https://grok.x.ai"><img src="./assets/agents/grok.png" alt="Grok" width="48" height="48" /></a><br/>
<strong>Grok</strong><br/>
<sub>native hooks + agents</sub>
</td>
</tr>
<tr>
<td align="center" width="20%">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>native SSOT</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>native compatibel</sub>
</td>
<td align="center" width="20%">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>native compatibel</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>skills via symlink</sub>
</td>
<td align="center" width="20%">
<a href="./SUPPORTED_AGENTS.md"><img src="https://img.shields.io/badge/%E2%80%A6-more-555?style=flat-square" alt="More" height="48" /></a><br/>
<strong>& meer</strong><br/>
<sub><a href="./SUPPORTED_AGENTS.md">ondersteuningsmatrix →</a></sub>
</td>
</tr>
</table>

## Jouw Agent Team

| Agent | Wat ze doen |
|-------|-------------|
| **oma-academic-writer** | Schrijft, herziet en auditeert academisch proza tot publicatiekwaliteit |
| **oma-architecture** | Weegt architectuurafwegingen af en bepaalt modulegrenzen met ADR/ATAM/CBAM-analyse |
| **oma-backend** | Bouwt en beveiligt je API's in Python, Node.js of Rust |
| **oma-brainstorm** | Verkent ideeën samen met jou voordat je begint met bouwen |
| **oma-db** | Ontwerpt je schema, migraties, indexes en vector stores |
| **oma-debug** | Zoekt de root cause, lost de bug op en schrijft een regressietest |
| **oma-deepsec** | Scant je code op beveiligingslekken en blokkeert riskante pull requests |
| **oma-design** | Bouwt design systems met tokens, toegankelijkheid en responsive layouts |
| **oma-dev-workflow** | Automatiseert je CI/CD, releases en monorepo-taken |
| **oma-docs** | Controleert je docs op gebroken verwijzingen en markeert wat een codewijziging heeft geraakt |
| **oma-frontend** | Bouwt je UI met React/Next.js, TypeScript, Tailwind CSS v4 en shadcn/ui |
| **oma-hwp** | Converteert HWP-, HWPX- en HWPML-bestanden naar Markdown |
| **oma-image** | Genereert afbeeldingen via meerdere AI-providers tegelijk |
| **oma-market** | Onderzoekt je markt op basis van community-signalen en structureert dit met SWOT, Porter's 5F en PESTEL |
| **oma-mobile** | Bouwt cross-platform mobiele apps met Flutter |
| **oma-observability** | Routeert observability-werk over metrics, logs, traces, SLO's en incident forensics |
| **oma-orchestrator** | Draait meerdere agents parallel via de CLI |
| **oma-pdf** | Converteert PDF-bestanden naar Markdown |
| **oma-pm** | Plant taken, splitst requirements op en definieert API-contracten |
| **oma-qa** | Reviewt je code op OWASP-beveiliging, performance en toegankelijkheid |
| **oma-recap** | Vat je gespreksgeschiedenis samen in thematische werkoverviews |
| **oma-scholar** | Doorzoekt academische literatuur en helpt je bij peer review |
| **oma-scm** | Beheert je branches, merges, worktrees en Conventional Commits |
| **oma-search** | Routeert elke zoekopdracht naar de beste bron en geeft een vertrouwensscore |
| **oma-skill-creator** | Schrijft en auditeert nieuwe OMA-skills in het SSL-lite-formaat |
| **oma-slide** | Genereert onderscheidende, animatierijke HTML-presentatiedecks en exporteert naar PDF/PNG/PPTX |
| **oma-tf-infra** | Provisioneert multi-cloud infrastructuur met Terraform |
| **oma-translator** | Vertaalt tussen talen zodat het klinkt alsof een native het heeft geschreven |
| **oma-voice** | Genereert voice-overs en transcribeert audio lokaal, zonder cloud |

## Hoe het werkt

Gewoon chatten. Beschrijf wat je wilt en oh-my-agent zoekt uit welke agents nodig zijn.

```
Jij: "Bouw een TODO-app met gebruikersauthenticatie"
→ PM plant het werk
→ Backend bouwt de auth API
→ Frontend bouwt de React UI
→ DB ontwerpt het schema
→ QA reviewt alles
→ Klaar: gecoordineerde, gereviewde code
```

Of gebruik slash commands voor gestructureerde workflows:

| Stap | Commando | Wat het doet |
|------|----------|-------------|
| 1 | `/brainstorm` | Vrije brainstorm |
| 2 | `/architecture` | Software-architectuurreview, trade-offs, ADR/ATAM/CBAM-stijl analyse |
| 2 | `/design` | 7-fasen design system workflow |
| 2 | `/plan` | PM splitst je feature op in taken |
| 3 | `/work` | Stapsgewijze multi-agent uitvoering |
| 3 | `/orchestrate` | Automatische parallelle agent-spawning |
| 3 | `/ultrawork` | 5-fasen kwaliteitsworkflow met 11 review gates |
| 4 | `/review` | Beveiligings- + performance- + toegankelijkheidsaudit |
| 4 | `/deepsec` | Diepe agent-gedreven security scan |
| 5 | `/debug` | Gestructureerde root cause-debugging |
| 5 | `/docs` | Documentatie-drift verifiëren en synchroniseren via `oma-docs` |
| 6 | `/scm` | SCM- en Git-workflow met ondersteuning voor Conventional Commits |

**Autodetectie**: Je hebt de slash commands niet eens nodig. Woorden als "architectuur", "plan", "review" en "debug" in je bericht (in 11 talen!) activeren automatisch de juiste workflow.

## CLI

```bash
# Globaal installeren
bun install --global oh-my-agent   # of: brew install oh-my-agent

# Overal gebruiken
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
oma agent:spawn backend "Build auth API" session-01
oma dashboard               # Realtime agent-monitoring
oma doctor                  # Health check
oma image generate "cat"    # Multi-vendor AI-beeldgeneratie
oma link                    # Regenereer .claude/.codex/.gemini/etc. uit .agents/
oma model:check             # Drift detecteren tussen geregistreerde modellen en live vendor-lijsten
oma recap --window 1d       # Cross-tool gespreksgeschiedenis-samenvatting
oma retro 7d --compare      # Engineering-retro met metrics + trends
oma search fetch <url>      # Mechanisch zoeken met auto-opschalende strategieën
```

Modelselectie volgt twee lagen:
- Same-vendor native dispatch gebruikt de gegenereerde vendor-agent-definitie in `.claude/agents/`, `.codex/agents/` of `.gemini/agents/`.
- Cross-vendor of fallback CLI dispatch gebruikt de vendor-defaults in `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

**modellen per agent**: elke agent kan via `.agents/oma-config.yaml` een eigen model en `effort` kiezen. Kant-en-klare runtime profiles: `antigravity`, `claude`, `codex`, `cursor`, `grok`, `mixed`, `qwen`. Bekijk de opgeloste auth-matrix met `oma doctor --profile`. Volledige gids: [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

## Waarom oh-my-agent?

> [Meer lezen →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Draagbaar**: `.agents/` reist mee met je project, niet opgesloten in een IDE
- **Rolgebaseerd**: agents gemodelleerd als een echt engineeringteam, niet een stapel prompts
- **Token-efficient**: tweelaags skill-ontwerp bespaart ~75% tokens
- **Kwaliteit eerst**: Charter preflight, quality gates en review-workflows ingebouwd:
  - `oma verify <agent>` — 14 deterministische checks per agent-type (TypeScript strict, tests, raw SQL, hardcoded secrets, Flutter analyze, inline styles, scope violation, charter alignment …)
  - `session.quota_cap` — token / spawn / per-vendor budgetcaps per sessie in `oma-config.yaml`; `orchestrate` Step 5 blokkeert de volgende spawn bij overschrijding
  - `ralph` workflow — onafhankelijke JUDGE her-verifieert elk criterion per iteratie om stille regressies te vangen; caching voor tests >30s
  - Exploration Loop — na 2 retries spawnt `orchestrate` hypothese-varianten parallel en houdt het hoogst scorende resultaat
  - Monorepo auto-routing — `detectWorkspace` leest pnpm / nx / turbo / lerna en routeert elke agent naar zijn workspace
- **Multi-vendor**: mix Claude, Codex, Cursor en Qwen per agent-type
- **Observeerbaar**: terminal- en webdashboards voor realtime monitoring

## Architectuur

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

## Meer informatie

- **[Uitgebreide documentatie](./AGENTS_SPEC.md)**: volledige technische spec en architectuur
- **[Ondersteunde agents](./SUPPORTED_AGENTS.md)**: agent-ondersteuningsmatrix per IDE
- **[Webdocs](https://first-fluke.github.io/oh-my-agent/)**: handleidingen, tutorials en CLI-referentie

## Sponsors

Dit project wordt onderhouden dankzij onze gulle sponsors.

> **Vind je dit project leuk?** Geef een ster!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Probeer onze geoptimaliseerde startertemplate: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

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

[Word sponsor →](https://github.com/sponsors/first-fluke)

Zie [SPONSORS.md](../SPONSORS.md) voor de volledige lijst van supporters.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Referenties

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508


## Licentie

MIT
