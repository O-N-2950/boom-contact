# boom.contact — Dockerfile Session 12
# node:20.19-alpine + Chromium (Puppeteer) + Cairo (canvas OSM)
FROM node:20.19-alpine

WORKDIR /app

# Chromium pour Puppeteer headless
RUN apk add --no-cache \
    chromium nss freetype harfbuzz ca-certificates \
    ttf-freefont font-noto font-noto-cjk

# Cairo/Canvas pour rendu OSM tiles server-side
RUN apk add --no-cache \
    cairo-dev pango-dev libjpeg-turbo-dev giflib-dev \
    python3 make g++ pkgconfig

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_OPTIONS="--no-warnings" \
    FORCE_COLOR=1

COPY package.json package-lock.json* ./

# npm install résout puppeteer-core + canvas
RUN npm install --no-fund --no-audit

COPY . .

RUN mkdir -p server/src/assets
RUN rm -f vite.config.ts

# cache-bust: 2026-03-22-session12-osm-canvas
RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]

