# boom.contact — Dockerfile (multistage build)
# Stage 1: Builder — install deps + build
# Stage 2: Production — minimal image

# ── Stage 1: Builder ─────────────────────────────────────────
FROM node:20.19-alpine AS builder

WORKDIR /app

# System deps for canvas (Cairo) and Puppeteer (Chromium)
RUN apk add --no-cache \
    chromium nss freetype harfbuzz ca-certificates \
    ttf-freefont font-noto font-noto-cjk \
    cairo-dev pango-dev libjpeg-turbo-dev giflib-dev \
    python3 make g++ pkgconfig

COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY . .
RUN rm -f vite.config.ts
RUN mkdir -p server/src/assets
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────
FROM node:20.19-alpine AS production

WORKDIR /app

# Runtime deps only (no build tools)
RUN apk add --no-cache \
    chromium nss freetype harfbuzz ca-certificates \
    ttf-freefont font-noto font-noto-cjk \
    cairo pango libjpeg-turbo giflib

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_OPTIONS="--no-warnings" \
    NODE_ENV=production \
    FORCE_COLOR=1

# Copy built artifacts and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Security: don't run as root in production
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
