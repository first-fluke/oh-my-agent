---
title: Intégration dans un projet existant
description: Workflow d'intégration sûr et non destructif pour ajouter les skills oh-my-agent à un projet Antigravity existant.
---

# Intégrer dans un projet existant

Ce guide remplace l'ancien workflow basé sur le fichier `AGENT_GUIDE.md` à la racine et reflète la structure actuelle de l'espace de travail (`cli` + `web`) ainsi que le comportement du CLI.

## Objectif

Ajouter les skills `oh-my-agent` à un projet existant sans écraser les ressources actuelles.

## Chemin recommandé (CLI)

Exécutez ceci à la racine du projet cible :

```bash
bunx oh-my-agent
```

Ce que cela fait :

- Installe ou met à jour `.agents/skills/*`
- Installe les ressources partagées dans `.agents/skills/_shared`
- Installe `.agents/workflows/*`
- Installe `.agents/config/user-preferences.yaml`
- Installe optionnellement les workflows globaux sous `~/.gemini/antigravity/global_workflows`

## Chemin manuel sécurisé

Utilisez cette méthode lorsque vous avez besoin d'un contrôle total sur chaque répertoire copié.

```bash
cd /path/to/your-project

mkdir -p .agents/skills .agents/workflows .agents/config

# Copy only missing skill directories (example)
for skill in oma-coordination oma-pm oma-frontend oma-backend oma-mobile oma-qa oma-debug oma-orchestrator oma-commit; do
  if [ ! -d ".agents/skills/$skill" ]; then
    cp -r /path/to/oh-my-agent/.agents/skills/$skill .agents/skills/$skill
  fi
done

# Copy shared resources if missing
[ -d .agents/skills/_shared ] || cp -r /path/to/oh-my-agent/.agents/skills/_shared .agents/skills/_shared

# Copy workflows if missing
for wf in coordinate.md orchestrate.md plan.md review.md debug.md setup.md tools.md; do
  [ -f ".agents/workflows/$wf" ] || cp /path/to/oh-my-agent/.agents/workflows/$wf .agents/workflows/$wf
done

# Copy default user preferences only if missing
[ -f .agents/config/user-preferences.yaml ] || cp /path/to/oh-my-agent/.agents/config/user-preferences.yaml .agents/config/user-preferences.yaml
```

## Checklist de vérification

```bash
# 9 installable skills (excluding _shared)
find .agents/skills -mindepth 1 -maxdepth 1 -type d ! -name '_shared' | wc -l

# Shared resources
[ -d .agents/skills/_shared ] && echo ok

# 7 workflows
find .agents/workflows -maxdepth 1 -name '*.md' | wc -l

# Basic command health
bunx oh-my-agent doctor
```

## Tableaux de bord optionnels

Les tableaux de bord sont optionnels et utilisent le CLI installé :

```bash
bunx oh-my-agent dashboard
bunx oh-my-agent dashboard:web
```

URL par défaut du tableau de bord web : `http://localhost:9847`

## Stratégie de retour arrière

Avant l'intégration, créez un commit de point de contrôle dans votre projet :

```bash
git add -A
git commit -m "chore: checkpoint before oh-my-agent integration"
```

Si vous devez annuler, revertez ce commit avec votre processus d'équipe habituel.

## Support des liens symboliques multi-CLI

Lorsque vous exécutez `bunx oh-my-agent`, vous verrez ce prompt après la sélection des skills :

```text
Also develop with other CLI tools?
  ○ Claude Code (.claude/skills/)
  ○ OpenCode, Amp, Codex (.agents/skills/)
  ○ GitHub Copilot (.github/skills/)
```

Sélectionnez les outils CLI supplémentaires que vous utilisez aux côtés d'Antigravity. L'installateur va :

1. Installer les skills dans `.agents/skills/` (emplacement natif d'Antigravity)
2. Créer des liens symboliques depuis le répertoire de skills de chaque CLI sélectionné vers `.agents/skills/`

Cela garantit une source unique de vérité tout en permettant aux skills de fonctionner avec plusieurs outils CLI.

### Structure des liens symboliques

```
.agents/skills/oma-frontend/      ← Source (SSOT)
.claude/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/
.agents/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (OpenCode, Amp, Codex)
.github/skills/oma-frontend/     → ../../.agents/skills/oma-frontend/ (GitHub Copilot)
```

L'installateur ignore les liens symboliques existants et avertit si un répertoire réel existe à l'emplacement cible.

## Notes

- N'écrasez pas les dossiers `.agents/skills/*` existants sauf si vous avez l'intention de remplacer des skills personnalisés.
- Conservez les fichiers de politique spécifiques au projet (`.agents/config/*`) sous la propriété de votre dépôt.
- Pour les modèles d'orchestration multi-agent, continuez avec le [`Guide d'utilisation`](./usage.md).
