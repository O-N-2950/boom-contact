FROM node:20-alpine

WORKDIR /app

# Copy lockfile first — cache bust when deps change
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build React client (Tailwind v3 PostCSS)
RUN npm run build

EXPOSE 3000

# Start server via tsx (no TypeScript compilation needed)
CMD ["npx", "tsx", "server/src/index.ts"]
