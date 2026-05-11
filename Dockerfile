# Estágio de Build
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Definição dos Argumentos de Build (necessários para o Vite injetar no dist)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
# Se o seu projeto usa essa chave específica do seu histórico de automação:
ARG VITE_SUPABASE_PUBLISHABLE_KEY 

# Transformando ARGs em ENVs para o processo de build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# Executa o build (o Vite lerá as ENVs acima e as gravará no código estático)
RUN TANSTACK_START_TARGET=node npm run build || npm run build

# Estágio de Execução
FROM node:22-slim
WORKDIR /app

# Copia apenas o necessário do estágio anterior
COPY --from=builder /app/package*.json ./
RUN npm install --production
RUN npm install @hono/node-server hono
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

# Variáveis de Runtime (opcional se o servidor Hono precisar ler algo)
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.mjs"]