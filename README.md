# AQVERINE

Каркас интернет-магазина одежды на Next.js App Router.

Сейчас публичные страницы работают как frontend-демо: каталог и корзина используют локальные данные, а вход, заказы и оплата не подключены к серверу.

## Команды

```bash
npm run dev
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:browser -- http://127.0.0.1:3000
```

## Перед публикацией

Задайте `NEXT_PUBLIC_APP_URL` с публичным HTTPS-адресом сайта и проверьте `robots.txt`, `sitemap.xml` и canonical URL. Пока переменная не задана, `robots.txt` намеренно закрывает сайт от индексации; локальное значение `http://localhost:3000` из `.env.example` нельзя оставлять в production.

## Документация

- `docs/technical-specification-clothing-store.md` — техническое задание;
- `docs/technologies.md` — выбранные технологии;
- `docs/architecture.md` — архитектура;
- `Design.md` — дизайн-система.
