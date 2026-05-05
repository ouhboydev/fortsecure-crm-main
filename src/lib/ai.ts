export async function generateGeminiInsights(metrics: any, riskyDeals: any[]) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey.length < 20) {
    throw new Error("API Key do Gemini não detectada. Verifique seu arquivo .env e reinicie o servidor.");
  }

  const prompt = `
    Você é a Inteligência de Comando da FortSecure.
    Analise os dados e forneça um relatório executivo conciso em Markdown.

    DADOS:
    - Receita: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.revenue)}
    - Meta: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.goal)}
    - Forecast: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.forecast)}
    - Oportunidades: ${metrics.pipelineCount}
    
    VETORES DE RISCO:
    ${riskyDeals.length > 0
      ? riskyDeals.map(d => `- ${d.client_name}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.value)} (Prob: ${d.probability}%)`).join('\n')
      : 'Nenhum risco detectado.'}

    REQUISITOS:
    1. Comece direto no sumário de "Estado de Prontidão".
    2. Analise o GAP entre Receita e Meta.
    3. Sugira manobras para os deals em risco.
    4. NÃO inclua saudações (Olá, Bom dia), apresentações ou assinaturas (Atenciosamente, etc).
    5. NÃO invente dados.
    
    Responda apenas com o conteúdo do relatório em Português Brasileiro.
  `;

  try {
    // Usando gemini-1.5-flash que é o modelo mais estável e disponível
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("O modelo não retornou dados. Verifique sua cota no Google AI Studio.");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    console.error("Erro IA:", error);
    throw new Error(error.message || "Falha na conexão com a IA.");
  }
}
