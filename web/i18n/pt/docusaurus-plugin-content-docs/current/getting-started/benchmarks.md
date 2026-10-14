---
title: Benchmarks
description: "Cinco harnesses do Claude Code construíram o mesmo MVP de plataforma 3D de aprendizagem infantil a partir de um prompt idêntico. O oh-my-agent ficou em primeiro com 80.6/100 nos eixos funcional, de especificação, visual, de engenharia e de eficiência."
---

# Benchmarks

Cinco harnesses do Claude Code construíram o mesmo MVP de plataforma 3D criativa de aprendizagem infantil a partir do mesmo prompt bruto. **O oh-my-agent ficou em primeiro lugar, com 80.6/100**, em uma rubrica de 5 eixos (funcional, especificação, visual, engenharia e eficiência).

> Condições de execução: `claude-opus-4-6`, esforço `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth pelo CLI `claude` conectado à conta do usuário (sem `ANTHROPIC_API_KEY`).

---

## Harnesses comparados

| Harness | Mecanismo |
|---|---|
| `vanilla` | Claude Code sem plugin ou skill (baseline) |
| `oma` | `oh-my-agent` preparado a partir do código-fonte (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` via `--plugin-dir` |
| `ecc` | `everything-claude-code` instalado em `~/.claude/` |
| `superpowers` | `superpowers` via `--plugin-dir` |

---

## Placar final

| Posição | Harness | **Total** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Economia de execução

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

As comparações completas por tela (construtor de mundos, painel de IA, galeria e estado após salvar→recarregar) estão no [relatório de benchmarks do GitHub](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Como os eixos são calculados

| Eixo | Peso | Sinais principais | Ferramentas |
|---|---|---|---|
| **Funcional** | 35 | saída do build, servidor de desenvolvimento inicia (HTTP 200 ≤45s), 5 verificações de jornada do usuário, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Spec** | 15 | 13 entregáveis explícitos do prompt, bônus por API real | Avaliador LLM com extrator JSON balanceado por chaves |
| **Visual** | 20 | anti-patterns, UX adequada para crianças, consistência do sistema de design, acessibilidade | Avaliador LLM sobre capturas de tela |
| **Engenharia** | 20 | amplitude do código, TS strict, tamanho máximo de arquivo + profundidade de pasta, marcadores de stub adiado, ausência de chaves codificadas | análise estática (jq + grep + find) |
| **Eficiência** | 10 | turnos até concluir, duração em tempo real, custo por arquivo | JSON de resultado de `claude -p` |

Os avaliadores de especificação e visual executam 3 vezes por harness via `judge-multi.sh`; as pontuações por item são calculadas pela média das rodadas. A implementação está em [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Ressalvas

1. **Sobrescrita de prompt do superpowers**: foi necessária para o harness funcionar em modo não interativo (a skill de brainstorming `<HARD-GATE>` bloqueia execuções de uma única rodada). O resultado representa “o que o superpowers consegue fazer depois que o gate é contornado”, e não uma comparação perfeitamente equivalente.
2. **Média de vários avaliadores em spec + visual, jornada em uma única execução**: a avaliação da jornada exige um servidor de desenvolvimento ativo, por isso é executada uma única vez. Trate lacunas de jornada menores que aproximadamente 2 pontos como ruído. O tamanho da amostra é 1 build por harness.
3. **Normalização de custo**: o eixo de eficiência usa o custo por arquivo; o custo absoluto ($1.28–$8.19 entre os 5) não aparece na pontuação.
4. **A penalidade `lint-clean` do oma é intencional**: o oma deixa deliberadamente a aplicação de lint/typecheck a cargo dos hooks do git (husky + lint-staged) e da CI, em vez de incorporar regras específicas de ESLint às skills dos agentes. O benchmark de uma única execução penaliza isso em -5 em `lint-clean`, mas em um workflow real os mesmos problemas seriam bloqueados pelo pre-push antes de chegar ao remoto.

---

## Reproduzir

```bash
# Run all harnesses (sequential, ~45 min, ~$15-20 in API spend)
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

A narrativa completa por harness, as pontuações brutas e as capturas de tela são mantidas em [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md). Esse arquivo é gerado por `build-report.sh` a partir de cada `multiaxis/*.json`, portanto permanece sincronizado com os artefatos de pontuação mais recentes.
