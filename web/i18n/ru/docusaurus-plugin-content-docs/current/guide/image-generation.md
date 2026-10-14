---
title: "Руководство: генерация изображений"
sidebar_label: Генерация изображений
description: "Полное руководство по генерации изображений в oh-my-agent: мультивендорная диспетчеризация через Codex (gpt-image-2), Pollinations (flux/zimage, бесплатно) и Antigravity через Gemini Code Assist, эталонные изображения, защита от перерасхода, структура вывода, устранение неполадок и общие паттерны вызова."
---

# Генерация изображений

`oma-image` — это мультивендорный маршрутизатор изображений для oh-my-agent. Он генерирует изображения из промптов на естественном языке, отправляет их в CLI того вендора, в котором вы аутентифицированы, и записывает рядом с результатом manifest с входными данными и решениями провайдера, необходимыми для аудита или повторения запуска. Результат работающего провайдера всё равно может отличаться.

Навык активируется по фразам вроде «generate an image», «create an image», «make a picture», «draw me …» или «image of …», по имени вендора (`gpt-image`, `nano-banana`, `pollinations`) либо когда другому навыку требуется изображение как побочный результат (hero-кадр, миниатюра, продуктовое фото).

> **TL;DR** Нужно одно из трёх: `POLLINATIONS_API_KEY` (бесплатные `flux` / `zimage`), `codex login` (gpt-image-2 по вашему тарифу ChatGPT) или `agy` с выполненным входом. Запустите `oma image doctor`, затем `oma image generate "<prompt>" --vendor pollinations`. Изображения и `manifest.json` сохраняются в `.agents/results/images/{timestamp}-{shortid}/`.

---

## Когда использовать

- Генерация изображений, иллюстраций, продуктовых фото, концепт-арта, hero- и landing-визуалов
- Сравнение одного промпта на нескольких моделях бок о бок (`--vendor all`)
- Создание ассетов в любом runtime, который загружает навыки oma (Claude Code, Codex CLI, Antigravity, Cursor и другие)
- Вызов другим навыком (дизайн, маркетинг, документация) image-конвейера как общей инфраструктуры

## Когда НЕ использовать

- Редактирование или ретушь существующего изображения (вне зоны ответственности; используйте отдельный инструмент)
- Генерация видео или аудио (вне зоны ответственности)
- Inline SVG или векторная композиция из структурированных данных (используйте навык шаблонизации)
- Простое изменение размера или конвертация формата (используйте библиотеку для работы с изображениями, а не конвейер генерации)

---

## Краткий обзор вендоров

Навык построен по принципу CLI-first: если нативный CLI вендора может вернуть необработанные байты изображения, путь через подпроцесс предпочтительнее прямого API-ключа.

| Вендор | Стратегия | Модели | Триггер | Стоимость |
|---|---|---|---|---|
| `pollinations` | Прямой HTTP | Бесплатные: `flux`, `zimage`. По кредитам: `qwen-image`, `wan-image`, `gpt-image-2`, `klein`, `kontext`, `gptimage`, `gptimage-large` | Задана `POLLINATIONS_API_KEY` (бесплатная регистрация на [enter.pollinations.ai](https://enter.pollinations.ai)) | Бесплатно для `flux` / `zimage` |
| `codex` | CLI-first через `codex exec` (ChatGPT OAuth) | `gpt-image-2` | `codex login` (API-ключ не нужен) | Списывается с тарифа ChatGPT |
| `antigravity` | CLI `agy` через подписку Gemini Code Assist | Модель выбирается самим `agy` | `agy` установлен и выполнен вход | За изображение отдельно не взимается плата через Code Assist |

Как `--vendor` выбирает вендоров для запуска:

| `--vendor` | Какие вендоры запускаются | Каталог вывода | Exit 5, когда |
|---|---|---|---|
| `auto` (по умолчанию) | каждый вендор, прошедший health check | `{timestamp}-{shortid}-compare/`, если запущено два и более | ни один вендор не исправен |
| `all` | каждый включённый вендор | `{timestamp}-{shortid}-compare/`, если запущено два и более | любой запрошенный вендор неисправен |
| `codex`, `pollinations` или `antigravity` | этот вендор | `{timestamp}-{shortid}/` | этот вендор неисправен |

Встроенный режим вендора — `auto`: он параллельно запускает **каждый** провайдер, прошедший health check. Передайте `--vendor pollinations`, чтобы остаться на бесплатном пути. Модели Pollinations `flux` и `zimage` бесплатны за изображение, но всё равно требуют `POLLINATIONS_API_KEY`; Codex и Antigravity требуют собственного входа. Для платных оценок по-прежнему действует защита подтверждением стоимости.

---

## Быстрый старт

Перед первой генерацией проверьте, какой провайдер готов, и выполните вход одним из поддерживаемых способов:

```bash
oma image doctor

# Pollinations: create a free account and export its key.
export POLLINATIONS_API_KEY="<pollinations-key>"

# Or authenticate an alternative provider instead.
codex login
# Sign in to Gemini Code Assist for `agy` when using --vendor antigravity.
```

```bash
# Runs every vendor whose health check passes; cost and auth depend on those vendors.
oma image generate "minimalist sunrise over mountains"

# Stay on the free Pollinations path.
oma image generate "minimalist sunrise over mountains" --vendor pollinations

# Run all configured vendors; every selected vendor must be healthy or the command stops.
oma image generate "cat astronaut" --vendor all

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# List registered vendors and their default model (supported models: oma image doctor)
oma image vendor list
```

Успешный запуск в текстовом режиме выводит примерно такой прогресс (пути приведены для иллюстрации):

```text
[oma image] using: pollinations
[oma image] pollinations generating... 5s
[oma image] pollinations ok (7.4s) -> /path/to/project/.agents/results/images/20261014-101500-ab12cd/pollinations-flux-ab12cd.jpg
[oma image] manifest: /path/to/project/.agents/results/images/20261014-101500-ab12cd/manifest.json
```

---

## Использование как навык

`oma-image` — навык, который автоматически активируется из естественного языка и может вызываться явно. Доступны три точки входа.

### 1. Естественный язык (автоактивация)

В любом runtime, который загружает навыки oma (Claude Code, Codex CLI, Antigravity, Cursor и другие), просто опишите изображение. Навык активируют фразы вроде «generate an image», «make a picture», «draw me …» или «image of …»; runtime, сопоставляющие навыки по описанию, могут подхватить его и для запросов вроде «concept art» или «hero shot».

Запоминать CLI-флаги не нужно. Опишите запрос обычными словами, и навык сопоставит его с нужными параметрами:

| Вы говорите | Навык выводит |
|---|---|
| "use codex" / "with gpt-image-2" / "free flux" | `--vendor codex` / `--vendor pollinations` |
| "compare across vendors" / "side by side" | `--vendor all` |
| "portrait" / "landscape" / "1024×1536" | `--size 1024x1536` / `--size 1536x1024` |
| "high quality" / "draft" | `--quality high` / `--quality low` |
| "three variations" / "give me 3" | `-n 3` |
| "save to ./hero" / "output to docs/assets" | `--output-dir <dir>` |
| Attached image + "make it nighttime" | `-r <attached path>` |
| "just estimate the cost" / "dry run" | `--dry-run` |

Примеры:

> "Generate a minimalist sunrise over mountains for the landing hero, landscape, high quality."
> "Compare a ceramic mug product photo across all vendors, three variations each."
> "Use codex to make this otter photo dramatic and nighttime." (с прикреплённым эталоном)

Агент [разбирает бриф](#clarification-protocol), заполняет пробелы значениями по умолчанию и вызывает `oma image generate` с выведенными флагами. Используйте slash-команду, если нужен явный контроль над точными значениями флагов.

### 2. Явная slash-команда

```text
/oma-image a red apple on white background
/oma-image --vendor all --size 1536x1024 jeju coastline at sunset
/oma-image -n 3 --quality high --output-dir ./hero "minimalist dashboard hero illustration"
```

Каждый CLI-флаг (`--vendor`, `-n`, `--size`, `-r`, `--dry-run`, …) работает в slash-команде и передаётся в тот же конвейер `oma image generate`.

### 3. Из другого навыка (общая инфраструктура)

Другие навыки (дизайн, маркетинг, документация) вызывают конвейер как общую инфраструктуру с JSON-выводом:

```bash
oma image generate "<prompt>" --output json
```

С `--output json` stdout содержит один JSON-объект `{exitCode, manifestPath, runs}`; каждая запись в `runs` сообщает вендора, статус и файлы вывода. Полную запись читайте по `manifestPath`. `--dry-run` печатает перед планом текстовый заголовок `[oma image] dry-run plan:`, поэтому при разборе пропускайте эту строку.

---

## Справочник CLI

```bash
oma image generate "<prompt>"
  [--vendor auto|codex|pollinations|antigravity|all]
  [-n 1..5]
  [--size WxH|auto]
  [--quality low|medium|high|auto]
  [--output-dir <dir>] [--allow-external-output]
  [-r <path>]...
  [--timeout <duration>] [-y] [--no-prompt-in-manifest]
  [--dry-run] [--output text|json]

oma image doctor
oma image vendor list
```

### Ключевые флаги

| Флаг | Назначение |
|---|---|
| `--vendor <name>` | `auto`, `pollinations`, `codex`, `antigravity` или `all`. В режиме `all` каждый запрошенный вендор должен быть исправен (строгий режим). |
| `-n, --count <n>` | Количество изображений на вендора: 1–5 (ограничение wall-time). По умолчанию 1. |
| `--size <size>` | `WxH`, где каждая сторона кратна 16 и лежит в диапазоне от 16 до 3840, а соотношение сторон — от 1:3 до 3:1 (например, `512x512`, `1024x1024`, `1024x1536`, `1536x1024`), или `auto`. По умолчанию `1024x1024`. |
| `--quality <level>` | `low`, `medium`, `high` или `auto` (по умолчанию). |
| `--output-dir <dir>` | Каталог вывода; файлы записываются прямо в него. По умолчанию `.agents/results/images/{timestamp}-{shortid}/`. Для путей за пределами `$PWD` требуется `--allow-external-output`. |
| `--allow-external-output` | Разрешает каталог вывода за пределами `$PWD`. |
| `--model <name>` | Переопределяет модель для **каждого** вендора в запуске, поэтому сочетайте его с одним `--vendor` (например, `--vendor pollinations --model zimage`). `antigravity` игнорирует этот параметр, поскольку модель выбирает `agy`. |
| `-r, --reference <path>` | До 10 эталонных изображений (PNG/JPEG/GIF/WebP, ≤ 5 МБ каждое). Можно повторять флаг или передать пути через запятую. Поддерживается в `codex` и `antigravity`, отклоняется в `pollinations`. |
| `-y, --yes` | Пропускает подтверждение стоимости для запусков с оценкой ≥ `$0.20`. Также доступно через `OMA_IMAGE_YES=1`. |
| `--no-prompt-in-manifest` | Записывает в `manifest.json` SHA-256 промпта вместо исходного текста. |
| `--dry-run` | Печатает план и оценку стоимости без расходов. |
| `--output text\|json` | Формат вывода CLI. JSON — точка интеграции для других навыков. |
| `--timeout <duration>` | Тайм-аут для каждого изображения. По умолчанию 180 секунд. |

---

## Эталонные изображения

Прикрепите до 10 эталонных изображений, чтобы задать стиль, идентичность объекта или композицию.

```bash
oma image generate -r ~/Downloads/otter.jpeg "same otter in dramatic lighting" --vendor codex
oma image generate -r a.png -r b.png "blend these styles" --vendor antigravity
oma image generate -r a.png,b.png "blend these styles" --vendor antigravity
```

| Вендор | Поддержка эталонов | Как это работает |
|---|---|---|
| `codex` (gpt-image-2) | Да | Передаёт `-i <path>` в `codex exec` |
| `antigravity` | Да | Копирует эталоны в каталог отдельного запуска и даёт `agy` доступ к ним |
| `pollinations` | Нет | Отклоняет запрос с кодом выхода 4 (нужен хостинг по URL) |

### Где находятся прикреплённые изображения

- **Claude Code**: `~/.claude/image-cache/<session>/N.png`, отображаются в системных сообщениях как `[Image: source: <path>]`. Они привязаны к сессии; если изображение понадобится снова, скопируйте его в постоянное место.
- **Antigravity**: каталог загрузок workspace (точный путь показывает IDE)
- **Codex CLI как хост**: путь нужно передать явно; вложения из диалога не перенаправляются автоматически

Когда пользователь прикрепляет изображение и просит сгенерировать или отредактировать результат на его основе, вызывающий агент **обязан** передать его через `--reference <path>`, а не описывать изображение словами. Если локальный CLI слишком старый и не поддерживает `--reference`, выполните `oma update` и повторите попытку.

---

## Структура вывода

По умолчанию каждый запуск записывается в каталог с временной меткой и hash-суффиксом внутри `.agents/results/images/`; с `--output-dir` файлы записываются прямо в указанный каталог:

```text
.agents/results/images/
├── 20260424-143052-ab12cd/                 # one vendor ran
│   ├── pollinations-flux-ab12cd.jpg        # -1, -2, ... suffixes when -n > 1
│   └── manifest.json
└── 20260424-143122-7z9kqw-compare/         # two or more vendors ran
    ├── codex-gpt-image-2-7z9kqw.png
    ├── pollinations-flux-7z9kqw.jpg
    ├── antigravity-7z9kqw.jpg              # no model segment: agy picks the model
    └── manifest.json
```

`manifest.json` сохраняет вендора, модель, промпт (или его SHA-256), размер, качество и стоимость, поэтому запрос можно проверить и повторить. Он не гарантирует одинаковые пиксели при работе с живым провайдером.

---

## Стоимость, безопасность и отмена

1. **Защита от расходов:** для запусков с оценкой ≥ `$0.20` запрашивается подтверждение; без интерактивного терминала запуск завершается с кодом 1 и сообщением, в котором упоминается `--yes`. Обойти его можно через `-y` или `OMA_IMAGE_YES=1`. Гарантированно бесплатен только `--vendor pollinations` с `flux` / `zimage`; `auto` может также задействовать Codex, если в нём выполнен вход.
2. **Безопасность путей:** для путей за пределами `$PWD` требуется `--allow-external-output`, чтобы избежать неожиданных записей.
3. **Отмена:** `Ctrl+C` (SIGINT/SIGTERM) прерывает все текущие вызовы провайдеров и оркестратор.
4. **Стабильная запись запуска:** `manifest.json` всегда записывается рядом с изображениями.
5. **Максимум `n` = 5:** это ограничение времени выполнения, а не квоты.
6. **Коды выхода:** соответствуют `oma search fetch`: `0` — ok, `1` — general, `2` — safety, `3` — not-found, `4` — invalid-input, `5` — auth-required, `6` — timeout.

---

## Как агент разбирает бриф {#clarification-protocol}

Агент использует то, что вы сказали, и заполняет пробелы разумными творческими значениями по умолчанию для окружения, стиля, освещения и соотношения сторон. Вопрос он задаёт, только если недостающий выбор существенно изменит результат, и не останавливается ради подтверждения расширенного промпта, если вы уже попросили сгенерировать изображение. Явные формулировки, текст на изображении и назначение эталонов сохраняются как есть.

| Вы говорите | Что происходит |
|---|---|
| "a red apple" | Изображение генерируется сразу; агент сам задаёт окружение, стиль, освещение и размер |
| "a red apple as a flat vector icon, 512x512" | Ваши стиль и размер используются как есть |
| "something for the homepage" | Один вопрос о субъекте, потому что от него зависит результат |

Чтобы увидеть, что именно было отправлено провайдеру, проверьте поле `prompt` в `manifest.json` (с `--no-prompt-in-manifest` там хранится SHA-256).

---

## Конфигурация

- **Конфигурация проекта:** секция `image:` в `.agents/oma-config.yaml`. Устаревший `config/image-config.yaml` больше не читается.
- **Переменные окружения:**
  - `OMA_IMAGE_DEFAULT_VENDOR`: переопределяет настроенного вендора по умолчанию (`auto`). Сам флаг `--vendor` по умолчанию равен `auto`, поэтому, если нужен конкретный вендор, передавайте `--vendor` в каждой команде.
  - `OMA_IMAGE_DEFAULT_OUT`: переопределяет каталог вывода по умолчанию
  - `OMA_IMAGE_YES`: `1`, чтобы обходить подтверждение стоимости
  - `POLLINATIONS_API_KEY`: требуется для вендора pollinations (бесплатная регистрация)

---

## Устранение неполадок

| Симптом | Вероятная причина | Решение |
|---|---|---|
| Код выхода `5` (auth-required) | Выбранный вендор не аутентифицирован | Запустите `oma image doctor`, чтобы узнать, какому вендору нужен вход. Затем выполните `codex login`, войдите в `agy` или задайте `POLLINATIONS_API_KEY`. |
| Код выхода `4` для `--reference` | `pollinations` отклоняет эталоны либо файл слишком большой или имеет неверный формат | Переключитесь на `--vendor codex` или `--vendor antigravity`. Каждый эталон должен быть размером ≤ 5 МБ и иметь формат PNG/JPEG/GIF/WebP. |
| `--reference` не распознаётся | Локальный CLI устарел | Выполните `oma update` и повторите попытку. Не заменяйте эталон словесным описанием. |
| Подтверждение стоимости блокирует автоматизацию | Оценка запуска составляет ≥ `$0.20` | Передайте `-y` или установите `OMA_IMAGE_YES=1`. Лучше переключиться на бесплатный `pollinations`. |
| `--vendor all` сразу прерывается | Один из запрошенных вендоров неисправен (строгий режим) | Установите и авторизуйте отсутствующего вендора либо выберите конкретный `--vendor`. |
| Результат записан в неожиданный каталог | По умолчанию используется `.agents/results/images/{timestamp}-{shortid}/` | Передайте `--output-dir <dir>`. Для путей за пределами `$PWD` нужен `--allow-external-output`. |
| `--out path "…" is outside $PWD. Use --allow-external-out to override.` (exit 1) | `--output-dir` указывает за пределы проекта | Повторите запуск с `--allow-external-output` (в сообщении по-прежнему старое имя флага) или выберите каталог внутри проекта. |
| Запустились несколько вендоров, и имя каталога заканчивается на `-compare` | `--vendor auto` запускает каждого исправного вендора | Передайте один `--vendor`, чтобы запустить одного вендора. |
| Antigravity не работает после успешной health check | `agy --version` доказывает установку, но не вход в аккаунт | Войдите в Gemini Code Assist, затем повторите `oma image doctor` и запуск с `--vendor antigravity`. |

---

## Дальнейшие шаги

- [Генерация видео](./video-generation.md): `oma-video` использует `oma-image` как визуального провайдера
- [Workflow контента и исследований](./content-and-research.md): другие возможности для контента и их предварительные условия
- [Навыки](../core-concepts/skills.md): двухуровневая архитектура навыков, на которой работает `oma-image`
- [Команды CLI: image](../cli-interfaces/commands.md#image): полная справка по команде `oma image`
- [Опции CLI](../cli-interfaces/options.md): общая матрица опций
