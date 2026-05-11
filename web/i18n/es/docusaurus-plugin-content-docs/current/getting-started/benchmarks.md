---
title: Benchmarks
description: Cinco harnesses de Claude Code construyeron el mismo MVP de plataforma de aprendizaje 3D para niños a partir de un prompt idéntico. oh-my-agent quedó en primer lugar con 80.6/100 a través de los ejes funcional, de especificación, visual, de ingeniería y de eficiencia.
---

# Benchmarks

Cinco harnesses de Claude Code construyeron el mismo MVP de plataforma de aprendizaje creativo 3D para niños a partir de un prompt crudo idéntico. **oh-my-agent quedó en primer lugar con 80.6/100** en una rúbrica de 5 ejes (funcional, especificación, visual, ingeniería, eficiencia).

> Condiciones de ejecución: `claude-opus-4-6`, esfuerzo `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth mediante el CLI `claude` con sesión iniciada del usuario (sin `ANTHROPIC_API_KEY`).

---

## Harnesses comparados

| Harness | Mecanismo |
|---|---|
| `vanilla` | Claude Code puro, sin plugin/skill (línea base) |
| `oma` | `oh-my-agent` sembrado desde la fuente (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` vía `--plugin-dir` |
| `ecc` | `everything-claude-code` instalado en `~/.claude/` |
| `superpowers` | `superpowers` vía `--plugin-dir` |

---

## Marcador final

| Puesto | Harness | **Total** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Economía de la ejecución

| Harness | Turnos | Duración | Costo | Archivos (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Comparativa de la landing page

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Las comparaciones completas pantalla por pantalla (world builder, panel de IA, galería, estado save→reload) están disponibles en el [reporte de benchmark de GitHub](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Cómo se calculan los ejes

| Eje | Peso | Señales clave | Herramientas |
|---|---|---|---|
| **Funcional** | 35 | salida del build, arranque del dev-server (HTTP 200 ≤45s), 5 verificaciones de user-journey, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Especificación** | 15 | 13 entregables explícitos del prompt, bonus por API real | LLM judge con extractor JSON con llaves balanceadas |
| **Visual** | 20 | anti-patrones, UX amigable para niños, consistencia del design system, accesibilidad | LLM judge sobre capturas de pantalla |
| **Ingeniería** | 20 | amplitud del código, TS strict, tamaño máximo de archivo + profundidad de carpetas, marcadores deferred-stub, sin claves hardcoded | análisis estático (jq + grep + find) |
| **Eficiencia** | 10 | turnos para completar, duración wall-clock, costo por archivo | JSON de resultado de `claude -p` |

Los jueces de especificación y visual se ejecutan 3 veces por harness vía `judge-multi.sh` y los puntajes por ítem se promedian a través de las rondas. La implementación reside en [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Caveats

1. **Override del prompt de superpowers** — necesario para que el harness funcione en modo no interactivo (su skill de brainstorming `<HARD-GATE>` bloquea las ejecuciones single-shot). El resultado refleja "lo que superpowers puede hacer una vez que se omite el gate", no una comparación pura entre iguales.
2. **Promedio multi-juez en spec + visual, journey de una sola ejecución** — la evaluación del journey requiere un dev server activo, por lo que se mantiene en una sola ejecución. Trata las diferencias de journey por debajo de ~2 puntos como ruido. El tamaño de la muestra es 1 build por harness.
3. **Normalización del costo** — el eje de eficiencia usa costo por archivo; el costo absoluto ($1.28–$8.19 entre los 5) no se refleja en el puntaje.
4. **La penalización `lint-clean` de oma es intencional** — oma deliberadamente delega la aplicación de lint/typecheck a los git hooks (husky + lint-staged) y a CI, en lugar de incorporar reglas específicas de ESLint en las skills de los agentes. El benchmark de una sola ejecución penaliza esto con -5 en `lint-clean`, pero en un flujo de trabajo real los mismos problemas serían bloqueados por pre-push antes de llegar al remoto.

---

## Reproducir

```bash
# Ejecuta los 5 harnesses (secuencial, ~45 min, ~$15-20 de gasto en API)
./benchmarks/run.sh

# Puntuación multiaxis por harness (5 ejes, 100pt) — una sola ronda de juez
for h in vanilla oma omc ecc superpowers; do
  ./benchmarks/scoring/multiaxis/score.sh \
    /tmp/oma-benchmark-<timestamp>/projects/$h \
    $h \
    /tmp/oma-benchmark-<timestamp>/results/$h.json \
    /tmp/oma-benchmark-<timestamp>/multiaxis/$h
done

# Genera el reporte
./benchmarks/scoring/multiaxis/build-report.sh \
  /tmp/oma-benchmark-<timestamp> \
  $(pwd)
```

La narrativa completa por harness, los puntajes brutos y las capturas de pantalla se mantienen en [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md) — ese archivo es generado por `build-report.sh` a partir de los `multiaxis/*.json` de cada ejecución, por lo que siempre está sincronizado con los artefactos de puntuación más recientes.
