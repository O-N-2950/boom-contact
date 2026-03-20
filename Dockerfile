# node:20.19-alpine — version précise pour invalider le cache Docker Railway
FROM node:20.19-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --no-fund --no-audit

COPY . .

# Vite choisit .ts avant .js — on supprime l'ancien .ts qui a @tailwindcss/vite
RUN rm -f vite.config.ts

RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
