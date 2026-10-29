# AQVERINE

Каркас интернет-магазина одежды на Next.js App Router.

Каталог и корзина пока используют локальные данные; оформление заказа и оплата не подключены к серверу. Серверные маршруты Supabase Auth для входа, регистрации, восстановления и смены пароля подготовлены. Без настроенных Supabase и PostgreSQL вход отвечает безопасным сообщением о недоступности, а кабинет показывает открытый предпросмотр. Prisma-миграция ещё не применена к PostgreSQL.

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

## Перед публикацией

Задайте `NEXT_PUBLIC_APP_URL` с публичным HTTPS-адресом сайта и проверьте `robots.txt`, `sitemap.xml` и canonical URL. Пока переменная не задана, `robots.txt` намеренно закрывает сайт от индексации; локальное значение `http://localhost:3000` из `.env.example` нельзя оставлять в production.

## Документация

- `docs/technical-specification-clothing-store.md` — техническое задание;
- `docs/technologies.md` — выбранные технологии;
- `docs/architecture.md` — архитектура;
- `Design.md` — дизайн-система.
