---
title: Guide d’utilisation
sidebar_label: Utiliser OMA
description: "Guide d’utilisation d’OMA : choisir une tâche en fonction du lecteur, exemples single-skill et multi-domaines, workflows, détection automatique, 33 compétences, exécution CLI parallèle, tableaux de bord, valeurs par défaut et récupération."
---

# Utiliser oh-my-agent

## Démarrage rapide

1. Ouvrez votre projet dans un IDE ou CLI doté d’une IA (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen ou tout autre hôte pris en charge).
2. L’hôte sélectionné peut charger les [compétences](../getting-started/glossary.md#skill) depuis `.agents/skills/` ; les hooks activés ajoutent des indices de compétences à partir de mots-clés en langage naturel et ne démarrent un [workflow](../getting-started/glossary.md#workflow) qu’à partir de sa commande slash ou, pour les quatre modes persistants, de son nom.
3. Décrivez ce que vous voulez en langage naturel. L’hôte ou le workflow sélectionné route la tâche vers la compétence pertinente.
4. Pour un travail multi-agents, utilisez `/work` ou `/orchestrate`.

Les tâches dans un seul domaine ne nécessitent aucune syntaxe spéciale. Utilisez le [guide de sélection des compétences et workflows](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) pour choisir entre une compétence unique, `/work`, `/orchestrate`, `/ultrawork` et `/ralph`. Consultez le [Démarrage rapide](../getting-started/quick-start.md) pour la configuration et les [Valeurs par défaut importantes](../getting-started/important-defaults.md) avant de changer de fournisseur.

## Choisir un guide

| Votre tâche | Point de départ | Guide |
|-------------|-----------------|-------|
| Un changement dans un seul domaine | Un prompt simple (routage de compétence) | [Compétence unique](./single-skill.md) |
| Une fonctionnalité couvrant API, UI, mobile ou base de données | `/work` (étape par étape) ou `/orchestrate` (automatisé) | [Projets multi-agents](./multi-agent-project.md) |
| Un bug avec un message d’erreur | `/debug` avec l’erreur et les étapes de reproduction | [Correction de bugs](./bug-fixing.md) |
| Suivre les agents pendant leur exécution | `oma dashboard terminal` | [Surveillance du dashboard](./dashboard-monitoring.md) |
| Auditer ou reprendre les résultats d’agents | `oma agent resume SESSION_ID --dry-run` | [Résultats et reprise](./agent-results-and-resume.md) |
| Trouver ou migrer des documents OMA | `oma docs migrate --dry-run` | [Disposition des artefacts](./artifact-layout.md) |
| Quelque chose a échoué | `oma doctor --json` | [Dépannage](./troubleshooting.md) |

---

## Exemple 1 : tâche simple dans un seul domaine

**Vous saisissez :**
```text
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Ce qui se passe :**

1. L’hôte route la demande vers `oma-frontend` (les mots-clés « form », « component » et « Tailwind CSS » servent de signaux de routage).
2. La couche 1 (`SKILL.md`) est déjà chargée avec l’identité de l’agent, ses règles fondamentales et sa liste de bibliothèques.
3. Les ressources de la couche 2 sont chargées à la demande :
   - `execution-protocol.md` : workflow en 4 étapes (Analyze, Plan, Implement, Verify) ;
   - `snippets.md` : motifs de formulaire et de validation Zod, ainsi que les motifs de composants existants lorsque la compétence les fournit.
<!-- oma-docs:ignore-start -->
4. L’agent implémente :
   - le composant React TypeScript dans `src/features/auth/components/login-form.tsx` ;
   - le schéma de validation Zod dans `src/features/auth/utils/login-validation.ts` ;
   - les tests Vitest dans `src/features/auth/utils/__tests__/login-validation.test.ts` ;
   - le loading skeleton dans `src/features/auth/components/skeleton/login-form-skeleton.tsx`.
<!-- oma-docs:ignore-end -->
5. L’agent exécute la checklist : accessibilité (labels ARIA, HTML sémantique, navigation clavier), viewport mobile, performance (pas de CLS), Error Boundaries.

**Résultat attendu :** un composant React TypeScript au périmètre défini, avec validation, tests et preuves d’accessibilité lorsque le projet prend ces contrôles en charge. Le prompt et le workflow sélectionné déterminent les fichiers et contrôles réellement exécutés.

---

## Exemple 2 : projet multi-domaines

**Vous saisissez :**
```text
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Ce qui se passe :**

1. La demande couvre frontend, backend et mobile. L’agent hôte peut s’appuyer sur ce périmètre pour recommander une approche de coordination.
2. Le hook de détection de mots-clés ne démarre pas de workflow à partir de cette phrase : il n’active que `orchestrate`, `ultrawork`, `work` ou `ralph`, et uniquement lorsque le prompt nomme le mode. Il ne classe pas la demande comme multi-domaines. Utilisez une commande explicite pour sélectionner le workflow souhaité.

**Avec `/work` (étape par étape, sous contrôle utilisateur) :**

```text
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1, le PM planifie :**
   - identifie les domaines : backend (API d’auth, CRUD des tâches), frontend (connexion, interface de liste), mobile (application Flutter) ;
   - définit les contrats API : `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id` ;
   - crée un découpage des tâches par niveau de priorité (les niveaux inférieurs s’exécutent en premier) :
     - Tier 1 : API d’auth backend, API CRUD des tâches backend ;
     - Tier 2 : connexion/inscription frontend, liste frontend, écrans d’auth mobile, liste mobile ;
     - Tier 3 : revue QA ;
   - enregistre le plan dans `.agents/results/plan-{sessionId}.json`.

4. **Step 2, revue du plan :** l’agent présente le plan et continue dans l’autorisation existante, en demandant uniquement une décision importante manquante ou une nouvelle autorisation.

5. **Step 3, lancement par niveau de priorité :**
   ```bash
   # Tier 1 (parallel). Task IDs come from .agents/results/plan-session-todo-01.json
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 --task-id api-auth -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 --task-id db-schema &
   wait

   # Tier 2 (parallel, after tier 1 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 --task-id web-ui -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 --task-id mobile-ui -w ./apps/mobile &
   wait
   ```

   `--task-id` doit correspondre à un `id` de tâche du plan de session ; sans lui, l’identifiant de tâche prend par défaut l’identifiant de l’agent, et une session planifiée rejette un identifiant qu’elle ne contient pas (`Unknown plan task`). Les sessions ad hoc sans plan peuvent l’omettre.

6. **Step 4, revue par l’agent QA :**
   - sécurité : conformité OWASP Top 10 (validation JWT, CSRF, injection SQL) ;
   - performance : recherche de N+1, vérification de la pagination ;
   - accessibilité : WCAG 2.2 AA sur tous les composants frontend ;
   - transversal : alignement du contrat API entre frontend, mobile et backend.

7. **Step 5, itération :** si la QA détecte des problèmes CRITICAL, relancer l’agent responsable avec le rapport QA.

---

## Exemple 3 : correction d’un bug

**Vous saisissez :**
```text
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Ce qui se passe :**

1. `oma-debug` s’active automatiquement (mots-clés : « bug », « error », « Cannot read property »).
2. **Step 1, collecter :** le message d’erreur et le contexte sont capturés.
<!-- oma-docs:ignore-start -->
3. **Step 2, reproduire :** MCP `search_for_pattern` trouve l’appel `.map()` dans `src/features/tasks/components/task-list.tsx`.
<!-- oma-docs:ignore-end -->
4. **Step 3, diagnostiquer :** MCP `find_referencing_symbols` retrace le flux de données :
   - le hook `useQuery` récupère les tâches depuis l’API ;
   - le composant se rend avant l’arrivée des données ;
   - `tasks` vaut `undefined` pendant le chargement ;
   - cause profonde : absence de contrôle de chargement avant `.map()`.
5. **Step 4, proposer la correction :** présenter une modification minimale avec contrôle de chargement et garde-fou null.
6. **Step 5, implémenter :**
   - ajouter un loading skeleton pendant la récupération ;
   - ajouter le contrôle null : `tasks?.map()` ou un retour anticipé pendant le chargement ;
   - écrire un test de régression qui vérifie le rendu lorsque `tasks` vaut `undefined`.
7. **Step 6, rechercher les motifs similaires :** MCP `search_for_pattern` cherche d’autres appels `.map()` sur des tableaux potentiellement indéfinis :
   - trouve 3 motifs similaires dans `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx` ;
   - applique le même motif de correction de manière préventive.
8. **Step 7, documenter :** le rapport de bug est écrit en mémoire avec la cause profonde, la correction et la prévention.

---

## Exemple 4 : système de design

**Vous saisissez :**
```text
/design Define a dark, premium visual system for my B2B SaaS analytics product. English and Korean, WCAG AA.
```

**Ce qui se passe :**

1. **Charger la compétence :** le workflow lit la compétence `oma-design` et son protocole d’exécution. La compétence détient le choix du fournisseur et le contrat de design du projet.
2. **Établir le périmètre et le contexte :** la demande est classée comme un document de système de design. Le workflow lit l’éventuel `DESIGN.md`, `.design-context.md` lorsqu’il est présent, les éléments de marque, les langues prises en charge et l’interface concernée, puis recherche les bibliothèques UI, fichiers de thème et tokens existants. Pour un produit existant, il établit d’abord s’il faut préserver ou refondre (*Preserve* ou *Overhaul*). Il ne pose de questions que sur un choix qui change sensiblement le résultat et auquel ni la demande ni la base de code ne répondent ; ce prompt indique déjà les langues, le public et la cible d’accessibilité, donc aucun questionnaire ne suit.
3. **Sélectionner les recommandations et rassembler les références :** une compétence de design externe est sélectionnée pour l’opération : Interface Design pour un tableau de bord ou une UI de produit SaaS, Taste pour toute autre nouvelle direction artistique web, Impeccable pour la critique ou le polissage d’une UI existante. Un seed de fournisseur demandé, une opération Stitch, des recommandations sur les assets ou des règles de grille de données ne se chargent que lorsque la tâche l’exige.
4. **Décider de la direction :** la recommandation sélectionnée est appliquée aux éléments probants du projet. Des directions alternatives ne sont présentées que lorsqu’un choix non résolu influe sensiblement sur le résultat ; une direction que vous avez déjà choisie est réutilisée. Chaque direction respecte la marque, la couverture des polices CJK pour le coréen, la stack d’implémentation existante, le comportement responsive dès la plus petite fenêtre prise en charge et WCAG AA.
5. **Produire l’artefact :** `DESIGN.md` est créé ou mis à jour avec ses neuf sections, y compris la section 9 (Agent Prompt Guide). Les tokens associent les rôles sémantiques au système de tokens et au format de thème existants du projet ; aucune configuration parallèle n’est introduite. Aucun code d’implémentation n’est écrit.
6. **Vérifier et transmettre :** les points applicables de la checklist sont vérifiés et ce qui a été inspecté est nommé. Les contrôles qui nécessitent une implémentation rendue sont précisés mais restent non exécutés. Le rapport liste les artefacts livrés, la route sélectionnée, les résultats de vérification et les limites restantes, puis transmet l’implémentation à `oma-frontend` (web) ou `oma-mobile` (natif).

---

## Exemple 5 : exécution CLI parallèle

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web             # Web UI; prints http://127.0.0.1:9847/

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

Si le runtime courant correspond au fournisseur cible dans `.agents/oma-config.yaml`, les workflows doivent privilégier les sous-agents natifs :

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`, sélectionné via le `subagent_type` de l’outil Agent
- Antigravity CLI/IDE -> `oma agent spawn` via `agy`

Les tâches inter-fournisseurs et `model_preset: free` utilisent `oma agent spawn`. Le dispatch natif exige toujours que le [cycle de vie des résultats](./agent-results-and-resume.md) enregistre les preuves de vérification.

---

## Exemple 6 : ultrawork pour une qualité maximale

**Vous saisissez :**
```text
/ultrawork Build a payment processing module with Stripe integration
```

**Ce qui se passe (5 phases, 17 étapes, 12 étapes de revue isolées) :**

**Phase 1, PLAN (étapes 1–4, agent PM inline) :**
- Step 1 : créer le plan avec découpage des tâches, contrats d’API et dépendances ;
- Step 2 : revue du plan (exhaustivité : toutes les exigences sont-elles couvertes ?) ;
- Step 3 : méta-revue (vérifier que la revue était suffisante) ;
- Step 4 : revue de sur-ingénierie (MVP, sans complexité inutile) ;
- PLAN_GATE : plan documenté, hypothèses listées, périmètre autorisé.

**Phase 2, IMPL (étape 5, agents de développement lancés) :**
- l’agent backend implémente l’intégration Stripe (webhooks, idempotence, gestion des erreurs) ;
- l’agent frontend construit le parcours de paiement et l’interface de statut ;
- Step 5.2 : enregistrer un baseline uniquement lorsqu’une comparaison de mesure définie est nécessaire ;
- IMPL_GATE : contrôles et tests applicables qui n’émettent pas d’artefact passent, seuls les fichiers planifiés sont modifiés ; les contrôles de build ne sont lancés que sur demande explicite.

**Phase 3, VERIFY (étapes 6–8, agent QA lancé) :**
- Step 6 : revue d’alignement (l’implémentation correspond-elle au plan ?) ;
- Step 7 : revue sécurité/bugs (OWASP, npm audit, bonnes pratiques Stripe) ;
- Step 8 : revue amélioration/régression (aucune régression introduite) ;
- VERIFY_GATE : zéro CRITICAL, zéro HIGH, objectifs de mesure du projet applicables atteints.

**Phase 4, REFINE (étapes 9–13, agent de refactoring lancé) :**
- Step 9 : découper les fichiers (> 500 lignes) et fonctions (> 50 lignes) volumineux ;
- Step 10 : revue intégration/réutilisation (éliminer la logique dupliquée) ;
- Step 11 : revue des effets de bord (tracer l’impact en cascade avec `find_referencing_symbols`) ;
- Step 12 : revue complète du changement (cohérence des noms et du style) ;
- Step 13 : supprimer le code mort ;
- REFINE_GATE : aucune régression mesurée non résolue, code propre.

**Phase 5, SHIP (étapes 14–17, agent QA lancé) :**
- Step 14 : revue qualité du code (lint, types, coverage) ;
- Step 15 : vérification du parcours UX (parcours utilisateur de paiement de bout en bout) ;
- Step 16 : revue des problèmes liés (dernier contrôle d’impact en cascade) ;
- Step 17 : préparation au déploiement (gestion des secrets, scripts de migration, plan de rollback) ;
- SHIP_GATE : tous les contrôles passent ; réutiliser l’autorisation existante. Publication ou déploiement exigent une autorisation pour cette action.

---

## Toutes les commandes de workflow

| Commande | Type | Fonction | Quand l’utiliser |
|----------|------|----------|------------------|
| `/orchestrate` | Persistant | Charge ou crée un plan, puis délègue l’exécution parallèle avec surveillance et vérification | Tâches indépendantes adaptées à une coordination parallèle automatisée |
| `/work` | Persistant | Planification, implémentation et QA multi-domaines étape par étape dans le périmètre autorisé | Fonctionnalités couvrant plusieurs domaines qui nécessitent une livraison coordonnée |
| `/ultrawork` | Persistant | Workflow qualité en 5 phases et 17 étapes avec 12 points de contrôle isolés | Livraison de qualité maximale, code critique pour la production |
| `/plan` | Non persistant | Découpage PM, contrats API et artefacts suivis dans `docs/plans/work/` (`NNN-name.md` séquentiels, champ Status) | Avant tout travail multi-agents complexe ; fonctionnalités complexes avec suivi et journal de décisions |
| `/brainstorm` | Non persistant | Idéation centrée sur le design avec 2 ou 3 propositions | Avant de choisir une approche d’implémentation |
| `/deepinit` | Non persistant | Initialisation complète du projet (AGENTS.md, ARCHITECTURE.md, docs/) | Installer oh-my-agent dans un code existant |
| `/review` | Non persistant | Pipeline QA : sécurité OWASP, performance, accessibilité et qualité du code. Le périmètre provient de la demande et s’applique par défaut aux changements courants | Avant la fusion ou le déploiement |
| `/security` | Non persistant | Scanner le code source applicatif, les compétences d’agents ou les composants MCP, valider les constats et configurer les gates de sécurité via `oma-security`. Les tests d’intrusion d’un déploiement web de test délimité ne s’exécutent que sur une plateforme d’exécution fournie par l’utilisateur et préalablement vérifiée | Avant une release, ou lorsqu’un changement nécessite un scan ou un gate de sécurité |
| `/debug` | Non persistant | Débogage structuré : reproduire, diagnostiquer, corriger, tester, rechercher | Enquêter sur des bugs et erreurs |
| `/design` | Non persistant | Délimite une tâche de design, sélectionne les recommandations de design applicables et livre les constats, `DESIGN.md`, une direction de refonte ou des tokens de design via `oma-design` | Définir ou revoir un système visuel, refontes UI, audits de design |
| `/scm` | Non persistant | Workflow SCM Git (branche/fusion/conflit/worktree/baseline) et génération de Conventional Commit avec détection automatique type/scope et découpage | Après des changements de code ou pour les tâches de gestion de configuration du dépôt |
| `/stack-set` | Non persistant | Détecter la stack et générer les références backend, frontend ou mobile (Swift/Kotlin/Flutter/RN) | Configurer les conventions propres au langage |
| `/architecture` | Non persistant | Diagnostiquer, comparer et consigner les décisions d’architecture | Revoir des frontières ou choisir une architecture |
| `/convert` | Non persistant | Router la conversion vers la compétence appropriée | Convertir des fichiers HWP/HWPX ou PDF |
| `/docs` | Non persistant | Vérifier la documentation et proposer des synchronisations ciblées par diff | Comparer les docs au code actuel |
| `/explain` | Non persistant | Générer une explication HTML hors ligne d’un changement de code ou d’un sujet, la valider avec `oma explain validate` et l’ouvrir avec `oma explain render --open` | Enseigner un diff, une PR, une branche ou une plage de commits, ou expliquer un sujet |
| `/recap` | Non persistant | Résumer le travail dans les historiques des outils IA pris en charge | Récapitulatif quotidien ou périodique |
| `/schedule` | Non persistant | Enregistrer des jobs récurrents d’agents | Récaps, scans ou maintenance nocturnes |
| `/video` | Non persistant | Composer des vidéos reproductibles à partir de scripts, narration et visuels | Shorts, explications et démonstrations |
| `/ralph` | Persistant | Exécution ultrawork répétée avec un juge lancé par prompt et des garde-fous de boucle | Demande explicite de répéter jusqu’à des critères mécaniques de fin |

---

## Exemples de détection automatique

Le hook de mots-clés ne démarre que quatre modes persistants, et uniquement lorsque le prompt nomme le mode. Les autres workflows démarrent depuis leur commande slash.

| Vous saisissez | Workflow détecté | Langue |
|----------------|------------------|--------|
| "Orchestrate this deployment." | `/orchestrate` | Anglais |
| "orquestar este trabajo" | `/orchestrate` | Espagnol |
| "ultrawork this refactor" | `/ultrawork` | Anglais |
| "ulw로 고쳐줘" | `/ultrawork` | Coréen |
| "Switch to work mode for this refactor." | `/work` | Anglais |
| "work workflow로 진행해줘" | `/work` | Coréen |
| "ralph this task" | `/ralph` | Anglais |
| "랄프로 끝까지 해줘" | `/ralph` | Coréen |

Des phrases telles que « plan the authentication feature », « fix the login bug », « do everything in parallel » et « don't stop until it's done » ne démarrent pas de workflow.

**Les questions informatives sont filtrées :**

| Vous saisissez | Résultat |
|----------------|----------|
| "what is orchestrate?" | Aucun workflow (motif informatif : "what is") |
| "explain how /plan works" | Aucun workflow (motif informatif : "explain") |
| "어떻게 사용해?" | Aucun workflow (motif informatif : "어떻게") |
| "レビューとは何ですか" | Aucun workflow (motif informatif : "とは") |

---

## Les 33 compétences : référence rapide

Le preset `all` de l’installateur suit le registre actif. Cette table regroupe chaque compétence selon son usage principal ; une compétence peut tout de même se coordonner avec une autre à une frontière.

| Compétence | Idéal pour | Sortie principale |
|-------|------------|------------------|
| **oma-academic-writing** | Rédaction académique, révision et revue anti-AI | Prose destinée à la publication et révisions claim/evidence |
| **oma-architecture** | Frontières système, compromis, ADR | Recommandation d’architecture ou décision consignée |
| **oma-backend** | API, auth, logique serveur, migrations | Changements Router/service/repository et vérification |
| **oma-brainstorm** | Idées ambiguës et comparaison d’approches | Document de design dans `docs/plans/designs/` |
| **oma-coordination** | Règles de coordination partagées pour `/work`, `/orchestrate` et `/ultrawork` ; coordination manuelle étape par étape | Recommandations sur la réutilisation du plan, l’alignement des contrats, la responsabilité des workspaces et la transmission QA |
| **oma-db** | Schéma, ERD, réglage de requêtes, capacité | Documentation de schéma, migrations et plan de récupération |
| **oma-debug** | Reproduction et cause profonde d’un bug | Correction minimale, preuve de régression et recherche de motifs |
| **oma-security** | Scan de sécurité du code source, des compétences d’agents et de MCP ; tests d’intrusion uniquement sur une plateforme d’exécution fournie par l’utilisateur et préalablement vérifiée | Constats validés et configuration des gates de scan |
| **oma-design** | Systèmes visuels, `DESIGN.md`, direction de refonte, revue de design UI | Décision ou constats de design, `DESIGN.md` lorsque le système change, et transmission vers l’implémentation |
| **oma-dev-workflow** | CI/CD, monorepos, migrations, automatisation de release | Configuration du workflow et contrôles de release |
| **oma-docs** | Références cassées et dérive documentaire | Rapport de vérification ou candidats sync ciblés par diff |
| **oma-explanation** | Parcours de diff, PR, branche ou commits ; explications de sujets | Explicateur HTML hors ligne (Background, Intuition, Code et Quiz pour un changement) |
| **oma-frontend** | Composants UI, formulaires, pages, styling Angular ou React | Changements frontend et contrôles pertinents |
| **oma-hwp** | Conversion HWP/HWPX/HWPML | Markdown avec titres, tableaux, images et liens |
| **oma-image** | Génération d’images et assets visuels | Run d’image reproductible avec manifeste |
| **oma-market** | Pain points, tendances, concurrents et recherche de découverte | Brief conforme LAW avec frameworks |
| **oma-mobile** | Flutter, React Native, Swift iOS et Kotlin Android | Écrans mobiles, état, intégration plateforme et tests |
| **oma-observability** | Traces, métriques, logs, profils, SLO et investigation d’incidents | Recommandation d’observabilité par couche ou guide d’implémentation |
| **oma-orchestration** | Exécution parallèle automatisée d’agents | Plans coordonnés, mises à jour mémoire et collecte des résultats |
| **oma-pdf** | Conversion PDF et extraction avec OCR | Markdown avec ordre de lecture, tableaux, listes et images |
| **oma-pm** | Exigences, découpage, contrats API | `.agents/results/plan-{sessionId}.json` et task board |
| **oma-qa** | Revue sécurité, performance, accessibilité et qualité | Rapport de constats avec sévérité et preuves de remédiation |
| **oma-recap** | Rétrospectives de travail inter-outils | Récapitulatif quotidien ou périodique dans `.agents/results/recap/` |
| **oma-refactor** | Restructuration préservant le comportement | Changements avec tests de caractérisation et preuves qualité |
| **oma-scholar** | Recherche académique et sidecars d’articles | Opérations `.knows.yaml` validées |
| **oma-scm** | Branches Git, worktrees, baselines et hygiène de commit | Plan SCM ou Conventional Commit |
| **oma-search** | Documentation externe, sources web, code distant et lecture d’URL connues | Sources citées avec route, fournisseur, preuves et limites |
| **oma-skill-creation** | Création et audit de compétences OMA | Fichiers de compétence SSL-lite et résultats `oma skill audit` |
| **oma-slide** | Présentations HTML et exports | HTML validé, bundle, PDF, PNG ou PPTX |
| **oma-tf-infra** | Infrastructure Terraform, IAM et policy-as-code | Modules Terraform, plans et contrôles |
| **oma-translation** | Localisation UI, documentation et marketing | Contenu traduit en préservant le contexte |
| **oma-video** | Shorts, explications et démonstrations | Run vidéo reproductible avec assets et manifeste |
| **oma-voice** | TTS, STT et voiceovers locaux | Artefacts audio ou transcription avec manifeste |

---

## Configurer les tableaux de bord

```bash
oma dashboard terminal   # live table in this terminal; Ctrl+C to exit
oma dashboard web        # prints http://127.0.0.1:9847/; open it in a browser
```

Les deux commandes surveillent `.agents/state/memories/` sous le répertoire courant. Passez `--project-root <path>` pour surveiller un autre projet, ou définissez `MEMORIES_DIR`. Le tableau des agents comporte quatre colonnes :

| Colonne | Source |
|---------|--------|
| Agent | `task-board.md`, ou noms d’agents découverts dans les fichiers mémoire |
| Status | Symboles du terminal : ● en cours (vert), ✓ terminé (cyan), ✗ échoué (rouge), ○ bloqué (jaune), ◌ en attente (atténué) |
| Turn | `turn: N` dans le fichier `progress-<agent>*.md` de l’agent |
| Task | Texte de la tâche issu du task board ou du fichier de l’agent |

Sous le tableau, les deux dashboards listent l’activité la plus récente des cinq fichiers mémoire modifiés en dernier. Les dispositions, sources de données et étapes de récupération sont décrites dans [Surveillance du dashboard](./dashboard-monitoring.md).

---

## Concepts clés

### Divulgation progressive

Les compétences se chargent en deux couches pour économiser des tokens. La couche 1 (`SKILL.md`) entre dans le contexte lorsque l’hôte route la compétence : l’injecteur transmet un chemin, pas le contenu. La couche 2 (`resources/`) n’est lue que lorsque la tâche en a besoin ; la difficulté fixe un budget souple, pas une liste de fichiers. L’économie dépend des compétences et de la tâche : mesurez-la plutôt que de supposer un chiffre. Le [calcul des économies de tokens](../core-concepts/skills.md#token-savings-math) fournit le script et explique ce que couvrent ses estimations.

### Optimisation des tokens

Au-delà de la divulgation progressive, oh-my-agent optimise les tokens avec :
- **gestion du budget de contexte :** pas de lectures de fichier complètes ; utiliser `find_symbol` plutôt que `read_file` ;
- **chargement paresseux :** charger les guides d’erreurs uniquement en cas d’erreur et les checklists à la vérification ;
- **embranchement par difficulté :** les tâches Simple ignorent l’analyse et utilisent des checklists minimales ;
- **suivi de progression :** les agents enregistrent les fichiers lus pour éviter de les relire.

### Lancement CLI

Lorsque vous exécutez `oma agent spawn`, le CLI :
1. résout le fournisseur du rôle à partir des options explicites, des surcharges d’agents, du preset de modèle et du fallback configuré ;
2. injecte le protocole d’exécution du fournisseur depuis `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md` ;
3. compose le prompt avec les règles fondamentales du SKILL.md, le protocole d’exécution et les ressources pertinentes ;
4. lance l’agent comme processus CLI indépendant ;
5. enregistre un reçu structuré sous `.agents/state/agent-runs/` et injecte un chemin de claim ;
6. l’agent écrit une claim structurée ; les fichiers Markdown de progression et de résultat sont complémentaires et lisibles par l’humain.

### Magasin mémoire du projet

Les agents se coordonnent avec des fichiers durables dans `.agents/state/memories/` (les projets anciens utilisent en fallback le chemin `.serena/memories/`). L’orchestrateur écrit les fichiers de session et de task board propres au run. Chaque run écrit `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` et `result-{agentId}-{taskId}-{runId}-{sessionId}.md` lorsque la sortie Markdown est activée ; les reçus et claims structurés sous `.agents/state/agent-runs/` font foi pour les lancements CLI. Les agents lisent et écrivent ces fichiers avec leurs outils natifs ; le mapping des outils reste configurable dans `.agents/mcp.json → memoryConfig.tools`.

### Documents et rapports

Utilisez `docs/decisions/` pour les propositions d’approches et les ADR, avec un champ `Status` tel que `draft`, `accepted` ou `superseded`. Le design d’interface appartient à `DESIGN.md`. Les plans de travail restent dans `docs/plans/work/`, et les contrats d’API adoptés restent dans `docs/plans/contracts/`.

Les rapports d’exécution et brouillons de contrats appartiennent à `.agents/results/`. Lorsqu’un document devient une référence de projet maintenue, déplacez-le vers le répertoire `docs/` approprié et laissez un lien à son emplacement précédent. Voir [Disposition des artefacts](./artifact-layout.md) pour l’arborescence complète et les commandes de migration.

### Workspaces

<!-- oma-docs:ignore-start -->
Le flag `-w` de `agent spawn` isole un agent dans un répertoire précis. Cette isolation est indispensable à l’exécution parallèle. Sans elle, deux agents peuvent modifier le même fichier simultanément et créer des conflits. Disposition standard : `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Conseils

1. **Soyez précis dans les prompts.** « Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL » produit de meilleurs résultats que « make an app ».

2. **Utilisez des workspaces pour les agents parallèles.** Passez toujours `-w ./path` afin d’éviter les conflits entre agents simultanés.

3. **Verrouillez les contrats API avant le lancement.** Exécutez `/plan` d’abord pour que frontend et backend partagent la forme des endpoints.

4. **Surveillez activement.** Ouvrez un terminal dashboard pour détecter les agents en échec avant la fin de tous les autres.

5. **Itérez avec des relancements.** Si la sortie d’un agent n’est pas correcte, relancez-le avec la tâche d’origine et le contexte de correction. Ne recommencez pas depuis zéro.

6. **Adaptez la coordination à la tâche.** Commencez par une compétence unique pour un domaine ; utilisez le [guide de sélection](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) lorsque la tâche exige une coordination ou un processus qualité explicite.

7. **Utilisez `/brainstorm` avant `/plan` pour les idées ambiguës.** Brainstorm clarifie l’intention et l’approche avant que le PM ne décompose les tâches.

8. **Exécutez `/deepinit` sur les nouveaux codebases.** Il crée AGENTS.md et ARCHITECTURE.md, qui aident tous les agents à comprendre la structure du projet.

9. **Configurez `model_preset`.** Commencez avec `auto`, choisissez un preset fixe comme `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` ou `mixed`, ou utilisez `free` avec sa passerelle locale. Ajoutez des surcharges `agents:` pour un contrôle fin. Voir [Modèles par agent](./per-agent-models.md).

10. **Utilisez `/ultrawork` lorsque son processus complet de revue est explicitement souhaité.** Le workflow en 5 phases exécute 12 étapes de revue isolées ; le simple chargement d’une compétence ne lance pas ces contrôles.

---

## Dépannage {#troubleshooting}

Les problèmes courants sont listés ci-dessous. Pour les messages d’erreur, les échecs de résultats de run, les planifications et les hooks, voir [Dépannage](./troubleshooting.md).

| Problème | Cause | Correction |
|----------|-------|-----------|
| Compétences non détectées dans l’IDE | `.agents/skills/` absent ou aucun fichier `SKILL.md` | Exécuter l’installateur (`bunx oh-my-agent@latest`), vérifier les symlinks dans `.claude/skills/`, redémarrer l’IDE |
| CLI introuvable au lancement | CLI IA sélectionné non installé ou absent de `PATH` | Exécuter `which <selected-cli>` (par exemple `claude`, `codex`, `agy`, `qwen` ou `kiro-cli`), ouvrir un nouveau shell ou l’installer selon le guide d’installation |
| Agents produisant du code en conflit | Pas d’isolation des workspaces | Utiliser des workspaces séparés : `-w ./apps/api`, `-w ./apps/web` |
| Le dashboard affiche « No agents detected yet » | Les agents n’ont pas encore écrit en mémoire, ou le dashboard surveille un autre répertoire | Attendre le premier fichier de progression ; lancer depuis la racine du projet ou passer `--project-root <path>` |
| `oma dashboard web` se termine avec « port 9847 is already in use » | Un autre processus occupe le port | `DASHBOARD_PORT=8080 oma dashboard web` |
| Le rapport QA contient plus de 50 problèmes | Normal lors d’une première revue d’un codebase important | Traiter d’abord les sévérités CRITICAL et HIGH ; documenter MEDIUM/LOW pour les prochains sprints |
| Un mode persistant démarre alors que vous avez seulement mentionné son nom | Le prompt nomme `orchestrate`, `ultrawork`, `work mode` ou `ralph` en dehors d’une question ou d’un bloc de code | Dire « workflow done » pour le libérer. Signaler les faux déclenchements pour améliorer le système. |
| Le workflow persistant ne s’arrête pas | Le fichier d’état existe encore | Dire « workflow done » dans le chat ou supprimer manuellement le fichier d’état dans `.agents/state/` |
| Agent bloqué sur une clarification HIGH | Exigences trop ambiguës | Fournir les réponses demandées, puis relancer |
| Outils MCP inopérants | Serena mal configuré ou arrêté | Exécuter `oma doctor` pour vérifier la configuration MCP |
| Agent dépasse son budget d’exécution | Tâche trop complexe pour un seul run | Décomposer la tâche, utiliser un workflow avec limites explicites ou réessayer avec un contrat d’acceptation plus étroit |
| Mauvais CLI utilisé pour l’agent | `model_preset` non configuré ou surcharge absente | Exécuter `oma install` ou définir `model_preset` dans `oma-config.yaml`. Voir [Modèles par agent](./per-agent-models.md). |

---

## Étapes suivantes

- Un changement dans un seul domaine : [Compétence unique](./single-skill.md)
- Une fonctionnalité couvrant plusieurs domaines : [Projets multi-agents](./multi-agent-project.md)
- Un bug avec un message d’erreur : [Correction de bugs](./bug-fixing.md)
- Suivre un run : [Surveillance du dashboard](./dashboard-monitoring.md)
- Auditer ou reprendre les résultats d’agents : [Résultats et reprise](./agent-results-and-resume.md)
- Trouver ou migrer des documents OMA : [Disposition des artefacts](./artifact-layout.md)
- Quelque chose a échoué : [Dépannage](./troubleshooting.md)
- Détails d’intégration au projet : [Guide d’intégration](./integration.md)
- Termes utilisés dans ces guides : [Glossaire](../getting-started/glossary.md)
