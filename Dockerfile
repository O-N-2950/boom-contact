# node:20.19-alpine — version précise pour invalider le cache Docker Railway
FROM node:20.19-alpine

WORKDIR /app

# Force Node.js stdout/stderr to be unbuffered in Docker
ENV NODE_OPTIONS="--no-warnings"
ENV FORCE_COLOR=1

COPY package.json package-lock.json* ./

RUN npm ci --no-fund --no-audit

COPY . .

# Vite choisit .ts avant .js — on supprime l'ancien .ts qui a @tailwindcss/vite
RUN rm -f vite.config.ts

# cache-bust: 2026-03-21-fix-trpc-imports
RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
