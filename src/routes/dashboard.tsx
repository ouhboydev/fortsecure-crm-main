import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { 
   TrendingUp, DollarSign, Activity, Users as UsersIcon, 
   Zap, RefreshCw, PhoneCall, PieChart as PieChartIcon, 
   ChevronRight, Filter, Calendar, User, ArrowUpRight,
   Target, Monitor
} from "lucide-react";
import { 
   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
   ResponsiveContainer, BarChart, Bar, Cell, PieChart, 
   Pie, RadialBarChart, RadialBar, Legend 
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/dashboard")({
   component: () => <AppShell><Dashboard /></AppShell>,
});

const STAGES = [
   { key: 'prospect', label: 'Prospects', color: '#71717a' },
   { key: 'qualificado', label: 'Qualificados', color: '#3b82f6' },
   { key: 'proposta', label: 'Proposta', color: '#8b5cf6' },
   { key: 'negociacao', label: 'Negociação', color: '#f59e0b' },
   { key: 'ganho', label: 'Fechado', color: '#10b981' },
];

function Dashboard() {
   const [isSyncing, setIsSyncing] = useState(false);
   const [metrics, setMetrics] = useState<any>(null);
   const [funnelData, setFunnelData] = useState<any[]>([]);
   const [sellerData, setSellerData] = useState<any[]>([]);
   const [stageData, setStageData] = useState<any[]>([]);
   const [productData, setProductData] = useState<any[]>([]);
   const [trendData, setTrendData] = useState<any[]>([]);
   const [meetingCount, setMeetingCount] = useState(0);
   const [conversionRate, setConversionRate] = useState(0);
   
   // Filters
   const [selectedSeller, setSelectedSeller] = useState("all");
   const [sellers, setSellers] = useState<any[]>([]);
   const [selectedPeriod, setSelectedPeriod] = useState(new Date().getMonth().toString());

   async function load() {
      setIsSyncing(true);
      try {
         const now = new Date();
         const month = parseInt(selectedPeriod);
         const firstDay = new Date(now.getFullYear(), month, 1).toISOString();
         const lastDay = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59).toISOString();

         // Fetch all required data
         const [oppsRes, profilesRes, goalsRes, meetingsRes, settingsRes] = await Promise.all([
            supabase.from("opportunities").select("*").lte("created_at", lastDay),
            supabase.from("profiles").select("id, full_name"),
            supabase.from("goals").select("target_amount, user_id").eq("month", month + 1).eq("year", now.getFullYear()),
            supabase.from("meetings").select("id", { count: 'exact', head: true }).gte("scheduled_at", firstDay).lte("scheduled_at", lastDay),
            supabase.from("app_settings").select("*").eq("key", "global_revenue_goal").single()
         ]);

         if (oppsRes.error) throw oppsRes.error;
         if (profilesRes.error) throw profilesRes.error;

         setSellers(profilesRes.data || []);
         
         let opps = oppsRes.data || [];
         if (selectedSeller !== "all") {
            opps = opps.filter(o => o.owner_id === selectedSeller);
         }

         // Metrics Calculation
         const revenue = opps.filter(o => o.stage === 'ganho' && o.closed_at && new Date(o.closed_at).getMonth() === month).reduce((sum, o) => sum + Number(o.value), 0);
         const pipelineValue = opps.filter(o => o.stage !== 'ganho' && o.stage !== 'perdido').reduce((sum, o) => sum + Number(o.value), 0);
         const pipelineCount = opps.filter(o => o.stage !== 'ganho' && o.stage !== 'perdido').length;
         const weighted = opps.filter(o => o.stage !== 'ganho' && o.stage !== 'perdido')
            .reduce((sum, o) => sum + (Number(o.value) * (Number(o.probability || 0) / 100)), 0);

         const hqGoal = settingsRes.data?.value ? Number(settingsRes.data.value) : 2000000;
         const realMeta = selectedSeller === "all" 
            ? hqGoal 
            : (goalsRes.data || []).reduce((sum, g) => sum + Number(g.target_amount), 0) || (hqGoal / sellers.length || 100000);

         const finalMetrics = {
            revenue,
            pipelineValue,
            pipelineCount,
            weighted,
            goal: realMeta,
            attainment: Math.round((revenue / realMeta) * 100)
         };
         setMetrics(finalMetrics);
         setMeetingCount(meetingsRes.count || 0);
         
         // Conversion Rate
         const proposalCount = opps.filter(o => ['proposta', 'negociacao', 'ganho', 'perdido'].includes(o.stage)).length;
         const winCount = opps.filter(o => o.stage === 'ganho').length;
         setConversionRate(proposalCount > 0 ? (winCount / proposalCount) * 100 : 0);

         // Funnel Data
         setFunnelData(STAGES.map(s => ({
            name: s.label,
            value: opps.filter(o => o.stage === s.key).reduce((sum, o) => sum + Number(o.value), 0),
            count: opps.filter(o => o.stage === s.key).length
         })));

         // Seller Ranking
         const sData = (profilesRes.data || []).map(p => ({
            name: p.full_name.split(' ')[0],
            value: (oppsRes.data || []).filter(o => o.owner_id === p.id && o.stage === 'ganho').reduce((sum, o) => sum + Number(o.value), 0)
         })).sort((a, b) => b.value - a.value).slice(0, 5);
         setSellerData(sData);

         // Stage Distribution
         setStageData(STAGES.map(s => ({
            name: s.label,
            value: opps.filter(o => o.stage === s.key).length
         })));

         // Trend Data (Last 6 Months)
         const trend = Array.from({length: 6}, (_, i) => {
            const d = new Date(now.getFullYear(), month - (5 - i), 1);
            const mOpps = opps.filter(o => o.stage === 'ganho' && o.closed_at && new Date(o.closed_at).getMonth() === d.getMonth() && new Date(o.closed_at).getFullYear() === d.getFullYear());
            return {
               name: d.toLocaleString('pt-BR', { month: 'short' }),
               real: mOpps.reduce((sum, o) => sum + Number(o.value), 0),
               meta: realMeta / 12
            };
         });
         setTrendData(trend);

      } catch (err: any) {
         toast.error("Erro ao sincronizar dados: " + err.message);
      } finally {
         setTimeout(() => setIsSyncing(false), 800);
      }
   }

   useEffect(() => { 
      load(); 
      // Real-time listener for operational sync
      const channel = supabase.channel("db-changes")
         .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load)
         .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, load)
         .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
         .subscribe();
         
      return () => { supabase.removeChannel(channel); };
   }, [selectedSeller, selectedPeriod]);

   const formatCurrency = (val: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

   if (!metrics) return (
      <div className="h-[80vh] flex items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
   );

   return (
      <div className="p-6 md:p-8 w-full space-y-10 pb-32">
         {/* Top Filter Bar */}
         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/40 backdrop-blur-md border border-border/50 p-8 rounded-[40px] shadow-2xl">
            <div className="flex items-center gap-6">
               <div className="h-12 w-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
               </div>
               <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase italic text-foreground">Comando Executivo</h1>
                  <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em] mt-1">Status Operacional: Em Tempo Real</p>
               </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
               <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-2xl border border-border/50">
                  <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                     <SelectTrigger className="w-[160px] border-0 bg-transparent h-10 text-[10px] font-bold uppercase tracking-widest">
                        <User className="h-3.5 w-3.5 mr-2 text-primary" />
                        <SelectValue placeholder="Vendedor" />
                     </SelectTrigger>
                     <SelectContent className="bg-background border-border">
                        <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest">Time Todo</SelectItem>
                        {sellers.map(s => (
                           <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase tracking-widest">{s.full_name}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                     <SelectTrigger className="w-[140px] border-0 bg-transparent h-10 text-[10px] font-bold uppercase tracking-widest">
                        <Calendar className="h-3.5 w-3.5 mr-2 text-primary" />
                        <SelectValue placeholder="Período" />
                     </SelectTrigger>
                     <SelectContent className="bg-background border-border">
                        {Array.from({length: 12}, (_, i) => {
                           const d = new Date(new Date().getFullYear(), i, 1);
                           return (
                              <SelectItem key={i} value={i.toString()} className="text-[10px] font-bold uppercase tracking-widest">
                                 {d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                              </SelectItem>
                           );
                        })}
                     </SelectContent>
                  </Select>
               </div>

               <div className="h-8 w-px bg-border/50 mx-2 hidden lg:block" />

               <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
                  className="rounded-2xl border-border/50 bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-all duration-500 font-bold text-[11px] uppercase tracking-widest px-6"
               >
                  <Monitor className="h-4 w-4 mr-2" /> Apresentação
               </Button>

               <Button
                  variant="ghost"
                  size="icon"
                  onClick={load}
                  disabled={isSyncing}
                  className={cn(
                     "h-12 w-12 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md transition-all duration-500 shadow-xl",
                     isSyncing && "animate-spin"
                  )}
               >
                  <RefreshCw className={cn("h-5 w-5 text-muted-foreground", isSyncing && "text-primary")} />
               </Button>
            </div>
         </div>

         {/* KPI Section */}
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            <KPICard label="Receita Mês (Real)" value={formatCurrency(metrics.revenue)} meta={formatCurrency(metrics.goal)} pct={metrics.attainment} icon={<DollarSign />} color="emerald" />
            <KPICard label="Forecast (Ponderado)" value={formatCurrency(metrics.weighted)} meta={formatCurrency(metrics.goal)} pct={Math.round((metrics.weighted / metrics.goal) * 100)} icon={<Activity />} color="blue" />
            <KPICard label="Pipeline Total" value={formatCurrency(metrics.pipelineValue)} sub={`${metrics.pipelineCount} oportunidades`} icon={<TrendingUp />} color="zinc" />
            <KPICard label="Reuniões (Mês)" value={meetingCount.toString()} meta="60" pct={Math.round((meetingCount / 60) * 100)} icon={<PhoneCall />} color="indigo" />
            <KPICard label="Taxa Conversão" value={`${conversionRate.toFixed(1)}%`} sub="(Proposta → Ganha)" icon={<PieChartIcon />} color="amber" />
         </div>

         {/* Main Visualizations */}
         <div className="grid lg:grid-cols-3 gap-8">
            <VisualizationCard title="Evolução de Receita (Área)" className="lg:col-span-2">
               <div className="h-[400px] w-full mt-8">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={trendData}>
                        <defs>
                           <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => `R$${v/1000}k`} />
                        <Tooltip 
                           contentStyle={{backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'}}
                           itemStyle={{fontSize: '11px', fontWeight: 'bold', color: '#fff'}}
                           labelStyle={{color: '#fff', fontSize: '11px', fontWeight: 'bold'}}
                        />
                        <Area type="monotone" dataKey="real" name="Valor Real" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" />
                        <Area type="monotone" dataKey="meta" name="Valor Meta" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </VisualizationCard>

            <VisualizationCard title="Funil de Vendas (Valor)">
               <div className="h-[400px] w-full mt-8">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={funnelData} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} width={80} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px'}} itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}} labelStyle={{color: '#fff'}} />
                        <Bar dataKey="value" name="Valor Total" radius={[0, 8, 8, 0]} barSize={24}>
                           {funnelData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STAGES.find(s => s.label === entry.name)?.color || '#3f3f46'} />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </VisualizationCard>
         </div>

         {/* Sub-Widgets */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <WidgetCard title="Top 5 Vendedores (Ganho)">
               <div className="space-y-6 mt-6">
                  {sellerData.map((s, i) => (
                     <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-[10px] font-black">{i+1}</div>
                           <span className="text-[11px] font-bold text-foreground">{s.name}</span>
                        </div>
                        <span className="text-[11px] font-black text-primary">{formatCurrency(s.value)}</span>
                     </div>
                  ))}
               </div>
            </WidgetCard>

            <VisualizationCard title="Distribuição Etapas" className="p-4">
               <div className="h-[200px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={stageData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                           {stageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STAGES[index % STAGES.length].color} />
                           ))}
                        </Pie>
                        <Tooltip contentStyle={{backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px'}} itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}} labelStyle={{color: '#fff'}} />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </VisualizationCard>

            <WidgetCard title="Top Produtos (Pipeline)">
               <div className="space-y-4 mt-4">
                  {productData.map(p => (
                     <div key={p.n} className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold">
                           <span className="text-muted-foreground">{p.n}</span>
                           <span>{formatCurrency(p.v)}</span>
                        </div>
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: `${Math.min(p.p, 100)}%` }} />
                        </div>
                     </div>
                  ))}
                  {productData.length === 0 && <div className="text-[10px] text-muted-foreground italic py-4">Sem dados de produtos</div>}
               </div>
            </WidgetCard>

            <WidgetCard title="Status das Metas">
               <div className="h-[180px] flex items-center justify-center mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={[{ name: 'Atingimento', value: metrics.attainment, fill: '#10b981' }]}>
                        <RadialBar background dataKey="value" cornerRadius={5} />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground font-black text-2xl">
                           {metrics.attainment}%
                        </text>
                     </RadialBarChart>
                  </ResponsiveContainer>
               </div>
            </WidgetCard>
         </div>
      </div>
   );
}

function KPICard({ label, value, meta, pct, sub, icon, color }: any) {
   const colors: any = {
      emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      zinc: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
   };

   return (
      <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[32px] overflow-hidden group hover:border-primary/40 transition-all duration-500 shadow-xl">
         <CardContent className="p-8">
            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-6 border transition-transform duration-500 group-hover:scale-110 shadow-inner", colors[color])}>
               {icon}
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{label}</p>
               <h3 className="text-2xl font-black text-foreground tracking-tight">{value}</h3>
            </div>
            {meta && (
               <div className="mt-6 space-y-3">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                     <span className="text-muted-foreground/30">Meta: {meta}</span>
                     <span className={cn(pct >= 100 ? "text-emerald-500" : "text-primary")}>{pct}%</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-1.5 bg-secondary" />
               </div>
            )}
            {sub && (
               <p className="mt-4 text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-primary" /> {sub}
               </p>
            )}
         </CardContent>
      </Card>
   );
}

function VisualizationCard({ title, children, className }: any) {
   return (
      <Card className={cn("bg-card/40 backdrop-blur-md border-border/50 rounded-[40px] shadow-2xl p-8", className)}>
         <CardHeader className="p-0 flex flex-row items-center justify-between">
            <CardTitle className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 flex items-center">
               <div className="h-2 w-2 rounded-full bg-primary mr-3 animate-pulse" /> {title}
            </CardTitle>
         </CardHeader>
         {children}
      </Card>
   );
}

function WidgetCard({ title, children }: any) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border-border/50 rounded-[32px] p-6 shadow-xl border-dashed">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 border-b border-border/50 pb-4 mb-4">{title}</h4>
      {children}
    </Card>
  );
}

function Loader2({ className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className={className}>
      <path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>
    </svg>
  );
}
