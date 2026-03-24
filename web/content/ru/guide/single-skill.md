---
title: "Руководство: Выполнение одного навыка"
description: Подробное руководство по задачам в одном домене в oh-my-agent — когда использовать, предполётный чек-лист, шаблон промпта с пояснением, реальные примеры для фронтенда, бэкенда, мобильных и баз данных, ожидаемый поток выполнения, чек-лист шлюза качества и сигналы эскалации.
---

# Выполнение одного навыка

Выполнение одного навыка — это быстрый путь: один агент, один домен, одна сфокусированная задача. Без накладных расходов на оркестрацию и мультиагентную координацию. Навык автоактивируется из вашего промпта на естественном языке.

---

## Когда использовать одиночный навык

Используйте, когда задача соответствует ВСЕМ критериям:

- **Принадлежит одному домену** — целиком во фронтенде, бэкенде, мобильном, БД, дизайне, инфраструктуре или другом одном домене
- **Самодостаточна** — без кросс-доменных изменений API-контрактов
- **Чёткий объём** — вы знаете, что должно получиться
- **Без координации** — другим агентам не нужно работать до или после

**Примеры одиночных задач:**
- Создать один UI-компонент
- Добавить один API-эндпоинт
- Исправить одну ошибку в одном слое
- Спроектировать одну таблицу БД
- Написать один Terraform-модуль
- Перевести один набор i18n-строк
- Создать одну секцию дизайн-системы

**Переключитесь на мультиагентный** (`/coordinate` или `/orchestrate`) когда:
- UI-работа требует нового API-контракта
- Одно исправление каскадирует через слои
- Фича охватывает фронтенд, бэкенд и базу данных
- Объём выходит за один домен после первой итерации

---

## Предполётный чек-лист

| Элемент | Вопрос | Почему важно |
|---------|--------|-------------|
| **Цель** | Какой конкретный артефакт создать или изменить? | Предотвращает двусмысленность |
| **Контекст** | Какой стек, фреймворк, соглашения? | Агент определяет из файлов, но явное лучше |
| **Ограничения** | Какие правила соблюдать? | Без ограничений — агент использует умолчания |
| **Готово когда** | Какие критерии приёмки? | Даёт агенту цель и вам чек-лист |

При отсутствии элемента агент либо:
- **LOW**: Применит умолчания и перечислит допущения
- **MEDIUM**: Представит 2-3 варианта, продолжит с наиболее вероятным
- **HIGH**: Заблокируется и задаст вопросы (не будет писать код)

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

**Ожидаемый поток:**
1. `oma-frontend` активируется (ключевые слова: form, component, Tailwind CSS, React)
2. Сложность: Средняя (2-3 файла)
3. Загрузка: `execution-protocol.md` + `snippets.md` + `component-template.tsx`
4. CHARTER_CHECK: LOW, frontend домен, без бэкенда/БД/мобильных
5. Реализация: компонент, Zod-схема, скелетон загрузки, тесты
6. Верификация: ARIA, мобильные вьюпорты, производительность

---

### Бэкенд: REST API эндпоинт

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

**Ожидаемый поток:**
1. `oma-backend` активируется (ключевые слова: API, endpoint, REST)
2. Определение стека из `pyproject.toml` или `package.json`
3. Загрузка: `execution-protocol.md` + `stack/snippets.md`
4. Реализация: Repository, Service, Router, тесты

---

### Мобильное: экран настроек

```text
Build a settings screen in Flutter with profile editing, notification preferences, and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

---

### База данных: проектирование схемы

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields, row-level security.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers
3) Index strategy for common query patterns
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

---

## Чек-лист шлюза качества

### Универсальные проверки

- [ ] Поведение соответствует критериям приёмки
- [ ] Тесты покрывают успешный путь и ключевые граничные случаи
- [ ] Без нерелевантных изменений файлов
- [ ] Общие модули не сломаны
- [ ] Устав (Charter) соблюдён
- [ ] lint, typecheck, build проходят

### Фронтенд

- [ ] ARIA-лейблы, семантические заголовки, клавиатурная навигация
- [ ] Корректный рендер на 320px, 768px, 1024px, 1440px
- [ ] Без CLS, FCP в целевом диапазоне
- [ ] Error Boundaries и Loading Skeletons
- [ ] shadcn/ui не модифицирован напрямую
- [ ] Абсолютные импорты с `@/`

### Бэкенд

- [ ] Чистая архитектура: без бизнес-логики в обработчиках
- [ ] Все входные данные валидированы
- [ ] Только параметризованные запросы
- [ ] Пользовательские исключения через централизованный модуль
- [ ] Ограничение частоты запросов на auth-эндпоинтах

### Мобильное

- [ ] Все контроллеры освобождаются в `dispose()`
- [ ] Offline корректно обрабатывается
- [ ] Цель 60fps
- [ ] Тестирование на обеих платформах

### БД

- [ ] Минимум 3НФ (или обоснование денормализации)
- [ ] Все три слоя схемы документированы
- [ ] Ограничения целостности явные
- [ ] Анти-паттерны проверены

---

## Сигналы эскалации

| Сигнал | Что значит | Действие |
|--------|-----------|---------|
| Агент говорит «это требует изменения бэкенда» | Кросс-доменные зависимости | Переключитесь на `/coordinate` |
| CHARTER_CHECK содержит нужные «Must NOT do» | Объём превышает один домен | Запустите `/plan` |
| Исправление каскадирует в 3+ файла разных слоёв | Мульти-доменное влияние | `/debug` с широким объёмом или `/coordinate` |
| Обнаружено несоответствие API-контракта | Рассогласование frontend/backend | `/plan` для контрактов |
| Шлюз качества проваливается на интеграции | Компоненты не соединяются | Добавьте QA-ревью |
| Задача разрастается от «одного компонента» до трёх + роут + API | Расширение объёма | Остановитесь, запустите `/plan`, затем `/orchestrate` |
| Агент блокируется с HIGH | Фундаментальная неоднозначность | Ответьте на вопросы или `/brainstorm` |

### Общее правило

Если вы перезапускаете одного агента более двух раз с уточнениями, задача вероятно мульти-доменная и требует `/coordinate` или как минимум `/plan`.
