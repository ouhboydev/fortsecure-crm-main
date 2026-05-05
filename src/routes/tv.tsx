import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { fetchTeamMetrics, fetchRanking, STAGES, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/components/ui-kit/PageHeader";
import {
  Activity, Trophy, TrendingUp, Target, Zap, Star, Rocket, Clock,
  Calendar, Briefcase, Filter, ArrowUpRight, XCircle, MonitorOff,
  User, CheckCircle2, ChevronRight, BarChart3, PieChart as PieIcon, Kanban
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/tv")({
  head: () => ({ meta: [{ title: "Monitor TV — Operações em Tempo Real FortSecure" }] }),
  component: TV,
});

function TV() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [slide, setSlide] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [funnel, setFunnel] = useState<{ stage: string; count: number; value: number; color: string }[]>([]);
  const [recentWins, setRecentWins] = useState<any[]>([]);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  async function load() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const [m, r, oppsRes, winsRes, topRes, meetRes] = await Promise.all([
      fetchTeamMetrics(), fetchRanking(), supabase.from("opportunities").select("stage, value"),
      supabase.from("opportunities").select("id, title, value, closed_at, profiles(full_name, avatar_url)").eq("stage", "ganho").order("closed_at", { ascending: false }).limit(5),
      supabase.from("opportunities").select("id, title, value, stage, profiles(full_name, avatar_url)").not("stage", "in", '("ganho","perdido")').order("value", { ascending: false }).limit(5),
      supabase.from("meetings").select("*", { count: 'exact', head: true }).gte("scheduled_at", startOfMonth)
    ]);
    setMetrics(m); setRanking(r); setRecentWins(winsRes.data ?? []); setTopDeals(topRes.data ?? []); setMeetingsCount(meetRes.count ?? 0);
    const opps = oppsRes.data ?? [];
    setFunnel(STAGES.map((s) => ({ stage: s.label, count: itemsCount(opps, s.key), value: itemsValue(opps, s.key), color: s.color })));
  }
  const itemsCount = (arr: any[], key: string) => arr.filter(o => o.stage === key).length;
  const itemsValue = (arr: any[], key: string) => arr.filter(o => o.stage === key).reduce((sum, o) => sum + Number(o.value), 0);

  useEffect(() => {
    load();
    const int = setInterval(load, 2 * 60 * 1000); // 2 min sync
    const rot = setInterval(() => setSlide((s) => (s + 1) % 6), 15000);
    const clk = setInterval(() => setTime(new Date()), 1000);
    const ch = supabase.channel("tv-rt").on("postgres_changes", { event: "*", schema: "public" }, load).subscribe();
    return () => { clearInterval(int); clearInterval(rot); clearInterval(clk); supabase.removeChannel(ch); };
  }, []);

  if (!metrics) return (
    <div className="min-h-screen bg-background grid place-items-center">
      <div className="flex flex-col items-center gap-10">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
          <Zap className="h-24 w-24 text-primary animate-bounce relative" />
        </div>
        <div className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.8em] animate-pulse">Sincronizando Vault de Transmissão...</div>
      </div>
    </div>
  );

  const slides = [
    <SlideExecutiveSummary key="exec" m={metrics} meetingsCount={meetingsCount} />,
    <SlideKPIs key="kpi" m={metrics} />,
    <SlideRanking key="rank" rows={ranking} />,
    <SlideFunnel key="funnel" funnel={funnel} m={metrics} />,
    <SlideRecentWins key="wins" wins={recentWins} />,
    <SlideTopDeals key="top" deals={topDeals} />,
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[200px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[200px] rounded-full" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <header className="relative z-20 px-20 py-12 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <motion.div 
            whileHover={{ rotate: 180 }}
            className="h-20 w-20 rounded-[28px] bg-primary flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] cursor-pointer"
            onClick={() => nav({ to: "/dashboard" })}
          >
            <Zap className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <div>
            <div className="text-5xl font-black tracking-tighter text-foreground uppercase italic flex items-center gap-4">
              FortSecure <Badge className="px-4 py-1 rounded-xl bg-secondary border-border text-primary text-2xl not-italic shadow-inner font-black uppercase">OPERAÇÕES</Badge>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">Feed de Inteligência ao Vivo // Segmento {slide + 1}/6</div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-20">
          <div className="text-right">
            <div className="text-7xl font-black font-mono tabular-nums tracking-tighter text-foreground leading-none">{time.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}<span className="text-2xl text-muted-foreground/30 ml-2">{time.toLocaleTimeString("pt-BR", { second: '2-digit' })}</span></div>
            <div className="text-xs text-muted-foreground uppercase font-bold tracking-[0.4em] mt-4 flex items-center justify-end gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              {time.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-20 pt-10">
        <AnimatePresence mode="wait">
          <motion.div 
            key={slide} 
            initial={{ opacity: 0, y: 40, scale: 0.98 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -40, scale: 0.98 }} 
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {slides[slide]}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 flex gap-6 z-30 bg-card/50 backdrop-blur-xl px-8 py-4 rounded-3xl border border-border shadow-2xl">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <button 
            key={i} 
            onClick={() => setSlide(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-700",
              slide === i ? "w-20 bg-primary shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "w-2 bg-muted hover:bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function SlideExecutiveSummary({ m, meetingsCount }: any) {
  return (
    <div className="space-y-16">
      <div className="flex items-center gap-6">
        <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        <h2 className="text-7xl font-black uppercase tracking-tighter">Status <span className="text-muted-foreground/20">Estratégico</span></h2>
      </div>
      
      <div className="grid grid-cols-12 gap-12">
        <Card className="col-span-7 bg-card/50 backdrop-blur-md border-border rounded-[48px] shadow-2xl relative overflow-hidden group border-none">
          <CardContent className="p-20 flex flex-col justify-between h-[650px]">
            <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="h-64 w-64 text-foreground" />
            </div>
            
            <div className="space-y-6 relative z-10">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.6em]">Atingimento de Meta Mensal</div>
                <div className="text-[16rem] font-black text-primary leading-none tracking-tighter shadow-emerald-500/20 drop-shadow-2xl">{m.attainment.toFixed(0)}%</div>
            </div>

            <div className="space-y-12 relative z-10">
                <div className="h-8 w-full bg-secondary rounded-full border border-border overflow-hidden shadow-inner p-1">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, m.attainment)}%` }}
                    transition={{ duration: 1.5, ease: "circOut" }}
                    className="h-full bg-gradient-to-r from-emerald-600 to-primary shadow-[0_0_30px_rgba(16,185,129,0.5)] rounded-full" 
                  />
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-2">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.4em]">Receita Realizada</div>
                    <div className="text-6xl font-black font-mono text-foreground tracking-tighter">{formatCurrency(m.revenue)}</div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.4em]">Meta Objetivo</div>
                    <div className="text-4xl font-black font-mono text-muted-foreground/20 tracking-tighter">{formatCurrency(m.goal)}</div>
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="col-span-5 grid grid-rows-2 gap-12">
            <Card className="bg-card/50 backdrop-blur-md border-border rounded-[48px] shadow-xl overflow-hidden group border-none">
              <CardContent className="p-16 flex flex-col justify-center h-full relative">
                <div className="absolute top-10 right-10 p-4 bg-secondary rounded-2xl border border-border">
                  <Kanban className="h-8 w-8 text-primary" />
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.6em] mb-10">Volume Pipeline Ativo</div>
                <div className="text-8xl font-black text-foreground tracking-tighter leading-none">{formatCurrency(m.pipelineValue)}</div>
                <div className="flex items-center gap-4 mt-12">
                  <Badge variant="outline" className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground text-sm font-bold uppercase tracking-widest border-border">{m.pipelineCount} Oportunidades</Badge>
                  <span className="text-xs text-muted-foreground/30 font-bold uppercase tracking-widest">Monitoramento Real-Time</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-md border-border rounded-[48px] shadow-xl overflow-hidden group border-none">
              <CardContent className="p-16 flex flex-col justify-center h-full relative">
                <div className="absolute top-10 right-10 p-4 bg-secondary rounded-2xl border border-border">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.6em] mb-10">Agenda de Reuniões</div>
                <div className="text-8xl font-black text-primary tracking-tighter leading-none">{meetingsCount}</div>
                <div className="flex items-center gap-4 mt-12">
                  <Badge variant="outline" className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground text-sm font-bold uppercase tracking-widest border-border">Mês Vigente</Badge>
                  <span className="text-xs text-muted-foreground/30 font-bold uppercase tracking-widest">Sincronização Cloud Ativa</span>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

function SlideKPIs({ m }: any) {
  return (
    <div className="space-y-16">
      <div className="flex items-center gap-6">
        <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        <h2 className="text-7xl font-black uppercase tracking-tighter">Placar <span className="text-muted-foreground/20">Consolidado</span></h2>
      </div>

      <div className="grid grid-cols-2 gap-12">
        <BigKPI label="Receita Total" value={formatCurrency(m.revenue)} sub="Fechamento Mês" icon={<TrendingUp />} accent="primary" />
        <BigKPI label="Forecast Ponderado" value={formatCurrency(m.forecast)} sub="Previsão Probabilística" icon={<Zap />} accent="foreground" />
      </div>
      <div className="grid grid-cols-3 gap-12">
        <BigKPI label="Vendido Hoje" value={formatCurrency(m.todayRevenue)} sub="Vendas em Tempo Real" icon={<Rocket />} accent="primary" />
        <BigKPI label="Tarefas Pendentes" value={m.activitiesPending} sub="Backlog Operacional" icon={<Activity />} accent="foreground" />
        <BigKPI label="Conversão" value={`${m.conversion.toFixed(1)}%`} sub="Eficiência de Funil" icon={<BarChart3 />} accent="primary" />
      </div>
    </div>
  );
}

function BigKPI({ label, value, sub, icon, accent }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-md border-border rounded-[40px] shadow-xl overflow-hidden group border-none">
      <CardContent className="p-16 flex flex-col justify-center h-full relative">
        <div className="absolute top-12 right-12 text-muted-foreground/20 group-hover:text-primary/20 transition-colors">
          {icon && <div className="h-12 w-12">{icon}</div>}
        </div>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.5em] mb-10">{label}</div>
        <div className={cn("text-8xl font-black font-mono tracking-tighter leading-none mb-6", accent === 'primary' ? "text-primary shadow-emerald-500/10 drop-shadow-lg" : "text-foreground")}>{value}</div>
        <div className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-[0.3em]">{sub}</div>
      </CardContent>
    </Card>
  );
}

function SlideRanking({ rows }: { rows: RankingRow[] }) {
  return (
    <div className="space-y-16">
      <div className="flex items-center gap-6">
        <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        <h2 className="text-7xl font-black uppercase tracking-tighter">Ranking de <span className="text-muted-foreground/20">Performance</span></h2>
      </div>

      <div className="space-y-6 max-w-7xl mx-auto">
        {rows.slice(0, 6).map((r, i) => (
          <motion.div 
            key={r.user_id} 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={cn(
              "rounded-[32px] border transition-all shadow-xl group border-none", 
              i === 0 ? "bg-primary/5 shadow-emerald-500/5 border-l-4 border-l-primary" : "bg-card/40 border-border"
            )}>
              <CardContent className="p-10 flex items-center justify-between">
                <div className="flex items-center gap-12">
                  <div className={cn("text-7xl font-black font-mono w-32 tracking-tighter", i === 0 ? "text-primary" : "text-muted-foreground/10")}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="flex items-center gap-8">
                      <Avatar className="h-24 w-24 rounded-3xl border-border group-hover:border-primary/50 transition-all shadow-sm">
                        <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                        <AvatarFallback className="bg-secondary">
                          <User className="h-10 w-10 text-muted-foreground/20" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-6xl font-black text-foreground uppercase tracking-tighter flex items-center gap-4">
                          {r.full_name}
                          {i === 0 && <Trophy className="h-12 w-12 text-warning" />}
                        </div>
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-[0.4em] mt-3">Agente de Vendas Elite // {r.attainment?.toFixed(0)}% da Meta</div>
                      </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-7xl font-black font-mono text-foreground tracking-tighter">{formatCurrency(r.closed_value)}</div>
                  <div className="text-[10px] text-primary font-bold uppercase tracking-[0.4em] mt-4">Contribuição de Receita</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideFunnel({ funnel, m }: any) {
  const max = Math.max(...funnel.map((f: any) => f.value), 1);
  return (
    <div className="space-y-16">
      <div className="flex items-center gap-6">
        <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        <h2 className="text-7xl font-black uppercase tracking-tighter">Funil <span className="text-muted-foreground/20">Operacional</span></h2>
      </div>

      <div className="grid grid-cols-[1fr_600px] gap-16">
        <Card className="bg-card/50 backdrop-blur-md border-border rounded-[48px] shadow-2xl border-none">
          <CardContent className="p-20 space-y-12">
            {funnel.map((f: any, idx: number) => (
              <motion.div 
                key={f.stage} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{f.stage}</div>
                      <div className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center gap-4">
                        {f.count} <Badge variant="outline" className="text-xs text-muted-foreground/30 font-bold border-border">Oportunidades</Badge>
                      </div>
                  </div>
                  <div className="text-5xl font-mono font-black text-foreground tracking-tighter">{formatCurrency(f.value)}</div>
                </div>
                <div className="h-4 bg-secondary rounded-full border border-border overflow-hidden shadow-inner p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(f.value / max) * 100}%` }}
                    transition={{ duration: 1.2, ease: "circOut" }}
                    className="h-full shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-full" 
                    style={{ backgroundColor: f.color }} 
                  />
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-12 h-full flex flex-col">
           <Card className="bg-card/50 backdrop-blur-md border-border rounded-[48px] flex flex-col justify-center flex-1 relative overflow-hidden shadow-2xl group border-none">
              <CardContent className="p-20">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-[0.5em] mb-12">Eficiência Global de Conversão</div>
                <div className="text-[12rem] font-black text-primary leading-none tracking-tighter drop-shadow-2xl">{m.conversion.toFixed(1)}%</div>
                <div className="flex items-center gap-6 mt-16">
                  <div className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center">
                      <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                      <div className="text-xs font-bold text-foreground uppercase tracking-widest">Score de Performance</div>
                      <div className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-widest mt-1">Análise de Funil Dinâmica</div>
                  </div>
                </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}

function SlideRecentWins({ wins }: { wins: any[] }) {
  return (
    <div className="space-y-16">
      <div className="flex items-center gap-6">
        <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        <h2 className="text-7xl font-black uppercase tracking-tighter">Vitórias <span className="text-muted-foreground/20">Recentes</span></h2>
      </div>

      <div className="space-y-8 max-w-7xl mx-auto">
        {wins.map((w, i) => (
          <motion.div 
            key={w.id} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-card/50 backdrop-blur-md border-primary/30 rounded-[48px] shadow-2xl shadow-emerald-500/5 group relative overflow-hidden border-none">
              <CardContent className="p-20 flex items-center justify-between">
                <div className="absolute inset-0 bg-primary/5 opacity-20" />
                <div className="flex items-center gap-16 relative z-10">
                  <div className="h-32 w-32 rounded-[32px] bg-primary text-primary-foreground flex items-center justify-center text-7xl shadow-lg group-hover:scale-110 transition-transform">
                    💰
                  </div>
                  <div className="space-y-6">
                      <div className="text-7xl font-black text-foreground uppercase tracking-tighter leading-none">{w.title}</div>
                      <div className="flex items-center gap-6">
                        <Avatar className="h-12 w-12 border-border">
                          <AvatarImage src={w.profiles?.avatar_url} className="object-cover" />
                          <AvatarFallback>
                            <User className="h-6 w-6 text-muted-foreground/20" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-4xl text-primary font-bold uppercase tracking-[0.3em]">{w.profiles?.full_name}</div>
                      </div>
                  </div>
                </div>
                <div className="text-right relative z-10">
                  <div className="text-9xl font-black font-mono text-foreground tabular-nums tracking-tighter leading-none">{formatCurrency(w.value)}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-[0.6em] mt-8 flex items-center justify-end gap-4">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Contrato Formalizado
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {wins.length === 0 && <div className="py-60 text-center text-5xl text-muted-foreground/10 uppercase font-black tracking-[0.5em] italic opacity-20">Monitorando Fechamentos em Tempo Real...</div>}
      </div>
    </div>
  );
}

function SlideTopDeals({ deals }: { deals: any[] }) {
  return (
    <div className="space-y-16">
      <div className="flex items-center gap-6">
        <div className="h-1 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
        <h2 className="text-7xl font-black uppercase tracking-tighter">Destaques do <span className="text-muted-foreground/20">Pipeline</span></h2>
      </div>

      <div className="space-y-8 max-w-7xl mx-auto">
        {deals.map((d, i) => (
          <motion.div 
            key={d.id} 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="bg-card/40 backdrop-blur-md border-border rounded-[40px] shadow-xl group hover:border-primary/30 transition-all border-none">
              <CardContent className="p-16 flex items-center justify-between">
                <div className="flex items-center gap-16">
                  <div className="text-8xl font-black text-muted-foreground/10 italic font-mono tracking-tighter w-40">
                    #{i + 1}
                  </div>
                  <div className="space-y-6">
                      <div className="text-6xl font-black text-foreground uppercase tracking-tighter leading-none">{d.title}</div>
                      <div className="flex items-center gap-6">
                        <Avatar className="h-10 w-10 border-border">
                          <AvatarImage src={d.profiles?.avatar_url} className="object-cover" />
                          <AvatarFallback>
                            <User className="h-5 w-5 text-muted-foreground/20" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-3xl text-muted-foreground/30 font-bold uppercase tracking-[0.3em]">{d.profiles?.full_name}</div>
                      </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-8xl font-black font-mono text-foreground tabular-nums tracking-tighter leading-none">{formatCurrency(d.value)}</div>
                  <div className="flex items-center justify-end gap-3 mt-8">
                    <Badge variant="secondary" className="px-4 py-1.5 rounded-full bg-secondary border-border text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">{d.stage}</Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
