# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md)

Tu as déjà rêvé que ton assistant IA ait des collègues ? C'est exactement ce que fait oh-my-agent.

Au lieu qu'une seule IA fasse tout (et se perde en route), oh-my-agent répartit le boulot entre des **agents spécialisés** — frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design, et plus encore. Chacun connaît son domaine sur le bout des doigts, a ses propres outils et checklists, et reste dans sa voie.

Compatible avec tous les principaux IDEs IA : Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode, et d'autres.

## Démarrage Rapide

```bash
# Une seule ligne (installe bun & uv automatiquement si absents)
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# Ou manuellement
bunx oh-my-agent@latest
```

Choisis un preset et c'est parti :

| Preset | Ce Que Tu Obtiens |
|--------|-------------|
| ✨ All | Tous les agents et skills |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + commit |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + commit |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + commit |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + commit |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + commit |

## Ton Équipe d'Agents

| Agent | Ce Qu'il Fait |
|-------|-------------|
| **oma-architecture** | Arbitrages d'architecture, frontières, analyse au regard d'ADR/ATAM/CBAM |
| **oma-backend** | APIs en Python, Node.js ou Rust |
| **oma-brainstorm** | Explore les idées avant que tu te lances dans le code |
| **oma-db** | Conception de schémas, migrations, indexation, vector DB |
| **oma-debug** | Analyse de cause racine, corrections, tests de régression |
| **oma-design** | Systèmes de design, tokens, accessibilité, responsive |
| **oma-dev-workflow** | CI/CD, releases, automatisation monorepo |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-mobile** | Apps multiplateformes avec Flutter |
| **oma-orchestrator** | Exécution parallèle d'agents via CLI |
| **oma-pdf** | Conversion PDF vers Markdown |
| **oma-pm** | Planifie les tâches, découpe les specs, définit les contrats d'API |
| **oma-qa** | Sécurité OWASP, performance, revue d'accessibilité |
| **oma-scm** | Commits conventionnels propres |
| **oma-tf-infra** | IaC multi-cloud avec Terraform (Infrastructure as Code) |
| **oma-translator** | Traduction multilingue naturelle |

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

| Commande | Ce Qu'elle Fait |
|---------|-------------|
| `/plan` | PM découpe ta feature en tâches |
| `/work` | Exécution multi-agent étape par étape |
| `/orchestrate` | Lancement automatisé d'agents en parallèle |
| `/ultrawork` | Workflow qualité en 5 phases avec 11 portes de revue |
| `/review` | Audit sécurité + performance + accessibilité |
| `/debug` | Debugging structuré par cause racine |
| `/design` | Workflow de système de design en 7 phases |
| `/brainstorm` | Idéation libre |
| `/scm` | Commit conventionnel avec analyse type/scope |

**Auto-détection** : Tu n'as même pas besoin des slash commands — des mots-clés comme "plan", "review", "debug" dans ton message (en 11 langues !) activent automatiquement le bon workflow.

## CLI

```bash
# Installer globalement
bun install --global oh-my-agent   # ou : brew install oh-my-agent

# Utiliser n'importe où
oma doctor                  # Bilan de santé
oma dashboard               # Monitoring des agents en temps réel
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

## Pourquoi oh-my-agent ?

> [En savoir plus →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Portable** — `.agents/` voyage avec ton projet, pas enfermé dans un IDE
- **Basé sur les rôles** — Des agents modélisés comme une vraie équipe d'ingé, pas un tas de prompts
- **Économe en tokens** — Le design de skills à deux couches économise ~75% de tokens
- **Qualité d'abord** — Charter preflight, quality gates et workflows de revue intégrés
- **Multi-vendor** — Mélange Gemini, Claude, Codex et Qwen par type d'agent
- **Observable** — Dashboards terminal et web pour le monitoring en temps réel

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

- **[Documentation Détaillée](./AGENTS_SPEC.md)** — Spec technique complète et architecture
- **[Agents Supportés](./SUPPORTED_AGENTS.md)** — Matrice de support des agents par IDE
- **[Docs Web](https://first-fluke.github.io/oh-my-agent/)** — Guides, tutoriels et référence CLI

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


## Licence

MIT
