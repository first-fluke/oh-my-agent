---
title: Agents
description: Référence des 33 packages de skills, des 13 rôles de dispatch canoniques et des 12 définitions de sous-agents suivies dans le dépôt, avec leurs domaines, ressources, charter preflight, chargement progressif, règles de périmètre, portes qualité, stratégie de workspace, orchestration et mémoire d’exécution.
---

# Agents

OMA sépare les packages de skills, les rôles de dispatch et les fichiers de définition des sous-agents. Un skill route et charge les indications du domaine ; un rôle canonique est l’identité runtime utilisée pour le dispatch ; une définition suivie dans le dépôt donne au sous-agent une persona propre au fournisseur. Ces couches se recouvrent volontairement : utilisez la limite de la tâche et les critères d’acceptation pour décider si un seul skill suffit.

Les définitions d’agents dans `.agents/agents/` sont la source de vérité. OMA les projette vers des fichiers propres au fournisseur pour les runtimes qui prennent en charge les sous-agents personnalisés :

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` ou une autre projection du fournisseur sélectionné lorsqu’elle est prise en charge

Lorsqu’un workflow associe un agent au même fournisseur que le runtime courant, il doit d’abord utiliser le fichier natif de ce runtime. Les tâches inter-fournisseurs utilisent `oma agent spawn`.

> **Dispatch du modèle par agent :** chaque agent résout un slug de modèle, un fournisseur CLI et un niveau de raisonnement précis via `model_preset` (et d’éventuelles surcharges `agents:`) dans `.agents/oma-config.yaml`. Voir [Modèles par agent](../guide/per-agent-models.md) pour la configuration et [`oma doctor --profile`](../cli-interfaces/commands.md#doctor) pour inspecter la matrice active.

---

## Catégories d’agents

| Catégorie | Agents | Responsabilité |
|----------|--------|----------------|
| **Idéation** | oma-brainstorm | Explorer des idées, proposer des approches et produire des documents de conception |
| **Architecture** | oma-architecture | Frontières système/module/service, analyses ADR/ATAM/CBAM et décisions de compromis |
| **Planification** | oma-pm | Décomposer les exigences, découper les tâches, définir les contrats d’API et attribuer les priorités |
| **Implémentation** | oma-frontend, oma-backend, oma-mobile, oma-db | Écrire du code dans les domaines respectifs |
| **Design** | oma-design | Systèmes de design, DESIGN.md, tokens, typographie, couleurs, animations et accessibilité |
| **Infrastructure** | oma-tf-infra | Provisionnement Terraform multi-cloud, IAM, optimisation des coûts et policy-as-code |
| **DevOps** | oma-dev-workflow | Task runner mise, CI/CD, migrations, coordination des releases et automatisation de monorepo |
| **Observabilité** | oma-observability | Pipelines d’observabilité, routage de traçabilité, signaux MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), SLO, investigation d’incidents et réglage du transport |
| **Qualité** | oma-qa | Audit de sécurité (OWASP), performance, accessibilité (WCAG) et revue de qualité du code |
| **Débogage** | oma-debug | Reproduction de bugs, analyse de cause profonde, corrections minimales et tests de régression |
| **Localisation** | oma-translation | Traduction contextuelle préservant le ton, le registre et les termes du domaine |
| **Coordination** | oma-orchestration, oma-coordination | Orchestration multi-agents automatisée et manuelle |
| **Git** | oma-scm | Génération de Conventional Commits et découpage de commits par fonctionnalité |
| **Recherche et récupération** | oma-search | Routeur de recherche par intention avec scoring de confiance (docs Context7, web, code `gh`/`glab`, intelligence locale du code) |
| **Rétrospective** | oma-recap | Analyse de l’historique de conversations inter-outils et résumés thématiques du travail |
| **Traitement de documents** | oma-hwp, oma-pdf | Conversion HWP/HWPX/HWPML et PDF en Markdown pour ingestion LLM/RAG |
| **Documentation** | oma-docs | Détection de dérive documentaire (vérification des références cassées, propositions de sync ciblées par diff) |
| **Explication** | oma-explanation | Explications HTML interactives hors ligne pour diffs, branches, PR ou plages de commits |
| **Écriture académique** | oma-academic-writing, oma-scholar | Rédaction/revue de prose académique et recherche, lecture critique et peer review avec sidecars Knows |
| **Sécurité** | oma-deepsec | Pilotage économique du scanner de vulnérabilités deepsec (scan, gate PR, matchers, triage) |
| **Refactoring** | oma-refactor | Restructuration incrémentale préservant le comportement, ciblage de hotspots et filets de tests de caractérisation |
| **Recherche de marché** | oma-market | Recherche de pain points, tendances, concurrents et découverte depuis les signaux communautaires, avec SWOT/Porter/PESTEL |
| **Création de skills** | oma-skill-creation | Création et validation de skills OMA au format SSL-lite |
| **Génération de médias** | oma-image, oma-slide, oma-video, oma-voice | Images IA, decks HTML, vidéos courtes/explicatives/démonstration et TTS/STT local |

---

## Référence détaillée des agents

### oma-brainstorm

**Domaine :** Idéation orientée design avant planification ou implémentation.

**Quand l’utiliser :** explorer une idée de fonctionnalité, comprendre l’intention de l’utilisateur et comparer des approches. À utiliser avant `/plan` pour les demandes complexes ou ambiguës.

**Quand NE PAS l’utiliser :** exigences claires (utiliser oma-pm), implémentation (utiliser les agents du domaine), revue de code (utiliser oma-qa).

**Règles fondamentales :**
- aucune implémentation ni planification avant l’approbation du design ;
- une question de clarification à la fois ;
- proposer toujours 2 ou 3 approches avec une option recommandée ;
- présenter le design section par section et obtenir la confirmation à chaque étape ;
- appliquer YAGNI : ne concevoir que le nécessaire.

**Workflow :** 6 phases : exploration du contexte, questions, approches, design, documentation (enregistre dans `docs/plans/`), transition vers `/plan`.

**Ressources :** utilise seulement les ressources partagées (clarification-protocol, quality-principles, skill-routing).

---

### oma-architecture

**Domaine :** Architecture logicielle/système : frontières de modules et de services, analyse des compromis, synthèse des parties prenantes et enregistrements de décisions.

**Quand l’utiliser :** choisir ou revoir une architecture système, définir les frontières module/service/propriété, comparer des options d’architecture avec des compromis explicites, enquêter sur les problèmes architecturaux (amplification des changements, dépendances cachées, APIs maladroites), prioriser les investissements d’architecture ou les refactorings, rédiger des recommandations d’architecture ou des ADR.

**Quand NE PAS l’utiliser :** systèmes visuels/de design (utiliser oma-design), planification de fonctionnalité et décomposition des tâches (utiliser oma-pm), implémentation Terraform (utiliser oma-tf-infra), diagnostic de bug (utiliser oma-debug), revue de sécurité/performance/accessibilité (utiliser oma-qa).

**Méthodologies :** routage diagnostique, comparaison design-twice, analyse de risques façon ATAM, priorisation façon CBAM, enregistrements de décisions façon ADR.

**Règles fondamentales :**
- diagnostiquer le problème architectural avant de choisir une méthode ;
- employer la méthodologie suffisante la plus légère pour la décision en cours ;
- distinguer design architectural, design UI/visuel et livraison Terraform ;
- consulter les agents parties prenantes uniquement lorsque la décision est assez transversale pour en justifier le coût ;
- privilégier la qualité de la recommandation au théâtre du consensus : consulter largement, décider explicitement ;
- chaque recommandation doit énoncer hypothèses, compromis, risques et étapes de validation ;
- tenir compte des coûts par défaut : coût d’implémentation, coût d’exploitation, complexité d’équipe, coût des changements futurs.

**Ressources :** `SKILL.md`, répertoire `resources/` avec guides méthodologiques (diagnostic-routing, design-twice, ATAM, CBAM, modèles ADR).

---

### oma-pm

**Domaine :** Gestion de produit : analyse des exigences, décomposition des tâches et contrats API.

**Quand l’utiliser :** décomposer une fonctionnalité complexe, déterminer la faisabilité, prioriser le travail et définir les contrats API.

**Règles fondamentales :**
- API-first : définir les contrats avant les tâches d’implémentation ;
- chaque tâche possède agent, titre, critères d’acceptation, priorité et dépendances ;
- minimiser les dépendances pour maximiser le parallélisme ;
- sécurité et tests font partie de chaque tâche ;
- chaque tâche doit être réalisable par un seul agent ;
- produire le plan JSON et un task board propre à la session pour l’orchestrateur.

**Sortie :** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, écriture mémoire pour l’orchestrateur.

**Ressources :** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/template.md` (les contrats sont écrits dans `.agents/results/api-contracts/`).

---

### oma-frontend

**Domaine :** UI Web construite avec React, Next.js et TypeScript selon l’architecture FSD-lite.

**Quand l’utiliser :** interfaces, composants, logique client, styling, validation de formulaires et intégration API.

**Stack technique :**
- React + Next.js (Server Components par défaut, Client Components pour l’interactivité) ;
- TypeScript (strict) ;
- TailwindCSS v4 + shadcn/ui (primitives en lecture seule, extension par cva/wrappers) ;
- FSD-lite : racine `src/` + fonctionnalités `src/features/*/` (aucun import inter-feature).

**Bibliothèques :**
| Usage | Bibliothèque |
|-------|-------------|
| Dates | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks ou @mantine/hooks |
| Utilitaires | es-toolkit |
| État URL | nuqs |
| État serveur | TanStack Query (ou hooks générés par orval si une spécification OpenAPI existe) |
| État client | Jotai (usage réduit) |
| Formulaires | @tanstack/react-form + Zod |
| Authentification | better-auth |

**Règles fondamentales :**
- shadcn/ui en priorité, extension via cva, ne jamais modifier directement `components/ui/*` ;
- mapping 1:1 des design tokens, sans couleurs codées en dur ;
- proxy plutôt que middleware (Next.js 16+ utilise `proxy.ts`, pas `middleware.ts` pour la logique proxy) ;
- pas de prop drilling au-delà de 3 niveaux : utiliser des atoms Jotai ;
- imports absolus `@/` obligatoires ;
- objectif FCP < 1 s ;
- breakpoints responsifs : 320 px, 768 px, 1024 px, 1440 px.

**Ressources :** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md` et `checklist.md`.

**Checklist de qualité :**
- accessibilité : labels ARIA, titres sémantiques, navigation clavier ;
- mobile : vérifié sur des viewports mobiles ;
- performance : pas de CLS, chargement rapide ;
- résilience : Error Boundaries et Loading Skeletons ;
- tests : logique couverte par Vitest ;
- qualité : typecheck et lint passent.

---

### oma-backend

**Domaine :** API, logique serveur, authentification et opérations de base de données.

**Quand l’utiliser :** API REST/GraphQL, migrations, auth, logique métier serveur et jobs de fond.

**Architecture :** Router (HTTP) -> Service (logique métier) -> Repository (accès aux données) -> Models.

**Détection de stack :** lire les manifestes (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) pour déterminer langage et framework. Si les conventions du projet manquent, demander à l’utilisateur d’exécuter `/stack-set`, qui matérialise les références `stack/` depuis le schéma et les modèles livrés.

**Règles fondamentales :**
- architecture propre : aucune logique métier dans les handlers de routes ;
- valider toutes les entrées avec la bibliothèque de validation du projet ;
- requêtes paramétrées uniquement (jamais d’interpolation de chaîne SQL) ;
- JWT + Argon2id pour l’authentification (bcrypt acceptable pour la compatibilité avec l’existant) ; limiter le débit des endpoints d’authentification ;
- asynchrone lorsque c’est pris en charge et annotations de type sur toutes les signatures ;
- exceptions personnalisées via un module d’erreur centralisé ;
- stratégie de chargement ORM explicite, limites de transaction et cycle de vie sûr.

**Ressources :** `execution-protocol.md`, `orm-reference.md`, `checklist.md` et `error-playbook.md`. `variants/stack.schema.json` définit la forme du manifeste de stack.

<!-- oma-docs:ignore-start -->
Les fichiers propres au projet `stack/stack.yaml`, `stack/tech-stack.md`, les snippets et les modèles d’API sont générés par `/stack-set` lorsque nécessaire ; ils sont absents tant que la stack n’est pas matérialisée.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Domaine :** Applications mobiles multiplateformes et natives (Flutter, React Native et iOS natif Swift).

**Quand l’utiliser :** applications mobiles natives (iOS + Android), patterns UI propres au mobile, fonctionnalités de plateforme (caméra, GPS, notifications push), architecture offline-first ; applications iOS natives Swift avec SwiftUI et `swift-openapi-generator`.

**Architecture :** Clean Architecture : domain -> data -> presentation. Pour Swift iOS : structure `App/Core/Features/Shared`.

**Stacks techniques :**
- Flutter/Dart : Riverpod/Bloc (gestion d’état), Dio avec intercepteurs (API), GoRouter (navigation), Material Design 3 (Android) + iOS HIG ;
- iOS natif Swift (iOS 17+) : SwiftUI + `@Observable` (framework Observation), clients API Apple `swift-openapi-generator`, structure `App/Core/Features/Shared`.

**Règles fondamentales :**
- Riverpod/Bloc pour la gestion d’état (pas de `setState` brut pour la logique complexe) ;
- libérer tous les contrôleurs dans `dispose()` ;
- Dio avec intercepteurs pour les appels API, avec gestion du mode hors ligne ;
- objectif 60 fps et tests sur les deux plateformes ;
- en Swift, préférer `@Observable` à `ObservableObject` sur iOS 17+, et générer les clients API depuis des spécifications OpenAPI avec `swift-openapi-generator`.

**Ressources :** `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md` et `error-playbook.md`. Le répertoire `variants/` contient le schéma de stack et les références de plateforme générées lorsque `/stack-set` les matérialise.

---

### oma-db

**Domaine :** Architecture de bases SQL, NoSQL et vectorielles.

**Quand l’utiliser :** schéma, ERD, normalisation, index, transactions, capacité, sauvegardes, migrations, architecture vectorielle/RAG, revue d’anti-patterns et conception conforme (ISO 27001/27002/22301).

**Workflow par défaut :** Explorer (entités, patterns d’accès, volume) -> Concevoir (schéma, contraintes, transactions) -> Optimiser (index, partitionnement, archivage, anti-patterns).

**Règles fondamentales :**
- choisir d’abord le modèle, puis le moteur ;
- 3NF par défaut pour le relationnel ; documenter les compromis BASE pour le distribué ;
- documenter les trois couches de schéma : externe, conceptuelle, interne ;
- traiter l’intégrité comme une priorité : entité, domaine, référentielle, règle métier ;
- définir explicitement frontières de transactions et niveaux d’isolation ;
- les bases vectorielles servent à la recherche, pas de source de vérité ;
- ne jamais traiter la recherche vectorielle comme remplacement direct de la recherche lexicale.

**Livrables requis :** résumé du schéma externe, schéma conceptuel, schéma interne, tableau des normes de données, glossaire, estimation de capacité et stratégie de sauvegarde/récupération. Pour vectoriel/RAG : politique de version des embeddings, de découpage et de recherche hybride.

**Ressources :** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domaine :** Systèmes de design, UI/UX et gestion de DESIGN.md.

**Quand l’utiliser :** créer des systèmes de design, des landing pages, des design tokens, des palettes de couleurs, de la typographie et des mises en page responsives, et faire une revue d’accessibilité.

**Workflow :** 7 phases : Setup (collecte de contexte) -> Extract (optionnel, depuis des URL de référence) -> Enhance (enrichissement d’un prompt vague) -> Propose (2–3 directions de design) -> Generate (DESIGN.md + tokens) -> Audit (responsive, WCAG, Nielsen, contrôle AI slop) -> Handoff.

**Application des anti-patterns (« no AI slop ») :**
- typographie : stack de polices système par défaut ; pas de Google Fonts par défaut sans justification ;
- couleur : pas de dégradés violet-bleu, d’orbes/blobs en dégradé ou de blanc pur sur noir pur ;
- mise en page : pas de cartes imbriquées, de layout uniquement desktop ou de statistiques génériques à 3 métriques ;
- animation : pas d’easing rebond partout, pas d’animations > 800 ms, respecter prefers-reduced-motion ;
- composants : pas de glassmorphisme partout, alternatives clavier/tactile pour tout élément interactif.

**Règles fondamentales :**
- vérifier `.design-context.md` d’abord et le créer s’il manque ;
- stack de polices système par défaut (polices CJK-ready pour ko/ja/zh) ;
- WCAG AA minimum pour tous les designs ;
- responsive-first (mobile par défaut) ;
- présenter 2–3 directions et obtenir confirmation.

**Ressources :** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, ainsi que le répertoire `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d).

---

### oma-tf-infra

**Domaine :** Infrastructure-as-code avec Terraform et multi-cloud.

**Quand l’utiliser :** provisionnement sur AWS/GCP/Azure/Oracle Cloud, configuration Terraform, authentification CI/CD (OIDC), CDN/load balancers/stockage/réseau, gestion de l’état et infrastructure conforme ISO.

**Détection cloud :** lire les fournisseurs Terraform et les préfixes de ressources (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Inclut une table complète de correspondance des ressources multi-cloud.

**Règles fondamentales :**
- agnostique vis-à-vis du fournisseur : détecter le cloud depuis le contexte du projet ;
- état distant avec versionnement et verrouillage ;
- OIDC d’abord pour l’authentification CI/CD ;
- toujours planifier (plan) avant d’appliquer (apply) ;
- IAM au moindre privilège ;
- taguer tout (Environment, Project, Owner, CostCenter) ;
- aucun secret dans le code ;
- épingler les versions de tous les fournisseurs et modules ;
- pas d’auto-approve en production.

**Ressources :** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domaine :** Automatisation monorepo et CI/CD.

**Quand l’utiliser :** lancer des serveurs de développement, exécuter lint/format/typecheck sur l’ensemble des applications, migrations de base de données, génération d’API, builds i18n, builds de production, optimisation CI/CD et validation pre-commit.

**Règles fondamentales :**
- toujours utiliser les tâches `mise run` plutôt que les commandes directes du gestionnaire de paquets ;
- lint/test uniquement sur les applications modifiées ;
- valider les messages de commit avec commitlint ;
- la CI doit ignorer les applications inchangées ;
- ne jamais utiliser les commandes directes du gestionnaire de paquets lorsque des tâches mise existent.

**Ressources :** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**Domaine :** Routeur d’observabilité et de traçabilité par intention, à travers couches, frontières et signaux.

**Quand l’utiliser :** mise en place d’un pipeline d’observabilité (OTel SDK + Collector + backend fournisseur), traçabilité entre frontières de services et de domaines (propagateurs W3C, baggage, multi-tenant, multi-cloud), réglage du transport (seuils UDP/MTU, OTLP gRPC vs HTTP, topologie Collector DaemonSet vs sidecar, recettes de sampling), investigation d’incidents (localisation en 6 dimensions : code / service / couche / hôte / région / infra), sélection de catégories de fournisseurs (OSS full-stack vs SaaS commercial vs spécialiste haute cardinalité vs spécialiste profiling), observability-as-code (dashboards Grafana Jsonnet, CRD PrometheusRule, YAML OpenSLO, alertes de burn-rate SLO), méta-observabilité (santé propre du pipeline, dérive d’horloge, garde-fous de cardinalité, matrice de rétention), couverture des signaux MELT+P (metrics, logs, traces, profiles, cost, audit, privacy) et migration hors des outils obsolètes (Fluentd -> Fluent Bit ou OTel Collector).

**Quand NE PAS l’utiliser :** observabilité LLM ops / gen_ai (utiliser Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage de pipelines de données (OpenLineage + Marquez, dbt test, Airflow lineage), télémétrie de couche physique IoT / datacenter (Nlyte, Sunbird, Device42), orchestration de chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), infrastructure GPU / TPU (NVIDIA DCGM Exporter), supply chain logicielle (sigstore, in-toto, SLSA), workflow de réponse aux incidents / paging (PagerDuty, OpsGenie, Grafana OnCall), mise en place mono-fournisseur déjà couverte par le skill propre à ce fournisseur.

**Règles fondamentales :**
- classer l’intention avant le routage : setup | migrate | investigate | alert | trace | tune | route ;
- catégorie d’abord, pas registre de fournisseurs : déléguer aux skills propres aux fournisseurs via `resources/vendor-categories.md` ; ne pas dupliquer la documentation des fournisseurs ;
- le réglage du transport est l’avantage distinctif : les seuils UDP/MTU, le choix du protocole OTLP, la topologie du Collector et les recettes de sampling apportent une profondeur que les autres skills ne couvrent pas ;
- la méta-observabilité est non négociable : valider la santé propre du pipeline, la synchronisation d’horloge (dérive < 100 ms), la cardinalité et la rétention avant de déclarer la mise en place terminée ;
- préférence CNCF en priorité : Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco ;
- Fluentd est obsolète (CNCF 2025-10) : recommander Fluent Bit ou OTel Collector pour les nouveaux projets et les migrations ;
- W3C Trace Context comme propagateur par défaut ; le traduire selon le cloud (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd) ;
- la confidentialité avant les fonctionnalités : masquage des PII, règles de baggage tenant compte du sampling, audit immuable SOC2/ISO + effacement GDPR/PIPA appliqués dès la collecte, pas seulement au stockage.

**Ressources :** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, ainsi que des ressources approfondies sous `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) et `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domaine :** Assurance qualité couvrant sécurité, performance, accessibilité et qualité du code.

**Quand l’utiliser :** revue finale avant déploiement, audit de sécurité, analyse de performance, conformité d’accessibilité et analyse de couverture de tests.

**Ordre de priorité de la revue :** Sécurité > Performance > Accessibilité > Qualité du code.

**Niveaux de sévérité :**
- **CRITICAL** : brèche de sécurité ou risque de perte de données ;
- **HIGH** : bloque le lancement ;
- **MEDIUM** : à corriger dans ce sprint ;
- **LOW** : backlog.

**Règles fondamentales :**
- chaque constat doit contenir fichier:ligne, description et correction ;
- exécuter d’abord les outils automatisés (npm audit, bandit, lighthouse) ;
- aucun faux positif : chaque constat doit être reproductible ;
- fournir du code de remédiation, pas seulement des descriptions.

**Ressources :** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

---

### oma-debug

**Domaine :** Diagnostic et correction de bugs.

**Quand l’utiliser :** bugs signalés par les utilisateurs, plantages, problèmes de performance, défaillances intermittentes, conditions de concurrence et bugs de régression.

**Méthodologie :** reproduire d’abord, diagnostiquer ensuite. Ne jamais deviner une correction.

**Règles fondamentales :**
- identifier la cause profonde, pas seulement les symptômes ;
- correction minimale : ne modifier que ce qui est nécessaire ;
- accompagner chaque correction d’un test de régression ;
- rechercher ailleurs des motifs similaires ;
- documenter dans `.agents/results/`.

**Outils d’intelligence du code (Gortex ou Serena) :**
- `find_symbol("functionName")` ou navigation de symboles Gortex : localiser la fonction ;
- `find_referencing_symbols("Component")` ou analyse d’impact Gortex : trouver toutes les utilisations ;
- `search_for_pattern("error pattern")` ou recherche Gortex : trouver les problèmes similaires.

**Ressources :** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

---

### oma-translation

**Domaine :** Traduction multilingue contextuelle.

**Quand l’utiliser :** traduire des chaînes UI, de la documentation ou des textes marketing, revoir des traductions existantes et créer des glossaires.

**Flux en six scènes :** Prepare, Acquire, Reason, Act, Verify et Finalize. La méthode de traduction suit quatre étapes : lire le sens et la syntaxe protégée, choisir le registre, reconstruire dans la langue cible et préserver le style de l’auteur lorsqu’il doit l’être.

**Règles fondamentales :**
- parcourir d’abord les fichiers de locale existants pour respecter leurs conventions ;
- traduire le sens et non les mots ;
- préserver les connotations émotionnelles ;
- ne jamais produire de traduction mot à mot ;
- ne jamais mélanger les registres au sein d’un même texte ;
- conserver tels quels les termes propres au domaine.

**Ressources :** `translation-rubric.md`, `anti-ai-patterns.md` (tous deux indépendants de la langue), ainsi qu’un profil par langue cible dans `resources/lang/` (`ko`, `ja`, `zh`, `en` ; `_template.md` pour en ajouter).

---

### oma-orchestration

**Domaine :** Coordination automatisée de plusieurs agents via lancement CLI.

**Quand l’utiliser :** fonctionnalités complexes nécessitant plusieurs agents en parallèle, exécution automatisée et implémentation full-stack.

**Valeurs de configuration par défaut :**

| Réglage | Défaut | Description |
|---------|--------|-------------|
| MAX_PARALLEL | 3 | Nombre maximal de sous-agents simultanés |
| MAX_RETRIES | 2 | Tentatives de reprise par tâche échouée |
| POLL_INTERVAL | 30s | Intervalle de vérification de l’état |

**Phases du workflow :** Plan -> Setup (ID de session, initialisation mémoire) -> Execute (lancement par priorité) -> Monitor (interrogation de la progression) -> Verify (boucle automatisée + revue croisée) -> Collect (rassemblement des résultats).

**Boucle de revue inter-agents :**
1. Auto-revue : l’agent confronte son diff aux critères d’acceptation ;
2. vérification automatisée : `oma verify agent {agent-type} --workspace {workspace}` ;
3. revue croisée : l’agent QA examine les changements ;
4. en cas d’échec, transmettre les problèmes pour correction (5 itérations de boucle au maximum).

**Preuves de session :** consigner, lorsque c’est utile, les corrections importantes et les constats de revue arbitrés, avec cause, impact et vérification. Aucun score de pénalité ni aucune pause déclenchée par un score ne s’applique.

**Ressources :** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domaine :** Gestion de configuration logicielle (SCM) et Git : branches, fusions, worktrees, baselines, préparation aux audits et Conventional Commits.

**Quand l’utiliser :** après des changements de code (`/scm`), en cas de conflit de fusion, pour les stratégies de branche, releases/tags ou toute question de gestion de configuration du dépôt.

**Types de commit :** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow des commits :** analyser les changements -> séparer par fonctionnalité si nécessaire -> type -> scope -> description (impératif, moins de 72 caractères, minuscules, sans point final) -> commiter avec des chemins explicites.

**Règles :**
- ne jamais utiliser `git add -A` ni `git add .` ;
- ne jamais commiter de fichiers de secrets ;
- toujours spécifier les fichiers au staging ;
- utiliser HEREDOC pour les messages de commit multilignes ;
- n’inclure les trailers de co-auteur que si la configuration effective `scm.co_author` les active et fournit le nom et l’adresse e-mail.

---

### oma-coordination

**Domaine :** Guide de coordination manuelle de plusieurs agents, étape par étape.

**Quand l’utiliser :** projets complexes où l’on veut un contrôle human-in-the-loop à chaque porte, des indications de lancement manuel des agents et des recettes de coordination étape par étape.

**Quand NE PAS l’utiliser :** exécution parallèle entièrement automatisée (utiliser oma-orchestration), tâches dans un seul domaine (utiliser directement l’agent de domaine).

**Règles fondamentales :**
- toujours présenter le plan pour confirmation par l’utilisateur avant de lancer les agents ;
- un niveau de priorité à la fois ; attendre sa fin avant le niveau suivant ;
- l’utilisateur approuve chaque transition de porte ;
- la revue QA est obligatoire avant fusion ;
- boucle de remédiation des problèmes pour les constats CRITICAL/HIGH.

**Workflow :** PM planifie -> utilisateur confirme -> lancement par priorité -> surveillance -> revue QA -> correction -> livraison.

**Différence avec oma-orchestration :** la coordination est manuelle et guidée (l’utilisateur contrôle le rythme) ; l’orchestrateur est automatisé (les agents sont lancés et s’exécutent avec une intervention minimale de l’utilisateur).

---

### oma-search

**Domaine :** Routeur de recherche par intention avec scoring de confiance du domaine. Route vers Context7 (docs), recherche web native, `gh`/`glab` (code) et intelligence locale du code (Gortex ou Serena).

**Quand l’utiliser :** trouver la documentation officielle de bibliothèques/frameworks, recherche web de tutoriels/exemples/comparaisons/solutions, recherche de code GitHub/GitLab pour des motifs d’implémentation, toute requête dont le canal de recherche est incertain (routage automatique), autres skills ayant besoin d’une infrastructure de recherche (invocation partagée).

**Quand NE PAS l’utiliser :** exploration d’une base de code uniquement locale (utiliser directement le MCP d’intelligence du code), analyse de l’historique Git ou du blame (utiliser oma-scm), recherche d’architecture complète (utiliser oma-architecture, qui peut invoquer ce skill en interne).

**Règles fondamentales :**
- classifier l’intention avant de chercher ; chaque requête passe d’abord par IntentClassifier ;
- une requête, une meilleure route ; éviter le multi-route redondant sauf si l’intention est ambiguë ;
- noter la confiance de chaque résultat ; tous les résultats non locaux reçoivent des étiquettes de confiance de domaine issues du registre ;
- les flags priment sur le classifieur : `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab` ;
- échouer en avançant : si la route principale échoue, basculer proprement (docs→web, web→stratégies `oma search fetch`) ;
- aucun MCP supplémentaire requis : Context7 pour la documentation, la recherche native du runtime pour le web, le CLI pour le code, le fournisseur configuré (Gortex ou Serena) pour le local ;
- recherche web indépendante du fournisseur : utiliser ce que fournit le runtime courant (WebSearch, Google, Bing) ;
- confiance au niveau du domaine uniquement ; pas de score par sous-chemin ou par page.

**Ressources :** `SKILL.md`, répertoire `resources/` avec classifieur d’intention, routes et registre de confiance.

---

### oma-recap

**Domaine :** Analyse d’historique de conversations entre plusieurs outils IA (Claude, Codex, Qwen, Cursor) avec résumés quotidiens ou périodiques thématiques.

**Quand l’utiliser :** résumer une journée ou une période d’activité de travail, comprendre le flux de travail entre plusieurs outils IA, analyser les patterns de changement d’outil entre sessions, préparer des standups quotidiens / rétros hebdomadaires / journaux de travail.

**Quand NE PAS l’utiliser :** rétrospective des changements de code basée sur les commits Git (utiliser `oma retro`), monitoring des agents en temps réel (utiliser `oma dashboard terminal`), métriques de productivité (utiliser `oma stats get`).

**Processus :**
1. résoudre la date ou la fenêtre de temps à partir d’une entrée en langage naturel (today, yesterday, last Monday, date explicite) ;
2. récupérer les données de conversation via `oma recap --date YYYY-MM-DD` ou `--since` / `--until` ;
3. regrouper par outil et session ;
4. extraire les thèmes (fonctionnalités travaillées, bugs corrigés, outils explorés) ;
5. produire le résumé quotidien/périodique thématique.

**Ressources :** `SKILL.md`. Le travail lourd est délégué au CLI `oma recap`.

---

### oma-hwp

**Domaine :** Conversion HWP / HWPX / HWPML (traitement de texte coréen) vers Markdown avec `kordoc`.

**Quand l’utiliser :** convertir des documents HWP coréens (`.hwp`, `.hwpx`, `.hwpml`) en Markdown, préparer des documents gouvernementaux/d’entreprise coréens pour le contexte d’un LLM ou du RAG, extraire le contenu structuré (tableaux, titres, listes, images, notes de bas de page, hyperliens) d’un HWP.

**Quand NE PAS l’utiliser :** fichiers PDF (utiliser oma-pdf), XLSX/DOCX (hors périmètre), génération/édition de HWP (hors périmètre), fichiers déjà textuels (utiliser directement l’outil Read).

**Règles fondamentales :**
- utiliser `bunx kordoc@latest` pour l’exécution (aucune installation requise) ; toujours passer `@latest` ou une version fixée ;
- le format de sortie par défaut est Markdown ;
- sans répertoire de sortie, écrire dans le même répertoire que l’entrée ;
- kordoc gère la préservation de la structure (titres, tableaux, tableaux imbriqués, notes de bas de page, hyperliens, images) ;
- les défenses de sécurité (ZIP bomb, XXE, SSRF, XSS) sont fournies par kordoc ; ne pas en ajouter de personnalisées ;
- pour un HWP chiffré ou verrouillé par DRM, signaler clairement la limitation à l’utilisateur ;
- post-traiter avec `resources/flatten-tables.ts` pour convertir les blocs HTML `<table>` en pipe tables GFM et retirer les caractères Private Use Area des polices Hancom.

**Ressources :** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Domaine :** Conversion PDF vers Markdown avec `opendataloader-pdf`.

**Quand l’utiliser :** convertir des documents PDF en Markdown pour le contexte d’un LLM ou du RAG, extraire le contenu structuré (tableaux, titres, listes) des PDF, préparer des données PDF pour leur consommation par l’IA.

**Quand NE PAS l’utiliser :** générer/créer des PDF (utiliser les outils documentaires appropriés), modifier des PDF existants (hors périmètre), simple lecture de fichiers déjà textuels (utiliser directement l’outil Read).

**Règles fondamentales :**
- utiliser `uvx opendataloader-pdf` pour l’exécution (aucune installation requise) ;
- le format de sortie par défaut est Markdown ;
- sans répertoire de sortie, écrire dans le même répertoire que le PDF d’entrée ;
- préserver la structure du document (titres, tableaux, listes, images) ;
- pour les PDF scannés, utiliser le mode hybride avec OCR ;
- toujours exécuter `uvx mdformat` sur la sortie pour normaliser le formatage Markdown ;
- valider que le Markdown produit est lisible et bien structuré ;
- signaler à l’utilisateur tout problème de conversion (tableaux manquants, texte corrompu).

**Ressources :** `SKILL.md`, `config/`, `resources/`.

---

### oma-academic-writing

**Domaine :** Prose académique anglaise de niveau publication : rédaction, révision et audit d’essais, rapports, sections d’analyse, résumés exécutifs, conclusions et revues de littérature.

**Quand l’utiliser :** rédiger ou réviser des rapports/essais/sections d’analyse académiques, rédiger des executive summaries, des conclusions ou des revues de littérature, réécrire une prose qui sonne IA en anglais académique naturel, polir un brouillon jusqu’à une qualité de rubric top-band (HD, A, top-band), relire une prose pour la variété des phrases / la qualité des verbes / le hedging / la conformité anti-IA.

**Quand NE PAS l’utiliser :** traduction (utiliser oma-translation), découverte de sources / collecte de citations / recherche de littérature (utiliser oma-scholar), analyse de rubric et décomposition de tâches (utiliser oma-pm), documentation de code / README / texte de référence d’API (utiliser le skill de domaine concerné), texte informel ou marketing, rédaction académique non anglaise (rédiger en anglais, puis transmettre à oma-translation).

**Modes :** `draft` (titre + prose + Writing Notes + Claim-Evidence Map), `revise` (original + version révisée + liste des changements), `review` (rapport de conformité PASS/FAIL sur la structure des phrases, la qualité des verbes, l’anti-IA, la spécificité, le hedging, la clarté des paragraphes, le rythme et l’alignement claim/evidence).

**Règles fondamentales :**
- citation avant jugement : citer le texte littéral de la rubric/contrainte avant d’appliquer toute règle ;
- chaque phrase doit être vérifiable ; ne jamais inventer de données, de statistiques ni de citations ;
- les verbes génériques interdits (`show`, `have`, `make`, `do`, `get`, `use`, …) ne doivent pas être des verbes principaux ;
- varier le type, la longueur et le début des phrases ; jamais 3 phrases de même type ou plus à la suite ;
- calibrer la force du hedge sur celle des preuves ; pas de première personne (`I think`/`I believe`) ;
- chaque claim renvoie à une preuve dans la Claim-Evidence Map ; atténuer ou retirer les claims non étayés.

**Workflow :** 6 étapes — READ (lire la rubric/le brouillon et citer les contraintes), PLAN (planifier les paragraphes en Topic-Support-Conclude), DRAFT (rédiger selon les quatre protocoles), AUDIT (auditer avec la checklist anti-IA), REVERSE-OUTLINE + construction de la Claim-Evidence Map, POLISH (lecture à voix haute, cohésion, spécificité, nombre de mots, rythme).

**Ressources :** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md`, plus `context-loading` et `quality-principles` partagés.

---

### oma-deepsec

**Domaine :** Piloter de bout en bout le scanner de vulnérabilités `deepsec` de Vercel, propulsé par des agents, en toute sécurité et avec maîtrise du coût, dans un dépôt cible.

**Quand l’utiliser :** première installation de deepsec dans un dépôt (`init`, écriture de `INFO.md`, scan de calibration), lancer un scan complet ou ciblé et traiter les findings, mettre en place un gate CI par PR avec `process --diff`, écrire des matchers propres au projet, trier un backlog de findings (classement par sévérité, réduction des faux positifs via `revalidate`, export), diagnostiquer les échecs de deepsec.

**Quand NE PAS l’utiliser :** revue générique de type OWASP / lint sans deepsec (utiliser oma-qa), advisories génériques CVE / dépendances (utiliser oma-qa ou oma-search), conception de l’architecture d’un pipeline SAST non-deepsec (utiliser oma-architecture), écriture ou audit de code applicatif (router vers oma-backend/frontend/mobile), durcissement cloud/IAM/Terraform (utiliser oma-tf-infra), raisonnement sur la correction d’un finding dans le code produit (utiliser oma-debug une fois le finding produit par deepsec).

**Règles fondamentales :**
- ne jamais lancer un `process` non borné sur un dépôt dont la taille n’a pas été mesurée ; calibrer d’abord (`--limit 50 --concurrency 5`) lorsque le nombre de fichiers est inconnu ou supérieur à 500 ;
- annoncer le coût et la condition d’arrêt avant toute passe IA (≈ $25–60 pour 100 fichiers, jusqu’à $500–1 200 pour 2 000, avec une variation de ×2–3) ;
- reprendre plutôt que réinitialiser : après toute interruption (quota/réseau/Ctrl-C), relancer la même commande ; ne jamais supprimer `data/<id>/` pour repartir de zéro ;
- garder `INFO.md` court et spécifique au projet (50–100 lignes, 3–5 exemples par section) ;
- pour les gates PR/CI, utiliser le pattern à deux jobs ; ne jamais donner `pull-requests: write` au job qui exécute du code contrôlé par une PR ; épingler les actions sur des SHA complets en production ;
- demander le choix d’agent (`codex`/`gpt-5.5` ou `claude`/`claude-opus-4-8`) avant le premier appel payant ; ne jamais afficher ni commiter de credentials.

**Workflow :** PREPARE (intention, racine du dépôt, credential, budget, seuil de sévérité, agent) → ACQUIRE (config, `INFO.md`, historique des runs, signaux du dépôt) → REASON (choisir la plus petite passe suffisante) → ACT (exécuter depuis l’intérieur de `.deepsec/`) → VERIFY (`status`, `RunMeta`, code de sortie) → FINALIZE (findings par sévérité/verdict, coût en dollars, suites).

**Ressources :** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Domaine :** Détection de dérive documentaire : vérifier les références de `docs/**/*.md` dans le code (verify) et proposer des patches pour les docs touchées par un diff (sync).

**Quand l’utiliser :** après un refactor/renommage/suppression de fichier pour trouver les références obsolètes dans les docs, avant une release pour confirmer que les commandes CLI / chemins de fichiers / clés de configuration existent toujours, après un git diff important pour trouver quelles docs référencent des fichiers modifiés, lors de contrôles de dérive courants sur un dépôt riche en documentation.

**Quand NE PAS l’utiliser :** générer de la documentation depuis zéro pour des fonctionnalités non documentées, traduction multilingue de documentation (utiliser oma-translation), dérive sémantique au niveau des symboles, enforcement bloquant en CI (v1 est warn-only).

**Règles fondamentales :**
- ne jamais modifier `.agents/` (protection SSOT), quel que soit le mode ;
- ne jamais appliquer automatiquement les patches sync ; sync est toujours interactif (confirmation `[y]` requise par doc) ;
- LLM indisponible → dégradation progressive : verify revient au JSON brut, sync à la liste de candidats seule ;
- les fichiers contenant des secrets (`.env*`, `*.pem`, `*.key`, `id_rsa*`, fichiers ignorés par Git) n’apparaissent jamais dans la sortie de sync ;
- aucun appel direct à une API LLM depuis le CLI : il émet des données structurées ; le LLM hôte fait toute la synthèse et la rédaction des patches (indépendant du fournisseur) ;
- la vérification des liens URL est déléguée à `lychee` ; le hook est warn-only en v1 et ne bloque jamais la fin du workflow.

**Workflow :** verify — extract → resolve → report (CLI déterministe, exit 0 propre / 1 références cassées) ; sync — git diff → recherche inversée → candidats → propositions unified diff par l’hôte → acceptation/refus interactif → régénération de `doc-refs.json`.

**Ressources :** ressources partagées ; l’implémentation se trouve dans `cli/commands/docs/` (`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-explanation

**Domaine :** Explications interactives de changements de code.

**Quand l’utiliser :** expliquer un diff, une PR, une branche ou une plage de commits à un lecteur qui a besoin de contexte, intuition, parcours du code et petit quiz dans un artefact HTML autonome.

**Workflow :** lire le changement demandé, produire un explainer HTML autonome avec sections Background / Intuition / Code / Quiz, valider l’artefact et l’écrire sous `.agents/results/explain/`.

**Quand NE PAS l’utiliser :** page documentaire classique, implémentation live ou deck de slides (utiliser `oma-slide` pour les présentations).

**Ressources :** ressources d’exécution et de qualité partagées, plus la validation d’artefact du workflow `/explain`.

---

### oma-image

**Domaine :** Génération d’images IA multi-fournisseurs avec dispatch parallèle tenant compte de l’authentification (Codex `gpt-image-2`, modèles de la famille Gemini « nano-banana » d’Antigravity via `agy`, le modèle exact étant sélectionné en interne, Pollinations flux/zimage).

**Quand l’utiliser :** générer des images, des assets visuels, des illustrations, des photos produit, du concept art ou des mockups ; comparer les sorties de plusieurs modèles d’image pour un même prompt ; produire des images à partir de prompts dans des workflows d’éditeur.

**Quand NE PAS l’utiliser :** édition d’une image existante ou retouche photo, génération de vidéos ou d’audio (utiliser oma-video / oma-voice), composition vectorielle/SVG en ligne à partir de données structurées, simple redimensionnement d’assets ou conversion de format.

**Règles fondamentales :**
- clarifier avant d’invoquer : si le sujet/style/composition/usage est ambigu, poser d’abord la question ou amplifier le prompt et montrer à l’utilisateur la version enrichie ;
- dispatch tenant compte de l’authentification : ne lancer que les fournisseurs authentifiés ; avec `--vendor all`, chaque fournisseur demandé doit être disponible ;
- garde de coût : confirmer avant les runs dont le coût estimé est ≥ $0.20 (`--yes`/`OMA_IMAGE_YES=1` pour contourner) ; `pollinations` et `antigravity`, par défaut, sont gratuits ;
- sécurité du chemin : une sortie hors de `$PWD` nécessite `--allow-external-output` ; `n` max = 5 ;
- sorties consignées : chaque run écrit `manifest.json` à côté des images, avec le prompt, le fournisseur/modèle, les entrées et les métadonnées des artefacts ; il consigne des données de reproductibilité, sans promettre des images identiques au pixel près ;
- transmettre automatiquement les images de référence jointes via `--reference <path>` (codex/antigravity).

**Workflow :** PREPARE (clarifier/amplifier le prompt, choisir le fournisseur) → ACQUIRE (valider l’authentification, les références, le chemin de sortie) → ACT (`oma image generate`) → VERIFY (manifest, fichiers, code de sortie) → FINALIZE (chemins de sortie + avertissements).

**Ressources :** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, `config/image-config.yaml`.

---

### oma-market

**Domaine :** Recherche de marché par signaux communautaires : pain points, tendances, positionnement concurrentiel et découverte. Elle utilise le moteur upstream [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web et autres), qu’oma maintient automatiquement à la dernière version publiée.

**Quand l’utiliser :** extraire de vrais pain points d’utilisateurs à partir de posts communautaires, détecter des tendances dans une catégorie sur une fenêtre de 7/30/90/180 jours, analyser le sentiment concurrentiel et le positionnement SWOT / Porter 5F, découverte ouverte (`--discover`), recherche personne/entreprise/ticker, signaux de recrutement et drills de suivi.

**Quand NE PAS l’utiliser :** recherche web générale sans cadrage marché (utiliser directement oma-search), littérature académique (utiliser oma-scholar), dashboards live ou monitoring planifié (encapsuler ce skill avec `oma schedule <action>`).

**Règles fondamentales :**
- detect-trap d’abord : ne jamais lancer le moteur sans preflight (`--force` uniquement après reconfirmation explicite de l’utilisateur) ;
- un seul moteur, toujours le dernier : `oma market resolve` rafraîchit la copie gérée (`~/.cache/oma-market/last30days/<tag>/`) avant l’utilisation ; une copie obsolète installée par l’utilisateur n’est qu’un fallback lorsque rien n’est en cache hors ligne ;
- suivre le `SKILL.md` du moteur résolu à la lettre ; la seule substitution est `oma market run <args>` à la place de l’appel brut `python3 scripts/last30days.py` ;
- jamais de WebSearch seul : sans moteur, sans Python 3.12+ ou avec une sortie non nulle → s’arrêter et signaler ;
- les sources à clé ne sont activées que via l’assistant de configuration upstream, avec le consentement de l’utilisateur ; les sources ignorées restent visibles dans le pied de page ;
- les frameworks ne citent que les clusters du moteur ; badge en première ligne et LAWs upstream appliqués avant l’écriture du fichier ;
- un seul brief par run dans `.agents/results/market/{topic-slug}-{YYYYMMDD}.md` ; le framework bascule automatiquement selon l’intention (pain/trend → SWOT, competitor → SWOT + Porter 5F, discovery → SWOT + PESTEL).

**Workflow :** detect-trap → `oma market resolve` → lire le `SKILL.md` upstream → étapes de pré-recherche (assistant setup, résolution handle/subreddit, plan de requêtes) → `oma market run … --emit=compact` → synthétiser selon OUTPUT CONTRACT → ajouter frameworks → auto-vérifier → écrire.

**Ressources :** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md`, `frameworks/` (swot, porters-5f, pestel). CLI : `oma market detect-trap | resolve | update | run`.

---

### oma-refactor

**Domaine :** Refactoring préservant le comportement : restructuration incrémentale sûre, avec ciblage des code smells/SATD/hotspots, filets de sécurité de tests de caractérisation et commits réservés au refactoring.

**Quand l’utiliser :** exécuter un refactoring sur des fichiers/modules précis (extraire, déplacer, renommer, décomposer, aligner les idiomes), refactoring préparatoire avant une fonctionnalité, sauvetage de code legacy/brownfield (découverte de seams + tests de caractérisation), sélection des cibles de refactoring par hotspot (churn × complexité), audit pour savoir si le code peut être refactoré maintenant en toute sécurité.

**Quand NE PAS l’utiliser :** corriger un bug signalé ou un comportement défaillant (utiliser oma-debug ; un refactoring ne doit pas changer le comportement), audit de sécurité/performance/accessibilité (utiliser oma-qa), conception système / frontières de modules / ADR (utiliser oma-architecture), conception de schéma DB ou mécanique de migration (utiliser oma-db), découpage / staging de commits (utiliser oma-scm), optimisation de performance comme objectif.

**Règles fondamentales :**
- préservation du comportement : le contrat du consommateur (en tenant compte de la loi de Hyrum) est inviolable ; le tuning est un effet de bord, jamais un objectif ;
- vérifiable : ne jamais restructurer sans filet ; si le filet de sécurité manque ou est faible, écrire D’ABORD des tests de caractérisation (golden-master) dans des commits séparés ;
- incrémental : une transformation nommée par commit ; en cas d’échecs répétés, utiliser Mikado (consigner le prérequis, revert complet, récursion) ;
- séparé (deux casquettes) : ne jamais mêler de changements de comportement aux commits de refactoring (type `refactor:` uniquement) ;
- économique : la lisibilité est l’objectif dominant ; ne pas refactorer du code destiné à être supprimé ni du code froid à faible churn ;
- toute déviation de convention passe par la voie ADR d’oma-architecture, pas par une modification locale ; toutes les métriques sont des proxies (Goodhart).

**Workflow :** PREPARE (classer green/brownfield, portes de taille, classement hotspot) → ACQUIRE (lire le code via les outils de symboles, collecter métriques + signaux Git) → REASON (planifier la séquence de transformations atomiques / expand-contract) → ACT (une transformation engine-first) → VERIFY (relancer les tests inchangés → commit, ou revert Mikado) → FINALIZE (delta de métriques + verdict de lisibilité).

**Ressources :** `definition.md`, `measurement.md`, `governance.md`, plus `context-loading` et `quality-principles` partagés.

---

### oma-scholar

**Domaine :** Compagnon de recherche académique fondé sur la spécification de sidecar `.knows.yaml` de Knows : générer, valider, relire, interroger et comparer des sidecars structurés d’articles, ainsi que la récupération depuis knows.academy.

**Quand l’utiliser :** lecture d’articles économe en tokens via les sidecars (~700 tokens pour les claims seuls contre ~10 K pour un PDF complet), génération de `.knows.yaml` depuis des brouillons/LaTeX/notes, validation de la structure des sidecars avant partage, production de peer reviews sous forme de sidecars, interrogation ou résumé de sidecars existants, comparaison structurelle de deux articles, recherche/récupération depuis knows.academy.

**Quand NE PAS l’utiliser :** recherche web générale ou contenu non académique (utiliser oma-search), traduction d’articles (utiliser oma-translation), simple parsing de PDF sans sidecar (utiliser oma-pdf), workflow complet de peer review avec système éditorial.

**Modes :** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Règles fondamentales :**
- la spécification cible est v0.9.0 / profil `paper@1` ; le LLM hôte génère les sidecars (ne jamais faire de shell-out vers un SDK LLM externe) ;
- anti-fabrication : si DOI/venue/year n’est pas visible dans la source, omettre entièrement la clé ; ne jamais écrire `doi: TODO` ni deviner ;
- noms de champs exacts, un seul objet `provenance.actor`, enums fermés, nombres non quotés ;
- densité relationnelle ≥ 1.5 par statement ; chaque claim exige une preuve `supported_by` ;
- valider avant partage (`oma scholar lint`) ; utiliser `--lenient` pour les sidecars tiers ;
- knows.academy → fallback OpenAlex pour les articles anciens/non-2026 ; l’API proxy publique ne nécessite aucune authentification.

**Workflow :** PREPARE (mode + source) → ACQUIRE (métadonnées, sections ou texte local) → REASON (claims/evidence/relations) → ACT (generate/lint/review/analyze/compare/fetch) → VERIFY (schéma, enums, IDs, relations) → FINALIZE (sidecar/rapport/résumé avec réserves).

**Ressources :** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md`, `config/scholar-config.yaml`.

---

### oma-skill-creation

**Domaine :** Créer et valider des skills OMA au format Markdown SSL-lite (Scheduling / Structural Flow / Logical Operations / References).

**Quand l’utiliser :** créer un nouveau skill sous `.agents/skills/{name}/SKILL.md`, mettre à jour un skill existant au format SSL-lite, ajouter un chemin canonique de commande/workflow à un skill riche en exécution, auditer si un skill contient assez de détails de routage/exécution/validation/récupération, décider si les exemples vont inline ou dans `resources/`.

**Quand NE PAS l’utiliser :** installer des skills tiers dans `$CODEX_HOME/skills` (externe), créer un bundle de plugin Codex (externe), écrire un plan de projet général sans rapport avec la création de skills (utiliser oma-pm), modifier directement du code produit/infrastructure/frontend/backend/mobile (utiliser le skill spécialisé correspondant).

**Règles fondamentales :**
- conserver exactement les quatre sections de premier niveau : Scheduling, Structural Flow, Logical Operations, References ;
- conserver un frontmatter YAML avec des `name` et `description` clairs ; lancer `oma skill audit` après modification de la description (warning ≥ 60 %, échec ≥ 75 % de collision cosinus TF-IDF) ;
- inclure des frontières `When NOT to use` concrètes, avec des routes croisées vers les skills adjacents ;
- ajouter exactement un chemin canonique inline (`Canonical command path` pour les commandes fragiles/répétables, `Canonical workflow path` pour les flux de jugement/recherche) ;
- placer le détail long propre aux variantes dans `resources/`, pas dans le corps principal ; ne pas créer de docs README/changelog/install dans un skill.

**Workflow :** PREPARE (but, déclencheurs, frontières, entrées/sorties, dépendances) → ACQUIRE (lire 1–3 skills analogues + conventions) → REASON (inline vs `resources/`) → ACT (rédiger depuis le modèle SSL-lite) → VERIFY (contrôles de structure/routage/exécution/format) → FINALIZE (fichiers modifiés + rapport de validation).

**Ressources :** `ssl-lite-template.md`, `validation-checklist.md`, plus `context-loading` et `quality-principles`.

---

### oma-slide

**Domaine :** Génération de decks HTML riches en animations sur une scène fixe 1920×1080, avec validate/bundle/export déterministes vers PDF/PNG/PPTX par le CLI `oma slide`.

**Quand l’utiliser :** créer une nouvelle présentation à partir d’un sujet ou d’un plan, améliorer ou reformater un deck existant, générer du HTML slide par slide avec animations et esthétique issue de la design-doctrine, exporter un deck en PDF/PNG/PPTX, appliquer un preset de style nommé, exporter vers Canva ou en importer.

**Quand NE PAS l’utiliser :** création de document simple sans slides, génération d’image seule (utiliser directement oma-image), définition de marque/design system (utiliser oma-design), opérations CLI déterministes (validate/bundle/export) sans génération (appeler directement le CLI `oma slide`).

**Règles fondamentales :**
- le skill rédige le HTML ; le CLI fait tout le reste (scaffold, validate, bundle, export) ;
- assets locaux uniquement : aucune URL distante dans `<img src>`/`<video src>`, seulement `./assets/<file>` ;
- CJK → police Pretendard requise sur toute slide en coréen/japonais/chinois ;
- wrapper `prefers-reduced-motion`, états de focus visibles et `data-om-validate` requis sur chaque slide ;
- 3 itérations d’auto-correction au maximum lors de la validation, puis présenter le diff à l’utilisateur ;
- déléguer la génération d’images à oma-image ; Canva MCP est facultatif et n’est provisionné automatiquement qu’avec le consentement explicite de l’utilisateur.

**Workflow :** 7 phases — DETECT (mode), DISCOVER (clarifier + évaluer les assets), STYLE (3 previews live → choix de l’utilisateur), GENERATE (`slide-NN.html` en 1920×1080), VALIDATE (`oma slide validate`, ≤3 boucles d’auto-correction), REVIEW (viewer + éditeur bbox optionnel), DELIVER (`bundle` + export PDF/PNG/PPTX optionnel).

**Ressources :** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md`, et répertoire `assets/`.

---

### oma-video

**Domaine :** Générer des vidéos courtes, explicatives ou de démo humaine via le CLI `oma video`, en composant script → narration → visuels → sous-titres → rendu HyperFrames.

**Quand l’utiliser :** générer des vidéos courtes (shorts/reels, 9:16) à partir d’un sujet, des explainers (16:9/9:16) à partir d’un README/code/données, des démos/walkthroughs à partir d’une capture d’écran (`--source file`) ou d’une capture web supervisée en mode headed de n’importe quelle URL d’application web (`--source web`), refaire le rendu d’un run existant de façon déterministe.

**Quand NE PAS l’utiliser :** générer une image fixe unique (utiliser oma-image), générer un deck de slides (utiliser oma-slide ; video l’appelle en interne pour les frames d’explainer), générer uniquement de l’audio parlé (utiliser oma-voice), montage non linéaire d’un mp4 fini existant, live streaming (la capture web supervisée reste dans le périmètre).

**Règles fondamentales :**
- clarifier ou inférer le mode avant d’invoquer ; montrer à l’utilisateur le plan inféré plutôt que de rendre silencieusement à partir d’un brief vague ;
- la configuration des fournisseurs est facultative pour les fallbacks d’assets pris en charge ; les fournisseurs payants (Pexels, Pixelle) ne s’activent automatiquement que lorsque leur clé d’environnement est présente, alors qu’une panne du compositeur n’est jamais remplacée par une vidéo de fallback ;
- garde de coût à ≥ `$0.20` (`--yes`/`OMA_VIDEO_YES=1` pour contourner) ; limites de 180 s de durée / 40 scènes ;
- les entrées du rendu sont enregistrées dans `render-spec.json`, les assets, le seed et le Pretendard embarqué ; `OMA_VIDEO_MOCK=1` est un harnais de test pour les fixtures golden, pas un livrable utilisateur ;
- la démo est human-in-the-loop : la capture web ouvre uniquement un navigateur headed et enregistre pendant qu’un humain pilote le parcours — AUCUNE automatisation d’identifiants ; `--url` et tokens masqués dans les logs/manifest ;
- sécurité du chemin (`--allow-external-output` pour une sortie hors de `$PWD`).

**Workflow :** PREPARE (mode/aspect/locale, clarifier/amplifier le brief) → ACQUIRE (sonder la disponibilité des fournisseurs, valider le chemin de capture, vérifier le coût) → ACT (script → voice ∥ visuals ∥ captions → render-spec → render) → VERIFY (schéma, hashes du manifest, code de sortie, mp4) → FINALIZE (run-dir + chemin du mp4 + avertissements de couverture).

**Ressources :** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, ainsi que les guides de mode `hyperframes-authoring/`, le driver de capture web et le compositeur de fallback `mpt/` ; `config/video-config.yaml`.

---

### oma-voice

**Domaine :** Text-to-speech et speech-to-text local-first via le serveur MCP Voicebox : entièrement sur l’appareil, sans cloud, clé API ni coût par appel.

**Quand l’utiliser :** générer de courts audios de notification pour la fin de tâche ou les blocages d’un agent, produire des voiceovers/narrations/assets audio (mp3 ou wav), transcrire des fichiers audio locaux (mp3, wav, m4a, webm, flac) vers Markdown, comparer des profils vocaux en relançant le même texte avec différents identifiants de profil.

**Quand NE PAS l’utiliser :** TTS cloud ou voix cloud multilingues haute fidélité, dictée micro en temps réel dans le terminal (utiliser la dictée par raccourci clavier de Voicebox), envoi d’échantillons de clonage de voix / création de profil (réalisés dans l’interface de l’application desktop Voicebox), vidéo/musique/sound design.

**Règles fondamentales :**
- Voicebox requis : en cas d’échec du handshake ou de `GET /health`, sortir avec une indication unique d’installation/lancement ; ne pas réessayer ni relancer automatiquement ;
- profil requis : si `voicebox_list_profiles` est vide, orienter l’utilisateur vers l’interface de l’application, puis sortir ;
- limites de longueur : le TTS plafonne à 5000 caractères par appel (avertissement à 2000), le STT à 30 minutes ; la v1 ne découpe pas automatiquement ;
- transparence de l’invocation automatique : les notifications ne se déclenchent que lorsque la tâche dépasse `auto_notify_after_sec` (60 s par défaut) ; toujours annoncer l’intention en une ligne ;
- sécurité du chemin (avertir + confirmer pour une sortie hors de `$PWD`) ; SIGINT n’écrit aucune sortie partielle ;
- manifest requis à chaque génération ; aucune garde de coût (Voicebox est gratuit).

**Workflow :** PREPARE (valider texte/audio/langue/chemin/profil) → ACQUIRE (clarifier une fois si un signal manque) → ACT (MCP `voicebox_speak` ou `voicebox_transcribe`) → VERIFY (présence de l’audio/de la transcription + champs du manifest) → FINALIZE (écrire `manifest.json`, indiquer le chemin).

**Ressources :** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md`, `config/voice-config.yaml`.

---

## Prévol du charter (CHARTER_CHECK)

Avant d’écrire du code, chaque agent d’implémentation doit produire un bloc CHARTER_CHECK :

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**Objectif :**
- déclarer ce que l’agent fera et ne fera pas ;
- détecter la dérive du périmètre avant l’écriture du code ;
- rendre les hypothèses explicites pour la revue utilisateur ;
- fournir des critères de succès testables.

**Niveaux de clarification :**
- **LOW** : exigences claires. Procéder avec les hypothèses énoncées.
- **MEDIUM** : exigences partiellement ambiguës. Lister les options et avancer avec la plus probable.
- **HIGH** : exigences très ambiguës. Passer au statut blocked, lister les questions et NE PAS écrire de code.

En mode sous-agent (lancé par CLI), l’agent ne peut pas interroger directement l’utilisateur. LOW avance, MEDIUM restreint et interprète, HIGH bloque et renvoie les questions à transmettre par l’orchestrateur.

---

## Chargement des skills en deux couches

Les connaissances de chaque agent se répartissent sur deux couches.

**Couche 1 : SKILL.md (~3 100 tokens en médiane)**
Toujours chargée. Elle contient le frontmatter (nom, description), les conditions d’utilisation, les règles fondamentales, l’architecture, la liste des bibliothèques et les références vers la couche 2.

**Couche 2 : resources/ (chargée à la demande)**
Chargée seulement lorsque l’agent travaille et seulement pour le type et la difficulté de tâche correspondants :

| Difficulté | Ressources chargées |
|-----------|---------------------|
| **Simple** | execution-protocol.md uniquement |
| **Medium** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Ressources supplémentaires chargées pendant l’exécution :
- `checklist.md` : à l’étape Verify ;
- `error-playbook.md` : seulement en cas d’erreur ;
- `common-checklist.md` : vérification finale des tâches Complex.

---

## Exécution dans un périmètre

Les agents opèrent avec des limites de domaine strictes :

- un agent frontend ne modifie pas le backend ;
- un agent backend ne touche pas aux composants UI ;
- un agent DB n’implémente pas les endpoints API ;
- les agents documentent les dépendances hors périmètre pour les autres agents.

Lorsqu’une tâche relève d’un autre domaine, l’agent la consigne dans son fichier de résultat comme élément d’escalade au lieu d’essayer de la traiter.

---

## Stratégie de workspace

Pour les projets multi-agents, des workspaces séparés évitent les conflits de fichiers :

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Les workspaces se définissent avec le flag `-w` lors du lancement :

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Flux d’orchestration

Lors d’un workflow multi-agents (`/orchestrate` ou `/work`) :

1. **L’agent PM** décompose la demande en tâches de domaine avec priorités (P0, P1, P2) et dépendances.
2. **Session initialisée :** ID de session généré, `orchestrator-session-{sessionId}.md` et `task-board-{sessionId}.md` créés dans le magasin mémoire configuré.
3. **Tâches P0** lancées en parallèle (jusqu’à MAX_PARALLEL agents simultanés).
4. **Progression surveillée :** l’orchestrateur interroge les fichiers `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` propres aux runs à chaque POLL_INTERVAL.
5. **Tâches P1** lancées après les P0, puis les niveaux suivants.
6. **Boucle de vérification** pour chaque agent terminé (auto-revue -> vérification automatisée -> revue croisée QA).
7. **Résultats collectés** dans les fichiers de résultat propres aux runs et les claims structurées.
8. **Rapport final** avec résumé de session, fichiers modifiés et problèmes restants.

---

## Définitions des agents

Les agents sont définis à deux emplacements.

**`.agents/agents/` :** 12 définitions de sous-agents suivies dans la source de vérité :
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`
- `docs-curator.md`
- `refactor-engineer.md`
- `research-explorer.md`

Ces fichiers définissent identité, référence du protocole, modèle CHARTER_CHECK, résumé d’architecture et règles. Ils sont utilisés pour lancer des sous-agents via l’outil Task/Agent (Claude Code) ou le CLI.

Le runtime expose aussi 13 rôles de dispatch canoniques : `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` et `explore`. `research-explorer.md` est la définition suivie associée à `explore` ; `orchestrator` est un rôle runtime de coordination sans fichier de définition séparé.

**Projections propres aux fournisseurs :** OMA matérialise les définitions source dans les fichiers d’agents du runtime :
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` et d’autres projections lorsque le fournisseur les prend en charge.

Ces fichiers générés sont rafraîchis par `oma link`, `oma install` et `oma update`.

---

## État runtime (magasin mémoire du projet)

Pendant une session d’orchestration, les agents se coordonnent par des fichiers mémoire partagés dans `.agents/state/memories/` (les projets anciens utilisent en fallback `.serena/memories/`, configurable via `mcp.json`) :

| Fichier | Propriétaire | Rôle | Autres |
|---------|--------------|------|--------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | ID de session, état, heure de début, phases | Lecture seule |
| `task-board-{sessionId}.md` | Orchestrator | Affectations, priorités et statuts | Lecture seule |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Ce run | Progression tour par tour : actions, fichiers lus/modifiés, statut | Lu par l’orchestrateur |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Ce run | Sortie finale : statut (completed/failed), résumé, fichiers modifiés, checklist des critères | Lu par l’orchestrateur |
| `session-metrics.md` | Orchestrator | Preuves de session facultatives et résultats d’expériences mesurés | Lu par QA |
| `experiment-ledger.md` | Orchestrator/QA | Preuves pour de véritables expériences | Lu par tous |

Les outils mémoire sont configurables. Par défaut, les agents lisent et écrivent directement ces fichiers avec leurs outils natifs (`Read`, `Write`, `Edit`), mais des outils et un chemin de base personnalisés peuvent être définis dans `mcp.json` :

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```

Les tableaux de bord (`oma dashboard terminal` et `oma dashboard web`) surveillent ces fichiers mémoire pour le suivi en temps réel.
