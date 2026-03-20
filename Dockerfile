FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node_modules/.bin/tsx", "server/src/index.ts"]
