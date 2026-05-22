# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

Tu as déjà rêvé que ton assistant IA ait des collègues ? C'est exactement ce que fait oh-my-agent.

Au lieu qu'une seule IA fasse tout (et se perde en route), oh-my-agent répartit le boulot entre des **agents spécialisés** : frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design, et plus encore. Chacun connaît son domaine sur le bout des doigts, a ses propres outils et checklists, et reste dans sa voie.

Compatible avec tous les principaux IDEs IA : Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode, et d'autres.

## Démarrage Rapide

```bash
# macOS / Linux — installe bun, uv & serena automatiquement si absents
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell) — installe bun, uv & serena automatiquement si absents
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# Ou manuellement (n'importe quel OS, nécessite bun + uv + serena)
bunx oh-my-agent@latest
```

### Installation via Agent Package Manager

<details>
<summary>L'<a href="https://github.com/microsoft/apm">Agent Package Manager</a> (APM) de Microsoft : distribution skills uniquement. Clique pour déplier.</summary>

> À ne pas confondre avec l'APM (Application Performance Monitoring) d'`oma-observability`.

```bash
# Tous les skills, déployés sur chaque runtime détectée
# (.claude, .cursor, .codex, .opencode, .github, .agents)
apm install first-fluke/oh-my-agent

# Un seul skill
apm install first-fluke/oh-my-agent/.agents/skills/oma-frontend
```

APM ne livre que les skills. Pour les workflows, les règles, `oma-config.yaml`, les hooks de détection de mots-clés et la CLI `oma agent:spawn`, utilise `bunx oh-my-agent@latest`. Une seule méthode de distribution par projet, sinon ça finit par diverger.

</details>

Choisis un preset et c'est parti :

| Preset | Ce Que Tu Obtiens |
|--------|-------------|
| ✨ All | Tous les agents et skills |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Compatible avec Tous les Agents

`oh-my-agent` conserve `.agents/` comme source unique de vérité (SSOT) et la projette dans la disposition native de chaque runtime. Tous les outils pris en charge partagent ainsi les mêmes skills, workflows et règles.

<table>
<tr>
<td align="center" width="20%">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>natif + adaptateur</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>natif + adaptateur</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/google-gemini/gemini-cli"><img src="https://github.com/google-gemini.png?size=120" alt="Gemini CLI" width="48" height="48" /></a><br/>
<strong>Gemini CLI</strong><br/>
<sub>natif + adaptateur</sub>
</td>
<td align="center" width="20%">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>natif + adaptateur</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>dispatch natif</sub>
</td>
</tr>
<tr>
<td align="center" width="20%">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>SSOT natif</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>compatible nativement</sub>
</td>
<td align="center" width="20%">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>compatible nativement</sub>
</td>
<td align="center" width="20%">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>skills via symlink</sub>
</td>
<td align="center" width="20%">
<a href="./SUPPORTED_AGENTS.md"><img src="https://img.shields.io/badge/%E2%80%A6-more-555?style=flat-square" alt="More" height="48" /></a><br/>
<strong>& plus</strong><br/>
<sub><a href="./SUPPORTED_AGENTS.md">matrice de support →</a></sub>
</td>
</tr>
</table>

## Ton Équipe d'Agents

| Agent | Ce Qu'il Fait |
|-------|-------------|
| **oma-academic-writer** | Rédaction, révision et audits par rubrique de prose académique de qualité publication |
| **oma-architecture** | Arbitrages d'architecture, frontières, analyse au regard d'ADR/ATAM/CBAM |
| **oma-backend** | APIs en Python, Node.js ou Rust |
| **oma-brainstorm** | Explore les idées avant que tu te lances dans le code |
| **oma-db** | Conception de schémas, migrations, indexation, vector DB |
| **oma-debug** | Analyse de cause racine, corrections, tests de régression |
| **oma-deepsec** | Scanner de vulnérabilités par agent, gate PR, matchers personnalisés |
| **oma-design** | Systèmes de design, tokens, accessibilité, responsive |
| **oma-dev-workflow** | CI/CD, releases, automatisation monorepo |
| **oma-docs** | Vérifications d'intégrité des refs, détection de docs affectés par un diff |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-hwp** | Conversion HWP/HWPX/HWPML vers Markdown |
| **oma-image** | Génération d'images IA multi-fournisseur |
| **oma-market** | Étude de marché par signaux communautaires pour pain/trend/concurrent/discovery avec SWOT/5F/PESTEL |
| **oma-mobile** | Apps multiplateformes avec Flutter |
| **oma-observability** | Routeur d'observabilité pour APM/RUM, métriques/logs/traces/profils, SLO, forensique d'incidents et tuning du transport |
| **oma-orchestrator** | Exécution parallèle d'agents via CLI |
| **oma-pdf** | Conversion PDF vers Markdown |
| **oma-pm** | Planifie les tâches, découpe les specs, définit les contrats d'API |
| **oma-qa** | Sécurité OWASP, performance, revue d'accessibilité |
| **oma-recap** | Analyse de l'historique des conversations et resumes thematiques du travail |
| **oma-scholar** | Compagnon de recherche académique pour la recherche bibliographique et l'évaluation par les pairs |
| **oma-scm** | Gestion de configuration logicielle avec branches, fusions, worktrees, références de base, Conventional Commits |
| **oma-search** | Routeur de recherche basé sur l'intention avec score de confiance pour docs, web, code et local |
| **oma-skill-creator** | Rédige et audite les skills OMA au format SSL-lite |
| **oma-tf-infra** | IaC multi-cloud avec Terraform (Infrastructure as Code) |
| **oma-translator** | Traduction multilingue naturelle |
| **oma-voice** | TTS/STT local-first via Voicebox MCP pour génération vocale, voix off et transcription |

## Comment Ça Marche

Discute, tout simplement. Décris ce que tu veux et oh-my-agent choisit les bons agents.

```
Toi : "Construis une app TODO avec authentification"
→ PM planifie le travail
→ Backend construit l'API d'auth
→ Frontend construit l'UI React
→ DB conçoit le schéma
→ QA passe tout en revue
→ Terminé : code coordonné et vérifié
```

Ou utilise les slash commands pour des workflows structurés :

| Étape | Commande | Description |
|-------|----------|-------------|
| 1 | `/brainstorm` | Idéation libre |
| 2 | `/architecture` | Revue d'architecture, arbitrages, analyse type ADR/ATAM/CBAM |
| 2 | `/design` | Workflow de système de design en 7 phases |
| 2 | `/plan` | PM découpe ta feature en tâches |
| 3 | `/work` | Exécution multi-agent étape par étape |
| 3 | `/orchestrate` | Lancement automatisé d'agents en parallèle |
| 3 | `/ultrawork` | Workflow qualité en 5 phases avec 11 portes de revue |
| 4 | `/review` | Audit sécurité + performance + accessibilité |
| 4 | `/deepsec` | Scan de sécurité profond par agent |
| 5 | `/debug` | Debugging structuré par cause racine |
| 5 | `/docs` | Vérification et synchronisation de la dérive documentaire via `oma-docs` |
| 6 | `/scm` | Workflow SCM et Git, prise en charge des Conventional Commits |

**Auto-détection** : Tu n'as même pas besoin des slash commands. Des mots-clés comme "architecture", "plan", "review" et "debug" dans ton message (en 11 langues !) activent automatiquement le bon workflow.

## CLI

```bash
# Installer globalement
bun install --global oh-my-agent   # ou : brew install oh-my-agent

# Utiliser n'importe où
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
oma agent:spawn backend "Build auth API" session-01
oma dashboard               # Monitoring des agents en temps réel
oma doctor                  # Bilan de santé
oma image generate "cat"    # Génération d'images IA multi-fournisseur
oma link                    # Régénère .claude/.codex/.gemini/etc. depuis .agents/
oma model:check             # Détecte la dérive entre modèles enregistrés et listes fournisseurs en direct
oma recap --window 1d       # Récapitulatif d'historique de conversation inter-outils
oma retro 7d --compare      # Rétrospective ingénierie avec métriques + tendances
oma search fetch <url>      # Recherche mécanique avec stratégies à escalade automatique
```

La sélection de modèle suit deux couches :
- Le dispatch natif du même fournisseur utilise la définition d'agent générée dans `.claude/agents/`, `.codex/agents/` ou `.gemini/agents/`.
- Le dispatch inter-fournisseur ou le fallback CLI utilise les valeurs par défaut du fournisseur dans `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

**modèles par agent** : chaque agent peut cibler son propre modèle et son `effort` via `.agents/oma-config.yaml`. Runtime profiles prêts à l'emploi : `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `mixed`. Vérifiez la matrice d'auth résolue avec `oma doctor --profile`. Guide complet : [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

## Pourquoi oh-my-agent ?

> [En savoir plus →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Portable** : `.agents/` voyage avec ton projet, pas enfermé dans un IDE
- **Basé sur les rôles** : des agents modélisés comme une vraie équipe d'ingé, pas un tas de prompts
- **Économe en tokens** : le design de skills à deux couches économise ~75% de tokens
- **Qualité d'abord** : Charter preflight, quality gates et workflows de revue intégrés :
  - `oma verify <agent>` — 14 vérifications déterministes par type d'agent (TypeScript strict, tests, raw SQL, secrets hardcodés, Flutter analyze, inline styles, scope violation, charter alignment, …)
  - `session.quota_cap` — quotas de tokens / spawn / par-vendor par session dans `oma-config.yaml` ; le Step 5 d'`orchestrate` bloque le prochain spawn en cas de dépassement
  - workflow `ralph` — un JUDGE indépendant re-vérifie chaque criterion à chaque itération pour détecter les régressions silencieuses ; cache pour les tests >30s
  - Exploration Loop — après 2 retries, `orchestrate` spawn des variantes d'hypothèse en parallèle et conserve la meilleure note
  - Auto-routing monorepo — `detectWorkspace` lit pnpm / nx / turbo / lerna et route chaque agent vers son workspace
- **Multi-vendor** : mélange Claude, Codex, Cursor et Qwen par type d'agent
- **Observable** : dashboards terminal et web pour le monitoring en temps réel

## Architecture

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

## En Savoir Plus

- **[Documentation Détaillée](./AGENTS_SPEC.md)** : spec technique complète et architecture
- **[Agents Supportés](./SUPPORTED_AGENTS.md)** : matrice de support des agents par IDE
- **[Docs Web](https://first-fluke.github.io/oh-my-agent/)** : guides, tutoriels et référence CLI

## Sponsors

Ce projet est maintenu grâce à nos généreux sponsors.

> **Tu aimes ce projet ?** Mets-lui une étoile !
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Essaie notre template starter optimisé : [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

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

[Devenir sponsor →](https://github.com/sponsors/first-fluke)

Voir [SPONSORS.md](../SPONSORS.md) pour la liste complète des supporters.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Références

- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508


## Licence

MIT
