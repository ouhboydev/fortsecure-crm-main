// Edge function: gera insights comerciais via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics, riskyCount } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const prompt = `Você é um analista comercial sênior. Analise os dados e dê 4-6 insights ACIONÁVEIS em português, em bullets curtos. Inclua: previsão de fechamento do mês, risco da meta, gargalos no funil e 2 recomendações concretas para acelerar resultados.

Dados do mês:
- Receita realizada: R$ ${metrics.revenue?.toFixed(0)}
- Meta total: R$ ${metrics.goal?.toFixed(0)}
- Atingimento: ${metrics.attainment?.toFixed(1)}%
- Pipeline aberto: R$ ${metrics.pipelineValue?.toFixed(0)} em ${metrics.pipelineCount} negócios
- Pipeline ponderado: R$ ${metrics.weighted?.toFixed(0)}
- Forecast: R$ ${metrics.forecast?.toFixed(0)}
- Conversão: ${metrics.conversion?.toFixed(1)}%
- Negócios fechados: ${metrics.closedCount}
- Atividades pendentes: ${metrics.activitiesPending}
- Deals em risco: ${riskyCount}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um analista comercial estratégico. Responde sempre em português, com objetividade e foco em ação." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados na workspace Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const insight = data.choices?.[0]?.message?.content ?? "Sem resposta.";
    return new Response(JSON.stringify({ insight }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
