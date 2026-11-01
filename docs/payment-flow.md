# Платёжный поток

```text
Checkout авторизованного покупателя
-> сервер проверяет корзину, цены и остатки в транзакции Serializable
-> сервер резервирует остатки и создаёт Order со статусом pending_payment, snapshot OrderItem и Payment
-> StripePaymentProvider создаёт тестовую Stripe Checkout Session для карт Visa/Mastercard
-> пользователь переходит на защищённую страницу Stripe
-> Stripe отправляет webhook
-> сервер проверяет подпись по raw body и PAYMENT_WEBHOOK_SECRET
-> сервер идемпотентно обновляет Payment и Order
-> страница возврата читает статус заказа через защищённый API покупателя
```

`POST /api/checkout` принимает Zod-проверенные контакты и UUID `idempotencyKey`. Повтор с тем же ключом возвращает существующую открытую Stripe Session, если она ещё доступна. Создание Stripe Session использует ID платежа как ключ идемпотентности провайдера. Для тестового режима требуются `PAYMENT_PROVIDER_SECRET_KEY=sk_test_...`, `PAYMENT_WEBHOOK_SECRET=whsec_...`, `NEXT_PUBLIC_APP_URL` и действующая конфигурация PostgreSQL/Supabase. Значения ключей не помещаются в Git.

Webhook принимает только подписанное событие Stripe. `checkout.session.completed` помечает заказ оплаченным лишь при `payment_status=paid`; `checkout.session.async_payment_failed` и `checkout.session.expired` переводят его в неуспешное или отменённое состояние и возвращают зарезервированный остаток; полное `charge.refunded` переводит оплаченный заказ в `refunded`. `PaymentWebhookEvent` хранит уникальный `(provider, providerEventId)`, поэтому повтор события не повторяет переход и не создаёт новый заказ. Подпись, сумма, валюта, ID платежа и допустимость перехода проверяются до изменения заказа.

Провайдерские ключи, webhook secret, PAN и CVV остаются только на сервере. Невалидная подпись получает `401` или `403`. Страница возврата не меняет платёжный статус: она показывает текущий статус из `GET /api/account/orders/[orderId]` только владельцу заказа и повторно запрашивает ожидающий статус. Отсутствие webhook оставляет заказ в `pending_payment`; для автоматического освобождения зависших сессий в будущем нужен отдельный фоновый процесс.
