FROM node:20-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy all source
COPY . .

# Build client (Vite)
RUN npx vite build --config vite.config.mjs

# Expose
EXPOSE 3000

# Start with tsx (handles TypeScript + ESM natively)
CMD ["npx", "tsx", "server/src/index.ts"]
