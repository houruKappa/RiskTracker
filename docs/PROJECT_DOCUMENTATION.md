# RiskTracker — Полная документация проекта

## Содержание

1. [Обзор проекта](#1-обзор-проекта)
2. [Архитектура](#2-архитектура)
3. [Структура проекта](#3-структура-проекта)
4. [Технологический стек](#4-технологический-стек)
5. [Быстрый старт](#5-быстрый-старт)
6. [Переменные окружения](#6-переменные-окружения)
7. [База данных](#7-база-данных)
8. [Аутентификация и авторизация](#8-аутентификация-и-авторизация)
9. [API — полный справочник эндпоинтов](#9-api--полный-справочник-эндпоинтов)
10. [Доменные модели](#10-доменные-модели)
11. [Frontend](#11-frontend)
12. [Swagger](#12-swagger)
13. [Тесты](#13-тесты)
14. [Деплой и продакшен](#14-деплой-и-продакшен)
15. [Известные проблемы и особенности](#15-известные-проблемы-и-особенности)

---

## 1. Обзор проекта

**RiskTracker** — система управления рисками для IT-организаций. Позволяет:

- Управлять объектами риска (IT-системы, проекты, процессы)
- Создавать и отслеживать риски с причинами и последствиями
- Назначать контрмеры (меры по снижению рисков) исполнителям с дедлайнами
- Генерировать отчёты с фильтрами, статистикой и анализом просроченных контрмер
- Вести аудит-журнал всех изменений

**Роли:**
- **ADMIN** — полный доступ: управление пользователями, объектами, аудит-логи
- **USER** — видит только свои риски (где владелец или исполнитель контрмеры), может создавать/редактировать риски

---

## 2. Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Compose                       │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Frontend    │  │   Backend    │  │  PostgreSQL   │  │
│  │  Next.js 16   │→→│   Go 1.24    │→→│   15-alpine   │  │
│  │  :3000        │  │   :8080      │  │   :5432       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  Frontend → API (axios) → Backend → DB (lib/pq)         │
└─────────────────────────────────────────────────────────┘
```

**Backend — Clean Architecture:**
```
cmd/api/main.go          ← точка входа, регистрация роутов
internal/
  config/                ← загрузка ENV
  domain/                ← доменные модели и интерфейсы репозиториев
  usecase/               ← бизнес-логика
  repository/postgres/   ← реализация репозиториев (PostgreSQL)
  delivery/http/v1/      ← HTTP-хендлеры
  delivery/http/middleware ← JWT, CORS, RBAC
  app/                   ← инициализация DB, миграции
  swagger/               ← Swagger UI + spec
```

**Frontend — Next.js App Router:**
```
src/
  app/
    (auth)/login/        ← страница входа
    (dashboard)/         ← основной layout с сайдбаром
      dashboard/         ← главная страница (дашборд)
      risks/             ← список рисков
      risks/[id]/        ← детальный просмотр риска
      reports/           ← отчёты и аналитика
      admin/             ← админка (пользователи, логи)
  components/
    ui/                  ← переиспользуемые UI-компоненты (shadcn/ui)
    countermeasure/      ← форма создания контрмеры
    risk/                ← RiskEditSheet (Drawer)
  lib/
    api-client.ts        ← Axios с JWT-интерцептором
    api-services.ts      ← все API-вызовы
    locales/ru.ts, en.ts ← переводы
    language-context.tsx  ← контекст языка (RU/EN)
  types/api.ts           ← TypeScript-типы API
```

---

## 3. Структура проекта

```
RiskTracker/
├── docker-compose.yml        # Оркестрация всех сервисов
├── Makefile                  # Команды (make up, make test, и т.д.)
├── .env.example              # Шаблон переменных окружения
├── .env                      # Реальные переменные (не в git)
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── go.mod / go.sum
│   ├── .air.toml             # Hot-reload конфигурация
│   ├── cmd/api/main.go       # Точка входа
│   ├── internal/
│   │   ├── config/config.go
│   │   ├── domain/           # Модели: user.go, risk.go, countermeasure.go, report.go
│   │   ├── usecase/          # Бизнес-логика: auth_uc, risk_uc, countermeasure_uc, report_uc
│   │   ├── repository/postgres/  # SQL-запросы
│   │   ├── delivery/http/v1/     # Хендлеры + тесты
│   │   ├── delivery/http/middleware/ # AuthRequired, AdminRequired, CORS
│   │   ├── app/              # NewPool, RunMigrations
│   │   └── swagger/          # swagger.yaml + handler.go
│   ├── migrations/
│   │   ├── 001_init.sql              # Схема БД
│   │   ├── 002_audit_log_enhancements.sql
│   │   └── 003_countermeasure_status.sql
│   └── api/swagger/swagger.yaml      # Копия сваггера
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/              # Pages (App Router)
│       ├── components/       # UI-компоненты
│       ├── lib/              # утилиты, API, переводы
│       ├── types/            # TypeScript-типы
│       └── hooks/            # React-хуки
```

---

## 4. Технологический стек

### Backend
| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Язык | Go | 1.24 |
| HTTP-роутер | `net/http` (Go 1.22+ method-prefixed) | stdlib |
| БД | PostgreSQL | 15-alpine |
| SQL-драйвер | `github.com/lib/pq` | 1.10.9 |
| JWT | `github.com/golang-jwt/jwt/v5` | 5.3.1 |
| Хеширование | `golang.org/x/crypto` (bcrypt) | 0.31.0 |
| Hot-reload | `air` | 1.61.7 |
| Тесты | `testing` + `github.com/stretchr/testify` | 1.8.4 |

### Frontend
| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Framework | Next.js (App Router) | 16.2.9 |
| React | React | 19.2.4 |
| Styling | Tailwind CSS | 4.x |
| HTTP-клиент | Axios | 1.18.1 |
| Данные | TanStack React Query | 5.101.2 |
| UI-компоненты | Radix UI + shadcn/ui | — |
| Формы | React Hook Form | 7.80.0 |
| Уведомления | Sonner | 2.0.7 |
| Иконки | Lucide React | 1.23.0 |
| Языки | RU / EN (hand-rolled i18n) | — |

---

## 5. Быстрый старт

### Через Docker (рекомендуется)

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd RiskTracker

# 2. Создать .env
cp .env.example .env
# Отредактировать .env (JWT_SECRET обязателен)

# 3. Запустить
make up
# или
docker compose up -d

# 4. Открыть
# Frontend:  http://localhost:3000
# Backend:   http://localhost:8080
# Swagger:   http://localhost:8080/swagger/
# PostgreSQL: localhost:5432
```

### Локальная разработка (без Docker)

```bash
# Backend
cd backend
export DB_DSN=postgres://risktracker:risktracker@localhost:5432/risktracker?sslmode=disable
export JWT_SECRET=dev-secret
air  # hot-reload

# Frontend
cd frontend
npm install
npm run dev
```

### Makefile команды

| Команда | Описание |
|---------|----------|
| `make up` | Запустить все сервисы |
| `make down` | Остановить все сервисы |
| `make build` | Пересобрать образы |
| `make rebuild` | Пересобрать без кеша |
| `make logs` | Логи всех сервисов |
| `make logs-backend` | Логи только бэкенда |
| `make test` | Запустить все тесты |
| `make clean` | Остановить + удалить volumes + node_modules |
| `make swagger` | Показать URL swagger |

---

## 6. Переменные окружения

| Переменная | Обязательна | По умолчанию | Описание |
|-----------|-------------|--------------|----------|
| `DB_DSN` | Да | — | PostgreSQL connection string |
| `JWT_SECRET` | Да | — | Секрет для подписи JWT-токенов |
| `PORT` | Нет | `8080` | Порт бэкенда |
| `ENV` | Нет | `dev` | Окружение (`dev` / `prod`) |

**Пример DSN:**
```
postgres://risktracker:risktracker@db:5432/risktracker?sslmode=disable
```
> В Docker хост = `db` (имя сервиса), локально = `localhost`.

---

## 7. База данных

### Схема (миграции)

Миграции применяются автоматически при старте бэкенда (`app.RunMigrations`).

**Таблицы:**

| Таблица | Описание |
|---------|----------|
| `users` | Пользователи (id, email, password_hash, full_name, role) |
| `risk_objects` | Объекты риска (id, name, object_type, description) |
| `risks` | Риски (id, status, title, target_id, owner_id, probability, impact, ...) |
| `risk_causes` | Причины риска (id, risk_id, name, probability) |
| `risk_consequences` | Последствия риска (id, risk_id, name, probability) |
| `countermeasures` | Контрмеры (id, risk_id, target_type, description, assignee_id, status, deadline) |
| `entity_audit_logs` | Аудит-журнал (id, entity_type, entity_id, action_type, old_state, new_state) |

**ENUM типы:**
- `risk_level`: LOW, MEDIUM, HIGH, CRITICAL
- `risk_status`: IN_PROGRESS, COMPLETED
- `user_role`: USER, ADMIN
- `countermeasure_target`: CAUSE, CONSEQUENCE
- `risk_object_type`: IT_SYSTEM, PROJECT, PROCESS

**Индексы:**
- `idx_risks_search` — (target_id, status)
- `idx_risks_owner` — (owner_id)
- `idx_countermeasures_assignee` — (assignee_id, deadline)
- `idx_audit_history` — (entity_type, entity_id, timestamp DESC)

### Миграции

| Файл | Описание |
|------|----------|
| `001_init.sql` | Полная начальная схема (7 таблиц, 5 enum, 4 индекса) |
| `002_audit_log_enhancements.sql` | Добавляет `entity_name`, `changes` в audit_logs |
| `003_countermeasure_status.sql` | Добавляет `status` (PENDING/COMPLETED) в countermeasures |

---

## 8. Аутентификация и авторизация

### JWT

1. Клиент отправляет `POST /api/v1/auth/login` с `{ email, password }`
2. Сервер возвращает `{ token, user }`
3. Клиент хранит токен в `localStorage` и отправляет в заголовке `Authorization: Bearer <token>`
4. Токен живёт 24 часа

### Middleware

- **AuthRequired** — проверяет JWT, извлекает `user_id` и `role` в контекст
- **AdminRequired** — проверяет `role == "ADMIN"`, возвращает 403 если нет
- **CORS** — разрешает все домены (для разработки)

### RBAC (Role-Based Access Control)

| Операция | ADMIN | USER |
|----------|-------|------|
| Управление пользователями |✅ |❌ |
| Управление объектами риска |✅ |❌ |
| Аудит-логи |✅ |❌ |
| Просмотр всех рисков |✅ |❌ |
| Просмотр своих рисков |✅ |✅ (owner или assignee CM) |
| Создание/редактирование рисков |✅ |✅ (только свои) |
| Создание контрмер |✅ |✅ |
| Удаление контрмер |✅ |✅ (только если risk не COMPLETED) |

---

## 9. API — полный справочник эндпоинтов

Swagger UI: `http://localhost:8080/swagger/`

### Auth

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| `GET` | `/health` | Health check | Нет |
| `POST` | `/api/v1/auth/login` | Вход | Нет |
| `POST` | `/api/v1/auth/logout` | Выход | JWT |
| `GET` | `/api/v1/users/me` | Текущий пользователь | JWT |

### Users

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| `GET` | `/api/v1/users` | Список пользователей | JWT |
| `GET` | `/api/v1/admin/users` | Список пользователей (admin) | JWT + Admin |
| `POST` | `/api/v1/admin/users` | Создать пользователя | JWT + Admin |
| `PUT` | `/api/v1/admin/users/{id}` | Редактировать пользователя | JWT + Admin |
| `PUT` | `/api/v1/admin/users/{id}/password` | Сбросить пароль | JWT + Admin |

### Risk Objects

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| `GET` | `/api/v1/objects` | Список объектов | JWT |
| `POST` | `/api/v1/admin/objects` | Создать объект | JWT + Admin |
| `PUT` | `/api/v1/admin/objects/{id}` | Редактировать объект | JWT + Admin |
| `DELETE` | `/api/v1/admin/objects/{id}` | Удалить объект | JWT + Admin |

### Risks

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| `GET` | `/api/v1/risks` | Список рисков (пагинация) | JWT |
| `POST` | `/api/v1/risks` | Создать риск | JWT |
| `GET` | `/api/v1/risks/{id}` | Получить риск | JWT |
| `PUT` | `/api/v1/risks/{id}` | Редактировать риск | JWT |
| `PATCH` | `/api/v1/risks/{id}/status` | Изменить статус риска | JWT |
| `GET` | `/api/v1/risks/{id}/causes` | Список причин | JWT |
| `POST` | `/api/v1/risks/{id}/causes` | Добавить причину | JWT |
| `DELETE` | `/api/v1/risks/{id}/causes/{cause_id}` | Удалить причину | JWT |
| `GET` | `/api/v1/risks/{id}/consequences` | Список последствий | JWT |
| `POST` | `/api/v1/risks/{id}/consequences` | Добавить последствие | JWT |
| `DELETE` | `/api/v1/risks/{id}/consequences/{consequence_id}` | Удалить последствие | JWT |

### Countermeasures

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| `POST` | `/api/v1/countermeasures` | Создать контрмеру | JWT |
| `GET` | `/api/v1/countermeasures/{id}` | Получить контрмеру | JWT |
| `PUT` | `/api/v1/countermeasures/{id}` | Редактировать контрмеру | JWT |
| `DELETE` | `/api/v1/countermeasures/{id}` | Удалить контрмеру | JWT |
| `GET` | `/api/v1/risks/{risk_id}/countermeasures` | Контрмеры по риску | JWT |

### Reports

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| `GET` | `/api/v1/reports/summary` | Сводка (aggregate stats) | JWT |
| `GET` | `/api/v1/reports/detail` | Детальный отчёт (фильтры, пагинация) | JWT |

### Audit Logs

| Метод | Путь | Описание | Авторизация |
|-------|------|----------|-------------|
| `GET` | `/api/v1/logs` | Аудит-журнал (admin, пагинация) | JWT + Admin |

---

## 10. Доменные модели

### User
```
id           UUID
email        VARCHAR(255) UNIQUE
password_hash VARCHAR(255)  (не serializуется в JSON)
full_name    VARCHAR(255)
role         USER | ADMIN
created_at   TIMESTAMP
updated_at   TIMESTAMP
```

### RiskObject
```
id           UUID
name         VARCHAR(255) UNIQUE
object_type  IT_SYSTEM | PROJECT | PROCESS
description  TEXT (nullable)
created_at   TIMESTAMP
updated_at   TIMESTAMP
```

### Risk
```
id                          UUID
status                      IN_PROGRESS | COMPLETED
title                       VARCHAR(255)
target_id                   UUID → risk_objects
owner_id                    UUID → users
probability                 LOW | MEDIUM | HIGH | CRITICAL
impact                      LOW | MEDIUM | HIGH | CRITICAL
financial_loss              TEXT (nullable)
reputational_loss           RiskLevel (nullable)
legal_consequences          INT 1-5 (nullable)
comment                     TEXT (nullable)
max_cause_probability       RiskLevel (nullable, computed)
max_consequence_probability RiskLevel (nullable, computed)
causes                      []RiskCause
consequences                []RiskConsequence
created_at                  TIMESTAMP
updated_at                  TIMESTAMP
```

### RiskCause / RiskConsequence
```
id           UUID
risk_id      UUID → risks (CASCADE)
name         VARCHAR(255)
description  TEXT (nullable)
probability  LOW | MEDIUM | HIGH | CRITICAL
created_at   TIMESTAMP
```

### Countermeasure
```
id            UUID
risk_id       UUID → risks (CASCADE)
target_type   CAUSE | CONSEQUENCE
cause_id      UUID → risk_causes (nullable, CASCADE)
consequence_id UUID → risk_consequences (nullable, CASCADE)
description   TEXT
assignee_id   UUID → users
status        PENDING | COMPLETED
deadline      TIMESTAMP
created_at    TIMESTAMP
```

**Метод `IsOverdue()`:** `status != COMPLETED && deadline < now`

### EntityAuditLog
```
id                BIGSERIAL
entity_type       VARCHAR(50)  — RISK | RISK_CAUSE | RISK_CONSEQUENCE | COUNTERMEASURE | RISK_OBJECT | USER
entity_id         UUID
entity_name       TEXT (nullable)
action_type       VARCHAR(20) — CREATE | UPDATE | DELETE
changes           TEXT (nullable)
changed_by_user_id UUID → users
changed_by_email  TEXT (nullable, JOIN)
timestamp         TIMESTAMP
old_state         JSONB (nullable)
new_state         JSONB (nullable)
```

---

## 11. Frontend

### Страницы

| Путь | Страница | Описание |
|------|----------|----------|
| `/login` | Вход | Форма логина |
| `/dashboard` | Дашборд | Сводные карточки (risks, CMs, overdue), donut-диаграммы |
| `/risks` | Список рисков | Таблица с фильтрами, пагинацией, поиском |
| `/risks/[id]` | Детали риска | Обзор, причины, последствия, контрмеры (создание/редактирование/удаление) |
| `/reports` | Отчёты | Фильтры, donut/line графики, статистика, таблица с expand, выборка для отчёта |
| `/admin/users` | Пользователи | CRUD пользователей (только ADMIN) |
| `/admin/logs` | Аудит-логи | Таблица с фильтрами, diff-view, копирование |

### Компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| `Autocomplete` | `components/ui/Autocomplete.tsx` | Выпадающий поиск с очисткой и "All" опцией |
| `DonutChart` | `components/ui/DonutChart.tsx` | SVG donut-диаграмма |
| `StatCard` | `components/ui/StatCard.tsx` | Карточка статистики |
| `RiskEditSheet` | `components/risk/RiskDrawer.tsx` | Боковая панель редактирования риска |
| `CountermeasureFormDialog` | `components/countermeasure/CountermeasureFormDialog.tsx` | Форма создания контрмеры |

### i18n

Язык переключается через `useLanguage()` хук. Переводы в `lib/locales/ru.ts` и `lib/locales/en.ts`. Дефолт — русский.

### API-клиент

Все запросы идут через `lib/api-services.ts` → `lib/api-client.ts` (Axios). Интерцептор автоматически добавляет `Authorization: Bearer <token>`. При 401 — редирект на `/login`.

---

## 12. Swagger

- **URL:** `http://localhost:8080/swagger/`
- **Файл:** `backend/internal/swagger/swagger.yaml`
- **OpenAPI:** 3.0.3

Обновлён 2026-07-08. Включает все эндпоинты, все схемы, описания RBAC.

---

## 13. Тесты

### Backend

```bash
cd backend
go test ./...
```

Тесты покрывают:
- `countermeasure_uc_test.go` — бизнес-логика контрмер (Create, Update, Delete, RBAC)
- `countermeasure_test.go` — HTTP-хендлеры (Create, Update, Delete, Forbidden)

### Frontend

```bash
cd frontend
npm test
```

---

## 14. Деплой и продакшен

### Что нужно сделать перед продом

1. **JWT_SECRET** — сменить на уникальный, сложный ключ
2. **DB_DSN** — использовать реальные креды БД, не `risktracker:risktracker`
3. **CORS** — текущая реализация разрешает все домены. В проде ограничить.
4. **HTTPS** — добавить reverse proxy (nginx/caddy) с TLS
5. **ENV** — установить `prod`

### Docker в проде

```bash
docker compose -f docker-compose.yml up -d --build
```

Frontend собирается в production-режиме (с `next build`). Backend компилируется в бинарник.

---

## 15. Известные проблемы и особенности

### RBAC в detail-отчёте
- `GET /api/v1/reports/detail` возвращает ВСЕ подходящие риски в памяти, затем пагинирует. При больших объёмах данных это может быть медленно.

### Аудит-журнал дат
- При обновлении риска `CreatedAt` копируется из существующей записи, чтобы аудит-журнал не показывал `0001-01-01T00:00:00Z`.

### Deadline контрмеры
- При создании: `deadline > created_at` (constraint в БД)
- При обновлении: если статус != COMPLETED, deadline не может быть в прошлом
- Формат фронтенда: `<input type="date">` → `"2026-07-08"`, бэкенд ожидает RFC3339 → фронтенд дописывает `T00:00:00Z`

### Удаление контрмер
- Кнопка удаления скрыта если статус риска = COMPLETED (бизнес-логика)
- При удалении риска — все контрмеры удаляются каскадно (ON DELETE CASCADE)

### Hot-reload
- Backend: `air` ( watching `*.go` файлов)
- Frontend: Next.js dev + volume mount `./frontend/src:/app/src`
- Пересборка Docker нужна только при изменении `Dockerfile`, `go.mod`, `package.json`
