FROM node:20-alpine

WORKDIR /app

# ── Cache bust: change this value to force full rebuild ──────
ARG CACHE_BUST=2026-03-20-v3
RUN echo "Build: $CACHE_BUST"

# ── Delete any stale config that could conflict ──────────────
# (vite.config.ts coexists with vite.config.js — Vite picks ts first)
# We keep only vite.config.js (CJS-compatible)

# ── Layer 1: install deps ────────────────────────────────────
COPY package.json ./
COPY package-lock.json* ./

RUN npm ci --no-fund --no-audit --prefer-offline || npm install --no-fund --no-audit

# ── Layer 2: source ──────────────────────────────────────────
COPY . .

# Remove vite.config.ts — keep only vite.config.js (ESM-safe)
RUN rm -f vite.config.ts

# ── Layer 3: build ───────────────────────────────────────────
RUN npm run build

EXPOSE 3000

CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
