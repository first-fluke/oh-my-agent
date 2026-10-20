---
title: "Guide : exécution d'une compétence unique"
sidebar_label: Compétence unique
description: Guide détaillé des tâches limitées à un seul domaine dans oh-my-agent.
---

# Exécution d'une compétence unique

Une compétence unique convient à un agent qui traite une tâche ciblée dans un seul domaine. Elle évite la charge d'orchestration et de coordination entre agents. L'hôte ou le workflow sélectionné peut router un prompt en langage naturel vers la compétence ; le système de hooks détecte lui-même les workflows et le comportement de routage dépend du runtime sélectionné.

## Parcours rapide

1. Exécutez `oma doctor` une fois pour vérifier l'intégration de l'hôte sélectionné. Les avertissements facultatifs concernant les fournisseurs ne bloquent pas une tâche qui ne les utilise pas.
2. Décrivez une modification autonome avec un **Objectif**, un **Contexte**, des **Contraintes** et une condition **Terminé quand** explicites.
3. La compétence sélectionnée doit inspecter le dépôt, indiquer son périmètre lorsque le contrat d'exécution actif exige un `CHARTER_CHECK`, puis signaler les vérifications réellement exécutées.
4. Si la tâche s'étend aux frontières de l'API, de l'UI, de la base de données ou du mobile, arrêtez l'exécution de la compétence unique et passez à `/work` ou `/orchestrate`.

Pour une exécution gérée qui semble bloquée, utilisez `oma agent status <session-id> [agent-id]`, puis consultez les reçus dans `.agents/state/agent-runs/` et le chemin de claim injecté avant de réessayer. Consultez les [valeurs par défaut importantes](../getting-started/important-defaults.md) pour le routage des fournisseurs et la récupération.

---

## Quand utiliser une compétence unique

Utilisez cette approche si votre tâche satisfait **tous** les critères suivants :

- **Appartenance à un seul domaine** : toute la tâche relève du frontend, du backend, du mobile, de la base de données, du design, de l'infrastructure ou d'un autre domaine unique.
- **Autonomie** : aucun changement de contrat d'API entre domaines et aucune modification backend nécessaire pour une tâche frontend.
- **Périmètre clair** : vous savez quel résultat produire (un composant, un endpoint, un schéma ou une correction).
- **Aucune coordination** : aucun autre agent ne doit intervenir avant ou après.

**Exemples de tâches pour une compétence unique :**

- Construire un composant UI
- Ajouter un endpoint d'API
- Corriger un bug dans une couche
- Concevoir une table de base de données
- Écrire un module Terraform
- Traduire un ensemble de chaînes i18n
- Créer une section d'un design system

**Passez au multi-agent** (`/work` ou `/orchestrate`) lorsque :

- le travail UI nécessite un nouveau contrat d'API (frontend + backend) ;
- une correction se propage entre plusieurs couches (agents de débogage et d'implémentation) ;
- la fonctionnalité couvre le frontend, le backend et la base de données ;
- le périmètre dépasse un domaine après la première itération.

Les tests et les critères d'acceptation font aussi partie d'une tâche à compétence unique ; ils n'imposent pas à eux seuls `/ralph`. Pour une coordination entre domaines ou un processus qualité demandé explicitement, consultez le [guide de sélection des compétences et workflows](/docs/core-concepts/workflows#choosing-a-skill-or-workflow).

---

## Liste de vérification avant lancement

Avant de rédiger le prompt, répondez à ces quatre questions :

| Élément | Question | Pourquoi c'est important |
|---------|----------|--------------------------|
| **Objectif** | Quel artefact précis doit être créé ou modifié ? | Évite l'ambiguïté (par exemple, « ajouter un bouton » ou « ajouter un formulaire avec validation »). |
| **Contexte** | Quelle stack, quel framework et quelles conventions s'appliquent ? | L'agent les détecte dans les fichiers du projet, mais les préciser est préférable. |
| **Contraintes** | Quelles règles faut-il respecter ? (style, sécurité, performances, compatibilité) | Sans contraintes, les agents utilisent des valeurs par défaut qui peuvent ne pas correspondre au projet. |
| **Terminé quand** | Quels critères d'acceptation allez-vous vérifier ? | Donne une cible à l'agent et une liste de vérification à l'auteur de la demande. |

Si un élément manque dans votre prompt, l'agent va :

- **Incertitude faible** : appliquer des valeurs par défaut et lister ses hypothèses ;
- **Incertitude moyenne** : présenter 2 ou 3 options et avancer avec la plus probable ;
- **Incertitude élevée** : bloquer et poser des questions (il n'écrira pas de code).

---

## Modèle de prompt

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Décomposition du modèle

| Partie | Fonction | Exemple |
|------|---------|---------|
| `Build <specific artifact>` | L'objectif (ce qu'il faut créer) | « Construire un composant de formulaire d'inscription utilisateur » |
| `using <stack/framework>` | Le contexte (stack technique) | « avec React + TypeScript + Tailwind CSS » |
| `Constraints:` | Les règles à respecter | « labels accessibles, aucune bibliothèque de formulaires externe, validation côté client uniquement » |
| `Acceptance criteria:` | La condition Terminé quand (résultats vérifiables) | « 1) validation du format de l'e-mail 2) indicateur de robustesse du mot de passe 3) envoi désactivé tant que le formulaire est invalide » |
| `Add tests for:` | Les exigences de test | « chemins d'envoi valide et invalide, cas limites de validation de l'e-mail » |

---

## Exemples réels

### Frontend : formulaire de connexion

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**Déroulement attendu :**

1. **Routage de la compétence :** l'hôte ou le workflow sélectionne `oma-frontend` (des mots-clés comme « form », « component », « Tailwind CSS » et « React » servent de signaux de routage).
2. **Évaluation de la difficulté :** moyenne (2 ou 3 fichiers, avec quelques décisions de conception sur l'expérience de validation).
3. **Ressources chargées :**
   - `execution-protocol.md` (toujours) ;
   - `snippets.md` (motifs de formulaire et Zod, ainsi que les motifs de composants existants lorsque la compétence les fournit).
4. **Contrat d'exécution (lorsqu'il est activé) :** il peut émettre un `CHARTER_CHECK` :
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **Implémentation :**
   - crée `src/features/auth/components/login-form.tsx` (composant client avec `"use client"`) ;
   - crée `src/features/auth/utils/login-schema.ts` (schéma Zod) ;
   - crée `src/features/auth/components/skeleton/login-form-skeleton.tsx` ;
   - utilise les composants shadcn/ui `<Button>`, `<Input>`, `<Label>` (en lecture seule, sans modification) ;
   - gère le formulaire avec `@tanstack/react-form` et la validation Zod ;
   - utilise les imports absolus avec `@/` ;
   - conserve un composant par fichier.
6. **Vérification :**
   - liste de contrôle : labels ARIA présents, titres sémantiques, navigation au clavier fonctionnelle ;
   - mobile : rendu correct dans une fenêtre de 320px ;
   - performances : aucun CLS ;
   - tests : fichier Vitest dans `src/features/auth/utils/__tests__/login-schema.test.ts`.
<!-- oma-docs:ignore-end -->

---

### Backend : endpoint d'API REST

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**Déroulement attendu :**

1. **Routage de la compétence :** l'hôte ou le workflow sélectionne `oma-backend` (des mots-clés comme « API », « endpoint » et « REST » servent de signaux de routage).
2. **Détection de la stack :** lit `pyproject.toml` ou `package.json` pour déterminer le langage et le framework. Si des références générées `stack/` ou des `variants/` livrées existent, il charge les conventions correspondantes.
3. **Évaluation de la difficulté :** moyenne (2 ou 3 fichiers : route, service, dépôt, plus un test).
4. **Ressources chargées :**
   - `execution-protocol.md` (toujours)
<!-- oma-docs:ignore-start -->
   - `stack/snippets.md` correspondant ou `variants/{node,python,rust}/snippets.md` s'il est disponible ;
   - `stack/tech-stack.md` correspondant ou les références tech-stack de la variante s'il en existe.
<!-- oma-docs:ignore-end -->
5. **Contrat d'exécution (lorsqu'il est activé) :** il peut émettre un `CHARTER_CHECK` :
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implémentation :**
   - dépôt : `TaskRepository.find_by_user(user_id, cursor, status, limit)` avec une requête paramétrée ;
   - service : `TaskService.get_user_tasks(user_id, cursor, status, limit)` (wrapper de logique métier) ;
   - routeur : `GET /api/tasks` avec middleware d'authentification JWT, validation des entrées et formatage de la réponse ;
   - tests : l'authentification requise renvoie 401, la pagination renvoie le bon curseur, le filtre fonctionne et un résultat vide renvoie 200 avec un tableau vide.

---

### Mobile : écran des réglages

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**Déroulement attendu :**

1. **Routage de la compétence :** l'hôte ou le workflow sélectionne `oma-mobile` (des mots-clés comme « Flutter », « screen » et « mobile » servent de signaux de routage).
2. **Évaluation de la difficulté :** moyenne (écran de réglages, gestion d'état et fonctionnement hors ligne).
3. **Ressources chargées :**
   - `execution-protocol.md` ;
   - `snippets.md` (modèle d'écran et motif de provider Riverpod) ;
   - `screen-template.dart`.
4. **Contrat d'exécution (lorsqu'il est activé) :** il peut émettre un `CHARTER_CHECK` :
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **Implémentation :**
   - écran : `lib/features/settings/presentation/settings_screen.dart` (widget Stateless avec Riverpod) ;
   - providers : `lib/features/settings/providers/settings_provider.dart` ;
   - dépôt : `lib/features/settings/data/settings_repository.dart` ;
   - fonctionnement hors ligne : l'intercepteur Dio intercepte `SocketException` et utilise les données en cache ;
   - tous les contrôleurs sont libérés dans la méthode `dispose()`.
<!-- oma-docs:ignore-end -->

---

### Base de données : conception du schéma

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**Déroulement attendu :**

1. **Routage de la compétence :** l'hôte ou le workflow sélectionne `oma-db` (des mots-clés comme « database », « schema », « ERD » et « migration » servent de signaux de routage).
2. **Évaluation de la difficulté :** complexe (décisions d'architecture, plusieurs entités et planification de capacité).
3. **Ressources chargées :**
   - `execution-protocol.md` ;
   - `document-templates.md` (structure des livrables) ;
   - `examples.md` ;
   - `anti-patterns.md` (à consulter pendant l'optimisation).
4. **Contrat d'exécution (lorsqu'il est activé) :** il peut émettre un `CHARTER_CHECK` :
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow :** explorer (entités, relations, modes d'accès et estimations de volume) → concevoir (schémas externe, conceptuel et interne, contraintes et champs de cycle de vie) → optimiser (index pour les requêtes, stratégie de partitionnement, plan de sauvegarde et revue des anti-patterns).
6. **Livrables :**
   - résumé du schéma externe (vues par rôle : administrateur, responsable de projet, membre de l'équipe) ;
   - schéma conceptuel avec ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, etc.) ;
   - schéma interne avec DDL physique, index et partitionnement ;
   - tableau des standards de données (règles de nommage des champs et conventions de types) ;
   - glossaire (tenant, workspace, assignee, etc.) ;
   - feuille d'estimation de capacité ;
   - stratégie de sauvegarde (complète quotidienne + incrémentielle horaire, conservation de 30 jours) ;
   - script de migration.

---

## Liste de contrôle du quality gate

Après la livraison de l'agent, vérifiez ces éléments avant de l'accepter :

### Vérifications universelles (tous les agents)

- [ ] **Le comportement correspond aux critères d'acceptation :** chaque critère du prompt est satisfait.
- [ ] **Les tests couvrent le chemin nominal et les principaux cas limites :** pas seulement le cas nominal.
- [ ] **Aucun fichier sans rapport :** seuls les fichiers pertinents pour la tâche ont été modifiés.
- [ ] **Les modules partagés restent fonctionnels :** les imports, types et interfaces utilisés ailleurs fonctionnent toujours.
- [ ] **La charte a été respectée :** les contraintes « Must NOT do » ont été suivies.
- [ ] **Le lint, le typecheck et le build passent :** exécutez les vérifications standard du projet.

### Spécifique au frontend

- [ ] Accessibilité : les éléments interactifs ont un `aria-label`, les titres sont sémantiques et la navigation au clavier fonctionne.
- [ ] Mobile : le rendu est correct aux points de rupture 320px, 768px, 1024px et 1440px.
- [ ] Performances : aucun CLS et objectif FCP atteint.
- [ ] Les error boundaries et les skeletons de chargement sont implémentés.
- [ ] Les composants shadcn/ui ne sont pas modifiés directement (utilisez des wrappers).
- [ ] Imports absolus avec `@/` (aucun `../../` relatif).

### Spécifique au backend

- [ ] Architecture propre respectée : aucune logique métier dans les gestionnaires de routes.
- [ ] Toutes les entrées sont validées (aucune confiance aveugle envers les entrées utilisateur).
- [ ] Requêtes paramétrées uniquement (aucune interpolation de chaîne dans SQL).
- [ ] Exceptions personnalisées via le module d'erreurs centralisé (aucune exception HTTP brute).
- [ ] Les endpoints d'authentification sont limités en débit.

### Spécifique au mobile

- [ ] Tous les contrôleurs sont libérés dans la méthode `dispose()`.
- [ ] Le mode hors ligne est géré correctement.
- [ ] L'objectif de 60 fps est respecté (aucune saccade).
- [ ] Tests exécutés sur iOS et Android.

### Spécifique à la base de données

- [ ] Au moins la 3NF (ou justification documentée de la dénormalisation).
- [ ] Les trois couches du schéma sont documentées (externe, conceptuelle et interne).
- [ ] Les contraintes d'intégrité sont explicites (entité, domaine, référentielle et règle métier).
- [ ] La revue des anti-patterns est terminée.

---

## Signaux d'escalade

Surveillez ces signaux : ils indiquent qu'il faut passer d'une exécution à compétence unique au mode multi-agent :

| Signal | Ce que cela signifie | Action |
|--------|----------------------|--------|
| L'agent dit « cette tâche nécessite une modification backend » | La tâche comporte des dépendances entre domaines. | Passez à `/work` et ajoutez un agent backend. |
| Le CHARTER_CHECK de l'agent contient des éléments « Must NOT do » qui sont en fait nécessaires | Le périmètre dépasse un seul domaine. | Planifiez toute la fonctionnalité avec `/plan` d'abord. |
| Une correction se propage à 3 fichiers ou plus entre plusieurs couches | Une correction touche plusieurs domaines. | Utilisez `/debug` avec un périmètre plus large, ou `/work`. |
| L'agent découvre un désaccord sur le contrat d'API | Le frontend et le backend ne sont pas alignés. | Exécutez `/plan` pour définir les contrats, puis relancez les deux agents. |
| Le quality gate échoue sur les points d'intégration | Les composants ne se connectent pas correctement. | Exécutez `/review`, ou ajoutez une passe QA : `oma agent spawn qa "Review the integration" SESSION_ID --read-only`. |
| La tâche passe de « un composant » à « trois composants + nouvelle route + API » | Le périmètre dérive pendant l'exécution. | Arrêtez, exécutez `/plan` pour décomposer, puis `/orchestrate`. |
| L'agent bloque pour une clarification HIGH | Les exigences sont fondamentalement ambiguës. | Répondez aux questions de l'agent ou lancez `/brainstorm` pour clarifier l'approche. |

### Règle pratique

Si vous relancez le même agent plus de deux fois avec des précisions, la tâche couvre probablement plusieurs domaines. Exécutez `/work`, ou au moins `/plan`, pour la décomposer.

---

## Étapes suivantes

- La tâche couvre plusieurs domaines : [Projets multi-agents](./multi-agent-project.md)
- La tâche est un bug : [Correction de bugs](./bug-fixing.md)
- Auditer ou reprendre une exécution : [Résultats et reprise](./agent-results-and-resume.md)
- Quelque chose a échoué : [Dépannage](./troubleshooting.md)
- Choisir entre une compétence et un workflow : [Workflows](../core-concepts/workflows.md#choosing-a-skill-or-workflow)
