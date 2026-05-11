---
title: Benchmarks
description: Cinco harnesses do Claude Code construíram o mesmo MVP de plataforma 3D de aprendizagem infantil a partir de um prompt idêntico. oh-my-agent ficou em primeiro lugar com 80.6/100 nos eixos funcional, spec, visual, engenharia e eficiência.
---

# Benchmarks

Cinco harnesses do Claude Code construíram o mesmo MVP de plataforma 3D criativa de aprendizagem infantil a partir de um prompt bruto idêntico. **oh-my-agent ficou em primeiro lugar com 80.6/100** em uma rubrica de 5 eixos (funcional, spec, visual, engenharia, eficiência).

> Condições de execução: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth via o CLI `claude` logado pelo usuário (sem `ANTHROPIC_API_KEY`).

---

## Harnesses comparados

| Harness | Mecanismo |
|---|---|
| `vanilla` | Claude Code puro, sem plugin/skill (baseline) |
| `oma` | `oh-my-agent` semeado a partir do código-fonte (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` via `--plugin-dir` |
| `ecc` | `everything-claude-code` instalado em `~/.claude/` |
| `superpowers` | `superpowers` via `--plugin-dir` |

---

## Placar final

| Rank | Harness | **Total** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Ef/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Economia da execução

| Harness | Turnos | Duração | Custo | Arquivos (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Comparação da landing page

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Comparações completas por tela (world builder, painel de IA, galeria, estado save→reload) estão no [relatório de benchmark do GitHub](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Como os eixos são calculados

| Eixo | Peso | Sinais principais | Ferramentas |
|---|---|---|---|
| **Funcional** | 35 | exit do build, dev-server sobe (HTTP 200 ≤45s), 5 verificações de jornada do usuário, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13 entregáveis explícitos do prompt, bônus de API real | LLM judge com extrator JSON de chaves balanceadas |
| **Visual** | 20 | anti-padrões, UX amigável para crianças, consistência do design system, acessibilidade | LLM judge sobre screenshots |
| **Engenharia** | 20 | abrangência do código, TS strict, tamanho máximo de arquivo + profundidade de pasta, marcadores de stub deferido, sem chaves hardcoded | análise estática (jq + grep + find) |
| **Eficiência** | 10 | turnos para concluir, duração wall-clock, custo por arquivo | JSON de resultado do `claude -p` |

Os judges de spec e visual rodam 3 vezes por harness via `judge-multi.sh` e os scores por item são tirados pela média entre rodadas. A implementação está em [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Ressalvas

1. **Override do prompt do superpowers** — necessário para o harness funcionar em modo não-interativo (sua skill de brainstorming `<HARD-GATE>` bloqueia execuções single-shot). O resultado reflete "o que o superpowers consegue fazer uma vez que o gate é contornado", e não uma comparação pura apples-to-apples.
2. **Médias multi-judge em spec + visual, jornada single-run** — o julgamento de jornada exige um dev server vivo, então permanece single-run. Trate diferenças de jornada abaixo de ~2 pontos como ruído. O tamanho da amostra é 1 build por harness.
3. **Normalização de custo** — o eixo de eficiência usa custo por arquivo; o custo absoluto ($1.28–$8.19 entre os 5) não é refletido no score.
4. **A penalidade de `lint-clean` do oma é intencional** — o oma deliberadamente deixa a aplicação de lint/typecheck para git hooks (husky + lint-staged) e CI, em vez de embutir regras específicas de ESLint nas skills dos agentes. O benchmark single-run penaliza isso em -5 em `lint-clean`, mas em um workflow real os mesmos problemas seriam bloqueados pelo pre-push antes de chegarem ao remote.

---

## Reproduzir

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

A narrativa completa por harness, os scores brutos e os screenshots são mantidos em [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md) — esse arquivo é gerado pelo `build-report.sh` a partir do `multiaxis/*.json` de cada execução, então está sempre em sincronia com os artefatos de scoring mais recentes.
