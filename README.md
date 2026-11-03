# AQVERINE

Интернет-магазин одежды на Next.js App Router.

Публичная витрина пока использует локальный каталог. При настроенных PostgreSQL, Supabase и тестовом Stripe авторизованная корзина, checkout, оплата, кабинет и закрытая admin-панель работают через серверные API. Без сервисов вход отвечает безопасным сообщением о недоступности, а формы показывают только просмотр без создания заказа. Миграции ещё не применены к PostgreSQL.

## Команды

```bash
npm run dev
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run db:validate
npm run test:browser -- http://127.0.0.1:3000
```

Для работы с БД укажите прямое PostgreSQL-подключение `DATABASE_URL` в `.env.local` (не коммитьте файл). Затем выполните `npm run db:deploy` и `npm run db:seed`. Первый создаёт таблицы, второй один раз заполняет каталог; повторный seed не перезаписывает отредактированные товары. Без `DATABASE_URL` эти команды не применяются. Подробности — в `docs/db-schema.md`.

Для авторизации также задайте `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` и `NEXT_PUBLIC_APP_URL`, затем пересоберите приложение. В настройках Supabase Auth включите подтверждение email и разрешите callback URL `<адрес сайта>/auth/callback` и `<адрес сайта>/auth/callback?next=/account/update-password`. После подтверждения email пользователь должен войти хотя бы один раз: сервер создаст его строку `User` с ролью `user`. Назначить роль `admin` существующему подтверждённому пользователю может только оператор с доступом к серверу: `npm run db:grant-admin -- --user-id <supabase-user-uuid> --confirm`. Значения ключей и строку подключения храните только в локальном окружении или секретах платформы.

Для admin-фотографий создайте в Supabase Storage публичный bucket `aqverine-products` и задайте `SUPABASE_SERVICE_ROLE_KEY` только на сервере. Панель принимает JPEG, PNG и WebP до 5 МБ; изображения загружаются серверным маршрутом, а публичный API выдаёт URL без service-role key. Для тестовой оплаты укажите серверные `PAYMENT_PROVIDER_SECRET_KEY` (`sk_test_...`) и `PAYMENT_WEBHOOK_SECRET` (`whsec_...`), настройте Stripe webhook на `<адрес сайта>/api/payments/webhook` и используйте только тестовый режим Stripe. Возврат со Stripe сам по себе не подтверждает оплату: статус меняет проверенный webhook.

## Перед публикацией

Задайте `NEXT_PUBLIC_APP_URL` с публичным HTTPS-адресом сайта и проверьте `robots.txt`, `sitemap.xml` и canonical URL. Пока переменная не задана, `robots.txt` намеренно закрывает сайт от индексации; локальное значение `http://localhost:3000` из `.env.example` нельзя оставлять в production.

## Документация

- `docs/technical-specification-clothing-store.md` — техническое задание;
- `docs/technologies.md` — выбранные технологии;
- `docs/architecture.md` — архитектура;
- `Design.md` — дизайн-система.
