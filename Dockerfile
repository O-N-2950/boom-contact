FROM node:20-alpine

WORKDIR /app

# ── Layer 1: Invalidate cache quand package.json change ──
COPY package.json package-lock.json ./

# Force clean install — évite les résidus de cache Railway
RUN npm ci --no-fund --no-audit

# ── Layer 2: Source code ──
COPY . .

# ── Layer 3: Build React (Tailwind v3 + Vite) ──
RUN npm run build

EXPOSE 3000

# Start via tsx (TypeScript direct, pas de compile step)
CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
