# Архитектура AQVERINE

## Цель

AQVERINE — монолитное full-stack приложение интернет-магазина одежды. Архитектура намеренно проста для обычного Node.js-сервера: один Next.js-процесс, один PostgreSQL, Supabase как внешний сервис авторизации и файлов, платёжный провайдер за узким интерфейсом. При росте проект разделяется по feature, а не на микросервисы.

## Карта компонентов

```text
Браузер
  ├─ Next.js Server Components / SCSS Modules
  └─ Client islands: cart drawer, forms, TanStack Query
          │ HTTPS
Next.js App Router (один deployable)
  ├─ страницы и Route Handlers
  ├─ feature services и Zod validation
  ├─ Prisma ORM ──────────────── PostgreSQL
  ├─ Supabase Auth / Storage
  └─ PaymentProvider ────────── платёжный провайдер
                                  └─ webhook → Route Handler
```

## Структура кода

```text
src/
  app/                       # маршруты, layouts, metadata, providers, Route Handlers
  features/
    auth/{api,model,ui}/
    catalog/{api,model,ui}/
    cart/{api,model,ui}/
    checkout/{api,model,ui}/
    payments/{api,model,ui}/
    account/{api,model,ui}/
    admin/{api,model,ui}/
  shared/
    lib/                     # Prisma, Supabase, безопасность, утилиты
    types/ constants/ ui/
prisma/                      # schema, migrations, seed
```

`src/app` не содержит бизнес-логику. `api` — вызовы и transport-границы, `model` — схемы, сервисы и доменные правила, `ui` — компоненты и SCSS Modules. Между feature запрещены импорты внутренних деталей; общее переносится в `shared`. Используется alias `@/*`.

## Маршруты

Публичные: `/`, `/catalog`, `/products/[slug]`, `/checkout`, `/payment/success`, `/payment/failure`, `/login`, `/register`, `/forgot-password`. Авторизованный покупатель: `/account`. Администратор: `/aqverine-control` и `/aqverine-control/login`. Публичные API располагаются в `/api/*`; webhook — `/api/payments/webhook`.

## Данные и состояния

PostgreSQL — единственный источник истины для товаров, вариантов, остатков, серверных корзин, заказов, платежей и webhook-событий. Prisma миграции версионируют схему. Деньги — integer minor units. Заказ создаётся транзакционно и сохраняет `OrderItem` snapshots.

Гостевая корзина хранится в `localStorage`; после входа сервер объединяет её с `Cart` по `variantId` и ограничивает количество остатком. Клиент никогда не определяет цену, остаток, роли и payment status.

## Авторизация и безопасность

Supabase Auth управляет сессией в защищённых HTTP-only cookies. Сервер проверяет сессию и роль `admin` в каждом admin layout, server action и Route Handler; URL `/aqverine-control` не является защитой. Любой внешний input проходит Zod. Service-role key, payment keys и webhook secret доступны только на сервере.

## Оплата

Checkout зависит от интерфейса `PaymentProvider`, а не от SDK конкретного провайдера. Provider adapter создаёт платёж и нормализует события. Карточные данные и CVV не проходят через AQVERINE. Только webhook с валидной подписью может изменить `Payment` и `Order` на `paid`. `PaymentWebhookEvent` делает обработку повторов идемпотентной.

## Деплой

Проект разворачивается как один Docker/Node.js сервис Next.js за reverse proxy с переменными окружения. PostgreSQL и Supabase — управляемые внешние сервисы. Требуются: health-check, миграция Prisma в release-процессе, HTTPS, резервное копирование БД и server-side логи с редактированием secrets. Отдельный Redis, очереди и микросервисы добавляются только когда появятся измеримые требования к rate limiting, фоновой обработке или нагрузке.

## Расширение

Новые возможности добавляются feature-модулем, миграцией Prisma и тестами. Новый платёжный провайдер реализует `PaymentProvider`. Новые интеграции остаются в `shared/lib` или своей feature. Изменение архитектуры обновляет этот файл; изменение БД — `docs/db-schema.md`; изменение payment flow — `docs/payment-flow.md`.
