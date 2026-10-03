---
title: "Guide : projets multi-agents"
sidebar_label: Projets multi-agents
description: Guide complet pour coordonner plusieurs agents de domaine frontend, backend, base de données, mobile et QA, de la planification à la fusion.
---

# Guide : projets multi-agents

## Quand utiliser la coordination multi-agents

Votre fonctionnalité couvre plusieurs domaines : API backend + interface frontend + schéma de base de données + client mobile + revue QA. Un seul agent ne peut pas gérer tout le périmètre, et vous devez faire progresser les domaines en parallèle sans qu'ils se marchent sur les fichiers.

La coordination multi-agents est le bon choix lorsque :

- la tâche implique au moins 2 domaines (frontend, backend, mobile, db, QA, debug, pm) ;
- des contrats d'API relient les domaines (par exemple, un endpoint REST consommé à la fois par le web et le mobile) ;
- vous voulez réduire le temps d'exécution réel grâce au parallélisme ;
- vous avez besoin d'une revue QA après l'implémentation sur tous les domaines.

Si votre tâche reste entièrement dans un seul domaine, utilisez directement l'agent correspondant.

---

## La séquence complète : de /plan à /review

Le workflow multi-agents recommandé suit un pipeline strict en quatre étapes.

### Étape 1 : /plan pour les exigences et la décomposition des tâches

Le workflow `/plan` s'exécute en ligne (sans lancer de sous-agent) et produit un plan structuré.

```
/plan
```

Ce qui se passe :

1. **Recueillir les exigences :** l'agent PM interroge sur les utilisateurs cibles, les fonctionnalités principales, les contraintes et les cibles de déploiement.
2. **Analyser la faisabilité technique :** utilise le fournisseur d'intelligence du code configuré pour analyser le dépôt existant à la recherche de code réutilisable et de motifs d'architecture. La recherche native est réservée aux chemins situés hors du projet ou aux chemins ignorés.
3. **Définir les contrats d'API :** conçoit les contrats d'endpoint (méthode, chemin, schémas de requête/réponse, authentification et réponses d'erreur), puis les enregistre dans `.agents/results/api-contracts/` (artefacts d'exécution), en promouvant les spécifications durables vers `docs/plans/contracts/` lorsqu'elles sont validées.
4. **Décomposer les tâches :** découpe le projet en tâches actionnables, chacune avec un agent assigné, un titre, des critères d'acceptation, une priorité (P0-P3) et des dépendances.
5. **Revoir le plan avec l'utilisateur :** présente le plan complet pour confirmation. Le workflow ne continue pas sans l'approbation explicite de l'utilisateur.
6. **Enregistrer le plan :** écrit le plan approuvé dans `.agents/results/plan-{sessionId}.json` et enregistre un résumé en mémoire.

La sortie `.agents/results/plan-{sessionId}.json` sert d'entrée à `/work` et `/orchestrate`.

### Étape 2 : /work ou /orchestrate pour l'exécution

Deux voies d'exécution sont possibles :

| Aspect | /work | /orchestrate |
|:-------|:-----------|:-----------|
| **Interaction** | Interactive (l'utilisateur confirme à chaque étape) | Automatisée (s'exécute jusqu'à la fin) |
| **Planification PM** | Intégrée (l'étape 2 exécute l'agent PM) | Charge un plan lorsqu'il existe ; en crée un en ligne lorsqu'il n'existe pas |
| **Point de contrôle utilisateur** | Après la revue du plan (étape 3) | Le plan créé en ligne passe tout de même sa porte de revue avant la répartition |
| **Mode persistant** | Oui (ne peut pas être interrompu avant la fin) | Oui (ne peut pas être interrompu avant la fin) |
| **Idéal pour** | Première utilisation, projets complexes nécessitant une supervision | Exécutions répétées, tâches bien définies |

#### /work : pipeline multi-agents interactif

```
/work
```

1. Analyse la demande de l'utilisateur et identifie les domaines impliqués.
2. Exécute l'agent PM pour décomposer les tâches (crée plan-\{sessionId\}.json).
3. Présente le plan pour confirmation de l'utilisateur. **Le workflow bloque jusqu'à confirmation.**
4. Lance les agents par niveau de priorité (P0 d'abord, puis P1, etc.) ; chaque tâche de même priorité s'exécute en parallèle.
5. Surveille la progression des agents via les fichiers mémoire.
6. Exécute la revue de l'agent QA sur tous les livrables (OWASP Top 10, performances, accessibilité et qualité du code).
7. Si la QA trouve des problèmes CRITICAL ou HIGH, relance l'agent responsable avec les constats. Répète jusqu'à 2 fois par problème. Si le même problème persiste, active la **boucle d'exploration** : génère 2 ou 3 approches alternatives, lance le même type d'agent avec des prompts d'hypothèses différents dans des workspaces séparés, la QA évalue chaque résultat et le meilleur est adopté.

#### /orchestrate : exécution parallèle automatisée

```
/orchestrate
```

1. Charge `.agents/results/plan-{sessionId}.json`, en créant un plan en ligne via `/plan` lorsqu'aucun plan utilisable n'existe.
2. Initialise une session avec un identifiant au format `session-YYYYMMDD-HHMMSS`.
3. Crée `orchestrator-session.md` et `task-board.md` dans le répertoire mémoire.
4. Lance les agents par niveau de priorité ; chacun reçoit la description de la tâche, les contrats d'API et le contexte.
5. Surveille la progression en interrogeant les fichiers `progress-{agent}.md`.
6. Vérifie chaque agent terminé via `verify.sh`. PASS (code de sortie 0) accepte le résultat ; FAIL (code de sortie 1) relance avec le contexte de l'erreur (2 tentatives maximum) ; un échec persistant déclenche la boucle d'exploration.
7. Collecte tous les fichiers `result-{agent}.md` et compile un rapport final.

### Étape 3 : agent spawn pour la gestion d'agents au niveau CLI

La commande `agent spawn` est le mécanisme bas niveau appelé en interne par les workflows. Vous pouvez aussi l'utiliser directement :

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Tous les flags :**

| Flag | Description |
|:-----|:-----------|
| `--vendor <vendor>` | Surcharge du fournisseur CLI (antigravity/claude/codex/cursor/opencode/qwen/grok/pi). Remplace la résolution du modèle pour ce lancement. |
| `-w, --workspace <path>` | Répertoire de travail de l'agent. Détecté automatiquement depuis la configuration monorepo s'il est omis. |
| `--task-id <id>` | Lie le lancement à une tâche du plan de session ; la valeur par défaut est l'ID de l'agent. |
| `--isolation worktree` | Crée un worktree Git pour le lancement ; par défaut, aucune isolation supplémentaire. |
| `--read-only` | Limite l'enfant aux outils d'inspection et désactive les flags d'approbation automatique. |

**Ordre de résolution du fournisseur** (la première correspondance l'emporte) :

1. le flag `--vendor` de la ligne de commande ;
2. la surcharge `agents:` dans `oma-config.yaml` pour cet agent ;
3. les valeurs par défaut de l'agent dans le `model_preset` actif.

Consultez [les modèles par agent](./per-agent-models.md) pour les détails de configuration.

**L'auto-détection du workspace** vérifie les configurations monorepo dans cet ordre : pnpm-workspace.yaml, package.json avec workspaces, lerna.json, nx.json, turbo.json et mise.toml. Chaque répertoire de workspace est évalué selon les mots-clés du type d'agent (par exemple « web », « frontend » et « client » pour l'agent frontend). Si aucune configuration monorepo n'est trouvée, le CLI utilise des candidats comme `apps/web`, `apps/frontend` et `frontend/`.

**Résolution du prompt :** l'argument `<prompt>` peut contenir du texte inline ou un chemin de fichier. Si le chemin correspond à un fichier existant, son contenu est lu et utilisé comme prompt. Le CLI injecte également les protocoles d'exécution propres au fournisseur depuis `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Étape 4 : /review pour la vérification QA

```
/review
```

Le workflow de revue exécute un pipeline QA complet :

1. **Définir le périmètre :** demande ce qu'il faut examiner (fichiers précis, branche de fonctionnalité ou projet entier).
2. **Vérifications de sécurité automatisées :** exécute `npm audit`, `bandit` ou l'équivalent.
3. **Revue manuelle OWASP Top 10 :** injection, authentification défaillante, données sensibles, contrôle d'accès, mauvaise configuration, désérialisation non sécurisée, composants vulnérables et journalisation insuffisante.
4. **Analyse des performances :** requêtes N+1, index manquants, pagination sans limite, fuites mémoire, re-rendus inutiles et tailles de bundle.
5. **Accessibilité :** WCAG 2.1 AA, avec HTML sémantique, ARIA, navigation au clavier, contraste des couleurs et gestion du focus.
6. **Qualité du code :** nommage, gestion des erreurs, couverture des tests, mode strict TypeScript, imports inutilisés et motifs async/await.
7. **Rapport :** constats classés CRITICAL / HIGH / MEDIUM / LOW avec `file:line`, description et code de remédiation.

Pour les périmètres importants, le workflow délègue au sous-agent QA. Avec l'option `--fix`, il entre dans une boucle Fix-Verify : lance des agents de domaine pour corriger les problèmes CRITICAL/HIGH, réexamine le résultat et répète jusqu'à 3 fois.

---

## Stratégie d'identifiants de session

Chaque session d'orchestration reçoit un identifiant unique au format :

```
session-YYYYMMDD-HHMMSS
```

Exemple : `session-20260324-143052`

L'identifiant de session sert à :

- nommer les fichiers mémoire (`orchestrator-session.md`, `task-board.md`) ;
- suivre les processus d'agents via les fichiers PID dans le répertoire temporaire système (`/tmp/subagent-{session-id}-{agent-id}.pid`) ;
- corréler les fichiers de logs (`/tmp/subagent-{session-id}-{agent-id}.log`) ;
- regrouper les résultats dans `.agents/results/parallel-{timestamp}/`.

L'identifiant de session est généré à l'étape 2 de `/orchestrate` et transmis à tous les agents lancés. Ainsi, tous les agents, logs et fichiers PID d'une exécution peuvent être reliés à une même session.

---

## Attribution du workspace par domaine

Chaque agent est lancé dans un répertoire de workspace isolé pour éviter les conflits de fichiers. L'attribution suit les règles suivantes :

### Détection automatique

Lorsque `-w` est omis (ou vaut `.`), le CLI détecte le meilleur workspace ainsi :

1. analyse les fichiers de configuration monorepo (pnpm-workspace.yaml, workspaces de package.json, lerna.json, nx.json, turbo.json et mise.toml) ;
2. développe les motifs glob, comme `apps/*`, en répertoires réels ;
3. attribue un score à chaque répertoire selon les mots-clés du type d'agent :

| Type d'agent | Mots-clés (par ordre de priorité) |
|:-----------|:-----------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. une correspondance exacte du nom du répertoire vaut 100, un mot-clé contenu vaut 50 et un mot-clé dans le chemin vaut 25 ;
5. le répertoire au score le plus élevé est choisi.

### Candidats de repli

Si aucune configuration monorepo n'existe, le CLI vérifie ces chemins codés en dur dans cet ordre :

- **frontend :** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client` ;
- **backend :** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server` ;
- **mobile :** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`.

Si aucun chemin ne correspond, l'agent s'exécute dans le répertoire courant (`.`).

### Remplacement explicite

Toujours disponible :

```bash
oma agent spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Règle contract-first

Les contrats d'API sont le mécanisme de synchronisation entre les agents. La règle contract-first signifie :

1. **Les contrats sont définis avant le début de l'implémentation.** L'étape 3 du workflow `/plan` produit des contrats d'API enregistrés dans `.agents/results/api-contracts/` (ou dans `docs/plans/contracts/` pour les spécifications durables).

2. **Chaque agent reçoit ses contrats pertinents comme contexte.** Quand `/orchestrate` lance les agents à l'étape 3, chacun reçoit « description de la tâche, contrats d'API, contexte pertinent ».

3. **Les contrats définissent la frontière d'interface.** Un contrat précise :
   - la méthode HTTP et le chemin ;
   - le schéma du corps de requête (avec les types) ;
   - le schéma du corps de réponse (avec les types) ;
   - les exigences d'authentification ;
   - les formats des réponses d'erreur.

4. **Les violations de contrat sont détectées pendant la surveillance.** L'étape 5 de `/work` utilise le fournisseur d'intelligence du code configuré pour vérifier l'alignement des contrats d'API entre agents. La recherche native est réservée aux chemins situés hors du projet ou aux chemins ignorés.

5. **La revue QA vérifie le respect des contrats.** La revue d'alignement de l'agent QA (étape 6 d'ultrawork) compare explicitement l'implémentation au plan, y compris les contrats d'API.

Sans contrats, un agent backend peut renvoyer `{ "user_id": 1 }` alors que l'agent frontend consomme `{ "userId": 1 }`. La règle contract-first évite cette classe de bug d'intégration.

---

## Portes de merge : 4 conditions

Avant de considérer un travail multi-agents comme terminé, quatre conditions doivent être réunies :

### 1. Les vérifications déclarées réussissent

Chaque critère d'acceptation possède une vérification pertinente, et les vérifications déclarées par le plan passent. Un build n'est inclus que lorsque la porte de la tâche l'exige ; le contrat de résultat enregistre alors les arguments et le code de sortie réellement utilisés.

### 2. Les tests passent

Tous les tests existants continuent de passer et les nouveaux tests couvrent la fonctionnalité implémentée. L'agent QA examine la couverture des tests dans sa revue de qualité du code.

### 3. Seuls les fichiers planifiés sont modifiés

Les agents ne doivent pas modifier de fichiers en dehors de leur périmètre assigné. La vérification s'assure que seuls les fichiers liés à la tâche ont changé. Cela évite les effets de bord involontaires dans le code partagé.

### 4. La revue QA est validée

Aucun constat CRITICAL ou HIGH ne subsiste dans la revue de l'agent QA. Les constats MEDIUM et LOW peuvent être documentés pour un sprint ultérieur, mais les blocages doivent être résolus.

Dans le workflow ultrawork, ces conditions deviennent des **portes de phase** explicites (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE), avec des critères à cocher qui doivent tous passer avant de continuer.

---

## Exemples de lancement

### Lancement d'un agent unique

```bash
# Spawn backend agent with Gemini (default)
oma agent spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent spawn frontend "Build user dashboard with React" session-20260324-143000 --vendor claude -w ./apps/web

# Spawn from a prompt file
oma agent spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Exécution parallèle via agent parallel

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
oma agent parallel tasks.yaml
```

En mode inline :

```bash
oma agent parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Mode en arrière-plan (sans attente) :

```bash
oma agent parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```

Avec surcharge du fournisseur :

```bash
oma agent parallel tasks.yaml --vendor claude
```

---

## Anti-patterns à éviter

### 1. Approuver machinalement le plan

`/orchestrate` peut créer un plan via `/plan` en ligne lorsqu'aucun fichier de plan utilisable n'existe. Ce plan en ligne passe tout de même par la porte de revue de `/plan`, puis la répartition de l'étape suivante suit cette décomposition approuvée. Pour un travail multi-domaines important, lancez `/plan` en amont afin de disposer d'un suivi durable dans `docs/plans/work/` et de pouvoir affiner la décomposition avant tout lancement d'agent.

### 2. Workspaces qui se chevauchent

Attribuer le même répertoire de workspace à deux agents. Cela provoque des conflits où les modifications d'un agent écrasent celles d'un autre. Utilisez toujours des répertoires de workspace distincts.

### 3. Oublier les contrats d'API

Lancer les agents backend et frontend sans définir d'abord les contrats. Ils feront des hypothèses incompatibles sur les formats de données, les noms de champs et la gestion des erreurs.

### 4. Ignorer les constats QA

Traiter la revue QA comme facultative. Les constats CRITICAL et HIGH représentent de vrais bugs qui apparaîtront en production. Le workflow impose cette revue en bouclant jusqu'à la disparition des blocages.

### 5. Coordonner les fichiers à la main

Essayer de fusionner manuellement les sorties des agents au lieu de laisser les pipelines de vérification et de QA gérer l'intégration. Le pipeline automatisé détecte des problèmes qu'une revue manuelle peut manquer.

### 6. Sur-paralléliser

Lancer les tâches P1 avant la fin des tâches P0. Les niveaux de priorité existent parce que les tâches P1 dépendent souvent des sorties P0. Les workflows imposent automatiquement l'ordre des niveaux.

### 7. Lancer sans vérification

Utiliser directement `agent spawn` sans enregistrer ensuite le contrat de résultat. Exécutez les vérifications épinglées de la tâche et terminez par une déclaration structurée ; consultez [les résultats et la reprise d'un agent](/docs/guide/agent-results-and-resume). L'étape de vérification détecte ensuite les échecs et les dérives de périmètre avant la réutilisation des résultats.

---

## Validation d'intégration inter-domaines

Une fois que tous les agents ont terminé leurs tâches individuelles, l'intégration inter-domaines doit être validée :

1. **Alignement des contrats d'API :** le fournisseur d'intelligence du code configuré vérifie que les implémentations backend correspondent aux contrats consommés par le frontend et le mobile. La recherche native est réservée aux chemins situés hors du projet ou aux chemins ignorés.

2. **Cohérence des types :** les types TypeScript, dataclasses Python ou modèles Dart partagés entre les domaines doivent utiliser des noms de champs et des types cohérents.

3. **Flux d'authentification :** si le backend implémente l'authentification JWT, le frontend doit envoyer correctement les jetons dans les en-têtes et le mobile doit les stocker et les actualiser correctement.

4. **Gestion des erreurs :** tous les consommateurs d'une API doivent gérer les réponses d'erreur documentées. Si le backend renvoie `{ "error": "unauthorized", "code": 401 }`, tous les clients doivent gérer ce format.

5. **Alignement du schéma de base de données :** si l'agent de base de données crée des migrations, les modèles ORM du backend doivent correspondre exactement au schéma.

La revue d'alignement de l'agent QA (étape 6 d'ultrawork, étape 6 de work) effectue cette validation inter-domaines de façon systématique.

---

## Quand c'est terminé

Un projet multi-agents est terminé lorsque :

- tous les agents de tous les niveaux de priorité ont terminé avec succès ;
- les scripts de vérification passent pour chaque agent (code de sortie 0) ;
- la revue QA signale zéro constat CRITICAL et zéro constat HIGH ;
- l'alignement des contrats d'API inter-domaines est confirmé ;
- le build réussit et tous les tests passent ;
- le rapport final est écrit en mémoire et présenté à l'utilisateur ;
- l'utilisateur donne son approbation finale (dans `/work` et à la porte SHIP_GATE d'ultrawork).
