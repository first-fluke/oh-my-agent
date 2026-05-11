---
title: Бенчмарки
description: Пять harness'ов Claude Code собрали один и тот же MVP детской 3D-платформы для обучения по идентичному промпту. oh-my-agent занял первое место с результатом 80.6/100 по функциональной, спецификационной, визуальной, инженерной осям и по эффективности.
---

# Бенчмарки

Пять harness'ов Claude Code собрали один и тот же MVP детской 3D-платформы для творческого обучения по идентичному «сырому» промпту. **oh-my-agent занял первое место с 80.6/100** по 5-осевой рубрике (функциональность, спецификация, визуальная часть, инженерия, эффективность).

> Условия запуска: `claude-opus-4-6`, effort `max`, `--max-budget-usd 20`, `--no-session-persistence`, `--setting-sources project,local`. OAuth через залогиненный CLI `claude` пользователя (без `ANTHROPIC_API_KEY`).

---

## Сравниваемые harness'ы

| Harness | Механизм |
|---|---|
| `vanilla` | чистый Claude Code, без plugin/skill (базовая линия) |
| `oma` | `oh-my-agent`, инициализированный из исходников (`.agents/` + `.claude/`) |
| `omc` | `oh-my-claudecode` через `--plugin-dir` |
| `ecc` | `everything-claude-code`, установленный в `~/.claude/` |
| `superpowers` | `superpowers` через `--plugin-dir` |

---

## Итоговая таблица результатов

| Ранг | Harness | **Итого** | Func/35 | Spec/15 | Visual/20 | Eng/20 | Eff/10 |
|---|---|---|---|---|---|---|---|
| 1 | **oma** | **80.6** | 32 | 13.3 | 15.3 | 15 | 5 |
| 2 | omc | 74.1 | 33.5 | 6.7 | 14.4 | 14.5 | 5 |
| 3 | superpowers | 72.9 | 30 | 9.3 | 11.6 | 14 | 8 |
| 4 | vanilla | 70.7 | 28.5 | 11.7 | 12 | 12.5 | 6 |
| 5 | ecc | 70.2 | 28.5 | 9.7 | 13 | 15 | 4 |

### Экономика запусков

| Harness | Ходов | Длительность | Стоимость | Файлов (src) |
|---|---|---|---|---|
| vanilla | 42 | 8m 56s | $2.37 | 16 |
| oma | 31 | 15m 56s | $4.04 | 21 |
| omc | 61 | 9m 02s | $1.92 | 14 |
| ecc | 79 | 10m 20s | $3.84 | 22 |
| superpowers | 39 | 8m 13s | $1.28 | 18 |

---

## Сравнение лендингов

| vanilla | oma | omc | ecc | superpowers |
|---|---|---|---|---|
| ![vanilla](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/vanilla/01-landing.png) | ![oma](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/oma/01-landing.png) | ![omc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/omc/01-landing.png) | ![ecc](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/ecc/01-landing.png) | ![superpowers](https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/benchmarks/screenshots/superpowers/01-landing.png) |

Полные поэкранные сравнения (конструктор миров, AI-панель, галерея, состояние save→reload) доступны в [отчёте бенчмарков на GitHub](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks).

---

## Как рассчитываются оси

| Ось | Вес | Ключевые сигналы | Инструменты |
|---|---|---|---|
| **Функциональная** | 35 | результат сборки, запуск dev-сервера (HTTP 200 ≤45с), 5 проверок пользовательских сценариев, lint, ts-clean | `pm install/build/lint`, curl, chrome-devtools MCP, `tsc --noEmit` |
| **Спецификация** | 15 | 13 явных требований из промпта, бонус за реальный API | LLM-судья с экстрактором JSON по балансу скобок |
| **Визуальная** | 20 | анти-паттерны, удобство для детей, согласованность дизайн-системы, доступность | LLM-судья по скриншотам |
| **Инженерия** | 20 | широта кода, TS strict, максимальный размер файла + глубина папок, маркеры отложенных заглушек, отсутствие захардкоженных ключей | статический анализ (jq + grep + find) |
| **Эффективность** | 10 | количество ходов до завершения, время по часам, стоимость за файл | JSON-результат `claude -p` |

Судьи по спецификации и визуальной части запускаются 3 раза на каждый harness через `judge-multi.sh`, а оценки по каждому пункту усредняются по раундам. Реализация находится в [`benchmarks/scoring/multiaxis/`](https://github.com/first-fluke/oh-my-agent/tree/main/benchmarks/scoring/multiaxis).

---

## Оговорки

1. **Переопределение промпта для superpowers** — необходимо, чтобы harness работал в неинтерактивном режиме (его навык брейншторма `<HARD-GATE>` блокирует одношаговые запуски). Результат отражает «что superpowers может, если обойти gate», а не чистое сравнение «яблоки к яблокам».
2. **Усреднение нескольких судей по spec + visual, одиночный запуск journey** — оценка journey требует живого dev-сервера, поэтому остаётся одноразовой. Разрывы в journey менее ~2 пунктов считайте шумом. Размер выборки — 1 сборка на harness.
3. **Нормализация стоимости** — ось эффективности использует стоимость за файл; абсолютная стоимость ($1.28–$8.19 у пятёрки) в оценке не отражена.
4. **Штраф `lint-clean` у oma — намеренный** — oma сознательно оставляет проверку lint/typecheck на git-хуки (husky + lint-staged) и CI, а не зашивает специфичные для ESLint правила в навыки агентов. Одноразовый бенчмарк штрафует это на -5 в `lint-clean`, но в реальном рабочем процессе те же проблемы были бы заблокированы pre-push до отправки в remote.

---

## Воспроизведение

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

Полное описание по каждому harness'у, исходные оценки и скриншоты поддерживаются в [`benchmarks/README.md`](https://github.com/first-fluke/oh-my-agent/blob/main/benchmarks/README.md) — этот файл генерируется `build-report.sh` из `multiaxis/*.json` каждого запуска, поэтому всегда синхронизирован с последними артефактами оценки.
