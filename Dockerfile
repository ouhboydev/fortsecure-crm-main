# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

FROM node:22-slim AS builder
WORKDIR /app

# Adicione estas linhas logo no início do estágio de build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Exponha-as como variáveis de ambiente para que o processo 'npm run build' as enxergue
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

COPY package*.json ./
RUN npm install
COPY . .

# Verificação de depuração (Opcional: imprime no log se a variável está presente - não exibe o valor por segurança)
RUN if [ -z "$VITE_SUPABASE_URL" ]; then echo "ERRO: VITE_SUPABASE_URL não definida!"; exit 1; fi

RUN TANSTACK_START_TARGET=node npm run build || npm run build

# Estágio de Execução
FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --production
RUN npm install @hono/node-server hono
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

EXPOSE 3000
CMD ["node", "server.mjs"]