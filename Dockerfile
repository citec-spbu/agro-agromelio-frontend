# Dev-контейнер: Quasar dev + прокси /api на VUE_APP_GATEWAY_URL (см. docker-compose environment).
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci 2>/dev/null || npm install

COPY . .

EXPOSE 9000

# host для dev-сервера задаётся в quasar.config.js (0.0.0.0 — для проброса порта из контейнера)
CMD ["npm", "run", "dev"]
