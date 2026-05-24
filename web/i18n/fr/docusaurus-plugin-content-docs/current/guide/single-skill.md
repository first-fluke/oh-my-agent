---
title: "Cas d'Usage : Compétence Unique"
description: Quand vous avez juste besoin d'un agent pour une tâche ciblée — la voie rapide.
---

# Exécution d'une compétence unique

L'exécution d'une compétence unique est la voie rapide -- un agent, un domaine, une tâche ciblée. Pas de surcoût d'orchestration, pas de coordination multi-agents. La compétence s'active automatiquement depuis votre prompt en langage naturel.

---

## Quand utiliser une compétence unique

Utilisez cela lorsque votre tâche remplit TOUS ces critères :

- **Appartient à un seul domaine** -- la tâche entière relève du frontend, backend, mobile, base de données, design, infrastructure ou d'un autre domaine unique
- **Autonome** -- pas de changements de contrats d'API inter-domaines, pas de modifications backend nécessaires pour une tâche frontend
- **Périmètre clair** -- vous savez ce que le résultat devrait être (un composant, un endpoint, un schéma, une correction)
- **Pas de coordination** -- aucun autre agent n'a besoin de s'exécuter avant ou après

**Exemples de tâches à compétence unique :**
- Construire un composant UI
- Ajouter un endpoint d'API
- Corriger un bug dans une seule couche
- Concevoir une table de base de données
- Écrire un module Terraform
- Traduire un ensemble de chaînes i18n
- Créer une section de design system

**Passer en multi-agents** (`/work` ou `/orchestrate`) lorsque :
- Un travail UI nécessite un nouveau contrat d'API (frontend + backend)
- Une correction se propage à plusieurs couches (agents debug + implémentation)
- La fonctionnalité couvre frontend, backend et base de données
- Le périmètre dépasse un seul domaine après la première itération

---

## Checklist préalable

Avant de rédiger le prompt, répondez à ces quatre questions (elles correspondent aux quatre éléments de la [Structure de prompt](/docs/core-concepts/skills)) :

| Élément | Question | Pourquoi c'est important |
|---------|----------|--------------------------|
| **Goal** | Quel artefact spécifique doit être créé ou modifié ? | Évite l'ambiguïté, « ajouter un bouton » vs « ajouter un formulaire avec validation » |
| **Context** | Quel stack, framework et conventions s'appliquent ? | L'agent détecte depuis les fichiers du projet, mais l'explicite est préférable |
| **Constraints** | Quelles règles doivent être respectées ? (style, sécurité, performance, compatibilité) | Sans contraintes, les agents appliquent des valeurs par défaut qui peuvent ne pas correspondre à votre projet |
| **Done When** | Quels critères d'acceptation allez-vous vérifier ? | Donne à l'agent une cible et à vous une checklist de vérification |

Si l'un de ces éléments manque dans votre prompt, l'agent va, selon le cas :
- **Incertitude LOW :** appliquer les valeurs par défaut et lister les hypothèses
- **Incertitude MEDIUM :** présenter 2 à 3 options et continuer avec la plus probable
- **Incertitude HIGH :** bloquer et poser des questions (ne produira pas de code)

---

## Modèle de prompt

```text
Construis <artefact spécifique> avec <stack/framework>.
Contraintes : <contraintes de style, performance, sécurité ou compatibilité>.
Critères d'acceptation :
1) <critère testable>
2) <critère testable>
3) <critère testable>
Ajoute des tests pour : <cas de test critiques>.
```

### Décomposition du modèle

| Élément | Objet | Exemple |
|---------|-------|---------|
| `Construis <artefact spécifique>` | Le Goal, ce qui doit être créé | « Construis un composant de formulaire d'inscription utilisateur » |
| `avec <stack/framework>` | Le Context, le stack technique | « avec React + TypeScript + Tailwind CSS » |
| `Contraintes :` | Règles que l'agent doit respecter | « labels accessibles, aucune bibliothèque de formulaire externe, validation côté client uniquement » |
| `Critères d'acceptation :` | Done When, résultats vérifiables | « 1) validation du format d'email 2) indicateur de force du mot de passe 3) submit désactivé tant que invalide » |
| `Ajoute des tests pour :` | Exigences de tests | « chemins submit valide/invalide, cas limites de validation d'email » |

---

## Exemples concrets

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

**Flux d'exécution attendu :**

1. **Activation de la compétence :** `oma-frontend` s'active (mots-clés : « form », « component », « Tailwind CSS », « React »)
2. **Évaluation de la difficulté :** Moyenne (2-3 fichiers, quelques décisions de conception autour de l'UX de validation)
3. **Ressources chargées :**
   - `execution-protocol.md` (toujours)
   - `snippets.md` (patterns formulaire + Zod)
   - `component-template.tsx` (structure React)
4. **Sortie CHARTER_CHECK :**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
5. **Implémentation :**
   - Crée `src/features/auth/components/login-form.tsx` (Client Component avec `"use client"`)
   - Crée `src/features/auth/utils/login-schema.ts` (schéma Zod)
   - Crée `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Utilise shadcn/ui `<Button>`, `<Input>`, `<Label>` (lecture seule, sans modification)
   - Formulaire géré par `@tanstack/react-form` avec validation Zod
   - Imports absolus avec `@/`
   - Un composant par fichier
6. **Vérification :**
   - Checklist : labels ARIA présents, titres sémantiques, navigation clavier fonctionnelle
   - Mobile : s'affiche correctement à 320 px de viewport
   - Performance : pas de CLS
   - Tests : fichier de test Vitest à `src/features/auth/utils/__tests__/login-schema.test.ts`

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

**Flux d'exécution attendu :**

1. **Activation de la compétence :** `oma-backend` s'active (mots-clés : « API », « endpoint », « REST »)
2. **Détection du stack :** lit `pyproject.toml` ou `package.json` pour déterminer le langage/framework. Si `stack/` existe, charge les conventions depuis ce répertoire.
3. **Évaluation de la difficulté :** Moyenne (2-3 fichiers : route, service, repository, plus tests)
4. **Ressources chargées :**
   - `execution-protocol.md` (toujours)
   - `stack/snippets.md` si disponible (patterns de route, de requête paginée)
   - `stack/tech-stack.md` si disponible (API spécifique au framework)
5. **CHARTER_CHECK :**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implémentation :**
   - Repository : `TaskRepository.find_by_user(user_id, cursor, status, limit)` avec requête paramétrée
   - Service : `TaskService.get_user_tasks(user_id, cursor, status, limit)`, wrapper de logique métier
   - Router : `GET /api/tasks` avec middleware d'authentification JWT, validation d'entrée, formatage de réponse
   - Tests : auth requise renvoie 401, la pagination renvoie le bon curseur, le filtre fonctionne, le cas vide renvoie 200 avec un tableau vide

---

### Mobile : écran de paramètres

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

**Flux d'exécution attendu :**

1. **Activation de la compétence :** `oma-mobile` s'active (mots-clés : « Flutter », « screen », « mobile »)
2. **Évaluation de la difficulté :** Moyenne (écran de paramètres + gestion d'état + gestion hors-ligne)
3. **Ressources chargées :**
   - `execution-protocol.md`
   - `snippets.md` (modèle d'écran, pattern de provider Riverpod)
   - `screen-template.dart`
4. **CHARTER_CHECK :**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
5. **Implémentation :**
   - Écran : `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget avec Riverpod)
   - Providers : `lib/features/settings/providers/settings_provider.dart`
   - Repository : `lib/features/settings/data/settings_repository.dart`
   - Gestion hors-ligne : un intercepteur Dio attrape `SocketException` et bascule sur les données en cache
   - Tous les contrôleurs libérés dans la méthode `dispose()`

---

### Base de données : conception de schéma

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

**Flux d'exécution attendu :**

1. **Activation de la compétence :** `oma-db` s'active (mots-clés : « database », « schema », « ERD », « migration »)
2. **Évaluation de la difficulté :** Complexe (décisions d'architecture, plusieurs entités, planification de capacité)
3. **Ressources chargées :**
   - `execution-protocol.md`
   - `document-templates.md` (structure des livrables)
   - `examples.md`
   - `anti-patterns.md` (revue durant l'optimisation)
4. **CHARTER_CHECK :**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow :** Explorer (entités, relations, patterns d'accès, estimations de volume) -> Concevoir (schémas externe/conceptuel/interne, contraintes, champs de cycle de vie) -> Optimiser (index pour les patterns de requête, stratégie de partitionnement, plan de sauvegarde, revue d'anti-patterns)
6. **Livrables :**
   - Résumé du schéma externe (vues par rôle : admin, chef de projet, membre d'équipe)
   - Schéma conceptuel avec ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, etc.)
   - Schéma interne avec DDL physique, index, partitionnement
   - Tableau des standards de données (règles de nommage des champs, conventions de types)
   - Glossaire (tenant, workspace, assignee, etc.)
   - Feuille d'estimation de capacité
   - Stratégie de sauvegarde (full quotidienne + incrémentale horaire, rétention 30 jours)
   - Script de migration

---

## Checklist des portes de qualité

Une fois la sortie de l'agent livrée, vérifiez ces éléments avant de l'accepter :

### Vérifications universelles (tous les agents)

- [ ] **Le comportement correspond aux critères d'acceptation** — chaque critère de votre prompt est satisfait
- [ ] **Les tests couvrent le chemin nominal et les cas limites clés** — pas seulement le chemin nominal
- [ ] **Aucune modification de fichier non liée** — seuls les fichiers pertinents pour la tâche ont été modifiés
- [ ] **Les modules partagés ne sont pas cassés** — imports, types et interfaces utilisés par d'autre code fonctionnent encore
- [ ] **Le charter a été respecté** — les contraintes « Must NOT do » ont été tenues
- [ ] **Lint, typecheck, build passent** — exécutez les vérifications standard de votre projet

### Spécifique au frontend

- [ ] Accessibilité : les éléments interactifs ont `aria-label`, titres sémantiques, navigation clavier fonctionnelle
- [ ] Mobile : s'affiche correctement aux breakpoints 320 px, 768 px, 1024 px, 1440 px
- [ ] Performance : pas de CLS, objectif FCP atteint
- [ ] Error boundaries et loading skeletons implémentés
- [ ] Composants shadcn/ui non modifiés directement (utilisation de wrappers à la place)
- [ ] Imports absolus avec `@/` (pas de chemin relatif `../../`)

### Spécifique au backend

- [ ] Architecture propre maintenue : pas de logique métier dans les handlers de route
- [ ] Toutes les entrées validées (aucune confiance dans l'entrée utilisateur)
- [ ] Requêtes paramétrées uniquement (pas d'interpolation de chaînes dans le SQL)
- [ ] Exceptions personnalisées via un module d'erreur centralisé (pas d'exceptions HTTP brutes)
- [ ] Endpoints d'authentification rate-limited

### Spécifique au mobile

- [ ] Tous les contrôleurs libérés dans la méthode `dispose()`
- [ ] Hors-ligne géré avec élégance
- [ ] Objectif 60 fps maintenu (pas de jank)
- [ ] Testé sur iOS et Android

### Spécifique à la base de données

- [ ] Au moins 3NF (ou justification documentée pour la dénormalisation)
- [ ] Les trois couches de schéma documentées (externe, conceptuelle, interne)
- [ ] Contraintes d'intégrité explicites (entité, domaine, référentielle, règle métier)
- [ ] Revue d'anti-patterns effectuée

---

## Signaux d'escalade

Surveillez ces signaux qui indiquent qu'il faut passer du mode compétence unique au mode multi-agents :

| Signal | Ce que ça signifie | Action |
|--------|--------------------|--------|
| L'agent dit « this requires a backend change » | La tâche a des dépendances inter-domaines | Passer à `/work`, ajouter l'agent backend |
| Le CHARTER_CHECK de l'agent fait apparaître des éléments « Must NOT do » qui sont en réalité nécessaires | Le périmètre dépasse un seul domaine | Planifier la fonctionnalité complète avec `/plan` d'abord |
| Une correction se propage à 3 fichiers ou plus à travers différentes couches | Une seule correction affecte plusieurs domaines | Utiliser `/debug` avec un périmètre plus large, ou `/work` |
| L'agent découvre une incohérence de contrat d'API | Désaccord frontend/backend | Exécuter `/plan` pour définir les contrats, puis relancer les deux agents |
| La porte de qualité échoue sur les points d'intégration | Les composants ne se connectent pas correctement | Ajouter une étape de revue QA : `oma agent:spawn qa "Review integration"` |
| La tâche passe de « un composant » à « trois composants + nouvelle route + API » | Glissement de périmètre en cours d'exécution | Arrêter, exécuter `/plan` pour décomposer, puis `/orchestrate` |
| L'agent bloque avec une clarification HIGH | Exigences fondamentalement ambiguës | Répondre aux questions de l'agent ou exécuter `/brainstorm` pour clarifier l'approche |

### La règle générale

Si vous vous retrouvez à relancer le même agent plus de deux fois avec des ajustements, la tâche est probablement multi-domaine et nécessite `/work` ou au minimum une étape `/plan` pour la décomposer correctement.
