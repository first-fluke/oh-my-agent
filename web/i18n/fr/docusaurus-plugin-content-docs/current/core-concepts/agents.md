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

**Domaine :** Architecture logicielle/système : frontières de modules et services, compromis, synthèse des parties prenantes et décisions.

**Quand l’utiliser :** choisir ou revoir une architecture, définir les frontières module/service/propriété, comparer des options avec des compromis explicites, enquêter sur l’amplification des changements, les dépendances cachées et les APIs maladroites, prioriser les investissements architecturaux ou rédiger des recommandations et ADR.

**Quand NE PAS l’utiliser :** systèmes visuels/design (oma-design), planification de fonctionnalité (oma-pm), implémentation Terraform (oma-tf-infra), diagnostic de bug (oma-debug), revue sécurité/performance/accessibilité (oma-qa).

**Méthodologies :** routage diagnostique, comparaison design-twice, analyse de risques façon ATAM, priorisation façon CBAM et décisions façon ADR.

**Règles fondamentales :**
- diagnostiquer le problème architectural avant de choisir une méthode ;
- employer la méthodologie suffisante la plus légère ;
- distinguer design architectural, design UI/visuel et livraison Terraform ;
- consulter les agents concernés uniquement si la décision transversale le justifie ;
- privilégier la qualité de la recommandation au théâtre du consensus : consulter largement, décider explicitement ;
- énoncer hypothèses, compromis, risques et validation pour chaque recommandation ;
- tenir compte des coûts d’implémentation, d’exploitation, de complexité d’équipe et d’évolution.

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
- JWT + Argon2id pour l’authentification (bcrypt acceptable for legacy compatibility only) ; rate limit auth endpoints (limiter le débit des endpoints d’authentification) ;
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

**Quand l’utiliser :** applications iOS + Android, patterns UI mobiles, caméra/GPS/notifications push, architecture offline-first et applications iOS natives en SwiftUI avec `swift-openapi-generator`.

**Architecture :** Clean Architecture : domain -> data -> presentation. Pour Swift iOS : structure `App/Core/Features/Shared`.

**Stacks techniques :**
- Flutter/Dart : Riverpod/Bloc (état), Dio avec intercepteurs (API), GoRouter (navigation), Material Design 3 (Android) + iOS HIG ;
- iOS natif Swift (iOS 17+) : SwiftUI + `@Observable` (framework Observation), clients API Apple `swift-openapi-generator`, structure `App/Core/Features/Shared`.

**Règles fondamentales :**
- Riverpod/Bloc pour l’état (pas de `setState` brut pour la logique complexe) ;
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

**Quand l’utiliser :** systèmes de design, landing pages, tokens, palettes, typographie, responsive et revue d’accessibilité.

**Workflow :** 7 phases : Setup (contexte) -> Extract (optionnel, URL de référence) -> Enhance (prompt vague) -> Propose (2–3 directions) -> Generate (DESIGN.md + tokens) -> Audit (responsive, WCAG, Nielsen, anti-AI slop) -> Handoff.

**Application des anti-patterns (« no AI slop ») :**
- typographie : stack système par défaut ; pas de Google Fonts par défaut sans justification ;
- couleur : pas de dégradés violet-bleu, d’orbes/blobs en dégradé ou de blanc pur sur noir pur ;
- mise en page : pas de cartes imbriquées, de layout uniquement desktop ou de statistiques génériques à 3 métriques ;
- animation : pas d’easing rebond partout, pas d’animations > 800 ms, respecter prefers-reduced-motion ;
- composants : pas de glassmorphisme partout, alternatives clavier/tactile pour tout élément interactif.

**Règles fondamentales :** vérifier `.design-context.md` d’abord et le créer s’il manque ; stack de polices système par défaut (CJK-ready pour ko/ja/zh) ; WCAG AA minimum ; responsive-first ; présenter 2–3 directions et obtenir confirmation.

**Ressources :** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, ainsi que `reference/` (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d).

---

### oma-tf-infra

**Domaine :** Infrastructure-as-code avec Terraform et multi-cloud.

**Quand l’utiliser :** AWS/GCP/Azure/Oracle Cloud, Terraform, auth CI/CD (OIDC), CDN/load balancers/stockage/réseau, état et infrastructure conforme ISO.

**Détection cloud :** lire les fournisseurs Terraform et préfixes (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Inclut une table complète des ressources multi-cloud.

**Règles fondamentales :** fournisseur agnostique ; détecter le cloud dans le contexte ; état distant versionné et verrouillé ; OIDC d’abord ; toujours planifier avant apply ; IAM au moindre privilège ; taguer tout (Environment, Project, Owner, CostCenter) ; aucun secret dans le code ; épingler les versions des fournisseurs et modules ; pas d’auto-approve en production.

**Ressources :** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domaine :** Automatisation monorepo et CI/CD.

**Quand l’utiliser :** serveurs de développement, lint/format/typecheck, migrations, génération d’API, builds i18n et production, optimisation CI/CD et validation pre-commit.

**Règles fondamentales :** toujours utiliser les tâches `mise run` plutôt que les commandes directes du gestionnaire de paquets ; lint/test uniquement sur les applications modifiées ; valider les commits avec commitlint ; la CI ignore les applications inchangées ; ne jamais utiliser une commande directe si une tâche mise existe.

**Ressources :** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-observability

**Domaine :** Routeur d’observabilité et de traçabilité par intention, à travers couches, frontières et signaux.

**Quand l’utiliser :** pipelines OTel SDK + Collector + backend, traçabilité entre services/domaines (propagateurs W3C, baggage, multi-tenant, multi-cloud), réglage UDP/MTU et OTLP, topologie Collector, sampling, investigation en 6 dimensions, sélection de catégories de fournisseurs, observability-as-code (Grafana Jsonnet, PrometheusRule, OpenSLO, alertes SLO), méta-observabilité, signaux MELT+P et migration depuis Fluentd.

**Quand NE PAS l’utiliser :** LLM ops/gen_ai (Langfuse, Arize Phoenix, LangSmith, Braintrust), lineage de pipeline (OpenLineage + Marquez, dbt test, Airflow lineage), télémétrie physique IoT/datacenter (Nlyte, Sunbird, Device42), chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), GPU/TPU (NVIDIA DCGM Exporter), supply chain (sigstore, in-toto, SLSA), paging/réponse incident (PagerDuty, OpsGenie, Grafana OnCall) ou installation mono-fournisseur couverte par son skill.

**Règles fondamentales :** classer l’intention setup | migrate | investigate | alert | trace | tune | route ; router par catégorie, pas par registre de fournisseurs, via `resources/vendor-categories.md` ; couvrir le réglage du transport (UDP/MTU, OTLP, topologie, sampling) ; valider la santé du pipeline, dérive d’horloge (< 100 ms), cardinalité et rétention ; préférer CNCF (Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco) ; Fluentd est obsolète (CNCF 2025-10), recommander Fluent Bit ou OTel Collector ; W3C Trace Context par défaut et traduction cloud (`X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd) ; traiter confidentialité avant fonctionnalités (PII, baggage, SOC2/ISO, GDPR/PIPA).

**Ressources :** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, plus `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) et `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domaine :** Assurance qualité couvrant sécurité, performance, accessibilité et qualité du code.

**Quand l’utiliser :** revue finale avant déploiement, audit de sécurité, analyse de performance, conformité accessibilité et analyse de couverture de tests.

**Ordre de priorité :** Sécurité > Performance > Accessibilité > Qualité du code.

**Niveaux de sévérité :**
- **CRITICAL** : brèche de sécurité ou risque de perte de données ;
- **HIGH** : bloque le lancement ;
- **MEDIUM** : à corriger dans ce sprint ;
- **LOW** : backlog.

**Règles fondamentales :** chaque constat doit contenir fichier:ligne, description et correction ; exécuter d’abord les outils automatisés (npm audit, bandit, lighthouse) ; aucun faux positif, chaque constat doit être reproductible ; fournir du code de remédiation, pas seulement une description.

**Ressources :** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

---

### oma-debug

**Domaine :** Diagnostic et correction de bugs.

**Quand l’utiliser :** bugs signalés, plantages, problèmes de performance, défaillances intermittentes, conditions de concurrence et régressions.

**Méthodologie :** reproduire d’abord, diagnostiquer ensuite. Ne jamais deviner une correction.

**Règles fondamentales :** identifier la cause profonde, pas seulement les symptômes ; appliquer une correction minimale ; accompagner chaque correction d’un test de régression ; rechercher les motifs similaires ; documenter dans `.agents/results/`.

**Outils d’intelligence du code (Gortex ou Serena) :**
- `find_symbol("functionName")` ou navigation de symboles Gortex : localiser la fonction ;
- `find_referencing_symbols("Component")` ou analyse d’impact Gortex : trouver toutes les utilisations ;
- `search_for_pattern("error pattern")` ou recherche Gortex : trouver les problèmes similaires.

**Ressources :** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

---

### oma-translation

**Domaine :** Traduction multilingue contextuelle.

**Quand l’utiliser :** traduire des chaînes UI, de la documentation ou du marketing, revoir des traductions existantes et créer des glossaires.

**Flux en six scènes :** Prepare, Acquire, Reason, Act, Verify et Finalize. La méthode de traduction suit quatre étapes : lire le sens et la syntaxe protégée, choisir le registre, reconstruire dans la langue cible et préserver le style de l’auteur lorsqu’il doit l’être.

**Règles fondamentales :** parcourir d’abord les fichiers de locale existants ; traduire le sens et non les mots ; préserver les connotations émotionnelles ; ne jamais traduire mot à mot ; ne pas mélanger les registres ; conserver les termes propres au domaine tels quels.

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

**Suivi de la dette de clarification :** suivre les corrections utilisateur (clarify +10, correct +25, redo +40). CD >= 50 déclenche une RCA obligatoire ; CD >= 80 met la session en pause.

**Ressources :** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domaine :** Gestion de configuration logicielle (SCM) et Git : branches, fusions, worktrees, baselines, préparation aux audits et Conventional Commits.

**Quand l’utiliser :** après des changements de code (`/scm`), en cas de conflit de fusion, pour les stratégies de branche, releases/tags et questions de gestion de configuration.

**Types de commit :** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow des commits :** analyser les changements -> séparer par fonctionnalité si nécessaire -> type -> scope -> description (impératif, moins de 72 caractères, minuscules, sans point final) -> commiter avec des chemins explicites.

**Règles :** ne jamais `git add -A` ni `git add .` ; ne jamais commiter de secrets ; toujours spécifier les fichiers au staging ; utiliser HEREDOC pour les messages multilignes ; n’inclure les trailers de co-auteur que si la configuration effective `scm.co_author` les active et fournit le nom et l’adresse.

---

### oma-coordination

**Domaine :** Guide de coordination manuelle de plusieurs agents, étape par étape.

**Quand l’utiliser :** projets complexes où l’utilisateur veut contrôler chaque porte, obtenir des indications manuelles de lancement et suivre des recettes de coordination détaillées.

**Quand NE PAS l’utiliser :** exécution parallèle entièrement automatisée (oma-orchestration), tâche dans un seul domaine (agent de domaine direct).

**Règles fondamentales :** présenter le plan avant de lancer les agents ; traiter un niveau de priorité à la fois et attendre sa fin ; obtenir l’accord de l’utilisateur pour chaque transition ; rendre la revue QA obligatoire avant fusion ; boucler sur la remédiation des constats CRITICAL/HIGH.

**Workflow :** PM planifie -> utilisateur confirme -> lancement par priorité -> surveillance -> revue QA -> correction -> livraison.

**Différence avec oma-orchestration :** Coordination est manuelle et guidée (l’utilisateur contrôle le rythme) ; l’orchestrateur est automatisé (lancement et exécution avec peu d’intervention).

---

### oma-search

**Domaine :** Routeur de recherche par intention avec scoring de confiance du domaine. Route vers Context7 (docs), recherche web native, `gh`/`glab` (code) et intelligence locale du code (Gortex ou Serena).

**Quand l’utiliser :** documentation officielle de bibliothèques/frameworks, recherche web de tutoriels et comparaisons, recherche GitHub/GitLab de motifs d’implémentation, requêtes dont le canal est incertain et infrastructure de recherche partagée par les autres skills.

**Quand NE PAS l’utiliser :** exploration locale seule (MCP d’intelligence du code), historique Git/blame (oma-scm), recherche architecturale complète (oma-architecture, qui peut l’invoquer).

**Règles fondamentales :** classifier l’intention avant chaque recherche via IntentClassifier ; une requête, une meilleure route sauf ambiguïté ; noter la confiance de chaque résultat et étiqueter les résultats non locaux via le registre ; les flags remplacent le classifieur : `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab` ; échouer en avançant (docs→web, web→stratégies `oma search fetch`) ; pas de MCP supplémentaire (Context7 pour docs, runtime pour web, CLI pour code, fournisseur configuré pour local) ; recherche web indépendante du fournisseur (WebSearch, Google, Bing) ; confiance au niveau du domaine, sans score de sous-chemin ou de page.

**Ressources :** `SKILL.md`, répertoire `resources/` avec classifieur d’intention, routes et registre de confiance.

---

### oma-recap

**Domaine :** Analyse d’historique de conversations entre outils IA (Claude, Codex, Qwen, Cursor) avec résumés quotidiens ou périodiques thématiques.

**Quand l’utiliser :** résumer une journée ou période, comprendre le flux entre outils, analyser les changements d’outil entre sessions et préparer standups, rétros hebdomadaires ou journaux de travail.

**Quand NE PAS l’utiliser :** rétrospective basée sur les commits (utiliser `oma retro`), monitoring en temps réel (utiliser `oma dashboard terminal`), métriques de productivité (utiliser `oma stats get`).

**Processus :**
1. résoudre la date ou fenêtre depuis le langage naturel (today, yesterday, last Monday, date explicite) ;
2. récupérer via `oma recap --date YYYY-MM-DD` ou `--since` / `--until` ;
3. regrouper par outil et session ;
4. extraire les thèmes (fonctionnalités, bugs, outils explorés) ;
5. produire le résumé quotidien/périodique thématique.

**Ressources :** `SKILL.md`. Le travail lourd est délégué au CLI `oma recap`.

---

### oma-hwp

**Domaine :** Conversion HWP / HWPX / HWPML vers Markdown avec `kordoc`.

**Quand l’utiliser :** convertir des documents HWP coréens (`.hwp`, `.hwpx`, `.hwpml`), préparer des documents gouvernementaux/entreprise pour LLM/RAG et extraire titres, tableaux, listes, images, notes et hyperliens.

**Quand NE PAS l’utiliser :** PDF (oma-pdf), XLSX/DOCX, génération/édition HWP ou fichiers déjà textuels (outil Read direct).

**Règles fondamentales :** utiliser `bunx kordoc@latest` (toujours `@latest` ou une version fixée) ; sortie Markdown par défaut ; sans dossier de sortie, écrire à côté de l’entrée ; kordoc préserve titres, tableaux, tableaux imbriqués, notes, hyperliens et images ; ses défenses ZIP bomb/XXE/SSRF/XSS sont suffisantes, ne pas en ajouter ; signaler clairement HWP chiffré ou verrouillé DRM ; post-traiter avec `resources/flatten-tables.ts` pour convertir les `<table>` HTML en tables GFM et retirer les caractères Private Use Area de Hancom.

**Ressources :** `SKILL.md`, `config/`, `resources/flatten-tables.ts`.

---

### oma-pdf

**Domaine :** Conversion PDF vers Markdown avec `opendataloader-pdf`.

**Quand l’utiliser :** convertir des PDF en Markdown pour LLM/RAG, extraire tableaux, titres, listes et images, préparer des données PDF.

**Quand NE PAS l’utiliser :** créer un PDF, modifier un PDF existant ou lire simplement un fichier déjà textuel.

**Règles fondamentales :** utiliser `uvx opendataloader-pdf` ; sortie Markdown par défaut ; sans sortie, écrire dans le dossier du PDF ; préserver la structure ; utiliser le mode hybride OCR pour les scans ; toujours exécuter `uvx mdformat` ; valider la lisibilité et la structure ; signaler les tableaux manquants et textes corrompus.

**Ressources :** `SKILL.md`, `config/`, `resources/`.

---

### oma-academic-writing

**Domaine :** Prose académique anglaise de niveau publication : rédaction, révision et audit d’essais, rapports, analyses, résumés exécutifs, conclusions et revues de littérature.

**Quand l’utiliser :** rédiger ou réviser des rapports/essais/analyse, écrire des executive summaries ou conclusions, réécrire une prose qui sonne IA, viser un niveau HD/A/top-band ou revoir structure, verbes, hedging et conformité anti-IA.

**Quand NE PAS l’utiliser :** traduction (oma-translation), découverte/citations/recherche (oma-scholar), décomposition de rubric (oma-pm), documentation de code (skill du domaine), texte informel/marketing ou rédaction académique non anglaise (rédiger en anglais puis transmettre à oma-translation).

**Modes :** `draft` (titre + prose + Writing Notes + Claim-Evidence Map), `revise` (original + version révisée + changements), `review` (rapport PASS/FAIL sur structure, verbes, anti-IA, spécificité, hedging, clarté, rythme et correspondance claim/evidence).

**Règles fondamentales :** citer la contrainte littérale avant de juger ; chaque phrase doit être vérifiable, sans données/statistiques/citations inventées ; les verbes génériques interdits (`show`, `have`, `make`, `do`, `get`, `use`, …) ne doivent pas être verbes principaux ; varier type, longueur et débuts de phrases, jamais trois phrases de même type successives ; calibrer le hedge sur la force des preuves, sans `I think`/`I believe` ; relier chaque claim à une preuve dans la Claim-Evidence Map.

**Workflow :** 6 étapes — lire rubric/brouillon et citer les contraintes, planifier les paragraphes Topic-Support-Conclude, rédiger sous les quatre protocoles, auditer la checklist anti-IA, faire le reverse outline et la Claim-Evidence Map, polir (lecture à voix haute, cohésion, précision, longueur, rythme).

**Ressources :** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md`, plus `context-loading` et `quality-principles` partagés.

---

### oma-deepsec

**Domaine :** Piloter de bout en bout le scanner de vulnérabilités `deepsec` de Vercel, avec maîtrise du coût, dans un dépôt cible.

**Quand l’utiliser :** première installation (`init`, INFO.md, scan de calibration), scan complet ou ciblé et traitement des findings, gate CI par PR avec `process --diff`, matchers propres au projet, triage (sévérité, réduction des faux positifs via `revalidate`, export) et diagnostic des échecs deepsec.

**Quand NE PAS l’utiliser :** revue OWASP/lint sans deepsec (oma-qa), advisories CVE (oma-qa ou oma-search), architecture SAST non-deepsec (oma-architecture), code applicatif (oma-backend/frontend/mobile), durcissement cloud/IAM/Terraform (oma-tf-infra) ou correction d’un finding produit (oma-debug après deepsec).

**Règles fondamentales :**
- ne jamais lancer `process` sans mesurer la taille du dépôt ; calibrer d’abord (`--limit 50 --concurrency 5`) si le nombre de fichiers est inconnu ou supérieur à 500 ;
- annoncer coût et condition d’arrêt avant tout passage IA (≈ $25–60 pour 100 fichiers, jusqu’à $500–1 200 pour 2 000, variation ×2–3) ;
- reprendre plutôt que réinitialiser : après quota/réseau/Ctrl-C, relancer la même commande et ne jamais supprimer `data/<id>/` ;
- garder `INFO.md` court et spécifique au projet (50–100 lignes, 3–5 exemples par section) ;
- pour PR/CI, utiliser le pattern à deux jobs, ne jamais donner `pull-requests: write` au job exécutant du code contrôlé par une PR et épingler les actions sur des SHA complets ;
- demander le choix d’agent (`codex`/`gpt-5.5` ou `claude`/`claude-opus-4-8`) avant le premier appel payant, sans jamais afficher ni commiter de credentials.

**Workflow :** PREPARE (intention, racine, credential, budget, seuil, agent) → ACQUIRE (config, `INFO.md`, historique, signaux) → REASON (plus petite passe suffisante) → ACT (depuis `.deepsec/`) → VERIFY (`status`, `RunMeta`, code de sortie) → FINALIZE (findings par sévérité/verdict, coût, suites).

**Ressources :** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Domaine :** Détection de dérive documentaire : vérifier les références de `docs/**/*.md` dans le code (verify) et proposer des patches pour les docs touchées par un diff (sync).

**Quand l’utiliser :** après refactor/renommage/suppression, avant une release pour valider commandes/chemins/clés, après un diff important pour trouver les docs concernées et lors d’un contrôle courant d’un dépôt riche en documentation.

**Quand NE PAS l’utiliser :** générer de la documentation depuis zéro (oma-translation pour la traduction multilingue), dérive au niveau symbole, enforcement bloquant en CI (v1 est warn-only).

**Règles fondamentales :** ne jamais modifier `.agents/` ; ne jamais appliquer automatiquement les patches sync (confirmation `[y]` par doc) ; sans LLM, verify revient au JSON brut et sync à la liste de candidats ; les secrets (`.env*`, `*.pem`, `*.key`, `id_rsa*`, fichiers ignorés) ne sortent jamais dans sync ; le CLI n’appelle pas directement une API LLM, l’hôte produit synthèse et patches ; le contrôle des URL passe par `lychee`, warn-only en v1.

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

**Domaine :** Génération d’images IA multi-fournisseurs avec dispatch parallèle tenant compte de l’authentification (Codex `gpt-image-2`, modèles Gemini « nano-banana » Antigravity via `agy`, Pollinations flux/zimage).

**Quand l’utiliser :** images, assets visuels, illustrations, photos produit, concept art, mockups, comparaison de modèles ou génération depuis un workflow d’éditeur.

**Quand NE PAS l’utiliser :** édition d’image existante, vidéo/audio (oma-video/oma-voice), composition vectorielle/SVG structurée ou simple conversion de taille/format.

**Règles fondamentales :** clarifier si sujet/style/composition/usage est ambigu ou amplifier le prompt ; ne lancer que les fournisseurs authentifiés (avec `--vendor all`, tous demandés doivent être disponibles) ; garde de coût à ≥ $0.20 (`--yes`/`OMA_IMAGE_YES=1` pour contourner), `pollinations` et `antigravity` par défaut gratuits ; sortie hors `$PWD` nécessite `--allow-external-output`, `n` max = 5 ; chaque run écrit `manifest.json` avec prompt, fournisseur/modèle, entrées et métadonnées, sans promettre des pixels identiques ; transmettre les références avec `--reference <path>` (codex/antigravity).

**Workflow :** PREPARE (clarifier/amplifier, choisir fournisseur) → ACQUIRE (auth, références, chemin) → ACT (`oma image generate`) → VERIFY (manifest, fichiers, code) → FINALIZE (chemins et avertissements).

**Ressources :** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, `config/image-config.yaml`.

---

### oma-market

**Domaine :** Recherche de marché par signaux communautaires : pain points, tendances, positionnement concurrentiel et découverte. Elle utilise le moteur upstream [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web et autres), conservé à jour par oma.

**Quand l’utiliser :** extraire des pain points réels, détecter les tendances sur 7/30/90/180 jours, analyser le sentiment concurrentiel avec SWOT/Porter 5F, découverte ouverte (`--discover`), recherche personne/entreprise/ticker, signaux de recrutement et drills de suivi.

**Quand NE PAS l’utiliser :** recherche web générale sans cadre marché (oma-search), littérature académique (oma-scholar), dashboard live ou monitoring planifié (encapsuler dans `oma schedule <action>`).

**Règles fondamentales :** exécuter detect-trap avant le moteur (`--force` seulement après reconfirmation) ; `oma market resolve` rafraîchit la copie gérée (`~/.cache/oma-market/last30days/<tag>/`) et le cache utilisateur n’est qu’un fallback offline ; suivre le `SKILL.md` résolu, en remplaçant seulement l’appel Python par `oma market run <args>` ; sans moteur, Python 3.12+ ou sortie non nulle, s’arrêter et signaler ; l’appel brut `python3 scripts/last30days.py` n’est pas utilisé ; activer les sources à clé uniquement par l’assistant upstream avec consentement ; citer les clusters du moteur et respecter les LAWs avant d’écrire ; un seul brief par run dans `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`, frameworks selon l’intention (pain/trend → SWOT, competitor → SWOT + Porter 5F, discovery → SWOT + PESTEL).

**Workflow :** detect-trap → `oma market resolve` → lire le `SKILL.md` upstream → étapes de pré-recherche (assistant setup, résolution handle/subreddit, plan de requêtes) → `oma market run … --emit=compact` → synthétiser selon OUTPUT CONTRACT → ajouter frameworks → auto-vérifier → écrire.

**Ressources :** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md`, `frameworks/` (swot, porters-5f, pestel). CLI : `oma market detect-trap | resolve | update | run`.

---

### oma-refactor

**Domaine :** Refactoring préservant le comportement, avec ciblage des code smells/SATD/hotspots, filets de tests de caractérisation et commits de refactor uniquement.

**Quand l’utiliser :** extraire, déplacer, renommer ou décomposer des fichiers/modules, préparer une fonctionnalité, sauver un legacy/brownfield, sélectionner des hotspots (churn × complexité) ou auditer la sécurité d’un refactoring.

**Quand NE PAS l’utiliser :** bug ou comportement qui échoue (oma-debug ; le refactoring ne change pas le comportement), audit sécurité/performance/accessibilité (oma-qa), frontières système/ADR (oma-architecture), schéma/migration DB (oma-db), découpage/staging de commits (oma-scm) ou optimisation de performance comme objectif.

**Règles fondamentales :** le contrat consommateur (Hyrum inclus) est inviolable ; ne jamais restructurer sans filet, écrire d’abord des tests de caractérisation golden-master séparés si nécessaire ; une transformation nommée par commit, Mikado après échec répété (prérequis, revert complet, récursion) ; ne pas mêler de changement de comportement dans un commit refactor (`refactor:` seulement) ; privilégier la lisibilité et éviter le code destiné à disparaître ou froid ; une convention différente passe par l’ADR oma-architecture ; les métriques restent des proxies (Goodhart).

**Workflow :** PREPARE (classer green/brownfield, portes de taille, classement hotspot) → ACQUIRE (symboles, métriques et signaux Git) → REASON (séquence atomique/expand-contract) → ACT (transformation engine-first) → VERIFY (tests inchangés puis commit, ou revert Mikado) → FINALIZE (delta métrique et verdict de lisibilité).

**Ressources :** `definition.md`, `measurement.md`, `governance.md`, plus `context-loading` et `quality-principles` partagés.

---

### oma-scholar

**Domaine :** Compagnon de recherche académique fondé sur les sidecars `.knows.yaml` Knows : générer, valider, relire, interroger et comparer des sidecars structurés, avec accès à knows.academy.

**Quand l’utiliser :** lecture économique par claims (~700 tokens contre ~10 K pour un PDF complet), génération depuis brouillon/LaTeX/notes, validation avant partage, peer review en sidecar, analyse, comparaison structurée et recherche depuis knows.academy.

**Quand NE PAS l’utiliser :** recherche web générale ou non académique (oma-search), traduction d’article (oma-translation), parsing PDF seul (oma-pdf), peer review complète avec système éditorial.

**Modes :** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Règles fondamentales :** suivre la spécification v0.9.0 / profil `paper@1`, sans shell-out vers un SDK LLM ; anti-fabrication : si DOI/venue/year n’est pas visible, omettre la clé et ne jamais écrire `doi: TODO` ; noms de champs exacts, un seul objet `provenance.actor`, enums fermés, nombres non quotés ; densité relationnelle ≥ 1.5 par statement, chaque claim avec `supported_by` ; valider avant partage (`oma scholar lint`) et utiliser `--lenient` pour les sidecars tiers ; knows.academy puis fallback OpenAlex pour les articles anciens/non-2026, proxy public sans auth.

**Workflow :** PREPARE (mode + source) → ACQUIRE (métadonnées, sections ou texte local) → REASON (claims/evidence/relations) → ACT (generate/lint/review/analyze/compare/fetch) → VERIFY (schéma, enums, IDs, relations) → FINALIZE (sidecar/rapport/résumé avec réserves).

**Ressources :** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md`, `config/scholar-config.yaml`.

---

### oma-skill-creation

**Domaine :** Créer et valider des skills OMA au format Markdown SSL-lite (Scheduling / Structural Flow / Logical Operations / References).

**Quand l’utiliser :** créer `.agents/skills/{name}/SKILL.md`, convertir un skill au format SSL-lite, ajouter un chemin canonique à une commande/workflow, auditer son routage/exécution/validation/récupération ou décider si les exemples vont dans `resources/`.

**Quand NE PAS l’utiliser :** installer des skills tiers dans `$CODEX_HOME/skills`, créer un bundle plugin Codex, écrire un plan produit (oma-pm) ou modifier directement le code produit/infrastructure/frontend/backend/mobile.

**Règles fondamentales :** conserver exactement les quatre sections Scheduling, Structural Flow, Logical Operations, References ; conserver le frontmatter YAML `name`/`description` et lancer `oma skill audit` après modification (warning ≥ 60 %, échec ≥ 75 % de collision TF-IDF) ; décrire les frontières `When NOT to use` avec routes adjacentes ; ajouter exactement un chemin canonique inline (`Canonical command path` pour les commandes fragiles/répétables, `Canonical workflow path` pour recherche/jugement) ; placer les variantes détaillées dans `resources/` et ne pas créer README/changelog/install dans un skill.

**Workflow :** PREPARE (but, déclencheurs, frontières, entrées/sorties, dépendances) → ACQUIRE (1–3 skills analogues et conventions) → REASON (inline vs `resources/`) → ACT (modèle SSL-lite) → VERIFY (structure, routage, exécution, format) → FINALIZE (fichiers modifiés et rapport).

**Ressources :** `ssl-lite-template.md`, `validation-checklist.md`, plus `context-loading` et `quality-principles`.

---

### oma-slide

**Domaine :** Génération de decks HTML riches en animations sur une scène fixe 1920×1080, avec validate/bundle/export déterministes vers PDF/PNG/PPTX par le CLI `oma slide`.

**Quand l’utiliser :** créer une présentation, améliorer/formater un deck, générer du HTML animé slide par slide, exporter PDF/PNG/PPTX, appliquer un preset de style nommé ou exporter/importer depuis Canva.

**Quand NE PAS l’utiliser :** document sans slides, génération d’image seule (oma-image), définition de marque/design system (oma-design) ou opérations CLI déterministes sans génération (appeler directement `oma slide`).

**Règles fondamentales :** le skill écrit le HTML, le CLI fait scaffold/validate/bundle/export ; assets locaux uniquement, sans URL distante dans `<img src>`/`<video src>`, seulement `./assets/<file>` ; Pretendard requis sur chaque slide CJK ; wrapper `prefers-reduced-motion`, focus visibles et `data-om-validate` requis ; trois itérations auto-fix maximum puis présenter le diff ; déléguer la génération d’images à oma-image et n’utiliser Canva MCP qu’avec consentement explicite.

**Workflow :** 7 phases — DETECT (mode), DISCOVER (clarifier + assets), STYLE (3 previews live → choix), GENERATE (`slide-NN.html` 1920×1080), VALIDATE (`oma slide validate`, ≤3 boucles), REVIEW (viewer + éditeur bbox optionnel), DELIVER (`bundle` + export PDF/PNG/PPTX optionnel).

**Ressources :** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md`, et répertoire `assets/`.

---

### oma-video

**Domaine :** Générer des vidéos courtes, explicatives ou de démo humaine via le CLI `oma video`, en composant script → narration → visuels → sous-titres → rendu Remotion.

**Quand l’utiliser :** shorts/reels 9:16, explainers 16:9/9:16 depuis README/code/données, démos depuis capture (`--source file`) ou capture web supervisée (`--source web`), et rerender déterministe d’un run existant.

**Quand NE PAS l’utiliser :** image fixe (oma-image), deck (utiliser `oma-slide` ; video l’appelle en interne pour les frames), audio parlé seul (oma-voice), montage non linéaire d’un mp4 fini ou live streaming (la capture web supervisée reste dans le périmètre).

**Règles fondamentales :** clarifier ou inférer le mode et montrer le plan ; configuration fournisseur optionnelle pour les fallbacks d’assets pris en charge, fournisseurs payants Pexels/Pixelle activés par présence de clé, mais une panne du compositeur ne devient jamais une vidéo fallback ; garde de coût ≥ `$0.20` (`--yes`/`OMA_VIDEO_YES=1`), limite 180 s/40 scènes ; entrées enregistrées dans `render-spec.json`, assets, seed et Pretendard embarqué, `OMA_VIDEO_MOCK=1` réservé aux fixtures golden ; démo human-in-the-loop, navigateur headed piloté par humain, aucune automatisation d’identifiants, `--url` et tokens masqués dans logs/manifest ; sortie hors `$PWD` avec `--allow-external-output`.

**Workflow :** PREPARE (mode/aspect/locale, brief) → ACQUIRE (providers, capture, coût) → ACT (script → voice ∥ visuals ∥ captions → render-spec → render) → VERIFY (schéma, hashes manifest, code, mp4) → FINALIZE (run-dir, chemin mp4, avertissements).

**Ressources :** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, compositeur `remotion/`, driver de capture web et fallback `mpt/`, `config/video-config.yaml`.

---

### oma-voice

**Domaine :** Text-to-speech et speech-to-text local-first via Voicebox MCP : entièrement sur l’appareil, sans cloud, clé API ni coût par appel.

**Quand l’utiliser :** audio de notification court pour fin/blocage d’agent, voiceover/narration/assets mp3/wav, transcription mp3/wav/m4a/webm/flac vers Markdown et comparaison de profils par rerun d’un même texte.

**Quand NE PAS l’utiliser :** TTS cloud ou voix multilingues haute fidélité, dictée micro terminal en temps réel (hotkey Voicebox), upload/création de profil de clonage (UI desktop Voicebox), vidéo/musique/sound design.

**Règles fondamentales :** Voicebox obligatoire : sur échec handshake/`GET /health`, sortir avec une indication d’installation/lancement en une fois, sans retry/relaunch ; profil obligatoire : si `voicebox_list_profiles` est vide, orienter vers l’UI puis sortir ; limites TTS 5000 caractères par appel (warning à 2000), STT 30 minutes, pas d’auto-chunk v1 ; transparence d’invocation automatique : notification seulement après `auto_notify_after_sec` (60 s par défaut), annoncer l’intention en une ligne ; sécurité du chemin (avertir/confirmer hors `$PWD`), SIGINT sans sortie partielle ; manifest requis pour chaque génération, sans garde de coût.

**Workflow :** PREPARE (texte/audio/langue/chemin/profil) → ACQUIRE (clarifier une fois si un signal manque) → ACT (MCP `voicebox_speak` ou `voicebox_transcribe`) → VERIFY (audio/transcription + champs manifest) → FINALIZE (`manifest.json`, chemin du rapport).

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
| `session-metrics.md` | Orchestrator | Dette de clarification et progression du Quality Score | Lu par QA |
| `experiment-ledger.md` | Orchestrator/QA | Suivi des expériences lorsque Quality Score est actif | Lu par tous |

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
