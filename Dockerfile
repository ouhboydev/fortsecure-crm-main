# Estágio de Build
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# --- ADICIONE ESTAS LINHAS AQUI ---
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
# --------------------------------

# Força o build para modo Node SSR
RUN TANSTACK_START_TARGET=node npm run build || npm run build

# Estágio de Execução
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --production
RUN npm install @hono/node-server hono
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

CMD ["node", "server.mjs"]
