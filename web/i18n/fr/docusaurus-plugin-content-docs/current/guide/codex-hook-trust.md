---
title: "Guide : Confiance des hooks Codex"
sidebar_label: Confiance des hooks Codex
description: Pourquoi les hooks Codex ne s’exécutent qu’après une première revue, ce qui se passe lors des mises à jour et ce qu’oh-my-agent automatise pour les sous-processus Codex créés.
---

# Guide : Confiance des hooks Codex

Lorsque oh-my-agent s’installe dans un projet, il écrit les configurations de hooks propres aux fournisseurs, notamment `.codex/hooks.json` pour le CLI Codex. Contrairement à Claude Code, Codex n’exécute pas automatiquement ces hooks. Il protège chaque hook de commande non géré derrière Trust-On-First-Use (TOFU) : un hook ne s’exécute qu’après avoir été examiné et activé une fois.

---

## L’étape unique : examiner les hooks dans Codex

Après que `oma` (install), `oma link` ou `oma update` a écrit `.codex/hooks.json` dans un projet que Codex n’a encore jamais vu (pour une installation globale, `~/.codex/hooks.json`), les hooks ne s’exécutent **pas encore**. Ouvrez Codex et examinez-les une fois :

1. Ouvrez le projet dans le CLI Codex.
2. Lancez `/hooks` pour ouvrir le navigateur de hooks (TUI).
3. Examinez les hooks listés et activez-les.

Tant que vous ne l’avez pas fait, les hooks restent non approuvés et sont ignorés silencieusement. C’est pourquoi oh-my-agent affiche une notification chaque fois qu’il crée ou modifie `.codex/hooks.json` :

```text
⚠ Codex hooks installed/updated — run codex and use /hooks to trust them (untrusted hooks do not run).
```

Vérifiez le fichier généré avant d’ouvrir Codex :

```bash
test -s .codex/hooks.json && echo "Codex hooks are installed"
oma link codex
```

Le résultat attendu est la notification d’installation ou de mise à jour, suivie des hooks dans le navigateur `/hooks` de Codex. `oma link codex` réconcilie le fichier généré ; il ne remplace pas la décision de confiance unique.

**Remarque :** `--dangerously-bypass-hook-trust` ne sert pas ici. Son avertissement (« Enabled hooks may run without review ») signifie qu’il ne contourne la revue que pour les hooks déjà activés ; il n’exécutera pas un hook qui n’a jamais été examiné. Le navigateur `/hooks` est le seul moyen d’activer un hook la première fois.

En interne, Codex enregistre votre décision dans `~/.codex/config.toml` sous une entrée `[hooks.state]` indexée par le chemin du fichier de hooks, l’événement, le bloc et le hook, avec un indicateur `enabled` et un `trusted_hash` de la chaîne de commande.

---

## Ce qui se passe lors des mises à jour

Une fois les hooks approuvés, vous n’avez pas à répéter l’étape à chaque mise à jour :

- **Relancer `oma link` ou `oma update` conserve la confiance** tant que les chaînes de commande des hooks restent inchangées. Codex compare le hachage enregistré à la commande actuelle ; une correspondance conserve le hook approuvé.
- **Si une future version d’oh-my-agent modifie la chaîne de commande d’un hook**, les hachages ne correspondent plus et ce hook redevient silencieusement non approuvé. Vous verrez à nouveau la notification de l’installateur et devrez lui redonner votre confiance via `/hooks`.

La revue n’est donc requise qu’une première fois, puis après chaque version qui modifie réellement une commande de hook.

---

## Ce qu’oh-my-agent automatise pour vous

Lorsqu’oh-my-agent crée lui-même un sous-processus Codex — par exemple un agent inter-fournisseurs distribué via `oma agent spawn` — il transmet automatiquement `--dangerously-bypass-hook-trust`. Ses propres hooks vérifiés peuvent ainsi s’exécuter lors des mises à jour sans vous demander de leur redonner manuellement votre confiance.

Cette option s’applique **uniquement** aux processus Codex qu’oh-my-agent crée. Elle n’est jamais écrite dans votre `~/.codex/config.toml` ni dans la configuration du projet ; elle n’affecte donc pas les sessions Codex que vous démarrez vous-même.

---

## Aucun indicateur `[features] hooks` requis

Les anciennes versions d’oh-my-agent écrivaient `[features] codex_hooks = true` dans la configuration Codex. Codex 0.124 a renommé cet indicateur en `hooks` et a fait des hooks une fonctionnalité stable, activée par défaut ; aucun indicateur n’est donc nécessaire. oh-my-agent n’écrit aucune de ces deux clés et supprime les indicateurs obsolètes `codex_hooks` et `child_agents_md` de la table `[features]` lorsqu’il les trouve.

---

## Résumé

| Situation | Ce que vous faites |
|:----------|:------------|
| Première installation / premier `.codex/hooks.json` dans un projet | Ouvrir Codex, lancer `/hooks` et activer les hooks une fois |
| `oma update` avec des commandes de hooks inchangées | Rien — la confiance est conservée |
| `oma update` qui modifie une commande de hook | Relancer `/hooks` pour redonner la confiance (l’installateur affiche une notification) |
| Sous-processus Codex créé par oh-my-agent | Rien — le contournement est appliqué automatiquement |

## Voir aussi

- [Intégration à un projet existant](./integration.md) : ce que l’installateur écrit pour chaque fournisseur
- [Installation globale](./global-install.md) : installations à l’échelle de l’utilisateur qui écrivent `~/.codex/`
