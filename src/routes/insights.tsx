import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency, Section, StatCard } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTeamMetrics } from "@/lib/sales";
import { generateGeminiInsights } from "@/lib/ai";
import { toast } from "sonner";
import {
  Brain, Sparkles, Loader2, AlertTriangle,
  Target, ShieldAlert, Cpu,
  CheckCircle2, History,
  Zap, Info, Activity, ShieldCheck
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "IA Insights — FortSecure" }] }),
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
        color: o.stage === "ganho" ? "#3ecf8e" : "#1eaedb"
      });
    });
    (actsRes.data ?? []).forEach(a => {
      histItems.push({ text: `Atividade: ${a.title}`, time: a.created_at, color: "#1eaedb" });
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

  if (!metrics) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
       <Loader2 className="h-6 w-6 text-[#3ecf8e] animate-spin" />
       <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Sincronizando IA...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-[1400px] mx-auto pb-20">
      <PageHeader 
        title="IA Insights" 
        subtitle="Análise preditiva e insights estratégicos processados por Inteligência Artificial."
        actions={
           <Button onClick={generate} disabled={loading} className="h-9 bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-[#000] font-semibold text-xs rounded-md shadow-sm">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              Processar Insights
           </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="AI Forecast" value={formatCurrency(metrics.forecast)} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Confiança" value={`${Math.min(100, ((metrics.forecast / Math.max(metrics.goal, 1)) * 100)).toFixed(0)}%`} accent="info" icon={<Target className="h-4 w-4" />} />
        <StatCard label="Alertas de Risco" value={risky.length} accent={risky.length > 0 ? "warning" : "success"} icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label="Prob. Conversão" value={`${metrics.conversion.toFixed(1)}%`} accent="success" icon={<Activity className="h-4 w-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2">
            <Section title="Relatório Estratégico">
               <div className="min-h-[400px] flex flex-col pt-4">
                  {loading ? (
                     <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-[#3ecf8e]/50" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Processando nós neurais...</span>
                     </div>
                  ) : text ? (
                     <div className="max-w-none prose prose-invert prose-p:text-sm prose-p:leading-relaxed prose-strong:text-[#3ecf8e] animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <ReactMarkdown>{text}</ReactMarkdown>
                     </div>
                  ) : (
                     <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 opacity-30">
                        <div className="h-16 w-16 rounded-full bg-secondary border border-border flex items-center justify-center shadow-inner">
                           <Brain className="h-8 w-8 text-[#3ecf8e]" />
                        </div>
                        <p className="text-xs max-w-xs text-center text-muted-foreground uppercase tracking-widest font-medium leading-relaxed">Clique no botão superior para gerar o relatório de performance via IA.</p>
                     </div>
                  )}
               </div>
            </Section>
         </div>

         <div className="space-y-6">
            <Section title="Vetores de Risco">
               <div className="space-y-3 pt-2">
                  {risky.slice(0, 5).map((r) => (
                     <div key={r.id} className="p-3 bg-background border border-border rounded-md flex justify-between items-center group hover:border-destructive/30 transition-all">
                        <div className="text-sm font-semibold truncate group-hover:text-destructive transition-colors">{r.client_name}</div>
                        <Badge variant="outline" className="text-[10px] font-bold text-destructive uppercase bg-destructive/5 border-destructive/10">{r.probability}%</Badge>
                     </div>
                  ))}
                  {risky.length === 0 && <div className="py-10 text-center text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Nenhum risco detectado</div>}
               </div>
            </Section>

            <Section title="Histórico Recente">
               <div className="space-y-4 pt-2">
                  {history.map((item, idx) => (
                     <div key={idx} className="flex gap-4 items-center group">
                        <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0 flex-1">
                           <p className="text-sm font-medium truncate group-hover:text-foreground transition-colors">{item.text}</p>
                           <p className="text-[10px] text-muted-foreground mt-0.5">Há {timeAgo(item.time)}</p>
                        </div>
                     </div>
                  ))}
               </div>
            </Section>
         </div>
      </div>
    </div>
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

