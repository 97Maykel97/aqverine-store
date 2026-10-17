# Журнал прогресса AQVERINE

## 2026-10-17 — Каркас проекта и локальная конфигурация

- Подготовлены структура `src/app`, feature-модули, shared-слои, Prisma migrations и тесты без реализации бизнес-логики.
- Выбран единый Next.js-монолит; добавлены зависимости Prisma, Supabase, TanStack Query, React Hook Form, Zod, Sass и Vitest.
- Изменены `package.json`, `package-lock.json`, `.env.example`, `README.md`, `docs/technologies.md`, файл ТЗ, `.gitkeep`-файлы структуры и `docs/progress.md`.
- Добавлены env-переменные: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYMENT_PROVIDER_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`.
- Изменения БД: создана только папка Prisma migrations; schema и миграции ещё не реализованы.

## 2026-10-17 — Дизайн-система AQVERINE

- Создана дизайн-спецификация `Design.md` для публичного магазина, checkout и admin-панели.
- Выбрано направление editorial luxury e-commerce с тёплой нейтральной палитрой, прямой геометрией и приоритетом предметной фотографии.
- Изменены `Design.md` и `docs/progress.md`.
- Новые переменные окружения: отсутствуют.
- Изменения БД: отсутствуют.

## 2026-10-17 — Production-архитектура

- Архитектура дополнена практической схемой взаимодействия браузера, Next.js, PostgreSQL, Supabase и платежей.
- Выбран модульный монолит: один deployable Next.js-сервис без преждевременных микросервисов и очередей.
- Изменены `docs/architecture.md` и `docs/progress.md`.
- Новые переменные окружения: отсутствуют.
- Изменения БД: отсутствуют.

## 2026-10-17 — Локализация документации

- Переведены внутренние документы AQVERINE на русский язык.
- Сохранены технические идентификаторы, пути, команды и названия моделей на английском.
- Изменены `docs/architecture.md`, `docs/db-schema.md`, `docs/payment-flow.md` и `docs/progress.md`.
- Новые переменные окружения: отсутствуют.
- Изменения БД: обновлена только документация; Prisma schema и migrations не создавались.
