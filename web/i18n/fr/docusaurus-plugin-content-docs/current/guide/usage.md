---
title: Guide d’utilisation
sidebar_label: Utiliser OMA
description: "Guide d’utilisation d’OMA : choisir une tâche en fonction du lecteur, exemples single-skill et multi-domaines, workflows, détection automatique, 33 skills, exécution CLI parallèle, tableaux de bord, valeurs par défaut et récupération."
---

# Utiliser oh-my-agent

## Démarrage rapide

1. Ouvrez votre projet dans un IDE ou CLI doté d’une IA (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen ou tout autre hôte pris en charge).
2. L’hôte sélectionné peut charger les skills depuis `.agents/skills/` ; les hooks activés peuvent détecter les workflows à partir de mots-clés en langage naturel.
3. Décrivez ce que vous voulez en langage naturel. L’hôte ou le workflow sélectionné route la tâche vers le skill pertinent.
4. Pour un travail multi-agents, utilisez `/work` ou `/orchestrate`.

Les tâches dans un seul domaine ne nécessitent aucune syntaxe spéciale. Utilisez le [guide de sélection des skills et workflows](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) pour choisir entre un skill unique, `/work`, `/orchestrate`, `/ultrawork` et `/ralph`. Consultez le [Démarrage rapide](../getting-started/quick-start.md) pour la configuration et les [Valeurs par défaut importantes](../getting-started/important-defaults.md) avant de changer de fournisseur.

---

## Exemple 1 : tâche simple dans un seul domaine

**Vous saisissez :**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Ce qui se passe :**

1. L’hôte route la demande vers `oma-frontend` (les mots-clés « form », « component » et « Tailwind CSS » servent de signaux de routage).
2. La couche 1 (`SKILL.md`) est déjà chargée avec l’identité de l’agent, ses règles fondamentales et sa liste de bibliothèques.
3. Les ressources de la couche 2 sont chargées à la demande :
   - `execution-protocol.md` : workflow en 4 étapes (Analyze, Plan, Implement, Verify) ;
   - `snippets.md` : motifs de formulaire et de validation Zod ;
   - motifs de composants existants et `snippets.md` lorsque le skill les fournit.
4. L’agent produit un **CHARTER_CHECK** :
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. L’agent implémente :
   - le composant React TypeScript dans `src/features/auth/components/login-form.tsx` ;
   - le schéma de validation Zod dans `src/features/auth/utils/login-validation.ts` ;
   - les tests Vitest dans `src/features/auth/utils/__tests__/login-validation.test.ts` ;
   - le loading skeleton dans `src/features/auth/components/skeleton/login-form-skeleton.tsx`.
<!-- oma-docs:ignore-end -->
6. L’agent exécute la checklist : accessibilité (labels ARIA, HTML sémantique, navigation clavier), viewport mobile, performance (pas de CLS), Error Boundaries.

**Résultat attendu :** un composant React TypeScript au périmètre défini, avec validation, tests et preuves d’accessibilité lorsque le projet prend ces contrôles en charge. Le prompt et le workflow sélectionné déterminent les fichiers et contrôles réellement exécutés.

---

## Exemple 2 : projet multi-domaines

**Vous saisissez :**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Ce qui se passe :**

1. La demande couvre frontend, backend et mobile. L’agent hôte peut s’appuyer sur ce périmètre pour recommander une approche de coordination.
2. Si le hook de détection est activé, « Build a TODO app » correspond à un motif `/orchestrate` configuré et peut l’activer. Le hook fait correspondre le texte ; il ne classe pas la demande par nombre de domaines. Utilisez une commande explicite pour sélectionner le workflow.

**Avec `/work` (étape par étape, sous contrôle utilisateur) :**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1, le PM planifie :**
   - identifie les domaines : backend (API d’auth, CRUD des tâches), frontend (connexion, interface de liste), mobile (application Flutter) ;
   - définit les contrats API : `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id` ;
   - crée le découpage priorisé :
     - P0 : API d’auth backend, API CRUD des tâches backend ;
     - P1 : connexion/inscription frontend, liste frontend, écrans d’auth mobile, liste mobile ;
     - P2 : revue QA ;
   - enregistre le plan dans `.agents/results/plan-{sessionId}.json`.

4. **Step 2, revue du plan :** l’agent présente le plan et continue dans l’autorisation existante, en demandant uniquement une décision importante manquante ou une nouvelle autorisation.

5. **Step 3, lancement par priorité :**
   ```bash
   # P0 tier (parallel)
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Step 4, revue par l’agent QA :**
   - sécurité : conformité OWASP Top 10 (validation JWT, CSRF, injection SQL) ;
   - performance : recherche de N+1, vérification de la pagination ;
   - accessibilité : WCAG 2.1 AA sur tous les composants frontend ;
   - transversal : alignement du contrat API entre frontend, mobile et backend.

7. **Step 5, itération :** si la QA détecte des problèmes CRITICAL, relancer l’agent responsable avec le rapport QA.

---

## Exemple 3 : correction d’un bug

**Vous saisissez :**
```
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
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**Ce qui se passe :**

1. `oma-design` s’active (mots-clés : « design », « landing page », « dark », « premium »).
2. **Phase 1, SETUP :** vérifie `.design-context.md`. S’il manque, il demande :
   - quelles langues le service prend-il en charge ? (en uniquement / + CJK) ;
   - quel est le public cible ? (B2B, utilisateurs techniques, 25–45 ans) ;
   - quelle est la personnalité de la marque ? (professionnelle / premium) ;
   - quelle direction esthétique ? (dark premium) ;
   - quels sites de référence ? (exemples fournis par l’utilisateur) ;
   - quelle accessibilité ? (WCAG AA).
3. **Phase 3, ENHANCE :** si le prompt est vague, le transforme en spécification section par section.
4. **Phase 4, PROPOSE :** présente 3 directions de design :
   - **Direction A: "Midnight Observatory"** : bleu marine profond (#0f1729), accents cyan (#22d3ee), Inter + JetBrains Mono, grille bento, apparitions pilotées par le défilement ;
   - **Direction B: "Carbon Interface"** : gris neutre (#18181b), accents ambre (#f59e0b), polices système, disposition en damier, micro-interactions au survol ;
   - **Direction C: "Deep Space"** : sombre pur (#0a0a0a), accents émeraude (#10b981), Geist + Geist Mono, sections pleine largeur, animations d’entrée.
5. **Phase 5, GENERATE :** selon la direction choisie, génère :
   - `DESIGN.md` avec 6 sections (typographie, couleur, espacement, animation, composants, accessibilité) ;
   - propriétés CSS personnalisées ;
   - extensions de configuration Tailwind ;
   - variables de thème shadcn/ui.
6. **Phase 6, AUDIT :** exécute les contrôles responsive (minimum 320 px), WCAG 2.2, heuristiques Nielsen et anti-AI slop.
7. **Phase 7, HANDOFF :** « Design terminé. Exécutez `/orchestrate` pour implémenter avec oma-frontend. »

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
oma dashboard web    # Web UI at http://localhost:9847

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
```
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
| `/review` | Non persistant | Pipeline QA : sécurité OWASP, performance, accessibilité et qualité du code | Avant la fusion ou le déploiement |
| `/debug` | Non persistant | Débogage structuré : reproduire, diagnostiquer, corriger, tester, rechercher | Enquêter sur des bugs et erreurs |
| `/design` | Non persistant | Workflow design en 7 phases qui produit DESIGN.md avec tokens | Construire un système de design, une landing page ou une refonte UI |
| `/scm` | Non persistant | Workflow SCM Git (branche/fusion/conflit/worktree/baseline) et génération de Conventional Commit avec détection automatique type/scope et découpage | Après des changements de code ou pour les tâches de gestion de configuration du dépôt |
| `/tools` | Non persistant | Gérer la visibilité des outils MCP (activer/désactiver des groupes) | Contrôler les outils accessibles aux agents |
| `/stack-set` | Non persistant | Détecter la stack et générer les références backend ou mobile (Swift/Flutter/RN) | Configurer les conventions propres au langage |
| `/architecture` | Non persistant | Diagnostiquer, comparer et consigner les décisions d’architecture | Revoir des frontières ou choisir une architecture |
| `/convert` | Non persistant | Router la conversion vers le skill approprié | Convertir des fichiers HWP/HWPX ou PDF |
| `/docs` | Non persistant | Vérifier la documentation et proposer des synchronisations ciblées par diff | Comparer les docs au code actuel |
| `/explain` | Non persistant | Générer et valider une explication HTML autonome d’un changement de code | Enseigner un diff, une PR, une branche ou une plage de commits |
| `/recap` | Non persistant | Résumer le travail dans les historiques des outils IA pris en charge | Récapitulatif quotidien ou périodique |
| `/schedule` | Non persistant | Enregistrer des jobs récurrents d’agents | Récaps, scans ou maintenance nocturnes |
| `/video` | Non persistant | Composer des vidéos reproductibles à partir de scripts, narration et visuels | Shorts, explications et démonstrations |
| `/ralph` | Persistant | Exécution ultrawork répétée avec juge indépendant et garde-fous | Demande explicite de répéter jusqu’à des critères mécaniques de fin |

---

## Exemples de détection automatique

oh-my-agent détecte des mots-clés de workflow dans 11 langues. Voici des exemples de déclenchement en langage naturel :

| Vous saisissez | Workflow détecté | Langue |
|----------------|------------------|--------|
| "plan the authentication feature" | `/plan` | Anglais |
| "do everything in parallel" | `/orchestrate` | Anglais |
| "review the code for security" | `/review` | Anglais |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | Anglais |
| "design a landing page for our product" | `/design` | Anglais |
| "fix the login bug" | `/debug` | Anglais |
| "계획 세워줘" | `/plan` | Coréen |
| "버그 수정해줘" | `/debug` | Coréen |
| "디자인 시스템 만들어줘" | `/design` | Coréen |
| "자동으로 실행해" | `/orchestrate` | Coréen |
| "コードレビューして" | `/review` | Japonais |
| "計画を立てて" | `/plan` | Japonais |
| "修复这个 bug" | `/debug` | Chinois |
| "设计一个着陆页" | `/design` | Chinois |
| "revisar código" | `/review` | Espagnol |
| "diseña la página" | `/design` | Espagnol |
| "debuggen" | `/debug` | Allemand |
| "coordonner étape par étape" | `/work` | Français |
| "don't stop until it's done" | `/ralph` | Anglais |
| "끝까지 해" | `/ralph` | Coréen |
| "最後までやって" | `/ralph` | Japonais |

**Les questions informatives sont filtrées :**

| Vous saisissez | Résultat |
|----------------|----------|
| "what is orchestrate?" | Aucun workflow (motif informatif : "what is") |
| "explain how /plan works" | Aucun workflow (motif informatif : "explain") |
| "어떻게 사용해?" | Aucun workflow (motif informatif : "어떻게") |
| "レビューとは何ですか" | Aucun workflow (motif informatif : "とは") |

---

## Les 33 skills : référence rapide

Le preset `all` de l’installateur suit le registre actif. Cette table regroupe chaque skill selon son usage principal ; un skill peut tout de même se coordonner avec un autre à une frontière.

| Skill | Idéal pour | Sortie principale |
|-------|------------|------------------|
| **oma-academic-writing** | Rédaction académique, révision et revue anti-AI | Prose destinée à la publication et révisions claim/evidence |
| **oma-architecture** | Frontières système, compromis, ADR | Recommandation d’architecture ou décision consignée |
| **oma-backend** | API, auth, logique serveur, migrations | Changements Router/service/repository et vérification |
| **oma-brainstorm** | Idées ambiguës et comparaison d’approches | Document de design dans `docs/plans/designs/` |
| **oma-coordination** | Coordination manuelle multi-agents | Guide des tâches et handoffs étape par étape |
| **oma-db** | Schéma, ERD, réglage de requêtes, capacité | Documentation de schéma, migrations et plan de récupération |
| **oma-debug** | Reproduction et cause profonde d’un bug | Correction minimale, preuve de régression et recherche de motifs |
| **oma-deepsec** | Scan de vulnérabilités piloté par agent | Rapports de scan, triage, revalidation et gate |
| **oma-design** | Systèmes de design, landing pages, tokens | `DESIGN.md`, tokens et guide de composants |
| **oma-dev-workflow** | CI/CD, monorepos, migrations, automatisation de release | Configuration du workflow et contrôles de release |
| **oma-docs** | Références cassées et dérive documentaire | Rapport de vérification ou candidats sync ciblés par diff |
| **oma-explanation** | Parcours de diff, PR, branche ou commits | Explication HTML hors ligne avec Background, Intuition, Code et Quiz |
| **oma-frontend** | Composants UI, formulaires, pages, styling Angular ou React | Changements frontend et contrôles pertinents |
| **oma-hwp** | Conversion HWP/HWPX/HWPML | Markdown avec titres, tableaux, images et liens |
| **oma-image** | Génération d’images et assets visuels | Run d’image reproductible avec manifeste |
| **oma-market** | Pain points, tendances, concurrents et recherche de découverte | Brief conforme LAW avec frameworks |
| **oma-mobile** | Flutter, React Native et iOS Swift | Écrans mobiles, état, intégration plateforme et tests |
| **oma-observability** | Traces, métriques, logs, profils, SLO et investigation d’incidents | Recommandation d’observabilité par couche ou guide d’implémentation |
| **oma-orchestration** | Exécution parallèle automatisée d’agents | Plans coordonnés, mises à jour mémoire et collecte des résultats |
| **oma-pdf** | Conversion PDF et extraction avec OCR | Markdown avec ordre de lecture, tableaux, listes et images |
| **oma-pm** | Exigences, découpage, contrats API | `.agents/results/plan-{sessionId}.json` et task board |
| **oma-qa** | Revue sécurité, performance, accessibilité et qualité | Rapport de constats avec sévérité et preuves de remédiation |
| **oma-recap** | Rétrospectives de travail inter-outils | Récapitulatif quotidien ou périodique dans `.agents/results/recap/` |
| **oma-refactor** | Restructuration préservant le comportement | Changements avec tests de caractérisation et preuves qualité |
| **oma-scholar** | Recherche académique et sidecars d’articles | Opérations `.knows.yaml` validées |
| **oma-scm** | Branches Git, worktrees, baselines et hygiène de commit | Plan SCM ou Conventional Commit |
| **oma-search** | Recherche docs, web, code et locale avec score de confiance | Résultats routés avec labels de confiance |
| **oma-skill-creation** | Création et audit de skills OMA | Fichiers skill SSL-lite et résultats `oma skill audit` |
| **oma-slide** | Présentations HTML et exports | HTML validé, bundle, PDF, PNG ou PPTX |
| **oma-tf-infra** | Infrastructure Terraform, IAM et policy-as-code | Modules Terraform, plans et contrôles |
| **oma-translation** | Localisation UI, documentation et marketing | Contenu traduit en préservant le contexte |
| **oma-video** | Shorts, explications et démonstrations | Run vidéo reproductible avec assets et manifeste |
| **oma-voice** | TTS, STT et voiceovers locaux | Artefacts audio ou transcription avec manifeste |

---

## Configurer les tableaux de bord

### Tableau de bord du terminal

```bash
oma dashboard terminal
```

La commande affiche un tableau actualisé en direct :
- identifiant et état global de session (RUNNING / COMPLETED / FAILED) ;
- lignes par agent : état, nombre de tours, activité récente, temps écoulé ;
- surveillance de `.agents/state/memories/` pour les mises à jour en temps réel.

### Tableau de bord web

```bash
oma dashboard web
# Opens http://localhost:9847
```

Fonctionnalités :
- mises à jour en temps réel via WebSocket (sans actualisation manuelle) ;
- reconnexion automatique après une coupure ;
- statut de session avec indicateurs colorés par agent (vert=terminé, jaune=en cours, rouge=échoué) ;
- flux du journal depuis les fichiers de progression et de résultat ;
- historique des sessions.

### Disposition recommandée

Utilisez 3 terminaux :
1. **Terminal dashboard :** `oma dashboard terminal` pour la surveillance continue ;
2. **Terminal commandes :** commandes de lancement d’agents et commandes workflow ;
3. **Terminal build :** tests, journaux de build et opérations Git.

---

## Concepts clés

### Divulgation progressive

Les skills se chargent en deux couches pour économiser des tokens. La couche 1 (`SKILL.md`, environ 2 631 tokens en médiane dans l’arbre courant de 33 skills) entre dans le contexte lorsque l’hôte route le skill : l’injecteur transmet un chemin, pas le contenu. La couche 2 (`resources/`) est lue selon les besoins de la tâche, selon les niveaux de difficulté. Sur une session de 5 agents, une tâche Simple ou Medium conserve environ 18–19 K tokens de contexte de skills sur un plafond de 73 K, laissant environ 109 K d’un contexte de 128 K au travail réel ; une tâche Complex en conserve environ 39 K, laissant environ 89 K. Voir le [calcul des économies de tokens](../core-concepts/skills.md#token-savings-math) pour la table et le script de reproduction.

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

6. **Adaptez la coordination à la tâche.** Commencez par un skill unique pour un domaine ; utilisez le [guide de sélection](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) lorsque la tâche exige une coordination ou un processus qualité explicite.

7. **Utilisez `/brainstorm` avant `/plan` pour les idées ambiguës.** Brainstorm clarifie l’intention et l’approche avant que le PM ne décompose les tâches.

8. **Exécutez `/deepinit` sur les nouveaux codebases.** Il crée AGENTS.md et ARCHITECTURE.md, qui aident tous les agents à comprendre la structure du projet.

9. **Configurez `model_preset`.** Commencez avec `auto`, choisissez un preset fixe comme `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` ou `mixed`, ou utilisez `free` avec sa passerelle locale. Ajoutez des surcharges `agents:` pour un contrôle fin. Voir [Modèles par agent](./per-agent-models.md).

10. **Utilisez `/ultrawork` lorsque son processus complet de revue est explicitement souhaité.** Le workflow en 5 phases exécute 12 étapes de revue isolées ; le simple chargement d’un skill ne lance pas ces contrôles.

---

## Dépannage

| Problème | Cause | Correction |
|----------|-------|-----------|
| Skills non détectés dans l’IDE | `.agents/skills/` absent ou aucun fichier `SKILL.md` | Exécuter l’installateur (`bunx oh-my-agent@latest`), vérifier les symlinks dans `.claude/skills/`, redémarrer l’IDE |
| CLI introuvable au lancement | CLI IA sélectionné non installé ou absent de `PATH` | Exécuter `which <selected-cli>` (par exemple `claude`, `codex`, `agy`, `qwen` ou `kiro`), ouvrir un nouveau shell ou l’installer selon le guide d’installation |
| Agents produisant du code en conflit | Pas d’isolation des workspaces | Utiliser des workspaces séparés : `-w ./apps/api`, `-w ./apps/web` |
| Le dashboard affiche « No agents detected » | Les agents n’ont pas encore écrit en mémoire | Attendre leur démarrage (première écriture au tour 1) ou vérifier l’identifiant de session |
| Le dashboard web ne démarre pas | Dépendances non installées | Exécuter `bun install` dans le répertoire web |
| Le rapport QA contient plus de 50 problèmes | Normal lors d’une première revue d’un codebase important | Traiter d’abord les sévérités CRITICAL et HIGH ; documenter MEDIUM/LOW pour les prochains sprints |
| La détection automatique choisit le mauvais workflow | Ambiguïté d’un mot-clé | Utiliser une commande `/command` explicite. Signaler les faux déclenchements pour améliorer le système |
| Le workflow persistant ne s’arrête pas | Le fichier d’état existe encore | Dire « workflow done » dans le chat ou supprimer manuellement le fichier d’état dans `.agents/state/` |
| Agent bloqué sur une clarification HIGH | Exigences trop ambiguës | Fournir les réponses demandées, puis relancer |
| Outils MCP inopérants | Serena mal configuré ou arrêté | Exécuter `oma doctor` pour vérifier la configuration MCP |
| Agent dépasse son budget d’exécution | Tâche trop complexe pour un seul run | Décomposer la tâche, utiliser un workflow avec limites explicites ou réessayer avec un contrat d’acceptation plus étroit |
| Mauvais CLI utilisé pour l’agent | `model_preset` non configuré ou surcharge absente | Exécuter `oma install` ou définir `model_preset` dans `oma-config.yaml`. Voir [Modèles par agent](./per-agent-models.md). |

---

Pour les motifs de tâches dans un seul domaine, voir le [guide Single Skill](./single-skill.md).
Pour les détails d’intégration au projet, voir le [guide d’intégration](./integration.md).
