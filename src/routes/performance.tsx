import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, formatCurrency } from "@/components/ui-kit/PageHeader";
import { useEffect, useState } from "react";
import { fetchRanking, type RankingRow } from "@/lib/sales";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend
} from "recharts";
import { 
  TrendingUp, Users, Target, Activity, 
  ArrowUpRight, ArrowDownRight, Zap, 
  BarChart3, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Shadcn UI Imports
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/performance")({
  head: () => ({ meta: [{ title: "Performance Analítica — FortSecure" }] }),
  component: () => <AppShell><PerformanceAnalytics /></AppShell>,
});

function PerformanceAnalytics() {
  const { isManager } = useAuth();
  const [data, setData] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);

  async function load() {
    try {
      const ranking = await fetchRanking();
      setData(ranking);

      const { data: acts } = await supabase.from("activities").select("owner_id, type");
      const actMap: Record<string, { calls: number, visits: number }> = {};
      ranking.forEach(r => actMap[r.user_id] = { calls: 0, visits: 0 });
      (acts ?? []).forEach(a => {
        if (actMap[a.owner_id]) {
          if (a.type === 'ligacao') actMap[a.owner_id].calls++;
          else actMap[a.owner_id].visits++;
        }
      });

      const formattedActs = ranking.map(r => ({
        name: r.full_name.split(' ')[0],
        ligações: actMap[r.user_id]?.calls || 0,
        visitas: actMap[r.user_id]?.visits || 0,
        total: (actMap[r.user_id]?.calls || 0) + (actMap[r.user_id]?.visits || 0)
      })).sort((a, b) => b.total - a.total);
      setActivityData(formattedActs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    load(); 
    const channel = supabase.channel("perf-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, load)
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!isManager) return <div className="h-[80vh] flex items-center justify-center text-muted-foreground font-bold uppercase tracking-widest">Acesso Restrito ao Comando</div>;
  if (loading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalRevenue = data.reduce((s, r) => s + r.closed_value, 0);
  const totalPipeline = data.reduce((s, r) => s + r.pipeline_value, 0);
  const avgAttainment = data.length > 0 ? data.reduce((s, r) => s + r.attainment, 0) / data.length : 0;

  const chartData = data.map(r => ({
    name: r.full_name.split(' ')[0],
    vendas: r.closed_value,
    pipeline: r.pipeline_value,
    pontos: r.points
  })).sort((a,b) => b.vendas - a.vendas);

  return (
    <div className="p-8 md:p-10 max-w-[1500px] mx-auto space-y-10 pb-20">
      <PageHeader 
        title="Performance Analítica" 
        subtitle="Métricas avançadas e comparativos táticos de produtividade do time" 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard label="Receita Realizada" value={formatCurrency(totalRevenue)} icon={<TrendingUp className="h-5 w-5 text-emerald-500" />} trend="+12%" />
        <KPICard label="Volume em Pipeline" value={formatCurrency(totalPipeline)} icon={<Zap className="h-5 w-5 text-primary" />} trend="+5%" />
        <KPICard label="Meta do Time" value={`${avgAttainment.toFixed(1)}%`} icon={<Target className="h-5 w-5 text-warning" />} trend="-2%" negative />
        <KPICard label="Agentes Ativos" value={data.length} icon={<Users className="h-5 w-5 text-blue-500" />} trend="Estável" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <ChartContainer title="Comparativo de Receita" icon={<BarChart3 className="h-5 w-5" />}>
          <div className="h-[400px] w-full pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} angle={-45} textAnchor="end" tickMargin={15} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                  cursor={{ fill: 'var(--secondary)' }} 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--foreground)' }} />
                <Bar dataKey="vendas" name="Vendido" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="pipeline" name="Pipeline" fill="#3b82f6" fillOpacity={0.3} radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>

        <ChartContainer title="Atividades por Agente" icon={<Activity className="h-5 w-5" />}>
          <div className="h-[400px] w-full pt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--secondary)' }} 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--foreground)' }} />
                <Bar dataKey="ligações" name="Ligações" fill="#10b981" stackId="a" barSize={16} />
                <Bar dataKey="visitas" name="Visitas" fill="#3b82f6" stackId="a" barSize={16} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartContainer>
      </div>

      <ChartContainer title="Matriz de Eficiência Operacional" icon={<Zap className="h-5 w-5" />}>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Agente</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Performance</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Conversão</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Ticket Médio</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Atingimento</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const avgTicket = r.closed_count > 0 ? r.closed_value / r.closed_count : 0;
                return (
                  <TableRow key={r.user_id} className="border-border hover:bg-secondary/40 transition-colors group">
                    <TableCell className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 rounded-xl border border-border group-hover:border-primary/50 shadow-sm">
                          <AvatarImage src={r.avatar_url || undefined} className="object-cover" />
                          <AvatarFallback className="bg-secondary text-[10px] font-bold text-muted-foreground">
                            {r.full_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{r.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <Badge variant="outline" className="px-3 py-1.5 rounded-lg bg-warning/5 text-warning text-[10px] font-bold border-warning/10 tracking-widest">{r.points} XP</Badge>
                    </TableCell>
                    <TableCell className="px-8 py-6 font-mono text-xs text-muted-foreground">
                      {((r.closed_count / (r.closed_count + 5)) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="px-8 py-6 font-mono text-sm text-primary font-bold">
                      {formatCurrency(avgTicket)}
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <div className="w-28 space-y-2">
                        <Progress value={Math.min(100, r.attainment)} className="h-1.5 bg-secondary" />
                        <span className="text-[10px] font-bold font-mono block text-muted-foreground tracking-widest">{r.attainment.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      {r.attainment >= 100 ? (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                           Alta Performance
                        </Badge>
                      ) : r.attainment >= 50 ? (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-warning border-warning/20 bg-warning/5">
                           Em Dia
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-red-500 border-red-500/20 bg-red-500/5">
                           Baixa Velocidade
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ChartContainer>
    </div>
  );
}

function KPICard({ label, value, icon, trend, negative }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm rounded-2xl border-border hover:border-primary/30 transition-all group shadow-sm overflow-hidden">
      <CardContent className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 rounded-xl bg-secondary border border-border transition-all group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">{icon}</div>
          <Badge variant="outline" className={cn("px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1", negative ? "bg-red-500/5 text-red-500 border-red-500/10" : "bg-emerald-500/5 text-emerald-500 border-emerald-500/10")}>
            {negative ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />} {trend}
          </Badge>
        </div>
        <div className="text-3xl font-bold font-mono text-foreground mb-2 tracking-tighter group-hover:text-primary transition-colors">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ChartContainer({ title, icon, children }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm rounded-3xl border-border shadow-2xl overflow-hidden">
      <CardHeader className="px-10 pt-10 pb-0 space-y-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-2.5 rounded-xl bg-secondary border border-border text-primary shadow-sm">{icon}</div>
          <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-10 pb-10">
        {children}
      </CardContent>
    </Card>
  );
}
