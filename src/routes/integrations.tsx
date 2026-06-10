import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Phone, CheckCircle2, XCircle, Loader2, ExternalLink,
  Zap, RefreshCw, Link2, Webhook, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integrations")({
  head: () => ({ meta: [{ title: "Integrações — FortSecure" }] }),
  component: () => <AppShell><IntegrationsPage /></AppShell>,
});

const GOTO_CLIENT_ID = import.meta.env.VITE_GOTO_CLIENT_ID;
const GOTO_REDIRECT_URI = `${window.location.origin}/integrations`;

function IntegrationsPage() {
  const { user, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [gotoStatus, setGotoStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [gotoToken, setGotoToken] = useState<any>(null);
  const [exchanging, setExchanging] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");

  useEffect(() => {
    setSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
    checkGotoStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && !exchanging) {
      handleOAuthCallback(code);
      // Clean URL
      window.history.replaceState({}, document.title, "/integrations");
    }
  }, []);

  async function checkGotoStatus() {
    setGotoStatus("loading");
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "goto_token")
        .single();

      if (data?.value) {
        const token = JSON.parse(data.value as string);
        const isExpired = token.expires_at && Date.now() > token.expires_at;
        setGotoToken(token);
        setGotoStatus(isExpired ? "disconnected" : "connected");
      } else {
        setGotoStatus("disconnected");
      }
    } catch {
      setGotoStatus("disconnected");
    }
  }

  async function handleOAuthCallback(code: string) {
    setExchanging(true);
    try {
      const { data, error } = await supabase.functions.invoke("goto-oauth", {
        body: { code, redirect_uri: GOTO_REDIRECT_URI },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success("GoTo Connect conectado com sucesso!");
      checkGotoStatus();
    } catch (err: any) {
      toast.error("Falha ao conectar GoTo: " + err.message);
    } finally {
      setExchanging(false);
    }
  }

  function connectGoTo() {
    const params = new URLSearchParams({
      client_id: GOTO_CLIENT_ID,
      response_type: "code",
      redirect_uri: GOTO_REDIRECT_URI,
    });
    window.location.href = `https://authentication.logmeininc.com/oauth/authorize?${params}`;
  }

  async function disconnectGoTo() {
    try {
      await supabase.from("app_settings").delete().eq("key", "goto_token");
      setGotoToken(null);
      setGotoStatus("disconnected");
      toast.success("GoTo Connect desconectado.");
    } catch {
      toast.error("Erro ao desconectar.");
    }
  }

  const webhookUrl = supabaseUrl
    ? `${supabaseUrl}/functions/v1/goto-webhook`
    : "Carregando...";

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="relative px-6 lg:px-10 pt-10 pb-12 border-b border-border overflow-hidden">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-[#3ecf8e]/[0.03] blur-[120px] rounded-full pointer-events-none" />
        <div className="relative max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 flex items-center justify-center">
              <Link2 className="h-4 w-4 text-[#3ecf8e]" />
            </div>
            <h1 className="text-xl font-medium text-foreground">Integrações</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-12">Conecte ferramentas externas ao seu CRM.</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 lg:px-10 py-8 max-w-[1200px] mx-auto w-full space-y-6">

        {exchanging && (
          <div className="flex items-center gap-3 p-4 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded-xl">
            <Loader2 className="h-4 w-4 animate-spin text-[#3ecf8e]" />
            <p className="text-sm text-[#3ecf8e] font-medium">Autenticando com GoTo Connect...</p>
          </div>
        )}

        {/* GoTo Connect Card */}
        <div className="bg-card/40 backdrop-blur-md border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-secondary/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm">
                <Phone className="h-5 w-5 text-[#3ecf8e]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium text-foreground">GoTo Connect</h2>
                  {gotoStatus === "connected" && (
                    <Badge className="bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30 text-[10px] font-mono uppercase tracking-widest">
                      Conectado
                    </Badge>
                  )}
                  {gotoStatus === "disconnected" && (
                    <Badge variant="outline" className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">
                      Desconectado
                    </Badge>
                  )}
                  {gotoStatus === "loading" && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Integração de chamadas telefônicas e reuniões</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gotoStatus === "connected" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnectGoTo}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> Desconectar
                </Button>
              ) : (
                <Button
                  onClick={connectGoTo}
                  disabled={exchanging || gotoStatus === "loading"}
                  className="h-8 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-black font-semibold text-xs gap-2"
                >
                  {exchanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Conectar GoTo
                </Button>
              )}
            </div>
          </div>

          {/* Features list */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Zap,
                title: "Ligações Automáticas",
                desc: "Toda chamada encerrada no GoTo cria uma atividade no CRM automaticamente",
                active: gotoStatus === "connected",
              },
              {
                icon: RefreshCw,
                title: "Histórico Sincronizado",
                desc: "Reuniões e chamadas dos últimos 30 dias ficam disponíveis no Tracker",
                active: gotoStatus === "connected",
              },
              {
                icon: Shield,
                title: "Identificação de Clientes",
                desc: "O sistema identifica o cliente pelo número e vincula ao registro no CRM",
                active: gotoStatus === "connected",
              },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} className={cn(
                  "flex gap-3 p-4 rounded-lg border transition-all",
                  f.active ? "bg-background border-border shadow-sm" : "bg-secondary/10 border-border/50 opacity-60"
                )}>
                  <div className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                    f.active ? "bg-[#3ecf8e]/10 text-[#3ecf8e]" : "bg-secondary text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Webhook config — visible when connected */}
          {gotoStatus === "connected" && (
            <div className="px-6 pb-6 space-y-4">
              <div className="border border-border/50 rounded-xl p-5 bg-background shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-[#3ecf8e]" />
                  <h3 className="text-sm font-medium text-foreground">Configuração de Webhook</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Para receber eventos de chamadas em tempo real, cadastre a URL abaixo no painel do GoTo Connect em{" "}
                  <strong>Admin → Integrações → Webhooks</strong>.
                </p>
                <div className="flex items-center gap-2 p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <code className="text-xs text-[#3ecf8e] font-mono flex-1 break-all">{webhookUrl}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      toast.success("URL copiada!");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["callEnded", "missedCall", "voicemail"].map(ev => (
                    <span key={ev} className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20">
                      {ev}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Eventos suportados — certifique-se de assinar os três acima no portal GoTo.
                </p>
              </div>

              {gotoToken && (
                <div className="border border-border/50 rounded-xl p-5 bg-background shadow-sm">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest font-mono mb-3">Informações da Sessão</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">Organizer Key</p>
                      <p className="text-foreground font-mono mt-0.5 truncate">{gotoToken.organizer_key || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest">Expira Em</p>
                      <p className="text-foreground font-mono mt-0.5">
                        {gotoToken.expires_at
                          ? new Date(gotoToken.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coming soon */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Em Breve</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "WhatsApp Business", desc: "Conversas diretamente no CRM" },
              { name: "HubSpot", desc: "Sincronização bidirecional de contatos" },
              { name: "Google Calendar", desc: "Agenda integrada ao CRM" },
            ].map(i => (
              <div key={i.name} className="bg-card/20 border border-border/30 rounded-xl p-5 opacity-50">
                <p className="text-sm font-medium text-foreground">{i.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{i.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
