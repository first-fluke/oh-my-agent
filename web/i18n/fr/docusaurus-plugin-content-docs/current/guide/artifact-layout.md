---
title: Disposition des artefacts
sidebar_label: Disposition des artefacts
description: Où OMA range les documents maintenus, les rapports d’exécution et l’état du runtime, et comment migrer les emplacements hérités.
---

# Disposition des artefacts

OMA utilise trois emplacements : `docs/` pour les documents de projet maintenus, `.agents/results/` pour les rapports d’exécution lisibles, et `.agents/state/` pour la coordination et les preuves d’exécution. Les chemins ci-dessous sont relatifs à la racine du projet.

## Documents maintenus {#maintained-documents}

| Emplacement | Contenu |
|----------|---------|
| `docs/decisions/` | Propositions d’approche, compromis et enregistrements de décision d’architecture (ADR) |
| `docs/plans/work/` | Plans de travail, avancement, journaux de décision et suivi de la dette technique |
| `docs/plans/contracts/` | Contrats d’API adoptés |
| `DESIGN.md` | Système de design d’interface : typographie, couleur, espacement, mouvement et composants |

Utilisez un champ `Status` dans les documents de décision pour enregistrer `draft`, `accepted` ou `superseded`. Conservez une décision remplacée et liez son remplaçant afin que son raisonnement reste disponible. Dans OMA, `design` désigne le design d’interface ; les propositions techniques et les ADR partagent `docs/decisions/`.

Utilisez un index de documents du projet, tel que `docs/README.md`, pour lier les documents maintenus. La migration des artefacts déplace les fichiers existants ; elle ne crée pas d’index et ne change pas le statut d’un document.

## Rapports d’exécution et état du runtime {#execution-reports-and-runtime-state}

| Emplacement | Contenu |
|----------|---------|
| `.agents/results/result-*.md` | Rapports de résultat d’agents et de workflows, lisibles |
| `.agents/results/architecture/` | Analyses et recommandations d’architecture |
| `.agents/results/bugs/` | Rapports de bugs |
| `.agents/results/refactor/` | Plans et rapports de refactoring |
| `.agents/results/security/` | Rapports d’analyse de sécurité |
| `.agents/results/market/` | Notes d’étude de marché |
| `.agents/results/recap/` | Récapitulatifs de travail |
| `.agents/results/explain/` | Explications HTML |
| `.agents/results/api-contracts/` | Brouillons de contrats d’API |
| `.agents/results/plan-{sessionId}.json` | Plan de tâches courant |
| `.agents/state/memories/` | Résumés de session, tableaux de tâches, avancement, leçons et enregistrements d’expériences |
| `agent-runs/` du runtime | Reçus structurés, claims et preuves de vérification |
| `agent-plans/` du runtime | Plans d’exécution figés |

Les sous-répertoires de rapports restent séparés par domaine. Les rapports lisibles complètent les preuves structurées ; ils n’établissent pas à eux seuls un achèvement vérifié. Voir [Résultats et reprise](../agent-results-and-resume/).

Les reçus courants et les plans figés se trouvent dans le répertoire d’état de projet du profil actif. Les projets plus anciens peuvent encore les conserver sous `.agents/state/`. Cette migration ne change pas leur stockage ni leurs liaisons de vérification.

## Promouvoir un document maintenu {#promote-a-maintained-document}

Lorsqu’un artefact d’exécution devient une référence de projet, déplacez-le vers l’emplacement maintenu correspondant. Par exemple, déplacez un contrat adopté de `.agents/results/api-contracts/` vers `docs/plans/contracts/`, ou transformez une recommandation d’architecture en enregistrement de décision dans `docs/decisions/`. Laissez un lien à l’ancien emplacement et mettez à jour l’index des documents.

Si une preuve d’exécution structurée enregistre le fichier d’origine ou son empreinte, laissez ce fichier intact et créez plutôt une version maintenue. Liez le document maintenu depuis l’index du projet.

install, update et link ignorent par défaut `.agents/results/`, `.agents/state/` et `docs/plans/` dans Git. `docs/decisions/` est en dehors de cet ignore par défaut. Relisez le `.gitignore` du projet lorsque vous adoptez un contrat ou un plan de travail que l’équipe doit versionner.

## Migrer un projet existant {#migrate-an-existing-project}

Prévisualisez d’abord la migration :

```bash
oma docs migrate --dry-run
```

Pour une sortie structurée, ajoutez `--json`. Appliquez la même migration explicitement lorsque vous êtes prêt :

```bash
oma docs migrate --dry-run --json
oma docs migrate
```

`oma install` et `oma update` exécutent aussi cette migration. Elle regroupe ces emplacements hérités :

<!-- oma-docs:ignore-start -->
| Emplacement hérité | Destination |
|-----------------|-------------|
| `docs/design-docs/` | `docs/decisions/` |
| `docs/plans/designs/` | `docs/decisions/` |
| `.agents/results/architecture/adr-*.md` et leurs sidecars de diagrammes rédigés | `docs/decisions/` |
| `.agents/state/memories/result-*.md` | `.agents/results/` |
| `.serena/memories/result-*.md` | `.agents/results/` |
<!-- oma-docs:ignore-end -->

Les documents de décision conservent la structure de leurs sous-répertoires. Les ADR d’architecture hérités se déplacent avec leurs sidecars `.archify.json` et `.archify.html` rédigés. Les revues, recommandations et journaux de validation propres à une exécution restent dans le répertoire de résultats. La migration des résultats couvre les fichiers `result-*.md` de premier niveau dans les deux répertoires de mémoire ; les autres fichiers de mémoire restent en place.

La migration préserve les fichiers de destination existants. Si un fichier différent porte le même nom, elle ajoute un suffixe de source, par exemple `001-cache--from-plan-designs.md`, et signale le chemin choisi. Si ce nom est déjà pris, elle ajoute une empreinte de contenu stable. Relancer la migration ne crée pas de copies en double et ne renomme pas les fichiers déjà migrés.

Elle met à jour les liens Markdown pris en charge et les références de chemins dans les documents déplacés, les notes de coordination Markdown, `docs/**/*.md`, ainsi que les fichiers `README*.md` et `AGENTS.md` à la racine. Relisez ces changements avec le rapport de migration et le diff Git. Les preuves d’exécution structurées et les fichiers `DESIGN.md` d’interface sont exclus de la réécriture des références. Les blocs `oma-docs:ignore-start` / `oma-docs:ignore-end` existants préservent les exemples de chemins hérités.

Relisez le rapport pour les fichiers différés. Un rapport de résultat référencé par une preuve d’exécution structurée reste à son chemin d’origine, afin que le reçu enregistré et l’empreinte restent valides. Les reçus, les claims, les plans d’exécution figés et les autres preuves de runtime restent en place. La migration ne promeut pas les brouillons de contrats, n’accepte pas les décisions et ne modifie pas le système de design d’interface.
