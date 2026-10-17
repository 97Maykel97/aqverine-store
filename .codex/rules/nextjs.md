# Правила Next.js

- По умолчанию используйте App Router и Server Components.
- Держите secrets и привилегированные интеграции только на сервере.
- Используйте Route Handlers только как валидируемые и авторизованные transport boundaries.
- Определяйте metadata в route segments и поддерживайте предсказуемые loading/error boundaries.
- Не переносите server data fetching в клиентский компонент без необходимости интерактивности.
- Владение маршрутами оставляйте в `src/app`; не размещайте route decisions внутри feature UI.
- Валидируйте dynamic params и search params на серверной границе.
- Защищайте `/aqverine-control` и каждый admin Route Handler server-side проверкой роли.
- Осознанно используйте `notFound`, redirects, metadata, файлы `loading` и `error`.
- Не считайте непредсказуемый URL авторизацией.
