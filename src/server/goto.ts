import { createServerFn } from '@tanstack/react-start';

export const getGoToMeetings = createServerFn({ method: 'GET' })
  .handler(async () => {
    // Compatibilidade com Vite (import.meta.env) e Node (process.env)
    const clientId = process.env.VITE_GOTO_CLIENT_ID || import.meta.env?.VITE_GOTO_CLIENT_ID;
    const clientSecret = process.env.VITE_GOTO_CLIENT_SECRET || import.meta.env?.VITE_GOTO_CLIENT_SECRET;
    const pat = process.env.VITE_GOTO_PAT || import.meta.env?.VITE_GOTO_PAT;
    
    if (!clientId || !clientSecret || !pat) {
      throw new Error('VITE_GOTO_CLIENT_ID, VITE_GOTO_CLIENT_SECRET ou VITE_GOTO_PAT não configurados no .env. Crie um PAT no painel do GoTo e adicione VITE_GOTO_PAT.');
    }

    // 1. Obter Access Token via Personal Access Token
    const authString = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://authentication.logmeininc.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: `grant_type=personal_access_token&pat=${pat}`
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      throw new Error(`Falha ao obter token GoTo: ${err}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Usar o token para buscar reuniões
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(`https://api.getgo.com/G2M/rest/historicalMeetings?startDate=${startDate}&endDate=${endDate}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erro na API do GoTo: ${errorData}`);
    }

    const data = await response.json();
    return data;
  });
