# boom.contact — Dockerfile Session 12
# node:20.19-alpine + Chromium pour Puppeteer headless
FROM node:20.19-alpine

WORKDIR /app

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    font-noto-cjk

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_OPTIONS="--no-warnings" \
    FORCE_COLOR=1

COPY package.json package-lock.json* ./

# npm install (pas npm ci) pour résoudre puppeteer-core absent du lock
RUN npm install --no-fund --no-audit

COPY . .

RUN mkdir -p server/src/assets

RUN rm -f vite.config.ts

# cache-bust: 2026-03-22-session12-npm-install
RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]

