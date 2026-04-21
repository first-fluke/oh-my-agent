---
title: Workflows
description: Référence complète des 16 workflows oh-my-agent — commandes slash, modes persistant vs non persistant, mots-clés de déclenchement en 11 langues, phases et étapes, fichiers lus et écrits, mécanique de détection automatique et gestion d'état du mode persistant.
---

# Workflows

Les workflows sont des processus structurés en plusieurs étapes, déclenchés par des commandes slash ou des mots-clés en langage naturel. Ils définissent comment les agents collaborent sur les tâches -- des utilitaires en une seule phase aux portes de qualité complexes en 5 phases.

Il existe 16 workflows, dont 4 sont persistants (ils maintiennent un état et ne peuvent pas être accidentellement interrompus).

---

## Workflows persistants

Les workflows persistants continuent de s'exécuter jusqu'à ce que toutes les tâches soient terminées. Ils maintiennent leur état dans `.agents/state/` et réinjectent le contexte `[OMA PERSISTENT MODE: ...]` à chaque message utilisateur jusqu'à désactivation explicite.

### /orchestrate

**Description :** Exécution parallèle automatisée des agents via CLI. Lance des sous-agents via CLI, coordonne via la mémoire MCP, surveille la progression et exécute des boucles de vérification.

**Persistant :** Oui. Fichier d'état : `.agents/state/orchestrate-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "orchestrate" |
| Anglais | "parallel", "do everything", "run everything" |
| Coréen | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| Japonais | "オーケストレート", "並列実行", "自動実行" |
| Chinois | "编排", "并行执行", "自动执行" |
| Espagnol | "orquestar", "paralelo", "ejecutar todo" |
| Français | "orchestrer", "parallèle", "tout exécuter" |
| Allemand | "orchestrieren", "parallel", "alles ausführen" |
| Portugais | "orquestrar", "paralelo", "executar tudo" |
| Russe | "оркестровать", "параллельно", "выполнить всё" |
| Néerlandais | "orkestreren", "parallel", "alles uitvoeren" |
| Polonais | "orkiestrować", "równolegle", "wykonaj wszystko" |

**Étapes :**
1. **Étape 0 -- Préparation :** Lire la compétence de coordination, le guide de chargement du contexte, le protocole de mémoire. Détecter le fournisseur.
2. **Étape 1 -- Charger/Créer le plan :** Vérifier la présence de `.agents/results/plan-{sessionId}.json`. Si absent, inviter l'utilisateur à exécuter `/plan` d'abord.
3. **Étape 2 -- Initialiser la session :** Charger `oma-config.yaml`, afficher le tableau de mapping CLI, générer l'identifiant de session (`session-YYYYMMDD-HHMMSS`), créer `orchestrator-session.md` et `task-board.md` en mémoire.
4. **Étape 3 -- Lancer les agents :** Pour chaque niveau de priorité (P0 d'abord, puis P1...), lancer les agents avec la méthode appropriée au fournisseur (outil Agent pour Claude Code, `oma agent:spawn` pour Gemini/Antigravity, médié par le modèle pour Codex). Ne jamais dépasser MAX_PARALLEL.
5. **Étape 4 -- Surveiller :** Interroger les fichiers `progress-{agent}.md`, mettre à jour `task-board.md`. Surveiller les complétions, échecs, plantages.
6. **Étape 5 -- Vérifier :** Exécuter `verify.sh {agent-type} {workspace}` pour chaque agent terminé. En cas d'échec, relancer avec le contexte d'erreur (maximum 2 tentatives). Après 2 tentatives, activer la boucle d'exploration : générer 2 à 3 hypothèses, lancer des expériences parallèles, évaluer, garder la meilleure.
7. **Étape 6 -- Rassembler :** Lire tous les fichiers `result-{agent}.md`, rassembler le résumé.
8. **Étape 7 -- Rapport final :** Présenter le résumé de session. Si le Quality Score a été mesuré, inclure le résumé du registre d'expériences et auto-générer les enseignements.

**Fichiers lus :** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Fichiers écrits :** `orchestrator-session.md`, `task-board.md` (mémoire), rapport final.

**Quand l'utiliser :** Projets de grande envergure nécessitant un parallélisme maximal avec coordination automatisée.

---

### /work

**Description :** Coordination multi-domaines étape par étape. Le PM planifie d'abord, puis les agents exécutent avec confirmation de l'utilisateur à chaque porte, suivie d'une revue QA et de la résolution des problèmes.

**Persistant :** Oui. Fichier d'état : `.agents/state/work-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "work", "step by step" |
| Coréen | "코디네이트", "단계별" |
| Japonais | "コーディネート", "ステップバイステップ" |
| Chinois | "协调", "逐步" |
| Espagnol | "coordinar", "paso a paso" |
| Français | "coordonner", "étape par étape" |
| Allemand | "koordinieren", "schritt für schritt" |

**Étapes :**
1. **Étape 0 -- Préparation :** Lire les compétences, le chargement du contexte, le protocole de mémoire. Enregistrer le début de session.
2. **Étape 1 -- Analyser les exigences :** Identifier les domaines impliqués. Si domaine unique, suggérer l'utilisation directe de l'agent.
3. **Étape 2 -- Planification par l'agent PM :** Le PM décompose les exigences, définit les contrats d'API, crée un découpage des tâches priorisé, enregistre dans `.agents/results/plan-{sessionId}.json`.
4. **Étape 3 -- Revue du plan :** Présenter le plan à l'utilisateur. **La confirmation est obligatoire avant de poursuivre.**
5. **Étape 4 -- Lancer les agents :** Lancement par niveau de priorité, en parallèle au sein du même niveau, workspaces séparés.
6. **Étape 5 -- Surveiller :** Interroger les fichiers de progression, vérifier l'alignement des contrats d'API entre les agents.
7. **Étape 6 -- Revue QA :** Lancer l'agent QA pour la sécurité (OWASP), la performance, l'accessibilité, la qualité du code.
8. **Étape 6.1 -- Quality Score** (conditionnel) : Mesurer et enregistrer la ligne de base.
9. **Étape 7 -- Itérer :** Si des problèmes CRITICAL/HIGH sont trouvés, relancer les agents responsables. Si le même problème persiste après 2 tentatives, activer la boucle d'exploration.

**Quand l'utiliser :** Fonctionnalités couvrant plusieurs domaines où vous souhaitez un contrôle étape par étape et l'approbation de l'utilisateur à chaque porte.

---

### /ultrawork

**Description :** Le workflow obsédé par la qualité. 5 phases, 17 étapes au total, dont 11 sont des étapes de revue. Chaque phase possède une porte qui doit passer avant de poursuivre.

**Persistant :** Oui. Fichier d'état : `.agents/state/ultrawork-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "ultrawork", "ulw" |

**Phases et étapes :**

| Phase | Étapes | Agent | Perspective de revue |
|-------|--------|-------|---------------------|
| **PLAN** | 1-4 | Agent PM (inline) | Complétude, Méta-revue, Sur-ingénierie/Simplicité |
| **IMPL** | 5 | Agents Dev (lancés) | Implémentation |
| **VERIFY** | 6-8 | Agent QA (lancé) | Alignement, Sécurité (OWASP), Prévention des régressions |
| **REFINE** | 9-13 | Agent Debug (lancé) | Découpage de fichiers, Réutilisabilité, Impact en cascade, Cohérence, Code mort |
| **SHIP** | 14-17 | Agent QA (lancé) | Qualité du code (lint/couverture), Flux UX, Problèmes connexes, Prêt pour le déploiement |

**Définitions des portes :**
- **PLAN_GATE :** Plan documenté, hypothèses listées, alternatives considérées, revue de sur-ingénierie effectuée, confirmation utilisateur.
- **IMPL_GATE :** Build réussi, tests passent, seuls les fichiers planifiés sont modifiés, Quality Score de référence enregistré (si mesuré).
- **VERIFY_GATE :** L'implémentation correspond aux exigences, zéro CRITICAL, zéro HIGH, pas de régressions, Quality Score >= 75 (si mesuré).
- **REFINE_GATE :** Pas de gros fichiers/fonctions (> 500 lignes / > 50 lignes), opportunités d'intégration capturées, effets de bord vérifiés, code nettoyé, Quality Score non régressé.
- **SHIP_GATE :** Vérifications de qualité passent, UX vérifiée, problèmes connexes résolus, checklist de déploiement complète, Quality Score final >= 75 avec delta non négatif, approbation finale de l'utilisateur.

**Comportement en cas d'échec de porte :**
- Premier échec : retourner à l'étape concernée, corriger et réessayer.
- Deuxième échec sur le même problème : activer la boucle d'exploration (générer 2 à 3 hypothèses, expérimenter chacune, évaluer, garder la meilleure).

**Améliorations conditionnelles :** Mesure du Quality Score, décisions de conservation/abandon, registre d'expériences, exploration d'hypothèses, auto-apprentissage (enseignements des expériences abandonnées).

**Condition de saut de REFINE :** Tâches simples de moins de 50 lignes.

**Quand l'utiliser :** Livraison de qualité maximale. Lorsque le code doit être prêt pour la production avec une revue exhaustive.

---

### /ralph

**Description :** Boucle d'exécution persistante et auto-référentielle. Enveloppe ultrawork avec un vérificateur indépendant qui contrôle les critères d'achèvement après chaque itération. Continue de boucler jusqu'à ce que tous les critères passent ou que les garde-fous se déclenchent.

**Persistant :** Oui. Fichier d'état : `.agents/state/ralph-state.json`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "ralph" |
| Anglais | "don't stop", "until done", "keep going", "finish everything", "run to completion" |
| Coréen | "랄프", "멈추지마", "끝까지", "완료될때까지", "끝장내" |
| Japonais | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinois | "不要停", "直到完成", "全部完成", "做完为止" |
| Espagnol | "no pares", "hasta completar", "termina todo" |
| Français | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| Allemand | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

**Phases :**
1. **Phase 0 — INIT :** Charger les prérequis (context-loading, protocole de mémoire, protocole de juge). Définir des critères d'achèvement vérifiables (chacun doit être mécaniquement vérifiable — test qui passe, build qui réussit, fichier présent). Présenter les critères pour confirmation de l'utilisateur. Initialiser la session avec `max_iterations: 5`.
2. **Phase 1 — WORK :** Exécuter ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) comme une seule itération.
3. **Phase 2 — JUDGE :** Un vérificateur indépendant contrôle chaque critère d'achèvement par rapport à l'état réel du projet (exécuter les tests, vérifier les builds, vérifier l'existence des fichiers). Évaluer chaque critère comme PASS/FAIL avec preuves.
4. **Phase 3 — DECIDE :** Si tous les critères PASS → terminer la boucle, générer le rapport final. Si l'un est FAIL → incrémenter le compteur d'itérations, réinjecter le contexte d'échec, retourner à la Phase 1.
5. **Garde-fous :** La boucle s'arrête si `current_iteration >= max_iterations` (5 par défaut), ou si le même critère échoue 3 fois consécutives pour la même cause racine (détection de blocage).

**Différence clé avec /ultrawork :** Ultrawork est un workflow à 5 phases en passe unique. Ralph enveloppe ultrawork dans une boucle de réessai avec un juge indépendant qui vérifie objectivement l'achèvement — il continue jusqu'à ce que le travail soit réellement terminé, et pas simplement « revu ».

**Fichiers lus :** `.agents/workflows/ralph/resources/judge-protocol.md`, tous les fichiers ultrawork.
**Fichiers écrits :** `session-ralph.md` (mémoire), journaux d'itération, rapport final.

**Quand l'utiliser :** Lorsqu'un achèvement garanti est nécessaire — l'agent doit continuer à travailler jusqu'à ce que des critères vérifiables passent, et pas seulement faire un passage et rapporter.

---

## Workflows non persistants

### /plan

**Description :** Découpage des tâches piloté par le PM. Analyse les exigences, sélectionne le stack technique, décompose en tâches priorisées avec dépendances, définit les contrats d'API.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "task breakdown" |
| Anglais | "plan" |
| Coréen | "계획", "요구사항 분석", "스펙 분석" |
| Japonais | "計画", "要件分析", "タスク分解" |
| Chinois | "计划", "需求分析", "任务分解" |

**Étapes :** Recueillir les exigences -> Analyser la faisabilité technique (analyse de code MCP) -> Définir les contrats d'API -> Décomposer en tâches -> Revue avec l'utilisateur -> Enregistrer le plan.

**Sortie :** `.agents/results/plan-{sessionId}.json`, écriture en mémoire, éventuellement `docs/exec-plans/active/` pour les plans complexes.

**Exécution :** Inline (pas de lancement de sous-agents). Consommé par `/orchestrate` ou `/work`.

---

### /exec-plan

**Description :** Crée, gère et suit les plans d'exécution en tant qu'artefacts de premier ordre dans `docs/exec-plans/`.

**Mots-clés de déclenchement :** Aucun (exclu de la détection automatique, doit être invoqué explicitement).

**Étapes :** Préparation -> Analyser le périmètre (évaluer la complexité : Simple/Moyenne/Complexe) -> Créer le plan d'exécution (markdown dans `docs/exec-plans/active/`) -> Définir les contrats d'API (si inter-domaines) -> Revue avec l'utilisateur -> Exécuter (transférer à `/orchestrate` ou `/work`) -> Terminer (déplacer vers `completed/`).

**Sortie :** `docs/exec-plans/active/{plan-name}.md` avec tableau de tâches, journal de décisions, notes de progression.

**Quand l'utiliser :** Après `/plan` pour les fonctionnalités complexes nécessitant une exécution suivie avec journalisation des décisions.

---

### /brainstorm

**Description :** Idéation axée sur le design. Explore l'intention, clarifie les contraintes, propose des approches, produit un document de conception approuvé avant la planification.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "brainstorm" |
| Anglais | "ideate", "explore design" |
| Coréen | "브레인스토밍", "아이디어", "설계 탐색" |
| Japonais | "ブレインストーミング", "アイデア", "設計探索" |
| Chinois | "头脑风暴", "创意", "设计探索" |

**Étapes :** Explorer le contexte du projet (analyse MCP) -> Poser des questions de clarification (une à la fois) -> Proposer 2 à 3 approches avec les compromis -> Présenter le design section par section (avec approbation de l'utilisateur à chaque étape) -> Enregistrer le document de conception dans `docs/plans/` -> Transition : suggérer `/plan`.

**Règles :** Aucune implémentation ni planification avant l'approbation du design. Pas de sortie de code. YAGNI.

---

### /architecture

**Description :** Workflow d'architecture logicielle — diagnostiquer les problèmes d'architecture, sélectionner la bonne méthode d'analyse (routage diagnostique / design-twice / ATAM / CBAM / ADR), comparer les options, synthétiser les apports des parties prenantes et produire une recommandation, une revue ou un ADR.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "architecture", "ADR", "ATAM", "CBAM" |
| Anglais | "architecture review", "architectural tradeoff" |
| Coréen | "아키텍처", "설계 검토" |
| Japonais | "アーキテクチャ" |
| Chinois | "架构" |

**Étapes :** Cadrer la décision (nouvelle architecture / revue / analyse de compromis / priorisation des investissements / rédaction d'ADR) -> Sélectionner la méthodologie via le routage diagnostique -> Analyser l'architecture actuelle via l'analyse de code MCP (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> Synthétiser les apports des parties prenantes (uniquement lorsque la décision est suffisamment transversale pour justifier le coût) -> Produire une recommandation avec des hypothèses, compromis, risques et étapes de validation explicites -> Transférer à `/plan` lorsque l'implémentation est requise.

**Règles :** Ne PAS écrire de code d'implémentation ni de plans de tâches dans ce workflow. Transférer à `/plan` après la décision d'architecture. Utiliser les outils MCP en permanence ; ne pas substituer par des lectures de fichiers brutes ou grep.

**Quand l'utiliser :** Choix d'architecture système, décisions de limites de module/service/propriété, priorisation de refactoring, rédaction d'ADR, investigation de douleurs architecturales (amplification de changement, dépendances cachées, APIs maladroites).

---

### /deepinit

**Description :** Initialisation complète du projet. Analyse un code source existant, génère AGENTS.md, ARCHITECTURE.md et une base de connaissances structurée dans `docs/`.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "deepinit" |
| Coréen | "프로젝트 초기화" |
| Japonais | "プロジェクト初期化" |
| Chinois | "项目初始化" |

**Étapes :** Préparation -> Analyser le code source (type de projet, architecture, règles implicites, domaines, limites) -> Générer ARCHITECTURE.md (carte des domaines, moins de 200 lignes) -> Générer la base de connaissances `docs/` (design-docs/, exec-plans/, generated/, product-specs/, references/, docs de domaine) -> Générer le fichier AGENTS.md racine (~100 lignes, table des matières) -> Générer les fichiers AGENTS.md de limites (paquets monorepo, moins de 50 lignes chacun) -> Mettre à jour le harnais existant (si réexécution) -> Valider (pas de liens morts, respect des limites de lignes).

**Sortie :** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md, et des docs spécifiques au domaine selon les découvertes.

---

### /review

**Description :** Pipeline de revue QA complète. Audit de sécurité (OWASP Top 10), analyse de performance, vérification d'accessibilité (WCAG 2.1 AA) et revue de la qualité du code.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "code review", "security audit", "security review" |
| Anglais | "review" |
| Coréen | "리뷰", "코드 검토", "보안 검토" |
| Japonais | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chinois | "审查", "代码审查", "安全审计" |

**Étapes :** Identifier le périmètre de revue -> Vérifications de sécurité automatisées (npm audit, bandit) -> Revue de sécurité manuelle (OWASP Top 10) -> Analyse de performance -> Revue d'accessibilité (WCAG 2.1 AA) -> Revue de la qualité du code -> Générer le rapport QA.

**Boucle optionnelle correction-vérification** (avec `--fix`) : Après le rapport QA, lancer les agents de domaine pour corriger les problèmes CRITICAL/HIGH, relancer le QA, répéter jusqu'à 3 fois.

**Délégation :** Pour les périmètres importants, délègue les étapes 2 à 7 à un sous-agent QA lancé.

---

### /debug

**Description :** Diagnostic et correction structurés de bugs avec écriture de tests de régression et scan de motifs similaires.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "debug" |
| Anglais | "fix bug", "fix error", "fix crash" |
| Coréen | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japonais | "デバッグ", "バグ修正", "エラー修正" |
| Chinois | "调试", "修复 bug", "修复错误" |

**Étapes :** Collecter les informations d'erreur -> Reproduire (MCP `search_for_pattern`, `find_symbol`) -> Diagnostiquer la cause profonde (MCP `find_referencing_symbols` pour tracer le chemin d'exécution) -> Proposer une correction minimale (confirmation utilisateur requise) -> Appliquer la correction + écrire le test de régression -> Scanner les motifs similaires (peut lancer un sous-agent debug-investigator si le périmètre > 10 fichiers) -> Documenter le bug en mémoire.

**Critères de lancement de sous-agent :** L'erreur couvre plusieurs domaines, le périmètre de scan > 10 fichiers, ou un traçage approfondi des dépendances est nécessaire.

---

### /design

**Description :** Workflow de design en 7 phases produisant DESIGN.md avec des tokens, des patterns de composants et des règles d'accessibilité.

**Mots-clés de déclenchement :**
| Langue | Mots-clés |
|--------|-----------|
| Universel | "design system", "DESIGN.md", "design token" |
| Anglais | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Coréen | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japonais | "デザイン", "ランディングページ", "デザインシステム" |
| Chinois | "设计", "着陆页", "设计系统" |

**Phases :** SETUP (collecte du contexte, `.design-context.md`) -> EXTRACT (optionnel, depuis des URL de référence/Stitch) -> ENHANCE (enrichissement de prompts vagues) -> PROPOSE (2 à 3 directions de design avec couleur, typographie, mise en page, animation, composants) -> GENERATE (DESIGN.md + tokens CSS/Tailwind/shadcn) -> AUDIT (responsive, WCAG 2.2, heuristiques de Nielsen, vérification anti AI slop) -> HANDOFF (enregistrer, informer l'utilisateur).

**Obligatoire :** Toute sortie est responsive-first (mobile 320-639 px, tablette 768 px+, desktop 1024 px+).

---

### /scm

**Description :** Génère des Conventional Commits avec découpage automatique par fonctionnalité.

**Mots-clés de déclenchement :** Aucun (exclu de la détection automatique).

**Étapes :** Analyser les modifications (git status, git diff) -> Séparer les fonctionnalités (si > 5 fichiers couvrant des périmètres/types différents) -> Déterminer le type (feat/fix/refactor/docs/test/chore/style/perf) -> Déterminer le périmètre (module modifié) -> Rédiger la description (impératif, < 72 caractères) -> Exécuter le commit immédiatement (pas d'invite de confirmation).

**Règles :** Jamais `git add -A`. Ne jamais commiter de secrets. HEREDOC pour les messages multi-lignes. Co-Author : `First Fluke <our.first.fluke@gmail.com>`.

---

### /tools

**Description :** Gérer la visibilité et les restrictions des outils MCP.

**Mots-clés de déclenchement :** Aucun (exclu de la détection automatique).

**Fonctionnalités :** Afficher le statut actuel des outils MCP, activer/désactiver des groupes d'outils (memory, code-analysis, code-edit, file-ops), modifications permanentes ou temporaires (`--temp`), interprétation en langage naturel (« memory tools only », « disable code edit »).

**Groupes d'outils :**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /pdf

**Description :** Convertir un PDF en Markdown en utilisant `opendataloader-pdf` — extrait le texte, les tables, les titres et les images avec un ordre de lecture correct.

**Mots-clés de déclenchement :** Aucun (invoqué explicitement avec un chemin de fichier d'entrée).

**Étapes :** Valider l'entrée (confirmer l'existence du fichier) -> Déterminer l'emplacement de sortie (spécifié par l'utilisateur ou même répertoire que l'entrée) -> Exécuter `uvx opendataloader-pdf` (aucune installation requise) -> Pour les PDF scannés, utiliser le mode hybride avec OCR -> Normaliser la sortie avec `uvx mdformat` -> Valider la lisibilité et la structure -> Signaler tout problème de conversion (tables manquantes, texte illisible).

**Règles :** L'emplacement de sortie par défaut est le même répertoire que le PDF d'entrée. Ne jamais sauter d'étapes. La langue de réponse suit `.agents/oma-config.yaml`.

**Quand l'utiliser :** Conversion de documents PDF en Markdown pour le contexte LLM ou l'ingestion RAG, extraction de contenu structuré (tables, titres, listes) depuis des PDF.

---

### /stack-set

**Description :** Détection automatique du stack technique du projet et génération de références spécifiques au langage pour la compétence backend.

**Mots-clés de déclenchement :** Aucun (exclu de la détection automatique).

**Étapes :** Détecter (scanner les manifestes : pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj) -> Confirmer (afficher le stack détecté, obtenir la confirmation utilisateur) -> Générer (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` avec 8 patterns obligatoires, `stack/api-template.*`) -> Vérifier.

**Sortie :** Fichiers dans `.agents/skills/oma-backend/stack/`. Ne modifie ni SKILL.md ni `resources/`.

---

## Compétences vs. Workflows

| Aspect | Compétences | Workflows |
|--------|-------------|-----------|
| **Ce que c'est** | Expertise de l'agent (ce qu'un agent sait) | Processus orchestrés (comment les agents travaillent ensemble) |
| **Emplacement** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Activation** | Automatique via les mots-clés de routage des compétences | Commandes slash ou mots-clés de déclenchement |
| **Périmètre** | Exécution mono-domaine | Multi-étapes, souvent multi-agents |
| **Exemples** | « Construire un composant React » | « Planifier la fonctionnalité -> construire -> réviser -> commiter » |

---

## Détection automatique : comment ça fonctionne

### Le système de hooks

oh-my-agent utilise un hook `UserPromptSubmit` qui s'exécute avant le traitement de chaque message utilisateur. Le système de hooks comprend :

1. **`triggers.json`** (`.claude/hooks/triggers.json`) : Définit les mappings mot-clé/workflow pour les 11 langues supportées (anglais, coréen, japonais, chinois, espagnol, français, allemand, portugais, russe, néerlandais, polonais).

2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`) : Logique TypeScript qui scanne l'entrée utilisateur par rapport aux mots-clés de déclenchement, respecte la correspondance spécifique à la langue et injecte le contexte d'activation du workflow.

3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`) : Assure l'exécution persistante des workflows en vérifiant les fichiers d'état actifs et en réinjectant le contexte du workflow.

### Flux de détection

1. L'utilisateur saisit une entrée en langage naturel
2. Le hook vérifie si une commande explicite `/command` est présente (si oui, la détection est ignorée pour éviter les doublons)
3. Le hook scanne l'entrée par rapport aux listes de mots-clés de `triggers.json`
4. Si une correspondance est trouvée, vérifier si l'entrée correspond à des patterns informationnels
5. Si informationnelle (ex. : « what is orchestrate? »), la filtrer -- pas de déclenchement de workflow
6. Si actionnable, injecter `[OMA WORKFLOW: {workflow-name}]` dans le contexte
7. L'agent lit le tag injecté et charge le fichier de workflow correspondant depuis `.agents/workflows/`

### Filtrage des patterns informationnels

La section `informationalPatterns` de `triggers.json` définit des phrases qui indiquent des questions plutôt que des commandes. Elles sont vérifiées avant l'activation du workflow :

| Langue | Patterns informationnels |
|--------|-------------------------|
| Anglais | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| Coréen | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| Japonais | "とは", "って何", "どうやって", "説明して" |
| Chinois | "是什么", "什么是", "怎么", "解释" |

Si l'entrée correspond à la fois à un mot-clé de workflow et à un pattern informationnel, le pattern informationnel a priorité et aucun workflow n'est déclenché.

### Workflows exclus

Les workflows suivants sont exclus de la détection automatique et doivent être invoqués avec une commande explicite `/command` :
- `/scm`
- `/tools`
- `/stack-set`
- `/exec-plan`
- `/pdf`

---

## Mécanisme du mode persistant

### Fichiers d'état

Les workflows persistants (orchestrate, ultrawork, work) créent des fichiers d'état dans `.agents/state/` :

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── work-state.json
```

Ces fichiers contiennent : le nom du workflow, la phase/étape en cours, l'identifiant de session, l'horodatage et tout état en attente.

### Renforcement

Tant qu'un workflow persistant est actif, le hook `persistent-mode.ts` injecte `[OMA PERSISTENT MODE: {workflow-name}]` dans chaque message utilisateur. Cela garantit que le workflow continue de s'exécuter même entre les tours de conversation.

### Désactivation

Pour désactiver un workflow persistant, l'utilisateur dit « workflow done » (ou l'équivalent dans sa langue configurée). Cela :
1. Supprime le fichier d'état de `.agents/state/`
2. Arrête l'injection du contexte de mode persistant
3. Retourne au fonctionnement normal

Le workflow peut également se terminer naturellement lorsque toutes les étapes sont complétées et que la porte finale est passée.

---

## Séquences de workflows typiques

### Fonctionnalité rapide
```
/plan → revue de la sortie → /exec-plan
```

### Projet complexe multi-domaines
```
/work → PM planifie → l'utilisateur confirme → agents lancés → QA révise → correction des problèmes → livraison
```

### Livraison de qualité maximale
```
/ultrawork → PLAN (4 étapes de revue) → IMPL → VERIFY (3 étapes de revue) → REFINE (5 étapes de revue) → SHIP (4 étapes de revue)
```

### Investigation de bug
```
/debug → reproduire → cause profonde → correction minimale → test de régression → scan des motifs similaires
```

### Pipeline du design à l'implémentation
```
/brainstorm → document de conception → /plan → découpage des tâches → /orchestrate → implémentation parallèle → /review → /scm
```

### Mise en place d'un nouveau code source
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```
