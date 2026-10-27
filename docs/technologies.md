# Технологии AQVERINE

| Технология | Назначение |
| --- | --- |
| Next.js App Router + React | full-stack маршрутизация, Server Components и Route Handlers |
| TypeScript strict | безопасные контракты и типы |
| SCSS Modules | изолированные стили компонентов |
| PostgreSQL + Prisma | данные, миграции и транзакции |
| Supabase Auth + Storage | авторизация и медиа товаров |
| React Hook Form + Zod | формы и валидация |
| TanStack Query | client server-state |
| Vitest | запуск unit-, integration- и component-тестов |
| React Testing Library + jsdom | проверка взаимодействий React-компонентов и клиентских потоков без браузерного сервера |
| Playwright Test + Google Chrome | E2E-проверка связки карточки товара и корзины в реальном браузере на desktop и mobile |
| Playwright Core | браузерная проверка основных сценариев на разных разрешениях |

Платёжный провайдер не фиксируется: интеграция строится через интерфейс `PaymentProvider` для Visa/Mastercard.

## Команды тестирования

- `npm test` или `npm run test:run` — весь набор Vitest-тестов.
- `npm run test:unit` — unit-тесты моделей и схем.
- `npm run test:integration` — связка гостевой корзины с checkout.
- `npm run test:component` — взаимодействия с React-компонентами.
- `npm run test:e2e` — сборка приложения и Playwright E2E-тесты корзины. Команда сама запускает отдельный production-сервер на `http://127.0.0.1:3101`; требуется установленный Google Chrome. Скриншоты и трассировки сохраняются во временной системной папке, а не в репозитории.
- `npm run test:browser -- http://127.0.0.1:3000` — браузерный smoke-сценарий для запущенного приложения; выполняется отдельно от Vitest.

Component- и integration-тесты используют `jsdom` только в соответствующих файлах. Пока серверные сценарии авторизации, заказов и платежей не реализованы, тесты проверяют существующий frontend и не имитируют подтверждённую оплату.
