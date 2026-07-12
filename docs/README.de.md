# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

Hast du dir schon mal gewünscht, dein KI-Assistent hätte Kollegen? Genau das macht oh-my-agent.

Statt dass eine einzige KI alles erledigt (und sich auf halbem Weg verheddert), verteilt oh-my-agent die Arbeit auf **spezialisierte Agenten**: Frontend, Backend, Architektur, QA, PM, DB, Mobile, Infra, Debug, Design und mehr. Jeder kennt sein Fachgebiet in- und auswendig, hat eigene Tools und Checklisten und bleibt in seiner Spur.

Funktioniert mit allen großen KI-IDEs: Antigravity, Claude Code, Codex, Cursor, Grok Build, Kimi Code, OpenCode, Pi, Qwen Code und weiteren.

## Schnellstart

```bash
# macOS / Linux — installiert bun, uv & serena automatisch, falls nicht vorhanden
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — installiert bun, uv & serena automatisch, falls nicht vorhanden
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# Oder manuell (beliebiges OS, benötigt bun + uv + serena)
bunx oh-my-agent@latest
```

### Installation via Agent Package Manager

<details>
<summary>Microsofts <a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM): nur Skills. Klick zum Ausklappen.</summary>

> Nicht zu verwechseln mit dem APM (Application Performance Monitoring) von `oma-observability`.

```bash
# Alle Skills, in jede erkannte Runtime ausgerollt
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Ein einzelnes Skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM liefert nur die Skills. Für Workflows, Regeln, `oma-config.yaml`, Keyword-Detection-Hooks und das `oma agent:spawn`-CLI nimmst du `bunx oh-my-agent@latest`. Pro Projekt eine Distribution wählen, sonst läuft das auseinander.

</details>

Wähl ein Preset und los geht's:

| Preset | Was Du Bekommst |
|--------|-------------|
| **All** | **Alle Agenten und Skills** |
| Backend | architecture + backend + brainstorm + db + debug + dev-workflow + pm + qa + scm |
| Content | academic-writer + design + image + scm + translator + voice |
| DevOps | architecture + brainstorm + debug + dev-workflow + observability + pm + qa + scm + tf-infra |
| Frontend | architecture + brainstorm + debug + design + frontend + pm + qa + scm |
| Fullstack | architecture + backend + brainstorm + db + debug + design + dev-workflow + frontend + mobile + pm + qa + scm + tf-infra |
| Fullstack Mobile | architecture + backend + brainstorm + db + debug + design + dev-workflow + mobile + pm + qa + scm |
| Fullstack Web | architecture + backend + brainstorm + db + debug + design + dev-workflow + frontend + pm + qa + scm |
| Mobile | architecture + brainstorm + debug + mobile + pm + qa + scm |
| Research | academic-writer + hwp + market + pdf + scholar + scm + search + translator |

## Funktioniert mit jedem Agent

`oh-my-agent` behält `.agents/` als Single Source of Truth (SSOT) und projiziert es in das native Layout jeder Runtime. So teilen sich alle unterstützten Tools dieselben Skills, Workflows und Regeln.

<table>
<colgroup>
<col span="6" style="width:16.67%" />
</colgroup>
<tr>
<td align="center">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>nativ + Adapter</sub>
</td>
<td align="center">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>nativ + Adapter</sub>
</td>
<td align="center">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>natives SSOT</sub>
</td>
<td align="center">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>nativ + Adapter</sub>
</td>
<td align="center">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>natives Dispatch</sub>
</td>
<td align="center">
<a href="https://github.com/esengine/DeepSeek-Reasonix"><img src="https://github.com/deepseek-ai.png?size=120" alt="Reasonix" width="48" height="48" /></a><br/>
<strong>Reasonix</strong><br/>
<sub>nativ kompatibel</sub>
</td>
</tr>
<tr>
<td align="center">
<a href="https://pi.dev/"><img src="./assets/agents/pi.svg" alt="Pi" width="48" height="48" /></a><br/>
<strong>Pi</strong><br/>
<sub>nativ kompatibel</sub>
</td>
<td align="center">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>nativ kompatibel</sub>
</td>
<td align="center">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>nativ kompatibel</sub>
</td>
<td align="center">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>Skills per Symlink</sub>
</td>
<td align="center">
<a href="https://grok.x.ai"><img src="./assets/agents/grok.png" alt="Grok Build" width="48" height="48" /></a><br/>
<strong>Grok Build</strong><br/>
<sub>native Hooks</sub>
</td>
<td align="center">
<a href="https://kiro.dev"><img src="./assets/agents/kiro.png" alt="Kiro CLI" width="48" height="48" /></a><br/>
<strong>Kiro CLI</strong><br/>
<sub>native Hooks + Agents</sub>
</td>
</tr>
</table>

<p align="center"><sub><a href="./SUPPORTED_AGENTS.md">& mehr</a></sub></p>

## Dein Agenten-Team

| Agent | Was Er Macht |
|-------|-------------|
| **oma-academic-writer** | Entwirft, überarbeitet und prüft akademische Prosa bis zur Publikationsreife |
| **oma-architecture** | Wägt Architektur-Trade-offs ab und zieht Modulgrenzen — mit ADR/ATAM/CBAM-Analyse |
| **oma-backend** | Baut und sichert deine APIs in Python, Node.js oder Rust |
| **oma-brainstorm** | Erkundet Ideen gemeinsam mit dir, bevor du dich für einen Weg entscheidest |
| **oma-coordination** | Führt Schritt für Schritt durch die manuelle Koordination von PM-, Frontend-, Backend-, Mobile- und QA-Agenten |
| **oma-db** | Entwirft dein Schema, Migrationen, Indizes und Vector Stores |
| **oma-debug** | Findet die Ursache, behebt den Bug und schreibt einen Regressionstest |
| **oma-deepsec** | Scannt deinen Code auf Sicherheitslücken und blockiert riskante Pull Requests |
| **oma-design** | Baut Design-Systeme mit Tokens, Barrierefreiheit und Responsive Layouts |
| **oma-dev-workflow** | Automatisiert deine CI/CD, Releases und Monorepo-Aufgaben |
| **oma-docs** | Prüft deine Docs auf defekte Referenzen und markiert Stellen, die ein Code-Change berührt hat |
| **oma-frontend** | Baut deine UI mit React/Next.js, TypeScript, Tailwind CSS v4 und shadcn/ui |
| **oma-hwp** | Konvertiert HWP-, HWPX- und HWPML-Dateien in Markdown |
| **oma-image** | Generiert Bilder parallel über mehrere KI-Anbieter |
| **oma-market** | Recherchiert deinen Markt aus Community-Signalen und rahmt ihn mit SWOT, Porter's 5F und PESTEL |
| **oma-mobile** | Baut plattformübergreifende Mobile-Apps mit Flutter |
| **oma-observability** | Routet Observability-Arbeit über Metriken, Logs, Traces, SLOs und Incident-Forensik |
| **oma-orchestrator** | Führt mehrere Agenten parallel über die CLI aus |
| **oma-pdf** | Konvertiert PDF-Dateien in Markdown |
| **oma-pm** | Plant Aufgaben, zerlegt Anforderungen und definiert API-Verträge |
| **oma-qa** | Überprüft deinen Code auf OWASP-Sicherheitslücken, Performance- und Barrierefreiheitsprobleme |
| **oma-recap** | Fasst deinen Gesprächsverlauf in thematische Arbeitsberichte zusammen |
| **oma-refactor** | Refaktoriert Code ohne Verhaltensänderung mit Hotspot-Auswahl, Charakterisierungstests als Sicherheitsnetz und reinen Refactor-Commits |
| **oma-scholar** | Durchsucht akademische Literatur und unterstützt dich beim Peer-Review |
| **oma-scm** | Verwaltet deine Branches, Merges, Worktrees und Conventional Commits |
| **oma-search** | Leitet jede Suchanfrage an die beste Quelle weiter und bewertet, wie vertrauenswürdig das Ergebnis ist |
| **oma-skill-creator** | Schreibt und prüft neue OMA-Skills im SSL-lite-Format |
| **oma-slide** | Erzeugt markante, animationsreiche HTML-Präsentationsdecks und exportiert nach PDF/PNG/PPTX |
| **oma-tf-infra** | Provisioniert Multi-Cloud-Infrastruktur mit Terraform |
| **oma-translator** | Übersetzt zwischen Sprachen so, als hätte ein Muttersprachler geschrieben |
| **oma-video** | Erzeugt Kurzvideos, Erklärvideos und Demos über eine auch ohne Schlüssel nutzbare Remotion-Pipeline |
| **oma-voice** | Generiert Voiceovers und transkribiert Audio lokal — ganz ohne Cloud |

## So Funktioniert's

Einfach chatten. Beschreib, was du willst, und oh-my-agent sucht die passenden Agenten aus.

```
Du: "Bau eine TODO-App mit User-Authentifizierung"
→ PM plant die Arbeit
→ Backend baut die Auth-API
→ Frontend baut die React-UI
→ DB entwirft das Schema
→ QA prüft alles durch
→ Fertig: koordinierter, geprüfter Code
```

Oder nutz Slash Commands für strukturierte Workflows:

| Schritt | Befehl | Was Er Macht |
|---------|--------|-------------|
| 0 | `/deepinit` | Erfasst deine bestehende Codebasis in AGENTS.md, ARCHITECTURE.md und docs |
| 1 | `/brainstorm` | Erkundet Ideen mit dir, bevor du dich aufs Bauen festlegst |
| 2 | `/architecture` | Wägt deine Design-Trade-offs ab und zieht saubere Modulgrenzen |
| 2 | `/design` | Baut dein Design-System mit Tokens, Barrierefreiheit und responsiven Layouts |
| 2 | `/plan` | Zerlegt dein Feature in priorisierte Aufgaben |
| 3 | `/work` | Baut dein Feature Schritt für Schritt über mehrere Agenten hinweg |
| 3 | `/orchestrate` | Lässt mehrere Agenten parallel laufen, um dein Feature schneller zu bauen |
| 3 | `/ultrawork` | Baut dein Feature durch fünf Qualitätsphasen und elf Review-Gates |
| 3 | `/ralph` | Wiederholt `/ultrawork`, bis ein unabhängiger Prüfer jedes Kriterium besteht |
| 4 | `/review` | Prüft deinen Code auf Sicherheits-, Performance- und Barrierefreiheits-Probleme |
| 4 | `/deepsec` | Führt einen tiefen Security-Scan durch und blockiert riskante Pull Requests |
| 5 | `/debug` | Findet die Ursache, behebt den Bug und schreibt einen Regressionstest |
| 5 | `/docs` | Prüft deine Docs auf kaputte Verweise und patcht die, die deine Code-Änderungen betreffen |
| 6 | `/scm` | Verwaltet deine Branches, Merges und Conventional Commits |
| - | `/schedule` | Plant einen Agenten-Job, der in einem wiederkehrenden Intervall läuft |

**Auto-Erkennung**: Du brauchst nicht mal Slash Commands. Schlüsselwörter wie "Architektur", "plan", "review" und "debug" in deiner Nachricht (in 11 Sprachen!) aktivieren automatisch den richtigen Workflow.

### Per-Agent-Modelle

Setze `model_preset` in `.agents/oma-config.yaml`, um festzulegen, welche AI-Modelle jeder Agent verwendet:

```yaml
language: en
model_preset: mixed   # antigravity | claude | codex | cursor | kiro | mixed | qwen

# Optional per-agent overrides
agents:
  backend: { model: openai/gpt-5.5, effort: high }
```

- `oma doctor --profile` — gibt die pro Rolle aufgelöste Modell-Matrix aus
- Vollständige Anleitung: [`web/docs/guide/per-agent-models.md`](../web/docs/guide/per-agent-models.md)

## Warum oh-my-agent?

> [Mehr erfahren →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Portabel**: `.agents/` reist mit deinem Projekt, nicht in einer IDE eingesperrt
- **Rollenbasiert**: Agenten wie ein echtes Engineering-Team modelliert, kein Haufen Prompts
- **Token-effizient**: Zwei-Schichten-Skill-Design spart ~75% der Tokens
- **Qualität zuerst**: Charter Preflight, Quality Gates und Review-Workflows eingebaut:
  - `oma verify <agent>` — eine deterministische Check-Batterie pro Agententyp: ein gemeinsamer Kern (Scope-Verletzung, charter alignment, hartkodierte Secrets, TODO-Scan, declared outputs) plus typspezifische Checks (TypeScript strict, Tests, raw SQL, Flutter analyze, Inline-Styles, …)
  - `session.quota_cap` — Token- / Spawn- / Per-Vendor-Budgets pro Session in `oma-config.yaml`; `orchestrate` Step 5 blockiert den nächsten Spawn bei Überschreitung
  - `ralph` Workflow — unabhängiger JUDGE verifiziert jedes Criterion in jeder Iteration erneut, um stille Regressionen zu erkennen; Caching für Tests >30s
  - Exploration Loop — nach 2 Retries spawnt `orchestrate` Hypothesen-Varianten parallel und behält das Ergebnis mit der höchsten Punktzahl
  - Monorepo-Auto-Routing — `detectWorkspace` liest pnpm / nx / turbo / lerna und routet jeden Agenten zu seinem Workspace
- **Multi-Vendor**: mische Antigravity, Claude, Codex, Cursor, Kiro und Qwen je nach Agententyp
- **Beobachtbar**: Terminal- und Web-Dashboards für Echtzeit-Monitoring

## Architektur

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

## Mehr Erfahren

- **[Detaillierte Dokumentation](./AGENTS_SPEC.md)**: vollständige technische Spec und Architektur
- **[Unterstützte Agenten](./SUPPORTED_AGENTS.md)**: Agenten-Support-Matrix nach IDE
- **[Web-Docs](https://first-fluke.github.io/oh-my-agent/)**: Guides, Tutorials und CLI-Referenz

## Sponsors

Dieses Projekt wird dank unserer großzügigen Sponsors gepflegt.

> **Gefällt dir das Projekt?** Gib ihm einen Stern!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Probier unser optimiertes Starter-Template: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

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

[Sponsor werden →](https://github.com/sponsors/first-fluke)

Siehe [SPONSORS.md](../SPONSORS.md) für die vollständige Liste der Unterstützer.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Literatur

- Li, X., Liu, Y., Chen, W., You, B., Di, Z., He, Y., Zheng, S., Choe, K. W., Sun, J., Wang, S., Tao, C., Li, B., Zhao, X., Geng, H., Wu, X., Zhou, J., Chen, X., Xing, H., Li, Y., … Song, D. (2026). *SkillsBench: Benchmarking how well agent skills work across diverse tasks* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2602.12670
- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508
- Yang, Y., Gong, Z., Huang, W., Yang, Q., Zhou, Z., Huang, Z., Li, Y., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, Y., Chen, D., Yang, X., & Luo, C. (2026). *SkillOpt: Executive strategy for self-evolving agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23904
- Huang, Z., Xu, J., Yang, Y., Gong, Z., Yang, Q., Tian, M., Wang, X., Lv, C., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, X., Chen, D., Zheng, X., & Luo, C. (2026). *From raw experience to skill consumption: A systematic study of model-generated agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23899


## Lizenz

MIT
