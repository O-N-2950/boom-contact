FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Force remove old vite.config.ts if cached, use only vite.config.js
RUN rm -f vite.config.ts client/vite.config.ts

RUN npm run build

EXPOSE 3000

CMD ["npx", "tsx", "server/src/index.ts"]
