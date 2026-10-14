---
title: "Руководство: выполнение одного навыка"
sidebar_label: Один навык
description: "Подробное руководство по задачам в одном домене в oh-my-agent: когда использовать одиночный навык, предполётный чек-лист, шаблон промпта с пояснением, реальные примеры для фронтенда, бэкенда, мобильных приложений и баз данных, ожидаемый поток выполнения, чек-лист шлюза качества и сигналы эскалации."
---

# Выполнение одного навыка

Одиночный навык — быстрый путь: один агент, один домен, одна сфокусированная задача. Здесь нет накладных расходов на оркестрацию и координацию нескольких агентов. Хост или выбранный workflow может направить промпт на естественном языке к навыку; сама hook-система обнаруживает workflow, а правила маршрутизации зависят от выбранного runtime.

## Быстрый путь

1. Один раз запустите `oma doctor`, чтобы проверить интеграцию с выбранным хостом. Предупреждения о необязательных провайдерах не блокируют задачу, которая ими не пользуется.
2. Опишите одно самодостаточное изменение с ясными условиями **Goal**, **Context**, **Constraints** и **Done When**.
3. Выбранный навык должен проверить репозиторий, обозначить область работы, если активный execution contract требует `CHARTER_CHECK`, и сообщить, какие проверки действительно были запущены.
4. Если задача выходит за границы API, UI, базы данных или мобильного приложения, остановите запуск одиночного навыка и переключитесь на `/work` или `/orchestrate`.

Для зависших управляемых запусков используйте `oma agent status <session-id> [agent-id]`, затем перед повторной попыткой проверьте receipts в `.agents/state/agent-runs/` и переданный путь claim. Подробности о поведении провайдеров и восстановлении см. в [важных значениях по умолчанию](../getting-started/important-defaults.md).

---

## Когда использовать одиночный навык

Используйте этот вариант, если задача соответствует ВСЕМ критериям:

- **Принадлежит одному домену**: целиком относится к фронтенду, бэкенду, мобильному приложению, базе данных, дизайну, инфраструктуре или другому одному домену
- **Самодостаточна**: не требует изменений кросс-доменных API-контрактов и изменений бэкенда для задачи фронтенда
- **Имеет ясный объём**: вы понимаете, каким должен быть результат — компонент, эндпоинт, схема или исправление
- **Не требует координации**: другим агентам не нужно работать до или после этого агента

**Примеры задач для одного навыка:**
- Создать один UI-компонент
- Добавить один API-эндпоинт
- Исправить одну ошибку в одном слое
- Спроектировать одну таблицу базы данных
- Написать один Terraform-модуль
- Перевести один набор i18n-строк
- Создать одну секцию дизайн-системы

**Переключитесь на мультиагентный режим** (`/work` или `/orchestrate`), когда:
- UI-работа требует нового API-контракта (фронтенд + бэкенд)
- одно исправление каскадирует через несколько слоёв (агенты отладки и реализации)
- функция охватывает фронтенд, бэкенд и базу данных
- после первой итерации объём выходит за пределы одного домена

Тесты и критерии приёмки нужны и для работы с одним навыком; сами по себе они не требуют `/ralph`. Для координации нескольких доменов или явно запрошенного процесса проверки качества см. [руководство по выбору навыка и workflow](/docs/core-concepts/workflows#choosing-a-skill-or-workflow).

---

## Предполётный чек-лист

Перед составлением промпта ответьте на четыре вопроса:

| Элемент | Вопрос | Почему это важно |
|---------|--------|----------------|
| **Goal** | Какой конкретный артефакт нужно создать или изменить? | Устраняет двусмысленность, например различие между «добавить кнопку» и «добавить форму с валидацией» |
| **Context** | Какой стек, фреймворк и соглашения применяются? | Агент определит их по файлам проекта, но явное описание лучше |
| **Constraints** | Какие правила нужно соблюдать? (стиль, безопасность, производительность, совместимость) | Без ограничений агент использует значения по умолчанию, которые могут не соответствовать проекту |
| **Done When** | Какие критерии приёмки вы проверите? | Даёт агенту цель, а вам — чек-лист проверки |

Если в промпте отсутствует какой-либо элемент, агент:
- **При низкой неопределённости (LOW):** применит значения по умолчанию и перечислит допущения
- **При средней неопределённости (MEDIUM):** предложит 2–3 варианта и продолжит с наиболее вероятным
- **При высокой неопределённости (HIGH):** остановится и задаст вопросы (код писать не будет)

---

## Шаблон промпта

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Разбор шаблона

| Часть | Назначение | Пример |
|------|------------|--------|
| `Build <specific artifact>` | Цель (что создать) | "Build a user registration form component" |
| `using <stack/framework>` | Контекст (технологический стек) | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Правила, которым должен следовать агент | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Done When (проверяемые результаты) | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Требования к тестам | "valid/invalid submit paths, edge cases for email validation" |

---

## Реальные примеры

### Фронтенд: форма входа

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**Ожидаемый поток выполнения:**

1. **Маршрутизация навыка:** хост или workflow выбирает `oma-frontend` (сигналами маршрутизации служат, например, слова «form», «component», «Tailwind CSS» и «React»)
2. **Оценка сложности:** средняя (2–3 файла, включая решения по UX валидации)
3. **Загружаемые ресурсы:**
   - `execution-protocol.md` (всегда)
   - `snippets.md` (паттерны формы и Zod, а также существующие паттерны компонентов, если навык их предоставляет)
4. **Execution contract (если включён) может вывести `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **Реализация:**
   - Создаёт `src/features/auth/components/login-form.tsx` (Client Component с `"use client"`)
   - Создаёт `src/features/auth/utils/login-schema.ts` (схема Zod)
   - Создаёт `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Использует `<Button>`, `<Input>`, `<Label>` из shadcn/ui (только чтение, без изменений)
   - Обрабатывает форму через `@tanstack/react-form` с валидацией Zod
   - Использует абсолютные импорты с `@/`
   - Один компонент на файл
6. **Проверка:**
   - Чек-лист: ARIA-метки присутствуют, заголовки семантичны, клавиатурная навигация работает
   - Мобильные устройства: корректный рендер при ширине viewport 320px
   - Производительность: CLS отсутствует
   - Тесты: файл тестов Vitest в `src/features/auth/utils/__tests__/login-schema.test.ts`
<!-- oma-docs:ignore-end -->

---

### Бэкенд: REST API-эндпоинт

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**Ожидаемый поток выполнения:**

1. **Маршрутизация навыка:** хост или workflow выбирает `oma-backend` (сигналами маршрутизации служат, например, «API», «endpoint» и «REST»)
2. **Определение стека:** читает `pyproject.toml` или `package.json`, чтобы определить язык и фреймворк. Если есть сгенерированные ссылки `stack/` или поставляемые варианты `variants/`, загружает оттуда соглашения
3. **Оценка сложности:** средняя (2–3 файла: route, service, repository и тест)
4. **Загружаемые ресурсы:**
   - `execution-protocol.md` (всегда)
<!-- oma-docs:ignore-start -->
   - подходящий `stack/snippets.md` или `variants/{node,python,rust}/snippets.md`, если он есть
   - подходящий `stack/tech-stack.md` или ссылки на tech-stack варианта, если они есть
<!-- oma-docs:ignore-end -->
5. **Execution contract (если включён) может вывести `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Реализация:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` с параметризованным запросом
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)` (обёртка бизнес-логики)
   - Router: `GET /api/tasks` с JWT auth middleware, валидацией входных данных и форматированием ответа
   - Тесты: обязательная auth возвращает 401, пагинация возвращает правильный cursor, фильтр работает, пустой результат возвращает 200 с пустым массивом

---

### Мобильное приложение: экран настроек

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**Ожидаемый поток выполнения:**

1. **Маршрутизация навыка:** хост или workflow выбирает `oma-mobile` (сигналами маршрутизации служат, например, «Flutter», «screen» и «mobile»)
2. **Оценка сложности:** средняя (экран настроек + управление состоянием + обработка offline)
3. **Загружаемые ресурсы:**
   - `execution-protocol.md`
   - `snippets.md` (шаблон экрана, паттерн провайдера Riverpod)
   - `screen-template.dart`
4. **Execution contract (если включён) может вывести `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **Реализация:**
   - Экран: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget с Riverpod)
   - Провайдеры: `lib/features/settings/providers/settings_provider.dart`
   - Репозиторий: `lib/features/settings/data/settings_repository.dart`
   - Обработка offline: interceptor Dio перехватывает `SocketException` и переключается на кэшированные данные
   - Все контроллеры освобождаются в методе `dispose()`
<!-- oma-docs:ignore-end -->

---

### База данных: проектирование схемы

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**Ожидаемый поток выполнения:**

1. **Маршрутизация навыка:** хост или workflow выбирает `oma-db` (сигналами маршрутизации служат, например, «database», «schema», «ERD» и «migration»)
2. **Оценка сложности:** высокая (архитектурные решения, несколько сущностей, планирование ёмкости)
3. **Загружаемые ресурсы:**
   - `execution-protocol.md`
   - `document-templates.md` (структура результата)
   - `examples.md`
   - `anti-patterns.md` (проверка во время оптимизации)
4. **Execution contract (если включён) может вывести `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** исследование (сущности, связи, паттерны доступа, оценки объёма) -> проектирование (внешняя, концептуальная и внутренняя схемы, ограничения, поля жизненного цикла) -> оптимизация (индексы для паттернов запросов, стратегия секционирования, план резервного копирования, проверка анти-паттернов)
6. **Результаты:**
   - краткое описание внешней схемы (представления для ролей администратора, менеджера проекта и участника команды)
   - концептуальная схема с ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership и т. д.)
   - внутренняя схема с физическим DDL, индексами и секционированием
   - таблица стандартов данных (правила именования полей, соглашения о типах)
   - глоссарий (tenant, workspace, assignee и т. д.)
   - таблица оценки ёмкости
   - стратегия резервного копирования (полная копия ежедневно + инкрементальная каждый час, хранение 30 дней)
   - скрипт миграции

---

## Чек-лист шлюза качества

После получения результата агента проверьте следующие пункты перед приёмкой:

### Универсальные проверки (все агенты)

- [ ] **Поведение соответствует критериям приёмки:** каждый критерий из промпта выполнен
- [ ] **Тесты покрывают успешный сценарий и ключевые граничные случаи:** проверен не только happy path
- [ ] **Нет несвязанных изменений файлов:** изменены только файлы, относящиеся к задаче
- [ ] **Общие модули не сломаны:** импорты, типы и интерфейсы, используемые другим кодом, по-прежнему работают
- [ ] **Устав соблюдён:** ограничения `Must NOT do` выполнены
- [ ] **Lint, typecheck и build проходят:** запущены стандартные проверки проекта

### Специально для фронтенда

- [ ] Доступность: интерактивные элементы имеют `aria-label`, семантические заголовки и рабочую клавиатурную навигацию
- [ ] Мобильные устройства: корректный рендер при ширине viewport 320px, 768px, 1024px и 1440px
- [ ] Производительность: CLS отсутствует, целевой показатель FCP достигнут
- [ ] Реализованы Error Boundaries и Loading Skeletons
- [ ] Компоненты shadcn/ui напрямую не изменялись (используются обёртки)
- [ ] Используются абсолютные импорты с `@/` (без относительных `../../`)

### Специально для бэкенда

- [ ] Сохранена чистая архитектура: бизнес-логика не находится в обработчиках маршрутов
- [ ] Все входные данные валидируются (пользовательский ввод не считается доверенным)
- [ ] Используются только параметризованные запросы (без интерполяции строк в SQL)
- [ ] Пользовательские исключения проходят через централизованный модуль (без необработанных HTTP-исключений)
- [ ] На auth-эндпоинтах включено ограничение частоты запросов

### Специально для мобильных приложений

- [ ] Все контроллеры освобождаются в методе `dispose()`
- [ ] Режим offline обрабатывается корректно
- [ ] Сохраняется целевой показатель 60 fps (без рывков)
- [ ] Проведено тестирование на iOS и Android

### Специально для базы данных

- [ ] Соблюдается как минимум 3НФ (либо задокументировано обоснование денормализации)
- [ ] Документированы все три слоя схемы (внешний, концептуальный, внутренний)
- [ ] Явно указаны ограничения целостности (сущности, домена, ссылочной целостности и бизнес-правил)
- [ ] Проведена проверка анти-паттернов

---

## Сигналы эскалации

Следите за сигналами, которые показывают, что одиночный навык нужно заменить мультиагентным выполнением:

| Сигнал | Что это значит | Действие |
|--------|----------------|---------|
| Агент говорит «это требует изменения бэкенда» | У задачи есть кросс-доменные зависимости | Переключитесь на `/work` и добавьте агента бэкенда |
| В `CHARTER_CHECK` агента указаны пункты `Must NOT do`, которые на самом деле нужны | Объём выходит за пределы одного домена | Сначала спланируйте всю функцию через `/plan` |
| Исправление затрагивает 3+ файла в разных слоях | Одно исправление влияет на несколько доменов | Используйте `/debug` с более широким объёмом или `/work` |
| Агент обнаруживает несоответствие API-контракта | Фронтенд и бэкенд расходятся | Запустите `/plan`, определите контракты и заново запустите обоих агентов |
| Шлюз качества не проходит на точках интеграции | Компоненты не соединяются должным образом | Запустите `/review` или добавьте проход QA: `oma agent spawn qa "Review the integration" SESSION_ID --read-only` |
| Задача вырастает из «одного компонента» до «трёх компонентов + новый route + API» | Объём расползается | Остановитесь, запустите `/plan` для декомпозиции, затем `/orchestrate` |
| Агент блокируется на HIGH | Требования фундаментально неоднозначны | Ответьте на вопросы агента или запустите `/brainstorm` для уточнения подхода |

### Практическое правило

Если вы перезапускаете одного и того же агента с уточнениями более двух раз, задача, вероятно, стала мультидоменной. Запустите `/work` или хотя бы `/plan`, чтобы разделить её на части.

---

## Дальнейшие шаги

- Задача охватывает несколько доменов: [Мультиагентные проекты](./multi-agent-project.md)
- Задача — это ошибка: [Исправление ошибок](./bug-fixing.md)
- Проверить или возобновить запуск: [Результаты агентов и возобновление](./agent-results-and-resume.md)
- Что-то пошло не так: [Устранение неполадок](./troubleshooting.md)
- Выбрать между навыком и workflow: [Рабочие процессы](../core-concepts/workflows.md#choosing-a-skill-or-workflow)
