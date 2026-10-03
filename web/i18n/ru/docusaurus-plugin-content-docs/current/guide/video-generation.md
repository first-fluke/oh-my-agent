---
title: "Руководство: генерация видео"
sidebar_label: Генерация видео
description: Полное руководство по генерации видео в oh-my-agent — маршрутизатор с необязательными ключами и тремя уровнями, который собирает script, narration, visuals, captions и managed HyperFrames compositor в воспроизводимые каталоги run для режимов shorts, explainer и demo.
---

# Генерация видео

`oma-video` — видеомаршрутизатор oh-my-agent. По brief из одной строки он собирает script, narration, visuals и captions, затем записывает план в run directory. Этапы провайдеров не требуют key и могут использовать local или deterministic fallback; настоящий MP4 всё равно требует работающий compositor и корректную composition.

Skill автоматически активируется по словам *video*, *shorts*, *reels*, *explainer*, *demo*, *walkthrough*, *screencast* или когда другому skill нужно видео как side effect.

---

## Когда использовать

- Превратить brief, README, code или data в короткий clip.
- Создать narrated explainer или запись demo/walkthrough.
- Повторяемый pipeline «brief → `.mp4`», который нужно запускать детерминированно.

## Когда НЕ использовать

- Один still image → используйте [`oma-image`](/docs/guide/image-generation).
- Live screen broadcast / streaming → вне scope (capture supervised, но не streamed).
- Отдельный narration audio → используйте `oma-voice`.

---

## Режимы в одном взгляде

| Режим | Соотношение сторон | Что он собирает |
|------|--------|------------------|
| `shorts` | 9:16 | Вертикальный short-form clip (script → narration → visuals → captions). |
| `explainer` | 16:9 | Горизонтальный explainer из README, code или data brief. |
| `demo` | derived | Walkthrough из human recording, переданной с `--capture`; `--source web --url` задаёт context для supervised headed capture и никогда не автоматизирует login. |

Режим выбирает разумные значения по умолчанию; нужные flags задайте, когда требуются другие.

---

## Быстрый старт

```bash
# Key-optional short — script, captions, and a local render when the toolchain is ready
oma video generate "three quick tips for better focus" --mode shorts -y

# 16:9 explainer in Korean
oma video generate "what oh-my-agent does" --mode explainer --aspect 16:9 --locale ko -y

# Demo from a human recording (you control login and capture)
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --polish
```

Каждый run печатает свой run directory. Фиксированный `--seed` стабилизирует входные данные детерминированного планирования; live provider output и capture footage всё ещё могут различаться. Повторно отрендерите существующий run directory, если нужно использовать сохранённые render spec и assets.

Другие инструменты, вызывающие `oma video generate --output json`, разбирают JSON envelope из stdout: `{exitCode, runDir, manifestPath, scriptPath, renderSpecPath, warnings, error}`. Ключа `outputs` нет — пути output/asset нужно читать из manifest по `manifestPath`.

---

## Справочник CLI

```
oma video generate <brief...> [options]
oma video doctor [--install|--upgrade|--install-mpt|--install-strudel]  # toolchain readiness / provisioning
oma video compose <runDir>       # prepare HTML project and authoring contract
oma video render <runDir>        # re-render from render-spec.json (deterministic)
oma video provider list         # provider availability + key/fallback status
```

### Основные флаги

| Флаг | Назначение |
|------|---------|
| `--mode <m>` | `shorts` \| `explainer` \| `demo`. |
| `--aspect <a>` | `9:16` \| `16:9` \| `1:1` \| `auto`. |
| `--locale <lang>` | Языковой tag narration/caption. |
| `--captions <s>` | `tiktok` \| `lower-third` \| `none` (alignment без key). |
| `--visual <m>` | `auto` \| `generate` \| `stock` \| `aigc` \| `slide`. |
| `--voice <profile>` | Голос narration или `none` (default); если не задавать, видео будет без звука с оценочным timing captions. |
| `--music <mode>` | `upbeat`, `calm`, `cinematic`, `lofi`, `piano` или `none`. |
| `--compositor <c>` | `hyperframes` (default) \| `mpt`. |
| `--capture <path>` | Input recording path для demo mode (`--source file`). |
| `--source <k>` | Источник demo capture: `file` или `web` (default: `file`). |
| `--url <url>` | Target URL для `--source web` (local, staging или production); не заменяет `--capture`, когда запись обязательна. |
| `--device <name>` | Device frame для web capture; переопределяет aspect sizing. |
| `--ready-selector <css>` | CSS selector, которого нужно дождаться перед web capture. |
| `--show-cursor` | Наложить видимый cursor в web capture. |
| `--polish` | Наложить HyperFrames composition на captured footage. |
| `--capture-timeout <sec>` | Жёсткий предел для live web capture. |
| `--capture-stop <mode>` | Non-interactive stop для CI: `duration:<sec>` или `selector:<css>`. |
| `--output-dir <path>` | Базовый output directory. Пути вне `$PWD` требуют `--allow-external-output`. |
| `--allow-external-output` | Разрешить output paths вне `$PWD`. |
| `--max-usd <n>` | Максимальная оценочная стоимость до подтверждения. |
| `--duration <sec>` | Целевая длина или `auto`. |
| `--seed <n>` | Deterministic seed. |
| `--dry-run` | Вывести script / render-spec / manifest и пропустить render. |
| `--script <path>` | Созданный agent `script.json` для injection (заменяет skeleton; управляет narration, on-screen text и visual prompt каждой сцены). |
| `-y, --yes` | Пропустить cost-confirmation prompt. |
| `--output <f>` | Output CLI: `text` (default) или `json`. |
| `--no-brief-in-manifest` | Сохранить SHA-256 brief вместо исходного brief. |

---

## Провайдеры без обязательного key

Этапы провайдеров разрешаются через **real branch** и, если этап это поддерживает, через **deterministic fallback**. Поэтому отсутствующие key могут оставить запланированный run с estimated timing или local assets. Compositor — обязательный final stage и не имеет обычного placeholder fallback:

| Возможность | Реальная ветка | Запасной вариант |
|------------|-------------|----------|
| script | LLM при наличии key | deterministic outline из brief |
| voice | `oma-voice` (Voicebox, local) | estimated timing, без audio |
| visual | `oma-image` / `oma-slide` / stock | placeholder asset |
| caption | forced alignment без key | estimated word timing |
| capture | supervised browser web capture (`--source web`) или переданная запись (`--source file --capture`) | guided protocol «запишите сами» |
| compositor | HyperFrames (managed) или MoneyPrinterTurbo | compositor fallback отсутствует; run завершается с diagnostics |

Автоматизации учётных данных нет: человек сам выполняет любой on-screen login во время capture; URL и query token маскируются в log и manifest.

Captions рендерятся как **static windowed cues** — единственная строка caption, активная на текущем frame, с CSS wrapping и без per-word animation.

---

## Инструменты и `doctor`

Тяжёлая toolchain (managed HyperFrames project `node_modules`, встроенный шрифт Pretendard, checkout MoneyPrinterTurbo, capture browsers и Chrome Headless Shell) **подготавливается по запросу**, а не поставляется в package. Обычный `doctor` только сообщает состояние и ничего не устанавливает:

```bash
oma video doctor
```

Он сообщает о `node`, `chromium`, `ffmpeg`, `ffprobe`, `hyperframes-toolchain`, `hyperframes-skills`, `pretendard-font`, `mpt-project`, `voicebox`, `oma-image`, `pixelle` и `cap`, а для отсутствующих печатает подсказку установки. Базовый вариант требует Node.js 22+, toolchain HyperFrames и её браузер Chrome, FFmpeg/FFprobe и `oma-image`. Для настоящего MP4 также нужен authored HTML.

Для provision toolchain используйте install flags:

```bash
oma video doctor --install             # warm the latest HyperFrames toolchain + Chrome Headless Shell + Pretendard + heygen-com/hyperframes
oma video doctor --upgrade             # force a latest-version check now
oma video doctor --install-mpt         # MoneyPrinterTurbo checkout (clone + venv + deps) for --compositor mpt
```

`--install` также загружает встроенный Pretendard font (pinned release) в общий toolchain cache — это часть determinism boundary. При сетевой ошибке появляется warning и render переключается на system fonts; различия браузера и ОС всё равно могут влиять на закодированный output.

---

## Структура результата

```
.agents/results/videos/{timestamp}-{shortid}-{mode}/
├── script.json          # scenes + narration
├── render-spec.json     # the deterministic render contract
├── timing.json          # per-segment timing (voicebox-stt or estimated)
├── captions.srt / .vtt
├── audio/narration-*.wav
├── visuals/scene-*.{png,svg,…}
├── hyperframes/         # index.html, AUTHORING.md, local assets and toolchain link
├── {mode}-{slug}.mp4    # the rendered output (slug derived from the script title)
└── manifest.json        # providers, assets, cost, warnings
```

`render-spec.json` + assets — граница воспроизводимости; live capture записывается как `nondeterministic` в manifest.

---

## Устранение неполадок

| Симптом | Причина / исправление |
|---------|-------------|
| MP4 не создан | Compositor, composition или toolchain check завершился ошибкой. Запустите `oma video doctor`, затем `oma video compose <runDir>` и исправьте указанную composition перед повтором `oma video render <runDir>`. |
| Narration без звука (`source: estimated`) | Voicebox недоступен; запустите сервер `oma-voice` или примите estimated timing. |
| `--source web` печатает guided protocol вместо записи | Нет TTY или недоступен browser capture runtime → guided fallback. Используйте интерактивный терминал с подготовленным capture runtime и `--capture-stop` или передайте записанный файл с `--capture`. |
| Первый render медленный | Browser HyperFrames / checkout MPT подготавливаются один раз; следующие run используют cache. |

---

## Всегда последняя HyperFrames — composition создаёте вы

oh-my-agent **не поставляет код HyperFrames composition**. Каждый run получает собственный project в `<runDir>/hyperframes/`, созданный `oma video compose` на последней npm HyperFrames (toolchain cache `~/.cache/oma-video/hyperframes/<version>/`, общий через symlink `node_modules`) с [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) на HEAD (`~/.cache/oma-video/hyperframes-skills/`). Agent создаёт исходник composition по `AUTHORING.md` scaffold, skills и mode spec из `.agents/skills/oma-video/resources/hyperframes-authoring/`.

```bash
oma video generate "…"                     # → render-spec.json + <runDir>/hyperframes/ (composition pending)
oma video compose <runDir> --output json   # refresh scaffold / print the contract (idempotent)
#   author hyperframes/index.html as instructed by AUTHORING.md
oma video render <runDir> --output json    # lint → npx hyperframes render → ffprobe; exit 1 on any failure
```

- Проверки последней версии (npm + GitHub) ограничены `video.hyperframes.check_interval_min` (default 60; `0` = каждый compose). `oma update` учитывает этот интервал; `oma video doctor --upgrade` принудительно запускает проверку; offline run использует cached toolchain и сообщает `stale`.
- Воспроизводимость живёт в run dir: `render-spec.json`, authored composition source и версия toolchain в generated HyperFrames package metadata. Повторный render того же run использует этот render contract; новый run проверяет последнюю HyperFrames.
- Ошибка lint или render **не** скрывается placeholder (он существует только для `OMA_VIDEO_MOCK=1`): `oma video render` завершается с code 1 и diagnostics, а agent исправляет composition с помощью latest skills. Поломка на новом release HyperFrames — ошибка composition, а не причина закреплять версию.

```yaml
video:
  hyperframes:
    check_interval_min: 60    # 0 = check on every compose
```

## Связанные материалы

- [`/video` workflow](/docs/core-concepts/workflows) — pipeline brief → script → assets → render-spec → HyperFrames.
- [Генерация изображений](/docs/guide/image-generation) — still-image router, повторно используемый video visual provider.
