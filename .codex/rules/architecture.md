# Правила архитектуры

- Размещайте маршруты, layouts, metadata, providers и Route Handlers в `src/app`.
- Держите каждую feature в `src/features/<feature>/{api,model,ui}`.
- Размещайте общие типы, утилиты, constants и переиспользуемые UI primitives в `src/shared`.
- Используйте alias `@/*`.
- По умолчанию используйте Server Components. Добавляйте Client Components только для браузерных API или интерактивности.
- Не смешивайте доменную логику, запросы данных и большой UI в одном компоненте.
- Перед архитектурными изменениями читайте `docs/architecture.md`.
