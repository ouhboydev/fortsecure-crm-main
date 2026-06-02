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

export async function analyzeActivityNote(note: string, activityType: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const fallbackHeuristics = (n: string, t: string) => {
    const lower = n.toLowerCase();
    let sentiment = "neutro";
    let outcome = "Interação registrada";
    let nextActionTitle = "Acompanhamento";
    let nextActionType = "ligacao";
    let daysToNextAction = 3;

    if (lower.includes("gostou") || lower.includes("interessou") || lower.includes("enviar proposta") || lower.includes("proposta") || lower.includes("comprar")) {
      sentiment = "quente";
      outcome = "Interesse confirmado / Pedido de proposta";
      nextActionTitle = "Enviar Proposta Comercial";
      nextActionType = "email";
      daysToNextAction = 2;
    } else if (lower.includes("caro") || lower.includes("pensar") || lower.includes("duvida") || lower.includes("objeção") || lower.includes("dificil")) {
      sentiment = "morno";
      outcome = "Objeções ou dúvidas apresentadas";
      nextActionTitle = "Ligar para acompanhamento";
      nextActionType = "ligacao";
      daysToNextAction = 3;
    } else if (lower.includes("não quer") || lower.includes("recusou") || lower.includes("cancelar") || lower.includes("sem orçamento") || lower.includes("sem interesse")) {
      sentiment = "frio";
      outcome = "Sem interesse ou impedimento";
      nextActionTitle = "Nutrir lead futuramente";
      nextActionType = "email";
      daysToNextAction = 15;
    } else if (lower.includes("caixa postal") || lower.includes("não atendeu") || lower.includes("sem contato") || lower.includes("não responde")) {
      sentiment = "neutro";
      outcome = "Sem contato estabelecido";
      nextActionTitle = "Enviar mensagem de acompanhamento";
      nextActionType = "whatsapp";
      daysToNextAction = 1;
    } else {
      if (t === "reuniao" || t === "visita") {
        nextActionTitle = "Enviar ata e próximos passos";
        nextActionType = "email";
        daysToNextAction = 1;
      }
    }

    return { sentiment, outcome, nextActionTitle, nextActionType, daysToNextAction };
  };

  if (!apiKey || apiKey.length < 20) {
    return fallbackHeuristics(note, activityType);
  }

  const prompt = `
    Você é um assistente de inteligência comercial integrado ao CRM.
    Analise o seguinte registro de atividade feito por um vendedor:
    Tipo de atividade realizada: ${activityType}
    Notas do vendedor: "${note}"

    Com base no texto acima, determine estruturadamente:
    1. O sentimento/engajamento atual do cliente. Escolha estritamente entre: "quente" (muito interessado, pediu proposta/reunião, quer avançar), "morno" (interessado mas com dúvidas/objeções, pediu tempo, indeciso), "frio" (desinteressado, recusou, sem verba) ou "neutro" (contato administrativo, sem definição clara).
    2. O desfecho da atividade em poucas palavras (ex: "Sem contato", "Apresentação realizada", "Pediu orçamento", "Aguardando aprovação").
    3. O título curto da próxima melhor ação a ser tomada (ex: "Enviar proposta comercial", "Ligar para contornar objeção", "Agendar reunião técnica").
    4. O tipo da próxima ação. Escolha estritamente entre: "ligacao", "email", "reuniao", "tarefa", "visita", "followup", "whatsapp".
    5. Em quantos dias a próxima ação deve ocorrer (um número inteiro, ex: 1, 2, 3, 7, 15).

    Responda APENAS com um objeto JSON válido, sem qualquer formatação markdown ou textos adicionais, no seguinte formato:
    {
      "sentiment": "quente" | "morno" | "frio" | "neutro",
      "outcome": "Resumo do desfecho",
      "nextActionTitle": "Título da próxima ação",
      "nextActionType": "ligacao" | "email" | "reuniao" | "tarefa" | "visita" | "followup" | "whatsapp",
      "daysToNextAction": 3
    }
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Sem conteúdo da IA");
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Erro na análise da IA:", error);
    return fallbackHeuristics(note, activityType);
  }
}

