# boom.contact — Dockerfile Session 12
# node:20.19-alpine + Chromium pour Puppeteer (sketch renderer)
FROM node:20.19-alpine

WORKDIR /app

# Chromium et dépendances pour Puppeteer headless sur Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-cjk

# Variables Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_OPTIONS="--no-warnings" \
    FORCE_COLOR=1

COPY package.json package-lock.json* ./

RUN npm ci --no-fund --no-audit

COPY . .

# Copier sketch-engine.js dans les assets serveur
RUN mkdir -p server/src/assets

# Vite choisit .ts avant .js — on supprime lancien .ts qui a @tailwindcss/vite
RUN rm -f vite.config.ts

# cache-bust: 2026-03-22-session12-puppeteer
RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]

