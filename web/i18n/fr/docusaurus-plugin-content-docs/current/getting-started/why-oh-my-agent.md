---
title: Pourquoi oh-my-agent
description: Positionnement d'oh-my-agent dans une categorie multi-agent CLI saturee. Le cout a glisse de l'implementation vers les tests et la maintenance ; oh-my-agent apporte des quality gates, une verification independante, du multi-vendor dispatch et une personnalisation repo-native pour repondre a ce glissement.
---

# Pourquoi oh-my-agent

La categorie multi-agent CLI est deja saturee. Rien que sur le dernier trimestre, plus de vingt multi-agent orchestrators sont apparus : Metateam, OpenSwarm, DevSquad, Praktor, Salacia, Codelegate, agent-of-empires, TTal, Maggy, et d'autres. La plupart optimisent le meme axe : faire ecrire les agents plus vite.

oh-my-agent optimise un axe different. L'hypothese de depart est qu'avec des modeles suffisamment capables, le cout d'analyse, conception et implementation dans le SDLC tend vers zero. La partie chere du developpement logiciel a toujours ete tester et maintenir : garder un systeme en marche, sur, et comprehensible apres le premier commit. C'est sur cet axe qu'oh-my-agent est concu.

Cette page concretise ce positionnement. Pour la discussion longue qui a fait emerger ce cadrage, voir l'[issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

---

## Le cout a glisse

Quand un seul modele capable produit une feature qui marche en quelques minutes, le goulot d'etranglement n'est plus le throughput d'implementation. Le goulot d'etranglement devient : verifier que le code produit fait reellement ce qu'il pretend, attraper les regressions silencieuses entre iterations, garder les secrets hors des prompts et logs, et exposer la depense de tokens avant qu'elle surprenne l'equipe.

Un harness qui ne fait que spawner des agents plus vite ne resout rien de cela. Un harness pense pour la phase post-implementation, si.

---

## Ce qu'oh-my-agent livre au vrai centre de cout

Chaque capacite ci-dessous repond a un mode d'echec specifique signale dans la categorie multi-agent CLI.

### Verification independante, pas auto-evaluation par LLM

`oma verify <agent>` execute quatorze verifications deterministes par type d'agent. Toutes mecaniques : exit code de la commande de tests, TypeScript strict passe, detection de patterns raw SQL, scan de secrets hardcodes, Flutter analyze, scan d'inline styles, violation de scope contre le charter de l'agent. Aucun LLM ne juge si le travail "a l'air correct". Une verification passe si et seulement si sa commande sous-jacente reporte un succes.

Ceci repond a la plainte la plus courante de la categorie, resumee dans un post communautaire par "agents lie - they say tests pass when tests do not". Voir `cli/commands/verify/verify.ts` pour la liste des verifications.

### Reverification entre iterations

Le workflow `ralph` enveloppe `ultrawork` d'une phase JUDGE independante. Apres chaque iteration, JUDGE reverifie chaque criterion, y compris ceux deja passes aux iterations precedentes. Ceci attrape le cas ou corriger C2 casse silencieusement C1, qui est le mecanisme reel derriere la plupart des regressions dans les longues sessions d'agents.

Les verifications lourdes (plus de trente secondes) sont cachees contre les chemins de fichiers affectes pour garder la reverification peu couteuse. Voir `.agents/workflows/ralph/resources/judge-protocol.md` pour le protocole complet.

### Quota caps qui bloquent avant le degat

Chaque appel a `oma agent spawn` enregistre l'estimation de tokens de ce spawn dans `.serena/memories/session-cost-{sessionId}.md`. Avant le prochain spawn, `checkCap` consulte le quota cap configure et refuse le lancement si une dimension est depassee. Trois dimensions sont appliquees : total tokens, total spawns, budget tokens par vendor.

C'est la difference entre apprendre apres coup que tu as depense quarante mille dollars et etre averti au spawn quinze qu'il te reste un spawn dans ton budget. Voir `cli/io/session-cost.ts` et configurer sous `session.quota_cap` dans `.agents/oma-config.yaml`.

### Retry puis explorer, pas retry pour toujours

Quand `orchestrate` Step 5 detecte un echec de verification, il reessaye l'agent jusqu'a deux fois avec le contexte d'erreur. Si la seconde tentative echoue encore et que le cap de cout n'est pas depasse, le workflow bascule vers l'Exploration Loop : il spawn en parallele deux ou trois variantes d'hypothese alternatives dans des workspaces separes et garde seulement le resultat avec la meilleure note. Les approches echouees sont jetees avec leur cout enregistre.

C'est une reponse structuree au cas ou une approche est fondamentalement fausse. Reessayer la meme ne converge jamais ; essayer des approches differentes en parallele, si.

### Routage de workspace conscient du monorepo

`detectWorkspace` lit les configurations pnpm, nx, turbo et lerna et route chaque agent vers son sous-workspace correspondant automatiquement. Le backend agent tourne contre `apps/api/`, le frontend agent contre `apps/web/`, sans que l'orchestrator ait a composer les chemins manuellement. Voir `cli/io/workspaces.ts`.

---

## Multi-vendor n'est pas optionnel

La seconde hypothese de design est que toute equipe qui fait du developpement assiste par IA serieusement utilise plus d'un provider. Aujourd'hui ca veut dire Claude, Codex, Gemini, Copilot, Qwen, Kimi, et ce qui sortira au prochain trimestre. Changer de vendor est un fait, pas un edge case : Anthropic a deplace les fonctionnalites agent vers un plan payant separe, OpenAI a sorti Codex CLI la meme semaine ou les modeles d'Anthropic se sont degrades, GitHub Copilot est passe a la facturation a l'usage.

oh-my-agent traite la selection de vendor comme configuration per-agent via `model_preset` et `agents.<id>.model` dans `.agents/oma-config.yaml`. Le repertoire portable `.agents/` est la single source of truth ; chaque runtime supporte projette depuis lui. Pas de lock-in vendor necessaire pour utiliser oh-my-agent, et pas de migration necessaire quand tu changes.

---

## Personnalisation repo-native

La troisieme hypothese est qu'aucune paire d'equipes ne partage la meme definition de "done". Une equipe exige des scans OWASP Top 10 sur chaque changement backend. Une autre exige un rapport QA en coreen. Une troisieme exige que chaque migration soit revue par un database agent avant le merge.

Comme `.agents/` sont juste des fichiers dans ton repository, chaque equipe peut ajouter ou modifier les agents, skills, workflows et quality gates pour matcher son propre code de conduite et sa posture compliance. Personnaliser est un `git commit`, pas un ticket support vendor.

---

## Ce que ca veut dire en pratique

Si ta priorite est "spawner des agents en parallele rapidement", beaucoup d'outils couvrent cette surface. Si ta priorite est "livrer du code qui continue de marcher apres que les agents soient partis", oh-my-agent est fait pour cet objectif specifique. `oma verify`, JUDGE, Exploration Loop, quota cap et le routage monorepo ne sont pas des extras optionnels : ce sont les raisons d'exister du projet.

Pour les details de chaque capacite, voir la section Core Concepts (Agents, Parallel Execution) dans la barre laterale.
