---
title: Guide d'utilisation
description: Guide complet incluant exemples, workflows, opérations de tableau de bord et dépannage.
---

# Comment utiliser les compétences multi-agents Antigravity

## Démarrage rapide

1. **Ouvrir dans Antigravity IDE**
   ```bash
   antigravity open /path/to/oh-my-agent
   ```

2. **Les compétences sont automatiquement détectées.** Antigravity analyse `.agents/skills/` et indexe toutes les compétences disponibles.

3. **Discutez dans l'IDE.** Décrivez ce que vous souhaitez construire.

---

## Exemples d'utilisation

### Exemple 1 : Tâche simple mono-domaine

**Vous tapez :**
```
"Créer un composant formulaire de connexion avec champs email et mot de passe utilisant Tailwind CSS"
```

**Ce qui se passe :**
- Vous invoquez `oma-frontend` via /command ou champ skills de l'agent
- La compétence se charge à la demande (Divulgation progressive)
- Vous obtenez un composant React avec TypeScript, Tailwind, validation de formulaire

### Exemple 2 : Projet multi-domaine complexe

**Vous tapez :**
```
"Construire une application TODO avec authentification utilisateur"
```

**Ce qui se passe :**

1. **Workflow Guide s'active** — détecte la complexité multi-domaine
2. **PM Agent planifie** — crée décomposition des tâches avec priorités
3. **Vous générez agents via CLI** :
   ```bash
   oma agent:spawn backend "API authentification JWT" session-01 &
   oma agent:spawn frontend "UI connexion et TODO" session-01 &
   wait
   ```
4. **Les agents travaillent en parallèle** — enregistrent sorties dans Knowledge Base
5. **Vous coordonnez** — examinez `.agents/results/` pour cohérence
6. **QA Agent examine** — audit sécurité/performance
7. **Corriger & itérer** — régénérer agents avec corrections

### Exemple 3 : Correction de bugs

**Vous tapez :**
```
"Il y a un bug — cliquer sur connexion affiche 'Cannot read property map of undefined'"
```

**Ce qui se passe :**

1. **oma-debug s'active** — analyse l'erreur
2. **Cause racine trouvée** — le composant mappe sur `todos` avant chargement données
3. **Correction fournie** — états de chargement et vérifications null ajoutés
4. **Test de régression écrit** — assure que le bug ne reviendra pas
5. **Modèles similaires trouvés** — corrige proactivement 3 autres composants

### Exemple : Création de système de design

**Vous tapez :**
```
"Conçois une landing page premium sombre pour mon produit SaaS"
```

**Ce qui se passe :**

1. **oma-design s'active** — vérifie `.design-context.md`
2. **Contexte collecté** — questions sur l'audience, la marque, la direction esthétique
3. **Prompt amélioré** — requête vague transformée en spécification section par section
4. **2-3 directions proposées** — options couleur, typographie, mise en page, animation
5. **DESIGN.md généré** — système de design en 6 sections + tokens
6. **Audit exécuté** — responsive, WCAG, heuristiques de Nielsen, vérification AI slop
7. **Transmission** — prêt pour implémentation avec oma-frontend

### Exemple 4 : Exécution parallèle basée CLI

```bash
# Agent unique (espace de travail auto-détecté)
oma agent:spawn backend "Implémenter API auth JWT" session-01

# Agents parallèles
oma agent:spawn backend "Implémenter API auth" session-01 &
oma agent:spawn frontend "Créer formulaire connexion" session-01 &
oma agent:spawn mobile "Construire écrans auth" session-01 &
wait
```

**Surveiller en temps réel :**
```bash
# Terminal (fenêtre terminal séparée)
bunx oh-my-agent dashboard

# Ou navigateur
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## Tableaux de bord en temps réel

### Tableau de bord terminal

```bash
bunx oh-my-agent dashboard
```

Surveille `.serena/memories/` en utilisant `fswatch` (macOS) ou `inotifywait` (Linux). Affiche une table en direct avec statut session, états agents, tours et dernière activité. Se met à jour automatiquement quand fichiers mémoire changent.

**Exigences :**
- macOS : `brew install fswatch`
- Linux : `apt install inotify-tools`

### Tableau de bord web

```bash
npm install          # première fois seulement
bunx oh-my-agent dashboard:web
```

Ouvrez `http://localhost:9847` dans votre navigateur. Fonctionnalités :

- **Mises à jour en temps réel** via WebSocket (événementiel, pas polling)
- **Reconnexion automatique** si la connexion tombe
- **Interface thème Serena** avec couleurs d'accent violet
- **Statut session** — ID et état running/completed/failed
- **Table agents** — nom, statut (avec points colorés), nombre de tours, description tâche
- **Journal d'activité** — derniers changements depuis fichiers progress et result

Le serveur surveille `.serena/memories/` en utilisant chokidar avec debounce (100ms). Seuls les fichiers modifiés déclenchent lectures — pas de re-scan complet.

---

## Concepts clés

### Divulgation progressive
Les compétences sont invoquées explicitement via /command ou chargées via le champ skills de l'agent. Seule la compétence nécessaire se charge dans le contexte.

### Conception de compétence optimisée pour tokens
Chaque compétence utilise une architecture à deux couches pour efficacité maximale des tokens :
- **SKILL.md** (~40 lignes) : Identité, routage, règles de base — chargé immédiatement
- **resources/** : Protocoles d'exécution, exemples, listes de contrôle, playbooks d'erreurs — chargé à la demande

Les ressources partagées vivent dans `_shared/` (pas une compétence) et sont référencées par tous les agents :
- Protocoles d'exécution chaîne de pensée avec workflow en 4 étapes
- Exemples few-shot entrée/sortie pour guidance modèle niveau intermédiaire
- Playbooks de récupération d'erreur avec escalade "3 tentatives"
- Modèles de raisonnement pour analyse multi-étapes structurée
- Gestion budget contexte pour niveaux modèle Flash/Pro
- Vérification automatisée via `verify.sh`
- Accumulation leçons apprises entre sessions

### Génération d'agents CLI
Utilisez `oma agent:spawn` pour exécuter agents via CLI. Respecte `agent_cli_mapping` dans `user-preferences.yaml` pour sélectionner le CLI approprié (gemini, claude, codex, qwen) par type d'agent. L'espace de travail est auto-détecté depuis conventions monorepo communes, ou peut être défini explicitement avec `-w`.

### Knowledge Base
Sorties agents stockées à `.agents/results/`. Contient plans, code, rapports et notes de coordination.

### Serena Memory
État d'exécution structuré à `.serena/memories/`. L'orchestrator écrit infos session, tableaux tâches, progression par agent et résultats. Les tableaux de bord surveillent ces fichiers pour monitoring.

### Espaces de travail
Les agents peuvent travailler dans répertoires séparés pour éviter conflits. L'espace de travail est auto-détecté depuis conventions monorepo communes :
```
./apps/api   ou ./backend   → Espace de travail Backend Agent
./apps/web   ou ./frontend  → Espace de travail Frontend Agent
./apps/mobile ou ./mobile   → Espace de travail Mobile Agent
```

---

## Compétences disponibles

| Compétence | Cas d'utilisation | Sortie |
|------------|------------------------------|--------|
| oma-coordination | Projets multi-domaine complexes | Coordination d'agents étape par étape |
| oma-pm | "planifier ceci", "décomposer" | `.agents/plan.json` |
| oma-frontend | UI, composants, style | Composants React, tests |
| oma-backend | APIs, bases de données, auth | Points terminaison API, modèles, tests |
| oma-mobile | Applications mobiles, iOS/Android | Écrans Flutter, gestion état |
| oma-brainstorm | Idéation, exploration de concepts | Document de conception |
| oma-db | Base de données, schéma, ERD, migration | Conception de schéma, optimisation |
| oma-dev-workflow | CI/CD, git hooks, configuration monorepo | Configurations, automatisation |
| oma-tf-infra | Terraform, infrastructure cloud | Modules IaC, gestion d'état |
| oma-translator | Traduction, contenu multilingue | Texte traduit préservant le ton |
| oma-qa | "vérifier sécurité", "audit" | Rapport QA avec corrections priorisées |
| oma-debug | Rapports bugs, messages erreur | Code corrigé, tests régression |
| oma-orchestrator | Exécution sous-agents CLI | Résultats dans `.agents/results/` |
| oma-commit | "commit", "enregistrer" | Commits Git (auto-divisés par fonctionnalité) |

---

## Commandes workflow

Tapez-les dans le chat Antigravity IDE pour déclencher workflows étape par étape :

| Commande | Description |
|----------|-------------|
| `/brainstorm` | Idéation axée design et exploration de concepts |
| `/coordinate` | Orchestration multi-agents via CLI avec guidance étape par étape |
| `/deepinit` | Initialisation profonde du projet avec génération hiérarchique AGENTS.md |
| `/exec-plan` | Exécution et gestion de plan étape par étape |
| `/orchestrate` | Exécution parallèle d'agents automatisée basée CLI |
| `/plan` | Décomposition tâches PM avec contrats API |
| `/review` | Pipeline QA complet (sécurité, performance, accessibilité, qualité code) |
| `/debug` | Correction bugs structurée (reproduire → diagnostiquer → corriger → test régression) |
| `/setup` | Configuration CLI et outils MCP |
| `/tools` | Gestion des outils MCP disponibles |
| `/ultrawork` | Exécution maximale avec parallélisme multi-agents à 5 phases |
| `/stack-set` | Configurer la stack backend d'oma-backend (Python, Node.js, Rust) |

Ces commandes sont séparées des **compétences** (invoquées via /command ou champ skills de l'agent). Les workflows vous donnent contrôle explicite sur processus multi-étapes.

---

## Workflows typiques

### Workflow A : Compétence unique

```
Vous : "Créer un composant bouton"
  → Antigravity charge oma-frontend
  → Obtenir composant immédiatement
```

### Workflow B : Projet multi-agents (Auto)

```
Vous : "Construire une application TODO avec authentification"
  → utilisez /coordinate pour démarrer oma-coordination
  → PM Agent crée plan
  → Vous générez agents via CLI (oma agent:spawn)
  → Agents travaillent en parallèle
  → QA Agent examine
  → Corriger problèmes, itérer
```

### Workflow B-2 : Projet multi-agents (Explicite)

```
Vous : /coordinate
  → Workflow guidé étape par étape
  → Planification PM → revue plan → génération agents → monitoring → revue QA
```

### Workflow C : Correction bugs

```
Vous : "Bouton connexion lance TypeError"
  → oma-debug s'active
  → Analyse cause racine
  → Correction + test régression
  → Modèles similaires vérifiés
```

### Workflow D : Orchestration CLI avec tableau de bord

```
Terminal 1: bunx oh-my-agent dashboard:web
Terminal 2: oma agent:spawn backend "tâche" session-01 &
            oma agent:spawn frontend "tâche" session-01 &
Navigateur: http://localhost:9847 → statut temps réel
```

---

## Conseils

1. **Soyez spécifique** — "Construire une application TODO avec auth JWT, frontend React, backend Express" est meilleur que "faire une app"
2. **Utilisez génération CLI** pour projets multi-domaine — n'essayez pas de tout faire dans une discussion
3. **Examinez Knowledge Base** — vérifiez `.agents/results/` pour cohérence API
4. **Itérez avec régénérations** — affinez instructions, ne recommencez pas de zéro
5. **Utilisez tableaux de bord** — `bunx oh-my-agent dashboard` ou `bunx oh-my-agent dashboard:web` pour surveiller sessions orchestrator
6. **Espaces de travail séparés** — assignez à chaque agent son propre répertoire

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Compétences ne chargent pas | `antigravity open .`, vérifier `.agents/skills/`, redémarrer IDE |
| CLI introuvable | Vérifier `which gemini` / `which claude`, installer CLI manquants |
| Sorties agents incompatibles | Examiner les deux dans Knowledge Base, régénérer avec corrections |
| Tableau de bord : "No agents" | Fichiers mémoire pas encore créés, exécuter orchestrator d'abord |
| Tableau de bord web ne démarre pas | Exécuter `npm install` pour installer chokidar et ws |
| fswatch introuvable | macOS : `brew install fswatch`, Linux : `apt install inotify-tools` |
| Rapport QA a 50+ problèmes | Se concentrer sur CRITICAL/HIGH d'abord, documenter reste pour plus tard |

---

## Commandes CLI

```bash
bunx oh-my-agent                # Installateur compétences interactif
bunx oh-my-agent doctor         # Vérifier configuration & réparer compétences manquantes
bunx oh-my-agent doctor --json  # Sortie JSON pour CI/CD
bunx oh-my-agent update         # Mettre à jour compétences vers dernière version
bunx oh-my-agent stats          # Voir métriques productivité
bunx oh-my-agent stats --reset  # Réinitialiser métriques
bunx oh-my-agent retro          # Rétrospective session (apprentissages & prochaines étapes)
bunx oh-my-agent dashboard      # Tableau de bord terminal temps réel
bunx oh-my-agent dashboard:web  # Tableau de bord web (http://localhost:9847)
bunx oh-my-agent help           # Afficher aide
```

---

## Pour développeurs (Guide d'intégration)

Si vous souhaitez intégrer ces compétences dans votre projet Antigravity existant, voir [AGENT_GUIDE.md](../AGENT_GUIDE.md) pour :
- Intégration rapide en 3 étapes
- Intégration complète tableau de bord
- Personnalisation compétences pour votre stack technique
- Dépannage et bonnes pratiques

---

**Discutez simplement dans Antigravity IDE.** Pour monitoring, utilisez tableaux de bord. Pour exécution CLI, utilisez scripts orchestrator. Pour intégrer dans votre projet existant, voir [AGENT_GUIDE.md](../AGENT_GUIDE.md).
