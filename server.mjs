import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Pega o caminho do diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

// 1. Serve os arquivos estáticos (CSS, JS do cliente, imagens)
app.use('/assets/*', serveStatic({ root: './dist/client' }));
app.use('/logo.png', serveStatic({ path: './dist/client/logo.png' }));

// 2. Importa o build do servidor do TanStack Start
// Nota: Este arquivo é gerado pelo build:ssr
import serverEntry from './dist/server/server.js';

// 3. Passa todas as outras requisições para o roteador do TanStack
app.all('*', async (c) => {
  return await serverEntry.fetch(c.req.raw);
});

const port = Number(process.env.PORT) || 3000;
console.log(`🚀 Servidor rodando em http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port: port
});
