# AQVERINE

Интернет-магазин одежды на Next.js App Router.

При настроенных PostgreSQL, Supabase и тестовом Stripe публичная витрина, авторизованная корзина, checkout, оплата, кабинет и закрытая admin-панель работают через серверные API. Без сервисов витрина показывает локальный демонстрационный каталог, вход отвечает безопасным сообщением о недоступности, а формы не создают заказ. Миграции ещё не применены к PostgreSQL.

## Команды

```bash
npm run dev
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run db:validate
npm run test:browser -- http://localhost:3000
```

Для работы с БД укажите прямое PostgreSQL-подключение `DATABASE_URL` в `.env.local` (не коммитьте файл). Затем выполните `npm run db:deploy` и `npm run db:seed`. Первый создаёт таблицы, второй один раз заполняет каталог; повторный seed не перезаписывает отредактированные товары. Без `DATABASE_URL` эти команды не применяются. Подробности — в `docs/db-schema.md`.

Для авторизации также задайте `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` и `NEXT_PUBLIC_APP_URL`, затем пересоберите приложение. В настройках Supabase Auth включите подтверждение email и Secure Email Change, разрешите callback URL `<адрес сайта>/auth/callback` и `<адрес сайта>/auth/callback?next=/account/update-password`. `POST /api/account/email` принимает JSON `{ "email": "new@example.com" }` только от авторизованного пользователя и отправляет подтверждение через Supabase; текущий адрес действует до подтверждения. После подтверждения регистрации пользователь должен войти хотя бы один раз: сервер создаст его строку `User` с ролью `user`. Назначить роль `admin` существующему подтверждённому пользователю может только оператор с доступом к серверу: `npm run db:grant-admin -- --user-id <supabase-user-uuid> --confirm`. Значения ключей и строку подключения храните только в локальном окружении или секретах платформы.

Для admin-фотографий создайте в Supabase Storage публичный bucket `aqverine-products` и задайте `SUPABASE_SERVICE_ROLE_KEY` только на сервере. Панель принимает JPEG, PNG и WebP до 5 МБ; изображения загружаются серверным маршрутом, а публичный API выдаёт URL без service-role key. Для тестовой оплаты укажите серверные `PAYMENT_PROVIDER_SECRET_KEY` (`sk_test_...`) и `PAYMENT_WEBHOOK_SECRET` (`whsec_...`), настройте Stripe webhook на `<адрес сайта>/api/payments/webhook` и используйте только тестовый режим Stripe. Возврат со Stripe сам по себе не подтверждает оплату: статус меняет проверенный webhook.

Для закрытия зависших открытых Stripe Checkout Session задайте на сервере отдельный `CRON_SECRET` (случайная строка от 32 символов) и настройте внешний планировщик на `POST <адрес сайта>/api/internal/payments/expire-stale` с заголовком `Authorization: Bearer <CRON_SECRET>`. Рекомендуемый интервал — 5 минут. Задание закрывает сессии старше 25 минут у Stripe; статус платежа и резерв товара меняются только после подписанного webhook. Если webhook не доставлен, проверьте доставку события в Stripe и повторите её. Не размещайте `CRON_SECRET` в браузере или Git.

## Перед публикацией

Задайте `NEXT_PUBLIC_APP_URL` с публичным HTTPS-адресом сайта и проверьте `robots.txt`, `sitemap.xml` и canonical URL. Пока переменная не задана, `robots.txt` намеренно закрывает сайт от индексации; локальное значение `http://localhost:3000` из `.env.example` нельзя оставлять в production.

## Документация

- `docs/technical-specification-clothing-store.md` — техническое задание;
- `docs/technologies.md` — выбранные технологии;
- `docs/architecture.md` — архитектура;
- `Design.md` — дизайн-система.
