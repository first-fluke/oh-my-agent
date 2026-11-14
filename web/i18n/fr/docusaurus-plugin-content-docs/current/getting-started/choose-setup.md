---
title: Choisir une configuration
description: Chargez une compétence OMA pour une tâche, sélectionnez un preset de domaine, ou installez le plugin Claude Code avec ses dépendances de runtime.
---

# Choisir une configuration

Choisissez le point d’entrée de la tâche que vous voulez accomplir.

| Besoin | Point d’entrée | Ce qu’il met en place |
|---|---|---|
| Une tâche ciblée dans votre agent actuel | [Charger une compétence](#load-one-skill) | Instructions et fichiers de support dans un répertoire temporaire |
| Hooks de projet, agents spécialisés et workflows | [Installer un preset de compétences](#install-a-skill-preset) | Intégration du runtime OMA avec les compétences sélectionnées |
| Installation depuis le marketplace Claude Code | [Installer le plugin](#install-the-claude-code-plugin) | Le plugin OMA et l’amorçage du projet |
| Installation du paquet Copilot CLI, Kiro, Qwen Code, Hermes ou Codex | [Paquet Agent Plugins](../guide/vendor-capabilities.md#agent-plugins-package) | Compétences et serveurs MCP pour chaque hôte ; Copilot reçoit aussi les agents, les commandes, les règles et le hook d’amorçage |

## Charger une compétence {#load-one-skill}

Demandez à votre agent de codage d’exécuter la commande de votre tâche et de lire les instructions renvoyées. `skills use` affiche les instructions et le chemin de leur répertoire de support. Il ne lance pas un autre agent et n’exécute pas l’installateur OMA.

| Tâche | Commande | Première demande |
|---|---|---|
| Conception d’une interface d’administration ou revue d’une interface existante | `bunx skills use first-fluke/oh-my-agent@oma-design` | Passez en revue la hiérarchie, la densité du tableau et les états vides de notre page d’administration. |
| Un bug reproductible | `bunx skills use first-fluke/oh-my-agent@oma-debug` | Reproduis cet échec, corrige sa cause et lance le contrôle pertinent. |
| Une décision d’architecture | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | Compare le fait de garder ce job dans l’API avec son déplacement vers un worker. |

Le dossier sélectionné inclut ses références d’instructions partagées. Les dépendances hors de ce dossier restent explicites : une autre compétence de domaine, des règles de projet, des opérations CLI, des outils de navigateur ou un moteur externe peuvent encore être requis. Lisez les dépendances de la compétence sélectionnée pour l’opération demandée. Installez le runtime lorsque la tâche exige ses hooks ou une exécution gérée.

Pour le travail de design, `oma-design` sélectionne Interface Design pour la direction d’interfaces d’administration et de produit, Taste pour les autres directions artistiques web, et Impeccable pour la critique, l’audit et le polissage d’une interface existante. La pile du projet et `DESIGN.md` restent les contrats d’implémentation et de design.

## Installer un preset de compétences {#install-a-skill-preset}

Installez la CLI une fois, puis sélectionnez les compétences du projet :

```bash
bun install --global oh-my-agent
oma install --preset frontend --yes
oma doctor
```

Une installation de CLI déjà présente peut commencer à la deuxième commande. Utilisez `oma install --help` pour les noms de presets et les options de fournisseurs. L’[installateur d’amorçage](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#method-1-one-liner-install) prépare aussi les dépendances du runtime avant la configuration interactive.

| Preset | Première tâche | Exemples de workflows applicables |
|---|---|---|
| `frontend` | Planifier une page de réglages, puis implémenter son formulaire | `/plan`, `/design`, `/review`, `/debug` |
| `backend` | Planifier un endpoint d’API authentifié | `/plan`, `/architecture`, `/review`, `/debug` |
| `research` | Trouver des articles et comparer leurs preuves | Demander une recherche bibliographique citée |
| `all` | Coordonner une fonctionnalité à travers l’interface, l’API et les données | `/orchestrate`, `/work`, `/ultrawork`, `/ralph` |

Les [presets nommés](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#presets) sont acceptés par `--preset`. Un nom inconnu, une valeur vide ou `custom` est rejeté avant l’installation. Pour sélectionner des compétences individuellement, lancez `oma install` de façon interactive et choisissez Custom. Sans `--preset`, une configuration non interactive `--yes`/CI sélectionne `all`.

Le preset frontend sélectionne huit compétences. Les presets sélectionnent le contenu des compétences ; l’installateur met toujours en place les fichiers partagés, toutes les définitions de workflows et d’agents, les hooks et les fournisseurs. Certains workflows ont besoin de compétences hors d’un preset de domaine. Vérifiez les [dépendances des workflows](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#workflows-that-need-skills-outside-a-preset) avant de les utiliser, ou sélectionnez `all` pour chaque workflow. Un preset plus restreint sur une installation existante ne retire pas les autres compétences.

Les choix de fournisseurs sont indépendants des presets. Par exemple, ajoutez `--semantic-memory none` lorsque le projet n’a pas besoin d’un service de mémoire sémantique. Consultez les [effets de l’installation](https://firstfluke.com/oh-my-agent/docs/getting-started/installation/#what-the-installer-also-does-by-default) pour les autres fichiers et intégrations que le runtime configure.

Le résumé d’installation liste les compétences sélectionnées et vérifie les manifestes de compétences présents, y compris les compétences conservées. Il signale les références statiques de workflows et d’agents, y compris les branches conditionnelles, comme des manifestes de compétences référencés. Lancez `oma doctor` pour réparer les entrées manquantes ou illisibles nécessaires à votre tâche. Ces contrôles ne vérifient pas le contenu des ressources, les outils, les fournisseurs, les identifiants ni l’exécution.

## Installer le plugin Claude Code {#install-the-claude-code-plugin}

Lancez ces commandes dans Claude Code :

```text
/plugin marketplace add first-fluke/oh-my-agent
/plugin install oma@oh-my-agent
```

Choisissez `oma-frontend@oh-my-agent`, `oma-security@oh-my-agent` ou `oma-research@oh-my-agent` pour un plugin de domaine. L’entrée `oma` complète conserve la sélection de compétences entière. Les entrées de domaine amorcent leur preset correspondant.

Le hook de début de session du plugin approvisionne la CLI lorsque c’est nécessaire et lance `oma install --yes` pour le projet courant. Ce chemin effectue la configuration du runtime. Son reçu de succès appartient à ce projet, et les hooks d’événements du plugin utilisent la CLI installée. Les hooks de plugin exigent Bash, y compris sous Windows. L’amorçage a un délai de 600 secondes ; les échecs signalent les étapes de configuration manuelle et conservent le journal du projet dans `.agents/state/plugin-bootstrap.last-error.log`. Un reçu n’est réutilisé qu’après le passage des contrôles de version de la CLI, de configuration du projet et de hooks. Redémarrez la session une fois que l’amorçage signale son achèvement.

Pour les choix de configuration et de dépendances pendant la mise en place, utilisez directement `oma install`. L’amorçage non interactif du plugin complet utilise le preset de compétences `all` ; chaque plugin de domaine transmet son preset sélectionné. Un preset plus restreint conserve les autres compétences déjà installées dans le projet.

## Vérifier le résultat {#check-the-result}

Pour une compétence chargée, confirmez que l’agent a lu les instructions sélectionnées et rendez compte des contrôles réels de la tâche. Pour une installation du runtime, lancez `oma doctor` et essayez la première demande de votre preset. Les avertissements de fournisseurs de doctor comptent lorsque la tâche demandée utilise ce fournisseur.
