# Правила безопасности и API

- Никогда не коммитьте `.env.local`; secrets никогда не получают префикс `NEXT_PUBLIC_`.
- Учётные данные Supabase service-role, payment keys и webhook secrets доступны только серверу.
- Валидируйте любой внешний input через Zod.
- Применяйте rate limiting к login, password reset и payment endpoints.
- Возвращайте безопасные ошибки без stack traces, secrets, внутренних ID, платёжных или персональных данных.
- Проверяйте авторизацию в каждом изменяющем или чувствительном endpoint.
- Логируйте server failures с редактированием данных и не передавайте клиенту сырые ошибки провайдера.
- Роли — `user` и `admin`; проверяйте сессию и роль server-side для `/aqverine-control` и всех admin API.
- Используйте защищённые HTTP-only cookies для сессий. Password-reset flow использует одноразовые токены и не раскрывает существование email.
- Непредсказуемый URL никогда не является механизмом авторизации.
