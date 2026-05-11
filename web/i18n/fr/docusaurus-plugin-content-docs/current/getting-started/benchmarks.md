---
title: Benchmarks
description: Cinq harnais Claude Code ont construit le même MVP de plateforme d'apprentissage 3D pour enfants à partir d'un prompt identique. oh-my-agent est arrivé en tête avec 80.6/100 sur les axes fonctionnel, spec, visuel, ingénierie et efficacité.
---

# Benchmarks

Cinq harnais Claude Code ont construit le même MVP de plateforme créative d'apprentissage 3D pour enfants à partir d'un prompt brut identique. **oh-my-agent s'est classé premier avec 80.6/100** sur une grille à 5 axes (fonctionnel, spec, visuel, ingénierie, efficacité).

> Conditions d'exécution : `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth via le CLI `claude` connecté de l'utilisateur (pas d'`ANTHROPIC_API_KEY`).

---

## Harnais comparés

| Harnais | Mécanisme |
|---|---|
| `vanilla` | Claude Code nu, sans plugin/skill (référence) |
| `oma` | `oh-my-agent` initialisé depuis la source (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` via `--plugin-dir` |
| `ecc` | `everything-claude-code` installé dans `~/.claude/` |
| `superpowers` | `superpowers` via `--plugin-dir` |

---

## Tableau final des scores

| Rang | Harnais | **Total** | Func/35 | Spec/15 | Visuel/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Économie d'exécution

| Harnais | Tours | Durée | Coût | Fichiers (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Comparaison des landing pages

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Les comparaisons complètes écran par écran (world builder, panneau IA, galerie, état save→reload) sont disponibles dans le [rapport de benchmark GitHub](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Comment les axes sont calculés

| Axe | Poids | Signaux clés | Outillage |
|---|---|---|---|
| **Fonctionnel** | 35 | sortie du build, démarrage du serveur de dev (HTTP 200 ≤45s), 5 vérifications de parcours utilisateur, lint, ts-clean | `pm install/build/lint`, curl, MCP chrome-devtools, `tsc --noEmit` |
| **Spec** | 15 | 13 livrables explicites du prompt, bonus pour API réelle | juge LLM avec extracteur JSON équilibré en accolades |
| **Visuel** | 20 | anti-patterns, UX adaptée aux enfants, cohérence du design system, accessibilité | juge LLM sur captures d'écran |
| **Ingénierie** | 20 | étendue du code, TS strict, taille max de fichier + profondeur de dossier, marqueurs de stub différé, pas de clés en dur | analyse statique (jq + grep + find) |
| **Efficacité** | 10 | tours nécessaires, durée d'horloge, coût par fichier | JSON résultat de `claude -p` |

Les juges spec et visuel s'exécutent 3 fois par harnais via `judge-multi.sh` et les scores par item sont moyennés sur l'ensemble des tours. L'implémentation se trouve à [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Mises en garde

1. **Override du prompt superpowers** -- nécessaire pour que le harnais fonctionne en mode non interactif (sa skill de brainstorming `<HARD-GATE>` bloque les exécutions one-shot). Le résultat reflète « ce que superpowers peut faire une fois la barrière contournée », pas une comparaison strictement équivalente.
2. **Moyennage multi-juges sur spec + visuel, exécution unique pour le parcours** -- le jugement de parcours nécessite un serveur de dev en marche, il reste donc en exécution unique. Considérez les écarts de parcours inférieurs à environ 2 points comme du bruit. La taille d'échantillon est de 1 build par harnais.
3. **Normalisation du coût** -- l'axe d'efficacité utilise le coût par fichier ; le coût absolu ($1.28-$8.19 sur les 5) n'est pas reflété dans le score.
4. **La pénalité `lint-clean` d'oma est intentionnelle** -- oma laisse délibérément l'application du lint/typecheck aux git hooks (husky + lint-staged) et à la CI plutôt que d'intégrer des règles spécifiques à ESLint dans les skills d'agents. Le benchmark à exécution unique pénalise ce choix de -5 sur `lint-clean`, mais dans un workflow réel les mêmes problèmes seraient bloqués par pre-push avant d'atteindre le remote.

---

## Reproduire

```bash
# Run all 5 harnesses (sequential, ~45 min, ~$15-20 in API spend)
./benchmarks/run.sh

# Multiaxis scoring per harness (5-axis, 100pt) — single judge round
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Generate the report
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

Le récit complet par harnais, les scores bruts et les captures d'écran sont maintenus dans [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md) -- ce fichier est généré par `build-report.sh` à partir des `multiaxis/*.json` de chaque exécution, il reste donc toujours synchronisé avec les derniers artefacts de scoring.
