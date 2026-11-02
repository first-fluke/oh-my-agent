---
title: "Руководство: Diagram Engine (archify)"
sidebar_label: Диаграммы
description: Как oh-my-agent выбирает между Mermaid и необязательным agent skill tt-a1i/archify для архитектурных, sequence и data-flow diagram — раздел diagram config, oma diagram resolve / oma diagram archify, использование в /architecture и /explain, ограниченный цикл validate-repair-deliver и stack route через upstream skill Caru-ini/stack-diagram для постеров tech-stack с логотипами вендоров.
---

# Diagram Engine

`/architecture` (ADR, рекомендации, review) и `/explain` (explainers изменений кода) создают структурные диаграммы. Для `/architecture` это всегда **Mermaid** blocks внутри Markdown-артефакта (`/explain` рисует собственные inline SVG diagram) и — когда можно разрешить [archify](https://github.com/tt-a1i/archify) — дополнительно **interactive validated HTML diagram** рядом с артефактом: dark/light theme, pan-zoom, search, tracing отношений, PNG/SVG/WebM export, render из typed JSON spec.

Mermaid остаётся текстовым SSOT в Markdown и Git diff; archify — производный артефакт.

---

<a id="always-the-latest-archify--nothing-to-install"></a>
## Установка archify {#install-archify}

archify — agent skill под лицензией MIT (Node ≥ 18, без runtime dependencies). oh-my-agent использует копию, установленную через [skills CLI](https://github.com/vercel-labs/skills), и не хранит собственной копии:

- `oma diagram update` устанавливает archify, если он отсутствует (`bunx skills add tt-a1i/archify --skill archify -g -y`), иначе обновляет его (`bunx skills update archify -g -y`).
- `oma diagram resolve` только читает установленные каталоги skill и никогда не обращается к сети. Без установки `auto` откатывается к Mermaid и называет команду установки.
- `oma update` не устанавливает archify.

```bash
# Illustrative output; the version, install path, and quality can vary.
oma diagram update
oma diagram resolve
# engine:   archify  (requested: auto)
# reason:   archify 2.15.0 via home:~/.agents/skills
# root:     /Users/you/.agents/skills/archify
# bin:      /Users/you/.agents/skills/archify/bin/archify.mjs
# version:  2.15.0
# quality:  showcase
# sidecar:  off (explain)
```

Порядок разрешения (побеждает первое совпадение, одинаков во всех runtime вендоров):

1. `diagram.archify.path` в `oma-config.yaml` — явная pin.
2. Переменная окружения `ARCHIFY_HOME` — явная pin.
3. Установленные каталоги skill: `.agents` / `.claude` / `.codex` / `.cursor` / `.qwen` / `.kiro` / `.gemini` / `.copilot` `/skills/archify` в проекте, затем те же пути под `~`, затем `~/.config/agents/skills/archify` и `~/.raven/workspace/skills/archify`.

<!-- oma-docs:ignore-start -->
Установка считается найденной, только если установленный или закреплённый каталог archify содержит `bin/archify.mjs`.
<!-- oma-docs:ignore-end -->

Предыдущие релизы хранили собственную копию в `~/.cache/oma-diagram/`. Она больше не читается; её можно удалить.

---

## Конфигурация {#configuration}

Неполный раздел в `.agents/oma-config.yaml` (отсутствующие keys используют показанные defaults):

```yaml
diagram:
  engine: auto                # auto | archify | mermaid
  explain_sidecar: false      # /explain also writes an archify sidecar
  archify:
    path: null                # explicit install dir (pin)
    quality: showcase         # showcase | standard  → --quality
    open: false               # pass --open to deliver
```

`archify.managed`, `archify.channel` и `archify.check_interval_min` устарели: они по-прежнему проходят валидацию, но игнорируются, а `resolve` выводит предупреждение, пока они заданы.

### Какой engine запускается {#which-engine-runs}

Одно решение охватывает значение config, разрешается ли archify и что выдаёт workflow. «Разрешается» означает, что любой шаг [порядка разрешения](#always-the-latest-archify--nothing-to-install) находит установку: pin или установленный каталог skill.

| `diagram.engine` | archify разрешается? | `oma diagram resolve --json` | Результат `/architecture` |
|---|---|---|---|
| `auto` (default) | да | `engine: archify`, `ok: true` | Mermaid block + связанный `.archify.html` |
| `auto` | нет (archify не установлен) | `engine: mermaid`, `ok: true` | Только Mermaid; report называет `oma diagram update` |
| `archify` | да | `engine: archify`, `ok: true` | Mermaid block + связанный `.archify.html` |
| `archify` | нет | `engine: mermaid`, `ok: false`, exit 1 | Workflow останавливается с подсказкой `oma diagram update` вместо тихого downgrade |
| `mermaid` | не проверяется | `engine: mermaid`, `ok: true` | Только Mermaid; archify никогда не вызывается |

`oma diagram resolve --engine <auto|archify|mermaid>` переопределяет config для одного вызова, а prompt может сделать то же для одного запуска (`/explain 640 with archify`).

---

## CLI {#cli}

```bash
oma diagram resolve [--engine auto|archify|mermaid] [--json]
oma diagram update  [--json]
oma diagram archify <archify args…>
```

`oma diagram update` принудительно обновляет копию и завершается с code 1, если не удаётся разрешить ни одну установку archify.

`oma diagram archify` запускает разрешённый исполняемый файл archify с `ARCHIFY_UPDATE_CHECK_DISABLED=1` (без сети) и передаёт exit code, поэтому `validate` / `deliver` / `visual-check` ведут себя ровно так, как описывает archify:

```bash
oma diagram archify guide "show the auth request lifecycle" --json
oma diagram archify validate architecture adr-auth.archify.json --quality showcase --json
oma diagram archify deliver  architecture adr-auth.archify.json adr-auth.archify.html --quality showcase --json
oma diagram archify visual-check adr-auth.archify.html --json   # exit 2 = no Chrome (skipped), or archify itself could not be resolved
```

`--json` у `resolve` возвращает `{ ok, requested, engine, quality, open, explainSidecar, archify?: { root, bin, version, source }, reason, probed, warnings }` — `source` равен `config:…`, `env:…` или label skill-dir, например `home:~/.agents/skills`; `warnings` перечисляет игнорируемые устаревшие keys. `--refresh` и `--offline` принимаются как устаревшие no-op.

---

## Использование в workflow {#how-the-workflows-use-it}

Общий protocol находится в `.agents/skills/_shared/conditional/diagram-engine.md`. `/architecture` выполняет такую последовательность:

1. `oma diagram resolve --json`.
2. Сначала всегда напишите Mermaid block.
3. При `engine: archify`: переведите Mermaid topology в archify JSON IR (`architecture` / `sequence` / `dataflow` / `lifecycle` / `workflow`), читая из installation только соответствующую schema и один example.
4. `validate` → repair → `deliver` с ограничениями: остановка, когда spec проходит проверку, когда срабатывает convergence rule archify, после 3 попыток repair, после 10 минут в сумме или когда повторяется тот же diagnostic. Semantic labels никогда не удаляются только ради прохождения.
5. Свяжите HTML — никогда не встраивайте его.

```mermaid
flowchart TD
  resolve["oma diagram resolve --json"] -->|"ok: false"| stop["Stop: run oma diagram update once online"]
  resolve -->|"ok: true"| author["Author the Mermaid block"]
  author --> engine{"engine?"}
  engine -->|mermaid| mermaidOnly["Deliver the Mermaid block"]
  engine -->|archify| spec["Translate the topology into .archify.json"]
  spec --> loop["validate and repair (bounded)"]
  loop -->|passes| deliver["deliver .archify.html"]
  loop -->|"bound or convergence reached"| keep["Keep Mermaid, leave .archify.json, report diagnostics"]
  deliver --> link["Link the HTML from the Markdown"]
```

### `/architecture` {#architecture}

Только для structural decisions (boundaries, dependencies, data flow). Output рядом с Markdown artifact в `.agents/results/architecture/`:

```text
adr-notification-service.md            # Mermaid block + "Interactive:" link
adr-notification-service.archify.json  # frozen spec (kept even on failure)
adr-notification-service.archify.html  # delivered viewer
```

### `/explain` {#explain}

Opt-in, поскольку собственный contract explainer (один self-contained file, theming через CSS variables) не позволяет встроить второй полный HTML document. Включите через `diagram.explain_sidecar: true`, передайте `oma explain render --archify` или попросите в prompt («with archify»). Здесь нет ни Mermaid block, ни написанного вручную JSON: renderer выводит spec archify из блока `flow` или `sequence` черновика (панели с пометкой `{archify}`), выполняет `deliver` (один раз откатываясь с качества `showcase` на `standard`) и подключает `{date}-{slug}.archify.html` обычным `<a href>`. Команда сообщает `linked`, `skipped` (с причиной) или `failed` (первый diagnostic). Workflow не зацикливается на неудачном sidecar, и ошибка sidecar никогда не блокирует explainer.

---

## Stack-постеры (stack-diagram) {#stack-posters-stack-diagram}

Когда диаграмма — это tech-stack или топология инфраструктуры, узлы которой являются продуктами вендоров (AWS, Vercel, Postgres, …), и вы просите логотипы, `/architecture` выбирает **stack route** вместо archify. Он запускает upstream agent skill [Caru-ini/stack-diagram](https://github.com/Caru-ini/stack-diagram) (MIT; Python 3.9+, доступ к сети для логотипов) так же, как `oma-slide` запускает ppt-master: нет ни команды oma, ни config key. Таблица route находится в `.agents/skills/_shared/conditional/diagram-engine.md`.

- Разрешение: сначала runtime skill catalog, иначе `bunx skills use caru-ini/stack-diagram@stack-diagram`. Если разрешить не удаётся, workflow откатывается к описанному выше решению archify ↔ Mermaid и сообщает об этом.
- Output: `<artifact-stem>.stack.html` рядом с Markdown-артефактом, связанный в разделе Diagram как `Stack: …`. Mermaid block остаётся SSOT.
- Только HTML. PNG export и screenshot check из upstream требуют Playwright + Chromium; oma никогда их не устанавливает и не запускает.
- Загрузка в upstream gallery (`share.py`) пропускается, если вы явно не попросите опубликовать.
- Ограничения: 2 попытки build, 5 минут в сумме; критерий приёмки — чистый запуск `build.py`.
- `/explain` никогда не использует этот route; его sidecar выводится в коде из черновика.

Напишите «archify» в prompt, чтобы принудительно выбрать структурный route, или «stack-diagram» / «with logos», чтобы принудительно выбрать stack route.

---

## Режимы ошибок {#failure-modes}

Неразрешимый archify описан в [таблице выбора engine](#which-engine-runs). Остальные случаи:

| Ситуация | Результат |
|---|---|
| `oma diagram update` завершается ошибкой (offline, нет `bunx`) | Показывается ошибка skills CLI; существующая установка продолжает работать |
| `validate` никогда не достигает convergence | Mermaid остаётся доставленной diagram; последний `.archify.json` оставляется человеку, diagnostics сообщаются verbatim |
| Нет Chrome для `visual-check` | Сообщается как `skipped`, никогда как pass |
| `oma diagram archify …` завершается с exit 2 | Либо отсутствует Chrome (`visual-check`), либо archify не удалось разрешить; сначала проверьте `oma diagram resolve --json` |

---

## Дальнейшие шаги {#next-steps}

- [Объяснение кода](./code-explainer.md) — workflow `/explain` и его необязательный sidecar archify
- [`/architecture` workflow](../core-concepts/workflows.md#architecture) — ADR и review, содержащие Mermaid block
- [Семантика oma-config.yaml](./oma-config-semantics.md) — как объединяется раздел `diagram:`
- [CLI-команды: diagram](../cli-interfaces/commands.md#diagram) — полный список опций
- [Исследование рынка](./market-research.md) — тот же шаблон установки через skills CLI для engine last30days
- archify upstream: [tt-a1i/archify](https://github.com/tt-a1i/archify)
- stack-diagram upstream: [Caru-ini/stack-diagram](https://github.com/Caru-ini/stack-diagram)
