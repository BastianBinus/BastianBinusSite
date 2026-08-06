FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production || npm install --production --legacy-peer-deps

COPY . .

RUN mkdir -p /app/data

EXPOSE 8080
CMD ["node", "server.js"]
