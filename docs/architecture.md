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

Публичные: `/`, `/catalog`, `/products/[slug]`, `/checkout`, `/payment/success`, `/payment/failure`, `/login`, `/register`, `/forgot-password`. Авторизованный покупатель: `/account` и `/account/update-password`. Администратор: `/aqverine-control` и `/aqverine-control/login`. Серверные auth endpoints — `/api/auth/*`, email callback — `/auth/callback`. Публичный API каталога: `GET /api/products` и `GET /api/products/[slug]`. API покупателя: `GET/PATCH /api/account/profile`, `POST /api/account/email`, `GET /api/account/orders`, `GET /api/account/orders/[orderId]`, `POST /api/account/orders/[orderId]/retry-payment`; серверная корзина: `GET /api/cart`, `PUT /api/cart/items`, `DELETE /api/cart/items/[variantId]`, `POST /api/cart/merge`. Checkout: `POST /api/checkout`; подписанный платёжный webhook: `POST /api/payments/webhook`; закрытие зависших Stripe-сессий: `POST /api/internal/payments/expire-stale`; повторная очистка фото: `POST /api/internal/storage/cleanup`. Admin API: `/api/admin/products`, `/api/admin/products/[productId]`, `/api/admin/products/[productId]/variants`, `/api/admin/variants/[variantId]`, `/api/admin/products/[productId]/images`, `/api/admin/images/[imageId]`, `/api/admin/orders`, `/api/admin/orders/[orderId]`.

Формы входа, регистрации и восстановления отправляют данные только в серверные auth endpoints; без настроенных Supabase и PostgreSQL они возвращают 503 без создания аккаунта. При настроенном окружении `/account` показывает данные только после проверки Supabase-сессии, а `/aqverine-control` проверяет роль `admin` из локальной БД. API профиля использует email из Supabase Auth и хранит только имя и телефон в `Profile`; отдельный `POST /api/account/email` инициирует подтверждаемую через Supabase смену адреса. До подтверждения текущий адрес остаётся действующим. API заказов ограничивает выборку текущим пользователем, выдаёт снимки позиций и постраничный список. Авторизованный интерфейс кабинета получает начальные данные на сервере, затем использует TanStack Query для обновления профиля, страниц истории и деталей заказа. Без настроенного окружения показывается только публичный preview, без личных данных. Checkout создаёт заказ и переводит покупателя на Stripe Checkout, когда настроены БД, Supabase и тестовый Stripe. Без них остаётся отдельный локальный просмотр формы без создания заказа. Admin API повторно проверяет Supabase-сессию и роль `admin` из БД для каждого запроса; панель управляет черновиками, публикацией, вариантами, остатками, фото и операционными статусами заказов. Архивация сохраняет товары с историей заказов. `DELETE /api/admin/products/[productId]` физически удаляет только неиспользуемый черновик; проверка ссылок из корзин и заказов и блокировка строк выполняются в транзакции. Задания очистки фото сохраняются в БД в той же транзакции, что и удаление товара или фото. Сразу после фиксации выполняется попытка удалить файлы через Supabase Storage; сбой оставляет задание для повторного запуска защищённым планировщиком `/api/internal/storage/cleanup`.

Локальный сценарий оплаты добавляет `/payment/demo` и `POST /api/payments/demo/complete`. Оба доступны только в режиме разработки и пользователю с серверной ролью `admin`: страница проверяет подписанную сессию и владельца заказа, а API направляет подписанное событие в общий `POST /api/payments/webhook`. Обычный покупатель не может создать или повторить локальный платёж; его корзина остаётся доступной до подключения карточного провайдера.

## Данные и состояния

В целевой backend-архитектуре PostgreSQL — единственный источник истины для товаров, вариантов, остатков, серверных корзин, заказов, платежей и webhook-событий. Prisma миграции версионируют схему. Деньги — integer minor units. Заказ создаётся транзакционно и сохраняет `OrderItem` snapshots.

Prisma schema, миграции и повторно запускаемый seed подготовлены; все четыре миграции применены к локальной тестовой базе PostgreSQL 17 и seed заполнен. Другие окружения требуют отдельного применения миграций. Когда `DATABASE_URL` настроен, главная, каталог, карточка товара, поиск, корзина и sitemap читают опубликованные товары через серверный слой и публичный API; без БД используется локальный демонстрационный каталог. Prisma 7 подключается к PostgreSQL через `@prisma/adapter-pg`; браузер не получает прямой доступ к таблицам. SQL-миграции включают RLS без клиентских политик, доступ к данным проходит только через серверные API. Административные фото загружаются в публичный bucket Supabase Storage `aqverine-products` через server-only service-role key; в БД сохраняется `storageKey`, а публичный API выдаёт только URL изображения. Для локального seed остаются `localPath`.

Гостевая корзина хранится в `localStorage`; после входа клиент передаёт SKU и количество в `POST /api/cart/merge` с устойчивым `mergeKey`. Сервер разрешает SKU в варианты, объединяет их с `Cart` в пределах остатка и идемпотентно фиксирует ключ. Серверная корзина читается через TanStack Query и управляется API; локальные строки удаляются только после успешного объединения. При checkout цена и остаток повторно берутся из БД, а не из клиентской корзины.

## Авторизация и безопасность

Supabase Auth управляет сессией в защищённых HTTP-only cookies с `SameSite=Lax` и `Secure` в production. Next.js proxy обновляет сессию перед закрытыми страницами; сервер сверяет пользователя через Supabase Auth и читает роль из PostgreSQL, не из пользовательских metadata. `/aqverine-control` проверяет роль `admin` при каждом запросе; будущие admin API обязаны повторить эту проверку. URL панели не является защитой. Изменяющие запросы проходят Zod, проверку Origin и Fetch Metadata; для входа, восстановления пароля, checkout и смены email действует ограничение частоты попыток. Ответ о запросе смены email не раскрывает, занят ли адрес. Для подтверждения нового email в Supabase Auth следует включить Secure Email Change и разрешить `/auth/callback` как redirect URL. Выход из аккаунта отзывает сессии на всех устройствах. Текущий limiter работает в памяти одного Node.js-процесса; перед масштабированием на несколько инстансов нужен общий store. Service-role key, payment keys и webhook secret доступны только на сервере.

## Оплата

Checkout зависит от интерфейса `PaymentProvider`, а не от SDK конкретного провайдера. Адаптер Stripe Checkout работает только с тестовым ключом `sk_test_`. Для локальной разработки доступен `LocalPaymentProvider` (`PAYMENT_PROVIDER=local`): он создаёт подписанную сессию, показывает `/payment/demo` только администратору и не принимает данные карты и не списывает деньги. Для покупателя оформление при этом провайдере закрыто на UI и API. Этот режим отключён в production. Заказ и snapshot позиций создаются в транзакции с атомарным резервированием остатков; `idempotencyKey` предотвращает повторное создание при повторной отправке формы. Только webhook с валидной подписью может изменить `Payment` и `Order` на `paid`; `PaymentWebhookEvent` делает обработку повторов идемпотентной. Страница результата читает статус через защищённый API и не подтверждает оплату сама. Повтор оплаты создаёт новый платёж для отменённого заказа после проверки цены и остатка. Отдельное задание с `CRON_SECRET` закрывает старые открытые сессии у провайдера; только подписанный webhook меняет статусы и освобождает резерв. Подробности — в `docs/payment-flow.md`.

## Деплой

Проект разворачивается как один Docker/Node.js сервис Next.js за reverse proxy с переменными окружения. PostgreSQL и Supabase — управляемые внешние сервисы. Требуются: health-check, миграция Prisma в release-процессе, HTTPS, резервное копирование БД и server-side логи с редактированием secrets. Отдельный Redis, очереди и микросервисы добавляются только когда появятся измеримые требования к rate limiting, фоновой обработке или нагрузке.

## Расширение

Новые возможности добавляются feature-модулем, миграцией Prisma и тестами. Новый платёжный провайдер реализует `PaymentProvider`. Новые интеграции остаются в `shared/lib` или своей feature. Изменение архитектуры обновляет этот файл; изменение БД — `docs/db-schema.md`; изменение payment flow — `docs/payment-flow.md`.
