// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ──────────────────────────────────────────────────────────────────
// Envia mensagem de WhatsApp via EvolutionAPI
// ──────────────────────────────────────────────────────────────────
async function sendWhatsApp(phone: string, message: string) {
  const baseUrl = Deno.env.get("EVOLUTION_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");
  const instance = Deno.env.get("EVOLUTION_INSTANCE");

  if (!baseUrl || !apiKey || !instance) {
    console.warn("EvolutionAPI não configurada, pulando WhatsApp.");
    return;
  }

  // Normaliza o número: remove tudo que não for dígito, garante DDI 55
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;

  const url = `${baseUrl}/message/sendText/${encodeURIComponent(instance)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: normalized,
      text: message,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`WhatsApp falhou para ${normalized}:`, err);
  } else {
    console.log(`WhatsApp enviado para ${normalized}`);
  }
}

// ──────────────────────────────────────────────────────────────────
// Handler principal
// ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase Admin Client (service_role para bypass RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();

    // Janelas de tempo: 72h (3 dias) e 24h (1 dia) antes do prazo
    const window3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const window24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // Margem de 30 minutos para não perder atividades na borda
    const nowMinus30 = new Date(now.getTime() - 30 * 60 * 1000);

    // ── 1. Notificações de 3 dias ──────────────────────────────
    const { data: acts3d } = await supabase
      .from("activities")
      .select("id, title, due_date, owner_id, notification_sent_3d_at")
      .eq("status", "pendente")
      .gte("due_date", nowMinus30.toISOString())
      .lte("due_date", window3d.toISOString())
      .is("notification_sent_3d_at", null);

    for (const act of acts3d ?? []) {
      // Busca perfil do vendedor (nome + telefone)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", act.owner_id)
        .single();

      const name = profile?.full_name || "Vendedor";
      const dueDate = new Date(act.due_date).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      });

      const msg = `🔔 *FortSecure CRM — Lembrete de Prazo*\n\nOlá, ${name}! Você tem uma tarefa vencendo em *3 dias*:\n\n📌 *${act.title}*\n📅 Prazo: ${dueDate}\n\nAcesse o CRM para atualizar o status.`;

      // Insere notificação in-app
      await supabase.from("notifications").insert({
        user_id: act.owner_id,
        activity_id: act.id,
        message: `⏳ Prazo em 3 dias: "${act.title}" — ${dueDate}`,
        type: "warning",
        metadata: { due_date: act.due_date },
      });

      // Envia WhatsApp se tiver telefone
      if (profile?.phone) {
        await sendWhatsApp(profile.phone, msg);
      }

      // Marca como notificado
      await supabase
        .from("activities")
        .update({ notification_sent_3d_at: now.toISOString() })
        .eq("id", act.id);
    }

    // ── 2. Notificações de 24 horas ────────────────────────────
    const { data: acts24h } = await supabase
      .from("activities")
      .select("id, title, due_date, owner_id, notification_sent_24h_at")
      .eq("status", "pendente")
      .gte("due_date", nowMinus30.toISOString())
      .lte("due_date", window24h.toISOString())
      .is("notification_sent_24h_at", null);

    for (const act of acts24h ?? []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", act.owner_id)
        .single();

      const name = profile?.full_name || "Vendedor";
      const dueDate = new Date(act.due_date).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      });

      const msg = `🚨 *FortSecure CRM — URGENTE*\n\nOlá, ${name}! Sua tarefa vence em *menos de 24 horas*:\n\n📌 *${act.title}*\n📅 Prazo: ${dueDate}\n\n⚡ Acesse o CRM agora e atualize o status!`;

      await supabase.from("notifications").insert({
        user_id: act.owner_id,
        activity_id: act.id,
        message: `🚨 Prazo em menos de 24h: "${act.title}" — ${dueDate}`,
        type: "error",
        metadata: { due_date: act.due_date },
      });

      if (profile?.phone) {
        await sendWhatsApp(profile.phone, msg);
      }

      await supabase
        .from("activities")
        .update({ notification_sent_24h_at: now.toISOString() })
        .eq("id", act.id);
    }

    const summary = {
      checked_at: now.toISOString(),
      notified_3d: acts3d?.length ?? 0,
      notified_24h: acts24h?.length ?? 0,
    };

    console.log("check-deadlines concluído:", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("check-deadlines erro:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
