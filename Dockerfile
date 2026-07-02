# ---- Stage 1: assembly ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: production ----
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

COPY src/engines/bin ./dist/engines/bin
RUN chmod +x ./dist/engines/bin/stockfish-18 \
    ./dist/engines/bin/komodo-14.1 \
    ./dist/engines/bin/dragon-1

COPY uploads ./uploads

EXPOSE 3000

CMD ["node", "dist/index.js"]