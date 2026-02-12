FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "npm run migration:run && node dist/database/seeds/seed-users.js && node dist/database/seeds/seed-books.js && npm run start:prod"]
