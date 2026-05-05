import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTeamMetrics } from "@/lib/sales";
import { generateGeminiInsights } from "@/lib/ai";
import { toast } from "sonner";
import {
  Brain, Sparkles, Loader2, AlertTriangle,
  Target, ShieldAlert, Cpu,
  CheckCircle2, History,
  Zap, Info, Activity
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "Inteligência IA — FortSecure" }] }),
  component: () => <AppShell><Insights /></AppShell>,
});

function Insights() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [risky, setRisky] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  async function load() {
    const [m, oppsRes, recentRes, actsRes] = await Promise.all([
      fetchTeamMetrics(),
      supabase.from("opportunities").select("*"),
      supabase.from("opportunities").select("id, client_name, title, stage, created_at, closed_at").order("created_at", { ascending: false }).limit(6),
      supabase.from("activities").select("id, title, status, created_at").eq("status", "concluida").order("created_at", { ascending: false }).limit(3)
    ]);
    setMetrics(m);

    const opps = oppsRes.data ?? [];
    const risk = opps.filter(o =>
      (o.probability < 40 && !["ganho", "perdido"].includes(o.stage)) ||
      (o.expected_close_date && new Date(o.expected_close_date) < new Date() && !["ganho", "perdido"].includes(o.stage))
    );
    setRisky(risk);

    const histItems: any[] = [];
    (recentRes.data ?? []).forEach(o => {
      histItems.push({
        text: o.stage === "ganho" ? `Venda: ${o.client_name}` : `Lead: ${o.client_name}`,
        time: o.closed_at || o.created_at,
        color: o.stage === "ganho" ? "#10b981" : "#3b82f6"
      });
    });
    (actsRes.data ?? []).forEach(a => {
      histItems.push({ text: `Tarefa: ${a.title}`, time: a.created_at, color: "#3b82f6" });
    });
    setHistory(histItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 4));
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    if (!metrics) return;
    setLoading(true);
    setText("");
    try {
      const insights = await generateGeminiInsights(metrics, risky)
      setText(insights);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 md:p-12 max-w-[1400px] mx-auto min-h-screen space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 border-b border-border pb-10">
        <PageHeader title="Inteligência Neural" subtitle="Análise preditiva e insights estratégicos processados por IA" />
        <Button onClick={generate} disabled={loading} size="lg"
          className="px-10 py-6 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Processar Insights
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <CompactMetric title="AI Forecast" value={formatCurrency(metrics?.forecast || 0)} icon={<Zap className="h-5 w-5 text-primary" />} />
        <CompactMetric title="Confiança" value={`${Math.min(100, ((metrics?.forecast / Math.max(metrics?.goal, 1)) * 100)).toFixed(0)}%`} icon={<Target className="h-5 w-5 text-muted-foreground/30" />} />
        <CompactMetric title="Alertas de Risco" value={risky.length} icon={<ShieldAlert className="h-5 w-5 text-destructive" />} />
        <CompactMetric title="Prob. Conversão" value={`${(metrics?.conversion || 0).toFixed(1)}%`} icon={<Activity className="h-5 w-5 text-muted-foreground/30" />} />
      </div>

      <Card className="bg-card/50 backdrop-blur-md rounded-3xl border-border min-h-[600px] flex flex-col overflow-hidden shadow-2xl border-none">
        <CardHeader className="px-8 py-6 border-b border-border bg-secondary/10 flex flex-row items-center justify-between space-y-0">
           <div className="flex items-center gap-3">
             <Cpu className="h-5 w-5 text-primary" />
             <CardTitle className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em]">Estrategic Engine // OS v1.0</CardTitle>
           </div>
           <div className="flex items-center gap-3">
              <div className={cn("h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]", loading ? "text-primary animate-pulse" : "text-emerald-500 bg-emerald-500")} />
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30 border-border bg-secondary/50">{loading ? "Processando..." : "Operacional"}</Badge>
           </div>
        </CardHeader>

        <CardContent className="p-12 md:p-20 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-20 space-y-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary animate-pulse">Mapeando Nós Neurais...</span>
            </div>
          ) : text ? (
            <div className="max-w-4xl mx-auto prose prose-invert prose-emerald prose-p:text-sm prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-primary animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20 opacity-30 text-center space-y-8">
              <div className="h-24 w-24 rounded-3xl bg-secondary border border-border flex items-center justify-center shadow-inner">
                 <Brain className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-4">
                 <h3 className="text-2xl font-bold uppercase tracking-tighter text-foreground">Análise Pronta</h3>
                 <p className="text-[11px] max-w-xs mx-auto leading-relaxed uppercase font-bold text-muted-foreground/30 tracking-widest">Inicie o processamento neural para gerar o relatório estratégico de performance do time.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <Card className="bg-card/30 backdrop-blur-md rounded-3xl border-border shadow-xl border-none overflow-hidden">
          <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between space-y-0">
             <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-3">
               <span className="h-4 w-1 bg-destructive rounded-full" /> 
               Vetores de Risco
             </CardTitle>
             <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest border-border">{risky.length} Alertas</Badge>
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid gap-3">
              {risky.slice(0, 5).map((r) => (
                <div key={r.id} className="p-5 rounded-xl bg-secondary/50 border border-border flex justify-between items-center group hover:border-destructive/30 transition-all shadow-sm">
                  <div className="text-sm font-bold text-foreground truncate group-hover:text-destructive transition-colors">{r.client_name}</div>
                  <Badge variant="secondary" className="text-[10px] font-bold text-destructive uppercase tracking-widest bg-destructive/10 border-none">Prob: {r.probability}%</Badge>
                </div>
              ))}
              {risky.length === 0 && <div className="py-20 text-center text-[10px] font-bold uppercase text-muted-foreground/20 tracking-widest italic opacity-20">Nenhum risco crítico detectado</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-md rounded-3xl border-border shadow-xl border-none overflow-hidden">
          <CardHeader className="p-10 pb-0 flex flex-row items-center justify-between space-y-0">
             <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground flex items-center gap-3">
               <span className="h-4 w-1 bg-primary rounded-full" />
               Atividades Recentes
             </CardTitle>
             <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest border-border">Feed em Tempo Real</Badge>
          </CardHeader>
          <CardContent className="p-10">
            <div className="space-y-6">
              {history.map((item, idx) => (
                <div key={idx} className="flex gap-5 items-center p-4 rounded-xl hover:bg-secondary/30 transition-all group">
                  <div className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: item.color, backgroundColor: item.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/80 font-bold truncate group-hover:text-foreground transition-colors">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground/30 mt-1.5 font-bold uppercase tracking-widest group-hover:text-muted-foreground/50 transition-colors">Há {timeAgo(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompactMetric({ title, value, icon }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-md p-6 rounded-2xl border-border flex flex-row items-center justify-between hover:border-border transition-all group shadow-sm border-none">
      <div>
        <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground/30 mb-2 tracking-[0.2em] group-hover:text-muted-foreground/50">{title}</CardDescription>
        <CardTitle className="text-xl font-bold text-foreground font-mono tracking-tighter group-hover:text-primary transition-colors leading-none">{value}</CardTitle>
      </div>
      <div className="h-10 w-10 rounded-xl bg-secondary border border-border flex items-center justify-center transition-all group-hover:border-muted-foreground/50 shadow-inner">
        {icon}
      </div>
    </Card>
  );
}

function timeAgo(date: string) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "agora";
  let interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "min";
  return Math.floor(seconds) + "s";
}
