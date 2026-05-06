import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency, Section, StatCard } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTeamMetrics, fetchRanking, STAGES } from "@/lib/sales";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  TrendingUp, Target, Activity, Users, Zap,
  Calendar, LayoutGrid, BarChart3, PieChart as PieIcon,
  Award, Trophy, ShieldCheck, Globe, Loader2, ArrowUpRight, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/executive")({
  head: () => ({ meta: [{ title: "Executivo — FortSecure" }] }),
  component: () => <AppShell><ExecutiveDashboard /></AppShell>,
});

function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [stageData, setStageData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);

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
      return { name: s.label, value: stageOpps.reduce((sum, o) => sum + Number(o.value), 0), count: stageOpps.length, color: s.color };
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
      return { 
        day: `${day}/${new Date().getMonth() + 1}`, 
        realizado: cumulative, 
        meta: Math.round((m.goal / daysInMonth) * day) 
      };
    });
    setEvolutionData(evolution);

    const products = [
      { name: "XDR / EDR", keywords: ["XDR", "EDR", "Sentinel"] },
      { name: "Consultoria", keywords: ["Consultoria", "Audit", "Compliance"] },
      { name: "Cloud Security", keywords: ["Cloud", "AWS", "Azure", "GCP"] },
      { name: "Managed SOC", keywords: ["Serviços", "Managed", "Suporte", "SOC"] },
      { name: "Network Sec", keywords: ["Firewall", "Network", "Rede", "Cisco", "Fortinet"] },
    ];

    const prodMetrics = products.map(p => {
      const val = opps.filter(o => p.keywords.some(k => o.title.toLowerCase().includes(k.toLowerCase()))).reduce((sum, o) => sum + Number(o.value), 0);
      return { name: p.name, value: val };
    }).sort((a, b) => b.value - a.value);
    setProductData(prodMetrics);
  }

  useEffect(() => {
    load();
    const channel = supabase.channel("exec-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!metrics) return (
    <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-6 w-6 text-[#3ecf8e] animate-spin" />
      <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Sincronizando Estratégia...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 max-w-[1600px] mx-auto pb-20">
      <PageHeader 
        title="Painel Executivo" 
        subtitle="Visão estratégica consolidada e análise de forecast global."
        actions={
           <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-[#3ecf8e]/5 border-[#3ecf8e]/20 text-[#3ecf8e] text-[10px] font-bold uppercase py-1">Operação Saudável</Badge>
              <div className="h-8 w-8 rounded bg-secondary flex items-center justify-center">
                 <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
           </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard label="Forecast (Ponderado)" value={formatCurrency(metrics.forecast)} hint="Forecast global P70" accent="info" icon={<Zap className="h-4 w-4" />} />
         <StatCard label="Receita Realizada" value={formatCurrency(metrics.revenue)} hint={`${metrics.attainment.toFixed(1)}% da meta`} trend={{ value: metrics.attainment }} icon={<DollarSign className="h-4 w-4" />} />
         <StatCard label="Meta Corporativa" value={formatCurrency(metrics.goal)} hint="Target estratégico" accent="primary" icon={<Target className="h-4 w-4" />} />
         <StatCard label="Conversão Global" value={`${metrics.conversion.toFixed(1)}%`} hint="Oportunidade -> Ganho" accent="success" icon={<Activity className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-card border border-border h-10 p-1 rounded-md w-fit">
          <TabsTrigger value="overview" className="text-xs px-4 h-8 rounded-sm data-[state=active]:bg-[#3ecf8e]/10 data-[state=active]:text-[#3ecf8e]">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs px-4 h-8 rounded-sm data-[state=active]:bg-[#3ecf8e]/10 data-[state=active]:text-[#3ecf8e]">Performance</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs px-4 h-8 rounded-sm data-[state=active]:bg-[#3ecf8e]/10 data-[state=active]:text-[#3ecf8e]">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid lg:grid-cols-3 gap-6">
              <Section title="Evolução de Receita" className="lg:col-span-2">
                 <div className="h-[350px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={evolutionData}>
                          <defs>
                             <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#a3a3a3', fontSize: 11}} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: '#a3a3a3', fontSize: 11}} tickFormatter={(v) => `R$${v/1000}k`} />
                           <Tooltip 
                              contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                              itemStyle={{color: '#ededed'}}
                              labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                           />
                          <Area type="monotone" dataKey="realizado" name="Realizado" stroke="#3ecf8e" strokeWidth={2} fillOpacity={1} fill="url(#colorReal)" />
                          <Area type="monotone" dataKey="meta" name="Meta" stroke="#1eaedb" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </Section>
              <Section title="Top Performers">
                 <div className="space-y-4 pt-2">
                    {ranking.slice(0, 5).map((r, i) => (
                       <div key={r.user_id} className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-all group">
                          <div className="flex items-center gap-3 min-w-0">
                             <span className="text-xs font-bold text-muted-foreground group-hover:text-[#3ecf8e] transition-colors">{i+1}</span>
                             <span className="text-sm font-medium truncate">{r.full_name}</span>
                          </div>
                          <span className="text-xs font-bold text-foreground font-mono">{formatCurrency(r.closed_value)}</span>
                       </div>
                    ))}
                 </div>
              </Section>
           </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid lg:grid-cols-2 gap-6">
              <Section title="Vendas por Consultor">
                 <div className="h-[400px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={ranking} layout="vertical">
                          <XAxis type="number" hide />
                           <YAxis dataKey="full_name" type="category" axisLine={false} tickLine={false} tick={{fill: '#a3a3a3', fontSize: 11}} width={120} />
                           <Tooltip 
                              contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                              itemStyle={{color: '#ededed'}}
                              labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                           />
                          <Bar dataKey="closed_value" name="Vendido" fill="#3ecf8e" radius={[0, 4, 4, 0]} barSize={20} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Section>
              <Section title="Market Mix por Linha">
                 <div className="h-[400px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={productData} layout="vertical">
                          <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#a3a3a3', fontSize: 11}} width={120} />
                           <Tooltip 
                              contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                              itemStyle={{color: '#ededed'}}
                              labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                           />
                          <Bar dataKey="value" name="Volume" fill="#1eaedb" radius={[0, 4, 4, 0]} barSize={20} fillOpacity={0.8} />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Section>
           </div>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="grid lg:grid-cols-3 gap-6">
              <Section title="Distribuição de Pipeline" className="lg:col-span-2">
                 <div className="h-[400px] w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={funnelData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a3a3a3', fontSize: 11}} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: '#a3a3a3', fontSize: 11}} tickFormatter={(v) => `R$${v/1000}k`} />
                           <Tooltip 
                              contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px', fontSize: '12px'}} 
                              itemStyle={{color: '#ededed'}}
                              labelStyle={{color: '#ededed', fontWeight: 'bold', marginBottom: '4px'}}
                           />
                          <Bar dataKey="value" name="Volume" radius={[4, 4, 0, 0]} barSize={40}>
                             {funnelData.map((entry, index) => <Cell key={`c-${index}`} fill={entry.color} fillOpacity={0.8} />)}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Section>
              <Section title="Composição de Forecast">
                 <div className="h-[300px] w-full pt-4 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie data={funnelData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                             {funnelData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                          </Pie>
                          <Tooltip contentStyle={{backgroundColor: '#171717', border: '1px solid #2e2e2e', borderRadius: '8px'}} />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="mt-4 text-center space-y-1">
                    <p className="text-2xl font-bold font-mono tracking-tighter">{formatCurrency(metrics.forecast)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Weighted Forecast P70</p>
                 </div>
              </Section>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

