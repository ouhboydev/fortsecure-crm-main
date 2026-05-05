import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTeamMetrics, fetchRanking, STAGES } from "@/lib/sales";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, Target, Activity, Users, Zap,
  Calendar, LayoutGrid, BarChart3, PieChart as PieIcon,
  Award, Trophy, ShieldCheck, Globe, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/executive")({
  head: () => ({ meta: [{ title: "Dashboard Executivo — FortSecure" }] }),
  component: () => <AppShell><ExecutiveDashboard /></AppShell>,
});

function ExecutiveDashboard() {
  const nav = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [stageData, setStageData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [m, r, oppsRes] = await Promise.all([
        fetchTeamMetrics(),
        fetchRanking(),
        supabase.from("opportunities").select("*")
      ]);

      setMetrics(m);
      setRanking(r.slice(0, 8));

      const opps = oppsRes.data ?? [];
      const funnel = STAGES.map(s => {
        const stageOpps = opps.filter(o => o.stage === s.key);
        return { name: s.label, value: stageOpps.reduce((sum, o) => sum + Number(o.value), 0), count: stageOpps.length, fill: s.color };
      });
      setFunnelData(funnel.filter(f => !["Ganho", "Perdido"].includes(f.name)));
      setStageData(funnel);

      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const currentDay = new Date().getDate();
      let cumulative = 0;
      const evolution = Array.from({ length: currentDay }, (_, i) => {
        const day = i + 1;
        const dayRevenue = opps.filter(o => o.stage === 'ganho' && o.closed_at && new Date(o.closed_at).getDate() === day).reduce((sum, o) => sum + Number(o.value), 0);
        cumulative += dayRevenue;
        return { day: `${day}/${new Date().getMonth() + 1}`, realizado: cumulative, meta: Math.round((m.goal / daysInMonth) * day) };
      });
      setEvolutionData(evolution);

      const products = [
        { name: "XDR", keywords: ["XDR", "EDR", "Sentinel"] },
        { name: "Consultoria", keywords: ["Consultoria", "Audit", "Compliance"] },
        { name: "Cloud Security", keywords: ["Cloud", "AWS", "Azure", "GCP"] },
        { name: "Managed Services", keywords: ["Serviços", "Managed", "Suporte", "SOC"] },
        { name: "Firewall", keywords: ["Firewall", "Network", "Rede", "Cisco", "Fortinet"] },
      ];

      const prodMetrics = products.map(p => {
        const val = opps.filter(o => p.keywords.some(k => o.title.toLowerCase().includes(k.toLowerCase()))).reduce((sum, o) => sum + Number(o.value), 0);
        return { name: p.name, value: val };
      }).sort((a, b) => b.value - a.value);
      setProductData(prodMetrics);
    }
    load();
    
    // Real-time listener for operational sync
    const channel = supabase.channel("exec-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!metrics) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
      <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em]">Carregando Vault Estratégico...</span>
    </div>
  );

  return (
    <div className="p-8 md:p-10 space-y-10 max-w-[1500px] mx-auto min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-10 bg-primary rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Unidade de Inteligência Estratégica</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-foreground leading-tight">Dashboard Executivo</h1>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-6 border border-border flex items-center gap-10 shadow-xl">
          <div className="flex flex-col">
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Status Operacional</span>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
              <span className="text-xs font-bold text-foreground uppercase tracking-widest font-mono">Performance Estável</span>
            </div>
          </div>
          <Separator orientation="vertical" className="h-10 bg-border" />
          <div className="text-right">
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Conversão Global</div>
            <div className="text-xl font-bold font-mono text-primary tracking-tighter">{metrics.conversion.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Podium Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ExecutivePodium label="Forecast Ponderado" value={formatCurrency(metrics.forecast)} sub="Projeção Ponderada P70" icon={<Zap className="h-6 w-6 text-primary" />} />
        <Card className="bg-card/50 backdrop-blur-sm border-warning/30 rounded-3xl flex flex-col items-center justify-center p-10 text-center relative overflow-hidden group shadow-2xl border-none">
          <CardContent className="p-0 flex flex-col items-center">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-warning shadow-[0_0_15px_rgba(251,191,36,0.3)]" />
            <div className="h-14 w-14 rounded-2xl bg-warning/5 border border-warning/10 flex items-center justify-center mb-6 shadow-inner">
               <Trophy className="h-8 w-8 text-warning" />
            </div>
            <div className="text-[10px] text-warning font-bold uppercase tracking-[0.3em] mb-3">Receita Realizada Mês</div>
            <div className="text-4xl font-black font-mono text-foreground mb-6 tracking-tighter">{formatCurrency(metrics.revenue)}</div>
            <Badge variant="outline" className="px-5 py-2 rounded-xl bg-emerald-500/5 border-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
              {metrics.attainment.toFixed(1)}% Meta Batida
            </Badge>
          </CardContent>
        </Card>
        <ExecutivePodium label="Meta Corporativa" value={formatCurrency(metrics.goal)} sub="Target Estratégico Anual" icon={<Target className="h-6 w-6 text-muted-foreground" />} />
      </div>

      <Tabs defaultValue="strategy" className="w-full">
        <div className="flex justify-center mb-10">
          <TabsList className="bg-secondary/50 backdrop-blur-sm border-border p-1 h-auto rounded-2xl shadow-xl">
            <TabsTrigger value="strategy" className="flex items-center gap-3 px-8 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">
              <LayoutGrid className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Estratégia</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-3 px-8 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">
              <BarChart3 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-3 px-8 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">
              <PieIcon className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Forecast</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-3 px-8 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:text-foreground transition-all">
              <Activity className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Operações</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="strategy" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <Card className="lg:col-span-8 bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-2xl overflow-hidden border-none">
              <CardHeader className="p-10 pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-4">
                     <span className="h-4 w-1 bg-primary rounded-full" />
                     Evolução de Receita: Realizado vs Meta
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-muted-foreground/20" />
                </div>
              </CardHeader>
              <CardContent className="p-10 pt-4">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <defs>
                        <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a', fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a', fontWeight: 'bold' }} tickFormatter={(v) => `R$${v / 1000}k`} />
                      <Tooltip 
                        cursor={{ stroke: 'var(--primary)', strokeWidth: 2 }} 
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px" }} 
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(value: any) => [formatCurrency(value), ""]}
                      />
                      <Area type="monotone" dataKey="realizado" name="Valor Realizado" stroke="#10b981" strokeWidth={3} fill="url(#execGrad)" />
                      <Area type="monotone" dataKey="meta" name="Valor Meta" stroke="#71717a" strokeDasharray="6 6" fill="none" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-4 space-y-8">
              <Card className="bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-xl overflow-hidden border-none">
                <CardHeader className="p-8 pb-0">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3">
                    <Users className="h-4 w-4 text-primary" /> Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="space-y-5">
                    {ranking.slice(0, 4).map((r, i) => (
                      <div key={r.user_id} className="flex items-center justify-between group p-3 bg-secondary/30 rounded-2xl border border-transparent hover:border-border transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-9 w-9 rounded-xl bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground/60 transition-all group-hover:border-primary/50 shadow-sm">#{i + 1}</div>
                          <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{r.full_name}</div>
                        </div>
                        <div className="text-sm font-mono font-bold text-primary tracking-tighter">{formatCurrency(r.closed_value)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-xl overflow-hidden border-none">
                <CardContent className="p-8">
                  <CardDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Pipeline Global Ponderado</CardDescription>
                  <div className="text-3xl font-black font-mono text-foreground tracking-tighter mb-3">{formatCurrency(metrics.pipelineValue)}</div>
                  <Badge variant="secondary" className="text-[10px] font-bold text-primary uppercase tracking-widest bg-emerald-500/10 border-none">{metrics.pipelineCount} Negócios Ativos</Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-2xl overflow-hidden border-none">
              <CardHeader className="p-10 pb-0">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">Receita por Consultor</CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-4">
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ranking} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="full_name" type="category" axisLine={false} tickLine={false} width={140} tick={{ fontSize: 11, fill: '#71717a', fontWeight: 'bold' }} />
                      <Tooltip 
                        cursor={{ fill: 'var(--secondary)' }} 
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px" }} 
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="closed_value" name="Total Ganho" fill="#10b981" radius={[0, 8, 8, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-2xl overflow-hidden border-none">
              <CardHeader className="p-10 pb-0">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">Ranking Consolidado</CardTitle>
              </CardHeader>
              <CardContent className="p-10">
                <div className="space-y-3">
                  {ranking.map((r, i) => (
                    <div key={r.user_id} className="flex items-center justify-between p-5 rounded-2xl bg-secondary/30 border border-border hover:border-primary/30 transition-all group">
                      <div className="flex items-center gap-5">
                        <span className="text-sm font-black font-mono text-muted-foreground/20 group-hover:text-primary transition-colors">#{i + 1}</span>
                        <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{r.full_name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black font-mono text-foreground tracking-tighter">{formatCurrency(r.closed_value)}</div>
                        <div className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1.5">{r.attainment.toFixed(0)}% Meta</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-2xl overflow-hidden border-none">
              <CardHeader className="p-10 pb-0">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">Distribuição de Pipeline por Estágio</CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-4">
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a', fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#71717a', fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px" }} 
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" name="Valor Estimado" radius={[6, 6, 0, 0]} barSize={50}>
                        {funnelData.map((entry, index) => <Cell key={`c-${index}`} fill={entry.fill} fillOpacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm rounded-3xl border-border flex flex-col items-center justify-center text-center shadow-2xl border-none">
              <CardContent className="p-10 flex flex-col items-center">
                <CardDescription className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground mb-10">Mix de Inteligência de Forecast</CardDescription>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={funnelData} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value">
                        {funnelData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px" }} 
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-10">
                  <div className="text-3xl font-black font-mono text-foreground tracking-tighter mb-2">{formatCurrency(metrics.forecast)}</div>
                  <Badge className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mt-2 bg-emerald-500/10 border-none">Valor de Probabilidade Ponderada</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-2xl overflow-hidden border-none">
              <CardHeader className="p-10 pb-0">
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">Composição de Mercado por Linha de Produto</CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-4">
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productData} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={140} tick={{ fontSize: 11, fill: '#71717a', fontWeight: 'bold' }} />
                      <Tooltip 
                        cursor={{ fill: 'var(--secondary)' }} 
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "16px" }} 
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" name="Volume" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={20} fillOpacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col justify-center space-y-10">
              <Card className="bg-card/50 backdrop-blur-sm rounded-2xl border-border hover:border-primary/30 transition-all shadow-xl group border-none">
                <CardContent className="p-8 flex items-center justify-between">
                  <div>
                    <CardDescription className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2 group-hover:text-primary transition-colors">Reuniões Agendadas</CardDescription>
                    <div className="text-4xl font-black font-mono text-foreground tracking-tighter">{metrics.meetingsCount}</div>
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-secondary border border-border flex items-center justify-center transition-all group-hover:border-primary/50 shadow-sm">
                     <Calendar className="h-8 w-8 text-primary opacity-30" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm rounded-2xl border-border hover:border-warning/30 transition-all shadow-xl group border-none">
                <CardContent className="p-8 flex items-center justify-between">
                  <div>
                    <CardDescription className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2 group-hover:text-warning transition-colors">Tarefas Operacionais Pendentes</CardDescription>
                    <div className="text-4xl font-black font-mono text-foreground tracking-tighter">{metrics.activitiesPending}</div>
                  </div>
                  <div className="h-16 w-16 rounded-2xl bg-secondary border border-border flex items-center justify-center transition-all group-hover:border-warning/50 shadow-sm">
                     <ShieldCheck className="h-8 w-8 text-warning opacity-30" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExecutivePodium({ label, value, sub, icon, className }: any) {
  return (
    <Card className={cn("bg-card/50 backdrop-blur-sm border-border rounded-3xl transition-all hover:bg-secondary/40 hover:border-primary/30 shadow-xl group border-none", className)}>
      <CardContent className="p-10 flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center mb-6 transition-all group-hover:border-primary/50 shadow-sm group-hover:scale-110 shadow-inner">
           {icon}
        </div>
        <CardDescription className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em] mb-2">{label}</CardDescription>
        <div className="text-2xl font-black font-mono text-foreground mb-3 tracking-tighter group-hover:text-primary transition-colors">{value}</div>
        <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest leading-relaxed">{sub}</p>
      </CardContent>
    </Card>
  );
}
