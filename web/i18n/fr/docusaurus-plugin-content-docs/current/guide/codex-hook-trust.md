---
title: "Guide : confiance des hooks Codex"
sidebar_label: Confiance des hooks Codex
description: Comment Codex conditionne les hooks à la confiance, ce qu’oh-my-agent enregistre pour que ses hooks s’exécutent, et quand vous devez encore les examiner vous-même.
---

# Guide : confiance des hooks Codex

Lorsque oh-my-agent s’installe dans un projet, il écrit les configurations de hooks propres aux fournisseurs, notamment `.codex/hooks.json` pour le CLI Codex. Codex n’exécute pas un hook simplement parce qu’il est configuré. Deux approbations le conditionnent, et les deux vivent dans votre configuration utilisateur (`$CODEX_HOME/config.toml`, par défaut `~/.codex/config.toml`). Un projet ne peut pas approuver ses propres hooks :

1. **Confiance du projet.** Le dossier `.codex/` d’un projet (son `config.toml` et son `hooks.json`) ne se charge que pour un projet de confiance : `[projects."<path>"] trust_level = "trusted"`.
2. **Confiance par hook.** Chaque hook non géré, dans la portée du projet ou de l’utilisateur, a besoin d’une entrée `[hooks.state."<hooks.json path>:<event>:<group>:<handler>"]` dont le `trusted_hash` correspond à la déclaration actuelle du hook (commande, timeout, matcher, indicateur async, message de statut).

Un hook nouveau ou modifié affiche « Hooks need review » dans le TUI Codex. `codex exec` l’omet silencieusement.

---

## Ce qu’oh-my-agent enregistre pour vous

`oma install`, `oma update` et `oma link` écrivent les deux approbations pour **les hooks propres à oh-my-agent**. Ce sont les handlers nommés `oma-hook-*` ou exécutés via le wrapper `oma-hook.sh`. Le hachage est le même que celui que Codex calcule lorsque vous choisissez « Trust all and continue », de sorte que les hooks s’exécutent dès la première session Codex, sans étape `/hooks`. Une version ultérieure d’oh-my-agent qui modifie une commande de hook enregistre le nouveau hachage pendant `oma update`, et les hooks restent donc actifs.

oh-my-agent ne modifie que les tables concernées de `config.toml`. Il relit le résultat et laisse le fichier intact si quoi que ce soit d’autre changerait. Il ne fait jamais ceci :

- approuver un hook que vous avez ajouté vous-même au même `hooks.json`,
- faire confiance à un projet que vous avez marqué `trust_level = "untrusted"`,
- réactiver un hook que vous avez désactivé (`enabled = false`),
- toucher à Codex avant que Codex ait créé son répertoire home.

Une installation globale (`~/.codex/hooks.json`) ne reçoit que les entrées par hook, car il n’y a pas de projet auquel faire confiance.

---

## Quand vous examinez encore les hooks vous-même

Si oh-my-agent n’a pas pu enregistrer la confiance, il affiche la raison avec l’avis :

```text
⚠ Codex hooks installed/updated but not trusted (<reason>) — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Les cas habituels sont un `config.toml` qu’il ne peut pas analyser, un projet que vous avez marqué comme non fiable, ou Codex qui n’a pas encore été lancé. Dans ce cas, ouvrez le projet dans Codex, lancez `/hooks` et activez les hooks une fois. Puis lancez `oma link codex` afin que les mises à jour suivantes les gardent approuvés.

---

## Processus Codex lancés par oh-my-agent

Lorsque oh-my-agent lance lui-même un sous-processus Codex (par exemple `oma agent spawn`), il transmet aussi `--dangerously-bypass-hook-trust`. Cet indicateur exécute les hooks activés sans le contrôle de hachage. Il ne lève pas la confiance du projet. L’indicateur ne s’applique qu’aux processus qu’oh-my-agent démarre et n’est jamais écrit dans votre configuration.

---

## Aucun indicateur `[features] hooks` requis

Les anciennes versions d’oh-my-agent écrivaient `[features] codex_hooks = true` dans la configuration Codex. Codex 0.124 a renommé cet indicateur en `hooks` et a fait des hooks une fonctionnalité stable, activée par défaut ; aucun indicateur n’est donc nécessaire. oh-my-agent n’écrit aucune de ces deux clés et supprime les indicateurs obsolètes `codex_hooks` et `child_agents_md` de la table `[features]` lorsqu’il les trouve.

---

## Résumé

| Situation | Ce que vous faites |
|:----------|:------------|
| Première installation dans un projet | Rien : la confiance est enregistrée par l’installateur |
| `oma update` qui modifie une commande de hook | Rien : le nouveau hachage est enregistré |
| L’installateur affiche « not trusted (…) » | Corrigez la raison, ou lancez `/hooks` une fois dans Codex |
| Un hook que vous avez ajouté à `.codex/hooks.json` | Examinez-le vous-même dans `/hooks` |

## Voir aussi

- [Intégration à un projet existant](./integration.md) : ce que l’installateur écrit pour chaque fournisseur
- [Installation globale](./global-install.md) : installations à l’échelle de l’utilisateur qui écrivent `~/.codex/`
