---
title: Agents
description: Référence complète des 21 agents oh-my-agent — leurs domaines, stacks technologiques, fichiers de ressources, capacités, protocole de vérification charter, chargement des compétences en deux couches, règles d'exécution limitée, portes de qualité, stratégie de workspaces, flux d'orchestration et mémoire d'exécution.
---

# Agents

Les agents dans oh-my-agent sont des rôles d'ingénierie spécialisés. Chaque agent possède un domaine défini, des connaissances de stack technique, des fichiers de ressources, des portes de qualité et des contraintes d'exécution. Les agents ne sont pas des chatbots génériques -- ce sont des travailleurs au périmètre délimité qui restent dans leur voie et suivent des protocoles structurés.

---

## Catégories d'agents

| Catégorie | Agents | Responsabilité |
|-----------|--------|----------------|
| **Idéation** | oma-brainstorm | Explorer des idées, proposer des approches, produire des documents de conception |
| **Architecture** | oma-architecture | Frontières système/module/service, analyse façon ADR/ATAM/CBAM, enregistrements de compromis |
| **Planification** | oma-pm | Décomposition des exigences, découpage des tâches, contrats d'API, attribution des priorités |
| **Implémentation** | oma-frontend, oma-backend, oma-mobile, oma-db | Écrire du code de production dans leurs domaines respectifs |
| **Design** | oma-design | Systèmes de design, DESIGN.md, tokens, typographie, couleur, animation, accessibilité |
| **Infrastructure** | oma-tf-infra | Provisionnement Terraform multi-cloud, IAM, optimisation des coûts, policy-as-code |
| **DevOps** | oma-dev-workflow | Task runner mise, CI/CD, migrations, coordination des releases, automatisation monorepo |
| **Observabilité** | oma-observability | Pipelines d'observabilité, routage de traçabilité, signaux MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), gestion des SLO, investigation d'incidents, réglage du transport |
| **Qualité** | oma-qa | Audit de sécurité (OWASP), performance, accessibilité (WCAG), revue de qualité du code |
| **Débogage** | oma-debug | Reproduction de bugs, analyse de cause profonde, corrections minimales, tests de régression |
| **Localisation** | oma-translator | Traduction contextuelle préservant le ton, le registre et les termes du domaine |
| **Coordination** | oma-orchestrator, oma-coordination | Orchestration multi-agents automatisée et manuelle |
| **Git** | oma-scm | Génération de Conventional Commits, découpage de commits par fonctionnalité |
| **Recherche et Récupération** | oma-search | Routeur de recherche basé sur l'intention avec scoring de confiance (documents Context7, web, code `gh`/`glab`, Serena local) |
| **Rétrospective** | oma-recap | Analyse d'historique de conversation inter-outils et résumés de travail thématiques |
| **Traitement de documents** | oma-hwp, oma-pdf | Conversion de HWP/HWPX/HWPML et PDF en Markdown pour ingestion LLM/RAG |

---

## Référence détaillée des agents

### oma-brainstorm

**Domaine :** Idéation axée sur le design, avant la planification ou l'implémentation.

**Quand l'utiliser :** Explorer une nouvelle idée de fonctionnalité, comprendre l'intention de l'utilisateur, comparer les approches. À utiliser avant `/plan` pour les demandes complexes ou ambiguës.

**Quand NE PAS l'utiliser :** Exigences claires (utiliser oma-pm), implémentation (utiliser les agents de domaine), revue de code (utiliser oma-qa).

**Règles fondamentales :**
- Aucune implémentation ni planification avant l'approbation du design
- Une question de clarification à la fois (pas par lots)
- Toujours proposer 2 à 3 approches avec une option recommandée
- Conception section par section avec confirmation de l'utilisateur à chaque étape
- YAGNI -- ne concevoir que le nécessaire

**Workflow :** 6 phases : Exploration du contexte, Questions, Approches, Design, Documentation (enregistre dans `docs/plans/`), Transition vers `/plan`.

**Ressources :** Utilise uniquement les ressources partagées (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-architecture

**Domaine :** Architecture logicielle/système -- frontières de modules et services, analyse de compromis, synthèse des parties prenantes, enregistrements de décisions.

**Quand l'utiliser :** Choisir ou revoir l'architecture système, définir les frontières module/service/ownership, comparer des options architecturales avec des compromis explicites, enquêter sur des douleurs architecturales (amplification des changements, dépendances cachées, APIs maladroites), prioriser des investissements ou des refactorings architecturaux, rédiger des recommandations d'architecture ou des ADRs.

**Quand NE PAS l'utiliser :** Systèmes visuels/de design (utiliser oma-design), planification de fonctionnalités et décomposition de tâches (utiliser oma-pm), implémentation Terraform (utiliser oma-tf-infra), diagnostic de bugs (utiliser oma-debug), revue de sécurité/performance/accessibilité (utiliser oma-qa).

**Méthodologies :** Routage diagnostique, comparaison design-twice, analyse de risque façon ATAM, priorisation façon CBAM, enregistrements de décisions façon ADR.

**Règles fondamentales :**
- Diagnostiquer le problème architectural avant de sélectionner une méthode
- Utiliser la méthodologie la plus légère mais suffisante pour la décision actuelle
- Distinguer la conception architecturale du design UI/visuel et de la livraison Terraform
- Consulter les agents des parties prenantes uniquement lorsque la décision est suffisamment transversale pour justifier le coût
- La qualité de la recommandation importe plus que la mise en scène du consensus : consulter largement, décider explicitement
- Chaque recommandation doit énoncer les hypothèses, compromis, risques et étapes de validation
- Être conscient des coûts par défaut : coût d'implémentation, coût opérationnel, complexité de l'équipe, coût des évolutions futures

**Ressources :** `SKILL.md`, répertoire `resources/` avec guides méthodologiques (diagnostic-routing, design-twice, ATAM, CBAM, modèles ADR).

---

### oma-pm

**Domaine :** Gestion de produit -- analyse des exigences, décomposition des tâches, contrats d'API.

**Quand l'utiliser :** Décomposer des fonctionnalités complexes, déterminer la faisabilité, prioriser le travail, définir des contrats d'API.

**Règles fondamentales :**
- Conception API-first : définir les contrats avant les tâches d'implémentation
- Chaque tâche comporte : agent, titre, critères d'acceptation, priorité, dépendances
- Minimiser les dépendances pour une exécution parallèle maximale
- La sécurité et les tests font partie intégrante de chaque tâche (pas de phases séparées)
- Les tâches doivent être réalisables par un seul agent
- Sortie : plan JSON + task-board.md pour la compatibilité avec l'orchestrateur

**Sortie :** `.agents/results/plan-{sessionId}.json`, `.agents/brain/current-plan.md`, écriture en mémoire pour l'orchestrateur.

**Ressources :** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Limites de tours :** Par défaut 10, maximum 15.

---

### oma-frontend

**Domaine :** UI Web -- React, Next.js, TypeScript avec architecture FSD-lite.

**Quand l'utiliser :** Construire des interfaces utilisateur, des composants, de la logique côté client, du styling, de la validation de formulaires, de l'intégration API.

**Stack technique :**
- React + Next.js (Server Components par défaut, Client Components pour l'interactivité)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (primitives en lecture seule, extension via cva/wrappers)
- FSD-lite : racine `src/` + fonctionnalités `src/features/*/` (pas d'imports inter-fonctionnalités)

**Bibliothèques :**
| Usage | Bibliothèque |
|-------|-------------|
| Dates | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks |
| Utilitaires | es-toolkit |
| État URL | nuqs |
| État serveur | TanStack Query |
| État client | Jotai (minimiser l'usage) |
| Formulaires | @tanstack/react-form + Zod |
| Authentification | better-auth |

**Règles fondamentales :**
- shadcn/ui en priorité, extension via cva, ne jamais modifier `components/ui/*` directement
- Mapping 1:1 des tokens de design (ne jamais coder les couleurs en dur)
- Proxy plutôt que middleware (Next.js 16+ utilise `proxy.ts`, pas `middleware.ts` pour la logique proxy)
- Pas de prop drilling au-delà de 3 niveaux -- utiliser les atoms Jotai
- Imports absolus avec `@/` obligatoires
- Objectif FCP < 1 s
- Breakpoints responsifs : 320 px, 768 px, 1024 px, 1440 px

**Ressources :** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Checklist des portes de qualité :**
- Accessibilité : labels ARIA, titres sémantiques, navigation au clavier
- Mobile : vérifié sur les viewports mobiles
- Performance : pas de CLS, chargement rapide
- Résilience : Error Boundaries et Loading Skeletons
- Tests : logique couverte par Vitest
- Qualité : typecheck et lint passent

**Limites de tours :** Par défaut 20, maximum 30.

---

### oma-backend

**Domaine :** API, logique côté serveur, authentification, opérations de base de données.

**Quand l'utiliser :** API REST/GraphQL, migrations de base de données, authentification, logique métier serveur, tâches de fond.

**Architecture :** Router (HTTP) -> Service (logique métier) -> Repository (accès aux données) -> Models.

**Détection de stack :** Lit les manifestes du projet (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) pour déterminer le langage et le framework. Se rabat sur le répertoire `stack/` si présent, ou demande à l'utilisateur d'exécuter `/stack-set`.

**Règles fondamentales :**
- Architecture propre : pas de logique métier dans les handlers de routes
- Toutes les entrées validées avec la bibliothèque de validation du projet
- Requêtes paramétrées uniquement (jamais d'interpolation de chaînes dans le SQL)
- JWT + bcrypt pour l'authentification ; limiter le débit des endpoints d'auth
- Asynchrone quand c'est supporté ; annotations de type sur toutes les signatures
- Exceptions personnalisées via un module d'erreur centralisé
- Stratégie de chargement ORM explicite, limites de transactions, cycle de vie sécurisé

**Ressources :** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Ressources spécifiques au stack dans `stack/` (générées par `/stack-set`) : `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Limites de tours :** Par défaut 20, maximum 30.

---

### oma-mobile

**Domaine :** Applications mobiles multiplateformes -- Flutter, React Native.

**Quand l'utiliser :** Applications mobiles natives (iOS + Android), patterns UI spécifiques au mobile, fonctionnalités de plateforme (caméra, GPS, notifications push), architecture offline-first.

**Architecture :** Clean Architecture : domain -> data -> presentation.

**Stack technique :** Flutter/Dart, Riverpod/Bloc (gestion d'état), Dio avec intercepteurs (API), GoRouter (navigation), Material Design 3 (Android) + iOS HIG.

**Règles fondamentales :**
- Riverpod/Bloc pour la gestion d'état (pas de setState brut pour la logique complexe)
- Tous les contrôleurs libérés dans la méthode `dispose()`
- Dio avec intercepteurs pour les appels API ; gérer le mode hors ligne avec élégance
- Objectif 60 fps ; tester sur les deux plateformes

**Ressources :** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Limites de tours :** Par défaut 20, maximum 30.

---

### oma-db

**Domaine :** Architecture de bases de données -- SQL, NoSQL, bases de données vectorielles.

**Quand l'utiliser :** Conception de schéma, ERD, normalisation, indexation, transactions, planification de capacité, stratégie de sauvegarde, conception de migrations, architecture de bases vectorielles/RAG, revue d'anti-patterns, conception conforme aux normes (ISO 27001/27002/22301).

**Workflow par défaut :** Explorer (identifier les entités, les patterns d'accès, le volume) -> Concevoir (schéma, contraintes, transactions) -> Optimiser (index, partitionnement, archivage, anti-patterns).

**Règles fondamentales :**
- Choisir le modèle d'abord, le moteur ensuite
- 3NF par défaut pour le relationnel ; documenter les compromis BASE pour le distribué
- Documenter les trois couches de schéma : externe, conceptuelle, interne
- L'intégrité est de première classe : entité, domaine, référentielle, règle métier
- La concurrence n'est jamais implicite : définir les limites de transactions et les niveaux d'isolation
- Les bases vectorielles sont une infrastructure de recherche, pas une source de vérité
- Ne jamais traiter la recherche vectorielle comme un remplacement direct de la recherche lexicale

**Livrables requis :** Résumé du schéma externe, schéma conceptuel, schéma interne, tableau de normes de données, glossaire, estimation de capacité, stratégie de sauvegarde/récupération. Pour les bases vectorielles/RAG : politique de version des embeddings, politique de découpage, stratégie de recherche hybride.

**Ressources :** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domaine :** Systèmes de design, UI/UX, gestion de DESIGN.md.

**Quand l'utiliser :** Créer des systèmes de design, des pages d'atterrissage, des tokens de design, des palettes de couleurs, de la typographie, des mises en page responsives, des revues d'accessibilité.

**Workflow :** 7 phases : Setup (collecte du contexte) -> Extract (optionnel, depuis des URL de référence) -> Enhance (enrichissement de prompts vagues) -> Propose (2 à 3 directions de design) -> Generate (DESIGN.md + tokens) -> Audit (responsive, WCAG, Nielsen, vérification anti AI slop) -> Handoff.

**Application des anti-patterns (« no AI slop ») :**
- Typographie : stack de polices système par défaut ; pas de Google Fonts par défaut sans justification
- Couleur : pas de dégradés violet-bleu, pas d'orbes/blobs en dégradé, pas de blanc pur sur noir pur
- Mise en page : pas de cartes imbriquées, pas de mises en page uniquement desktop, pas de layouts génériques à 3 métriques
- Animation : pas de rebond partout, pas d'animations > 800 ms, respecter prefers-reduced-motion
- Composants : pas de glassmorphisme partout, tous les éléments interactifs nécessitent des alternatives clavier/tactile

**Règles fondamentales :**
- Vérifier `.design-context.md` d'abord ; le créer si manquant
- Stack de polices système par défaut (polices CJK-ready pour ko/ja/zh)
- WCAG AA minimum pour tous les designs
- Responsive-first (mobile par défaut)
- Présenter 2 à 3 directions, obtenir confirmation

**Ressources :** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, plus le répertoire `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d) et `examples/` (design-context-example, landing-page-prompt).

---

### oma-tf-infra

**Domaine :** Infrastructure-as-code avec Terraform, multi-cloud.

**Quand l'utiliser :** Provisionnement sur AWS/GCP/Azure/Oracle Cloud, configuration Terraform, authentification CI/CD (OIDC), CDN/load balancers/stockage/réseau, gestion d'état, infrastructure conforme ISO.

**Détection cloud :** Lit les fournisseurs Terraform et les préfixes de ressources (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Inclut un tableau complet de mapping de ressources multi-cloud.

**Règles fondamentales :**
- Agnostique au fournisseur : détecter le cloud depuis le contexte du projet
- État distant avec versionnement et verrouillage
- OIDC en priorité pour l'authentification CI/CD
- Toujours planifier avant d'appliquer
- IAM au moindre privilège
- Tout taguer (Environment, Project, Owner, CostCenter)
- Pas de secrets dans le code
- Épingler les versions de tous les fournisseurs et modules
- Pas d'auto-approve en production

**Ressources :** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domaine :** Automatisation de tâches monorepo et CI/CD.

**Quand l'utiliser :** Lancer des serveurs de développement, exécuter lint/format/typecheck sur les applications, migrations de base de données, génération d'API, builds i18n, builds de production, optimisation CI/CD, validation pre-commit.

**Règles fondamentales :**
- Toujours utiliser les tâches `mise run` au lieu de commandes directes du gestionnaire de paquets
- Exécuter lint/test uniquement sur les applications modifiées
- Valider les messages de commit avec commitlint
- La CI doit ignorer les applications non modifiées
- Ne jamais utiliser de commandes directes du gestionnaire de paquets lorsque des tâches mise existent

**Ressources :** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**Domaine :** Routeur d'observabilité et de traçabilité basé sur l'intention, à travers les couches, les frontières et les signaux.

**Quand l'utiliser :** Mise en place de pipelines d'observabilité (OTel SDK + Collector + backend d'éditeur), traçabilité à travers les frontières de services et de domaines (propagateurs W3C, baggage, multi-tenant, multi-cloud), réglage du transport (seuils UDP/MTU, OTLP gRPC vs HTTP, topologie Collector DaemonSet vs sidecar, recettes de sampling), investigation d'incidents (localisation en 6 dimensions : code / service / layer / host / region / infra), sélection de catégorie d'éditeur (OSS full-stack vs SaaS commercial vs spécialiste haute cardinalité vs spécialiste profiling), observability-as-code (tableaux de bord Grafana Jsonnet, CRD PrometheusRule, YAML OpenSLO, alertes SLO burn-rate), méta-observabilité (santé propre du pipeline, dérive d'horloge, garde-fous de cardinalité, matrice de rétention), couverture des signaux MELT+P (metrics, logs, traces, profiles, cost, audit, privacy), migration depuis des outils obsolètes (Fluentd -> Fluent Bit ou OTel Collector).

**Quand NE PAS l'utiliser :** Observabilité LLM ops / gen_ai (utiliser Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage de pipelines de données (OpenLineage + Marquez, dbt test, Airflow lineage), télémétrie de couche physique IoT / datacenter (Nlyte, Sunbird, Device42), orchestration de chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), infrastructure GPU / TPU (NVIDIA DCGM Exporter), chaîne d'approvisionnement logicielle (sigstore, in-toto, SLSA), workflow de réponse à incident / paging (PagerDuty, OpsGenie, Grafana OnCall), configuration mono-éditeur déjà couverte par le skill propre de cet éditeur.

**Règles fondamentales :**
- Classer l'intention avant le routage : setup | migrate | investigate | alert | trace | tune | route
- Catégorie d'abord, pas de registre d'éditeurs : déléguer aux skills d'éditeur via `resources/vendor-categories.md` ; ne pas dupliquer la documentation d'éditeur
- Le réglage du transport est le fossé : seuils UDP/MTU, sélection du protocole OTLP, topologie du Collector et recettes de sampling sont une profondeur que les autres skills ne couvrent pas
- La méta-observabilité n'est pas négociable : valider santé propre du pipeline, synchronisation d'horloge (< 100 ms de dérive), cardinalité et rétention avant de déclarer la configuration terminée
- Préférence CNCF-first : Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd est obsolète (CNCF 2025-10) : recommander Fluent Bit ou OTel Collector pour les nouveaux travaux et la migration
- W3C Trace Context comme propagateur par défaut ; traduire par cloud (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Vie privée avant fonctionnalités : rédaction des PII, règles de baggage conscientes du sampling, audit immuable SOC2/ISO + effacement GDPR/PIPA appliqués à la collecte, pas seulement au stockage

**Ressources :** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, plus ressources approfondies sous `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) et `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domaine :** Assurance qualité -- sécurité, performance, accessibilité, qualité du code.

**Quand l'utiliser :** Revue finale avant déploiement, audits de sécurité, analyse de performance, conformité accessibilité, analyse de la couverture de tests.

**Ordre de priorité de revue :** Sécurité > Performance > Accessibilité > Qualité du code.

**Niveaux de sévérité :**
- **CRITICAL** : Faille de sécurité, risque de perte de données
- **HIGH** : Bloque le lancement
- **MEDIUM** : À corriger ce sprint
- **LOW** : Backlog

**Règles fondamentales :**
- Chaque constat doit inclure fichier:ligne, description et correction
- Exécuter d'abord les outils automatisés (npm audit, bandit, lighthouse)
- Pas de faux positifs -- chaque constat doit être reproductible
- Fournir du code de remédiation, pas seulement des descriptions

**Ressources :** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Limites de tours :** Par défaut 15, maximum 20.

---

### oma-debug

**Domaine :** Diagnostic et correction de bugs.

**Quand l'utiliser :** Bugs signalés par les utilisateurs, plantages, problèmes de performance, défaillances intermittentes, conditions de concurrence, bugs de régression.

**Méthodologie :** Reproduire d'abord, diagnostiquer ensuite. Ne jamais deviner les corrections.

**Règles fondamentales :**
- Identifier la cause profonde, pas seulement les symptômes
- Correction minimale : ne modifier que le nécessaire
- Chaque correction est accompagnée d'un test de régression
- Rechercher des motifs similaires ailleurs
- Documenter dans `.agents/brain/bugs/`

**Outils MCP Serena utilisés :**
- `find_symbol("functionName")` -- localiser la fonction
- `find_referencing_symbols("Component")` -- trouver toutes les utilisations
- `search_for_pattern("error pattern")` -- trouver des problèmes similaires

**Ressources :** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Limites de tours :** Par défaut 15, maximum 25.

---

### oma-translator

**Domaine :** Traduction multilingue contextuelle.

**Quand l'utiliser :** Traduire des chaînes d'interface, de la documentation, du contenu marketing, réviser des traductions existantes, créer des glossaires.

**Méthode en 4 étapes :** Analyser la source (registre, intention, termes de domaine, références culturelles, connotations émotionnelles, mapping du langage figuré) -> Extraire le sens (éliminer la structure de la source) -> Reconstruire dans la langue cible (ordre naturel des mots, correspondance de registre, découpage/fusion de phrases) -> Vérifier (grille de naturalité + vérification anti-patterns IA).

**Mode affiné optionnel en 7 étapes** pour la qualité de publication : étend avec les phases de Revue critique, Révision et Peaufinage.

**Règles fondamentales :**
- Scanner d'abord les fichiers de locale existants pour correspondre aux conventions
- Traduire le sens, pas les mots
- Préserver les connotations émotionnelles
- Ne jamais produire de traductions mot à mot
- Ne jamais mélanger les registres au sein d'un même texte
- Préserver la terminologie spécifique au domaine telle quelle

**Ressources :** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Domaine :** Coordination multi-agents automatisée via lancement CLI.

**Quand l'utiliser :** Fonctionnalités complexes nécessitant plusieurs agents en parallèle, exécution automatisée, implémentation full-stack.

**Configuration par défaut :**

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| MAX_PARALLEL | 3 | Sous-agents simultanés maximum |
| MAX_RETRIES | 2 | Tentatives de reprise par tâche échouée |
| POLL_INTERVAL | 30 s | Intervalle de vérification du statut |
| MAX_TURNS (impl) | 20 | Limite de tours pour backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Limite de tours pour qa/debug |
| MAX_TURNS (plan) | 10 | Limite de tours pour pm |

**Phases du workflow :** Plan -> Setup (identifiant de session, initialisation de la mémoire) -> Execute (lancement par niveau de priorité) -> Monitor (interrogation de la progression) -> Verify (boucle automatisée + revue croisée) -> Collect (rassemblement des résultats).

**Boucle de revue inter-agents :**
1. Auto-revue : l'agent vérifie son propre diff par rapport aux critères d'acceptation
2. Vérification automatisée : `oma verify {agent-type} --workspace {workspace}`
3. Revue croisée : l'agent QA examine les modifications
4. En cas d'échec : les problèmes sont renvoyés pour correction (maximum 5 itérations de boucle au total)

**Suivi de la dette de clarification :** Trace les corrections utilisateur pendant les sessions. Les événements sont notés : clarifier (+10), corriger (+25), refaire (+40). DC >= 50 déclenche une RCA obligatoire. DC >= 80 met la session en pause.

**Ressources :** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domaine :** Génération de commits Git suivant les Conventional Commits.

**Quand l'utiliser :** Après avoir terminé des modifications de code, lors de l'exécution de `/scm`.

**Types de commit :** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow :** Analyser les modifications -> Découper par fonctionnalité (si > 5 fichiers couvrant des périmètres différents) -> Déterminer le type -> Déterminer le périmètre -> Rédiger la description (impératif, < 72 caractères, minuscules, pas de point final) -> Exécuter le commit immédiatement.

**Règles :**
- Ne jamais utiliser `git add -A` ou `git add .`
- Ne jamais commiter de fichiers contenant des secrets
- Toujours spécifier les fichiers lors du staging
- Utiliser HEREDOC pour les messages de commit multi-lignes
- Co-Author : `First Fluke <our.first.fluke@gmail.com>`

---

### oma-coordination

**Domaine :** Guide de coordination multi-agents manuelle étape par étape.

**Quand l'utiliser :** Projets complexes où vous souhaitez un contrôle humain dans la boucle à chaque porte, orientation manuelle pour le lancement d'agents, recettes de coordination étape par étape.

**Quand NE PAS l'utiliser :** Exécution parallèle entièrement automatisée (utiliser oma-orchestrator), tâches à domaine unique (utiliser directement l'agent de domaine).

**Règles principales :**
- Toujours présenter le plan pour confirmation utilisateur avant de lancer les agents
- Un niveau de priorité à la fois -- attendre la fin avant le niveau suivant
- L'utilisateur approuve chaque transition de porte
- La revue QA est obligatoire avant la fusion
- Boucle de remédiation des problèmes pour les constats CRITICAL/HIGH

**Workflow :** PM planifie → Utilisateur confirme → Lancement par niveau de priorité → Surveillance → Revue QA → Correction des problèmes → Livraison.

**Différence avec oma-orchestrator :** La coordination est manuelle et guidée (l'utilisateur contrôle le rythme), l'orchestrator est automatisé (les agents se lancent et s'exécutent avec une intervention utilisateur minimale).

---

### oma-search

**Domaine :** Routeur de recherche basé sur l'intention avec scoring de confiance de domaine -- achemine les requêtes vers Context7 (documents), la recherche web native, `gh`/`glab` (code), Serena (local).

**Quand l'utiliser :** Trouver la documentation officielle de bibliothèques/frameworks, recherche web pour tutoriels/exemples/comparaisons/solutions, recherche de code GitHub/GitLab pour des motifs d'implémentation, toute requête dont le canal de recherche n'est pas clair (routage automatique), autres skills nécessitant une infrastructure de recherche (invocation partagée).

**Quand NE PAS l'utiliser :** Exploration uniquement locale de la base de code (utiliser Serena MCP directement), analyse de l'historique Git ou blame (utiliser oma-scm), recherche complète d'architecture (utiliser oma-architecture, qui peut invoquer ce skill en interne).

**Règles fondamentales :**
- Classifier l'intention avant de chercher -- chaque requête passe d'abord par l'IntentClassifier
- Une requête, une meilleure route -- éviter le multi-routage redondant sauf si l'intention est ambiguë
- Scorer la confiance de chaque résultat -- tous les résultats non locaux reçoivent des labels de confiance de domaine depuis le registre
- Les flags remplacent le classifieur : `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward : si la route primaire échoue, se replier gracieusement (docs→web, web→stratégies `oma search fetch`)
- Aucun MCP supplémentaire requis : Context7 pour les documents, natif runtime pour le web, CLI pour le code, Serena pour le local
- Recherche web agnostique au fournisseur : utiliser ce que fournit le runtime actuel (WebSearch, Google, Bing)
- Confiance uniquement au niveau du domaine -- pas de score au niveau du sous-chemin ou de la page

**Ressources :** `SKILL.md`, répertoire `resources/` avec classifieur d'intention, définitions de routes et registre de confiance.

---

### oma-recap

**Domaine :** Analyse d'historique de conversations à travers plusieurs outils d'IA (Claude, Codex, Gemini, Qwen, Cursor) avec résumés de travail thématiques quotidiens/périodiques.

**Quand l'utiliser :** Résumer une journée ou une période d'activité de travail, comprendre le flux de travail à travers plusieurs outils d'IA, analyser les motifs de changement d'outil entre les sessions, préparer les standups quotidiens / rétros hebdomadaires / journaux de travail.

**Quand NE PAS l'utiliser :** Rétrospective de changements de code basée sur les commits Git (utiliser `oma retro`), monitoring d'agents en temps réel (utiliser `oma dashboard`), métriques de productivité (utiliser `oma stats`).

**Processus :**
1. Résoudre la date ou la fenêtre temporelle à partir d'une entrée en langage naturel (today, yesterday, last Monday, date explicite)
2. Récupérer les données de conversation via `oma recap --date YYYY-MM-DD` ou `--since` / `--until`
3. Regrouper par outil et session
4. Extraire les thèmes (fonctionnalités travaillées, bugs corrigés, outils explorés)
5. Rendre le résumé thématique quotidien/périodique

**Ressources :** `SKILL.md` -- délègue le gros du travail au CLI `oma recap`.

---

### oma-hwp

**Domaine :** Conversion HWP / HWPX / HWPML (traitement de texte coréen) → Markdown en utilisant `kordoc`.

**Quand l'utiliser :** Convertir des documents HWP coréens (`.hwp`, `.hwpx`, `.hwpml`) en Markdown, préparer des documents gouvernementaux/d'entreprise coréens pour le contexte LLM ou RAG, extraire du contenu structuré (tableaux, titres, listes, images, notes de bas de page, hyperliens) depuis HWP.

**Quand NE PAS l'utiliser :** Fichiers PDF (utiliser oma-pdf), XLSX/DOCX (hors périmètre), générer/éditer du HWP (hors périmètre), fichiers déjà en texte (utiliser l'outil Read directement).

**Règles fondamentales :**
- Utiliser `bunx kordoc@latest` pour exécuter -- aucune installation requise ; toujours passer `@latest` ou une version fixée
- Le format de sortie par défaut est Markdown
- Si aucun répertoire de sortie n'est spécifié, sortir dans le même répertoire que l'entrée
- kordoc gère la préservation de la structure (titres, tableaux, tableaux imbriqués, notes de bas de page, hyperliens, images)
- Les défenses de sécurité (ZIP bomb, XXE, SSRF, XSS) sont fournies par kordoc -- ne pas ajouter les siennes
- Pour les HWP chiffrés ou verrouillés par DRM, signaler clairement la limitation à l'utilisateur
- Post-traiter avec `resources/flatten-tables.ts` pour convertir les blocs `<table>` HTML en tableaux pipe GFM et retirer les caractères de la zone Private Use Area de la police Hancom

**Ressources :** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Domaine :** Conversion PDF vers Markdown en utilisant `opendataloader-pdf`.

**Quand l'utiliser :** Convertir des documents PDF en Markdown pour le contexte LLM ou RAG, extraire du contenu structuré (tableaux, titres, listes) depuis des PDFs, préparer des données PDF pour consommation par l'IA.

**Quand NE PAS l'utiliser :** Générer/créer des PDFs (utiliser des outils documentaires appropriés), éditer des PDFs existants (hors périmètre), lecture simple de fichiers déjà en texte (utiliser l'outil Read directement).

**Règles fondamentales :**
- Utiliser `uvx opendataloader-pdf` pour exécuter -- aucune installation requise
- Le format de sortie par défaut est Markdown
- Si aucun répertoire de sortie n'est spécifié, sortir dans le même répertoire que le PDF d'entrée
- Préserver la structure du document (titres, tableaux, listes, images)
- Pour les PDFs scannés, utiliser le mode hybride avec OCR
- Exécuter toujours `uvx mdformat` sur la sortie pour normaliser le formatage Markdown
- Valider que le Markdown de sortie est lisible et bien structuré
- Signaler tout problème de conversion (tableaux manquants, texte tronqué) à l'utilisateur

**Ressources :** `SKILL.md`, `config/`, `resources/`.

---

## Vérification préalable du charter (CHARTER_CHECK)

Avant d'écrire le moindre code, chaque agent d'implémentation doit produire un bloc CHARTER_CHECK :

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**Objectif :**
- Déclare ce que l'agent fera et ne fera pas
- Détecte la dérive du périmètre avant l'écriture du code
- Rend les hypothèses explicites pour la revue utilisateur
- Fournit des critères de succès testables

**Niveaux de clarification :**
- **LOW** : Exigences claires. Procéder avec les hypothèses énoncées.
- **MEDIUM** : Partiellement ambigu. Lister les options, procéder avec la plus probable.
- **HIGH** : Très ambigu. Mettre le statut à bloqué, lister les questions, NE PAS écrire de code.

En mode sous-agent (lancé via CLI), les agents ne peuvent pas interroger directement les utilisateurs. LOW procède, MEDIUM restreint et interprète, HIGH bloque et retourne les questions pour que l'orchestrateur les relaye.

---

## Chargement des compétences en deux couches

Les connaissances de chaque agent sont réparties sur deux couches :

**Couche 1 -- SKILL.md (~800 octets) :**
Toujours chargée. Contient le frontmatter (nom, description), quand utiliser / ne pas utiliser, les règles fondamentales, l'aperçu de l'architecture, la liste des bibliothèques et les références aux ressources de la couche 2.

**Couche 2 -- resources/ (chargement à la demande) :**
Chargée uniquement lorsque l'agent travaille activement, et uniquement les ressources correspondant au type et à la difficulté de la tâche :

| Difficulté | Ressources chargées |
|------------|---------------------|
| **Simple** | execution-protocol.md uniquement |
| **Moyenne** | execution-protocol.md + examples.md |
| **Complexe** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Des ressources supplémentaires sont chargées pendant l'exécution selon les besoins :
- `checklist.md` -- à l'étape de vérification
- `error-playbook.md` -- uniquement en cas d'erreurs
- `common-checklist.md` -- pour la vérification finale des tâches complexes

---

## Exécution au périmètre délimité

Les agents opèrent dans des limites de domaine strictes :

- Un agent frontend ne modifiera pas le code backend
- Un agent backend ne touchera pas aux composants UI
- Un agent DB n'implémentera pas d'endpoints API
- Les agents documentent les dépendances hors périmètre pour les autres agents

Lorsqu'une tâche appartenant à un autre domaine est découverte pendant l'exécution, l'agent la documente dans son fichier de résultat comme élément d'escalade, plutôt que de tenter de la traiter.

---

## Stratégie de workspaces

Pour les projets multi-agents, des workspaces séparés évitent les conflits de fichiers :

```
./apps/api      → backend agent workspace
./apps/web      → frontend agent workspace
./apps/mobile   → mobile agent workspace
```

Les workspaces sont spécifiés avec le flag `-w` lors du lancement des agents :

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Flux d'orchestration

Lors de l'exécution d'un workflow multi-agents (`/orchestrate` ou `/work`) :

1. **L'agent PM** décompose la demande en tâches spécifiques au domaine avec des priorités (P0, P1, P2) et des dépendances
2. **Session initialisée** -- identifiant de session généré, `orchestrator-session.md` et `task-board.md` créés en mémoire
3. **Les tâches P0** sont lancées en parallèle (jusqu'à MAX_PARALLEL agents simultanés)
4. **La progression est surveillée** -- l'orchestrateur interroge les fichiers `progress-{agent}.md` à chaque POLL_INTERVAL
5. **Les tâches P1** sont lancées après la fin des P0, et ainsi de suite
6. **La boucle de vérification** s'exécute pour chaque agent terminé (auto-revue -> vérification automatisée -> revue croisée par QA)
7. **Les résultats sont collectés** depuis tous les fichiers `result-{agent}.md`
8. **Rapport final** avec le résumé de session, les fichiers modifiés et les problèmes restants

---

## Définitions des agents

Les agents sont définis à deux emplacements :

**`.agents/agents/`** -- Contient 7 fichiers de définition de sous-agents :
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

Ces fichiers définissent l'identité de l'agent, la référence au protocole d'exécution, le modèle CHARTER_CHECK, le résumé de l'architecture et les règles. Ils sont utilisés lors du lancement de sous-agents via l'outil Task/Agent (Claude Code) ou le CLI.

**`.claude/agents/`** -- Définitions de sous-agents spécifiques à l'IDE qui référencent les fichiers `.agents/agents/` via des symlinks ou des copies directes pour la compatibilité Claude Code.

---

## État d'exécution (Serena Memory)

Pendant les sessions d'orchestration, les agents se coordonnent via des fichiers de mémoire partagés dans `.serena/memories/` (configurable via `mcp.json`) :

| File | Owner | Purpose | Others |
|------|-------|---------|--------|
| `orchestrator-session.md` | Orchestrator | Session ID, status, start time, phase tracking | Read-only |
| `task-board.md` | Orchestrator | Task assignments, priorities, status updates | Read-only |
| `progress-{agent}.md` | That agent | Turn-by-turn progress: actions taken, files read/modified, current status | Orchestrator reads |
| `result-{agent}.md` | That agent | Final output: status (completed/failed), summary, files changed, acceptance criteria checklist | Orchestrator reads |
| `session-metrics.md` | Orchestrator | Clarification Debt tracking, Quality Score progression | QA reads |
| `experiment-ledger.md` | Orchestrator/QA | Experiment tracking when Quality Score is active | All read |

Les outils de mémoire sont configurables. Par défaut, Serena MCP est utilisé (`read_memory`, `write_memory`, `edit_memory`), mais des outils personnalisés peuvent être configurés dans `mcp.json` :

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Les tableaux de bord (`oma dashboard` et `oma dashboard:web`) surveillent ces fichiers de mémoire pour le suivi en temps réel.
