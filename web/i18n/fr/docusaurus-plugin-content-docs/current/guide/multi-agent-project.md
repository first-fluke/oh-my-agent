---
title: "Guide : Projets Multi-Agents"
description: Guide complet pour coordonner plusieurs agents de domaine en frontend, backend, base de données, mobile et QA — de la planification au merge.
---

# Guide : Projets multi-agents

## Quand utiliser la coordination multi-agents

Votre fonctionnalité couvre plusieurs domaines -- API backend + UI frontend + schéma de base de données + client mobile + revue QA. Un seul agent ne peut pas gérer l'ensemble du périmètre, et vous avez besoin que les domaines progressent en parallèle sans écraser mutuellement leurs fichiers.

La coordination multi-agents est le bon choix lorsque :

- La tâche implique 2 domaines ou plus (frontend, backend, mobile, db, QA, debug, pm).
- Il y a des contrats d'API entre les domaines (ex. : un endpoint REST consommé à la fois par le web et le mobile).
- Vous souhaitez une exécution parallèle pour réduire le temps réel d'exécution.
- Vous avez besoin d'une revue QA après l'implémentation sur tous les domaines.

Si votre tâche s'inscrit entièrement dans un seul domaine, utilisez directement l'agent spécifique à la place.

---

## La séquence complète : de /plan à /review

Le workflow multi-agents recommandé suit un pipeline strict en quatre étapes.

### Étape 1 : /plan — exigences et décomposition des tâches

Le workflow `/plan` s'exécute en ligne (sans lancement de sous-agent) et produit un plan structuré.

```
/plan
```

Ce qui se passe :

1. **Recueillir les exigences** — l'agent PM interroge sur les utilisateurs cibles, les fonctionnalités principales, les contraintes et les cibles de déploiement.
2. **Analyser la faisabilité technique** — utilise les outils MCP d'analyse de code (`get_symbols_overview`, `find_symbol`, `search_for_pattern`) pour scanner la base de code existante à la recherche de code réutilisable et de patterns d'architecture.
3. **Définir les contrats d'API** — conçoit les contrats d'endpoint (méthode, chemin, schémas de requête/réponse, authentification, réponses d'erreur) et les enregistre dans `.agents/skills/_shared/core/api-contracts/`.
4. **Décomposer en tâches** — découpe le projet en tâches actionnables, chacune avec : agent assigné, titre, critères d'acceptation, priorité (P0-P3) et dépendances.
5. **Revue du plan avec l'utilisateur** — présente le plan complet pour confirmation. Le workflow ne poursuit pas sans approbation explicite de l'utilisateur.
6. **Enregistrer le plan** — écrit le plan approuvé dans `.agents/results/plan-{sessionId}.json` et enregistre un résumé en mémoire.

La sortie `.agents/results/plan-{sessionId}.json` sert d'entrée à `/work` et à `/orchestrate`.

### Étape 2 : /work ou /orchestrate — exécution

Deux voies d'exécution sont possibles :

| Aspect | /work | /orchestrate |
|:-------|:------|:-------------|
| **Interaction** | Interactif : l'utilisateur confirme à chaque étape | Automatisé : s'exécute jusqu'à la fin |
| **Planification PM** | Intégrée (l'étape 2 exécute l'agent PM) | Nécessite un plan issu de /plan |
| **Point de contrôle utilisateur** | Après la revue du plan (étape 3) | Avant le démarrage (le plan doit exister) |
| **Mode persistant** | Oui, ne peut pas être interrompu avant la fin | Oui, ne peut pas être interrompu avant la fin |
| **Idéal pour** | Premier usage, projets complexes nécessitant une supervision | Exécutions répétées, tâches bien définies |

#### /work — pipeline multi-agents interactif

```
/work
```

1. Analyse la demande de l'utilisateur et identifie les domaines impliqués.
2. Exécute l'agent PM pour la décomposition des tâches (crée plan-\{sessionId\}.json).
3. Présente le plan pour confirmation utilisateur : **bloque jusqu'à confirmation**.
4. Lance les agents par niveau de priorité (P0 d'abord, puis P1, etc.), chaque tâche de même priorité s'exécutant en parallèle.
5. Surveille la progression des agents via les fichiers mémoire.
6. Exécute la revue de l'agent QA sur tous les livrables (OWASP Top 10, performance, accessibilité, qualité du code).
7. Si la QA trouve des problèmes CRITICAL ou HIGH, relance l'agent responsable avec les constats. Répète jusqu'à 2 fois par problème. Si le même problème persiste, active la **boucle d'exploration** : génère 2 à 3 approches alternatives, lance le même type d'agent avec des prompts d'hypothèses différents dans des workspaces séparés, la QA note chacun et le meilleur résultat est adopté.

#### /orchestrate — exécution parallèle automatisée

```
/orchestrate
```

1. Charge `.agents/results/plan-{sessionId}.json` (refuse de continuer s'il est absent).
2. Initialise une session avec un identifiant au format `session-YYYYMMDD-HHMMSS`.
3. Crée `orchestrator-session.md` et `task-board.md` dans le répertoire mémoire.
4. Lance les agents par niveau de priorité, chacun recevant : description de la tâche, contrats d'API et contexte.
5. Surveille la progression en interrogeant les fichiers `progress-{agent}.md`.
6. Vérifie chaque agent terminé via `verify.sh` : PASS (exit 0) accepte, FAIL (exit 1) relance avec le contexte d'erreur (2 tentatives max), et un échec persistant déclenche la boucle d'exploration.
7. Collecte tous les fichiers `result-{agent}.md` et compile un rapport final.

### Étape 3 : agent:spawn — gestion d'agents au niveau CLI

La commande `agent:spawn` est le mécanisme bas niveau que les workflows appellent en interne. Vous pouvez aussi l'utiliser directement :

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Tous les flags :**

| Option | Description |
|:-------|:------------|
| `-m, --model <vendor>` | Remplacement du fournisseur CLI (antigravity/claude/codex/qwen). Prioritaire sur toute la config. |
| `-w, --workspace <path>` | Répertoire de travail de l'agent. Auto-détecté depuis la config monorepo si omis. |

**Ordre de résolution du fournisseur** (la première correspondance l'emporte) :

1. Flag `--model` sur la ligne de commande
2. `model_preset (per-agent overrides via `agents:`)` dans `oma-config.yaml` pour ce type d'agent spécifique
3. `default_cli` dans `oma-config.yaml`
4. `active_vendor` dans `cli-config.yaml`
5. `gemini` (valeur par défaut codée en dur)

**L'auto-détection de workspace** vérifie les configs monorepo dans cet ordre : pnpm-workspace.yaml, workspaces de package.json, lerna.json, nx.json, turbo.json, mise.toml. Chaque répertoire de workspace est noté par rapport aux mots-clés du type d'agent (par exemple « web », « frontend », « client » pour l'agent frontend). Si aucune config monorepo n'est trouvée, repli sur des candidats codés en dur comme `apps/web`, `apps/frontend`, `frontend/`, etc.

**Résolution du prompt :** l'argument `<prompt>` peut être du texte inline ou un chemin de fichier. Si le chemin résout vers un fichier existant, son contenu est lu et utilisé comme prompt. Le CLI injecte également les protocoles d'exécution spécifiques au fournisseur depuis `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Étape 4 : /review — vérification QA

```
/review
```

Le workflow review exécute un pipeline QA complet :

1. **Identifier le périmètre** — demande ce qu'il faut examiner (fichiers spécifiques, branche de fonctionnalité ou projet entier).
2. **Vérifications de sécurité automatisées** — exécute `npm audit`, `bandit` ou équivalent.
3. **Revue manuelle OWASP Top 10** — injection, authentification cassée, données sensibles, contrôle d'accès, mauvaise configuration, désérialisation non sécurisée, composants vulnérables, logging insuffisant.
4. **Analyse de performance** — requêtes N+1, index manquants, pagination non bornée, fuites mémoire, re-renders inutiles, tailles de bundle.
5. **Accessibilité** — WCAG 2.1 AA : HTML sémantique, ARIA, navigation clavier, contraste des couleurs, gestion du focus.
6. **Qualité du code** — nommage, gestion des erreurs, couverture des tests, TypeScript strict, imports inutilisés, patterns async/await.
7. **Rapport** — constats classés en CRITICAL / HIGH / MEDIUM / LOW avec `fichier:ligne`, description et code de remédiation.

Pour les périmètres importants, le workflow délègue au sous-agent QA. Avec l'option `--fix`, il entre dans une boucle Fix-Verify : lance des agents de domaine pour corriger les problèmes CRITICAL/HIGH, ré-examine, répète jusqu'à 3 fois.

---

## Stratégie d'identifiants de session

Chaque session d'orchestration reçoit un identifiant unique au format :

```
session-YYYYMMDD-HHMMSS
```

Exemple : `session-20260324-143052`

L'identifiant de session sert à :

- Nommer les fichiers mémoire (`orchestrator-session.md`, `task-board.md`)
- Suivre les processus d'agents via des fichiers PID dans le répertoire temp système (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- Corréler les fichiers de logs (`/tmp/subagent-{session-id}-{agent-id}.log`)
- Regrouper les résultats dans `.agents/results/parallel-{timestamp}/`

L'identifiant de session est généré à l'étape 2 de `/orchestrate` et transmis à tous les agents lancés. Cela garantit que tous les agents, logs et fichiers PID d'une exécution peuvent être tracés jusqu'à une seule session.

---

## Attribution de workspace par domaine

Chaque agent est lancé dans un répertoire workspace isolé pour éviter les conflits de fichiers. L'attribution suit ces règles :

### Détection automatique

Lorsque `-w` est omis (ou défini à `.`), le CLI détecte le meilleur workspace ainsi :

1. Scanne les fichiers de configuration monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. Développe les patterns glob (par exemple `apps/*`) en répertoires réels.
3. Note chaque répertoire par rapport aux mots-clés du type d'agent :

| Type d'agent | Mots-clés (par ordre de priorité) |
|:-------------|:----------------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. Une correspondance exacte du nom de répertoire vaut 100, mot-clé contenu vaut 50, chemin contenant vaut 25.
5. Le répertoire au score le plus élevé l'emporte.

### Candidats de repli

Si aucune config monorepo n'existe, le CLI vérifie des chemins codés en dur dans cet ordre :

- **frontend :** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend :** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile :** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

Si rien ne correspond, l'agent s'exécute dans le répertoire courant (`.`).

### Remplacement explicite

Toujours disponible :

```bash
oma agent:spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Règle « contract-first »

Les contrats d'API sont le mécanisme de synchronisation entre agents. La règle contract-first signifie :

1. **Les contrats sont définis avant le début de l'implémentation.** L'étape 3 du workflow `/plan` produit des contrats d'API enregistrés dans `.agents/skills/_shared/core/api-contracts/`.

2. **Chaque agent reçoit ses contrats pertinents comme contexte.** Quand `/orchestrate` lance les agents à l'étape 3, chaque agent reçoit « description de la tâche, contrats d'API, contexte pertinent ».

3. **Les contrats définissent la frontière d'interface.** Un contrat spécifie :
   - Méthode et chemin HTTP
   - Schéma du corps de requête (avec types)
   - Schéma du corps de réponse (avec types)
   - Exigences d'authentification
   - Formats des réponses d'erreur

4. **Les violations de contrat sont détectées pendant la surveillance.** L'étape 5 de `/work` utilise les outils MCP d'analyse de code (`find_symbol`, `search_for_pattern`) pour vérifier l'alignement des contrats d'API entre agents.

5. **La revue QA vérifie le respect des contrats.** La revue d'alignement de l'agent QA (étape 6 d'ultrawork) compare explicitement l'implémentation au plan, y compris les contrats d'API.

**Pourquoi c'est important :** sans contrats, un agent backend peut retourner `{ "user_id": 1 }` tandis que l'agent frontend consomme `{ "userId": 1 }`. La règle contract-first élimine entièrement cette classe de bugs d'intégration.

---

## Portes de merge : 4 conditions

Avant qu'un travail multi-agents ne soit considéré comme terminé, quatre conditions doivent être réunies :

### 1. Le build réussit

Tout le code compile et se construit sans erreur. C'est vérifié par le script de vérification (`verify.sh`), qui exécute les commandes de build appropriées au type d'agent.

### 2. Les tests passent

Tous les tests existants continuent de passer, et les nouveaux tests couvrent la fonctionnalité implémentée. L'agent QA examine la couverture des tests dans le cadre de sa revue de qualité du code.

### 3. Seuls les fichiers planifiés sont modifiés

Les agents ne doivent pas modifier de fichiers en dehors de leur périmètre assigné. L'étape de vérification contrôle que seuls les fichiers liés à la tâche de l'agent ont été modifiés. Cela évite que les agents produisent des effets de bord inattendus dans le code partagé.

### 4. Revue QA validée

Aucun constat CRITICAL ou HIGH ne subsiste à l'issue de la revue de l'agent QA. Les constats MEDIUM et LOW peuvent être documentés pour de futurs sprints, mais les bloquants doivent être résolus.

Dans le workflow ultrawork, ces conditions se traduisent par des **portes de phase** explicites (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE) avec des critères de type checkbox qui doivent tous passer avant de poursuivre.

---

## Exemples de lancement

### Lancement d'un agent unique

```bash
# Lance un agent backend avec Gemini (par défaut)
oma agent:spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Lance un agent frontend avec Claude, workspace explicite
oma agent:spawn frontend "Build user dashboard with React" session-20260324-143000 -m claude -w ./apps/web

# Lance depuis un fichier de prompt
oma agent:spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Exécution parallèle via agent:parallel

À partir d'un fichier de tâches YAML :

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent:parallel tasks.yaml
```

En mode inline :

```bash
oma agent:parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Mode arrière-plan (no wait) :

```bash
oma agent:parallel tasks.yaml --no-wait
# Retourne immédiatement, résultats écrits dans .agents/results/parallel-{timestamp}/
```

Avec remplacement du fournisseur :

```bash
oma agent:parallel tasks.yaml -m claude
```

---

## Anti-patterns à éviter

### 1. Sauter la planification

Lancer `/orchestrate` sans fichier de plan. Le workflow refusera de poursuivre. Exécutez toujours `/plan` d'abord, ou utilisez `/work` qui inclut la planification.

### 2. Workspaces qui se chevauchent

Assigner deux agents au même répertoire workspace. Cela provoque des conflits de fichiers, les modifications d'un agent écrasant celles d'un autre. Utilisez toujours des répertoires workspace séparés.

### 3. Absence de contrats d'API

Lancer les agents backend et frontend sans définir les contrats au préalable. Ils feront des hypothèses incompatibles sur les formats de données, noms de champs et gestion d'erreur.

### 4. Ignorer les constats QA

Traiter la revue QA comme optionnelle. Les constats CRITICAL et HIGH représentent de vrais bugs qui referont surface en production. Le workflow l'impose en bouclant jusqu'à ce qu'il n'y ait plus de bloquant.

### 5. Coordination manuelle des fichiers

Tenter de fusionner manuellement les sorties d'agents au lieu de laisser le pipeline de vérification et QA gérer l'intégration. Le pipeline automatisé attrape des problèmes que la revue manuelle manque.

### 6. Sur-parallélisation

Exécuter les tâches P1 avant la fin des tâches P0. Les niveaux de priorité existent parce que les tâches P1 dépendent souvent des sorties P0. Les workflows imposent automatiquement l'ordre des niveaux.

### 7. Sauter la vérification

Utiliser directement `agent:spawn` sans exécuter ensuite le script de vérification. L'étape de vérification attrape les échecs de build, les régressions de tests et les violations de périmètre qui se propageraient autrement.

---

## Validation d'intégration inter-domaines

Une fois tous les agents leurs tâches individuelles terminées, l'intégration inter-domaines doit être validée :

1. **Alignement des contrats d'API** — les outils MCP (`find_symbol`, `search_for_pattern`) vérifient que les implémentations backend correspondent aux contrats consommés par le frontend et le mobile.

2. **Cohérence des types** — les types TypeScript, dataclasses Python ou modèles Dart partagés entre domaines doivent utiliser des noms de champs et des types cohérents.

3. **Flux d'authentification** — si le backend implémente l'authentification JWT, le frontend doit transmettre correctement les jetons dans les en-têtes et l'app mobile doit les stocker et les rafraîchir de façon appropriée.

4. **Gestion des erreurs** — tous les consommateurs d'une API doivent gérer les réponses d'erreur documentées. Si le backend retourne `{ "error": "unauthorized", "code": 401 }`, tous les clients doivent gérer ce format.

5. **Alignement du schéma de base de données** — si l'agent base de données crée des migrations, les modèles ORM du backend doivent correspondre exactement au schéma.

La revue d'alignement de l'agent QA (étape 6 d'ultrawork, étape 6 de work) effectue cette validation inter-domaines de façon systématique.

---

## Quand c'est terminé

Un projet multi-agents est complet lorsque :

- Tous les agents de tous les niveaux de priorité ont terminé avec succès.
- Les scripts de vérification passent pour chaque agent (code de sortie 0).
- La revue QA ne rapporte aucun constat CRITICAL ni HIGH.
- L'alignement des contrats d'API inter-domaines est confirmé.
- Le build réussit et tous les tests passent.
- Le rapport final est écrit en mémoire et présenté à l'utilisateur.
- L'utilisateur donne son approbation finale (dans `/work` et au SHIP_GATE d'ultrawork).
