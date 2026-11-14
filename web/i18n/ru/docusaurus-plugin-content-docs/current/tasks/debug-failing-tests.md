---
title: Отладить падающий тест
description: Воспроизведите падение теста, изолируйте причину, внесите ограниченное исправление и проверьте регрессию существующим test runner проекта.
---

# Отладить падающий тест

Используйте `oma-debug`, когда есть падающая команда, stack trace или повторяемый неверный результат.

## Загрузите навык

Попросите coding agent выполнить эту команду и прочитать её инструкции и каталог поддержки:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Подготовьте входные данные

- Точную падающую команду и полный относящийся к делу вывод ошибки.
- Ожидаемое поведение, checkout/ref, версию runtime и необходимые локальные сервисы.
- Файлы или недавнее изменение, которое вы подозреваете, плюс разрешённую область правок.

## Дайте задачу

Этот конкретный пример использует регрессионные fixture bootstrap плагина из этого репозитория. Для другого проекта используйте свою падающую команду.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Проверьте результат

Ожидайте воспроизведённое падение, его причинную цепочку, ограниченный патч и регрессионный тест, привязанный к этому падению. Отчёт должен отделять недоступное окружение от диагностированного дефекта кода.

Проверьте, что регрессия падает на исходном поведении и проходит с исправлением. Повторно выполните указанную команду в том же окружении, затем просмотрите результаты связанных тестов. Если воспроизведение остаётся заблокированным, ожидайте точный блокер и более слабые доступные доказательства.

## Зависимости и следующий шаг

Агент использует test runner проекта и настроенные инструменты навигации по исходникам. Пример требует уже установленные Bun и зависимости разработки репозитория. Эти fixture плагина пропускаются в Windows; используйте падающий тест, который поддерживает ваша платформа. Загрузка навыка не устанавливает зависимости и не чинит отсутствующий сервис.

Фактическое изменение исходников и границы fixture описаны в [примере починки plugin-hook](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/). Для управляемого выполнения или хуков проекта [выберите настройку runtime](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset), которая включает `oma-debug`.
