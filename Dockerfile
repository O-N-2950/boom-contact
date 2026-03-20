FROM node:20-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build client only (server runs via tsx)
RUN npm run build

# Expose port
EXPOSE 3000

# Start server directly with tsx (no TypeScript compilation needed)
CMD ["npx", "tsx", "server/src/index.ts"]
