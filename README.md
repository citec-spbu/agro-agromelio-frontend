# agro-agromelio-frontend

Клиентское приложение (Quasar + Vue) для работы с полями, сезонами, ДЗЗ и аналитикой.

## Стек
- Quasar (Vue 3)
- Docker / Docker Compose
- Nginx (для контейнерного окружения)

## Быстрый запуск
```bash
docker network create agronetwork 2>/dev/null || true
docker compose up -d --build
```

Приложение будет доступно по адресу `http://localhost:9000/#/`.

## Переменные окружения
Основные параметры задаются в `.env`.

Ключевые переменные:
- `VUE_APP_GATEWAY_URL` - URL API gateway;
- `VUE_APP_ANALYTICS_MFE_URL` - URL аналитического микрофронта;
- `VUE_APP_IOT_DASHBOARD_URL` - публичный URL отдельного IoT dashboard для iframe;
- `VUE_APP_IOT_API_BASE_URL` - публичный base URL gateway, который передается dashboard.

## Полезные команды
```bash
npm run dev
npm run test:ci
npm run build
```
