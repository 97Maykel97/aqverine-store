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

Публичные: `/`, `/catalog`, `/products/[slug]`, `/checkout`, `/payment/success`, `/payment/failure`, `/login`, `/register`, `/forgot-password`. Авторизованный покупатель: `/account` и `/account/update-password`. Администратор: `/aqverine-control` и `/aqverine-control/login`. Серверные auth endpoints — `/api/auth/*`, email callback — `/auth/callback`; публичный API каталога — `GET /api/products` и `GET /api/products/[slug]`; будущий платёжный webhook — `/api/payments/webhook`.

Формы входа, регистрации и восстановления отправляют данные только в серверные auth endpoints; без настроенных Supabase и PostgreSQL они возвращают 503 без создания аккаунта. При настроенном окружении `/account` показывает данные только после проверки Supabase-сессии, а `/aqverine-control` проверяет роль `admin` из локальной БД. Checkout по-прежнему демонстрирует локальную валидацию: заказ и платёж не создаются. Профиль, история заказов и административный CRUD ожидают доменный API.

## Данные и состояния

В целевой backend-архитектуре PostgreSQL — единственный источник истины для товаров, вариантов, остатков, серверных корзин, заказов, платежей и webhook-событий. Prisma миграции версионируют схему. Деньги — integer minor units. Заказ создаётся транзакционно и сохраняет `OrderItem` snapshots.

Сейчас Prisma schema, начальная миграция и идемпотентный seed уже подготовлены, но миграция ещё не применена к PostgreSQL. Серверный каталог читает только опубликованные товары из БД, валидирует фильтры и ограничивает размер страницы. Пока БД не настроена, API возвращает 503, а frontend продолжает использовать mock-каталог. Изображения начального каталога берутся из локальных путей; Storage keys не выдаются клиенту, а URL фотографий из Supabase Storage появятся при подключении Storage. Prisma 7 подключается к PostgreSQL через `@prisma/adapter-pg`; браузер не получает прямой доступ к таблицам. SQL-миграция включает RLS без клиентских политик.

Гостевая корзина хранится в `localStorage`; после входа сервер объединяет её с `Cart` по `variantId` и ограничивает количество остатком. Клиент никогда не определяет цену, остаток, роли и payment status.

## Авторизация и безопасность

Supabase Auth управляет сессией в защищённых HTTP-only cookies с `SameSite=Lax` и `Secure` в production. Next.js proxy обновляет сессию перед закрытыми страницами; сервер сверяет пользователя через Supabase Auth и читает роль из PostgreSQL, не из пользовательских metadata. `/aqverine-control` проверяет роль `admin` при каждом запросе; будущие admin API обязаны повторить эту проверку. URL панели не является защитой. Auth-запросы проходят Zod, проверку Origin, ограничение частоты попыток и безопасную обработку ошибок. Текущий limiter работает в памяти одного Node.js-процесса; перед масштабированием на несколько инстансов нужен общий store. Service-role key, payment keys и webhook secret доступны только на сервере.

## Оплата

Checkout зависит от интерфейса `PaymentProvider`, а не от SDK конкретного провайдера. Provider adapter создаёт платёж и нормализует события. Карточные данные и CVV не проходят через AQVERINE. Только webhook с валидной подписью может изменить `Payment` и `Order` на `paid`. `PaymentWebhookEvent` делает обработку повторов идемпотентной.

## Деплой

Проект разворачивается как один Docker/Node.js сервис Next.js за reverse proxy с переменными окружения. PostgreSQL и Supabase — управляемые внешние сервисы. Требуются: health-check, миграция Prisma в release-процессе, HTTPS, резервное копирование БД и server-side логи с редактированием secrets. Отдельный Redis, очереди и микросервисы добавляются только когда появятся измеримые требования к rate limiting, фоновой обработке или нагрузке.

## Расширение

Новые возможности добавляются feature-модулем, миграцией Prisma и тестами. Новый платёжный провайдер реализует `PaymentProvider`. Новые интеграции остаются в `shared/lib` или своей feature. Изменение архитектуры обновляет этот файл; изменение БД — `docs/db-schema.md`; изменение payment flow — `docs/payment-flow.md`.
