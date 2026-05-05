# Estágio de Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Força o build para modo Node SSR
RUN TANSTACK_START_TARGET=node npm run build || npm run build

# Estágio de Execução
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/package*.json ./
# Instala apenas dependências de produção para o servidor
RUN npm install --production
RUN npm install @hono/node-server hono
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.mjs"]
