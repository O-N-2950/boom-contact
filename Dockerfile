FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source
COPY . .

# Build client (Vite + Tailwind v3 PostCSS)
RUN npm run build

EXPOSE 3000

# Run server via tsx (no TypeScript compilation required)
CMD ["npx", "tsx", "server/src/index.ts"]
