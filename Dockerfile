# boom.contact — Dockerfile (multistage build)
# Stage 1: Builder — install deps + build client + compile server
# Stage 2: Production — minimal image with compiled JS only

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

# Variables analytics build-time : Vite inline import.meta.env.VITE_* au build.
# Railway fournit les variables de service comme build args ; on les déclare ici pour
# que `vite build` les reçoive (sinon PostHog/GA4/Sentry sont éliminés du bundle).
# Valeurs publiques côté client (clé projet PostHog, ID GA4, DSN Sentry) — pas des secrets serveur.
ARG VITE_POSTHOG_KEY=""
ARG VITE_POSTHOG_HOST=""
ARG VITE_GA4_ID=""
ARG VITE_SENTRY_DSN=""
ENV VITE_POSTHOG_KEY=$VITE_POSTHOG_KEY \
    VITE_POSTHOG_HOST=$VITE_POSTHOG_HOST \
    VITE_GA4_ID=$VITE_GA4_ID \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Build client (Vite) + server (tsc)
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

# Copy production deps + native modules (canvas.node) from builder
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-fund --no-audit --ignore-scripts
# Canvas native addon was compiled in builder stage — copy it over
COPY --from=builder /app/node_modules/canvas/build ./node_modules/canvas/build

# Copy built artifacts only (no source TypeScript needed)
COPY --from=builder /app/dist ./dist
# Copy embedded fonts for PDF RTL support (Arabic, Hebrew)
COPY --from=builder /app/server/src/services/fonts ./dist/server/fonts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/build-server.mjs ./build-server.mjs

# Security: don't run as root in production
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Healthcheck — ensures container is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use compiled JS directly — no tsx in production
# Graceful shutdown: Node handles SIGTERM natively with server.close()
CMD ["node", "dist/server/index.js"]
